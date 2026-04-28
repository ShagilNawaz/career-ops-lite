import { Router } from 'express';
import { getProfile } from '../services/dataStore.js';
import { openForAssist } from '../services/scraper.js';

const router = Router();

// POST /  —  open job page with Puppeteer, prefill fields, user submits manually
router.post('/', async (req, res) => {
  try {
    const { jobUrl } = req.body;
    if (!jobUrl) return res.status(400).json({ error: 'jobUrl is required.' });

    const profile = await getProfile();

    const result = await openForAssist(jobUrl, {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      location: profile.location
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
