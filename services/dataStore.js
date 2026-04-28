import fse from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

const PATHS = {
  profile:  join(DATA_DIR, 'profile.json'),
  jobs:     join(DATA_DIR, 'jobs.json'),
  history:  join(DATA_DIR, 'history.json'),
  tracker:  join(DATA_DIR, 'tracker.json'),
};

async function read(file) {
  await fse.ensureFile(file);
  const raw = await fse.readFile(file, 'utf-8');
  if (!raw.trim()) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function write(file, data) {
  await fse.ensureFile(file);
  await fse.writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Profile ─────────────────────────────────────────────────────────────────

export async function getProfile() {
  return (await read(PATHS.profile)) || {
    name: '', email: '', phone: '', location: '',
    linkedin: '', github: '', summary: '',
    skills: [], experience: [], projects: [],
    education: '', certifications: []
  };
}

export async function saveProfile(data) {
  await write(PATHS.profile, data);
  return data;
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export async function getJobs() {
  return (await read(PATHS.jobs)) || [];
}

export async function saveJobs(jobs) {
  await write(PATHS.jobs, jobs);
}

export async function upsertJob(job) {
  const jobs = await getJobs();
  const idx = jobs.findIndex(j => j.id === job.id);
  if (idx >= 0) jobs[idx] = { ...jobs[idx], ...job };
  else jobs.unshift(job);
  await saveJobs(jobs);
  return job;
}

export async function updateJobStatus(id, status, notes = '') {
  const jobs = await getJobs();
  const job = jobs.find(j => j.id === id);
  if (!job) throw new Error('Job not found');
  job.status = status;
  if (notes) job.notes = notes;
  job.statusUpdatedAt = new Date().toISOString();
  await saveJobs(jobs);
  return job;
}

export async function deleteJob(id) {
  const jobs = await getJobs();
  await saveJobs(jobs.filter(j => j.id !== id));
}

// ── Resume History ────────────────────────────────────────────────────────────

export async function getHistory() {
  return (await read(PATHS.history)) || [];
}

export async function addToHistory(entry) {
  const history = await getHistory();
  history.unshift(entry);
  await write(PATHS.history, history);
  return entry;
}

export async function deleteFromHistory(id) {
  const history = await getHistory();
  await write(PATHS.history, history.filter(h => h.id !== id));
}
