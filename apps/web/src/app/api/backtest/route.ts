import { NextRequest, NextResponse } from "next/server";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { validateBacktestRequest } from "@/lib/validateBacktestRequest";

const PROJECT_ROOT =
  process.env.PROJECT_ROOT || path.resolve(process.cwd(), "../..");
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://reboundlab:reboundlab@localhost:5432/reboundlab";

function runBacktest(params: object, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const script = path.join(PROJECT_ROOT, "backtester", "run_json.py");
    const proc: ChildProcess = spawn("python3", [script], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, PYTHONPATH: PROJECT_ROOT, DATABASE_URL },
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      fn();
    };

    const onAbort = () => {
      proc.kill("SIGTERM");
      finish(() => reject(new DOMException("Aborted", "AbortError")));
    };

    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort);

    proc.stdout?.on("data", (d) => (stdout += d.toString()));
    proc.stderr?.on("data", (d) => (stderr += d.toString()));

    proc.on("close", (code) => {
      if (signal?.aborted) return;
      if (code !== 0) {
        finish(() => reject(new Error(stderr || `Python exited with code ${code}`)));
      } else {
        finish(() => resolve(stdout));
      }
    });

    proc.stdin?.write(JSON.stringify(params));
    proc.stdin?.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const params = await req.json();
    const dateError = await validateBacktestRequest(params);
    if (dateError) {
      return NextResponse.json({ error: dateError }, { status: 403 });
    }
    const output = await runBacktest(params, req.signal);
    const result = JSON.parse(output);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({ error: "cancelled" }, { status: 499 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Aborted" || message.includes("AbortError")) {
      return NextResponse.json({ error: "cancelled" }, { status: 499 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
