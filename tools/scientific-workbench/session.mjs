import {evaluateCandidate, CANDIDATE_ENGINE_VERSION} from '../../packages/scientific/candidate.mjs';
import {formatDecimal, PRESENTATION_VERSION} from '../../packages/scientific/presentation.mjs';

const freeze = value => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const copy = value => freeze(structuredClone(value));

/** Outer review adapter only. No persistence, approval or production call. */
export function createReviewSession({now = () => new Date().toISOString()} = {}) {
  const entries = [];
  return Object.freeze({
    run(kind, rawText) {
      if (!['calculation', 'presentation'].includes(kind)) throw new TypeError('Unknown review kind');
      if (typeof rawText !== 'string') throw new TypeError('Raw input text required');
      let request = null; let result;
      try { request = JSON.parse(rawText); }
      catch { result = {status: 'invalid_json_text', outputs: null, conformity: null,
        issue: {code: 'invalid_json_text'}}; }
      if (!result) result = kind === 'calculation' ? evaluateCandidate(request) : formatDecimal(request);
      const entry = {sequence: entries.length + 1, recordedAt: now(), kind, rawText, request,
        result, reviewerComment: ''};
      entries.push(entry);
      return copy(entry);
    },
    comment(sequence, text) {
      const entry = entries.find(item => item.sequence === sequence);
      if (!entry || typeof text !== 'string') throw new TypeError('Existing entry and text required');
      entry.reviewerComment = text;
      return copy(entry);
    },
    snapshot() {
      return copy({schemaVersion: 'bm-office-technical-review-1',
        recordType: 'technical_review_session_not_independent_scientific_evidence',
        engineVersion: CANDIDATE_ENGINE_VERSION, presentationVersion: PRESENTATION_VERSION,
        scientificQualification: 'pending', professionalActivationAllowed: false, entries});
    },
  });
}
