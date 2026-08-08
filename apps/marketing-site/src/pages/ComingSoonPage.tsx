import React from 'react';
import { Mail } from 'lucide-react';

export function ComingSoonPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="inline-block px-4 py-2 rounded-full bg-secondary border border-border mb-6">
            <p className="text-sm font-medium text-muted-foreground">Coming Soon</p>
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          Chain Hub
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed max-w-xl mx-auto">
          A local-first control plane for your AI working context.
        </p>

        <p className="text-base text-muted-foreground/80 mb-12">
          Skills, agents, workflows, rules, and memory — one hub folder, synced into every
          editor you use. Be the first to know when we launch.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-6 py-3 rounded-lg bg-card border border-input text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring transition-colors"
          />
          <button className="px-8 py-3 rounded-lg bg-primary hover:opacity-90 text-primary-foreground font-medium transition-opacity flex items-center justify-center gap-2 whitespace-nowrap">
            <Mail size={18} />
            Notify Me
          </button>
        </div>

        <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground pt-8 border-t border-border">
          <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
          <a href="#" className="hover:text-foreground transition-colors">Discord</a>
          <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
        </div>
      </div>
    </div>
  );
}
