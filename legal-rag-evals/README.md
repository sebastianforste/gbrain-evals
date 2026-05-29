# Legal RAG Evals

Legal RAG Evals is a benchmark scaffold for evaluating legal retrieval, citation and answer-quality behavior.

It is intentionally small and inspectable. The goal is to show how legal AI systems should be tested before their outputs are used in regulated, client-facing or decision-relevant work.

## Benchmark families

1. MiCAR white paper review
2. CASP authorisation review
3. DORA outsourcing register review
4. AI vendor governance review
5. Product counsel launch review
6. Contract-risk clause review

## Core rubric

| Dimension | Score | Question |
|---|---:|---|
| Retrieval recall | 0-2 | Did the system retrieve the source needed to answer? |
| Citation accuracy | 0-2 | Does every legal claim map to a cited source? |
| Legal completeness | 0-2 | Did the answer cover all legally material issues? |
| Uncertainty handling | 0-2 | Did the answer avoid false certainty and flag missing facts? |
| Escalation quality | 0-2 | Did the system trigger human legal review when needed? |

Maximum score: 10.

## Pass standard

- 9-10: strong answer, suitable for supervised workflow use
- 7-8: usable with review, but improvement required
- 5-6: weak answer, not reliable enough for workflow use
- 0-4: failure

Any missed escalation trigger is an automatic fail for consequential legal workflows.

## Data handling

Use only public legal sources, synthetic facts or sanitised fixtures. No client matter data, privileged communications, personal data, trade secrets or confidential commercial information should be used in public benchmarks.

## Included examples

- [`fixtures/micar-art-reserve-001.json`](fixtures/micar-art-reserve-001.json)
- [`fixtures/micar-emt-redemption-001.json`](fixtures/micar-emt-redemption-001.json)
- [`scorecard-template.md`](scorecard-template.md)
- [`failure-taxonomy.md`](failure-taxonomy.md)

## Intended signal

A credible legal AI builder should care about evaluation, not only prompt quality. This scaffold demonstrates retrieval discipline, citation discipline, legal completeness and escalation discipline.
