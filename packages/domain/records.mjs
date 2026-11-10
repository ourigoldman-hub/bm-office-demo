import {FORM_BY_ID, CONTRACT_VERSION, recordId} from '../contracts/forms.mjs';

export const RECORD_STATE = 'draft_unverified';

export function makeDraft({projectName, lotId, type, fields = {}, attachments = [], createdAt, updatedAt}) {
  const id = recordId(projectName, lotId, type);
  const definition = FORM_BY_ID[type];
  const cleaned = {};
  for (const [key] of definition.fields) {
    cleaned[key] = typeof fields[key] === 'string' ? fields[key] : '';
  }
  const now = new Date().toISOString();
  return {
    id, projectName: projectName.trim(), lotId: lotId.trim(), type,
    fields: cleaned,
    attachments: attachments.map(copyAttachment),
    state: RECORD_STATE,
    contractVersion: CONTRACT_VERSION,
    createdAt: createdAt || now, updatedAt: updatedAt || now,
  };
}

function copyAttachment(item) {
  if (!item || typeof item.name !== 'string' || typeof item.mime !== 'string' || typeof item.dataUrl !== 'string') {
    throw new Error('מבנה קובץ מצורף לא תקין');
  }
  if (item.name.length > 180 || item.dataUrl.length > 2_800_000 || !/^data:(image\/(png|jpeg|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(item.dataUrl)) {
    throw new Error('קובץ מצורף אינו נתמך או גדול מדי');
  }
  return {name:item.name, mime:item.mime, dataUrl:item.dataUrl};
}

export function validateRecord(record) {
  if (!record || typeof record !== 'object') throw new Error('רשומה חסרה');
  const rebuilt = makeDraft(record);
  if (record.id !== rebuilt.id || record.state !== RECORD_STATE || record.contractVersion !== CONTRACT_VERSION) {
    throw new Error('מזהה, גרסה או מצב רשומה אינם תואמים');
  }
  if (record.projectName.length > 160 || record.lotId.length > 160) throw new Error('זיהוי ארוך מדי');
  if (record.attachments.length > 10) throw new Error('יותר מדי קבצים מצורפים');
  for (const value of Object.values(rebuilt.fields)) if (value.length > 5000) throw new Error('שדה ארוך מדי');
  if (!Number.isFinite(Date.parse(record.createdAt)) || !Number.isFinite(Date.parse(record.updatedAt))) throw new Error('תאריך לא תקין');
  return rebuilt;
}

export function availableEvidence(record) {
  const def = FORM_BY_ID[record.type];
  return def.fields.filter(([key]) => String(record.fields[key] || '').trim()).map(([key, label]) => ({key,label}));
}
