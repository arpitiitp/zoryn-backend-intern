require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

// Custom middlewares & routes
const responseFormatter = require('./middlewares/responseFormatter');
const errorHandler = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const recordRoutes = require('./routes/financialRecordRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const swaggerDoc = require('./docs/swagger.js');

const app = express();
const port = process.env.PORT || 3000;

// Bind custom response formatter BEFORE body parser
// so malformed JSON returns 400 instead of 500
app.use(responseFormatter);

// Security and parser setups
app.use(helmet());
app.use(cors());
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100,
  message: {
    success: false,
    message: 'Too many requests. Slow down a bit and try again.'
  }
});

app.use('/api', apiLimiter);

// --- Routes ---

app.get('/health', (req, res) => {
  // Utilizing the formatter middleware attached above
  return res.success(null, 'Finance API is up and running');
});

// Automatically redirect any bare URL visits directly to the docs
app.get('/', (req, res) => {
    res.redirect('/api-docs');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Catch-all error handler [must be at last]
app.use(errorHandler);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`[Server] Live on port ${port}`);
  });
}

module.exports = app;