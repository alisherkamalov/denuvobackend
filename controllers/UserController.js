import UserModel from "../models/User.js"
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const registerSocket = async (socket, data) => {
    const { nickname, link, password, avatarUrls } = data;
    if (!password || password.trim() === "") {
        socket.emit("register_response", { message: "Пароль не может быть пустым" });
        return;
    }
    try {
        const existingUser = await UserModel.findOne({ link });

        if (existingUser) {
            socket.emit("register_response", { message: "Пользователь уже существует" })
            return
        }
        const salt = await bcrypt.genSalt(10);

        const hash = await bcrypt.hash(password, salt)
        const doc = new UserModel({
            nickname,
            link,
            passwordHash: hash,
            avatarUrls: avatarUrls || ""
        })
        const user = await doc.save()

    
        socket.emit("register_response", {
            message: "вы успешно зарегистрировались!"
        })

    }
    catch (error) {
        socket.emit("register_response", {
            message: `произошла ошибка: ${error}`
        })
    }
}

export const login = async (req, res) => {
    try {
        const user = await UserModel.findOne({ link: req.body.link.trim() })
        if (!user) {
            return res.status(404).json(
                {
                    message: 'Пользователь не найден'
                }

            )
        }

        const isValidPass = bcrypt.compare(req.body.password, user._doc.passwordHash)

        if (!isValidPass) {
            return res.status(404).json(
                {
                    message: 'Неверный логин или пароль'
                }

            )
        }

        const token = jwt.sign({
            _id: user._id
        }, process.env.DENUVO_SECRET,
            {
                expiresIn: '1d'
            })

        const { passwordHash, ...userData } = user._doc

        res.status(201).json({
            ...userData,
            token
        });
    }

    catch (err) {
        res.status(500).json(
            {
                message: `Не удалось авторизоваться в Denuvo: ${err}`
            },
        )
    }
}

export const getMe = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId)

        if (!user) {
            return res.status().json(
                {
                    message: "Пользователь не найден"
                }
            )
        }
        const { passwordHash, ...userData } = user._doc

        res.status(201).json(userData);
    }
    catch (err) {
        res.status(500).json({
            message: "Нет доступа"
        });
    }
}

export const findUser = async (req, res) => {
    try {
        const { link } = req.body;

        if (!link) {
            return res.status(400).json({ message: 'не найден' });
        }
        const user = await UserModel.findOne({ link }).select('_id nickname link avatarUrls');

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        return res.status(200).json({
            findUser: user
        });
    }
    catch (e) {
        res.status(500).json({
            message: `Ошибка поиска пользователя: ${e}`,
        });
    }
}
