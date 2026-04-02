const financialRecordRepo = require('../repositories/financialRecordRepository');
const auditLogService = require('./auditLogService');

class FinancialRecordService {
    async createRecord(recordData, userId) {
        const newRecord = await financialRecordRepo.create(recordData, userId);
        
        // fire and forget the audit log -- we don't await this so it doesn't block the actual API response
        auditLogService.logAction('FinancialRecord', newRecord.id, 'CREATE', userId, {
            newState: newRecord
        });

        return newRecord;
    }

    async getRecordById(id) {
        const record = await financialRecordRepo.findById(id);
        if (!record) {
            const err = new Error('Financial record not found');
            err.statusCode = 404;
            throw err;
        }
        return record;
    }

    async listRecords(filters) {
        return await financialRecordRepo.findAll(filters);
    }

    async updateRecord(id, updates, userId) {
        const existingRecord = await this.getRecordById(id);
        
        const updatedRecord = await financialRecordRepo.update(id, updates);
        
        // save the old vs new state diff so admins can rollback or investigate mistakes
        auditLogService.logAction('FinancialRecord', id, 'UPDATE', userId, {
            oldState: existingRecord,
            newState: updatedRecord
        });

        return updatedRecord;
    }

    async deleteRecord(id, userId) {
        const existingRecord = await this.getRecordById(id);
        
        await financialRecordRepo.softDelete(id, userId);
        
        // store what it looked like right before deletion just to be safe
        auditLogService.logAction('FinancialRecord', id, 'DELETE', userId, {
            deletedState: existingRecord
        });

        return true;
    }

    async getAuditLogs(id) {
        // Ensure the record actually existed to pull logs for it
        const logs = await auditLogService.getLogs('FinancialRecord', id);
        return logs;
    }
}

module.exports = new FinancialRecordService();
