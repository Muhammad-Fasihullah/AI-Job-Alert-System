import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Sparkles, ExternalLink, Activity, Filter, CheckCircle, CheckCircle2, Radar } from 'lucide-react';

const API_BASE = '/api';

function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [scraping, setScraping] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [filter]);

  const handleManualScrape = async () => {
    setScraping(true);
    try {
      await axios.post(`${API_BASE}/run`);
      // Give it a few seconds to start
      setTimeout(fetchData, 3000);
      setTimeout(() => setScraping(false), 10000);
    } catch (err) {
      console.error(err);
      setScraping(false);
    }
  };

  const fetchData = async () => {
    try {
      const url = filter === 'all' 
        ? `${API_BASE}/jobs?limit=50&status=new` 
        : `${API_BASE}/jobs?limit=50&minScore=7&status=new`;
      const [jobsRes, statsRes] = await Promise.all([
        axios.get(url),
        axios.get(`${API_BASE}/jobs/stats`)
      ]);
      setJobs(jobsRes.data.data.jobs);
      setStats(statsRes.data.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleMarkApplied = async (id) => {
    try {
      await axios.put(`${API_BASE}/jobs/${id}/status`, { status: 'applied' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 9) return 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20';
    if (score >= 7) return 'text-amber-400 bg-amber-400/10 border-amber-500/20';
    if (score >= 5) return 'text-blue-400 bg-blue-400/10 border-blue-500/20';
    return 'text-slate-400 bg-slate-400/10 border-slate-500/20';
  };

  const getPlatformColor = (platform) => {
    switch (platform) {

      case 'upwork': return 'text-[#14a800] bg-[#14a800]/10';
      case 'linkedin': return 'text-[#0077b5] bg-[#0077b5]/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  return (
    <div className="max-w-6xl mx-auto relative z-10">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Live Match Feed</h1>
          <p className="text-slate-400">Real-time opportunities scored by AI against your profile.</p>
        </div>

        {/* Stats Pills */}
        <div className="flex gap-4 items-center">
          <button 
            onClick={handleManualScrape}
            disabled={scraping}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition-all shadow-lg ${
              scraping 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-primary to-blue-600 text-white hover:scale-105 shadow-primary/20'
            }`}
          >
            <Radar className={scraping ? 'animate-pulse' : ''} size={20} />
            {scraping ? 'Scraping...' : 'Scrape Now'}
          </button>

          <div className="px-5 py-3 rounded-2xl bg-surface border border-slate-700/50 flex items-center gap-4 shadow-lg shadow-black/20">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="text-primary" size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Today's Scrapes</p>
              <p className="text-xl font-bold text-white">{stats?.todayJobs || 0}</p>
            </div>
          </div>
          <div className="px-5 py-3 rounded-2xl bg-surface border border-slate-700/50 flex items-center gap-4 shadow-lg shadow-black/20">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle className="text-emerald-500" size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">High Matches</p>
              <p className="text-xl font-bold text-white">{stats?.highScoreJobs || 0}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-8">
        <Filter size={16} className="text-slate-500" />
        <button 
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface text-slate-300 hover:bg-slate-700'}`}
        >
          All Scraped Jobs
        </button>
        <button 
          onClick={() => setFilter('high')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'high' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-surface text-slate-300 hover:bg-slate-700'}`}
        >
          High Matches Only (Score ≥ 7)
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {jobs.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-slate-500">
                No jobs found matching your criteria. Waiting for next scrape cycle.
              </motion.div>
            ) : (
              jobs.map((job, idx) => (
                <motion.div 
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-surface border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600 transition-colors shadow-lg shadow-black/10 group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-2 max-w-3xl">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getPlatformColor(job.platform)}`}>
                          {job.platform}
                        </span>
                        {job.relevance_score > 0 ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(job.relevance_score)}`}>
                            Score: {job.relevance_score}/10
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold border border-slate-700 text-slate-500 bg-slate-800">
                            Awaiting AI Score
                          </span>
                        )}
                        <span className="text-sm text-slate-400">
                          {formatDistanceToNow(
                            new Date(job.posted_at.length <= 10 ? job.scraped_at : job.posted_at), 
                            { addSuffix: true }
                          )}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-white leading-tight group-hover:text-primary transition-colors">
                        {job.title}
                      </h2>
                      <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
                        <span className="bg-slate-800 px-2 py-1 rounded">💰 {job.budget}</span>
                        {job.client_info && <span className="text-slate-400">• {job.client_info}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleMarkApplied(job.id)}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 px-4 py-2.5 rounded-xl font-medium transition-all border border-slate-700"
                      >
                        <CheckCircle2 size={16} /> Mark Applied
                      </button>
                      <a 
                        href={job.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium transition-all hover:scale-105 shadow-lg shadow-primary/20"
                      >
                        Apply Now <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>

                  {job.relevance_score >= 7 && job.proposal_snippet && (
                    <div className="mt-6 bg-[#1e293b]/50 border border-emerald-500/10 rounded-xl p-5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-primary"></div>
                      <div className="flex items-start gap-3">
                        <div className="mt-1 bg-gradient-to-br from-emerald-400 to-primary p-1.5 rounded-lg">
                          <Sparkles size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">AI Generated Proposal</p>
                          <p className="text-slate-200 leading-relaxed font-medium italic">"{job.proposal_snippet}"</p>
                          
                          <div className="mt-4 pt-3 border-t border-slate-700/50">
                            <p className="text-xs text-slate-400">
                              <span className="text-slate-300 font-medium">Reasoning:</span> {job.reasoning}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {job.matched_skills && job.matched_skills !== '[]' && JSON.parse(job.matched_skills).map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
