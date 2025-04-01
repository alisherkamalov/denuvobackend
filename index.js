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
    allowedHeaders: ["Content-Type"]
}));

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5252", "http://localhost:3000", "https://denuvobackend.up.railway.app"],
        methods: ["POST", "GET", "DELETE", "OPTIONS", "HEAD", "PUT"],
        allowedHeaders: ["Content-Type"],
    }
});
// Socket (test)
io.on('connection', (socket) => {
    console.log('Пользователь подключился:', socket.id);
    socket.on("register", (data) => UserController.registerSocket(socket, data));
    socket.on('disconnect', () => {
        console.log('A client disconnected');
    });
});

// Routes (скоро небудет, будет взаимодействие с бекендом через socket)
app.get("/me", checkAuth, UserController.getMe);
app.get('/avatar/:filename', checkAuth, AvatarController.avatarGet);
app.get('/chat/:chatId/messages', checkAuth, ChatController.getChatMessages);
app.get('/find/user', checkAuth, HandleValidationErrors, UserController.findUser);

app.post('/login', loginValidation, HandleValidationErrors, UserController.login);
app.post('/create/chat/:userId', checkAuth, HandleValidationErrors, ChatController.createChat);
app.post('/avatar', checkAuth, upload.single("image"), AvatarController.avatarUpload);
app.post('/upload/imagechat/:chatId', checkAuth, upload.single("image"), ChatController.imageChat);
app.post('/chat/:chatId/message', checkAuth, HandleValidationErrors, ChatController.sendMessage);

server.listen(5252, () => {
    console.log('SERVER OK');
});