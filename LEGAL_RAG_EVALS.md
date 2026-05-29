# Legal RAG Evals

This fork adds a legal AI evaluation layer to `gbrain-evals`.

The original project benchmarks memory, retrieval and synthesis behavior for agentic knowledge systems. Legal RAG Evals applies the same discipline to legal AI workflows, where a fluent answer is not enough. A useful legal AI system must retrieve the right source, cite it accurately, distinguish law from assumption, detect missing facts, surface uncertainty and escalate when legal judgment is required.

## Why this matters

Legal AI systems are usually demonstrated with polished answers. In practice, the hard questions are different:

- Did the system retrieve the authority needed to answer the question?
- Did it cite the authority accurately?
- Did it cover all legally material issues?
- Did it warn when a source may be stale, incomplete or contradictory?
- Did it avoid certifying compliance when only a first-pass review is possible?
- Did it escalate issues requiring lawyer judgment?
- Did the workflow avoid confidential, privileged or personal data leakage?

## What is included

The legal adaptation lives in [`legal-rag-evals/`](legal-rag-evals/README.md).

It includes:

- a legal evaluation rubric
- sample MiCAR benchmark fixtures
- a 10-point reviewer scorecard
- a failure-mode taxonomy for legal RAG systems
- a roadmap for contract, DORA, AI governance and product-counsel evals

## Evaluation dimensions

| Dimension | What it tests |
|---|---|
| Retrieval recall | Whether the system found the legally necessary source |
| Citation accuracy | Whether claims map to cited authority |
| Legal completeness | Whether the legally material issues are covered |
| Uncertainty handling | Whether the answer avoids false certainty |
| Escalation quality | Whether lawyer review is triggered at the right point |
| Confidentiality | Whether sensitive inputs are avoided or protected |

## Status

Public showcase adaptation by Sebastian Förste. The legal fixtures use synthetic facts and public legal-source references only.
