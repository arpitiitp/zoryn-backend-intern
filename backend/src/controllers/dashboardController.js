const dashboardService = require('../services/dashboardService');

class DashboardController {
    async getSummary(req, res, next) {
        try {
            const summary = await dashboardService.getSummary();
            return res.success(summary, 'Dashboard summary retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getTrends(req, res, next) {
        try {
            const { period } = req.query;
            const trends = await dashboardService.getTrends(period);
            return res.success(trends, 'Dashboard trends retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new DashboardController();
