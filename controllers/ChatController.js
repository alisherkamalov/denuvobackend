import { encrypt, decrypt } from "../utils/crypto.js";
import ChatImage from "../models/ChatImage.js";
import uploadImageToCloudinary from "../utils/CloudinaryUpload.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
import mongoose from "mongoose";

export const createChat = async (req, res) => {
    try {
        const senderId = req.userId;
        const receiverId = req.params.userId;
        const userId = await User.findById(req.userId).select('_id nickname link avatarUrls');
        if (!senderId || !receiverId) {
            return res.status(400).json({ message: 'id отправителя и получателя необходимы' });
        }

        if (!mongoose.Types.ObjectId.isValid(senderId)) {
            return res.status(400).json({ message: 'Неправильный id отправителя' });
        }

        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ message: 'Неправильный id получателя' });
        }

        if (senderId === receiverId) {
            return res.status(400).json({ message: 'нельзя создать чат самому себе' });
        }

        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);
        if (!sender || !receiver) {
            return res.status(404).json({ message: 'Один или оба пользователя не найдены.' });
        }

        const existingChat = await Chat.findOne({
            participants: { $all: [senderId, receiverId], $size: 2 }
        });

        if (existingChat) {
            return res.status(200).json({
                message: 'чат уже создан',
                chatId: existingChat._id
            });
        }

        const newChat = await Chat.create({
            participants: [senderId, receiverId],
            createdUser: userId
        });
        
        res.status(201).json({
            message: 'чат создан',
            chatId: newChat._id,
            participants: newChat.participants,
            createdUser: userId
        });
    } catch (error) {
        console.error('ошибка создания чата', error);
        res.status(500).json({
            message: 'ошибка создания чата',
            error: error.message
        });
    }
};

export const imageChat = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'файлы не загружены' });
        }

        const userId = req.userId;
        const chatId = req.params.chatId;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: userId
        });

        if (!chat) {
            return res.status(403).json({ message: 'чат не найден или у вас нет прав' });
        }

        const cloudinaryUrl = await uploadImageToCloudinary(req.file);
        const apiUrl = `/uploads/${Date.now()}-${req.file.originalname}`;

        const imageChat = await ChatImage.create({
            apiUrl,
            cloudinaryUrl,
            originalName: req.file.originalname,
            userId,
            chatId
        });

        const message = await Message.create({
            chatId,
            senderId: userId,
            image: imageChat._id,
            encryptedContent: "", 
            iv: ""
        });

        res.json({
            url: imageChat.apiUrl,
            cloudinaryUrl: imageChat.cloudinaryUrl,
            messageId: message._id
        });
    } catch (error) {
        console.error('Ошибка загрузки фото в чат:', error);
        res.status(500).json({
            message: 'Ошибка загрузки фото',
            error: error.message
        });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { content } = req.body;
        const userId = req.userId;
        const chatId = req.params.chatId;

        if (!content) {
            return res.status(400).json({ message: 'Сообщение необходимо' });
        }

        if (!mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({ message: 'Неправильный id чата' });
        }

        const chat = await Chat.findOne({
            _id: chatId,
            participants: userId
        });

        if (!chat) {
            return res.status(403).json({ message: 'чат не найден или у вас нет прав' });
        }

        const { encryptedContent, iv } = encrypt(content);

        const message = await Message.create({
            chatId,
            senderId: userId,
            encryptedContent, 
            iv
        });

        res.status(201).json({
            message: 'Сообщение отправлено',
            chatId: message.chatId,
            senderId: message.senderId,
            createdAt: message.createdAt
        });
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        res.status(500).json({
            message: 'Ошибка отправки сообщения',
            error: error.message
        });
    }
};

export const getChatMessages = async (req, res) => {
    try {
        const userId = req.userId;
        const chatId = req.params.chatId;

        if (!mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({ message: 'неправильный id чата' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;

        // Проверяем доступ к чату
        const chat = await Chat.findOne({ _id: chatId, participants: userId });
        if (!chat) {
            return res.status(403).json({ message: 'чат не найден или у вас нет прав' });
        }

        // Получаем общее количество сообщений
        const totalMessages = await Message.countDocuments({ chatId });

        // Получаем сообщения с полной информацией
        const messages = await Message.find({ chatId })
            .select('senderId encryptedContent image iv createdAt')
            .populate({
                path: 'senderId',
                select: 'username avatar link' 
            })
            .populate({
                path: 'image',
                select: 'apiUrl cloudinaryUrl originalName'
            })
            .sort({ createdAt: -1 }) 
            .skip(skip)
            .limit(limit)
            .lean();

        res.status(200).json({
            chatId,
            messages: decryptedMessages,
            totalMessages,
            totalPages: Math.ceil(totalMessages / limit),
            currentPage: page
        });
    } catch (error) {
        console.error('ошибка получения чата', error);
        res.status(500).json({
            message: 'ошибка получения чата',
            error: error.message
        });
    }
};