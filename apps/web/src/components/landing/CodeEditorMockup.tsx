import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const CODE_LINES = [
  { indent: 0, text: 'function twoSum(nums, target) {', color: 'text-blue-400' },
  { indent: 1, text: 'const map = new Map();', color: 'text-text-primary' },
  { indent: 1, text: '', color: '' },
  { indent: 1, text: 'for (let i = 0; i < nums.length; i++) {', color: 'text-purple-400' },
  { indent: 2, text: 'const complement = target - nums[i];', color: 'text-text-primary' },
  { indent: 2, text: '', color: '' },
  { indent: 2, text: 'if (map.has(complement)) {', color: 'text-yellow-400' },
  { indent: 3, text: 'return [map.get(complement), i];', color: 'text-green-400' },
  { indent: 2, text: '}', color: 'text-yellow-400' },
  { indent: 2, text: '', color: '' },
  { indent: 2, text: 'map.set(nums[i], i);', color: 'text-text-primary' },
  { indent: 1, text: '}', color: 'text-purple-400' },
  { indent: 0, text: '}', color: 'text-blue-400' },
];

const CURSOR_COLORS = [
  { name: 'Alex', color: '#6366f1', labelBg: 'bg-accent' },
  { name: 'Sarah', color: '#f59e0b', labelBg: 'bg-amber-500' },
];

export default function CodeEditorMockup() {
  const [visibleChars, setVisibleChars] = useState(0);
  const [showSecondCursor, setShowSecondCursor] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const totalChars = CODE_LINES.reduce(
    (sum, line) => sum + line.indent * 2 + line.text.length + 1,
    0,
  );

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setVisibleChars((prev) => {
        if (prev >= totalChars) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return totalChars;
        }
        return prev + 1;
      });
    }, 35);

    const cursorTimer = setTimeout(() => setShowSecondCursor(true), 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(cursorTimer);
    };
  }, [totalChars]);

  // Build visible text
  let charCount = 0;
  const renderedLines = CODE_LINES.map((line) => {
    const fullText = '  '.repeat(line.indent) + line.text;
    const lineChars = fullText.length + 1; // +1 for newline
    const startChar = charCount;
    charCount += lineChars;

    if (startChar >= visibleChars) return '';
    const visible = Math.min(visibleChars - startChar, fullText.length);
    return fullText.slice(0, visible);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative w-full max-w-2xl mx-auto"
    >
      {/* Editor window */}
      <div className="glass rounded-xl overflow-hidden glow">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-bg-primary/50">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-text-muted font-mono">solution.js</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
              Live
            </span>
          </div>
        </div>

        {/* Code area */}
        <div className="p-4 font-mono text-sm leading-relaxed relative min-h-[320px] bg-bg-primary/30">
          {/* Line numbers */}
          <div className="absolute left-0 top-4 w-10 text-right pr-2">
            {CODE_LINES.map((_, i) => (
              <div
                key={i}
                className="text-text-muted/40 text-xs leading-relaxed select-none"
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code content */}
          <div className="pl-10">
            {renderedLines.map((line, i) => (
              <div key={i} className={`${CODE_LINES[i].color} leading-relaxed`}>
                {line || '\u00A0'}
              </div>
            ))}
          </div>

          {/* Primary cursor (typing) */}
          {visibleChars < totalChars && (
            <div
              className="absolute w-0.5 h-5 bg-accent animate-typing-cursor"
              style={{
                left: `${40 + renderedLines[renderedLines.findIndex((_, i) => {
                  let c = 0;
                  for (let j = 0; j <= i; j++) {
                    c += ('  '.repeat(CODE_LINES[j].indent) + CODE_LINES[j].text).length + 1;
                  }
                  return c >= visibleChars;
                })]?.length * 8.4 || 0}px`,
              }}
            />
          )}

          {/* Collaborative cursors */}
          {showSecondCursor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute"
              style={{ top: '100px', left: '180px' }}
            >
              <div className="relative">
                <div className="w-0.5 h-5 bg-amber-500 animate-typing-cursor" />
                <span className="absolute -top-5 left-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white whitespace-nowrap font-sans">
                  {CURSOR_COLORS[1].name}
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-bg-primary/50 text-[11px] text-text-muted">
          <div className="flex items-center gap-3">
            <span>JavaScript</span>
            <span>UTF-8</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>2 connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating participant badges */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.5 }}
        className="absolute -right-4 top-16 flex flex-col gap-2"
      >
        {CURSOR_COLORS.map((cursor) => (
          <div
            key={cursor.name}
            className="flex items-center gap-2 glass rounded-full px-3 py-1.5"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: cursor.color }}
            />
            <span className="text-xs text-text-secondary">{cursor.name}</span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
