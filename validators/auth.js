import { body, validationResult } from "express-validator";

export const registerValidation = [
    body('nickname', "никнейм слишком маленький").isLength({ min: 3 }),
    body('link', "линк слишком маленький").isLength({ min: 5 }),
    body('password', "пароль слишком маленький").isLength({ min: 8 }),
    body('avatarUrls')
        .optional()
        .isArray()
        .withMessage('Аватары должны быть переданы в виде массива'),
    body('avatarUrls.*')
        .isURL()
        .withMessage('Каждая ссылка на аватар должна быть корректным URL')
];

export const loginValidation = [
    body('link', "линк слишком маленький").isLength({ min: 5 }),
    body('password', "пароль слишком маленький").isLength({ min: 8 }),
];

export const validateSocketData = (socket, data, next) => {
    const errors = validationResult({ body: data });
    if (!errors.isEmpty()) {
        return socket.emit("validation_error", errors.array());
    }
    next();
};


/**
 * import { body } from "express-validator";
 * export const registerValidation = [
    body('nickname', "никнейм слишком маленький").isLength({min:3}),
    body('link', "линк слишком маленький").isLength({min:5}),
    body('password', "пароль слишком маленький").isLength({min:8}),
    body('avatarUrls')
        .optional() 
        .isArray()
        .withMessage('Аватары должны быть переданы в виде массива'),
    body('avatarUrls.*')
        .isURL()
        .withMessage('Каждая ссылка на аватар должна быть корректным URL')
]

export const loginValidation = [
    body('link', "линк слишком маленький").isLength({min:5}),
    body('password', "пароль слишком маленький").isLength({min:8}),
]
 * 
 * 
 */