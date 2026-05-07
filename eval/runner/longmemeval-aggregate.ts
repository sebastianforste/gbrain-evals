/**
 * Aggregate the per-question NDJSON stream from `longmemeval.ts --ndjson`
 * into the same RunSummary[] shape the all-in-one runner produces.
 *
 * Run:
 *   bun eval/runner/longmemeval-aggregate.ts <ndjson-path> [--output <out.json>]
 *
 * Writes:
 *   <stem>.json — { opts: {...}, summaries: [...] } same shape as runner output
 *   <stem>.md   — human-readable summary table
 */

import { readFileSync, writeFileSync } from 'fs';

interface NdjsonRow {
  adapter: string;
  question_id: string;
  question_type: string;
  retrieved: string[];
  ground_truth: string[];
  hit_at_k: boolean;
  num_haystack: number;
  latency_ms: number;
  error?: string;
}

const args = process.argv.slice(2);
const ndjsonPath = args.find(a => !a.startsWith('--'));
if (!ndjsonPath) {
  console.error('usage: bun longmemeval-aggregate.ts <ndjson-path> [--output <out.json>]');
  process.exit(1);
}
const outputArg = (() => {
  const i = args.indexOf('--output');
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
})();

const raw = readFileSync(ndjsonPath, 'utf8');
const rows: NdjsonRow[] = [];
const seen = new Set<string>();
let lineNo = 0;
let dupes = 0;
for (const line of raw.split('\n')) {
  lineNo++;
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line) as NdjsonRow;
    const key = `${obj.adapter}::${obj.question_id}`;
    if (seen.has(key)) {
      // Concurrent workers can race past the resume-skip and double-process
      // the same (adapter, question_id). The result is deterministic given
      // the same question text + cached embeddings, so dropping the second
      // occurrence is correct. First-wins keeps the original latency_ms.
      dupes++;
      continue;
    }
    seen.add(key);
    rows.push(obj);
  } catch (err) {
    process.stderr.write(`[aggregate] line ${lineNo} skipped (parse error)\n`);
  }
}
if (dupes > 0) process.stderr.write(`[aggregate] ${dupes} duplicate (adapter, question_id) rows deduped\n`);

// Group by adapter
const byAdapter = new Map<string, NdjsonRow[]>();
for (const r of rows) {
  if (!byAdapter.has(r.adapter)) byAdapter.set(r.adapter, []);
  byAdapter.get(r.adapter)!.push(r);
}

const summaries = [];
for (const [adapterName, adapterRows] of byAdapter) {
  const total = adapterRows.length;
  const hits = adapterRows.filter(r => r.hit_at_k).length;
  const errors = adapterRows.filter(r => r.error).length;
  const recallByType: Record<string, { hit: number; total: number; recall: number }> = {};
  for (const r of adapterRows) {
    const b = recallByType[r.question_type] ?? (recallByType[r.question_type] = { hit: 0, total: 0, recall: 0 });
    b.total++;
    if (r.hit_at_k) b.hit++;
  }
  for (const k of Object.keys(recallByType)) {
    recallByType[k].recall = recallByType[k].total === 0 ? 0 : recallByType[k].hit / recallByType[k].total;
  }
  const lat = adapterRows.map(r => r.latency_ms).sort((a, b) => a - b);
  const p50 = lat[Math.floor(lat.length * 0.5)] || 0;
  const p99 = lat[Math.floor(lat.length * 0.99)] || 0;
  summaries.push({
    adapter: adapterName,
    dataset: 's',
    total,
    topK: 5,                     // assumed; the NDJSON doesn't carry topK; documented in the report
    recall_at_k: total === 0 ? 0 : hits / total,
    recall_by_type: recallByType,
    avg_latency_ms: lat.reduce((s, x) => s + x, 0) / Math.max(lat.length, 1),
    p50_latency_ms: p50,
    p99_latency_ms: p99,
    total_seconds: lat.reduce((s, x) => s + x, 0) / 1000,
    errors,
  });
}

// Sort adapters in a stable preferred order so charts and tables look the same across runs.
const adapterOrder = ['gbrain-keyword', 'gbrain-vector', 'gbrain-hybrid', 'gbrain-hybrid+expansion'];
summaries.sort((a, b) => adapterOrder.indexOf(a.adapter) - adapterOrder.indexOf(b.adapter));

const stem = outputArg || ndjsonPath.replace(/\.ndjson$/, '');
const outJson = stem.endsWith('.json') ? stem : stem + '.json';
writeFileSync(outJson, JSON.stringify({
  opts: { datasetName: 's', topK: 5 },
  summaries,
}, null, 2) + '\n');
process.stderr.write(`wrote ${outJson}\n`);

// Human-readable markdown
const mdPath = outJson.replace(/\.json$/, '.md');
const lines: string[] = [];
lines.push(`# LongMemEval results (aggregated from ${ndjsonPath})\n`);
lines.push(`Dataset: \`s\`  |  Top-K: 5\n`);
lines.push('| Adapter | n | Recall@5 | p50 latency | p99 latency | Errors |');
lines.push('|---|---|---|---|---|---|');
for (const s of summaries) {
  lines.push(`| ${s.adapter} | ${s.total} | ${(s.recall_at_k * 100).toFixed(2)}% | ${s.p50_latency_ms.toFixed(0)}ms | ${s.p99_latency_ms.toFixed(0)}ms | ${s.errors} |`);
}
lines.push('');
const types = Array.from(new Set(rows.map(r => r.question_type))).sort();
if (types.length > 0 && summaries.length > 0) {
  lines.push('## Recall by question_type\n');
  lines.push('| question_type | total | ' + summaries.map(s => s.adapter).join(' | ') + ' |');
  lines.push('|---|---|' + summaries.map(() => '---').join('|') + '|');
  for (const t of types) {
    const total = summaries[0].recall_by_type[t]?.total ?? 0;
    const cells = summaries.map(s => {
      const b = s.recall_by_type[t];
      return b ? `${(b.recall * 100).toFixed(1)}% (${b.hit}/${b.total})` : '—';
    });
    lines.push(`| ${t} | ${total} | ${cells.join(' | ')} |`);
  }
}
writeFileSync(mdPath, lines.join('\n') + '\n');
process.stderr.write(`wrote ${mdPath}\n\n`);
process.stderr.write(lines.join('\n') + '\n');
