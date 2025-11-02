import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import featureRoutes from './routes/featureRoutes.js';
import staffRoutes from './routes/staffRoutes.js';

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

  return app;
}

const app = createApp();

export default app;
