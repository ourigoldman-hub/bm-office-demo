/**
 * Transcription of the five initial BM OFFICE forms from Eusèbe MUGANGU's
 * 2026-11-08 instruction note (provided by the client in Hebrew).
 * No professional thresholds, methods, or formulas are supplied here.
 */
export const FORM_DEFINITIONS = Object.freeze([
  {
    id: 'support', title: 'קבלת שכבת התשתית',
    fields: [
      ['location', 'מיקום'], ['condition', 'מצב שכבת התשתית'],
      ['cleanliness', 'ניקיון'], ['moisture', 'רטיבות'],
      ['defects', 'ליקויים שנצפו'], ['photos', 'תמונות (בתור קבצים מצורפים)'],
      ['preliminaryDecision', 'החלטה מקדימה'],
    ],
  },
  {
    id: 'tack', title: 'שכבת הדבקה',
    fields: [
      ['product', 'מוצר'], ['batch', 'מנה'], ['dosage', 'מינון (עם יחידות)'],
      ['area', 'שטח שטופל (עם יחידות)'], ['curing', 'מצב השבירה או האשפרה'],
      ['observations', 'הערות'], ['evidence', 'אסמכתאות (בתור קבצים מצורפים)'],
    ],
  },
  {
    id: 'trucks', title: 'קבלת המשאיות',
    fields: [
      ['deliveryNote', 'תעודת משלוח'], ['approvedFormula', 'הרכב מאושר'],
      ['tonnage', 'משקל בטונות'], ['times', 'שעות'],
      ['temperatures', 'טמפרטורות (עם יחידות)'], ['observations', 'הערות בעת הקבלה'],
    ],
  },
  {
    id: 'laying', title: 'פריסה והידוק',
    fields: [
      ['layer', 'שכבה'], ['thickness', 'עובי (עם יחידות)'],
      ['conditions', 'תנאי ביצוע'], ['temperatures', 'טמפרטורות (עם יחידות)'],
      ['means', 'אמצעים שבהם נעשה שימוש'], ['passes', 'מעברים'],
      ['incidents', 'אירועים חריגים'],
    ],
  },
  {
    id: 'sampling', title: 'דגימות ובקרת מנת האספלט',
    fields: [
      ['samplingPlan', 'תוכנית דגימה'], ['sampleIds', 'מזהי הדגימות'],
      ['laboratoryResults', 'תוצאות מעבדה'], ['deviations', 'חריגות'],
      ['correctiveActions', 'פעולות מתקנות'],
    ],
  },
]);
export const FORM_BY_ID = Object.freeze(Object.fromEntries(FORM_DEFINITIONS.map(f => [f.id, f])));
export const CONTRACT_VERSION = 'bm-office-note-2026-11-08/form-v1';
export function recordId(projectName, lotId, type) {
  if (typeof projectName !== 'string' || !projectName.trim() || typeof lotId !== 'string' || !lotId.trim() || !FORM_BY_ID[type]) {
    throw new Error('חסרים זיהוי פרויקט, מנת אספלט או סוג טופס');
  }
  return [projectName.trim(), lotId.trim(), type].map(encodeURIComponent).join('::');
}
