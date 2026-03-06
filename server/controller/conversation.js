const mongoose = require("mongoose");
const { ConversationModel } = require("../models/ConversationModel");
const User = require("../models/UserModel");

async function createConversation(req, res) {
  try {
    const { topic, participants, currentUserId } = req.body;

    // 🔐 Get from auth middleware
    //const currentUserId = req.user._id;

    /* ================= VALIDATION ================= */

    if (!topic || topic.trim() === "") {
      return res.status(400).json({ message: "Topic name is required" });
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ message: "Select at least one participant" });
    }

    if (!mongoose.Types.ObjectId.isValid(currentUserId)) {
      return res.status(400).json({ message: "Invalid current user" });
    }

    // Remove duplicates & add current user
    let uniqueParticipants = [
      ...new Set([...participants, currentUserId.toString()])
    ];

    // 🔥 Filter invalid ObjectIds
    uniqueParticipants = uniqueParticipants.filter(id =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (uniqueParticipants.length < 2) {
      return res.status(400).json({ message: "Invalid participants" });
    }

    /* ================= VERIFY USERS EXIST ================= */
    console.log("1");
    const users = await User.find({
      _id: { $in: uniqueParticipants }
    });

    if (users.length !== uniqueParticipants.length) {
      return res.status(400).json({ message: "Some users do not exist" });
    }

    /* ================= CREATE CONVERSATION ================= */

    const conversation = await ConversationModel.create({
      createdBy: currentUserId,
      topic,
      participants: uniqueParticipants,
      isArchived: false
    });

    const populatedConversation = await ConversationModel.findById(conversation._id)
      .populate("participants", "name profile_pic")
      .populate("createdBy", "name profile_pic");

    return res.status(201).json({
      success: true,
      data: populatedConversation
    });

  } catch (error) {
    console.error("Create Conversation Error:", error);
    return res.status(500).json({
      message: "Failed to create group conversation"
    });
  }
}

module.exports = createConversation;