import express from 'express';
import { getJobs, getJobById, getStats, updateJobStatus } from '../config/database.js';

const router = express.Router();

// GET /api/jobs
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const platform = req.query.platform || null;
    const minScore = parseFloat(req.query.minScore) || null;
    const search = req.query.search || null;
    const status = req.query.status || null;

    const result = getJobs({ page, limit, platform, minScore, search, status });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/jobs/stats
router.get('/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/jobs/:id/status
router.put('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'Status is required' });
    
    const result = updateJobStatus(req.params.id, status);
    if (result.changes === 0) return res.status(404).json({ success: false, error: 'Job not found' });
    
    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/jobs/:id
router.get('/:id', (req, res) => {
  try {
    const job = getJobById(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
