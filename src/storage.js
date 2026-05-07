import { readFile, writeFile, rename, mkdir } from 'fs/promises';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || '/app/data';
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');

export async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function loadJobs() {
  try {
    const content = await readFile(JOBS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function saveJobs(jobs) {
  // Atomic write: temp file + rename to avoid corruption on concurrent access
  const tmp = `${JOBS_FILE}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(jobs, null, 2), 'utf-8');
  await rename(tmp, JOBS_FILE);
}

export async function addJob(job) {
  const jobs = await loadJobs();
  jobs.unshift(job);
  await saveJobs(jobs);
}

export async function updateJob(id, updates) {
  const jobs = await loadJobs();
  const idx = jobs.findIndex(j => j.id === id);
  if (idx !== -1) {
    Object.assign(jobs[idx], updates);
    await saveJobs(jobs);
  }
}
