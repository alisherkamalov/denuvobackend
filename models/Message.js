import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    encryptedContent: {
        type: String,
        required: function() { return !this.image; }
    },
    iv: {
        type: String,
        required: function() { return !this.image; }
    },
    image: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatImage'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { 
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export default mongoose.model('Message', MessageSchema);