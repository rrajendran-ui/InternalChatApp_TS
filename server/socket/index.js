const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');
const { ConversationModel, MessageModel } = require('../models/ConversationModel');

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});

//online user
const onlineUser = new Set();

io.on('connection', async (socket) => {
  console.log("Connected:", socket.id);

  socket.onAny((event, ...args) => {
    console.log("Event:", event, args);
  });

  const token = socket.handshake.auth.token;

  let user;
  try {
    user = await getUserDetailsFromToken(token);
  } catch (err) {
    socket.emit("auth_error", "Authentication failed");
    return socket.disconnect(true);
  }

  // HARD GUARD
  if (!user || !user._id) {
    socket.emit("auth_error", "Invalid token");
    return socket.disconnect(true);
  }

  const userId = user._id.toString();

  //create a room
  socket.join(userId);
  onlineUser.add(userId);

  io.emit('onlineUser', Array.from(onlineUser));

  /* ================= SIDEBAR ================= */
  socket.on('sidebar', async (currentUserId) => {
    try {
      const conversations = await ConversationModel.find({
        participants: currentUserId,
        isArchived: false
      })
        .populate('participants', 'name profile_pic')
        .populate({
          path: 'lastMessage',
          select: 'text imageUrl videoUrl fileName createdAt sender',
          populate: { path: 'sender', select: 'name profile_pic' }
        })
        .sort({ updatedAt: -1 });

      const formatted = conversations.map(conv => ({
        _id: conv._id,
        topic: conv.topic,
        topicImage: "",
        lastMessage: conv.lastMessage,
        memberCount: conv.participants.length,
        unseenMsg: 0
      }));

      socket.emit('conversation', formatted);

    } catch (err) {
      console.error("Sidebar error:", err.message);
    }
  });

  /* ================= JOIN TOPIC ================= */
  socket.on("join-topic", async (topicId) => {
    try {
      socket.join(topicId);

      const topic = await ConversationModel.findById(topicId)
        .populate("participants", "name profile_pic");

      socket.emit("topic-details", topic);

    } catch (err) {
      console.error("Join topic error:", err);
    }
  });

  /* ================= LOAD MESSAGES ================= */
  socket.on("load-messages", async (topicId) => {
    try {
      const messages = await MessageModel.find({
        conversationId: topicId
      })
        .populate("sender", "name profile_pic")
        .sort({ createdAt: 1 })
        .lean();

      socket.emit("topic-messages", messages);

    } catch (err) {
      console.error("Load messages error:", err);
    }
  });

  /* ================= SEND MESSAGE ================= */
  socket.on("send-topic-message", async (data) => {
    try {
      const {
        topicId,
        sender,
        text,
        imageUrl,
        videoUrl,
        fileUrl,
        fileName,
      } = data;

      const newMessage = new MessageModel({
        conversationId: topicId,
        sender,
        text,
        imageUrl,
        videoUrl,
        fileUrl,
        fileName,
      });

      const savedMessage = await newMessage.save();

      const populatedMessage = await savedMessage.populate(
        "sender",
        "name profile_pic"
      );

      //update last message
      await ConversationModel.findByIdAndUpdate(
        topicId,
        { lastMessage: savedMessage._id }
      );

      const conversation = await ConversationModel.findById(topicId)
        .populate("participants", "name profile_pic")
        .populate({
          path: "lastMessage",
          select: "text imageUrl videoUrl fileName createdAt sender",
          populate: { path: "sender", select: "name profile_pic" }
        });

      //send message to room
      io.to(topicId).emit("new-topic-message", populatedMessage);

      // update sidebar for all participants
      conversation.participants.forEach((p) => {
        io.to(p._id.toString()).emit("sidebar-update", {
          _id: conversation._id,
          topic: conversation.topic,
          topicImage: "",
          lastMessage: conversation.lastMessage,
          memberCount: conversation.participants.length,
          unseenMsg: 0
        });
      });

    } catch (error) {
      console.error("Send message error:", error);
    }
  });

  /* ================= UPDATE MESSAGE ================= */
  socket.on("update-message", async (data) => {
    try {
      const { messageId, text, imageUrl, videoUrl, fileUrl, fileName } = data;

      const updatedMessage = await MessageModel.findByIdAndUpdate(
        messageId,
        {
          text,
          isEdited: true,
          imageUrl,
          videoUrl,
          fileUrl,
          fileName,
        },
        { new: true }
      ).populate("sender", "name profile_pic");

      if (!updatedMessage) return;

      const conversationId = updatedMessage.conversationId.toString();

      //update last message
      await ConversationModel.findByIdAndUpdate(
        conversationId,
        { lastMessage: updatedMessage._id }
      );

      const conversation = await ConversationModel.findById(conversationId)
        .populate("participants", "name profile_pic")
        .populate({
          path: "lastMessage",
          select: "text imageUrl videoUrl fileName createdAt sender",
          populate: { path: "sender", select: "name profile_pic" }
        });

      //emit updated message
      io.to(conversationId).emit("message-updated", updatedMessage);

      //update sidebar for all users
      conversation.participants.forEach((p) => {
        io.to(p._id.toString()).emit("sidebar-update", {
          _id: conversation._id,
          topic: conversation.topic,
          topicImage: "",
          lastMessage: conversation.lastMessage,
          memberCount: conversation.participants.length,
          unseenMsg: 0
        });
      });

    } catch (error) {
      console.log("Update Message Error:", error);
    }
  });
  socket.on("add-members-to-topic", async ({ topicId, members }) => {
  try {
    const updatedConversation = await ConversationModel.findByIdAndUpdate(
      topicId,
      {
        $addToSet: {
          participants: { $each: members }
        }
      },
      { new: true }
    ).populate("participants", "name profile_pic");

    io.to(topicId).emit("topic-details", updatedConversation);
  } catch (err) {
    console.error("Add members error:", err);
  }
});
  /* ================= DISCONNECT ================= */
  socket.on('disconnect', () => {
    onlineUser.delete(userId);
    console.log("Disconnected:", socket.id);
  });

});

module.exports = {
  app,
  server
};