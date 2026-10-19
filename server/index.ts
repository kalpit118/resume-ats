import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import apiRoutes from './routes/api.js';
import exportRoutes from './routes/export.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);
app.use('/api/export', exportRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Resume Optimizer API' });
});

// Production: serve built static files from Vite frontend (dist/)
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Express 5 compatible fallback for Single Page Application client-side routing
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

