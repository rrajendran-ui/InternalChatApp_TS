const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
    text : {
        type : String,
        default : ""
    },
    imageUrl : {
        type : String,
        default : ""
    },
    videoUrl : {
        type : String,
        default : ""
    },
    fileUrl : {
        type : String,
        default : ""
    },
    fileName : {
        type : String,
        default : ""
    },
    seen : {
        type : Boolean,
        default : false
    },
    sender : {
            type : mongoose.Schema.ObjectId,
            required : true,
            ref : 'User'
        },
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        index: true // Indexed for fast message retrieval
    }
},{
    timestamps : true
})

const conversationSchema = new mongoose.Schema({
    createdBy : {
            type : mongoose.Schema.ObjectId,
            required : true,
            ref : 'User'
        },
        topic: {
          type: String,
          trim: true
        },
        participants: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        lastMessage: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Message"
        },
        isArchived: {
          type: Boolean,
          default: false
        }
},{
    timestamps : true
})

const MessageModel = mongoose.model('Message',messageSchema)
const ConversationModel = mongoose.model('Conversation',conversationSchema)

module.exports = {
    MessageModel,
    ConversationModel
}