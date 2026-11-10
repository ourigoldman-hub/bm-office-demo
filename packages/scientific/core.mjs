/**
 * Portable scientific computation boundary. It intentionally does not contain
 * any scientific formula, threshold, acceptance rule or unvalidated example.
 * A calculation is BLOCKED unless a client-approved method implementation is
 * explicitly registered and independently validated in a later stage.
 */
export const SCIENTIFIC_ENGINE_VERSION = 'foundation-0.1-no-methods';
export function calculate(request) {
  return Object.freeze({
    status: 'blocked_not_configured',
    methodId: typeof request?.methodId === 'string' ? request.methodId : null,
    value: null,
    conformity: null,
    message: 'לא הוגדרה שיטת חישוב מאומתת ממקורות BM OFFICE. אין לחשב או לקבוע התאמה.',
    engineVersion: SCIENTIFIC_ENGINE_VERSION,
  });
}
