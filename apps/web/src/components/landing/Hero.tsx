import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import Button from '@/components/ui/Button';
import CodeEditorMockup from './CodeEditorMockup';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
      {/* Hero glow */}
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium glass border border-accent/20 text-accent-glow">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-glow animate-pulse" />
          Now in Early Access
        </span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-center leading-tight max-w-4xl"
      >
        The Interview Platform{' '}
        <span className="text-gradient">Engineers Actually</span>{' '}
        Want to Use
      </motion.h1>

      {/* Subheading */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-6 text-lg sm:text-xl text-text-secondary text-center max-w-2xl leading-relaxed"
      >
        One link. Code editor. Video call. Live collaboration. Zero setup.
        <br className="hidden sm:block" />
        Replace your messy Zoom + VS Code + LeetCode workflow.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-10 flex flex-col sm:flex-row gap-4"
      >
        <Button size="lg" className="group">
          Start Free
          <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
        <Button variant="secondary" size="lg" className="group">
          <Play className="mr-2 w-4 h-4" />
          Watch Demo
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-12 flex items-center gap-8 text-center"
      >
        {[
          { value: '< 3s', label: 'Time to join' },
          { value: '7+', label: 'Languages' },
          { value: '0', label: 'Setup required' },
        ].map((stat) => (
          <div key={stat.label}>
            <div className="text-xl font-bold text-text-primary">{stat.value}</div>
            <div className="text-xs text-text-muted mt-0.5">{stat.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Code Editor Mockup */}
      <div className="mt-16 w-full max-w-3xl">
        <CodeEditorMockup />
      </div>
    </section>
  );
}
