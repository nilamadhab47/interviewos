export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  defaultCode: Record<string, string>;
  testCases: Array<{ input: string; expected: string }>;
  tags: string[];
  isPublic: boolean;
  orgId?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const DIFFICULTY_OPTIONS: { value: QuestionDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export const difficultyBadgeClass: Record<string, string> = {
  easy: 'text-emerald-400 bg-emerald-400/10',
  medium: 'text-amber-400 bg-amber-400/10',
  hard: 'text-red-400 bg-red-400/10',
};
