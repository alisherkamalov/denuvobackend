import { v2 as cloudinary } from 'cloudinary'
import dotenv from "dotenv";

dotenv.config({path: ".env"})


cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_KEY,
    api_secret: process.env.CLOUD_SECRET,
    secure: true
});

export default async function uploadImageToCloudinary(file) {
    try {
        const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        
        const result = await cloudinary.uploader.upload(base64Image, {
            folder: 'uploads', 
            resource_type: 'image'
        });
        
        return result.secure_url;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
}
