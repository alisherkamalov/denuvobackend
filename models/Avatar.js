import mongoose from "mongoose";

const AvatarSchema = new mongoose.Schema({
    apiUrl: { 
        type: String, 
        required: true, 
        unique: true,
        index: true
    },
    cloudinaryUrl: { 
        type: String, 
        required: true,
        validate: {
            validator: function(v) {
                return /^https?:\/\//.test(v);
            },
            message: props => `${props.value} is not a valid URL!`
        }
    },
    originalName: { 
        type: String,
        trim: true
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true,
        index: true
    }
});

AvatarSchema.methods.getPublicUrl = function() {
    return this.cloudinaryUrl || this.apiUrl;
};

export default mongoose.model('Avatar', AvatarSchema);