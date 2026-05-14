// ============================================
//  SQLite Database Setup & Helpers
// ============================================

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'jobs.db');

let db;

function initDatabase() {
  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');

  // Create jobs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      platform TEXT NOT NULL CHECK(platform IN ('upwork', 'linkedin')),
      url TEXT UNIQUE NOT NULL,
      description TEXT,
      budget TEXT,
      skills_required TEXT,
      client_info TEXT,
      posted_at TEXT,
      scraped_at TEXT DEFAULT (datetime('now')),
      relevance_score REAL DEFAULT 0,
      matched_skills TEXT,
      proposal_snippet TEXT,
      reasoning TEXT,
      alerted INTEGER DEFAULT 0,
      alerted_at TEXT
    )
  `);

  // Safe migration for new 'status' column (try/catch to ignore if exists)
  try {
    db.exec(`ALTER TABLE jobs ADD COLUMN status TEXT DEFAULT 'new'`);
    log('system', 'Database migrated: added status column for tracking', 'success');
  } catch (err) {
    // Column already exists, ignore
  }

  // Create settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create scrape_logs table for stats
  db.exec(`
    CREATE TABLE IF NOT EXISTS scrape_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      jobs_found INTEGER DEFAULT 0,
      new_jobs INTEGER DEFAULT 0,
      high_score_jobs INTEGER DEFAULT 0,
      errors TEXT,
      ran_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create indexes for fast queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_platform ON jobs(platform);
    CREATE INDEX IF NOT EXISTS idx_jobs_score ON jobs(relevance_score);
    CREATE INDEX IF NOT EXISTS idx_jobs_alerted ON jobs(alerted);
    CREATE INDEX IF NOT EXISTS idx_jobs_scraped ON jobs(scraped_at);
  `);

  log('system', `Database initialized at ${DB_PATH}`, 'success');
  return db;
}

// ── Job CRUD Operations ──────────────────────

function insertJob(job) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO jobs (title, platform, url, description, budget, skills_required, client_info, posted_at)
    VALUES (@title, @platform, @url, @description, @budget, @skills_required, @client_info, @posted_at)
  `);

  const result = stmt.run({
    title: job.title || 'Untitled',
    platform: job.platform,
    url: job.url,
    description: job.description || '',
    budget: job.budget || 'Not specified',
    skills_required: job.skills_required || '',
    client_info: job.client_info || '',
    posted_at: job.posted_at || new Date().toISOString(),
  });

  return result.changes > 0; // true if inserted (not duplicate)
}

function insertJobs(jobs) {
  const insertMany = db.transaction((jobList) => {
    let newCount = 0;
    for (const job of jobList) {
      if (insertJob(job)) newCount++;
    }
    return newCount;
  });
  return insertMany(jobs);
}

function getUnscoredJobs(limit = 50) {
  return db.prepare(`
    SELECT * FROM jobs 
    WHERE relevance_score = 0 
    ORDER BY scraped_at DESC 
    LIMIT ?
  `).all(limit);
}

function updateJobScore(jobId, score, matchedSkills, proposalSnippet, reasoning) {
  db.prepare(`
    UPDATE jobs 
    SET relevance_score = ?, matched_skills = ?, proposal_snippet = ?, reasoning = ?
    WHERE id = ?
  `).run(score, JSON.stringify(matchedSkills), proposalSnippet, reasoning, jobId);
}

function getUnalertedHighScoreJobs(threshold = 7) {
  return db.prepare(`
    SELECT * FROM jobs 
    WHERE relevance_score >= ? AND alerted = 0
    ORDER BY relevance_score DESC
  `).all(threshold);
}

function markJobsAlerted(jobIds) {
  const stmt = db.prepare(`
    UPDATE jobs SET alerted = 1, alerted_at = datetime('now') WHERE id = ?
  `);
  const markMany = db.transaction((ids) => {
    for (const id of ids) stmt.run(id);
  });
  markMany(jobIds);
}

function deleteJob(id) {
  return db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
}

function updateJobStatus(id, status) {
  return db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run(status, id);
}

function getJobs({ platform, minScore, page = 1, limit = 20, search, status } = {}) {
  let query = 'SELECT * FROM jobs WHERE 1=1';
  const params = [];

  if (platform) {
    query += ' AND platform = ?';
    params.push(platform);
  }
  if (minScore) {
    query += ' AND relevance_score >= ?';
    params.push(minScore);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // Get total count
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  const { total } = db.prepare(countQuery).get(...params);

  // Add pagination
  query += ' ORDER BY scraped_at DESC LIMIT ? OFFSET ?';
  params.push(limit, (page - 1) * limit);

  const jobs = db.prepare(query).all(...params);

  return { jobs, total, page, totalPages: Math.ceil(total / limit) };
}

function getJobById(id) {
  return db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
}

function getStats() {
  const today = new Date().toISOString().split('T')[0];

  const totalJobs = db.prepare('SELECT COUNT(*) as count FROM jobs').get().count;
  const todayJobs = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE scraped_at >= ?").get(today).count;
  const alertedJobs = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE alerted = 1').get().count;
  const highScoreJobs = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE relevance_score >= 7').get().count;

  const platformStats = db.prepare(`
    SELECT platform, COUNT(*) as count, 
           AVG(relevance_score) as avg_score,
           SUM(CASE WHEN relevance_score >= 7 THEN 1 ELSE 0 END) as high_score_count
    FROM jobs 
    GROUP BY platform
  `).all();

  const scoreDistribution = db.prepare(`
    SELECT 
      SUM(CASE WHEN relevance_score >= 9 THEN 1 ELSE 0 END) as excellent,
      SUM(CASE WHEN relevance_score >= 7 AND relevance_score < 9 THEN 1 ELSE 0 END) as good,
      SUM(CASE WHEN relevance_score >= 5 AND relevance_score < 7 THEN 1 ELSE 0 END) as average,
      SUM(CASE WHEN relevance_score > 0 AND relevance_score < 5 THEN 1 ELSE 0 END) as low,
      SUM(CASE WHEN relevance_score = 0 THEN 1 ELSE 0 END) as unscored
    FROM jobs
  `).get();

  const recentScrapes = db.prepare(`
    SELECT * FROM scrape_logs ORDER BY ran_at DESC LIMIT 10
  `).all();

  return {
    totalJobs,
    todayJobs,
    alertedJobs,
    highScoreJobs,
    platformStats,
    scoreDistribution,
    recentScrapes,
  };
}

// ── Scrape Log Operations ────────────────────

function logScrape(platform, jobsFound, newJobs, highScoreJobs, errors = null) {
  db.prepare(`
    INSERT INTO scrape_logs (platform, jobs_found, new_jobs, high_score_jobs, errors)
    VALUES (?, ?, ?, ?, ?)
  `).run(platform, jobsFound, newJobs, highScoreJobs, errors);
}

// ── Settings Operations ──────────────────────

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : null;
}

function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) 
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
  `).run(key, JSON.stringify(value), JSON.stringify(value));
}

function getDB() {
  return db;
}

export {
  initDatabase,
  getDB,
  insertJob,
  insertJobs,
  getUnscoredJobs,
  updateJobScore,
  getUnalertedHighScoreJobs,
  markJobsAlerted,
  deleteJob,
  updateJobStatus,
  getJobById,
  getJobs,
  getStats,
  logScrape,
  getSetting,
  setSetting,
};
