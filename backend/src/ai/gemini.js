// ============================================
//  Gemini AI Relevance Scoring Engine
// ============================================

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { log } from '../utils/logger.js';
import dotenv from 'dotenv';
import { getSetting } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to get active Gemini instance
function getGenAI() {
  const config = getSetting('skills_profile') || {};
  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

// Define the structured JSON output schema we want from Gemini
const scoringSchema = {
  type: SchemaType.OBJECT,
  properties: {
    relevanceScore: {
      type: SchemaType.INTEGER,
      description: "A score from 1 to 10 evaluating how well the job matches the user's skills and profile.",
    },
    matchedSkills: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "List of specific skills from the user profile that matched the job requirements.",
    },
    proposalSnippet: {
      type: SchemaType.STRING,
      description: "A complete, highly personalized cover letter/proposal tailored to this specific job. Keep it concise but professional, covering how you can solve their problem.",
    },
    reasoning: {
      type: SchemaType.STRING,
      description: "A brief 1-sentence explanation of why you gave this score.",
    },
  },
  required: ["relevanceScore", "matchedSkills", "proposalSnippet", "reasoning"],
};

/**
 * Score a single job using Gemini 2.0 Flash
 */
async function scoreJob(job) {
  const genAI = getGenAI();
  if (!genAI) {
     log('gemini', 'Missing GEMINI_API_KEY. Skipping AI score.', 'warn');
     return null;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.2, // Low temperature for consistent scoring
        responseMimeType: "application/json",
        responseSchema: scoringSchema,
      },
    });

    // Get user profile
    let profile = getSetting('skills_profile');
    if (!profile) {
      profile = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'skills.json'), 'utf8'));
    }

    const prompt = `
      You are an expert technical recruiter and freelance strategist.
      Evaluate the following freelance job posting against the user's skills profile.

      USER PROFILE:
      - Core Keywords: ${profile.keywords.join(', ')}
      - Minimum Target Budget: $${profile.minBudget}
      - Background: ${profile.description}

      JOB POSTING:
      - Title: ${job.title}
      - Budget: ${job.budget || 'Not specified'}
      - Skills Required: ${job.skills_required || 'Not specified'}
      - Description: ${job.description || 'Not provided'}

      TASK:
      1. Score the job from 1-10 based on how well it matches the User Profile.
         - 8-10: Perfect match (tech stack aligns completely, budget is good).
         - 5-7: Partial match (some skills align, or tech is right but budget is low/unknown).
         - 1-4: Poor match (wrong stack entirely, completely unrelated).
      2. List the matched skills.
      3. Write a compelling, full proposal/cover letter that the user can copy-paste to apply for this job. 
         Do NOT use generic greetings. Highlight relevant skills from the profile that match the job description. Offer a clear solution or next step. Make it sound highly professional and confident.
      4. Provide a brief reasoning for your score.

      Return the result strictly adhering to the JSON schema.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse the JSON (Gemini will return valid JSON string matching the schema)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(responseText);

  } catch (error) {
    log('gemini', `Error scoring job "${job.title.substring(0, 30)}...": ${error.message}`, 'error');
    return null;
  }
}

/**
 * Process a batch of unscored jobs
 * @param {Array} jobs - Array of job objects from DB
 * @returns {Array} Scored jobs mapped to IDs
 */
async function scoreJobsBatch(jobs) {
  if (!genAI || jobs.length === 0) return [];
  
  log('gemini', `Starting AI scoring for ${jobs.length} new jobs...`);
  
  const results = [];
  
  // Process sequentially to avoid rate limits on free tier, but fast enough with Flash
  for (const job of jobs) {
    const aiResult = await scoreJob(job);
    
    if (aiResult) {
      results.push({
        jobId: job.id,
        score: aiResult.relevanceScore,
        matchedSkills: aiResult.matchedSkills,
        proposalSnippet: aiResult.proposalSnippet,
        reasoning: aiResult.reasoning
      });
      log('gemini', `Scored: ${aiResult.relevanceScore}/10 | ${job.title.substring(0, 40)}...`);
    } else {
      // If AI fails (likely quota), we STOP processing this batch
      // This leaves the remaining jobs as "unscored" (relevance_score = 0) in the DB
      // so the user can still see them and we can retry later.
      log('gemini', `API failure for job "${job.title.substring(0, 30)}...". Stopping batch to preserve unscored jobs.`, 'warn');
      break; 
    }
    
    // Small delay between requests to respect free tier limits (15 RPM)
    await new Promise(r => setTimeout(r, 4000));
  }
  
  log('gemini', `Finished scoring ${results.length} jobs.`, 'success');
  return results;
}

export { scoreJob, scoreJobsBatch };
