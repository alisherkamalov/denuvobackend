import crypto from 'crypto';
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" })

const algorithm = 'aes-256-cbc';
const secretKey = process.env.ENCRYPTION_KEY;
if (!secretKey || secretKey.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 characters long');
}

export const encrypt = (text) => {
    const iv = crypto.randomBytes(16); 
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {
        iv: iv.toString('hex'),
        encryptedContent: encrypted
    };
};

export const decrypt = (encryptedContent, iv) => {
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};