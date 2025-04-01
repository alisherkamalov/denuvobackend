import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    nickname: {
        type: String,
        required: true
    },
    link: {
        type: String,
        required: true,
        unique: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    avatarUrls: [{  
        type: String,
        default: ''
    }],
    chats: [{
        type: String
    }]

},
    {
        timestamps: true
    }
)

export default mongoose.model("User", userSchema);