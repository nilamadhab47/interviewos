const JUDGE0_URL = process.env.JUDGE0_API_URL || 'http://localhost:2358';

interface CompileInput {
  code: string;
  languageId: number;
  stdin?: string;
}

interface CompileResult {
  stdout: string | null;
  stderr: string | null;
  status: string;
  exitCode: number | null;
  timeMs: number | null;
  memoryKb: number | null;
}

export async function compileCode(input: CompileInput): Promise<CompileResult> {
  // Submit to Judge0
  const submitResponse = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=true&wait=false`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_code: Buffer.from(input.code).toString('base64'),
      language_id: input.languageId,
      stdin: input.stdin ? Buffer.from(input.stdin).toString('base64') : undefined,
      cpu_time_limit: 10,
      wall_time_limit: 15,
      memory_limit: 256000, // 256MB
    }),
  });

  if (!submitResponse.ok) {
    throw new Error(`Judge0 submission failed: ${submitResponse.status}`);
  }

  const { token } = await submitResponse.json() as { token: string };

  // Poll for result
  let result: Record<string, unknown> | null = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const pollResponse = await fetch(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=true&fields=stdout,stderr,status,exit_code,time,memory`,
    );

    if (!pollResponse.ok) continue;

    const data = await pollResponse.json() as Record<string, unknown>;
    const status = data.status as { id: number; description: string } | undefined;
    if (status && status.id > 2) {
      // Status > 2 means processing is done
      result = data;
      break;
    }
  }

  if (!result) {
    throw new Error('Compilation timed out');
  }

  const decode = (val: unknown) =>
    typeof val === 'string' ? Buffer.from(val, 'base64').toString('utf-8') : null;

  const status = result.status as { description: string } | undefined;

  return {
    stdout: decode(result.stdout),
    stderr: decode(result.stderr),
    status: status?.description || 'Unknown',
    exitCode: typeof result.exit_code === 'number' ? result.exit_code : null,
    timeMs: typeof result.time === 'string' ? parseFloat(result.time) * 1000 : null,
    memoryKb: typeof result.memory === 'number' ? result.memory : null,
  };
}
