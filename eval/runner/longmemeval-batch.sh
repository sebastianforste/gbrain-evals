#!/usr/bin/env bash
# Parallel batch-runner wrapper for longmemeval.ts.
#
# Strategy: 3 workers in parallel (each its own PGLite + own slice of
# questions), each bounded by a 10-min wall budget. When the budget
# expires the workers exit cleanly; this wrapper waits for all of them,
# checks how many (adapter × question) pairs have been written to the
# shared NDJSON, and restarts the pool until all pairs land.
#
# Why parallel:
#   - Each worker is independent. Worker N takes questions where i % 3 == N.
#   - Workers share the SQLite embedding cache (WAL mode = concurrent-write
#     safe). They share the NDJSON output (POSIX O_APPEND is atomic for
#     line-sized writes).
#   - 3x throughput on cold-embed runs, near-3x on cache hits too. Tier-1
#     OpenAI rate limit (3000 RPM) has plenty of headroom.
#
# Why batched:
#   - PGLite WASM has been observed to enter unrecoverable abort loops on
#     long sessions. Bounding each invocation with a wall budget plus
#     OS-level kill cleans up the abort regime cleanly. The NDJSON is the
#     resume state.
#
# Run:
#   bash eval/runner/longmemeval-batch.sh
#   bash eval/runner/longmemeval-batch.sh --top-k 8
#   bash eval/runner/longmemeval-batch.sh --adapters keyword,hybrid --workers 4
#
# Output:
#   eval/reports/longmemeval/longmemeval-s-full-k5-2026-05-07.ndjson
#   eval/reports/longmemeval/longmemeval-s-full-k5-2026-05-07.json (final)
#   eval/reports/longmemeval/longmemeval-s-full-k5-2026-05-07.md   (final)
set -euo pipefail

cd "$(dirname "$0")/../.."

BUDGET_SECONDS=600
MAX_BATCHES=50
TOP_K=5
DATASET=s
WORKERS=3
ADAPTERS=""
NDJSON=""
EXPECTED_QUESTIONS=500
EXPECTED_ADAPTERS=4

EXTRA_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --top-k) TOP_K="$2"; shift 2 ;;
    --adapters) ADAPTERS="$2"; shift 2 ;;
    --budget) BUDGET_SECONDS="$2"; shift 2 ;;
    --ndjson) NDJSON="$2"; shift 2 ;;
    --workers) WORKERS="$2"; shift 2 ;;
    *) EXTRA_ARGS+=("$1"); shift ;;
  esac
done

NDJSON="${NDJSON:-eval/reports/longmemeval/longmemeval-s-full-k${TOP_K}-2026-05-07.ndjson}"

if [[ -n "$ADAPTERS" ]]; then
  EXTRA_ARGS+=(--adapters "$ADAPTERS")
  EXPECTED_ADAPTERS=$(echo "$ADAPTERS" | tr ',' '\n' | wc -l | tr -d ' ')
fi

EXPECTED_TOTAL=$((EXPECTED_QUESTIONS * EXPECTED_ADAPTERS))
mkdir -p "$(dirname "$NDJSON")"

for batch in $(seq 1 $MAX_BATCHES); do
  # Count UNIQUE (adapter, question_id) pairs, not raw lines. Concurrent
  # workers can write the same pair twice when their resume-skip-set was
  # read before the other worker's write landed; dedup before checking
  # completion so we don't exit early on duplicate-inflated line counts.
  if [[ -f "$NDJSON" ]]; then
    DONE=$(bun -e '
      const fs = require("fs"); const seen = new Set();
      for (const l of fs.readFileSync(process.argv[1], "utf8").split("\n")) {
        if (!l.trim()) continue;
        try { const o = JSON.parse(l); seen.add(`${o.adapter}::${o.question_id}`); } catch {}
      }
      console.log(seen.size);
    ' "$NDJSON")
  else
    DONE=0
  fi
  echo "=== batch $batch — $(date +%H:%M:%S) — completed $DONE/$EXPECTED_TOTAL pairs (workers=$WORKERS, budget=${BUDGET_SECONDS}s) ==="
  if [[ "$DONE" -ge "$EXPECTED_TOTAL" ]]; then
    echo "All pairs complete. Exiting."
    break
  fi

  # Spawn $WORKERS workers in parallel. Each takes a slice of questions
  # (worker N processes questions where i % WORKERS == N). Stagger the
  # starts so the migration boilerplate doesn't all hit at once.
  pids=()
  for w in $(seq 0 $((WORKERS - 1))); do
    bun eval/runner/longmemeval.ts \
      --top-k "$TOP_K" \
      --dataset "$DATASET" \
      --ndjson "$NDJSON" \
      --max-wall-seconds "$BUDGET_SECONDS" \
      --worker-id "$w" \
      --total-workers "$WORKERS" \
      ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"} \
      > "/tmp/lme-worker-$w.log" 2>&1 &
    pids+=($!)
    sleep 0.5
  done
  echo "Workers PIDs: ${pids[*]}"

  # Wait for all workers in this batch to finish (or die).
  for pid in "${pids[@]}"; do
    wait "$pid" 2>/dev/null || true
  done

  # Drain WAL across workers — important when one process closed the SQLite
  # while another still had the WAL open. WAL gets folded back into the
  # main file on next open; this is a no-op now but worth the comment.
  sleep 1
done

echo
echo "=== aggregating final results ==="
bun eval/runner/longmemeval-aggregate.ts "$NDJSON"
