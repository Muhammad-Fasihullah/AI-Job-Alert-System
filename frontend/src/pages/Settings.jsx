import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE = '/api';

function Settings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await axios.get(`${API_BASE}/settings`);
      setConfig(res.data.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_BASE}/settings`, config);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to save settings.');
    }
    setSaving(false);
  };

  const addKeyword = (e) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      if (!config.keywords.includes(keywordInput.trim())) {
        setConfig({ ...config, keywords: [...config.keywords, keywordInput.trim()] });
      }
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw) => {
    setConfig({ ...config, keywords: config.keywords.filter(k => k !== kw) });
  };

  const togglePlatform = (platform) => {
    const current = config.platforms;
    const updated = current.includes(platform) 
      ? current.filter(p => p !== platform)
      : [...current, platform];
    setConfig({ ...config, platforms: updated });
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto relative z-10"
    >
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">AI Profile Settings</h1>
        <p className="text-slate-400">Configure how the AI evaluates jobs and which platforms to scrape.</p>
      </header>

      <div className="space-y-8">
        {/* Profile Description */}
        <section className="bg-surface border border-slate-700/50 rounded-2xl p-8 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-4">Your Professional Profile</h2>
          <p className="text-sm text-slate-400 mb-4">
            Gemini reads this description to understand your background and formulate personalized proposal snippets. Be specific.
          </p>
          <textarea
            value={config.description}
            onChange={(e) => setConfig({ ...config, description: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-32"
            placeholder="I am a full-stack developer with 5 years of experience..."
          />
        </section>

        {/* Search & Matching */}
        <section className="bg-surface border border-slate-700/50 rounded-2xl p-8 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-6">Search & Matching Criteria</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Target Keywords</label>
              <p className="text-xs text-slate-500 mb-3">Press Enter to add. Used by scrapers to search.</p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {config.keywords.map(kw => (
                  <span key={kw} className="bg-primary/20 text-primary px-3 py-1 rounded-lg flex items-center gap-2 text-sm font-medium border border-primary/20">
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="hover:text-white">&times;</button>
                  </span>
                ))}
              </div>
              
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={addKeyword}
                placeholder="Type skill and press Enter..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Budget Range (USD)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={config.minBudget}
                    onChange={(e) => setConfig({ ...config, minBudget: parseInt(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-primary"
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="number"
                    value={config.maxBudget}
                    onChange={(e) => setConfig({ ...config, maxBudget: parseInt(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Alert Threshold (1-10)</label>
                <p className="text-xs text-slate-500 mb-3">Only send email alerts for jobs scoring this or higher.</p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1" max="10"
                    value={config.alertThreshold}
                    onChange={(e) => setConfig({ ...config, alertThreshold: parseInt(e.target.value) })}
                    className="w-full accent-primary"
                  />
                  <span className="bg-slate-800 px-4 py-2 rounded-xl text-white font-bold border border-slate-700">
                    {config.alertThreshold}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* API Keys */}
        <section className="bg-surface border border-slate-700/50 rounded-2xl p-8 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-4">API Keys Configuration</h2>
          <p className="text-sm text-slate-400 mb-6">
            Configure your API keys here. These will override the ones in your .env file.
          </p>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Google Gemini API Key</label>
              <input
                type="password"
                value={config.geminiApiKey || ''}
                onChange={(e) => setConfig({ ...config, geminiApiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-primary font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Apify API Key (For Upwork)</label>
              <input
                type="password"
                value={config.apifyApiKey || ''}
                onChange={(e) => setConfig({ ...config, apifyApiKey: e.target.value })}
                placeholder="apify_api_..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-primary font-mono text-sm"
              />
            </div>
          </div>
        </section>

        {/* Platforms */}
        <section className="bg-surface border border-slate-700/50 rounded-2xl p-8 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-4">Active Platforms</h2>
          <div className="flex gap-4">
            {['upwork', 'linkedin'].map(platform => (
              <button
                key={platform}
                onClick={() => togglePlatform(platform)}
                className={`px-6 py-3 rounded-xl font-medium capitalize transition-all border ${
                  config.platforms.includes(platform)
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        </section>

        {/* Save Button */}
        <div className="flex items-center gap-4 pt-4 pb-20">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Profile Settings'}
          </button>
          
          {message && (
            <div className={`flex items-center gap-2 text-sm font-medium ${message.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>
              {message.includes('success') ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {message}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default Settings;
