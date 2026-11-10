import {FORM_DEFINITIONS} from '../contracts/forms.mjs';
const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function buildPrintableReport({projectName, lotId, records}) {
  const byType = new Map(records.map(record => [record.type, record]));
  const sections = FORM_DEFINITIONS.map(form => {
    const rec = byType.get(form.id);
    const rows = form.fields.map(([key,label]) => `<tr><th>${escape(label)}</th><td>${escape(rec?.fields?.[key] || 'לא הוזן').replaceAll('\n','<br>')}</td></tr>`).join('');
    const evidence = (rec?.attachments || []).map(f => `<li>${escape(f.name)}${f.mime.startsWith('image/') ? `<div><img src="${escape(f.dataUrl)}" alt="תמונה מצורפת" /></div>` : ' (קובץ מצורף; התוכן אינו משובץ בהדפסה)'}</li>`).join('');
    return `<section><h2>${escape(form.title)}</h2><table>${rows}</table>${evidence?`<h3>ראיות וקבצים מצורפים</h3><ul>${evidence}</ul>`:''}</section>`;
  }).join('');
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>BM OFFICE — דוח טיוטה</title><style>
  body{font:14px/1.6 Arial,sans-serif;color:#172334;margin:28px}h1{font-size:21px}h2{font-size:16px;margin-top:26px;border-bottom:1px solid #aaa}h3{font-size:13px}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{border:1px solid #bbb;padding:7px;vertical-align:top;overflow-wrap:anywhere}th{width:32%;background:#f3f5f7;text-align:right}img{max-width:240px;max-height:160px;object-fit:contain}.warning{border:2px solid #9b5c00;padding:10px;background:#fff5e1}section{break-inside:avoid}.actions{margin:15px 0}@media print{.actions{display:none}body{margin:12mm}}
  </style></head><body><h1>BM OFFICE — דוח בקרה (טיוטה)</h1>
  <div class="warning"><strong>לא מאומת · לא מאושר · לא מהווה קביעת התאמה.</strong><div>אין ליבה מדעית מאומתת או אישור אחראי בגרסת יסוד זו.</div></div>
  <p><strong>פרויקט:</strong> ${escape(projectName)}<br><strong>מנת אספלט:</strong> ${escape(lotId)}</p>
  <p><strong>מצב סנכרון:</strong> יש לבדוק ברשומות המקור. דוח זה מופק מנתוני המכשיר בלבד.</p>
  ${sections}<h2>תוצאות חישוב, כללים, חריגות ואישור אחראי</h2><p>טרם הוטמעו או אומתו; אין החלטת התאמה.</p>
  <p><strong>אישור אחראי:</strong> לא ניתן בגרסה זו.</p>
  <div class="actions"><button onclick="window.print()">הדפסה / שמירה ל־PDF</button></div>
  </body></html>`;
}
