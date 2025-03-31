import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({path: ".env"});

export default (req, res, next) => {
    const token = (req.headers.authorization || "").replace(/Bearer\s?/, '');

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.DENUVO_SECRET)
            req.userId = decoded._id;
            next()
        }
        catch(e) {
            return res.status(403).json(
                {
                    message: "Нет доступа",
                    error: `${token, req.userId}`
                }
            )
        }
    }
    else {
        return res.status(403).json(
            {
                message: "Нет доступа",
                error: `${token}`
            }
        )
    }


}
