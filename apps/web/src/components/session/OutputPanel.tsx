import { Terminal, Clock, HardDrive, CheckCircle, XCircle } from 'lucide-react';

interface CompileResult {
  stdout: string | null;
  stderr: string | null;
  status: string;
  exitCode: number | null;
  timeMs: number | null;
  memoryKb: number | null;
}

interface OutputPanelProps {
  result: CompileResult | null;
  isCompiling: boolean;
}

export default function OutputPanel({ result, isCompiling }: OutputPanelProps) {
  return (
    <div className="h-full flex flex-col glass rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-bg-primary/50">
        <Terminal className="w-4 h-4 text-text-muted" />
        <span className="text-sm font-medium text-text-secondary">Output</span>
        {result && (
          <div className="ml-auto flex items-center gap-3 text-xs text-text-muted">
            {result.timeMs != null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {result.timeMs.toFixed(0)}ms
              </span>
            )}
            {result.memoryKb != null && (
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {(result.memoryKb / 1024).toFixed(1)}MB
              </span>
            )}
            <span
              className={`flex items-center gap-1 ${
                result.exitCode === 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {result.exitCode === 0 ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              {result.status}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 font-mono text-sm overflow-auto bg-bg-primary/30">
        {isCompiling ? (
          <div className="flex items-center gap-3 text-text-muted">
            <div className="w-4 h-4 border-2 border-text-muted/30 border-t-accent rounded-full animate-spin" />
            Running code...
          </div>
        ) : result ? (
          <div className="space-y-2">
            {result.stdout && (
              <pre className="text-text-primary whitespace-pre-wrap">{result.stdout}</pre>
            )}
            {result.stderr && (
              <pre className="text-red-400 whitespace-pre-wrap">{result.stderr}</pre>
            )}
            {!result.stdout && !result.stderr && (
              <span className="text-text-muted">No output</span>
            )}
          </div>
        ) : (
          <span className="text-text-muted">
            Run your code to see output here
          </span>
        )}
      </div>
    </div>
  );
}
