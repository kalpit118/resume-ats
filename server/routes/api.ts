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

// Keywords that indicate a model is NOT a chat/text-generation model
const NON_CHAT_MODEL_KEYWORDS = [
  'embed', 'rerank', 'safety', 'guard', 'reward', 'detector',
  'parse', 'nvclip', 'vila', 'translate', 'chatqa', 'riva',
  'retriever', 'vlm', 'vision', 'content-safety', 'topic-control',
  'clip', 'neva',
];

router.get('/models', async (req, res) => {
  const provider = req.query.provider as string;
  const apiKey = req.headers.authorization;

  if (provider === 'nim') {
    try {
      const response = await fetch('https://integrate.api.nvidia.com/v1/models', {
        headers: apiKey ? { 'Authorization': apiKey } : {}
      });
      const data = await response.json();
      if (data && data.data) {
        // Filter to only chat-capable models
        data.data = data.data.filter((model: { id: string }) => {
          const id = model.id.toLowerCase();
          return !NON_CHAT_MODEL_KEYWORDS.some(kw => id.includes(kw));
        });
      }
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
  
  res.json({ data: [] });
});

export default router;
