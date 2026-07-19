import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

const PROJECT_ROOT = path.resolve(process.cwd(), "../..");
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://reboundlab:reboundlab@localhost:5432/reboundlab";

function listSymbols(): Promise<string> {
  return new Promise((resolve, reject) => {
    const script = path.join(PROJECT_ROOT, "backtester", "list_symbols.py");
    const proc = spawn("python3", [script], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, PYTHONPATH: PROJECT_ROOT, DATABASE_URL },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Python exited with code ${code}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function GET() {
  try {
    const output = await listSymbols();
    const result = JSON.parse(output);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
