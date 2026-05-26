const CROPS=[
{id:'carrot',name:'Carrot',tier:'T1',apiItem:'T1_CARROT',apiSeed:'T1_CARROT_SEED',yield:9,lp:134,waterBonus:2,emoji:'🥕',defaultSeed:2308},
{id:'bean',name:'Bean',tier:'T2',apiItem:'T2_BEAN',apiSeed:'T2_BEAN_SEED',yield:9,lp:179,waterBonus:2,emoji:'🫘',defaultSeed:3462},
{id:'wheat',name:'Wheat',tier:'T3',apiItem:'T3_WHEAT',apiSeed:'T3_WHEAT_SEED',yield:9,lp:179,waterBonus:2,emoji:'🌾',defaultSeed:5770},
{id:'turnip',name:'Turnip',tier:'T4',apiItem:'T4_TURNIP',apiSeed:'T4_TURNIP_SEED',yield:9,lp:179,waterBonus:2,emoji:'🫛',defaultSeed:8655},
{id:'cabbage',name:'Cabbage',tier:'T5',apiItem:'T5_CABBAGE',apiSeed:'T5_CABBAGE_SEED',yield:9,lp:179,waterBonus:2,emoji:'🥬',defaultSeed:11540},
{id:'potato',name:'Potato',tier:'T6',apiItem:'T6_POTATO',apiSeed:'T6_POTATO_SEED',yield:9,lp:179,waterBonus:2,emoji:'🥔',defaultSeed:17310},
{id:'corn',name:'Corn',tier:'T7',apiItem:'T7_CORN',apiSeed:'T7_CORN_SEED',yield:9,lp:179,waterBonus:2,emoji:'🌽',defaultSeed:25965},
{id:'pumpkin',name:'Pumpkin',tier:'T8',apiItem:'T8_PUMPKIN',apiSeed:'T8_PUMPKIN_SEED',yield:10,lp:142,waterBonus:0.1333,emoji:'🎃',defaultSeed:34620}];
const CITIES=['Martlock','Lymhurst','Bridgewatch','Fort Sterling','Thetford','Caerleon'];
// API dùng underscore cho Fort_Sterling
const API_CITIES=['Martlock','Lymhurst','Bridgewatch','Fort_Sterling','Thetford','Caerleon'];
const API_SERVERS={east:'https://east.albion-online-data.com',west:'https://west.albion-online-data.com',europe:'https://europe.albion-online-data.com'};
const SERVER_LABELS={east:'🌏 Asia East',west:'🌎 Americas West',europe:'🌍 Europe'};
let prices={},islands=[],sortField='profit',sortDir=-1,profitChart=null,historyChart=null;

function getApiBase(){const sel=document.getElementById('apiServer');return API_SERVERS[sel?sel.value:'east']}
function onServerChange(){const sel=document.getElementById('apiServer');localStorage.setItem('albion_server',sel.value);document.getElementById('serverBadge').textContent=SERVER_LABELS[sel.value]||sel.value;showToast(`Server: ${SERVER_LABELS[sel.value]}. Bấm Cập nhật giá để fetch.`,'info')}

// Migration: crop ID cũ → mới (v1 dùng sai tier mapping)
function migrateOldCrops(){
if(localStorage.getItem('albion_crop_migrated'))return;
const s=localStorage.getItem('albion_islands');if(!s)return;
const islands=JSON.parse(s);
const map={potato:'turnip',corn:'potato',pumpkin:'corn'};
const migrated=islands.map(isl=>({...isl,crop:map[isl.crop]||isl.crop}));
localStorage.setItem('albion_islands',JSON.stringify(migrated));
localStorage.setItem('albion_crop_migrated','1');
}
function init(){migrateOldCrops();loadData();renderPriceTable();renderIslands();recalcAll();renderHistory();
if(localStorage.getItem('albion_theme')==='light'){document.documentElement.dataset.theme='light';document.getElementById('themeBtn').textContent='☀️';}
const lf=localStorage.getItem('albion_lastFetch');if(lf)document.getElementById('lastFetch').textContent='⏱ '+lf;
const sv=localStorage.getItem('albion_server')||'east';const sel=document.getElementById('apiServer');if(sel)sel.value=sv;
const badge=document.getElementById('serverBadge');if(badge)badge.textContent=SERVER_LABELS[sv]||sv;
const sm=localStorage.getItem('albion_sellMode')||'sell';const smEl=document.getElementById('sellMode');if(smEl)smEl.value=sm;}
function loadData(){
const s=localStorage.getItem('albion_prices');
if(s)prices=JSON.parse(s);else{prices={};CROPS.forEach(c=>{prices[c.id]={seed:0,yield:c.yield,lp:c.lp,cities:{},quickSell:{}};CITIES.forEach(ci=>{prices[c.id].cities[ci]=0;prices[c.id].quickSell[ci]=0})});}
CROPS.forEach(c=>{if(!prices[c.id])prices[c.id]={seed:0,yield:c.yield,lp:c.lp,cities:{},quickSell:{}};if(!prices[c.id].cities)prices[c.id].cities={};if(!prices[c.id].quickSell)prices[c.id].quickSell={};if(prices[c.id].yield===undefined)prices[c.id].yield=c.yield;if(prices[c.id].lp===undefined)prices[c.id].lp=c.lp;CITIES.forEach(ci=>{if(prices[c.id].cities[ci]===undefined)prices[c.id].cities[ci]=0;if(prices[c.id].quickSell[ci]===undefined)prices[c.id].quickSell[ci]=0})});
const si=localStorage.getItem('albion_islands');islands=si?JSON.parse(si):[];}
function savePrices(){localStorage.setItem('albion_prices',JSON.stringify(prices))}
function saveIslands(){localStorage.setItem('albion_islands',JSON.stringify(islands))}
function fmt(n){return(n==null||isNaN(n))?'0':n.toLocaleString('en-US')}
function fmtC(n){if(n==null||isNaN(n))return'0';const a=Math.abs(n);if(a>=1e9)return(n/1e9).toFixed(1)+'B';if(a>=1e6)return(n/1e6).toFixed(1)+'M';if(a>=1e3)return(n/1e3).toFixed(1)+'K';return n.toLocaleString('en-US')}
function isPremium(){const el=document.getElementById('hasPremium');return el?el.checked:true}
function getSellMode(){const el=document.getElementById('sellMode');return el?el.value:'sell'}
// Lấy giá bán theo mode: sell order hoặc quick sell
function getCityPrice(p,city){return getSellMode()==='quick'?(p.quickSell[city]||0):(p.cities[city]||0)}
function getYield(p){return p.yield}
function calcIsland(isl){const c=CROPS.find(x=>x.id===isl.crop),p=prices[isl.crop],y=getYield(p),tp=isl.farms*9,tc=tp*y,sp=getCityPrice(p,isl.city),rev=tc*sp,sc=tp*p.seed,net=rev-sc,rentPct=isl.rent||0,rentCost=Math.round(net*rentPct/100),profit=net-rentCost;return{crop:c,p,totalPlots:tp,totalCrops:tc,sellPrice:sp,revenue:rev,seedCost:sc,netBeforeRent:net,rentPct,rentCost,profit}}
function calcCropProfit(cropId,city,farms){const p=prices[cropId],y=getYield(p),tp=farms*9,tc=tp*y,sp=getCityPrice(p,city);return{revenue:tc*sp,seedCost:tp*p.seed,profit:tc*sp-tp*p.seed,totalCrops:tc}}
function onSellModeChange(){localStorage.setItem('albion_sellMode',getSellMode());renderIslands();recalcAll();showToast(getSellMode()==='quick'?'💨 Quick Sell (bán ngay)':'📋 Sell Order (đặt lệnh)','info')}

// === PRICE TABLE ===
function renderPriceTable(){const tb=document.getElementById('priceBody');tb.innerHTML='';CROPS.forEach(c=>{const p=prices[c.id],tr=document.createElement('tr');tr.innerHTML=`<td><strong>${c.emoji} ${c.tier} ${c.name}</strong></td><td><input type="number" value="${p.seed}" min="0" onchange="updatePrice('${c.id}','seed',this.value)"></td><td><input type="number" value="${p.yield}" min="1" onchange="updatePrice('${c.id}','yield',this.value)"></td><td><input type="number" value="${p.lp}" min="0" onchange="updatePrice('${c.id}','lp',this.value)"></td>${CITIES.map(ci=>`<td><div style="display:flex;flex-direction:column;gap:2px"><input type="number" value="${p.cities[ci]}" min="0" onchange="updateCityPrice('${c.id}','${ci}',this.value,'sell')" title="Sell Order" style="border-color:rgba(74,222,128,.3)"><input type="number" value="${p.quickSell[ci]}" min="0" onchange="updateCityPrice('${c.id}','${ci}',this.value,'quick')" title="Quick Sell" style="border-color:rgba(248,113,113,.3);font-size:.7rem"></div></td>`).join('')}`;tb.appendChild(tr)})}
function updatePrice(id,f,v){prices[id][f]=parseInt(v)||0;savePrices();renderIslands();recalcAll()}
function updateCityPrice(id,ci,v,mode){if(mode==='quick'){prices[id].quickSell[ci]=parseInt(v)||0}else{prices[id].cities[ci]=parseInt(v)||0}savePrices();renderIslands();recalcAll()}

// === ISLANDS ===
function addIsland(){const idx=islands.length;islands.push({name:`Đảo ${idx+1}`,city:CITIES[0],crop:CROPS[0].id,farms:5,rent:0});saveIslands();renderIslands();recalcAll();editIsland(idx)}
function removeIsland(i){islands.splice(i,1);saveIslands();renderIslands();recalcAll()}
function editIsland(i){const isl=islands[i],rent=isl.rent||0,ov=document.createElement('div');ov.className='island-edit-overlay';ov.onclick=e=>{if(e.target===ov)ov.remove()};ov.innerHTML=`<div class="island-edit-modal"><h3>${CROPS.find(c=>c.id===isl.crop).emoji} Sửa đảo</h3><div class="input-group"><label>Tên</label><input type="text" id="editName" value="${isl.name}"></div><div class="input-group"><label>Thành phố</label><select id="editCity">${CITIES.map(c=>`<option ${c===isl.city?'selected':''}>${c}</option>`).join('')}</select></div><div class="input-group"><label>Cây</label><select id="editCrop">${CROPS.map(c=>`<option value="${c.id}" ${c.id===isl.crop?'selected':''}>${c.emoji} ${c.name}</option>`).join('')}</select></div><div class="input-group"><label>Ruộng</label><input type="number" id="editFarms" value="${isl.farms}" min="0" max="50"></div><div class="input-group"><label>Phí thuê đảo (%)</label><div style="display:flex;gap:.4rem;align-items:center"><input type="number" id="editRent" value="${rent}" min="0" max="100" style="flex:1"><span style="font-size:.7rem;color:var(--text-dim)">0 = free</span></div></div><div class="modal-actions"><button class="btn btn-ghost" onclick="this.closest('.island-edit-overlay').remove()">Hủy</button><button class="btn btn-accent" onclick="saveEdit(${i})">Lưu</button></div></div>`;document.body.appendChild(ov)}
function saveEdit(i){islands[i]={name:document.getElementById('editName').value,city:document.getElementById('editCity').value,crop:document.getElementById('editCrop').value,farms:parseInt(document.getElementById('editFarms').value)||0,rent:parseInt(document.getElementById('editRent').value)||0};saveIslands();document.querySelector('.island-edit-overlay').remove();renderIslands();recalcAll()}
let islandSortable=null;
function renderIslands(){const tb=document.getElementById('islandBody'),emp=document.getElementById('noIslands'),tw=document.getElementById('islandTableWrap');tb.innerHTML='';if(islandSortable){islandSortable.destroy();islandSortable=null}if(!islands.length){emp.style.display='block';tw.style.display='none';return}emp.style.display='none';tw.style.display='block';const data=islands.map((isl,i)=>({...calcIsland(isl),isl,idx:i})),mx=Math.max(...data.map(d=>d.profit));
data.forEach(d=>{const tr=document.createElement('tr');tr.dataset.idx=d.idx;if(d.profit===mx&&mx>0)tr.classList.add('row-highlight');const rentTd=d.rentCost>0?`<span style="color:var(--red)">-${fmtC(d.rentCost)}</span><span style="font-size:.65rem;color:var(--text-dim)"> (${d.rentPct}%)</span>`:'<span style="color:var(--green);font-size:.7rem">FREE</span>';tr.innerHTML=`<td class="drag-handle">☰</td><td><strong>${d.isl.name}</strong></td><td><span class="city-badge" data-city="${d.isl.city}">${d.isl.city}</span></td><td>${d.crop.emoji}${d.crop.tier}</td><td>${d.isl.farms}</td><td>${fmt(d.totalCrops)}</td><td>${fmt(d.sellPrice)}</td><td style="color:var(--accent)">${fmtC(d.revenue)}</td><td>${fmtC(d.seedCost)}</td><td>${rentTd}</td><td class="${d.profit>=0?'profit-positive':'profit-negative'}">${fmtC(d.profit)}</td><td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:.65rem" onclick="editIsland(${d.idx})" title="Sửa">✎</button> <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:.65rem;color:var(--red)" onclick="removeIsland(${d.idx})" title="Xoá">✕</button></td>`;tb.appendChild(tr)});
islandSortable=new Sortable(tb,{handle:'.drag-handle',animation:200,easing:'cubic-bezier(.4,0,.2,1)',ghostClass:'sortable-ghost',chosenClass:'sortable-chosen',fallbackClass:'sortable-fallback',forceFallback:false,delay:0,delayOnTouchOnly:true,touchStartThreshold:3,onEnd(evt){if(evt.oldIndex===evt.newIndex)return;const item=islands.splice(evt.oldIndex,1)[0];islands.splice(evt.newIndex,0,item);saveIslands();const rows=tb.querySelectorAll('tr');if(rows[evt.newIndex]){rows[evt.newIndex].classList.add('drop-flash');setTimeout(()=>rows[evt.newIndex].classList.remove('drop-flash'),400)}showToast('✔ Đã lưu thứ tự','info');renderIslands();recalcAll()}})}
function sortIslands(f){if(sortField===f)sortDir*=-1;else{sortField=f;sortDir=-1}renderIslands()}

// === RECALC ===
let historyFilterDays=0; // 0=all, 7, 30
function getFilteredHistory(){
const h=getHistory();if(!historyFilterDays)return h;
const cutoff=new Date();cutoff.setDate(cutoff.getDate()-historyFilterDays);
const cs=cutoff.toISOString().slice(0,10);
return h.filter(r=>r.date>=cs);
}
function setHistoryFilter(days){historyFilterDays=days;
['hf7','hf30','hf0'].forEach(id=>{const b=document.getElementById(id);if(b)b.style.opacity=(id==='hf'+days)?'1':'.5'});
renderHistory();recalcAll();}

function recalcAll(){let tF=0,tR=0,tS=0;islands.forEach(isl=>{const{revenue:r,seedCost:s}=calcIsland(isl);tF+=isl.farms;tR+=r;tS+=s});
const lp=parseInt(document.getElementById('lpPerDay').value)||0;let tSS=0;const wd=document.getElementById('wateringResults');wd.innerHTML='';const cu={};islands.forEach(isl=>{if(!cu[isl.crop])cu[isl.crop]={tp:0};cu[isl.crop].tp+=isl.farms*9});
Object.entries(cu).forEach(([id,u])=>{const c=CROPS.find(x=>x.id===id),p=prices[id],lpP=p.lp||c.lp,pw=lpP>0?Math.floor(lp/lpP):0,ew=Math.min(pw,u.tp),wb=c.waterBonus||2,ss=Math.round(ew*wb*p.seed);tSS+=ss;const it=document.createElement('div');it.className='water-item';it.innerHTML=`<div class="crop-name">${c.emoji} ${c.tier} ${c.name}</div><div class="water-val">${fmt(ew)} ô</div><div class="water-sub">Tiết kiệm: ${fmtC(ss)} (×${wb})</div><div class="water-sub">LP/ô: ${lpP} · Tổng: ${u.tp}</div>`;wd.appendChild(it)});
if(!Object.keys(cu).length)wd.innerHTML='<div class="water-item"><div class="crop-name">Chưa có đảo</div></div>';
animV('totalFarms',tF,false);animV('totalRevenue',tR);animV('totalSeedSaving',tSS);

// Profit thực tế từ history
const fh=getFilteredHistory();
let avgDaily=0;
if(fh.length>0){
const totalHist=fh.reduce((s,r)=>s+r.profit,0);
avgDaily=Math.round(totalHist/fh.length);
const sub=document.getElementById('avgDailyProfitSub');
if(sub)sub.textContent=`TB ${fh.length} ngày ghi`;
}else{
const sub=document.getElementById('avgDailyProfitSub');
if(sub)sub.textContent='chưa có lịch sử';
}
animV('avgDailyProfit',avgDaily);animV('headerProfit',avgDaily);animV('monthlyProfit',avgDaily*30);

// Premium ROI — dùng profit thực tế
const pp=parseInt(document.getElementById('premiumPrice').value)||0;
const pd=parseInt(document.getElementById('premiumDays').value)||0;
const dailyForROI=avgDaily>0?avgDaily:(tR-tS+tSS);
const rd=document.getElementById('roiDays'),rb=document.getElementById('roiBadge');
if(dailyForROI<=0){rd.textContent='∞';rd.className='card-value red';rb.textContent='Không đủ profit';rb.className='badge badge-red'}else{const d=Math.ceil(pp/dailyForROI);rd.textContent=d+' ngày';rd.className='card-value '+(d<=pd?'green':'red');rb.textContent=d<=pd?'✓ Hoàn vốn':'✕ Thiếu '+(d-pd)+' ngày';rb.className='badge badge-'+(d<=pd?'green':'red')}
// Premium progress bar — tổng tích lũy TẤT CẢ history
const allHist=getHistory();
let totalAccum=0;allHist.forEach(h=>totalAccum+=h.profit);
document.getElementById('premAccum').textContent=fmtC(totalAccum);
document.getElementById('premTarget').textContent=fmtC(pp);
const pct=pp>0?Math.min(100,totalAccum/pp*100):0;
document.getElementById('premBar').style.width=pct+'%';
document.getElementById('premPct').textContent=pct.toFixed(1)+'%';
updateChart()}

function animV(id,target,silver=true){const el=document.getElementById(id);if(!el)return;const cur=parseInt(el.dataset.val||'0');if(cur===target)return;el.dataset.val=target;el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),500);const dur=400,st=performance.now();function step(now){const p=Math.min((now-st)/dur,1),e=1-Math.pow(1-p,3),v=Math.round(cur+(target-cur)*e);el.textContent=silver?fmtC(v):v.toLocaleString();if(p<1)requestAnimationFrame(step)}requestAnimationFrame(step)}

// === CHART ===
function updateChart(){const cv=document.getElementById('profitChart');if(!cv)return;const cp={};CITIES.forEach(c=>cp[c]=0);islands.forEach(isl=>{cp[isl.city]=(cp[isl.city]||0)+calcIsland(isl).profit});const d=CITIES.map(c=>cp[c]),cols=['rgba(59,130,246,.8)','rgba(74,222,128,.8)','rgba(251,191,36,.8)','rgba(148,163,184,.8)','rgba(168,85,247,.8)','rgba(248,113,113,.8)'];
if(profitChart){profitChart.data.datasets[0].data=d;profitChart.update('none');return}
profitChart=new Chart(cv,{type:'bar',data:{labels:CITIES,datasets:[{label:'Profit/ngày',data:d,backgroundColor:cols,borderColor:cols.map(c=>c.replace('.8)','1)')),borderWidth:1,borderRadius:6,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(26,26,46,.95)',callbacks:{label:ctx=>`${fmt(ctx.parsed.y)} silver`}}},scales:{y:{beginAtZero:true,grid:{color:'rgba(42,42,74,.4)'},ticks:{color:'#8888aa',font:{family:'JetBrains Mono',size:11},callback:v=>fmtC(v)}},x:{grid:{display:false},ticks:{color:'#8888aa',font:{family:'Inter',size:11}}}},animation:{duration:600}}})}

// === FETCH ===
// Helper: parse 1 response — lưu cả sell order (sell_price_min) và quick sell (buy_price_max)
function parseApiData(data,onlyFillEmpty){let u=0;data.forEach(it=>{const apiCity=it.city,uiCity=apiCity.replace('_',' ');if(uiCity==='0')return;
const sellP=it.sell_price_min||0,quickP=it.buy_price_max||0;
const crop=CROPS.find(x=>x.apiItem===it.item_id);
if(crop){
if(sellP>0&&(!onlyFillEmpty||!prices[crop.id].cities[uiCity])){prices[crop.id].cities[uiCity]=sellP;u++}
if(quickP>0&&(!onlyFillEmpty||!prices[crop.id].quickSell[uiCity])){prices[crop.id].quickSell[uiCity]=quickP;u++}
}
const seedCrop=CROPS.find(x=>x.apiSeed===it.item_id);
if(seedCrop){
const sp=sellP>0?sellP:(quickP>0?quickP:0);
if(sp>0&&(!prices[seedCrop.id].seed||sp<prices[seedCrop.id].seed)){prices[seedCrop.id].seed=sp;u++}
}});return u}

async function fetchFromServer(serverKey){const base=API_SERVERS[serverKey]+'/api/v2/stats/prices';const allItems=[...CROPS.map(c=>c.apiItem),...CROPS.map(c=>c.apiSeed)].join(',');const lo=API_CITIES.join(',');const res=await fetch(`${base}/${allItems}.json?locations=${lo}&qualities=1`);if(!res.ok)return[];return res.json()}

async function fetchPrices(){const btn=document.getElementById('btnFetchPrices'),ic=document.getElementById('fetchIcon'),tx=document.getElementById('fetchText');btn.disabled=true;ic.classList.add('spinning');tx.textContent='Đang tải...';const sv=document.getElementById('apiServer').value;try{
// 1) Fetch primary server
const data=await fetchFromServer(sv);const u1=parseApiData(data,false);
// 2) Fallback: các server khác chỉ bổ sung ô còn = 0
const others=Object.keys(API_SERVERS).filter(k=>k!==sv);let u2=0;
for(const fb of others){try{const d2=await fetchFromServer(fb);u2+=parseApiData(d2,true)}catch(e){}}
savePrices();renderPriceTable();renderIslands();recalcAll();
const now=new Date().toLocaleString('vi-VN');localStorage.setItem('albion_lastFetch',now);document.getElementById('lastFetch').textContent='⏱ '+now;
const msg=u2>0?`✓ ${u1} giá [${SERVER_LABELS[sv]}] + ${u2} fallback`:`✓ ${u1} giá [${SERVER_LABELS[sv]}]`;
showToast(msg,'success')}catch(e){showToast(`✕ ${e.message}`,'error')}finally{btn.disabled=false;ic.classList.remove('spinning');tx.textContent='Cập nhật giá'}}

// === EXPORT ===
function exportResults(){if(!islands.length){showToast('Chưa có đảo','error');return}let tR=0,tS=0,tP=0;const d=new Date(),dd=String(d.getDate()).padStart(2,'0'),mm=String(d.getMonth()+1).padStart(2,'0'),yyyy=d.getFullYear();const sv=document.getElementById('apiServer').value;const lines=['=== Albion Farming Report ===',`Ngày: ${dd}/${mm}/${yyyy}`,`Server: ${SERVER_LABELS[sv]||sv}`,''];islands.forEach(isl=>{const r=calcIsland(isl);tR+=r.revenue;tS+=r.seedCost;tP+=r.profit;lines.push(`▸ ${isl.name} | ${isl.city} | ${r.crop.emoji} ${r.crop.name}`);lines.push(`  Ruộng: ${isl.farms} | SL: ${fmt(r.totalCrops)} | DT: ${fmt(r.revenue)} | Seed: ${fmt(r.seedCost)} | Profit: ${fmt(r.profit)}`);lines.push('')});lines.push('========================');lines.push(`Tổng ruộng: ${islands.reduce((a,i)=>a+i.farms,0)}`);lines.push(`Profit/ngày: ${fmt(tP)} silver`);lines.push(`Profit/tháng: ${fmt(tP*30)} silver`);lines.push('========================');const text=lines.join('\n');navigator.clipboard.writeText(text).then(()=>showToast('📋 Copied!','success')).catch(()=>{const b=new Blob([text],{type:'text/plain'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='albion-report.txt';a.click();URL.revokeObjectURL(u);showToast('📥 Downloaded!','info')})}

// === BACKUP / RESTORE ===
function backupData(){
const data={
albion_islands:localStorage.getItem('albion_islands'),
albion_prices:localStorage.getItem('albion_prices'),
albion_history:localStorage.getItem('albion_history'),
albion_server:localStorage.getItem('albion_server'),
albion_sellMode:localStorage.getItem('albion_sellMode'),
albion_theme:localStorage.getItem('albion_theme'),
albion_lastFetch:localStorage.getItem('albion_lastFetch'),
_exportDate:new Date().toISOString()
};
const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
const url=URL.createObjectURL(blob);
const a=document.createElement('a');
a.href=url;a.download=`albion-backup-${new Date().toISOString().slice(0,10)}.json`;
a.click();URL.revokeObjectURL(url);
showToast('💾 Đã tải backup!','success');
}
function restoreData(evt){
const file=evt.target.files[0];if(!file)return;
const reader=new FileReader();
reader.onload=function(e){
try{
const data=JSON.parse(e.target.result);
// Validate
if(!data.albion_islands&&!data.albion_history){showToast('File không hợp lệ','error');return}
const histCount=data.albion_history?JSON.parse(data.albion_history).length:0;
const islCount=data.albion_islands?JSON.parse(data.albion_islands).length:0;
if(!confirm(`Khôi phục: ${islCount} đảo, ${histCount} ngày lịch sử?\nDữ liệu hiện tại sẽ bị ghi đè.`))return;
Object.entries(data).forEach(([k,v])=>{if(k.startsWith('albion_')&&v!==null)localStorage.setItem(k,v)});
loadData();renderPriceTable();renderIslands();recalcAll();renderHistory();
const sv=localStorage.getItem('albion_server')||'east';
const sel=document.getElementById('apiServer');if(sel)sel.value=sv;
showToast(`✔ Đã khôi phục ${islCount} đảo + ${histCount} ngày`,'success');
}catch(er){showToast('Lỗi đọc file: '+er.message,'error')}
};
reader.readAsText(file);
evt.target.value='';
}

// === COMPARE ===
function runCompare(){const farms=parseInt(document.getElementById('cmpFarms').value)||5,city=document.getElementById('cmpCity').value,g=document.getElementById('compareGrid');g.innerHTML='';const results=CROPS.map(c=>({...c,...calcCropProfit(c.id,city,farms)}));const best=Math.max(...results.map(r=>r.profit));results.sort((a,b)=>b.profit-a.profit);results.forEach(r=>{const d=document.createElement('div');d.className=`compare-card${r.profit===best&&best>0?' best':''}`;d.innerHTML=`<div class="cc-emoji">${r.emoji}</div><div class="cc-name">${r.tier} ${r.name}</div><div class="cc-profit ${r.profit>=0?'profit-positive':'profit-negative'}">${fmtC(r.profit)}</div><div class="cc-detail">DT: ${fmtC(r.revenue)} · Seed: ${fmtC(r.seedCost)}</div>`;g.appendChild(d)})}

// === OPTIMIZE ===
function runOptimize(){const div=document.getElementById('optimizeResults');if(!islands.length){div.innerHTML='<p class="text-dim">Thêm đảo trước để tối ưu.</p>';return}let html='',totalOld=0,totalNew=0;islands.forEach((isl,i)=>{const oldP=calcIsland(isl).profit;totalOld+=oldP;let bestCrop=isl.crop,bestProfit=oldP;CROPS.forEach(c=>{const p=calcCropProfit(c.id,isl.city,isl.farms).profit;if(p>bestProfit){bestProfit=p;bestCrop=c.id}});totalNew+=bestProfit;const bc=CROPS.find(c=>c.id===bestCrop);const changed=bestCrop!==isl.crop;html+=`<div class="opt-card"><span class="opt-emoji">${bc.emoji}</span><div class="opt-info"><div class="opt-name">${isl.name} — ${isl.city}</div><div class="opt-detail">${changed?`Đổi sang ${bc.tier} ${bc.name}`:`Giữ ${bc.tier} ${bc.name}`} · ${isl.farms} ruộng</div></div>${changed?`<span class="opt-old">${fmtC(oldP)}</span>`:''}<span class="opt-profit">${fmtC(bestProfit)}</span></div>`});const diff=totalNew-totalOld;html+=`<div style="margin-top:.8rem;padding:.8rem;background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.15);border-radius:var(--radius-sm);text-align:center"><strong>Tổng hiện tại:</strong> ${fmtC(totalOld)} → <strong style="color:var(--green)">${fmtC(totalNew)}</strong> <span style="color:var(--green)">(+${fmtC(diff)}/ngày)</span></div>`;div.innerHTML=html}

// === LP SPEC ===
function runSpec(){const cur=parseInt(document.getElementById('specCurrent').value)||0,max=parseInt(document.getElementById('specMax').value)||125,farms=parseInt(document.getElementById('specFarms').value)||10;const div=document.getElementById('specResults');
// LP giảm theo spec: spec cao hơn = ít LP hơn per plot. Giả sử LP = baseLp * (1 - spec/200)
let html='<div class="spec-grid">';CROPS.forEach(c=>{const p=prices[c.id],baseLp=p.lp||c.lp;const lpCur=Math.max(1,Math.round(baseLp*(1-cur/200)));const lpMax=Math.max(1,Math.round(baseLp*(1-max/200)));const plots=farms*9;const lpNeededCur=plots*lpCur,lpNeededMax=plots*lpMax;const saveCur=plots*2*p.seed*(lpCur<baseLp?1:0);const saveMax=plots*2*p.seed;const gain=saveMax-saveCur;html+=`<div class="spec-card"><div class="sc-title">${c.emoji} ${c.tier} ${c.name}</div><div class="sc-row"><span class="label">LP/ô (spec ${cur})</span><span class="val">${lpCur}</span></div><div class="sc-row"><span class="label">LP/ô (spec ${max})</span><span class="val">${lpMax}</span></div><div class="sc-row"><span class="label">LP cần (${plots} ô)</span><span class="val">${fmt(lpNeededCur)} → ${fmt(lpNeededMax)}</span></div><div class="sc-gain">+${fmtC(gain)} silver/ngày</div></div>`});html+='</div>';div.innerHTML=html}

// === HISTORY ===
let editingDate=null;
function getHistory(){return JSON.parse(localStorage.getItem('albion_history')||'[]')}
function saveHistory(h){localStorage.setItem('albion_history',JSON.stringify(h))}

// Render form nhập thu nhập từng đảo
let entryFilterText='',entryFilterCity='',entryFilterStatus='';
function renderDailyEntryForm(){
const div=document.getElementById('dailyEntryForm');if(!div)return;
if(!islands.length){div.innerHTML='<p style="color:var(--text-dim);font-size:.8rem">Thêm đảo trước để ghi thu nhập.</p>';return}
const totalPlots=islands.reduce((s,isl)=>s+isl.farms*9,0);
const totalFarms=islands.reduce((s,isl)=>s+isl.farms,0);

// Lấy danh sách city unique
const cities=[...new Set(islands.map(i=>i.city))];
let html=`<div style="display:flex;gap:.4rem;margin-bottom:.5rem;flex-wrap:wrap;align-items:center">
<input type="text" id="entrySearch" value="${entryFilterText}" oninput="entryFilterText=this.value;rerenderEntryRows()" placeholder="🔍 Tìm tên đảo..." style="flex:1;min-width:120px;padding:.3rem .5rem;border-radius:var(--radius-sm);background:var(--bg-input);border:1px solid var(--border);color:var(--text);font-family:var(--font);font-size:.75rem">
<select id="entryCityFilter" onchange="entryFilterCity=this.value;rerenderEntryRows()" style="padding:.3rem .4rem;border-radius:var(--radius-sm);background:var(--bg-input);border:1px solid var(--border);color:var(--text);font-family:var(--font);font-size:.75rem">
<option value="">Tất cả TP</option>${cities.map(c=>`<option value="${c}"${entryFilterCity===c?' selected':''}>${c}</option>`).join('')}
</select>
<select id="entryStatusFilter" onchange="entryFilterStatus=this.value;rerenderEntryRows()" style="padding:.3rem .4rem;border-radius:var(--radius-sm);background:var(--bg-input);border:1px solid var(--border);color:var(--text);font-family:var(--font);font-size:.75rem">
<option value=""${!entryFilterStatus?' selected':''}>Tất cả</option>
<option value="filled"${entryFilterStatus==='filled'?' selected':''}>✅ Đã nhập</option>
<option value="empty"${entryFilterStatus==='empty'?' selected':''}>⬜ Chưa nhập</option>
</select>
<span style="font-size:.65rem;color:var(--text-dim)" id="entryCount"></span>
</div>
<div class="table-wrap"><table><thead><tr>
<th></th><th>Tên</th><th>TP</th><th>Cây</th><th>Ruộng</th><th>Thuê</th><th>Silver bán</th><th>Giá hạt</th><th>Phí thuê</th><th title="Đã trồng lại">🌱</th>
</tr></thead><tbody id="entryRows"></tbody></table></div>`;
div.innerHTML=html;
rerenderEntryRows();
// UI editing state
const lbl=document.getElementById('editingDateLabel');
const ltx=document.getElementById('editingDateText');
const btn=document.getElementById('btnSaveEntry');
if(editingDate){
if(lbl)lbl.style.display='block';
if(ltx)ltx.textContent=editingDate;
if(btn)btn.textContent='💾 Cập nhật '+editingDate;
}else{
if(lbl)lbl.style.display='none';
if(btn)btn.textContent='💾 Lưu ngày hôm nay';
}
updateDailyTotal();
}

let entrySortable=null;
// Lấy crop override cho entry (session) hoặc fallback về island crop
function getEntryCrop(i,islCrop){
const s=sessionStorage.getItem(`albion_entry_crop_${i}`);
return s||islCrop;
}
// Lấy farms override cho entry (session) hoặc fallback về island farms
function getEntryFarms(i,islFarms){
const s=sessionStorage.getItem(`albion_entry_farms_${i}`);
return s!==null?parseInt(s)||0:islFarms;
}
// Khi đổi crop dropdown → auto-fill giá hạt tương ứng
function onEntryCropChange(i){
const sel=document.getElementById(`entry_crop_${i}`);
if(!sel)return;
const cropId=sel.value;
sessionStorage.setItem(`albion_entry_crop_${i}`,cropId);
const crop=CROPS.find(x=>x.id===cropId);
const seedPrice=prices[cropId]?.seed||crop?.defaultSeed||0;
const seedInp=document.getElementById(`seed_${i}`);
if(seedInp)seedInp.value=seedPrice;
sessionStorage.setItem(`albion_seed_${i}`,seedPrice);
updateDailyTotal();
}
// Khi đổi farms input
function onEntryFarmsChange(i){
const inp=document.getElementById(`entry_farms_${i}`);
if(!inp)return;
sessionStorage.setItem(`albion_entry_farms_${i}`,inp.value);
updateDailyTotal();
}
function rerenderEntryRows(){
const container=document.getElementById('entryRows');if(!container)return;
if(entrySortable){entrySortable.destroy();entrySortable=null}
const ft=entryFilterText.toLowerCase();
let shown=0;
container.innerHTML='';
const totalFarms=islands.reduce((s,isl)=>s+isl.farms,0);
const totalPlots=islands.reduce((s,isl)=>s+isl.farms*9,0);
islands.forEach((isl,i)=>{
const entryCropId=getEntryCrop(i,isl.crop);
const c=CROPS.find(x=>x.id===entryCropId);
const entryFarms=getEntryFarms(i,isl.farms);
const savedVal=getDailyEntryVal(i);
const savedSeed=getEntrySeedVal(i,entryCropId);
const savedPlanted=sessionStorage.getItem(`albion_planted_${i}`)==='1';
const matchName=!ft||isl.name.toLowerCase().includes(ft)||isl.city.toLowerCase().includes(ft);
const matchCity=!entryFilterCity||isl.city===entryFilterCity;
const matchStatus=!entryFilterStatus||(entryFilterStatus==='filled'?savedVal>0:savedVal===0);
const visible=matchName&&matchCity&&matchStatus;
if(visible)shown++;
const rentTd=isl.rent>0?`<span style="color:var(--red);font-size:.7rem">-${isl.rent}%</span>`:'<span style="color:var(--green);font-size:.7rem">FREE</span>';
const tr=document.createElement('tr');
tr.className='entry-row';
if(!visible)tr.style.display='none';
tr.dataset.idx=i;
const dimRow=savedVal===0&&savedSeed===0;
if(dimRow)tr.style.opacity='.45';
// Crop dropdown
const cropOptions=CROPS.map(cr=>`<option value="${cr.id}" ${cr.id===entryCropId?'selected':''}>${cr.emoji} ${cr.tier}</option>`).join('');
tr.innerHTML=`<td class="drag-handle">☰</td><td><strong>${isl.name}</strong></td><td><span class="city-badge" data-city="${isl.city}">${isl.city}</span></td><td><select id="entry_crop_${i}" onchange="onEntryCropChange(${i})" style="padding:.2rem .3rem;border-radius:var(--radius-sm);background:var(--bg-input);border:1px solid var(--border);color:var(--text);font-size:.7rem;cursor:pointer">${cropOptions}</select></td><td><input type="number" id="entry_farms_${i}" value="${entryFarms}" min="0" max="50" onchange="onEntryFarmsChange(${i})" style="width:50px;padding:.2rem .3rem;border-radius:var(--radius-sm);background:var(--bg-input);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:.75rem;text-align:center"> <span style="font-size:.6rem;color:var(--text-dim)">(${entryFarms*9} ô)</span></td><td>${rentTd}</td><td><input type="number" id="entry_${i}" value="${savedVal}" min="0" placeholder="0" onchange="updateDailyTotal()" style="width:110px;padding:.3rem .5rem;border-radius:var(--radius-sm);background:var(--bg-input);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:.8rem;text-align:right"></td><td><input type="number" id="seed_${i}" value="${savedSeed}" min="0" placeholder="0" onchange="updateDailyTotal()" style="width:80px;padding:.3rem .4rem;border-radius:var(--radius-sm);background:var(--bg-input);border:1px solid rgba(248,113,113,.2);color:var(--text);font-family:var(--mono);font-size:.75rem;text-align:right"></td><td id="rentCalc_${i}" style="font-family:var(--mono);font-size:.75rem;white-space:nowrap">—</td><td style="text-align:center"><input type="checkbox" id="planted_${i}" ${savedPlanted?'checked':''} onchange="sessionStorage.setItem('albion_planted_${i}',this.checked?'1':'0')" style="width:16px;height:16px;accent-color:var(--green);cursor:pointer" title="Đã trồng lại"></td>`;
container.appendChild(tr);
});
entrySortable=new Sortable(container,{handle:'.drag-handle',animation:200,easing:'cubic-bezier(.4,0,.2,1)',ghostClass:'sortable-ghost',chosenClass:'sortable-chosen',fallbackClass:'sortable-fallback',forceFallback:false,delay:0,delayOnTouchOnly:true,touchStartThreshold:3,
filter:'input,select',preventOnFilter:false,
onEnd(evt){if(evt.oldIndex===evt.newIndex)return;
// Lưu values + seed + crop + farms theo thứ tự cũ trước khi reorder
const vals=islands.map((_,i)=>{const inp=document.getElementById(`entry_${i}`);return inp?parseInt(inp.value)||0:0});
const seeds=islands.map((_,i)=>{const inp=document.getElementById(`seed_${i}`);return inp?parseInt(inp.value)||0:0});
const crops=islands.map((_,i)=>{const sel=document.getElementById(`entry_crop_${i}`);return sel?sel.value:islands[i].crop});
const farms=islands.map((_,i)=>{const inp=document.getElementById(`entry_farms_${i}`);return inp?parseInt(inp.value)||0:islands[i].farms});
const planted=islands.map((_,i)=>sessionStorage.getItem(`albion_planted_${i}`)==='1'?'1':'0');
const movedVal=vals.splice(evt.oldIndex,1)[0];vals.splice(evt.newIndex,0,movedVal);
const movedSeed=seeds.splice(evt.oldIndex,1)[0];seeds.splice(evt.newIndex,0,movedSeed);
const movedCrop=crops.splice(evt.oldIndex,1)[0];crops.splice(evt.newIndex,0,movedCrop);
const movedFarms=farms.splice(evt.oldIndex,1)[0];farms.splice(evt.newIndex,0,movedFarms);
const movedP=planted.splice(evt.oldIndex,1)[0];planted.splice(evt.newIndex,0,movedP);
const item=islands.splice(evt.oldIndex,1)[0];islands.splice(evt.newIndex,0,item);saveIslands();
vals.forEach((v,i)=>sessionStorage.setItem(`albion_entry_${i}`,v));
seeds.forEach((v,i)=>sessionStorage.setItem(`albion_seed_${i}`,v));
crops.forEach((v,i)=>sessionStorage.setItem(`albion_entry_crop_${i}`,v));
farms.forEach((v,i)=>sessionStorage.setItem(`albion_entry_farms_${i}`,v));
planted.forEach((v,i)=>sessionStorage.setItem(`albion_planted_${i}`,v));
const rows=container.querySelectorAll('.entry-row');if(rows[evt.newIndex]){rows[evt.newIndex].classList.add('drop-flash');setTimeout(()=>rows[evt.newIndex].classList.remove('drop-flash'),400)}
showToast('✔ Đã lưu thứ tự','info');renderIslands();recalcAll();rerenderEntryRows();updateDailyTotal()}});
const cnt=document.getElementById('entryCount');
if(cnt)cnt.textContent=`${shown}/${islands.length}`;
}

// Lưu tạm entry vào sessionStorage
function getDailyEntryVal(i){return parseInt(sessionStorage.getItem(`albion_entry_${i}`))||0}
// Seed per island: lấy từ session hoặc auto-fill từ prices/defaultSeed
function getEntrySeedVal(i,cropId){
const s=sessionStorage.getItem(`albion_seed_${i}`);
if(s!==null)return parseInt(s)||0;
const p=prices[cropId];
if(p&&p.seed>0)return p.seed;
const crop=CROPS.find(x=>x.id===cropId);
return crop?crop.defaultSeed:0;
}
function updateDailyTotal(){
let income=0,seedCost=0,totalRent=0;
islands.forEach((isl,i)=>{
const inp=document.getElementById(`entry_${i}`);
const v=inp?parseInt(inp.value)||0:0;
sessionStorage.setItem(`albion_entry_${i}`,v);
const seedInp=document.getElementById(`seed_${i}`);
const sp=seedInp?parseInt(seedInp.value)||0:0;
sessionStorage.setItem(`albion_seed_${i}`,sp);
income+=v;
// Dùng farms từ entry form (có thể override)
const farmsInp=document.getElementById(`entry_farms_${i}`);
const entryFarms=farmsInp?parseInt(farmsInp.value)||0:isl.farms;
const islPlots=entryFarms*9;
const islSeed=islPlots*sp;
seedCost+=islSeed;
// Rent
const rentCell=document.getElementById(`rentCalc_${i}`);
// Dim row nếu cả income và seed đều = 0
const row=inp?inp.closest('tr'):null;
if(row)row.style.opacity=(v===0&&sp===0)?'.45':'1';
if(!isl.rent){
if(rentCell)rentCell.innerHTML='<span style="color:var(--text-dim)">—</span>';
return;
}
const islNet=v-islSeed;
if(islNet>0){
const rc=Math.round(islNet*isl.rent/100);
totalRent+=rc;
if(rentCell)rentCell.innerHTML=`<span style="color:var(--red)">-${fmtC(rc)}</span> <span style="font-size:.6rem;color:var(--text-dim)">(${isl.rent}%)</span>`;
}else{
if(rentCell)rentCell.innerHTML='<span style="color:var(--text-dim);font-size:.65rem">0 (lỗ)</span>';
}
});
const netProfit=income-seedCost-totalRent;
const el=document.getElementById('dailyEntryTotal');
if(el){let parts=`<span style="color:var(--green)">${fmtC(income)}</span> - <span style="color:var(--red)">${fmtC(seedCost)}</span>`;
if(totalRent>0)parts+=` - <span style="color:var(--red)">${fmtC(totalRent)} thuê</span>`;
parts+=` = <strong style="color:${netProfit>=0?'var(--green)':'var(--red)'}">${fmtC(netProfit)} silver</strong>`;
el.innerHTML=parts;}
}

function saveDailyEntry(){
if(!islands.length){showToast('Chưa có đảo','error');return}
const targetDate=editingDate||new Date().toISOString().slice(0,10);
const details=[];let income=0,seedCost=0,totalRent=0;
islands.forEach((isl,i)=>{
const inp=document.getElementById(`entry_${i}`);
const v=inp?parseInt(inp.value)||0:0;
const seedInp=document.getElementById(`seed_${i}`);
const sp=seedInp?parseInt(seedInp.value)||0:0;
// Lấy crop + farms từ entry form (có thể override)
const cropSel=document.getElementById(`entry_crop_${i}`);
const entryCropId=cropSel?cropSel.value:isl.crop;
const c=CROPS.find(x=>x.id===entryCropId);
const farmsInp=document.getElementById(`entry_farms_${i}`);
const entryFarms=farmsInp?parseInt(farmsInp.value)||0:isl.farms;
const islPlots=entryFarms*9;
const islSeed=islPlots*sp;
seedCost+=islSeed;
const plantedCb=document.getElementById(`planted_${i}`);
const isPlanted=plantedCb?plantedCb.checked:false;
details.push({name:isl.name,city:isl.city,crop:c.tier+' '+c.name,cropId:entryCropId,emoji:c.emoji,farms:entryFarms,income:v,rent:isl.rent||0,seedPrice:sp,seedCost:islSeed,planted:isPlanted});
income+=v;
});
const totalPlots=details.reduce((s,d)=>s+d.farms*9,0);
// Rent per island
details.forEach((d,i)=>{
if(!d.rent)return;
const islNet=d.income-d.seedCost;
const rc=islNet>0?Math.round(islNet*d.rent/100):0;
d.rentCost=rc;totalRent+=rc;
});
const netProfit=income-seedCost-totalRent;
if(income===0&&seedCost===0){showToast('Nhập ít nhất 1 đảo có thu nhập','error');return}
const h=getHistory();
const entry={date:targetDate,profit:netProfit,income,seedCost,totalPlots,totalRent,details};
const existing=h.findIndex(x=>x.date===targetDate);
if(existing>=0){
if(!editingDate&&!confirm(`Đã có dữ liệu ngày ${targetDate}. Ghi đè?`))return;
h[existing]=entry;
}else{
h.push(entry);h.sort((a,b)=>a.date.localeCompare(b.date));
}
saveHistory(h);editingDate=null;
islands.forEach((isl,i)=>{sessionStorage.removeItem(`albion_entry_${i}`);sessionStorage.removeItem(`albion_seed_${i}`);sessionStorage.removeItem(`albion_planted_${i}`);sessionStorage.removeItem(`albion_entry_crop_${i}`);sessionStorage.removeItem(`albion_entry_farms_${i}`)});
renderHistory();
showToast(`💾 ${fmtC(netProfit)} silver → ${targetDate}`,'success');
recalcAll();
}

function editHistoryEntry(idx){
const h=getHistory();if(idx<0||idx>=h.length)return;
const r=h[idx];editingDate=r.date;
// Clear trước, đảo nào không có trong details sẽ = 0
islands.forEach((isl,i)=>{sessionStorage.setItem(`albion_entry_${i}`,0);sessionStorage.setItem(`albion_seed_${i}`,0);sessionStorage.setItem(`albion_planted_${i}`,'0');sessionStorage.removeItem(`albion_entry_crop_${i}`);sessionStorage.removeItem(`albion_entry_farms_${i}`)});
if(r.details)r.details.forEach(d=>{
const i=islands.findIndex(isl=>isl.name===d.name&&isl.city===d.city);
if(i>=0){
sessionStorage.setItem(`albion_entry_${i}`,d.income||d.profit||0);
sessionStorage.setItem(`albion_seed_${i}`,d.seedPrice||r.seedPrice||0);
sessionStorage.setItem(`albion_planted_${i}`,d.planted?'1':'0');
// Khôi phục crop + farms từ history detail
if(d.cropId)sessionStorage.setItem(`albion_entry_crop_${i}`,d.cropId);
if(d.farms)sessionStorage.setItem(`albion_entry_farms_${i}`,d.farms);
}
});
renderDailyEntryForm();
document.getElementById('dailyEntryForm').scrollIntoView({behavior:'smooth',block:'center'});
showToast(`✏️ Đang sửa ngày ${r.date}`,'info');
}

function cancelEditHistory(){
editingDate=null;
islands.forEach((isl,i)=>{sessionStorage.removeItem(`albion_entry_${i}`);sessionStorage.removeItem(`albion_seed_${i}`);sessionStorage.removeItem(`albion_planted_${i}`);sessionStorage.removeItem(`albion_entry_crop_${i}`);sessionStorage.removeItem(`albion_entry_farms_${i}`)});
renderDailyEntryForm();
showToast('Đã hủy chỉnh sửa','info');
}

function deleteHistoryEntry(idx){
const h=getHistory();if(idx<0||idx>=h.length)return;
if(!confirm(`Xoá dữ liệu ngày ${h[idx].date}?`))return;
h.splice(idx,1);saveHistory(h);
editingDate=null;renderHistory();showToast('🗑️ Đã xoá','info');recalcAll();
}

function clearHistory(){if(!confirm('Xoá toàn bộ lịch sử?'))return;localStorage.removeItem('albion_history');editingDate=null;renderHistory();showToast('🗑️ Đã xoá','info');recalcAll()}

function renderHistory(){
renderDailyEntryForm();renderRentReport();
const allH=getHistory(),fh=getFilteredHistory(),tb=document.getElementById('historyBody'),emp=document.getElementById('noHistory'),tw=document.getElementById('historyTableWrap');
tb.innerHTML='';
// Filter info
const info=document.getElementById('historyFilterInfo');
if(info)info.textContent=historyFilterDays?`Hiện ${fh.length}/${allH.length} ngày`:`${allH.length} ngày`;
// Empty state
if(!fh.length){if(emp)emp.style.display='block';if(tw)tw.style.display='none'}
else{if(emp)emp.style.display='none';if(tw)tw.style.display='block'}
// Tính tích lũy theo thứ tự thời gian (cũ → mới)
const accumArr=[];let acc=0;
fh.forEach(r=>{acc+=r.profit;accumArr.push(acc)});
const mxProfit=fh.length?Math.max(...fh.map(r=>r.profit)):0;
// Hiển thị ngược: mới nhất lên trên
for(let ri=fh.length-1;ri>=0;ri--){
const r=fh[ri];
const accum=accumArr[ri];
const realIdx=allH.findIndex(x=>x.date===r.date);
const displayIdx=fh.length-1-ri;
const hasDetails=r.details&&r.details.length>0;
let detailHtml='';
if(hasDetails){
detailHtml=r.details.map((d,di)=>{
const inc=d.income||d.profit||0;
const plantedIcon=d.planted?'<span style="color:var(--green);font-size:.7rem" title="Đã trồng lại">✅</span>':'<span style="color:var(--red);font-size:.7rem;opacity:.4" title="Chưa trồng lại">❌</span>';
let line=`<div style="display:flex;align-items:center;gap:.4rem;padding:2px 0;font-size:.75rem">${plantedIcon}<span>${d.emoji}</span><strong style="min-width:60px">${d.name}</strong><span class="city-badge" data-city="${d.city}" style="font-size:.55rem;padding:0 4px">${d.city}</span><span style="color:var(--text-dim)">·${d.farms}F</span>`;
if(d.seedPrice>0||d.seedCost>0)line+=`<span style="font-size:.6rem;color:var(--text-dim)" title="Seed: ${fmt(d.seedPrice||0)}/hạt">🌱${fmtC(d.seedCost||0)}</span>`;
line+=`<span style="margin-left:auto;font-family:var(--mono);color:var(--green)">${fmtC(inc)}</span>`;
if(d.rent>0&&d.rentCost>0)line+=`<span style="font-family:var(--mono);font-size:.7rem;color:var(--red)">-${fmtC(d.rentCost)}</span><span style="font-size:.55rem;background:rgba(248,113,113,.12);color:var(--red);padding:0 3px;border-radius:3px">${d.rent}%</span>`;
line+=`<button class="btn btn-ghost" style="padding:0 4px;font-size:.6rem;color:var(--red);opacity:.5;margin-left:4px" onclick="removeHistoryDetail(${realIdx},${di})" title="Xóa đảo này khỏi ngày ${r.date}">✕</button>`;
return line+'</div>';
}).join('');
const totalSeedCost=r.details.reduce((s,d)=>s+(d.seedCost||0),0);
if(totalSeedCost>0){detailHtml+=`<div style="display:flex;align-items:center;gap:.4rem;padding:3px 0;margin-top:3px;border-top:1px solid var(--border);font-size:.75rem"><span>🌱</span><span style="color:var(--text-dim)">Seed</span><span style="margin-left:auto;font-family:var(--mono);color:var(--red)">-${fmtC(totalSeedCost)}</span></div>`}
else if(r.seedCost){detailHtml+=`<div style="display:flex;align-items:center;gap:.4rem;padding:3px 0;margin-top:3px;border-top:1px solid var(--border);font-size:.75rem"><span>🌱</span><span style="color:var(--text-dim)">Seed</span><span style="margin-left:auto;font-family:var(--mono);color:var(--red)">-${fmtC(r.seedCost)}</span><span style="font-size:.6rem;color:var(--text-dim)">${fmt(r.totalPlots||0)} ô × ${fmt(r.seedPrice||0)}</span></div>`}
if(r.totalRent>0){detailHtml+=`<div style="display:flex;align-items:center;gap:.4rem;padding:2px 0;font-size:.75rem"><span>🏠</span><span style="color:var(--text-dim)">Thuê</span><span style="margin-left:auto;font-family:var(--mono);color:var(--red)">-${fmtC(r.totalRent)}</span></div>`}
}else{detailHtml='<span style="color:var(--text-dim);font-size:.7rem">Không có chi tiết</span>'}
const tr=document.createElement('tr');
if(r.profit===mxProfit&&mxProfit>0&&fh.length>1)tr.classList.add('row-highlight');
const profitBadge=r.profit>=0?`<span style="font-family:var(--mono);font-weight:600;color:var(--green)">+${fmtC(r.profit)}</span>`:`<span style="font-family:var(--mono);font-weight:600;color:var(--red)">${fmtC(r.profit)}</span>`;
tr.innerHTML=`<td><span class="city-badge" style="background:rgba(34,211,238,.1);color:var(--cyan);font-size:.7rem;padding:2px 6px">${r.date}</span></td><td><div id="detail_${displayIdx}" style="display:none;padding:.4rem .5rem;margin-top:.3rem;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm)">${detailHtml}</div><button class="btn btn-ghost" style="padding:2px 6px;font-size:.65rem" onclick="toggleDetail(${displayIdx})">${hasDetails?`📋 ${r.details.length} đảo`:'—'}</button></td><td>${profitBadge}</td><td style="font-family:var(--mono);font-size:.8rem;color:${accum>=0?'var(--accent)':'var(--red)'}">${fmtC(accum)}</td><td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:.65rem" onclick="editHistoryEntry(${realIdx})" title="Sửa">✎</button> <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:.65rem;color:var(--red)" onclick="deleteHistoryEntry(${realIdx})" title="Xoá">✕</button></td>`;
tb.appendChild(tr);
};
// Chart
const cv=document.getElementById('historyChart');if(!cv)return;
if(!fh.length){if(historyChart){historyChart.destroy();historyChart=null}return}
if(historyChart){historyChart.data.labels=fh.map(r=>r.date);historyChart.data.datasets[0].data=fh.map(r=>r.profit);historyChart.update('none');return}
historyChart=new Chart(cv,{type:'line',data:{labels:fh.map(r=>r.date),datasets:[{label:'Profit/ngày',data:fh.map(r=>r.profit),borderColor:'rgba(74,222,128,.8)',backgroundColor:'rgba(74,222,128,.1)',fill:true,tension:.3,pointRadius:4,pointBackgroundColor:'#4ade80'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'rgba(42,42,74,.4)'},ticks:{color:'#8888aa',font:{family:'JetBrains Mono',size:11},callback:v=>fmtC(v)}},x:{grid:{display:false},ticks:{color:'#8888aa',font:{family:'Inter',size:10}}}},animation:{duration:600}}})
}
function toggleDetail(idx){const el=document.getElementById(`detail_${idx}`);if(el)el.style.display=el.style.display==='none'?'block':'none'}

function removeHistoryDetail(historyIdx,detailIdx){
const h=getHistory();if(historyIdx<0||historyIdx>=h.length)return;
const r=h[historyIdx];
if(!r.details||detailIdx<0||detailIdx>=r.details.length)return;
const d=r.details[detailIdx];
if(!confirm(`Xóa ${d.name} (${d.city}) khỏi ngày ${r.date}?`))return;
r.details.splice(detailIdx,1);
// Nếu hết detail → xóa luôn entry
if(!r.details.length){h.splice(historyIdx,1);saveHistory(h);renderHistory();showToast('🗑️ Đã xóa ngày '+r.date,'info');recalcAll();return}
// Tính lại totals
let income=0,seedCost=0,totalRent=0,totalPlots=0;
r.details.forEach(dd=>{
income+=(dd.income||dd.profit||0);
seedCost+=(dd.seedCost||0);
totalPlots+=(dd.farms||0)*9;
if(dd.rent>0){
const net=(dd.income||0)-(dd.seedCost||0);
const rc=net>0?Math.round(net*dd.rent/100):0;
dd.rentCost=rc;totalRent+=rc;
}
});
r.income=income;r.seedCost=seedCost;r.totalPlots=totalPlots;r.totalRent=totalRent;
r.profit=income-seedCost-totalRent;
saveHistory(h);renderHistory();
showToast(`✔ Đã xóa ${d.name} khỏi ${r.date}`,'info');recalcAll();
}

// === RENT REPORT ===
function getRentPeriodHistory(){
const sel=document.getElementById('rentReportPeriod');
const mode=sel?sel.value:'month';
const h=getHistory();if(!h.length)return{entries:[],from:'',to:''};
const today=new Date();let cutoff;
if(mode==='month'){cutoff=new Date(today.getFullYear(),today.getMonth(),1)}
else if(mode==='7'||mode==='30'){cutoff=new Date();cutoff.setDate(cutoff.getDate()-parseInt(mode))}
else{return{entries:h,from:h[0].date,to:h[h.length-1].date}}
const cs=cutoff.toISOString().slice(0,10);
const filtered=h.filter(r=>r.date>=cs);
return{entries:filtered,from:cs,to:today.toISOString().slice(0,10)};
}

function calcRentReport(){
const{entries,from,to}=getRentPeriodHistory();
const map={};
entries.forEach(r=>{
if(!r.details)return;
r.details.forEach(d=>{
if(!map[d.name])map[d.name]={name:d.name,islands:new Set(),farms:0,income:0,rentCost:0,rent:d.rent||0,days:new Set()};
const m=map[d.name];
m.islands.add(d.city);
m.farms+=d.farms||0;
m.income+=(d.income||d.profit||0);
m.rentCost+=(d.rentCost||0);
if(d.rent>0)m.rent=d.rent;
m.days.add(r.date);
});
});
// Flatten sets
const result=Object.values(map).map(m=>({
name:m.name,
islandCount:m.islands.size,
totalFarms:m.farms,
income:m.income,
rentCost:m.rentCost,
rentPct:m.rent,
days:m.days.size,
avgPerDay:m.days.size>0?Math.round(m.rentCost/m.days.size):0
}));
result.sort((a,b)=>b.rentCost-a.rentCost);
return{tenants:result,from,to,totalDays:entries.length};
}

function renderRentReport(){
const{tenants,from,to,totalDays}=calcRentReport();
const tb=document.getElementById('rentBody'),ft=document.getElementById('rentFoot');
const emp=document.getElementById('noRent'),tw=document.getElementById('rentTableWrap');
const info=document.getElementById('rentReportInfo');
if(info)info.textContent=from&&to?`Kỳ: ${from} — ${to} · ${totalDays} ngày ghi`:'';
// Chỉ hiện tenants có rent > 0 hoặc có data
if(!tenants.length){emp.style.display='block';tw.style.display='none';return}
emp.style.display='none';tw.style.display='block';
tb.innerHTML='';ft.innerHTML='';
let totalRent=0,totalIncome=0;
tenants.forEach(t=>{
totalRent+=t.rentCost;totalIncome+=t.income;
const tr=document.createElement('tr');
if(t.rentCost>0)tr.style.background='rgba(248,113,113,.04)';
const rentTd=t.rentCost>0
?`<span style="font-family:var(--mono);font-weight:700;color:var(--red)">${fmtC(t.rentCost)}</span>`
:'<span class="city-badge" style="background:rgba(74,222,128,.1);color:var(--green);font-size:.65rem;padding:1px 6px">FREE</span>';
const pctTd=t.rentPct>0
?`<span style="font-size:.7rem;background:rgba(248,113,113,.12);color:var(--red);padding:1px 5px;border-radius:4px">${t.rentPct}%</span>`
:'<span style="font-size:.7rem;color:var(--green)">0%</span>';
tr.innerHTML=`<td><strong>${t.name}</strong></td><td style="font-size:.75rem">${t.islandCount} đảo</td><td style="font-family:var(--mono);font-size:.8rem">${t.totalFarms}</td><td style="font-family:var(--mono);font-size:.8rem;color:var(--accent)">${fmtC(t.income)}</td><td>${rentTd}</td><td>${pctTd}</td><td style="font-family:var(--mono);font-size:.75rem;color:var(--text-dim)">${fmtC(t.avgPerDay)}/d</td>`;
tb.appendChild(tr);
});
// Footer tổng
const tfr=document.createElement('tr');
tfr.style.cssText='border-top:2px solid var(--border);background:rgba(240,192,64,.04)';
tfr.innerHTML=`<td><strong>Tổng</strong></td><td></td><td></td><td style="font-family:var(--mono);font-weight:600;color:var(--accent)">${fmtC(totalIncome)}</td><td style="font-family:var(--mono);font-weight:800;color:var(--red)">${fmtC(totalRent)}</td><td></td><td></td>`;
ft.appendChild(tfr);
}

function copyRentReport(){
const{tenants,from,to}=calcRentReport();
if(!tenants.length){showToast('Không có dữ liệu thuê','error');return}
const lines=['=== BÁO CÁO TIỀN THUÊ ===',`Kỳ: ${from} — ${to}`,'──────────────────────────'];
tenants.forEach(t=>{
if(t.rentCost>0)lines.push(`${t.name.padEnd(8)}: ${fmt(t.rentCost)} silver (${t.islandCount} đảo, ${t.rentPct}%)`);
else lines.push(`${t.name.padEnd(8)}: FREE (${t.islandCount} đảo)`);
});
const total=tenants.reduce((s,t)=>s+t.rentCost,0);
lines.push('──────────────────────────',`Tổng   : ${fmt(total)} silver`,'==========================');
const text=lines.join('\n');
navigator.clipboard.writeText(text).then(()=>showToast('📋 Copied báo cáo thuê!','success')).catch(()=>showToast('Copy thất bại','error'));
}

// === THEME ===
function toggleTheme(){const t=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=t;document.getElementById('themeBtn').textContent=t==='light'?'☀️':'🌙';localStorage.setItem('albion_theme',t);
// Rebuild charts khi đổi theme
if(profitChart){profitChart.destroy();profitChart=null}if(historyChart){historyChart.destroy();historyChart=null}updateChart();renderHistory()}

// === UTILS ===
function showToast(m,t){const el=document.getElementById('toast');el.textContent=m;el.className=`toast ${t} show`;setTimeout(()=>el.classList.remove('show'),3500)}
function toggleTabMore(){const tabs=document.getElementById('tabBar'),btn=document.getElementById('tabMoreBtn');tabs.classList.toggle('expanded');btn.classList.toggle('expanded')}
function switchTab(id,btn){document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));document.getElementById(`tab-${id}`).classList.add('active');if(btn)btn.classList.add('active');
// Collapse mobile dropdown khi chọn secondary tab
const tabs=document.getElementById('tabBar');if(tabs)tabs.classList.remove('expanded');const mb=document.getElementById('tabMoreBtn');if(mb)mb.classList.remove('expanded');
if(id==='chart')setTimeout(updateChart,100);if(id==='compare')runCompare();if(id==='spec')runSpec();if(id==='islands')renderHistory()}
document.addEventListener('DOMContentLoaded',init);
