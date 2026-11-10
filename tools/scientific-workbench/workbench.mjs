import {createReviewSession} from './session.mjs';
const get = id => document.getElementById(id);
const session = createReviewSession();
let examples = []; let selectedSequence = null; let currentKind = 'calculation';
const labels = {candidate_unverified: 'Résultat candidat — revue scientifique en attente',
  presentation_candidate: 'Présentation candidate — politique à examiner', invalid_json_text: 'Texte JSON invalide',
  invalid_input: 'Entrée rejetée — consulter le diagnostic', invalid_presentation: 'Présentation rejetée',
  blocked_method_version: 'Version de méthode bloquée', blocked_unknown_method: 'Méthode bloquée'};
const quantities = {residualDosage: 'Dosage résiduel', binderContent: 'Teneur en liant', fraction: 'Fraction',
  percent: 'Pourcentage', dryMass: 'Masse sèche', wetMass: 'Masse humide', kgPerCubicMetre: 'Masse volumique',
  gramsPerCubicCentimetre: 'Masse volumique', megagramsPerCubicMetre: 'Masse volumique',
  va: 'Va', vma: 'VMA', vfa: 'VFA', meanVoids: 'Moyenne des vides', count: 'Effectif'};
function summarize(result) {
  if (result.outputs) {
    const lines = [];
    for (const [key, quantity] of Object.entries(result.outputs)) {
      if (key === 'passing') {
        for (const row of quantity) lines.push(`Tamis ${String(row.sieve.value).replace('.', ',')} mm : ${String(row.value).replace('.', ',')} %`);
      } else lines.push(`${quantities[key] || key} : ${String(quantity.value).replace('.', ',')} ${quantity.unit === '1' ? '(sans unité)' : quantity.unit}`);
    }
    return lines.join('\n');
  }
  if (result.display !== undefined && result.display !== null) return result.display;
  return (result.issues || [result.issue]).filter(Boolean).map(issue => `${issue.path || 'request'} : ${issue.code}`).join('\n') || result.status;
}

function show(entry) {
  selectedSequence = entry.sequence;
  currentKind = entry.kind;
  get('request').value = entry.rawText;
  get('example').selectedIndex = examples.findIndex(example => example.kind === entry.kind &&
    JSON.stringify(example.request) === JSON.stringify(entry.request));
  get('source').textContent = `Essai ${entry.sequence} · ${entry.kind === 'calculation' ? 'Calcul candidat' : 'Présentation candidate'} · ${entry.request?.methodVersion || 'voir les métadonnées du résultat'}`;
  get('result-status').textContent = `Essai ${entry.sequence} · ${labels[entry.result.status] || entry.result.status}`;
  get('result').textContent = JSON.stringify(entry.result, null, 2);
  get('output-summary').textContent = summarize(entry.result);
  get('comment').disabled = false; get('comment').value = entry.reviewerComment;
}
function refreshHistory() {
  get('history').replaceChildren();
  for (const entry of session.snapshot().entries) {
    const li = document.createElement('li'); const button = document.createElement('button');
    button.textContent = `${entry.sequence} · ${entry.request?.methodId || (entry.kind === 'presentation' ? 'Présentation' : 'JSON')} · ${entry.result.status}`;
    button.addEventListener('click', () => show(session.snapshot().entries[entry.sequence - 1]));
    li.append(button); get('history').append(li);
  }
}
get('example').addEventListener('change', () => {
  const example = examples[get('example').selectedIndex];
  currentKind = example.kind;
  get('request').value = JSON.stringify(example.request, null, 2);
  get('source').textContent = example.sourceLabel;
});
get('run').addEventListener('click', () => {
  const entry = session.run(currentKind, get('request').value);
  show(entry); refreshHistory(); get('export').disabled = false;
  get('feedback').textContent = `${entry.sequence} essai(s) en mémoire.`;
});
get('comment').addEventListener('input', () => {
  if (selectedSequence !== null) session.comment(selectedSequence, get('comment').value);
});
get('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(session.snapshot(), null, 2) + '\n'], {type: 'application/json'});
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = `BM_OFFICE_essais_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  get('feedback').textContent = 'Export demandé. Vérifier le fichier téléchargé pour conserver la session.';
});
try {
  const response = await fetch(new URL('../../review/examples.json', import.meta.url));
  if (!response.ok) throw new Error('Exemples indisponibles');
  const data = await response.json();
  examples = [...data.cases.map(c => ({...c, kind: 'calculation', sourceLabel: `S34 p. ${c.source.pages.join(', ')} · ${c.request.methodVersion}`})),
    ...data.presentation.map(c => ({...c, kind: 'presentation', sourceLabel: 'S34 p. 8 · précision explicite de l’exemple'}))];
  get('example').replaceChildren(...examples.map(c => {const option = document.createElement('option'); option.textContent = c.id; option.value = c.id; return option;}));
  get('versions').textContent = `Moteur ${data.engineVersion} · Présentation ${data.presentationVersion}`;
  get('example').disabled = false; get('run').disabled = false;
  get('example').dispatchEvent(new Event('change'));
} catch (error) { get('result-status').textContent = error.message; }
