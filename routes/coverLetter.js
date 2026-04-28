import { Router } from 'express';
import { getProfile } from '../services/dataStore.js';
import { generateCoverLetter, generateApplicationAnswers } from '../services/ai.js';

const router = Router();

// POST /  —  generate cover letter for a job
router.post('/', async (req, res) => {
  try {
    const { job } = req.body; // { title, company, description }
    if (!job?.description) {
      return res.status(400).json({ error: 'Job description is required.' });
    }

    const profile = await getProfile();
    const letter = await generateCoverLetter(profile, job);
    res.json({ success: true, coverLetter: letter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /answers  —  generate suggested application answers
router.post('/answers', async (req, res) => {
  try {
    const { job } = req.body;
    if (!job?.description) {
      return res.status(400).json({ error: 'Job description is required.' });
    }

    const profile = await getProfile();
    const answers = await generateApplicationAnswers(profile, job);
    res.json({ success: true, answers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
