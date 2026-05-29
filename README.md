# gbrain-evals

> Fork note by Sebastian Förste: this fork adds a legal AI evaluation layer for retrieval, citation accuracy, legal completeness, uncertainty handling and escalation quality. See [LEGAL_RAG_EVALS.md](LEGAL_RAG_EVALS.md), [`legal-rag-evals/`](legal-rag-evals/README.md), and the reviewer runbook at [`legal-rag-evals/launch-readiness.md`](legal-rag-evals/launch-readiness.md).

**Public benchmarks for personal-knowledge agent stacks.** Two families,
both reproducible: BrainBench (our own corpus, in-house Cats 1–12) and
public benchmarks (LongMemEval today, ConvoMem + LoCoMo on the roadmap).

## Legal AI evaluation adaptation

This fork includes a legal RAG evaluation scaffold for regulated legal workflows.

- MiCAR white paper review fixtures
- 10-point legal answer scorecard
- failure taxonomy for retrieval, citation, legal reasoning, workflow and confidentiality failures
- evaluation dimensions for legal completeness, escalation quality and uncertainty handling

Start here: [Legal RAG Evals](legal-rag-evals/README.md). For a quick evaluator path, see [`legal-rag-evals/launch-readiness.md`](legal-rag-evals/launch-readiness.md).

## Latest results

**v0.40.6.0 comprehensive snapshot (2026-05-23)** — every published eval
result against current master in one page, plus the gap-map for what
v0.36.x → v0.40.6.0 features still need eval coverage. **Read the
snapshot:** [docs/benchmarks/2026-05-23-v0.40.6.0-snapshot.md](docs/benchmarks/2026-05-23-v0.40.6.0-snapshot.md).

**Headline numbers that hold up against v0.40.6.0:**

- **97.60% R@5 on public LongMemEval `_s`** — SOTA against MemPalace's
  published 96.6% baseline on the same dataset, same K, same n, no LLM
  in the retrieval loop.
- **49.1% P@5 / 97.9% R@5 on BrainBench v1 relational queries** — beats
  commodity vector RAG by 38 points P@5 and ripgrep-BM25 by 32 points.
  The graph layer alone is worth 30 points.
- **Zero retrieval regression across 20 releases** (v0.20.0 → v0.40.6.0).
  Headline numbers byte-identical to the v0.20.0 baseline.

| Benchmark | Latest result | Date | Report |
|---|---|---|
| v0.40.6.0 snapshot (comprehensive) | gbrain master HEAD | 2026-05-23 | [link](docs/benchmarks/2026-05-23-v0.40.6.0-snapshot.md) |
| LongMemEval `_s` (public) | gbrain-hybrid 97.60% R@5 | 2026-05-07 | [link](docs/benchmarks/2026-05-07-longmemeval-s.md) |
| BrainBench Cat 14+15 — Calibration A/B | gates v0.36.1.0 advice quality | 2026-05-18 | [link](docs/benchmarks/2026-05-18-brainbench-cat14-cat15-calibration.md) |
| BrainBench Cat 13b — Source Swamp | gbrain top-1 93.3% | 2026-04-25 | [link](docs/benchmarks/2026-04-25-brainbench-cat13b-source-swamp.md) |
| BrainBench v0.20.0 baseline | gbrain P@5 49.1% / R@5 97.9% | 2026-04-23 | [link](docs/benchmarks/2026-04-23-brainbench-v0.20.0.md) |
| Cross-system comparison | MemPal / Mastra / Stella / Contriever | living | [docs/comparison-systems.md](docs/comparison-systems.md) |

## Why a separate repo

Benchmark corpora (world-v1 + amara-life-v1 = ~4MB) shouldn't land in
every gbrain install. This repo is what you clone when you want to run
BrainBench against gbrain, not what you clone to use gbrain as a brain.

`gbrain-evals` depends on `gbrain` via the GitHub URL. When you `bun install`
here, gbrain gets pulled in as a library. Evals call into gbrain's core
modules (`pglite-engine`, `operations`, `link-extraction`, etc.) via the
`gbrain/*` subpath exports.

## 5-minute quickstart

```sh
# Clone + install (pulls gbrain as a library dep)
git clone https://github.com/garrytan/gbrain-evals.git
cd gbrain-evals
bun install
```

### Run LongMemEval (public benchmark, 500 questions × 4 adapters)

```sh
# Download the LongMemEval _s split (~278MB, one-time)
mkdir -p ~/datasets/longmemeval
curl -Lo ~/datasets/longmemeval/longmemeval_s.json \
  https://huggingface.co/datasets/xiaowu0162/longmemeval/resolve/main/longmemeval_s

export OPENAI_API_KEY="sk-..."        # required for vector + hybrid adapters
export ANTHROPIC_API_KEY="sk-ant-..." # required for hybrid+expansion adapter only

# 4 adapters × 500 questions, 3 parallel workers, 10-min batches w/ resume
bash eval/runner/longmemeval-batch.sh

# One adapter only
bash eval/runner/longmemeval-batch.sh --adapters hybrid

# Stratified sample for fast iteration
bun eval/runner/longmemeval.ts --stratify 10  # 10 Q's per type
```

First run pays ~$2 OpenAI embeddings; subsequent runs hit the local
content-addressed cache (~$0). See the published
[longmemeval-s benchmark report](docs/benchmarks/2026-05-07-longmemeval-s.md)
for headline numbers and methodology.

### Run BrainBench (in-house corpus, 240-page fictional life)

See the upstream documentation and benchmark reports for the full runner matrix.
