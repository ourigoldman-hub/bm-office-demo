import {FORM_DEFINITIONS} from '../contracts/forms.mjs';
const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function buildPrintableReport({projectName, lotId, records}) {
  const byType = new Map(records.map(record => [record.type, record]));
  const sections = FORM_DEFINITIONS.map(form => {
    const rec = byType.get(form.id);
    const rows = form.fields.map(([key,label]) => `<tr><th>${escape(label)}</th><td>${escape(rec?.fields?.[key] || 'Non renseigné').replaceAll('\n','<br>')}</td></tr>`).join('');
    const evidence = (rec?.attachments || []).map(f => `<li>${escape(f.name)}${f.mime.startsWith('image/') ? `<div><img src="${escape(f.dataUrl)}" alt="Image jointe" /></div>` : ' (pièce jointe ; contenu non intégré à l’impression)'}</li>`).join('');
    return `<section><h2>${escape(form.title)}</h2><table>${rows}</table>${evidence?`<h3>Justificatifs et pièces jointes</h3><ul>${evidence}</ul>`:''}</section>`;
  }).join('');
  return `<!doctype html><html lang="fr" dir="ltr"><head><meta charset="utf-8"><title>BM OFFICE — Rapport de brouillon</title><style>
  body{font:14px/1.6 Arial,sans-serif;color:#172334;margin:28px}h1{font-size:21px}h2{font-size:16px;margin-top:26px;border-bottom:1px solid #aaa}h3{font-size:13px}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{border:1px solid #bbb;padding:7px;vertical-align:top;overflow-wrap:anywhere}th{width:32%;background:#f3f5f7;text-align:start}img{max-width:240px;max-height:160px;object-fit:contain}.warning{border:2px solid #9b5c00;padding:10px;background:#fff5e1}section{break-inside:avoid}.actions{margin:15px 0}@media print{.actions{display:none}body{margin:12mm}}
  </style></head><body><h1>BM OFFICE — Rapport de contrôle (brouillon)</h1>
  <div class="warning"><strong>Non validé · Non approuvé · Aucune décision de conformité.</strong><div>Aucun calcul scientifique qualifié ni visa du responsable n’est disponible dans ce prototype.</div></div>
  <p><strong>Projet :</strong> ${escape(projectName)}<br><strong>Lot d’enrobé :</strong> ${escape(lotId)}</p>
  <p><strong>État de synchronisation :</strong> À vérifier dans les enregistrements sources. Ce rapport est produit uniquement à partir des données de cet appareil.</p>
  ${sections}<h2>Calculs, règles, écarts et visa du responsable</h2><p>Non implémentés ou non qualifiés ; aucune décision de conformité.</p>
  <p><strong>Visa du responsable :</strong> Indisponible dans cette version.</p>
  <div class="actions"><button onclick="window.print()">Imprimer / enregistrer en PDF</button></div>
  </body></html>`;
}
