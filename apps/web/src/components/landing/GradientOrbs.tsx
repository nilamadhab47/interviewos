import { motion } from 'framer-motion';

export default function GradientOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Top-left orb */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent/8 blur-[120px] animate-pulse-glow"
      />
      {/* Top-right orb */}
      <motion.div
        animate={{
          x: [0, -40, 30, 0],
          y: [0, 30, -30, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-20 -right-40 w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[120px] animate-pulse-glow"
        style={{ animationDelay: '2s' }}
      />
      {/* Center orb */}
      <motion.div
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -20, 40, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent/3 blur-[150px]"
      />
    </div>
  );
}
