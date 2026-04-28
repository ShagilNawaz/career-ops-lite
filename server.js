import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fse from 'fs-extra';

import resumeRoutes from './routes/resume.js';
import jobsRoutes from './routes/jobs.js';
import profileRoutes from './routes/profile.js';
import coverLetterRoutes from './routes/coverLetter.js';
import applyRoutes from './routes/apply.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, 'public')));

// Ensure required dirs exist on startup
await fse.ensureDir(join(__dirname, 'outputs'));
await fse.ensureDir(join(__dirname, 'data'));

// API routes
app.use('/api/resume', resumeRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/cover-letter', coverLetterRoutes);
app.use('/api/apply', applyRoutes);

// File download
app.get('/download/:file', (req, res) => {
  const filePath = join(__dirname, 'outputs', req.params.file);
  if (!fse.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.download(filePath);
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const ollamaRes = await fetch(`${process.env.OLLAMA_URL}/api/tags`, { timeout: 3000 });
    const ollamaOk = ollamaRes.ok;
    res.json({ status: 'ok', ollama: ollamaOk ? 'connected' : 'error' });
  } catch {
    res.json({ status: 'ok', ollama: 'unreachable' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Career Ops Lite v2 running at http://localhost:${PORT}`);
  console.log(`   Ollama: ${process.env.OLLAMA_URL}  (model: ${process.env.MODEL})`);
  console.log(`   Open your browser → http://localhost:${PORT}\n`);
});
