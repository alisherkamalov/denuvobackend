import express from "express";
import { loginValidation, registerValidation } from "./validators/auth.js";
import { HandleValidationErrors, checkAuth } from "./utils/index.js";
import { UserController, ChatController, AvatarController } from "./controllers/index.js";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import multer from "multer";
import cors from "cors";

mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log('DATABASE OK'))
    .catch((err) => console.log("error", err));

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use('/upload', express.static('upload'));
app.use(cors({
    origin: ["http://localhost:5252", "https://denuvobackend.up.railway.app", "http://localhost:3000"],
    methods: ["POST", "GET", "DELETE", "OPTIONS", "HEAD", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:5252"],
        methods: ["GET", "POST"],
    },
});

io.on('connection', (socket) => {
    console.log('Пользователь подключился:', socket.id);
    socket.on("findUser", (data) => {
        UserController.findUser(socket, data);
    });
    socket.on("CreateChat", (data) => {
        console.log("Received CreateChat:", data);
        if (!data || typeof data !== "object") {
            console.log("Invalid CreateChat data");
            socket.emit("CreateError", "Неверный формат данных");
            return;
        }
        const { senderId, receiverId } = data;
        console.log("Extracted IDs:", { senderId, receiverId });
        ChatController.createChat(socket, senderId, receiverId);
    });
    socket.on("GetUserChats", (userId) => {
        console.log("Received GetUserChats:", userId);
        ChatController.getUserChatsWithMessages(socket, userId);
    });
});

// Routes...
app.get("/me", checkAuth, UserController.getMe);
app.get('/avatar/:filename', checkAuth, AvatarController.avatarGet);
//app.get('/chat/:chatId/messages', checkAuth, ChatController.getChatMessages);
app.get('/find/user', checkAuth, HandleValidationErrors, UserController.findUser);
app.post('/login', loginValidation, HandleValidationErrors, UserController.login);
app.post('/register', registerValidation, HandleValidationErrors, UserController.register);
//app.post('/create/chat/:userId', checkAuth, HandleValidationErrors, ChatController.createChat);
app.post('/avatar', checkAuth, upload.single("image"), AvatarController.avatarUpload);
app.post('/upload/imagechat/:chatId', checkAuth, upload.single("image"), ChatController.imageChat);
app.post('/chat/:chatId/message', checkAuth, HandleValidationErrors, ChatController.sendMessage);

server.listen(5252, () => {
    console.log('SERVER OK');
});