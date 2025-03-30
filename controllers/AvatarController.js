import Avatar from "../models/Avatar.js";
import User from "../models/User.js";
import uploadImageToCloudinary from '../utils/CloudinaryUpload.js'
export const avatarUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const userId = req.userId;
        const cloudinaryUrl = await uploadImageToCloudinary(req.file);
        const apiUrl = `/avatar/${Date.now()}-${req.file.originalname}`;

        const imageDoc = await Avatar.create({
            apiUrl,
            cloudinaryUrl,
            originalName: req.file.originalname,
            userId,
        });

        const newAvatarUser = await User.findByIdAndUpdate(
            userId,
            { $push: { avatarUrls: imageDoc.apiUrl } },
            { new: true }
        );
        res.json({
            avatars: newAvatarUser.avatarUrls
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error uploading image',
            error: error.message
        });
    }
}

export const avatarGet = async (req, res) => {
    try {
        const filename = req.params.filename;
        console.log('Searching avatar for:', filename);

        const uniqueFileId = filename.split('-').pop();
        
        const avatar = await Avatar.findOne({
            apiUrl: { $regex: uniqueFileId }
        }).populate('userId', 'nickname link');

        if (!avatar) {
            console.log('Available avatars:', await Avatar.find().select('apiUrl -_id'));
            return res.status(404).json({
                message: 'Avatar not found',
                searchedId: uniqueFileId,
                hint: 'Tried to match by unique file ID'
            });
        }

        if (!avatar.cloudinaryUrl) {
            return res.status(500).json({
                message: 'Cloudinary URL missing',
                avatarId: avatar._id
            });
        }

        console.log(`Found avatar: ${avatar.apiUrl} -> ${avatar.cloudinaryUrl}`);
        return res.redirect(avatar.cloudinaryUrl);

    } catch (error) {
        console.error('Avatar error:', error);
        return res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
}