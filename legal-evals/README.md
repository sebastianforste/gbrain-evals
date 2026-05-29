# Legal AI Evaluation Pack

This fork adds a legal-evaluation layer for testing whether AI systems are safe and useful for general counsel, product counsel and legal operations workflows.

## Why this matters

Legal AI should not be evaluated only on fluency. It must be evaluated on source grounding, issue spotting, risk calibration, uncertainty handling and escalation discipline.

## Evaluation categories

```text
legal-evals/
  gc-readiness-scorecard.md
  product-counsel-eval-cases.md
  contract-risk-eval-cases.md
  ai-governance-eval-cases.md
  source-grounding-rubric.md
```

## Core thesis

A good legal AI answer is not merely plausible. It is:

- source-grounded
- context-aware
- commercially useful
- calibrated under uncertainty
- explicit about missing facts
- clear about when a human lawyer must decide

## Portfolio signal

This is the evaluation counterpart to the legal GC brain work in `gbrain` and the legal workflow work in `gstack`.
