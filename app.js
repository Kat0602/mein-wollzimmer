'use strict';
const KEY='mein-wollzimmer-v3';let db={yarns:[],colors:[],needles:[],accessories:[],projects:[]};try{let x=JSON.parse(localStorage.getItem(KEY));if(x&&typeof x==='object')for(let k of Object.keys(db))if(Array.isArray(x[k]))db[k]=x[k]}catch(e){}let tab='yarns',openYarn=null,openColor=null,editing=null;
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),num=x=>Number(String(x??0).replace(',','.'))||0,uid=()=>String(Date.now())+Math.random().toString(36).slice(2,7),save=()=>{localStorage.setItem(KEY,JSON.stringify(db));render()},grams=c=>c.unknown?null:Math.max(0,num(c.quantity)-num(c.used)),sum=arr=>arr.reduce((s,n)=>s+n,0),fmt=n=>Number.isInteger(n)?String(n):n.toLocaleString('de-DE',{maximumFractionDigits:2});
const fields=(defs,data={})=>defs.map(([key,label,type='text',opts])=>`<label>${esc(label)}${type==='select'?`<select name="${key}">${opts.map(o=>`<option value="${esc(o)}" ${data[key]===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`:type==='textarea'?`<textarea name="${key}">${esc(data[key])}</textarea>`:type==='checkbox'?`<input type="checkbox" name="${key}" ${data[key]?'checked':''} style="width:auto">`:`<input name="${key}" type="${type}" ${type==='number'?'min="0" step="any"':''} value="${esc(data[key])}">`}</label>`).join('');
const yarnFields=[['brand','Hersteller'],['name','Garnname'],['composition','Zusammensetzung'],['weight','Knäuelgewicht (g)','number'],['length','Lauflänge je Knäuel (m)','number'],['needle','Empfohlene Nadelstärke (mm)'],['thickness','Garnstärke (z. B. DK, Worsted)'],['gauge','Maschenprobe (optional)'],['notes','Allgemeine Erfahrungen','textarea'],['rating','Bewertung (0–5)','select',['0','1','2','3','4','5']],['rebuy','Wieder kaufen?','select',['Noch offen','Ja','Vielleicht','Nein']]];
const colorFields=[['name','Farbname'],['code','Farbnummer'],['hex','Farbton (optional, z. B. #d7a0b8)'],['lot','Farbpartie'],['skeins','Ganze Knäuel (Anzahl)','number'],['quantity','Gesamtmenge vorhanden/gekauft (g)','number'],['used','Davon verbraucht (g)','number'],['unknown','Bestand noch nicht gezählt','checkbox'],['location','Lagerort (optional)'],['price','Preis pro Knäuel (€)','number'],['notes','Notizen zu dieser Farbe','textarea']];
const needleFields=[['category','Art','select',['Stricknadel','Häkelnadel','Tunesische Häkelnadel','Nadelspiel','Rundstricknadel','Austauschbare Spitze','Sonstige']],['brand','Hersteller'],['model','Modell'],['size','Stärke (mm)'],['material','Material','select',['Metall','Holz','Bambus','Kunststoff','Andere']],['length','Länge / Seillänge'],['count','Anzahl','number'],['rating','Bewertung (0–5)','select',['0','1','2','3','4','5']],['notes','Meine Erfahrungen','textarea']];
const accessoryFields=[['name','Bezeichnung'],['category','Art (z. B. Seil, Verbinder)'],['size','Länge / Größe'],['count','Anzahl','number'],['notes','Bemerkungen','textarea']];
const projectFields=[['name','Projektname'],['technique','Technik','select',['Stricken','Häkeln','Tunesisches Häkeln']],['pattern','Muster / Stich'],['yarn','Verwendetes Garn / Farbe'],['used','Garnverbrauch (g)','number'],['needle','Verwendete Nadel'],['status','Status','select',['Geplant','In Arbeit','Fertig']],['date','Fertig am','date'],['notes','Erfahrungen / Ergebnis','textarea']];
function form(collection,defs,id=null,extra={}){let item=id?db[collection].find(x=>x.id===id):{};editing={collection,id,extra};$('editor').innerHTML=`<section><h3>${id?'Eintrag bearbeiten':'Neuen Eintrag erfassen'}</h3><form id="editForm"><div class="grid">${fields(defs,item)}</div><div class="actions" style="margin-top:14px"><button class="primary" type="submit">Speichern</button><button type="button" id="cancel">Abbrechen</button></div></form></section>`;if(collection==='yarns'||collection==='colors')addScanControl(collection);$('editor').scrollIntoView({behavior:'smooth',block:'start'});$('cancel').onclick=()=>{$('editor').innerHTML='';editing=null};$('editForm').onsubmit=e=>{e.preventDefault();let d=new FormData(e.target),v={...item,...extra};for(let [key,,type] of defs)v[key]=type==='checkbox'?e.target.elements[key].checked:(d.get(key)||'').toString().trim();if(!v.name&&!v.brand){alert('Bitte einen Namen eingeben.');return}if(id)Object.assign(item,v);else db[collection].push({id:uid(),...v});editing=null;save()};}
function remove(collection,id){if(!confirm('Diesen Eintrag wirklich löschen?'))return;db[collection]=db[collection].filter(x=>x.id!==id);if(collection==='yarns')db.colors=db.colors.filter(x=>x.yarnId!==id);save()}
function actions(collection,id,defs,extra={}){return `<div class="actions"><button data-edit="${collection}:${id}">Bearbeiten</button><button class="danger" data-delete="${collection}:${id}">Löschen</button></div>`}
function render(){let labels={yarns:'🧶 Garne',needles:'🪡 Nadeln',accessories:'🧰 Zubehör',projects:'✂️ Projekte',backup:'💾 Sicherung'};$('tabs').innerHTML=Object.entries(labels).map(([k,v])=>`<button class="${tab===k?'active':''}" data-tab="${k}">${v}</button>`).join('');let a=$('app');a.innerHTML='<div id="editor"></div><div id="content"></div>';let c=$('content');if(tab==='yarns')renderYarns(c);else if(tab==='backup')renderBackup(c);else renderSimple(c);wire();}
function renderYarns(c){let total=db.colors.filter(x=>!x.unknown).map(grams),unknown=db.colors.filter(x=>x.unknown).length;c.innerHTML=`<section><div class="stats"><div class="stat"><strong>${db.yarns.length}</strong><span class="muted">Garnsorten</span></div><div class="stat"><strong>${db.colors.length}</strong><span class="muted">Farben</span></div><div class="stat"><strong>${fmt(sum(total))} g</strong><span class="muted">Restbestand*</span></div></div><p class="muted">*Nur gezählte Mengen; ${unknown} Farbe(n) noch offen.</p><div class="toolbar"><input id="search" placeholder="Garn oder Hersteller suchen"><button class="primary" id="newYarn">+ Garnsorte</button></div></section><div id="yarnList"></div>`;let paint=()=>{let q=($('search')?.value||'').toLowerCase();$('yarnList').innerHTML=db.yarns.filter(y=>(y.brand+' '+y.name+' '+db.colors.filter(c=>c.yarnId===y.id).map(c=>c.name).join(' ')).toLowerCase().includes(q)).sort((a,b)=>(a.brand+' '+a.name).localeCompare(b.brand+' '+b.name,'de')).map(y=>{let colors=db.colors.filter(x=>x.yarnId===y.id),known=colors.filter(x=>!x.unknown),g=sum(known.map(grams));return `<section><div class="actions" style="justify-content:space-between"><div><h3 style="margin:0">${esc(y.brand)} ${esc(y.name)}</h3><div class="muted">${colors.length} Farben · ${fmt(g)} g Rest${colors.some(x=>x.unknown)?' + ungezählte Bestände':''}</div></div><button data-open-yarn="${y.id}">${openYarn===y.id?'Schließen':'Farben ansehen'}</button></div>${openYarn===y.id?`<p class="muted">${esc(y.composition)} · ${esc(y.weight)} g / ${esc(y.length)} m · Nadel ${esc(y.needle)} mm</p>${actions('yarns',y.id,yarnFields)}<details><summary>Weitere Garndetails & Erfahrungen</summary><p>${esc(y.thickness||'Keine Garnstärke')} · Maschenprobe: ${esc(y.gauge||'—')}</p><p>Bewertung: ${esc(y.rating||'0')}/5 · Wieder kaufen: ${esc(y.rebuy||'Noch offen')}</p><p>${esc(y.notes||'Noch keine Erfahrungen')}</p></details><hr><div class="actions"><strong>Farben und Mengen</strong><button data-new-color="${y.id}">+ Farbe</button></div>${colors.length?colors.map(x=>`<div class="entry"><div class="actions" style="justify-content:space-between"><div><span class="dot" style="background:${/^#[0-9a-f]{6}$/i.test(x.hex||'')?x.hex:'#ddd'}"></span><strong>${esc(x.name||'Ohne Farbnamen')}</strong> <span class="muted">${esc(x.code)}</span><div class="muted">${x.unknown?'Noch nicht gezählt':`${esc(x.skeins||'0')} ganze Knäuel · ${fmt(grams(x))} g Rest`}</div></div><button data-open-color="${x.id}">${openColor===x.id?'Weniger':'Details'}</button></div>${openColor===x.id?`<p class="muted">Partie: ${esc(x.lot||'—')} · Lagerort: ${esc(x.location||'—')} · Preis: ${esc(x.price||'—')} €</p><p class="muted">Erfasst: ${esc(x.quantity||'0')} g · Verbraucht: ${esc(x.used||'0')} g</p><p>${esc(x.notes||'')}</p>${actions('colors',x.id,colorFields)}`:''}</div>`).join(''):'<p class="muted">Noch keine Farben erfasst.</p>'}`:''}</section>`}).join('')||'<section>Noch keine passenden Garne erfasst.</section>';};paint();$('search').oninput=paint;$('newYarn').onclick=()=>form('yarns',yarnFields);}
function renderSimple(c){let conf={needles:['Meine Nadeln',needleFields],accessories:['Mein Zubehör',accessoryFields],projects:['Meine Projekte',projectFields]},[title,defs]=conf[tab];c.innerHTML=`<section><div class="actions" style="justify-content:space-between"><h2>${title} (${db[tab].length})</h2><button class="primary" id="add">+ Hinzufügen</button></div><input id="search" placeholder="Einträge durchsuchen"></section><div id="list"></div>`;let paint=()=>{$('list').innerHTML=db[tab].filter(x=>JSON.stringify(x).toLowerCase().includes(($('search').value||'').toLowerCase())).map(x=>`<section><h3>${esc(x.name||x.brand+' '+x.model)}</h3><p class="muted">${esc(x.category||x.technique||'')} ${esc(x.size||'')} ${esc(x.material||'')} ${esc(x.status||'')}</p><details><summary>Alle Details anzeigen</summary>${defs.map(([k,l])=>`<p><strong>${esc(l)}:</strong> ${esc(x[k]||'—')}</p>`).join('')}</details>${actions(tab,x.id,defs)}</section>`).join('')||'<section>Noch keine Einträge vorhanden.</section>'};paint();$('search').oninput=paint;$('add').onclick=()=>form(tab,defs);}
function renderBackup(c){c.innerHTML=`<section><h2>Datensicherung</h2><p>Alle Einträge werden nur in diesem Browser auf diesem Gerät gespeichert. Bitte regelmäßig eine Sicherung herunterladen und z. B. in iCloud Drive ablegen.</p><div class="actions"><button class="primary" id="export">Sicherung herunterladen (JSON)</button><label style="display:inline-block">Sicherung wiederherstellen <input type="file" id="import" accept=".json,application/json"></label></div><p class="muted">Wiederherstellen ersetzt den aktuellen Bestand. Die App synchronisiert nicht automatisch zwischen Geräten.</p></section>`;$('export').onclick=()=>{let blob=new Blob([JSON.stringify({version:3,exported:new Date().toISOString(),...db},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mein-wollzimmer-sicherung-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)};$('import').onchange=async e=>{try{let x=JSON.parse(await e.target.files[0].text());if(!Object.keys(db).every(k=>Array.isArray(x[k])))throw Error('Ungültige Sicherungsdatei');if(!confirm('Alle aktuellen Einträge durch diese Sicherung ersetzen?'))return;for(let k of Object.keys(db))db[k]=x[k];save();alert('Sicherung eingelesen.')}catch(err){alert('Sicherung konnte nicht eingelesen werden.')}};}
function wire(){document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;openYarn=null;openColor=null;render()});document.querySelectorAll('[data-open-yarn]').forEach(b=>b.onclick=()=>{openYarn=openYarn===b.dataset.openYarn?null:b.dataset.openYarn;render()});document.querySelectorAll('[data-open-color]').forEach(b=>b.onclick=()=>{openColor=openColor===b.dataset.openColor?null:b.dataset.openColor;render()});document.querySelectorAll('[data-new-color]').forEach(b=>b.onclick=()=>form('colors',colorFields,null,{yarnId:b.dataset.newColor}));document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{let [k,id]=b.dataset.edit.split(':');form(k,{yarns:yarnFields,colors:colorFields,needles:needleFields,accessories:accessoryFields,projects:projectFields}[k],id)});document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{let [k,id]=b.dataset.delete.split(':');remove(k,id)});}

// Mehrere Banderolenfotos werden nur im Arbeitsspeicher gehalten; bestehende Bestandsdaten bleiben unverändert.
function addScanControl(collection){
 const formEl=$('editForm');if(!formEl)return;
 const panel=document.createElement('div');panel.className='scan-panel';
 panel.innerHTML=`<details open><summary>📷 Banderole mit mehreren Fotos erfassen</summary><p class="muted">Fotografiere die Banderole von allen nötigen Seiten. Du kannst beliebig viele Bilder nacheinander hinzufügen. Alle Bilder werden gemeinsam ausgewertet; die erkannten Angaben bitte kontrollieren.</p><label>Weitere Fotos aufnehmen oder auswählen<input type="file" id="labelPhotos" accept="image/*" multiple></label><div id="photoList" class="muted" aria-live="polite">Noch keine Fotos ausgewählt.</div><p class="muted">Tipp: Banderole möglichst gerade und bei hellem Licht fotografieren. Bei kleinen Schriften hilft die iPhone-Funktion „Text erkennen“ in der Fotos-App: Text kopieren und unten einfügen.</p><div class="actions"><button type="button" id="scanLabel">Alle Fotos auswerten</button><button type="button" id="clearPhotos">Fotos entfernen</button></div><p id="scanStatus" class="muted" role="status"></p><details id="scanTextBox" open><summary>Erkannten Text kontrollieren / verbessern</summary><textarea id="scanText" rows="9" placeholder="Erkannter Text aus allen Bildern – oder hier den mit dem iPhone kopierten Text einfügen"></textarea><div class="actions"><button type="button" id="applyScan">Angaben in Formular übernehmen</button></div></details></details>`;
 formEl.insertBefore(panel,formEl.firstChild);
 const files=[], input=panel.querySelector('#labelPhotos'),status=panel.querySelector('#scanStatus'),scanButton=panel.querySelector('#scanLabel'),list=panel.querySelector('#photoList');
 const updateList=()=>{list.replaceChildren();if(!files.length){list.textContent='Noch keine Fotos ausgewählt.';return;}files.forEach((f,i)=>{const line=document.createElement('div');line.style.margin='6px 0';const name=document.createElement('span');name.textContent=`${i+1}. ${f.name} (${Math.round(f.size/1024)} KB) `;const remove=document.createElement('button');remove.type='button';remove.textContent='Entfernen';remove.onclick=()=>{files.splice(i,1);updateList()};line.append(name,remove);list.appendChild(line)})};
 input.onchange=()=>{for(const f of input.files||[])if(f.type.startsWith('image/'))files.push(f);input.value='';updateList();status.textContent=`${files.length} Foto(s) bereit.`};
 panel.querySelector('#clearPhotos').onclick=()=>{files.length=0;updateList();status.textContent='Fotos entfernt.'};
 scanButton.onclick=async()=>{if(!files.length){status.textContent='Bitte zuerst mindestens ein Foto auswählen.';return;}scanButton.disabled=true;let worker;
 try{if(!window.Tesseract){status.textContent='Texterkennung wird geladen (Internet erforderlich) …';await new Promise((resolve,reject)=>{const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';sc.onload=resolve;sc.onerror=()=>reject(Error('Texterkennung konnte nicht geladen werden.'));document.head.appendChild(sc)})}
 worker=await Tesseract.createWorker('deu+eng');
 await worker.setParameters({preserve_interword_spaces:'1'});
 const texts=[];let failed=0;
 for(let i=0;i<files.length;i++){
  status.textContent=`Foto ${i+1} von ${files.length}: Bild wird verbessert und Text erkannt …`;
  try{
   const variants=await prepareLabelImage(files[i]);
   let best={text:'',score:-Infinity};
   for(const variant of variants){
    const result=await worker.recognize(variant);
    const candidate=result.data.text||'';
    const confidence=result.data.confidence||0;
    const score=scoreLabelText(candidate,confidence);
    if(score>best.score)best={text:candidate,score};
   }
   if(best.text.trim())texts.push(`--- Foto ${i+1} ---\n${best.text}`);else failed++;
  }catch(e){failed++}
 }
 const box=panel.querySelector('#scanTextBox');box.classList.remove('hidden');const area=panel.querySelector('#scanText');area.value=texts.join('\n\n');status.textContent=`${texts.length} von ${files.length} Foto(s) mit Text erkannt${failed?' · '+failed+' ohne verwertbaren Text':''}. Text prüfen und Angaben übernehmen. Falls Buchstabensalat erscheint: In der iPhone-Fotos-App Text markieren, kopieren und hier einfügen.`;
 }catch(err){status.textContent='Erkennung fehlgeschlagen: '+err.message+'. Angaben können weiterhin von Hand eingegeben werden.'}finally{if(worker)await worker.terminate().catch(()=>{});scanButton.disabled=false}};
 panel.querySelector('#applyScan').onclick=()=>{const raw=panel.querySelector('#scanText').value;const suggestions=scanSuggestions(raw,collection);let count=0;for(const [key,value] of Object.entries(suggestions)){const field=formEl.elements[key];if(field&&value!==undefined&&value!==''&&(!field.value||confirm('Das bereits ausgefüllte Feld „'+key+'“ durch „'+value+'“ ersetzen?'))){field.value=value;count++}}status.textContent=count+' Feld(er) übernommen. Bitte alle Angaben prüfen und anschließend speichern.'};
}
// Bildaufbereitung für kleine, kontrastarme Beschriftungen auf Banderolen.
async function prepareLabelImage(file){
 const bitmap=await createImageBitmap(file);
 try{
  const scale=Math.min(3,Math.max(1,2200/Math.max(bitmap.width,bitmap.height)));
  const w=Math.round(bitmap.width*scale),h=Math.round(bitmap.height*scale);
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(bitmap,0,0,w,h);
  const original=canvas.toDataURL('image/png');
  const pixels=ctx.getImageData(0,0,w,h),d=pixels.data;
  // Kontraststreckung mit Graustufen: verbessert schwach gedruckte Banderolentexte.
  let min=255,max=0;const lum=new Uint8Array(w*h);
  for(let j=0,k=0;j<d.length;j+=4,k++){
   const v=Math.round(.299*d[j]+.587*d[j+1]+.114*d[j+2]);lum[k]=v;
   if(v<min)min=v;if(v>max)max=v;
  }
  const range=Math.max(45,max-min);
  for(let j=0,k=0;j<d.length;j+=4,k++){
   const v=Math.max(0,Math.min(255,Math.round((lum[k]-min)*255/range)));
   d[j]=d[j+1]=d[j+2]=v;
  }
  ctx.putImageData(pixels,0,0);
  return [original,canvas.toDataURL('image/png')];
 }finally{bitmap.close()}
}
function scoreLabelText(text,confidence){
 const words=text.match(/[A-Za-zÄÖÜäöüß]{3,}/g)||[];
 const meaningful=words.filter(x=>/^[A-Za-zÄÖÜäöüß]+$/.test(x)).length;
 const expected=(text.match(/(?:gr[üu]ndl|polyacryl|polyester|baumwolle|merino|wolle|farbe|partie|meter|\d+\s*%|\d+\s*g|\d+\s*m)/gi)||[]).length;
 return confidence*.7+Math.min(meaningful,60)*.3+expected*8;
}

function scanSuggestions(raw, collection) {
  const t = String(raw || '')
    .replace(/\r/g, '')
    .replace(/--- Foto \d+ ---/g, '')
    .replace(/\u00a0/g, ' ');

  const out = {};
  let m;

  if (collection === 'yarns') {
    const brands = [
      'Woll Butt', 'Gründl', 'DROPS',
      'Lana Grossa', 'Schachenmayr',
      'Lang Yarns', 'Rico Design',
      'Hobbii', 'ONline', 'Katia',
      'Pro Lana', 'Scheepjes',
      'Alize', 'YarnArt'
    ];

    for (const brand of brands) {
      if (t.toLowerCase().includes(brand.toLowerCase())) {
        out.brand = brand;
        break;
      }
    }

    const lines = t.split('\n')
      .map(x => x.trim())
      .filter(Boolean);

    if (out.brand) {
      const index = lines.findIndex(x =>
        x.toLowerCase().includes(out.brand.toLowerCase())
      );

      if (index >= 0) {
        let name = lines[index]
          .replace(out.brand, '')
          .trim();

        if (!name && lines[index + 1]) {
          name = lines[index + 1];
        }

        if (name && name.length < 60) {
          out.name = name;
        }
      }
    }

    // Beispiel: Woll Butt COLIN
    if (/woll\s*butt/i.test(t) && /\bcolin\b/i.test(t)) {
      out.brand = 'Woll Butt';
      out.name = 'Colin';
    }

    // Gewicht und Lauflänge
    m = t.match(
      /(\d{2,4})\s*g\s*[=≈~:-]*\s*(?:ca\.?\s*)?(\d{2,4})\s*m\b/i
    );

    if (m) {
      out.weight = m[1];
      out.length = m[2];
    } else {
      m = t.match(/\b(25|50|100|150|200|250|500)\s*g\b/i);
      if (m) out.weight = m[1];

      m = t.match(/\b(\d{2,4})\s*m\b/i);
      if (m) out.length = m[1];
    }

    // Materialzusammensetzung
    const fibres = [
      'Polyacryl', 'Polyamid', 'Polyester',
      'Baumwolle', 'Schurwolle', 'Merino',
      'Alpaka', 'Viskose', 'Mohair',
      'Seide', 'Leinen', 'Acryl', 'Wolle'
    ];

    const matches = [
      ...t.matchAll(
        /(\d{1,3})\s*%\s*([A-Za-zÄÖÜäöüß]+)/g
      )
    ];

    const composition = matches
      .filter(x =>
        fibres.some(f =>
          x[2].toLowerCase() === f.toLowerCase()
        )
      )
      .map(x => `${x[1]} % ${x[2]}`);

    if (composition.length) {
      out.composition = [...new Set(composition)].join(', ');
    }

    // Nadelstärke
    m = t.match(
      /(?:nadel(?:stärke)?|needle|hook)\s*[:\-]?\s*(\d(?:[,.]\d)?(?:\s*[-–]\s*\d(?:[,.]\d)?)?)/i
    );

    if (m) {
      out.needle = m[1].replace(/\s/g, '');
    }

    // Maschenprobe
    m = t.match(
      /(\d{1,2})\s*M(?:aschen)?\s*[x×\/]\s*(\d{1,2})\s*R(?:eihen)?/i
    );

    if (m) {
      out.gauge = `${m[1]} M × ${m[2]} R`;
    }

  } else if (collection === 'colors') {

    // Farbnummer: FARBE, COLOR, COLOUR
    m = t.match(
      /(?:FARBE|FARB-NR\.?|FARBNUMMER|COLOR|COLOUR)\s*[:#.\-]?\s*(\d{2,12})/i
    );

    if (m) {
      out.code = m[1];
    }

    // Farbpartie: PARTIE, LOT, BATCH
    m = t.match(
      /(?:PARTIE|PARTIENR\.?|LOT|BATCH|DYE\s*LOT)\s*[:#.\-]?\s*(\d{2,12})/i
    );

    if (m) {
      out.lot = m[1];
    }

    // Artikelnummer nicht als Farbnummer verwenden
    // Artikelnummer und EAN bleiben getrennte Angaben.
  }

  return out;
}


render();if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
