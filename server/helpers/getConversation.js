const { ConversationModel,MessageModel } = require("../models/ConversationModel")

const getConversation = async (currentUserId) => {
    if (!currentUserId) return []

    const currentUserConversation = await ConversationModel.find({
        participants: { $in: [currentUserId] }
    })
    .populate("participants", "name profile_pic")
    .populate("lastMessage")
    .sort({ updatedAt: -1 })
    .lean()   

    const conversation = await Promise.all(
        currentUserConversation.map(async (conv) => {

            // safety guard
            if (!conv.participants || !conv.participants.length) {
                return null
            }

            // find other participant safely
            const otherUser = conv.participants.find(
                (p) => p?._id?.toString() !== currentUserId.toString()
            )

            const countUnseenMsg = await MessageModel.countDocuments({
                conversationId: conv._id,
                sender: { $ne: currentUserId },  // better than msgByUserId
                seen: false
            })

            return {
                _id: conv._id,
                userDetails: otherUser || null,
                unseenMsg: countUnseenMsg,
                topic: conv.topic,
                lastMsg: conv.lastMessage || null
            }
        })
    )

    return conversation.filter(Boolean)  // remove nulls
}

module.exports = getConversation