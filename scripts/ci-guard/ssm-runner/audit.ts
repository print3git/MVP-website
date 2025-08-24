import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

interface Issue {
  file: string;
  job?: string;
  message: string;
}

export interface AuditSummary {
  bootstrap: {
    permissions: boolean;
    githubScript: boolean;
    sendCommand: boolean;
    tokenSafe: boolean;
  } | null;
  selfhostedPrefer: {
    runsOnInput: boolean;
    fallbackUbuntu: boolean;
  } | null;
  sshPorts: Issue[];
}

function loadYAML(p: string): any {
  try {
    return YAML.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}

function checkBootstrap(wf: any): AuditSummary['bootstrap'] {
  const job = wf?.jobs?.bootstrap;
  if (!job) return null;
  const perms = job.permissions || wf.permissions || {};
  const permissions = perms['id-token'] === 'write' && perms['actions'] === 'write';
  let githubScript = false;
  let sendCommand = false;
  let tokenSafe = true;
  for (const step of job.steps || []) {
    if (typeof step.uses === 'string' && step.uses.startsWith('actions/github-script')) {
      githubScript = true;
    }
    if (typeof step.run === 'string') {
      const run = step.run;
      if (/aws\s+ssm\s+send-command/.test(run)) {
        if (/--instance-ids/.test(run) || /--targets/.test(run)) {
          sendCommand = true;
        }
      }
      if (/echo\s+.*token/i.test(run)) {
        tokenSafe = false;
      }
    }
  }
  return { permissions, githubScript, sendCommand, tokenSafe };
}

function checkSelfHostedPrefer(wf: any): AuditSummary['selfhostedPrefer'] {
  const job = wf?.jobs?.choose;
  if (!job) return null;
  const runsOnInput = typeof job['runs-on'] === 'string' && job['runs-on'].includes('inputs.fallback');
  const fallbackUbuntu = wf?.on?.workflow_call?.inputs?.fallback?.default === 'ubuntu-latest';
  return { runsOnInput, fallbackUbuntu };
}

function scanPorts(workflows: Record<string, any>): Issue[] {
  const issues: Issue[] = [];
  for (const [file, wf] of Object.entries(workflows)) {
    const jobs = wf.jobs || {};
    for (const [jobName, job] of Object.entries<any>(jobs)) {
      for (const step of job.steps || []) {
        const run: string = step.run || '';
        if (/ssh\b/.test(run) || /port\s+22/.test(run) || /:22\b/.test(run)) {
          issues.push({ file, job: jobName, message: 'Uses ssh or port 22' });
        }
      }
    }
  }
  return issues;
}

export function auditWorkflows(dir: string): AuditSummary {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.yml'));
  const workflows: Record<string, any> = {};
  for (const f of files) workflows[f] = loadYAML(path.join(dir, f));
  const bootstrap = workflows['runner-ssm-bootstrap.yml']
    ? checkBootstrap(workflows['runner-ssm-bootstrap.yml'])
    : null;
  const selfhostedPrefer = workflows['selfhosted-prefer.yml']
    ? checkSelfHostedPrefer(workflows['selfhosted-prefer.yml'])
    : null;
  const sshPorts = scanPorts(workflows);
  return { bootstrap, selfhostedPrefer, sshPorts };
}

export function humanSummary(sum: AuditSummary): string {
  const lines = [] as string[];
  if (sum.bootstrap) {
    lines.push(`bootstrap permissions: ${sum.bootstrap.permissions}`);
    lines.push(`bootstrap github-script: ${sum.bootstrap.githubScript}`);
    lines.push(`bootstrap send-command: ${sum.bootstrap.sendCommand}`);
    lines.push(`bootstrap tokenSafe: ${sum.bootstrap.tokenSafe}`);
  } else {
    lines.push('bootstrap: missing');
  }
  if (sum.selfhostedPrefer) {
    lines.push(`selfhosted runs-on input: ${sum.selfhostedPrefer.runsOnInput}`);
    lines.push(`selfhosted fallback ubuntu: ${sum.selfhostedPrefer.fallbackUbuntu}`);
  } else {
    lines.push('selfhosted-prefer: missing');
  }
  for (const issue of sum.sshPorts) {
    lines.push(`port22: ${issue.file}:${issue.job}`);
  }
  return lines.join('\n');
}

export function writeSummary(sum: AuditSummary, outDir = '.') {
  fs.writeFileSync(path.join(outDir, 'ssm-runner-audit.json'), JSON.stringify(sum, null, 2));
  const text = humanSummary(sum);
  fs.writeFileSync(path.join(outDir, 'ssm-runner-audit.txt'), text);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
  }
}

export function chooseRunner(runners: string[], label: string, fallback: string): string {
  return runners.includes(label) ? label : fallback;
}

if (require.main === module) {
  const dir = path.join(process.cwd(), '.github', 'workflows');
  const summary = auditWorkflows(dir);
  writeSummary(summary, process.cwd());
  console.log(JSON.stringify(summary, null, 2));
  console.log(humanSummary(summary));
  if (
    (summary.bootstrap && (!summary.bootstrap.permissions || !summary.bootstrap.githubScript || !summary.bootstrap.sendCommand || !summary.bootstrap.tokenSafe)) ||
    (summary.selfhostedPrefer && (!summary.selfhostedPrefer.runsOnInput || !summary.selfhostedPrefer.fallbackUbuntu)) ||
    summary.sshPorts.length
  ) {
    process.exitCode = 1;
  }
}
