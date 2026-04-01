require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const responseFormatter = require('./middlewares/responseFormatter');
const errorHandler = require('./middlewares/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const recordRoutes = require('./routes/financialRecordRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Core Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Apply standardized response formatting to all routes
app.use(responseFormatter);

// Basic Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', globalLimiter);

// check Healthcheck Route
app.get('/health', (req, res) => {
  return res.success(null, 'Finance Backend API is online.');
});

// Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/records', recordRoutes);

// Centralized Error Handler (Must be after mapping all routes)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
