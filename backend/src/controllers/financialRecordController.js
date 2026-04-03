const financialRecordService = require('../services/financialRecordService');

class FinancialRecordController {
    async create(req, res, next) {
        try {
            const record = await financialRecordService.createRecord(req.body, req.user.id);
            return res.success(record, 'Financial record created successfully', null, 201);
        } catch (error) {
            next(error);
        }
    }

    async getAll(req, res, next) {
        try {
            const { page, limit, type, category, from, to } = req.query;
            const result = await financialRecordService.listRecords({ page, limit, type, category, from, to });
            return res.success(result.data, 'Records retrieved successfully', result.meta);
        } catch (error) {
            next(error);
        }
    }

    async getOne(req, res, next) {
        try {
            const record = await financialRecordService.getRecordById(req.params.id);
            return res.success(record, 'Record retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            if (req.user.role === 'ANALYST') {
                const existingRecord = await financialRecordService.getRecordById(req.params.id);
                if (existingRecord.createdBy !== req.user.id) {
                    return res.error('Analysts can only edit their own records', 403);
                }
            }
            const record = await financialRecordService.updateRecord(req.params.id, req.body, req.user.id);
            return res.success(record, 'Record updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await financialRecordService.deleteRecord(req.params.id, req.user.id);
            return res.success(null, 'Record deleted successfully (soft-delete)');
        } catch (error) {
            next(error);
        }
    }

    async getLogs(req, res, next) {
        try {
            const logs = await financialRecordService.getAuditLogs(req.params.id);
            return res.success(logs, 'Audit logs retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new FinancialRecordController();
