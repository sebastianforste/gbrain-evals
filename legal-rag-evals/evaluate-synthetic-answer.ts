type LegalEvalFixture = {
  id: string;
  domain: string;
  task_type: string;
  question: string;
  sources_required: string[];
  expected_findings: string[];
  must_escalate: boolean;
};

type LegalEvalScore = {
  questionId: string;
  retrievalRecall: number;
  citationAccuracy: number;
  legalCompleteness: number;
  uncertaintyHandling: number;
  escalationQuality: number;
  total: number;
  automaticFail: boolean;
  notes: string[];
};

const syntheticFixture: LegalEvalFixture = {
  id: 'micar-art-reserve-001',
  domain: 'MiCAR',
  task_type: 'whitepaper_first_pass_review',
  question:
    'Does this ART white paper disclose reserve composition and custody arrangements sufficiently for first-pass review?',
  sources_required: [
    'Regulation (EU) 2023/1114, Article 36',
    'Regulation (EU) 2023/1114, Annex II Part G',
  ],
  expected_findings: [
    'reserve composition requires review',
    'custody and segregation arrangements require review',
    'thin or generic disclosure should be escalated',
    'answer should not certify compliance',
  ],
  must_escalate: true,
};

const syntheticAnswer = {
  sourceIds: ['Regulation (EU) 2023/1114, Article 36', 'Regulation (EU) 2023/1114, Annex II Part G'],
  findings: [
    'reserve composition requires review',
    'custody and segregation arrangements require review',
    'thin or generic disclosure should be escalated',
  ],
  uncertainty: 'The draft language is generic and key facts are missing.',
  escalatesToHumanReviewer: true,
  certifiesCompliance: false,
};

function scorePresence(required: string[], actual: string[]) {
  const matched = required.filter((item) => actual.includes(item)).length;
  return required.length === 0 ? 2 : Math.round((matched / required.length) * 2);
}

function scoreSyntheticAnswer(fixture: LegalEvalFixture, answer: typeof syntheticAnswer): LegalEvalScore {
  const retrievalRecall = scorePresence(fixture.sources_required, answer.sourceIds);
  const citationAccuracy = retrievalRecall === 2 ? 2 : 1;
  const legalCompleteness = scorePresence(fixture.expected_findings.slice(0, 3), answer.findings);
  const uncertaintyHandling = answer.uncertainty.length > 0 && !answer.certifiesCompliance ? 2 : 0;
  const escalationQuality = fixture.must_escalate === answer.escalatesToHumanReviewer ? 2 : 0;

  const automaticFail =
    answer.certifiesCompliance || (fixture.must_escalate && !answer.escalatesToHumanReviewer);

  const notes = [
    `retrievalRecall=${retrievalRecall}/2`,
    `citationAccuracy=${citationAccuracy}/2`,
    `legalCompleteness=${legalCompleteness}/2`,
    `uncertaintyHandling=${uncertaintyHandling}/2`,
    `escalationQuality=${escalationQuality}/2`,
  ];

  const total = retrievalRecall + citationAccuracy + legalCompleteness + uncertaintyHandling + escalationQuality;

  return {
    questionId: fixture.id,
    retrievalRecall,
    citationAccuracy,
    legalCompleteness,
    uncertaintyHandling,
    escalationQuality,
    total,
    automaticFail,
    notes,
  };
}

console.log(JSON.stringify(scoreSyntheticAnswer(syntheticFixture, syntheticAnswer), null, 2));
