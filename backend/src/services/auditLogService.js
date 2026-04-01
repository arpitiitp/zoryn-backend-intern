const auditLogRepo = require('../repositories/auditLogRepository');

class AuditLogService {
    async logAction(entityType, entityId, action, performedBy, changes = null) {
        // Runs asynchronously intentionally, no need to strictly await it to block the main thread response unless transaction safety is needed.
        auditLogRepo.createLog(entityType, entityId, action, performedBy, changes).catch(err => {
            console.error('Failed to write audit log:', err);
        });
    }

    async getLogs(entityType, entityId) {
        return await auditLogRepo.findLogsForEntity(entityType, entityId);
    }
}

module.exports = new AuditLogService();
