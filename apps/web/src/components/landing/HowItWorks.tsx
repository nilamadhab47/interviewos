import { motion } from 'framer-motion';
import { Plus, Link, Zap } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Plus,
    title: 'Create Session',
    description:
      'Pick a language, assign a question, set permissions. One click creates a unique interview link.',
    color: 'text-accent-glow',
    borderColor: 'border-accent/30',
    bgGlow: 'bg-accent/5',
  },
  {
    number: '02',
    icon: Link,
    title: 'Share Link',
    description:
      'Send the candidate a single URL. No account needed. No downloads. They click and they\'re in.',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgGlow: 'bg-emerald-500/5',
  },
  {
    number: '03',
    icon: Zap,
    title: 'Interview',
    description:
      'Code together in real-time, video call embedded, run code instantly. Evaluate live or replay later.',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgGlow: 'bg-amber-500/5',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <span className="text-sm font-medium text-accent-glow uppercase tracking-wider">
            How It Works
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold">
            Three steps.{' '}
            <span className="text-text-secondary">That's it.</span>
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-accent/30 via-emerald-500/30 to-amber-500/30 hidden lg:block" />

          <div className="space-y-16 lg:space-y-24">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;

              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className={`relative flex flex-col lg:flex-row items-center gap-8 ${
                    isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
                  }`}
                >
                  {/* Content */}
                  <div
                    className={`flex-1 ${isEven ? 'lg:text-right' : 'lg:text-left'}`}
                  >
                    <span
                      className={`text-6xl font-extrabold ${step.color} opacity-20`}
                    >
                      {step.number}
                    </span>
                    <h3 className="text-2xl font-bold mt-2">{step.title}</h3>
                    <p className="text-text-secondary mt-3 max-w-sm leading-relaxed inline-block">
                      {step.description}
                    </p>
                  </div>

                  {/* Center dot */}
                  <div className="relative z-10 hidden lg:flex items-center justify-center">
                    <div
                      className={`w-14 h-14 rounded-2xl ${step.bgGlow} ${step.borderColor} border flex items-center justify-center`}
                    >
                      <Icon className={`w-6 h-6 ${step.color}`} />
                    </div>
                  </div>

                  {/* Spacer for alignment */}
                  <div className="flex-1 hidden lg:block" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
