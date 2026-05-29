# Source Grounding Rubric

Evaluate whether a legal AI answer is supported by reliable source context.

## 5 points

The answer clearly links each material claim to a source, distinguishes binding sources from internal policy and precedent, and states when the source does not fully answer the question.

## 4 points

Most material claims are source-grounded. Minor claims may be unsupported, but the answer is still safe for legal review.

## 3 points

The answer uses relevant sources but blends source statements, assumptions and legal conclusions without enough separation.

## 2 points

The answer mentions sources generally but does not show which claims depend on which sources.

## 1 point

The answer appears plausible but is mostly unsupported.

## 0 points

The answer fabricates sources, misstates source content or invents legal authority.

## Required source labels

A legal AI system should label sources as:

- binding law
- regulator guidance
- case law
- internal policy
- contract text
- playbook
- precedent decision
- factual evidence

## Required uncertainty language

Use explicit uncertainty when the system lacks enough evidence:

```text
The current source set does not establish...
The answer depends on confirming...
No current approved policy was found for...
The latest available decision appears stale because...
```
