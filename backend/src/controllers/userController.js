const userService = require('../services/userService');

class UserController {
    async getAllUsers(req, res, next) {
        try {
            const users = await userService.getAllUsers();
            return res.success(users, 'Users retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async createUser(req, res, next) {
        try {
            const user = await userService.createUser(req.body);
            return res.success(user, 'User created successfully', null, 201);
        } catch (error) {
            next(error);
        }
    }

    async updateUser(req, res, next) {
        try {
            const { id } = req.params;
            const user = await userService.updateUser(id, req.body);
            return res.success(user, 'User role updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateUserStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { isActive } = req.body;
            const user = await userService.toggleStatus(id, isActive);
            return res.success(user, `User ${isActive ? 'activated' : 'deactivated'} successfully`);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserController();
