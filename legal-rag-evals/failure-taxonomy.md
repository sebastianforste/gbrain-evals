# Legal RAG Failure Taxonomy

Use this taxonomy to classify failures in legal retrieval and answer-generation workflows.

## Retrieval failures

- **Missing authority**: the answer does not retrieve a required statute, regulation, guidance document, contract clause or policy.
- **Wrong authority**: the answer relies on a source from the wrong jurisdiction, version, regime or legal category.
- **Stale authority**: the answer relies on outdated material without warning.
- **Source swamp**: the system retrieves broadly related material but misses the controlling source.

## Citation failures

- **Fabricated citation**: citation does not exist or cannot support the claim.
- **Overbroad citation**: citation points to a whole source but not the relevant provision.
- **Unsupported claim**: answer makes a legal claim without source support.
- **Citation laundering**: cited source is real but only loosely related to the proposition.

## Legal reasoning failures

- **False certainty**: answer states a conclusion as settled when key facts or sources are missing.
- **Missed gating issue**: answer overlooks a licensing, approval, notification or filing condition.
- **Wrong legal classification**: answer misclassifies a product, asset, role, customer type or service.
- **No jurisdiction discipline**: answer mixes EU, national, US or other law without separating regimes.

## Workflow failures

- **Missed escalation**: answer should trigger human legal review but does not.
- **Unsafe automation**: workflow presents a first-pass output as final advice.
- **Poor issue spotting**: answer fails to identify the material risk even if the conclusion is plausible.
- **No next action**: answer does not say what evidence, document or decision is needed next.

## Confidentiality and governance failures

- **Confidential input leak**: benchmark or workflow uses client, privileged, employee, personal or production data.
- **No data boundary**: answer ignores whether an external AI system may process the data.
- **No auditability**: answer does not preserve facts, assumptions, sources and reviewer decision points.
- **No human owner**: answer does not identify who must approve or own the next step.
