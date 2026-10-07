(function(){
  const data = Array.isArray(window.AXEL_PUBLICATIONS) ? window.AXEL_PUBLICATIONS : [];
  const $ = id => document.getElementById(id);
  const state = {search:"",category:"",nosology:"",year:"",author:"",message:"",sort:"new",limit:12};
  const esc = value => String(value || "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const normal = value => String(value || "").toLocaleLowerCase("ru-RU").replace(/ё/g,"е");
  const unique = key => [...new Set(data.map(x=>x[key]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),"ru"));
  const plural = (n,forms) => forms[(n%10===1&&n%100!==11)?0:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?1:2];
  const shortCategory = value => value.replace(/^\s+/,"").replace(/\s*\([^)]*\)/g,"").replace("ОБЩИЕ / ОБЗОРНЫЕ / ЭКСПЕРИМЕНТАЛЬНЫЕ","Общие и обзорные").replace("ТЕРМОИНГАЛЯЦИОННАЯ ТРАВМА / ОЖОГИ","Термоингаляционная травма").replace("Прочее (тезисы, формуляры и пр.)","Прочее").replace("ОНКОЛОГИЧЕСКИЕ ПАЦИЕНТЫ/ХИРУРГИЯ","Онкология и хирургия").replace("ОНКОЛОГИЯ/ХИРУРГИЯ","Онкология и хирургия").replace("КАРДИОЛОГИЯ/ХИРУРГИЯ","Кардиология и хирургия").replace("КАРДИОХИРУРГИЯ","Кардиохирургия").replace("АКУШЕРСТВО И ГИНЕКОЛОГИЯ","Акушерство и гинекология").replace("ПУЛЬМОНОЛОГИЯ","Пульмонология").replace("НЕОНАТОЛОГИЯ","Неонатология");
  const isHiddenCategory = value => shortCategory(String(value || "")) === "Общие и обзорные";
  const cleanSummary = item => item.abstract || item.conclusions || "Подробная информация представлена в карточке материала.";
  const keyMessage = item => String(item.keyMessages || "").replace(/^\s*КЛЮЧЕВАЯ\s*:\s*/i, "").trim();
  const normalizeAuthor = value => String(value || "")
    .replace(/\s+и\s+(?:др\.?|соавт\.?)\s*$/i, "")
    .replace(/\s+/g, " ")
    .replace(/^([A-ZА-ЯЁ])\s*\.\s*([A-ZА-ЯЁ])\s*\.\s*/i, "$1.$2. ")
    .trim();
  const itemAuthors = item => String(item.authors || "").split(/[,;\n]+/).map(normalizeAuthor).filter(value => value && /[A-Za-zА-Яа-яЁё]/.test(value));
  const authorValues = () => [...new Set(data.flatMap(itemAuthors))].sort((a,b)=>a.localeCompare(b,"ru"));
  const messageValues = () => [...new Set(data.map(keyMessage).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ru"));
  const addOptions = (id, values, label = value => value) => values.forEach(value=>{const option=document.createElement("option");option.value=value;option.textContent=label(value);$(id).append(option);});
  const keyMessageHtml = item => {
    const message = keyMessage(item);
    if (!message) return "";
    const warning = /не используем|не использовать/i.test(message) ? " warning" : "";
    return `<div class="key-message${warning}"><span>Ключевое сообщение</span><p>${esc(message)}</p></div>`;
  };
  const safeUrl = value => { const raw=String(value||"").trim(); if(!raw)return ""; const url=/^https?:\/\//i.test(raw)?raw:`https://${raw}`; return /^https?:\/\//i.test(url)?url:""; };

  function populateSelect(id,key){ unique(key).filter(v=>key!=="category"||!isHiddenCategory(v)).forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=key==="category"?shortCategory(v):v;$(id).append(o);}); }
  function init(){
    populateSelect("categoryFilter","category");populateSelect("nosologyFilter","nosology");populateSelect("yearFilter","year");
    addOptions("authorFilter",authorValues());
    addOptions("messageFilter",messageValues(),value=>value.length>90?`${value.slice(0,87)}…`:value);
    renderChips();bind();render();setupGate();setupPwa();
  }
  function filtered(){
    const q=normal(state.search);
    const fields=["title","authors","journal","category","nosology","workType","design","abstract","conclusions","keyMessages","audience","citation"];
    const items=data.filter(x=>(!q||fields.some(k=>normal(x[k]).includes(q)))&&(!state.category||x.category===state.category)&&(!state.nosology||x.nosology===state.nosology)&&(!state.year||String(x.year)===state.year)&&(!state.author||itemAuthors(x).some(author=>normal(author)===normal(state.author)))&&(!state.message||keyMessage(x)===state.message));
    return items.sort((a,b)=>state.sort==="title"?a.title.localeCompare(b.title,"ru"):state.sort==="old"?(Number(a.year)||0)-(Number(b.year)||0):(Number(b.year)||0)-(Number(a.year)||0));
  }
  function render(){
    const items=filtered(),shown=items.slice(0,state.limit);$("cards").innerHTML=shown.map(card).join("");$("emptyState").hidden=items.length>0;$("showMore").hidden=shown.length>=items.length;
    const active=[state.category,state.nosology,state.year,state.author,state.message].filter(Boolean).length;$("filterBadge").hidden=!active;$("filterBadge").textContent=active;document.querySelectorAll(".category-chips button").forEach(b=>b.classList.toggle("active",b.dataset.value===state.category));
    document.querySelectorAll(".open-details").forEach(b=>b.addEventListener("click",()=>openDetails(Number(b.dataset.id))));
  }
  function card(x){const href=safeUrl(x.url);const url=href?`<a href="${esc(href)}" target="_blank" rel="noopener">Открыть источник ↗</a>`:"";return `<article class="publication-card"><div class="card-top"><span class="card-year">${esc(x.year||"Год не указан")}</span><span class="card-type">${esc(x.workType||"Научный материал")}</span></div><h3>${esc(x.title)}</h3><p class="journal">${esc(x.journal)}</p>${keyMessageHtml(x)}<p class="card-summary">${esc(cleanSummary(x))}</p><div class="card-meta">${x.nosology?`<span>${esc(x.nosology)}</span>`:""}${x.patients?`<span>${esc(x.patients)}</span>`:""}</div><div class="card-actions"><button class="open-details" data-id="${x.id}">Подробнее</button>${url}</div></article>`}
  function renderChips(){const cats=unique("category").filter(category=>!isHiddenCategory(category));$("categoryChips").innerHTML=`<button class="active" data-value="">Все</button>`+cats.map(c=>`<button data-value="${esc(c)}">${esc(shortCategory(c))}</button>`).join("");$("categoryChips").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;state.category=b.dataset.value;$("categoryFilter").value=state.category;state.limit=12;render();});}
  function detailBlock(title,text,wide=false){return text?`<section class="detail-block${wide?" wide":""}"><h3>${title}</h3><p>${esc(text)}</p></section>`:"";}
  function openDetails(id){const x=data.find(i=>i.id===id);if(!x)return;const href=safeUrl(x.url);const link=href?`<a href="${esc(href)}" target="_blank" rel="noopener">Открыть публикацию ↗</a>`:"";$("detailsContent").innerHTML=`<p class="detail-kicker">${esc(shortCategory(x.category))} · ${esc(x.year)}</p><h2 id="detailsTitle">${esc(x.title)}</h2><p class="detail-journal">${esc(x.journal)}${x.authors?`<br>${esc(x.authors)}`:""}</p><div class="detail-tags">${[x.workType,x.nosology,x.patients,x.audience].filter(Boolean).map(v=>`<span>${esc(v)}</span>`).join("")}</div>${keyMessageHtml(x)}<div class="detail-grid">${detailBlock("Резюме",x.abstract,true)}${detailBlock("Дизайн",x.design)}${detailBlock("Способ введения",x.administration)}${detailBlock("Основные выводы",x.conclusions,true)}${detailBlock("Как цитировать",x.citation,true)}</div><div class="detail-footer">${link}${x.citation?`<button class="copy-citation" type="button">Скопировать цитату</button>`:""}</div>`;$("detailsModal").hidden=false;document.body.classList.add("locked");const copy=document.querySelector(".copy-citation");if(copy)copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(x.citation);copy.textContent="Скопировано ✓";}catch{copy.textContent="Не удалось скопировать";}});$("detailsClose").focus();}
  function closeDetails(){$("detailsModal").hidden=true;document.body.classList.remove("locked");}
  function bind(){
    $("searchInput").addEventListener("input",e=>{state.search=e.target.value;state.limit=12;render();});
    [["categoryFilter","category"],["nosologyFilter","nosology"],["yearFilter","year"],["authorFilter","author"],["messageFilter","message"],["sortSelect","sort"]].forEach(([id,key])=>$(id).addEventListener("change",e=>{state[key]=e.target.value;state.limit=12;render();}));
    $("filterToggle").addEventListener("click",()=>{const hidden=!$("filters").hidden;$("filters").hidden=hidden;$("filterToggle").setAttribute("aria-expanded",String(!hidden));});
    $("clearButton").addEventListener("click",()=>{Object.assign(state,{search:"",category:"",nosology:"",year:"",author:"",message:"",sort:"new",limit:12});["searchInput","categoryFilter","nosologyFilter","yearFilter","authorFilter","messageFilter"].forEach(id=>$(id).value="");$("sortSelect").value="new";render();});
    $("showMore").addEventListener("click",()=>{state.limit+=12;render();});$("detailsClose").addEventListener("click",closeDetails);$("detailsModal").addEventListener("click",e=>{if(e.target===$("detailsModal"))closeDetails();});
    document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("searchInput").focus();}if(e.key==="Escape"&&!$("detailsModal").hidden)closeDetails();});
  }
  function setupGate(){const exit=()=>location.href="https://axelpharm.ru/";if(sessionStorage.getItem("axel-med-worker")==="yes"){$("medGate").hidden=true;document.body.classList.remove("locked");return;}$("gateYes").addEventListener("click",()=>{sessionStorage.setItem("axel-med-worker","yes");$("medGate").hidden=true;document.body.classList.remove("locked");});$("gateNo").addEventListener("click",exit);$("gateClose").addEventListener("click",exit);}
  function setupPwa(){let prompt;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();prompt=e;$("installButton").hidden=false;});$("installButton").addEventListener("click",async()=>{if(!prompt)return;prompt.prompt();await prompt.userChoice;prompt=null;$("installButton").hidden=true;});if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));}
  init();
})();
