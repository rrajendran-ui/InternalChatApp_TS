const express = require('express')
const { Server } = require('socket.io')
const http = require('http')
const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken')
const { ConversationModel, MessageModel } = require('../models/ConversationModel')

const app = express()

/***socket connection */
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
})

/***
 * socket running at http://localhost:8080/
 */

//online user
const onlineUser = new Set()

io.on('connection', async (socket) => {
  console.log("connect User 1", socket.id)
  socket.onAny((event, ...args) => {
    console.log("📩 Event received:", event, args);
  });
  const token = socket.handshake.auth.token

  //current user details 
  //const user = await getUserDetailsFromToken(token)

  let user;
  try {
    user = await getUserDetailsFromToken(token);
  } catch (err) {
    console.error("Auth error:", err.message);
    socket.emit("auth_error", "Authentication failed");
    return socket.disconnect(true);
  }

  // HARD GUARD
  if (!user || !user._id) {
    socket.emit("auth_error", "Invalid or expired token");
    return socket.disconnect(true);
  }

  //create a room
  socket.join(user?._id.toString())
  onlineUser.add(user?._id?.toString())

  io.emit('onlineUser', Array.from(onlineUser))

  //sidebar
  socket.on('sidebar', async (currentUserId) => {
    console.log("sidebar - current user", currentUserId)

    try {
      // Get all conversations for this user
      const conversations = await ConversationModel.find({
        participants: currentUserId,
        isArchived: false
      })
        .populate('participants', 'name profile_pic') // participants details
        .populate({
          path: 'lastMessage',
          select: 'text imageUrl videoUrl createdAt sender',
          populate: { path: 'sender', select: 'name profile_pic' } // sender details
        })
        .sort({ updatedAt: -1 }); // latest updated first

      // Format for frontend
      const formatted = conversations.map(conv => ({
        _id: conv._id,
        topic: conv.topic,
        topicImage: '', // optional topic avatar
        lastMessage: conv.lastMessage,
        unseenMsg: 0
        // unseenMsg: conv.participants.reduce((count, p) => {
        //   if (p._id.toString() !== userId.toString() && conv.lastMessage?.seenBy?.indexOf(userId) === -1) {
        //     return count + 1;
        //   }
        //   return count;
        // }, 0)
      }));
      console.log("Conversations found:", conversations.length);
      console.log("Formatted data:", formatted);
      socket.emit('conversation', formatted);

    } catch (err) {
      console.error("Sidebar fetch error:", err.message);
    }

  })
  socket.on("join-topic", async (topicId) => {
    socket.join(topicId);

    const topic = await ConversationModel.findById(topicId);

    socket.emit("topic-details", topic);
  });

  socket.on("load-messages", async (topicId) => {

    const messages = await MessageModel.find({
      conversationId: topicId
    }).sort({ createdAt: 1 }).lean();

    socket.emit("topic-messages", messages);
  });

  /* ---------------- SEND MESSAGE ---------------- */
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
      await ConversationModel.updateOne(
        { _id: topicId },
        { $set: { lastMessage: savedMessage._id } }
      );
      // send message ONLY to that topic room
      io.to(topicId).emit("new-topic-message", populatedMessage);

    } catch (error) {
      console.error("Send message error:", error);
    }
  });

  //disconnect
  socket.on('disconnect', () => {
    onlineUser.delete(user?._id?.toString())
    console.log('disconnect user ', socket.id)
  })
})

module.exports = {
  app,
  server
}

