const userService = require('../services/userService');

class AuthController {
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await userService.login(email, password);
            return res.success(result, 'Login successful');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();
