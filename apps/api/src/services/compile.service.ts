const JUDGE0_URL = process.env.JUDGE0_API_URL || 'http://localhost:2358';

interface CompileInput {
  code: string;
  languageId: number;
  stdin?: string;
}

export interface CompileResult {
  stdout: string | null;
  stderr: string | null;
  status: string;
  exitCode: number | null;
  timeMs: number | null;
  memoryKb: number | null;
}

function decodeBase64(val: unknown): string | null {
  if (typeof val !== 'string' || !val) return null;
  try {
    return Buffer.from(val, 'base64').toString('utf-8');
  } catch {
    return val;
  }
}

function extractJudge0Error(data: Record<string, unknown>): string | null {
  const compileOutput = decodeBase64(data.compile_output);
  if (compileOutput?.trim()) return compileOutput.trim();

  const message = decodeBase64(data.message);
  if (message?.trim()) return message.trim();

  const stderr = decodeBase64(data.stderr);
  if (stderr?.trim()) return stderr.trim();

  return null;
}

export async function compileCode(input: CompileInput): Promise<CompileResult> {
  const submitResponse = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=true&wait=false`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_code: Buffer.from(input.code).toString('base64'),
      language_id: input.languageId,
      stdin: input.stdin ? Buffer.from(input.stdin).toString('base64') : undefined,
      cpu_time_limit: 10,
      wall_time_limit: 15,
      memory_limit: 256000,
    }),
  });

  if (!submitResponse.ok) {
    const body = await submitResponse.text().catch(() => '');
    throw new Error(
      `Judge0 is unavailable (${submitResponse.status}). Is docker compose running? ${body}`.trim(),
    );
  }

  const { token } = (await submitResponse.json()) as { token: string };

  let result: Record<string, unknown> | null = null;
  for (let i = 0; i < 40; i++) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const pollResponse = await fetch(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=true&fields=stdout,stderr,compile_output,message,status,exit_code,time,memory`,
    );

    if (!pollResponse.ok) continue;

    const data = (await pollResponse.json()) as Record<string, unknown>;
    const status = data.status as { id: number; description: string } | undefined;
    // Status 1-2 = in queue/processing; >2 = finished
    if (status && status.id > 2) {
      result = data;
      break;
    }
  }

  if (!result) {
    throw new Error('Code execution timed out. Judge0 may still be starting — wait 30s and try again.');
  }

  const statusObj = result.status as { id: number; description: string } | undefined;
  const statusDescription = statusObj?.description || 'Unknown';
  const stdout = decodeBase64(result.stdout);
  let stderr = decodeBase64(result.stderr);
  const exitCode = typeof result.exit_code === 'number' ? result.exit_code : null;

  // Surface compile/runtime errors from Judge0 message fields
  if (statusObj && statusObj.id !== 3 && statusObj.id !== 4) {
    const detail = extractJudge0Error(result);
    if (detail) {
      stderr = stderr ? `${stderr}\n${detail}` : detail;
    } else if (statusDescription === 'Internal Error') {
      stderr =
        'Judge0 sandbox error. On macOS/Windows, restart with: docker compose up -d judge0-server judge0-workers';
    }
  }

  const timeMs =
    typeof result.time === 'string' ? parseFloat(result.time) * 1000 : null;
  const memoryKb = typeof result.memory === 'number' ? result.memory : null;

  return {
    stdout,
    stderr,
    status: statusDescription,
    exitCode,
    timeMs,
    memoryKb,
  };
}
