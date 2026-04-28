import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import {
  getJobs, upsertJob, updateJobStatus, deleteJob, getProfile
} from '../services/dataStore.js';
import { scoreJob, analyzeSkillGap } from '../services/ai.js';
import {
  scrapeJobFromURL,
  scrapeLinkedInJobs,
  scrapeInternshalaJobs,
  scrapeIndeedJobs,
  scrapeNaukriJobs
} from '../services/scraper.js';

const router = Router();

// GET all saved jobs
router.get('/', async (req, res) => {
  try {
    res.json(await getJobs());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /fetch  —  fetch jobs from URLs or portal search
router.post('/fetch', async (req, res) => {
  const { urls = [], portal, query, maxJobs = 10 } = req.body;
  const results = [];
  const errors = [];

  try {
    // 1. Process individual URLs
    for (const url of urls) {
      if (!url.trim()) continue;
      try {
        const job = await scrapeJobFromURL(url.trim());
        job.id = uuid();
        job.status = 'not-applied';
        job.fetchedAt = new Date().toISOString();
        await upsertJob(job);
        results.push(job);
      } catch (err) {
        errors.push({ url, error: err.message });
      }
    }

    // 2. Portal search
    if (portal && query) {
      let portalJobs = [];
      try {
        if (portal === 'linkedin') portalJobs = await scrapeLinkedInJobs(query, maxJobs);
        else if (portal === 'internshala') portalJobs = await scrapeInternshalaJobs(query, maxJobs);
        else if (portal === 'indeed') portalJobs = await scrapeIndeedJobs(query, maxJobs);
        else if (portal === 'naukri') portalJobs = await scrapeNaukriJobs(query, maxJobs);
      } catch (err) {
        errors.push({ portal, error: err.message });
      }

      for (const job of portalJobs) {
        job.id = uuid();
        job.status = 'not-applied';
        job.fetchedAt = new Date().toISOString();
        await upsertJob(job);
        results.push(job);
      }
    }

    res.json({ fetched: results.length, jobs: results, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /add  —  add a job manually (paste description)
router.post('/add', async (req, res) => {
  try {
    const { title, company, description, url = '', location = '' } = req.body;
    const job = {
      id: uuid(),
      title, company, description, url, location,
      source: 'manual',
      status: 'not-applied',
      fetchedAt: new Date().toISOString(),
      postedDate: new Date().toISOString()
    };
    await upsertJob(job);
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /score-all  —  AI score all jobs that don't have a score yet
router.post('/score-all', async (req, res) => {
  try {
    const profile = await getProfile();
    const jobs = await getJobs();
    const toScore = jobs.filter(j => !j.score && j.description);
    const scored = [];

    for (const job of toScore) {
      try {
        const analysis = await scoreJob(profile, job);
        const updated = {
          ...job,
          score: analysis.score,
          reasoning: analysis.reasoning,
          missingSkills: analysis.missingSkills || [],
          matchingSkills: analysis.matchingSkills || [],
          recommendation: analysis.recommendation,
          atsKeywords: analysis.atsKeywords || [],
          scoredAt: new Date().toISOString()
        };
        await upsertJob(updated);
        scored.push(updated);
      } catch (err) {
        scored.push({ ...job, scoreError: err.message });
      }
    }

    // Sort all jobs by score descending
    const allJobs = await getJobs();
    allJobs.sort((a, b) => (b.score || 0) - (a.score || 0));

    res.json({ scored: scored.length, jobs: allJobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /score/:id  —  score a single job
router.post('/score/:id', async (req, res) => {
  try {
    const profile = await getProfile();
    const jobs = await getJobs();
    const job = jobs.find(j => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const analysis = await scoreJob(profile, job);
    const updated = {
      ...job,
      score: analysis.score,
      reasoning: analysis.reasoning,
      missingSkills: analysis.missingSkills || [],
      matchingSkills: analysis.matchingSkills || [],
      recommendation: analysis.recommendation,
      atsKeywords: analysis.atsKeywords || [],
      scoredAt: new Date().toISOString()
    };
    await upsertJob(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /skill-gap  —  analyze skill gaps across all jobs
router.get('/skill-gap', async (req, res) => {
  try {
    const profile = await getProfile();
    const jobs = await getJobs();
    if (!jobs.length) return res.json({ message: 'No jobs to analyze' });

    const analysis = await analyzeSkillGap(profile, jobs);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const updated = await updateJobStatus(req.params.id, status, notes);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    await deleteJob(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /all  —  clear all jobs
router.delete('/', async (req, res) => {
  try {
    const { saveJobs } = await import('../services/dataStore.js');
    await saveJobs([]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
