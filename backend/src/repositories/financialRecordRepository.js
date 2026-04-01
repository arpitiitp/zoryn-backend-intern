const { run, get, all, db } = require('../db/sqlite');
const { v4: uuidv4 } = require('uuid');

class FinancialRecordRepository {
    async create(recordData, userId) {
        const id = uuidv4();
        const now = new Date().toISOString();
        const { amount, type, category, date, notes } = recordData;

        await run(
            `INSERT INTO financial_records (id, amount, type, category, date, notes, createdBy, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, amount, type, category, date, notes || null, userId, now, now]
        );
        return await this.findById(id);
    }

    async findById(id) {
        return await get(`SELECT * FROM financial_records WHERE id = ? AND deletedAt IS NULL`, [id]);
    }

    async findAll({ page = 1, limit = 10, type, category, from, to }) {
        let query = `SELECT r.*, u.email as createdByEmail FROM financial_records r 
                     LEFT JOIN users u ON r.createdBy = u.id 
                     WHERE r.deletedAt IS NULL`;
        const params = [];

        // Dynamic Filtering
        if (type) {
            query += ` AND r.type = ?`;
            params.push(type);
        }
        if (category) {
            query += ` AND r.category = ?`;
            params.push(category);
        }
        if (from) {
            query += ` AND r.date >= ?`;
            params.push(from);
        }
        if (to) {
            query += ` AND r.date <= ?`;
            params.push(to);
        }

        query += ` ORDER BY r.date DESC`;

        // Pagination
        const offset = (page - 1) * limit;
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const data = await all(query, params);

        // Get total count for metadata
        let countQuery = `SELECT COUNT(*) as total FROM financial_records r WHERE r.deletedAt IS NULL`;
        const countParams = params.slice(0, params.length - 2); // strip limit & offset

        if (type) countQuery += ` AND r.type = ?`;
        if (category) countQuery += ` AND r.category = ?`;
        if (from) countQuery += ` AND r.date >= ?`;
        if (to) countQuery += ` AND r.date <= ?`;

        const totalRow = await get(countQuery, countParams);
        const total = totalRow ? totalRow.total : 0;

        return {
            data,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async update(id, updates) {
        const { amount, type, category, date, notes } = updates;
        const now = new Date().toISOString();

        await run(
            `UPDATE financial_records 
             SET amount = ?, type = ?, category = ?, date = ?, notes = ?, updatedAt = ? 
             WHERE id = ? AND deletedAt IS NULL`,
            [amount, type, category, date, notes || null, now, id]
        );
        return await this.findById(id);
    }

    async softDelete(id, userId) {
        const now = new Date().toISOString();
        await run(
            `UPDATE financial_records SET deletedAt = ?, deletedBy = ? WHERE id = ? AND deletedAt IS NULL`,
            [now, userId, id]
        );
        return true;
    }
}

module.exports = new FinancialRecordRepository();
