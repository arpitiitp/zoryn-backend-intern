const { run, all } = require('../db/sqlite');
const { v4: uuidv4 } = require('uuid');

class AuditLogRepository {
    async createLog(entityType, entityId, action, performedBy, changes) {
        const id = uuidv4();
        const timestamp = new Date().toISOString();
        const changesStr = changes ? JSON.stringify(changes) : null;

        await run(
            `INSERT INTO audit_logs (id, entityType, entityId, action, performedBy, timestamp, changes) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, entityType, entityId, action, performedBy, timestamp, changesStr]
        );
        return { id, entityType, entityId, action, timestamp };
    }

    async findLogsForEntity(entityType, entityId) {
        return await all(
            `SELECT a.*, u.email as performedByEmail 
             FROM audit_logs a 
             LEFT JOIN users u ON a.performedBy = u.id 
             WHERE a.entityType = ? AND a.entityId = ? 
             ORDER BY a.timestamp DESC`,
            [entityType, entityId]
        );
    }
}

module.exports = new AuditLogRepository();
