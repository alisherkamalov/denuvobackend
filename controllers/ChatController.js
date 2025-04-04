import { encrypt } from "../utils/crypto.js";
import ChatImage from "../models/ChatImage.js";
import uploadImageToCloudinary from "../utils/CloudinaryUpload.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
import mongoose from "mongoose";

export const createChat = async (socket, senderId, receiverId) => {
    try {
        console.log("createChat called with:", { senderId, receiverId });

        if (!senderId || !receiverId) {
            console.log("Missing senderId or receiverId");
            return socket.emit("CreateError", "ID отправителя и получателя необходимы");
        }

        if (!mongoose.Types.ObjectId.isValid(senderId)) {
            console.log("Invalid senderId:", senderId);
            return socket.emit("CreateError", "Неправильный ID отправителя");
        }

        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            console.log("Invalid receiverId:", receiverId);
            return socket.emit("CreateError", "Неправильный ID получателя");
        }

        if (senderId === receiverId) {
            console.log("Sender and receiver are the same:", senderId);
            return socket.emit("CreateError", "Нельзя создать чат самому себе");
        }

        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);
        console.log("Sender:", sender?._id, "Receiver:", receiver?._id);
        if (!sender || !receiver) {
            return socket.emit("CreateError", "Один или оба пользователя не найдены");
        }

        const existingChat = await Chat.findOne({
            participants: { $all: [senderId, receiverId], $size: 2 },
        });
        console.log("Existing chat:", existingChat?._id);
        if (existingChat) {
            return socket.emit("CreateError", `Чат уже существует: ${existingChat._id}`);
        }

        const newChat = await Chat.create({
            participants: [senderId, receiverId],
            createdUser: senderId,
        });
        console.log("Chat created:", newChat._id);

        await User.updateOne(
            { _id: senderId },
            { $push: { chats: newChat._id.toString() } }
        );
        await User.updateOne(
            { _id: receiverId },
            { $push: { chats: newChat._id.toString() } }
        );
        console.log("Updated users with chat ID:", newChat._id);

        socket.emit("CreateChat", {
            chatId: newChat._id.toString(),
            participants: newChat.participants.map(id => id.toString()),
            nickname: receiver.nickname,
            avatars: receiver.avatarUrls || [],
            link: `@${receiver.link}`,
        });
    } catch (error) {
        console.error("Ошибка создания чата:", error);
        socket.emit("CreateError", `Ошибка создания чата: ${error.message}`);
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

export const getUserChatsWithMessages = async (socket, userId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.log("Invalid userId:", userId);
            return socket.emit("ChatsError", "Неправильный ID пользователя");
        }

        const user = await User.findById(userId);
        if (!user) {
            return socket.emit("ChatsError", "Пользователь не найден");
        }

        const chats = await Chat.find({ participants: userId })
            .populate("participants", "nickname link avatarUrls");

        if (!chats.length) {
            console.log("No chats found for user:", userId);
            return socket.emit("UserChats", []);
        }

        const formattedChats = await Promise.all(
            chats.map(async (chat) => {
                const otherParticipant = chat.participants.find(p => p._id.toString() !== userId);
                const latestMessage = await Message.findOne({ chatId: chat._id })
                    .select("encryptedContent createdAt")
                    .sort({ createdAt: -1 })
                    .lean();

                return {
                    chatId: chat._id.toString(),
                    nickname: otherParticipant.nickname,
                    avatars: otherParticipant.avatarUrls || [],
                    link: `@${otherParticipant.link}`,
                    last_message: latestMessage ? latestMessage.encryptedContent : "",
                    time_last_message: latestMessage ? latestMessage.createdAt : chat.createdAt.toISOString(),
                    new_message: 0,
                };
            })
        );

        socket.emit("UserChats", formattedChats);
    } catch (error) {
        console.error("Ошибка загрузки чатов с сообщениями:", error);
        socket.emit("ChatsError", `Ошибка загрузки чатов: ${error.message}`);
    }
};