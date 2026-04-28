import { Router } from 'express';
import { getProfile, saveProfile } from '../services/dataStore.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const profile = await getProfile();
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const saved = await saveProfile(req.body);
    res.json({ success: true, profile: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
