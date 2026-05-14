import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Briefcase, Settings, Radar, Bell, ListChecks } from 'lucide-react';
import { motion } from 'framer-motion';

function Layout() {
  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-64 bg-surface border-r border-slate-700/50 flex flex-col relative z-20"
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-0 w-full h-32 bg-primary/10 blur-3xl pointer-events-none rounded-full" />
        
        <div className="p-6 flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Radar className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              JobAlert
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">AI Engine</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 relative z-10">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
              }`
            }
          >
            <Briefcase size={20} />
            <span>Live Feed</span>
          </NavLink>
          
          <NavLink 
            to="/tracking" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
              }`
            }
          >
            <ListChecks size={20} />
            <span>Tracking</span>
          </NavLink>

          <NavLink 
            to="/settings" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
              }`
            }
          >
            <Settings size={20} />
            <span>AI Profile</span>
          </NavLink>
        </nav>

        <div className="p-6 relative z-10">
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 mb-2">
              <Bell size={16} className="text-accent" />
              <span className="text-sm font-medium text-slate-200">Alert System</span>
            </div>
            <p className="text-xs text-slate-400">Monitoring Fiverr, Upwork & LinkedIn 24/7</p>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {/* Top subtle gradient */}
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent z-10" />
        
        <div className="flex-1 overflow-y-auto p-8 relative scroll-smooth">
          {/* Main glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 blur-[120px] pointer-events-none rounded-full" />
          
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
