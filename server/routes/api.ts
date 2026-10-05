import { Router } from 'express';
import multer from 'multer';
import { processUpload } from '../controllers/uploadController.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// Configure multer for temporary file storage
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

router.post('/analyze', upload.single('resume'), processUpload);

router.get('/models', async (req, res) => {
  const provider = req.query.provider as string;
  const apiKey = req.headers.authorization;

  if (provider === 'nim') {
    try {
      const response = await fetch('https://integrate.api.nvidia.com/v1/models', {
        headers: apiKey ? { 'Authorization': apiKey } : {}
      });
      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
  
  res.json({ data: [] });
});

export default router;
