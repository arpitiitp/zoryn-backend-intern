const port = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'Production' || process.env.ENV === 'production';

module.exports = {
  "openapi": "3.0.0",
  "info": {
    "title": "Finance Data Processing API",
    "version": "1.0.0",
    "description": "API for managing financial records, users, and dashboard summaries."
  },
  "servers": [
    {
      "url": isProd ? "https://zoryn-backend-intern.onrender.com" : `http://localhost:${port}`,
      "description": isProd ? "Production Environment" : "Local Development"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  },
  "security": [
    {
      "bearerAuth": []
    }
  ],
  "paths": {
    "/api/auth/login": {
      "post": {
        "summary": "Login to receive JWT token",
        "tags": [
          "Authentication"
        ],
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "email": {
                    "type": "string",
                    "example": "admin@yourdomain.com"
                  },
                  "password": {
                    "type": "string",
                    "example": "your_secure_password"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Token generated successfully"
          }
        }
      }
    },
    "/api/records": {
      "get": {
        "summary": "List financial records with pagination and filtering",
        "tags": [
          "Records"
        ],
        "parameters": [
          {
            "in": "query",
            "name": "page",
            "schema": {
              "type": "integer",
              "default": 1
            }
          },
          {
            "in": "query",
            "name": "limit",
            "schema": {
              "type": "integer",
              "default": 10
            }
          },
          {
            "in": "query",
            "name": "type",
            "description": "Filter by record type",
            "schema": {
              "type": "string",
              "enum": ["INCOME", "EXPENSE"]
            }
          },
          {
            "in": "query",
            "name": "category",
            "description": "Filter by category",
            "schema": {
              "type": "string",
              "enum": [
                "Salary",
                "Freelance",
                "Bonus",
                "Investment",
                "Rent",
                "Food",
                "Transport",
                "Utilities",
                "Healthcare",
                "Entertainment",
                "Education",
                "Other"
              ]
            }
          },
          {
            "in": "query",
            "name": "from",
            "description": "Filter records from this date (YYYY-MM-DD)",
            "schema": {
              "type": "string",
              "format": "date",
              "example": "2024-01-01"
            }
          },
          {
            "in": "query",
            "name": "to",
            "description": "Filter records up to this date (YYYY-MM-DD)",
            "schema": {
              "type": "string",
              "format": "date",
              "example": "2024-12-31"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Paginated array of records"
          }
        }
      },
      "post": {
        "summary": "Create a new financial record",
        "tags": [
          "Records"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "amount": {
                    "type": "number",
                    "example": 1250.50
                  },
                  "type": {
                    "type": "string",
                    "description": "Must be one of the listed values",
                    "enum": ["INCOME", "EXPENSE"],
                    "example": "INCOME"
                  },
                  "category": {
                    "type": "string",
                    "description": "Must be one of the listed values",
                    "enum": [
                      "Salary",
                      "Freelance",
                      "Bonus",
                      "Investment",
                      "Rent",
                      "Food",
                      "Transport",
                      "Utilities",
                      "Healthcare",
                      "Entertainment",
                      "Education",
                      "Other"
                    ],
                    "example": "Freelance"
                  },
                  "date": {
                    "type": "string",
                    "format": "date",
                    "example": "2024-05-10"
                  },
                  "notes": {
                    "type": "string",
                    "example": "Project X payment"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Record created"
          }
        }
      }
    },
    "/api/dashboard/summary": {
      "get": {
        "summary": "Get total income, expenses, and net balance",
        "tags": [
          "Dashboard"
        ],
        "responses": {
          "200": {
            "description": "Dashboard totals"
          }
        }
      }
    }
  }
};
