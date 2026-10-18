const express = require('express');
const cors = require('cors');
const path = require('path');
const healthRoutes = require('./routes/healthRoutes');
const patientRoutes = require('./routes/patientRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const labDataRoutes = require('./routes/labDataRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const ragRoutes = require('./routes/ragRoutes');
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const mealPlanRoutes = require('./routes/mealPlanRoutes');
const dietPlanRoutes = require('./routes/dietPlanRoutes');
const errorHandler = require('./middleware/errorHandler');
const { authenticateDietitian } = require('./middleware/authMiddleware');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Static file serving for uploaded practitioner & patient photographs
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check Routes
app.use('/', healthRoutes);

// Authentication Routes (Public login & dietitian list, Protected me/profile/logout)
app.use('/api/auth', authRoutes);

// Photo Upload Routes (Protected with Multer & disk storage)
app.use('/api/upload', uploadRoutes);

// Phase 2: Dietitian Patient Assessment REST APIs (Protected)
app.use('/api/patients', authenticateDietitian, patientRoutes);
app.use('/api/assessments', authenticateDietitian, assessmentRoutes);
app.use('/api/lab-data', authenticateDietitian, labDataRoutes);

// Phase 3: Deterministic Nutrition Calculation Engine APIs (Protected)
app.use('/api/nutrition', authenticateDietitian, nutritionRoutes);

// Phase 4: Hybrid RAG Knowledge Retrieval Layer APIs (Protected)
app.use('/api/rag', authenticateDietitian, ragRoutes);

// Phase 5: Food & Meal Planning Engine APIs (Protected)
app.use('/api/meal-plan', authenticateDietitian, mealPlanRoutes);

// Phase 6: Gemini-Powered 7-Day Diet Plan APIs (Protected)
app.use('/api/diet-plan', authenticateDietitian, dietPlanRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
