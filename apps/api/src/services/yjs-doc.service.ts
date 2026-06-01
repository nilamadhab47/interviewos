import * as Y from 'yjs';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { yjsDocuments } from '../db/schema';

export interface YjsDocumentRow {
  sessionId: string;
  state: Uint8Array;
  language: string;
  initialized: boolean;
}

export async function getYjsDocument(sessionId: string): Promise<YjsDocumentRow | null> {
  const [row] = await db
    .select()
    .from(yjsDocuments)
    .where(eq(yjsDocuments.sessionId, sessionId))
    .limit(1);

  if (!row) return null;

  const stateBuf = row.state;
  const state =
    stateBuf instanceof Buffer
      ? new Uint8Array(stateBuf)
      : new Uint8Array(stateBuf as unknown as ArrayBuffer);

  return {
    sessionId: row.sessionId,
    state,
    language: row.language,
    initialized: row.initialized,
  };
}

export async function isYjsDocumentInitialized(sessionId: string): Promise<boolean> {
  const doc = await getYjsDocument(sessionId);
  return doc?.initialized ?? false;
}

/**
 * Persist full Y.Doc state (source of truth for refresh / API restart).
 */
export async function saveYjsDocument(
  sessionId: string,
  doc: Y.Doc,
  language: string,
  options?: { markInitialized?: boolean },
): Promise<void> {
  const state = Y.encodeStateAsUpdate(doc);
  const markInitialized = options?.markInitialized ?? true;

  await db
    .insert(yjsDocuments)
    .values({
      sessionId,
      state: Buffer.from(state),
      language,
      initialized: markInitialized,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: yjsDocuments.sessionId,
      set: {
        state: Buffer.from(state),
        language,
        initialized: markInitialized,
        updatedAt: new Date(),
      },
    });
}

export function applyYjsStateToDoc(doc: Y.Doc, state: Uint8Array): void {
  if (state.byteLength > 0) {
    Y.applyUpdate(doc, state);
  }
}

export function getMonacoText(doc: Y.Doc): string {
  return doc.getText('monaco').toString();
}

export function isDocPristine(doc: Y.Doc): boolean {
  return doc.getText('monaco').length === 0;
}
