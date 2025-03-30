import mongoose from "mongoose";

const ChatImageSchema = new mongoose.Schema({
    apiUrl: { 
        type: String, 
        required: true, 
        unique: true 
    },
    cloudinaryUrl: { 
        type: String, 
        required: true 
    },
    originalName: { 
        type: String 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    chatId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Chat', 
        required: true 
    }
});

export default mongoose.model('ChatImage', ChatImageSchema);