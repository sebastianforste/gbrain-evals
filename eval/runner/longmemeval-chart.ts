/**
 * Generate SVG charts from a longmemeval runner JSON output. Inline-SVG so
 * GitHub markdown renders it without an external image host.
 *
 * Run:
 *   bun eval/runner/longmemeval-chart.ts <runner-output.json> [<runner-output.json> ...]
 *   bun eval/runner/longmemeval-chart.ts --merge a.json b.json   # combine adapters from two files
 *
 * Writes <input>.svg next to each input file, plus <input>.per-type.svg if
 * the input has multiple adapters with per-type breakdowns.
 */

import { readFileSync, writeFileSync } from 'fs';

interface AdapterSummary {
  adapter: string;
  dataset: string;
  total: number;
  topK: number;
  recall_at_k: number;
  recall_by_type: Record<string, { hit: number; total: number; recall: number }>;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p99_latency_ms: number;
  total_seconds: number;
}

interface RunnerOutput {
  opts: { datasetName: string; topK: number };
  summaries: AdapterSummary[];
}

// External published baselines for comparison context. Numbers come from
// the linked source documents — keep them in sync with the report's
// `## Comparison vs published systems` section, and re-check the source
// files quarterly since memory-systems publish frequently.
interface ExternalBaseline {
  label: string;
  recall: number;          // R@K, as a fraction
  topK: number;
  questions: number;
  source: string;
}
const EXTERNAL_BASELINES: ExternalBaseline[] = [
  {
    label: 'MemPal raw (ChromaDB)',
    recall: 0.966,
    topK: 5,
    questions: 500,
    source: 'github.com/MemPalace/mempalace BENCHMARKS.md',
  },
  {
    label: 'MemPal hybrid v4 + Haiku',
    recall: 1.0,
    topK: 5,
    questions: 500,
    source: 'tuned on 3 specific questions; held-out 450q is 98.4%',
  },
];

const COLORS = {
  hybrid: '#16a34a',      // green-600
  keyword: '#9ca3af',     // gray-400
  external: '#f59e0b',    // amber-500
  bgPanel: '#0a0a0a',
  bgCard: '#171717',
  text: '#e5e7eb',
  textMuted: '#9ca3af',
  axis: '#404040',
  grid: '#262626',
};

function pct(x: number): string {
  return (x * 100).toFixed(1) + '%';
}

function adapterColor(name: string): string {
  if (name.includes('hybrid')) return COLORS.hybrid;
  if (name.includes('keyword')) return COLORS.keyword;
  return COLORS.external;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Headline card ──────────────────────────────────────────────────

function headlineCard(summaries: AdapterSummary[], topK: number): string {
  const W = 880;
  const cardPad = 24;
  const numCards = summaries.length + EXTERNAL_BASELINES.filter(b => b.topK === topK).length;
  const cardW = (W - cardPad * (numCards + 1)) / numCards;
  const H = 200;

  const cards: Array<{ label: string; value: string; sub: string; color: string; isUs: boolean }> = [];
  for (const s of summaries) {
    cards.push({
      label: s.adapter,
      value: pct(s.recall_at_k),
      sub: `n=${s.total} · k=${s.topK} · ${s.total_seconds.toFixed(0)}s`,
      color: adapterColor(s.adapter),
      isUs: true,
    });
  }
  for (const b of EXTERNAL_BASELINES.filter(b => b.topK === topK)) {
    cards.push({
      label: b.label,
      value: pct(b.recall),
      sub: `n=${b.questions} · k=${b.topK} · published`,
      color: COLORS.external,
      isUs: false,
    });
  }

  const cardsXml = cards.map((c, i) => {
    const x = cardPad + i * (cardW + cardPad);
    const valueFontSize = c.value.length > 5 ? 36 : 44;
    return `
      <g transform="translate(${x},${cardPad})">
        <rect width="${cardW}" height="${H - cardPad * 2}" rx="8" fill="${COLORS.bgCard}" stroke="${c.color}" stroke-width="${c.isUs ? 2 : 1}" />
        <text x="${cardW / 2}" y="32" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="13" fill="${COLORS.textMuted}">${escapeXml(c.label)}</text>
        <text x="${cardW / 2}" y="${32 + valueFontSize + 4}" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,monospace" font-size="${valueFontSize}" font-weight="700" fill="${c.color}">${c.value}</text>
        <text x="${cardW / 2}" y="${H - cardPad * 2 - 12}" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,monospace" font-size="11" fill="${COLORS.textMuted}">${escapeXml(c.sub)}</text>
      </g>
    `;
  }).join('');

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${COLORS.bgPanel}" />
  ${cardsXml}
</svg>
`.trim();
}

// ─── Per-type grouped bar chart ─────────────────────────────────────

function perTypeChart(summaries: AdapterSummary[], topK: number): string {
  // Pull all question_types in stable order across summaries.
  const types: string[] = [];
  for (const s of summaries) {
    for (const t of Object.keys(s.recall_by_type)) {
      if (!types.includes(t)) types.push(t);
    }
  }
  // Stable order: easiest to hardest based on hybrid recall.
  const sorter = summaries.find(s => s.adapter.includes('hybrid')) ?? summaries[0];
  types.sort((a, b) => {
    const ra = sorter.recall_by_type[a]?.recall ?? 0;
    const rb = sorter.recall_by_type[b]?.recall ?? 0;
    return rb - ra;
  });

  const adapters = summaries;
  const externals = EXTERNAL_BASELINES.filter(b => b.topK === topK).slice(0, 1); // first matching K only
  // External baselines are per-system overall — render as a horizontal reference line.

  const W = 880;
  const H = 360;
  const padL = 200, padR = 40, padT = 32, padB = 60;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const groupH = plotH / types.length;
  const barH = (groupH - 8) / adapters.length;
  const maxX = 1.0;

  // Grid lines (every 20%)
  const gridLines: string[] = [];
  for (let v = 0.2; v <= 1.0; v += 0.2) {
    const x = padL + plotW * (v / maxX);
    gridLines.push(`<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + plotH}" stroke="${COLORS.grid}" stroke-width="1" />`);
    gridLines.push(`<text x="${x}" y="${padT + plotH + 18}" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,monospace" font-size="10" fill="${COLORS.textMuted}">${(v * 100).toFixed(0)}%</text>`);
  }

  const rows: string[] = [];
  for (let ti = 0; ti < types.length; ti++) {
    const t = types[ti];
    const yGroup = padT + ti * groupH + 4;
    rows.push(`<text x="${padL - 12}" y="${yGroup + groupH / 2 + 4}" text-anchor="end" font-family="ui-sans-serif,system-ui,sans-serif" font-size="13" fill="${COLORS.text}">${escapeXml(t)}</text>`);
    for (let ai = 0; ai < adapters.length; ai++) {
      const a = adapters[ai];
      const v = a.recall_by_type[t]?.recall ?? 0;
      const w = plotW * (v / maxX);
      const y = yGroup + ai * (barH + 2);
      rows.push(`<rect x="${padL}" y="${y}" width="${w}" height="${barH}" fill="${adapterColor(a.adapter)}" />`);
      // Label inside or right of bar
      const labelText = pct(v);
      const labelX = w > 50 ? padL + w - 6 : padL + w + 6;
      const labelAnchor = w > 50 ? 'end' : 'start';
      const labelFill = w > 50 ? '#000' : COLORS.text;
      rows.push(`<text x="${labelX}" y="${y + barH / 2 + 4}" text-anchor="${labelAnchor}" font-family="ui-monospace,SFMono-Regular,monospace" font-size="11" font-weight="600" fill="${labelFill}">${labelText}</text>`);
    }
  }

  // External reference line (overall recall, not per-type)
  const refLines = externals.map(b => {
    const x = padL + plotW * b.recall;
    return `
      <line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + plotH}" stroke="${COLORS.external}" stroke-width="1" stroke-dasharray="4,3" />
      <text x="${x}" y="${padT - 8}" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="10" fill="${COLORS.external}">${escapeXml(b.label)} ${pct(b.recall)}</text>
    `;
  }).join('');

  // Legend
  const legend: string[] = [];
  let lx = padL;
  for (const a of adapters) {
    legend.push(`<rect x="${lx}" y="${H - 18}" width="14" height="10" fill="${adapterColor(a.adapter)}" />`);
    legend.push(`<text x="${lx + 20}" y="${H - 8}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="11" fill="${COLORS.text}">${escapeXml(a.adapter)} (k=${a.topK}, n=${a.total})</text>`);
    lx += 220;
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${COLORS.bgPanel}" />
  <text x="${padL}" y="20" font-family="ui-sans-serif,system-ui,sans-serif" font-size="13" fill="${COLORS.text}">recall@${adapters[0]?.topK ?? topK} by question_type</text>
  ${gridLines.join('\n  ')}
  ${rows.join('\n  ')}
  ${refLines}
  ${legend.join('\n  ')}
</svg>
`.trim();
}

// ─── Main ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length === 0) {
  process.stderr.write('usage: bun longmemeval-chart.ts <runner-output.json> [...]\n');
  process.stderr.write('       bun longmemeval-chart.ts --merge a.json b.json\n');
  process.exit(1);
}

if (args[0] === '--merge') {
  const inputs = args.slice(1);
  if (inputs.length < 2) {
    process.stderr.write('--merge needs at least 2 inputs\n');
    process.exit(1);
  }
  const merged: RunnerOutput = { opts: { datasetName: '', topK: 0 }, summaries: [] };
  for (const f of inputs) {
    const data = JSON.parse(readFileSync(f, 'utf8')) as RunnerOutput;
    merged.opts.datasetName = data.opts.datasetName;
    merged.opts.topK = data.opts.topK;
    merged.summaries.push(...data.summaries);
  }
  const stem = inputs[0].replace(/\.json$/, '');
  const headlineSvg = headlineCard(merged.summaries, merged.opts.topK);
  const perTypeSvg = perTypeChart(merged.summaries, merged.opts.topK);
  writeFileSync(stem + '.headline.svg', headlineSvg + '\n');
  writeFileSync(stem + '.per-type.svg', perTypeSvg + '\n');
  process.stderr.write(`wrote ${stem}.headline.svg + ${stem}.per-type.svg (merged from ${inputs.length} files)\n`);
} else {
  for (const f of args) {
    const data = JSON.parse(readFileSync(f, 'utf8')) as RunnerOutput;
    const stem = f.replace(/\.json$/, '');
    const headlineSvg = headlineCard(data.summaries, data.opts.topK);
    const perTypeSvg = perTypeChart(data.summaries, data.opts.topK);
    writeFileSync(stem + '.headline.svg', headlineSvg + '\n');
    writeFileSync(stem + '.per-type.svg', perTypeSvg + '\n');
    process.stderr.write(`wrote ${stem}.headline.svg + ${stem}.per-type.svg\n`);
  }
}
