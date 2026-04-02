const { get, all } = require('../db/sqlite');

class DashboardService {
    async getSummary() {
        // pushing this sum directly to sqlite so we don't crash the node process by loading 100k rows into an array in memory
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

        // group by category so the frontend can build pie charts easily
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

    async getTrends(period = 'monthly') {
        let trendsQuery;

        if (period === 'weekly') {
            trendsQuery = `
                SELECT 
                    strftime('%Y-%W', date) as periodKey,
                    SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense
                FROM financial_records
                WHERE deletedAt IS NULL
                GROUP BY periodKey
                ORDER BY periodKey ASC
            `;
        } else {
            trendsQuery = `
                SELECT 
                    SUBSTR(date, 1, 7) as periodKey,
                    SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense
                FROM financial_records
                WHERE deletedAt IS NULL
                GROUP BY periodKey
                ORDER BY periodKey ASC
            `;
        }

        const trendsData = await all(trendsQuery);

        return {
            period,
            trends: trendsData
        };
    }
}

module.exports = new DashboardService();
