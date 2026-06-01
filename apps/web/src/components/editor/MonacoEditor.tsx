import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { MonacoBinding } from 'y-monaco';
import type { YjsState } from '@/hooks/useYjs';

export interface MonacoEditorHandle {
  getValue: () => string;
  /** Replace editor + Yjs document content (syncs to all participants). */
  setValue: (code: string) => void;
}

interface MonacoEditorProps {
  language: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  yjsState?: YjsState | null;
}

const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(function MonacoEditor({
  language,
  onChange,
  readOnly = false,
  yjsState,
}, ref) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const isCollaborative = !!yjsState;
  const isSyncing = isCollaborative && !yjsState.isSynced;
  const editorReadOnly = readOnly || isSyncing;

  useImperativeHandle(
    ref,
    () => ({
      getValue: () => {
        const fromEditor = editorRef.current?.getValue();
        if (fromEditor !== undefined && fromEditor !== '') return fromEditor;
        return yjsState?.ytext?.toString() || '';
      },
      setValue: (code: string) => {
        if (yjsState) {
          yjsState.ydoc.transact(() => {
            const len = yjsState.ytext.length;
            if (len > 0) {
              yjsState.ytext.delete(0, len);
            }
            if (code) {
              yjsState.ytext.insert(0, code);
            }
          });
        }
        const model = editorRef.current?.getModel();
        if (model && model.getValue() !== code) {
          editorRef.current?.setValue(code);
        }
      },
    }),
    [yjsState],
  );

  const handleMount: OnMount = useCallback((editorInstance) => {
    editorRef.current = editorInstance;
    editorInstance.focus();
  }, []);

  function createBinding(editorInstance: editor.IStandaloneCodeEditor, yjs: YjsState) {
    bindingRef.current?.destroy();

    const model = editorInstance.getModel();
    if (!model) return;

    bindingRef.current = new MonacoBinding(
      yjs.ytext,
      model,
      new Set([editorInstance]),
      yjs.provider.awareness,
    );
  }

  // Bind only after Yjs has synced with the server — otherwise Monaco stays on an empty local doc
  useEffect(() => {
    const editorInstance = editorRef.current;
    if (!editorInstance || !yjsState) {
      bindingRef.current?.destroy();
      bindingRef.current = null;
      return;
    }

    if (!yjsState.isSynced) {
      bindingRef.current?.destroy();
      bindingRef.current = null;
      return;
    }

    createBinding(editorInstance, yjsState);

    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [yjsState?.provider, yjsState?.isSynced]);

  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly: editorReadOnly });
  }, [editorReadOnly]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (!yjsState && value !== undefined && onChange) {
        onChange(value);
      }
    },
    [yjsState, onChange],
  );

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-border relative">
      {yjsState && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              yjsState.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-[10px] text-text-muted">
            {yjsState.isConnected
              ? yjsState.isSynced
                ? 'Synced'
                : 'Syncing...'
              : 'Connecting...'}
          </span>
        </div>
      )}

      {isSyncing && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center bg-bg-primary/80 backdrop-blur-[1px] pointer-events-none">
          <div className="flex items-center gap-3 text-text-muted">
            <div className="w-5 h-5 border-2 border-text-muted/30 border-t-accent rounded-full animate-spin" />
            <span className="text-sm">Syncing editor with session…</span>
          </div>
        </div>
      )}

      <Editor
        height="100%"
        language={language}
        defaultValue={isCollaborative ? undefined : ''}
        onChange={handleChange}
        onMount={handleMount}
        theme="vs-dark"
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          tabSize: 2,
          wordWrap: 'on',
          automaticLayout: true,
          readOnly: editorReadOnly,
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
        }}
        loading={
          <div className="h-full w-full flex items-center justify-center bg-bg-primary">
            <div className="flex items-center gap-3 text-text-muted">
              <div className="w-5 h-5 border-2 border-text-muted/30 border-t-accent rounded-full animate-spin" />
              <span className="text-sm">Loading editor...</span>
            </div>
          </div>
        }
      />
    </div>
  );
});

export default MonacoEditor;
