(() => {
  "use strict";
  const STORE = "breadbook.bakes.v1";
  const DRAFT = "breadbook.draft.v1";
  const CATALOG = "breadbook.catalog.v1";
  const SETTINGS = "breadbook.settings.v1";
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
  const defaultCatalog = [
    { id:"bread-flour", name:"Bread flour", price:6.49, amount:5, unit:"lb" },
    { id:"whole-wheat", name:"Whole wheat flour", price:6.99, amount:5, unit:"lb" },
    { id:"salt", name:"Salt", price:1.99, amount:26, unit:"oz" },
    { id:"yeast", name:"Yeast", price:8.49, amount:4, unit:"oz" },
    { id:"butter", name:"Butter", price:5.49, amount:16, unit:"oz" },
    { id:"honey", name:"Honey", price:6.49, amount:12, unit:"oz" },
    { id:"olive-oil", name:"Olive oil", price:9.99, amount:25.5, unit:"oz" },
    { id:"malt-syrup", name:"Malt syrup", price:7.99, amount:20, unit:"oz" }
  ];
  let bakes = readJSON(STORE, []);
  let ingredients = defaultIngredients.map(x => ({...x}));
  let catalog = readJSON(CATALOG, defaultCatalog).map(x=>({...x}));
  let settings = {...{costs:true,sales:false,progress:true,weeklyGoal:20},...readJSON(SETTINGS,{})};
  let fileHandle = null;

  function readJSON(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function uid(){ return crypto.randomUUID ? crypto.randomUUID() : `bake-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function esc(value){ const div=document.createElement("div"); div.textContent=String(value ?? ""); return div.innerHTML; }
  function toast(message){ const el=$("#toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove("show"),2600); }
  function today(){ return new Date().toISOString().slice(0,10); }
  function formatDate(date){ return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(`${date}T12:00:00`)); }
  function totalFlour(items=ingredients){ return items.filter(x=>x.type==="flour").reduce((s,x)=>s+(+x.grams||0),0); }
  function hydration(items=ingredients){ const flour=totalFlour(items); const water=items.filter(x=>x.type==="water").reduce((s,x)=>s+(+x.grams||0),0); return flour ? Math.round(water/flour*100) : 0; }
  function packageGrams(item){ const factors={g:1,kg:1000,oz:28.3495,lb:453.592}; return (+item.amount||0)*(factors[item.unit]||1); }
  function pricePerGram(item){ const grams=packageGrams(item); return grams>0?(+item.price||0)/grams:0; }
  function ingredientCost(items=ingredients){ return items.reduce((sum,item)=>{ const match=catalog.find(c=>c.name.trim().toLowerCase()===String(item.name).trim().toLowerCase()); return sum+(match?(+item.grams||0)*pricePerGram(match):0); },0); }
  function money(n){ return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number.isFinite(+n)?+n:0); }
  function persist(){ localStorage.setItem(STORE,JSON.stringify(bakes)); renderAll(); writeConnectedFile(false); }
  function persistCatalog(){ localStorage.setItem(CATALOG,JSON.stringify(catalog)); renderCatalog(); renderCosts(); }
  function persistSettings(){ if(settings.sales)settings.costs=true; localStorage.setItem(SETTINGS,JSON.stringify(settings)); applySettings(); writeConnectedFile(false); }

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
    renderCosts();
  }

  function renderCosts(){
    const batch=ingredientCost(), loaves=Math.max(1,+$("#loaves").value||1), each=batch/loaves, price=+$("#sale-price").value||0;
    $("#formula-cost").textContent=money(batch); $("#loaf-cost").textContent=money(each); $("#cost-batch").textContent=money(batch); $("#cost-loaf").textContent=money(each);
    $("#cost-loaf-note").textContent=`Across ${loaves} loaf${loaves===1?'':'s'}`;
    if(settings.sales&&price){ const profit=price-each, margin=price?profit/price*100:0; $("#cost-margin").textContent=`${Math.round(margin)}%`; $("#cost-margin-note").textContent=`${money(profit)} gross profit per loaf`; }
    else { $("#cost-margin").textContent="—"; $("#cost-margin-note").textContent="Turn on sales to compare"; }
    renderSalePreview();
  }
  function renderSalePreview(){
    const sold=Math.min(+$("#loaves-sold").value||0,+$("#loaves").value||1), price=+$("#sale-price").value||0, costPer=ingredientCost()/Math.max(1,+$("#loaves").value||1), profit=sold*(price-costPer);
    $("#sale-preview").textContent=sold?`${money(sold*price)} revenue · about ${money(profit)} gross profit before other expenses.`:"Record what sold to see ballpark gross profit.";
  }
  function renderCatalog(){
    $("#catalog-list").innerHTML=catalog.map((item,i)=>`<div class="catalog-row"><input value="${esc(item.name)}" aria-label="Ingredient name" data-cat-name="${i}"><input type="number" min="0" step="0.01" value="${+item.price||0}" aria-label="Price paid for ${esc(item.name)}" data-cat-price="${i}"><input type="number" min="0" step="0.01" value="${+item.amount||0}" aria-label="Package amount for ${esc(item.name)}" data-cat-amount="${i}"><select aria-label="Package unit for ${esc(item.name)}" data-cat-unit="${i}">${["g","kg","oz","lb"].map(u=>`<option ${item.unit===u?'selected':''}>${u}</option>`).join("")}</select><output>${money(pricePerGram(item)*100)}</output><button class="remove-ingredient" data-cat-remove="${i}" aria-label="Remove ${esc(item.name)}">×</button></div>`).join("");
  }
  function modeName(){ if(settings.costs&&settings.sales&&settings.progress)return"business"; if(settings.costs&&!settings.sales&&settings.progress)return"costs"; if(!settings.costs&&!settings.sales&&!settings.progress)return"journal"; return"custom"; }
  function applySettings(){
    if(settings.sales) settings.costs=true;
    $$('[data-feature="costs"]').forEach(el=>el.classList.toggle("is-hidden",!settings.costs)); $$('[data-feature="sales"]').forEach(el=>el.classList.toggle("is-hidden",!settings.sales)); $$('[data-feature="progress"]').forEach(el=>el.classList.toggle("is-hidden",!settings.progress));
    $("#toggle-costs").checked=settings.costs; $("#toggle-sales").checked=settings.sales; $("#toggle-progress").checked=settings.progress; $("#weekly-goal").value=settings.weeklyGoal||20;
    $$(".mode-card").forEach(el=>el.classList.toggle("active",el.dataset.mode===modeName())); renderCosts(); renderProgress();
  }

  function formData(){ return {
    id:$("#bake-id").value||uid(), createdAt:new Date().toISOString(), name:$("#recipe-name").value.trim()||"Untitled loaf", style:$("#style").value,
    date:$("#bake-date").value||today(), loaves:+$("#loaves").value||1, ingredients:ingredients.map(x=>({...x,grams:+x.grams||0})),
    roomTemp:+$("#room-temp").value||0, bulkTime:+$("#bulk-time").value||0, proofTime:+$("#proof-time").value||0,
    ovenTemp:+$("#oven-temp").value||0, bakeTime:+$("#bake-time").value||0, doughFeel:$("#dough-feel").value,
    processNotes:$("#process-notes").value.trim(), tastingNotes:$("#tasting-notes").value.trim(), rating:+$("#rating").value||0,
    hydration:hydration(), totalDough:ingredients.reduce((s,x)=>s+(+x.grams||0),0), ingredientCost:ingredientCost(), salePrice:+$("#sale-price").value||0, sold:Math.min(+$("#loaves-sold").value||0,+$("#loaves").value||1)
  }; }
  function saveDraft(){ localStorage.setItem(DRAFT,JSON.stringify(formData())); }
  function loadForm(b){
    $("#bake-id").value=b.id||""; $("#recipe-name").value=b.name||""; $("#style").value=b.style||"Country loaf"; $("#bake-date").value=b.date||today(); $("#loaves").value=b.loaves||1;
    ingredients=(b.ingredients||defaultIngredients).map(x=>({...x})); $("#room-temp").value=b.roomTemp??72; $("#bulk-time").value=b.bulkTime??4.5; $("#proof-time").value=b.proofTime??12;
    $("#oven-temp").value=b.ovenTemp??475; $("#bake-time").value=b.bakeTime??42; $("#dough-feel").value=b.doughFeel||"Not recorded"; $("#process-notes").value=b.processNotes||""; $("#tasting-notes").value=b.tastingNotes||""; $("#sale-price").value=b.salePrice??10; $("#loaves-sold").value=b.sold??0; setRating(b.rating||0); renderIngredients();
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
    const sold=bakes.reduce((s,x)=>s+(+x.sold||0),0), revenue=bakes.reduce((s,x)=>s+(+x.sold||0)*(+x.salePrice||0),0), cost=bakes.reduce((s,x)=>s+(+x.ingredientCost||ingredientCost(x.ingredients||[]))*Math.min(1,(+x.sold||0)/Math.max(1,+x.loaves||1)),0);
    const since=new Date(); since.setDate(since.getDate()-6); const weeklySold=bakes.filter(x=>new Date(`${x.date}T12:00:00`)>=since).reduce((s,x)=>s+(+x.sold||0),0);
    $("#biz-sold").textContent=sold; $("#biz-revenue").textContent=money(revenue); $("#biz-cost").textContent=money(cost); $("#biz-profit").textContent=money(revenue-cost); $("#biz-goal").textContent=`${Math.min(999,Math.round(weeklySold/Math.max(1,settings.weeklyGoal||20)*100))}%`;
  }
  function renderFilters(){ const current=$("#style-filter").value; const styles=[...new Set(bakes.map(x=>x.style))].sort(); $("#style-filter").innerHTML=`<option value="all">All styles</option>${styles.map(x=>`<option>${esc(x)}</option>`).join("")}`; $("#style-filter").value=styles.includes(current)?current:"all"; }
  function renderAll(){ $("#nav-count").textContent=bakes.length; renderFilters(); renderJournal(); renderCatalog(); renderProgress(); renderCosts(); }
  function go(view){
    $$(".view").forEach(x=>x.classList.toggle("active",x.id===`view-${view}`)); $$(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
    const copy={today:["FORMULA LAB","Build today’s loaf"],journal:["BAKE JOURNAL","Every loaf tells you something"],costs:["SIMPLE COSTS","Know what goes into each loaf"],progress:["PROGRESS","See the pattern emerge"],setup:["SETUP","Shape Breadbook around the work"],data:["YOUR DATA","Keep the notebook yours"]}[view]||["BREADBOOK",""]; $("#page-eyebrow").textContent=copy[0]; $("#page-title").textContent=copy[1]; $(".sidebar").classList.remove("open"); window.scrollTo({top:0,behavior:"smooth"});
  }
  function backup(){ return {app:"Breadbook",version:2,exportedAt:new Date().toISOString(),bakes,catalog,settings}; }
  function downloadBackup(){ const blob=new Blob([JSON.stringify(backup(),null,2)],{type:"application/json"}), a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`breadbook-${today()}.json`; a.click(); URL.revokeObjectURL(a.href); toast("Backup downloaded"); }
  async function writeConnectedFile(notify=true){ if(!fileHandle) return; try { const writable=await fileHandle.createWritable(); await writable.write(JSON.stringify(backup(),null,2)); await writable.close(); $("#file-status").textContent=`Connected to ${fileHandle.name}`; if(notify) toast("Connected file updated"); } catch(e){ if(notify) toast("Could not update the connected file"); } }
  async function connectFile(){ if(!window.showSaveFilePicker){ toast("Direct file connection requires Chrome or Edge"); return; } try { fileHandle=await window.showSaveFilePicker({suggestedName:"breadbook.json",types:[{description:"JSON backup",accept:{"application/json":[".json"]}}]}); await writeConnectedFile(); } catch(e){ if(e.name!=="AbortError") toast("File connection was not completed"); } }

  $("#rating-buttons").innerHTML=[1,2,3,4,5].map(n=>`<button type="button" class="rating-button" role="radio" aria-checked="false" aria-label="${n} out of 5" data-rating="${n}">★</button>`).join("");
  $("#bake-date").value=today();
  renderIngredients(); renderAll(); applySettings();
  const draft=readJSON(DRAFT,null); if(draft) loadForm(draft);

  document.addEventListener("click", e=>{
    const nav=e.target.closest("[data-view]"); if(nav) go(nav.dataset.view); const move=e.target.closest("[data-go]"); if(move) go(move.dataset.go);
    if(e.target.matches("[data-rating]")) setRating(+e.target.dataset.rating);
    if(e.target.matches("[data-remove-ing]")){ ingredients.splice(+e.target.dataset.removeIng,1); renderIngredients(); saveDraft(); }
    const edit=e.target.closest("[data-edit]"); if(edit){ const b=bakes.find(x=>x.id===edit.dataset.edit); if(b){loadForm(b); $("#save-bake").textContent="Update bake →"; go("today");} }
    const duplicate=e.target.closest("[data-duplicate]"); if(duplicate){ const b=bakes.find(x=>x.id===duplicate.dataset.duplicate); if(b){loadForm({...b,id:"",date:today(),name:`${b.name} — next try`}); go("today"); toast("Formula copied into a new bake");} }
    const del=e.target.closest("[data-delete]"); if(del && confirm("Delete this bake?")){ bakes=bakes.filter(x=>x.id!==del.dataset.delete); persist(); toast("Bake deleted"); }
    const catRemove=e.target.closest("[data-cat-remove]"); if(catRemove){ catalog.splice(+catRemove.dataset.catRemove,1); persistCatalog(); }
    const mode=e.target.closest("[data-mode]"); if(mode){ const modes={journal:{costs:false,sales:false,progress:false},costs:{costs:true,sales:false,progress:true},business:{costs:true,sales:true,progress:true}}; settings={...settings,...modes[mode.dataset.mode]}; persistSettings(); toast(`${mode.querySelector("strong").textContent} mode selected`); }
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
  $("#sale-price").addEventListener("input",renderCosts); $("#loaves-sold").addEventListener("input",renderSalePreview);
  $("#preset").onchange=e=>{ const p=presets[e.target.value]; if(p){$("#recipe-name").value=p.name;$("#style").value=p.style;ingredients=p.ingredients.map(x=>({...x}));renderIngredients();saveDraft();} };
  $("#bake-form").addEventListener("input",()=>{clearTimeout(saveDraft.timer);saveDraft.timer=setTimeout(saveDraft,250)});
  $("#bake-form").onsubmit=e=>{e.preventDefault(); const b=formData(), idx=bakes.findIndex(x=>x.id===b.id); if(idx>=0)bakes[idx]={...bakes[idx],...b};else bakes.push(b); persist(); clearForm(); toast(idx>=0?"Bake updated":"Bake saved to the journal"); go("journal");};
  $("#clear-form").onclick=clearForm; $("#new-bake").onclick=()=>{clearForm();go("today")};
  $("#catalog-list").addEventListener("change",e=>{ const i=e.target.dataset.catName??e.target.dataset.catPrice??e.target.dataset.catAmount??e.target.dataset.catUnit; if(i===undefined)return; if(e.target.dataset.catName!==undefined)catalog[i].name=e.target.value; if(e.target.dataset.catPrice!==undefined)catalog[i].price=+e.target.value||0; if(e.target.dataset.catAmount!==undefined)catalog[i].amount=+e.target.value||0; if(e.target.dataset.catUnit!==undefined)catalog[i].unit=e.target.value; persistCatalog(); });
  $("#add-cost-item").onclick=()=>{catalog.push({id:uid(),name:"New ingredient",price:0,amount:1,unit:"lb"});persistCatalog();};
  $("#quick-cost-add").onclick=()=>{ const raw=$("#quick-cost").value.trim(), match=raw.match(/^(.+?)[,–—-]\s*\$?([\d.]+)\s+(?:for\s+)?([\d.]+)\s*(g|kg|oz|lb)$/i); if(!match){toast("Try: Bread flour, $6.49 for 5 lb");return;} const item={id:uid(),name:match[1].trim(),price:+match[2],amount:+match[3],unit:match[4].toLowerCase()}, existing=catalog.findIndex(x=>x.name.toLowerCase()===item.name.toLowerCase()); if(existing>=0)catalog[existing]={...catalog[existing],...item,id:catalog[existing].id};else catalog.push(item); $("#quick-cost").value="";persistCatalog();toast(`${item.name} price saved`);};
  $("#quick-cost").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$("#quick-cost-add").click();}});
  [["toggle-costs","costs"],["toggle-sales","sales"],["toggle-progress","progress"]].forEach(([id,key])=>$("#"+id).onchange=e=>{settings[key]=e.target.checked;if(key==="costs"&&!settings.costs)settings.sales=false;persistSettings();});
  $("#weekly-goal").onchange=e=>{settings.weeklyGoal=Math.max(1,+e.target.value||20);persistSettings();};
  $("#search").oninput=renderJournal; $("#style-filter").onchange=renderJournal; $("#export-data").onclick=downloadBackup; $("#connect-file").onclick=connectFile;
  $("#import-trigger").onclick=()=>$("#import-data").click(); $("#import-data").onchange=async e=>{ const file=e.target.files[0]; if(!file)return; try{ const data=JSON.parse(await file.text()); if(!Array.isArray(data.bakes))throw new Error(); const map=new Map(bakes.map(x=>[x.id,x])); data.bakes.forEach(x=>map.set(x.id||uid(),x)); bakes=[...map.values()]; if(Array.isArray(data.catalog)){catalog=data.catalog;localStorage.setItem(CATALOG,JSON.stringify(catalog));} if(data.settings){settings={...settings,...data.settings};localStorage.setItem(SETTINGS,JSON.stringify(settings));} persist();applySettings();toast(`${data.bakes.length} bake records imported`);go("journal"); }catch{toast("That file is not a valid Breadbook backup");} e.target.value=""; };
  $("#reset-data").onclick=()=>$("#confirm-dialog").showModal(); $("#cancel-reset").onclick=()=>$("#confirm-dialog").close(); $("#confirm-reset").onclick=()=>{bakes=[];catalog=defaultCatalog.map(x=>({...x}));settings={costs:true,sales:false,progress:true,weeklyGoal:20};[STORE,DRAFT,CATALOG,SETTINGS].forEach(key=>localStorage.removeItem(key));$("#confirm-dialog").close();clearForm();renderAll();applySettings();toast("Local Breadbook data erased");};
  $(".mobile-menu").onclick=()=>$(".sidebar").classList.toggle("open");

  if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  const context=document.modelContext;
  if(context?.registerTool){
    const register=tool=>Promise.resolve(context.registerTool(tool)).catch(()=>{});
    register({name:"list_bakes",title:"List bread bakes",description:"Return the saved bread journal entries on this device.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({count:bakes.length,bakes})});
    register({name:"create_bake",title:"Record bread bake",description:"Create a bread-baking journal entry and update the visible journal.",inputSchema:{type:"object",properties:{name:{type:"string"},style:{type:"string"},date:{type:"string"},rating:{type:"number",minimum:0,maximum:5},notes:{type:"string"}},required:["name","style","date"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{ if(!input||typeof input.name!=="string"||!/\d{4}-\d{2}-\d{2}/.test(input.date))throw new Error("A name, style, and YYYY-MM-DD date are required."); const b={...formData(),id:uid(),name:input.name,style:input.style,date:input.date,rating:+input.rating||0,tastingNotes:input.notes||""}; bakes.push(b);persist();go("journal");return{id:b.id,status:"saved"}; }});
  }
})();
