// ============================================
//  Settings API Routes
// ============================================

import express from 'express';
import { getSetting, setSetting } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GET /api/settings
router.get('/', (req, res) => {
  try {
    let config = getSetting('skills_profile');
    
    // If not in DB, load from JSON
    if (!config) {
      config = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'config', 'skills.json'), 'utf8')
      );
      // Save it to DB for future
      setSetting('skills_profile', config);
    }
    
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/settings
router.put('/', express.json(), (req, res) => {
  try {
    const updates = req.body;
    
    // Validate minimally
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid settings object' });
    }
    
    // Merge with existing
    let current = getSetting('skills_profile') || {};
    const newConfig = { ...current, ...updates };
    
    setSetting('skills_profile', newConfig);
    
    res.json({ success: true, data: newConfig });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
