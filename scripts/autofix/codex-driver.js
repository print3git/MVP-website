import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { generateFixAndGuard, generateHiFiTests } from './hf-llm.js';
import { summarizeRepo, loadSnippetsForHints } from './repo-context.js';
import { slugFromSignature, ensureBranch, commitFiles, openPR, findExistingPR } from './pr-tools.js';

const execP = promisify(exec);
const STATE_FILE = path.join('.autofix', 'state.json');
const AUTOFIX_MAX_GROUPS = Number(process.env.AUTOFIX_MAX_GROUPS || 2);

async function loadState() {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function saveState(st) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(st, null, 2));
}

async function readGroups() {
  const dir = path.join('ci', 'autofix', 'inbox');
  const files = await fs.readdir(dir).catch(() => []);
  const groups = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const data = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
    groups.push({
      signature: data.error_hash || f.replace(/\.json$/, ''),
      sampleLog: (data.snippets || [])[0] || '',
      runs: data.run || [],
      jobs: data.job || [],
      hints: data.files || [],
    });
  }
  return groups;
}

function countTests(files) {
  let n = 0;
  for (const f of files) {
    n += (f.contents.match(/\b(it|test)\s*\(/g) || []).length;
  }
  return n;
}

async function runTests() {
  try {
    const { stdout, stderr } = await execP('npm -s run test:ci || npm -s test || true', {
      maxBuffer: 1024 * 1024,
    });
    return stdout + stderr;
  } catch (e) {
    return String(e);
  }
}

let diagnosticOpened = false;
async function openDiagnosticPR() {
  if (diagnosticOpened) return;
  diagnosticOpened = true;
  const branch = 'autofix/setup-hf-token';
  try {
    ensureBranch(branch, 'main');
    await openPR({
      branch,
      base: 'main',
      title: 'Autofix setup: add HF_TOKEN',
      body: 'HuggingFace API denied unauthenticated requests. Add HF_TOKEN secret.',
      labels: ['autofix'],
    });
  } catch (e) {
    console.error('diagnostic PR failed', e);
  }
}

async function processGroup(group, repoSummary, state) {
  const slug = slugFromSignature(group.signature);
  if (state[slug]) return;
  if (await findExistingPR(slug)) return;

  const snippets = await loadSnippetsForHints(group.hints);
  const fixRes = await generateFixAndGuard({
    signature: group.signature,
    sampleLog: group.sampleLog,
    repoSummary,
    fileSnippets: snippets,
  });

  if (fixRes.diagnostic === 'unauthorized') {
    await openDiagnosticPR();
    return;
  }

  if (fixRes.files && fixRes.files.length) {
    const branch = `autofix/${slug}-fix`;
    ensureBranch(branch, 'main');
    commitFiles(fixRes.files, `autofix: fix for ${slug}`);
    const testLog = await runTests();
    const body = [
      `Signature: ${group.signature}`,
      '',
      '```',
      group.sampleLog,
      '```',
      '',
      '```',
      testLog,
      '```',
    ].join('\n');
    await openPR({
      branch,
      base: 'main',
      title: `autofix: ${slug}`,
      body,
      labels: ['autofix', 'autofix-fix'],
    });
  }

  const testRes = await generateHiFiTests({
    signature: group.signature,
    sampleLog: group.sampleLog,
    repoSummary,
  });

  if (testRes.files && countTests(testRes.files) >= 10) {
    const branch = `autofix/${slug}-hf-tests`;
    ensureBranch(branch, 'main');
    commitFiles(testRes.files, `autofix tests for ${slug}`);
    const body = [
      `Signature: ${group.signature}`,
      '',
      '```',
      group.sampleLog,
      '```',
    ].join('\n');
    await openPR({
      branch,
      base: 'main',
      title: `autofix tests: ${slug}`,
      body,
      labels: ['autofix', 'autofix-tests'],
    });
  }

  state[slug] = true;
  await saveState(state);
}

export async function main() {
  const groups = await readGroups();
  if (!groups.length) return;
  const state = await loadState();
  const repoSummary = await summarizeRepo();
  let count = 0;
  for (const g of groups) {
    if (count >= AUTOFIX_MAX_GROUPS) break;
    await processGroup(g, repoSummary, state);
    count++;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
  });
}
