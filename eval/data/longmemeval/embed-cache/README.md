# Embedding cache — content-addressed
SHA-256(text) → vector. Filled by `bun eval/runner/longmemeval.ts`.
Safe to share: different content cant ever match the same hash, so a
tampered cache cant inject wrong vectors. Re-derives perfectly across
machines that pull the same dataset.

Schema-keyed by `(model_id@dimensions, sha256(text))` so any embedding-
config change auto-invalidates the cache without manual cleanup.

