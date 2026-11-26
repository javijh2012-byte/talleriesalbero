const fVistosK=()=>'albero_fvistos_'+(me?me.id:'');
const fVistos=()=>{try{return JSON.parse(localStorage.getItem(fVistosK())||'{}')}catch(e){return{}}};
const fNuevas=f=>Math.max(0,(f.nResp||0)-(fVistos()[f.id]||0));
const fNuevasTotal=()=>fForms.filter(fPuedeVer).reduce((s,f)=>s+fNuevas(f),0);
function fMarcarVisto(id){const f=fForms.find(x=>x.id===id);if(!f||!me)return;const v=fVistos();v[id]=f.nResp||0;try{localStorage.setItem(fVistosK(),JSON.stringify(v))}catch(e){}}
const fPuedeEditar=f=>!!me&&(fEsCreador(f)||!!me.admin||me.id==='admin');
const fFiltrable=p=>['opcion','curso','escala'].includes(p.tipo);
const fOpts=p=>p.tipo==='curso'?fCursos(p):p.tipo==='escala'?['1','2','3','4','5']:(p.opciones||[]);
const PRIV_DEF={condiciones:[{id:'c1',texto:'He leído y acepto la política de privacidad del centro.',activa:true},{id:'c2',texto:'Entiendo que mis respuestas quedarán registradas.',activa:true}],consentimiento:'Acepto que el centro guarde mi nombre, correo y teléfono para gestionar mi cuenta y contactar conmigo. Solo los verá el personal autorizado y se conservan registrados.',privacidad:'Los datos que facilites se usarán solo para la gestión de este formulario en el IES Albero y únicamente podrán consultarlos las personas autorizadas del centro. Si el formulario te pide tu correo o tu teléfono, se guardan junto con tus respuestas y se conservan registrados.'};
const privDe=()=>{const s=window.FORM_PUBLICO?(fPub.cfg||{}):cfg;const p=s.priv||{};return{condiciones:Array.isArray(p.condiciones)?p.condiciones:PRIV_DEF.condiciones,privacidad:typeof p.privacidad==='string'?p.privacidad:PRIV_DEF.privacidad,consentimiento:typeof p.consentimiento==='string'?p.consentimiento:PRIV_DEF.consentimiento}};
const fInicioDef=()=>({intro:'',humano:true,...privDe()});
const fCursoNiveles=et=>et==='Bachillerato'?['1º','2º']:et==='ESO'?['1º','2º','3º','4º']:[];
const fPub={f:null,cfg:null,ini:null,a:0,b:0,humano:false,inicioOk:false,condTextos:[]};
function fCursoLetras(p,et){
  const c=window.FORM_PUBLICO?(fPub.cfg||{}):cfg;
  const v=et==='Bachillerato'?(c.bach??p.bach):(c.eso??p.eso);
  return String(v??(et==='Bachillerato'?DEF.bach:DEF.eso)).split(',').map(x=>x.trim()).filter(Boolean);
}
function fCursos(p){const r=[];for(const et of['ESO','Bachillerato'])for(const n of fCursoNiveles(et))for(const l of fCursoLetras(p,et))r.push(n+' '+et+' '+l);return r}
try{
  firebase.firestore().collection('formularios').onSnapshot(s=>{
    fForms=s.docs.map(d=>({id:d.id,...d.data()}));
    if(me&&vista()==='f-resp')fMarcarVisto(fActivo);
    if(me&&!$('v-f-inicio').classList.contains('hide'))pintarFInicio();else if(me&&vista()==='home')pintarHome();
  });
}catch(e){console.error('Formularios: sin conexión',e)}

function pintarFInicio(){
  const mis=fForms.filter(fPuedeVer);
  $('f-inicio-body').innerHTML=`<div class="card"><div class="fl"><h2 style="margin:0">Formularios</h2><button class="b" onclick="fNuevo()">+ Nuevo</button></div>`+
  (mis.length?mis.map(f=>`<div class="item" style="cursor:pointer" onclick="fResp('${f.id}')"><div><b>${esc(f.nombre)}</b><br><small>${(f.preguntas||[]).length} preguntas${f.cerrado?' · 🔒 Cerrado':''} · ${fEsCreador(f)?'Creado por ti':'Creado por '+esc(f.creador)}</small></div><span>${fNuevas(f)?`<b class="badge">${fNuevas(f)} nueva${fNuevas(f)>1?'s':''}</b> `:''}›</span></div>`).join(''):'<p style="color:#7b6a55">Todavía no hay formularios.</p>')+`</div>`;
}
function fNuevo(){fBorr={id:null,nombre:'',preguntas:[],verPor:[],inicio:fInicioDef(),limite:0,unaPorPersona:false,cursos:[],tipoUso:'otro',finalTxt:''};go('f-edit')}
function fEditarForm(id){
  const f=fForms.find(x=>x.id===id);if(!f||!fPuedeEditar(f))return;
  fBorr={id,nombre:f.nombre||'',preguntas:JSON.parse(JSON.stringify(f.preguntas||[])),verPor:[...(f.verPor||[])],limite:f.limite||0,unaPorPersona:!!f.unaPorPersona,cursos:[...(f.cursosPermitidos||[])],tipoUso:f.tipoUso||'otro',finalTxt:f.finalTxt||'',inicio:JSON.parse(JSON.stringify({...fInicioDef(),...(f.inicio||{}),...privDe()}))};
  go('f-edit');
}
function pintarFEditor(){
  const b=fBorr;if(!b){go('f-inicio');return}
  const pers=users.filter(u=>u.activo!==false&&u.id!==me.id);
  $('f-edit-body').innerHTML=`<div class="card"><h2>${b.id?'Editar formulario':'Nuevo formulario'}</h2>
  <label>Nombre del formulario</label><input value="${esc(b.nombre)}" oninput="fBorr.nombre=this.value">
  ${fInicioHTML(b)}
  ${fControlHTML(b)}
  <h2 style="margin-top:18px;font-size:17px">Preguntas</h2>
  ${b.preguntas.map((p,i)=>fPregunta(p,i)).join('')}
  ${fBloqueCursos()}<div class="fl" style="margin-top:8px"><select id="frm-tipo" style="width:auto">${Object.entries(FTIPOS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><button class="b s" onclick="fAddP()">+ Añadir pregunta</button></div>
  </div>
  <div class="card"><h2 style="font-size:17px">Quién puede ver las respuestas</h2><small>Tú siempre puedes verlas. Elige además a quién dar acceso.</small>
  ${pers.length?pers.map(u=>`<label style="font-weight:400;display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" style="width:auto" value="${esc(u.id)}" ${b.verPor.includes(u.id)?'checked':''} onchange="fVer(this)"> ${esc(u.nombre||u.usuario)}</label>`).join(''):'<small>No hay otros usuarios activos.</small>'}</div>
  <div class="fl"><button class="b s" onclick="go('f-inicio')">Cancelar</button>${b.id?'<button class="b s" style="color:#b04a3a;border-color:#b04a3a" onclick="fBorrar()">Eliminar</button>':''}<button class="b" onclick="fGuardar()">Guardar</button></div>
  <div id="frm-err" style="color:#b04a3a;font-size:14px;margin-top:8px;min-height:18px"></div>`;
}
function fPregunta(p,i){
  let extra='';
  if(p.tipo==='opcion'||p.tipo==='multiple'){
    extra=`<label>Opciones (una por línea)</label><textarea style="width:100%" oninput="fSetP(${i},'opciones',this.value.split('\\n').map(x=>x.trim()).filter(Boolean))">${esc((p.opciones||[]).join('\n'))}</textarea>
    <div class="fl" style="margin-top:6px;justify-content:flex-start;gap:6px">${Object.keys(FPRESETS).map(k=>`<button class="b s" style="padding:6px 10px;font-size:13px" onclick="fPreset(${i},'${k}')">Usar: ${k}</button>`).join('')}</div>`;
  }
  if(p.tipo==='descripcion')extra='<small style="display:block;margin-top:8px;color:#7b6a55">Este texto se muestra tal cual en el formulario y no pide respuesta.</small>';
  if(p.tipo==='curso')extra=`<small style="display:block;margin-top:8px;color:#7b6a55">Se muestra como en los listados: Etapa (ESO / Bachillerato), Nivel y Grupo. Los grupos salen de Ajustes (ESO: ${esc(cfg.eso)} · Bachillerato: ${esc(cfg.bach)}). La respuesta se guarda como «1º ESO A».</small>`;
  return `<div class="card" style="background:#fdfbf5"><div class="fl" style="justify-content:space-between"><select onchange="fCambiarTipo(${i},this.value)" style="width:auto">${Object.entries(FTIPOS).map(([k,v])=>`<option value="${k}" ${k===p.tipo?'selected':''}>${v}</option>`).join('')}</select><div class="fl" style="gap:6px"><button class="b s" style="padding:6px 10px" onclick="fMoverP(${i},-1)">↑</button><button class="b s" style="padding:6px 10px" onclick="fMoverP(${i},1)">↓</button><button class="b r" style="padding:6px 10px" onclick="fQuitarP(${i})">Quitar</button></div></div>
  <label>Texto de la pregunta</label><input value="${esc(p.texto)}" oninput="fSetP(${i},'texto',this.value)">
  <label style="font-weight:400;display:flex;gap:8px;align-items:center"><input type="checkbox" style="width:auto" ${p.obligatoria?'checked':''} onchange="fSetP(${i},'obligatoria',this.checked)"> Obligatoria</label>${extra}${fCondUI(p,i)}</div>`;
}
// ===== Mejoras de formularios =====
const FCURSOS=['ESO 1º','ESO 2º','ESO 3º','ESO 4º','Bachillerato 1º','Bachillerato 2º'];
function fMoverP(i,d){const j=i+d;if(j<0||j>=fBorr.preguntas.length)return;[fBorr.preguntas[i],fBorr.preguntas[j]]=[fBorr.preguntas[j],fBorr.preguntas[i]];pintarFEditor()}
function fCambiarTipo(i,t){const p=fBorr.preguntas[i];p.tipo=t;if(t==='curso'){p.eso=p.eso||cfg.eso;p.bach=p.bach||cfg.bach}if(!String(p.texto||'').trim())p.texto=t==='correo'?'Correo':t==='curso'?'Curso':'';pintarFEditor()}
function fSetCond(i,k,v){const p=fBorr.preguntas[i];if(k==='p'){p.si=v?{p:v,v:''}:null;pintarFEditor()}else p.si={...(p.si||{}),v}}
function fCondUI(p,i){
  const prev=fBorr.preguntas.slice(0,i).filter(q=>q.tipo!=='descripcion');
  if(!prev.length)return '';
  const c=p.si||{},pq=prev.find(q=>q.id===c.p);
  return `<label>Mostrar esta pregunta solo si…</label><select onchange="fSetCond(${i},'p',this.value)" style="width:100%"><option value="">Siempre</option>${prev.map((q,j)=>`<option value="${q.id}" ${q.id===c.p?'selected':''}>${esc(q.texto||('Pregunta '+(j+1)))}</option>`).join('')}</select>${pq&&(pq.tipo==='opcion'||pq.tipo==='multiple')?`<select onchange="fSetCond(${i},'v',this.value)" style="width:100%;margin-top:6px"><option value="">Cualquier respuesta</option>${(pq.opciones||[]).map(o=>`<option ${c.v===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`:(pq?'<small>Se mostrará cuando la pregunta elegida tenga respuesta.</small>':'')}`;
}
function fBloqueCursos(){return `<div class="card" style="background:#fdfbf5;margin:8px 0"><b>Cursos admitidos</b><small style="display:block;color:#7b6a55">Si no marcas ninguno, pueden responder todos. Afecta a las preguntas de tipo Curso.</small><div class="fl" style="gap:12px;flex-wrap:wrap;margin-top:6px">${FCURSOS.map(c=>`<label class="ck" style="margin:0"><input type="checkbox" style="width:auto" ${(fBorr.cursos||[]).includes(c)?'checked':''} onchange="fCursoPerm('${c}',this.checked)"> ${c}</label>`).join('')}</div></div>`}
function fCursoPerm(c,on){const l=fBorr.cursos||[];fBorr.cursos=on?[...new Set([...l,c])]:l.filter(x=>x!==c)}
function fCursoOk(e,n){const c=fPub.f?.cursosPermitidos||[];return !c.length||c.includes(e+' '+n)}
function fValor(p){
  if(p.tipo==='opcion')return (document.getElementById('fq-'+p.id)||{}).value||'';
  if(p.tipo==='multiple')return [...document.querySelectorAll('input[name="fq-'+p.id+'"]:checked')].map(x=>x.value).join(', ');
  if(p.tipo==='escala')return (document.querySelector('input[name="fq-'+p.id+'"]:checked')||{}).value||'';
  return ((document.getElementById('fq-'+p.id)||{}).value||'').trim();
}
function fVisible(p,ps){
  if(!p.si||!p.si.p)return true;
  const ref=ps.find(q=>q.id===p.si.p);if(!ref)return true;
  if(!fVisible(ref,ps))return false;
  const v=fValor(ref);
  if(!p.si.v)return !!v;
  return ref.tipo==='multiple'?v.split(', ').includes(p.si.v):v===p.si.v;
}
function fPubRefrescar(){const ps=fPub.f?.preguntas||[];ps.forEach(p=>{const el=document.getElementById('fw-'+p.id);if(el)el.style.display=fVisible(p,ps)?'':'none'})}
function fAddP(){const t=$('frm-tipo').value;fBorr.preguntas.push({id:'p'+Date.now()+Math.random().toString(36).slice(2,5),tipo:t,texto:t==='correo'?'Correo':t==='curso'?'Curso':'',obligatoria:false,opciones:[],...(t==='curso'?{eso:cfg.eso,bach:cfg.bach}:{})});pintarFEditor()}
function fSetP(i,k,v){fBorr.preguntas[i][k]=v}
function fPreset(i,k){fBorr.preguntas[i].opciones=[...FPRESETS[k]];pintarFEditor()}
function fQuitarP(i){fBorr.preguntas.splice(i,1);pintarFEditor()}
function fVer(el){if(el.checked){if(!fBorr.verPor.includes(el.value))fBorr.verPor.push(el.value)}else fBorr.verPor=fBorr.verPor.filter(x=>x!==el.value)}
async function fGuardar(){
  const b=fBorr,err=m=>$('frm-err').textContent=m;
  if(!b.nombre.trim())return err('Pon un nombre al formulario.');
  if(!b.preguntas.length)return err('Añade al menos una pregunta.');
  if(b.preguntas.some(p=>!String(p.texto||'').trim()))return err('Escribe el texto de todas las preguntas.');
  if(b.preguntas.some(p=>(p.tipo==='opcion'||p.tipo==='multiple')&&!(p.opciones||[]).length))return err('Las preguntas de opción necesitan al menos una opción.');
  if((b.inicio.condiciones||[]).some(c=>c.activa!==false&&!String(c.texto||'').trim()))return err('Escribe el texto de todas las condiciones activas (o quítalas).');
  b.preguntas.forEach(p=>{if(p.tipo==='curso'){p.eso=cfg.eso;p.bach=cfg.bach}});
  if(b.unaPorPersona){
    const pc=b.preguntas.find(p=>p.tipo==='correo');
    if(!pc)return err('Para limitar a una respuesta por persona añade una pregunta de tipo Correo.');
    pc.obligatoria=true;
  }
  const datos={nombre:b.nombre.trim(),preguntas:b.preguntas,verPor:b.verPor,inicio:b.inicio,limite:Math.max(0,parseInt(b.limite)||0),unaPorPersona:!!b.unaPorPersona,cursosPermitidos:b.cursos||[],tipoUso:b.tipoUso||'otro',finalTxt:b.finalTxt||''};
  try{
    const fdb=firebase.firestore();
    if(b.id)await fdb.collection('formularios').doc(b.id).update(datos);
    else{const r=await fdb.collection('formularios').add({...datos,creador:me.id,creado:Date.now()});b.id=r.id}
    fResp(b.id);
  }catch(e){err('No se pudo guardar: '+(e.code||e.message))}
}
async function fBorrar(){
  if(!await dlg({title:'Eliminar formulario',msg:'Se eliminará el formulario. Las respuestas ya recibidas se conservan en la base de datos.',ok:'Eliminar',cancel:'Cancelar'}))return;
  await firebase.firestore().collection('formularios').doc(fBorr.id).delete();
  go('f-inicio');
}
async function fCerrar(id){
  const f=fForms.find(x=>x.id===id);if(!f||!fPuedeEditar(f))return;
  const nuevo=!f.cerrado;
  try{await firebase.firestore().collection('formularios').doc(id).update({cerrado:nuevo});f.cerrado=nuevo;pintarFResp()}
  catch(e){dlg({title:'No se pudo cambiar',msg:'Inténtalo de nuevo. ('+(e.code||e.message)+')',ok:'Vale'})}
}
function fResp(id){fActivo=id;fMarcarVisto(id);go('f-resp')}
let fRespData=[],fRespForm=null;
function pintarFResp(){
  const f=fForms.find(x=>x.id===fActivo);
  if(!f||!fPuedeVer(f)){$('f-resp-body').innerHTML='<div class="card">No tienes acceso a este formulario.</div>';return}
  fRespForm=f;
  const ops=(f.preguntas||[]).filter(fFiltrable);
  $('f-resp-body').innerHTML=`<div class="card">
    <div class="fl" style="margin-bottom:10px"><h2 style="margin:0">${esc(f.nombre)}</h2><div class="fl" style="gap:6px">${fPuedeEditar(f)?`<button class="b s" onclick="fEditarForm('${f.id}')">Editar</button><button class="b s" onclick="fCerrar('${f.id}')">${f.cerrado?'Reabrir':'Cerrar'}</button>`:''}<button class="b s" onclick="go('f-inicio')">Volver</button></div></div>
    <div style="margin-bottom:8px"><small>Estado: <b>${f.cerrado?'🔒 Cerrado (no admite respuestas)':'Abierto'}</b>${f.limite?' · Máximo '+f.limite+' respuestas':''}${f.unaPorPersona?' · Una respuesta por persona':''}</small></div>
    <div class="fl" style="margin-bottom:12px"><input readonly value="${esc(fLink(f.id))}" onclick="this.select()" style="flex:1"><button class="b s" onclick="navigator.clipboard.writeText(this.previousElementSibling.value);this.textContent='¡Copiado!'">Copiar enlace</button></div>
    <div class="fl" style="flex-wrap:wrap;gap:8px;margin-bottom:10px">
      <input id="frm-busq" type="search" placeholder="Buscar por nombre o cualquier respuesta" oninput="fFiltrar()" style="flex:2;min-width:180px">
      <input id="frm-fecha" type="date" onchange="fFiltrar()" style="flex:1;min-width:150px">
      ${ops.map(p=>`<select id="frm-op-${p.id}" onchange="fFiltrar()" style="flex:1;min-width:150px"><option value="">Todos: ${esc(p.texto)}</option>${fOpts(p).map(o=>`<option>${esc(o)}</option>`).join('')}</select>`).join('')}
      <button class="b s" onclick="fLimpiar()">Limpiar</button>
      <button class="b" onclick="fExportar()">Exportar CSV</button>
    </div>
    <div id="frm-info"></div><div style="overflow-x:auto;max-height:70vh;overflow-y:auto" id="frm-tabla"></div></div>`;
  if(fUnsubResp)fUnsubResp();
  fUnsubResp=firebase.firestore().collection('formRespuestas').where('formId','==',f.id).onSnapshot(s=>{
    fRespData=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.creado||0)-(b.creado||0));
    fFiltrar();
  });
}
function fFiltrado(){
  const f=fRespForm;if(!f)return[];
  const q=normTxt($('frm-busq')?.value).trim(),dia=$('frm-fecha')?.value||'';
  const ops=(f.preguntas||[]).filter(fFiltrable);
  return fRespData.map((r,i)=>({r,n:i+1})).filter(({r})=>{
    if(dia){const d=new Date(r.creado),iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');if(iso!==dia)return false}
    for(const p of ops){const v=$('frm-op-'+p.id)?.value;if(v&&(r.datos||{})[p.id]!==v)return false}
    if(q&&!normTxt(Object.values(r.datos||{}).join(' ')).includes(q))return false;
    return true;
  });
}
function fFiltrar(){
  const f=fRespForm;if(!f||!$('frm-tabla'))return;
  const filas=fFiltrado(),ps=f.preguntas||[];
  $('frm-info').innerHTML=`<small>${filas.length} de ${fRespData.length} respuesta(s) · orden de llegada · se actualiza sola</small>`;
  $('frm-tabla').innerHTML=filas.length?`<table><thead><tr><th>Nº</th><th>Fecha</th>${ps.map(p=>`<th>${esc(p.texto)}</th>`).join('')}${can('formularios_eliminar')?'<th></th>':''}</tr></thead><tbody>${filas.map(({r,n})=>`<tr><td>${n}</td><td>${esc(r.fecha)}</td>${ps.map(p=>`<td>${esc((r.datos||{})[p.id]??'')}</td>`).join('')}${can('formularios_eliminar')?`<td><button class="b r" style="padding:4px 8px" onclick="fEliminarResp('${r.id}')">✕</button></td>`:''}</tr>`).join('')}</tbody></table>`:'<p style="color:#7b6a55">No hay respuestas con estos filtros.</p>';
}
async function fEliminarResp(id){
  if(!can('formularios_eliminar')||!fRespForm)return;
  if(!await dlg({title:'Eliminar respuesta',msg:'Se borrará esta respuesta de forma definitiva. ¿Seguro?',ok:'Eliminar',cancel:'Cancelar'}))return;
  try{
    const fdb=firebase.firestore(),bt=fdb.batch();
    bt.delete(fdb.collection('formRespuestas').doc(id));
    bt.update(fdb.collection('formularios').doc(fRespForm.id),{nResp:firebase.firestore.FieldValue.increment(-1)});
    await bt.commit();
  }catch(e){await dlg({title:'No se pudo eliminar',msg:'Inténtalo de nuevo. ('+(e.code||e.message)+')',ok:'Vale'})}
}
function fLimpiar(){
  $('frm-busq').value='';$('frm-fecha').value='';
  (fRespForm.preguntas||[]).filter(fFiltrable).forEach(p=>$('frm-op-'+p.id).value='');
  fFiltrar();
}
function fExportar(){
  const f=fRespForm,ps=f.preguntas||[];
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const filas=[['Nº','Fecha',...ps.map(p=>p.texto)].map(q).join(';')].concat(fFiltrado().map(({r,n})=>[n,r.fecha,...ps.map(p=>(r.datos||{})[p.id])].map(q).join(';')));
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\ufeff'+filas.join('\r\n')],{type:'text/csv;charset=utf-8'}));
  a.download='respuestas-'+f.nombre+'.csv';a.click();
}



function fInicioHTML(b){
  const i=b.inicio;
  return `<div class="card" style="background:#fdfbf5"><h2 style="font-size:17px">Pantalla de inicio del enlace</h2>
  <small>Es lo primero que verá quien abra el enlace. El botón «Comenzar» no se activa hasta que todo esté verificado.</small>
  <label>Descripción breve (opcional)</label><textarea rows="2" oninput="fBorr.inicio.intro=this.value">${esc(i.intro||'')}</textarea>
  <label style="font-weight:400;display:flex;gap:8px;align-items:center;margin-top:12px"><input type="checkbox" style="width:auto" ${i.humano?'checked':''} onchange="fBorr.inicio.humano=this.checked"> Pedir verificación de que no es un robot</label>
  <small style="display:block;margin-top:10px;color:#7b6a55">Las condiciones que hay que aceptar y la información de privacidad son las mismas para todos los formularios. Se editan en Ajustes › Privacidad y consentimientos.</small></div>`;
}
function fControlHTML(b){
  return `<div class="card" style="background:#fdfbf5"><h2 style="font-size:17px">Control de respuestas</h2>
  <label>Máximo de respuestas (vacío o 0 = sin límite)</label><input type="number" min="0" inputmode="numeric" placeholder="Sin límite" value="${b.limite||''}" oninput="fBorr.limite=this.value">
  <label style="font-weight:400;display:flex;gap:8px;align-items:flex-start;margin-top:12px"><input type="checkbox" style="width:auto;margin-top:3px" ${b.unaPorPersona?'checked':''} onchange="fBorr.unaPorPersona=this.checked"> <span>Solo una respuesta por persona. Se identifica por el correo @iesalbero.es, así que el formulario necesita una pregunta de tipo Correo (se marcará como obligatoria).</span></label>
  <label>Tipo de formulario</label><select onchange="fBorr.tipoUso=this.value">${Object.entries(FTIPOUSO).map(([k,v])=>`<option value="${k}" ${(b.tipoUso||'otro')===k?'selected':''}>${v}</option>`).join('')}</select>
  <label>Mensaje final (vacío = mensaje predeterminado de ese tipo)</label><textarea rows="3" placeholder="Ej.: Gracias. Recuerda traer la autorización firmada." oninput="fBorr.finalTxt=this.value">${esc(b.finalTxt||'')}</textarea>
  <small>Para cerrar o reabrir el formulario usa el botón de la pantalla de respuestas.</small></div>`;
}
function fCond(k,p,v){fBorr.inicio.condiciones[k][p]=v}
function fCondAdd(){fBorr.inicio.condiciones.push({id:'c'+Date.now().toString(36),texto:'',activa:true});pintarFEditor()}
function fCondQuitar(k){fBorr.inicio.condiciones.splice(k,1);pintarFEditor()}
let privBorr=null,privT=null;
function privAdminHtml(){privBorr=JSON.parse(JSON.stringify(privDe()));return `<small style="color:#6b5a45">Los cambios se guardan automáticamente. Las condiciones y la privacidad aparecen en todos los formularios; el consentimiento aparece al crear cuenta y al recuperar la contraseña.</small><div id="priv-box">${privPintar()}</div><small id="priv-estado" style="color:#7b6a55;display:block;margin-top:8px;min-height:18px"></small>`}
function privPintar(){return `<label>Condiciones que debe aceptar (marca = activa)</label>${privBorr.condiciones.map((c,k)=>`<div class="fl" style="gap:6px;margin-bottom:6px"><input type="checkbox" style="width:22px;flex:none" ${c.activa!==false?'checked':''} onchange="privSet(${k},'activa',this.checked)"><input value="${esc(c.texto)}" oninput="privSet(${k},'texto',this.value)" style="flex:1;min-width:0"><button class="b r" style="padding:6px 10px" onclick="privQuitar(${k})">✕</button></div>`).join('')}<button class="b s" style="margin-top:4px" onclick="privAdd()">+ Añadir condición</button><label>Información de privacidad (se muestra al pulsar «Ver información de privacidad»)</label><textarea rows="4" oninput="privSet(null,'privacidad',this.value)">${esc(privBorr.privacidad)}</textarea><label>Texto de consentimiento al crear cuenta o recuperar contraseña</label><textarea rows="3" oninput="privSet(null,'consentimiento',this.value)">${esc(privBorr.consentimiento)}</textarea>`}
function privSet(k,campo,v){if(k===null)privBorr[campo]=v;else privBorr.condiciones[k][campo]=v;privGuardar()}
function privAdd(){privBorr.condiciones.push({id:'c'+Date.now().toString(36),texto:'',activa:true});$('priv-box').innerHTML=privPintar();privGuardar()}
function privQuitar(k){privBorr.condiciones.splice(k,1);$('priv-box').innerHTML=privPintar();privGuardar()}
function privGuardar(){
  const est=t=>{const e=$('priv-estado');if(e)e.textContent=t};
  est('Guardando…');clearTimeout(privT);
  privT=setTimeout(()=>{
    Promise.resolve(store.setCfg({...cfg,priv:JSON.parse(JSON.stringify(privBorr))}))
      .then(()=>est('Guardado automáticamente ✓'))
      .catch(()=>est('No se pudo guardar. Revisa la conexión.'));
  },600);
}
/* ===== Formulario público (enlace con ?f=ID, sin cuenta) ===== */
function fPubPintar(inner){
  const pf=$('pubform');
  pf.innerHTML='<div style="text-align:center;margin:4px 0 14px"><img id="pub-logo" alt="IES Albero" style="height:88px;max-width:85%;object-fit:contain"></div>'+inner;
  const im=$('pub-logo');im.onerror=()=>{im.onerror=null;im.src=LOGO_FALLBACK};im.src=LOGO_SRC;
}
function fPubMsg(t,x){fPubPintar(`<div class="card" style="text-align:center"><h2>${esc(t)}</h2><p>${esc(x)}</p></div>`)}
function fCampo(p){
  const st='width:100%;padding:11px 12px;border:1px solid #e6d9b8;border-radius:10px;font-size:16px;background:#fff';
  if(p.tipo==='numero')return `<input type="number" id="fq-${p.id}" style="${st}">`;
  if(p.tipo==='opcion')return `<select id="fq-${p.id}" style="${st}"><option value="">— Elige —</option>${(p.opciones||[]).map(o=>`<option>${esc(o)}</option>`).join('')}</select>`;
  if(p.tipo==='textolargo')return `<textarea id="fq-${p.id}" rows="4" maxlength="2000" style="${st}"></textarea>`;
  if(p.tipo==='fecha')return `<input type="date" id="fq-${p.id}" style="${st}">`;
  if(p.tipo==='escala')return `<div style="display:flex;gap:8px;flex-wrap:wrap">${[1,2,3,4,5].map(n=>`<label style="display:flex;align-items:center;gap:6px;margin:0;padding:8px 12px;border:1px solid #e6d9b8;border-radius:10px;background:#fff;font-size:16px;font-weight:600"><input type="radio" name="fq-${p.id}" value="${n}" style="width:20px;height:20px;padding:0"> ${n}</label>`).join('')}</div><small>1 = mínimo · 5 = máximo</small>`;
  if(p.tipo==='multiple')return `<div>${(p.opciones||[]).map(o=>`<label class="ck" style="align-items:flex-start"><input type="checkbox" name="fq-${p.id}" value="${esc(o)}" style="width:22px;flex-shrink:0;padding:0"> <span>${esc(o)}</span></label>`).join('')}</div>`;
  if(p.tipo==='curso')return `<div class="row" style="gap:8px"><div style="min-width:0"><small>Etapa</small><select id="fq-${p.id}-e" onchange="fCursoEtapa('${p.id}')" style="${st}"><option value="">—</option><option>ESO</option><option>Bachillerato</option></select></div><div style="min-width:0"><small>Nivel</small><select id="fq-${p.id}-n" style="${st}"><option value="">—</option></select></div><div style="min-width:0"><small>Grupo</small><select id="fq-${p.id}-g" style="${st}"><option value="">—</option></select></div></div>`;
  if(p.tipo==='correo')return `<div style="display:flex;align-items:stretch"><input id="fq-${p.id}" autocapitalize="off" placeholder="nombre.apellido" style="${st};border-radius:10px 0 0 10px;flex:1"><span style="padding:11px 12px;border:1px solid #e6d9b8;border-left:0;border-radius:0 10px 10px 0;background:#f4eddb;white-space:nowrap">${FMAIL}</span></div>`;
  return `<input id="fq-${p.id}" style="${st}">`;
}
function fCursoEtapa(pid){
  const p=fPub.f.preguntas.find(x=>x.id===pid),et=$('fq-'+pid+'-e').value;
  $('fq-'+pid+'-n').innerHTML='<option value="">—</option>'+fCursoNiveles(et).filter(x=>fCursoOk(et,x)).map(x=>`<option>${x}</option>`).join('');
  $('fq-'+pid+'-g').innerHTML='<option value="">—</option>'+(et?fCursoLetras(p,et):[]).map(x=>`<option>${esc(x)}</option>`).join('');
}
function iniciarFormularioPublico(){
  const id=window.FORM_PUBLICO;
  $('login').classList.add('hide');$('app').classList.add('hide');
  $('pubform').classList.remove('hide');
  const msg=(t,x)=>fPubPintar(`<div class="card" style="text-align:center"><h2>${esc(t)}</h2><p>${esc(x)}</p></div>`);
  if(!id)return msg('Formulario no válido','El enlace no es correcto.');
  if(!firebase.apps.length)firebase.initializeApp(FIREBASE_CONFIG);
  fPubPintar('<div class="card" style="text-align:center"><p>Cargando…</p></div>');
  const fdb=firebase.firestore();
  fdb.collection('config').doc('ajustes').get().then(d=>d.data()||null).catch(()=>null).then(c=>{
    if(c){fPub.cfg=c;if(c.logo)LOGO_SRC=c.logo}
    return fdb.collection('formularios').doc(id).get();
  }).then(d=>{
    if(!d.exists)return msg('Formulario no disponible','Este formulario no existe o ya no está disponible.');
    fPub.f={id:d.id,...d.data()};document.title=fPub.f.nombre||document.title;
    const f=fPub.f;
    if(f.cerrado)return fPubMsg('Formulario cerrado','Este formulario ya no admite respuestas.');
    if(f.limite>0)return fdb.collection('formRespuestas').where('formId','==',id).get()
      .then(s=>s.size>=f.limite?fPubMsg('Plazas completas','Se ha alcanzado el máximo de respuestas de este formulario.'):fPubInicio())
      .catch(()=>fPubInicio());
    fPubInicio();
  }).catch(()=>msg('Sin conexión','No se pudo cargar el formulario. Inténtalo de nuevo.'));
}
/* Pantalla de inicio: nombre, verificación humana, condiciones y botón Comenzar */
function fPubInicio(){
  const f=fPub.f,ini=fPub.ini={...fInicioDef(),...(f.inicio||{}),...privDe()};
  fPub.a=2+Math.floor(Math.random()*8);fPub.b=2+Math.floor(Math.random()*8);fPub.inicioOk=false;
  const conds=(ini.condiciones||[]).filter(c=>c.activa!==false&&String(c.texto||'').trim());
  fPub.condTextos=conds.map(c=>c.texto);
  fPubPintar(`<div class="card"><h2 style="text-align:center;margin-bottom:6px">${esc(f.nombre)}</h2>
    ${ini.intro?`<p style="white-space:pre-wrap;color:#6b5a45;text-align:center;margin:6px 0 14px">${esc(ini.intro)}</p>`:''}
    ${(ini.humano||conds.length)?'<div style="margin:14px 0 4px;font-weight:600;color:#6b5a45;font-size:13px">Antes de comenzar, verifica lo siguiente:</div>':''}
    ${ini.humano?`<div style="border:1px solid var(--line);border-radius:12px;padding:12px;margin-top:8px;background:#fdfbf5"><b>Verificación: no soy un robot</b><div style="margin:8px 0 6px">¿Cuánto es ${fPub.a} + ${fPub.b}?</div><div style="display:flex;gap:10px;align-items:center"><input id="fh-in" inputmode="numeric" autocomplete="off" oninput="fPubCheck()" style="max-width:110px"><span id="fh-ok" style="color:#2e7d32;font-weight:600"></span></div></div>`:''}
    ${conds.map(c=>`<label class="ck" style="align-items:flex-start"><input type="checkbox" class="fc-chk" style="width:22px;flex-shrink:0;padding:0" onchange="fPubCheck()"> <span>${esc(c.texto)}</span></label>`).join('')}
    ${String(ini.privacidad||'').trim()?`<details style="margin-top:8px"><summary style="cursor:pointer;color:var(--brown);font-weight:600">Ver información de privacidad</summary><p style="white-space:pre-wrap;font-size:14px;color:#6b5a45">${esc(ini.privacidad)}</p></details>`:''}
    <button class="b" id="frm-comenzar" disabled onclick="fComenzar()" style="width:100%;padding:13px;margin-top:16px;font-size:16px">Comenzar</button>
    <div class="err" id="frm-ini-err" style="margin-top:6px"></div></div>`);
  fPubCheck();
}
function fPubCheck(){
  const ini=fPub.ini;let h=true;
  if(ini.humano){const v=($('fh-in').value||'').trim();h=v!==''&&Number(v)===fPub.a+fPub.b;$('fh-ok').textContent=h?'✓ Verificado':''}
  fPub.humano=h;
  const c=[...document.querySelectorAll('.fc-chk')].every(x=>x.checked);
  $('frm-comenzar').disabled=!(h&&c);
}
function fComenzar(){
  fPubCheck();
  if($('frm-comenzar').disabled)return($('frm-ini-err').textContent='Completa las verificaciones para comenzar.');
  fPub.inicioOk=true;fPubForm();
}
function fPubForm(){
  const f=fPub.f;
  fPubPintar(`<div class="card" oninput="fPubRefrescar()" onchange="fPubRefrescar()"><h2>${esc(f.nombre)}</h2>
    ${(f.preguntas||[]).map(p=>p.tipo==='descripcion'?`<div id="fw-${p.id}" style="margin:14px 0;white-space:pre-wrap;color:#6b5a45">${esc(p.texto)}</div>`:`<div id="fw-${p.id}"><label style="display:block;font-weight:600;margin:12px 0 4px">${esc(p.texto)}${p.obligatoria?' *':''}</label>${fCampo(p)}</div>`).join('')}
    <input id="fq-web" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
    <div style="margin-top:16px"><button class="b" id="frm-enviar" onclick="fEnviarPublico('${esc(f.id)}')">Enviar</button></div><div id="frm-pub-err" style="color:#b04a3a;font-size:14px;margin-top:8px;min-height:18px"></div></div>`);
  fPubRefrescar();
}
const FGRACIAS_DEF={inscripcion:'Tu inscripción se ha registrado correctamente.',autorizacion:'Tu autorización se ha recibido. Gracias por tu colaboración.',encuesta:'Gracias por responder. Tu opinión nos ayuda a mejorar.',otro:'Tus respuestas se han enviado correctamente.'};
const FTIPOUSO={inscripcion:'Inscripción',autorizacion:'Autorización',encuesta:'Encuesta',otro:'Otro'};
function fGracias(){
  const f=fPub.f||{},txt=String(f.finalTxt||'').trim()||FGRACIAS_DEF[f.tipoUso]||FGRACIAS_DEF.otro;
  fPubPintar(`<div class="card" style="text-align:center"><h2>¡Gracias!</h2><p style="white-space:pre-wrap">${esc(txt)}</p><p><small>Ya puedes cerrar esta página.</small></p></div>`);
}
async function fEnviarPublico(id){
  const err=m=>$('frm-pub-err').textContent=m;
  if(!fPub.inicioOk)return fPubInicio();
  if($('fq-web').value)return fGracias();
  const fdb=firebase.firestore();
  const d=await fdb.collection('formularios').doc(id).get();
  if(!d.exists)return err('Este formulario ya no está disponible.');
  const f=d.data(),datos={};
  if(f.cerrado)return fPubMsg('Formulario cerrado','Este formulario ya no admite respuestas.');
  if(f.limite>0){
    try{const s=await fdb.collection('formRespuestas').where('formId','==',id).get();
      if(s.size>=f.limite)return fPubMsg('Plazas completas','Se ha alcanzado el máximo de respuestas de este formulario.')}catch(e){}
  }
  const mailQ=f.unaPorPersona?(f.preguntas||[]).find(p=>p.tipo==='correo'):null;let mail='';
  for(const p of f.preguntas||[]){
    if(p.tipo==='descripcion'||!fVisible(p,f.preguntas||[]))continue;
    let v;
    if(p.tipo==='curso'){
      const g=k=>(document.getElementById('fq-'+p.id+'-'+k)||{}).value||'',e=g('e'),n=g('n'),l=g('g');
      if((e||n||l)&&!(e&&n&&l))return err('Completa el curso: etapa, nivel y grupo.');
      v=e?`${n} ${e} ${l}`:'';
      if(e&&n&&!fCursoOk(e,n))return err('Este formulario no admite ese curso.');
    }else if(p.tipo==='escala'){v=(document.querySelector('input[name="fq-'+p.id+'"]:checked')||{}).value||''}
    else if(p.tipo==='multiple'){v=[...document.querySelectorAll('input[name="fq-'+p.id+'"]:checked')].map(x=>x.value).join(', ')}
    else{
      v=(document.getElementById('fq-'+p.id)||{}).value||'';v=v.trim();
      if(p.tipo==='fecha'&&v)v=v.split('-').reverse().join('/');
      if(p.tipo==='correo'&&v){
        if(!/^[a-z0-9._-]+$/i.test(v))return err('Escribe solo la parte antes de la @ (letras, números, puntos o guiones).');
        v=v+FMAIL;
      }
    }
    if(p.obligatoria&&!v)return err('Responde las preguntas obligatorias (*).');
    if(mailQ&&p.id===mailQ.id)mail=v;
    if(v)datos[p.id]=v;
  }
  if(mailQ&&!mail)return err('Escribe tu correo: este formulario admite una sola respuesta por persona.');
  if(!Object.keys(datos).length)return err('Responde al menos una pregunta.');
  $('frm-enviar').disabled=true;
  try{
    const resp={formId:id,datos,creado:Date.now(),fecha:new Date().toLocaleString('es-ES'),
      consentimiento:{fecha:new Date().toLocaleString('es-ES'),humano:!!fPub.ini.humano,condiciones:fPub.condTextos}};
    const inc={nResp:firebase.firestore.FieldValue.increment(1)},fref=fdb.collection('formularios').doc(id);
    if(mailQ){
      const ref=fdb.collection('formRespuestas').doc(id+'_'+mail.toLowerCase());
      await fdb.runTransaction(async tx=>{if((await tx.get(ref)).exists)throw new Error('dup');tx.set(ref,resp);tx.update(fref,inc)});
    }else{const bt=fdb.batch();bt.set(fdb.collection('formRespuestas').doc(),resp);bt.update(fref,inc);await bt.commit()}
    fGracias();
  }catch(e){$('frm-enviar').disabled=false;err(e&&e.message==='dup'?'Ya hay una respuesta con este correo. Solo se admite una por persona.':'No se pudo enviar. Inténtalo de nuevo.')}
}
if(window.FORM_PUBLICO){if(window.RECUP)iniciarRecuperar();else iniciarFormularioPublico()}
