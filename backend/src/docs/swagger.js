const port = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'Production' || process.env.ENV === 'production';

// ── Reusable schema fragments ────────────────────────────────────────────────

const FinancialRecordBody = {
    type: 'object',
    required: ['amount', 'type', 'category', 'date'],
    properties: {
        amount:   { type: 'number',  example: 1250.50, description: 'Must be a positive number' },
        type:     { type: 'string',  enum: ['INCOME', 'EXPENSE'], example: 'INCOME' },
        category: { type: 'string',  enum: ['Salary','Freelance','Bonus','Investment','Rent','Food','Transport','Utilities','Healthcare','Entertainment','Education','Other'], example: 'Freelance' },
        date:     { type: 'string',  format: 'date', example: '2024-05-10' },
        notes:    { type: 'string',  example: 'Project X payment', nullable: true }
    }
};

const FinancialRecordResponse = {
    type: 'object',
    properties: {
        id:             { type: 'string', format: 'uuid' },
        amount:         { type: 'number', example: 1250.50 },
        type:           { type: 'string', enum: ['INCOME', 'EXPENSE'] },
        category:       { type: 'string', example: 'Freelance' },
        date:           { type: 'string', format: 'date' },
        notes:          { type: 'string', nullable: true },
        createdBy:      { type: 'string', format: 'uuid' },
        createdByEmail: { type: 'string', format: 'email' },
        createdAt:      { type: 'string', format: 'date-time' },
        updatedAt:      { type: 'string', format: 'date-time' }
    }
};

const UserResponse = {
    type: 'object',
    properties: {
        id:        { type: 'string', format: 'uuid' },
        email:     { type: 'string', format: 'email' },
        role:      { type: 'string', enum: ['VIEWER', 'ANALYST', 'ADMIN'] },
        isActive:  { type: 'integer', enum: [0, 1], example: 1 },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
    }
};

const AuditLogResponse = {
    type: 'object',
    properties: {
        id:              { type: 'string', format: 'uuid' },
        entityType:      { type: 'string', example: 'FinancialRecord' },
        entityId:        { type: 'string', format: 'uuid' },
        action:          { type: 'string', enum: ['CREATE', 'UPDATE', 'DELETE'] },
        performedBy:     { type: 'string', format: 'uuid' },
        performedByEmail:{ type: 'string', format: 'email' },
        timestamp:       { type: 'string', format: 'date-time' },
        changes:         { type: 'string', description: 'JSON-serialized diff of old vs new state', nullable: true }
    }
};

const SuccessEnvelope = (dataSchema, withMeta = false) => {
    const base = {
        type: 'object',
        properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string',  example: 'Success' },
            data:    dataSchema
        }
    };
    if (withMeta) {
        base.properties.meta = {
            type: 'object',
            properties: {
                total:      { type: 'integer', example: 57 },
                page:       { type: 'integer', example: 1 },
                limit:      { type: 'integer', example: 10 },
                totalPages: { type: 'integer', example: 6 }
            }
        };
    }
    return base;
};

const ErrorEnvelope = (message, code) => ({
    description: `${code} — ${message}`,
    content: {
        'application/json': {
            schema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string',  example: message }
                }
            }
        }
    }
});

const r401 = ErrorEnvelope('Access token is missing or invalid', 401);
const r403 = ErrorEnvelope('Forbidden. Insufficient role permissions', 403);
const r404 = ErrorEnvelope('Resource not found', 404);
const r400 = ErrorEnvelope('"amount" must be a positive number', 400);

// ── Category & pagination query params (reused across record endpoints) ──────

const recordQueryParams = [
    { in: 'query', name: 'page',     schema: { type: 'integer', default: 1 },  description: 'Page number' },
    { in: 'query', name: 'limit',    schema: { type: 'integer', default: 10 }, description: 'Records per page' },
    { in: 'query', name: 'type',     schema: { type: 'string', enum: ['INCOME', 'EXPENSE'] }, description: 'Filter by type' },
    { in: 'query', name: 'category', schema: { type: 'string', enum: ['Salary','Freelance','Bonus','Investment','Rent','Food','Transport','Utilities','Healthcare','Entertainment','Education','Other'] }, description: 'Filter by category' },
    { in: 'query', name: 'from',     schema: { type: 'string', format: 'date', example: '2025-01-01' }, description: 'Start date filter (YYYY-MM-DD)' },
    { in: 'query', name: 'to',       schema: { type: 'string', format: 'date', example: '2026-04-03' }, description: 'End date filter (YYYY-MM-DD)' }
];

// ── Full spec ────────────────────────────────────────────────────────────────

module.exports = {
    openapi: '3.0.0',
    info: {
        title: 'Finance Data Processing API',
        version: '1.0.0',
        description: [
            'Role-based finance management API with JWT authentication, soft-delete, audit logging, and dashboard analytics.',
            '',
            '**Quick Start:**',
            '1. Call `POST /api/auth/login` with one of the seeded credentials below.',
            '2. Copy the `token` from the response.',
            '3. Click the **Authorize** 🔒 button at the top and paste the token.',
            '',
            '**Seeded credentials:**',
            '| Role | Email | Password |',
            '|------|-------|----------|',
            '| ADMIN | admin@zorvyn.local | admin123 |',
            '| ANALYST | analyst@zorvyn.local | analyst123 |',
            '| VIEWER | viewer@zorvyn.local | viewer123 |',
            '| VIEWER (inactive) | inactive@zorvyn.local | inactive123 |'
        ].join('\n')
    },
    servers: [
        {
            url: isProd ? 'https://zoryn-backend-intern.onrender.com' : `http://localhost:${port}`,
            description: isProd ? 'Production' : 'Local Development'
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
        },
        schemas: {
            FinancialRecordBody,
            FinancialRecordResponse,
            UserResponse,
            AuditLogResponse
        }
    },
    security: [{ bearerAuth: [] }],
    tags: [
        { name: 'Authentication', description: 'Login and token management' },
        { name: 'Users',          description: 'User management — Admin only' },
        { name: 'Records',        description: 'Financial record CRUD — Admin & Analyst' },
        { name: 'Dashboard',      description: 'Aggregated analytics — all roles' }
    ],
    paths: {

        // ── AUTH ─────────────────────────────────────────────────────────────

        '/api/auth/login': {
            post: {
                tags: ['Authentication'],
                summary: 'Login and receive a JWT token',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email:    { type: 'string', format: 'email', example: 'admin@zorvyn.local' },
                                    password: { type: 'string', example: 'admin123' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Login successful — returns JWT token and user info',
                        content: {
                            'application/json': {
                                schema: SuccessEnvelope({
                                    type: 'object',
                                    properties: {
                                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                                        user:  {
                                            type: 'object',
                                            properties: {
                                                id:    { type: 'string', format: 'uuid' },
                                                email: { type: 'string', format: 'email' },
                                                role:  { type: 'string', enum: ['VIEWER', 'ANALYST', 'ADMIN'] }
                                            }
                                        }
                                    }
                                })
                            }
                        }
                    },
                    400: r400,
                    401: ErrorEnvelope('Invalid email or password', 401),
                    403: ErrorEnvelope('Account disabled', 403)
                }
            }
        },

        // ── USERS ─────────────────────────────────────────────────────────────

        '/api/users': {
            get: {
                tags: ['Users'],
                summary: 'List all users',
                description: 'Returns all users. Supports optional filtering by role and active status. **Admin only.**',
                parameters: [
                    { in: 'query', name: 'role',     schema: { type: 'string', enum: ['VIEWER', 'ANALYST', 'ADMIN'] }, description: 'Filter by role' },
                    { in: 'query', name: 'isActive', schema: { type: 'boolean' }, description: 'Filter by active status' }
                ],
                responses: {
                    200: {
                        description: 'Array of users (passwordHash excluded)',
                        content: {
                            'application/json': {
                                schema: SuccessEnvelope({ type: 'array', items: UserResponse })
                            }
                        }
                    },
                    401: r401,
                    403: r403
                }
            },
            post: {
                tags: ['Users'],
                summary: 'Create a new user',
                description: 'Creates a platform user with a hashed password. **Admin only.**',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password', 'role'],
                                properties: {
                                    email:    { type: 'string', format: 'email', example: 'newuser@zorvyn.local' },
                                    password: { type: 'string', minLength: 6, example: 'securepass' },
                                    role:     { type: 'string', enum: ['VIEWER', 'ANALYST', 'ADMIN'], example: 'ANALYST' },
                                    isActive: { type: 'boolean', default: true }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: {
                        description: 'User created successfully',
                        content: {
                            'application/json': {
                                schema: SuccessEnvelope(UserResponse)
                            }
                        }
                    },
                    400: r400,
                    401: r401,
                    403: r403,
                    409: ErrorEnvelope('User with this email already exists', 409)
                }
            }
        },

        '/api/users/{id}': {
            put: {
                tags: ['Users'],
                summary: 'Update a user\'s role',
                description: 'Changes the role of an existing user. **Admin only.**',
                parameters: [
                    { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'User UUID' }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['role'],
                                properties: {
                                    role: { type: 'string', enum: ['VIEWER', 'ANALYST', 'ADMIN'], example: 'VIEWER' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Role updated',
                        content: { 'application/json': { schema: SuccessEnvelope(UserResponse) } }
                    },
                    400: r400,
                    401: r401,
                    403: r403,
                    404: r404
                }
            }
        },

        '/api/users/{id}/status': {
            patch: {
                tags: ['Users'],
                summary: 'Toggle user active/inactive status',
                description: 'Activates or deactivates a user account. Deactivated users cannot log in. **Admin only.**',
                parameters: [
                    { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'User UUID' }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['isActive'],
                                properties: {
                                    isActive: { type: 'boolean', example: false }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Status updated',
                        content: { 'application/json': { schema: SuccessEnvelope(UserResponse) } }
                    },
                    400: r400,
                    401: r401,
                    403: r403,
                    404: r404
                }
            }
        },

        // ── RECORDS ───────────────────────────────────────────────────────────

        '/api/records': {
            get: {
                tags: ['Records'],
                summary: 'List financial records',
                description: 'Returns paginated records. Supports filtering by type, category, and date range. Soft-deleted records are always excluded. **All roles.**',
                parameters: recordQueryParams,
                responses: {
                    200: {
                        description: 'Paginated records with metadata',
                        content: {
                            'application/json': {
                                schema: SuccessEnvelope({ type: 'array', items: FinancialRecordResponse }, true)
                            }
                        }
                    },
                    401: r401
                }
            },
            post: {
                tags: ['Records'],
                summary: 'Create a financial record',
                description: 'Creates a new record. Triggers an async audit log entry. **Admin and Analyst.**',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: FinancialRecordBody } }
                },
                responses: {
                    201: {
                        description: 'Record created',
                        content: { 'application/json': { schema: SuccessEnvelope(FinancialRecordResponse) } }
                    },
                    400: r400,
                    401: r401,
                    403: r403
                }
            }
        },

        '/api/records/{id}': {
            get: {
                tags: ['Records'],
                summary: 'Get a single record by ID',
                description: 'Returns a single non-deleted record. **All roles.**',
                parameters: [
                    { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }
                ],
                responses: {
                    200: {
                        description: 'Record found',
                        content: { 'application/json': { schema: SuccessEnvelope(FinancialRecordResponse) } }
                    },
                    401: r401,
                    404: r404
                }
            },
            put: {
                tags: ['Records'],
                summary: 'Update a financial record',
                description: 'Full update of a record. Admins can update any record. Analysts can only update records they created. Triggers an async audit log diff. **Admin and Analyst (own records only).**',
                parameters: [
                    { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }
                ],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: FinancialRecordBody } }
                },
                responses: {
                    200: {
                        description: 'Record updated',
                        content: { 'application/json': { schema: SuccessEnvelope(FinancialRecordResponse) } }
                    },
                    400: r400,
                    401: r401,
                    403: r403,
                    404: r404
                }
            },
            delete: {
                tags: ['Records'],
                summary: 'Soft-delete a record',
                description: 'Flags the record with `deletedAt` and `deletedBy`. The row is preserved in the database but excluded from all queries. Triggers an async audit log entry. **Admin only.**',
                parameters: [
                    { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }
                ],
                responses: {
                    200: { description: 'Record soft-deleted successfully' },
                    401: r401,
                    403: r403,
                    404: r404
                }
            }
        },

        '/api/records/{id}/audit-logs': {
            get: {
                tags: ['Records'],
                summary: 'Get audit logs for a record',
                description: 'Returns the full modification history for a record — CREATE, UPDATE, and DELETE entries with JSON change diffs. **All roles.**',
                parameters: [
                    { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }
                ],
                responses: {
                    200: {
                        description: 'Audit log entries ordered by timestamp descending',
                        content: {
                            'application/json': {
                                schema: SuccessEnvelope({ type: 'array', items: AuditLogResponse })
                            }
                        }
                    },
                    401: r401
                }
            }
        },

        // ── DASHBOARD ─────────────────────────────────────────────────────────

        '/api/dashboard/summary': {
            get: {
                tags: ['Dashboard'],
                summary: 'Get financial summary',
                description: 'Returns total income, total expenses, net balance, and a category breakdown. All aggregations are computed at the database level via `SUM()` and `GROUP BY`. Soft-deleted records are excluded. **All roles.**',
                responses: {
                    200: {
                        description: 'Dashboard summary',
                        content: {
                            'application/json': {
                                schema: SuccessEnvelope({
                                    type: 'object',
                                    properties: {
                                        totalIncome:    { type: 'number', example: 85000 },
                                        totalExpenses:  { type: 'number', example: 32000 },
                                        netBalance:     { type: 'number', example: 53000 },
                                        categories: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    category: { type: 'string', example: 'Salary' },
                                                    type:     { type: 'string', enum: ['INCOME', 'EXPENSE'] },
                                                    total:    { type: 'number', example: 42000 }
                                                }
                                            }
                                        }
                                    }
                                })
                            }
                        }
                    },
                    401: r401
                }
            }
        },

        '/api/dashboard/trends': {
            get: {
                tags: ['Dashboard'],
                summary: 'Get income/expense trends',
                description: 'Returns aggregated income and expense totals grouped by time period. Uses SQLite `strftime()` for grouping. Soft-deleted records are excluded. **All roles.**',
                parameters: [
                    {
                        in: 'query',
                        name: 'period',
                        schema: { type: 'string', enum: ['monthly', 'weekly'], default: 'monthly' },
                        description: '`monthly` groups by YYYY-MM, `weekly` groups by ISO week (YYYY-WW)'
                    }
                ],
                responses: {
                    200: {
                        description: 'Trend data ordered by period ascending',
                        content: {
                            'application/json': {
                                schema: SuccessEnvelope({
                                    type: 'object',
                                    properties: {
                                        period: { type: 'string', enum: ['monthly', 'weekly'], example: 'monthly' },
                                        trends: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    periodKey: { type: 'string', example: '2025-04' },
                                                    income:    { type: 'number', example: 7500 },
                                                    expense:   { type: 'number', example: 2300 }
                                                }
                                            }
                                        }
                                    }
                                })
                            }
                        }
                    },
                    401: r401
                }
            }
        }
    }
};
