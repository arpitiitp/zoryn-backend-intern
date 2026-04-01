const Joi = require('joi');

const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
        if (error) {
            return next(error);
        }
        req.body = value;
        next();
    };
};

const schemas = {
    login: Joi.object({
        email: Joi.string().email({ tlds: { allow: false } }).required(),
        password: Joi.string().required()
    }),
    createUser: Joi.object({
        email: Joi.string().email({ tlds: { allow: false } }).required(),
        password: Joi.string().min(6).required(),
        role: Joi.string().valid('VIEWER', 'ANALYST', 'ADMIN').required(),
        isActive: Joi.boolean().default(true)
    }),
    updateUser: Joi.object({
        role: Joi.string().valid('VIEWER', 'ANALYST', 'ADMIN').required()
    }),
    updateUserStatus: Joi.object({
        isActive: Joi.boolean().required()
    })
};

module.exports = {
    validateRequest,
    schemas
};
