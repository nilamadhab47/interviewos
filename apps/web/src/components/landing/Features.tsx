import { motion } from 'framer-motion';
import {
  Code2,
  Video,
  Play,
  Rewind,
  Shield,
  BookOpen,
  BarChart3,
  Users,
} from 'lucide-react';

const features = [
  {
    icon: Code2,
    title: 'Collaborative Editor',
    description:
      'Monaco editor with real-time CRDT sync. Multi-cursor, cursor labels, IntelliSense — everything you expect from VS Code.',
    size: 'large' as const,
    gradient: 'from-accent/20 to-purple-500/10',
  },
  {
    icon: Video,
    title: 'Built-in Video',
    description:
      'WebRTC video call embedded right in the session. No Zoom links. No context switching.',
    size: 'medium' as const,
    gradient: 'from-blue-500/20 to-cyan-500/10',
  },
  {
    icon: Play,
    title: 'Code Execution',
    description:
      'Self-hosted compiler. 7+ languages. Run code instantly with stdout, stderr, and memory stats.',
    size: 'medium' as const,
    gradient: 'from-green-500/20 to-emerald-500/10',
  },
  {
    icon: Rewind,
    title: 'Session Replay',
    description: 'Replay every keystroke, cursor move, and video moment. Scrub through the entire interview.',
    size: 'small' as const,
    gradient: 'from-amber-500/20 to-orange-500/10',
  },
  {
    icon: Shield,
    title: 'Anti-Cheat',
    description: 'Paste detection, tab tracking, and typing pattern analysis built in.',
    size: 'small' as const,
    gradient: 'from-red-500/20 to-pink-500/10',
  },
  {
    icon: BookOpen,
    title: 'Question Bank',
    description: 'Organize problems by difficulty. Assign per-session with starter code.',
    size: 'small' as const,
    gradient: 'from-violet-500/20 to-fuchsia-500/10',
  },
  {
    icon: BarChart3,
    title: 'Live Telemetry',
    description: 'Real-time WPM, compile count, and idle time — visible to interviewers.',
    size: 'small' as const,
    gradient: 'from-teal-500/20 to-cyan-500/10',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export default function Features() {
  return (
    <section id="features" className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-accent-glow uppercase tracking-wider">
            Features
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold">
            Everything you need.{' '}
            <span className="text-text-secondary">Nothing you don't.</span>
          </h2>
          <p className="mt-4 text-text-secondary max-w-xl mx-auto">
            A complete interview environment, built from the ground up for
            engineering teams.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[180px]"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            const spanClass =
              feature.size === 'large'
                ? 'md:col-span-2 md:row-span-2'
                : feature.size === 'medium'
                  ? 'md:col-span-2 lg:col-span-2'
                  : '';

            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                className={`group relative glass rounded-2xl p-6 glass-hover overflow-hidden ${spanClass}`}
              >
                {/* Gradient background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />

                <div className="relative z-10 h-full flex flex-col">
                  <div className="w-10 h-10 rounded-xl bg-bg-card-hover flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5 text-accent-glow" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed flex-1">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Users badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex justify-center"
        >
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2">
            <Users className="w-4 h-4 text-accent-glow" />
            <span className="text-sm text-text-secondary">
              Self-hosted. Unlimited users. Zero rate limits.
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
