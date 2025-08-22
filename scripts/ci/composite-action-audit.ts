import { promises as fs } from 'fs';
import path from 'path';
import { parseDocument, YAMLMap, YAMLSeq, isMap, LineCounter } from 'yaml';

interface Message {
  message: string;
  line?: number;
}

interface ActionReport {
  path: string;
  errors: Message[];
  warnings: Message[];
}

interface Summary {
  actions: ActionReport[];
  ok: boolean;
}

interface Options {
  strict?: boolean;
  summaryFile?: string;
}

async function findManifests(root: string): Promise<string[]> {
  const results: string[] = [];
  const base = path.join(root, '.github', 'actions');

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && e.name === 'action.yml') results.push(full);
    }
  }

  await walk(base);
  return results.sort();
}

function lineOf(lineCounter: LineCounter, node: any): number | undefined {
  if (!node || typeof node.range?.[0] !== 'number') return undefined;
  return lineCounter.linePos(node.range[0]).line + 1;
}

export async function auditCompositeActions(
  root = process.cwd(),
  options: Options = {}
): Promise<Summary> {
  const files = await findManifests(root);
  const actions: ActionReport[] = [];

  for (const file of files) {
    const rel = path.relative(root, file);
    const report: ActionReport = { path: rel, errors: [], warnings: [] };
    const text = await fs.readFile(file, 'utf8');
    const lineCounter = new LineCounter();
    const doc = parseDocument(text, { prettyErrors: false, lineCounter });

    if (doc.errors.length) {
      for (const err of doc.errors) {
        const line = err.linePos
          ? err.linePos.start.line + 1
          : lineCounter.linePos(err.pos[0]).line + 1;
        report.errors.push({ message: err.message, line });
      }
      actions.push(report);
      continue;
    }

    const map = doc.contents as YAMLMap;
    const data = doc.toJS() as any;
    const allowedTop = new Set(['name', 'description', 'runs']);

    for (const item of map.items) {
      const key = String(item.key);
      if (!allowedTop.has(key)) {
        report.warnings.push({
          message: `unknown top-level key: ${key}`,
          line: lineOf(lineCounter, item.key),
        });
      }
    }

    if (typeof data.name !== 'string') {
      report.errors.push({
        message: 'name must be a string',
        line: lineOf(lineCounter, map.get('name', true)),
      });
    }

    if (typeof data.description !== 'string') {
      report.errors.push({
        message: 'description must be a string',
        line: lineOf(lineCounter, map.get('description', true)),
      });
    }

    const runsNode = map.get('runs', true);
    if (!isMap(runsNode)) {
      report.errors.push({
        message: 'runs must be a mapping',
        line: lineOf(lineCounter, runsNode),
      });
      actions.push(report);
      continue;
    }
    const runs: any = runsNode.toJSON();

    const usingNode = runsNode.get('using', true);
    if (usingNode?.toString() !== 'composite') {
      report.errors.push({
        message: 'runs.using must be "composite"',
        line: lineOf(lineCounter, usingNode),
      });
    }

    const stepsNode = runsNode.get('steps', true);
    if (!(stepsNode instanceof YAMLSeq)) {
      report.errors.push({
        message: 'runs.steps must be an array',
        line: lineOf(lineCounter, stepsNode ?? runsNode),
      });
    } else {
      for (const stepNode of stepsNode.items) {
        const line = lineOf(lineCounter, stepNode);
        let node: any = stepNode as any;
        if (node && node.constructor && node.constructor.name === 'Alias' && typeof node.resolve === 'function') {
          node = node.resolve(doc);
        }
        const step: any = node.toJSON();
        const hasUses = Object.prototype.hasOwnProperty.call(step, 'uses');
        const hasRun = Object.prototype.hasOwnProperty.call(step, 'run');
        const hasShell = Object.prototype.hasOwnProperty.call(step, 'shell');

        if (hasUses && (hasRun || hasShell)) {
          report.errors.push({ message: 'step cannot have both uses and run/shell', line });
        }
        if (hasRun && !hasShell) {
          report.errors.push({ message: 'run step requires shell', line });
        }
        if (!hasUses && !hasRun) {
          report.errors.push({ message: 'step must have uses or run', line });
        }

        if (hasUses && typeof step.uses === 'string') {
          if (/^actions\/github-script@/.test(step.uses)) {
            if (step.script !== undefined) {
              report.errors.push({
                message: 'script must be provided under with:',
                line,
              });
            } else if (!step.with || typeof step.with.script !== 'string') {
              report.errors.push({
                message: 'github-script steps require with.script',
                line,
              });
            }
          }
        }

        if (step.with && typeof step.with === 'object') {
          for (const [k, v] of Object.entries(step.with)) {
            if (typeof v !== 'string') {
              report.errors.push({ message: `with.${k} must be a string`, line });
            }
          }
        }
      }
    }

    actions.push(report);
  }

  const ok = actions.every(
    (a) => a.errors.length === 0 && (!options.strict || a.warnings.length === 0)
  );

  const summary: Summary = { actions, ok };
  if (options.summaryFile) {
    await fs.writeFile(path.join(root, options.summaryFile), JSON.stringify(summary, null, 2));
  }
  return summary;
}

if (require.main === module) {
  const strict = process.argv.includes('--strict');
  const summaryFile = 'composite-action-audit-summary.json';
  auditCompositeActions(process.cwd(), { strict, summaryFile })
    .then((summary) => {
      console.log(JSON.stringify(summary, null, 2));
      if (!summary.ok) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

