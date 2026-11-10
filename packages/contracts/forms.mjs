/**
 * Transcription of the five initial BM OFFICE forms from Eusèbe MUGANGU's
 * 2026-11-08 instruction note (provided by the client in Hebrew).
 * No professional thresholds, methods, or formulas are supplied here.
 */
export const FORM_DEFINITIONS = Object.freeze([
  {
    id: 'support', title: 'Réception du support',
    fields: [
      ['location', 'Localisation'], ['condition', 'État de la couche support'],
      ['cleanliness', 'Propreté'], ['moisture', 'Humidité'],
      ['defects', 'Défauts observés'], ['photos', 'Photos (pièces jointes)'],
      ['preliminaryDecision', 'Décision préliminaire'],
    ],
  },
  {
    id: 'tack', title: 'Couche d’accrochage',
    fields: [
      ['product', 'Produit'], ['batch', 'Lot de produit'], ['dosage', 'Dosage (avec unités)'],
      ['area', 'Surface traitée (avec unités)'], ['curing', 'État de rupture ou de cure'],
      ['observations', 'Observations'], ['evidence', 'Justificatifs (pièces jointes)'],
    ],
  },
  {
    id: 'trucks', title: 'Réception des camions',
    fields: [
      ['deliveryNote', 'Bon de livraison'], ['approvedFormula', 'Formule agréée'],
      ['tonnage', 'Tonnage'], ['times', 'Heures'],
      ['temperatures', 'Températures (avec unités)'], ['observations', 'Observations à la réception'],
    ],
  },
  {
    id: 'laying', title: 'Répandage et compactage',
    fields: [
      ['layer', 'Couche'], ['thickness', 'Épaisseur (avec unités)'],
      ['conditions', 'Conditions de mise en œuvre'], ['temperatures', 'Températures (avec unités)'],
      ['means', 'Moyens utilisés'], ['passes', 'Passes'],
      ['incidents', 'Incidents'],
    ],
  },
  {
    id: 'sampling', title: 'Échantillonnage et contrôle du lot',
    fields: [
      ['samplingPlan', 'Plan d’échantillonnage'], ['sampleIds', 'Identifiants des échantillons'],
      ['laboratoryResults', 'Résultats de laboratoire'], ['deviations', 'Écarts'],
      ['correctiveActions', 'Actions correctives'],
    ],
  },
]);
export const FORM_BY_ID = Object.freeze(Object.fromEntries(FORM_DEFINITIONS.map(f => [f.id, f])));
export const CONTRACT_VERSION = 'bm-office-note-2026-11-08/form-v1';
export function recordId(projectName, lotId, type) {
  if (typeof projectName !== 'string' || !projectName.trim() || typeof lotId !== 'string' || !lotId.trim() || !FORM_BY_ID[type]) {
    throw new Error('Identifiant du projet, lot d’enrobé ou type de fiche manquant');
  }
  return [projectName.trim(), lotId.trim(), type].map(encodeURIComponent).join('::');
}
