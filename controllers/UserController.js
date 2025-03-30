import UserModel from "../models/User.js"
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";


export const register = async (req, res) => {
    try {

        const password = req.body.password

        const salt = await bcrypt.genSalt(10);

        const hash = await bcrypt.hash(password, salt)

        const doc = new UserModel({
            nickname: req.body.nickname,
            link: req.body.link,
            avatarUrl: req.body.avatarUrl,
            passwordHash: hash
        })

        const user = await doc.save()

        const token = jwt.sign({
            _id: user._id
        }, process.env.DENUVO_SECRET,
        {
            expiresIn: '1d'
        })

        const { passwordHash, ... userData } = user._doc

        res.status(201).json({
            ... userData,
            token
        });
        
    
    } catch (err) {
        res.status(500).json(
            {
                message: `Не удалось зарегистрироваться в Denuvo: ${err}`
            },
        )
    }
}

export const login = async (req,res) => {
    try {
        const user = await UserModel.findOne({link: req.body.link})

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

        const { passwordHash, ... userData } = user._doc

        res.status(201).json({
            ... userData,
            token
        });
    }
    
    catch(err) {
        res.status(500).json(
            {
                message: `Не удалось авторизоваться в Denuvo: ${err}`
            },
        )
    }
}

export const getMe = async (req,res) => {
    try {
        const user = await UserModel.findById(req.userId)

        if (!user) {
            return res.status().json(
                {
                    message: "Пользователь не найден"
                }
            )
        }
        const { passwordHash, ... userData } = user._doc

        res.status(201).json(userData);
    }
    catch(err) {
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
        const user = await User.findOne({ link }).select('_id nickname link avatarUrls');

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        return res.status(200).json({
            findUser: user
        });
    } 
    catch(e) {
        res.status(500).json({
            message: `Ошибка поиска пользователя: ${e}`,
        });
    }
}