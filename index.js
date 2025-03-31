import express from "express";
import { loginValidation, registerValidation } from "./validators/auth.js";
import { HandleValidationErrors, checkAuth } from "./utils/index.js";
import { UserController, ChatController, AvatarController } from "./controllers/index.js";
import mongoose from "mongoose";
import multer from "multer";
import cors from "cors";

mongoose
        .connect(process.env.MONGO_URL)
        .then(
            () => {
                console.log('DATABASE OK')
            }
        )
        .catch((err) => {
            console.log("error", err)
        })
const app = express();
const upload = multer({ storage: multer.memoryStorage() })

app.use(express.json());
app.use('/upload', express.static('upload'));
app.use(cors({
    origin: ["http://localhost:5252", "https://denuvobackend.up.railway.app"],
    methods: ["POST, GET, DELETE, OPTIONS, HEAD, PUT"],
    allowedHeaders: ["Content-Type"]
  }));

app.get("/me", checkAuth, UserController.getMe)
app.get('/avatar/:filename', checkAuth, AvatarController.avatarGet);
app.get('/chat/:chatId/messages', checkAuth, ChatController.getChatMessages);
app.get('/find/user', checkAuth, HandleValidationErrors, UserController.findUser)

app.post('/login', loginValidation, HandleValidationErrors, UserController.login)
app.post('/register', registerValidation, HandleValidationErrors, UserController.register)
app.post('/create/chat/:userId', checkAuth, HandleValidationErrors, ChatController.createChat);
app.post('/avatar', checkAuth, upload.single("image"), AvatarController.avatarUpload)
app.post('/upload/imagechat/:chatId', checkAuth, upload.single("image"), ChatController.imageChat);
app.post('/chat/:chatId/message', checkAuth, HandleValidationErrors, ChatController.sendMessage);
app.listen(5252, () => {
    console.log('SERVER OK')
})



