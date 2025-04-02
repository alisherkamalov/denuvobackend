import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import User from "../models/User.js"; 

dotenv.config({ path: ".env" });

export default async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace(/Bearer\s?/, '');
        if (!token) {
            return res.status(401).json({ error: 'токен отсутствует' });
        }


        const decoded = jwt.verify(token, process.env.DENUVO_SECRET);

        const { fingerprint, ip } = req.query; 

        const fingerprintMatch = await bcrypt.compare(fingerprint, decoded.fingerprint);
        const ipMatchResults = await Promise.all(
            decoded.ip.map(async (hashedIp) => await bcrypt.compare(ip, hashedIp))
        );
        
        const ipMatch = ipMatchResults.some(match => match);
        
        
        if (!fingerprintMatch || (decoded.ip.length > 0 && !ipMatch)) {
            console.error('Ошибка: fingerprint или ip не совпадают. Замораживаем аккаунт.');
        
            await User.findByIdAndUpdate(decoded._id, { isFrozen: true });
        
            return res.status(403).json({
                error: 'Вы похоже сменили устройство или браузер, мы заморозили ваш аккаунт для безопасности! Повторно войдите в свой аккаунт',
                isFrozen: true,
            });
        }
        

        req.userId = decoded._id;

        next();
    } catch (error) {
        console.error("Ошибка авторизации:", error.message);
        return res.status(403).json({
            error: error.message,
            message: "Нет доступа",
        });
    }
};
