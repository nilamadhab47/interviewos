import { motion } from 'framer-motion';
import { Check, X, Minus } from 'lucide-react';

const features = [
  {
    name: 'Single interview link',
    old: false,
    interviewos: true,
  },
  {
    name: 'Real-time collaborative editor',
    old: 'partial',
    interviewos: true,
  },
  {
    name: 'Built-in video call',
    old: false,
    interviewos: true,
  },
  {
    name: 'Code execution',
    old: 'partial',
    interviewos: true,
  },
  {
    name: 'Session replay',
    old: false,
    interviewos: true,
  },
  {
    name: 'Anti-cheat detection',
    old: false,
    interviewos: true,
  },
  {
    name: 'Interviewer controls',
    old: false,
    interviewos: true,
  },
  {
    name: 'Code telemetry',
    old: false,
    interviewos: true,
  },
  {
    name: 'Zero setup for candidates',
    old: false,
    interviewos: true,
  },
  {
    name: 'Self-hosted option',
    old: false,
    interviewos: true,
  },
];

function StatusIcon({ value }: { value: boolean | string }) {
  if (value === true)
    return <Check className="w-5 h-5 text-green-400" />;
  if (value === 'partial')
    return <Minus className="w-5 h-5 text-amber-400" />;
  return <X className="w-5 h-5 text-text-muted/40" />;
}

export default function Comparison() {
  return (
    <section className="relative py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-accent-glow uppercase tracking-wider">
            Why Switch
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold">
            The old way vs.{' '}
            <span className="text-gradient">InterviewOS</span>
          </h2>
          <p className="mt-4 text-text-secondary">
            Stop duct-taping Zoom + VS Code + LeetCode + Google Docs together.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-border bg-bg-primary/50">
            <div className="text-sm font-medium text-text-secondary">
              Feature
            </div>
            <div className="text-sm font-medium text-text-muted text-center">
              Zoom + VS Code + LeetCode
            </div>
            <div className="text-sm font-medium text-accent-glow text-center">
              InterviewOS
            </div>
          </div>

          {/* Rows */}
          {features.map((feature, i) => (
            <div
              key={feature.name}
              className={`grid grid-cols-3 gap-4 px-6 py-3.5 ${
                i < features.length - 1 ? 'border-b border-border/50' : ''
              } hover:bg-bg-card-hover/50 transition-colors`}
            >
              <div className="text-sm text-text-primary">
                {feature.name}
              </div>
              <div className="flex justify-center">
                <StatusIcon value={feature.old} />
              </div>
              <div className="flex justify-center">
                <StatusIcon value={feature.interviewos} />
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
