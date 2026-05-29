# AI Governance Evaluation Cases

## Case 1: Internal research agent

An internal agent can search documents and summarize findings, but cannot write to systems or contact customers.

Expected answer should classify risk as lower, while still requiring:

- source citations
- access controls
- logging
- user training
- review before reliance in legal or customer-facing contexts

## Case 2: Customer-facing support agent

A customer-facing agent can answer support questions and open support tickets.

Expected answer should identify:

- customer notice
- hallucination and incorrect instruction risk
- escalation to human support
- logging and monitoring
- data protection review
- contractual disclosure

## Case 3: Autonomous contracting agent

An agent can negotiate contract language and send proposed clauses to customers.

Expected answer should classify this as high risk and require:

- legal approval before external communication
- playbook constraints
- authority limits
- audit trail
- fallback language
- customer-facing disclosure where appropriate
