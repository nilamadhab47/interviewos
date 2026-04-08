import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Button from '@/components/ui/Button';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out InterviewOS',
    features: [
      '5 sessions per month',
      'Collaborative editor',
      'Code execution (7 languages)',
      'Built-in video call',
      '1 interviewer seat',
    ],
    cta: 'Get Started',
    variant: 'secondary' as const,
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: 'per month',
    description: 'For teams running regular interviews',
    features: [
      'Unlimited sessions',
      'Everything in Free',
      'Session replay',
      'Code telemetry & analytics',
      'Anti-cheat detection',
      'Question bank',
      '10 interviewer seats',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    variant: 'primary' as const,
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations that need full control',
    features: [
      'Everything in Pro',
      'Self-hosted deployment',
      'SSO / SAML',
      'API access',
      'Custom integrations',
      'Unlimited seats',
      'SLA & dedicated support',
      'Audit logs',
    ],
    cta: 'Contact Sales',
    variant: 'secondary' as const,
    highlighted: false,
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
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

export default function Pricing() {
  return (
    <section id="pricing" className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-accent-glow uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-text-secondary max-w-lg mx-auto">
            Start free. Upgrade when you need replay, telemetry, and team features.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={cardVariants}
              className={`relative glass rounded-2xl p-8 flex flex-col ${
                plan.highlighted
                  ? 'border-accent/40 glow scale-[1.02]'
                  : 'glass-hover'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-medium bg-accent text-white rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-text-muted text-sm">
                      /{plan.period}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-text-secondary">
                  {plan.description}
                </p>
              </div>

              <ul className="mt-8 space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-text-secondary"
                  >
                    <Check className="w-4 h-4 text-accent-glow mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button
                  variant={plan.variant}
                  size="md"
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
