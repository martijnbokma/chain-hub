import React from 'react';
import { Mail } from 'lucide-react';

export function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="inline-block px-4 py-2 rounded-full bg-slate-800 border border-slate-700 mb-6">
            <p className="text-sm font-medium text-slate-300">Coming Soon</p>
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Chain Hub
        </h1>

        <p className="text-xl md:text-2xl text-slate-300 mb-12 leading-relaxed max-w-xl mx-auto">
          The most powerful platform for managing and analyzing blockchain protocols.
        </p>

        <p className="text-base text-slate-400 mb-12">
          We're building something amazing. Be the first to know when we launch.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-6 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors"
          />
          <button className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
            <Mail size={18} />
            Notify Me
          </button>
        </div>

        <div className="flex items-center justify-center gap-8 text-sm text-slate-400 pt-8 border-t border-slate-800">
          <a href="#" className="hover:text-slate-300 transition-colors">Twitter</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Discord</a>
          <a href="#" className="hover:text-slate-300 transition-colors">GitHub</a>
        </div>
      </div>
    </div>
  );
}
