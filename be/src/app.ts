import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import featureRoutes from './routes/featureRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import classroomRoutes from './routes/classroomRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import examRoutes from './routes/examRoutes.js';
import teachingRoutes from './routes/teachingRoutes.js';
import systemRoutes from './routes/systemRoutes.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', authRoutes);
  app.use('/api/features', featureRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/classrooms', classroomRoutes);
  app.use('/api/finance', financeRoutes);
  app.use('/api/exams', examRoutes);
  app.use('/api/teaching', teachingRoutes);
  app.use('/api/system', systemRoutes);

  return app;
}

const app = createApp();

export default app;
