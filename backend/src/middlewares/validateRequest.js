const Joi = require('joi');

const validateRequest = (schema) => {
    return (req, res, next) => {
        // using abortEarly: false so the frontend gets an array of *all* validation errors at once, instead of just the first fail
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
    }),
    createRecord: Joi.object({
        amount: Joi.number().positive().required(),
        type: Joi.string().valid('INCOME', 'EXPENSE').required(),
        category: Joi.string().max(100).required(),
        date: Joi.date().iso().required(),
        notes: Joi.string().max(500).optional().allow('', null)
    })
};

module.exports = {
    validateRequest,
    schemas
};
