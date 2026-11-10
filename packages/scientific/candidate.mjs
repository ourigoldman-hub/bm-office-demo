/** Experimental S34 calculations for qualification, never a conformity decision.
 * No UI, storage, network, Node dependency, threshold or intermediate rounding.
 * The production boundary in core.mjs remains blocked pending qualification.
 */
export const CANDIDATE_ENGINE_VERSION = 's34-candidate-0.3';
const SOURCE = Object.freeze({
  document: 'BM_OFFICE_S34_OFFICIEL.pdf',
  sha256: '312a878ec69fc2f08d80fe492baa78c289e4d10ab9d63381be4a9dfb0951bd22',
});

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

// Reject non-JSON data instead of JSON.stringify silently changing NaN/undefined.
function snapshot(value, ancestors = new Set()) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object' || ancestors.has(value)) throw new Error('invalid_json');
  if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error('invalid_json');
  if (Object.getOwnPropertySymbols(value).length) throw new Error('invalid_json');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.entries(descriptors).some(([key, d]) => d.get || d.set ||
    (!d.enumerable && !(Array.isArray(value) && key === 'length')))) throw new Error('invalid_json');
  ancestors.add(value);
  let result;
  if (Array.isArray(value)) {
    if (Object.keys(value).some(key => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) throw new Error('invalid_json');
    result = [];
    for (let i = 0; i < value.length; i++) {
      // A sparse slot must not fall through to an inherited value or getter.
      if (!Object.hasOwn(descriptors, String(i))) throw new Error('invalid_json');
      result.push(snapshot(descriptors[i].value, ancestors));
    }
  } else {
    result = Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => [key, snapshot(descriptor.value, ancestors)]));
  }
  ancestors.delete(value);
  return result;
}

const definitions = [
  ['M01', [246, 247], ['E248'], 'grossDosage, residualFraction'],
  ['M03', [160, 358], ['E172'], 'binderMass, dryAggregateMass'],
  ['M04', [156, 157], ['E163', 'E164'], 'massContent'],
  ['M05', [358], ['E288', 'table128'], 'binderContent'],
  ['M06', [226, 380], ['E234', 'table141'], 'mass, waterFraction'],
  ['M07', [138, 354, 355], ['E160', 'table126'], 'fractions'],
  ['M08', [155], ['E161/unit-conversion'], 'density (unit conversion only)'],
  ['M09', [157, 406], ['E165', 'E330'], 'bulkDensity, maximumDensity, convention'],
  ['M10', [157, 406], ['E166', 'E331'], 'bulkRelativeDensity, aggregateBulkRelativeDensity, dryAggregateContent, convention'],
  ['M11', [157, 406], ['E165', 'E166', 'E167', 'E332'], 'bulkRelativeDensity, maximumRelativeDensity, aggregateBulkRelativeDensity, dryAggregateContent, convention'],
  ['M12', [483], ['E358', 'E359'], 'cores, population'],
];
const numericRevision2 = new Set(['M01', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M12']);
const registry = Object.fromEntries(definitions.map(([id, pages, relations, inputs]) => [id, freeze({
  id, version: `${id}-s34-candidate-${numericRevision2.has(id) ? 2 : 1}`, qualification: 'pending_independent_validation',
  source: {...SOURCE, pages, relations}, inputs,
})]));
freeze(registry);
export function listCandidateMethods() { return freeze(Object.values(registry)); }

class InvalidInput extends Error {
  constructor(path, code) { super(code); this.issue = {path, code}; }
}
const invalid = (path, code) => { throw new InvalidInput(path, code); };
// No arbitrary magnitude cutoff: only reject an observed loss to zero where
// the operation's nonnegative operands imply a strictly positive result.
function preservePositive(value, expectedPositive, path) {
  if (expectedPositive && value === 0) invalid(path, 'insufficient_numeric_precision');
  return value;
}
function object(value, path) {
  if (!value || Array.isArray(value) || typeof value !== 'object') invalid(path, 'object_required');
  return value;
}
function keys(value, allowed, path) {
  object(value, path);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) invalid(`${path}.${key}`, 'unknown_field');
}
function text(value, path) {
  if (typeof value !== 'string' || !value.trim()) invalid(path, 'nonempty_string_required');
  return value;
}
function quantity(value, units, path, {min = 0, max = Infinity, positive = false, bases} = {}) {
  keys(value, bases ? ['value', 'unit', 'basis'] : ['value', 'unit'], path);
  if (typeof value.value !== 'number' || !Number.isFinite(value.value)) invalid(`${path}.value`, 'finite_number_required');
  if (!units.includes(value.unit)) invalid(`${path}.unit`, 'unit_mismatch');
  if (value.value < min || value.value > max || (positive && value.value <= 0)) invalid(`${path}.value`, 'outside_mathematical_domain');
  if (bases && !bases.includes(value.basis)) invalid(`${path}.basis`, 'basis_required_or_mismatch');
  return value.value;
}
const out = (value, unit, basis) => basis ? {value, unit, basis} : {value, unit};
const densityUnits = ['kg/m³', 'g/cm³', 'Mg/m³', '1'];

// Exact sum of canonical decimal input representations. No assay tolerance and
// no normalization are inferred from floating-point addition of proportions.
function decimalSumIsOne(values) {
  const parts = values.map(value => {
    const [mantissa, exponent = '0'] = String(value).split('e');
    const decimals = (mantissa.split('.')[1] || '').length;
    return {coefficient: BigInt(mantissa.replace('.', '')), scale: decimals - Number(exponent)};
  });
  const scale = parts.reduce((maximum, part) => Math.max(maximum, part.scale), 0);
  const sum = parts.reduce((total, part) => total + part.coefficient * 10n ** BigInt(scale - part.scale), 0n);
  return sum === 10n ** BigInt(scale);
}

function aggregateFraction(content, path) {
  const value = quantity(content, ['1', '%'], path, {max: content?.unit === '%' ? 100 : 1});
  return content.unit === '%' ? value / 100 : value;
}
function volumetric(inputs, includeMaximum) {
  text(inputs.convention, 'inputs.convention'); // Declaration retained, not an assay-method approval.
  const bulk = quantity(inputs.bulkRelativeDensity, ['1'], 'inputs.bulkRelativeDensity', {positive: true});
  const aggregate = quantity(inputs.aggregateBulkRelativeDensity, ['1'], 'inputs.aggregateBulkRelativeDensity', {positive: true});
  const fraction = aggregateFraction(inputs.dryAggregateContent, 'inputs.dryAggregateContent');
  const vma = 100 * (1 - bulk * fraction / aggregate);
  const result = {vma: out(vma, '%')};
  if (includeMaximum) {
    const maximum = quantity(inputs.maximumRelativeDensity, ['1'], 'inputs.maximumRelativeDensity', {positive: true});
    const va = 100 * (1 - bulk / maximum);
    if (va < 0 || vma <= 0 || vma > 100 || va > vma) invalid('inputs', 'incoherent_volumetric_inputs');
    result.va = out(va, '%');
    result.vfa = out(100 * (vma - va) / vma, '%');
  } else if (vma < 0 || vma > 100) invalid('inputs', 'incoherent_volumetric_inputs');
  return result;
}

const operations = {
  M01(i) {
    keys(i, ['grossDosage', 'residualFraction'], 'inputs');
    const q = quantity(i.grossDosage, ['kg/m²'], 'inputs.grossDosage');
    const f = quantity(i.residualFraction, ['1'], 'inputs.residualFraction', {max: 1});
    return {residualDosage: out(preservePositive(q * f, q > 0 && f > 0, 'outputs.residualDosage'), 'kg/m²')};
  },
  M03(i) {
    keys(i, ['binderMass', 'dryAggregateMass'], 'inputs');
    const binder = quantity(i.binderMass, ['kg'], 'inputs.binderMass');
    const aggregate = quantity(i.dryAggregateMass, ['kg'], 'inputs.dryAggregateMass');
    const total = binder + aggregate;
    if (total === 0 || !Number.isFinite(total)) invalid('inputs', 'invalid_total_mass');
    return {binderContent: out(preservePositive(100 * (binder / total), binder > 0, 'outputs.binderContent'), '%', 'total_mixture')};
  },
  M04(i) {
    keys(i, ['massContent'], 'inputs');
    const value = aggregateFraction(i.massContent, 'inputs.massContent');
    preservePositive(value, i.massContent.value > 0, 'outputs.fraction');
    return {fraction: out(value, '1'), percent: out(value * 100, '%')};
  },
  M05(i) {
    keys(i, ['binderContent'], 'inputs');
    const p = quantity(i.binderContent, ['%'], 'inputs.binderContent', {bases: ['dry_aggregates', 'total_mixture']});
    if (i.binderContent.basis === 'dry_aggregates') {
      const converted = 100 * (p / (100 + p));
      if (converted >= 100) invalid('outputs', 'insufficient_numeric_precision');
      preservePositive(converted, p > 0, 'outputs.binderContent');
      return {binderContent: out(converted, '%', 'total_mixture')};
    }
    if (p >= 100) invalid('inputs.binderContent.value', 'outside_mathematical_domain');
    return {binderContent: out(preservePositive(100 * (p / (100 - p)), p > 0, 'outputs.binderContent'), '%', 'dry_aggregates')};
  },
  M06(i) {
    keys(i, ['mass', 'waterFraction'], 'inputs');
    const mass = quantity(i.mass, ['kg'], 'inputs.mass', {bases: ['wet', 'dry']});
    const w = quantity(i.waterFraction, ['1'], 'inputs.waterFraction', {bases: ['dry_mass']});
    const dry = i.mass.basis === 'wet' ? mass / (1 + w) : mass;
    const wet = i.mass.basis === 'dry' ? mass * (1 + w) : mass;
    preservePositive(dry, mass > 0, 'outputs.dryMass');
    preservePositive(wet, mass > 0, 'outputs.wetMass');
    return {dryMass: out(dry, 'kg'), wetMass: out(wet, 'kg')};
  },
  M07(i) {
    keys(i, ['fractions'], 'inputs');
    if (!Array.isArray(i.fractions) || !i.fractions.length) invalid('inputs.fractions', 'nonempty_array_required');
    const ids = new Set(); let sieves;
    const fractions = i.fractions.map((item, j) => {
      const path = `inputs.fractions[${j}]`;
      keys(item, ['id', 'proportion', 'passing'], path);
      const id = text(item.id, `${path}.id`);
      if (ids.has(id)) invalid(`${path}.id`, 'duplicate_id');
      ids.add(id);
      const x = quantity(item.proportion, ['1'], `${path}.proportion`, {max: 1, bases: ['dry_mass']});
      if (!Array.isArray(item.passing) || !item.passing.length) invalid(`${path}.passing`, 'nonempty_array_required');
      const openings = []; const passants = [];
      for (const [k, entry] of item.passing.entries()) {
        const ep = `${path}.passing[${k}]`;
        keys(entry, ['sieve', 'value', 'unit'], ep);
        openings.push(quantity(entry.sieve, ['mm'], `${ep}.sieve`, {positive: true}));
        passants.push(quantity({value: entry.value, unit: entry.unit}, ['%'], ep, {max: 100}));
        if (k && (openings[k] >= openings[k - 1] || passants[k] > passants[k - 1])) invalid(ep, 'incoherent_sieve_order');
      }
      if (sieves && (openings.length !== sieves.length || openings.some((s, k) => s !== sieves[k]))) invalid(`${path}.passing`, 'sieve_grid_mismatch');
      sieves = openings;
      return {x, passants};
    });
    if (!decimalSumIsOne(fractions.map(f => f.x))) invalid('inputs.fractions', 'dry_proportions_must_sum_to_one');
    return {passing: sieves.map((s, k) => ({sieve: out(s, 'mm'), ...out(fractions.reduce((total, f) => total +
      preservePositive(f.x * f.passants[k], f.x > 0 && f.passants[k] > 0, `outputs.passing[${k}]`), 0), '%')}))};
  },
  M08(i) {
    keys(i, ['density'], 'inputs');
    const d = quantity(i.density, densityUnits.filter(u => u !== '1'), 'inputs.density', {positive: true});
    const kg = i.density.unit === 'kg/m³' ? d : d * 1000;
    const smallUnit = preservePositive(kg / 1000, true, 'outputs.gramsPerCubicCentimetre');
    return {kgPerCubicMetre: out(kg, 'kg/m³'), gramsPerCubicCentimetre: out(smallUnit, 'g/cm³'), megagramsPerCubicMetre: out(smallUnit, 'Mg/m³')};
  },
  M09(i) {
    keys(i, ['bulkDensity', 'maximumDensity', 'convention'], 'inputs');
    text(i.convention, 'inputs.convention');
    const bulk = quantity(i.bulkDensity, densityUnits, 'inputs.bulkDensity', {positive: true});
    const maximum = quantity(i.maximumDensity, densityUnits, 'inputs.maximumDensity', {positive: true});
    if (i.bulkDensity.unit !== i.maximumDensity.unit) invalid('inputs', 'unit_mismatch');
    if (bulk > maximum) invalid('inputs', 'incoherent_volumetric_inputs');
    return {va: out(100 * (1 - bulk / maximum), '%')};
  },
  M10(i) {
    keys(i, ['bulkRelativeDensity', 'aggregateBulkRelativeDensity', 'dryAggregateContent', 'convention'], 'inputs');
    return volumetric(i, false);
  },
  M11(i) {
    keys(i, ['bulkRelativeDensity', 'maximumRelativeDensity', 'aggregateBulkRelativeDensity', 'dryAggregateContent', 'convention'], 'inputs');
    // Recompute Va/VMA from source inputs: never consume rounded displays.
    return volumetric(i, true);
  },
  M12(i) {
    keys(i, ['cores', 'population'], 'inputs'); text(i.population, 'inputs.population');
    if (!Array.isArray(i.cores) || !i.cores.length) invalid('inputs.cores', 'nonempty_array_required');
    const ids = new Set();
    const values = i.cores.map((core, index) => {
      const path = `inputs.cores[${index}]`;
      keys(core, ['id', 'voids'], path);
      const id = text(core.id, `${path}.id`);
      if (ids.has(id)) invalid(`${path}.id`, 'duplicate_id');
      ids.add(id);
      return quantity(core.voids, ['%'], `${path}.voids`, {max: 100});
    });
    const mean = preservePositive(values.reduce((sum, x) => sum + x, 0) / values.length,
      values.some(value => value > 0), 'outputs.meanVoids');
    return {meanVoids: out(mean, '%'), count: out(values.length, '1')};
  },
};

function finiteOutputs(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  return !value || typeof value !== 'object' || Object.values(value).every(finiteOutputs);
}

export function evaluateCandidate(request) {
  let saved;
  const base = {engineVersion: CANDIDATE_ENGINE_VERSION, qualification: 'pending_independent_validation', conformity: null};
  try { saved = snapshot(request); }
  catch { return freeze({...base, status: 'invalid_input', outputs: null, request: null, issues: [{path: 'request', code: 'json_data_required'}]}); }
  let method;
  try {
    keys(saved, ['methodId', 'methodVersion', 'inputs', 'context'], 'request');
    text(saved.methodId, 'request.methodId');
    if (!Object.hasOwn(registry, saved.methodId)) return freeze({...base, status: 'blocked_unknown_method', request: saved, outputs: null, issues: []});
    method = registry[saved.methodId];
    if (saved.methodVersion !== method.version) return freeze({...base, method, status: 'blocked_method_version', request: saved, outputs: null, issues: []});
    const outputs = operations[method.id](saved.inputs);
    if (!finiteOutputs(outputs)) invalid('outputs', 'nonfinite_result');
    return freeze({...base, method, status: 'candidate_unverified', request: saved, outputs, issues: []});
  } catch (error) {
    if (!(error instanceof InvalidInput)) throw error;
    return freeze({...base, ...(method ? {method} : {}), status: 'invalid_input', request: saved, outputs: null, issues: [error.issue]});
  }
}
