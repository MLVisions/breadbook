(() => {
  "use strict";
  const STORE = "breadbook.bakes.v1";
  const DRAFT = "breadbook.draft.v1";
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const defaultIngredients = [
    { name: "Bread flour", grams: 450, type: "flour" },
    { name: "Whole wheat flour", grams: 50, type: "flour" },
    { name: "Water", grams: 375, type: "water" },
    { name: "Levain", grams: 100, type: "other" },
    { name: "Salt", grams: 10, type: "other" }
  ];
  const presets = {
    country: { name:"Weekend country loaf", style:"Country loaf", ingredients:[{name:"Bread flour",grams:450,type:"flour"},{name:"Whole wheat flour",grams:50,type:"flour"},{name:"Water",grams:375,type:"water"},{name:"Levain",grams:100,type:"other"},{name:"Salt",grams:10,type:"other"}] },
    sandwich: { name:"Soft sandwich loaf", style:"Sandwich loaf", ingredients:[{name:"Bread flour",grams:500,type:"flour"},{name:"Milk",grams:310,type:"water"},{name:"Butter",grams:45,type:"other"},{name:"Honey",grams:25,type:"other"},{name:"Yeast",grams:7,type:"other"},{name:"Salt",grams:10,type:"other"}] },
    focaccia: { name:"Olive oil focaccia", style:"Focaccia", ingredients:[{name:"Bread flour",grams:500,type:"flour"},{name:"Water",grams:400,type:"water"},{name:"Olive oil",grams:30,type:"other"},{name:"Yeast",grams:5,type:"other"},{name:"Salt",grams:11,type:"other"}] },
    bagel: { name:"Chewy morning bagels", style:"Bagel", ingredients:[{name:"Bread flour",grams:500,type:"flour"},{name:"Water",grams:275,type:"water"},{name:"Malt syrup",grams:20,type:"other"},{name:"Yeast",grams:5,type:"other"},{name:"Salt",grams:10,type:"other"}] }
  };
  let bakes = readJSON(STORE, []);
  let ingredients = defaultIngredients.map(x => ({...x}));
  let fileHandle = null;

  function readJSON(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function uid(){ return crypto.randomUUID ? crypto.randomUUID() : `bake-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function esc(value){ const div=document.createElement("div"); div.textContent=String(value ?? ""); return div.innerHTML; }
  function toast(message){ const el=$("#toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove("show"),2600); }
  function today(){ return new Date().toISOString().slice(0,10); }
  function formatDate(date){ return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(`${date}T12:00:00`)); }
  function totalFlour(items=ingredients){ return items.filter(x=>x.type==="flour").reduce((s,x)=>s+(+x.grams||0),0); }
  function hydration(items=ingredients){ const flour=totalFlour(items); const water=items.filter(x=>x.type==="water").reduce((s,x)=>s+(+x.grams||0),0); return flour ? Math.round(water/flour*100) : 0; }
  function persist(){ localStorage.setItem(STORE,JSON.stringify(bakes)); renderAll(); writeConnectedFile(false); }

  function renderIngredients(){
    const flour=totalFlour();
    $("#ingredients").innerHTML=ingredients.map((item,i)=>`<div class="ingredient-row">
      <input aria-label="Ingredient name" value="${esc(item.name)}" data-ing-name="${i}" class="${item.type==='flour'?'flour-base':''}">
      <div class="unit-field"><input aria-label="Weight in grams" type="number" min="0" step="1" value="${+item.grams||0}" data-ing-grams="${i}"><span>g</span></div>
      <div class="unit-field"><input aria-label="Baker's percentage" type="number" min="0" step="0.1" value="${flour?((+item.grams||0)/flour*100).toFixed(1):0}" data-ing-percent="${i}" ${item.type==='flour'?'title="Flour percentages are relative to total flour"':''}><span>%</span></div>
      <button type="button" class="remove-ingredient" data-remove-ing="${i}" aria-label="Remove ${esc(item.name)}">×</button>
    </div>`).join("");
    const total=ingredients.reduce((s,x)=>s+(+x.grams||0),0), loaves=Math.max(1,+$("#loaves").value||1);
    $("#total-dough").textContent=`${Math.round(total)} g`;
    $("#per-loaf").textContent=`${Math.round(total/loaves)} g per loaf · ${hydration()}% hydration`;
  }

  function formData(){ return {
    id:$("#bake-id").value||uid(), createdAt:new Date().toISOString(), name:$("#recipe-name").value.trim()||"Untitled loaf", style:$("#style").value,
    date:$("#bake-date").value||today(), loaves:+$("#loaves").value||1, ingredients:ingredients.map(x=>({...x,grams:+x.grams||0})),
    roomTemp:+$("#room-temp").value||0, bulkTime:+$("#bulk-time").value||0, proofTime:+$("#proof-time").value||0,
    ovenTemp:+$("#oven-temp").value||0, bakeTime:+$("#bake-time").value||0, doughFeel:$("#dough-feel").value,
    processNotes:$("#process-notes").value.trim(), tastingNotes:$("#tasting-notes").value.trim(), rating:+$("#rating").value||0,
    hydration:hydration(), totalDough:ingredients.reduce((s,x)=>s+(+x.grams||0),0)
  }; }
  function saveDraft(){ localStorage.setItem(DRAFT,JSON.stringify(formData())); }
  function loadForm(b){
    $("#bake-id").value=b.id||""; $("#recipe-name").value=b.name||""; $("#style").value=b.style||"Country loaf"; $("#bake-date").value=b.date||today(); $("#loaves").value=b.loaves||1;
    ingredients=(b.ingredients||defaultIngredients).map(x=>({...x})); $("#room-temp").value=b.roomTemp??72; $("#bulk-time").value=b.bulkTime??4.5; $("#proof-time").value=b.proofTime??12;
    $("#oven-temp").value=b.ovenTemp??475; $("#bake-time").value=b.bakeTime??42; $("#dough-feel").value=b.doughFeel||"Not recorded"; $("#process-notes").value=b.processNotes||""; $("#tasting-notes").value=b.tastingNotes||""; setRating(b.rating||0); renderIngredients();
  }
  function clearForm(){ localStorage.removeItem(DRAFT); loadForm({date:today(),ingredients:defaultIngredients}); $("#preset").value="custom"; $("#save-bake").textContent="Save bake →"; }
  function setRating(n){ $("#rating").value=n; $$(".rating-button").forEach((b,i)=>{b.classList.toggle("active",i<n); b.setAttribute("aria-checked",i+1===n)}); }

  function renderJournal(){
    const q=$("#search").value.toLowerCase(), style=$("#style-filter").value;
    const filtered=[...bakes].sort((a,b)=>b.date.localeCompare(a.date)).filter(b=>(style==="all"||b.style===style)&&JSON.stringify(b).toLowerCase().includes(q));
    $("#journal-empty").style.display=filtered.length?"none":"block"; $("#journal-list").innerHTML=filtered.map(b=>{
      const d=new Date(`${b.date}T12:00:00`), valid=!Number.isNaN(d.getTime()), month=valid?d.toLocaleString("en",{month:"short"}):"DATE", day=valid?d.getDate():"—", year=valid?d.getFullYear():"";
      const score=Math.max(0,Math.min(5,Math.round(+b.rating||0))), id=esc(b.id);
      return `<article class="bake-card"><div class="date-tile"><strong>${day}</strong><span>${month} ${year}</span></div><div class="bake-title"><h3>${esc(b.name)}</h3><span class="tag">${esc(b.style)}</span></div><div class="metric"><span>Hydration</span><strong>${b.hydration||hydration(b.ingredients)}%</strong></div><div class="metric"><span>Dough</span><strong>${Math.round(b.totalDough||0)} g</strong></div><div class="metric"><span>Result</span><strong class="stars">${"★".repeat(score)}${"☆".repeat(5-score)}</strong></div><div class="card-menu"><button class="icon-button" data-duplicate="${id}" title="Duplicate as a new bake" aria-label="Duplicate ${esc(b.name)}">⧉</button><button class="icon-button" data-edit="${id}" title="Edit bake" aria-label="Edit ${esc(b.name)}">✎</button><button class="icon-button" data-delete="${id}" title="Delete bake" aria-label="Delete ${esc(b.name)}">×</button></div></article>`;
    }).join("");
  }
  function renderProgress(){
    $("#stat-bakes").textContent=bakes.length; $("#stat-period").textContent=bakes.length?`${formatDate([...bakes].sort((a,b)=>a.date.localeCompare(b.date))[0].date)} to now`:"Ready when you are";
    const rated=bakes.filter(x=>x.rating); $("#stat-score").textContent=rated.length?(rated.reduce((s,x)=>s+x.rating,0)/rated.length).toFixed(1):"—";
    const styles=bakes.reduce((m,x)=>(m[x.style]=(m[x.style]||0)+1,m),{}), favorite=Object.entries(styles).sort((a,b)=>b[1]-a[1])[0]; $("#stat-style").textContent=favorite?.[0]||"—"; $("#stat-style-count").textContent=favorite?`${favorite[1]} bake${favorite[1]===1?'':'s'}`:"No pattern yet";
    const hs=bakes.map(x=>x.hydration).filter(Number.isFinite); $("#stat-hydration").textContent=hs.length?`${Math.round(hs.reduce((a,b)=>a+b,0)/hs.length)}%`:"—";
    const recent=[...bakes].filter(x=>x.rating).sort((a,b)=>a.date.localeCompare(b.date)).slice(-10); $("#score-chart").innerHTML=recent.length?recent.map(x=>`<div class="chart-col"><div class="chart-bar" style="height:${x.rating/5*100}%" data-label="${esc(x.name)} · ${x.rating}/5"></div><small>${new Date(`${x.date}T12:00:00`).toLocaleString('en',{month:'short',day:'numeric'})}</small></div>`).join(""):"<div class='empty' style='margin:auto;padding:40px'><p>Rate a few bakes to see your progress.</p></div>";
    const best=[...rated].sort((a,b)=>b.rating-a.rating)[0]; const insights=[];
    if(best) insights.push(["Best-rated loaf",`${best.name} scored ${best.rating}/5 at ${best.hydration}% hydration.`]);
    if(favorite) insights.push(["Most explored style",`${favorite[0]} leads the notebook with ${favorite[1]} recorded bake${favorite[1]===1?'':'s'}.`]);
    if(rated.length>=3){ const last=rated.slice(-3).reduce((s,x)=>s+x.rating,0)/3; insights.push(["Recent consistency",`Your last three rated bakes average ${last.toFixed(1)}/5.`]); }
    if(!insights.length) insights.push(["Patterns need repetitions","Record the formula, conditions, and score for each loaf. Insights will appear as the journal grows."]);
    $("#insight-list").innerHTML=insights.map(x=>`<div class="insight-item"><strong>${x[0]}</strong><p>${x[1]}</p></div>`).join("");
  }
  function renderFilters(){ const current=$("#style-filter").value; const styles=[...new Set(bakes.map(x=>x.style))].sort(); $("#style-filter").innerHTML=`<option value="all">All styles</option>${styles.map(x=>`<option>${esc(x)}</option>`).join("")}`; $("#style-filter").value=styles.includes(current)?current:"all"; }
  function renderAll(){ $("#nav-count").textContent=bakes.length; renderFilters(); renderJournal(); renderProgress(); }
  function go(view){
    $$(".view").forEach(x=>x.classList.toggle("active",x.id===`view-${view}`)); $$(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
    const copy={today:["FORMULA LAB","Build today’s loaf"],journal:["BAKE JOURNAL","Every loaf tells you something"],progress:["PROGRESS","See the pattern emerge"],data:["YOUR DATA","Keep the notebook yours"]}[view]; $("#page-eyebrow").textContent=copy[0]; $("#page-title").textContent=copy[1]; $(".sidebar").classList.remove("open"); window.scrollTo({top:0,behavior:"smooth"});
  }
  function backup(){ return {app:"Breadbook",version:1,exportedAt:new Date().toISOString(),bakes}; }
  function downloadBackup(){ const blob=new Blob([JSON.stringify(backup(),null,2)],{type:"application/json"}), a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`breadbook-${today()}.json`; a.click(); URL.revokeObjectURL(a.href); toast("Backup downloaded"); }
  async function writeConnectedFile(notify=true){ if(!fileHandle) return; try { const writable=await fileHandle.createWritable(); await writable.write(JSON.stringify(backup(),null,2)); await writable.close(); $("#file-status").textContent=`Connected to ${fileHandle.name}`; if(notify) toast("Connected file updated"); } catch(e){ if(notify) toast("Could not update the connected file"); } }
  async function connectFile(){ if(!window.showSaveFilePicker){ toast("Direct file connection requires Chrome or Edge"); return; } try { fileHandle=await window.showSaveFilePicker({suggestedName:"breadbook.json",types:[{description:"JSON backup",accept:{"application/json":[".json"]}}]}); await writeConnectedFile(); } catch(e){ if(e.name!=="AbortError") toast("File connection was not completed"); } }

  $("#rating-buttons").innerHTML=[1,2,3,4,5].map(n=>`<button type="button" class="rating-button" role="radio" aria-checked="false" aria-label="${n} out of 5" data-rating="${n}">★</button>`).join("");
  $("#bake-date").value=today();
  renderIngredients(); renderAll();
  const draft=readJSON(DRAFT,null); if(draft) loadForm(draft);

  document.addEventListener("click", e=>{
    const nav=e.target.closest("[data-view]"); if(nav) go(nav.dataset.view); const move=e.target.closest("[data-go]"); if(move) go(move.dataset.go);
    if(e.target.matches("[data-rating]")) setRating(+e.target.dataset.rating);
    if(e.target.matches("[data-remove-ing]")){ ingredients.splice(+e.target.dataset.removeIng,1); renderIngredients(); saveDraft(); }
    const edit=e.target.closest("[data-edit]"); if(edit){ const b=bakes.find(x=>x.id===edit.dataset.edit); if(b){loadForm(b); $("#save-bake").textContent="Update bake →"; go("today");} }
    const duplicate=e.target.closest("[data-duplicate]"); if(duplicate){ const b=bakes.find(x=>x.id===duplicate.dataset.duplicate); if(b){loadForm({...b,id:"",date:today(),name:`${b.name} — next try`}); go("today"); toast("Formula copied into a new bake");} }
    const del=e.target.closest("[data-delete]"); if(del && confirm("Delete this bake?")){ bakes=bakes.filter(x=>x.id!==del.dataset.delete); persist(); toast("Bake deleted"); }
  });
  $("#ingredients").addEventListener("change",e=>{
    const i=e.target.dataset.ingName??e.target.dataset.ingGrams??e.target.dataset.ingPercent; if(i===undefined)return;
    if(e.target.dataset.ingName!==undefined) ingredients[i].name=e.target.value;
    if(e.target.dataset.ingGrams!==undefined) ingredients[i].grams=+e.target.value||0;
    if(e.target.dataset.ingPercent!==undefined){ const flour=totalFlour(); ingredients[i].grams=flour*(+e.target.value||0)/100; }
    renderIngredients(); saveDraft();
  });
  $("#add-ingredient").onclick=()=>{ingredients.push({name:"New ingredient",grams:0,type:"other"});renderIngredients();};
  $("#loaves").addEventListener("input",renderIngredients);
  $("#preset").onchange=e=>{ const p=presets[e.target.value]; if(p){$("#recipe-name").value=p.name;$("#style").value=p.style;ingredients=p.ingredients.map(x=>({...x}));renderIngredients();saveDraft();} };
  $("#bake-form").addEventListener("input",()=>{clearTimeout(saveDraft.timer);saveDraft.timer=setTimeout(saveDraft,250)});
  $("#bake-form").onsubmit=e=>{e.preventDefault(); const b=formData(), idx=bakes.findIndex(x=>x.id===b.id); if(idx>=0)bakes[idx]={...bakes[idx],...b};else bakes.push(b); persist(); clearForm(); toast(idx>=0?"Bake updated":"Bake saved to the journal"); go("journal");};
  $("#clear-form").onclick=clearForm; $("#new-bake").onclick=()=>{clearForm();go("today")};
  $("#search").oninput=renderJournal; $("#style-filter").onchange=renderJournal; $("#export-data").onclick=downloadBackup; $("#connect-file").onclick=connectFile;
  $("#import-trigger").onclick=()=>$("#import-data").click(); $("#import-data").onchange=async e=>{ const file=e.target.files[0]; if(!file)return; try{ const data=JSON.parse(await file.text()); if(!Array.isArray(data.bakes))throw new Error(); const map=new Map(bakes.map(x=>[x.id,x])); data.bakes.forEach(x=>map.set(x.id||uid(),x)); bakes=[...map.values()]; persist(); toast(`${data.bakes.length} bake records imported`); go("journal"); }catch{toast("That file is not a valid Breadbook backup");} e.target.value=""; };
  $("#reset-data").onclick=()=>$("#confirm-dialog").showModal(); $("#cancel-reset").onclick=()=>$("#confirm-dialog").close(); $("#confirm-reset").onclick=()=>{bakes=[];localStorage.removeItem(STORE);localStorage.removeItem(DRAFT);$("#confirm-dialog").close();clearForm();renderAll();toast("Local journal erased");};
  $(".mobile-menu").onclick=()=>$(".sidebar").classList.toggle("open");

  if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  const context=document.modelContext;
  if(context?.registerTool){
    const register=tool=>Promise.resolve(context.registerTool(tool)).catch(()=>{});
    register({name:"list_bakes",title:"List bread bakes",description:"Return the saved bread journal entries on this device.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({count:bakes.length,bakes})});
    register({name:"create_bake",title:"Record bread bake",description:"Create a bread-baking journal entry and update the visible journal.",inputSchema:{type:"object",properties:{name:{type:"string"},style:{type:"string"},date:{type:"string"},rating:{type:"number",minimum:0,maximum:5},notes:{type:"string"}},required:["name","style","date"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{ if(!input||typeof input.name!=="string"||!/\d{4}-\d{2}-\d{2}/.test(input.date))throw new Error("A name, style, and YYYY-MM-DD date are required."); const b={...formData(),id:uid(),name:input.name,style:input.style,date:input.date,rating:+input.rating||0,tastingNotes:input.notes||""}; bakes.push(b);persist();go("journal");return{id:b.id,status:"saved"}; }});
  }
})();
