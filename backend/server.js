import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import repoRoutes from './routes/repository.js';
import chatRoutes from './routes/chat.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Enable CORS
app.use(cors());

// Body Parser Middleware (Allowing larger size JSON for folder uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/repositories', repoRoutes);
app.use('/api/chat', chatRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('AI Codebase Assistant API is running...');
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
