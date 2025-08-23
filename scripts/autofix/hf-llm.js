import { setTimeout as wait } from "timers/promises";

const PRIMARY = "deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct";
const FALLBACK = "bigcode/starcoder2-15b-instruct";
const HF_URL = (m) => `https://api-inference.huggingface.co/models/${m}`;
const MAX_OUTPUT = 200 * 1024; // 200KB
const ALLOWED_DIRS = ["scripts/", "test/", "tests/", ".github/", "src/"];

function sanitize(text) {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

function filterFiles(arr) {
  const out = [];
  for (const f of arr || []) {
    if (!f || typeof f.path !== "string" || typeof f.contents !== "string")
      continue;
    if (!ALLOWED_DIRS.some((p) => f.path.startsWith(p))) continue;
    out.push({ path: f.path, contents: sanitize(f.contents) });
  }
  return out;
}

async function requestModel(model, prompt, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(HF_URL(model), {
      method: "POST",
      headers,
      body: JSON.stringify({ inputs: prompt }),
      signal: AbortSignal.timeout(120000),
    }).catch((e) => ({ status: 500, error: e }));
    if (res.status === 429 || res.status >= 500) {
      await wait(500 * 2 ** attempt);
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      return { error: "unauthorized", status: res.status };
    }
    const data = await res.json().catch(() => ({}));
    if (data.error) {
      if (String(data.error).includes("loading") || res.status === 503) {
        return { loading: true };
      }
      return { error: String(data.error) };
    }
    const output = Array.isArray(data)
      ? (data[0]?.generated_text ?? "")
      : data.generated_text || data;
    return {
      text: typeof output === "string" ? output : JSON.stringify(output),
    };
  }
  return { error: "retry_exhausted" };
}

async function callWithFallback(prompt) {
  const token = process.env.HF_TOKEN;
  let model = PRIMARY;
  for (const m of [PRIMARY, FALLBACK]) {
    model = m;
    const res = await requestModel(m, prompt, token);
    if (res.loading) continue;
    if (res.error === "unauthorized")
      return { diagnostic: res.error, authenticated: !!token };
    if (res.text)
      return {
        text: res.text.slice(0, MAX_OUTPUT),
        model: m,
        authenticated: !!token,
      };
  }
  return { diagnostic: "model_error", authenticated: !!token };
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function generate(prompt) {
  const { text, diagnostic, model, authenticated } =
    await callWithFallback(prompt);
  if (!text) return { diagnostic, authenticated };
  const json = extractJson(text);
  if (!Array.isArray(json))
    return { diagnostic: "invalid_json", raw: text, authenticated };
  const files = filterFiles(json);
  const size = files.reduce(
    (s, f) => s + Buffer.byteLength(f.contents, "utf8"),
    0,
  );
  if (size > MAX_OUTPUT) return { diagnostic: "too_large", authenticated };
  return { files, model, authenticated };
}

export async function generateFixAndGuard({
  signature,
  sampleLog,
  repoSummary,
  fileSnippets,
}) {
  const context = {
    signature,
    sampleLog,
    repoSummary,
    fileSnippets,
    constraints: repoSummary?.constraints || {},
  };
  const prompt = `Fix the defect indicated by the error log and add 1–2 targeted regression tests that fail before the fix and pass after.\n<CONTEXT JSON ${JSON.stringify(context)}>\n<OUTPUT SCHEMA>`;
  return generate(prompt);
}

export async function generateHiFiTests({ signature, sampleLog, repoSummary }) {
  const context = { signature, sampleLog, repoSummary };
  const prompt = `Create 10–15 concise, independent tests across the implicated subsystem to localize the fault (no product code edits).\n<CONTEXT JSON ${JSON.stringify(context)}>\n<OUTPUT SCHEMA>`;
  return generate(prompt);
}
