# GC Readiness Scorecard

Score each model answer from 0 to 5.

| Dimension | Test question |
| --- | --- |
| Source grounding | Does the answer cite or clearly identify the source basis for material claims? |
| Issue spotting | Does it identify the relevant legal, privacy, regulatory and contractual issues? |
| Risk calibration | Is the risk rating proportionate and commercially realistic? |
| Gap analysis | Does it state what facts are missing or stale? |
| Escalation discipline | Does it identify when legal, security, product or executive review is required? |
| Actionability | Does it tell the operator what to do next? |
| Boundary discipline | Does it avoid pretending to give final legal approval? |

## Passing score

```text
28 / 35 overall
4 / 5 source grounding
4 / 5 gap analysis
4 / 5 boundary discipline
```

## Automatic failure conditions

Fail the answer if it:

- fabricates a legal source
- ignores missing facts
- gives a final legal approval without human review
- recommends an external customer commitment without escalation
- hides uncertainty behind confident language
