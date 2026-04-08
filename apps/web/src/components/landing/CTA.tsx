import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function CTA() {
  return (
    <section className="relative py-32 px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto text-center"
      >
        {/* Glow background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-accent/10 blur-[120px]" />
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
            Ready to transform your{' '}
            <span className="text-gradient">technical interviews</span>?
          </h2>
          <p className="mt-6 text-lg text-text-secondary max-w-xl mx-auto">
            Join engineering teams who've stopped duct-taping their interview
            workflow together. Start interviewing in minutes.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="group">
              Start Free — No Credit Card
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <p className="mt-6 text-sm text-text-muted">
            Free tier includes 5 sessions/month. No credit card required.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
