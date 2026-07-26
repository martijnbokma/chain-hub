import React from 'react';
import { Clock, Mail, Globe, Link } from 'lucide-react';

export function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full text-center">
        {/* Main Content */}
        <div className="mb-12">
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-6">
            Chain Hub
          </h1>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 mb-8">
            <Clock className="w-5 h-5 text-purple-300" />
            <span className="text-purple-200 font-medium">Coming Soon</span>
          </div>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            We're building something amazing. Chain Hub is currently under construction while we perfect every detail for you.
          </p>
        </div>

        {/* Features Preview */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Globe className="w-6 h-6 text-purple-300" />
            </div>
            <h3 className="text-white font-semibold mb-2">Smart Integration</h3>
            <p className="text-gray-400 text-sm">Seamless connectivity with your favorite tools and platforms</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Clock className="w-6 h-6 text-blue-300" />
            </div>
            <h3 className="text-white font-semibold mb-2">Real-time Sync</h3>
            <p className="text-gray-400 text-sm">Keep everything in sync across all your devices instantly</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Mail className="w-6 h-6 text-green-300" />
            </div>
            <h3 className="text-white font-semibold mb-2">Stay Updated</h3>
            <p className="text-gray-400 text-sm">Get notified when we launch and be the first to try it</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4">Get Notified at Launch</h2>
          <p className="text-gray-300 mb-6">
            Be the first to know when Chain Hub is ready. No spam, just launch updates.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-200">
              Notify Me
            </button>
            <button className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors duration-200 border border-white/20">
              Learn More
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-gray-400 text-sm mb-4">
            Currently in testing phase. Public launch coming soon.
          </p>
          <div className="flex justify-center gap-4">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <Globe className="w-5 h-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <Link className="w-5 h-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
