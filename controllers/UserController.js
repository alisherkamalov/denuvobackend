import UserModel from "../models/User.js"
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";


export const register = async (req, res) => {
    try {

        const password = req.body.password

        const salt = await bcrypt.genSalt(10);

        const hash = await bcrypt.hash(password, salt)
        const doc = new UserModel({
            nickname: req.body.nickname.trim(),
            link: req.body.link.trim(),
            avatarUrl: req.body.avatarUrl,
            passwordHash: hash,
            isFrozen: false

        })

        const user = await doc.save()

        const { passwordHash, ...userData } = user._doc

        res.status(201).json({
            ...userData,
            message: "Вы успешно зарегистрировались"
        });


    } catch (err) {
        res.status(500).json(
            {
                message: `Не удалось зарегистрироваться в Denuvo: ${err}`
            },
        )
    }
}

export const login = async (req, res) => {
    try {
        const { ip, fingerprint, link, password } = req.body;

        if (!fingerprint) return res.status(400).json({ message: "Отсутствует fingerprint" });
        if (!ip) return res.status(400).json({ message: "Отсутствует ip" });

        const user = await UserModel.findOne({ link });
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        const isValidPass = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPass) return res.status(401).json({ message: 'Неверный логин или пароль' });

        const ipExists = await Promise.all(
            user.allowedIp.map(async (hashedIp) => await bcrypt.compare(ip, hashedIp))
        ).then(results => results.some(match => match));

        if (!ipExists) {
            const ipHash = await bcrypt.hash(ip.toString(), 10);
            await UserModel.findByIdAndUpdate(
                user._id,
                { $addToSet: { allowedIp: ipHash } },
                { new: true }
            );
        }

        const fingerprintHash = await bcrypt.hash(fingerprint.toString(), 10);
        await UserModel.findByIdAndUpdate(user._id, { isFrozen: false });
        const token = jwt.sign(
            {
                _id: user._id,
                ip: user.allowedIp, 
                fingerprint: fingerprintHash,
            },
            process.env.DENUVO_SECRET,
            { expiresIn: '1d' }
        );

        const { passwordHash, ...userData } = user._doc;

        res.status(200).json({
            ...userData,
            token,
            ip,
            fingerprint,
            message: "Вы успешно авторизовались",
        });

    } catch (err) {
        console.error("Ошибка авторизации:", err);
        res.status(500).json({ message: `Не удалось авторизоваться в Denuvo: ${err}` });
    }
};




export const getMe = async (req, res) => {
    try {
        const { fingerprint, ip } = req.query; 
        console.log(fingerprint, ip);

        if (!fingerprint || !ip) {
            return res.status(400).json({ error: "Отсутствуют fingerprint или ip" });
        }

        const user = await UserModel.findById(req.userId);

        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        const { passwordHash, allowedIp, isFrozen, ... userData } = user._doc;
        res.status(200).json(userData);
    } catch (err) {
        res.status(500).json({ message: `Нет доступа: ${err}` });
    }
};


export const findUser = async (socket, link) => {
    try {
        if (!link || link.length < 2) {
            return socket.emit("userNotFound", "Введите больше символов");
        }

        const cleanLink = link.startsWith('@') ? link.slice(1) : link;
        
        const users = await UserModel.find({
            link: { $regex: `^${cleanLink}`, $options: 'i' }
        }).select("_id nickname link avatarUrls").limit(10);

        if (!users || users.length === 0) {
            return socket.emit("userNotFound", "Пользователь не найден");
        }

        socket.emit("userFound", users);
    } catch (error) {
        socket.emit("userError", `Ошибка поиска пользователя: ${error.message}`);
    }
};