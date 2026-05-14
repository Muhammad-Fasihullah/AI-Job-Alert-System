// ============================================
//  Email Alert System (Nodemailer)
// ============================================

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { log } from '../utils/logger.js';
import { markJobsAlerted } from '../config/database.js';

dotenv.config();

let transporter = null;

try {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  } else {
    log('email', 'Gmail credentials not configured in .env. Email alerts disabled.', 'warn');
  }
} catch (error) {
  log('email', `Failed to initialize email transporter: ${error.message}`, 'error');
}

/**
 * Send an email alert for high-scoring jobs
 * @param {Array} jobs - Array of high-scoring job objects
 */
async function sendJobAlerts(jobs) {
  if (!transporter || jobs.length === 0) return false;
  if (!process.env.ALERT_EMAIL) {
    log('email', 'ALERT_EMAIL not set in .env', 'error');
    return false;
  }

  log('email', `Sending alert for ${jobs.length} new high-match jobs...`);

  // Build HTML email content
  let htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px;">
        🚀 Job Alert: ${jobs.length} New Matches
      </h2>
  `;

  for (const job of jobs) {
    let scoreColor = job.relevance_score >= 9 ? '#27ae60' : (job.relevance_score >= 7 ? '#f39c12' : '#e74c3c');
    let platformColor = {
      fiverr: '#1dbf73',
      upwork: '#14a800',
      linkedin: '#0077b5'
    }[job.platform] || '#333';

    let matchedSkillsStr = 'None specified';
    if (job.matched_skills) {
      try {
        const skillsArray = JSON.parse(job.matched_skills);
        matchedSkillsStr = skillsArray.join(', ');
      } catch (e) {
        matchedSkillsStr = job.matched_skills;
      }
    }

    htmlContent += `
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <h3 style="margin: 0; font-size: 18px; line-height: 1.4;">
            <a href="${job.url}" style="color: #2980b9; text-decoration: none;" target="_blank">
              ${job.title}
            </a>
          </h3>
        </div>

        <div style="margin-bottom: 15px;">
          <span style="background-color: ${platformColor}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
            ${job.platform}
          </span>
          <span style="background-color: ${scoreColor}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-left: 5px;">
            Score: ${job.relevance_score}/10
          </span>
          <span style="color: #7f8c8d; font-size: 13px; margin-left: 10px;">
            💰 ${job.budget}
          </span>
        </div>

        <p style="font-size: 14px; color: #34495e; margin-bottom: 10px;">
          <strong>Matched Skills:</strong> ${matchedSkillsStr}
        </p>

        <div style="background-color: #f8f9fa; padding: 12px; border-left: 4px solid ${scoreColor}; border-radius: 4px; font-size: 14px; color: #2c3e50; font-style: italic; margin-bottom: 15px;">
          <strong>AI Proposal Snippet:</strong><br/>
          "${job.proposal_snippet}"
        </div>
        
        <div style="font-size: 12px; color: #95a5a6; margin-bottom: 15px;">
          <em>AI Reasoning: ${job.reasoning}</em>
        </div>

        <a href="${job.url}" style="display: inline-block; background-color: #2980b9; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px;" target="_blank">
          View & Apply →
        </a>
      </div>
    `;
  }

  htmlContent += `
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #95a5a6; font-size: 12px;">
        Sent by your Automated Job Alert System<br/>
        <a href="http://localhost:5173" style="color: #2980b9;">View Dashboard</a>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Job Alert System" <${process.env.GMAIL_USER}>`,
    to: process.env.ALERT_EMAIL,
    subject: `🔥 ${jobs.length} New Job Matches (${jobs[0].platform.toUpperCase()} - ${jobs[0].relevance_score}/10)`,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    log('email', `Alert sent successfully: ${info.messageId}`, 'success');
    
    // Mark jobs as alerted in DB
    const jobIds = jobs.map(j => j.id);
    markJobsAlerted(jobIds);
    
    return true;
  } catch (error) {
    log('email', `Failed to send alert: ${error.message}`, 'error');
    return false;
  }
}

export { sendJobAlerts };
