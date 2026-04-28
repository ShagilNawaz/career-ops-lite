import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fse from 'fs-extra';

import { getProfile, addToHistory, getHistory, deleteFromHistory } from '../services/dataStore.js';
import { generateResumeData } from '../services/ai.js';
import { generatePDF } from '../services/pdfGenerator.js';
import { generateDOCX } from '../services/docxGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, '..', 'outputs');

const router = Router();

// POST /  —  generate resume (PDF + DOCX)
router.post('/', async (req, res) => {
  try {
    const { jobDescription, jobId, jobTitle, company, template = 'ats' } = req.body;

    const profile = await getProfile();
    if (!profile.name) {
      return res.status(400).json({ error: 'Please save your profile before generating a resume.' });
    }

    // Generate structured resume data via AI
    const resumeData = await generateResumeData(profile, jobDescription);

    // Create filenames
    const id = uuid();
    const baseName = `resume-${id}`;
    const pdfPath = join(OUTPUT_DIR, `${baseName}.pdf`);
    const docxPath = join(OUTPUT_DIR, `${baseName}.docx`);

    await fse.ensureDir(OUTPUT_DIR);

    // Generate both formats
    await generatePDF(resumeData, template, pdfPath);
    await generateDOCX(resumeData, docxPath);

    // Save to history
    const historyEntry = {
      id,
      jobId: jobId || null,
      jobTitle: jobTitle || 'Manual',
      company: company || '',
      template,
      generatedAt: new Date().toISOString(),
      pdfFile: `${baseName}.pdf`,
      docxFile: `${baseName}.docx`,
      resumeData
    };
    await addToHistory(historyEntry);

    res.json({
      success: true,
      id,
      resumeData,
      pdfUrl: `/download/${baseName}.pdf`,
      docxUrl: `/download/${baseName}.docx`,
      template
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /history
router.get('/history', async (req, res) => {
  try {
    res.json(await getHistory());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /history/:id
router.delete('/history/:id', async (req, res) => {
  try {
    await deleteFromHistory(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /history/:id/text  —  get plain text of resume for clipboard copy
router.get('/history/:id/text', async (req, res) => {
  try {
    const history = await getHistory();
    const entry = history.find(h => h.id === req.params.id);
    if (!entry) return res.status(404).json({ error: 'Not found' });

    const d = entry.resumeData;
    const lines = [
      d.name, d.contact, '',
      '── SUMMARY ──', d.summary, '',
      '── SKILLS ──', (d.skills || []).join(', '), '',
      '── EXPERIENCE ──',
      ...(d.experience || []).flatMap(e => [
        `${e.role} — ${e.company}`, e.duration,
        ...(e.points || []).map(p => `• ${p}`), ''
      ]),
      '── PROJECTS ──',
      ...(d.projects || []).flatMap(p => [p.name, p.tech || '', p.description, '']),
      '── EDUCATION ──', d.education
    ];

    res.json({ text: lines.join('\n') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
