const { get, all } = require('../db/sqlite');

class DashboardService {
    async getSummary() {
        // High-performance single-pass aggregation for totals
        const totalsQuery = `
            SELECT 
                SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as totalIncome,
                SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as totalExpense
            FROM financial_records 
            WHERE deletedAt IS NULL
        `;
        const totals = await get(totalsQuery);
        
        const income = totals.totalIncome || 0;
        const expenses = totals.totalExpense || 0;
        const netBalance = income - expenses;

        // Category-wise totals
        const categoryQuery = `
            SELECT category, type, SUM(amount) as total
            FROM financial_records
            WHERE deletedAt IS NULL
            GROUP BY category, type
            ORDER BY total DESC
        `;
        const categories = await all(categoryQuery);

        return {
            totalIncome: income,
            totalExpenses: expenses,
            netBalance,
            categories
        };
    }

    async getTrends() {
        // Monthly trends aggregation (assumes ISO dates YYYY-MM-DD...)
        const trendsQuery = `
            SELECT 
                SUBSTR(date, 1, 7) as month,
                SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense
            FROM financial_records
            WHERE deletedAt IS NULL
            GROUP BY month
            ORDER BY month ASC
        `;
        const monthlyTrends = await all(trendsQuery);

        return {
            monthlyTrends
        };
    }
}

module.exports = new DashboardService();
