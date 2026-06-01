import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { MonacoBinding } from 'y-monaco';
import type { YjsState } from '@/hooks/useYjs';

export interface MonacoEditorHandle {
  getValue: () => string;
}

interface MonacoEditorProps {
  language: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  yjsState?: YjsState | null;
}

const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(function MonacoEditor({
  language,
  defaultValue = '',
  onChange,
  readOnly = false,
  yjsState,
}, ref) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  // Track which provider we've bound to, so we skip re-binding on status-only changes
  const boundProviderRef = useRef<unknown>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => {
      const fromEditor = editorRef.current?.getValue();
      if (fromEditor !== undefined && fromEditor !== '') return fromEditor;
      return yjsState?.ytext?.toString() || '';
    },
  }), [yjsState?.ytext]);

  const handleMount: OnMount = useCallback(
    (editorInstance) => {
      editorRef.current = editorInstance;
      editorInstance.focus();

      // If Yjs is ready and we haven't bound yet, create binding
      if (yjsState && boundProviderRef.current !== yjsState.provider) {
        createBinding(editorInstance, yjsState);
        boundProviderRef.current = yjsState.provider;
      }
    },
    // Only re-create the callback when the provider identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [yjsState?.provider],
  );

  // Bind/unbind when the Yjs provider itself changes (not on status updates)
  const currentProvider = yjsState?.provider ?? null;
  useEffect(() => {
    if (!currentProvider || !yjsState) {
      // Provider gone — clean up
      bindingRef.current?.destroy();
      bindingRef.current = null;
      boundProviderRef.current = null;
      return;
    }

    // Already bound to this provider instance
    if (boundProviderRef.current === currentProvider) return;

    if (editorRef.current) {
      createBinding(editorRef.current, yjsState);
      boundProviderRef.current = currentProvider;
    }

    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
      boundProviderRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProvider]);

  function createBinding(
    editorInstance: editor.IStandaloneCodeEditor,
    yjs: YjsState,
  ) {
    // Clean up old binding
    bindingRef.current?.destroy();

    // If the Yjs doc is empty and we have a default value, set it
    if (yjs.ytext.length === 0 && defaultValue) {
      yjs.ydoc.transact(() => {
        yjs.ytext.insert(0, defaultValue);
      });
    }

    // Create y-monaco binding — this handles:
    // 1. Local edits → Yjs operations
    // 2. Remote Yjs operations → Monaco edits
    // 3. Cursor positions via awareness
    const binding = new MonacoBinding(
      yjs.ytext,
      editorInstance.getModel()!,
      new Set([editorInstance]),
      yjs.provider.awareness,
    );

    bindingRef.current = binding;
  }

  const handleChange = useCallback(
    (value: string | undefined) => {
      // Only fire onChange for non-Yjs mode (single-user fallback)
      if (!yjsState && value !== undefined && onChange) {
        onChange(value);
      }
    },
    [yjsState, onChange],
  );

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-border relative">
      {/* Connection status indicator */}
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

      <Editor
        height="100%"
        language={language}
        defaultValue={yjsState ? undefined : defaultValue}
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
          readOnly,
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
