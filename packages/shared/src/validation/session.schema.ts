import { z } from 'zod';

export const createSessionSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  questionId: z.string().uuid().optional(),
  language: z.string().default('javascript'),
  allowAutocomplete: z.boolean().default(true),
  allowPaste: z.boolean().default(true),
  allowAi: z.boolean().default(false),
  allowRunCode: z.boolean().default(true),
  durationLimit: z.number().min(300).max(14400).default(3600),
  candidateEmail: z.string().email().optional(),
  candidateName: z.string().min(1).max(255).optional(),
});

export const compileRequestSchema = z.object({
  sessionId: z.string().uuid(),
  code: z.string().max(100000),
  languageId: z.number().int().positive(),
  stdin: z.string().max(10000).optional(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
  orgName: z.string().min(1).max(255),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CompileRequestInput = z.infer<typeof compileRequestSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
