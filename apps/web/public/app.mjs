import {FORM_DEFINITIONS, FORM_BY_ID, recordId} from '../../../packages/contracts/forms.mjs';
import {makeDraft} from '../../../packages/domain/records.mjs';
import {buildPrintableReport} from '../../../packages/report/print.mjs';
import {calculate} from '../../../packages/scientific/core.mjs';
import {runtime, apiUrl} from './runtime.mjs';

const $=id=>document.getElementById(id);
const project=$('project-name'),lot=$('lot-id');
const state={active:'support',attachmentFiles:[],current:null};
const DB=runtime.storageName;
const STORE='drafts';
let dbPromise;
function db(){
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>req.result.createObjectStore(STORE,{keyPath:'id'});
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  return dbPromise;
}
async function localGet(id){const database=await db();return new Promise((resolve,reject)=>{
  const tx=database.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(id);
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});}
async function localPut(value){const database=await db();return new Promise((resolve,reject)=>{
  const tx=database.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
});}
async function localAll(){const database=await db();return new Promise((resolve,reject)=>{
  const tx=database.transaction(STORE,'readonly');const req=tx.objectStore(STORE).getAll();
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});}
function message(value){$('status').textContent=value;}
function context(){return {projectName:project.value.trim(),lotId:lot.value.trim()};}
function requireContext(){
  const {projectName,lotId}=context();if(!projectName||!lotId)throw new Error('יש להזין שם פרויקט ומזהה מנת אספלט.');
  return {projectName,lotId};
}
function setConnection(){
  $('online-state').textContent=navigator.onLine?'הדפדפן מדווח: מחובר':'ללא רשת · שמירה מקומית';
}
function renderTabs(){
  const tabs=$('tabs');tabs.replaceChildren();
  FORM_DEFINITIONS.forEach(form=>{
    const b=document.createElement('button');b.type='button';b.role='tab';b.textContent=form.title;
    b.className=state.active===form.id?'active':'';b.setAttribute('aria-selected',String(state.active===form.id));
    b.addEventListener('click',()=>{state.active=form.id;renderTabs();loadCurrent().catch(handleError)});tabs.append(b);
  });
}
function renderFields(record){
  $('fields').replaceChildren();
  for(const [key,label] of FORM_BY_ID[state.active].fields){
    const wrap=document.createElement('label');wrap.textContent=label;
    const input=document.createElement('textarea');input.rows=2;input.maxLength=5000;input.dataset.field=key;
    input.value=record?.fields?.[key]||'';wrap.append(input);$('fields').append(wrap);
  }
  state.attachmentFiles=record?.attachments||[];
  $('evidence').value='';updateAttachments();
}
function updateAttachments(){
  $('attachment-summary').textContent=state.attachmentFiles.length?
    `נשמרו ${state.attachmentFiles.length} קבצים מצורפים בטיוטה הנוכחית.`:'אין קבצים מצורפים לטופס הפעיל.';
}
async function loadCurrent(){
  const {projectName,lotId}=context();let envelope;
  if(projectName&&lotId) envelope=await localGet(recordId(projectName,lotId,state.active));
  state.current=envelope||null;renderFields(envelope?.record);
  message(!projectName||!lotId?'יש להזין פרויקט ומנה לפני שמירה.':!envelope?'טרם נשמר טופס זה במכשיר.':
    `${envelope.dirty?'שינויים מקומיים טרם סונכרנו.':'הטופס סונכרן.'}${envelope.conflict?' התנגשות: נדרשת הכרעה אנושית.':''}`);
}
function readFileAsDataURL(file){return new Promise((resolve,reject)=>{
  const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);
});}
$('evidence').addEventListener('change',async e=>{
  try {
    for(const file of e.target.files){
      if(file.size>1_500_000)throw new Error('כל קובץ מוגבל בגרסת יסוד זו ל־1.5 MB.');
      if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type))throw new Error('סוג הקובץ אינו נתמך.');
      if(state.attachmentFiles.length>=10)throw new Error('עד 10 קבצים לטופס.');
      state.attachmentFiles.push({name:file.name,mime:file.type,dataUrl:await readFileAsDataURL(file)});
    }
    updateAttachments();message('קבצים נוספו לטופס. יש לשמור את הטיוטה כדי לשמרם.');
  }catch(error){handleError(error)}finally{e.target.value=''}
});
$('clear-files').addEventListener('click',()=>{state.attachmentFiles=[];updateAttachments();message('הקבצים הוסרו מהטופס הפעיל; יש לשמור כדי לעדכן את הטיוטה.');});
$('draft-form').addEventListener('submit',async e=>{
  e.preventDefault();try{
    const {projectName,lotId}=requireContext();
    const fields=Object.fromEntries([...document.querySelectorAll('[data-field]')].map(el=>[el.dataset.field,el.value]));
    const existing=await localGet(recordId(projectName,lotId,state.active));
    const record=makeDraft({projectName,lotId,type:state.active,fields,attachments:state.attachmentFiles,
      createdAt:existing?.record.createdAt});
    const envelope={id:record.id,record,baseRevision:existing?.baseRevision||0,dirty:true,conflict:existing?.conflict||false,changeSequence:(existing?.changeSequence||0)+1};
    await localPut(envelope);state.current=envelope;
    message('הטיוטה נשמרה במכשיר. לא בוצע חישוב מדעי ולא נקבעה התאמה.');
  }catch(error){handleError(error)}
});
async function syncAll(){
  if(!runtime.syncEnabled){message('הדגמה: הנתונים נשמרים במכשיר בלבד. סנכרון שרת אינו מופעל.');return;}
  const {projectName,lotId}=requireContext();
  const envs=(await localAll()).filter(e=>e.record.projectName===projectName&&e.record.lotId===lotId);
  let sent=0,conflicts=0;
  for(const env of envs){
    if(!env.dirty)continue;
    if(env.conflict){conflicts++;continue;}
    const response=await fetch(apiUrl('records'),{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({record:env.record,expectedRevision:env.baseRevision})});
    if(response.status===409){env.conflict=true;await localPut(env);conflicts++;continue;}
    if(!response.ok)throw new Error('לא ניתן לסנכרן: '+(await response.text()).slice(0,200));
    const result=await response.json();
    const latest=await localGet(env.id);
    if(latest){
      latest.baseRevision=result.revision;
      if((latest.changeSequence||0)===(env.changeSequence||0)) latest.dirty=false;
      await localPut(latest);
    }
    sent++;
  }
  const response=await fetch(apiUrl('records')+'?'+new URLSearchParams({projectName,lotId}));
  if(!response.ok)throw new Error('לא ניתן לקרוא את הנתונים מהשרת.');
  let received=0;
  for(const item of (await response.json()).records){
    const local=await localGet(item.record.id);
    if(!local){await localPut({id:item.record.id,record:item.record,baseRevision:item.revision,dirty:false,conflict:false,changeSequence:0});received++;}
    else if(!local.dirty&&item.revision>local.baseRevision){await localPut({id:item.record.id,record:item.record,baseRevision:item.revision,dirty:false,conflict:false,changeSequence:0});received++;}
    else if(local.dirty&&item.revision>local.baseRevision&&!local.conflict){local.conflict=true;await localPut(local);conflicts++;}
  }
  await loadCurrent();
  message(`סנכרון: ${sent} טפסים נשלחו, ${received} התקבלו, ${conflicts} התנגשויות. ${conflicts?'יש לבדוק התנגשויות לפני המשך סנכרון.':''}`);
}
$('sync').addEventListener('click',()=>syncAll().catch(handleError));
async function recordsForContext(){
  const {projectName,lotId}=requireContext();
  const envelopes=(await localAll()).filter(e=>e.record.projectName===projectName&&e.record.lotId===lotId);
  return {...context(),envelopes,records:envelopes.map(e=>e.record)};
}
$('report').addEventListener('click',async()=>{
  const win=window.open('','_blank'); // synchronous user gesture; avoids popup blocker
  try{
    const context=await recordsForContext();if(!win)throw new Error('חלון ההדפסה נחסם בדפדפן.');
    win.document.open();win.document.write(buildPrintableReport(context));win.document.close();
    message('נפתח דוח טיוטה. השתמש בלחצן ההדפסה בחלון הדוח כדי לשמור כ־PDF במכשיר התומך בכך.');
  }catch(error){win?.close();handleError(error)}
});
$('export').addEventListener('click',async()=>{
  try{
    const context=await recordsForContext();const text=JSON.stringify({notice:'unverified_draft',data:context.envelopes},null,2);
    const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='bm-office-drafts.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    message('קובץ JSON נוצר מנתוני המכשיר. יש לשמור אותו במקום מוגן.');
  }catch(error){handleError(error)}
});
function handleError(error){message('שגיאה: '+(error?.message||String(error)));}
window.addEventListener('online',setConnection);window.addEventListener('offline',setConnection);
project.value=localStorage.getItem('bm-project')||'';lot.value=localStorage.getItem('bm-lot')||'';
for(const [el,key] of [[project,'bm-project'],[lot,'bm-lot']])el.addEventListener('change',()=>{localStorage.setItem(key,el.value);loadCurrent().catch(handleError)});
const scientificState=calculate({methodId:'not-yet-defined'});
if(scientificState.status!=='blocked_not_configured')throw new Error('Scientific core must fail closed.');
setConnection();renderTabs();loadCurrent().catch(handleError);
if(!runtime.syncEnabled){$('sync').disabled=true;$('sync').textContent='הדגמה · ללא סנכרון שרת';}
if(runtime.mode==='demo'){
  const note=document.createElement('p');note.lang='fr';note.dir='ltr';note.className='notice';
  note.textContent='Démonstration : brouillons conservés dans ce navigateur uniquement. Aucun partage ni synchronisation serveur. Utiliser des données fictives.';
  document.querySelector('main').prepend(note);
}
if(runtime.serviceWorkerEnabled&&'serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
