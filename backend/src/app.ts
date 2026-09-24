import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import documentRoutes from './routes/documents.js';
import commentRoutes from './routes/comments.js';
import meRoutes from './routes/me.js';
import adminRoutes from './routes/admin.js';
import inviteRoutes from './routes/invites.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.use(express.json());

  // Healthcheck endpoint
  app.get(['/health', '/api/health'], (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/me', meRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/invites', inviteRoutes);

  // Serve static frontend files when built in production
  const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDistPath));

  // Client-side routing fallback for non-API GET requests
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
      res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
        if (err) next();
      });
      return;
    }
    next();
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
