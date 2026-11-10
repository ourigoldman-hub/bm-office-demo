/** S34 p.8 candidate presentation only. Never rounds a calculation in place,
 * adopts a project's policy, compares thresholds or returns a conformity.
 */
export const PRESENTATION_VERSION = 's34-p8-half-even-candidate-2';
export const PRESENTATION_LIMITS = Object.freeze({inputCharacters: 4096, exponentMagnitude: 1000, precisionDigits: 1000});
const source = Object.freeze({document: 'BM_OFFICE_S34_OFFICIEL.pdf', page: 8,
  sha256: '312a878ec69fc2f08d80fe492baa78c289e4d10ab9d63381be4a9dfb0951bd22'});
class PresentationError extends Error {
  constructor(path, code) { super(code); this.issue = Object.freeze({path, code}); }
}
const bad = (path, code) => { throw new PresentationError(path, code); };
const power10 = exponent => 10n ** BigInt(exponent);

function parse(decimal) {
  if (typeof decimal !== 'string') bad('decimal', 'decimal_string_required');
  if (decimal.length > PRESENTATION_LIMITS.inputCharacters) bad('decimal', 'technical_resource_limit');
  const match = /^([+-]?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(decimal);
  if (!match) bad('decimal', 'canonical_decimal_required');
  const exponent = Number(match[4] || '0');
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > PRESENTATION_LIMITS.exponentMagnitude) bad('decimal', 'technical_resource_limit');
  const fraction = match[3] || '';
  return {negative: match[1] === '-', coefficient: BigInt(match[2] + fraction), scale: fraction.length - exponent};
}

function quantize(coefficient, scale, targetScale) {
  const shift = scale - targetScale;
  if (shift <= 0) return coefficient * power10(-shift);
  const divisor = power10(shift);
  const integer = coefficient / divisor;
  const twiceRemainder = 2n * (coefficient % divisor);
  return integer + (twiceRemainder > divisor || (twiceRemainder === divisor && integer % 2n === 1n) ? 1n : 0n);
}

function decimalText(coefficient, scale, negative) {
  let text = coefficient.toString();
  if (scale > 0) {
    text = text.padStart(scale + 1, '0');
    text = text.slice(0, -scale) + '.' + text.slice(-scale);
  } else if (scale < 0) text += '0'.repeat(-scale);
  return (negative ? '-' : '') + text;
}

export function formatDecimal(request) {
  let originalDecimal = null;
  const base = {ruleVersion: PRESENTATION_VERSION, source, conformity: null,
    qualification: 'presentation_policy_not_adopted'};
  try {
    if (!request || Array.isArray(request) || typeof request !== 'object' ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(request))) bad('request', 'object_required');
    if (Object.getOwnPropertySymbols(request).length ||
      Object.values(Object.getOwnPropertyDescriptors(request)).some(d => d.get || d.set || !d.enumerable)) bad('request', 'data_properties_required');
    for (const key of Object.keys(request)) {
      if (!['decimal', 'decimalPlaces', 'significantDigits'].includes(key)) bad(key, 'unknown_field');
    }
    if (typeof request.decimal === 'string') originalDecimal = request.decimal;
    const parts = parse(request.decimal);
    const hasPlaces = Object.hasOwn(request, 'decimalPlaces');
    const hasSignificant = Object.hasOwn(request, 'significantDigits');
    if (hasPlaces === hasSignificant) bad('precision', 'choose_one_precision');
    const kind = hasPlaces ? 'decimalPlaces' : 'significantDigits';
    const digits = request[kind];
    if (!Number.isInteger(digits) || digits < (hasPlaces ? 0 : 1) || digits > PRESENTATION_LIMITS.precisionDigits) bad(kind, 'invalid_precision');
    const order = parts.coefficient === 0n ? 0 : parts.coefficient.toString().length - 1 - parts.scale;
    let targetScale = hasPlaces ? digits : digits - 1 - order;
    let rounded = quantize(parts.coefficient, parts.scale, targetScale);
    // Carry, e.g. 9.995 -> 10.0 at three significant digits, without rounding twice.
    if (hasSignificant && rounded !== 0n && rounded.toString().length > digits) {
      rounded /= 10n;
      targetScale--;
    }
    const changed = targetScale < parts.scale && parts.coefficient !== rounded * power10(parts.scale - targetScale);
    const roundedDecimal = decimalText(rounded, targetScale, parts.negative);
    const displayValue = roundedDecimal.replace('.', ',');
    return Object.freeze({...base, status: 'presentation_candidate', originalDecimal, roundedDecimal,
      displayValue, display: (changed ? '≃ ' : '') + displayValue, isApproximation: changed,
      precision: Object.freeze({kind, digits}), rounding: 'nearest_ties_to_even'});
  } catch (error) {
    if (!(error instanceof PresentationError)) throw error;
    return Object.freeze({...base, status: 'invalid_presentation', originalDecimal,
      display: null, displayValue: null, roundedDecimal: null, issue: error.issue});
  }
}
