import { db } from '../db';
import { questions } from '../db/schema';
import { eq, and, or } from 'drizzle-orm';

export async function createQuestion(input: {
  orgId: string;
  createdBy: string;
  title: string;
  description: string;
  difficulty: string;
  defaultCode?: Record<string, string>;
  testCases?: Array<{ input: string; expected: string }>;
  tags?: string[];
  isPublic?: boolean;
}) {
  const [question] = await db
    .insert(questions)
    .values({
      orgId: input.orgId,
      createdBy: input.createdBy,
      title: input.title,
      description: input.description,
      difficulty: input.difficulty,
      defaultCode: input.defaultCode || {},
      testCases: input.testCases || [],
      tags: input.tags || [],
      isPublic: input.isPublic ?? false,
    })
    .returning();

  return question;
}

export async function getQuestions(orgId: string) {
  return db
    .select()
    .from(questions)
    .where(
      or(
        eq(questions.orgId, orgId),
        eq(questions.isPublic, true),
      ),
    );
}

export async function getQuestion(questionId: string) {
  const [question] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);

  return question || null;
}

export async function updateQuestion(
  questionId: string,
  input: Partial<{
    title: string;
    description: string;
    difficulty: string;
    defaultCode: Record<string, string>;
    testCases: Array<{ input: string; expected: string }>;
    tags: string[];
    isPublic: boolean;
  }>,
) {
  const [updated] = await db
    .update(questions)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(questions.id, questionId))
    .returning();

  return updated;
}

export async function deleteQuestion(questionId: string) {
  const [deleted] = await db
    .delete(questions)
    .where(eq(questions.id, questionId))
    .returning();

  return deleted;
}
