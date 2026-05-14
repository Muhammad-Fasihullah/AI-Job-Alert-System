import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Trash2, Clock, CheckCircle2 } from 'lucide-react';

const API_BASE = '/api';

function Tracking() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppliedJobs();
  }, []);

  const fetchAppliedJobs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/jobs?status=applied`);
      setJobs(res.data.data.jobs);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await axios.put(`${API_BASE}/jobs/${id}/status`, { status: newStatus });
      fetchAppliedJobs();
    } catch (err) {
      console.error(err);
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform.toLowerCase()) {
      case 'upwork': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'linkedin': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Application Tracking</h1>
        <p className="text-slate-400">Keep track of the jobs you've applied to and your sent proposals.</p>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {jobs.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-slate-500 bg-surface rounded-2xl border border-slate-700/50">
                No applied jobs tracked yet. Mark jobs as "Applied" from the Live Feed to see them here.
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
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getPlatformColor(job.platform)}`}>
                          {job.platform}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                          <CheckCircle2 size={12} />
                          APPLIED
                        </span>
                        <span className="text-sm text-slate-400 flex items-center gap-1.5">
                          <Clock size={14} />
                          {formatDistanceToNow(
                            new Date(job.posted_at.length <= 10 ? job.scraped_at : job.posted_at), 
                            { addSuffix: true }
                          )}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                        {job.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <a 
                        href={job.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700"
                        title="View Job"
                      >
                        <ExternalLink size={18} />
                      </a>
                      <button 
                        onClick={() => handleUpdateStatus(job.id, 'new')}
                        className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-slate-700"
                        title="Move back to feed"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Sent Proposal</h3>
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap italic">
                      "{job.proposal_snippet}"
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

export default Tracking;
