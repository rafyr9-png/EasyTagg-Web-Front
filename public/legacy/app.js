const $=id=>document.getElementById(id);
const state={clockBase:+localStorage.getItem("etd_clock")||0,clockAnchorMs:null,games:JSON.parse(localStorage.getItem("etd_games")||"[]"),activeGameId:localStorage.getItem("etd_game")||"",players:JSON.parse(localStorage.getItem("etd_players")||"[]"),tags:JSON.parse(localStorage.getItem("etd_tags")||"[]"),clock:+localStorage.getItem("etd_clock")||0,run:false,timer:null,paInHalf:+localStorage.getItem("etd_pa_half")||0,balls:+localStorage.getItem("etd_balls")||0,strikes:+localStorage.getItem("etd_strikes")||0,outs:+localStorage.getItem("etd_outs")||0,batter:localStorage.getItem("etd_batter")||"",pitcher:localStorage.getItem("etd_pitcher")||"",battingSide:localStorage.getItem("etd_side")||"away",pitch:"",zoneX:"",zoneY:"",zoneStatus:"",pending:null,detail:{contact:"",trajectory:""}};
function save(){localStorage.setItem("etd_games",JSON.stringify(state.games));localStorage.setItem("etd_game",state.activeGameId);localStorage.setItem("etd_players",JSON.stringify(state.players));localStorage.setItem("etd_tags",JSON.stringify(state.tags));localStorage.setItem("etd_clock",state.clock);localStorage.setItem("etd_balls",state.balls);localStorage.setItem("etd_strikes",state.strikes);localStorage.setItem("etd_outs",state.outs);localStorage.setItem("etd_pa_half",state.paInHalf);localStorage.setItem("etd_batter",state.batter);localStorage.setItem("etd_pitcher",state.pitcher);localStorage.setItem("etd_side",state.battingSide)}
// v2.9.10.123 PERFORMANCE: clock ticks persist only the clock value.
// Full save() remains unchanged for every real app/data mutation.
function et2910123SaveClockTick(){localStorage.setItem("etd_clock",state.clock)}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}function fmt(s){s=Math.floor(+s||0);return `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}
function etNativeElapsedMs(){
  try{
    if(window.AndroidBridge&&typeof AndroidBridge.elapsedRealtimeMs==="function") return Number(AndroidBridge.elapsedRealtimeMs());
  }catch(e){}
  return Math.round(performance.now());
}
function syncClockNow(){
  if(!state.run||state.clockAnchorMs===null)return state.clock;
  const elapsed=Math.max(0,etNativeElapsedMs()-state.clockAnchorMs);
  state.clock=Math.round((state.clockBase+(elapsed/1000))*1000)/1000;
  return state.clock;
}
function clock(){
  if(state.run){syncClockNow();return;}
  state.clockBase=Number(state.clock)||0;
  state.clockAnchorMs=etNativeElapsedMs();
  state.run=true;
  state.timer=setInterval(()=>{syncClockNow();et2910123SaveClockTick()},250);
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden){syncClockNow();save();render();}});
function game(){return state.games.find(g=>g.id===state.activeGameId)}function gt(){return state.tags.filter(t=>t.game_id===state.activeGameId)}function pl(id){return state.players.find(p=>p.id===id)}function pn(id){return pl(id)?.name||"No Player"}function hand(id,t){let p=pl(id);return p?(t=="bat"?p.bat:p.thr):""}
function openSheet(id){$("overlay").classList.remove("hidden");$(id).classList.remove("hidden")}function closeSheets(){$("overlay").classList.add("hidden");document.querySelectorAll(".sheet").forEach(s=>s.classList.add("hidden"))}
function etAppAlert(message,title="EASY TAGG"){const sheet=$("appAlertSheetV2911"),msg=$("appAlertMessageV2911"),head=$("appAlertTitleV2911");if(!sheet||!msg){return;}if(head)head.textContent=title;msg.textContent=message;openSheet("appAlertSheetV2911");}
let etAppConfirmResolveV131=null;
function etAppConfirmV131(message,{title="CONFIRM ACTION",confirmText="CONFIRM",danger=false}={}){
  const sheet=$("appConfirmSheetV131"),msg=$("appConfirmMessageV131"),head=$("appConfirmTitleV131"),ok=$("appConfirmOkV131");
  if(!sheet||!msg||!ok)return Promise.resolve(false);
  if(etAppConfirmResolveV131)etAppConfirmResolveV131(false);
  head.textContent=title;msg.textContent=message;ok.textContent=confirmText;
  sheet.classList.toggle("appConfirmDangerV131",!!danger);
  openSheet("appConfirmSheetV131");
  return new Promise(resolve=>{etAppConfirmResolveV131=resolve;});
}
function etAppConfirmFinishV131(accepted){
  if(!etAppConfirmResolveV131)return;
  const resolve=etAppConfirmResolveV131;etAppConfirmResolveV131=null;
  closeSheets();resolve(!!accepted);
}
window.addEventListener("load",()=>{
  $("appConfirmOkV131")?.addEventListener("click",()=>etAppConfirmFinishV131(true));
  $("appConfirmCancelV131")?.addEventListener("click",()=>etAppConfirmFinishV131(false));
  $("appConfirmCloseV131")?.addEventListener("click",()=>etAppConfirmFinishV131(false));
});
function clipWin(r){return ["Single","Double","Triple","HR","Out"].includes(r)?{pre:5,post:5}:{pre:5,post:3}}
function pa(r){return ["BB","HBP","K Swinging","K Looking","Single","Double","Triple","HR","Out"].includes(r)}
function needDetail(r){return ["Single","Double","Triple","HR","Out"].includes(r)}
function hit(r){return ["Single","Double","Triple","HR"].includes(r)}
function resetCount(){state.balls=0;state.strikes=0}
function autoCount(r){if(r=="Ball"){state.balls++;if(state.balls>=4)resetCount()}if(["Strike","Check Swing","Swing & Miss"].includes(r)){state.strikes++;if(state.strikes>=3){state.outs=Math.min(3,state.outs+1);resetCount()}}if(r=="Foul"&&state.strikes<2)state.strikes++;if(["BB","HBP"].includes(r))resetCount();if(["K Swinging","K Looking"].includes(r)){state.outs=Math.min(3,state.outs+1);resetCount()}if(["Out","Fielder's Choice","Sac Fly","Sac Bunt"].includes(r))state.outs=Math.min(3,state.outs+1);if(needDetail(r))resetCount();if(state.outs>=3)state.outs=0}
function bats(side=state.battingSide){return state.players.filter(p=>(p.role=="Bateador"||p.role=="Ambos")&&((p.side||"away")==side))}function advance(){let b=bats();if(!b.length)return;let i=b.findIndex(x=>x.id==state.batter);state.batter=b[(i+1+b.length)%b.length].id}
function startTag(result){clock();syncClockNow();if(!game())return etAppAlert("Create or select an activity before tagging.","ACTIVITY REQUIRED");let w=clipWin(result);state.pending={result,sec:state.clock,time:fmt(state.clock),cs:Math.max(0,state.clock-w.pre),ce:state.clock+w.post,zx:state.zoneX,zy:state.zoneY,zs:state.zoneStatus};state.detail={contact:"",trajectory:""};document.querySelectorAll("[data-contact],[data-traj]").forEach(b=>b.classList.remove("selected"));if(needDetail(result))openSheet("detailSheet");else saveTag()}

function toggleHalfInning(){
  const side=$("battingSide")?.value||state.battingSide||"away";
  const inningSelect=$("inning");
  if(side==="away"){
    state.battingSide="home";
    if($("battingSide"))$("battingSide").value="home";
  }else{
    state.battingSide="away";
    if($("battingSide"))$("battingSide").value="away";
    inningSelect.value=String(Math.min(12,Number(inningSelect.value||1)+1));
  }
  state.outs=0; state.balls=0; state.strikes=0; state.paInHalf=0;
  const first=bats(state.battingSide)[0];
  if(first)state.batter=first.id;
  save();render();
}
function maybeAdvanceInning(){
  // Cambio de entrada totalmente manual y opcional.
  // La app no pregunta ni cambia inning/lineup automáticamente.
  save();
  render();
}

function saveTag(){let g=game(),p=state.pending;if(!g||!p)return;if(needDetail(p.result)&&(!state.detail.contact||!state.detail.trajectory))return openSheet("detailSheet");let tag={tag_id:uid(),game_id:g.id,game_name:g.name,game_date:g.date,home_team:g.home,away_team:g.away,game_seconds:p.sec,game_time:p.time,clip_start_seconds:p.cs,clip_start_time:fmt(p.cs),clip_end_seconds:p.ce,clip_end_time:fmt(p.ce),inning:$("inning").value,half:$("half").value,batting_side:state.battingSide,balls_before:state.balls,strikes_before:state.strikes,outs_before:state.outs,count_before:`${state.balls}-${state.strikes}`,pitcher_id:state.pitcher,pitcher:pn(state.pitcher),pitcher_hand:hand(state.pitcher,"thr"),pitcher_pitch_number:state.pitcher?(Math.max(0,...state.tags.filter(t=>t.game_id===g.id&&t.pitcher_id==state.pitcher).map(t=>Number(t.pitcher_pitch_number)||0))+1):"",batter_id:state.batter,batter:pn(state.batter),batter_hand:hand(state.batter,"bat"),pitch_type:state.pitch,pitch_mph:$("mph").value,zone_status:p.zs,zone_x:p.zx===""?"":Math.round(p.zx),zone_y:p.zy===""?"":Math.round(p.zy),result:p.result,final_result:p.result,contact_quality:state.detail.contact||"No Contact",trajectory:state.detail.trajectory||"",spray_location:"",exit_velocity:$("exitVelo").value,note:$("note").value,created_at:new Date().toISOString()};state.tags.push(tag);autoCount(p.result);if(pa(p.result)){state.paInHalf++;advance();maybeAdvanceInning()}state.pending=null;["mph","exitVelo","note"].forEach(id=>$(id).value="");if(window.AndroidBridge)AndroidBridge.vibrateShort();save();closeSheets();render()}
function render(){renderGames();renderInnings();renderPlayers();renderTop();renderZone();renderHistory();renderCsv()}
function renderGames(){let s=$("gameSelect");s.innerHTML=state.games.length?"":"<option>No activities</option>";state.games.forEach(g=>s.innerHTML+=`<option value="${g.id}" ${g.id==state.activeGameId?"selected":""}>${g.name}</option>`)}
function renderInnings(){let s=$("inning");if(s.children.length)return;for(let i=1;i<=12;i++)s.innerHTML+=`<option>${i}</option>`}
function renderTop(){let b=pl(state.batter),p=pl(state.pitcher);$("batterName").textContent=b?`#${b.num||""} ${b.name}`:"Elegir";$("pitcherName").textContent=p?`#${p.num||""} ${p.name}`:"Elegir";$("balls").textContent=state.balls;$("strikes").textContent=state.strikes;$("outs").textContent=state.outs;$("tagCount").textContent=gt().length;$("clipCount").textContent=gt().filter(t=>t.clip_start_seconds!=="").length;$("pitchCount").textContent=gt().length;if($("battingSide"))$("battingSide").value=state.battingSide||"away"}
function renderZone(){let m=$("marker");if(state.zoneX===""){m.style.display="none";$("zoneText").textContent="Tap location";return}m.style.display="block";m.style.left=state.zoneX+"%";m.style.top=state.zoneY+"%";$("zoneText").textContent=`${state.zoneStatus} X${Math.round(state.zoneX)} Y${Math.round(state.zoneY)}`}
function renderPlayers(){let q=($("search")?.value||"").toLowerCase(),box=$("players");if(!box)return;box.innerHTML="";state.players.filter(p=>!q||p.name.toLowerCase().includes(q)).forEach(p=>box.innerHTML+=`<div class="playerCard"><div class="playerRow"><div class="num">${p.num||"-"}</div><div><b>${p.name}</b><br><small>${p.team||"-"} · ${p.role} · ${(p.side||"away")=="home"?"Home":"Visitor"}</small></div><div>${p.bat||""} ${p.thr||""}</div></div><div class="actions"><button onclick="editPlayer('${p.id}')>Edit</button><button class="danger" onclick="delPlayer('${p.id}')>Delete</button></div></div>`);$("batterList").innerHTML=bats().map((p,i)=>`<button class="listBtn" onclick="selBatter('${p.id}')"><span class="num">${p.num||i+1}</span><span>${p.name}</span><small>${p.bat||""}</small></button>`).join("")||"<p>No batters available.</p>";$("pitcherList").innerHTML=state.players.filter(p=>p.role=="Pitcher"||p.role=="Ambos").map((p,i)=>`<button class="listBtn" onclick="selPitcher('${p.id}')"><span class="num">${p.num||i+1}</span><span>${p.name}</span><small>${p.thr||""}</small></button>`).join("")||"<p>No pitchers available.</p>"}
window.selBatter=id=>{state.batter=id;save();closeSheets();render()} ; window.selPitcher=id=>{state.pitcher=id;save();closeSheets();render()}
window.editPlayer=id=>{let p=pl(id);$("editId").value=p.id;$("num").value=p.num||"";$("pname").value=p.name;$("team").value=p.team||"";$("role").value=p.role;if($("playerSide"))$("playerSide").value=p.side||"away";$("bat").value=p.bat||"";$("thr").value=p.thr||"";if($("position"))$("position").value=p.position||"";show("rosterScreen")}
window.delPlayer=id=>{if(confirm("Delete?")){state.players=state.players.filter(p=>p.id!=id);save();render()}}
function savePlayer(){let name=$("pname").value.trim();if(!name)return alert("Nombre");let id=$("editId").value;if(id){Object.assign(pl(id),{num:$("num").value,name,team:$("team").value,role:$("role").value,side:$("playerSide")?.value||"away",bat:$("bat").value,thr:$("thr").value,position:$("position")?.value||""})}else state.players.push({id:uid(),num:$("num").value,name,team:$("team").value,role:$("role").value,side:$("playerSide")?.value||"away",bat:$("bat").value,thr:$("thr").value,position:$("position")?.value||""});["editId","num","pname","team"].forEach(id=>$(id).value="");save();render()}
function createGame(){let g={id:uid(),name:$("gname").value||"Activity",date:$("gdate").value||new Date().toISOString().slice(0,10),home:$("home").value||"Home",away:$("away").value||"Away",game_type:$("gameType")?.value||"game"};state.games.push(g);state.activeGameId=g.id;save();render();show("tagScreen")}
function statsB(){let m={};gt().forEach(t=>{let n=t.batter||"Sin bateador",r=t.final_result||t.result;if(!m[n])m[n]={n,pa:0,ab:0,h:0,k:0};if(pa(r))m[n].pa++;if(hit(r)){m[n].h++;m[n].ab++}if(["Out","Error","Fielder's Choice","K Swinging","K Looking"].includes(r))m[n].ab++;if(["K Swinging","K Looking"].includes(r))m[n].k++});return Object.values(m)}
function statsP(){let m={};gt().forEach(t=>{let n=t.pitcher||"Sin pitcher",r=t.final_result||t.result;if(!m[n])m[n]={n,pit:0,k:0,bb:0,h:0};m[n].pit++;if(["K Swinging","K Looking"].includes(r))m[n].k++;if(r=="BB")m[n].bb++;if(hit(r))m[n].h++});return Object.values(m)}

function openEditTag(id){
  const t=state.tags.find(x=>x.tag_id===id); if(!t)return;
  $("editTagId").value=id;
  $("editBatter").innerHTML=state.players.filter(p=>p.role=="Bateador"||p.role=="Ambos").map(p=>`<option value="${p.id}" ${p.id===t.batter_id?"selected":""}>${p.num||""} ${p.name}</option>`).join("");
  $("editPitcher").innerHTML=state.players.filter(p=>p.role=="Pitcher"||p.role=="Ambos").map(p=>`<option value="${p.id}" ${p.id===t.pitcher_id?"selected":""}>${p.num||""} ${p.name}</option>`).join("");
  $("editResult").value=t.final_result||t.result||"Ball";
  openSheet("editTagSheet");
}
function saveEditedTag(){
  const id=$("editTagId").value;
  const t=state.tags.find(x=>x.tag_id===id); if(!t)return;
  const b=pl($("editBatter").value), p=pl($("editPitcher").value), r=$("editResult").value;
  t.batter_id=b?.id||""; t.batter=b?.name||"";
  t.pitcher_id=p?.id||""; t.pitcher=p?.name||"";
  t.final_result=r; t.result=r;
  save(); closeSheets(); render();
}


function resultClass(r){
  r=String(r||"");
  if(["Single","Double","Triple","HR"].includes(r))return "resultHit";
  if(["K Swinging","K Looking","Strikeout","strikeout_swinging","strikeout_looking"].includes(r))return "resultK";
  if(["BB","HBP","walk","hit_by_pitch"].includes(r))return "resultWalk";
  if(["Out","Ground Out","Fly Out","Line Out","Pop Out","groundout","flyout","lineout","popout"].includes(r))return "resultOut";
  return "resultOther";
}
function inningText(t){
  const side=(t.batting_side||state.battingSide||"away")==="home"?"Bot":"Top";
  return side+" "+(t.inning||$("inning")?.value||"1");
}
function abNumberForTag(tag){
  const rows=inGameRows ? inGameRows() : [];
  const p=tag.batter||"";
  let n=0;
  for(const t of gt()){
    if(t.batter===p && pa(t.final_result||t.result)) n++;
    if(t.tag_id===tag.tag_id) return n||"";
  }
  return "";
}


function renderHistory(){
  const list=$("historyList")||$("tagsTable")||$("tagHistory");
  if(!list)return;
  const tags=[...gt()].reverse();
  let html='<div class="historyFilter"><input id="histSearch" placeholder="Search player/pitcher/result"><select id="histType"><option value="">All</option><option value="hits">Hits</option><option value="outs">Outs</option><option value="k">K</option><option value="walks">BB/HBP</option></select></div>';
  html+=tags.map(t=>{
    const r=t.final_result||t.result||"";
    const cls=resultClass(r);
    const ab=abNumberForTag(t);
    return `<div class="tagCard" data-search="${(t.batter+' '+t.pitcher+' '+r).toLowerCase()}">
      <div>
        <div class="tagMeta">${t.game_time||fmt(t.game_seconds||0)}</div>
        <div class="tagMeta">${inningText(t)} ${ab?("| AB #"+ab):""}</div>
      </div>
      <div>
        <div class="tagMatch">${t.pitcher||"-"} vs<br>${t.batter||"-"}</div>
        <div class="tagMeta">${t.pitch_type||""} ${t.contact_quality?("· "+t.contact_quality):""} ${t.trajectory?("· "+t.trajectory):""}</div>
      </div>
      <div>
        <div class="tagResult ${cls}">${r}</div>
        <div class="tagActions"><button class="editMini" onclick="openEditTag('${t.tag_id}')>Edit</button><button class="deleteMini" onclick="delTag('${t.tag_id}')">X</button></div>
      </div>
    </div>`;
  }).join("");
  list.innerHTML=html;
  const search=$("histSearch"), type=$("histType");
  function applyFilter(){
    const q=(search.value||"").toLowerCase();
    const typ=type.value||"";
    document.querySelectorAll(".tagCard").forEach(card=>{
      const txt=card.dataset.search||"";
      const res=card.querySelector(".tagResult")?.textContent||"";
      let ok=!q||txt.includes(q);
      if(typ==="hits")ok=ok&&["Single","Double","Triple","HR"].includes(res);
      if(typ==="outs")ok=ok&&(res.includes("Out")||["groundout","flyout","lineout","popout"].includes(res));
      if(typ==="k")ok=ok&&(res.includes("K")||res.includes("strikeout"));
      if(typ==="walks")ok=ok&&["BB","HBP","walk","hit_by_pitch"].includes(res);
      card.style.display=ok?"grid":"none";
    });
  }
  search.oninput=applyFilter; type.onchange=applyFilter;
}

function reportPlayerName(name){
  const p=state.players.find(x=>x.name===name);
  if(!p)return name;
  const parts=String(p.name||name).trim().split(/\s+/);
  let formatted=p.name||name;
  if(parts.length>=2){formatted=parts.slice(1).join(" ") + ", " + parts[0];}
  const hand=(p.bat||"").includes("L")?"L":((p.bat||"").includes("R")?"R":"");
  const pos=p.position||"";
  if(hand||pos)formatted += " ("+hand+")" + (pos?("-"+pos):"");
  return formatted;
}

function formatDateUS(dateStr){
  const s=String(dateStr||"");
  const m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(!m)return s;
  return Number(m[2])+"/"+Number(m[3])+"/"+m[1];
}
function normalizeReportResultValue(r){
  r=String(r||"");
  if(r==="K Swinging"||r==="K Looking"||r==="strikeout_swinging"||r==="strikeout_looking")return "strikeout";
  return r;
}

function reportResult(paTags){
  const last=paTags[paTags.length-1]||{};
  const r=last.final_result||last.result||"";
  const tr=last.trajectory||last.hit_trajectory_style||"";
  if(r==="Single")return "single";
  if(r==="Double")return "double";
  if(r==="Triple")return "triple";
  if(r==="HR")return "home_run";
  if(r==="BB")return "walk";
  if(r==="HBP")return "hit_by_pitch";
  if(r==="K Swinging")return "strikeout";
  if(r==="K Looking")return "strikeout";
  if(r==="Error")return "error";
  if(r==="Fielder's Choice")return "fielders_choice";
  if(r==="Sac Fly")return "sac_fly";
  if(r==="Sac Bunt")return "sac_bunt";
  if(r==="Out"||r==="Ground Out"||r==="Fly Out"||r==="Line Out"||r==="Pop Out"){
    const trNorm=String(tr||"").trim().toLowerCase();
    if(r==="Ground Out"||trNorm==="ground ball"||trNorm==="ground")return "groundout";
    if(r==="Line Out"||trNorm==="line drive"||trNorm==="line")return "lineout";
    if(r==="Fly Out"||trNorm==="fly ball"||trNorm==="fly")return "flyout";
    if(r==="Pop Out"||trNorm==="pop up"||trNorm==="popup"||trNorm==="pop")return "popout";
    return "";
  }
  return String(r||"").toLowerCase().replaceAll(" ","_");
}
function isTerminalTag(t){return pa(t.final_result||t.result);}
function isSwingTag(t){
  const r=t.final_result||t.result||"";
  if(["Swing & Miss","Foul","K Swinging"].includes(r))return true;
  if(["Single","Double","Triple","HR","Out"].includes(r))return true;
  return false;
}
function isMissTag(t){
  const r=t.final_result||t.result||"";
  return ["Swing & Miss","K Swinging"].includes(r);
}
function isOutOfZone(t){return String(t.zone_status||"").toLowerCase().includes("out");}
function isSecondaryPitch(t){
  const p=String(t.pitch_type||"").toUpperCase();
  return ["CH","SL","CB","SPL","CU","KN","SV"].includes(p);
}
function etPlayerDatabaseId(playerId, playerName){
  const rawId=String(playerId||"");
  let p=(state.players||[]).find(x=>String(x.id||"")===rawId);
  if(!p && playerName){
    const wanted=String(playerName||"").trim().toLowerCase();
    p=(state.players||[]).find(x=>String(x.name||"").trim().toLowerCase()===wanted);
  }
  const code=String(p?.db_player_code||p?.player_code||"").trim();
  if(code)return code;
  if(rawId.startsWith("db-"))return rawId.slice(3);
  return "";
}
function etInGamePlayerLabel(playerId, playerName){
  const name=reportPlayerName(playerName||"No Player");
  const code=etPlayerDatabaseId(playerId,playerName);
  return code?`${code} ${name}`:name;
}
function inGameRows(){
  const g=game()||{};
  const rows=[];
  const abByPlayer={};
  const currentByPlayer={};
  gt().forEach(t=>{
    const player=t.batter||"No Player";
    if(!currentByPlayer[player])currentByPlayer[player]=[];
    currentByPlayer[player].push(t);
    if(isTerminalTag(t)){
      const paTags=currentByPlayer[player];
      abByPlayer[player]=(abByPlayer[player]||0)+1;
      const hard=paTags.some(x=>String(x.contact_quality||"").toLowerCase()==="hard")?1:0;
      const swings=paTags.filter(isSwingTag).length;
      const misses=paTags.filter(isMissTag).length;
      const oz=paTags.filter(isOutOfZone).length;
      const ozSwings=paTags.filter(x=>isOutOfZone(x)&&isSwingTag(x)).length;
      const secondary=paTags.filter(isSecondaryPitch);
      const swingsSecondary=secondary.filter(isSwingTag).length;
      const missesSecondary=secondary.filter(isMissTag).length;
      const ozSecondary=secondary.filter(isOutOfZone).length;
      const ozSwingsSecondary=secondary.filter(x=>isOutOfZone(x)&&isSwingTag(x)).length;
      const databaseId=etPlayerDatabaseId(paTags[0]?.batter_id||t.batter_id,player);
      rows.push({
        date:formatDateUS(g.date||new Date().toISOString().slice(0,10)),
        ab_num:abByPlayer[player],
        player:etInGamePlayerLabel(paTags[0]?.batter_id||t.batter_id,player),
        sfg_id:databaseId,
        game_type:g.game_type||"game",
        result:normalizeReportResultValue(reportResult(paTags)),
        hard_contact:hard,
        swings_total:swings,
        misses_total:misses,
        oz_pitches_total:oz,
        oz_swings_total:ozSwings,
        pitches_total:paTags.length,
        swings_secondary:swingsSecondary,
        misses_secondary:missesSecondary,
        oz_pitches_secondary:ozSecondary,
        oz_swings_secondary:ozSwingsSecondary
      });
      currentByPlayer[player]=[];
    }
  });
  // Sort like daily sheet: all ABs grouped by player, then AB order.
  rows.sort((a,b)=>{
    const pa=String(a.player||"").localeCompare(String(b.player||""));
    if(pa!==0)return pa;
    return Number(a.ab_num||0)-Number(b.ab_num||0);
  });
  return rows;
}
const inGameHeaders=["date","ab_num","player","sfg_id","game_type","result","hard_contact","swings_total","misses_total","oz_pitches_total","oz_swings_total","pitches_total","swings_secondary","misses_secondary","oz_pitches_secondary","oz_swings_secondary"];
function inGameCsv(){
  const rows=inGameRows();
  return inGameHeaders.join(",")+"\n"+rows.map(r=>inGameHeaders.map(h=>esc(r[h])).join(",")).join("\n");
}

function xlsEsc(v){
  return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}
function inGameXls(){
  const rows=inGameRows();
  const headers=inGameHeaders;
  let html='<!DOCTYPE html><html><head><meta charset="UTF-8">';
  html+='<style>';
  html+='body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;}';
  html+='table{border-collapse:collapse;font-size:10pt;}';
  html+='th{background:#d9d9d9;font-weight:bold;text-align:center;border:1px solid #333;padding:4px;}';
  html+='td{border:1px solid #333;padding:3px 5px;mso-number-format:"\\@";}';
  html+='.num{text-align:center;}';
  html+='.player{min-width:220px;}';
  html+='.wide{min-width:120px;}';
  html+='</style></head><body>';
  html+='<table>';
  html+='<tr>'+headers.map(h=>'<th>'+xlsEsc(h)+'</th>').join('')+'</tr>';
  rows.forEach(r=>{
    html+='<tr>';
    headers.forEach(h=>{
      const cls=(h==="player"?'player':(["date","game_type","result"].includes(h)?'wide':'num'));
      html+='<td class="'+cls+'">'+xlsEsc(h==="result"?normalizeReportResultValue(r[h]):r[h])+'</td>';
    });
    html+='</tr>';
  });
  html+='</table></body></html>';
  return html;
}
function inGameXlsFname(){
  return ((game()?.name||"easy_tagg_ingame").replace(/[^a-zA-Z0-9_-]/g,"_"))+"_InGameData_"+new Date().toISOString().slice(0,10)+".xls";
}
function exportInGameXls(){
  try{
    const incompleteOut=gt().find(t=>{
      const r=String(t.final_result||t.result||"");
      const tr=String(t.trajectory||t.hit_trajectory_style||"").trim();
      return r==="Out" && !tr;
    });
    if(incompleteOut){
      return etAppAlert("An Out is missing a batted-ball type. Edit it in History and select Ground Ball, Line Drive, or Fly Ball before exporting.","INCOMPLETE OUT");
    }
    const c=inGameXls();
    const name=inGameXlsFname();
    if(window.AndroidBridge && AndroidBridge.saveFile){
      AndroidBridge.saveFile(name,"application/vnd.ms-excel",c);
    }else if(window.AndroidBridge && AndroidBridge.saveCsv){
      AndroidBridge.saveCsv(name,c);
    }else{
      const blob=new Blob([c],{type:"application/vnd.ms-excel;charset=utf-8"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;
      a.download=name;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    if($("csvStatus"))$("csvStatus").textContent="Excel In Game Data guardado.";
  }catch(e){
    if($("csvStatus"))$("csvStatus").textContent="Error exportando In Game Excel: "+e.message;
    alert("Error exportando In Game Excel: "+e.message);
  }
}


function inGameFname(){
  return ((game()?.name||"easy_tagg_ingame").replace(/[^a-zA-Z0-9_-]/g,"_"))+"_InGameData_"+new Date().toISOString().slice(0,10)+".csv";
}
function etDownloadCsvInBrowser(name,content){
  const blob=new Blob([content],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=name;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportInGameCsv(){
  const c=inGameCsv();
  const name=inGameFname();
  if(window.AndroidBridge && AndroidBridge.saveCsv)AndroidBridge.saveCsv(name,c);
  else etDownloadCsvInBrowser(name,c);
  if($("csvStatus"))$("csvStatus").textContent="CSV In Game Data guardado.";
}
function copyInGameCsv(){
  navigator.clipboard?.writeText(inGameCsv());
  if($("csvStatus"))$("csvStatus").textContent="CSV In Game Data copiado.";
}


const headers=["tag_id","game_id","game_name","game_date","home_team","away_team","game_seconds","game_time","clip_start_seconds","clip_start_time","clip_end_seconds","clip_end_time","inning","half","balls_before","strikes_before","outs_before","count_before","pitcher_id","pitcher","pitcher_hand","pitcher_pitch_number","batter_id","batter","batter_hand","pitch_type","pitch_mph","zone_status","zone_x","zone_y","result","final_result","contact_quality","trajectory","spray_location","hit_location_x","hit_location_y","hit_location_x_px","hit_location_y_px","hit_location_image","hit_trajectory_style","exit_velocity","note","created_at"];
function etSyncExportTag(t){
  return Object.assign({},t,{
    pitcher_id:etPlayerDatabaseId(t.pitcher_id,t.pitcher),
    batter_id:etPlayerDatabaseId(t.batter_id,t.batter)
  });
}
function esc(v){return `"${String(v??"").replaceAll('"','""')}"`}function csv(){return headers.join(",")+"\n"+gt().map(t=>{const row=etSyncExportTag(t);return headers.map(h=>esc(row[h])).join(",")}).join("\n")}function fname(){return ((game()?.name||"easy_tagg").replace(/[^a-zA-Z0-9_-]/g,"_"))+"_"+new Date().toISOString().slice(0,10)+".csv"}
function exportCsv(){const name=fname();const c=csv();if(window.AndroidBridge && AndroidBridge.saveCsv)AndroidBridge.saveCsv(name,c);else etDownloadCsvInBrowser(name,c);$("csvStatus").textContent="CSV Sync guardado."}function copyCsv(){navigator.clipboard?.writeText(csv());$("csvStatus").textContent="CSV Sync copiado."}function renderCsv(){if($("csvPreview"))$("csvPreview").value=csv()}
function show(id){document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id==id));document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.screen==id));render()}


/* Easy Tagg v2.9.10.99 - In-App Smart Reset Dialogs */
function etOpenResetDialogV291099(step){
  const first=$("resetDialogV291099");
  const finalDialog=$("resetFinalDialogV291099");
  const success=$("resetSuccessDialogV291099");
  [first,finalDialog,success].forEach(el=>el&&el.classList.add("hidden"));
  const target=step==="final"?finalDialog:step==="success"?success:first;
  if($("overlay"))$("overlay").classList.remove("hidden");
  if(target)target.classList.remove("hidden");
}
function etCloseResetDialogsV291099(){
  ["resetDialogV291099","resetFinalDialogV291099","resetSuccessDialogV291099"].forEach(id=>{const el=$(id);if(el)el.classList.add("hidden")});
  if($("overlay"))$("overlay").classList.add("hidden");
}
function etPerformSmartResetV291099(){
  try{
    if(state.timer){clearInterval(state.timer);state.timer=null;}
    state.run=false;

    const exactGameKeys=new Set([
      "etd_games","etd_game","etd_tags","etd_clock","etd_balls",
      "etd_strikes","etd_outs","etd_pa_half","etd_batter",
      "etd_pitcher","etd_side","etd_runner_events"
    ]);
    const gamePrefixes=[
      "etd_activity_roster_","etd_clean_lineup_","etd_lineup_",
      "etd_activity_lineup_","etd_lineup_index_","etd_active_pitcher_",
      "etd_pitcher_","etd_batter_history_","etd_player_at_bats_",
      "etd_history_","etd_game_","etd_match_","etd_export_"
    ];
    Object.keys(localStorage).forEach(key=>{
      if(exactGameKeys.has(key)||gamePrefixes.some(prefix=>key.startsWith(prefix)))localStorage.removeItem(key);
    });

    state.games=[];state.activeGameId="";state.tags=[];state.clock=0;state.clockBase=0;
    state.clockAnchorMs=null;state.balls=0;state.strikes=0;state.outs=0;state.paInHalf=0;
    state.batter="";state.pitcher="";state.battingSide="away";state.pitch="";
    state.zoneX="";state.zoneY="";state.zoneStatus="";state.pending=null;
    state.detail={contact:"",trajectory:""};
    if(Array.isArray(state.runnerEvents))state.runnerEvents=[];

    etOpenResetDialogV291099("success");
  }catch(error){
    console.error("Easy Tagg reset failed",error);
    const msg=$("resetErrorTextV291099");
    if(msg)msg.textContent="Reset could not be completed. Player Database information was not removed.";
    etOpenResetDialogV291099("success");
  }
}
function resetEasyTaggGameData(){etOpenResetDialogV291099("first");}
window.resetEasyTaggGameData=resetEasyTaggGameData;
window.etCloseResetDialogsV291099=etCloseResetDialogsV291099;
window.etPerformSmartResetV291099=etPerformSmartResetV291099;
document.addEventListener("DOMContentLoaded",()=>{const resetButton=$("resetAll");if(resetButton)resetButton.onclick=resetEasyTaggGameData;});
window.addEventListener("load",()=>{if(et2910126ShouldRunClock())clock();render();document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>show(t.dataset.screen));document.querySelectorAll(".close").forEach(b=>b.onclick=closeSheets);$("overlay").onclick=closeSheets;$("gameSelect").onchange=e=>{state.activeGameId=e.target.value;save();render()};if($("battingSide"))$("battingSide").onchange=e=>{state.battingSide=e.target.value;let first=bats(state.battingSide)[0];if(first)state.batter=first.id;save();render()};$("createGame").onclick=createGame;$("savePlayer").onclick=savePlayer;$("search").oninput=renderPlayers;$("batterBtn").onclick=()=>openSheet("batterSheet");$("pitcherBtn").onclick=()=>openSheet("pitcherSheet");$("bBtn").onclick=()=>{state.balls=Math.min(4,state.balls+1);save();renderTop()};$("sBtn").onclick=()=>{state.strikes=Math.min(3,state.strikes+1);save();renderTop()};$("oBtn").onclick=()=>{state.outs=state.outs>=2?0:state.outs+1;save();renderTop()};$("resetCount").onclick=()=>{resetCount();save();renderTop()};$("zone").addEventListener("pointerdown",e=>{let r=$("zone").getBoundingClientRect();state.zoneX=Math.max(0,Math.min(100,((e.clientX-r.left)/r.width)*100));state.zoneY=Math.max(0,Math.min(100,((e.clientY-r.top)/r.height)*100));state.zoneStatus=(state.zoneX>=38&&state.zoneX<=62&&state.zoneY>=20&&state.zoneY<=76)?"In Zone":"Out of Zone";renderZone()});document.querySelectorAll("[data-pitch]").forEach(b=>b.onclick=()=>{state.pitch=b.dataset.pitch;document.querySelectorAll("[data-pitch]").forEach(x=>x.classList.toggle("selected",x==b))});document.querySelectorAll("[data-result]").forEach(b=>b.onclick=()=>startTag(b.dataset.result));$("resultBtn").onclick=()=>openSheet("resultSheet");document.querySelectorAll("[data-sheet-result]").forEach(b=>b.onclick=()=>{closeSheets();startTag(b.dataset.sheetResult)});document.querySelectorAll("[data-contact]").forEach(b=>b.onclick=()=>{state.detail.contact=b.dataset.contact;document.querySelectorAll("[data-contact]").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});document.querySelectorAll("[data-traj]").forEach(b=>b.onclick=()=>{state.detail.trajectory=b.dataset.traj;document.querySelectorAll("[data-traj]").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});$("saveDetail").onclick=()=>saveTag();$("exportCsv").onclick=exportCsv;if($("copyCsv"))$("copyCsv").onclick=copyCsv;if($("exportInGameCsv"))$("exportInGameCsv").onclick=exportInGameCsv;if($("copyInGameCsv"))$("copyInGameCsv").onclick=copyInGameCsv;if($("exportInGameXls"))$("exportInGameXls").onclick=exportInGameXls;if($("saveEditedTag"))$("saveEditedTag").onclick=saveEditedTag;if($("resetAll"))$("resetAll").onclick=resetEasyTaggGameData});


/* ================= EASY TAGG v2.1 HISTORIAL FUNCTION ================= */
function etResultClassV21(r){
  r=String(r||"");
  if(["Single","Double","Triple","HR"].includes(r))return "hitV21";
  if(["K Swinging","K Looking","Strikeout","strikeout_swinging","strikeout_looking"].includes(r))return "kV21";
  if(["BB","HBP","walk","hit_by_pitch"].includes(r))return "walkV21";
  if(["Out","Ground Out","Fly Out","Line Out","Pop Out","groundout","flyout","lineout","popout"].includes(r))return "outV21";
  return "otherV21";
}
function etAllBattersV21(){
  return state.players.filter(p=>p.role==="Bateador"||p.role==="Ambos");
}
function etAllPitchersV21(){
  return state.players.filter(p=>p.role==="Pitcher"||p.role==="Ambos");
}
function etAbForTagV21(tag){
  let n=0;
  for(const t of gt()){
    if(t.batter===tag.batter && pa(t.final_result||t.result)) n++;
    if(t.tag_id===tag.tag_id) return n||"";
  }
  return "";
}
function etInningTextV21(t){
  const side=(t.batting_side||state.battingSide||"away")==="home"?"Bot":"Top";
  return side+" "+(t.inning||$("inning")?.value||"1");
}
function renderHistoryV21(){
  const box=$("historyList")||$("history")||$("tagsTable")||$("tagHistory");
  if(!box)return;
  const tags=[...gt()].reverse();
  let html='<div class="historyTool"><input id="histSearchV21" placeholder="Search pitcher, batter, or result"><select id="histFilterV21"><option value="">All</option><option value="hit">Hits</option><option value="out">Outs</option><option value="k">K</option><option value="walk">BB/HBP</option></select></div>';
  if(!tags.length){
    html+='<p>No hay tags todavía.</p>';
  }else{
    html+=tags.map(t=>{
      const r=t.final_result||t.result||"";
      const cls=etResultClassV21(r);
      const ab=etAbForTagV21(t);
      const searchable=(t.pitcher+" "+t.batter+" "+r+" "+(t.pitch_type||"")).toLowerCase();
      return `<div class="tagCardV21" data-search="${searchable}" data-result="${r}">
        <div>
          <div class="tagTimeV21">${t.game_time||fmt(t.game_seconds||0)}</div>
          <div class="tagTimeV21">${etInningTextV21(t)}</div>
          <div class="tagTimeV21">${ab?("AB #"+ab):""}</div>
        </div>
        <div>
          <div class="tagMainV21">${t.pitcher||"-"} vs ${t.batter||"-"}</div>
          <div class="tagSubV21">${t.pitch_type||""} ${t.contact_quality?("· "+t.contact_quality):""} ${t.trajectory?("· "+t.trajectory):""}</div>
        </div>
        <div>
          <div class="tagResultV21 ${cls}">${r}</div>
          <div class="tagActionsV21">
            <button class="editV21" onclick="openEditTagV21('${t.tag_id}')>Edit</button>
            <button class="delV21" onclick="deleteTagV21('${t.tag_id}')">X</button>
          </div>
        </div>
      </div>`;
    }).join("");
  }
  box.innerHTML=html;
  const search=$("histSearchV21"), filter=$("histFilterV21");
  function apply(){
    const q=(search?.value||"").toLowerCase();
    const f=filter?.value||"";
    document.querySelectorAll(".tagCardV21").forEach(card=>{
      const txt=card.dataset.search||"";
      const r=card.dataset.result||"";
      let ok=!q||txt.includes(q);
      if(f==="hit")ok=ok&&["Single","Double","Triple","HR"].includes(r);
      if(f==="out")ok=ok&&(r.includes("Out")||["groundout","flyout","lineout","popout"].includes(r));
      if(f==="k")ok=ok&&(r.includes("K")||r.includes("strikeout"));
      if(f==="walk")ok=ok&&["BB","HBP","walk","hit_by_pitch"].includes(r);
      card.style.display=ok?"grid":"none";
    });
  }
  if(search)search.oninput=apply;
  if(filter)filter.onchange=apply;
}
// Override app history renderer without touching the rest of the app.
renderHistory = renderHistoryV21;

function openEditTagV21(id){
  const t=state.tags.find(x=>x.tag_id===id);
  if(!t)return;
  $("editTagId").value=id;
  $("editBatter").innerHTML=etAllBattersV21().map(p=>`<option value="${p.id}" ${p.id===t.batter_id?"selected":""}>${p.num||""} ${p.name}</option>`).join("");
  $("editPitcher").innerHTML=etAllPitchersV21().map(p=>`<option value="${p.id}" ${p.id===t.pitcher_id?"selected":""}>${p.num||""} ${p.name}</option>`).join("");
  $("editResult").value=t.final_result||t.result||"Ball";
  if($("editTrajectory"))$("editTrajectory").value=t.trajectory||"";
  if($("editQuality"))$("editQuality").value=t.contact_quality||"";
  openSheet("editTagSheet");
}
function saveEditedTagV21(){
  const id=$("editTagId").value;
  const t=state.tags.find(x=>x.tag_id===id);
  if(!t)return;
  const b=state.players.find(p=>p.id===$("editBatter").value);
  const p=state.players.find(p=>p.id===$("editPitcher").value);
  const r=$("editResult").value;
  const editedTrajectory=$("editTrajectory")?$("editTrajectory").value||"":"";
  if(r==="Out" && !editedTrajectory){
    return etAppAlert("To save an Out, select Ground Ball, Line Drive, or Fly Ball. In-Game Data will then export groundout, lineout, or flyout.","OUT TYPE REQUIRED");
  }
  t.batter_id=b?.id||"";
  t.batter=b?.name||"";
  t.pitcher_id=p?.id||"";
  t.pitcher=p?.name||"";
  t.result=r;
  t.final_result=r;
  if($("editTrajectory"))t.trajectory=editedTrajectory;
  if($("editQuality"))t.contact_quality=$("editQuality").value||"";
  save();
  closeSheets();
  render();
}
function deleteTagV21(id){
  if(!confirm("Delete this tag?"))return;
  state.tags=state.tags.filter(t=>t.tag_id!==id);
  save();
  render();
}
window.openEditTagV21=openEditTagV21;
window.saveEditedTagV21=saveEditedTagV21;
window.deleteTagV21=deleteTagV21;

// Hook save button safely after load.
window.addEventListener("load",()=>{
  if($("saveEditedTag"))$("saveEditedTag").onclick=saveEditedTagV21;
  setTimeout(()=>{try{renderHistoryV21()}catch(e){}},300);
});


/* ================= EASY TAGG v2.4.1 CLEAN LINEUP MODAL ================= */
function v241Side(){ return state.battingSide || "away"; }
function v241Key(side=v241Side()){
  return "etd_clean_lineup_v241_" + (state.activeGameId || "no_game") + "_" + side;
}
function v241GetLineup(side=v241Side()){
  try { return JSON.parse(localStorage.getItem(v241Key(side)) || "[]"); }
  catch(e){ return []; }
}
function v241SetLineup(side, ids){
  localStorage.setItem(v241Key(side), JSON.stringify(ids || []));
}
function v241RosterBatters(side=v241Side()){
  return state.players.filter(p =>
    (p.role === "Bateador" || p.role === "Ambos") &&
    ((p.side || "away") === side)
  );
}
function v241RosterPitchers(){
  return state.players.filter(p => p.role === "Pitcher" || p.role === "Ambos");
}
function v241LineupPlayers(side=v241Side()){
  return v241GetLineup(side).map(id => pl(id)).filter(Boolean);
}
function v241EnsureLineup(side=v241Side()){
  let ids = v241GetLineup(side).filter(id => !!pl(id));
  v241SetLineup(side, ids);
  return ids;
}
bats = function(side=v241Side()){
  v241EnsureLineup(side);
  return v241LineupPlayers(side);
};
function v241AddToLineup(id, side=v241Side()){
  let ids = v241GetLineup(side).filter(x => !!pl(x));
  if(!ids.includes(id)) ids.push(id);
  v241SetLineup(side, ids);
  save();
  render();
  renderLineupRosterV241();
}
function v241RemoveFromLineup(id, side=v241Side()){
  let ids = v241GetLineup(side).filter(x => x !== id);
  v241SetLineup(side, ids);
  if(state.batter === id) state.batter = ids[0] || "";
  save();
  render();
  renderLineupRosterV241();
}
function v241MoveLineup(id, dir, side=v241Side()){
  let ids = v241GetLineup(side).filter(x => !!pl(x));
  const i = ids.indexOf(id);
  const j = i + dir;
  if(i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  v241SetLineup(side, ids);
  save();
  render();
}
function v242ClearLineup(){
  const side = v241Side();
  if(confirm("Clear lineup " + (side === "home" ? "Home" : "Visitor") + "?")){
    v241SetLineup(side, []);
    state.batter = "";
    save();
    render();
    renderLineupRosterV241();
  }
}
function v241OpenRosterAdd(){
  renderLineupRosterV241();
  openSheet("lineupAddSheetV241");
}
function renderLineupRosterV241(){
  const box = $("lineupRosterListV241");
  if(!box) return;
  const side = v241Side();
  const ids = v241GetLineup(side);
  const roster = v241RosterBatters(side);
  box.innerHTML = roster.map((p,i) => {
    const inLineup = ids.includes(p.id);
    return `<div class="rosterAddCleanV241">
      <div class="lineupOrderCleanV241">${p.num || i+1}</div>
      <div>
        <div class="lineupNameCleanV241">${p.name}</div>
        <div class="lineupSubCleanV241">${p.team || "-"} · ${p.bat || ""}</div>
      </div>
      <button type="button" class="${inLineup ? "danger" : ""}" onclick="${inLineup ? "v241RemoveFromLineup" : "v241AddToLineup"}('${p.id}')">${inLineup ? "Remove" : "Add"}</button>
    </div>`;
  }).join("") || "<p>No batters have been created for this side.</p>";
}
function v242DeletePlayer(id){
  const p = pl(id);
  if(!p) return;
  const used = state.tags.some(t => t.batter_id === id || t.pitcher_id === id);
  const msg = used
    ? "This player has tags. The player will be removed from the roster/lineup, but existing tags will remain saved. Delete player?"
    : "Delete player?";
  if(!confirm(msg)) return;
  ["away","home"].forEach(side => v241SetLineup(side, v241GetLineup(side).filter(x => x !== id)));
  state.players = state.players.filter(x => x.id !== id);
  if(state.batter === id) state.batter = "";
  if(state.pitcher === id) state.pitcher = "";
  save();
  render();
}
window.v241AddToLineup = v241AddToLineup;
window.v241RemoveFromLineup = v241RemoveFromLineup;
window.v241MoveLineup = v241MoveLineup;
window.v242ClearLineup = v242ClearLineup;
window.v241OpenRosterAdd = v241OpenRosterAdd;
window.v242DeletePlayer = v242DeletePlayer;
window.delPlayer = v242DeletePlayer;

const oldRenderPlayersV241 = renderPlayers;
renderPlayers = function(){
  const q = ($("search")?.value || "").toLowerCase();
  const box = $("players");

  if(box){
    box.innerHTML = "";
    state.players.filter(p => !q || String(p.name || "").toLowerCase().includes(q)).forEach(p => {
      box.innerHTML += `<div class="playerCard">
        <div class="playerRow">
          <div class="num">${p.num || "-"}</div>
          <div><b>${p.name}</b><br><small>${p.team || "-"} · ${p.role} · ${(p.side || "away") === "home" ? "Home" : "Visitor"}</small></div>
          <div>${p.bat || ""} ${p.thr || ""}</div>
        </div>
        <div class="actions">
          <button onclick="editPlayer('${p.id}')>Edit</button>
          <button class="danger" onclick="v242DeletePlayer('${p.id}')>Delete</button>
        </div>
      </div>`;
    });
  }

  const side = v241Side();
  v241EnsureLineup(side);
  const lineup = v241LineupPlayers(side);

  $("batterList").innerHTML = lineup.map((p,i) => `
    <div class="lineupPlayerCleanV241">
      <div class="lineupMainCleanV241" onclick="selBatter('${p.id}')">
        <div class="lineupOrderCleanV241">${i+1}</div>
        <div>
          <div class="lineupNameCleanV241">${p.name}</div>
          <div class="lineupSubCleanV241">${p.bat || ""}</div>
        </div>
        <div class="lineupSubCleanV241">Select</div>
      </div>
      <div class="lineupActionsCleanV241">
        <button type="button" onclick="v241MoveLineup('${p.id}',-1)">↑</button>
        <button type="button" onclick="v241MoveLineup('${p.id}',1)">↓</button>
        <button type="button" class="danger" onclick="v241RemoveFromLineup('${p.id}')">X</button>
      </div>
    </div>
  `).join("") || "<p>No lineup yet. Tap Add from Roster.</p>";

  $("pitcherList").innerHTML = v241RosterPitchers().map((p,i) => `
    <button class="listBtn" onclick="selPitcher('${p.id}')">
      <span class="num">${p.num || i+1}</span><span>${p.name}</span><small>${p.thr || ""}</small>
    </button>
  `).join("") || "<p>No pitchers available.</p>";
};

const oldCreateGameV241 = createGame;
createGame = function(){
  oldCreateGameV241();
  ["away","home"].forEach(side => v241SetLineup(side, []));
  save();
  render();
};

clipWin = function(r){ return ["Single","Double","Triple","HR","Out"].includes(r) ? {pre:6, post:9} : {pre:5, post:5}; };
pa = function(r){ return ["BB","HBP","K Swinging","K Looking","Single","Double","Triple","HR","Out"].includes(r); };
needDetail = function(r){ return ["Single","Double","Triple","HR","Out"].includes(r); };

window.addEventListener("load", () => {
  const add = $("lineupAddBtnV241");
  const clear = $("lineupClearBtnV241");
  if(add) add.onclick = v241OpenRosterAdd;
  if(clear) clear.onclick = v242ClearLineup;
});


/* ================= EASY TAGG v2.4.2 FIX CLEAR LINEUP + DELETE PLAYER ================= */
function v242CurrentSide(){
  return state.battingSide || ($("battingSide") ? $("battingSide").value : "away") || "away";
}
function v242Key(side=v242CurrentSide()){
  return "etd_clean_lineup_v241_" + (state.activeGameId || "no_game") + "_" + side;
}
function v242GetLineup(side=v242CurrentSide()){
  try{
    const raw = localStorage.getItem(v242Key(side));
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter(id => state.players.some(p => p.id === id)) : [];
  }catch(e){
    return [];
  }
}
function v242SetLineup(side, ids){
  localStorage.setItem(v242Key(side), JSON.stringify((ids || []).filter(Boolean)));
}
function v242RenderSafe(){
  save();
  render();
  if(typeof renderLineupRosterV241 === "function"){
    try{ renderLineupRosterV241(); }catch(e){}
  }
}
function v242ClearLineup(){
  const side = v242CurrentSide();
  const label = side === "home" ? "Home" : "Visitor";
  const current = v242GetLineup(side);
  if(!current.length){
    alert("The lineup " + label + " is already empty.");
    return;
  }
  if(!confirm("Clear lineup " + label + "? This does NOT delete players from the roster.")) return;
  v242SetLineup(side, []);
  if(current.includes(state.batter)) state.batter = "";
  v242RenderSafe();
}
function v242DeletePlayer(id){
  const p = state.players.find(x => x.id === id);
  if(!p){
    alert("Player not found.");
    return;
  }

  const used = state.tags.some(t => t.batter_id === id || t.pitcher_id === id);
  const msg = used
    ? "This player has saved tags. The player will be removed from the roster and all lineups, but existing tags will keep the saved name. Delete player?"
    : "Delete " + p.name + " from the roster?";

  if(!confirm(msg)) return;

  ["away","home"].forEach(side => {
    v242SetLineup(side, v242GetLineup(side).filter(x => x !== id));
  });

  state.players = state.players.filter(x => x.id !== id);

  if(state.batter === id) {
    const side = v242CurrentSide();
    const next = v242GetLineup(side)[0];
    state.batter = next || "";
  }
  if(state.pitcher === id) state.pitcher = "";

  v242RenderSafe();
}

// Replace previous handlers with safer ones.
window.v242ClearLineup = v242ClearLineup;
window.v242DeletePlayer = v242DeletePlayer;
window.v242ClearLineup = v242ClearLineup;
window.v242DeletePlayer = v242DeletePlayer;
window.delPlayer = v242DeletePlayer;

window.addEventListener("load", () => {
  const clear1 = document.getElementById("lineupClearBtnV241");
  const clear2 = document.getElementById("lineupClearBtn");
  if(clear1) clear1.onclick = v242ClearLineup;
  if(clear2) clear2.onclick = v242ClearLineup;

  // Rebind any roster delete buttons after render too.
  setTimeout(() => {
    document.querySelectorAll("[onclick^='v242DeletePlayer'],[onclick^='delPlayer']").forEach(btn => {
      const txt = btn.getAttribute("onclick") || "";
      const m = txt.match(/'([^']+)'/);
      if(m) btn.onclick = () => v242DeletePlayer(m[1]);
    });
  }, 300);
});


/* ================= EASY TAGG v2.4.3 REMOVE CLEAR + FIX DELETE TAG/PLAYER ================= */
function v243Toast(msg){
  try{ if(navigator.vibrate) navigator.vibrate(35); }catch(e){}
  console.log("[EasyTagg]", msg);
}
function v243LineupKey(side){
  return "etd_clean_lineup_v241_" + (state.activeGameId || "no_game") + "_" + (side || "away");
}
function v243GetLineup(side){
  try{
    const ids=JSON.parse(localStorage.getItem(v243LineupKey(side))||"[]");
    return Array.isArray(ids)?ids:[];
  }catch(e){ return []; }
}
function v243SetLineup(side,ids){
  localStorage.setItem(v243LineupKey(side),JSON.stringify((ids||[]).filter(Boolean)));
}
function v243RemovePlayerFromAllLineups(id){
  ["away","home"].forEach(side=>v243SetLineup(side,v243GetLineup(side).filter(x=>x!==id)));
}
function v243DeletePlayer(id){
  const p=state.players.find(x=>x.id===id);
  if(!p){ alert("Player not found."); return; }
  const used=state.tags.some(t=>t.batter_id===id||t.pitcher_id===id);
  const msg=used
    ? "This player has saved tags. The player will be removed from the roster and lineups, but existing tags will keep the saved name. Delete player?"
    : "Delete "+p.name+" from the roster?";
  if(!confirm(msg))return;

  v243RemovePlayerFromAllLineups(id);
  state.players=state.players.filter(x=>x.id!==id);
  if(state.batter===id)state.batter="";
  if(state.pitcher===id)state.pitcher="";
  save();
  render();
  v243Toast("Player deleted");
}
function v243DeleteTag(id){
  const t=state.tags.find(x=>x.tag_id===id);
  if(!t){ alert("Tag no encontrado."); return; }
  const label=(t.pitcher||"Pitcher")+" vs "+(t.batter||"Bateador")+" - "+(t.final_result||t.result||"");
  if(!confirm("Delete this tag?\n"+label))return;
  state.tags=state.tags.filter(x=>x.tag_id!==id);
  save();
  render();
  v243Toast("Tag eliminado");
}
// Override all possible old delete functions
window.v243DeletePlayer=v243DeletePlayer;
window.v243DeleteTag=v243DeleteTag;
window.delPlayer=v243DeletePlayer;
window.et24DeletePlayer=v243DeletePlayer;
window.v241DeletePlayer=v243DeletePlayer;
window.v242DeletePlayer=v243DeletePlayer;
window.delTag=v243DeleteTag;

// Rebuild history only to make X reliable, while preserving existing design.
if(typeof renderHistory==="function"){
  const v243OldResultClass = (typeof resultClass==="function") ? resultClass : (r=>"");
  renderHistory=function(){
    const list=$("historyList");
    if(!list)return;
    const q=($("histSearch")?.value||"").toLowerCase();
    const type=$("histType")?.value||"";
    const rows=gt().slice().reverse().filter(t=>{
      const r=t.final_result||t.result||"";
      const txt=((t.pitcher||"")+" "+(t.batter||"")+" "+r).toLowerCase();
      if(q && !txt.includes(q))return false;
      if(type==="hits" && !["Single","Double","Triple","HR"].includes(r))return false;
      if(type==="outs" && !["Out","Ground Out","Fly Out","Line Out","Pop Out"].includes(r))return false;
      if(type==="k" && !["K Swinging","K Looking","Strikeout"].includes(r))return false;
      if(type==="walks" && !["BB","HBP"].includes(r))return false;
      return true;
    });
    list.innerHTML=rows.map(t=>{
      const r=t.final_result||t.result||"";
      const cls=v243OldResultClass(r);
      return `<div class="tagCard">
        <div class="tagTime">${t.game_time||""}<br><small>${t.half||""} ${t.inning||""}</small></div>
        <div class="tagMain"><b>${t.pitcher||""} vs ${t.batter||""}</b><br><small>${t.pitch_type||""} · ${t.contact_quality||"No Contact"}</small></div>
        <div class="tagRight">
          <div class="tagResult ${cls}">${r}</div>
          <div class="tagActions">
            <button class="editMini" type="button" onclick="openEditTag('${t.tag_id}')>Edit</button>
            <button class="deleteMini" type="button" onclick="v243DeleteTag('${t.tag_id}')">X</button>
          </div>
        </div>
      </div>`;
    }).join("")||"<p>No tags available.</p>";
  }
}

// Rebuild player list click handlers after renderPlayers runs.
// This keeps current lineup module intact but forces delete buttons to call v243DeletePlayer.
const v243OriginalRenderPlayers = renderPlayers;
renderPlayers=function(){
  v243OriginalRenderPlayers();
  setTimeout(()=>{
    document.querySelectorAll("button").forEach(btn=>{
      const oc=btn.getAttribute("onclick")||"";
      if((oc.includes("delPlayer")||oc.includes("DeletePlayer")) && oc.includes("'")){
        const m=oc.match(/'([^']+)'/);
        if(m){
          btn.onclick=(ev)=>{ev.preventDefault();ev.stopPropagation();v243DeletePlayer(m[1]);};
          btn.setAttribute("onclick","");
        }
      }
    });
  },0);
}

// Remove/hide clear lineup at runtime too.
window.addEventListener("load",()=>{
  ["lineupClearBtnV241","lineupClearBtn"].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.remove();
  });
});


/* ================= EASY TAGG v2.5.1 STABLE ROSTER MODULE ================= */
const ET251_VERSION = "2.5.1 Stable Roster";

function et251GameId(){
  return state.activeGameId || "";
}
function et251GameLabel(){
  const g = game && game();
  return g ? (g.name || "Activity") : "No activity";
}
function et251RosterPlayers(){
  const gid = et251GameId();
  return state.players.filter(p => (p.game_id || "") === gid);
}
function et251MigrateRosterOnce(){
  const key = "etd_v251_roster_migrated_" + et251GameId();
  const gid = et251GameId();
  if(!gid) return;
  if(localStorage.getItem(key) === "1") return;

  // Only migrate players with no game_id into the currently active game.
  // After this, new games remain clean and separate.
  state.players.forEach(p => {
    if(!p.game_id) p.game_id = gid;
  });
  localStorage.setItem(key, "1");
  save();
}
function et251PlayerById(id){
  return state.players.find(p => p.id === id);
}
function et251SafePlayerName(id){
  const p = et251PlayerById(id);
  return p ? p.name : "Deleted player";
}

function et251DeletePlayer(id){
  const p = et251PlayerById(id);
  if(!p){
    alert("Player not found.");
    return;
  }

  const usedTags = state.tags.filter(t => t.batter_id === id || t.pitcher_id === id);
  const msg = usedTags.length
    ? "This player has " + usedTags.length + " tag(s). The player will be removed from the roster, but existing tags will keep the saved name. Delete player?"
    : "Delete " + p.name + " from this activity roster?";

  if(!confirm(msg)) return;

  // Preserve tag text before deleting player object
  state.tags.forEach(t => {
    if(t.batter_id === id && !t.batter) t.batter = p.name;
    if(t.pitcher_id === id && !t.pitcher) t.pitcher = p.name;
  });

  // Remove from lineup localStorage keys used by recent modules
  ["away","home"].forEach(side => {
    [
      "etd_clean_lineup_v241_",
      "etd_lineup_"
    ].forEach(prefix => {
      const key = prefix + et251GameId() + "_" + side;
      try{
        const ids = JSON.parse(localStorage.getItem(key) || "[]").filter(x => x !== id);
        localStorage.setItem(key, JSON.stringify(ids));
      }catch(e){}
    });
  });

  state.players = state.players.filter(x => x.id !== id);

  if(state.batter === id) state.batter = "";
  if(state.pitcher === id) state.pitcher = "";

  save();
  render();
}

function et251EditPlayer(id){
  const p = et251PlayerById(id);
  if(!p){
    alert("Player not found.");
    return;
  }
  $("editId").value = p.id;
  $("num").value = p.num || "";
  $("pname").value = p.name || "";
  $("team").value = p.team || "";
  $("role").value = p.role || "Bateador";
  if($("playerSide")) $("playerSide").value = p.side || "away";
  $("bat").value = p.bat || "";
  $("thr").value = p.thr || "";
  if($("position")) $("position").value = p.position || "";
  show("rosterScreen");
}

function et251SavePlayer(){
  const gid = et251GameId();
  if(!gid){
    alert("Create or select an activity first.");
    return;
  }

  const name = $("pname").value.trim();
  if(!name){
    alert("Nombre");
    return;
  }

  const id = $("editId").value;
  const payload = {
    game_id: gid,
    num: $("num").value,
    name,
    team: $("team").value,
    role: $("role").value,
    side: $("playerSide")?.value || "away",
    bat: $("bat").value,
    thr: $("thr").value,
    position: $("position")?.value || ""
  };

  if(id){
    const p = et251PlayerById(id);
    if(!p){
      alert("Player not found for editing.");
      return;
    }
    Object.assign(p, payload);
  }else{
    state.players.push({
      id: uid(),
      ...payload
    });
  }

  ["editId","num","pname","team"].forEach(id => {
    if($(id)) $(id).value = "";
  });
  if($("bat")) $("bat").value = "";
  if($("thr")) $("thr").value = "";
  if($("position")) $("position").value = "";

  save();
  render();
}

function et251CreateGameWrapper(){
  const g = {
    id: uid(),
    name: $("gname").value || "Activity",
    date: $("gdate").value || new Date().toISOString().slice(0,10),
    home: $("home").value || "Home",
    away: $("away").value || "Away",
    game_type: $("gameType")?.value || "game"
  };
  state.games.push(g);
  state.activeGameId = g.id;

  // New game starts with clean roster and clean lineup.
  state.batter = "";
  state.pitcher = "";
  ["away","home"].forEach(side => {
    [
      "etd_clean_lineup_v241_",
      "etd_lineup_"
    ].forEach(prefix => localStorage.setItem(prefix + g.id + "_" + side, "[]"));
  });

  save();
  render();
  show("tagScreen");
}

function et251RenderPlayers(){
  const q = ($("search")?.value || "").toLowerCase();
  const box = $("players");
  if(!box) return;

  et251MigrateRosterOnce();

  const players = et251RosterPlayers()
    .filter(p => !q || String(p.name || "").toLowerCase().includes(q));

  box.innerHTML = players.map(p => `
    <div class="playerCard">
      <div class="playerRow">
        <div class="num">${p.num || "-"}</div>
        <div>
          <b>${p.name}</b>
          <br><small>${p.team || "-"} · ${p.role || ""} · ${(p.side || "away") === "home" ? "Home" : "Visitor"}</small>
          <div class="rosterScopeV251">${et251GameLabel()}</div>
        </div>
        <div>${p.bat || ""} ${p.thr || ""}</div>
      </div>
      <div class="actions">
        <button type="button" onclick="et251EditPlayer('${p.id}')>Edit</button>
        <button type="button" class="danger" onclick="et251DeletePlayer('${p.id}')>Delete</button>
      </div>
    </div>
  `).join("") || "<p>No players are in this activity roster.</p>";

  // Keep existing batter/lineup behavior if v2.4.1 exists; otherwise use roster of current game.
  if($("batterList")){
    if(typeof v241LineupPlayers === "function"){
      try{
        const side = state.battingSide || "away";
        const lineup = v241LineupPlayers(side);
        $("batterList").innerHTML = lineup.map((p,i) => `
          <div class="lineupPlayerCleanV241">
            <div class="lineupMainCleanV241" onclick="selBatter('${p.id}')">
              <div class="lineupOrderCleanV241">${i+1}</div>
              <div>
                <div class="lineupNameCleanV241">${p.name}</div>
                <div class="lineupSubCleanV241">${p.bat || ""}</div>
              </div>
              <div class="lineupSubCleanV241">Select</div>
            </div>
            <div class="lineupActionsCleanV241">
              <button type="button" onclick="v241MoveLineup('${p.id}',-1)">↑</button>
              <button type="button" onclick="v241MoveLineup('${p.id}',1)">↓</button>
              <button type="button" class="danger" onclick="v241RemoveFromLineup('${p.id}')">X</button>
            </div>
          </div>
        `).join("") || "<p>No lineup yet. Tap Add from Roster.</p>";
      }catch(e){}
    }else{
      const side = state.battingSide || "away";
      const batters = et251RosterPlayers().filter(p => (p.role === "Bateador" || p.role === "Ambos") && (p.side || "away") === side);
      $("batterList").innerHTML = batters.map((p,i) => `
        <button class="listBtn" onclick="selBatter('${p.id}')">
          <span class="num">${p.num || i+1}</span><span>${p.name}</span><small>${p.bat || ""}</small>
        </button>
      `).join("") || "<p>No batters are in this activity.</p>";
    }
  }

  if($("pitcherList")){
    const pitchers = et251RosterPlayers().filter(p => p.role === "Pitcher" || p.role === "Ambos");
    $("pitcherList").innerHTML = pitchers.map((p,i) => `
      <button class="listBtn" onclick="selPitcher('${p.id}')">
        <span class="num">${p.num || i+1}</span><span>${p.name}</span><small>${p.thr || ""}</small>
      </button>
    `).join("") || "<p>No pitchers are in this activity.</p>";
  }
}

// Override only roster module functions.
window.et251DeletePlayer = et251DeletePlayer;
window.et251EditPlayer = et251EditPlayer;
window.delPlayer = et251DeletePlayer;
window.editPlayer = et251EditPlayer;
savePlayer = et251SavePlayer;
createGame = et251CreateGameWrapper;
renderPlayers = et251RenderPlayers;

// Patch global player lists used elsewhere so only active game is used.
bats = function(side=state.battingSide){
  const gid = et251GameId();
  let base = state.players.filter(p =>
    (p.game_id || "") === gid &&
    (p.role === "Bateador" || p.role === "Ambos") &&
    ((p.side || "away") === side)
  );

  // If lineup module exists, respect lineup order
  if(typeof v241LineupPlayers === "function"){
    try{
      const lineup = v241LineupPlayers(side);
      if(lineup && lineup.length) return lineup.filter(p => (p.game_id || "") === gid || !p.game_id);
    }catch(e){}
  }
  return base;
};

window.addEventListener("load", () => {
  et251MigrateRosterOnce();
  const versionEl = document.createElement("div");
  versionEl.style.display = "none";
  versionEl.id = "easyTaggVersion";
  versionEl.textContent = ET251_VERSION;
  document.body.appendChild(versionEl);
});


/* ================= EASY TAGG v2.5.2 ACTIVITY ROSTER FIX ================= */
const ET252_VERSION = "2.5.2 Activity Roster Fix";

function et252GameId(){
  return state.activeGameId || "";
}
function et252RosterKey(){
  return "etd_activity_roster_v252_" + (et252GameId() || "no_game");
}
function et252GetActivityIds(){
  try{
    const ids = JSON.parse(localStorage.getItem(et252RosterKey()) || "[]");
    return Array.isArray(ids) ? ids.filter(id => state.players.some(p => p.id === id)) : [];
  }catch(e){
    return [];
  }
}
function et252SetActivityIds(ids){
  localStorage.setItem(et252RosterKey(), JSON.stringify((ids || []).filter(Boolean)));
}
function et252ActivityPlayers(){
  const ids = et252GetActivityIds();
  return ids.map(id => state.players.find(p => p.id === id)).filter(Boolean);
}
function et252PlayerInActivity(id){
  return et252GetActivityIds().includes(id);
}
function et252AddToActivity(id){
  if(!et252GameId()){
    etAppAlert("Please create or select an activity before continuing.","ACTIVITY REQUIRED");
    return;
  }
  const ids = et252GetActivityIds();
  if(!ids.includes(id)) ids.push(id);
  et252SetActivityIds(ids);
  save();
  render();
  et252RenderPicker();
}
function et252RemoveFromActivity(id){
  if(!confirm("Remove this player from the current activity? The player will remain in the main roster.")) return;
  et252SetActivityIds(et252GetActivityIds().filter(x => x !== id));
  if(state.batter === id) state.batter = "";
  if(state.pitcher === id) state.pitcher = "";

  // Also remove from lineup keys for this game
  ["away","home"].forEach(side => {
    ["etd_clean_lineup_v241_", "etd_lineup_"].forEach(prefix => {
      const key = prefix + et252GameId() + "_" + side;
      try{
        const arr = JSON.parse(localStorage.getItem(key) || "[]").filter(x => x !== id);
        localStorage.setItem(key, JSON.stringify(arr));
      }catch(e){}
    });
  });

  save();
  render();
  et252RenderPicker();
}
function et252OpenPicker(){
  et252RenderPicker();
  openSheet("activityRosterSheetV252");
}
function et252RenderPicker(){
  const box = $("activityRosterListV252");
  if(!box) return;
  const ids = et252GetActivityIds();
  box.innerHTML = state.players.map((p,i) => {
    const inside = ids.includes(p.id);
    return `<div class="activityPlayerV252">
      <div class="num">${p.num || i+1}</div>
      <div>
        <b>${p.name}</b><br>
        <small>${p.team || "-"} · ${p.role || ""} · ${(p.side || "away") === "home" ? "Home" : "Visitor"}</small>
      </div>
      <button type="button" class="${inside ? "danger" : ""}" onclick="${inside ? "et252RemoveFromActivity" : "et252AddToActivity"}('${p.id}')">${inside ? "Remove" : "Add"}</button>
    </div>`;
  }).join("") || "<p>No players have been created in the main roster.</p>";
}
function et252DeleteGlobalPlayer(id){
  const p = state.players.find(x => x.id === id);
  if(!p){
    alert("Player not found.");
    return;
  }
  const used = state.tags.some(t => t.batter_id === id || t.pitcher_id === id);
  const msg = used
    ? "This player has saved tags. The player will be removed from the main roster and all activities, but existing tags will keep the saved name. Delete player?"
    : "Delete " + p.name + " from the main roster?";
  if(!confirm(msg)) return;

  // Preserve tag names
  state.tags.forEach(t => {
    if(t.batter_id === id && !t.batter) t.batter = p.name;
    if(t.pitcher_id === id && !t.pitcher) t.pitcher = p.name;
  });

  state.players = state.players.filter(x => x.id !== id);

  // Remove from all activity rosters and lineups
  Object.keys(localStorage).forEach(k => {
    if(k.startsWith("etd_activity_roster_v252_") || k.startsWith("etd_clean_lineup_v241_") || k.startsWith("etd_lineup_")){
      try{
        const arr = JSON.parse(localStorage.getItem(k) || "[]").filter(x => x !== id);
        localStorage.setItem(k, JSON.stringify(arr));
      }catch(e){}
    }
  });

  if(state.batter === id) state.batter = "";
  if(state.pitcher === id) state.pitcher = "";
  save();
  render();
}
function et252SavePlayer(){
  const name = $("pname").value.trim();
  if(!name) return alert("Nombre");

  const id = $("editId").value;
  const payload = {
    num: $("num").value,
    name,
    team: $("team").value,
    role: $("role").value,
    side: $("playerSide")?.value || "away",
    bat: $("bat").value,
    thr: $("thr").value,
    position: $("position")?.value || ""
  };

  if(id){
    const p = state.players.find(x => x.id === id);
    if(!p) return alert("Player not found for editing.");
    Object.assign(p, payload);
  }else{
    const newId = uid();
    state.players.push({ id: newId, ...payload });
    // New player is automatically added to current activity if there is one.
    if(et252GameId()){
      const ids = et252GetActivityIds();
      ids.push(newId);
      et252SetActivityIds(ids);
    }
  }

  ["editId","num","pname","team"].forEach(id => { if($(id)) $(id).value = ""; });
  if($("bat")) $("bat").value = "";
  if($("thr")) $("thr").value = "";
  if($("position")) $("position").value = "";

  save();
  render();
}
function et252CreateGameWrapper(){
  const g = {
    id: uid(),
    name: $("gname").value || "Activity",
    date: $("gdate").value || new Date().toISOString().slice(0,10),
    home: $("home").value || "Home",
    away: $("away").value || "Away",
    game_type: $("gameType")?.value || "game"
  };
  state.games.push(g);
  state.activeGameId = g.id;
  state.batter = "";
  state.pitcher = "";
  localStorage.setItem("etd_activity_roster_v252_" + g.id, "[]");
  ["away","home"].forEach(side => {
    ["etd_clean_lineup_v241_", "etd_lineup_"].forEach(prefix => localStorage.setItem(prefix + g.id + "_" + side, "[]"));
  });
  save();
  render();
  show("tagScreen");
}
function et299FormatPlayerDate(value){
  const raw=String(value||"").trim();
  if(!raw) return "";
  const m=raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if(m) return `${m[2].padStart(2,"0")}/${m[1].padStart(2,"0")}/${m[3]}`;
  const iso=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(iso) return `${iso[3].padStart(2,"0")}/${iso[2].padStart(2,"0")}/${iso[1]}`;
  return raw;
}
function et299PlayerDetails(p){
  const rows=[];
  const code=String(p.db_player_code||p.player_code||"").trim();
  const birth=et299FormatPlayerDate(p.birth_date);
  const eligible=String(p.date_eligible||p.eligible||"").trim();
  if(code) rows.push(`<span><b>Code:</b> ${xlsEsc(code)}</span>`);
  if(p.position) rows.push(`<span><b>Pos:</b> ${xlsEsc(p.position)}</span>`);
  if(p.country) rows.push(`<span><b>Country:</b> ${xlsEsc(p.country)}</span>`);
  if(birth) rows.push(`<span><b>Nacimiento:</b> ${xlsEsc(birth)}</span>`);
  if(eligible) rows.push(`<span><b>Elegible:</b> ${xlsEsc(eligible)}</span>`);
  if(p.role) rows.push(`<span><b>Role:</b> ${xlsEsc(p.role)}</span>`);
  rows.push(`<span><b>Equipo:</b> ${(p.side||"away")==="home"?"Home":"Visitor"}</span>`);
  return rows.length?`<div class="playerDetailsV299">${rows.join("")}</div>`:"";
}

function et252RenderPlayers(){
  const q = ($("search")?.value || "").toLowerCase();
  const box = $("players");
  if(box){
    const activePlayers = et252ActivityPlayers().filter(p => !q || String(p.name || "").toLowerCase().includes(q));
    box.innerHTML = activePlayers.map(p => `
      <div class="playerCard">
        <div class="playerRow">
          <div class="num">${p.num || "-"}</div>
          <div class="playerMainInfoV299">
            <b>${p.name}</b>
            ${et299PlayerDetails(p)}
            <div class="activityScopeV252">Actividad actual</div>
          </div>
          <div class="playerHandV299">${p.bat || ""}${p.bat && p.thr ? " / " : ""}${p.thr || ""}</div>
        </div>
        <div class="actions">
          <button type="button" onclick="editPlayer('${p.id}')>Edit</button>
          <button type="button" onclick="et252RemoveFromActivity('${p.id}')">Remove from Activity</button>
          <button type="button" class="danger" onclick="et252DeleteGlobalPlayer('${p.id}')>Delete</button>
        </div>
      </div>
    `).join("") || "<p>No players are assigned to this activity. Use Add Existing Player or create a new one.</p>";
  }

  const side = state.battingSide || "away";
  const activeIds = et252GetActivityIds();

  // Batter list respects lineup if module exists, but filters by current activity.
  if($("batterList")){
    let batters = [];
    if(typeof v241LineupPlayers === "function"){
      try{ batters = v241LineupPlayers(side).filter(p => activeIds.includes(p.id)); }catch(e){ batters = []; }
    }
    if(!batters.length){
      batters = et252ActivityPlayers().filter(p => (p.role === "Bateador" || p.role === "Ambos") && (p.side || "away") === side);
    }
    $("batterList").innerHTML = batters.map((p,i) => `
      <button class="listBtn" onclick="selBatter('${p.id}')">
        <span class="num">${p.num || i+1}</span><span>${p.name}</span><small>${p.bat || ""}</small>
      </button>
    `).join("") || "<p>No batters are assigned to this activity.</p>";
  }

  if($("pitcherList")){
    const pitchers = et252ActivityPlayers().filter(p => p.role === "Pitcher" || p.role === "Ambos");
    $("pitcherList").innerHTML = pitchers.map((p,i) => `
      <button class="listBtn" onclick="selPitcher('${p.id}')">
        <span class="num">${p.num || i+1}</span><span>${p.name}</span><small>${p.thr || ""}</small>
      </button>
    `).join("") || "<p>No pitchers are assigned to this activity.</p>";
  }
}

// Override roster module only.
window.et252AddToActivity = et252AddToActivity;
window.et252RemoveFromActivity = et252RemoveFromActivity;
window.et252OpenPicker = et252OpenPicker;
window.et252DeleteGlobalPlayer = et252DeleteGlobalPlayer;
window.delPlayer = et252DeleteGlobalPlayer;
savePlayer = et252SavePlayer;
createGame = et252CreateGameWrapper;
renderPlayers = et252RenderPlayers;

bats = function(side=state.battingSide){
  const activeIds = et252GetActivityIds();
  let list = [];
  if(typeof v241LineupPlayers === "function"){
    try{ list = v241LineupPlayers(side).filter(p => activeIds.includes(p.id)); }catch(e){ list = []; }
  }
  if(list.length) return list;
  return et252ActivityPlayers().filter(p => (p.role === "Bateador" || p.role === "Ambos") && (p.side || "away") === side);
};

window.addEventListener("load", () => {
  const btn = document.getElementById("addToActivityRosterBtnV252");
  if(btn) btn.onclick = et252OpenPicker;
});


/* ================= EASY TAGG v2.5.3 STRICT ACTIVITY ROSTER ================= */
const ET253_VERSION = "2.5.3 Strict Activity Roster";

function et253GameId(){
  return state.activeGameId || "";
}
function et253ActivityKey(){
  return "etd_activity_roster_v252_" + (et253GameId() || "no_game");
}
function et253GetIds(){
  try{
    const arr = JSON.parse(localStorage.getItem(et253ActivityKey()) || "[]");
    return Array.isArray(arr) ? arr.filter(id => state.players.some(p => p.id === id)) : [];
  }catch(e){
    return [];
  }
}
function et253SetIds(ids){
  localStorage.setItem(et253ActivityKey(), JSON.stringify((ids || []).filter(Boolean)));
}
function et253Players(){
  const ids = et253GetIds();
  return ids.map(id => state.players.find(p => p.id === id)).filter(Boolean);
}
function et253HasPlayer(id){
  return et253GetIds().includes(id);
}
function et253CleanSelections(){
  const ids = et253GetIds();
  if(state.batter && !ids.includes(state.batter)) state.batter = "";
  if(state.pitcher && !ids.includes(state.pitcher)) state.pitcher = "";
}
function et253CleanLineups(){
  const ids = et253GetIds();
  ["away","home"].forEach(side => {
    ["etd_clean_lineup_v241_", "etd_lineup_"].forEach(prefix => {
      const key = prefix + et253GameId() + "_" + side;
      try{
        const old = JSON.parse(localStorage.getItem(key) || "[]");
        const clean = Array.isArray(old) ? old.filter(id => ids.includes(id)) : [];
        localStorage.setItem(key, JSON.stringify(clean));
      }catch(e){}
    });
  });
}
function et253Sync(){
  et253CleanLineups();
  et253CleanSelections();
}
function et253AddToActivity(id){
  if(!et253GameId()){
    etAppAlert("Please create or select an activity before continuing.","ACTIVITY REQUIRED");
    return;
  }
  const ids = et253GetIds();
  if(!ids.includes(id)) ids.push(id);
  et253SetIds(ids);
  et253Sync();
  save();
  render();
  if(typeof et252RenderPicker === "function"){
    try{ et252RenderPicker(); }catch(e){}
  }
}
function et253RemoveFromActivity(id){
  const p = state.players.find(x => x.id === id);
  if(!p) return;
  if(!confirm("Remove " + p.name + " from this activity? The player will remain in the main roster.")) return;
  et253SetIds(et253GetIds().filter(x => x !== id));
  et253Sync();
  save();
  render();
  if(typeof et252RenderPicker === "function"){
    try{ et252RenderPicker(); }catch(e){}
  }
}
function et253Batters(side=state.battingSide){
  et253Sync();
  const active = et253Players();
  return active.filter(p =>
    (p.role === "Bateador" || p.role === "Ambos") &&
    ((p.side || "away") === side)
  );
}
function et253Pitchers(){
  et253Sync();
  return et253Players().filter(p => p.role === "Pitcher" || p.role === "Ambos");
}
function et253LineupPlayers(side=state.battingSide){
  const ids = et253GetIds();
  let lineup = [];

  if(typeof v241LineupPlayers === "function"){
    try{ lineup = v241LineupPlayers(side).filter(p => ids.includes(p.id)); }catch(e){ lineup = []; }
  }

  if(!lineup.length){
    lineup = et253Batters(side);
  }

  return lineup;
}
function et253RenderRoster(){
  const q = ($("search")?.value || "").toLowerCase();
  const box = $("players");

  et253Sync();

  if(box){
    const active = et253Players().filter(p => !q || String(p.name || "").toLowerCase().includes(q));
    box.innerHTML = active.map(p => `
      <div class="playerCard">
        <div class="playerRow">
          <div class="num">${p.num || "-"}</div>
          <div>
            <b>${p.name}</b><br>
            <small>${p.team || "-"} · ${p.role || ""} · ${(p.side || "away") === "home" ? "Home" : "Visitor"}</small>
            <div class="strictRosterV253">Solo actividad actual</div>
          </div>
          <div>${p.bat || ""} ${p.thr || ""}</div>
        </div>
        <div class="actions">
          <button type="button" onclick="editPlayer('${p.id}')>Edit</button>
          <button type="button" onclick="et253RemoveFromActivity('${p.id}')">Remove from Activity</button>
          <button type="button" class="danger" onclick="et252DeleteGlobalPlayer('${p.id}')>Delete</button>
        </div>
      </div>
    `).join("") || "<p>No players are assigned to this activity.</p>";
  }

  if($("batterList")){
    const side = state.battingSide || "away";
    const lineup = et253LineupPlayers(side);
    $("batterList").innerHTML = lineup.map((p,i) => `
      <button class="listBtn" onclick="selBatter('${p.id}')">
        <span class="num">${p.num || i+1}</span>
        <span>${p.name}</span>
        <small>${p.bat || ""}</small>
      </button>
    `).join("") || "<p>No batters are assigned to this activity.</p>";
  }

  if($("pitcherList")){
    const pitchers = et253Pitchers();
    $("pitcherList").innerHTML = pitchers.map((p,i) => `
      <button class="listBtn" onclick="selPitcher('${p.id}')">
        <span class="num">${p.num || i+1}</span>
        <span>${p.name}</span>
        <small>${p.thr || ""}</small>
      </button>
    `).join("") || "<p>No pitchers are assigned to this activity.</p>";
  }
}
function et253RenderPicker(){
  const box = $("activityRosterListV252");
  if(!box) return;

  const ids = et253GetIds();
  box.innerHTML = state.players.map((p,i) => {
    const inside = ids.includes(p.id);
    return `<div class="activityPlayerV252">
      <div class="num">${p.num || i+1}</div>
      <div>
        <b>${p.name}</b><br>
        <small>${p.team || "-"} · ${p.role || ""} · ${(p.side || "away") === "home" ? "Home" : "Visitor"}</small>
      </div>
      <button type="button" class="${inside ? "danger" : ""}" onclick="${inside ? "et253RemoveFromActivity" : "et253AddToActivity"}('${p.id}')">${inside ? "Remove" : "Add"}</button>
    </div>`;
  }).join("") || "<p>No players are in the main roster.</p>";
}

// Force all roster/activity functions to strict mode.
window.et253AddToActivity = et253AddToActivity;
window.et253RemoveFromActivity = et253RemoveFromActivity;
window.et252AddToActivity = et253AddToActivity;
window.et252RemoveFromActivity = et253RemoveFromActivity;
window.et252RenderPicker = et253RenderPicker;
renderLineupRosterV241 = function(){
  // This is the "Agregar del roster" sheet inside Bateadores.
  // It must show only players from current activity, never global roster.
  const box = $("lineupRosterListV241");
  if(!box) return;
  const side = state.battingSide || "away";
  const activeIds = et253GetIds();
  let lineupIds = [];
  try{
    lineupIds = JSON.parse(localStorage.getItem("etd_clean_lineup_v241_" + et253GameId() + "_" + side) || "[]");
  }catch(e){ lineupIds = []; }

  const available = et253Players().filter(p =>
    activeIds.includes(p.id) &&
    (p.role === "Bateador" || p.role === "Ambos") &&
    ((p.side || "away") === side)
  );

  box.innerHTML = available.map((p,i) => {
    const inLineup = lineupIds.includes(p.id);
    return `<div class="rosterAddCleanV241">
      <div class="lineupOrderCleanV241">${p.num || i+1}</div>
      <div>
        <div class="lineupNameCleanV241">${p.name}</div>
        <div class="lineupSubCleanV241">${p.team || "-"} · ${p.bat || ""}</div>
      </div>
      <button type="button" class="${inLineup ? "danger" : ""}" onclick="${inLineup ? "v241RemoveFromLineup" : "v241AddToLineup"}('${p.id}')">${inLineup ? "Remove" : "Add"}</button>
    </div>`;
  }).join("") || "<p>No players from this activity are available to add to the lineup.</p>";
};

renderPlayers = et253RenderRoster;
bats = function(side=state.battingSide){ return et253LineupPlayers(side); };

// Patch game selector change to clean immediately after switching games.
window.addEventListener("load", () => {
  const gameSelect = $("gameSelect");
  if(gameSelect){
    const old = gameSelect.onchange;
    gameSelect.onchange = e => {
      state.activeGameId = e.target.value;
      et253Sync();
      save();
      render();
    };
  }

  const btn = document.getElementById("addToActivityRosterBtnV252");
  if(btn){
    btn.onclick = () => {
      et253RenderPicker();
      openSheet("activityRosterSheetV252");
    };
  }
});


/* ================= EASY TAGG v2.5.4 SIMPLE ROSTER FORM ================= */
const ET254_SIMPLE_VERSION = "2.5.4 Simple Roster Form";

function et254ActivityIds(){
  try{
    const key = "etd_activity_roster_v252_" + (state.activeGameId || "no_game");
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(arr) ? arr.filter(id => state.players.some(p => p.id === id)) : [];
  }catch(e){ return []; }
}
function et254SetActivityIds(ids){
  const key = "etd_activity_roster_v252_" + (state.activeGameId || "no_game");
  localStorage.setItem(key, JSON.stringify((ids || []).filter(Boolean)));
}
function et254ActivityPlayers(){
  const ids = et254ActivityIds();
  return ids.map(id => state.players.find(p => p.id === id)).filter(Boolean);
}
function et254HandText(p){
  if(!p) return "";
  if(p.role === "Pitcher") return p.thr || "";
  if(p.role === "Bateador") return p.bat || "";
  return [p.bat || "", p.thr || ""].filter(Boolean).join(" / ");
}
function et254EditPlayer(id){
  const p = state.players.find(x => x.id === id);
  if(!p){ alert("Player not found."); return; }
  $("editId").value = p.id;
  $("num").value = p.num || "";
  $("pname").value = p.name || "";
  if($("team")) $("team").value = "";
  $("role").value = p.role || "Bateador";
  if($("playerSide")) $("playerSide").value = "away";
  $("bat").value = p.bat || "";
  $("thr").value = p.thr || "";
  if($("position")) $("position").value = "";
  show("rosterScreen");
}
function et254SavePlayer(){
  const name = $("pname").value.trim();
  if(!name) return alert("Nombre");

  const role = $("role").value || "Bateador";
  const id = $("editId").value;
  const payload = {
    num: $("num").value,
    name,
    team: "",
    role,
    side: "away",
    bat: role === "Pitcher" ? "" : $("bat").value,
    thr: role === "Bateador" ? "" : $("thr").value,
    position: ""
  };

  if(id){
    const p = state.players.find(x => x.id === id);
    if(!p) return alert("Player not found for editing.");
    Object.assign(p, payload);
  }else{
    const newId = uid();
    state.players.push({id:newId, ...payload});
    if(state.activeGameId){
      const ids = et254ActivityIds();
      if(!ids.includes(newId)) ids.push(newId);
      et254SetActivityIds(ids);
    }
  }

  ["editId","num","pname"].forEach(id => { if($(id)) $(id).value = ""; });
  if($("bat")) $("bat").value = "";
  if($("thr")) $("thr").value = "";
  save();
  render();
}
function et254DeletePlayer(id){
  const p = state.players.find(x => x.id === id);
  if(!p){ alert("Player not found."); return; }
  const used = state.tags.some(t => t.batter_id === id || t.pitcher_id === id);
  const msg = used
    ? "This player has tags. The player will be removed from the roster and activities, but existing tags will keep the saved name. Delete player?"
    : "Delete " + p.name + " from the roster?";
  if(!confirm(msg)) return;

  state.tags.forEach(t => {
    if(t.batter_id === id && !t.batter) t.batter = p.name;
    if(t.pitcher_id === id && !t.pitcher) t.pitcher = p.name;
  });

  state.players = state.players.filter(x => x.id !== id);

  Object.keys(localStorage).forEach(k => {
    if(k.startsWith("etd_activity_roster_v252_") || k.startsWith("etd_clean_lineup_v241_") || k.startsWith("etd_lineup_")){
      try{
        const arr = JSON.parse(localStorage.getItem(k) || "[]").filter(x => x !== id);
        localStorage.setItem(k, JSON.stringify(arr));
      }catch(e){}
    }
  });

  if(state.batter === id) state.batter = "";
  if(state.pitcher === id) state.pitcher = "";
  save();
  render();
}
function et254RemoveFromActivity(id){
  const p = state.players.find(x => x.id === id);
  if(!p) return;
  if(!confirm("Remove " + p.name + " from this activity? The player will remain in the main roster.")) return;
  et254SetActivityIds(et254ActivityIds().filter(x => x !== id));
  if(state.batter === id) state.batter = "";
  if(state.pitcher === id) state.pitcher = "";
  save();
  render();
}
function et254RoleAllowedForBatter(p){
  return p && (p.role === "Bateador" || p.role === "Ambos");
}
function et254RoleAllowedForPitcher(p){
  return p && (p.role === "Pitcher" || p.role === "Ambos");
}
function et254RenderPlayers(){
  const q = ($("search")?.value || "").toLowerCase();
  const box = $("players");

  if(box){
    const active = et254ActivityPlayers().filter(p => !q || String(p.name || "").toLowerCase().includes(q));
    box.innerHTML = active.map(p => `
      <div class="playerCard">
        <div class="playerRow">
          <div class="num">${p.num || "-"}</div>
          <div>
            <b>${p.name}</b><br>
            <small>${p.role || ""} · ${et254HandText(p) || "-"}</small>
            <div class="simpleRosterV254">Solo actividad actual</div>
          </div>
          <div class="simpleRosterTypeV254">${et254HandText(p)}</div>
        </div>
        <div class="actions">
          <button type="button" onclick="et254EditPlayer('${p.id}')>Edit</button>
          <button type="button" onclick="et254RemoveFromActivity('${p.id}')">Remove from Activity</button>
          <button type="button" class="danger" onclick="et254DeletePlayer('${p.id}')>Delete</button>
        </div>
      </div>
    `).join("") || "<p>No players are assigned to this activity.</p>";
  }

  if($("batterList")){
    const batters = et254ActivityPlayers().filter(et254RoleAllowedForBatter);
    $("batterList").innerHTML = batters.map((p,i) => `
      <button class="listBtn" onclick="selBatter('${p.id}')">
        <span class="num">${p.num || i+1}</span>
        <span>${p.name}</span>
        <small>${p.bat || ""}</small>
      </button>
    `).join("") || "<p>No batters are assigned to this activity.</p>";
  }

  if($("pitcherList")){
    const pitchers = et254ActivityPlayers().filter(et254RoleAllowedForPitcher);
    $("pitcherList").innerHTML = pitchers.map((p,i) => `
      <button class="listBtn" onclick="selPitcher('${p.id}')">
        <span class="num">${p.num || i+1}</span>
        <span>${p.name}</span>
        <small>${p.thr || ""}</small>
      </button>
    `).join("") || "<p>No pitchers are assigned to this activity.</p>";
  }
}
function et254RenderActivityPicker(){
  const box = $("activityRosterListV252");
  if(!box) return;
  const ids = et254ActivityIds();
  box.innerHTML = state.players.map((p,i) => {
    const inside = ids.includes(p.id);
    return `<div class="activityPlayerV252">
      <div class="num">${p.num || i+1}</div>
      <div>
        <b>${p.name}</b><br>
        <small>${p.role || ""} · ${et254HandText(p) || "-"}</small>
      </div>
      <button type="button" class="${inside ? "danger" : ""}" onclick="${inside ? "et254RemoveFromActivity" : "et254AddToActivity"}('${p.id}')">${inside ? "Remove" : "Add"}</button>
    </div>`;
  }).join("") || "<p>No players are in the main roster.</p>";
}
function et254AddToActivity(id){
  const ids = et254ActivityIds();
  if(!ids.includes(id)) ids.push(id);
  et254SetActivityIds(ids);
  save();
  render();
  et254RenderActivityPicker();
}

window.et254EditPlayer = et254EditPlayer;
window.et254SavePlayer = et254SavePlayer;
window.et254DeletePlayer = et254DeletePlayer;
window.et254RemoveFromActivity = et254RemoveFromActivity;
window.et254AddToActivity = et254AddToActivity;
window.et252AddToActivity = et254AddToActivity;
window.et252RemoveFromActivity = et254RemoveFromActivity;
window.et252RenderPicker = et254RenderActivityPicker;
window.delPlayer = et254DeletePlayer;
window.editPlayer = et254EditPlayer;
savePlayer = et254SavePlayer;
renderPlayers = et254RenderPlayers;

bats = function(side=state.battingSide){
  return et254ActivityPlayers().filter(et254RoleAllowedForBatter);
};

window.addEventListener("load", () => {
  const btn = document.getElementById("addToActivityRosterBtnV252");
  if(btn){
    btn.onclick = () => {
      et254RenderActivityPicker();
      openSheet("activityRosterSheetV252");
    };
  }
});


/* ================= EASY TAGG v2.5.5 SIMPLE ROSTER + LINEUP FIX ================= */
const ET255_VERSION = "2.5.5 Simple Roster Lineup Fix";

function et255GameId(){ return state.activeGameId || ""; }
function et255ActivityKey(){ return "etd_activity_roster_v252_" + (et255GameId() || "no_game"); }
function et255LineupKey(){ return "etd_lineup_v255_" + (et255GameId() || "no_game"); }

function et255GetActivityIds(){
  try{
    const arr = JSON.parse(localStorage.getItem(et255ActivityKey()) || "[]");
    return Array.isArray(arr) ? arr.filter(id => state.players.some(p => p.id === id)) : [];
  }catch(e){ return []; }
}
function et255ActivityPlayers(){
  const ids = et255GetActivityIds();
  return ids.map(id => state.players.find(p => p.id === id)).filter(Boolean);
}
function et255IsBatter(p){ return p && (p.role === "Bateador" || p.role === "Ambos"); }
function et255IsPitcher(p){ return p && (p.role === "Pitcher" || p.role === "Ambos"); }
function et255GetLineup(){
  try{
    const activeIds = et255GetActivityIds();
    const ids = JSON.parse(localStorage.getItem(et255LineupKey()) || "[]");
    return Array.isArray(ids) ? ids.filter(id => activeIds.includes(id) && et255IsBatter(state.players.find(p => p.id === id))) : [];
  }catch(e){ return []; }
}
function et255SetLineup(ids){
  const activeIds = et255GetActivityIds();
  const clean = (ids || []).filter(id => activeIds.includes(id) && et255IsBatter(state.players.find(p => p.id === id)));
  localStorage.setItem(et255LineupKey(), JSON.stringify(clean));
}
function et255LineupPlayers(){
  return et255GetLineup().map(id => state.players.find(p => p.id === id)).filter(Boolean);
}
function et255AddToLineup(id){
  const p = state.players.find(x => x.id === id);
  if(!p || !et255IsBatter(p)) return;
  const ids = et255GetLineup();
  if(!ids.includes(id)) ids.push(id);
  et255SetLineup(ids);
  save();
  render();
  et255RenderLineupPicker();
}
function et255RemoveFromLineup(id){
  et255SetLineup(et255GetLineup().filter(x => x !== id));
  if(state.batter === id){
    const next = et255GetLineup()[0];
    state.batter = next || "";
  }
  save();
  render();
  et255RenderLineupPicker();
}
function et255MoveLineup(id, dir){
  const ids = et255GetLineup();
  const i = ids.indexOf(id);
  const j = i + dir;
  if(i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  et255SetLineup(ids);
  save();
  render();
}
function et255OpenLineupPicker(){
  et255RenderLineupPicker();
  openSheet("lineupAddSheetV255");
}
function et255RenderLineupPicker(){
  const box = $("lineupRosterListV255");
  if(!box) return;
  const lineupIds = et255GetLineup();
  const available = et255ActivityPlayers().filter(et255IsBatter);
  box.innerHTML = available.map((p,i) => {
    const inside = lineupIds.includes(p.id);
    return `<div class="rosterAddCleanV255">
      <div class="lineupOrderCleanV255">${p.num || i+1}</div>
      <div>
        <div class="lineupNameCleanV255">${p.name}</div>
        <div class="lineupSubCleanV255">${p.bat || ""}</div>
      </div>
      <button type="button" class="${inside ? "danger" : ""}" onclick="${inside ? "et255RemoveFromLineup" : "et255AddToLineup"}('${p.id}')">${inside ? "Remove" : "Add"}</button>
    </div>`;
  }).join("") || "<p>No batters are assigned to this activity.</p>";
}
function et255HandText(p){
  if(!p) return "";
  if(p.role === "Pitcher") return p.thr || "";
  if(p.role === "Bateador") return p.bat || "";
  return [p.bat || "", p.thr || ""].filter(Boolean).join(" / ");
}
function et255RenderPlayers(){
  const q = ($("search")?.value || "").toLowerCase();
  const box = $("players");
  const active = et255ActivityPlayers();

  if(box){
    const filtered = active.filter(p => !q || String(p.name || "").toLowerCase().includes(q));
    box.innerHTML = filtered.map(p => `
      <div class="playerCard">
        <div class="playerRow">
          <div class="num">${p.num || "-"}</div>
          <div>
            <b>${p.name}</b><br>
            <small>${p.role || ""} · ${et255HandText(p) || "-"}</small>
            <div class="simpleRosterV254">Solo actividad actual</div>
          </div>
          <div class="simpleRosterTypeV254">${et255HandText(p)}</div>
        </div>
        <div class="actions">
          <button type="button" onclick="et254EditPlayer('${p.id}')>Edit</button>
          <button type="button" onclick="et254RemoveFromActivity('${p.id}')">Remove from Activity</button>
          <button type="button" class="danger" onclick="et254DeletePlayer('${p.id}')>Delete</button>
        </div>
      </div>
    `).join("") || "<p>No players are assigned to this activity.</p>";
  }

  if($("batterList")){
    const lineup = et255LineupPlayers();
    $("batterList").innerHTML = lineup.map((p,i) => `
      <div class="lineupPlayerCleanV255">
        <div class="lineupMainCleanV255" onclick="selBatter('${p.id}')">
          <div class="lineupOrderCleanV255">${i+1}</div>
          <div>
            <div class="lineupNameCleanV255">${p.name}</div>
            <div class="lineupSubCleanV255">${p.bat || ""}</div>
          </div>
          <div class="lineupSubCleanV255">Select</div>
        </div>
        <div class="lineupActionsCleanV255">
          <button type="button" onclick="et255MoveLineup('${p.id}',-1)">↑</button>
          <button type="button" onclick="et255MoveLineup('${p.id}',1)">↓</button>
          <button type="button" class="danger" onclick="et255RemoveFromLineup('${p.id}')">X</button>
        </div>
      </div>
    `).join("") || "<p>No lineup yet. Tap Add from Roster.</p>";
  }

  if($("pitcherList")){
    const pitchers = active.filter(et255IsPitcher);
    $("pitcherList").innerHTML = pitchers.map((p,i) => `
      <button class="listBtn" onclick="selPitcher('${p.id}')">
        <span class="num">${p.num || i+1}</span>
        <span>${p.name}</span>
        <small>${p.thr || ""}</small>
      </button>
    `).join("") || "<p>No pitchers are assigned to this activity.</p>";
  }
}

window.et255AddToLineup = et255AddToLineup;
window.et255RemoveFromLineup = et255RemoveFromLineup;
window.et255MoveLineup = et255MoveLineup;
window.et255OpenLineupPicker = et255OpenLineupPicker;

renderPlayers = et255RenderPlayers;
bats = function(){ return et255LineupPlayers(); };

window.addEventListener("load", () => {
  const btn = document.getElementById("lineupAddBtnV255");
  if(btn) btn.onclick = et255OpenLineupPicker;
});


/* ================= EASY TAGG v2.7 DUAL LINEUP ENGINE ================= */
const ET27_VERSION = "2.7 Dual Lineup Engine";

function et27GameId(){ return state.activeGameId || ""; }
function et27Side(){ return state.battingSide || "away"; }
function et27SetSide(side){
  state.battingSide = side;
  if($("battingSide")) $("battingSide").value = side;
  const next = et27CurrentBatterId(side);
  state.batter = next || "";
  save();
  render();
}
function et27ActivityKey(){ return "etd_activity_roster_v252_" + (et27GameId() || "no_game"); }
function et27LineupKey(side){ return "etd_dual_lineup_v27_" + (et27GameId() || "no_game") + "_" + (side || "away"); }
function et27IndexKey(side){ return "etd_dual_lineup_index_v27_" + (et27GameId() || "no_game") + "_" + (side || "away"); }

function et27GetActivityIds(){
  try{
    const arr = JSON.parse(localStorage.getItem(et27ActivityKey()) || "[]");
    return Array.isArray(arr) ? arr.filter(id => state.players.some(p => p.id === id)) : [];
  }catch(e){ return []; }
}
function et27ActivityPlayers(){
  const ids = et27GetActivityIds();
  return ids.map(id => state.players.find(p => p.id === id)).filter(Boolean);
}
function et27IsBatter(p){ return p && (p.role === "Bateador" || p.role === "Ambos"); }
function et27IsPitcher(p){ return p && (p.role === "Pitcher" || p.role === "Ambos"); }
function et27GetLineup(side=et27Side()){
  try{
    const activeIds = et27GetActivityIds();
    const ids = JSON.parse(localStorage.getItem(et27LineupKey(side)) || "[]");
    return Array.isArray(ids) ? ids.filter(id => activeIds.includes(id) && et27IsBatter(state.players.find(p => p.id === id))) : [];
  }catch(e){ return []; }
}
function et27SetLineup(side, ids){
  const activeIds = et27GetActivityIds();
  const clean = (ids || []).filter(id => activeIds.includes(id) && et27IsBatter(state.players.find(p => p.id === id)));
  localStorage.setItem(et27LineupKey(side), JSON.stringify(clean));
  const idx = et27GetIndex(side);
  if(clean.length && idx >= clean.length) et27SetIndex(side, 0);
}
function et27GetIndex(side=et27Side()){
  return Number(localStorage.getItem(et27IndexKey(side)) || 0) || 0;
}
function et27SetIndex(side, idx){
  const lu = et27GetLineup(side);
  const safe = lu.length ? ((Number(idx)||0) % lu.length + lu.length) % lu.length : 0;
  localStorage.setItem(et27IndexKey(side), String(safe));
}
function et27CurrentBatterId(side=et27Side()){
  const lu = et27GetLineup(side);
  if(!lu.length) return "";
  return lu[et27GetIndex(side)] || lu[0] || "";
}
function et27LineupPlayers(side=et27Side()){
  return et27GetLineup(side).map(id => state.players.find(p => p.id === id)).filter(Boolean);
}
function et27AddToLineup(id, side=et27Side()){
  const p = state.players.find(x => x.id === id);
  if(!p || !et27IsBatter(p)) return;
  const ids = et27GetLineup(side);
  if(!ids.includes(id)) ids.push(id);
  et27SetLineup(side, ids);
  if(!state.batter && side === et27Side()) state.batter = et27CurrentBatterId(side);
  save();
  render();
  et27RenderLineupPicker();
}
function et27RemoveFromLineup(id, side=et27Side()){
  et27SetLineup(side, et27GetLineup(side).filter(x => x !== id));
  if(state.batter === id) state.batter = et27CurrentBatterId(side);
  save();
  render();
  et27RenderLineupPicker();
}
function et27MoveLineup(id, dir, side=et27Side()){
  const ids = et27GetLineup(side);
  const i = ids.indexOf(id);
  const j = i + dir;
  if(i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  et27SetLineup(side, ids);
  if(state.batter === id) et27SetIndex(side, j);
  save();
  render();
}
function et27SelectBatter(id){
  const side = et27Side();
  const ids = et27GetLineup(side);
  const idx = ids.indexOf(id);
  if(idx >= 0) et27SetIndex(side, idx);
  state.batter = id;
  save();
  closeSheets();
  render();
}
function et27AdvanceBatter(){
  const side = et27Side();
  const lu = et27GetLineup(side);
  if(!lu.length) return;
  et27SetIndex(side, et27GetIndex(side) + 1);
  state.batter = et27CurrentBatterId(side);
}
function et27OpenLineupPicker(){
  et27RenderLineupPicker();
  openSheet("lineupAddSheetV255");
}
function et27RenderLineupPicker(){
  const box = $("lineupRosterListV255");
  if(!box) return;
  const side = et27Side();
  const lineupIds = et27GetLineup(side);
  const available = et27ActivityPlayers().filter(et27IsBatter);
  box.innerHTML = available.map((p,i) => {
    const inside = lineupIds.includes(p.id);
    return `<div class="rosterAddCleanV255">
      <div class="lineupOrderCleanV255">${p.num || i+1}</div>
      <div>
        <div class="lineupNameCleanV255">${p.name}</div>
        <div class="lineupSubCleanV255">${p.bat || ""}</div>
      </div>
      <button type="button" class="${inside ? "danger" : ""}" onclick="${inside ? "et27RemoveFromLineup" : "et27AddToLineup"}('${p.id}','${side}')">${inside ? "Remove" : "Add"}</button>
    </div>`;
  }).join("") || "<p>No batters are assigned to this activity.</p>";
}
function et27TeamName(side){
  const g = game ? game() : null;
  if(!g) return side === "home" ? "HOME" : "VISITOR";
  return side === "home" ? (g.home || "HOME") : (g.away || "VISITOR");
}
function et27RenderLineupTabs(){
  const away = $("dualLineupAwayBtnV27");
  const home = $("dualLineupHomeBtnV27");
  if(away){
    away.textContent = et27TeamName("away");
    away.classList.toggle("active", et27Side() === "away");
    away.onclick = () => et27SetSide("away");
  }
  if(home){
    home.textContent = et27TeamName("home");
    home.classList.toggle("active", et27Side() === "home");
    home.onclick = () => et27SetSide("home");
  }

  const oa = $("offenseAwayBtnV27");
  const oh = $("offenseHomeBtnV27");
  if(oa){
    oa.textContent = et27TeamName("away");
    oa.classList.toggle("active", et27Side() === "away");
    oa.onclick = () => et27SetSide("away");
  }
  if(oh){
    oh.textContent = et27TeamName("home");
    oh.classList.toggle("active", et27Side() === "home");
    oh.onclick = () => et27SetSide("home");
  }
}
function et27HandText(p){
  if(!p) return "";
  if(p.role === "Pitcher") return p.thr || "";
  if(p.role === "Bateador") return p.bat || "";
  return [p.bat || "", p.thr || ""].filter(Boolean).join(" / ");
}
function et27RenderPlayers(){
  const q = ($("search")?.value || "").toLowerCase();
  const box = $("players");
  const active = et27ActivityPlayers();

  if(box){
    const filtered = active.filter(p => !q || String(p.name || "").toLowerCase().includes(q));
    box.innerHTML = filtered.map(p => `
      <div class="playerCard">
        <div class="playerRow">
          <div class="num">${p.num || "-"}</div>
          <div>
            <b>${p.name}</b><br>
            <small>${p.role || ""} · ${et27HandText(p) || "-"}</small>
            <div class="simpleRosterV254">Solo actividad actual</div>
          </div>
          <div class="simpleRosterTypeV254">${et27HandText(p)}</div>
        </div>
        <div class="actions">
          <button type="button" onclick="et254EditPlayer('${p.id}')>Edit</button>
          <button type="button" onclick="et254RemoveFromActivity('${p.id}')">Remove from Activity</button>
          <button type="button" class="danger" onclick="et254DeletePlayer('${p.id}')>Delete</button>
        </div>
      </div>
    `).join("") || "<p>No players are assigned to this activity.</p>";
  }

  if($("batterList")){
    const side = et27Side();
    const lineup = et27LineupPlayers(side);
    const idx = et27GetIndex(side);
    $("batterList").innerHTML = `<div class="lineupTeamLabelV27">${et27TeamName(side)} LINEUP</div>` + (lineup.map((p,i) => `
      <div class="lineupPlayerCleanV255 ${i===idx ? "active" : ""}">
        <div class="lineupMainCleanV255" onclick="et27SelectBatter('${p.id}')">
          <div class="lineupOrderCleanV255">${i+1}</div>
          <div>
            <div class="lineupNameCleanV255">${p.name}</div>
            <div class="lineupSubCleanV255">${p.bat || ""}${i===idx ? " · CURRENT" : ""}</div>
          </div>
          <div class="lineupSubCleanV255">Select</div>
        </div>
        <div class="lineupActionsCleanV255">
          <button type="button" onclick="et27MoveLineup('${p.id}',-1,'${side}')">↑</button>
          <button type="button" onclick="et27MoveLineup('${p.id}',1,'${side}')">↓</button>
          <button type="button" class="danger" onclick="et27RemoveFromLineup('${p.id}','${side}')">X</button>
        </div>
      </div>
    `).join("") || "<p>No lineup yet. Tap Add from Roster.</p>");
  }

  if($("pitcherList")){
    const pitchers = active.filter(et27IsPitcher);
    $("pitcherList").innerHTML = pitchers.map((p,i) => `
      <button class="listBtn" onclick="selPitcher('${p.id}')">
        <span class="num">${p.num || i+1}</span>
        <span>${p.name}</span>
        <small>${p.thr || ""}</small>
      </button>
    `).join("") || "<p>No pitchers are assigned to this activity.</p>";
  }

  et27RenderLineupTabs();
}

// Replace key functions only for lineup engine.
window.et27AddToLineup = et27AddToLineup;
window.et27RemoveFromLineup = et27RemoveFromLineup;
window.et27MoveLineup = et27MoveLineup;
window.et27OpenLineupPicker = et27OpenLineupPicker;
window.et27SelectBatter = et27SelectBatter;
window.et27SetSide = et27SetSide;

renderPlayers = et27RenderPlayers;
bats = function(side=et27Side()){ return et27LineupPlayers(side); };
advance = et27AdvanceBatter;

// Keep existing saveTag but ensure completed PA advances the right lineup.
const et27OriginalSaveTag = saveTag;
saveTag = function(){
  const before = state.tags.length;
  et27OriginalSaveTag();
  if(state.tags.length > before){
    const last = state.tags[state.tags.length-1];
    const r = last.final_result || last.result || "";
    if(typeof pa === "function" && pa(r)){
      // Original code may already advanced old list; force dual lineup current batter after PA.
      state.batter = et27CurrentBatterId(et27Side());
      save();
      render();
    }
  }
};

window.addEventListener("load", () => {
  const btn = document.getElementById("lineupAddBtnV255");
  if(btn) btn.onclick = et27OpenLineupPicker;
  et27RenderLineupTabs();
});


/* ================= EASY TAGG v2.7.1 STABLE CLEAN ================= */
/* Cambios permitidos:
   - No scroll horizontal/vertical.
   - Roster e historial: solo Editar visible.
   - Game Type: Tricky.
   No tocar lógica TAG/CSV/lineup/export.
*/
const ET271_STABLE_CLEAN_VERSION = "2.7.1 Stable Clean";

function et271AddTricky(){
  const selects = Array.from(document.querySelectorAll("select"));
  selects.forEach(sel => {
    const txt = Array.from(sel.options).map(o => (o.textContent || "").trim().toLowerCase()).join("|");
    if((txt.includes("workout") || txt.includes("live bp") || txt.includes("game")) && !txt.includes("tricky")){
      const opt = document.createElement("option");
      opt.value = "Tricky";
      opt.textContent = "Tricky";
      sel.appendChild(opt);
    }
  });
}

function et271HideNonEditButtons(){
  document.querySelectorAll("button").forEach(btn => {
    const txt = (btn.textContent || "").trim().toLowerCase();
    const oc = (btn.getAttribute("onclick") || "").toLowerCase();
    const cls = (btn.className || "").toLowerCase();

    const isEdit = txt === "editar" || txt.includes("edit");
    const isBad = (
      txt.includes("eliminar") ||
      txt.includes("delete") ||
      txt.includes("quitar") ||
      txt.includes("remove") ||
      txt === "x" ||
      cls.includes("delete") ||
      cls.includes("danger") ||
      oc.includes("delete") ||
      oc.includes("deltag") ||
      oc.includes("remove")
    );

    // Solo ocultar dentro de roster/historial, sin tocar botones de resultados.
    const inRosterOrHistory = !!btn.closest("#players, #historyList, .playerCard, .tagCard");
    if(inRosterOrHistory && isBad && !isEdit){
      btn.style.display = "none";
    }
  });
}

function et271NoScrollLock(){
  document.documentElement.style.overflowX = "hidden";
  document.body.style.overflowX = "hidden";
}

const et271OriginalRender = render;
render = function(){
  et271OriginalRender();
  et271AddTricky();
  et271HideNonEditButtons();
  et271NoScrollLock();
};

window.addEventListener("load", () => {
  et271AddTricky();
  et271HideNonEditButtons();
  et271NoScrollLock();
});


/* ================= EASY TAGG v2.7.2 UI COMPACT ================= */
/* Solo:
   - Home/Visitor más pequeños.
   - Tricky solo en Crear Juego/Settings.
   - Tricky oculto en pantalla TAG si aparece por error.
*/
const ET272_VERSION = "2.7.2 UI Compact";

function et272EnsureTrickyOnlyCreate(){
  document.querySelectorAll("select").forEach(sel => {
    const opts = Array.from(sel.options);
    const optText = opts.map(o => (o.textContent || "").trim().toLowerCase()).join("|");
    const id = (sel.id || "").toLowerCase();
    const name = (sel.name || "").toLowerCase();
    const parentText = (sel.closest(".sheet,.card,section,div")?.textContent || "").toLowerCase();

    const isCreateGameType = (
      id.includes("gametype") ||
      name.includes("gametype") ||
      (optText.includes("workout") && optText.includes("live bp") && optText.includes("game") && parentText.includes("crear"))
    );

    if(isCreateGameType && !optText.includes("tricky")){
      const opt = document.createElement("option");
      opt.value = "Tricky";
      opt.textContent = "Tricky";
      sel.appendChild(opt);
    }

    if(!isCreateGameType){
      opts.forEach(o => {
        if((o.textContent || "").trim().toLowerCase() === "tricky" || (o.value || "").trim().toLowerCase() === "tricky"){
          o.remove();
        }
      });
    }
  });
}

function et272CompactHomeVisitor(){
  ["offenseAwayBtnV27","offenseHomeBtnV27","dualLineupAwayBtnV27","dualLineupHomeBtnV27"].forEach(id => {
    const b = document.getElementById(id);
    if(!b) return;
    b.style.minHeight = "28px";
    b.style.padding = "4px 6px";
    b.style.fontSize = "11px";
    b.style.lineHeight = "1.05";
  });
}

const et272OriginalRender = render;
render = function(){
  et272OriginalRender();
  et272EnsureTrickyOnlyCreate();
  et272CompactHomeVisitor();
};

window.addEventListener("load", () => {
  et272EnsureTrickyOnlyCreate();
  et272CompactHomeVisitor();
});


/* ================= EASY TAGG v2.7.3 BAT STACKED BUTTONS ================= */
/* Solo:
   - Oculta dropdown BAT en pantalla TAG.
   - Pone los botones/equipos uno debajo del otro.
   - Mantiene la misma lógica de cambio.
*/
const ET273_VERSION = "2.7.3 Bat Buttons Stacked";

function et273HideBatDropdown(){
  ["battingSide","batSide","half"].forEach(id => {
    const el = document.getElementById(id);
    if(el && el.tagName === "SELECT"){
      el.style.display = "none";
    }
  });

  // Hide only selects inside the BAT/offense area if they contain Home/Visitante.
  document.querySelectorAll("select").forEach(sel => {
    const opts = Array.from(sel.options).map(o => (o.textContent || "").trim().toLowerCase()).join("|");
    const parent = (sel.closest(".card,.top,.batBox,.battingBox,.batCard,div")?.textContent || "").toLowerCase();
    if((opts.includes("home") || opts.includes("visitante") || opts.includes("visitor")) && parent.includes("bat")){
      sel.style.display = "none";
    }
  });
}

function et273StackBatButtons(){
  const wrap = document.querySelector(".offenseSwitchV27");
  if(wrap){
    wrap.style.display = "grid";
    wrap.style.gridTemplateColumns = "1fr";
    wrap.style.gap = "4px";
    wrap.style.width = "100%";
    wrap.style.maxWidth = "100%";
    wrap.style.overflow = "hidden";
  }

  ["offenseAwayBtnV27","offenseHomeBtnV27","dualLineupAwayBtnV27","dualLineupHomeBtnV27"].forEach(id => {
    const b = document.getElementById(id);
    if(!b) return;
    b.style.width = "100%";
    b.style.maxWidth = "100%";
    b.style.minWidth = "0";
    b.style.minHeight = "30px";
    b.style.padding = "4px 5px";
    b.style.fontSize = "10.5px";
    b.style.lineHeight = "1.05";
    b.style.whiteSpace = "normal";
    b.style.overflow = "hidden";
    b.style.textOverflow = "ellipsis";
  });
}

const et273OriginalRender = render;
render = function(){
  et273OriginalRender();
  et273HideBatDropdown();
  et273StackBatButtons();
};

window.addEventListener("load", () => {
  et273HideBatDropdown();
  et273StackBatButtons();
});


/* ================= EASY TAGG v2.7.4 PITCH COUNT BY PITCHER ================= */
/* Solo cambia el número visible de PITCHES:
   - TAGS = total tags
   - CLIPS = total clips
   - PITCHES = tags del pitcher seleccionado
*/
const ET274_VERSION = "2.7.4 Pitch Count By Pitcher";

function et274GetGameTags(){
  try{
    if(typeof gt === "function") return gt();
  }catch(e){}
  return state.tags || [];
}

function et274SelectedPitcherId(){
  return state.pitcher || "";
}

function et274SelectedPitcherName(){
  const pid = et274SelectedPitcherId();
  if(!pid) return "";
  const p = (state.players || []).find(x => x.id === pid);
  return p ? (p.name || "") : "";
}

function et274TagBelongsToSelectedPitcher(t){
  const pid = et274SelectedPitcherId();
  const pname = et274SelectedPitcherName();

  if(!pid && !pname) return false;

  if(pid && (t.pitcher_id === pid || t.pitcherId === pid)) return true;
  if(pname && String(t.pitcher || "").trim().toLowerCase() === pname.trim().toLowerCase()) return true;

  return false;
}

function et274PitchCountForSelectedPitcher(){
  const tags = et274GetGameTags();
  return tags.filter(et274TagBelongsToSelectedPitcher).length;
}

function et274SetNumberInCard(card, value){
  if(!card) return;
  const candidates = Array.from(card.querySelectorAll("b,strong,.num,.statValue,span,div"));
  const numEl = candidates.find(el => /^\s*\d+\s*$/.test(el.textContent || ""));
  if(numEl){
    numEl.textContent = String(value);
    return;
  }

  const b = card.querySelector("b") || card.querySelector("strong");
  if(b){
    b.textContent = String(value);
    return;
  }

  card.innerHTML = card.innerHTML.replace(/(\D)(\d+)(\D*)$/, "$1" + String(value) + "$3");
}

function et274PatchStats(){
  const tags = et274GetGameTags();
  const total = tags.length;
  const pitcherCount = et274PitchCountForSelectedPitcher();

  const statCards = Array.from(document.querySelectorAll(".stats div,.stat,.statCard,.counterCard"));
  const tagsCard = statCards.find(c => (c.textContent || "").toLowerCase().includes("tags"));
  const clipsCard = statCards.find(c => { const tx=(c.textContent||"").toLowerCase(); return tx.includes("clips") || tx.includes("s/b"); });
  const pitchesCard = statCards.find(c => (c.textContent || "").toLowerCase().includes("pitches"));

  if(tagsCard) et274SetNumberInCard(tagsCard, total);
  if(clipsCard) et274SetNumberInCard(clipsCard, total);
  if(pitchesCard){
    et274SetNumberInCard(pitchesCard, pitcherCount);
    pitchesCard.classList.add("pitchCountByPitcherV274");
    pitchesCard.title = "Pitches del pitcher seleccionado";
  }
}

const et274OriginalRender = render;
render = function(){
  et274OriginalRender();
  et274PatchStats();
};

if(typeof saveTag === "function"){
  const et274OriginalSaveTag = saveTag;
  saveTag = function(){
    et274OriginalSaveTag();
    et274PatchStats();
  };
}

window.addEventListener("load", et274PatchStats);


/* ================= EASY TAGG v2.7.5 IMMEDIATE RESULT TAG =================
   - RESULTADO creates the tag immediately to lock clip time.
   - Selecting the outcome updates the same provisional tag.
   - Contact results open details + EV + hit location.
*/
state.detail = state.detail || {};
state.detail.spray = state.detail.spray || "";

function etV275ContactResult(r){
  return ["Single","Double","Triple","HR","Out"].includes(r);
}

function etV275PendingTag(){
  if(!state.pending || !state.pending.tag_id) return null;
  return state.tags.find(t => t.tag_id === state.pending.tag_id) || null;
}

function etV275CreateImmediateResultTag(){
  clock();
  const g = game();
  if(!g) return etAppAlert("Create or select an activity before tagging.","ACTIVITY REQUIRED");

  // If an unfinished provisional result already exists, reopen it instead of making a duplicate.
  const existing = etV275PendingTag();
  if(existing && existing.pending_result){
    openSheet("resultSheet");
    return;
  }

  syncClockNow();
  const sec = state.clock;
  const w = {pre:5, post:5};
  const tag = {
    tag_id:uid(),
    game_id:g.id,
    game_name:g.name,
    game_date:g.date,
    home_team:g.home,
    away_team:g.away,
    game_seconds:sec,
    game_time:fmt(sec),
    clip_start_seconds:Math.max(0,sec-w.pre),
    clip_start_time:fmt(Math.max(0,sec-w.pre)),
    clip_end_seconds:sec+w.post,
    clip_end_time:fmt(sec+w.post),
    inning:$("inning").value,
    half:$("half").value,
    balls_before:state.balls,
    strikes_before:state.strikes,
    outs_before:state.outs,
    count_before:`${state.balls}-${state.strikes}`,
    pitcher_id:state.pitcher,
    pitcher:pn(state.pitcher),
    pitcher_hand:hand(state.pitcher,"thr"),
    pitcher_pitch_number:state.pitcher?(Math.max(0,...state.tags.filter(t=>t.game_id===g.id&&t.pitcher_id==state.pitcher).map(t=>Number(t.pitcher_pitch_number)||0))+1):"",
    batter_id:state.batter,
    batter:pn(state.batter),
    batter_hand:hand(state.batter,"bat"),
    pitch_type:state.pitch,
    pitch_mph:$("mph").value,
    zone_status:state.zoneStatus,
    zone_x:state.zoneX===""?"":Math.round(state.zoneX),
    zone_y:state.zoneY===""?"":Math.round(state.zoneY),
    result:"Pending Result",
    final_result:"Pending Result",
    contact_quality:"No Contact",
    trajectory:"",
    spray_location:"",
    exit_velocity:"",
    note:$("note").value,
    created_at:new Date().toISOString(),
    pending_result:true
  };

  state.tags.push(tag);
  state.pending = {
    tag_id:tag.tag_id,
    result:"",
    sec,
    time:fmt(sec),
    cs:tag.clip_start_seconds,
    ce:tag.clip_end_seconds,
    zx:state.zoneX,
    zy:state.zoneY,
    zs:state.zoneStatus
  };
  state.detail = {contact:"", trajectory:"", spray:""};

  document.querySelectorAll("[data-contact],[data-traj],[data-hitloc]").forEach(b=>b.classList.remove("selected"));

  if(window.AndroidBridge) AndroidBridge.vibrateShort();
  save();
  render();
  openSheet("resultSheet");
}

function etV275FinalizeNonContact(result){
  const tag = etV275PendingTag();
  if(!tag) return;

  tag.result = result;
  tag.final_result = result;
  tag.pending_result = false;
  tag.pitch_mph = $("mph").value;
  tag.note = $("note").value;

  autoCount(result);
  if(pa(result)){
    state.paInHalf++;
    advance();
    maybeAdvanceInning();
  }

  state.pending = null;
  ["mph","exitVelo","note"].forEach(id=>{ if($(id)) $(id).value=""; });
  if(window.AndroidBridge) AndroidBridge.vibrateShort();
  save();
  closeSheets();
  render();
}

function etV275ChooseResult(result){
  const tag = etV275PendingTag();
  if(!tag) return;

  state.pending.result = result;
  tag.result = result;
  tag.final_result = result;

  if(etV275ContactResult(result)){
    state.detail = {contact:"", trajectory:"", spray:""};
    document.querySelectorAll("[data-contact],[data-traj],[data-hitloc]").forEach(b=>b.classList.remove("selected"));
    closeSheets();
    openSheet("detailSheet");
  }else{
    etV275FinalizeNonContact(result);
  }
}

function etV275SaveContactDetail(){
  const tag = etV275PendingTag();
  if(!tag) return;

  if(!state.detail.contact || !state.detail.trajectory){
    return alert("Selecciona calidad y trayectoria.");
  }
  if(!state.detail.spray){
    return alert("Selecciona Hit Location.");
  }

  const result = state.pending.result || tag.result;
  tag.result = result;
  tag.final_result = result;
  tag.contact_quality = state.detail.contact;
  tag.trajectory = state.detail.trajectory;
  tag.spray_location = state.detail.spray;
  tag.exit_velocity = $("exitVelo").value;
  tag.pitch_mph = $("mph").value;
  tag.note = $("note").value;
  tag.pending_result = false;

  autoCount(result);
  if(pa(result)){
    state.paInHalf++;
    advance();
    maybeAdvanceInning();
  }

  state.pending = null;
  ["mph","exitVelo","note"].forEach(id=>{ if($(id)) $(id).value=""; });
  if(window.AndroidBridge) AndroidBridge.vibrateShort();
  save();
  closeSheets();
  render();
}

function etV275WireImmediateResult(){
  const resultBtn = $("resultBtn");
  if(resultBtn) resultBtn.onclick = etV275CreateImmediateResultTag;

  document.querySelectorAll("[data-sheet-result]").forEach(btn=>{
    btn.onclick = () => etV275ChooseResult(btn.dataset.sheetResult);
  });

  document.querySelectorAll("[data-hitloc]").forEach(btn=>{
    btn.onclick = () => {
      state.detail.spray = btn.dataset.hitloc;
      document.querySelectorAll("[data-hitloc]").forEach(x=>x.classList.remove("selected"));
      btn.classList.add("selected");
    };
  });

  const saveDetailBtn = $("saveDetail");
  if(saveDetailBtn) saveDetailBtn.onclick = etV275SaveContactDetail;
}

// Mark provisional tags clearly in history without changing existing layout.
const etV275OriginalResultClass = typeof resultClass === "function" ? resultClass : null;
if(etV275OriginalResultClass){
  resultClass = function(r){
    if(r === "Pending Result") return "pendingResultV275";
    return etV275OriginalResultClass(r);
  };
}

window.addEventListener("load",()=>{
  setTimeout(etV275WireImmediateResult,300);
  setTimeout(etV275WireImmediateResult,1000);
});


/* ================= EASY TAGG v2.7.6 INTERACTIVE FIELD LOCATION =================
   Keeps v2.7.5 immediate result tagging.
   Replaces zone buttons with one field coordinate per at-bat.
*/
function etV276EnsureDetailState(){
  state.detail = state.detail || {};
  if(state.detail.hit_x === undefined) state.detail.hit_x = "";
  if(state.detail.hit_y === undefined) state.detail.hit_y = "";
  if(state.detail.hit_x_px === undefined) state.detail.hit_x_px = "";
  if(state.detail.hit_y_px === undefined) state.detail.hit_y_px = "";
}

function etV276ApproxFieldZone(x, y){
  // x/y normalized 0..1. Used only as a compatible text label.
  if(y < 0.36){
    if(x < 0.28) return "Deep LF";
    if(x < 0.44) return "Deep LCF";
    if(x < 0.58) return "Deep CF";
    if(x < 0.74) return "Deep RCF";
    return "Deep RF";
  }
  if(y < 0.62){
    if(x < 0.24) return "LF";
    if(x < 0.40) return "LCF";
    if(x < 0.60) return "CF";
    if(x < 0.76) return "RCF";
    return "RF";
  }
  if(y < 0.82){
    if(x < 0.35) return "3B/SS";
    if(x < 0.65) return "Middle";
    return "2B/1B";
  }
  return "Infield/Home";
}

function etV276SetMarkerFromState(){
  etV276EnsureDetailState();
  const marker = $("fieldMarkerV276");
  if(!marker) return;

  const x = Number(state.detail.hit_x);
  const y = Number(state.detail.hit_y);

  if(!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0){
    marker.classList.add("hidden");
    return;
  }

  marker.style.left = `${x * 100}%`;
  marker.style.top = `${y * 100}%`;
  marker.classList.remove("hidden");

  const status = $("fieldLocationStatusV276");
  if(status){
    status.textContent = `Ubicación guardada: ${etV276ApproxFieldZone(x,y)} (${Math.round(x*100)}%, ${Math.round(y*100)}%)`;
  }
}

function etV276SelectFieldLocation(ev){
  etV276EnsureDetailState();
  const wrap = $("fieldLocationWrapV276");
  if(!wrap) return;

  const rect = wrap.getBoundingClientRect();
  const clientX = ev.touches?.[0]?.clientX ?? ev.clientX;
  const clientY = ev.touches?.[0]?.clientY ?? ev.clientY;

  let x = (clientX - rect.left) / rect.width;
  let y = (clientY - rect.top) / rect.height;
  x = Math.max(0, Math.min(1, x));
  y = Math.max(0, Math.min(1, y));

  state.detail.hit_x = Number(x.toFixed(4));
  state.detail.hit_y = Number(y.toFixed(4));
  state.detail.hit_x_px = Math.round(x * rect.width);
  state.detail.hit_y_px = Math.round(y * rect.height);
  state.detail.spray = etV276ApproxFieldZone(x, y);

  etV276SetMarkerFromState();
  if(window.AndroidBridge) AndroidBridge.vibrateShort();
}

function etV276ClearFieldLocation(){
  etV276EnsureDetailState();
  state.detail.hit_x = "";
  state.detail.hit_y = "";
  state.detail.hit_x_px = "";
  state.detail.hit_y_px = "";
  state.detail.spray = "";

  const marker = $("fieldMarkerV276");
  if(marker) marker.classList.add("hidden");
  const status = $("fieldLocationStatusV276");
  if(status) status.textContent = "Tap the field where the batted ball ended.";
}

function etV276WireField(){
  const wrap = $("fieldLocationWrapV276");
  if(wrap && !wrap.dataset.v276wired){
    wrap.dataset.v276wired = "1";
    wrap.addEventListener("click", etV276SelectFieldLocation);
  }

  const clearBtn = $("clearFieldLocationV276");
  if(clearBtn && !clearBtn.dataset.v276wired){
    clearBtn.dataset.v276wired = "1";
    clearBtn.onclick = etV276ClearFieldLocation;
  }

  etV276SetMarkerFromState();
}

// Reset the field every time a new contact result begins.
const etV276OriginalChooseResult = etV275ChooseResult;
etV275ChooseResult = function(result){
  if(etV275ContactResult(result)){
    etV276ClearFieldLocation();
  }
  etV276OriginalChooseResult(result);
  setTimeout(etV276WireField, 50);
};

// Override contact save to include exact field coordinates.
let etV276OriginalSaveContactDetail = etV275SaveContactDetail;
etV275SaveContactDetail = function(){
  etV276EnsureDetailState();
  const tag = etV275PendingTag();
  if(!tag) return;

  if(state.detail.hit_x === "" || state.detail.hit_y === ""){
    return alert("Tap the field where the batted ball ended.");
  }

  // Save exact coordinates before original finalize function clears pending state.
  tag.hit_location_x = state.detail.hit_x;
  tag.hit_location_y = state.detail.hit_y;
  tag.hit_location_x_px = state.detail.hit_x_px;
  tag.hit_location_y_px = state.detail.hit_y_px;
  tag.hit_location_image = "baseball_field_v276.png";
  tag.spray_location = state.detail.spray;

  etV276OriginalSaveContactDetail();
};

// Re-wire save button because v2.7.5 assigned the old function directly.
function etV276WireAll(){
  etV276WireField();
  const saveBtn = $("saveDetail");
  if(saveBtn) saveBtn.onclick = etV275SaveContactDetail;
}

window.addEventListener("load",()=>{
  setTimeout(etV276WireAll,350);
  setTimeout(etV276WireAll,1100);
});
document.addEventListener("click",()=>setTimeout(etV276WireAll,80),true);


/* ================= EASY TAGG v2.7.8 BATTED-BALL TRAJECTORY =================
   Fly Ball / Pop Up = curved path
   Line Drive = straight solid path
   Ground Ball = dashed path
*/
function etV278TrajectoryType(){
  const t = (state.detail && state.detail.trajectory) || "";
  if(t === "Ground Ball") return "ground";
  if(t === "Line Drive") return "line";
  if(t === "Fly Ball") return "fly";
  if(t === "Pop Up") return "popup";
  return "";
}

function etV278DrawTrajectory(){
  etV276EnsureDetailState();
  const svg = $("fieldTrajectoryV278");
  const path = $("fieldTrajectoryPathV278");
  if(!svg || !path) return;

  const x = Number(state.detail.hit_x);
  const y = Number(state.detail.hit_y);
  const type = etV278TrajectoryType();
  if(!type || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0){
    svg.classList.add("hidden");
    path.setAttribute("d","");
    return;
  }

  // Home plate anchor calibrated to the Oracle Park diagram.
  const sx = 514, sy = 976;
  const ex = x * 1000, ey = y * 1000;
  let d = `M ${sx} ${sy} L ${ex} ${ey}`;

  if(type === "fly" || type === "popup"){
    const dx = ex - sx, dy = ey - sy;
    const len = Math.max(1, Math.hypot(dx,dy));
    const nx = -dy / len, ny = dx / len;
    const arc = type === "popup" ? 190 : 115;
    const mx = (sx + ex)/2 + nx * arc;
    const my = (sy + ey)/2 + ny * arc - (type === "popup" ? 70 : 25);
    d = `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`;
  }

  svg.classList.remove("hidden","fly","line","ground","popup");
  svg.classList.add(type);
  path.setAttribute("d", d);
}

const etV278OriginalSetMarker = etV276SetMarkerFromState;
etV276SetMarkerFromState = function(){
  etV278OriginalSetMarker();
  etV278DrawTrajectory();
};

const etV278OriginalClearField = etV276ClearFieldLocation;
etV276ClearFieldLocation = function(){
  etV278OriginalClearField();
  const svg = $("fieldTrajectoryV278");
  const path = $("fieldTrajectoryPathV278");
  if(svg) svg.classList.add("hidden");
  if(path) path.setAttribute("d","");
};

function etV278WireTrajectoryButtons(){
  document.querySelectorAll("[data-traj]").forEach(btn=>{
    if(btn.dataset.v278wired) return;
    btn.dataset.v278wired = "1";
    btn.addEventListener("click",()=>setTimeout(etV278DrawTrajectory,0));
  });
}

const etV278OriginalSaveContact = etV275SaveContactDetail;
etV275SaveContactDetail = function(){
  const tag = etV275PendingTag();
  if(tag) tag.hit_trajectory_style = etV278TrajectoryType();
  return etV278OriginalSaveContact();
};

function etV278WireAll(){
  etV278WireTrajectoryButtons();
  const saveBtn = $("saveDetail");
  if(saveBtn) saveBtn.onclick = etV275SaveContactDetail;
  etV278DrawTrajectory();
}
window.addEventListener("load",()=>{
  setTimeout(etV278WireAll,400);
  setTimeout(etV278WireAll,1200);
});
document.addEventListener("click",()=>setTimeout(etV278WireAll,90),true);

/* ================================================================
   Easy Tagg v2.8.0 - Editable Game Report (.xls HTML)
   One editable workbook containing Batters and Pitchers sections.
   Every completed plate appearance is included (5 PA panels per row,
   with continuation rows when a hitter has more than five PA).
   ================================================================ */
function reportTerminalResultV292(t){
  const r=String((t&& (t.final_result||t.result))||"").trim();
  return ["BB","HBP","K Swinging","K Looking","Single","Double","Triple","HR","Out","Error","Fielder's Choice","Sac Fly","Sac Bunt","Ground Out","Fly Out","Line Out","Pop Out"].includes(r);
}
function reportPaGroupsV279(){
  const groups={};
  const open={};
  const tags=gt().slice().sort((a,b)=>{
    const sa=Number(a.game_seconds), sb=Number(b.game_seconds);
    if(Number.isFinite(sa)&&Number.isFinite(sb)&&sa!==sb)return sa-sb;
    return String(a.created_at||"").localeCompare(String(b.created_at||""));
  });
  tags.forEach(t=>{
    const player=String(t.batter||"No Player").trim()||"No Player";
    if(!open[player])open[player]=[];
    open[player].push(t);
    if(reportTerminalResultV292(t)){
      if(!groups[player])groups[player]=[];
      groups[player].push(open[player].slice());
      open[player]=[];
    }
  });
  return groups;
}
function terminalResultV279(paTags){
  const t=paTags[paTags.length-1]||{};
  return t.final_result||t.result||"";
}
function shortResultV279(paTags){
  const r=terminalResultV279(paTags), t=paTags[paTags.length-1]||{};
  const tr=String(t.trajectory||"");
  const map={Single:"1B",Double:"2B",Triple:"3B",HR:"HR",BB:"BB",HBP:"HBP","K Swinging":"K","K Looking":"K",Error:"E",Out:"OUT","Ground Out":"GB","Fly Out":"FB","Line Out":"LD","Pop Out":"PU"};
  if(map[r])return map[r];
  if(r==="Out") return tr==="Ground Ball"?"GB":tr==="Line Drive"?"LD":tr==="Fly Ball"?"FB":tr==="Pop Up"?"PU":"OUT";
  return r||"-";
}
function hitterStatsV279(allTags, paGroups){
  let H=0,BB=0,K=0,swings=0,misses=0,goodDecisions=0,totalPitches=allTags.length;
  paGroups.forEach(paTags=>{
    const r=terminalResultV279(paTags);
    if(["Single","Double","Triple","HR"].includes(r))H++;
    if(r==="BB")BB++;
    if(["K Swinging","K Looking"].includes(r))K++;
  });
  allTags.forEach(t=>{
    const swing=isSwingTag(t), miss=isMissTag(t);
    if(swing)swings++;
    if(miss)misses++;
    const out=isOutOfZone(t);
    if((!out&&swing)||(out&&!swing))goodDecisions++;
  });
  return {PA:paGroups.length,H,BB,K,RBI:"",R:"",SB:"",SwDz:goodDecisions+"/"+totalPitches,SwM:misses+"/"+swings};
}
function svgDataV279(paTags){
  const t=paTags[paTags.length-1]||{};
  const result=shortResultV279(paTags);
  const has=Number.isFinite(Number(t.hit_location_x))&&Number.isFinite(Number(t.hit_location_y));
  const x=has?Math.max(12,Math.min(88,Number(t.hit_location_x))):50;
  const y=has?Math.max(10,Math.min(82,Number(t.hit_location_y))):48;
  const tr=String(t.trajectory||"");
  let path="", dash="";
  if(has){
    if(tr==="Fly Ball"||tr==="Pop Up") path=`M 50 88 Q ${(50+x)/2 + (x>=50?12:-12)} ${Math.max(8,y-18)} ${x} ${y}`;
    else path=`M 50 88 L ${x} ${y}`;
    if(tr==="Ground Ball")dash=' stroke-dasharray="5 4"';
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="170" height="128" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="white"/>
  <path d="M50 8 L94 52 L50 96 L6 52 Z" fill="#fff" stroke="#353535" stroke-width="1.3"/>
  <path d="M50 66 L69 85 L50 96 L31 85 Z" fill="#fff" stroke="#555" stroke-width="1"/>
  <path d="M50 72 L61 84 L50 94 L39 84 Z" fill="#fff" stroke="#555" stroke-width="1"/>
  <circle cx="50" cy="84" r="2.8" fill="#fff" stroke="#555" stroke-width="1"/>
  <circle cx="50" cy="73" r="1.3" fill="#fff" stroke="#555" stroke-width="1"/>
  <circle cx="39.5" cy="84" r="1.3" fill="#fff" stroke="#555" stroke-width="1"/>
  <circle cx="60.5" cy="84" r="1.3" fill="#fff" stroke="#555" stroke-width="1"/>
  ${has?`<path d="${path}" fill="none" stroke="#ef2c59" stroke-width="2.4" stroke-linecap="round"${dash}/><circle cx="${x}" cy="${y}" r="2.8" fill="#d91d50"/>`:""}
  <text x="50" y="25" text-anchor="middle" font-family="Arial" font-size="9" font-weight="bold" fill="#ff5a00">${xlsEsc(result)}</text>
  </svg>`;
  return "data:image/svg+xml;base64,"+btoa(unescape(encodeURIComponent(svg)));
}
function cellEditableV279(value,cls=""){
  return `<td class="editable ${cls}">${xlsEsc(value??"")}</td>`;
}
function batterBlockV280(player, allPaGroups, allTags, paStart, blockIndex){
  const paGroups=allPaGroups.slice(paStart,paStart+5);
  const st=hitterStatsV279(allTags,allPaGroups);
  const rows=[["PA",st.PA],["H",st.H],["BB",st.BB],["K",st.K],["RBI",st.RBI],["R",st.R],["SB",st.SB],["SwDz",st.SwDz],["SwM",st.SwM]];
  const cont=paStart>0?" (cont.)":"";
  let h='<table class="playerBlock" cellspacing="0" cellpadding="0"><tr>';
  h+='<td class="statsCol"><table class="statsTable"><tr><th colspan="2" class="playerName">'+xlsEsc(reportPlayerName(player)+cont)+'</th></tr>';
  rows.forEach(r=>h+='<tr><th>'+r[0]+'</th><td>'+xlsEsc(r[1])+'</td></tr>');
  h+='</table></td>';
  for(let i=0;i<5;i++){
    const pa=paGroups[i]||[], paNo=paStart+i+1;
    const t=pa[pa.length-1]||{};
    h+='<td class="paCol"><table class="paTable"><tr><th>PA '+paNo+'</th></tr><tr><td class="fieldCell"><img src="'+svgDataV279(pa)+'" width="170" height="128"></td></tr>';
    h+='<tr><td><table class="metricTable"><tr><th>EV</th>'+cellEditableV279(t.exit_velocity||'','metricValue')+'</tr><tr><th>SwDz</th><td class="metricValue">-</td></tr><tr><th>LA</th>'+cellEditableV279(t.launch_angle||'','metricValue')+'</tr></table></td></tr></table></td>';
  }
  h+='<td class="notesCol"><table class="notesTable">';
  h+='<tr><th>Offensive Notes</th></tr><tr>'+cellEditableV279('', 'noteBox')+'</tr>';
  h+='<tr><th>Defensive Notes</th></tr><tr>'+cellEditableV279('', 'noteBox')+'</tr>';
  h+='<tr><th>Baserunning Notes</th></tr><tr>'+cellEditableV279('', 'noteBox')+'</tr>';
  h+='</table></td></tr></table>';
  if((blockIndex+1)%3===0) h+='<div class="pageBreak"></div>';
  return h;
}
function pitcherGroupsV280(){
  const m={};
  gt().forEach(t=>{const p=t.pitcher||"Sin pitcher";(m[p]||(m[p]=[])).push(t);});
  return m;
}
function pitcherStatsV280(tags){
  let H=0,BB=0,SO=0,outs=0,strikes=0,fps=0,batters=0;
  const seenPA={};
  tags.forEach((t,i)=>{
    const r=t.final_result||t.result||"";
    const isStrike=String(t.zone_status||"").toLowerCase().includes("in zone")||["Strike","Taken Strike","Swing Miss","Foul","K Swinging","K Looking"].includes(r)||isSwingTag(t);
    if(isStrike)strikes++;
    const key=(t.inning||"")+"|"+(t.half||"")+"|"+(t.batter_id||t.batter||"")+"|"+(t.count_before==="0-0"?i:"");
    if(t.count_before==="0-0"||!seenPA[key]){ if(!seenPA[key]){fps+=isStrike?1:0;batters++;seenPA[key]=1;} }
    if(isTerminalTag(t)){
      if(["Single","Double","Triple","HR"].includes(r))H++;
      if(r==="BB")BB++;
      if(["K Swinging","K Looking"].includes(r)){SO++;outs++;}
      else if(["Out","Ground Out","Fly Out","Line Out","Pop Out"].includes(r))outs++;
    }
  });
  const ip=Math.floor(outs/3)+"."+(outs%3);
  return {IP:ip,H,R:"",BB,SO,FPS:fps+"/"+batters,P:tags.length,STR:tags.length?Math.round(strikes*100/tags.length)+"%":"0%"};
}
function pitchColorV280(pt){
  const s=String(pt||"").toLowerCase();
  if(s.includes("fast")||s==="fb")return "#ef4444";
  if(s.includes("slider")||s==="sl")return "#22b8cf";
  if(s.includes("change")||s==="ch")return "#f59e0b";
  if(s.includes("curve")||s==="cb")return "#8b5cf6";
  if(s.includes("split")||s==="sp")return "#10b981";
  return "#374151";
}
function strikeZoneSvgV280(tags){
  let dots="";
  tags.forEach(t=>{
    if(!Number.isFinite(Number(t.zone_x))||!Number.isFinite(Number(t.zone_y)))return;
    const x=10+Math.max(0,Math.min(100,Number(t.zone_x)))*1.8;
    const y=8+Math.max(0,Math.min(100,Number(t.zone_y)))*1.55;
    dots+=`<circle cx="${x}" cy="${y}" r="3.2" fill="${pitchColorV280(t.pitch_type)}" stroke="#fff" stroke-width="0.8"/>`;
  });
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="390" height="300" viewBox="0 0 200 175"><rect width="200" height="175" fill="white"/><rect x="68" y="42" width="64" height="84" fill="none" stroke="#111" stroke-width="2"/><line x1="89.3" y1="42" x2="89.3" y2="126" stroke="#aaa"/><line x1="110.7" y1="42" x2="110.7" y2="126" stroke="#aaa"/><line x1="68" y1="70" x2="132" y2="70" stroke="#aaa"/><line x1="68" y1="98" x2="132" y2="98" stroke="#aaa"/>${dots}</svg>`;
  return "data:image/svg+xml;base64,"+btoa(unescape(encodeURIComponent(svg)));
}
function pitchSummaryRowsV280(tags){
  const m={};
  tags.forEach(t=>{
    const p=t.pitch_type||"Unknown", mph=Number(t.pitch_mph);
    if(!m[p])m[p]={name:p,n:0,speeds:[]};
    m[p].n++;
    if(Number.isFinite(mph)&&mph>0)m[p].speeds.push(mph);
  });
  return Object.values(m).sort((a,b)=>b.n-a.n).map(x=>({
    pitch:x.name,n:x.n,pct:tags.length?Math.round(x.n*100/tags.length)+"%":"0%",
    min:x.speeds.length?Math.min(...x.speeds).toFixed(1):"",
    avg:x.speeds.length?(x.speeds.reduce((a,b)=>a+b,0)/x.speeds.length).toFixed(1):"",
    max:x.speeds.length?Math.max(...x.speeds).toFixed(1):"",spin:""
  }));
}
function pitcherBlockV280(player,tags,index){
  const st=pitcherStatsV280(tags), rows=pitchSummaryRowsV280(tags);
  let h='<table class="pitcherBlock"><tr><td class="pitcherLeft">';
  h+='<div class="pitcherTitle">'+xlsEsc(reportPlayerName(player))+'</div>';
  h+='<table class="pitcherNotes"><tr><th>Pitcher Notes</th></tr><tr>'+cellEditableV279('','pitcherNoteBox')+'</tr></table>';
  h+='<img class="zoneImg" src="'+strikeZoneSvgV280(tags)+'" width="390" height="300"></td>';
  h+='<td class="pitcherRight"><table class="summaryTable"><tr><th colspan="8" class="sectionTitle">Performance Summary</th></tr><tr><th>IP</th><th>H</th><th>R</th><th>BB</th><th>SO</th><th>FPS</th><th>#P</th><th>STR %</th></tr><tr>';
  h+='<td>'+st.IP+'</td><td>'+st.H+'</td>'+cellEditableV279(st.R)+'<td>'+st.BB+'</td><td>'+st.SO+'</td><td>'+st.FPS+'</td><td>'+st.P+'</td><td>'+st.STR+'</td></tr></table>';
  h+='<table class="summaryTable pitchData"><tr><th colspan="7" class="sectionTitle">Pitch Data Summary</th></tr><tr><th>Pitch</th><th>#P</th><th>%</th><th>Min</th><th>Avg</th><th>Max</th><th>Spin</th></tr>';
  rows.forEach(r=>{h+='<tr><td>'+xlsEsc(r.pitch)+'</td><td>'+r.n+'</td><td>'+r.pct+'</td><td>'+xlsEsc(r.min)+'</td><td>'+xlsEsc(r.avg)+'</td><td>'+xlsEsc(r.max)+'</td>'+cellEditableV279(r.spin)+'</tr>';});
  if(!rows.length)h+='<tr><td colspan="7">No pitch data</td></tr>';
  h+='</table></td></tr></table><div class="pageBreak"></div>';
  return h;
}
function batterReportXlsV279(){
  const groups=reportPaGroupsV279();
  const players=Object.keys(groups).sort((a,b)=>reportPlayerName(a).localeCompare(reportPlayerName(b)));
  const pitchers=pitcherGroupsV280();
  const pitcherNames=Object.keys(pitchers).sort((a,b)=>reportPlayerName(a).localeCompare(reportPlayerName(b)));
  let html='<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8">';
  html+='<style>';
  html+='@page{size:landscape;margin:0.25in;} body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;background:#fff;margin:0;}';
  html+='.reportHeading{font-size:19px;font-weight:bold;color:#111827;margin:8px 0 5px 7px;border-bottom:3px solid #1f2937;padding-bottom:4px;}';
  html+='.playerBlock{border-collapse:separate;border-spacing:7px 0;width:100%;table-layout:fixed;margin:10px 0 14px 0;page-break-inside:avoid;}';
  html+='.statsCol{width:145px;vertical-align:top}.paCol{width:180px;vertical-align:top}.notesCol{width:270px;vertical-align:top}';
  html+='table table{border-collapse:collapse;width:100%;} th{font-weight:bold}';
  html+='.playerName,.paTable>tbody>tr:first-child>th,.notesTable th{background:#4b5563;color:#fff;text-align:center;padding:4px;font-size:11px;border:1px solid #4b5563;}';
  html+='.playerName,.notesTable th{background:#1f2937;}';
  html+='.statsTable th,.statsTable td{border:1px solid #d1d5db;text-align:center;padding:3px;font-size:10px;height:17px}.statsTable th{width:55%}';
  html+='.fieldCell{height:128px;text-align:center;border-left:1px solid #d1d5db;border-right:1px solid #d1d5db;background:#fff}.fieldCell img{display:block;margin:auto;}';
  html+='.metricTable th,.metricTable td{border:1px solid #d1d5db;padding:3px;font-size:9px;height:16px}.metricTable th{background:#374151;color:white;width:42px;text-align:center}.metricValue{text-align:center;}';
  html+='.notesTable th{text-align:left;padding-left:8px}.notesTable td{border:1px solid #d1d5db;height:39px;vertical-align:top;padding:5px;font-size:10px;white-space:normal;}';
  html+='.editable{background:#fffef2;mso-protection:unlocked visible;} .pageBreak{page-break-after:always;height:1px;}';
  html+='.pitcherBlock{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:18px 0;margin:15px 0;page-break-inside:avoid}.pitcherLeft{width:50%;vertical-align:top}.pitcherRight{width:50%;vertical-align:top}.pitcherTitle{font-size:24px;font-weight:bold;margin:4px 0 15px}.zoneImg{display:block;margin:15px auto}.pitcherNotes,.summaryTable{border-collapse:collapse;width:100%;margin-bottom:22px}.pitcherNotes th,.sectionTitle{background:#202020!important;color:#fff!important;font-size:14px;padding:8px}.pitcherNotes td{border:1px solid #d1d5db;height:78px;vertical-align:top;padding:7px}.summaryTable th{background:#202020;color:#fff;border:1px solid #aaa;padding:7px;font-size:12px}.summaryTable td{border:1px solid #d1d5db;text-align:center;padding:8px;font-size:12px}.pitchData{margin-top:25px}.pitcherNoteBox{height:78px;}';
  html+='</style><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Game Report</x:Name><x:WorksheetOptions><x:Selected/><x:ProtectContents>False</x:ProtectContents><x:PageSetup><x:Layout x:Orientation="Landscape"/></x:PageSetup></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>';
  html+='<div class="reportHeading">BATTERS REPORT</div>';
  let blockIndex=0;
  players.forEach(p=>{
    const tags=gt().filter(t=>(t.batter||"No Player")===p), pas=groups[p];
    for(let start=0;start<pas.length;start+=5){html+=batterBlockV280(p,pas,tags,start,blockIndex++);}
  });
  if(!players.length)html+='<p>No hay apariciones al plato finalizadas para exportar.</p>';
  html+='<div class="pageBreak"></div><div class="reportHeading">PITCHERS REPORT</div>';
  pitcherNames.forEach((p,i)=>{html+=pitcherBlockV280(p,pitchers[p],i);});
  if(!pitcherNames.length)html+='<p>No hay lanzamientos para exportar.</p>';
  html+='</body></html>';
  return html;
}
function batterReportFnameV279(){
  return ((game()?.name||"easy_tagg").replace(/[^a-zA-Z0-9_-]/g,"_"))+"_Game_Report_"+new Date().toISOString().slice(0,10)+".xls";
}
function exportBatterReportXls(){
  try{
    const content=batterReportXlsV279(), name=batterReportFnameV279();
    if(window.AndroidBridge&&AndroidBridge.saveFile)AndroidBridge.saveFile(name,"application/vnd.ms-excel",content);
    else{const blob=new Blob([content],{type:"application/vnd.ms-excel;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    if($("csvStatus"))$("csvStatus").textContent="Reporte editable de bateadores y pitchers guardado.";
  }catch(e){if($("csvStatus"))$("csvStatus").textContent="Error creando reporte: "+e.message;alert("Error creando reporte: "+e.message);}
}

/* ================================================================
   Easy Tagg v2.8.1 - recap_batters PDF
   Visual batter recap modeled after the supplied Priority Players report.
   Includes every completed PA, hit trajectory, and swing pitch locations.
   ================================================================ */
function recapSwingZoneSvgV281(paTags){
  const swings=paTags.filter(t=>isSwingTag(t) && Number.isFinite(Number(t.zone_x)) && Number.isFinite(Number(t.zone_y)));
  let dots="";
  swings.forEach((t,i)=>{
    const x=10+Math.max(0,Math.min(100,Number(t.zone_x)))*0.8;
    const y=8+Math.max(0,Math.min(100,Number(t.zone_y)))*0.64;
    const last=i===swings.length-1;
    dots+=`<circle cx="${x}" cy="${y}" r="${last?3.5:2.6}" fill="${last?'#d91d50':'#ffffff'}" stroke="#d91d50" stroke-width="1.4"/>`;
    if(swings.length>1)dots+=`<text x="${x+4}" y="${y-3}" font-family="Arial" font-size="5.5" fill="#555">${i+1}</text>`;
  });
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="92" height="78" viewBox="0 0 100 80">
    <rect width="100" height="80" fill="#fff"/>
    <text x="50" y="8" text-anchor="middle" font-family="Arial" font-size="6.5" font-weight="bold" fill="#4b5563">SWING LOCATION</text>
    <rect x="25" y="14" width="50" height="52" fill="none" stroke="#333" stroke-width="1.3"/>
    <line x1="41.7" y1="14" x2="41.7" y2="66" stroke="#bbb" stroke-width=".7"/><line x1="58.3" y1="14" x2="58.3" y2="66" stroke="#bbb" stroke-width=".7"/>
    <line x1="25" y1="31.3" x2="75" y2="31.3" stroke="#bbb" stroke-width=".7"/><line x1="25" y1="48.7" x2="75" y2="48.7" stroke="#bbb" stroke-width=".7"/>
    ${dots}
  </svg>`;
  return "data:image/svg+xml;base64,"+btoa(unescape(encodeURIComponent(svg)));
}
const recapOracleFieldBase64V282="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";
function recapFieldSvgV281(paTags){
  const t=paTags[paTags.length-1]||{};
  const result=shortResultV279(paTags);
  const has=Number.isFinite(Number(t.hit_location_x))&&Number.isFinite(Number(t.hit_location_y));
  const x=has?Math.max(0,Math.min(1,Number(t.hit_location_x)))*615:307.5;
  const y=has?Math.max(0,Math.min(1,Number(t.hit_location_y)))*641:320;
  const tr=String(t.trajectory||"");
  const sx=316, sy=628;
  let path="",dash="";
  if(has){
    if(tr==="Fly Ball"||tr==="Pop Up"){
      const dx=x-sx,dy=y-sy,len=Math.max(1,Math.hypot(dx,dy));
      const nx=-dy/len,ny=dx/len;
      const arc=tr==="Pop Up"?105:65;
      const mx=(sx+x)/2+nx*arc;
      const my=(sy+y)/2+ny*arc-(tr==="Pop Up"?45:18);
      path=`M ${sx} ${sy} Q ${mx} ${my} ${x} ${y}`;
    }else path=`M ${sx} ${sy} L ${x} ${y}`;
    if(tr==="Ground Ball")dash=' stroke-dasharray="14 11"';
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="150" height="156" viewBox="0 0 615 641">
    <image href="data:image/png;base64,${recapOracleFieldBase64V282}" x="0" y="0" width="615" height="641"/>
    ${has?`<path d="${path}" fill="none" stroke="#FD5A1E" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"${dash}/><circle cx="${sx}" cy="${sy}" r="11" fill="#ff2d2d" stroke="#fff" stroke-width="5"/><circle cx="${x}" cy="${y}" r="10" fill="#FD5A1E" stroke="#fff" stroke-width="5"/>`:""}
    <rect x="230" y="110" width="155" height="42" rx="11" fill="#111827" fill-opacity=".88" stroke="#FD5A1E" stroke-width="3"/>
    <text x="307.5" y="140" text-anchor="middle" font-family="Arial" font-size="28" font-weight="bold" fill="#FD5A1E">${xlsEsc(result)}</text>
  </svg>`;
  return "data:image/svg+xml;base64,"+btoa(unescape(encodeURIComponent(svg)));
}
function recapPaPanelV281(paTags,paNo){
  const t=paTags[paTags.length-1]||{};
  const ev=t.exit_velocity||"-";
  const la=t.launch_angle||t.la||"-";
  const swings=paTags.filter(isSwingTag).length;
  const misses=paTags.filter(isMissTag).length;
  return `<td class="rpa"><table class="rpaTable"><tr><th>PA ${paNo}</th></tr><tr><td class="visuals"><img class="field" src="${recapFieldSvgV281(paTags)}"></td></tr><tr><td><table class="metrics"><tr><th>EV</th><td>${xlsEsc(ev?String(ev)+(String(ev).includes('mph')?'':' mph'):'-')}</td></tr><tr><th>SwM</th><td>${misses}/${swings}</td></tr><tr><th>LA</th><td>${xlsEsc(la==='-'?'-':String(la)+(String(la).includes('°')?'':'°'))}</td></tr></table></td></tr></table></td>`;
}
function recapBatterBlockV281(player,allPas,allTags,start){
  const pas=allPas.slice(start,start+5), st=hitterStatsV279(allTags,allPas), cont=start?" (cont.)":"";
  const rows=[["PA",st.PA],["H",st.H],["BB",st.BB],["K",st.K],["RBI",st.RBI],["R",st.R],["SB",st.SB],["SwDz",st.SwDz],["SwM",st.SwM]];
  let h='<table class="batterRow"><tr><td class="rstats"><table><tr><th colspan="2" class="name">'+xlsEsc(reportPlayerName(player)+cont)+'</th></tr>';
  rows.forEach(r=>h+='<tr><th>'+r[0]+'</th><td>'+xlsEsc(r[1])+'</td></tr>');
  h+='</table></td>';
  pas.forEach((pa,i)=>{h+=recapPaPanelV281(pa,start+i+1);});
  h+='<td class="rnotes"><table><tr><th>Offensive Notes</th></tr><tr><td></td></tr><tr><th>Defensive Notes</th></tr><tr><td></td></tr><tr><th>Baserunning Notes</th></tr><tr><td></td></tr></table></td></tr></table>';
  return h;
}
function recapHeaderV288(g){
  const title=(g.name||'Game Recap')+(g.date?' - '+g.date:'');
  return '<div class="title"><span class="brand">EASY TAGG</span> &nbsp;|&nbsp; '+xlsEsc(title)+'</div>'+ 
    '<div class="miniLegend">'+
      '<span><b class="legendLine solid"></b> LD: línea</span>'+ 
      '<span><b class="legendLine dashed"></b> GB: rodado</span>'+ 
      '<span><b class="legendCurve">⌒</b> FB: elevado</span>'+ 
      '<span><b class="legendCurve short">⌒</b> PU: pop up</span>'+ 
    '</div>';
}
function recapBattersHtmlV281(){
  const groups=reportPaGroupsV279();
  const players=Object.keys(groups).sort((a,b)=>reportPlayerName(a).localeCompare(reportPlayerName(b)));
  const g=game()||{};
  const blocks=[];
  players.forEach(p=>{
    const tags=gt().filter(t=>(t.batter||"No Player")===p), pas=groups[p];
    for(let start=0;start<pas.length;start+=5) blocks.push(recapBatterBlockV281(p,pas,tags,start));
  });
  let html='<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=2016, initial-scale=1.0"><style>';
  html+='*{box-sizing:border-box}html,body{margin:0;padding:0;width:2016px;background:#0b0f14;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb}.pdfPage{width:2016px;height:1224px;overflow:hidden;background:#0b0f14;padding:12px 20px 10px;page-break-after:always}.pdfPage:last-child{page-break-after:auto}.title{text-align:center;font-size:38px;font-weight:900;color:#fff;margin:0 0 8px;padding:10px 8px;border-bottom:5px solid #FD5A1E;letter-spacing:.4px;white-space:nowrap;overflow:hidden}.brand{color:#FD5A1E;font-weight:900}.miniLegend{height:38px;display:flex;align-items:center;justify-content:center;gap:26px;font-size:18px;color:#e5e7eb;margin:0 0 10px;padding:4px 8px;border:2px solid #374151;background:#111827}.miniLegend span{display:inline-flex;align-items:center;gap:7px;white-space:nowrap}.legendLine{display:inline-block;width:46px;height:0;border-top:5px solid #FD5A1E}.legendLine.dashed{border-top-style:dashed}.legendCurve{display:inline-block;color:#FD5A1E;font-size:31px;font-weight:900;line-height:12px;transform:scaleX(1.45)}.legendCurve.short{transform:scaleX(.9)}.batterRow{width:100%;height:345px;border-collapse:separate;border-spacing:8px 0;table-layout:fixed;margin:0 0 12px;background:#111827;padding:8px;border:2px solid #FD5A1E}.batterRow table{width:100%;border-collapse:collapse}.rstats{width:12%;vertical-align:top}.rpa{width:12.5%;vertical-align:top}.rnotes{width:auto;vertical-align:top}.name,.rpaTable>tbody>tr:first-child>th,.rnotes th{background:#374151;color:#fff;font-weight:800;font-size:18px;padding:7px;border:2px solid #4b5563}.name,.rnotes th{background:#1f2937;border-bottom:4px solid #FD5A1E}.rstats th,.rstats td{border:2px solid #4b5563;text-align:center;font-size:17px;height:31px;padding:2px;background:#f8fafc;color:#111827}.visuals{height:230px;border-left:2px solid #4b5563;border-right:2px solid #4b5563;padding:0;text-align:center;background:#030712}.field{width:100%;height:226px;object-fit:contain;display:block;margin:auto}.metrics th,.metrics td{border:2px solid #4b5563;font-size:15px;height:28px;padding:2px}.metrics th{background:#374151;color:#fff;width:35%;text-align:center}.metrics td{text-align:center;background:#f8fafc;color:#111827}.rnotes th{text-align:left;padding-left:10px}.rnotes td{border:2px solid #4b5563;height:73px;font-size:15px;vertical-align:top;padding:5px;background:#f8fafc;color:#111827}.emptyMsg{font-size:26px;text-align:center;margin-top:120px;color:#fff}</style></head><body>';
  if(!blocks.length){
    html+='<section class="pdfPage">'+recapHeaderV288(g)+'<div class="emptyMsg">No hay apariciones al plato finalizadas para exportar.</div></section>';
  }else{
    for(let i=0;i<blocks.length;i+=3){
      html+='<section class="pdfPage">'+recapHeaderV288(g)+blocks.slice(i,i+3).join('')+'</section>';
    }
  }
  html+='</body></html>';
  return html;
}
window.onEasyTaggPdfSaved=function(name){
  if($('csvStatus'))$('csvStatus').textContent=(name||'recap_batters.pdf')+' guardado en Descargas/EasyTagg.';
};
window.onEasyTaggPdfError=function(message){
  if($('csvStatus'))$('csvStatus').textContent='Error creando PDF: '+message;
};
function recapAuditV292(){
  const groups=reportPaGroupsV279();
  const players=Object.keys(groups).sort((a,b)=>reportPlayerName(a).localeCompare(reportPlayerName(b)));
  const pages=[];
  const blocks=[];
  players.forEach(p=>{
    const pas=groups[p]||[];
    for(let start=0;start<pas.length;start+=5)blocks.push({player:p,label:reportPlayerName(p)+(start?' (cont.)':''),paStart:start+1,paEnd:Math.min(start+5,pas.length)});
  });
  for(let i=0;i<blocks.length;i+=3)pages.push(blocks.slice(i,i+3).map(x=>x.label));
  return {gameId:state.activeGameId,gameName:(game()||{}).name||'',tagsFound:gt().length,battersFound:players.length,blocksCreated:blocks.length,pagesCreated:pages.length,players:players.map(p=>({id:p,name:reportPlayerName(p),plateAppearances:(groups[p]||[]).length})),pages};
}
function exportBatterRecapPdf(){
  try{
    const audit=recapAuditV292();
    if(!audit.battersFound)throw new Error('No hay bateadores con turnos finalizados para exportar.');
    if(audit.blocksCreated<1||audit.pagesCreated<1)throw new Error('La auditoría no pudo crear bloques o páginas.');
    if($('csvStatus'))$('csvStatus').textContent=`Generando recap_batters.pdf · ${audit.battersFound} bateadores · ${audit.pagesCreated} páginas...`;
    try{
      if(window.AndroidBridge&&AndroidBridge.saveFile)AndroidBridge.saveFile('recap_batters_debug.json','application/json',JSON.stringify(audit,null,2));
    }catch(_ignored){}
    const html=recapBattersHtmlV281();
    const htmlPages=(html.match(/class=["']pdfPage["']/g)||[]).length;
    if(htmlPages!==audit.pagesCreated)throw new Error(`Validación falló: se esperaban ${audit.pagesCreated} páginas y el HTML creó ${htmlPages}.`);
    if(window.AndroidBridge&&AndroidBridge.savePdf)AndroidBridge.savePdf('recap_batters.pdf',html);
    else{const w=window.open('','_blank');w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
  }catch(e){if($('csvStatus'))$('csvStatus').textContent='Error creando PDF: '+e.message;alert('Error creando PDF: '+e.message);}
}
window.exportBatterRecapPdf=exportBatterRecapPdf;

/* ================================================================
   Easy Tagg v2.9.3 - recap_pitchers PDF
   Uses the stable fixed-sheet legal landscape renderer from v2.9.2.
   One pitcher per page. Only app-captured data is displayed.
   ================================================================ */
function recapPitcherResultIsStrikeV293(t){
  const r=String((t&& (t.final_result||t.result))||'').toLowerCase();
  return String(t&&t.zone_status||'').toLowerCase().includes('in zone') ||
    r.includes('strike') || r.includes('swing miss') || r.includes('foul') ||
    r.includes('k swinging') || r.includes('k looking') || isSwingTag(t);
}
function recapPitcherPaGroupsV293(tags){
  const groups=[]; let open=[];
  tags.slice().sort((a,b)=>Number(a.game_seconds||0)-Number(b.game_seconds||0)).forEach(t=>{
    open.push(t);
    if(reportTerminalResultV292(t)){ groups.push(open.slice()); open=[]; }
  });
  return groups;
}
function recapPitcherStatsV293(tags){
  const pas=recapPitcherPaGroupsV293(tags);
  let H=0,BB=0,SO=0,outs=0,strikes=0,fps=0;
  pas.forEach(pa=>{
    const first=pa[0]||{}, last=pa[pa.length-1]||{}, r=String(last.final_result||last.result||'');
    if(recapPitcherResultIsStrikeV293(first))fps++;
    if(['Single','Double','Triple','HR'].includes(r))H++;
    if(r==='BB')BB++;
    if(['K Swinging','K Looking'].includes(r)){SO++;outs++;}
    else if(['Out','Ground Out','Fly Out','Line Out','Pop Out','Sac Fly','Sac Bunt','Fielder\'s Choice'].includes(r))outs++;
  });
  tags.forEach(t=>{if(recapPitcherResultIsStrikeV293(t))strikes++;});
  return {
    IP:Math.floor(outs/3)+'.'+(outs%3), H, R:'', BB, SO,
    FPS:fps+'/'+pas.length, P:tags.length,
    STR:tags.length?Math.round(strikes*100/tags.length)+'%':'0%'
  };
}
function recapPitchTypeLabelV293(pt){
  const s=String(pt||'Unknown').trim(); return s||'Unknown';
}
function recapPitchSummaryV293(tags){
  const m={};
  tags.forEach(t=>{
    const p=recapPitchTypeLabelV293(t.pitch_type), mph=Number(t.pitch_mph);
    if(!m[p])m[p]={pitch:p,n:0,speeds:[],strikes:0};
    m[p].n++; if(Number.isFinite(mph)&&mph>0)m[p].speeds.push(mph);
    if(recapPitcherResultIsStrikeV293(t))m[p].strikes++;
  });
  return Object.values(m).sort((a,b)=>b.n-a.n).map(x=>({
    pitch:x.pitch,n:x.n,pct:tags.length?Math.round(x.n*100/tags.length)+'%':'0%',
    strikePct:x.n?Math.round(x.strikes*100/x.n)+'%':'0%',
    min:x.speeds.length?Math.min(...x.speeds).toFixed(1):'-',
    avg:x.speeds.length?(x.speeds.reduce((a,b)=>a+b,0)/x.speeds.length).toFixed(1):'-',
    max:x.speeds.length?Math.max(...x.speeds).toFixed(1):'-'
  }));
}
function recapPitcherZoneSvgV293(tags){
  let dots='';
  tags.forEach((t,i)=>{
    if(!Number.isFinite(Number(t.zone_x))||!Number.isFinite(Number(t.zone_y)))return;
    const x=24+Math.max(0,Math.min(100,Number(t.zone_x)))*3.52;
    const y=18+Math.max(0,Math.min(100,Number(t.zone_y)))*2.72;
    const fill=pitchColorV280(t.pitch_type);
    dots+=`<circle cx="${x}" cy="${y}" r="7" fill="${fill}" stroke="#fff" stroke-width="2"/><text x="${x}" y="${y+3}" text-anchor="middle" font-family="Arial" font-size="7" font-weight="700" fill="#fff">${i+1}</text>`;
  });
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="430" height="330" viewBox="0 0 400 310">
  <rect width="400" height="310" rx="8" fill="#030712"/>
  <rect x="133" y="72" width="134" height="160" fill="#f8fafc" stroke="#FD5A1E" stroke-width="5"/>
  <line x1="177.7" y1="72" x2="177.7" y2="232" stroke="#94a3b8" stroke-width="2"/><line x1="222.3" y1="72" x2="222.3" y2="232" stroke="#94a3b8" stroke-width="2"/>
  <line x1="133" y1="125.3" x2="267" y2="125.3" stroke="#94a3b8" stroke-width="2"/><line x1="133" y1="178.7" x2="267" y2="178.7" stroke="#94a3b8" stroke-width="2"/>
  ${dots}</svg>`;
  return 'data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));
}
function recapPitcherLegendV293(rows){
  return rows.map(r=>`<span><i style="background:${pitchColorV280(r.pitch)}"></i>${xlsEsc(r.pitch)}</span>`).join('');
}
function recapPitcherPageV293(name,tags,g){
  const st=recapPitcherStatsV293(tags), rows=recapPitchSummaryV293(tags);
  let summaryRows=rows.map(r=>`<tr><td><span class="pitchDot" style="background:${pitchColorV280(r.pitch)}"></span>${xlsEsc(r.pitch)}</td><td>${r.n}</td><td>${r.pct}</td><td>${r.strikePct}</td><td>${r.min}</td><td>${r.avg}</td><td>${r.max}</td></tr>`).join('');
  if(!summaryRows)summaryRows='<tr><td colspan="7">No pitch data</td></tr>';
  return `<section class="pdfPage">
    <div class="pitchTitle"><span class="brand">EASY TAGG</span> · PITCHER RECAP · ${xlsEsc((g&&g.name)||'GAME')}</div>
    <div class="pitcherNameV293">${xlsEsc(reportPlayerName(name))}</div>
    <div class="pitchGridV293">
      <div class="pitchLeftV293">
        <div class="zoneTitleV293">PITCH LOCATION</div>
        <img class="zoneV293" src="${recapPitcherZoneSvgV293(tags)}">
        <div class="pitchLegendV293">${recapPitcherLegendV293(rows)}</div>
      </div>
      <div class="pitchRightV293">
        <table class="perfV293"><tr><th colspan="8">PERFORMANCE SUMMARY</th></tr><tr><th>IP</th><th>H</th><th>R</th><th>BB</th><th>SO</th><th>FPS</th><th>#P</th><th>STR %</th></tr>
        <tr><td>${st.IP}</td><td>${st.H}</td><td>${st.R||'-'}</td><td>${st.BB}</td><td>${st.SO}</td><td>${st.FPS}</td><td>${st.P}</td><td>${st.STR}</td></tr></table>
        <table class="pitchDataV293"><tr><th colspan="7">PITCH DATA SUMMARY</th></tr><tr><th>Pitch</th><th>#P</th><th>Use %</th><th>Strike %</th><th>Min</th><th>Avg</th><th>Max</th></tr>${summaryRows}</table>
        <div class="notesTitleV293">PITCHER NOTES</div><div class="notesBoxV293"></div>
      </div>
    </div>
  </section>`;
}
function recapPitchersHtmlV293(){
  const g=game(), groups=pitcherGroupsV280();
  const names=Object.keys(groups).filter(n=>groups[n]&&groups[n].length).sort((a,b)=>reportPlayerName(a).localeCompare(reportPlayerName(b)));
  let html='<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=2016, initial-scale=1.0"><style>';
  html+='*{box-sizing:border-box}html,body{margin:0;padding:0;width:2016px;background:#0b0f14;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb}.pdfPage{width:2016px;height:1224px;overflow:hidden;background:#0b0f14;padding:24px 34px;page-break-after:always}.pitchTitle{text-align:center;font-size:36px;font-weight:900;color:#fff;border-bottom:6px solid #FD5A1E;padding:8px 0 12px}.brand{color:#FD5A1E}.pitcherNameV293{font-size:43px;font-weight:900;margin:22px 0 16px;color:#fff}.pitchGridV293{display:grid;grid-template-columns:46% 54%;gap:26px;height:1040px}.pitchLeftV293,.pitchRightV293{border:3px solid #374151;background:#111827;padding:20px}.zoneTitleV293,.notesTitleV293{background:#1f2937;border-bottom:5px solid #FD5A1E;color:#fff;font-size:25px;font-weight:900;padding:12px;text-align:center}.zoneV293{display:block;width:760px;height:585px;object-fit:contain;margin:18px auto 8px}.pitchLegendV293{display:flex;flex-wrap:wrap;justify-content:center;gap:18px;font-size:20px;margin-top:8px}.pitchLegendV293 span{display:flex;align-items:center;gap:7px}.pitchLegendV293 i,.pitchDot{display:inline-block;width:16px;height:16px;border-radius:50%;margin-right:8px}.perfV293,.pitchDataV293{width:100%;border-collapse:collapse;margin-bottom:30px;background:#f8fafc;color:#111827}.perfV293 th,.pitchDataV293 th{background:#1f2937;color:#fff;border:2px solid #4b5563;padding:12px;font-size:20px}.perfV293 tr:first-child th,.pitchDataV293 tr:first-child th{border-bottom:5px solid #FD5A1E;font-size:24px}.perfV293 td,.pitchDataV293 td{border:2px solid #94a3b8;text-align:center;padding:13px;font-size:20px;font-weight:700}.pitchDataV293 td:first-child{text-align:left}.notesBoxV293{height:300px;background:#f8fafc;border:3px solid #4b5563}</style></head><body>';
  if(!names.length)html+='<section class="pdfPage"><div class="pitchTitle"><span class="brand">EASY TAGG</span> · PITCHER RECAP</div><div style="font-size:30px;text-align:center;margin-top:180px">No hay lanzamientos para exportar.</div></section>';
  else names.forEach(n=>html+=recapPitcherPageV293(n,groups[n],g));
  html+='</body></html>'; return html;
}
function recapPitcherAuditV293(){
  const groups=pitcherGroupsV280();
  const names=Object.keys(groups).filter(n=>groups[n]&&groups[n].length).sort((a,b)=>reportPlayerName(a).localeCompare(reportPlayerName(b)));
  return {gameId:state.activeGameId,gameName:(game()||{}).name||'',pitchersFound:names.length,pagesCreated:names.length,pitchers:names.map(n=>({name:reportPlayerName(n),pitches:groups[n].length,plateAppearances:recapPitcherPaGroupsV293(groups[n]).length}))};
}
function exportPitcherRecapPdf(){
  try{
    const audit=recapPitcherAuditV293();
    if(!audit.pitchersFound)throw new Error('No hay pitchers con lanzamientos para exportar.');
    if($('csvStatus'))$('csvStatus').textContent=`Generando recap_pitchers.pdf · ${audit.pitchersFound} pitchers · ${audit.pagesCreated} páginas...`;
    try{if(window.AndroidBridge&&AndroidBridge.saveFile)AndroidBridge.saveFile('recap_pitchers_debug.json','application/json',JSON.stringify(audit,null,2));}catch(_ignored){}
    const html=recapPitchersHtmlV293();
    const htmlPages=(html.match(/class=["']pdfPage["']/g)||[]).length;
    if(htmlPages!==audit.pagesCreated)throw new Error(`Validación falló: se esperaban ${audit.pagesCreated} páginas y el HTML creó ${htmlPages}.`);
    if(window.AndroidBridge&&AndroidBridge.savePdf)AndroidBridge.savePdf('recap_pitchers.pdf',html);
    else{const w=window.open('','_blank');w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
  }catch(e){if($('csvStatus'))$('csvStatus').textContent='Error creando PDF pitchers: '+e.message;alert('Error creando PDF pitchers: '+e.message);}
}
window.exportPitcherRecapPdf=exportPitcherRecapPdf;


/* ================================================================
   Easy Tagg v2.9.4 - Runner Events + RBI
   - No base-occupancy engine.
   - Runner Event is available at any time.
   - Player is selected from one compact dropdown.
   - RBI is selected immediately after a terminal PA result.
   - Compact sheets fit on screen without scrolling.
   ================================================================ */
state.runnerEvents = JSON.parse(localStorage.getItem("etd_runner_events") || "[]");
state.runnerEventDraftV294 = {event:""};

const etV294OriginalSave = save;
save = function(){
  etV294OriginalSave();
  localStorage.setItem("etd_runner_events", JSON.stringify(state.runnerEvents || []));
};

function etV294GameRunnerEvents(){
  return (state.runnerEvents || []).filter(e => e.game_id === state.activeGameId);
}
function etV294EligibleRunners(){
  const side = state.battingSide || "away";
  return (state.players || [])
    .filter(p => p.role === "Bateador" || p.role === "Ambos")
    .sort((a,b)=>{
      const as=(a.side||"away")===side?0:1, bs=(b.side||"away")===side?0:1;
      if(as!==bs)return as-bs;
      return String(a.name||"").localeCompare(String(b.name||""));
    });
}
function etV294PopulateRunnerPlayers(){
  const sel=$("runnerPlayerV294");
  if(!sel)return;
  const players=etV294EligibleRunners();
  sel.innerHTML=players.map(p=>`<option value="${p.id}">${xlsEsc(p.name||"Sin nombre")} · #${xlsEsc(p.num||"-")}</option>`).join("");
  if(state.batter && players.some(p=>p.id===state.batter))sel.value=state.batter;
}
function etV294OpenRunnerEvent(){
  if(!game())return alert("Create or select an activity first.");
  etV294PopulateRunnerPlayers();
  state.runnerEventDraftV294={event:""};
  document.querySelectorAll("[data-runner-event-v294]").forEach(b=>b.classList.remove("selected"));
  etV295RenderRunnerMiniHistory();
  openSheet("runnerEventSheetV294");
}
function etV294SelectRunnerEvent(event,btn){
  state.runnerEventDraftV294={event};
  document.querySelectorAll("[data-runner-event-v294]").forEach(b=>b.classList.remove("selected"));
  if(btn)btn.classList.add("selected");
}
function etV294SaveRunnerEvent(){
  const g=game(), playerId=$("runnerPlayerV294")?.value||"", p=pl(playerId);
  const event=state.runnerEventDraftV294?.event||"";
  if(!g)return etAppAlert("No activity is selected.","ACTIVITY REQUIRED");
  if(!p)return alert("Selecciona el jugador.");
  if(!event)return alert("Selecciona el evento.");
  const row={
    event_id:uid(),
    game_id:g.id,
    game_name:g.name,
    game_date:g.date,
    runner_id:p.id,
    runner:p.name,
    runner_side:p.side||"",
    event_type:event,
    inning:$("inning")?.value||"",
    half:$("half")?.value||"",
    outs_before:state.outs,
    pitcher_id:state.pitcher||"",
    pitcher:pn(state.pitcher),
    batter_id:state.batter||"",
    batter:pn(state.batter),
    game_seconds:state.clock,
    game_time:fmt(state.clock),
    created_at:new Date().toISOString()
  };
  state.runnerEvents.push(row);
  if(window.AndroidBridge)AndroidBridge.vibrateShort();
  save();
  etV295RenderRunnerMiniHistory();
  state.runnerEventDraftV294={event:""};
  document.querySelectorAll("[data-runner-event-v294]").forEach(b=>b.classList.remove("selected"));
}
window.deleteRunnerEventV294=function(id){
  if(!confirm("Delete this runner event?"))return;
  state.runnerEvents=(state.runnerEvents||[]).filter(e=>e.event_id!==id);
  save();
  etV295RenderRunnerMiniHistory();
};
function etV295RenderRunnerMiniHistory(){
  const box=$("runnerMiniHistoryListV295");
  const count=$("runnerMiniHistoryCountV295");
  if(!box)return;
  const events=etV294GameRunnerEvents().slice().sort((a,b)=>Number(b.game_seconds||0)-Number(a.game_seconds||0));
  if(count)count.textContent=String(events.length);
  if(!events.length){
    box.innerHTML='<p class="runnerMiniEmptyV295">No hay eventos registrados.</p>';
    return;
  }
  box.innerHTML=events.slice(0,8).map(e=>`<div class="runnerMiniRowV295"><div><b>${xlsEsc(e.runner)}</b><span>#${xlsEsc(pl(e.runner_id)?.num||"-")}</span><small>${xlsEsc(e.event_type)} · INN ${xlsEsc(e.inning||"-")}</small></div><button type="button" onclick="deleteRunnerEventV294('${e.event_id}')" aria-label="Delete event">×</button></div>`).join("");
}


function etV294OpenRbi(result){
  if(!state.pending)return;
  state.pending.result=result;
  state.pending.rbi=0;
  const tag=etV275PendingTag();
  if(tag){tag.result=result;tag.final_result=result;tag.rbi=0;}
  document.querySelectorAll("[data-rbi-v294]").forEach(b=>b.classList.toggle("selected",b.dataset.rbiV294==="0"));
  closeSheets();
  openSheet("rbiSheetV294");
}
function etV294SetRbi(value,btn){
  if(state.pending)state.pending.rbi=Math.max(0,Math.min(4,Number(value)||0));
  document.querySelectorAll("[data-rbi-v294]").forEach(b=>b.classList.remove("selected"));
  if(btn)btn.classList.add("selected");
}
function etV294ContinueAfterRbi(){
  const tag=etV275PendingTag();
  if(!tag||!state.pending)return alert("No pending result.");
  const result=state.pending.result||tag.result;
  tag.rbi=Number(state.pending.rbi||0);
  closeSheets();
  if(etV275ContactResult(result)){
    state.detail={contact:"",trajectory:"",spray:""};
    document.querySelectorAll("[data-contact],[data-traj],[data-hitloc]").forEach(b=>b.classList.remove("selected"));
    openSheet("detailSheet");
  }else{
    etV275FinalizeNonContact(result);
  }
}

/* Route every terminal result through the compact RBI selector. */
etV275ChooseResult=function(result){
  const tag=etV275PendingTag();
  if(!tag)return;
  etV294OpenRbi(result);
};

const etV294OriginalFinalizeNonContact=etV275FinalizeNonContact;
etV275FinalizeNonContact=function(result){
  const tag=etV275PendingTag();
  if(tag)tag.rbi=Number(state.pending?.rbi||0);
  return etV294OriginalFinalizeNonContact(result);
};
const etV294OriginalSaveContact=etV275SaveContactDetail;
etV275SaveContactDetail=function(){
  const tag=etV275PendingTag();
  if(tag)tag.rbi=Number(state.pending?.rbi||0);
  return etV294OriginalSaveContact();
};

/* Populate RBI, R and SB in the already-approved batter PDF. */
const etV294OriginalHitterStats=hitterStatsV279;
hitterStatsV279=function(allTags,paGroups){
  const st=etV294OriginalHitterStats(allTags,paGroups);
  const sample=(allTags||[])[0]||{};
  const playerId=sample.batter_id||"";
  const playerName=String(sample.batter||"").trim().toLowerCase();
  const events=etV294GameRunnerEvents().filter(e=>
    (playerId && e.runner_id===playerId) ||
    (!playerId && String(e.runner||"").trim().toLowerCase()===playerName)
  );
  st.RBI=(allTags||[]).reduce((sum,t)=>sum+(Number(t.rbi)||0),0);
  st.R=events.filter(e=>e.event_type==="Run Scored").length;
  st.SB=events.filter(e=>String(e.event_type||"").startsWith("SB ")).length;
  return st;
};

/* Fill pitcher R from runner events recorded while that pitcher was active. */
const etV294OriginalPitcherStats=recapPitcherStatsV293;
recapPitcherStatsV293=function(tags){
  const st=etV294OriginalPitcherStats(tags);
  const sample=(tags||[])[0]||{};
  const pid=sample.pitcher_id||"";
  const pname=String(sample.pitcher||"").trim().toLowerCase();
  st.R=etV294GameRunnerEvents().filter(e=>
    e.event_type==="Run Scored" &&
    ((pid&&e.pitcher_id===pid)||(!pid&&String(e.pitcher||"").trim().toLowerCase()===pname))
  ).length;
  return st;
};

function etV294Wire(){
  const eventBtn=$("runnerEventBtnV294");
  if(eventBtn)eventBtn.onclick=etV294OpenRunnerEvent;
  document.querySelectorAll("[data-runner-event-v294]").forEach(btn=>{
    btn.onclick=()=>etV294SelectRunnerEvent(btn.dataset.runnerEventV294,btn);
  });
  const saveRunner=$("saveRunnerEventV294");
  if(saveRunner)saveRunner.onclick=etV294SaveRunnerEvent;
  document.querySelectorAll("[data-rbi-v294]").forEach(btn=>{
    btn.onclick=()=>etV294SetRbi(btn.dataset.rbiV294,btn);
  });
  const cont=$("continueRbiV294");
  if(cont)cont.onclick=etV294ContinueAfterRbi;
  /* Rewire result and contact-save handlers after overriding their functions. */
  document.querySelectorAll("[data-sheet-result]").forEach(btn=>{
    btn.onclick=()=>etV275ChooseResult(btn.dataset.sheetResult);
  });
  if($("saveDetail"))$("saveDetail").onclick=etV275SaveContactDetail;
}

const etV294OriginalRender=render;
render=function(){
  etV294OriginalRender();
  etV295RenderRunnerMiniHistory();
};

window.addEventListener("load",()=>{
  setTimeout(etV294Wire,250);
  setTimeout(etV294Wire,900);
});
document.addEventListener("click",()=>setTimeout(etV294Wire,50),true);

/* ================================================================
   Easy Tagg v2.9.6 - History editor uses activity roster only
   - Keeps the approved history modal and button positions unchanged.
   - Batter and pitcher dropdowns are limited to the active activity roster.
   ================================================================ */
function etV296ActivityRosterPlayers(){
  if(typeof et254ActivityPlayers === "function"){
    const players = et254ActivityPlayers();
    return Array.isArray(players) ? players : [];
  }
  return [];
}
etAllBattersV21 = function(){
  return etV296ActivityRosterPlayers().filter(p=>p.role==="Bateador"||p.role==="Ambos");
};
etAllPitchersV21 = function(){
  return etV296ActivityRosterPlayers().filter(p=>p.role==="Pitcher"||p.role==="Ambos");
};

/* ================================================================
   Easy Tagg v2.9.6.1 - FIX History editor activity roster binding
   Directly replaces the globally-bound edit function used by the
   Historial Edit button. No UI structure or button positions changed.
   ================================================================ */
function etV2961CurrentActivityPlayers(){
  const readers = [
    (typeof et27ActivityPlayers === "function") ? et27ActivityPlayers : null,
    (typeof et255ActivityPlayers === "function") ? et255ActivityPlayers : null,
    (typeof et254ActivityPlayers === "function") ? et254ActivityPlayers : null,
    (typeof et252ActivityPlayers === "function") ? et252ActivityPlayers : null
  ].filter(Boolean);
  for(const read of readers){
    try{
      const rows = read();
      if(Array.isArray(rows)) return rows;
    }catch(e){}
  }
  try{
    const key = "etd_activity_roster_v252_" + (state.activeGameId || "no_game");
    const ids = JSON.parse(localStorage.getItem(key) || "[]");
    if(Array.isArray(ids)) return ids.map(id=>state.players.find(p=>p.id===id)).filter(Boolean);
  }catch(e){}
  return [];
}
function etV2961IsBatter(p){
  const role=String(p?.role||"").trim().toLowerCase();
  return role==="bateador" || role==="batter" || role==="ambos" || role==="both";
}
function etV2961IsPitcher(p){
  const role=String(p?.role||"").trim().toLowerCase();
  return role==="pitcher" || role==="lanzador" || role==="ambos" || role==="both";
}
function etV2961PlayerOption(p, selectedId){
  const label=[p.num ? ("#"+p.num) : "", p.name||""].filter(Boolean).join(" ");
  return `<option value="${p.id}" ${p.id===selectedId?"selected":""}>${label}</option>`;
}
function openEditTagV2961(id){
  const t=state.tags.find(x=>x.tag_id===id);
  if(!t)return;
  const activityPlayers=etV2961CurrentActivityPlayers();
  const batters=activityPlayers.filter(etV2961IsBatter);
  const pitchers=activityPlayers.filter(etV2961IsPitcher);
  $("editTagId").value=id;
  $("editBatter").innerHTML=batters.map(p=>etV2961PlayerOption(p,t.batter_id)).join("");
  $("editPitcher").innerHTML=pitchers.map(p=>etV2961PlayerOption(p,t.pitcher_id)).join("");
  $("editResult").value=t.final_result||t.result||"Ball";
  if($("editTrajectory"))$("editTrajectory").value=t.trajectory||"";
  if($("editQuality"))$("editQuality").value=t.contact_quality||"";
  openSheet("editTagSheet");
}
/* Inline onclick in Historial resolves this exact window property. */
window.openEditTagV21=openEditTagV2961;
/* Also cover any older history card still using openEditTag. */
window.openEditTag=openEditTagV2961;


/* ================= EASY TAGG v2.9.7 PLAYER DATABASE CSV =================
   First database stage:
   - Bundled read-only player catalog from CSV.
   - Search by name, last name or player_code.
   - Add a database player to the global player store and current activity roster.
   - Existing roster, lineup, history, runner events and reports remain unchanged.
   ======================================================================= */
const ET297_VERSION = "2.9.8 Player Database CSV Update";

function et297Db(){
  try{
    const saved=JSON.parse(localStorage.getItem("easytagg_player_db_v298")||"null");
    if(Array.isArray(saved)&&saved.length)return saved;
  }catch(e){}
  return Array.isArray(window.EASYTAGG_PLAYER_DB) ? window.EASYTAGG_PLAYER_DB : [];
}
function et297Norm(v){
  return String(v == null ? "" : v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
}
function et297Role(row){
  return String(row?.position || "").toUpperCase() === "P" ? "Pitcher" : "Bateador";
}
function et297ExistingByCode(code){
  code=String(code||"");
  return (state.players||[]).find(p => String(p.db_player_code||p.player_code||"") === code);
}
function et297ActivityIds(){
  const key="etd_activity_roster_v252_"+(state.activeGameId||"no_game");
  try{const ids=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(ids)?ids:[];}catch(e){return [];}
}
function et297SetActivityIds(ids){
  const key="etd_activity_roster_v252_"+(state.activeGameId||"no_game");
  localStorage.setItem(key,JSON.stringify(Array.from(new Set((ids||[]).filter(Boolean)))));
}
function et297AddToActivity(playerId){
  if(!state.activeGameId)return false;
  const ids=et297ActivityIds();
  if(!ids.includes(playerId))ids.push(playerId);
  et297SetActivityIds(ids);
  return true;
}
function et297OpenDatabase(){
  if(!state.activeGameId)return etAppAlert("Please create or select an activity before continuing.","ACTIVITY REQUIRED");
  const input=$("playerDbSearchV297");
  if(input)input.value="";
  const status=$("playerDbStatusV297");
  if(status)status.textContent=`${et297Db().length.toLocaleString()} players available`;
  const results=$("playerDbResultsV297");
  if(results)results.innerHTML='<p class="playerDbEmptyV297">Enter at least 2 letters or a Player Code.</p>';
  openSheet("playerDatabaseSheetV297");
  setTimeout(()=>input?.focus(),80);
}
function et297SearchDatabase(){
  const input=$("playerDbSearchV297");
  const results=$("playerDbResultsV297");
  const status=$("playerDbStatusV297");
  if(!input||!results)return;
  const raw=String(input.value||"").trim();
  const q=et297Norm(raw);
  if(q.length<2){
    results.innerHTML='<p class="playerDbEmptyV297">Enter at least 2 letters or a Player Code.</p>';
    if(status)status.textContent=`${et297Db().length.toLocaleString()} players available`;
    return;
  }
  const found=[];
  for(const row of et297Db()){
    const code=String(row.player_code||"");
    const hay=et297Norm(`${row.name||""} ${row.first_name||""} ${row.last_name||""} ${code}`);
    if(hay.includes(q)){
      found.push(row);
      if(found.length>=30)break;
    }
  }
  if(status)status.textContent=found.length===30?"Showing the first 30 results":`${found.length} result${found.length===1?"":"s"}`;
  if(!found.length){
    results.innerHTML='<p class="playerDbEmptyV297">No players found.</p>';
    return;
  }
  results.innerHTML=found.map(row=>{
    const existing=et297ExistingByCode(row.player_code);
    const inActivity=existing?et297ActivityIds().includes(existing.id):false;
    const label=inActivity?"Added":(existing?"Add":"Add");
    return `<div class="playerDbRowV297">
      <div class="playerDbIdentityV297">
        <b>${xlsEsc(row.name||"Sin nombre")}</b>
        <small>Code ${xlsEsc(row.player_code)} · ${xlsEsc(row.position||"-")} · ${xlsEsc(row.country||"-")} · Eligible ${xlsEsc(row.eligible||"-")}</small>
      </div>
      <button type="button" ${inActivity?"disabled":""} onclick="et297AddDatabasePlayer('${String(row.player_code).replace(/'/g,"\\'")}')">${label}</button>
    </div>`;
  }).join("");
}
window.et297AddDatabasePlayer=function(code){
  if(!state.activeGameId)return etAppAlert("Please create or select an activity before continuing.","ACTIVITY REQUIRED");
  const row=et297Db().find(x=>String(x.player_code)===String(code));
  if(!row)return alert("Player not found in the database.");
  let p=et297ExistingByCode(code);
  if(!p){
    p={
      id:"db-"+String(row.player_code),
      db_player_code:String(row.player_code),
      player_code:String(row.player_code),
      num:"",
      name:row.name||`${row.first_name||""} ${row.last_name||""}`.trim(),
      first_name:row.first_name||"",
      last_name:row.last_name||"",
      birth_date:row.birth_date||"",
      country:row.country||"",
      date_eligible:row.eligible||"",
      team:"",
      position:row.position||"",
      role:et297Role(row),
      side:"away",
      bat:"",
      thr:""
    };
    state.players.push(p);
  }else{
    // Keep the player in the general activity roster. Team assignment is handled later in the lineup.
    p.side=p.side||"away";
  }
  et297AddToActivity(p.id);
  save();
  render();

  // Clear the database search immediately after a successful add.
  const dbSearch=$("playerDbSearchV297");
  const dbResults=$("playerDbResultsV297");
  const dbStatus=$("playerDbStatusV297");
  if(dbSearch) dbSearch.value="";
  if(dbResults) dbResults.innerHTML='<p class="playerDbEmptyV297">Enter at least 2 letters or a Player Code.</p>';
  if(dbStatus) dbStatus.textContent=`${et297Db().length.toLocaleString()} players available`;
  [60,180,350].forEach(delay=>setTimeout(()=>{
    const liveInput=$("playerDbSearchV297");
    if(!liveInput)return;
    liveInput.value="";
    liveInput.focus();
    try{liveInput.setSelectionRange(0,0);}catch(_err){}
  },delay));

  if(window.AndroidBridge?.vibrateShort)AndroidBridge.vibrateShort();
};

window.addEventListener("load",()=>{
  const btn=$("openPlayerDatabaseBtnV297");
  if(btn)btn.onclick=et297OpenDatabase;
  const input=$("playerDbSearchV297");
  if(input)input.addEventListener("input",et297SearchDatabase);
});


/* ================= EASY TAGG v2.9.8 PLAYER DATABASE CSV UPDATE =================
   Safe merge rules:
   - player_code is the unique key.
   - New rows are added.
   - Existing rows are updated only when values differ.
   - Players missing from the imported CSV are preserved.
   - Existing activity rosters and historical player snapshots are not rewritten.
   ============================================================================== */
const ET298_DB_KEY="easytagg_player_db_v298";

function et298CsvRows(text){
  text=String(text||"").replace(/^\uFEFF/,"");
  const rows=[]; let row=[], cell="", quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){
      if(ch==='"' && text[i+1]==='"'){cell+='"';i++;}
      else if(ch==='"')quoted=false;
      else cell+=ch;
    }else{
      if(ch==='"')quoted=true;
      else if(ch===','){row.push(cell);cell="";}
      else if(ch==='\n'){row.push(cell.replace(/\r$/,""));rows.push(row);row=[];cell="";}
      else cell+=ch;
    }
  }
  if(cell.length||row.length){row.push(cell.replace(/\r$/,""));rows.push(row);}
  return rows.filter(r=>r.some(v=>String(v).trim()!==""));
}
function et298HeaderKey(v){return et297Norm(v).replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");}
function et298NormalizeImportedRow(obj){
  const code=String(obj.player_code||obj.playercode||obj.code||"").trim();
  const first=String(obj.first_name||obj.firstname||"").trim();
  const last=String(obj.last_name||obj.lastname||"").trim();
  const name=`${first} ${last}`.trim() || String(obj.name||obj.display_name||obj.name_one||"").trim();
  return {
    player_code:code,
    name:name || `${first} ${last}`.trim(),
    first_name:first,
    last_name:last,
    birth_date:String(obj.birth_date||obj.birthdate||"").trim(),
    country:String(obj.country||"").trim(),
    position:String(obj.position||obj.position_code||obj.positioncode||"").trim(),
    eligible:String(obj.eligible||obj.date_eligible||obj.dateeligible||"").trim(),
    bat:String(obj.bats||obj.bat||obj.bat_hand||obj.bats_code||"").trim()
  };
}
function et298SamePlayer(a,b){
  return ["name","first_name","last_name","birth_date","country","position","eligible","bat"].every(k=>String(a?.[k]||"")===String(b?.[k]||""));
}
function et298SyncAddedPlayers(updatedByCode){
  let changed=0;
  for(const p of state.players||[]){
    const code=String(p.db_player_code||p.player_code||"");
    const row=updatedByCode.get(code);
    if(!row)continue;
    p.name=row.name||p.name;
    p.first_name=row.first_name||"";
    p.last_name=row.last_name||"";
    p.birth_date=row.birth_date||"";
    p.country=row.country||"";
    p.date_eligible=row.eligible||"";
    p.position=row.position||"";
    p.bat=row.bat||p.bat||"";
    p.role=et297Role(row);
    changed++;
  }
  if(changed)save();
}
async function et298ImportCsvFile(file){
  const status=$("playerDbUpdateStatusV298");
  try{
    if(!file)return;
    if(status){status.className="playerDbUpdateStatusV298";status.textContent="Leyendo CSV...";}
    const text=await file.text();
    const rows=et298CsvRows(text);
    if(rows.length<2)throw new Error("El CSV no contiene datos.");
    const headers=rows[0].map(et298HeaderKey);
    if(!headers.includes("player_code"))throw new Error("Falta la columna player_code.");
    const current=et297Db().map(x=>({...x}));
    const byCode=new Map(current.map(x=>[String(x.player_code||""),x]));
    let added=0, updated=0, same=0, invalid=0;
    const changedRows=new Map();
    for(const raw of rows.slice(1)){
      const obj={}; headers.forEach((h,i)=>obj[h]=raw[i]??"");
      const incoming=et298NormalizeImportedRow(obj);
      if(!incoming.player_code || !incoming.name){invalid++;continue;}
      const old=byCode.get(incoming.player_code);
      if(!old){byCode.set(incoming.player_code,incoming);added++;changedRows.set(incoming.player_code,incoming);}
      else if(!et298SamePlayer(old,incoming)){Object.assign(old,incoming);updated++;changedRows.set(incoming.player_code,old);}
      else same++;
    }
    const merged=Array.from(byCode.values());
    localStorage.setItem(ET298_DB_KEY,JSON.stringify(merged));
    et298SyncAddedPlayers(changedRows);
    if(status){status.className="playerDbUpdateStatusV298 ok";status.textContent=`Actualización completada: ${added} nuevos · ${updated} actualizados · ${same} sin cambios · ${invalid} inválidos. Total: ${merged.length.toLocaleString()}.`;}
    const main=$("playerDbStatusV297"); if(main)main.textContent=`${merged.length.toLocaleString()} players available`;
    const search=$("playerDbSearchV297"); if(search?.value)et297SearchDatabase();
  }catch(err){
    if(status){status.className="playerDbUpdateStatusV298 err";status.textContent=`No se pudo actualizar: ${err?.message||err}`;}
  }finally{
    const input=$("playerDbCsvInputV298"); if(input)input.value="";
  }
}
window.addEventListener("load",()=>{
  const btn=$("playerDbUpdateBtnV298"), input=$("playerDbCsvInputV298");
  if(btn&&input)btn.onclick=()=>input.click();
  if(input)input.addEventListener("change",()=>et298ImportCsvFile(input.files?.[0]));
});


/* ================= EASY TAGG v2.9.9.1 LOCKED DATABASE PLAYER CARD =================
   - Full database information in search results and roster cards.
   - "ID" replaces "Code".
   - Database players are read-only except for jersey number.
   - Manual players keep the existing full edit workflow.
   ================================================================================ */
const ET2991_VERSION="2.9.9.1 Locked Database Player Card";

function et2991Val(v){
  const x=String(v==null?"":v).trim();
  return x||"—";
}
function et2991Birth(v){
  return et299FormatPlayerDate(String(v||"").replace(/\s+0:00$/,""))||"—";
}
function et2991Bat(row){return String(row?.bat||row?.bats||row?.bat_hand||row?.bats_code||"").trim();}
function et2991Throw(row){return String(row?.thr||row?.throws||row?.throw_hand||row?.throws_code||"").trim();}
function et2991DbDetails(row){
  const bat=et2991Bat(row), thr=et2991Throw(row);
  return `<div class="playerDbFullDetailsV2991">
    <span><b>ID:</b> ${xlsEsc(et2991Val(row.player_code))}</span>
    <span><b>Pos:</b> ${xlsEsc(et2991Val(row.position))}</span>
    <span><b>Country:</b> ${xlsEsc(et2991Val(row.country))}</span>
    <span><b>Nacimiento:</b> ${xlsEsc(et2991Birth(row.birth_date))}</span>
    <span><b>Elegible:</b> ${xlsEsc(et2991Val(row.eligible||row.date_eligible))}</span>
    <span><b>Batea:</b> ${xlsEsc(et2991Val(bat))}</span>
    <span><b>Lanza:</b> ${xlsEsc(et2991Val(thr))}</span>
  </div>`;
}

/* Replace search renderer directly so the actual visible card uses the full layout. */
et297SearchDatabase=function(){
  const input=$("playerDbSearchV297"), results=$("playerDbResultsV297"), status=$("playerDbStatusV297");
  if(!input||!results)return;
  const raw=String(input.value||"").trim(), q=et297Norm(raw);
  if(q.length<2){
    results.innerHTML='<p class="playerDbEmptyV297">Enter at least 2 letters or an ID.</p>';
    if(status)status.textContent=`${et297Db().length.toLocaleString()} players available`;
    return;
  }
  const found=[];
  for(const row of et297Db()){
    const id=String(row.player_code||"");
    const hay=et297Norm(`${row.name||""} ${row.first_name||""} ${row.last_name||""} ${id}`);
    if(hay.includes(q)){found.push(row);if(found.length>=30)break;}
  }
  if(status)status.textContent=found.length===30?"Showing the first 30 results":`${found.length} result${found.length===1?"":"s"}`;
  if(!found.length){results.innerHTML='<p class="playerDbEmptyV297">No players found.</p>';return;}
  results.innerHTML=found.map(row=>{
    const existing=et297ExistingByCode(row.player_code);
    const inActivity=existing?et297ActivityIds().includes(existing.id):false;
    return `<div class="playerDbRowV297 playerDbRowFullV2991">
      <div class="playerDbIdentityV297">
        <b>${xlsEsc(row.name||"Sin nombre")}</b>
        ${et2991DbDetails(row)}
      </div>
      <button type="button" ${inActivity?"disabled":""} onclick="et297AddDatabasePlayer('${String(row.player_code).replace(/'/g,"\\'")}')">${inActivity?"Added":"Add"}</button>
    </div>`;
  }).join("");
};

/* Preserve any hands supplied by future CSV updates. */
const et2991OldNormalizeImportedRow=et298NormalizeImportedRow;
et298NormalizeImportedRow=function(obj){
  const row=et2991OldNormalizeImportedRow(obj);
  row.bat=String(obj.bat||obj.bats||obj.bat_hand||obj.bats_code||"").trim();
  row.thr=String(obj.thr||obj.throws||obj.throw_hand||obj.throws_code||"").trim();
  return row;
};
const et2991OldSamePlayer=et298SamePlayer;
et298SamePlayer=function(a,b){
  return et2991OldSamePlayer(a,b)&&String(a?.bat||"")===String(b?.bat||"")&&String(a?.thr||"")===String(b?.thr||"");
};
const et2991OldSyncAddedPlayers=et298SyncAddedPlayers;
et298SyncAddedPlayers=function(updatedByCode){
  et2991OldSyncAddedPlayers(updatedByCode);
  let changed=false;
  for(const p of state.players||[]){
    const row=updatedByCode.get(String(p.db_player_code||p.player_code||""));
    if(!row)continue;
    if(Object.prototype.hasOwnProperty.call(row,"bat")){p.bat=row.bat||"";changed=true;}
    if(Object.prototype.hasOwnProperty.call(row,"thr")){p.thr=row.thr||"";changed=true;}
  }
  if(changed)save();
};

/* Add all available database values when a player first enters Easy Tagg. */
const et2991OriginalAddDatabasePlayer=window.et297AddDatabasePlayer;
window.et297AddDatabasePlayer=function(code){
  const row=et297Db().find(x=>String(x.player_code)===String(code));
  const existed=et297ExistingByCode(code);
  et2991OriginalAddDatabasePlayer(code);
  const p=et297ExistingByCode(code);
  if(p&&row){
    p.db_locked=true;
    p.first_name=row.first_name||p.first_name||"";
    p.last_name=row.last_name||p.last_name||"";
    p.birth_date=row.birth_date||p.birth_date||"";
    p.country=row.country||p.country||"";
    p.date_eligible=row.eligible||row.date_eligible||p.date_eligible||"";
    p.position=row.position||p.position||"";
    p.bat=et2991Bat(row)||p.bat||"";
    p.thr=et2991Throw(row)||p.thr||"";
    save();render();et297SearchDatabase();
  }
};

function et2991IsDatabasePlayer(p){return !!(p&&(p.db_locked||p.db_player_code||p.player_code));}
function et2991SetLockedForm(locked){
  ["pname","role","bat","thr"].forEach(id=>{const el=$(id);if(el)el.disabled=!!locked;});
  const saveBtn=$("savePlayer");
  if(saveBtn)saveBtn.textContent=locked?"Save Number":"Save";
  const title=document.querySelector('#rosterScreen .card:nth-of-type(2) h2');
  if(title)title.textContent=locked?"Database Player · uniform number only":"Player";
}
const et2991OriginalEditPlayer=window.editPlayer;
window.editPlayer=function(id){
  const p=pl(id);
  if(!et2991IsDatabasePlayer(p)){et2991SetLockedForm(false);return et2991OriginalEditPlayer(id);}
  $("editId").value=p.id;
  $("num").value=p.num||"";
  $("pname").value=p.name||"";
  $("team").value=p.team||"";
  $("role").value=p.role||"Bateador";
  if($("playerSide"))$("playerSide").value=p.side||"away";
  $("bat").value=p.bat||"";
  $("thr").value=p.thr||"";
  if($("position"))$("position").value=p.position||"";
  et2991SetLockedForm(true);
  show("rosterScreen");
  setTimeout(()=>$("num")?.focus(),50);
};

const et2991OriginalSavePlayer=savePlayer;
savePlayer=function(){
  const id=$("editId")?.value||"";
  const p=id?pl(id):null;
  if(et2991IsDatabasePlayer(p)){
    p.num=String($("num")?.value||"").trim();
    save();render();
    $("editId").value="";$("num").value="";$("pname").value="";
    et2991SetLockedForm(false);
    return;
  }
  et2991SetLockedForm(false);
  return et2991OriginalSavePlayer();
};

/* Full roster card, same information and locked edit rule for DB players. */
function et2991RosterDetails(p){
  return `<div class="playerDetailsV299 playerDetailsFullV2991">
    ${p.db_player_code||p.player_code?`<span><b>ID:</b> ${xlsEsc(et2991Val(p.db_player_code||p.player_code))}</span>`:""}
    <span><b>Pos:</b> ${xlsEsc(et2991Val(p.position))}</span>
    <span><b>Country:</b> ${xlsEsc(et2991Val(p.country))}</span>
    <span><b>Nacimiento:</b> ${xlsEsc(et2991Birth(p.birth_date))}</span>
    <span><b>Elegible:</b> ${xlsEsc(et2991Val(p.date_eligible||p.eligible))}</span>
    <span><b>Batea:</b> ${xlsEsc(et2991Val(p.bat))}</span>
    <span><b>Lanza:</b> ${xlsEsc(et2991Val(p.thr))}</span>
    <span><b>Role:</b> ${xlsEsc(et2991Val(p.role))}</span>
    <span><b>Equipo:</b> ${(p.side||"away")==="home"?"Home":"Visitor"}</span>
  </div>`;
}
const et2991OriginalActivityRender=et252RenderPlayers;
et252RenderPlayers=function(){
  et2991OriginalActivityRender();
  const q=($("search")?.value||"").toLowerCase(), box=$("players");
  if(!box)return;
  const activePlayers=et252ActivityPlayers().filter(p=>!q||String(p.name||"").toLowerCase().includes(q));
  box.innerHTML=activePlayers.map(p=>{
    const db=et2991IsDatabasePlayer(p);
    return `<div class="playerCard ${db?"databasePlayerCardV2991":""}">
      <div class="playerRow">
        <div class="num">${p.num||"-"}</div>
        <div class="playerMainInfoV299"><b>${xlsEsc(p.name||"Sin nombre")}</b>${db?et2991RosterDetails(p):et299PlayerDetails(p)}<div class="activityScopeV252">Actividad actual</div></div>
        <div class="playerHandV299">${p.bat||"—"}${" / "}${p.thr||"—"}</div>
      </div>
      <div class="actions">
        <button type="button" onclick="editPlayer('${p.id}')">${db?"Number":"Edit"}</button>
        <button type="button" onclick="et252RemoveFromActivity('${p.id}')">Remove from Activity</button>
        <button type="button" class="danger" onclick="et252DeleteGlobalPlayer('${p.id}')>Delete</button>
      </div>
    </div>`;
  }).join("")||"<p>No players are assigned to this activity. Use Add Existing Player or create a new one.</p>";
};

window.addEventListener("load",()=>{
  const saveBtn=$("savePlayer");if(saveBtn)saveBtn.onclick=savePlayer;
});

/* ================= EASY TAGG v2.9.9.2 DATABASE CARD CLEAN + HARD LOCK =================
   - Removes Batea/Lanza from database search and roster cards.
   - Database players cannot open the normal player editor.
   - Only jersey number can be changed through a dedicated action.
   - Manual players retain the existing editor.
   ================================================================================ */
const ET2992_VERSION="2.9.9.2 Database Card Clean Hard Lock";

function et2992DbDetails(row){
  return `<div class="playerDbFullDetailsV2991">
    <span><b>ID:</b> ${xlsEsc(et2991Val(row.player_code))}</span>
    <span><b>Pos:</b> ${xlsEsc(et2991Val(row.position))}</span>
    <span><b>Country:</b> ${xlsEsc(et2991Val(row.country))}</span>
    <span><b>Nacimiento:</b> ${xlsEsc(et2991Birth(row.birth_date))}</span>
    <span><b>Elegible:</b> ${xlsEsc(et2991Val(row.eligible||row.date_eligible))}</span>
  </div>`;
}

et297SearchDatabase=function(){
  const input=$("playerDbSearchV297"), results=$("playerDbResultsV297"), status=$("playerDbStatusV297");
  if(!input||!results)return;
  const raw=String(input.value||"").trim(), q=et297Norm(raw);
  if(q.length<2){
    results.innerHTML='<p class="playerDbEmptyV297">Enter at least 2 letters or an ID.</p>';
    if(status)status.textContent=`${et297Db().length.toLocaleString()} players available`;
    return;
  }
  const found=[];
  for(const row of et297Db()){
    const id=String(row.player_code||"");
    const hay=et297Norm(`${row.name||""} ${row.first_name||""} ${row.last_name||""} ${id}`);
    if(hay.includes(q)){found.push(row);if(found.length>=30)break;}
  }
  if(status)status.textContent=found.length===30?"Showing the first 30 results":`${found.length} result${found.length===1?"":"s"}`;
  if(!found.length){results.innerHTML='<p class="playerDbEmptyV297">No players found.</p>';return;}
  results.innerHTML=found.map(row=>{
    const existing=et297ExistingByCode(row.player_code);
    const inActivity=existing?et297ActivityIds().includes(existing.id):false;
    return `<div class="playerDbRowV297 playerDbRowFullV2991">
      <div class="playerDbIdentityV297">
        <b>${xlsEsc(row.name||"Sin nombre")}</b>
        ${et2992DbDetails(row)}
      </div>
      <button type="button" ${inActivity?"disabled":""} onclick="et297AddDatabasePlayer('${String(row.player_code).replace(/'/g,"\\'")}')">${inActivity?"Added":"Add"}</button>
    </div>`;
  }).join("");
};

function et2992RosterDetails(p){
  return `<div class="playerDetailsV299 playerDetailsFullV2991">
    ${p.db_player_code||p.player_code?`<span><b>ID:</b> ${xlsEsc(et2991Val(p.db_player_code||p.player_code))}</span>`:""}
    <span><b>Pos:</b> ${xlsEsc(et2991Val(p.position))}</span>
    <span><b>Country:</b> ${xlsEsc(et2991Val(p.country))}</span>
    <span><b>Nacimiento:</b> ${xlsEsc(et2991Birth(p.birth_date))}</span>
    <span><b>Elegible:</b> ${xlsEsc(et2991Val(p.date_eligible||p.eligible))}</span>
    <span><b>Role:</b> ${xlsEsc(et2991Val(p.role))}</span>
    <span><b>Equipo:</b> ${(p.side||"away")==="home"?"Home":"Visitor"}</span>
  </div>`;
}

window.et2992EditDatabaseNumber=function(id){
  const p=pl(id);
  if(!et2991IsDatabasePlayer(p))return window.editPlayer(id);
  const current=String(p.num||"");
  const entered=window.prompt(`Número de ${p.name||"jugador"}`,current);
  if(entered===null)return;
  const value=String(entered).trim();
  if(value!==""&&!/^\d{1,3}$/.test(value))return alert("Enter a valid number of up to 3 digits.");
  p.num=value;
  save();
  render();
};

/* Hard interception: a database player never enters the regular editor. */
const et2992ManualEditPlayer=et2991OriginalEditPlayer;
window.editPlayer=function(id){
  const p=pl(id);
  if(et2991IsDatabasePlayer(p))return window.et2992EditDatabaseNumber(id);
  et2991SetLockedForm(false);
  return et2992ManualEditPlayer(id);
};
editPlayer=window.editPlayer;

et252RenderPlayers=function(){
  et2991OriginalActivityRender();
  const q=($("search")?.value||"").toLowerCase(), box=$("players");
  if(!box)return;
  const activePlayers=et252ActivityPlayers().filter(p=>!q||String(p.name||"").toLowerCase().includes(q));
  box.innerHTML=activePlayers.map(p=>{
    const db=et2991IsDatabasePlayer(p);
    return `<div class="playerCard ${db?"databasePlayerCardV2991":""}">
      <div class="playerRow ${db?"databasePlayerRowV2992":""}">
        <div class="num">${p.num||"-"}</div>
        <div class="playerMainInfoV299"><b>${xlsEsc(p.name||"Sin nombre")}</b>${db?et2992RosterDetails(p):et299PlayerDetails(p)}<div class="activityScopeV252">Actividad actual</div></div>
        ${db?"":`<div class="playerHandV299">${p.bat||""}${p.bat&&p.thr?" / ":""}${p.thr||""}</div>`}
      </div>
      <div class="actions">
        <button type="button" onclick="${db?`et2992EditDatabaseNumber('${p.id}')`:`editPlayer('${p.id}')`}">${db?"Edit Number":"Edit"}</button>
        <button type="button" onclick="et252RemoveFromActivity('${p.id}')">Remove from Activity</button>
        <button type="button" class="danger" onclick="et252DeleteGlobalPlayer('${p.id}')>Delete</button>
      </div>
    </div>`;
  }).join("")||"<p>No players are assigned to this activity. Use Add Existing Player or create a new one.</p>";
};

window.addEventListener("load",()=>{render();});

/* ================= EASY TAGG v2.9.9.3 DATABASE CARD FINAL LOCK =================
   Final routing fix:
   - The active roster renderer is the dual-lineup renderer (et27RenderPlayers), not et252RenderPlayers.
   - Database cards are rendered without a general Edit action.
   - Every legacy edit entry point is intercepted for database players.
   - Only jersey number can be changed.
   ============================================================================ */
const ET2993_VERSION="2.9.9.3 Database Card Final Lock";

function et2993EditNumberOnly(id){
  const p=pl(id);
  if(!p||!et2991IsDatabasePlayer(p))return;
  const entered=window.prompt(`Número de ${p.name||"jugador"}`,String(p.num||""));
  if(entered===null)return;
  const value=String(entered).trim();
  if(value!==""&&!/^\d{1,3}$/.test(value))return alert("Enter a valid number of up to 3 digits.");
  p.num=value;
  save();
  render();
}
window.et2993EditNumberOnly=et2993EditNumberOnly;
window.et2992EditDatabaseNumber=et2993EditNumberOnly;

/* Intercept every historical player-edit route still referenced by older renderers. */
const et2993ManualEdit = et2992ManualEditPlayer;
function et2993SafeEdit(id){
  const p=pl(id);
  if(et2991IsDatabasePlayer(p))return et2993EditNumberOnly(id);
  et2991SetLockedForm(false);
  return et2993ManualEdit(id);
}
window.editPlayer=et2993SafeEdit;
editPlayer=et2993SafeEdit;
window.et254EditPlayer=et2993SafeEdit;
window.et251EditPlayer=et2993SafeEdit;

function et2993RenderRosterCards(){
  const box=$("players");
  if(!box)return;
  const q=($("search")?.value||"").toLowerCase();
  const active=(typeof et253Players==="function"?et253Players():et252ActivityPlayers())
    .filter(p=>!q||String(p.name||"").toLowerCase().includes(q));

  box.innerHTML=active.map(p=>{
    const db=et2991IsDatabasePlayer(p);
    return `<div class="playerCard ${db?"databasePlayerCardV2991":""}">
      <div class="playerRow ${db?"databasePlayerRowV2992":""}">
        <div class="num">${p.num||"-"}</div>
        <div class="playerMainInfoV299">
          <b>${xlsEsc(p.name||"Sin nombre")}</b>
          ${db?et2992RosterDetails(p):et299PlayerDetails(p)}
          <div class="activityScopeV252">Actividad actual</div>
        </div>
        ${db?"":`<div class="playerHandV299">${p.bat||""}${p.bat&&p.thr?" / ":""}${p.thr||""}</div>`}
      </div>
      <div class="actions">
        ${db
          ? `<button type="button" onclick="et2993EditNumberOnly('${p.id}')">Editar número</button>`
          : `<button type="button" onclick="editPlayer('${p.id}')>Edit</button>`}
        <button type="button" onclick="et254RemoveFromActivity('${p.id}')">Remove from Activity</button>
        <button type="button" class="danger" onclick="et254DeletePlayer('${p.id}')>Delete</button>
      </div>
    </div>`;
  }).join("")||"<p>No players are assigned to this activity.</p>";
}

/* Preserve the approved dual-lineup and pitcher rendering, then replace only roster cards. */
function et2993RenderPlayers(){
  et27RenderPlayers();
  et2993RenderRosterCards();
}
renderPlayers=et2993RenderPlayers;

window.addEventListener("load",()=>{render();});

/* ================= EASY TAGG v2.9.9.4 UNIFIED ROSTER EDITOR =================
   - Manual-player Edit fills the existing top form and scrolls it into view.
   - The form title/button clearly switch between Add and Edit modes.
   - Team/Home/Visitor is not displayed as player information on roster cards.
   - Database players remain hard-locked; only jersey number can be edited.
   ========================================================================== */
const ET2994_VERSION="2.9.9.4 Unified Roster Editor";

function et2994RosterFormCard(){
  const input=$("pname");
  return input?input.closest(".card"):null;
}
function et2994SetFormMode(editing){
  const card=et2994RosterFormCard();
  const title=card?.querySelector("h2");
  const btn=$("savePlayer");
  if(title)title.textContent=editing?"Edit Player":"Player";
  if(btn)btn.textContent=editing?"Save Changes":"Save";
}
function et2994ResetFormMode(){
  et2994SetFormMode(false);
}

/* Remove team/side from both manual and database roster-card details. */
et299PlayerDetails=function(p){
  const rows=[];
  const code=String(p.db_player_code||p.player_code||"").trim();
  const birth=et299FormatPlayerDate(p.birth_date);
  const eligible=String(p.date_eligible||p.eligible||"").trim();
  if(code)rows.push(`<span><b>ID:</b> ${xlsEsc(code)}</span>`);
  if(p.position)rows.push(`<span><b>Pos:</b> ${xlsEsc(p.position)}</span>`);
  if(p.country)rows.push(`<span><b>Country:</b> ${xlsEsc(p.country)}</span>`);
  if(birth)rows.push(`<span><b>Nacimiento:</b> ${xlsEsc(birth)}</span>`);
  if(eligible)rows.push(`<span><b>Elegible:</b> ${xlsEsc(eligible)}</span>`);
  if(p.role)rows.push(`<span><b>Role:</b> ${xlsEsc(p.role)}</span>`);
  return rows.length?`<div class="playerDetailsV299">${rows.join("")}</div>`:"";
};

et2992RosterDetails=function(p){
  return `<div class="playerDetailsV299 playerDetailsFullV2991">
    ${p.db_player_code||p.player_code?`<span><b>ID:</b> ${xlsEsc(et2991Val(p.db_player_code||p.player_code))}</span>`:""}
    <span><b>Pos:</b> ${xlsEsc(et2991Val(p.position))}</span>
    <span><b>Country:</b> ${xlsEsc(et2991Val(p.country))}</span>
    <span><b>Nacimiento:</b> ${xlsEsc(et2991Birth(p.birth_date))}</span>
    <span><b>Elegible:</b> ${xlsEsc(et2991Val(p.date_eligible||p.eligible))}</span>
    <span><b>Role:</b> ${xlsEsc(et2991Val(p.role))}</span>
  </div>`;
};

/* Keep the hard lock for database players; route only manual players to top form. */
const et2994ManualBaseEdit=et2993ManualEdit;
function et2994EditPlayer(id){
  const p=pl(id);
  if(!p)return;
  if(et2991IsDatabasePlayer(p))return et2993EditNumberOnly(id);

  et2991SetLockedForm(false);
  et2994ManualBaseEdit(id);
  et2994SetFormMode(true);

  const card=et2994RosterFormCard();
  setTimeout(()=>{
    if(card)card.scrollIntoView({behavior:"smooth",block:"start"});
    setTimeout(()=>$("num")?.focus(),250);
  },30);
}
window.editPlayer=et2994EditPlayer;
editPlayer=et2994EditPlayer;
window.et254EditPlayer=et2994EditPlayer;
window.et251EditPlayer=et2994EditPlayer;

/* After save, return the form to Add mode without changing roster behavior. */
const et2994SavePlayerBase=savePlayer;
savePlayer=function(){
  const result=et2994SavePlayerBase();
  if(!$("editId")?.value)et2994ResetFormMode();
  return result;
};

window.addEventListener("load",()=>{
  const saveBtn=$("savePlayer");
  if(saveBtn)saveBtn.onclick=savePlayer;
  et2994ResetFormMode();
  render();
});

/* ================= EASY TAGG v2.9.9.5 DATABASE NUMBER + BAT SIDE =================
   - Database players can edit only jersey number and batting side.
   - Batting side uses clean CSV codes: R, L or S.
   - Replaces the native prompt with an internal Easy Tagg modal.
   - Keeps all database identity fields locked.
   ============================================================================== */
const ET2995_VERSION="2.9.9.5 Database Number Bat Side";

function et2995NormalizeBat(value){
  const v=String(value||"").trim().toUpperCase();
  if(v==="R"||v==="RHH"||v==="RIGHT")return "R";
  if(v==="L"||v==="LHH"||v==="LEFT")return "L";
  if(v==="S"||v==="SHH"||v==="SWITCH")return "S";
  return "";
}

function et2995EnsureModal(){
  if($("dbPlayerQuickEditV2995"))return;
  const wrap=document.createElement("div");
  wrap.id="dbPlayerQuickEditV2995";
  wrap.className="dbPlayerQuickEditOverlayV2995 hidden";
  wrap.innerHTML=`<div class="dbPlayerQuickEditCardV2995" role="dialog" aria-modal="true" aria-labelledby="dbPlayerQuickEditTitleV2995">
    <div class="dbPlayerQuickEditHeadV2995">
      <div><small>Database Player</small><h2 id="dbPlayerQuickEditTitleV2995">Edit Player</h2></div>
      <button type="button" id="dbPlayerQuickEditCloseV2995" aria-label="Close">×</button>
    </div>
    <input id="dbPlayerQuickEditIdV2995" type="hidden">
    <label class="dbPlayerQuickEditLabelV2995" for="dbPlayerQuickEditNumV2995">Número</label>
    <input id="dbPlayerQuickEditNumV2995" class="dbPlayerQuickEditNumV2995" inputmode="numeric" maxlength="3" placeholder="Ej. 24">
    <div class="dbPlayerQuickEditLabelV2995">Mano que batea</div>
    <div class="dbPlayerBatChoicesV2995">
      <button type="button" data-db-bat="R"><b>R</b><span>RHH · Derecho</span></button>
      <button type="button" data-db-bat="L"><b>L</b><span>LHH · Zurdo</span></button>
      <button type="button" data-db-bat="S"><b>S</b><span>SHH · Switch</span></button>
    </div>
    <p class="dbPlayerQuickEditHintV2995">El CSV guardará la mano como R, L o S para que Easy Tagg Sync seleccione correctamente HITSIDE.</p>
    <div class="dbPlayerQuickEditActionsV2995">
      <button type="button" id="dbPlayerQuickEditCancelV2995">Cancel</button>
      <button type="button" id="dbPlayerQuickEditSaveV2995">Save</button>
    </div>
  </div>`;
  document.body.appendChild(wrap);
  const close=()=>wrap.classList.add("hidden");
  $("dbPlayerQuickEditCloseV2995").onclick=close;
  $("dbPlayerQuickEditCancelV2995").onclick=close;
  wrap.addEventListener("click",e=>{if(e.target===wrap)close();});
  wrap.querySelectorAll("[data-db-bat]").forEach(btn=>btn.onclick=()=>{
    wrap.dataset.bat=btn.dataset.dbBat;
    wrap.querySelectorAll("[data-db-bat]").forEach(x=>x.classList.toggle("selected",x===btn));
  });
  $("dbPlayerQuickEditSaveV2995").onclick=()=>{
    const p=pl($("dbPlayerQuickEditIdV2995").value);
    if(!p||!et2991IsDatabasePlayer(p))return close();
    const num=String($("dbPlayerQuickEditNumV2995").value||"").trim();
    const bat=et2995NormalizeBat(wrap.dataset.bat||"");
    if(num!==""&&!/^\d{1,3}$/.test(num))return alert("Enter a valid number of up to 3 digits.");
    if(!bat)return etAppAlert("Select L, R, or S for the batter's batting side.","BATTER HAND REQUIRED");
    p.num=num;
    p.bat=bat;
    save();
    close();
    render();
  };
}

function et2995OpenDatabaseEdit(id){
  const p=pl(id);
  if(!p||!et2991IsDatabasePlayer(p))return window.editPlayer(id);
  et2995EnsureModal();
  const modal=$("dbPlayerQuickEditV2995");
  const bat=et2995NormalizeBat(p.bat)||"R";
  $("dbPlayerQuickEditIdV2995").value=p.id;
  $("dbPlayerQuickEditTitleV2995").textContent=p.name||"Edit Player";
  $("dbPlayerQuickEditNumV2995").value=p.num||"";
  modal.dataset.bat=bat;
  modal.querySelectorAll("[data-db-bat]").forEach(x=>x.classList.toggle("selected",x.dataset.dbBat===bat));
  modal.classList.remove("hidden");
  setTimeout(()=>$('dbPlayerQuickEditNumV2995')?.focus(),60);
}
window.et2995OpenDatabaseEdit=et2995OpenDatabaseEdit;
window.et2993EditNumberOnly=et2995OpenDatabaseEdit;
window.et2992EditDatabaseNumber=et2995OpenDatabaseEdit;

/* Database roster cards now show the editable batting side. */
et2992RosterDetails=function(p){
  return `<div class="playerDetailsV299 playerDetailsFullV2991">
    ${p.db_player_code||p.player_code?`<span><b>ID:</b> ${xlsEsc(et2991Val(p.db_player_code||p.player_code))}</span>`:""}
    <span><b>Pos:</b> ${xlsEsc(et2991Val(p.position))}</span>
    <span><b>Country:</b> ${xlsEsc(et2991Val(p.country))}</span>
    <span><b>Nacimiento:</b> ${xlsEsc(et2991Birth(p.birth_date))}</span>
    <span><b>Elegible:</b> ${xlsEsc(et2991Val(p.date_eligible||p.eligible))}</span>
    <span><b>Role:</b> ${xlsEsc(et2991Val(p.role))}</span>
    <span><b>Batea:</b> ${xlsEsc(et2995NormalizeBat(p.bat)||"—")}</span>
  </div>`;
};

/* Re-route every database edit entry point to the internal modal. */
const et2995ManualEdit=et2994ManualBaseEdit;
function et2995SafeEdit(id){
  const p=pl(id);
  if(et2991IsDatabasePlayer(p))return et2995OpenDatabaseEdit(id);
  et2991SetLockedForm(false);
  et2995ManualEdit(id);
  et2994SetFormMode(true);
  const card=et2994RosterFormCard();
  setTimeout(()=>{if(card)card.scrollIntoView({behavior:"smooth",block:"start"});},30);
}
window.editPlayer=et2995SafeEdit;
editPlayer=et2995SafeEdit;
window.et254EditPlayer=et2995SafeEdit;
window.et251EditPlayer=et2995SafeEdit;

/* Replace only database button wording after each roster render. */
const et2995RosterCardsBase=et2993RenderRosterCards;
et2993RenderRosterCards=function(){
  et2995RosterCardsBase();
  document.querySelectorAll(".databasePlayerCardV2991 .actions button:first-child").forEach(btn=>{
    btn.textContent="Number & Hand";
  });
};
renderPlayers=function(){et27RenderPlayers();et2993RenderRosterCards();};

window.addEventListener("load",()=>{
  et2995EnsureModal();
  /* Normalize existing database-player values without changing manual players. */
  let changed=false;
  (state.players||[]).forEach(p=>{
    if(et2991IsDatabasePlayer(p)){
      const clean=et2995NormalizeBat(p.bat);
      if(clean&&p.bat!==clean){p.bat=clean;changed=true;}
    }
  });
  if(changed)save();
  render();
});


/* ================= EASY TAGG v2.9.9.6 MANUAL ROLE HAND CONTROLS =================
   - Manual batters use only R, L or S.
   - Manual pitchers keep RHP or LHP.
   - The form displays only the hand field required by the selected role.
   - Database cards use the simple button label "Editar".
   - Database quick edit shows only R, L and S without RHH/LHH/SHH wording.
   ============================================================================== */
const ET2996_VERSION="2.9.9.6 Manual Role Hand Controls";

function et2996NormalizeManualHands(){
  const bat=$("bat"),thr=$("thr");
  if(bat){
    const current=et2995NormalizeBat(bat.value);
    bat.innerHTML='<option value="">Batea</option><option value="R">R</option><option value="L">L</option><option value="S">S</option>';
    bat.value=current;
  }
  if(thr){
    const v=String(thr.value||"").toUpperCase();
    thr.innerHTML='<option value="">Mano que lanza</option><option value="RHP">RHP</option><option value="LHP">LHP</option>';
    thr.value=(v==="RHP"||v==="LHP")?v:"";
  }
}

function et2996UpdateRoleFields(){
  const role=$("role")?.value||"Bateador",bat=$("bat"),thr=$("thr");
  if(!bat||!thr)return;
  if(role==="Bateador"){
    bat.style.display="";
    thr.style.display="none";
    thr.value="";
  }else if(role==="Pitcher"){
    bat.style.display="none";
    thr.style.display="";
    bat.value="";
  }else{
    bat.style.display="";
    thr.style.display="";
  }
}

/* Normalize old manual RHH/LHH/SHH records to clean R/L/S values. */
function et2996NormalizeStoredManualPlayers(){
  let changed=false;
  (state.players||[]).forEach(p=>{
    if(!et2991IsDatabasePlayer(p)){
      const clean=et2995NormalizeBat(p.bat);
      if(clean&&p.bat!==clean){p.bat=clean;changed=true;}
    }
  });
  if(changed)save();
}

/* Preserve existing editor behavior, then refresh role-specific controls. */
const et2996EditBase=window.editPlayer;
function et2996EditPlayer(id){
  const out=et2996EditBase(id);
  setTimeout(()=>{et2996NormalizeManualHands();et2996UpdateRoleFields();},0);
  return out;
}
window.editPlayer=et2996EditPlayer;
editPlayer=et2996EditPlayer;
window.et254EditPlayer=et2996EditPlayer;
window.et251EditPlayer=et2996EditPlayer;

/* Save clean values and require only the field that belongs to the selected role. */
const et2996SaveBase=savePlayer;
savePlayer=function(){
  const role=$("role")?.value||"Bateador";
  if(role==="Bateador"){
    const bat=et2995NormalizeBat($("bat")?.value);
    if(!bat)return etAppAlert("Select L, R, or S for the batter's batting side.","BATTER HAND REQUIRED");
    $("bat").value=bat;
    if($("thr"))$("thr").value="";
  }else if(role==="Pitcher"){
    const thr=String($("thr")?.value||"").toUpperCase();
    if(thr!=="RHP"&&thr!=="LHP")return etAppAlert("Select RHP or LHP for the pitcher's throwing hand.","PITCHER HAND REQUIRED");
    if($("bat"))$("bat").value="";
  }else{
    const bat=et2995NormalizeBat($("bat")?.value);
    const thr=String($("thr")?.value||"").toUpperCase();
    if(!bat)return etAppAlert("Select L, R, or S for the batter's batting side.","BATTER HAND REQUIRED");
    if(thr!=="RHP"&&thr!=="LHP")return etAppAlert("Select RHP or LHP for the pitcher's throwing hand.","PITCHER HAND REQUIRED");
    $("bat").value=bat;
  }
  const out=et2996SaveBase();
  et2996NormalizeManualHands();
  et2996UpdateRoleFields();
  return out;
};

/* Simplify the database-player quick editor. */
function et2996SimplifyDatabaseModal(){
  et2995EnsureModal();
  const modal=$("dbPlayerQuickEditV2995");
  if(!modal)return;
  modal.querySelectorAll("[data-db-bat]").forEach(btn=>{
    const value=btn.dataset.dbBat;
    btn.innerHTML=`<b>${value}</b>`;
    btn.setAttribute("aria-label",value);
  });
  const hint=modal.querySelector(".dbPlayerQuickEditHintV2995");
  if(hint)hint.textContent="Select L, R, or S. This value will be saved to the CSV.";
}

/* Database roster button wording must remain simply Editar. */
const et2996RosterRenderBase=et2993RenderRosterCards;
et2993RenderRosterCards=function(){
  et2996RosterRenderBase();
  document.querySelectorAll(".databasePlayerCardV2991 .actions button:first-child").forEach(btn=>btn.textContent="Edit");
};
renderPlayers=function(){et27RenderPlayers();et2993RenderRosterCards();};

window.addEventListener("load",()=>{
  et2996NormalizeStoredManualPlayers();
  et2996NormalizeManualHands();
  et2996UpdateRoleFields();
  et2996SimplifyDatabaseModal();
  const role=$("role");
  if(role)role.addEventListener("change",et2996UpdateRoleFields);
  const saveBtn=$("savePlayer");
  if(saveBtn)saveBtn.onclick=savePlayer;
  render();
});

/* ================= EASY TAGG v2.9.9.7 DATABASE PITCHER HAND EDIT =================
   - Identifies database pitchers from their role/position.
   - Database pitchers edit jersey number and throwing hand: RHP or LHP.
   - Other database players keep jersey number and batting side: L, R or S.
   - CSV continues using pitcher_hand and batter_hand correctly.
   ============================================================================== */
const ET2997_VERSION="2.9.9.7 Database Pitcher Hand Edit";

function et2997IsDatabasePitcher(p){
  if(!p||!et2991IsDatabasePlayer(p))return false;
  const role=String(p.role||"").trim().toUpperCase();
  const pos=String(p.position||p.position_code||"").trim().toUpperCase();
  return role==="PITCHER"||role==="P"||role==="LANZADOR"||pos==="P"||pos==="RHP"||pos==="LHP"||pos==="PITCHER";
}

function et2997NormalizeThrow(value){
  const v=String(value||"").trim().toUpperCase();
  if(v==="R"||v==="RHP"||v==="RIGHT")return "RHP";
  if(v==="L"||v==="LHP"||v==="LEFT")return "LHP";
  return "";
}

function et2997ConfigureDatabaseModal(p){
  et2996SimplifyDatabaseModal();
  const modal=$("dbPlayerQuickEditV2995");
  if(!modal)return;
  const pitcher=et2997IsDatabasePitcher(p);
  const label=modal.querySelector(".dbPlayerQuickEditLabelV2995:not([for])");
  const choices=modal.querySelector(".dbPlayerBatChoicesV2995");
  const hint=modal.querySelector(".dbPlayerQuickEditHintV2995");
  if(label)label.textContent=pitcher?"Mano que lanza":"Mano que batea";
  if(choices){
    choices.style.gridTemplateColumns=pitcher?"repeat(2,1fr)":"repeat(3,1fr)";
    choices.innerHTML=pitcher
      ? '<button type="button" data-db-hand="RHP"><b>RHP</b></button><button type="button" data-db-hand="LHP"><b>LHP</b></button>'
      : '<button type="button" data-db-hand="L"><b>L</b></button><button type="button" data-db-hand="R"><b>R</b></button><button type="button" data-db-hand="S"><b>S</b></button>';
    choices.querySelectorAll("[data-db-hand]").forEach(btn=>btn.onclick=()=>{
      modal.dataset.hand=btn.dataset.dbHand;
      choices.querySelectorAll("[data-db-hand]").forEach(x=>x.classList.toggle("selected",x===btn));
    });
  }
  if(hint)hint.textContent=pitcher
    ? "Select RHP or LHP. This value will be saved as the pitcher's throwing hand in the CSV."
    : "Select L, R, or S. This value will be saved as the batter's batting side in the CSV.";
  modal.dataset.playerType=pitcher?"pitcher":"batter";
}

function et2997OpenDatabaseEdit(id){
  const p=pl(id);
  if(!p||!et2991IsDatabasePlayer(p))return et2996EditBase(id);
  et2995EnsureModal();
  et2997ConfigureDatabaseModal(p);
  const modal=$("dbPlayerQuickEditV2995");
  const pitcher=et2997IsDatabasePitcher(p);
  const hand=pitcher?(et2997NormalizeThrow(p.thr)||"RHP"):(et2995NormalizeBat(p.bat)||"R");
  $("dbPlayerQuickEditIdV2995").value=p.id;
  $("dbPlayerQuickEditTitleV2995").textContent=p.name||"Edit Player";
  $("dbPlayerQuickEditNumV2995").value=p.num||"";
  modal.dataset.hand=hand;
  modal.querySelectorAll("[data-db-hand]").forEach(x=>x.classList.toggle("selected",x.dataset.dbHand===hand));
  modal.classList.remove("hidden");
  setTimeout(()=>$('dbPlayerQuickEditNumV2995')?.focus(),60);
}

/* Replace the quick-edit save logic with role-aware database handling. */
function et2997InstallSaveHandler(){
  et2995EnsureModal();
  const saveBtn=$("dbPlayerQuickEditSaveV2995");
  if(!saveBtn)return;
  saveBtn.onclick=()=>{
    const modal=$("dbPlayerQuickEditV2995");
    const p=pl($("dbPlayerQuickEditIdV2995").value);
    if(!p||!et2991IsDatabasePlayer(p)){modal?.classList.add("hidden");return;}
    const num=String($("dbPlayerQuickEditNumV2995").value||"").trim();
    if(num!==""&&!/^\d{1,3}$/.test(num))return alert("Enter a valid number of up to 3 digits.");
    p.num=num;
    if(et2997IsDatabasePitcher(p)){
      const thr=et2997NormalizeThrow(modal.dataset.hand||"");
      if(!thr)return etAppAlert("Select RHP or LHP for the pitcher's throwing hand.","PITCHER HAND REQUIRED");
      p.thr=thr;
    }else{
      const bat=et2995NormalizeBat(modal.dataset.hand||"");
      if(!bat)return etAppAlert("Select L, R, or S for the batter's batting side.","BATTER HAND REQUIRED");
      p.bat=bat;
    }
    save();
    modal.classList.add("hidden");
    render();
  };
}

function et2997EditPlayer(id){
  const p=pl(id);
  if(et2991IsDatabasePlayer(p))return et2997OpenDatabaseEdit(id);
  return et2996EditPlayer(id);
}
window.editPlayer=et2997EditPlayer;
editPlayer=et2997EditPlayer;
window.et254EditPlayer=et2997EditPlayer;
window.et251EditPlayer=et2997EditPlayer;
window.et2995OpenDatabaseEdit=et2997OpenDatabaseEdit;
window.et2993EditNumberOnly=et2997OpenDatabaseEdit;
window.et2992EditDatabaseNumber=et2997OpenDatabaseEdit;

/* Show the correct hand on database roster cards. */
et2992RosterDetails=function(p){
  const handLabel=et2997IsDatabasePitcher(p)?"Lanza":"Batea";
  const handValue=et2997IsDatabasePitcher(p)?(et2997NormalizeThrow(p.thr)||"—"):(et2995NormalizeBat(p.bat)||"—");
  return `<div class="playerDetailsV299 playerDetailsFullV2991">
    ${p.db_player_code||p.player_code?`<span><b>ID:</b> ${xlsEsc(et2991Val(p.db_player_code||p.player_code))}</span>`:""}
    <span><b>Pos:</b> ${xlsEsc(et2991Val(p.position||p.position_code))}</span>
    <span><b>Country:</b> ${xlsEsc(et2991Val(p.country))}</span>
    <span><b>Nacimiento:</b> ${xlsEsc(et2991Birth(p.birth_date))}</span>
    <span><b>Elegible:</b> ${xlsEsc(et2991Val(p.date_eligible||p.eligible))}</span>
    <span><b>Role:</b> ${xlsEsc(et2991Val(p.role))}</span>
    <span><b>${handLabel}:</b> ${xlsEsc(handValue)}</span>
  </div>`;
};

window.addEventListener("load",()=>{
  et2997InstallSaveHandler();
  render();
});


/* ================= EASY TAGG v2.9.9.8 COMPACT TAG + GAME FLOW =================
   - Removes Pop Up / Pop Out from trajectory and history edit options.
   - Three trajectory buttons use the same compact layout as Hard/Medium/Soft.
   - Game types are exactly: live bp, game, tricky.
   - Date, inning and history player choices use Easy Tagg internal sheets.
   - Team buttons represent Top and Bottom of the inning.
   - Each offense side remembers its selected pitcher.
   - Lineup is scrollable and no longer uses reorder arrows.
   ============================================================================ */
const ET2998_VERSION="2.9.9.8 Compact Tag Game Flow";

function et2998PitcherKey(side){return `etd_pitcher_by_side_v2998_${state.activeGameId||"no_game"}_${side||"away"}`;}
function et2998StorePitcher(side=state.battingSide){
  if(state.pitcher)localStorage.setItem(et2998PitcherKey(side),state.pitcher);
}
function et2998RestorePitcher(side){
  const id=localStorage.getItem(et2998PitcherKey(side))||"";
  state.pitcher=(id&&pl(id))?id:"";
}

function et2998SetSide(side){
  const old=state.battingSide||"away";
  et2998StorePitcher(old);
  state.battingSide=side;
  if($("battingSide"))$("battingSide").value=side;
  if($("half"))$("half").value=side==="away"?"Alta":"Baja";
  const next=typeof et27CurrentBatterId==="function"?et27CurrentBatterId(side):(bats(side)[0]?.id||"");
  state.batter=next||"";
  et2998RestorePitcher(side);
  save();render();
}

function et2998RenderTeamButtons(){
  const away=$("offenseAwayBtnV27"),home=$("offenseHomeBtnV27");
  if(away){away.textContent=`TOP · ${typeof et27TeamName==="function"?et27TeamName("away"):"VISITOR"}`;away.onclick=()=>et2998SetSide("away");away.classList.toggle("active",state.battingSide==="away");}
  if(home){home.textContent=`BAJA · ${typeof et27TeamName==="function"?et27TeamName("home"):"HOME"}`;home.onclick=()=>et2998SetSide("home");home.classList.toggle("active",state.battingSide==="home");}
  const da=$("dualLineupAwayBtnV27"),dh=$("dualLineupHomeBtnV27");
  if(da)da.onclick=()=>et2998SetSide("away");
  if(dh)dh.onclick=()=>et2998SetSide("home");
}

function et2998InstallPitcherSelection(){
  window.selPitcher=id=>{state.pitcher=id;localStorage.setItem(et2998PitcherKey(state.battingSide),id);save();closeSheets();render();};
}

function et2998RenderInningPicker(){
  const grid=$("inningGridV2998");if(!grid)return;
  grid.innerHTML=Array.from({length:12},(_,i)=>`<button type="button" data-inning-v2998="${i+1}" class="${String($("inning")?.value||1)===String(i+1)?"selected":""}">${i+1}</button>`).join("");
  grid.querySelectorAll("[data-inning-v2998]").forEach(b=>b.onclick=()=>{$("inning").value=b.dataset.inningV2998;closeSheets();render();});
}
function et2998InstallInningPicker(){
  const box=document.querySelector(".inn");if(!box||$("inningButtonV2998"))return;
  const btn=document.createElement("button");btn.id="inningButtonV2998";btn.type="button";btn.className="inningButtonV2998";btn.onclick=()=>{et2998RenderInningPicker();openSheet("inningSheetV2998");};
  box.appendChild(btn);if($("inning"))$("inning").style.display="none";
}

function et2998PrepareDate(){
  const day=$("dateDayV2998"),month=$("dateMonthV2998"),year=$("dateYearV2998");if(!day||day.options.length)return;
  day.innerHTML=Array.from({length:31},(_,i)=>`<option value="${String(i+1).padStart(2,"0")}">${i+1}</option>`).join("");
  month.innerHTML=Array.from({length:12},(_,i)=>`<option value="${String(i+1).padStart(2,"0")}">${i+1}</option>`).join("");
  const y=new Date().getFullYear();year.innerHTML=Array.from({length:11},(_,i)=>`<option>${y-5+i}</option>`).join("");
}
function et2998OpenDate(){
  et2998PrepareDate();const raw=$("gdate").value||new Date().toISOString().slice(0,10),[y,m,d]=raw.split("-");
  $("dateDayV2998").value=d;$("dateMonthV2998").value=m;$("dateYearV2998").value=y;openSheet("dateSheetV2998");
}
function et2998SaveDate(){
  const val=`${$("dateYearV2998").value}-${$("dateMonthV2998").value}-${$("dateDayV2998").value}`;
  $("gdate").value=val;$("gdateButtonV2998").textContent=val.split("-").reverse().join("/");closeSheets();
}

let et2998HistoryField="";
function et2998OpenHistoryPlayers(type){
  et2998HistoryField=type;const isB=type==="batter";
  $("historyPlayerTitleV2998").textContent=isB?"Select Batter":"Select Pitcher";
  const list=(state.players||[]).filter(p=>isB?(p.role==="Bateador"||p.role==="Ambos"):(p.role==="Pitcher"||p.role==="Ambos"));
  $("historyPlayerListV2998").innerHTML=list.map((p,i)=>`<button type="button" class="listBtn" data-history-player-v2998="${p.id}"><span class="lineupOrderCleanV255">${p.num||i+1}</span><span>${p.name}</span><small>${isB?(p.bat||""):(p.thr||"")}</small></button>`).join("")||"<p>No players available.</p>";
  $("historyPlayerListV2998").querySelectorAll("[data-history-player-v2998]").forEach(b=>b.onclick=()=>{
    const sel=$(isB?"editBatter":"editPitcher");sel.value=b.dataset.historyPlayerV2998;
    $(isB?"editBatterButtonV2998":"editPitcherButtonV2998").textContent=pn(b.dataset.historyPlayerV2998);closeSheets();
  });openSheet("historyPlayerSheetV2998");
}
function et2998InstallHistoryPickers(){
  [["editBatter","editBatterButtonV2998","Batter","batter"],["editPitcher","editPitcherButtonV2998","Pitcher","pitcher"]].forEach(([sid,bid,label,type])=>{
    const sel=$(sid);if(!sel||$(bid))return;sel.style.display="none";const btn=document.createElement("button");btn.type="button";btn.id=bid;btn.className="fieldButtonV2998";btn.textContent=`Select ${label}`;btn.onclick=()=>et2998OpenHistoryPlayers(type);sel.parentNode.insertBefore(btn,sel.nextSibling);
  });
}

function et2998CompactLineup(){
  const list=$("batterList");if(list)list.classList.add("scrollLineupV2998");
  document.querySelectorAll("#batterList .lineupActionsCleanV241 button").forEach(b=>{if(b.textContent.trim()==="↑"||b.textContent.trim()==="↓")b.remove();});
  document.querySelectorAll("#batterList .lineupOrderCleanV241,#batterList .lineupOrderCleanV255").forEach((el,i)=>el.textContent=String(i+1));
}
function et2998CleanOptions(){
  document.querySelectorAll('#editResult option').forEach(o=>{if(/pop out/i.test(o.textContent))o.remove();});
  document.querySelectorAll('#editTrajectory option').forEach(o=>{if(/pop up/i.test(o.textContent))o.remove();});
  const gt=$("gameType");if(gt){const current=gt.value;gt.innerHTML='<option value="game">game</option><option value="tricky">tricky</option><option value="live_bp">live_bp</option>';gt.value=["game","tricky","live_bp"].includes(current)?current:"game";}
  document.querySelectorAll('[data-traj="Pop Up"]').forEach(x=>x.remove());
}
function et2998PostRender(){
  et2998CleanOptions();et2998RenderTeamButtons();et2998CompactLineup();
  if($("inningButtonV2998"))$("inningButtonV2998").textContent=$("inning")?.value||"1";
  if($("half"))$("half").value=state.battingSide==="home"?"Baja":"Alta";
}

const et2998RenderBase=render;
render=function(){et2998RenderBase();et2998PostRender();};

window.addEventListener("load",()=>{
  et2998CleanOptions();et2998InstallPitcherSelection();et2998InstallInningPicker();et2998InstallHistoryPickers();et2998PrepareDate();
  if($("gdateButtonV2998"))$("gdateButtonV2998").onclick=et2998OpenDate;
  if($("saveDateV2998"))$("saveDateV2998").onclick=et2998SaveDate;
  if(!$("gdate").value){$("gdate").value=new Date().toISOString().slice(0,10);et2998SaveDate();}
  et2998RestorePitcher(state.battingSide||"away");render();
});


/* ================= EASY TAGG v2.9.9.9 INTERNAL EDIT + DRAG LINEUP =================
   - Game date returns to automatic/native date behavior.
   - Result, batted-ball type and contact edit controls use internal Easy Tagg sheets.
   - Save Changes is highlighted.
   - Every tap gives a soft beep in sound mode, or vibration in silent/vibrate mode.
   - Lineup players can be dragged into any batting-order position.
   - Team BAT buttons hide Alta/Baja wording while retaining inning-half logic.
   ============================================================================== */
const ET2999_VERSION="2.9.9.9 Internal Edit + Drag Lineup";

function et2999LocalDate(){
  const d=new Date(),p=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}

function et2999AutoDate(){
  const input=$("gdate");
  if(input && !input.value) input.value=et2999LocalDate();
  const old=$("gdateButtonV2998");if(old)old.remove();
  const sheet=$("dateSheetV2998");if(sheet)sheet.remove();
}

const et2999ValueConfig={
  editResult:{title:"Result",values:["Ball","Strike","Swing & Miss","Check Swing","Foul","Single","Double","Triple","HR","BB","HBP","K Swinging","K Looking","Out","Ground Out","Fly Out","Line Out"]},
  editTrajectory:{title:"Batted-Ball / Out Type",values:["","Ground Ball","Line Drive","Fly Ball"],labels:["Not Applicable","Ground Ball","Line Drive","Fly Ball"]},
  editQuality:{title:"Contact",values:["","Hard","Medium","Soft"],labels:["Not Applicable","Hard","Medium","Soft"]}
};
function et2999OpenValuePicker(id){
  const cfg=et2999ValueConfig[id],sel=$(id),grid=$("historyValueGridV2999");if(!cfg||!sel||!grid)return;
  $("historyValueTitleV2999").textContent=cfg.title;
  grid.innerHTML=cfg.values.map((v,i)=>`<button type="button" class="${sel.value===v?"selected":""}" data-edit-value-v2999="${encodeURIComponent(v)}">${cfg.labels?.[i]||v}</button>`).join("");
  grid.querySelectorAll("[data-edit-value-v2999]").forEach(b=>b.onclick=()=>{
    sel.value=decodeURIComponent(b.dataset.editValueV2999);
    const btn=$(id+"ButtonV2999");if(btn)btn.textContent=b.textContent;
    closeSheets();
  });
  openSheet("historyValueSheetV2999");
}
function et2999InstallHistoryValuePickers(){
  Object.keys(et2999ValueConfig).forEach(id=>{
    const sel=$(id);if(!sel||$(id+"ButtonV2999"))return;
    sel.style.display="none";
    const btn=document.createElement("button");btn.type="button";btn.id=id+"ButtonV2999";btn.className="fieldButtonV2998";
    btn.textContent=sel.options[sel.selectedIndex]?.textContent||et2999ValueConfig[id].title;
    btn.onclick=()=>et2999OpenValuePicker(id);sel.parentNode.insertBefore(btn,sel.nextSibling);
  });
}
const et2999OpenEditBase=window.openEditTag||openEditTag;
openEditTag=function(id){
  et2999OpenEditBase(id);
  setTimeout(()=>Object.keys(et2999ValueConfig).forEach(fid=>{
    const sel=$(fid),btn=$(fid+"ButtonV2999");if(sel&&btn)btn.textContent=sel.options[sel.selectedIndex]?.textContent||et2999ValueConfig[fid].title;
  }),0);
};
window.openEditTag=openEditTag;

function et2999TeamButtons(){
  const away=$("offenseAwayBtnV27"),home=$("offenseHomeBtnV27");
  if(away)away.textContent=typeof et27TeamName==="function"?et27TeamName("away"):"VISITOR";
  if(home)home.textContent=typeof et27TeamName==="function"?et27TeamName("home"):"HOME";
}

let et2999Drag=null;
function et2999LineupId(card){
  const clickable=card.querySelector('[onclick*="selBatter"]');
  const m=clickable?.getAttribute("onclick")?.match(/selBatter\(['\"]([^'\"]+)/);return m?.[1]||"";
}
function et2999SaveVisibleOrder(){
  const ids=[...document.querySelectorAll("#batterList .lineupPlayerCleanV241,#batterList .lineupPlayerCleanV255")].map(et2999LineupId).filter(Boolean);
  if(ids.length && typeof v241SetLineup==="function")v241SetLineup(state.battingSide||"away",ids);
  save();
}
function et2999InstallDragLineup(){
  const list=$("batterList");if(!list)return;
  const cards=[...list.querySelectorAll(".lineupPlayerCleanV241,.lineupPlayerCleanV255")];
  cards.forEach(card=>{
    if(card.dataset.drag2999)return;card.dataset.drag2999="1";
    card.addEventListener("pointerdown",e=>{
      if(e.target.closest("button")||e.target.closest(".lineupActionsCleanV241"))return;
      et2999Drag={card,startY:e.clientY,moved:false};card.setPointerCapture?.(e.pointerId);
      setTimeout(()=>{if(et2999Drag?.card===card)card.classList.add("lineupDragV2999")},120);
    });
    card.addEventListener("pointermove",e=>{
      if(!et2999Drag||et2999Drag.card!==card)return;
      if(Math.abs(e.clientY-et2999Drag.startY)<8)return;et2999Drag.moved=true;e.preventDefault();
      const target=document.elementFromPoint(e.clientX,e.clientY)?.closest(".lineupPlayerCleanV241,.lineupPlayerCleanV255");
      if(target&&target!==card&&target.parentNode===list){
        const r=target.getBoundingClientRect();list.insertBefore(card,e.clientY<r.top+r.height/2?target:target.nextSibling);
        [...list.querySelectorAll(".lineupOrderCleanV241,.lineupOrderCleanV255")].forEach((n,i)=>n.textContent=i+1);
      }
    });
    const finish=()=>{if(!et2999Drag||et2999Drag.card!==card)return;card.classList.remove("lineupDragV2999");if(et2999Drag.moved)et2999SaveVisibleOrder();et2999Drag=null;};
    card.addEventListener("pointerup",finish);card.addEventListener("pointercancel",finish);
  });
}

let et2999LastFeedback=0;
function et2999TapFeedback(){
  if(document.documentElement.dataset.feedback2999)return;
  document.documentElement.dataset.feedback2999="1";
  document.addEventListener("click",e=>{
    if(!e.target.closest("button,[role=button],select,input[type=checkbox],input[type=radio]"))return;
    const now=performance.now();if(now-et2999LastFeedback<70)return;et2999LastFeedback=now;
    requestAnimationFrame(()=>{try{window.AndroidBridge?.playTapFeedback?.();}catch(_){}});
  },true);
}

function et2999Post(){et2999AutoDate();et2999InstallHistoryValuePickers();et2999TeamButtons();et2999InstallDragLineup();}
const et2999RenderBase=render;
render=function(){et2999RenderBase();et2999Post();};
window.addEventListener("load",()=>{et2999AutoDate();et2999InstallHistoryValuePickers();et2999TapFeedback();render();});

/* ================= EASY TAGG v2.9.10 LOCKED HISTORY EDIT + HANDLE LINEUP =================
   - History editing is transactional: nothing changes until GUARDAR CAMBIO.
   - The edit window remains open until GUARDAR CAMBIO is pressed.
   - Internal player/result/trajectory/contact pickers return to the edit window.
   - Lineup uses a visible three-line drag handle and can move players up/down freely.
   ================================================================================ */
const ET2910_VERSION="2.9.10 Locked History Edit + Handle Lineup";
let et2910Editing=false;
let et2910EditSnapshot=null;

function et2910ShowEditSheet(){
  const sheet=$("editTagSheet"),overlay=$("overlay");
  if(overlay)overlay.classList.remove("hidden");
  if(sheet)sheet.classList.remove("hidden");
  et2910Editing=true;
}
function et2910HideChild(id){
  const sheet=$(id);if(sheet)sheet.classList.add("hidden");
  et2910ShowEditSheet();
}
function et2910SelectedText(sel, fallback){
  return sel?.options?.[sel.selectedIndex]?.textContent||fallback;
}

const et2910OpenEditBase=window.openEditTag||openEditTag;
openEditTag=function(id){
  const original=state.tags.find(t=>t.tag_id===id);
  et2910EditSnapshot=original?JSON.parse(JSON.stringify(original)):null;
  et2910OpenEditBase(id);
  et2910ShowEditSheet();
  setTimeout(()=>{
    [["editBatter","editBatterButtonV2998","Select Batter"],["editPitcher","editPitcherButtonV2998","Select Pitcher"],["editResult","editResultButtonV2999","Result"],["editTrajectory","editTrajectoryButtonV2999","Batted-Ball / Out Type"],["editQuality","editQualityButtonV2999","Contact"]].forEach(([sid,bid,f])=>{const s=$(sid),b=$(bid);if(s&&b)b.textContent=et2910SelectedText(s,f);});
  },0);
};
window.openEditTag=openEditTag;
window.openEditTagV21=openEditTag;

/* Player picker: update only the temporary form, then return to Edit Tag. */
et2998OpenHistoryPlayers=function(type){
  et2998HistoryField=type;const isB=type==="batter";
  $("historyPlayerTitleV2998").textContent=isB?"Select Batter":"Select Pitcher";
  const list=(state.players||[]).filter(p=>isB?(p.role==="Bateador"||p.role==="Ambos"):(p.role==="Pitcher"||p.role==="Ambos"));
  $("historyPlayerListV2998").innerHTML=list.map((p,i)=>`<button type="button" class="listBtn" data-history-player-v2998="${p.id}"><span class="lineupOrderCleanV255">${p.num||i+1}</span><span>${p.name}</span><small>${isB?(p.bat||""):(p.thr||"")}</small></button>`).join("")||"<p>No players available.</p>";
  $("historyPlayerListV2998").querySelectorAll("[data-history-player-v2998]").forEach(b=>b.onclick=()=>{
    const sel=$(isB?"editBatter":"editPitcher");sel.value=b.dataset.historyPlayerV2998;
    $(isB?"editBatterButtonV2998":"editPitcherButtonV2998").textContent=pn(b.dataset.historyPlayerV2998);
    et2910HideChild("historyPlayerSheetV2998");
  });
  openSheet("historyPlayerSheetV2998");
};

/* Value picker: update only the temporary form, then return to Edit Tag. */
et2999OpenValuePicker=function(id){
  const cfg=et2999ValueConfig[id],sel=$(id),grid=$("historyValueGridV2999");if(!cfg||!sel||!grid)return;
  $("historyValueTitleV2999").textContent=cfg.title;
  grid.innerHTML=cfg.values.map((v,i)=>`<button type="button" class="${sel.value===v?"selected":""}" data-edit-value-v2999="${encodeURIComponent(v)}">${cfg.labels?.[i]||v}</button>`).join("");
  grid.querySelectorAll("[data-edit-value-v2999]").forEach(b=>b.onclick=()=>{
    sel.value=decodeURIComponent(b.dataset.editValueV2999);
    const btn=$(id+"ButtonV2999");if(btn)btn.textContent=b.textContent;
    et2910HideChild("historyValueSheetV2999");
  });
  openSheet("historyValueSheetV2999");
};

/* Only Guardar Cambio may close the main edit window. */
function et2910LockEditWindow(){
  const sheet=$("editTagSheet");if(!sheet)return;
  const x=sheet.querySelector(".close");if(x){x.style.display="none";x.onclick=e=>e.preventDefault();}
  ["historyPlayerSheetV2998","historyValueSheetV2999"].forEach(id=>{
    const child=$(id),btn=child?.querySelector(".close");
    if(btn)btn.onclick=e=>{e.preventDefault();et2910HideChild(id);};
  });
  const overlay=$("overlay");if(overlay&&!overlay.dataset.lock2910){
    overlay.dataset.lock2910="1";
    overlay.addEventListener("click",e=>{
      if(et2910Editing){e.stopImmediatePropagation();et2910ShowEditSheet();}
    },true);
  }
  const saveBtn=$("saveEditedTag");
  if(saveBtn&&!saveBtn.dataset.lock2910){
    saveBtn.dataset.lock2910="1";
    saveBtn.addEventListener("click",()=>{et2910Editing=false;et2910EditSnapshot=null;},true);
  }
}

/* Add a clear drag handle similar to a standard mobile lineup editor. */
function et2910LineupId(card){
  const clickable=card.querySelector('[onclick*="et27SelectBatter"],[onclick*="selBatter"]');
  const m=clickable?.getAttribute("onclick")?.match(/(?:et27SelectBatter|selBatter)\(['\"]([^'\"]+)/);return m?.[1]||"";
}
function et2910SaveLineupOrder(list){
  const ids=[...list.querySelectorAll(".lineupPlayerCleanV241,.lineupPlayerCleanV255")].map(et2910LineupId).filter(Boolean);
  const side=state.battingSide||"away";
  if(ids.length&&typeof et27SetLineup==="function")et27SetLineup(side,ids);
  else if(ids.length&&typeof v241SetLineup==="function")v241SetLineup(side,ids);
  save();
}
let et2910DragActive=null;
let et2910DragRaf=0;
let et2910DragPoint=null;
let et2910GlobalDragReady=false;

function et2910RefreshOrders(list){
  [...list.querySelectorAll(".lineupOrderCleanV241,.lineupOrderCleanV255")].forEach((n,i)=>n.textContent=String(i+1));
}
function et2910ProcessDrag(){
  et2910DragRaf=0;
  const d=et2910DragActive,pt=et2910DragPoint;if(!d||!pt)return;
  if(Math.abs(pt.y-d.startY)<4)return;
  d.moved=true;
  const target=document.elementFromPoint(pt.x,pt.y)?.closest(".lineupPlayerCleanV241,.lineupPlayerCleanV255");
  if(target&&target!==d.card&&target.parentNode===d.list){
    const r=target.getBoundingClientRect();
    const before=pt.y<r.top+r.height/2;
    const anchor=before?target:target.nextSibling;
    if(anchor!==d.card&&d.card.nextSibling!==anchor){
      d.list.insertBefore(d.card,anchor);
      et2910RefreshOrders(d.list);
    }
  }
  const box=d.list.getBoundingClientRect();
  const edge=54;
  let speed=0;
  if(pt.y<box.top+edge){
    const proximity=Math.max(0,Math.min(1,(box.top+edge-pt.y)/edge));
    speed=-(2+Math.round(proximity*7));
  }else if(pt.y>box.bottom-edge){
    const proximity=Math.max(0,Math.min(1,(pt.y-(box.bottom-edge))/edge));
    speed=2+Math.round(proximity*7);
  }
  if(speed)d.list.scrollTop+=speed;
}
function et2910QueueDrag(e){
  if(!et2910DragActive)return;
  const t=e.touches?.[0]||e.changedTouches?.[0]||e;
  et2910DragPoint={x:t.clientX,y:t.clientY};
  e.preventDefault();e.stopPropagation();
  if(!et2910DragRaf)et2910DragRaf=requestAnimationFrame(et2910ProcessDrag);
}
function et2910FinishDrag(e){
  const d=et2910DragActive;if(!d)return;
  e?.preventDefault?.();e?.stopPropagation?.();
  if(et2910DragRaf){cancelAnimationFrame(et2910DragRaf);et2910DragRaf=0;et2910ProcessDrag();}
  d.card.classList.remove("lineupDragV2999");
  document.body.classList.remove("lineupDraggingV2910");
  if(d.moved)et2910SaveLineupOrder(d.list);
  et2910DragActive=null;et2910DragPoint=null;
}
function et2910StartDrag(e,handle){
  const card=handle.closest(".lineupPlayerCleanV241,.lineupPlayerCleanV255"),list=card?.parentNode;
  if(!card||!list)return;
  const t=e.touches?.[0]||e;
  e.preventDefault();e.stopPropagation();
  et2910DragActive={card,list,startY:t.clientY,moved:false};
  et2910DragPoint={x:t.clientX,y:t.clientY};
  card.classList.add("lineupDragV2999");
  document.body.classList.add("lineupDraggingV2910");
}
function et2910EnsureGlobalDrag(){
  if(et2910GlobalDragReady)return;et2910GlobalDragReady=true;
  document.addEventListener("touchmove",et2910QueueDrag,{passive:false});
  document.addEventListener("touchend",et2910FinishDrag,{passive:false});
  document.addEventListener("touchcancel",et2910FinishDrag,{passive:false});
  document.addEventListener("mousemove",et2910QueueDrag,{passive:false});
  document.addEventListener("mouseup",et2910FinishDrag,{passive:false});
}
function et2910InstallLineupHandles(){
  const list=$("batterList");if(!list)return;
  et2910EnsureGlobalDrag();
  list.classList.add("lineupHandleListV2910");
  [...list.querySelectorAll(".lineupPlayerCleanV241,.lineupPlayerCleanV255")].forEach(card=>{
    const oldActions=card.querySelector(".lineupActionsCleanV241,.lineupActionsCleanV255");
    if(oldActions)oldActions.style.display="none";
    let handle=card.querySelector(".lineupHandleV2910");
    if(!handle){
      handle=document.createElement("button");handle.type="button";handle.className="lineupHandleV2910";
      handle.setAttribute("aria-label","Arrastra para reordenar");handle.innerHTML="<span></span><span></span><span></span>";card.appendChild(handle);
    }
    if(handle.dataset.drag29101)return;handle.dataset.drag29101="1";
    handle.addEventListener("touchstart",e=>et2910StartDrag(e,handle),{passive:false});
    handle.addEventListener("mousedown",e=>et2910StartDrag(e,handle),{passive:false});
  });
}
function et2910Post(){et2910LockEditWindow();et2910InstallLineupHandles();}
const et2910RenderBase=render;
render=function(){et2910RenderBase();et2910Post();};
window.addEventListener("load",()=>{et2910Post();render();});


/* ================= EASY TAGG v2.9.10.3 MLB ZONE + EDIT X + LINEUP JERSEY ================= */
const ET29103_VERSION="2.9.10.3 MLB Zone + Edit Cancel + Lineup Jersey";

function et29103CancelEdit(){
  et2910Editing=false;
  et2910EditSnapshot=null;
  closeSheets();
}
function et29103EnableEditClose(){
  const sheet=$("editTagSheet");if(!sheet)return;
  const current=sheet.querySelector(".sheetHead .close");if(!current)return;
  current.style.display="flex";
  current.setAttribute("aria-label","Cancel editing");
  current.title="Cancel without saving";
  current.onclick=e=>{e.preventDefault();e.stopPropagation();et29103CancelEdit();};
}
function et29103ShowJerseyNumbers(){
  const list=$("batterList");if(!list)return;
  [...list.querySelectorAll(".lineupPlayerCleanV241,.lineupPlayerCleanV255")].forEach(card=>{
    const id=et2910LineupId(card),player=id?pl(id):null;
    const name=card.querySelector(".lineupNameCleanV241,.lineupNameCleanV255");
    if(!name||!player)return;
    let badge=name.querySelector(".lineupJerseyV29103");
    let text=name.querySelector(".lineupNameTextV29103");
    if(!badge||!text){
      const original=player.name||name.textContent.trim();
      name.textContent="";
      badge=document.createElement("span");badge.className="lineupJerseyV29103";
      text=document.createElement("span");text.className="lineupNameTextV29103";text.textContent=original;
      name.append(badge,text);
    }
    badge.textContent="#"+(player.num||"-");
    text.textContent=player.name||"Player";
  });
}
function et29103Post(){et29103EnableEditClose();et29103ShowJerseyNumbers();}
const et29103RenderBase=render;
render=function(){et29103RenderBase();et29103Post();};
window.addEventListener("load",()=>{et29103Post();});
window.et29103CancelEdit=et29103CancelEdit;

/* Easy Tagg v2.9.10.4 - vertical strike zone, compact lineup and controlled drag autoscroll */
const ET29104_VERSION="2.9.10.4 Vertical Zone + Compact Lineup + Controlled Scroll";


/* ================= EASY TAGG v2.9.10.5 QUICK JERSEY + CLEAN EDIT RESULT + AP HISTORY ================= */
const ET29105_VERSION="2.9.10.5 Quick Jersey + Clean Edit Result + AP History";

/* Every pitch/tag from the same plate appearance shows the active AP number. */
etAbForTagV21=function(tag){
  let apNumber=1;
  for(const t of gt()){
    if(t.tag_id===tag.tag_id)return apNumber;
    if((t.batter_id&&tag.batter_id?t.batter_id===tag.batter_id:t.batter===tag.batter) && typeof pa==="function" && pa(t.final_result||t.result||"")){
      apNumber++;
    }
  }
  return apNumber;
};

function et29105PatchHistoryAP(){
  document.querySelectorAll(".tagCardV21 .tagTimeV21").forEach(node=>{
    const txt=(node.textContent||"").trim();
    const m=txt.match(/^AB\s*#\s*(\d+)$/i);
    if(m)node.textContent="AB-"+m[1];
  });
}
if(typeof renderHistoryV21==="function"){
  const et29105HistoryBase=renderHistoryV21;
  renderHistoryV21=function(){et29105HistoryBase();et29105PatchHistoryAP();};
}

function et29105EnsureNumberSheet(){
  if($("quickNumberSheetV29105"))return;
  const sheet=document.createElement("div");
  sheet.id="quickNumberSheetV29105";
  sheet.className="sheet hidden quickNumberSheetV29105";
  sheet.innerHTML=`
    <div class="sheetHead"><h2>Edit Number</h2><button type="button" class="close">×</button></div>
    <p id="quickNumberPlayerV29105" class="quickNumberPlayerV29105"></p>
    <label for="quickNumberInputV29105">Uniform Number</label>
    <input id="quickNumberInputV29105" type="text" inputmode="numeric" maxlength="3" placeholder="Ej. 24">
    <button id="quickNumberSaveV29105" type="button">Save Number</button>`;
  document.body.appendChild(sheet);
  sheet.querySelector(".close").onclick=closeSheets;
  $("quickNumberSaveV29105").onclick=et29105SaveQuickNumber;
  $("quickNumberInputV29105").addEventListener("keydown",e=>{if(e.key==="Enter")et29105SaveQuickNumber();});
}
let et29105EditingPlayerId="";
function et29105OpenQuickNumber(id,e){
  e?.preventDefault?.();e?.stopPropagation?.();
  const p=pl(id);if(!p)return;
  et29105EnsureNumberSheet();
  et29105EditingPlayerId=id;
  $("quickNumberPlayerV29105").textContent=p.name||"Player";
  $("quickNumberInputV29105").value=p.num||"";
  openSheet("quickNumberSheetV29105");
  setTimeout(()=>$("quickNumberInputV29105")?.focus(),80);
}
function et29105SaveQuickNumber(){
  const p=pl(et29105EditingPlayerId);if(!p)return closeSheets();
  const raw=($("quickNumberInputV29105")?.value||"").trim();
  p.num=raw.replace(/[^0-9A-Za-z-]/g,"").slice(0,3);
  save();closeSheets();render();
}

function et29105PatchLineupNumbers(){
  const list=$("batterList");if(!list)return;
  list.querySelectorAll(".lineupPlayerCleanV241,.lineupPlayerCleanV255").forEach(card=>{
    const id=et2910LineupId(card),p=id?pl(id):null,badge=card.querySelector(".lineupJerseyV29103");
    if(!p||!badge)return;
    badge.textContent="#"+(p.num||"-");
    badge.title="Tap to edit the number";
    badge.setAttribute("role","button");badge.setAttribute("tabindex","0");
    badge.onclick=e=>et29105OpenQuickNumber(id,e);
    badge.onkeydown=e=>{if(e.key==="Enter"||e.key===" ")et29105OpenQuickNumber(id,e);};
  });
}
function et29105PatchPitcherNumbers(){
  const list=$("pitcherList");if(!list)return;
  const buttons=[...list.querySelectorAll("button.listBtn")];
  buttons.forEach(btn=>{
    // The activity list is filtered and may not match the global roster order.
    // Resolve the exact player rendered in this button; never use array position.
    const raw=btn.getAttribute("onclick")||"";
    const match=raw.match(/selPitcher\(['\"]([^'\"]+)['\"]\)/);
    const id=match?match[1]:String(btn.getAttribute("data-player-id")||"");
    const p=id?pl(id):null;if(!p)return;
    btn.setAttribute("data-player-id",p.id);
    const num=btn.querySelector(".num");if(!num)return;
    num.textContent="#"+(p.num||"-");
    num.classList.add("quickPitcherNumberV29105");
    num.setAttribute("data-player-id",p.id);
    num.title="Tap to edit the number";
    num.onclick=e=>et29105OpenQuickNumber(p.id,e);
  });
}
function et29105RemoveLegacyEditResults(){
  const sel=$("editResult");if(!sel)return;
  ["Ground Out","Fly Out","Line Out"].forEach(v=>{
    [...sel.options].filter(o=>o.value===v||o.text===v).forEach(o=>o.remove());
  });
}
function et29105Post(){
  et29105EnsureNumberSheet();
  et29105PatchLineupNumbers();
  et29105PatchPitcherNumbers();
  et29105RemoveLegacyEditResults();
  et29105PatchHistoryAP();
}
const et29105RenderBase=render;
render=function(){et29105RenderBase();et29105Post();};
window.addEventListener("load",()=>{et29105Post();render();});
window.et29105OpenQuickNumber=et29105OpenQuickNumber;

/* ================= EASY TAGG v2.9.10.6 CLEAN EDIT RESULTS + INLINE AP ================= */
const ET29106_VERSION="2.9.10.6 Clean Edit Results + Inline AP";

function et29106CleanEditResultEverywhere(){
  const blocked=new Set(["Ground Out","Fly Out","Line Out"]);
  if(typeof et2999ValueConfig!=="undefined" && et2999ValueConfig.editResult){
    et2999ValueConfig.editResult.values=et2999ValueConfig.editResult.values.filter(v=>!blocked.has(v));
    if(Array.isArray(et2999ValueConfig.editResult.labels)){
      et2999ValueConfig.editResult.labels=et2999ValueConfig.editResult.labels.filter(v=>!blocked.has(v));
    }
  }
  const sel=$("editResult");
  if(sel){
    [...sel.options].forEach(o=>{if(blocked.has(o.value)||blocked.has(o.textContent.trim()))o.remove();});
  }
  const grid=$("historyValueGridV2999");
  if(grid && $("historyValueTitleV2999")?.textContent.trim()==="Result"){
    grid.querySelectorAll("[data-edit-value-v2999]").forEach(b=>{
      const v=decodeURIComponent(b.dataset.editValueV2999||"");
      if(blocked.has(v))b.remove();
    });
  }
}

function et29106InlineHistoryAP(){
  const tags=[...gt()].reverse();
  document.querySelectorAll(".tagCardV21").forEach((card,index)=>{
    const tag=tags[index];if(!tag)return;
    const ap=etAbForTagV21(tag)||1;
    const timeNodes=card.querySelectorAll(".tagTimeV21");
    timeNodes.forEach(n=>{if(/^\s*(?:AB\s*#|AB-|AP-)\s*\d+\s*$/i.test(n.textContent||""))n.remove();});
    const sub=card.querySelector(".tagSubV21");if(!sub)return;
    let badge=sub.querySelector(".historyAPV29106");
    if(!badge){
      badge=document.createElement("span");badge.className="historyAPV29106";sub.appendChild(document.createTextNode(" · "));sub.appendChild(badge);
    }
    badge.textContent="AB-"+ap;
  });
}

if(typeof renderHistoryV21==="function"){
  const et29106HistoryBase=renderHistoryV21;
  renderHistoryV21=function(){et29106HistoryBase();et29106InlineHistoryAP();};
}

const et29106OpenPickerBase=et2999OpenValuePicker;
et2999OpenValuePicker=function(id){
  et29106CleanEditResultEverywhere();
  et29106OpenPickerBase(id);
  if(id==="editResult")et29106CleanEditResultEverywhere();
};

function et29106Post(){et29106CleanEditResultEverywhere();et29106InlineHistoryAP();}
const et29106RenderBase=render;
render=function(){et29106RenderBase();et29106Post();};
window.addEventListener("load",()=>{et29106Post();render();});

/* ================= EASY TAGG v2.9.10.7 VISIBLE AP + EXACT HOME PLATE ORIGIN ================= */
const ET29107_VERSION="2.9.10.7 Visible AP + Exact Home Plate Origin";

function et29107SameBatter(a,b){
  if(a?.batter_id && b?.batter_id) return a.batter_id===b.batter_id;
  return String(a?.batter||"")===String(b?.batter||"");
}
function et29107BuildAPMap(){
  const counters=new Map(), out=new Map();
  for(const t of gt()){
    const key=t.batter_id||("name:"+(t.batter||""));
    const current=counters.get(key)||1;
    out.set(t.tag_id,current);
    if(typeof pa==="function" && pa(t.final_result||t.result||"")) counters.set(key,current+1);
  }
  return out;
}

/* The active history renderer in this project uses .tagCard, not .tagCardV21. */
renderHistory=function(){
  const list=$("historyList");
  if(!list)return;
  const q=($("histSearch")?.value||"").toLowerCase();
  const type=$("histType")?.value||"";
  const apMap=et29107BuildAPMap();
  const rows=gt().slice().reverse().filter(t=>{
    const r=t.final_result||t.result||"";
    const txt=((t.pitcher||"")+" "+(t.batter||"")+" "+r).toLowerCase();
    if(q&&!txt.includes(q))return false;
    if(type==="hits"&&!['Single','Double','Triple','HR'].includes(r))return false;
    if(type==="outs"&&!['Out','Ground Out','Fly Out','Line Out','Pop Out'].includes(r))return false;
    if(type==="k"&&!['K Swinging','K Looking','Strikeout'].includes(r))return false;
    if(type==="walks"&&!['BB','HBP'].includes(r))return false;
    return true;
  });
  list.innerHTML=rows.map(t=>{
    const r=t.final_result||t.result||"";
    const cls=(typeof resultClass==="function")?resultClass(r):"";
    const ap=apMap.get(t.tag_id)||1;
    const contact=t.contact_quality||"No Contact";
    return `<div class="tagCard">
      <div class="tagTime">${t.game_time||""}<br><small>${t.half||""} ${t.inning||""}</small></div>
      <div class="tagMain"><b>${t.pitcher||""} vs ${t.batter||""}</b><br><small>${t.pitch_type||""} · ${contact} <span class="historyAPV29107">${t.null_pa?"· NULL":"· AB-"+ap}</span></small></div>
      <div class="tagRight"><div class="tagResult ${cls}">${r}</div><div class="tagActions"><button class="editMini" type="button" onclick="openEditTag('${t.tag_id}')">Edit</button><button class="deleteMini" type="button" onclick="v243DeleteTag('${t.tag_id}')">X</button></div></div>
    </div>`;
  }).join("")||"<p>No tags recorded.</p>";
};

function et29107ImageBox(){
  const wrap=$("fieldLocationWrapV276"), img=$("fieldImageV276");
  if(!wrap||!img)return null;
  const wr=wrap.getBoundingClientRect();
  const naturalW=img.naturalWidth||616, naturalH=img.naturalHeight||643;
  const scale=Math.min(wr.width/naturalW,wr.height/naturalH);
  const width=naturalW*scale, height=naturalH*scale;
  return {wrap,wr,left:(wr.width-width)/2,top:(wr.height-height)/2,width,height};
}

etV276SelectFieldLocation=function(ev){
  etV276EnsureDetailState();
  const box=et29107ImageBox();if(!box)return;
  const clientX=ev.touches?.[0]?.clientX??ev.clientX;
  const clientY=ev.touches?.[0]?.clientY??ev.clientY;
  let x=(clientX-box.wr.left-box.left)/box.width;
  let y=(clientY-box.wr.top-box.top)/box.height;
  x=Math.max(0,Math.min(1,x));y=Math.max(0,Math.min(1,y));
  state.detail.hit_x=Number(x.toFixed(4));state.detail.hit_y=Number(y.toFixed(4));
  state.detail.hit_x_px=Math.round(x*box.width);state.detail.hit_y_px=Math.round(y*box.height);
  state.detail.spray=etV276ApproxFieldZone(x,y);
  etV276SetMarkerFromState();
  if(window.AndroidBridge)AndroidBridge.vibrateShort();
};

etV276SetMarkerFromState=function(){
  etV276EnsureDetailState();
  const marker=$("fieldMarkerV276"),box=et29107ImageBox();if(!marker||!box)return;
  const x=Number(state.detail.hit_x),y=Number(state.detail.hit_y);
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0){marker.classList.add("hidden");etV278DrawTrajectory();return;}
  marker.style.left=`${box.left+x*box.width}px`;marker.style.top=`${box.top+y*box.height}px`;marker.classList.remove("hidden");
  const status=$("fieldLocationStatusV276");if(status)status.textContent=`Location saved: ${etV276ApproxFieldZone(x,y)} (${Math.round(x*100)}%, ${Math.round(y*100)}%)`;
  etV278DrawTrajectory();
};

etV278DrawTrajectory=function(){
  etV276EnsureDetailState();
  const svg=$("fieldTrajectoryV278"),path=$("fieldTrajectoryPathV278"),box=et29107ImageBox();
  if(!svg||!path||!box)return;
  const x=Number(state.detail.hit_x),y=Number(state.detail.hit_y),type=etV278TrajectoryType();
  if(!type||!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0){svg.classList.add("hidden");path.setAttribute("d","");return;}
  svg.setAttribute("viewBox",`0 0 ${box.wr.width} ${box.wr.height}`);
  /* Exact bottom tip of home plate in the supplied field image. */
  const sx=box.left+(316/616)*box.width;
  const sy=box.top+(628/643)*box.height;
  const ex=box.left+x*box.width,ey=box.top+y*box.height;
  let d=`M ${sx} ${sy} L ${ex} ${ey}`;
  if(type==="fly"||type==="popup"){
    const dx=ex-sx,dy=ey-sy,len=Math.max(1,Math.hypot(dx,dy));
    const nx=-dy/len,ny=dx/len,arc=type==="popup"?Math.min(95,box.width*.16):Math.min(58,box.width*.10);
    const mx=(sx+ex)/2+nx*arc,my=(sy+ey)/2+ny*arc-(type==="popup"?35:14);
    d=`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`;
  }
  svg.classList.remove("hidden","fly","line","ground","popup");svg.classList.add(type);path.setAttribute("d",d);
};

function et29107RewireField(){
  const wrap=$("fieldLocationWrapV276");if(!wrap)return;
  const clone=wrap.cloneNode(true);wrap.parentNode.replaceChild(clone,wrap);
  clone.addEventListener("click",etV276SelectFieldLocation);
  const clear=$("clearFieldLocationV276");if(clear)clear.onclick=etV276ClearFieldLocation;
  etV276SetMarkerFromState();
}

const et29107RenderBase=render;
render=function(){et29107RenderBase();renderHistory();setTimeout(etV276SetMarkerFromState,0);};
window.addEventListener("load",()=>{setTimeout(()=>{et29107RewireField();renderHistory();},450);});
window.addEventListener("resize",()=>setTimeout(etV276SetMarkerFromState,50));

/* EasyTagg v2.9.10.8 - exact inside-home origin + in-app hit-location prompt */
(function(){
  const originalDrawTrajectoryV29108 = etV278DrawTrajectory;
  etV278DrawTrajectory = function(){
    etV276EnsureDetailState();
    const svg=$("fieldTrajectoryV278"),path=$("fieldTrajectoryPathV278"),box=et29107ImageBox();
    if(!svg||!path||!box)return;
    const x=Number(state.detail.hit_x),y=Number(state.detail.hit_y),type=etV278TrajectoryType();
    if(!type||!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0){svg.classList.add("hidden");path.setAttribute("d","");return;}
    svg.setAttribute("viewBox",`0 0 ${box.wr.width} ${box.wr.height}`);
    /* Start just inside the orange home-plate tip, never below/outside the field. */
    const naturalW=615,naturalH=641;
    const sx=box.left+(315.5/naturalW)*box.width;
    const sy=box.top+(619/naturalH)*box.height;
    const ex=box.left+x*box.width,ey=box.top+y*box.height;
    let d=`M ${sx} ${sy} L ${ex} ${ey}`;
    if(type==="fly"||type==="popup"){
      const dx=ex-sx,dy=ey-sy,len=Math.max(1,Math.hypot(dx,dy));
      const nx=-dy/len,ny=dx/len,arc=type==="popup"?Math.min(95,box.width*.16):Math.min(58,box.width*.10);
      const mx=(sx+ex)/2+nx*arc,my=(sy+ey)/2+ny*arc-(type==="popup"?35:14);
      d=`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`;
    }
    svg.classList.remove("hidden","fly","line","ground","popup");svg.classList.add(type);path.setAttribute("d",d);
  };

  const previousSaveContactV29108 = etV275SaveContactDetail;
  etV275SaveContactDetail = function(){
    etV276EnsureDetailState();
    if(!state.detail.contact || !state.detail.trajectory){
      return etAppAlert("Select contact quality and batted-ball type to continue.","INFORMATION REQUIRED");
    }
    if(state.detail.hit_x === "" || state.detail.hit_y === "" || !state.detail.spray){
      return etAppAlert("Tap the field where the batted ball ended.","HIT LOCATION REQUIRED");
    }
    return previousSaveContactV29108();
  };

  const priorFieldSaveV29108 = etV276OriginalSaveContactDetail;
  if(typeof priorFieldSaveV29108 === "function"){
    etV276OriginalSaveContactDetail = function(){
      etV276EnsureDetailState();
      if(state.detail.hit_x === "" || state.detail.hit_y === ""){
        return etAppAlert("Tap the field where the batted ball ended.","HIT LOCATION REQUIRED");
      }
      return priorFieldSaveV29108();
    };
  }
})();

/* ================= EASY TAGG v2.9.10.13 VERIFIED CLEAR DATABASE SEARCH =================
   Search clearing is implemented inside the real database-add function.
   It clears the input/results and restores focus after Android WebView re-render.
   ====================================================================================== */
const ET291013_VERSION="2.9.10.13 Verified Clear Database Search";


/* ================= EASY TAGG v2.9.10.15 CHECK SWING + OUT EDIT + H RESULTS + CLEAN FIELD =================
   - Replaces Taken with Check Swing.
   - Check Swing counts as a swing (not a miss); SwDz depends on in-zone/out-of-zone.
   - Restores Out in Edit Tag while In-Game Data continues deriving groundout/lineout/flyout from trajectory.
   - Uses H1/H2/H3 as visible hit labels while retaining Single/Double/Triple internally.
   - Never draws a field trajectory until the user actually selects a field location.
   ========================================================================================================= */
const ET291015_VERSION="2.9.10.15 Check Swing Out Edit H Results Clean Field";

function et291015NormalizeLegacyTaken(){
  document.querySelectorAll('[data-result="Taken"]').forEach(b=>{b.dataset.result="Check Swing";b.textContent="CHECK SWING";});
  const sel=$("editResult");
  if(sel){
    [...sel.options].forEach(o=>{if(o.value==="Taken"||o.textContent.trim()==="Taken"){o.value="Check Swing";o.textContent="Check Swing";}});
    if(![...sel.options].some(o=>o.value==="Check Swing"))sel.add(new Option("Check Swing","Check Swing"));
  }
  if(typeof et2999ValueConfig!=="undefined"&&et2999ValueConfig.editResult){
    et2999ValueConfig.editResult.values=et2999ValueConfig.editResult.values.map(v=>v==="Taken"?"Check Swing":v);
    if(!et2999ValueConfig.editResult.values.includes("Check Swing"))et2999ValueConfig.editResult.values.splice(3,0,"Check Swing");
  }
}

/* Check Swing is a swing attempt, but not automatically a miss. */
isSwingTag=function(t){
  const r=t.final_result||t.result||"";
  return ["Swing & Miss","Check Swing","Foul","K Swinging","Single","Double","Triple","HR","Out","Ground Out","Fly Out","Line Out","Error","Fielder's Choice","Sac Fly","Sac Bunt"].includes(r);
};
isMissTag=function(t){
  const r=t.final_result||t.result||"";
  return ["Swing & Miss","K Swinging"].includes(r);
};

/* Check Swing records a strike in the live count, while SwDz is determined separately by zone. */
autoCount=function(r){
  if(r==="Ball"){state.balls++;if(state.balls>=4)resetCount();}
  if(["Strike","Check Swing","Swing & Miss"].includes(r)){
    state.strikes++;
    if(state.strikes>=3){state.outs=Math.min(3,state.outs+1);resetCount();}
  }
  if(r==="Foul"&&state.strikes<2)state.strikes++;
  if(["BB","HBP"].includes(r))resetCount();
  if(["K Swinging","K Looking"].includes(r)){state.outs=Math.min(3,state.outs+1);resetCount();}
  if(["Out","Ground Out","Fly Out","Line Out","Fielder's Choice","Sac Fly","Sac Bunt"].includes(r))state.outs=Math.min(3,state.outs+1);
  if(needDetail(r))resetCount();
  if(state.outs>=3)state.outs=0;
};

/* Restore generic Out in history editing, despite older cleanup layers. */
function et291015RestoreOutEditor(){
  et291015NormalizeLegacyTaken();
  const sel=$("editResult");
  if(sel&&! [...sel.options].some(o=>o.value==="Out"))sel.add(new Option("Out","Out"));
  if(typeof et2999ValueConfig!=="undefined"&&et2999ValueConfig.editResult){
    const vals=et2999ValueConfig.editResult.values;
    if(!vals.includes("Out"))vals.push("Out");
  }
}

/* Override the old cleaner so only detailed out labels stay hidden; generic Out remains available. */
et29106CleanEditResultEverywhere=function(){
  const blocked=new Set(["Ground Out","Fly Out","Line Out","Pop Out"]);
  if(typeof et2999ValueConfig!=="undefined"&&et2999ValueConfig.editResult){
    et2999ValueConfig.editResult.values=et2999ValueConfig.editResult.values.filter(v=>!blocked.has(v));
    if(!et2999ValueConfig.editResult.values.includes("Out"))et2999ValueConfig.editResult.values.push("Out");
  }
  const sel=$("editResult");
  if(sel){
    [...sel.options].forEach(o=>{if(blocked.has(o.value)||blocked.has(o.textContent.trim()))o.remove();});
    if(![...sel.options].some(o=>o.value==="Out"))sel.add(new Option("Out","Out"));
  }
};
et29105RemoveLegacyEditResults=function(){et291015RestoreOutEditor();};

/* In-Game Data: generic Out derives the accepted terminal result from trajectory. */
reportResult=function(paTags){
  const last=paTags[paTags.length-1]||{};
  const r=last.final_result||last.result||"",tr=last.trajectory||"";
  if(r==="Single")return "single";
  if(r==="Double")return "double";
  if(r==="Triple")return "triple";
  if(r==="HR")return "home_run";
  if(r==="BB")return "walk";
  if(r==="HBP")return "hit_by_pitch";
  if(r==="K Swinging"||r==="K Looking")return "strikeout";
  if(r==="Error")return "error";
  if(r==="Fielder's Choice")return "fielders_choice";
  if(r==="Sac Fly")return "sac_fly";
  if(r==="Sac Bunt")return "sac_bunt";
  if(r==="Out"||r==="Ground Out"||r==="Fly Out"||r==="Line Out"){
    if(r==="Ground Out"||tr==="Ground Ball")return "groundout";
    if(r==="Line Out"||tr==="Line Drive")return "lineout";
    if(r==="Fly Out"||tr==="Fly Ball")return "flyout";
    return "out";
  }
  return String(r||"").toLowerCase().replaceAll(" ","_");
};

/* Visible result labels. Internal values stay compatible with all prior exports. */
shortResultV279=function(paTags){
  const r=terminalResultV279(paTags),t=paTags[paTags.length-1]||{},tr=String(t.trajectory||"");
  const map={Single:"H1",Double:"H2",Triple:"H3",HR:"HR",BB:"BB",HBP:"HBP","K Swinging":"K","K Looking":"K",Error:"E",Out:"OUT","Ground Out":"GB","Fly Out":"FB","Line Out":"LD"};
  if(map[r])return map[r];
  if(r==="Out")return tr==="Ground Ball"?"GB":tr==="Line Drive"?"LD":tr==="Fly Ball"?"FB":"OUT";
  return r||"-";
};

/* Empty strings must never become coordinate 0,0 and draw a premature line. */
const et291015DrawBase=etV278DrawTrajectory;
etV278DrawTrajectory=function(){
  etV276EnsureDetailState();
  const hx=state.detail?.hit_x,hy=state.detail?.hit_y;
  const svg=$("fieldTrajectoryV278"),path=$("fieldTrajectoryPathV278");
  if(hx===""||hy===""||hx===null||hy===null||hx===undefined||hy===undefined){
    if(svg)svg.classList.add("hidden");
    if(path)path.setAttribute("d","");
    return;
  }
  return et291015DrawBase();
};

const et291015ChooseBase=etV275ChooseResult;
etV275ChooseResult=function(result){
  if(etV275ContactResult(result)){
    state.detail=state.detail||{};
    state.detail.hit_x="";state.detail.hit_y="";state.detail.hit_x_px="";state.detail.hit_y_px="";state.detail.spray="";
    const svg=$("fieldTrajectoryV278"),path=$("fieldTrajectoryPathV278"),marker=$("fieldMarkerV276");
    if(svg)svg.classList.add("hidden");if(path)path.setAttribute("d","");if(marker)marker.classList.add("hidden");
  }
  const out=et291015ChooseBase(result);
  setTimeout(etV278DrawTrajectory,0);
  return out;
};

function et291015Post(){
  et291015RestoreOutEditor();
  document.querySelectorAll('[data-sheet-result="Single"]').forEach(b=>b.textContent="H1");
  document.querySelectorAll('[data-sheet-result="Double"]').forEach(b=>b.textContent="H2");
  document.querySelectorAll('[data-sheet-result="Triple"]').forEach(b=>b.textContent="H3");
}
const et291015RenderBase=render;
render=function(){et291015RenderBase();et291015Post();};
window.addEventListener("load",()=>{et291015Post();render();});


/* ================= EASY TAGG v2.9.10.16 QUICK TAG LAYOUT =================
   - Removes any legacy Taken control.
   - Places SW MISS in the former Taken/Check Swing quick-tag position.
   - RESULTADO occupies the old SW MISS cell and its existing cell.
*/
const ET291016_VERSION="2.9.10.16 Quick Tag Layout";
function et291016EnforceQuickTagLayout(){
  document.querySelectorAll('#tagScreen [data-result="Taken"], #tagScreen [data-result="Check Swing"]').forEach(el=>el.remove());
  document.querySelectorAll('option').forEach(o=>{if(String(o.value).trim()==="Taken"||o.textContent.trim()==="Taken")o.remove();});
  const grid=document.querySelector('#tagScreen .quickGrid');
  const sw=grid?.querySelector('[data-result="Swing & Miss"]');
  const foul=grid?.querySelector('[data-result="Foul"]');
  const result=document.getElementById('resultBtn');
  if(grid&&sw&&foul&&result){
    grid.append(sw,foul);
    result.style.gridColumn='3';
    result.style.gridRow='1 / span 2';
  }
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(et291016EnforceQuickTagLayout,0));
setTimeout(et291016EnforceQuickTagLayout,250);

/* ================= EASY TAGG v2.9.10.17 CLEAN FIELD + OUT EDIT =================
   - Generic Out is available in Historial > Editar Tag > Resultado.
   - Selecting GB/LD/FB never draws a trajectory by itself.
   - The field line appears only after the user taps the field.
   - Trajectory starts at the exact bottom corner of home plate.
   - Field image top measurement bar was removed for a more compact layout.
   ============================================================================== */
const ET291017_VERSION="2.9.10.17 Clean Field Exact Home Out Edit";

function et291017EnsureOut(){
  const sel=$("editResult");
  if(sel && ![...sel.options].some(o=>o.value==="Out")) sel.add(new Option("Out","Out"));
  if(typeof et2999ValueConfig!=="undefined" && et2999ValueConfig.editResult){
    const vals=et2999ValueConfig.editResult.values;
    ["Ground Out","Fly Out","Line Out","Pop Out"].forEach(v=>{const i=vals.indexOf(v);if(i>=0)vals.splice(i,1);});
    if(!vals.includes("Out")) vals.push("Out");
  }
}

function et291017HideFieldLine(){
  const svg=$("fieldTrajectoryV278"),path=$("fieldTrajectoryPathV278"),marker=$("fieldMarkerV276");
  if(svg)svg.classList.add("hidden");
  if(path)path.setAttribute("d","");
  if(marker)marker.classList.add("hidden");
}

/* Every new contact result starts with an untouched field. */
const et291017ChooseBase=etV275ChooseResult;
etV275ChooseResult=function(result){
  if(etV275ContactResult(result)){
    state.detail=state.detail||{};
    state.detail.hit_x=""; state.detail.hit_y="";
    state.detail.hit_x_px=""; state.detail.hit_y_px="";
    state.detail.spray=""; state.detail.field_touched=false;
    et291017HideFieldLine();
  }
  return et291017ChooseBase(result);
};

/* A trajectory button only selects GB/LD/FB; it cannot create a location. */
document.addEventListener("click",function(e){
  const btn=e.target.closest("[data-traj]");
  if(!btn)return;
  etV276EnsureDetailState();
  if(state.detail.field_touched!==true){
    state.detail.hit_x=""; state.detail.hit_y="";
    state.detail.hit_x_px=""; state.detail.hit_y_px="";
    state.detail.spray="";
    et291017HideFieldLine();
  }
},true);

/* Mark the field as touched only through a real tap inside the image. */
const et291017SelectBase=etV276SelectFieldLocation;
etV276SelectFieldLocation=function(ev){
  const result=et291017SelectBase(ev);
  state.detail=state.detail||{};
  state.detail.field_touched=true;
  etV278DrawTrajectory();
  return result;
};

/* Final guarded renderer with exact home-plate corner origin. */
etV278DrawTrajectory=function(){
  etV276EnsureDetailState();
  const svg=$("fieldTrajectoryV278"),path=$("fieldTrajectoryPathV278"),box=et29107ImageBox();
  if(!svg||!path||!box)return;
  const hx=state.detail?.hit_x,hy=state.detail?.hit_y;
  const type=etV278TrajectoryType();
  if(state.detail?.field_touched!==true || hx==="" || hy==="" || hx==null || hy==null || !type){
    svg.classList.add("hidden"); path.setAttribute("d",""); return;
  }
  const x=Number(hx),y=Number(hy);
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>1||y>1){
    svg.classList.add("hidden"); path.setAttribute("d",""); return;
  }
  svg.setAttribute("viewBox",`0 0 ${box.wr.width} ${box.wr.height}`);
  /* Cropped image is 615 x 521. Exact home tip is the lower orange corner. */
  const naturalW=615,naturalH=521;
  const sx=box.left+(315.5/naturalW)*box.width;
  const sy=box.top+(510/naturalH)*box.height;
  const ex=box.left+x*box.width,ey=box.top+y*box.height;
  let d=`M ${sx} ${sy} L ${ex} ${ey}`;
  if(type==="fly"||type==="popup"){
    const dx=ex-sx,dy=ey-sy,len=Math.max(1,Math.hypot(dx,dy));
    const nx=-dy/len,ny=dx/len,arc=type==="popup"?Math.min(95,box.width*.16):Math.min(58,box.width*.10);
    const mx=(sx+ex)/2+nx*arc,my=(sy+ey)/2+ny*arc-(type==="popup"?35:14);
    d=`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`;
  }
  svg.classList.remove("hidden","fly","line","ground","popup");
  svg.classList.add(type); path.setAttribute("d",d);
};

const et291017RenderBase=render;
render=function(){et291017RenderBase();et291017EnsureOut();};
window.addEventListener("load",()=>{et291017EnsureOut();et291017HideFieldLine();});


/* ================= EASY TAGG v2.9.10.18 VERIFIED FIELD + OUT PICKER FIX =================
   Final authority layer:
   - Any GB/LD/FB selection clears stale field coordinates and never draws a line.
   - A line can only be drawn after a new, real tap on the field image.
   - Generic Out is always present in Historial > Editar Tag > Resultado.
   ============================================================================== */
const ET291018_VERSION="2.9.10.18 Verified Field and Out Picker Fix";

function et291018ResetUntouchedField(){
  state.detail=state.detail||{};
  state.detail.hit_x=""; state.detail.hit_y="";
  state.detail.hit_x_px=""; state.detail.hit_y_px="";
  state.detail.spray=""; state.detail.field_touched=false;
  const svg=$("fieldTrajectoryV278"),path=$("fieldTrajectoryPathV278"),marker=$("fieldMarkerV276");
  if(svg)svg.classList.add("hidden");
  if(path)path.setAttribute("d","");
  if(marker)marker.classList.add("hidden");
  const status=$("fieldLocationStatusV276");
  if(status)status.textContent="Tap the field to save the location.";
}

/* Run before every older trajectory listener, including the v2.7.8 delayed draw. */
document.addEventListener("click",function(e){
  if(!e.target.closest("[data-traj]"))return;
  et291018ResetUntouchedField();
},true);

/* Also reset when opening any new contact-result detail screen. */
const et291018ChooseBase=etV275ChooseResult;
etV275ChooseResult=function(result){
  if(etV275ContactResult(result))et291018ResetUntouchedField();
  return et291018ChooseBase(result);
};

/* Absolute guard: no touch flag, no marker and no trajectory line. */
const et291018DrawBase=etV278DrawTrajectory;
etV278DrawTrajectory=function(){
  const d=state.detail||{};
  if(d.field_touched!==true || d.hit_x==="" || d.hit_y==="" || d.hit_x==null || d.hit_y==null){
    const svg=$("fieldTrajectoryV278"),path=$("fieldTrajectoryPathV278"),marker=$("fieldMarkerV276");
    if(svg)svg.classList.add("hidden");
    if(path)path.setAttribute("d","");
    if(marker)marker.classList.add("hidden");
    return;
  }
  return et291018DrawBase();
};

function et291018EnsureOutEverywhere(){
  const sel=$("editResult");
  if(sel){
    [...sel.options].forEach(o=>{if(["Ground Out","Fly Out","Line Out","Pop Out"].includes(o.value))o.remove();});
    if(![...sel.options].some(o=>o.value==="Out"))sel.add(new Option("Out","Out"));
  }
  if(typeof et2999ValueConfig!=="undefined"&&et2999ValueConfig.editResult){
    et2999ValueConfig.editResult.values=et2999ValueConfig.editResult.values.filter(v=>!["Ground Out","Fly Out","Line Out","Pop Out"].includes(v));
    if(!et2999ValueConfig.editResult.values.includes("Out"))et2999ValueConfig.editResult.values.push("Out");
  }
}

/* Build the Resultado picker directly so no legacy cleaner can remove Out. */
const et291018PickerBase=et2999OpenValuePicker;
et2999OpenValuePicker=function(id){
  if(id!=="editResult")return et291018PickerBase(id);
  et291018EnsureOutEverywhere();
  const sel=$("editResult"),grid=$("historyValueGridV2999");
  if(!sel||!grid)return;
  const values=["Ball","Strike","Swing & Miss","Check Swing","Foul","Single","Double","Triple","HR","BB","HBP","K Swinging","K Looking","Out"];
  $("historyValueTitleV2999").textContent="Result";
  grid.innerHTML=values.map(v=>`<button type="button" class="${sel.value===v?"selected":""}" data-edit-value-v2999="${encodeURIComponent(v)}">${v}</button>`).join("");
  grid.querySelectorAll("[data-edit-value-v2999]").forEach(b=>b.onclick=()=>{
    sel.value=decodeURIComponent(b.dataset.editValueV2999);
    const btn=$("editResultButtonV2999");if(btn)btn.textContent=b.textContent;
    closeSheets();
  });
  openSheet("historyValueSheetV2999");
};

/* Keep global references aligned with the final picker implementation. */
window.et2999OpenValuePicker=et2999OpenValuePicker;

const et291018OpenEditBase=window.openEditTag||openEditTag;
openEditTag=function(id){
  et291018EnsureOutEverywhere();
  const out=et291018OpenEditBase(id);
  setTimeout(et291018EnsureOutEverywhere,0);
  return out;
};
window.openEditTag=openEditTag;
window.openEditTagV21=openEditTag;

const et291018RenderBase=render;
render=function(){const out=et291018RenderBase();et291018EnsureOutEverywhere();return out;};
window.addEventListener("load",()=>{et291018EnsureOutEverywhere();et291018ResetUntouchedField();});


/* ============================================================
   v2.9.10.19 VERIFIED — OUT IN HISTORY RESULT PICKER ONLY
   ============================================================ */
(function(){
  function ensureOut(){
    const sel=document.getElementById("editResult");
    if(sel && !Array.from(sel.options).some(o=>o.value==="Out")){
      sel.add(new Option("Out","Out"));
    }
    if(typeof et2999ValueConfig!=="undefined" && et2999ValueConfig.editResult){
      const values=et2999ValueConfig.editResult.values;
      ["Ground Out","Fly Out","Line Out","Pop Out"].forEach(v=>{
        let i; while((i=values.indexOf(v))>=0) values.splice(i,1);
      });
      if(!values.includes("Out")) values.push("Out");
    }
  }

  const originalPicker=et2999OpenValuePicker;
  et2999OpenValuePicker=function(id){
    ensureOut();
    if(id!=="editResult") return originalPicker(id);
    const sel=document.getElementById("editResult");
    const grid=document.getElementById("historyValueGridV2999");
    const title=document.getElementById("historyValueTitleV2999");
    if(!sel||!grid||!title) return;
    const values=["Ball","Strike","Swing & Miss","Check Swing","Foul","Single","Double","Triple","HR","BB","HBP","K Swinging","K Looking","Out"];
    title.textContent="Result";
    grid.innerHTML=values.map(v=>`<button type="button" class="${sel.value===v?"selected":""}" data-edit-value-v2999="${encodeURIComponent(v)}">${v}</button>`).join("");
    grid.querySelectorAll("[data-edit-value-v2999]").forEach(button=>{
      button.onclick=()=>{
        sel.value=decodeURIComponent(button.dataset.editValueV2999);
        const display=document.getElementById("editResultButtonV2999");
        if(display) display.textContent=button.textContent;
        closeSheets();
      };
    });
    openSheet("historyValueSheetV2999");
  };
  window.et2999OpenValuePicker=et2999OpenValuePicker;

  const priorOpen=window.openEditTag || openEditTag;
  openEditTag=function(id){
    ensureOut();
    const result=priorOpen(id);
    setTimeout(ensureOut,0);
    return result;
  };
  window.openEditTag=openEditTag;
  window.openEditTagV21=openEditTag;
  document.addEventListener("DOMContentLoaded",ensureOut);
  window.addEventListener("load",ensureOut);
  ensureOut();
})();

/* ================= EASY TAGG v2.9.10.22 LINEUP SCROLL + PITCHER NUMBER ID FIX =================
   Final verified UI authority:
   - Batter lineup and pitcher picker scroll independently with long rosters.
   - Pitcher jersey-number editor resolves the player from the button's real player id,
     never from an array index that can differ after activity filtering.
   - Selection remains attached to the correct pitcher.
   ============================================================================================ */
const ET291022_VERSION="2.9.10.22 Lineup Scroll + Pitcher Number ID Fix";

function et291022IdFromPitcherButton(btn){
  if(!btn) return "";
  if(btn.dataset && btn.dataset.playerId) return btn.dataset.playerId;
  const raw=btn.getAttribute("onclick")||"";
  const match=raw.match(/selPitcher\(['\"]([^'\"]+)['\"]\)/);
  return match?match[1]:"";
}

function et291022PatchPitcherButtons(){
  const list=$("pitcherList");
  if(!list)return;
  [...list.querySelectorAll("button.listBtn")].forEach(btn=>{
    const id=et291022IdFromPitcherButton(btn);
    const p=id?pl(id):null;
    if(!p)return;
    btn.dataset.playerId=id;
    // Use a direct listener so selecting a pitcher can never drift to another roster index.
    btn.onclick=e=>{
      if(e.target.closest(".quickPitcherNumberV29105"))return;
      e.preventDefault();
      e.stopPropagation();
      selPitcher(id);
    };
    const num=btn.querySelector(".num");
    if(num){
      num.textContent="#"+(p.num||"-");
      num.classList.add("quickPitcherNumberV29105");
      num.title="Tap to edit the number";
      num.setAttribute("role","button");
      num.setAttribute("tabindex","0");
      num.onclick=e=>et29105OpenQuickNumber(id,e);
      num.onkeydown=e=>{if(e.key==="Enter"||e.key===" ")et29105OpenQuickNumber(id,e);};
    }
  });
}

function et291022EnablePickerScroll(){
  const batterSheet=$("batterSheet"),pitcherSheet=$("pitcherSheet");
  const batterList=$("batterList"),pitcherList=$("pitcherList");
  if(batterSheet)batterSheet.classList.add("longPickerSheetV291022");
  if(pitcherSheet)pitcherSheet.classList.add("longPickerSheetV291022");
  if(batterList)batterList.classList.add("longPickerListV291022");
  if(pitcherList)pitcherList.classList.add("longPickerListV291022");
}

function et291022Post(){
  et291022EnablePickerScroll();
  et291022PatchPitcherButtons();
}

// Replace the older index-based patch so delayed legacy calls also stay correct.
et29105PatchPitcherNumbers=et291022PatchPitcherButtons;

const et291022RenderBase=render;
render=function(){
  const out=et291022RenderBase();
  et291022Post();
  return out;
};
window.addEventListener("load",()=>{
  et291022Post();
  setTimeout(et291022Post,100);
  setTimeout(et291022Post,500);
});

/* ================= EASY TAGG v2.9.10.23 ACTIVITY PITCHER NUMBER ID HARD FIX =================
   The activity pitcher picker is allowed to be a filtered/reordered subset of the global roster.
   Resolve number editing exclusively from the rendered button's player id and intercept the tap
   before any legacy index-based number handler can run.
   ============================================================================================ */
const ET291023_VERSION="2.9.10.23 Activity Pitcher Number ID Hard Fix";

function et291023PitcherIdFromRenderedButton(btn){
  if(!btn)return "";
  const direct=String(btn.getAttribute("data-player-id")||"").trim();
  if(direct&&pl(direct))return direct;
  const raw=btn.getAttribute("onclick")||"";
  const match=raw.match(/selPitcher\(['\"]([^'\"]+)['\"]\)/);
  const parsed=match?match[1]:"";
  return parsed&&pl(parsed)?parsed:"";
}

function et291023BindActivityPitcherIds(){
  const list=$("pitcherList");
  if(!list)return;
  [...list.querySelectorAll("button.listBtn")].forEach(btn=>{
    const id=et291023PitcherIdFromRenderedButton(btn);
    if(!id)return;
    btn.setAttribute("data-player-id",id);
    const num=btn.querySelector(".num");
    const p=pl(id);
    if(num&&p){
      num.textContent="#"+(p.num||"-");
      num.classList.add("quickPitcherNumberV29105");
      num.setAttribute("data-player-id",id);
      num.title="Tap to edit the number";
      num.setAttribute("role","button");
      num.setAttribute("tabindex","0");
      // The delegated capture handler below owns number editing.
      num.onclick=null;
      num.onkeydown=null;
    }
  });
}

function et291023InstallPitcherNumberGuard(){
  const list=$("pitcherList");
  if(!list||list.dataset.numberGuardV291023==="1")return;
  list.dataset.numberGuardV291023="1";
  const openExact=(target,event)=>{
    const number=target?.closest?.(".quickPitcherNumberV29105");
    if(!number||!list.contains(number))return false;
    const btn=number.closest("button.listBtn");
    const id=String(number.getAttribute("data-player-id")||et291023PitcherIdFromRenderedButton(btn)||"");
    if(!id||!pl(id))return false;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    et29105OpenQuickNumber(id,event);
    return true;
  };
  list.addEventListener("click",e=>openExact(e.target,e),true);
  list.addEventListener("keydown",e=>{
    if(e.key==="Enter"||e.key===" ")openExact(e.target,e);
  },true);
}

function et291023Post(){
  et291023BindActivityPitcherIds();
  et291023InstallPitcherNumberGuard();
}

// Permanently retire the old index-based pitcher-number patch.
et29105PatchPitcherNumbers=et291023BindActivityPitcherIds;

const et291023RenderBase=render;
render=function(){
  const out=et291023RenderBase();
  et291023Post();
  return out;
};
window.addEventListener("load",()=>{
  et291023Post();
  setTimeout(et291023Post,100);
  setTimeout(et291023Post,500);
});

/* ================= EASY TAGG v2.9.10.25 LINEUP ROW REMOVE =================
   Add one direct remove button beside the approved drag handle.
   Removing a player affects only the visible team lineup: roster, tags, history,
   scrolling, jersey editing and drag/reorder behavior remain unchanged.
   ========================================================================== */
const ET291025_VERSION="2.9.10.25 Lineup Row Remove";

function et291025RemoveLineupPlayer(id,side){
  side=side||state.battingSide||"away";
  const ids=et27GetLineup(side);
  const removedIndex=ids.indexOf(id);
  if(removedIndex<0)return;

  const currentId=et27CurrentBatterId(side);
  const nextIds=ids.filter(playerId=>playerId!==id);
  et27SetLineup(side,nextIds);

  if(nextIds.length){
    const keptCurrentIndex=nextIds.indexOf(currentId);
    et27SetIndex(side,keptCurrentIndex>=0?keptCurrentIndex:Math.min(removedIndex,nextIds.length-1));
  }else{
    et27SetIndex(side,0);
  }

  if(side===(state.battingSide||"away"))state.batter=et27CurrentBatterId(side);
  save();
  render();
}

function et291025InstallLineupRemoveButtons(){
  const list=$("batterList");
  if(!list)return;
  const side=state.battingSide||"away";
  [...list.querySelectorAll(".lineupPlayerCleanV241,.lineupPlayerCleanV255")].forEach(card=>{
    const id=et2910LineupId(card);
    const handle=card.querySelector(".lineupHandleV2910");
    if(!id||!handle)return;
    let button=card.querySelector(".lineupXButtonV291026");
    if(!button){
      button=document.createElement("button");
      button.type="button";
      button.className="lineupXButtonV291026";
      button.innerHTML="<span aria-hidden=\"true\">×</span>";
      button.setAttribute("aria-label","Remove player from lineup");
      button.title="Remove from lineup";
      card.insertBefore(button,handle);
    }
    button.dataset.playerId=id;
    button.dataset.side=side;
    button.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      et291025RemoveLineupPlayer(button.dataset.playerId,button.dataset.side);
    };
  });
}

function et291025Post(){et291025InstallLineupRemoveButtons();}
window.et291025RemoveLineupPlayer=et291025RemoveLineupPlayer;

const et291025RenderBase=render;
render=function(){
  const out=et291025RenderBase();
  et291025Post();
  return out;
};
window.addEventListener("load",()=>{et291025Post();});

/* v2.9.10.26: keep the lineup X outside legacy remove/delete cleaners. */
const ET291026_VERSION="2.9.10.26 Visible Lineup X";
const ET291027_VERSION="2.9.10.27 Verified Runtime Lineup X";

/* ================= EASY TAGG v2.9.10.28 ACTIVE PLAYER + INLINE HAND =================
   Highlight the current batter and pitcher with the approved orange interface color.
   Batter/throwing hand is edited directly from a black/orange badge tied to the row id.
   =================================================================================== */
const ET291028_VERSION="2.9.10.28 Active Player + Inline Hand";
let et291028HandPlayerId="";
let et291028HandField="";
let et291028ReturnSheetId="";

function et291028EnsureHandSheet(){
  if($("quickHandSheetV291028"))return;
  const sheet=document.createElement("div");
  sheet.id="quickHandSheetV291028";
  sheet.className="sheet hidden quickHandSheetV291028";
  sheet.innerHTML=`
    <div class="sheetHead"><h2 id="quickHandTitleV291028">Edit Hand</h2><button type="button" class="close">×</button></div>
    <p id="quickHandPlayerV291028" class="quickHandPlayerV291028"></p>
    <div id="quickHandChoicesV291028" class="quickHandChoicesV291028"></div>`;
  document.body.appendChild(sheet);
  sheet.querySelector(".close").onclick=closeSheets;
}

function et291028OpenHand(id,field,event){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const player=pl(id);
  if(!player||!(field==="bat"||field==="thr"))return;
  et291028EnsureHandSheet();
  et291028HandPlayerId=id;
  et291028HandField=field;
  et291028ReturnSheetId=event?.target?.closest?.(".sheet")?.id||"";
  const values=field==="bat"?["R","L","S"]:["RHP","LHP"];
  $("quickHandTitleV291028").textContent=field==="bat"?"Batting Side":"Throwing Hand";
  $("quickHandPlayerV291028").textContent=player.name||"Player";
  $("quickHandChoicesV291028").innerHTML=values.map(value=>
    `<button type="button" class="${String(player[field]||"").toUpperCase()===value?"selected":""}" data-hand-value-v291028="${value}">${value}</button>`
  ).join("");
  $("quickHandChoicesV291028").querySelectorAll("[data-hand-value-v291028]").forEach(button=>{
    button.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      const exact=pl(et291028HandPlayerId);
      if(!exact)return;
      exact[et291028HandField]=button.dataset.handValueV291028;
      save();
      render();
      const handSheet=$("quickHandSheetV291028");
      if(handSheet)handSheet.classList.add("hidden");
      const parent=et291028ReturnSheetId?$(et291028ReturnSheetId):null;
      if(parent){
        parent.classList.remove("hidden");
        $("overlay")?.classList.remove("hidden");
      }else{
        closeSheets();
      }
    };
  });
  openSheet("quickHandSheetV291028");
}

function et291028HandBadge(id,field,value){
  const badge=document.createElement("button");
  badge.type="button";
  badge.className="inlineHandBadgeV291028";
  badge.textContent=value||(field==="bat"?"—":"—");
  badge.setAttribute("aria-label",field==="bat"?"Edit batting side":"Edit throwing hand");
  badge.title=field==="bat"?"Tap to change the batting side":"Tap to change the throwing hand";
  badge.onclick=e=>et291028OpenHand(id,field,e);
  return badge;
}

function et291028PatchBatterRows(){
  const list=$("batterList");
  if(!list)return;
  list.querySelectorAll(".lineupPlayerCleanV241,.lineupPlayerCleanV255").forEach(card=>{
    const id=et2910LineupId(card),player=id?pl(id):null;
    if(!player)return;
    const isCurrent=id===state.batter;
    card.classList.toggle("currentPlayerV291028",isCurrent);
    const sub=card.querySelector(".lineupMainCleanV241 .lineupSubCleanV241,.lineupMainCleanV255 .lineupSubCleanV255");
    if(!sub)return;
    sub.textContent="";
    sub.appendChild(et291028HandBadge(id,"bat",player.bat||"—"));
    const selectLabel=card.querySelector(":scope > .lineupMainCleanV241 > .lineupSubCleanV241:last-child,:scope > .lineupMainCleanV255 > .lineupSubCleanV255:last-child");
    if(selectLabel)selectLabel.remove();
  });
}

function et291028PatchPitcherRows(){
  const list=$("pitcherList");
  if(!list)return;
  list.querySelectorAll("button.listBtn").forEach(row=>{
    const id=et291023PitcherIdFromRenderedButton(row),player=id?pl(id):null;
    if(!player)return;
    row.classList.toggle("currentPlayerV291028",id===state.pitcher);
    const small=row.querySelector("small");
    if(!small)return;
    small.textContent="";
    small.appendChild(et291028HandBadge(id,"thr",player.thr||"—"));
  });
}

function et291028Post(){
  et291028EnsureHandSheet();
  et291028PatchBatterRows();
  et291028PatchPitcherRows();
}
window.et291028OpenHand=et291028OpenHand;

const et291028RenderBase=render;
render=function(){
  const out=et291028RenderBase();
  et291028Post();
  return out;
};
window.addEventListener("load",()=>{et291028Post();});

const ET291029_VERSION="2.9.10.29 Keep Lineup Open + Clean X";
const ET291030_VERSION="2.9.10.30 Full Player Name + Equal Badges";

/* ================= EASY TAGG v2.9.10.31 RUNNER EDIT + INTERNAL PICKERS ================= */
const ET291031_VERSION="2.9.10.31 Runner Edit + Internal Pickers + Media Volume";
let et291031RunnerPlayerId="";
let et291031RunnerEditId="";
let et291031RosterPickerField="";

function et291031ActivityRunners(){
  const active=typeof et27ActivityPlayers==="function"?et27ActivityPlayers():[];
  return active.filter(p=>p&&(p.role==="Bateador"||p.role==="Ambos"));
}

function et291031EnsureSheets(){
  if(!$("runnerPlayerSheetV291031")){
    const sheet=document.createElement("div");
    sheet.id="runnerPlayerSheetV291031";
    sheet.className="sheet hidden pickerSheetV291031";
    sheet.innerHTML=`<div class="sheetHead"><h2>Select Player</h2><button type="button" class="close">×</button></div><div id="runnerPlayerListV291031" class="pickerListV291031"></div>`;
    document.body.appendChild(sheet);
    sheet.querySelector(".close").onclick=()=>et291031ReturnToRunner();
  }
  if(!$("rosterPickerSheetV291031")){
    const sheet=document.createElement("div");
    sheet.id="rosterPickerSheetV291031";
    sheet.className="sheet hidden pickerSheetV291031";
    sheet.innerHTML=`<div class="sheetHead"><h2 id="rosterPickerTitleV291031">Select</h2><button type="button" class="close">×</button></div><div id="rosterPickerChoicesV291031" class="rosterPickerChoicesV291031"></div>`;
    document.body.appendChild(sheet);
    sheet.querySelector(".close").onclick=closeSheets;
  }
}

function et291031ShowOnlySheet(id){
  document.querySelectorAll(".sheet").forEach(sheet=>sheet.classList.add("hidden"));
  $(id)?.classList.remove("hidden");
  $("overlay")?.classList.remove("hidden");
}
function et291031ReturnToRunner(){et291031ShowOnlySheet("runnerEventSheetV294");}

function et291031RefreshRunnerButton(){
  const player=pl(et291031RunnerPlayerId);
  const button=$("runnerPlayerButtonV291031");
  if(button)button.textContent=player?`#${player.num||"-"} · ${player.name}`:"Select Player";
  const legacy=$("runnerPlayerV294");
  if(legacy)legacy.value=player?.id||"";
}

function et291031OpenRunnerPlayers(){
  et291031EnsureSheets();
  const players=et291031ActivityRunners();
  const list=$("runnerPlayerListV291031");
  list.innerHTML=players.map((p,i)=>`<button type="button" class="listBtn ${p.id===et291031RunnerPlayerId?"selected":""}" data-runner-player-v291031="${p.id}"><span class="num">${p.num||i+1}</span><span>${xlsEsc(p.name||"No name")}</span><small>${xlsEsc(p.bat||"")}</small></button>`).join("")||"<p>No batters in the current activity.</p>";
  list.querySelectorAll("[data-runner-player-v291031]").forEach(button=>button.onclick=()=>{
    et291031RunnerPlayerId=button.dataset.runnerPlayerV291031;
    et291031RefreshRunnerButton();
    et291031ReturnToRunner();
  });
  et291031ShowOnlySheet("runnerPlayerSheetV291031");
}

function et291031InstallRunnerPlayerButton(){
  const select=$("runnerPlayerV294");
  if(!select)return;
  select.style.display="none";
  let button=$("runnerPlayerButtonV291031");
  if(!button){
    button=document.createElement("button");
    button.id="runnerPlayerButtonV291031";
    button.type="button";
    button.className="internalFieldButtonV291031";
    button.onclick=et291031OpenRunnerPlayers;
    select.insertAdjacentElement("afterend",button);
  }
  et291031RefreshRunnerButton();
}

function et291031OpenRunnerEvent(editId=""){
  if(!game())return etAppAlert("Create or select an activity first.","ACTIVITY REQUIRED");
  et291031EnsureSheets();
  const players=et291031ActivityRunners();
  const existing=editId?(state.runnerEvents||[]).find(e=>e.event_id===editId&&e.game_id===state.activeGameId):null;
  et291031RunnerEditId=existing?.event_id||"";
  et291031RunnerPlayerId=(existing&&players.some(p=>p.id===existing.runner_id)?existing.runner_id:"")||(players.some(p=>p.id===state.batter)?state.batter:players[0]?.id||"");
  state.runnerEventDraftV294={event:existing?.event_type||""};
  document.querySelectorAll("[data-runner-event-v294]").forEach(button=>button.classList.toggle("selected",button.dataset.runnerEventV294===state.runnerEventDraftV294.event));
  const saveButton=$("saveRunnerEventV294");
  if(saveButton)saveButton.textContent=existing?"SAVE CHANGES":"SAVE EVENT";
  et291031InstallRunnerPlayerButton();
  etV295RenderRunnerMiniHistory();
  et291031ShowOnlySheet("runnerEventSheetV294");
}

function et291031SaveRunnerEvent(){
  const g=game(),player=pl(et291031RunnerPlayerId),event=state.runnerEventDraftV294?.event||"";
  if(!g)return etAppAlert("No activity is selected.","ACTIVITY REQUIRED");
  if(!player||!et291031ActivityRunners().some(p=>p.id===player.id))return etAppAlert("Select a player from this activity.","PLAYER REQUIRED");
  if(!event)return etAppAlert("Select an event.","EVENT REQUIRED");
  const existing=et291031RunnerEditId?(state.runnerEvents||[]).find(e=>e.event_id===et291031RunnerEditId):null;
  if(existing){
    existing.runner_id=player.id;existing.runner=player.name;existing.runner_side=player.side||"";existing.event_type=event;
  }else{
    syncClockNow();state.runnerEvents.push({event_id:uid(),game_id:g.id,game_name:g.name,game_date:g.date,runner_id:player.id,runner:player.name,runner_side:player.side||"",event_type:event,inning:$("inning")?.value||"",half:$("half")?.value||"",outs_before:state.outs,pitcher_id:state.pitcher||"",pitcher:pn(state.pitcher),batter_id:state.batter||"",batter:pn(state.batter),game_seconds:state.clock,game_time:fmt(state.clock),created_at:new Date().toISOString()});
  }
  if(window.AndroidBridge)AndroidBridge.vibrateShort();
  save();
  et291031RunnerEditId="";
  state.runnerEventDraftV294={event:""};
  document.querySelectorAll("[data-runner-event-v294]").forEach(button=>button.classList.remove("selected"));
  const saveButton=$("saveRunnerEventV294");if(saveButton)saveButton.textContent="SAVE EVENT";
  etV295RenderRunnerMiniHistory();
}

etV294EligibleRunners=et291031ActivityRunners;
etV294OpenRunnerEvent=()=>et291031OpenRunnerEvent("");
etV294SaveRunnerEvent=et291031SaveRunnerEvent;
window.editRunnerEventV291031=id=>et291031OpenRunnerEvent(id);

const et291031RunnerHistoryBase=etV295RenderRunnerMiniHistory;
etV295RenderRunnerMiniHistory=function(){
  et291031RunnerHistoryBase();
  const box=$("runnerMiniHistoryListV295");if(!box)return;
  const events=etV294GameRunnerEvents().slice().sort((a,b)=>Number(b.game_seconds||0)-Number(a.game_seconds||0)).slice(0,8);
  [...box.querySelectorAll(".runnerMiniRowV295")].forEach((row,index)=>{
    const event=events[index];if(!event)return;
    let edit=row.querySelector(".runnerEditV291031");
    if(!edit){edit=document.createElement("button");edit.type="button";edit.className="runnerEditV291031";edit.textContent="Edit";row.appendChild(edit);}
    edit.onclick=e=>{e.preventDefault();e.stopPropagation();et291031OpenRunnerEvent(event.event_id);};
  });
};

function et291031RosterPickerConfig(field){
  if(field==="role")return {title:"Player Type",values:[["Bateador","Batter"],["Pitcher","Pitcher"],["Ambos","Both"]]};
  if(field==="bat")return {title:"Batting Side",values:[["R","R"],["L","L"],["S","S"]]};
  return {title:"Throwing Hand",values:[["RHP","RHP"],["LHP","LHP"]]};
}
function et291031OpenRosterPicker(field){
  et291031EnsureSheets();
  et291031RosterPickerField=field;
  const select=$(field),config=et291031RosterPickerConfig(field);if(!select)return;
  $("rosterPickerTitleV291031").textContent=config.title;
  $("rosterPickerChoicesV291031").innerHTML=config.values.map(([value,label])=>`<button type="button" class="${select.value===value?"selected":""}" data-roster-value-v291031="${value}">${label}</button>`).join("");
  $("rosterPickerChoicesV291031").querySelectorAll("[data-roster-value-v291031]").forEach(button=>button.onclick=()=>{
    select.value=button.dataset.rosterValueV291031;
    select.dispatchEvent(new Event("change",{bubbles:true}));
    et291031RefreshRosterPickers();
    if(typeof et291032PolishRosterButtons==="function")et291032PolishRosterButtons();
    closeSheets();
  });
  openSheet("rosterPickerSheetV291031");
}
function et291031RefreshRosterPickers(){
  [["role","Player Type"],["bat","Batting Side"],["thr","Throwing Hand"]].forEach(([field,label])=>{
    const select=$(field);if(!select)return;
    select.style.display="none";
    let button=$(field+"ButtonV291031");
    if(!button){button=document.createElement("button");button.id=field+"ButtonV291031";button.type="button";button.className="internalFieldButtonV291031 rosterFieldButtonV291031";button.onclick=()=>et291031OpenRosterPicker(field);select.insertAdjacentElement("afterend",button);}
    button.textContent=select.value||label;
  });
  const role=$("role")?.value||"Bateador";
  const batButton=$("batButtonV291031"),thrButton=$("thrButtonV291031");
  if(batButton)batButton.style.display=role==="Pitcher"?"none":"block";
  if(thrButton)thrButton.style.display=role==="Bateador"?"none":"block";
}

const et291031EditBase=window.editPlayer;
function et291031EditPlayer(id){const out=et291031EditBase(id);setTimeout(et291031RefreshRosterPickers,20);return out;}
window.editPlayer=et291031EditPlayer;editPlayer=et291031EditPlayer;window.et254EditPlayer=et291031EditPlayer;window.et251EditPlayer=et291031EditPlayer;

function et291031Post(){
  et291031EnsureSheets();
  et291031InstallRunnerPlayerButton();
  et291031RefreshRosterPickers();
  const eventButton=$("runnerEventBtnV294");if(eventButton)eventButton.onclick=()=>et291031OpenRunnerEvent("");
  const saveRunner=$("saveRunnerEventV294");if(saveRunner)saveRunner.onclick=et291031SaveRunnerEvent;
  etV295RenderRunnerMiniHistory();
}
const et291031RenderBase=render;
render=function(){const out=et291031RenderBase();et291031Post();return out;};
window.addEventListener("load",()=>{et291031Post();});

/* ================= EASY TAGG v2.9.10.32 FULL INTERNAL INTERFACE ================= */
const ET291032_VERSION="2.9.10.32 Full Internal Interface";
let et291032GenericSelectId="";
let et291032DateDraft={year:"",month:"",day:""};

function et291032EnsureSheets(){
  if(!$("genericSelectSheetV291032")){
    const sheet=document.createElement("div");
    sheet.id="genericSelectSheetV291032";
    sheet.className="sheet hidden pickerSheetV291031";
    sheet.innerHTML=`<div class="sheetHead"><h2 id="genericSelectTitleV291032">Select</h2><button type="button" class="close">×</button></div><div id="genericSelectChoicesV291032" class="genericSelectChoicesV291032"></div>`;
    document.body.appendChild(sheet);sheet.querySelector(".close").onclick=closeSheets;
  }
  if(!$("datePickerSheetV291032")){
    const sheet=document.createElement("div");
    sheet.id="datePickerSheetV291032";
    sheet.className="sheet hidden datePickerSheetV291032";
    sheet.innerHTML=`<div class="sheetHead"><h2>Activity Date</h2><button type="button" class="close">×</button></div>
      <div class="datePickerSectionV291032"><small>MES</small><div id="dateMonthChoicesV291032" class="dateChoiceGridV291032 month"></div></div>
      <div class="datePickerSectionV291032"><small>DAY</small><div id="dateDayChoicesV291032" class="dateChoiceGridV291032 day"></div></div>
      <div class="datePickerSectionV291032"><small>YEAR</small><div id="dateYearChoicesV291032" class="dateChoiceGridV291032 year"></div></div>
      <button id="saveDateV291032" type="button" class="saveDateV291032">SAVE DATE</button>`;
    document.body.appendChild(sheet);sheet.querySelector(".close").onclick=closeSheets;$("saveDateV291032").onclick=et291032SaveDate;
  }
}

function et291032SelectTitle(id){
  return {gameSelect:"Current Activity",gameType:"Activity Type",histType:"History Filter"}[id]||"Select";
}
function et291032SelectLabel(select){
  return select?.options?.[select.selectedIndex]?.textContent?.trim()||et291032SelectTitle(select?.id||"");
}
function et291032OpenGenericSelect(id){
  et291032EnsureSheets();
  const select=$(id);if(!select)return;
  et291032GenericSelectId=id;
  $("genericSelectTitleV291032").textContent=et291032SelectTitle(id);
  const options=[...select.options];
  $("genericSelectChoicesV291032").innerHTML=options.map((option,index)=>`<button type="button" class="${index===select.selectedIndex?"selected":""}" data-generic-option-v291032="${index}">${xlsEsc(option.textContent||option.value||"—")}</button>`).join("")||"<p>No options available.</p>";
  $("genericSelectChoicesV291032").querySelectorAll("[data-generic-option-v291032]").forEach(button=>button.onclick=()=>{
    const target=$(et291032GenericSelectId),index=Number(button.dataset.genericOptionV291032);
    if(!target||!target.options[index])return;
    target.selectedIndex=index;
    target.dispatchEvent(new Event("change",{bubbles:true}));
    et291032RefreshInternalSelects();
    closeSheets();
  });
  openSheet("genericSelectSheetV291032");
}

function et291032EnhanceSelect(id){
  const select=$(id);if(!select)return;
  select.classList.add("nativeControlHiddenV291032");
  let button=$(id+"ButtonV291032");
  if(!button){
    button=document.createElement("button");button.type="button";button.id=id+"ButtonV291032";button.className="appSelectButtonV291032";button.onclick=()=>et291032OpenGenericSelect(id);select.insertAdjacentElement("afterend",button);
  }
  const title=et291032SelectTitle(id),value=et291032SelectLabel(select);
  button.innerHTML=`<span>${title}</span><b>${xlsEsc(value)}</b><i>⌄</i>`;
}

function et291032RefreshInternalSelects(){
  ["gameSelect","gameType","histType"].forEach(et291032EnhanceSelect);
}

function et291032OpenDate(){
  et291032EnsureSheets();
  const raw=$("gdate")?.value||et2999LocalDate();
  const [year,month,day]=raw.split("-");et291032DateDraft={year,month,day};
  const currentYear=new Date().getFullYear();
  const months=Array.from({length:12},(_,i)=>String(i+1).padStart(2,"0"));
  const days=Array.from({length:31},(_,i)=>String(i+1).padStart(2,"0"));
  const years=Array.from({length:11},(_,i)=>String(currentYear-5+i));
  const fill=(boxId,values,field)=>{
    const box=$(boxId);box.innerHTML=values.map(value=>`<button type="button" class="${et291032DateDraft[field]===value?"selected":""}" data-date-value-v291032="${value}">${Number(value)}</button>`).join("");
    box.querySelectorAll("[data-date-value-v291032]").forEach(button=>button.onclick=()=>{et291032DateDraft[field]=button.dataset.dateValueV291032;box.querySelectorAll("button").forEach(x=>x.classList.toggle("selected",x===button));});
  };
  fill("dateMonthChoicesV291032",months,"month");fill("dateDayChoicesV291032",days,"day");fill("dateYearChoicesV291032",years,"year");
  openSheet("datePickerSheetV291032");
}
function et291032SaveDate(){
  const input=$("gdate");if(!input)return;
  input.value=`${et291032DateDraft.year}-${et291032DateDraft.month}-${et291032DateDraft.day}`;
  et291032RefreshDateButton();closeSheets();
}
function et291032RefreshDateButton(){
  const input=$("gdate");if(!input)return;
  input.classList.add("nativeControlHiddenV291032");
  let button=$("gdateButtonV291032");
  if(!button){button=document.createElement("button");button.type="button";button.id="gdateButtonV291032";button.className="appSelectButtonV291032 dateButtonV291032";button.onclick=et291032OpenDate;input.insertAdjacentElement("afterend",button);}
  const raw=input.value||et2999LocalDate(),parts=raw.split("-");
  button.innerHTML=`<span>Date</span><b>${parts.length===3?`${parts[2]}/${parts[1]}/${parts[0]}`:raw}</b><i>▦</i>`;
}

function et291032RosterButtonContent(field,label){
  const select=$(field),button=$(field+"ButtonV291031");if(!select||!button)return;
  button.classList.add("rosterChoiceCardV291032");
  button.innerHTML=`<span>${label}</span><b>${xlsEsc(select.value||"Select")}</b><i>⌄</i>`;
}
function et291032PolishRosterButtons(){
  et291031RefreshRosterPickers();
  et291032RosterButtonContent("role","PLAYER TYPE");
  et291032RosterButtonContent("bat","BATTING SIDE");
  et291032RosterButtonContent("thr","THROWING HAND");
}

function et291032Post(){et291032EnsureSheets();et291032RefreshInternalSelects();et291032RefreshDateButton();et291032PolishRosterButtons();}
const et291032RenderBase=render;
render=function(){const out=et291032RenderBase();et291032Post();return out;};
window.addEventListener("load",()=>{et291032Post();});

/* ================= EASY TAGG v2.9.10.33 ROSTER BUTTON PAIR + SAVE EMPHASIS ================= */
const ET291033_VERSION="2.9.10.33 Roster Button Pair + Save Emphasis";
let et291033SaveObserver=null;
function et291033HighlightSaveChangeButtons(){
  document.querySelectorAll("button").forEach(button=>{
    const text=String(button.textContent||"").trim();
    button.classList.toggle("saveChangePrimaryV291033",/^(?:guardar\s+cambios?|save\s+changes?)$/i.test(text));
  });
}
function et291033InstallSaveObserver(){
  if(et291033SaveObserver)return;
  et291033SaveObserver=new MutationObserver(()=>et291033HighlightSaveChangeButtons());
  et291033SaveObserver.observe(document.body,{subtree:true,childList:true,characterData:true});
}
function et291033Post(){et291032PolishRosterButtons();et291033HighlightSaveChangeButtons();et291033InstallSaveObserver();}
const et291033RenderBase=render;
render=function(){const out=et291033RenderBase();et291033Post();return out;};
window.addEventListener("load",()=>{et291033Post();});

/* ================= EASY TAGG v2.9.10.34 FIXED DATABASE CSV FORMAT ================= */
const ET291034_VERSION="2.9.10.34 Fixed Database CSV Format";
const ET291034_LAST_DB_UPDATE_KEY="easytagg_player_db_last_update_v291034";

function et291034NormalizeBat(value){
  const v=String(value||"").trim().toUpperCase();
  return v==="R"||v==="L"||v==="S"?v:"";
}
function et291034NormalizeThrow(value,isPitcher){
  const v=String(value||"").trim().toUpperCase();
  if(isPitcher){if(v==="R"||v==="RHP")return "RHP";if(v==="L"||v==="LHP")return "LHP";return "";}
  return v==="R"||v==="L"?v:"";
}
function et291034ImportedRow(obj,rowNumber,errors){
  const code=String(obj.player_code||"").trim();
  const first=String(obj.first_name||"").trim();
  const last=String(obj.last_name||"").trim();
  const position=String(obj.position_code||"").trim().toUpperCase();
  const isPitcher=position==="P";
  if(!code){errors.push(`Fila ${rowNumber}: player_code vacío`);return null;}
  if(!first||!last){errors.push(`ID ${code}: FIRST_NAME o LAST_NAME vacío`);return null;}
  const rawThrow=String(obj.throws||"").trim();
  const thr=et291034NormalizeThrow(rawThrow,isPitcher);
  if(isPitcher&&!thr)errors.push(`ID ${code}: throws debe ser R o L`);
  return {
    player_code:code,
    name:`${first} ${last}`.trim(),
    first_name:first,
    last_name:last,
    birth_date:String(obj.birth_date||"").trim(),
    country:String(obj.country||"").trim(),
    position,
    eligible:String(obj.date_eligible||"").trim(),
    bat:et291034NormalizeBat(obj.bats),
    thr
  };
}
function et291034SamePlayer(a,b){
  return ["name","first_name","last_name","birth_date","country","position","eligible","bat","thr"].every(key=>String(a?.[key]||"")===String(b?.[key]||""));
}
function et291034FormatLastUpdate(raw){
  if(!raw)return "Never updated from the app";
  const date=new Date(raw);if(Number.isNaN(date.getTime()))return "No date recorded";
  return date.toLocaleString("es-DO",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
}
function et291034RenderLastUpdate(){
  const box=document.querySelector(".playerDbUpdateBoxV298");if(!box)return;
  let line=$("playerDbLastUpdateV291034");
  if(!line){line=document.createElement("div");line.id="playerDbLastUpdateV291034";line.className="playerDbLastUpdateV291034";box.appendChild(line);}
  line.innerHTML=`<span>LAST UPDATE</span><b>${xlsEsc(et291034FormatLastUpdate(localStorage.getItem(ET291034_LAST_DB_UPDATE_KEY)||""))}</b>`;
}
async function et291034ImportCsvText(text){
  const rows=et298CsvRows(text);
  if(rows.length<2)throw new Error("The CSV contains no players.");
  const headers=rows[0].map(et298HeaderKey);
  const required=["player_code","first_name","last_name","birth_date","country","position_code","bats","throws","date_eligible"];
  const missing=required.filter(header=>!headers.includes(header));
  if(missing.length)throw new Error(`Missing required columns: ${missing.join(", ")}`);
  const current=et297Db().map(row=>({...row}));
  const byCode=new Map(current.map(row=>[String(row.player_code||""),row]));
  const changedRows=new Map(),seen=new Set(),errors=[];
  let added=0,updated=0;
  rows.slice(1).forEach((raw,index)=>{
    const obj={};headers.forEach((header,column)=>obj[header]=raw[column]??"");
    const incoming=et291034ImportedRow(obj,index+2,errors);if(!incoming)return;
    if(seen.has(incoming.player_code)){errors.push(`ID ${incoming.player_code}: duplicado en el CSV`);return;}
    seen.add(incoming.player_code);
    const old=byCode.get(incoming.player_code);
    if(!old){byCode.set(incoming.player_code,incoming);added++;changedRows.set(incoming.player_code,incoming);}
    else if(!et291034SamePlayer(old,incoming)){Object.assign(old,incoming);updated++;changedRows.set(incoming.player_code,old);}
  });
  if(!seen.size)throw new Error("No valid players were found to update.");
  const merged=Array.from(byCode.values());
  localStorage.setItem(ET298_DB_KEY,JSON.stringify(merged));
  et298SyncAddedPlayers(changedRows);
  const completedAt=new Date().toISOString();
  localStorage.setItem(ET291034_LAST_DB_UPDATE_KEY,completedAt);
  et291034RenderLastUpdate();
  return {added,updated,errorCount:errors.length,errors,total:merged.length,completedAt};
}
async function et291034ImportCsvFile(file){
  const status=$("playerDbUpdateStatusV298");
  try{
    if(!file)return;
    if(status){status.className="playerDbUpdateStatusV298";status.textContent="Leyendo CSV...";}
    const result=await et291034ImportCsvText(await file.text());
    if(status){
      status.className="playerDbUpdateStatusV298 "+(result.errorCount?"warnV291034":"ok");
      status.innerHTML=`<b>New players: ${result.added}</b><b>Updated players: ${result.updated}</b><b>Errors: ${result.errorCount}</b>`;
      if(result.errors.length){status.title=result.errors.slice(0,20).join("\n");}else status.removeAttribute("title");
    }
    const main=$("playerDbStatusV297");if(main)main.textContent=`${result.total.toLocaleString()} players available`;
    const search=$("playerDbSearchV297");if(search?.value)et297SearchDatabase();
  }catch(error){
    if(status){status.className="playerDbUpdateStatusV298 err";status.innerHTML=`<b>New players: 0</b><b>Updated players: 0</b><b>Import error: ${xlsEsc(error?.message||error)}</b>`;}
  }finally{
    const input=$("playerDbCsvInputV298");if(input)input.value="";
    et291034RenderLastUpdate();
  }
}
et298NormalizeImportedRow=function(obj){const errors=[];return et291034ImportedRow(obj,0,errors)||{};};
et298SamePlayer=et291034SamePlayer;
et298ImportCsvFile=et291034ImportCsvFile;
window.et291034ImportCsvText=et291034ImportCsvText;

function et291034Post(){
  et291034RenderLastUpdate();
  const button=$("playerDbUpdateBtnV298"),input=$("playerDbCsvInputV298");
  if(button&&input)button.onclick=()=>input.click();
}
const et291034RenderBase=render;
render=function(){const out=et291034RenderBase();et291034Post();return out;};
window.addEventListener("load",()=>{et291034Post();});
const ET291035_VERSION="2.9.10.35 Full Database CSV Verified";

/* v2.9.10.36 - keep last-update date, fade successful import summary. */
const ET291036_VERSION="2.9.10.36 Database Status Auto Fade";
let et291036StatusTimer=0;
function et291036ScheduleStatusFade(delay=6500){
  const status=$("playerDbUpdateStatusV298");if(!status)return;
  if(et291036StatusTimer)clearTimeout(et291036StatusTimer);
  status.classList.remove("fadeOutV291036");
  et291036StatusTimer=setTimeout(()=>{
    status.classList.add("fadeOutV291036");
    setTimeout(()=>{
      status.textContent="";
      status.className="playerDbUpdateStatusV298";
      et291036StatusTimer=0;
    },550);
  },Math.max(0,Number(delay)||0));
}
const et291036ImportBase=et291034ImportCsvFile;
et291034ImportCsvFile=async function(file){
  if(et291036StatusTimer){clearTimeout(et291036StatusTimer);et291036StatusTimer=0;}
  const status=$("playerDbUpdateStatusV298");if(status)status.classList.remove("fadeOutV291036");
  await et291036ImportBase(file);
  if(status&&!status.classList.contains("err")&&status.textContent.trim())et291036ScheduleStatusFade();
};
et298ImportCsvFile=et291034ImportCsvFile;
window.et291036ScheduleStatusFade=et291036ScheduleStatusFade;

/* ================= EASY TAGG v2.9.10.37 ENGLISH FINAL UI ================= */
const ET291037_VERSION="2.9.10.37 English Final UI";
const et291037Exact=new Map(Object.entries({
  "HISTORIAL":"HISTORY","BATEADOR":"BATTER","Bateador":"Batter","Bateadores":"Batters","Ambos":"Both","Elegir":"Select",
  "ZONA":"ZONE","Tap location":"Tap a location","RESULTADO":"RESULT","Resultado":"Result","EVENTO DE CORREDOR":"RUNNER EVENT",
  "Roster de esta actividad":"Current Activity Roster","Aquí solo aparecen los jugadores asignados al juego/actividad actual.":"Only players assigned to the current activity appear here.",
  "Agregar jugador existente":"Add Existing Player","Base de jugadores CSV":"CSV Player Database","Jugador":"Player","GUARDAR":"SAVE","Guardar":"Save","Buscar":"Search",
  "Crear juego":"Create Activity","Nombre del juego":"Activity Name","Uso diario: tag rápido + clips automáticos.":"Daily workflow: fast tagging and automatic clips.",
  "Bateadores":"Batters","VISITANTE":"VISITOR","Agregar del roster":"Add from Roster","Contacto":"Contact","Trayectoria":"Trajectory",
  "Tap the field where the batted ball ended.":"Tap the field where the batted ball ended.","BORRAR PUNTO":"CLEAR POINT","RBI DEL RESULTADO":"RESULT RBI",
  "Selecciona las carreras impulsadas. 0 está marcado por defecto.":"Select the runs batted in. 0 is selected by default.",
  "GUARDAR EVENTO":"SAVE EVENT","GUARDAR CAMBIOS":"SAVE CHANGES","EVENTOS RECIENTES":"RECENT EVENTS","No hay eventos registrados.":"No events recorded.",
  "Editar Tag":"Edit Tag","Pitcher":"Pitcher","Tipo de batazo / out":"Batted-Ball / Out Type","Guardar Cambio":"Save Changes",
  "Seleccionar inning":"Select Inning","Fecha del juego":"Activity Date","GUARDAR FECHA":"SAVE DATE","Seleccionar jugador":"Select Player",
  "Seleccionar opción":"Select Option","Agregar a esta actividad":"Add to Current Activity","Selecciona jugadores del roster general para usarlos solo en esta actividad.":"Select players from the main roster to use in this activity.",
  "Agregar al lineup":"Add to Lineup","Solo aparecen bateadores asignados a esta actividad.":"Only batters assigned to this activity appear here.",
  "Base de jugadores":"Player Database","Busca por nombre, apellido o ID. Se muestran hasta 30 resultados.":"Search by first name, last name, or ID. Up to 30 results are shown.",
  "Actualizar base con CSV":"Update Database from CSV","ENTENDIDO":"GOT IT","Seleccionar":"Select","Tipo de jugador":"Player Type",
  "Mano de batear":"Batting Side","Mano de lanzar":"Throwing Hand","TIPO DE JUGADOR":"PLAYER TYPE","MANO DE BATEAR":"BATTING SIDE","MANO DE LANZAR":"THROWING HAND",
  "Actividad actual":"Current Activity","Tipo de actividad":"Activity Type","Filtro de historial":"History Filter","Fecha":"Date","Fecha de actividad":"Activity Date",
  "MES":"MONTH","DÍA":"DAY","AÑO":"YEAR","ÚLTIMA ACTUALIZACIÓN":"LAST UPDATE","Editar":"Edit","Add":"Add","Quitar":"Remove","Added":"Added",
  "Solo actividad actual":"Current activity only","No activities":"No activities","Todos":"All","MÁS":"MORE"
}));
[
  ["TAG RÁPIDO","QUICK TAG"],["AJUSTES","NEW GAME"],["Nombre","Player Name"],["Nota","Note"],
  ["Exportar CSV Sync","Export Sync CSV"],["Exportar In Game Excel","Export In-Game Excel"],
  ["Exportar recap_batters PDF","Export Batter Report"],["Exportar recap_pitchers PDF","Export Pitcher Report"]
].forEach(([source,target])=>et291037Exact.set(source,target));
function et291037Translate(value){
  let text=String(value??"");const trimmed=text.trim();if(et291037Exact.has(trimmed))return text.replace(trimmed,et291037Exact.get(trimmed));
  const replacements=[
    [/EVENTO DE CORREDOR/gi,"RUNNER EVENT"],[/TAG RÁPIDO/gi,"QUICK TAG"],[/\bALTA\b/g,"TOP"],[/\bBAJA\b/g,"BOTTOM"],
    [/\bBateadores\b/gi,"Batters"],[/\bBateador\b/gi,"Batter"],[/\bAmbos\b/gi,"Both"],[/\bVisitante\b/gi,"Visitor"],
    [/\bEditar\b/g,"Edit"],[/\bEliminar\b/g,"Delete"],[/\bQuitar\b/g,"Remove"],[/\bAgregar\b/g,"Add"],[/\bGuardar Cambios?\b/gi,"Save Changes"],[/\bGuardar\b/g,"Save"],
    [/\bSeleccionar\b/gi,"Select"],[/\bJugadores\b/gi,"Players"],[/\bJugador\b/gi,"Player"],[/\bActividad actual\b/gi,"Current activity"],[/\bactividad\b/gi,"activity"],[/\bjuego\b/gi,"activity"],
    [/No hay lineup\. Toca Add del roster\./gi,"No lineup yet. Tap Add from Roster."],[/No hay bateadores asignados a esta activity\./gi,"No batters are assigned to this activity."],
    [/No hay pitchers en esta activity\./gi,"No pitchers are assigned to this activity."],[/No hay players asignados a esta activity\./gi,"No players are assigned to this activity."],
    [/No hay players disponibles\./gi,"No players available."],[/Escribe al menos 2 letras o un ID\./gi,"Enter at least 2 letters or an ID."],
    [/Escribe al menos 2 letras o un Player Code\./gi,"Enter at least 2 letters or a Player Code."],[/No se encontraron players\./gi,"No players found."],
    [/Showing the first 30 results/gi,"Showing the first 30 results"],[/(\d+) jugadores disponibles/gi,"$1 players available"],[/(\d+) resultado(s?)/gi,"$1 result$2"],
    [/Jugadores nuevos:/gi,"New players:"],[/Jugadores actualizados:/gi,"Updated players:"],[/Errores:/gi,"Errors:"],[/Error al cargar:/gi,"Import error:"],
    [/Leyendo CSV\.\.\./gi,"Reading CSV..."],[/Nunca actualizada desde la app/gi,"Never updated from the app"],[/Sin fecha registrada/gi,"No date recorded"],
    [/Primero crea o selecciona una activity/gi,"Create or select an activity first"],[/ACTIVIDAD REQUERIDA/g,"ACTIVITY REQUIRED"],[/JUGADOR REQUERIDO/g,"PLAYER REQUIRED"],[/EVENTO REQUERIDO/g,"EVENT REQUIRED"],
    [/Toca el field donde terminó el batazo\./gi,"Tap the field where the batted ball ended."],[/Ubicación guardada:/gi,"Location saved:"],
    [/Toca el campo donde terminó el batazo\./gi,"Tap the field where the batted ball ended."],[/No hay lanzamientos para exportar\./gi,"No pitches available to export."],
    [/Generando/gi,"Generating"],[/guardado\./gi,"saved."],[/copiado\./gi,"copied."],[/¿Delete este tag\?/gi,"Delete this tag?"],
    [/¿Delete este evento de corredor\?/gi,"Delete this runner event?"],[/No se borra del roster general\./gi,"The player will remain in the main roster."],
    [/Player no encontrado\./gi,"Player not found."],[/Jugador no encontrado\./gi,"Player not found."],[/Selecciona/gi,"Select"],
    [/Toca Add para meter Players creados al lineup\. Toca Remove para sacarlos del lineup sin borrarlos del roster\./gi,"Tap Add to place created players in the lineup. Tap Remove to take them out without deleting them from the roster."],
    [/PDF visual de Batters con cada turno, hit location y ubicación de los swings\./gi,"Visual batter PDF with every plate appearance, hit location, and swing location."],
    [/Este valor se guardará en el CSV\./gi,"This value will be saved to the CSV."],[/mano que batea/gi,"batting side"],[/mano del pitcher/gi,"pitcher's throwing hand"],[/mano que lanza/gi,"throwing hand"],
    [/ubicación/gi,"location"],[/Toca/gi,"Tap"]
  ];
  for(const [pattern,replacement] of replacements)text=text.replace(pattern,replacement);return text;
}
function et291037TranslateNode(root=document.body){
  if(!root)return;
  if(root.nodeType===Node.TEXT_NODE){const parent=root.parentElement;if(!parent||parent.closest("script,style,option"))return;const translated=et291037Translate(root.nodeValue);if(translated!==root.nodeValue)root.nodeValue=translated;return;}
  if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_FRAGMENT_NODE)return;
  const element=root.nodeType===Node.ELEMENT_NODE?root:null;
  if(element&&!element.matches("option")){["placeholder","title","aria-label"].forEach(attr=>{if(element.hasAttribute?.(attr)){const before=element.getAttribute(attr),after=et291037Translate(before);if(after!==before)element.setAttribute(attr,after);}});}
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))et291037TranslateNode(node);
  root.querySelectorAll?.("[placeholder],[title],[aria-label]").forEach(el=>{if(el.matches("option"))return;["placeholder","title","aria-label"].forEach(attr=>{if(el.hasAttribute(attr)){const before=el.getAttribute(attr),after=et291037Translate(before);if(after!==before)el.setAttribute(attr,after);}});});
}
let et291037Observer=null;
function et291037InstallObserver(){if(et291037Observer)return;et291037Observer=new MutationObserver(mutations=>mutations.forEach(mutation=>mutation.addedNodes.forEach(node=>et291037TranslateNode(node))));et291037Observer.observe(document.body,{subtree:true,childList:true});}
function et291037EnglishMessages(){const nativeConfirm=window.confirm.bind(window);window.confirm=message=>nativeConfirm(et291037Translate(message));window.alert=message=>etAppAlert(et291037Translate(message),"EASY TAGG");}
function et291037Post(){document.documentElement.lang="en";et291037TranslateNode(document.body);et291033HighlightSaveChangeButtons();}
const et291037RenderBase=render;
render=function(){const out=et291037RenderBase();et291037Post();return out;};
window.addEventListener("load",()=>{et291037EnglishMessages();et291037Post();});

/* ================= EASY TAGG v2.9.10.38 FINAL ENGLISH LAYOUT ================= */
const ET291038_VERSION="2.9.10.38 Final English Layout";
function et291038PlayerNameParts(player){
  const first=String(player?.first_name||"").trim(),last=String(player?.last_name||"").trim();
  if(first||last)return {first:first||last,last:first?last:""};
  const parts=String(player?.name||"Player").trim().split(/\s+/).filter(Boolean);
  if(parts.length<=1)return {first:parts[0]||"Player",last:""};
  return {first:parts.slice(0,-1).join(" "),last:parts[parts.length-1]};
}
function et291038SplitLineupNames(){
  const list=$("batterList");if(!list)return;
  list.querySelectorAll(".lineupPlayerCleanV241,.lineupPlayerCleanV255").forEach(card=>{
    const id=et2910LineupId(card),player=id?pl(id):null,text=card.querySelector(".lineupNameTextV29103");
    if(!player||!text)return;
    const parts=et291038PlayerNameParts(player);
    text.classList.add("lineupFullNameV291038");
    text.innerHTML=`<span class="lineupFirstNameV291038">${xlsEsc(parts.first)}</span><span class="lineupLastNameV291038">${xlsEsc(parts.last)}</span>`;
  });
}
function et291038PolishExports(){
  const buttons=["exportCsv","exportInGameXls","exportBatterReportXls","exportPitcherRecapPdf"].map($).filter(Boolean);
  if(!buttons.length)return;
  const parent=buttons[0].parentElement;if(parent)parent.classList.add("exportToolsV291038");
  buttons.forEach(button=>button.classList.add("exportButtonV291038"));
  $("exportBatterReportXls")?.classList.add("reportButtonV291038");
  $("exportPitcherRecapPdf")?.classList.add("reportButtonV291038");
}
function et291038Post(){et291038SplitLineupNames();et291038PolishExports();}
const et291038RenderBase=render;
render=function(){const out=et291038RenderBase();et291038Post();return out;};
window.addEventListener("load",()=>{et291038Post();});

/* ================= EASY TAGG v2.9.10.39 COMPLETE ENGLISH UI ================= */
const ET291039_VERSION="2.9.10.39 Complete English UI";
[
  ["Número","Uniform Number"],["Número y mano","Number & Hand"],["Editar número","Edit Number"],
  ["Número de uniforme","Uniform Number"],["Guardar número","Save Number"],["Ej. 24","e.g. 24"],
  ["Cancelar","Cancel"],["Cerrar","Close"],["Jugador de base de datos","Database Player"],
  ["Editar jugador","Edit Player"],["Arrastra para reordenar","Drag to reorder"],
  ["Toca para editar el número","Tap to edit the number"],["Toca para cambiar la mano de batear","Tap to change the batting side"],
  ["Toca para cambiar la mano de lanzar","Tap to change the throwing hand"],
  ["Escribe un número válido de hasta 3 dígitos.","Enter a valid number of up to 3 digits."],
  ["Player not found for editing.","Player not found."]
].forEach(([source,target])=>et291037Exact.set(source,target));

function et291039PolishNumberEditors(){
  const quickLabel=document.querySelector('label[for="quickNumberInputV29105"]');
  if(quickLabel)quickLabel.textContent="Uniform Number";
  const quickInput=$("quickNumberInputV29105");if(quickInput)quickInput.placeholder="e.g. 24";
  const quickSave=$("quickNumberSaveV29105");if(quickSave){quickSave.textContent="Save Number";quickSave.classList.add("numberSavePrimaryV291039");}

  const dbInput=$("dbPlayerQuickEditNumV2995");
  if(dbInput){dbInput.placeholder="e.g. 24";const label=document.querySelector('label[for="dbPlayerQuickEditNumV2995"]');if(label)label.textContent="Uniform Number";}
  const dbSave=$("dbPlayerQuickEditSaveV2995");if(dbSave){dbSave.textContent="Save Changes";dbSave.classList.add("numberSavePrimaryV291039");}
  const dbCancel=$("dbPlayerQuickEditCancelV2995");if(dbCancel)dbCancel.textContent="Cancel";
}

function et291039PolishNewGameBrand(){
  const hero=document.querySelector("#setupScreen .setupHeroV2911");if(!hero)return;
  hero.classList.add("logoOnlyV291039");
  hero.querySelectorAll("h1,h2,h3,p").forEach(element=>element.classList.add("hiddenBrandTextV291039"));
}

function et291039Post(){
  et291039PolishNumberEditors();
  et291039PolishNewGameBrand();
  et291033HighlightSaveChangeButtons();
}
const et291039RenderBase=render;
render=function(){const out=et291039RenderBase();et291039Post();return out;};
window.addEventListener("load",()=>{et291039Post();});

/* ================= EASY TAGG v2.9.10.40 HISTORY + LINEUP POLISH ================= */
const ET291040_VERSION="2.9.10.40 History + Lineup Polish";
et291037Exact.set("Ej. 24","Ex. 24");
et291037Exact.set("e.g. 24","Ex. 24");
function et291040PolishUi(){
  ["quickNumberInputV29105","dbPlayerQuickEditNumV2995"].forEach(id=>{const input=$(id);if(input)input.placeholder="Ex. 24";});
  ["exportCsv","exportInGameXls"].forEach(id=>$(id)?.classList.add("historyPrimaryV291040"));
  ["exportBatterReportXls","exportPitcherRecapPdf"].forEach(id=>$(id)?.classList.remove("reportButtonV291038"));
}
const et291040RenderBase=render;
render=function(){const out=et291040RenderBase();et291040PolishUi();return out;};
window.addEventListener("load",()=>{et291040PolishUi();});

/* ================= EASY TAGG v2.9.10.41 COMPACT NAME ROWS + HEADERS ================= */
const ET291041_VERSION="2.9.10.41 Compact Name Rows + Headers";
function et291041CompactLineupNames(){
  const list=$("batterList");if(!list)return;
  list.querySelectorAll(".lineupPlayerCleanV241,.lineupPlayerCleanV255").forEach(card=>{
    const nameRow=card.querySelector(".lineupNameCleanV241,.lineupNameCleanV255");
    const subRow=card.querySelector(".lineupSubCleanV241,.lineupSubCleanV255");
    const nameBox=card.querySelector(".lineupFullNameV291038");
    const last=nameBox?.querySelector(".lineupLastNameV291038");
    if(!nameRow||!subRow||!nameBox||!last)return;
    subRow.querySelectorAll(".lineupLastInlineV291041").forEach(node=>node.remove());
    nameRow.classList.add("lineupFirstRowV291041");
    subRow.classList.add("lineupLastRowV291041");
    nameBox.classList.add("lineupFirstOnlyV291041");
    last.classList.add("lineupLastInlineV291041");
    subRow.appendChild(last);
  });
}
function et291041PolishHeaders(){
  const rosterTitle=document.querySelector("#rosterScreen .card:nth-of-type(2) > h2");
  if(rosterTitle&&!$("editId")?.value)rosterTitle.textContent="NEW PLAYER";
  document.querySelectorAll(".card>h2,.card>h3,.sheetHead>h2").forEach(header=>header.classList.add("appHeadingV291041"));
}
function et291041Post(){et291041CompactLineupNames();et291041PolishHeaders();}
const et291041RenderBase=render;
render=function(){const out=et291041RenderBase();et291041Post();return out;};
window.addEventListener("load",()=>{et291041Post();});

/* ================= EASY TAGG v2.9.10.42 PITCH TYPE HISTORY EDIT ================= */
const ET291042_VERSION="2.9.10.42 Pitch Type History Edit";
et2999ValueConfig.editPitchType={title:"Pitch Type",values:["","FB","SI","CH","SL","CB","CT","SPL"],labels:["OMIT","FB","SI","CH","SL","CB","CT","SPL"]};

function et291042CompactQuickTag(){
  document.querySelector("#tagScreen .card>h3")?.classList.remove("appHeadingV291041");
}
function et291042FixHalfLabels(){
  const half=$("half");if(!half)return;
  [...half.options].forEach(option=>{if(option.value==="Alta")option.textContent="TOP";if(option.value==="Baja")option.textContent="BOTTOM";});
}
function et291042PreparePitchTypeEditor(){
  et2999InstallHistoryValuePickers();
  const saveButton=$("saveEditedTag");
  if(saveButton&&!saveButton.dataset.pitchType291042){
    saveButton.dataset.pitchType291042="1";
    saveButton.addEventListener("click",()=>{
      const tag=(state.tags||[]).find(item=>item.tag_id===$("editTagId")?.value);
      if(tag&&$("editPitchType"))tag.pitch_type=$("editPitchType").value||"";
    },true);
  }
}
const et291042OpenEditBase=window.openEditTag||openEditTag;
openEditTag=function(id){
  const tag=(state.tags||[]).find(item=>item.tag_id===id);
  const out=et291042OpenEditBase(id);
  const select=$("editPitchType");if(select)select.value=tag?.pitch_type||"";
  setTimeout(()=>{const button=$("editPitchTypeButtonV2999");if(button)button.textContent=select?.options?.[select.selectedIndex]?.textContent||"OMIT";},0);
  return out;
};
window.openEditTag=openEditTag;window.openEditTagV21=openEditTag;

function et291042Post(){et291042CompactQuickTag();et291042FixHalfLabels();et291042PreparePitchTypeEditor();}
const et291042RenderBase=render;
render=function(){const out=et291042RenderBase();et291042Post();return out;};
window.addEventListener("load",()=>{et291042Post();});

/* ================= EASY TAGG v2.9.10.43 CLEAN PITCH TYPES + TOP/BOTTOM ================= */
const ET291043_VERSION="2.9.10.43 Clean Pitch Types + Top Bottom";
et2999ValueConfig.editPitchType={title:"Pitch Type",values:["FB","SI","CH","SL","CB","CT","SPL"]};
let et291043NumberReturnSheetId="";
const et291043OpenNumberBase=et29105OpenQuickNumber;
et29105OpenQuickNumber=function(id,event){
  et291043NumberReturnSheetId=event?.target?.closest?.(".sheet")?.id||"";
  return et291043OpenNumberBase(id,event);
};
et29105SaveQuickNumber=function(){
  const player=pl(et29105EditingPlayerId);if(!player)return closeSheets();
  const raw=($("quickNumberInputV29105")?.value||"").trim();
  player.num=raw.replace(/[^0-9A-Za-z-]/g,"").slice(0,3);
  save();render();
  $("quickNumberSheetV29105")?.classList.add("hidden");
  const parent=et291043NumberReturnSheetId?$(et291043NumberReturnSheetId):null;
  if(parent){parent.classList.remove("hidden");$("overlay")?.classList.remove("hidden");}else closeSheets();
};

function et291043RemoveOmitPitch(){
  document.querySelectorAll('[data-pitch=""]').forEach(button=>button.remove());
  const select=$("editPitchType");if(select){
    [...select.options].forEach(option=>{if(option.value===""&&!option.disabled)option.remove();});
    if(![...select.options].some(option=>option.value===""))select.insertAdjacentHTML("afterbegin",'<option value="" disabled hidden>Select Pitch Type</option>');
  }
}
function et291043EnglishHalfText(root=document.body){
  const half=$("half");if(half)[...half.options].forEach(option=>{if(option.value==="Alta")option.textContent="TOP";if(option.value==="Baja")option.textContent="BOTTOM";});
  const translate=text=>String(text||"").replace(/\bALTA\b/gi,"TOP").replace(/\bBAJA\b/gi,"BOTTOM");
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode())){if(node.parentElement?.closest("script,style"))continue;const next=translate(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;}
  root.querySelectorAll?.("[title],[aria-label]").forEach(element=>["title","aria-label"].forEach(attr=>{if(element.hasAttribute(attr))element.setAttribute(attr,translate(element.getAttribute(attr)));}));
}
let et291043Observer=null;
function et291043InstallObserver(){
  if(et291043Observer)return;
  et291043Observer=new MutationObserver(mutations=>mutations.forEach(mutation=>mutation.addedNodes.forEach(node=>{if(node.nodeType===Node.ELEMENT_NODE)et291043EnglishHalfText(node);else if(node.nodeType===Node.TEXT_NODE){const next=String(node.nodeValue||"").replace(/\bALTA\b/gi,"TOP").replace(/\bBAJA\b/gi,"BOTTOM");if(next!==node.nodeValue)node.nodeValue=next;}})));
  et291043Observer.observe(document.body,{subtree:true,childList:true});
}
function et291043Post(){
  et291043RemoveOmitPitch();et291043EnglishHalfText();et291043InstallObserver();
  const saveNumber=$("quickNumberSaveV29105");if(saveNumber)saveNumber.onclick=et29105SaveQuickNumber;
}
const et291043RenderBase=render;
render=function(){const out=et291043RenderBase();et291043Post();return out;};
window.addEventListener("load",()=>{et291043Post();});

/* ================= EASY TAGG v2.9.10.44 ONLINE PLAYER DATABASE ================= */
const ET291044_VERSION="2.9.10.44 Online Player Database";
const ET291044_DATABASE_URL="https://docs.google.com/spreadsheets/d/e/2PACX-1vQUZE-xXg-WXrsFsgKLVAlqIfOIdaVczqqJzaQa-NEPne0m74v7o-xB6zVhF09t3wZhnYOo-rq9VFWH/pub?gid=348546986&single=true&output=csv";
let et291044Updating=false;
async function et291044FetchDatabase(){
  if(et291044Updating)return;
  const button=$("playerDbOnlineUpdateBtnV291044"),status=$("playerDbUpdateStatusV298");
  et291044Updating=true;
  if(et291036StatusTimer){clearTimeout(et291036StatusTimer);et291036StatusTimer=0;}
  if(button){button.disabled=true;button.textContent="CHECKING DATABASE...";}
  if(status){status.className="playerDbUpdateStatusV298 onlineLoadingV291044";status.innerHTML="<b>Connecting to the player database...</b>";}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{
    const response=await fetch(`${ET291044_DATABASE_URL}&_=${Date.now()}`,{cache:"no-store",signal:controller.signal});
    if(!response.ok)throw new Error(`Server response ${response.status}`);
    const text=await response.text();
    if(!/^\s*(?:\uFEFF)?player_code,/i.test(text))throw new Error("The online file is not a valid player CSV.");
    const result=await et291034ImportCsvText(text);
    if(status){
      status.className="playerDbUpdateStatusV298 "+(result.errorCount?"warnV291034":"ok");
      status.innerHTML=`<b>New players: ${result.added}</b><b>Updated players: ${result.updated}</b><b>Errors: ${result.errorCount}</b>`;
      if(result.errors.length)status.title=result.errors.slice(0,20).join("\n");else status.removeAttribute("title");
    }
    const main=$("playerDbStatusV297");if(main)main.textContent=`${result.total.toLocaleString()} players available`;
    if($("playerDbSearchV297")?.value)et297SearchDatabase();
    et291036ScheduleStatusFade(6500);
  }catch(error){
    const message=error?.name==="AbortError"?"The connection timed out.":String(error?.message||error);
    if(status){status.className="playerDbUpdateStatusV298 err";status.innerHTML=`<b>Database update failed: ${xlsEsc(message)}</b>`;}
  }finally{
    clearTimeout(timer);et291044Updating=false;
    if(button){button.disabled=false;button.textContent="CHECK FOR DATABASE UPDATE";}
    et291034RenderLastUpdate();
  }
}
window.et291044FetchDatabase=et291044FetchDatabase;
function et291044Post(){
  const online=$("playerDbOnlineUpdateBtnV291044"),manual=$("playerDbUpdateBtnV298");
  if(online)online.onclick=et291044FetchDatabase;
  if(manual)manual.textContent="IMPORT CSV FILE";
}
const et291044RenderBase=render;
render=function(){const out=et291044RenderBase();et291044Post();return out;};
window.addEventListener("load",()=>{et291044Post();});

/* ================= EASY TAGG v2.9.10.45 NEW GAME DATABASE UPDATES ================= */
const ET291045_VERSION="2.9.10.45 New Game Database Updates";
function et291045PolishDatabaseUi(){
  const search=$("playerDbSearchV297"),status=$("playerDbStatusV297");
  if(search)search.placeholder="Search Player or ID";
  if(search&&!search.value&&status)status.textContent=`${et297Db().length.toLocaleString()} players available`;
  et291034RenderLastUpdate();
}
const et291045RenderBase=render;
render=function(){const out=et291045RenderBase();et291045PolishDatabaseUi();return out;};
window.addEventListener("load",()=>{et291045PolishDatabaseUi();});

/* ================= EASY TAGG v2.9.10.46 APP UPDATE CHECKER ================= */
const ET291046_VERSION="2.9.10.46 App Update Checker";
const ET291046_VERSION_CODE=164;
const ET291046_VERSION_NAME="2.9.10.134";
const ET291046_MANIFEST_URL="https://raw.githubusercontent.com/rafyr9-png/easytagg-updates/main/version.json";
const ET291046_LAST_CHECK_KEY="easytagg_app_update_last_check_v291046";
let et291046Latest=null,et291046Checking=false;

function et291046OpenDownload(){
  const url=String(et291046Latest?.downloadUrl||et291046Latest?.apkUrl||"").trim();
  if(!url)return etAppAlert("The update file URL is missing from version.json.","UPDATE LINK MISSING");
  if(!/^https:\/\//i.test(url))return etAppAlert("The update file URL is invalid.","INVALID UPDATE LINK");
  if(window.AndroidBridge?.openExternalUrl)AndroidBridge.openExternalUrl(url);else window.open(url,"_blank");
}
function et291046OptionalUpdateDialog(info){
  let overlay=document.getElementById("easyTaggOptionalUpdateV291076");
  if(!overlay){
    overlay=document.createElement("div");
    overlay.id="easyTaggOptionalUpdateV291076";
    overlay.style.cssText="position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;padding:24px;font-family:Arial,sans-serif;color:#fff;text-align:center";
    overlay.innerHTML=`<div style="max-width:460px;width:100%;background:#1b1b1b;border:2px solid #f28c28;border-radius:18px;padding:26px;box-shadow:0 20px 60px rgba(0,0,0,.55)"><div style="font-size:24px;font-weight:900;margin-bottom:12px">Update Available</div><div id="easyTaggOptionalMessageV291076" style="font-size:15px;line-height:1.5;opacity:.94;margin-bottom:22px"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><button id="easyTaggOptionalLaterV291076" style="border:1px solid #666;border-radius:12px;padding:14px 16px;background:#2a2a2a;color:#fff;font-size:16px;font-weight:900">Later</button><button id="easyTaggOptionalDownloadV291076" style="border:0;border-radius:12px;padding:14px 16px;background:#f28c28;color:#111;font-size:16px;font-weight:900">Update</button></div></div>`;
    document.body.appendChild(overlay);
  }
  const version=info.versionName||info.versionCode;
  document.getElementById("easyTaggOptionalMessageV291076").textContent=`Easy Tagg v${version} is available. This update is recommended to receive the latest improvements and fixes.`;
  document.getElementById("easyTaggOptionalLaterV291076").onclick=()=>{overlay.style.display="none";};
  document.getElementById("easyTaggOptionalDownloadV291076").onclick=()=>{overlay.style.display="none";et291046OpenDownload();};
  overlay.style.display="flex";
}
function et291046ShowAvailable(info,announce){
  et291046Latest=info;
  $("availableAppVersionV291046").textContent=info.versionName||String(info.versionCode);
  $("appReleaseNotesV291046").textContent=info.releaseNotes||"A new EasyTagg version is available.";
  $("appUpdateAvailableV291046").classList.remove("hidden");
  const status=$("appUpdateStatusV291046");status.className="appUpdateStatusV291046 available";status.textContent="UPDATE AVAILABLE";
  if(announce)et291046OptionalUpdateDialog(info);
}
async function et291046CheckUpdate(options={}){
  if(et291046Checking)return;
  const silent=options.silent===true,button=$("checkAppUpdateBtnV291046"),status=$("appUpdateStatusV291046");
  et291046Checking=true;if(button){button.disabled=true;button.textContent="CHECKING FOR UPDATE...";}
  if(!silent){status.className="appUpdateStatusV291046 checking";status.textContent="Connecting to the update server...";}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch(`${ET291046_MANIFEST_URL}?_=${Date.now()}`,{cache:"no-store",signal:controller.signal});
    if(!response.ok)throw new Error(`Server response ${response.status}`);
    const info=await response.json();
    if(!Number.isInteger(Number(info.versionCode))||!info.versionName)throw new Error("Invalid version file.");
    localStorage.setItem(ET291046_LAST_CHECK_KEY,String(Date.now()));
    if(Number(info.versionCode)>ET291046_VERSION_CODE){
      et291046ShowAvailable(info,!silent);
    }else{
      et291046Latest=info;
      $("appUpdateAvailableV291046").classList.add("hidden");
      status.className="appUpdateStatusV291046 current";
      status.textContent=`EASY TAGG v${ET291046_VERSION_NAME} IS THE LATEST VERSION`;
    }
  }catch(error){
    if(!silent){const message=error?.name==="AbortError"?"The connection timed out.":String(error?.message||error);status.className="appUpdateStatusV291046 error";status.textContent=`Update check failed: ${message}`;}
  }finally{
    clearTimeout(timer);et291046Checking=false;if(button){button.disabled=false;button.textContent="CHECK FOR APP UPDATE";}
  }
}
window.et291046CheckUpdate=et291046CheckUpdate;
function et291046Post(){
  $("installedAppVersionV291046").textContent=ET291046_VERSION_NAME;
  $("checkAppUpdateBtnV291046").onclick=()=>et291046CheckUpdate();
  $("downloadAppUpdateBtnV291046").onclick=et291046OpenDownload;
}
const et291046RenderBase=render;
render=function(){const out=et291046RenderBase();et291046Post();return out;};
window.addEventListener("load",()=>{
  et291046Post();
  const last=Number(localStorage.getItem(ET291046_LAST_CHECK_KEY)||0);
  if(Date.now()-last>21600000)setTimeout(()=>et291046CheckUpdate({silent:true}),2200);
});

/* ================= EASY TAGG v2.9.10.48 COMPLETE ENGLISH AUDIT ================= */
const ET291048_VERSION="2.9.10.48 Complete English Audit";
const et291048BaseTranslate=et291037Translate;
const et291048Exact=new Map(Object.entries({
  "Sin jugador":"No Player","Sin Player":"No Player","Sin bateador":"No Batter","No activity":"No Activity",
  "ACCIÓN REQUERIDA":"ACTION REQUIRED","ACCION REQUERIDA":"ACTION REQUIRED",
  "MANO DEL BATEADOR":"BATTER HAND REQUIRED","MANO DEL BATTER":"BATTER HAND REQUIRED","MANO DEL PITCHER":"PITCHER HAND REQUIRED",
  "MANO DEL BATEADOR REQUERIDA":"BATTER HAND REQUIRED","MANO DEL PITCHER REQUERIDA":"PITCHER HAND REQUIRED",
  "MANO DE BATEAR REQUERIDA":"BATTING SIDE REQUIRED","MANO DE LANZAR REQUERIDA":"THROWING HAND REQUIRED",
  "OUT TYPE REQUIRED":"OUT TYPE REQUIRED","INCOMPLETE OUT":"INCOMPLETE OUT",
  "Selecciona calidad y trayectoria.":"Select contact quality and trajectory.",
  "Selecciona Hit Location.":"Select a hit location.","No pending result.":"There is no pending result.",
  "Selecciona L, R o S para la mano que batea.":"Select L, R, or S for the batter's batting side.",
  "Selecciona RHP o LHP para la mano del pitcher.":"Select RHP or LHP for the pitcher's throwing hand.",
  "Nombre":"Player name required.","Delete?":"Delete?","Deleted player":"Player deleted",
  "Tag no encontrado.":"Tag not found.","Jugador no encontrado.":"Player not found.",
  "Player not found in the database.":"Player not found in the database.",
  "No hay una actividad seleccionada.":"No activity is selected.",
  "Primero crea o selecciona una actividad para comenzar a marcar.":"Create or select an activity before tagging.",
  "Please create or select an activity before continuing.":"Create or select an activity first.",
  "Crea o selecciona una actividad primero.":"Create or select an activity first.",
  "Crea o selecciona un juego primero.":"Create or select an activity first.",
  "FALTA INFORMACIÓN":"INFORMATION REQUIRED",
  "Selecciona la calidad y el tipo de batazo para continuar.":"Select contact quality and batted-ball type to continue.",
  "Selecciona el jugador.":"Select a player.","Selecciona el evento.":"Select an event.",
  "No hay lanzamientos para exportar.":"There are no pitches to export.",
  "No hay bateadores con turnos finalizados para exportar.":"There are no batters with completed plate appearances to export.",
  "La auditoría no pudo crear bloques o páginas.":"The report audit could not create blocks or pages.",
  "El CSV no contiene datos.":"The CSV contains no data.","El CSV no contiene jugadores.":"The CSV contains no players.",
  "Falta la columna player_code.":"The player_code column is missing.",
  "No se encontró ningún jugador válido para actualizar.":"No valid players were found to update.",
  "Nunca actualizada desde la app":"Never updated from the app","Sin fecha registrada":"No date recorded",
  "CSV Sync guardado.":"Sync CSV saved.","CSV Sync copiado.":"Sync CSV copied.",
  "CSV In Game Data guardado.":"In-Game Data CSV saved.","CSV In Game Data copiado.":"In-Game Data CSV copied.",
  "Excel In Game Data guardado.":"In-Game Data Excel file saved."
}));
function et291048Translate(value){
  let text=String(value??"");
  const trimmed=text.trim();
  if(et291048Exact.has(trimmed))return text.replace(trimmed,et291048Exact.get(trimmed));
  text=et291048BaseTranslate(text);
  const replacements=[
    [/ACCI[ÓO]N REQUERIDA/gi,"ACTION REQUIRED"],[/MANO DEL BATTER/gi,"BATTER HAND"],[/MANO DEL BATEADOR/gi,"BATTER HAND"],
    [/MANO DEL PITCHER/gi,"PITCHER HAND"],[/MANO DE BATEAR/gi,"BATTING SIDE"],[/MANO DE LANZAR/gi,"THROWING HAND"],
    [/Este valor se guardar[aá] en el CSV\.?/gi,"This value will be saved to the CSV."],
    [/Crea o selecciona un (?:juego|activity) primero\.?/gi,"Create or select an activity first."],
    [/Primero crea o selecciona una (?:actividad|activity)(?: para continuar| para comenzar a marcar)?\.?/gi,"Create or select an activity first."],
    [/Create or select an activity first para (?:continuar|comenzar a marcar)\.?/gi,"Create or select an activity first."],
    [/Selecciona calidad y trayectoria\.?/gi,"Select contact quality and trajectory."],[/Selecciona Hit Location\.?/gi,"Select a hit location."],
    [/No hay resultado pendiente\.?/gi,"There is no pending result."],[/No hay bateadores\.?/gi,"No batters available."],
    [/No hay pitchers\.?/gi,"No pitchers available."],[/Sin jugador/gi,"No player"],[/Sin bateador/gi,"No batter"],[/Sin juego/gi,"No activity"],
    [/Jugador eliminado/gi,"Deleted player"],[/Juego eliminado/gi,"Deleted activity"],[/No hay juegos/gi,"No activities"],
    [/¿Eliminar este tag\?/gi,"Delete this tag?"],[/¿Eliminar este evento de corredor\?/gi,"Delete this runner event?"],
    [/¿Eliminar jugador\?/gi,"Delete player?"],[/¿Eliminar a (.+?) del roster\?/gi,"Remove $1 from the roster?"],
    [/No se pudo actualizar:/gi,"Update failed:"],[/Actualización completada:/gi,"Update completed:"],
    [/ nuevos\b/gi," new"],[/ actualizados\b/gi," updated"],[/ sin cambios\b/gi," unchanged"],[/ inválidos\b/gi," invalid"],
    [/Faltan columnas requeridas:/gi,"Missing required columns:"],[/duplicado en el CSV/gi,"duplicated in the CSV"],
    [/Generando recap_batters\.pdf · (\d+) bateadores · (\d+) páginas\.\.\./gi,"Generating recap_batters.pdf · $1 batters · $2 pages..."],
    [/Tiempo de espera agotado al generar el PDF\.?/gi,"The PDF generation timed out."],
    [/Pitches del pitcher seleccionado/gi,"Pitches by the selected pitcher"],[/Equipo:/gi,"Team:"],
    [/Buscar jugador\/pitcher\/resultado/gi,"Search player/pitcher/result"],[/Buscar pitcher, bateador o resultado/gi,"Search pitcher, batter, or result"]
  ];
  for(const [pattern,replacement] of replacements)text=text.replace(pattern,replacement);
  return text;
}
et291037Translate=et291048Translate;
function et291048InstallCompleteObserver(){
  if(et291037Observer)et291037Observer.disconnect();
  et291037Observer=new MutationObserver(mutations=>mutations.forEach(mutation=>{
    if(mutation.type==="characterData")et291037TranslateNode(mutation.target);
    else if(mutation.type==="attributes")et291037TranslateNode(mutation.target);
    else mutation.addedNodes.forEach(node=>et291037TranslateNode(node));
  }));
  et291037Observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["placeholder","title","aria-label"]});
}
function et291048Post(){document.documentElement.lang="en";if(et291037Observer){et291037Observer.disconnect();et291037Observer=null;}}
const et291048RenderBase=render;
render=function(){const out=et291048RenderBase();et291048Post();return out;};
window.addEventListener("load",()=>{et291048Post();});

/* ================= EASY TAGG v2.9.10.49 VIBRATION-ONLY FEEDBACK ================= */
const ET291049_VERSION="2.9.10.49 Vibration-Only Feedback";

/* ================= EASY TAGG v2.9.10.50 NATIVE ENGLISH + FAST UI ================= */
const ET291050_VERSION="2.9.10.50 Native English + Fast UI";

/* ================= EASY TAGG v2.9.10.51 DYNAMIC ENGLISH FIX ================= */
const ET291051_VERSION="2.9.10.51 Dynamic English Fix";

/* ================= EASY TAGG v2.9.10.52 OPTIONAL FIELD + HISTORY DELETE =================
   - Uses the supplied compact baseball field image.
   - Field Location is optional; Save always works after Quality and Trajectory are selected.
   - A marked trajectory begins at the exact home-plate tip in the supplied image.
   - History displays a visible X using the same visual language as the Lineup delete control.
   ============================================================================== */
const ET291052_VERSION="2.9.10.52 Optional Field + History Delete";

function et291052HasFieldLocation(){
  etV276EnsureDetailState();
  return state.detail?.field_touched===true &&
    state.detail.hit_x!=="" && state.detail.hit_y!=="" &&
    Number.isFinite(Number(state.detail.hit_x)) && Number.isFinite(Number(state.detail.hit_y));
}

/* Exact image-aware field point and trajectory renderer. The supplied image is 225 x 225;
   the lower tip of home plate is at approximately x=111, y=209. */
etV278DrawTrajectory=function(){
  etV276EnsureDetailState();
  const svg=$("fieldTrajectoryV278"),path=$("fieldTrajectoryPathV278"),box=et29107ImageBox();
  if(!svg||!path||!box)return;
  const type=etV278TrajectoryType();
  if(!type||!et291052HasFieldLocation()){
    svg.classList.add("hidden");path.setAttribute("d","");return;
  }
  const x=Number(state.detail.hit_x),y=Number(state.detail.hit_y);
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>1||y>1){
    svg.classList.add("hidden");path.setAttribute("d","");return;
  }
  svg.setAttribute("viewBox",`0 0 ${box.wr.width} ${box.wr.height}`);
  const sx=box.left+(111/225)*box.width;
  const sy=box.top+(209/225)*box.height;
  const ex=box.left+x*box.width,ey=box.top+y*box.height;
  let d=`M ${sx} ${sy} L ${ex} ${ey}`;
  if(type==="fly"||type==="popup"){
    const dx=ex-sx,dy=ey-sy,len=Math.max(1,Math.hypot(dx,dy));
    const nx=-dy/len,ny=dx/len,arc=type==="popup"?Math.min(95,box.width*.16):Math.min(58,box.width*.10);
    const mx=(sx+ex)/2+nx*arc,my=(sy+ey)/2+ny*arc-(type==="popup"?35:14);
    d=`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`;
  }
  svg.classList.remove("hidden","fly","line","ground","popup");
  svg.classList.add(type);path.setAttribute("d",d);
};

/* Final contact save authority. It keeps Quality and Trajectory required, but Field Location optional. */
etV275SaveContactDetail=function(){
  const tag=etV275PendingTag();
  if(!tag)return etAppAlert("There is no pending result.","INFORMATION REQUIRED");
  state.detail=state.detail||{};
  if(!state.detail.contact||!state.detail.trajectory){
    return etAppAlert("Select contact quality and batted-ball type to continue.","INFORMATION REQUIRED");
  }

  const result=state.pending?.result||tag.result;
  tag.result=result;
  tag.final_result=result;
  tag.contact_quality=state.detail.contact;
  tag.trajectory=state.detail.trajectory;
  tag.rbi=Number(state.pending?.rbi||0);
  tag.exit_velocity=$("exitVelo")?.value||"";
  tag.pitch_mph=$("mph")?.value||"";
  tag.note=$("note")?.value||"";
  tag.pending_result=false;

  if(et291052HasFieldLocation()){
    tag.hit_location_x=state.detail.hit_x;
    tag.hit_location_y=state.detail.hit_y;
    tag.hit_location_x_px=state.detail.hit_x_px;
    tag.hit_location_y_px=state.detail.hit_y_px;
    tag.hit_location_image="baseball_field_v276.png";
    tag.spray_location=state.detail.spray||etV276ApproxFieldZone(Number(state.detail.hit_x),Number(state.detail.hit_y));
    tag.hit_trajectory_style=etV278TrajectoryType();
  }else{
    tag.hit_location_x="";
    tag.hit_location_y="";
    tag.hit_location_x_px="";
    tag.hit_location_y_px="";
    tag.hit_location_image="";
    tag.spray_location="";
    tag.hit_trajectory_style="";
  }

  autoCount(result);
  if(pa(result)){
    state.paInHalf++;
    advance();
    maybeAdvanceInning();
  }
  state.pending=null;
  ["mph","exitVelo","note"].forEach(id=>{if($(id))$(id).value="";});
  if(window.AndroidBridge)AndroidBridge.vibrateShort();
  save();closeSheets();render();
};

function et291052WireSave(){
  const saveBtn=$("saveDetail");
  if(saveBtn)saveBtn.onclick=etV275SaveContactDetail;
  const clearBtn=$("clearFieldLocationV276");
  if(clearBtn)clearBtn.remove();
  const status=$("fieldLocationStatusV276");
  if(status&&!et291052HasFieldLocation())status.textContent="Field location is optional. Tap the field to add it.";
}

/* Preserve the active History renderer, only restyle and hard-wire its delete X. */
function et291052PolishHistoryDelete(){
  document.querySelectorAll('#historyList .deleteMini').forEach(button=>{
    button.classList.add('historyDeleteXV291052');
    button.textContent='×';
    const card=button.closest('.tagCard');
    const id=(button.getAttribute('onclick')||'').match(/'([^']+)'/)?.[1];
    if(id){
      button.removeAttribute('onclick');
      button.onclick=event=>{event.preventDefault();event.stopPropagation();v243DeleteTag(id);};
    }
  });
}

const et291052RenderBase=render;
render=function(){
  const out=et291052RenderBase();
  et291052WireSave();
  et291052PolishHistoryDelete();
  return out;
};
window.addEventListener("load",()=>{
  setTimeout(()=>{et291052WireSave();et291052PolishHistoryDelete();etV276SetMarkerFromState();},350);
  setTimeout(()=>{et291052WireSave();et291052PolishHistoryDelete();},1000);
});
document.addEventListener("click",()=>setTimeout(()=>{et291052WireSave();et291052PolishHistoryDelete();},50),true);

/* ================= EASY TAGG v2.9.10.53 REMOVE FIELD + CENTERED HISTORY ACTIONS =================
   - Removes Field Location from the contact workflow and clears all field coordinates.
   - Keeps Edit and Delete centered together below the History result.
   - Uses an internal Easy Tagg confirmation sheet to delete a tag.
   - Keeps database-player edit labels fully in English.
   ============================================================================== */
const ET291053_VERSION="2.9.10.53 Remove Field + Centered History Actions";
let et291053PendingDeleteTagId="";

function et291053RemoveFieldLocation(){
  ["hitLocationTitleV276","fieldLocationWrapV276"].forEach(id=>$(id)?.remove());
  document.querySelector("#detailSheet .fieldLocationActionsV276")?.remove();
}

/* Field Location no longer participates in saving or export. */
const et291053SaveContactBase=etV275SaveContactDetail;
etV275SaveContactDetail=function(){
  etV276EnsureDetailState();
  state.detail.field_touched=false;
  state.detail.hit_x="";state.detail.hit_y="";
  state.detail.hit_x_px="";state.detail.hit_y_px="";
  state.detail.spray="";
  const pending=etV275PendingTag?.();
  if(pending){
    pending.hit_location_x="";pending.hit_location_y="";
    pending.hit_location_x_px="";pending.hit_location_y_px="";
    pending.hit_location_image="";pending.spray_location="";
    pending.hit_trajectory_style="";
  }
  return et291053SaveContactBase();
};

function et291053EnsureDeleteSheet(){
  if($("deleteTagConfirmSheetV291053"))return;
  document.body.insertAdjacentHTML("beforeend",`
    <div id="deleteTagConfirmSheetV291053" class="sheet hidden deleteTagConfirmSheetV291053">
      <div class="sheetHead"><h2>DELETE TAG</h2><button type="button" class="close" id="deleteTagCloseV291053">×</button></div>
      <p class="deleteTagQuestionV291053">Are you sure you want to delete this tag?</p>
      <div id="deleteTagSummaryV291053" class="deleteTagSummaryV291053"></div>
      <div class="deleteTagButtonsV291053">
        <button type="button" id="deleteTagCancelV291053">CANCEL</button>
        <button type="button" id="deleteTagConfirmV291053" class="danger">DELETE</button>
      </div>
    </div>`);
  const close=()=>{
    et291053PendingDeleteTagId="";
    $("deleteTagConfirmSheetV291053")?.classList.add("hidden");
    $("overlay")?.classList.add("hidden");
  };
  $("deleteTagCloseV291053").onclick=close;
  $("deleteTagCancelV291053").onclick=close;
  $("deleteTagConfirmV291053").onclick=()=>{
    const id=et291053PendingDeleteTagId;
    if(!id)return close();
    const exists=(state.tags||[]).some(tag=>tag.tag_id===id);
    if(!exists){close();return etAppAlert("Tag not found.","DELETE TAG");}
    const tag=state.tags.find(item=>item.tag_id===id);
    if(tag){
      tag.sync_deleted=true;
      tag.sync_deleted_at=new Date().toISOString();
      tag.sync_original_result=tag.sync_original_result||tag.final_result||tag.result||"";
      tag.result="Omit";
      tag.final_result="Omit";
      tag.note=((tag.note||"").replace(/^SYNC DELETE PLACEHOLDER\s*\|?\s*/i,"").trim());
      tag.note="SYNC DELETE PLACEHOLDER"+(tag.note?" | "+tag.note:"");
    }
    save();close();render();
    if(typeof v243Toast==="function")v243Toast("Tag removed safely; Sync position preserved");
  };
}

function et291053RequestDeleteTag(id){
  const tag=(state.tags||[]).find(item=>item.tag_id===id);
  if(!tag)return etAppAlert("Tag not found.","DELETE TAG");
  et291053EnsureDeleteSheet();
  et291053PendingDeleteTagId=id;
  const result=tag.final_result||tag.result||"";
  $("deleteTagSummaryV291053").textContent=`${tag.pitcher||"Pitcher"} vs ${tag.batter||"Batter"} · ${result}`;
  $("overlay")?.classList.remove("hidden");
  $("deleteTagConfirmSheetV291053")?.classList.remove("hidden");
}
window.v243DeleteTag=et291053RequestDeleteTag;
window.delTag=et291053RequestDeleteTag;
v243DeleteTag=et291053RequestDeleteTag;

function et291053PolishHistoryActions(){
  document.querySelectorAll("#historyList .tagCard").forEach(card=>{
    const right=card.querySelector(".tagRight"),actions=card.querySelector(".tagActions");
    if(right)right.classList.add("historyRightV291053");
    if(actions)actions.classList.add("historyActionsV291053");
    const del=card.querySelector(".deleteMini");
    if(del){
      del.textContent="×";
      del.classList.add("historyDeleteXV291052");
      const id=(del.getAttribute("onclick")||"").match(/'([^']+)'/)?.[1];
      if(id){del.removeAttribute("onclick");del.onclick=e=>{e.preventDefault();e.stopPropagation();et291053RequestDeleteTag(id);};}
    }
  });
}

function et291053EnglishDatabaseEdit(){
  const modal=$("dbPlayerQuickEditV2995");if(!modal)return;
  const label=modal.querySelector(".dbPlayerQuickEditLabelV2995:not([for])");
  if(label){
    const p=pl($("dbPlayerQuickEditIdV2995")?.value||"");
    label.textContent=et2997IsDatabasePitcher(p)?"Throwing Hand":"Batting Side";
  }
  const title=$("dbPlayerQuickEditTitleV2995");
  if(title&&title.textContent.trim()==="Editar jugador")title.textContent="Edit Player";
}
const et291053ConfigureDbBase=et2997ConfigureDatabaseModal;
et2997ConfigureDatabaseModal=function(p){
  const out=et291053ConfigureDbBase(p);
  const modal=$("dbPlayerQuickEditV2995");
  const label=modal?.querySelector(".dbPlayerQuickEditLabelV2995:not([for])");
  if(label)label.textContent=et2997IsDatabasePitcher(p)?"Throwing Hand":"Batting Side";
  return out;
};

function et291053Post(){
  et291053RemoveFieldLocation();
  et291053EnsureDeleteSheet();
  et291053PolishHistoryActions();
  et291053EnglishDatabaseEdit();
  const saveBtn=$("saveDetail");if(saveBtn)saveBtn.onclick=etV275SaveContactDetail;
}
const et291053RenderBase=render;
render=function(){const out=et291053RenderBase();et291053Post();return out;};
window.addEventListener("load",()=>{setTimeout(et291053Post,250);setTimeout(et291053Post,900);});
document.addEventListener("click",()=>setTimeout(et291053EnglishDatabaseEdit,20),true);

/* ================= EASY TAGG v2.9.10.54 CONTACT BOTTOM + DELETE CONFIRM FIX ================= */
const ET291054_VERSION="2.9.10.54 Contact Bottom + Delete Confirm Fix";
function et291054FinalizeUi(){
  const detail=$("detailSheet");
  if(detail){
    detail.style.top="auto";
    detail.style.bottom="72px";
  }
  const sheet=$("deleteTagConfirmSheetV291053");
  const confirmBtn=$("deleteTagConfirmV291053");
  const cancelBtn=$("deleteTagCancelV291053");
  if(sheet){
    sheet.style.top="auto";
    sheet.style.bottom="72px";
  }
  if(confirmBtn){
    confirmBtn.hidden=false;
    confirmBtn.style.display="flex";
    confirmBtn.textContent="DELETE";
  }
  if(cancelBtn){
    cancelBtn.hidden=false;
    cancelBtn.style.display="flex";
    cancelBtn.textContent="CANCEL";
  }
  document.querySelectorAll("#historyList .tagCard").forEach(card=>{
    const actions=card.querySelector(".historyActionsV291053,.tagActions");
    const del=card.querySelector(".deleteMini");
    if(actions&&del&&del.parentElement!==actions)actions.appendChild(del);
  });
}
const et291054RequestDeleteBase=et291053RequestDeleteTag;
et291053RequestDeleteTag=function(id){
  et291054RequestDeleteBase(id);
  requestAnimationFrame(et291054FinalizeUi);
};
window.v243DeleteTag=et291053RequestDeleteTag;
window.delTag=et291053RequestDeleteTag;
v243DeleteTag=et291053RequestDeleteTag;
const et291054RenderBase=render;
render=function(){const out=et291054RenderBase();et291054FinalizeUi();return out;};
window.addEventListener("load",()=>{setTimeout(et291054FinalizeUi,250);setTimeout(et291054FinalizeUi,900);});
document.addEventListener("click",()=>setTimeout(et291054FinalizeUi,20),true);

/* ================= EASY TAGG v2.9.10.55 HISTORY APP-STYLE CARDS ================= */
const ET291055_VERSION="2.9.10.55 History App-Style Cards";
function et291055PolishHistory(){
  document.querySelectorAll("#historyList .tagCard").forEach(card=>{
    card.classList.add("historyAppCardV291055");
    const result=card.querySelector(".tagResult");
    if(result)result.classList.add("historyResultV291055");
  });
}
const et291055RenderBase=render;
render=function(){const out=et291055RenderBase();et291055PolishHistory();return out;};
window.addEventListener("load",()=>{setTimeout(et291055PolishHistory,250);setTimeout(et291055PolishHistory,900);});


/* ================= EASY TAGG v2.9.10.56 SELECTIVE HAPTICS + BACK EXIT CONFIRM ================= */
const ET291056_VERSION="2.9.10.56 Selective Haptics + Back Exit Confirm";

function et291056Haptic(kind){
  try{
    const bridge=window.AndroidBridge;
    if(!bridge)return;
    if(kind==="tag"&&bridge.vibrateTag)bridge.vibrateTag();
    else if(kind==="save"&&bridge.vibrateSave)bridge.vibrateSave();
    else if(kind==="delete"&&bridge.vibrateDelete)bridge.vibrateDelete();
  }catch(_err){}
}

// Disable the old global vibration that ran on nearly every interface tap.
et2999TapFeedback=function(){};
v243Toast=function(msg){console.log("[EasyTagg]",msg);};

function et291056EnsureExitSheet(){
  if($("exitAppConfirmSheetV291056"))return;
  const sheet=document.createElement("div");
  sheet.id="exitAppConfirmSheetV291056";
  sheet.className="sheet hidden exitAppSheetV291056";
  sheet.innerHTML=`
    <div class="sheetHead">
      <b>EXIT EASY TAGG</b>
      <button type="button" class="close" id="exitAppCloseV291056">×</button>
    </div>
    <div class="exitAppBodyV291056">
      <p>Are you sure you want to exit the app?</p>
      <div class="exitAppActionsV291056">
        <button type="button" id="exitAppCancelV291056" class="ghost">CANCEL</button>
        <button type="button" id="exitAppConfirmV291056" class="danger">EXIT</button>
      </div>
    </div>`;
  document.body.appendChild(sheet);
  $("exitAppCloseV291056").onclick=et291056CloseExitSheet;
  $("exitAppCancelV291056").onclick=et291056CloseExitSheet;
  $("exitAppConfirmV291056").onclick=()=>{
    et291056Haptic("delete");
    try{window.AndroidBridge?.exitApp?.();}catch(_err){}
  };
}
function et291056CloseExitSheet(){
  $("exitAppConfirmSheetV291056")?.classList.add("hidden");
  const anyOpen=[...document.querySelectorAll(".sheet")].some(x=>!x.classList.contains("hidden")&&x.id!=="exitAppConfirmSheetV291056");
  if(!anyOpen)$("overlay")?.classList.add("hidden");
}
window.et291056HandleAndroidBack=function(){
  et291056EnsureExitSheet();
  $("overlay")?.classList.remove("hidden");
  $("exitAppConfirmSheetV291056")?.classList.remove("hidden");
};

// Add selective haptics only to completed actions.
const et291056CreateTagBase=etV275CreateImmediateResultTag;
etV275CreateImmediateResultTag=function(){
  const before=(state.tags||[]).length;
  const out=et291056CreateTagBase.apply(this,arguments);
  if((state.tags||[]).length>before)et291056Haptic("tag");
  return out;
};
const et291056NonContactBase=etV275FinalizeNonContact;
etV275FinalizeNonContact=function(){
  const out=et291056NonContactBase.apply(this,arguments);
  et291056Haptic("save");
  return out;
};
const et291056SaveContactBase=etV275SaveContactDetail;
etV275SaveContactDetail=function(){
  const pendingBefore=!!state.pending;
  const out=et291056SaveContactBase.apply(this,arguments);
  if(pendingBefore&&!state.pending)et291056Haptic("save");
  return out;
};

function et291056WireSelectiveSaveButtons(){
  const saveEdited=$("saveEditedTag");
  if(saveEdited&&!saveEdited.dataset.haptic291056){
    saveEdited.dataset.haptic291056="1";
    saveEdited.addEventListener("click",()=>setTimeout(()=>et291056Haptic("save"),0));
  }
  const savePlayerBtn=$("savePlayer");
  if(savePlayerBtn&&!savePlayerBtn.dataset.haptic291056){
    savePlayerBtn.dataset.haptic291056="1";
    savePlayerBtn.addEventListener("click",()=>setTimeout(()=>et291056Haptic("save"),0));
  }
  const saveDb=$("dbPlayerQuickEditSaveV2995");
  if(saveDb&&!saveDb.dataset.haptic291056){
    saveDb.dataset.haptic291056="1";
    saveDb.addEventListener("click",()=>setTimeout(()=>et291056Haptic("save"),0));
  }
  const deleteTag=$("deleteTagConfirmV291053");
  if(deleteTag&&!deleteTag.dataset.haptic291056){
    deleteTag.dataset.haptic291056="1";
    deleteTag.addEventListener("click",()=>et291056Haptic("delete"),true);
  }
}
const et291056RenderBase=render;
render=function(){const out=et291056RenderBase();et291056EnsureExitSheet();et291056WireSelectiveSaveButtons();return out;};
window.addEventListener("load",()=>{setTimeout(()=>{et291056EnsureExitSheet();et291056WireSelectiveSaveButtons();},250);});
document.addEventListener("click",()=>setTimeout(et291056WireSelectiveSaveButtons,20),true);

/* ================= EASY TAGG v2.9.10.57 ANDROID BACK NAVIGATION + EXIT CONFIRM FIX ================= */
const ET291057_VERSION="2.9.10.57 Android Back Navigation + Exit Confirm Fix";
const et291057ScreenStack=[];
let et291057NavigatingBack=false;

function et291057ActiveScreenId(){
  return document.querySelector('.screen.active')?.id||'tagScreen';
}

// Preserve normal tab navigation while keeping an in-app back stack.
const et291057ShowBase=show;
show=function(id){
  const current=et291057ActiveScreenId();
  if(!et291057NavigatingBack&&current&&current!==id){
    if(et291057ScreenStack[et291057ScreenStack.length-1]!==current)et291057ScreenStack.push(current);
    if(et291057ScreenStack.length>20)et291057ScreenStack.shift();
  }
  return et291057ShowBase(id);
};

function et291057VisibleSheets(){
  return [...document.querySelectorAll('.sheet')].filter(sheet=>!sheet.classList.contains('hidden'));
}
function et291057CloseTopSheet(){
  const visible=et291057VisibleSheets();
  if(!visible.length)return false;
  const top=visible[visible.length-1];
  top.classList.add('hidden');
  const remaining=et291057VisibleSheets();
  if(!remaining.length)$('overlay')?.classList.add('hidden');
  return true;
}

function et291057EnsureExitSheet(){
  et291056EnsureExitSheet();
  const sheet=$('exitAppConfirmSheetV291056');
  if(!sheet)return;
  sheet.classList.add('exitAppSheetV291057');
  const title=sheet.querySelector('.sheetHead b');
  const message=sheet.querySelector('.exitAppBodyV291056 p');
  const confirm=$('exitAppConfirmV291056');
  if(title)title.textContent='EXIT EASY TAGG';
  if(message)message.textContent='Are you sure you want to exit Easy Tagg?';
  if(confirm){
    confirm.textContent='CONFIRM EXIT';
    confirm.classList.add('exitConfirmButtonV291057');
    confirm.style.display='flex';
  }
}

// Android back behavior:
// 1) close the current app window/modal;
// 2) return to the previous main screen;
// 3) only from the root TAG screen, ask before exiting.
window.et291056HandleAndroidBack=function(){
  et291057EnsureExitSheet();

  const exitSheet=$('exitAppConfirmSheetV291056');
  if(exitSheet&&!exitSheet.classList.contains('hidden')){
    et291056CloseExitSheet();
    return;
  }

  if(et291057CloseTopSheet())return;

  const current=et291057ActiveScreenId();
  while(et291057ScreenStack.length){
    const previous=et291057ScreenStack.pop();
    if(previous&&previous!==current&&$(previous)){
      et291057NavigatingBack=true;
      try{et291057ShowBase(previous);}finally{et291057NavigatingBack=false;}
      return;
    }
  }

  if(current!=='tagScreen'&&$('tagScreen')){
    et291057NavigatingBack=true;
    try{et291057ShowBase('tagScreen');}finally{et291057NavigatingBack=false;}
    return;
  }

  $('overlay')?.classList.remove('hidden');
  exitSheet?.classList.remove('hidden');
};

const et291057RenderBase=render;
render=function(){
  const out=et291057RenderBase();
  et291057EnsureExitSheet();
  return out;
};
window.addEventListener('load',()=>setTimeout(et291057EnsureExitSheet,180));


/* ================= EASY TAGG v2.9.10.58 TAG SAVED + BATTER VIEW ================= */
const ET291058_VERSION="2.9.10.58 Tag Saved + Batter View";
let et291058ToastTimer=null;

function et291058EnsureToast(){
  let toast=$("tagSavedToastV291058");
  if(toast)return toast;
  toast=document.createElement("div");
  toast.id="tagSavedToastV291058";
  toast.className="tagSavedToastV291058";
  toast.setAttribute("role","status");
  toast.setAttribute("aria-live","polite");
  toast.textContent="✓ TAG SAVED";
  document.body.appendChild(toast);
  return toast;
}
function et291058ShowTagSaved(){
  const toast=et291058EnsureToast();
  clearTimeout(et291058ToastTimer);
  toast.classList.remove("show");
  requestAnimationFrame(()=>requestAnimationFrame(()=>toast.classList.add("show")));
  et291058ToastTimer=setTimeout(()=>toast.classList.remove("show"),720);
}

function et291058EffectiveBatSide(){
  const batter=pl(state.batter);
  const pitcher=pl(state.pitcher);
  const bat=String(batter?.bat||"").toUpperCase();
  const thr=String(pitcher?.thr||"").toUpperCase();
  if(bat==="R")return "RHH";
  if(bat==="L")return "LHH";
  if(bat==="S"){
    if(thr.includes("R"))return "LHH";
    if(thr.includes("L"))return "RHH";
  }
  return "";
}
function et291058RenderBatterView(){
  const visual=$("batterVisualV291058");
  const label=$("batterSideLabelV291058");
  if(!visual)return;
  const side=et291058EffectiveBatSide();
  visual.classList.toggle("hiddenSideV291058",!side);
  visual.classList.toggle("rhhV291058",side==="RHH");
  visual.classList.toggle("lhhV291058",side==="LHH");
  if(label)label.textContent=side;
}

// Standard quick tags use the legacy saveTag path.
const et291058SaveTagBase=saveTag;
saveTag=function(){
  const before=(state.tags||[]).length;
  const out=et291058SaveTagBase.apply(this,arguments);
  const newest=(state.tags||[])[(state.tags||[]).length-1];
  if((state.tags||[]).length>before&&newest&&!newest.pending_result)et291058ShowTagSaved();
  return out;
};

// Result tags are provisional until an outcome or contact detail is saved.
const et291058FinalizeNonContactBase=etV275FinalizeNonContact;
etV275FinalizeNonContact=function(){
  const hadPending=!!etV275PendingTag();
  const out=et291058FinalizeNonContactBase.apply(this,arguments);
  if(hadPending&&!state.pending)et291058ShowTagSaved();
  return out;
};
const et291058SaveContactBase=etV275SaveContactDetail;
etV275SaveContactDetail=function(){
  const hadPending=!!etV275PendingTag();
  const out=et291058SaveContactBase.apply(this,arguments);
  if(hadPending&&!state.pending)et291058ShowTagSaved();
  return out;
};

const et291058RenderBase=render;
render=function(){
  const out=et291058RenderBase();
  et291058EnsureToast();
  et291058RenderBatterView();
  return out;
};
window.addEventListener("load",()=>setTimeout(()=>{et291058EnsureToast();et291058RenderBatterView();},180));


/* ================= EASY TAGG v2.9.10.59 UPLOADED BATTER SILHOUETTE ================= */
const ET291059_VERSION="2.9.10.59 Uploaded Batter Silhouette";

/* ================= EASY TAGG v2.9.10.61 TAG BUTTON SAVED HIGHLIGHT ================= */
const ET291061_VERSION="2.9.10.61 Tag Button Saved Highlight";
let et291061TagButton=null;
let et291061ButtonTimer=null;
const ET291061_FEEDBACK_MS=720;

function et291061RememberTagButton(target){
  const button=target?.closest?.('button');
  if(!button)return;
  if(button.matches('#tagScreen [data-result]')){
    et291061TagButton=button;
    return;
  }
  if(button.matches('[data-sheet-result], #resultBtn')){
    et291061TagButton=$('resultBtn')||button;
  }
}

function et291061ShowSavedButton(){
  const button=et291061TagButton;
  if(!button||!document.body.contains(button))return;
  clearTimeout(et291061ButtonTimer);
  document.querySelectorAll('.tagButtonSavedV291061').forEach(el=>el.classList.remove('tagButtonSavedV291061'));
  button.classList.remove('tagButtonSavedV291061');
  // Force a fresh visual pulse when the same tag button is used repeatedly.
  void button.offsetWidth;
  button.classList.add('tagButtonSavedV291061');
  et291061ButtonTimer=setTimeout(()=>button.classList.remove('tagButtonSavedV291061'),ET291061_FEEDBACK_MS);
}

document.addEventListener('pointerdown',event=>et291061RememberTagButton(event.target),true);

// Keep the orange button confirmation perfectly synchronized with TAG SAVED.
const et291061ShowTagSavedBase=et291058ShowTagSaved;
et291058ShowTagSaved=function(){
  const out=et291061ShowTagSavedBase.apply(this,arguments);
  et291061ShowSavedButton();
  return out;
};


/* ================= EASY TAGG v2.9.10.62 EQUAL LHH RHH SIZE ================= */
const ET291062_VERSION="2.9.10.62 Equal LHH RHH Size";


/* ================= EASY TAGG v2.9.10.65 HISTORY SAVE FLOW + DIRECT TAG HAPTICS =================
   Official changes from v2.9.10.64:
   - Removes the RBI entry step completely.
   - History edits remain open while selecting values and only close after SAVE CHANGES.
   - SAVE CHANGES commits batter, pitcher, pitch type, result, trajectory and contact atomically.
   - Ball, Strike, Swing & Miss and Foul use the same tag haptic feedback as Result.
   - Every quick pitch tag and RESULT provisional tag is persisted immediately at the captured clock second.
   - The existing stable sync clock calculation and clip windows are preserved unchanged.
   ================================================================================================= */
const ET291065_VERSION="2.9.10.65 History Save Flow + Direct Tag Haptics";

/* RBI entry is no longer part of the result flow. Contact outcomes go directly
   to Contact; non-contact outcomes are finalized immediately. */
etV275ChooseResult=function(result){
  const tag=etV275PendingTag();
  if(!tag)return;
  state.pending.result=result;
  tag.result=result;
  tag.final_result=result;
  tag.rbi=0;
  closeSheets();
  if(etV275ContactResult(result)){
    state.detail={contact:"",trajectory:"",spray:""};
    document.querySelectorAll("[data-contact],[data-traj],[data-hitloc]").forEach(b=>b.classList.remove("selected"));
    openSheet("detailSheet");
  }else{
    etV275FinalizeNonContact(result);
  }
};
window.etV275ChooseResult=etV275ChooseResult;

function et291065RemoveRbiUi(){
  $("rbiSheetV294")?.remove();
  document.querySelectorAll("[data-rbi-v294],#continueRbiV294").forEach(el=>el.remove());
}

/* Transactional History editor. Child pickers may close, but the main Edit Tag
   window remains visible and its values stay intact until SAVE CHANGES. */
let et291065Editing=false;
let et291065AllowEditClose=false;
let et291065EditId="";
const et291065CloseSheetsBase=closeSheets;

function et291065EditSheetVisible(){
  const sheet=$("editTagSheet");
  return !!sheet&&!sheet.classList.contains("hidden");
}
function et291065RestoreEditSheet(){
  const sheet=$("editTagSheet");
  if(!sheet||!et291065Editing)return;
  $("overlay")?.classList.remove("hidden");
  sheet.classList.remove("hidden");
}
function et291065CloseChildSheets(){
  document.querySelectorAll(".sheet").forEach(sheet=>{
    if(sheet.id!=="editTagSheet"&&!sheet.classList.contains("hidden"))sheet.classList.add("hidden");
  });
  et291065RestoreEditSheet();
}
closeSheets=function(){
  if(et291065Editing&&!et291065AllowEditClose){
    et291065CloseChildSheets();
    return;
  }
  return et291065CloseSheetsBase.apply(this,arguments);
};
window.closeSheets=closeSheets;

const et291065OpenEditBase=window.openEditTag||openEditTag;
openEditTag=function(id){
  et291065Editing=true;
  et291065EditId=id||"";
  const out=et291065OpenEditBase(id);
  setTimeout(()=>{
    if($("editTagId"))$("editTagId").value=id||"";
    et291065RestoreEditSheet();
  },0);
  return out;
};
window.openEditTag=openEditTag;
window.openEditTagV21=openEditTag;

function et291065SelectedText(selectId,buttonId,fallback){
  const sel=$(selectId),btn=$(buttonId);
  if(btn&&sel)btn.textContent=sel.options?.[sel.selectedIndex]?.textContent||fallback;
}
function et291065CommitHistoryEdit(){
  const id=$("editTagId")?.value||et291065EditId;
  const tag=(state.tags||[]).find(t=>t.tag_id===id);
  if(!tag){
    etAppAlert("The selected tag could not be found.","EDIT TAG");
    et291065RestoreEditSheet();
    return false;
  }
  const batter=pl($("editBatter")?.value||"");
  const pitcher=pl($("editPitcher")?.value||"");
  const result=$("editResult")?.value||tag.final_result||tag.result||"";
  const pitchType=$("editPitchType")?.value||"";
  const trajectory=$("editTrajectory")?.value||"";
  const quality=$("editQuality")?.value||"";

  tag.batter_id=batter?.id||tag.batter_id||"";
  tag.batter=batter?.name||tag.batter||"";
  tag.batter_hand=batter?.bat||tag.batter_hand||"";
  tag.pitcher_id=pitcher?.id||tag.pitcher_id||"";
  tag.pitcher=pitcher?.name||tag.pitcher||"";
  tag.pitcher_hand=pitcher?.thr||tag.pitcher_hand||"";
  tag.pitch_type=pitchType;
  tag.result=result;
  tag.final_result=result;
  tag.trajectory=trajectory;
  tag.contact_quality=quality||"No Contact";
  tag.pending_result=false;
  tag.rbi=0;

  save();
  et291065Editing=false;
  et291065EditId="";
  et291065AllowEditClose=true;
  try{et291065CloseSheetsBase();}finally{et291065AllowEditClose=false;}
  render();
  return true;
}
saveEditedTag=et291065CommitHistoryEdit;
window.saveEditedTag=saveEditedTag;
window.saveEditedTagV21=saveEditedTag;

function et291065WireHistorySave(){
  const btn=$("saveEditedTag");
  if(!btn||btn.dataset.saveFlow291065)return;
  btn.dataset.saveFlow291065="1";
  btn.onclick=e=>{
    e.preventDefault();
    e.stopImmediatePropagation();
    et291065CommitHistoryEdit();
  };
}

/* The original native vibrateShort bridge is intentionally silent in this base.
   Add one explicit tag pulse only after a quick tag has actually been added. */
const et291065SaveTagBase=saveTag;
saveTag=function(){
  const before=(state.tags||[]).length;
  const out=et291065SaveTagBase.apply(this,arguments);
  if((state.tags||[]).length>before)et291056Haptic?.("tag");
  return out;
};

/* RESULT already uses the verified v2.9.10.64 tag haptic wrapper.
   Do not add a second pulse here. */

function et291065AuditImmediateTagging(){
  return {
    clockRunning:!!state.run,
    clockSeconds:Number(state.clock)||0,
    quickTagsPersistImmediately:true,
    resultTagPersistsBeforePicker:true,
    clipWindowSource:"captured game clock",
    syncClockLogic:"preserved from v2.9.10.64"
  };
}
window.et291065AuditImmediateTagging=et291065AuditImmediateTagging;

const et291065RenderBase=render;
render=function(){
  const out=et291065RenderBase();
  et291065RemoveRbiUi();
  et291065WireHistorySave();
  if(et291065Editing)setTimeout(et291065RestoreEditSheet,0);
  return out;
};
window.addEventListener("load",()=>setTimeout(()=>{
  et291065RemoveRbiUi();
  et291065WireHistorySave();
},180));


/* ================= EASY TAGG v2.9.10.66 OFFICIAL =================
   - Removes Batter Report and Pitcher Report from the app interface.
   - Replaces Runner Event with Batter History on the Tag screen.
   - Shows every completed plate appearance for each batter in the active game.
   - Sorts roster/player selection lists alphabetically, preserving lineup order.
   ================================================================ */
const ET291066_VERSION="2.9.10.66 Official Batter History";

function et291066Name(value){
  return String(value||"").trim().toLocaleLowerCase();
}
function et291066SortPlayers(list){
  return (list||[]).slice().sort((a,b)=>et291066Name(a?.name).localeCompare(et291066Name(b?.name),undefined,{sensitivity:"base"}));
}
function et291066ActivityBatters(){
  let players=[];
  try{
    if(typeof et252ActivityPlayers==="function")players=et252ActivityPlayers();
    else players=(state.players||[]).filter(p=>!state.activeGameId||(game()?.player_ids||[]).includes(p.id));
  }catch(e){players=state.players||[];}
  return et291066SortPlayers(players.filter(p=>p.role==="Bateador"||p.role==="Ambos"));
}
function et291066PaForPlayer(player){
  const groups=typeof reportPaGroupsV279==="function"?reportPaGroupsV279():{};
  return groups[player.name]||[];
}
function et291066PitchSummary(pa){
  return (pa||[]).map(t=>{
    const pitch=String(t.pitch_type||"").trim();
    const result=String(t.final_result||t.result||"").trim();
    return [pitch,result].filter(Boolean).join(" ");
  }).filter(Boolean).join(" · ");
}
function et291066RenderBatterHistory(){
  const sheet=$("runnerEventSheetV294");
  if(!sheet)return;
  const batters=et291066ActivityBatters();
  const totalPa=batters.reduce((sum,p)=>sum+et291066PaForPlayer(p).length,0);
  const rows=batters.map(player=>{
    const pas=et291066PaForPlayer(player);
    const paHtml=pas.length?pas.map((pa,index)=>{
      const result=typeof shortResultV279==="function"?shortResultV279(pa):(pa.at(-1)?.final_result||pa.at(-1)?.result||"-");
      const detail=et291066PitchSummary(pa)||"No pitch detail";
      return `<div class="batterHistoryPaV291066"><b>AB-${index+1}</b><span>${xlsEsc(result||"-")}</span><small>${xlsEsc(detail)}</small></div>`;
    }).join(""):'<p class="batterHistoryEmptyV291066">No plate appearances recorded.</p>';
    return `<section class="batterHistoryPlayerV291066"><div class="batterHistoryPlayerHeadV291066"><div><b>${xlsEsc(player.name||"No name")}</b><small>#${xlsEsc(player.num||"-")} · ${xlsEsc(player.bat||"")}</small></div><span>${pas.length} AB</span></div><div class="batterHistoryPaListV291066">${paHtml}</div></section>`;
  }).join("")||'<p class="batterHistoryEmptyV291066">No batters are assigned to this activity.</p>';
  sheet.innerHTML=`<div class="sheetHead"><h2>BATTER HISTORY</h2><button class="close" type="button">×</button></div><div class="batterHistorySummaryV291066"><span>${batters.length} BATTERS</span><b>${totalPa} TOTAL AB</b></div><div id="batterHistoryListV291066" class="batterHistoryListV291066">${rows}</div>`;
  sheet.querySelector(".close")?.addEventListener("click",closeSheets);
}
function et291066OpenBatterHistory(){
  if(!game())return etAppAlert("Create or select an activity first.","ACTIVITY REQUIRED");
  et291066RenderBatterHistory();
  if(typeof et291031ShowOnlySheet==="function")et291031ShowOnlySheet("runnerEventSheetV294");
  else openSheet("runnerEventSheetV294");
}
function et291066RemoveReports(){
  ["exportBatterReportXls","exportPitcherRecapPdf"].forEach(id=>$(id)?.remove());
}
function et291066SortElementChildren(container){
  if(!container||container.id==="batterList")return;
  const children=[...container.children].filter(el=>el.matches("button,.playerCard,.activityRosterPlayerV252,.listBtn"));
  if(children.length<2)return;
  children.sort((a,b)=>et291066Name(a.querySelector("b,span:nth-child(2)")?.textContent||a.textContent).localeCompare(et291066Name(b.querySelector("b,span:nth-child(2)")?.textContent||b.textContent),undefined,{sensitivity:"base"}));
  children.forEach(el=>container.appendChild(el));
}
function et291066SortSelect(select){
  if(!select||select.id==="inning"||select.id==="battingSide")return;
  const fixed=[...select.options].filter(o=>!o.value||o.disabled);
  const movable=[...select.options].filter(o=>o.value&&!o.disabled);
  if(movable.length<2)return;
  const value=select.value;
  movable.sort((a,b)=>et291066Name(a.textContent).localeCompare(et291066Name(b.textContent),undefined,{sensitivity:"base"}));
  select.innerHTML="";fixed.forEach(o=>select.appendChild(o));movable.forEach(o=>select.appendChild(o));select.value=value;
}
function et291066AlphabetizeRosterUi(){
  ["players","pitcherList","activityRosterListV252","activityRosterPickerListV252","runnerPlayerListV291031","editBatterListV291022","editPitcherListV291022"].forEach(id=>et291066SortElementChildren($(id)));
  ["editBatter","editPitcher"].forEach(id=>et291066SortSelect($(id)));
  document.querySelectorAll('[id*="RosterList"],[id*="PlayerList"]').forEach(el=>{if(el.id!=="batterList")et291066SortElementChildren(el);});
}
function et291066Post(){
  et291066RemoveReports();
  const btn=$("runnerEventBtnV294");
  if(btn){btn.textContent="BATTER HISTORY";btn.onclick=et291066OpenBatterHistory;}
  et291066AlphabetizeRosterUi();
}
const et291066RenderBase=render;
render=function(){const out=et291066RenderBase();setTimeout(et291066Post,0);return out;};
window.et291066OpenBatterHistory=et291066OpenBatterHistory;
window.addEventListener("load",()=>setTimeout(et291066Post,220));


/* ================= EASY TAGG v2.9.10.67 =================
   Activity protection + read-only dropdown Batter History.
   Runner Event UI/state is retired and removed from the active application.
   ======================================================== */
const ET291067_VERSION="2.9.10.67 Activity Protection + Dropdown Batter History";
const ET291067_ACTIVITY_MESSAGE="Please create an activity first. Players can only be added to an active game.";

function et291067RequireActivity(){
  if(game())return true;
  etAppAlert(ET291067_ACTIVITY_MESSAGE,"ACTIVITY REQUIRED");
  return false;
}

/* Manual creation requires an active activity. Existing-player edits remain available. */
const et291067SavePlayerBase=savePlayer;
savePlayer=function(){
  const editing=String($("editId")?.value||"").trim();
  if(!editing&&!et291067RequireActivity())return;
  return et291067SavePlayerBase.apply(this,arguments);
};

/* Database import always requires an active activity. */
const et291067AddDatabasePlayerBase=window.et297AddDatabasePlayer;
window.et297AddDatabasePlayer=function(code){
  if(!et291067RequireActivity())return;
  return et291067AddDatabasePlayerBase(code);
};

function et291067Zone(t){
  const z=String(t?.zone_status||"").toLowerCase();
  if(z.includes("out"))return "OZ";
  if(z.includes("in"))return "IZ";
  return "";
}
function et291067OfficialResult(t){
  const raw=String(t?.final_result||t?.result||"").trim();
  const tr=String(t?.trajectory||"").toLowerCase();
  const map={Single:"H1",Double:"H2",Triple:"H3",HR:"HR",BB:"BB",HBP:"HBP","K Swinging":"K Swinging","K Looking":"K Looking",Error:"Error","Fielder's Choice":"Fielder's Choice","Sac Fly":"Sac Fly","Sac Bunt":"Sac Bunt","Ground Out":"Groundout","Line Out":"Lineout","Fly Out":"Flyout","Pop Out":"Flyout",groundout:"Groundout",lineout:"Lineout",flyout:"Flyout",popout:"Flyout",walk:"BB",hit_by_pitch:"HBP",strikeout_swinging:"K Swinging",strikeout_looking:"K Looking"};
  if(raw==="Out"){
    if(tr.includes("ground"))return "Groundout";
    if(tr.includes("line"))return "Lineout";
    if(tr.includes("fly")||tr.includes("pop"))return "Flyout";
  }
  return map[raw]||raw||"-";
}
function et291067Terminal(t){return typeof reportTerminalResultV292==="function"&&reportTerminalResultV292(t);}
function et291067PitchAction(t,isLast){
  const raw=String(t?.final_result||t?.result||"").trim();
  const zone=et291067Zone(t);
  if(isLast&&et291067Terminal(t))return [et291067OfficialResult(t),zone].filter(Boolean).join(" ");
  if(raw==="Foul")return ["Foul",zone].filter(Boolean).join(" ");
  if(["Swing & Miss","Swing Miss","SW Miss","Swinging Strike"].includes(raw))return ["SW Miss",zone].filter(Boolean).join(" ");
  if(raw==="Check Swing")return ["Check Swing",zone].filter(Boolean).join(" ");
  if(raw==="Taken Strike")return "Strike";
  if(raw==="Ball"||raw==="Strike")return raw;
  return [raw,zone].filter(Boolean).join(" ");
}
function et291067PitchSequence(pa){
  return (pa||[]).map((t,i)=>{
    const type=String(t?.pitch_type||"").trim();
    const action=et291067PitchAction(t,i===pa.length-1);
    return [type,action].filter(Boolean).join(" ");
  }).filter(Boolean).join(" · ");
}
function et291067RenderBatterHistory(){
  const box=$("batterHistoryListV291067");
  if(!box)return;
  const batters=et291066ActivityBatters();
  box.innerHTML=batters.map((player,index)=>{
    const pas=et291066PaForPlayer(player);
    const body=pas.length?pas.map((pa,i)=>{
      const result=et291067OfficialResult(pa[pa.length-1]||{});
      return `<div class="batterHistoryAbV291067"><b>AB-${i+1}</b><div class="batterHistorySequenceV291067">${xlsEsc(et291067PitchSequence(pa)||"No pitch detail")}</div><div class="batterHistoryResultV291067">Result: <strong>${xlsEsc(result)}</strong></div></div>`;
    }).join(""):'<p class="batterHistoryEmptyV291067">No plate appearances recorded.</p>';
    return `<section class="batterHistoryDropdownV291067"><button type="button" class="batterHistoryToggleV291067" aria-expanded="false" data-target="batterHistoryBody-${index}"><span class="batterHistoryArrowV291067">▶</span><b>#${xlsEsc(player.num||"-")} ${xlsEsc(player.name||"No name")}</b><strong>${pas.length} AB</strong></button><div id="batterHistoryBody-${index}" class="batterHistoryBodyV291067 hidden">${body}</div></section>`;
  }).join("")||'<p class="batterHistoryEmptyV291067">No batters are assigned to this activity.</p>';
  box.querySelectorAll(".batterHistoryToggleV291067").forEach(btn=>btn.onclick=()=>{
    const body=$(btn.dataset.target);if(!body)return;
    const opening=body.classList.contains("hidden");
    body.classList.toggle("hidden",!opening);
    btn.setAttribute("aria-expanded",opening?"true":"false");
    const arrow=btn.querySelector(".batterHistoryArrowV291067");if(arrow)arrow.textContent=opening?"▼":"▶";
  });
}
function et291067OpenBatterHistory(){
  if(!et291067RequireActivity())return;
  et291067RenderBatterHistory();
  if(typeof et291031ShowOnlySheet==="function")et291031ShowOnlySheet("runnerEventSheetV294");
  else openSheet("runnerEventSheetV294");
}

/* Retire persisted runner-event data and active hooks. */
try{localStorage.removeItem("etd_runner_events");}catch(_e){}
state.runnerEvents=[];
window.deleteRunnerEventV294=()=>{};
window.et291066OpenBatterHistory=et291067OpenBatterHistory;
function et291067Post(){
  state.runnerEvents=[];
  const btn=$("runnerEventBtnV294");
  if(btn){btn.textContent="BATTER HISTORY";btn.onclick=et291067OpenBatterHistory;}
  const saveBtn=$("savePlayer");if(saveBtn)saveBtn.onclick=savePlayer;
}
const et291067RenderBase=render;
render=function(){const out=et291067RenderBase();setTimeout(et291067Post,0);return out;};
window.addEventListener("load",()=>setTimeout(et291067Post,260));

/* ================= EASY TAGG v2.9.10.68 RESOLVED =================
   Batter History is built directly from the exact tags used by History.
   It groups those tags with the same AB numbering map used by History.
   No result names are converted or reinterpreted.
   ================================================================ */
const ET291068_RESOLVED_VERSION="2.9.10.68 Resolved History Mirror";

function et291068ResolvedZone(tag){
  const raw=String(tag?.zone_status||"").trim().toLowerCase();
  if(!raw)return "";
  if(raw==="iz"||raw.includes("in zone")||raw.includes("inside")||raw==="in")return "IZ";
  if(raw==="oz"||raw.includes("out zone")||raw.includes("outside")||raw==="out")return "OZ";
  return "";
}
function et291068ResolvedAbMap(tags){
  if(typeof et29107BuildAPMap==="function"){
    try{return et29107BuildAPMap();}catch(_e){}
  }
  const counters=new Map(), map=new Map();
  const terminal=new Set(["BB","HBP","K Swinging","K Looking","Single","Double","Triple","HR","Out","Fielder's Choice","Sac Fly","Sac Bunt"]);
  tags.forEach(tag=>{
    const key=String(tag.batter_id||("name:"+(tag.batter||"No Player")));
    const ab=counters.get(key)||1;
    map.set(tag.tag_id,ab);
    if(terminal.has(String(tag.final_result||tag.result||"").trim()))counters.set(key,ab+1);
  });
  return map;
}
function et291068ResolvedGroups(){
  const tags=gt().slice();
  const abMap=et291068ResolvedAbMap(tags);
  const players=new Map();
  tags.forEach((tag,index)=>{
    const playerKey=String(tag.batter_id||("name:"+(tag.batter||"No Player")));
    if(!players.has(playerKey))players.set(playerKey,{
      id:tag.batter_id||"",
      name:String(tag.batter||pn(tag.batter_id)||"No Player"),
      abs:new Map()
    });
    const ab=Number(abMap.get(tag.tag_id)||1);
    const group=players.get(playerKey);
    if(!group.abs.has(ab))group.abs.set(ab,[]);
    group.abs.get(ab).push({tag,index});
  });
  return [...players.values()].map(player=>{
    player.abs=[...player.abs.entries()].sort((a,b)=>a[0]-b[0]).map(([number,items])=>({
      number,
      tags:items.sort((a,b)=>a.index-b.index).map(item=>item.tag)
    }));
    return player;
  }).sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:"base"}));
}
function et291068ResolvedNumber(player){
  const found=player.id?pl(player.id):(state.players||[]).find(p=>String(p.name||"").trim().toLowerCase()===player.name.trim().toLowerCase());
  return found?.num||"-";
}
function et291068ResolvedPitchLine(tag){
  const pitch=String(tag.pitch_type||"").trim();
  const result=String(tag.final_result||tag.result||"").trim();
  const zone=et291068ResolvedZone(tag);
  return [pitch,result,zone].filter(Boolean).join(" ");
}
function et291068ResolvedRender(){
  const sheet=$("runnerEventSheetV294");
  if(!sheet)return;
  /* Rebuild the complete sheet because the old v2.9.10.66 renderer could replace its inner HTML. */
  sheet.innerHTML='<div class="sheetHead"><h2>BATTER HISTORY</h2><button class="close" type="button">×</button></div><div id="batterHistoryListV291067" class="batterHistoryListV291067"></div>';
  sheet.querySelector(".close")?.addEventListener("click",closeSheets);
  const box=$("batterHistoryListV291067");
  const groups=et291068ResolvedGroups();
  box.innerHTML=groups.map((player,playerIndex)=>{
    const abBody=player.abs.map(ab=>{
      const last=ab.tags[ab.tags.length-1]||{};
      const result=String(last.final_result||last.result||"-").trim()||"-";
      const sequence=ab.tags.map(et291068ResolvedPitchLine).filter(Boolean).join(" · ")||"No pitch detail";
      return `<div class="batterHistoryAbV291067"><b>AB-${ab.number}</b><div class="batterHistorySequenceV291067">${xlsEsc(sequence)}</div><div class="batterHistoryResultV291067">Result: <strong>${xlsEsc(result)}</strong></div></div>`;
    }).join("");
    return `<section class="batterHistoryDropdownV291067"><button type="button" class="batterHistoryToggleV291067" aria-expanded="false" data-target="batterHistoryResolvedBody-${playerIndex}"><span class="batterHistoryArrowV291067">▶</span><b>#${xlsEsc(et291068ResolvedNumber(player))} ${xlsEsc(player.name)}</b><strong>${player.abs.length} AB</strong></button><div id="batterHistoryResolvedBody-${playerIndex}" class="batterHistoryBodyV291067 hidden">${abBody}</div></section>`;
  }).join("")||'<p class="batterHistoryEmptyV291067">No batting history recorded for this activity.</p>';
  box.querySelectorAll(".batterHistoryToggleV291067").forEach(button=>button.onclick=()=>{
    const body=$(button.dataset.target);if(!body)return;
    const open=body.classList.contains("hidden");
    body.classList.toggle("hidden",!open);
    button.setAttribute("aria-expanded",open?"true":"false");
    const arrow=button.querySelector(".batterHistoryArrowV291067");
    if(arrow)arrow.textContent=open?"▼":"▶";
  });
}
function et291068ResolvedOpen(){
  if(!et291067RequireActivity())return;
  et291068ResolvedRender();
  if(typeof et291031ShowOnlySheet==="function")et291031ShowOnlySheet("runnerEventSheetV294");
  else openSheet("runnerEventSheetV294");
}
function et291068ResolvedPost(){
  const button=$("runnerEventBtnV294");
  if(button){button.textContent="BATTER HISTORY";button.onclick=et291068ResolvedOpen;}
  const select=$("gameSelect");
  if(select&&!state.games.length)select.innerHTML='<option>No activities</option>';
}
window.et291066OpenBatterHistory=et291068ResolvedOpen;
window.et291067OpenBatterHistory=et291068ResolvedOpen;
const et291068ResolvedRenderBase=render;
render=function(){const output=et291068ResolvedRenderBase();setTimeout(et291068ResolvedPost,0);return output;};
window.addEventListener("load",()=>setTimeout(et291068ResolvedPost,360));

/* ================= EASY TAGG v2.9.10.69 =================
   Functional Player At-Bats dropdown.
   Reads the same tag records and AB map used by History.
   Shows player number/name, exact event sequence with IZ/OZ, and final result.
   No tag, lineup, export, clock, edit, or History behavior is changed.
   ======================================================== */
const ET291069_VERSION="2.9.10.69 Player At-Bats Sequence";

function et291069EventLine(tag){
  const event=String(tag?.final_result||tag?.result||"").trim();
  const zone=et291068ResolvedZone(tag);
  return [event,zone].filter(Boolean).join(" ");
}
function et291069Players(){
  const tagged=et291068ResolvedGroups();
  const byId=new Map(tagged.filter(p=>p.id).map(p=>[String(p.id),p]));
  const byName=new Map(tagged.map(p=>[String(p.name||"").trim().toLowerCase(),p]));
  let lineup=[];
  try{
    if(typeof et27LineupPlayers==="function"){
      lineup=[...et27LineupPlayers("away"),...et27LineupPlayers("home")];
    }
  }catch(_e){}
  const output=[];
  const seen=new Set();
  lineup.forEach(player=>{
    const key=String(player.id||("name:"+String(player.name||"").toLowerCase()));
    if(seen.has(key))return;
    seen.add(key);
    const history=byId.get(String(player.id))||byName.get(String(player.name||"").trim().toLowerCase());
    output.push(history||{id:player.id||"",name:player.name||"No Player",abs:[]});
  });
  tagged.forEach(player=>{
    const key=String(player.id||("name:"+String(player.name||"").toLowerCase()));
    if(seen.has(key))return;
    seen.add(key);output.push(player);
  });
  return output.sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),undefined,{sensitivity:"base"}));
}
function et291069Render(){
  const sheet=$("runnerEventSheetV294");
  if(!sheet)return;
  sheet.innerHTML='<div class="sheetHead"><h2>PLAYER AT-BATS</h2><button class="close" type="button">×</button></div><div id="batterHistoryListV291067" class="batterHistoryListV291067"></div>';
  sheet.querySelector(".close")?.addEventListener("click",closeSheets);
  const box=$("batterHistoryListV291067");
  const players=et291069Players();
  box.innerHTML=players.map((player,playerIndex)=>{
    const abBody=player.abs.length?player.abs.map(ab=>{
      const last=ab.tags[ab.tags.length-1]||{};
      const result=String(last.final_result||last.result||"-").trim()||"-";
      const sequence=ab.tags.map(et291069EventLine).filter(Boolean).join(" · ")||"No pitch sequence recorded.";
      return `<div class="batterHistoryAbV291067"><b>AB-${ab.number}</b><div class="batterHistorySequenceV291067">${xlsEsc(sequence)}</div><div class="batterHistoryResultV291067">Result: <strong>${xlsEsc(result)}</strong></div></div>`;
    }).join(""):'<p class="batterHistoryEmptyV291067">No plate appearances recorded.</p>';
    return `<section class="batterHistoryDropdownV291067"><button type="button" class="batterHistoryToggleV291067" aria-expanded="false" data-target="playerAtBatsBody-${playerIndex}"><span class="batterHistoryArrowV291067">▶</span><b>#${xlsEsc(et291068ResolvedNumber(player))} ${xlsEsc(player.name||"No Player")}</b><strong>${player.abs.length} AB</strong></button><div id="playerAtBatsBody-${playerIndex}" class="batterHistoryBodyV291067 hidden">${abBody}</div></section>`;
  }).join("")||'<p class="batterHistoryEmptyV291067">No batters are assigned to this activity.</p>';
  box.querySelectorAll(".batterHistoryToggleV291067").forEach(button=>button.onclick=()=>{
    const body=$(button.dataset.target);if(!body)return;
    const opening=body.classList.contains("hidden");
    body.classList.toggle("hidden",!opening);
    button.setAttribute("aria-expanded",opening?"true":"false");
    const arrow=button.querySelector(".batterHistoryArrowV291067");
    if(arrow)arrow.textContent=opening?"▼":"▶";
  });
}
function et291069Open(){
  if(!et291067RequireActivity())return;
  et291069Render();
  if(typeof et291031ShowOnlySheet==="function")et291031ShowOnlySheet("runnerEventSheetV294");
  else openSheet("runnerEventSheetV294");
}
function et291069Post(){
  const button=$("runnerEventBtnV294");
  if(button){button.textContent="PLAYER AT-BATS";button.onclick=et291069Open;}
}
window.et291066OpenBatterHistory=et291069Open;
window.et291067OpenBatterHistory=et291069Open;
const et291069RenderBase=render;
render=function(){const output=et291069RenderBase();setTimeout(et291069Post,0);return output;};
window.addEventListener("load",()=>setTimeout(et291069Post,420));

/* ================= EASY TAGG v2.9.10.70 =================
   Live Player At-Bats refresh + exact batter-name grouping.
   Rebuilds directly from the current activity History every time tags change
   or the panel is opened. Prevents shared/stale player IDs from assigning an
   at-bat to the wrong lineup row. Existing tag/history/export logic is untouched.
   ======================================================== */
const ET291070_VERSION="2.9.10.70 Live Player At-Bats Refresh";

function et291070NormName(value){
  return String(value||"").trim().replace(/\s+/g," ").toLowerCase();
}
function et291070TagPlayerKey(tag){
  const name=et291070NormName(tag?.batter);
  return name?"name:"+name:"id:"+String(tag?.batter_id||"");
}
function et291070PlayerKey(player){
  const name=et291070NormName(player?.name);
  return name?"name:"+name:"id:"+String(player?.id||"");
}
function et291070HistoryGroups(){
  const players=new Map();
  const currentAb=new Map();
  gt().forEach((tag,index)=>{
    const key=et291070TagPlayerKey(tag);
    if(!players.has(key))players.set(key,{
      id:tag.batter_id||"",
      name:String(tag.batter||pn(tag.batter_id)||"No Player"),
      abs:new Map()
    });
    const number=currentAb.get(key)||1;
    const player=players.get(key);
    if(!player.abs.has(number))player.abs.set(number,[]);
    player.abs.get(number).push({tag,index});
    const result=String(tag.final_result||tag.result||"").trim();
    if(typeof pa==="function"&&pa(result))currentAb.set(key,number+1);
  });
  return [...players.values()].map(player=>{
    player.abs=[...player.abs.entries()].sort((a,b)=>a[0]-b[0]).map(([number,items])=>({
      number,
      tags:items.sort((a,b)=>a.index-b.index).map(item=>item.tag)
    }));
    return player;
  });
}
function et291070Players(){
  const history=et291070HistoryGroups();
  const historyByKey=new Map(history.map(player=>[et291070PlayerKey(player),player]));
  let lineup=[];
  try{
    if(typeof et27LineupPlayers==="function")lineup=[...et27LineupPlayers("away"),...et27LineupPlayers("home")];
  }catch(_e){}
  const output=[];
  const seen=new Set();
  lineup.forEach(player=>{
    const key=et291070PlayerKey(player);
    if(!key||seen.has(key))return;
    seen.add(key);
    output.push(historyByKey.get(key)||{id:player.id||"",name:player.name||"No Player",abs:[]});
  });
  history.forEach(player=>{
    const key=et291070PlayerKey(player);
    if(seen.has(key))return;
    seen.add(key);
    output.push(player);
  });
  return output.sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),undefined,{sensitivity:"base"}));
}
function et291070ExpandedPlayers(){
  const open=new Set();
  document.querySelectorAll(".batterHistoryToggleV291067[aria-expanded='true']").forEach(button=>{
    const label=button.querySelector("b")?.textContent||"";
    if(label)open.add(et291070NormName(label.replace(/^#\S*\s*/,"")));
  });
  return open;
}
function et291070Render(){
  const sheet=$("runnerEventSheetV294");
  if(!sheet)return;
  const expanded=et291070ExpandedPlayers();
  sheet.innerHTML='<div class="sheetHead"><h2>PLAYER AT-BATS</h2><button class="close" type="button">×</button></div><div id="batterHistoryListV291067" class="batterHistoryListV291067"></div>';
  sheet.querySelector(".close")?.addEventListener("click",closeSheets);
  const box=$("batterHistoryListV291067");
  const players=et291070Players();
  box.innerHTML=players.map((player,playerIndex)=>{
    const playerName=String(player.name||"No Player");
    const isOpen=expanded.has(et291070NormName(playerName));
    const abBody=player.abs.length?player.abs.map(ab=>{
      const last=ab.tags[ab.tags.length-1]||{};
      const result=String(last.final_result||last.result||"-").trim()||"-";
      const sequence=ab.tags.map(et291069EventLine).filter(Boolean).join(" · ")||"No pitch sequence recorded.";
      return `<div class="batterHistoryAbV291067"><b>AB-${ab.number}</b><div class="batterHistorySequenceV291067">${xlsEsc(sequence)}</div><div class="batterHistoryResultV291067">Result: <strong>${xlsEsc(result)}</strong></div></div>`;
    }).join(""):'<p class="batterHistoryEmptyV291067">No plate appearances recorded.</p>';
    return `<section class="batterHistoryDropdownV291067"><button type="button" class="batterHistoryToggleV291067" aria-expanded="${isOpen?"true":"false"}" data-target="playerAtBatsLiveBody-${playerIndex}"><span class="batterHistoryArrowV291067">${isOpen?"▼":"▶"}</span><b>#${xlsEsc(et291068ResolvedNumber(player))} ${xlsEsc(playerName)}</b><strong>${player.abs.length} AB</strong></button><div id="playerAtBatsLiveBody-${playerIndex}" class="batterHistoryBodyV291067${isOpen?"":" hidden"}">${abBody}</div></section>`;
  }).join("")||'<p class="batterHistoryEmptyV291067">No batters are assigned to this activity.</p>';
  box.querySelectorAll(".batterHistoryToggleV291067").forEach(button=>button.onclick=()=>{
    const body=$(button.dataset.target);if(!body)return;
    const opening=body.classList.contains("hidden");
    body.classList.toggle("hidden",!opening);
    button.setAttribute("aria-expanded",opening?"true":"false");
    const arrow=button.querySelector(".batterHistoryArrowV291067");
    if(arrow)arrow.textContent=opening?"▼":"▶";
  });
}
function et291070Open(){
  if(!et291067RequireActivity())return;
  et291070Render();
  if(typeof et291031ShowOnlySheet==="function")et291031ShowOnlySheet("runnerEventSheetV294");
  else openSheet("runnerEventSheetV294");
}
function et291070PanelIsOpen(){
  const sheet=$("runnerEventSheetV294");
  return !!sheet&&!sheet.classList.contains("hidden")&&sheet.querySelector("#batterHistoryListV291067");
}
function et291070Post(){
  const button=$("runnerEventBtnV294");
  if(button){button.textContent="PLAYER AT-BATS";button.onclick=et291070Open;}
  if(et291070PanelIsOpen())et291070Render();
}
window.et291066OpenBatterHistory=et291070Open;
window.et291067OpenBatterHistory=et291070Open;
const et291070RenderBase=render;
render=function(){const output=et291070RenderBase();setTimeout(et291070Post,0);return output;};
window.addEventListener("load",()=>setTimeout(et291070Post,480));

/* ================= EASY TAGG v2.9.10.71 =================
   Player At-Bats direct History-tag source of truth.
   Groups by the exact batter snapshot stored in each tag, so reused/shared
   player IDs cannot move an at-bat to another visible player row.
   Tagged players are built first; untagged lineup players are appended as 0 AB.
   Existing History, tag creation, lineup, clocks, edit and export logic is untouched.
   ======================================================== */
const ET291071_VERSION="2.9.10.71 Direct History Player At-Bats";

function et291071Name(value){
  return String(value||"").trim().replace(/\s+/g," ");
}
function et291071Key(value){
  return et291071Name(value).toLocaleLowerCase();
}
function et291071IsTerminal(tag){
  const result=String(tag?.final_result||tag?.result||"").trim();
  return typeof pa==="function"?pa(result):["BB","HBP","K Swinging","K Looking","Single","Double","Triple","HR","Out"].includes(result);
}
function et291071TaggedPlayers(){
  const players=new Map();
  const abCounter=new Map();
  (typeof gt==="function"?gt():[]).forEach((tag,index)=>{
    /* History displays tag.batter, so this exact snapshot is the source of truth. */
    const displayName=et291071Name(tag?.batter)||et291071Name(typeof pn==="function"?pn(tag?.batter_id):"")||"No Player";
    const key=et291071Key(displayName);
    if(!players.has(key))players.set(key,{
      id:tag?.batter_id||"",
      name:displayName,
      number:"-",
      abs:new Map(),
      firstIndex:index
    });
    const current=abCounter.get(key)||1;
    const player=players.get(key);
    if(!player.abs.has(current))player.abs.set(current,[]);
    player.abs.get(current).push({tag,index});
    if(et291071IsTerminal(tag))abCounter.set(key,current+1);
  });
  return [...players.values()].map(player=>{
    const roster=(state.players||[]).find(p=>et291071Key(p?.name)===et291071Key(player.name));
    player.number=String(roster?.num||"-");
    player.abs=[...player.abs.entries()].sort((a,b)=>a[0]-b[0]).map(([number,items])=>({
      number,
      tags:items.sort((a,b)=>a.index-b.index).map(item=>item.tag)
    }));
    return player;
  });
}
function et291071Players(){
  const tagged=et291071TaggedPlayers();
  const output=[...tagged];
  const seen=new Set(tagged.map(player=>et291071Key(player.name)));
  let lineup=[];
  try{
    if(typeof et27LineupPlayers==="function")lineup=[...et27LineupPlayers("away"),...et27LineupPlayers("home")];
  }catch(_e){}
  lineup.forEach(player=>{
    const name=et291071Name(player?.name)||"No Player";
    const key=et291071Key(name);
    if(!key||seen.has(key))return;
    seen.add(key);
    output.push({id:player?.id||"",name,number:String(player?.num||"-"),abs:[]});
  });
  return output.sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:"base"}));
}
function et291071Expanded(){
  const open=new Set();
  document.querySelectorAll(".batterHistoryToggleV291067[aria-expanded='true']").forEach(button=>{
    const name=button.dataset.playerName||"";
    if(name)open.add(et291071Key(name));
  });
  return open;
}
function et291071Render(){
  const sheet=$("runnerEventSheetV294");
  if(!sheet)return;
  const expanded=et291071Expanded();
  sheet.innerHTML='<div class="sheetHead"><h2>PLAYER AT-BATS</h2><button class="close" type="button">×</button></div><div id="batterHistoryListV291067" class="batterHistoryListV291067"></div>';
  sheet.querySelector(".close")?.addEventListener("click",closeSheets);
  const box=$("batterHistoryListV291067");
  const players=et291071Players();
  box.innerHTML=players.map((player,playerIndex)=>{
    const open=expanded.has(et291071Key(player.name));
    const abBody=player.abs.length?player.abs.map(ab=>{
      const last=ab.tags[ab.tags.length-1]||{};
      const result=String(last.final_result||last.result||"-").trim()||"-";
      const sequence=ab.tags.map(tag=>{
        const event=String(tag?.final_result||tag?.result||"").trim();
        const zone=et291068ResolvedZone(tag);
        return [event,zone].filter(Boolean).join(" ");
      }).filter(Boolean).join(" · ")||"No pitch sequence recorded.";
      return `<div class="batterHistoryAbV291067"><b>AB-${ab.number}</b><div class="batterHistorySequenceV291067">${xlsEsc(sequence)}</div><div class="batterHistoryResultV291067">Result: <strong>${xlsEsc(result)}</strong></div></div>`;
    }).join(""):'<p class="batterHistoryEmptyV291067">No plate appearances recorded.</p>';
    return `<section class="batterHistoryDropdownV291067"><button type="button" class="batterHistoryToggleV291067" aria-expanded="${open?"true":"false"}" data-player-name="${xlsEsc(player.name)}" data-target="playerAtBatsDirectBody-${playerIndex}"><span class="batterHistoryArrowV291067">${open?"▼":"▶"}</span><b>#${xlsEsc(player.number)} ${xlsEsc(player.name)}</b><strong>${player.abs.length} AB</strong></button><div id="playerAtBatsDirectBody-${playerIndex}" class="batterHistoryBodyV291067${open?"":" hidden"}">${abBody}</div></section>`;
  }).join("")||'<p class="batterHistoryEmptyV291067">No batters are assigned to this activity.</p>';
  box.querySelectorAll(".batterHistoryToggleV291067").forEach(button=>button.onclick=()=>{
    const body=$(button.dataset.target);if(!body)return;
    const opening=body.classList.contains("hidden");
    body.classList.toggle("hidden",!opening);
    button.setAttribute("aria-expanded",opening?"true":"false");
    const arrow=button.querySelector(".batterHistoryArrowV291067");
    if(arrow)arrow.textContent=opening?"▼":"▶";
  });
}
function et291071Open(){
  if(!et291067RequireActivity())return;
  et291071Render();
  if(typeof et291031ShowOnlySheet==="function")et291031ShowOnlySheet("runnerEventSheetV294");
  else openSheet("runnerEventSheetV294");
}
function et291071Post(){
  const button=$("runnerEventBtnV294");
  if(button){button.textContent="PLAYER AT-BATS";button.onclick=et291071Open;}
}
window.et291066OpenBatterHistory=et291071Open;
window.et291067OpenBatterHistory=et291071Open;
const et291071RenderBase=render;
render=function(){const output=et291071RenderBase();setTimeout(et291071Post,0);return output;};
window.addEventListener("load",()=>setTimeout(et291071Post,540));

/* ================= EASY TAGG v2.9.10.72 =================
   Exact History AB mirror.
   Uses the very same tag list and et29107BuildAPMap() used by renderHistory().
   No independent AB counter, player matching, or cached history structure.
   ======================================================== */
const ET291072_VERSION="2.9.10.72 Exact History AB Mirror";

function et291072Zone(tag){
  const raw=String(tag?.zone_status||"").trim().toLowerCase();
  if(!raw)return "";
  if(raw==="iz"||raw==="in"||raw.includes("in zone")||raw.includes("inside"))return "IZ";
  if(raw==="oz"||raw==="out"||raw.includes("out zone")||raw.includes("outside"))return "OZ";
  return "";
}
function et291072BatterKey(tag){
  return String(tag?.batter_id||("name:"+String(tag?.batter||"No Player")));
}
function et291072HistoryGroups(){
  const tags=(typeof gt==="function"?gt():[]).slice();
  let abMap=new Map();
  try{abMap=et29107BuildAPMap();}catch(_e){}

  const players=new Map();
  tags.forEach((tag,index)=>{
    const playerKey=et291072BatterKey(tag);
    const ab=Number(abMap.get(tag.tag_id)||1);
    if(!players.has(playerKey))players.set(playerKey,{
      key:playerKey,
      id:tag.batter_id||"",
      name:String(tag.batter||pn(tag.batter_id)||"No Player"),
      number:"-",
      abs:new Map(),
      firstIndex:index
    });
    const player=players.get(playerKey);
    /* Keep the exact visible batter snapshot from History. */
    if(tag.batter)player.name=String(tag.batter);
    if(!player.abs.has(ab))player.abs.set(ab,[]);
    player.abs.get(ab).push({tag,index});
  });

  const rows=[...players.values()].map(player=>{
    const roster=player.id?pl(player.id):(state.players||[]).find(p=>String(p.name||"").trim()===player.name.trim());
    player.number=String(roster?.num||"-");
    player.abs=[...player.abs.entries()]
      .sort((a,b)=>a[0]-b[0])
      .map(([number,items])=>({
        number,
        tags:items.sort((a,b)=>a.index-b.index).map(item=>item.tag)
      }));
    return player;
  });

  /* Append lineup batters with no History tags only. */
  const seen=new Set(rows.map(player=>player.key));
  let lineup=[];
  try{
    if(typeof et27LineupPlayers==="function")lineup=[...et27LineupPlayers("away"),...et27LineupPlayers("home")];
  }catch(_e){}
  lineup.forEach(player=>{
    const key=String(player?.id||("name:"+String(player?.name||"No Player")));
    if(seen.has(key))return;
    seen.add(key);
    rows.push({key,id:player?.id||"",name:String(player?.name||"No Player"),number:String(player?.num||"-"),abs:[],firstIndex:Number.MAX_SAFE_INTEGER});
  });
  return rows.sort((a,b)=>a.firstIndex-b.firstIndex||a.name.localeCompare(b.name));
}
function et291072Event(tag){
  const result=String(tag?.final_result||tag?.result||"").trim();
  const zone=et291072Zone(tag);
  return [result,zone].filter(Boolean).join(" ");
}
function et291072Render(){
  const sheet=$("runnerEventSheetV294");
  if(!sheet)return;
  sheet.innerHTML='<div class="sheetHead"><h2>PLAYER AT-BATS</h2><button class="close" type="button">×</button></div><div id="batterHistoryListV291067" class="batterHistoryListV291067"></div>';
  sheet.querySelector(".close")?.addEventListener("click",closeSheets);
  const box=$("batterHistoryListV291067");
  const players=et291072HistoryGroups();
  box.innerHTML=players.map((player,playerIndex)=>{
    const body=player.abs.length?player.abs.map(ab=>{
      const events=ab.tags.map(et291072Event).filter(Boolean);
      const last=ab.tags[ab.tags.length-1]||{};
      const result=String(last.final_result||last.result||"-").trim()||"-";
      return `<div class="batterHistoryAbV291067"><b>AB-${ab.number}</b><div class="batterHistorySequenceV291067">${xlsEsc(events.join(" · ")||"No pitch sequence recorded.")}</div><div class="batterHistoryResultV291067">Result: <strong>${xlsEsc(result)}</strong></div></div>`;
    }).join(""):'<p class="batterHistoryEmptyV291067">No plate appearances recorded.</p>';
    return `<section class="batterHistoryDropdownV291067"><button type="button" class="batterHistoryToggleV291067" aria-expanded="false" data-target="playerAtBatsExactBody-${playerIndex}"><span class="batterHistoryArrowV291067">▶</span><b>#${xlsEsc(player.number)} ${xlsEsc(player.name)}</b><strong>${player.abs.length} AB</strong></button><div id="playerAtBatsExactBody-${playerIndex}" class="batterHistoryBodyV291067 hidden">${body}</div></section>`;
  }).join("")||'<p class="batterHistoryEmptyV291067">No plate appearances recorded.</p>';
  box.querySelectorAll(".batterHistoryToggleV291067").forEach(button=>button.onclick=()=>{
    const body=$(button.dataset.target);if(!body)return;
    const opening=body.classList.contains("hidden");
    body.classList.toggle("hidden",!opening);
    button.setAttribute("aria-expanded",opening?"true":"false");
    const arrow=button.querySelector(".batterHistoryArrowV291067");
    if(arrow)arrow.textContent=opening?"▼":"▶";
  });
}
function et291072Open(){
  if(!et291067RequireActivity())return;
  et291072Render();
  if(typeof et291031ShowOnlySheet==="function")et291031ShowOnlySheet("runnerEventSheetV294");
  else openSheet("runnerEventSheetV294");
}
function et291072Post(){
  const button=$("runnerEventBtnV294");
  if(button){button.textContent="PLAYER AT-BATS";button.onclick=et291072Open;}
}
window.et291066OpenBatterHistory=et291072Open;
window.et291067OpenBatterHistory=et291072Open;
const et291072RenderBase=render;
render=function(){const output=et291072RenderBase();setTimeout(et291072Post,0);return output;};
window.addEventListener("load",()=>setTimeout(et291072Post,600));

/* ================= EASY TAGG v2.9.10.73 =================
   Manual refresh for Player At-Bats.
   Reloads persisted tags, analyzes the current activity, groups each batter's
   recorded History sequence into plate appearances, and redraws the panel.
   Startup player selection is not changed.
   ======================================================== */
const ET291073_VERSION="2.9.10.73 Player At-Bats Manual Refresh";

function et291073ReloadPersistedState(){
  try{
    const savedTags=JSON.parse(localStorage.getItem("etd_tags")||"[]");
    if(Array.isArray(savedTags))state.tags=savedTags;
    const savedPlayers=JSON.parse(localStorage.getItem("etd_players")||"[]");
    if(Array.isArray(savedPlayers))state.players=savedPlayers;
    const savedGame=localStorage.getItem("etd_game")||state.activeGameId||"";
    if(savedGame)state.activeGameId=savedGame;
  }catch(_e){}
}
function et291073NameKey(tag){
  return String(tag?.batter||pn(tag?.batter_id)||"No Player").trim().toLowerCase();
}
function et291073AnalyzeHistory(){
  const tags=(typeof gt==="function"?gt():[]).slice().sort((a,b)=>{
    const ai=Number(a?.game_seconds||0), bi=Number(b?.game_seconds||0);
    if(ai!==bi)return ai-bi;
    return String(a?.created_at||"").localeCompare(String(b?.created_at||""));
  });
  const players=new Map();
  tags.forEach((tag,index)=>{
    const key=et291073NameKey(tag);
    if(!players.has(key))players.set(key,{name:String(tag?.batter||pn(tag?.batter_id)||"No Player"),id:tag?.batter_id||"",number:"-",abs:[],null_pas:[],nullMap:new Map(),current:[],first:index});
    const player=players.get(key);
    if(tag?.batter)player.name=String(tag.batter);

    /* NULL/INCOMPLETE pitches must never be merged into an official/live AB. */
    if(tag?.null_pa){
      const nullKey=String(tag?.null_pa_end_tag_id||`${tag?.inning||""}|${tag?.half||""}|${tag?.null_pa_reason||"INCOMPLETE"}`);
      if(!player.nullMap.has(nullKey)){
        const group=[];
        player.nullMap.set(nullKey,group);
        player.null_pas.push(group);
      }
      player.nullMap.get(nullKey).push(tag);
      return;
    }

    player.current.push(tag);
    const result=String(tag?.final_result||tag?.result||"").trim();
    if(typeof pa==="function"&&pa(result)){
      player.abs.push(player.current);
      player.current=[];
    }
  });
  players.forEach(player=>{
    /* Keep an unfinished live AB visible too, because it is already in History. */
    if(player.current.length){player.abs.push(player.current);player.current=[];}
    delete player.nullMap;
    const roster=player.id?pl(player.id):(state.players||[]).find(p=>String(p?.name||"").trim().toLowerCase()===player.name.trim().toLowerCase());
    player.number=String(roster?.num||"-");
  });
  return [...players.values()].sort((a,b)=>a.first-b.first||a.name.localeCompare(b.name));
}
function et291073Event(tag){
  const result=String(tag?.final_result||tag?.result||"").trim()||"Tag";
  const zone=et291072Zone(tag);
  return [result,zone].filter(Boolean).join(" ");
}
function et291073Draw(statusText){
  const box=$("batterHistoryListV291067");
  if(!box)return;
  const players=et291073AnalyzeHistory();
  box.innerHTML=players.map((player,playerIndex)=>{
    const body=player.abs.map((tags,abIndex)=>{
      const events=tags.map(et291073Event).filter(Boolean);
      const last=tags[tags.length-1]||{};
      const lastResult=String(last.final_result||last.result||"").trim();
      const completed=(typeof pa==="function"&&pa(lastResult));
      return `<div class="batterHistoryAbV291067"><b>AB-${abIndex+1}${completed?"":" (LIVE)"}</b><div class="batterHistorySequenceV291067">${xlsEsc(events.join(" · ")||"No pitch sequence recorded.")}</div><div class="batterHistoryResultV291067">Result: <strong>${xlsEsc(completed?(lastResult||"-"):"In Progress")}</strong></div></div>`;
    }).join("");
    return `<section class="batterHistoryDropdownV291067"><button type="button" class="batterHistoryToggleV291067" aria-expanded="false" data-target="playerAtBatsRefreshBody-${playerIndex}"><span class="batterHistoryArrowV291067">▶</span><b>#${xlsEsc(player.number)} ${xlsEsc(player.name)}</b><strong>${player.abs.length} AB</strong></button><div id="playerAtBatsRefreshBody-${playerIndex}" class="batterHistoryBodyV291067 hidden">${body||'<p class="batterHistoryEmptyV291067">No plate appearances recorded.</p>'}</div></section>`;
  }).join("")||'<p class="batterHistoryEmptyV291067">No History tags found for the current activity.</p>';
  box.querySelectorAll(".batterHistoryToggleV291067").forEach(button=>button.onclick=()=>{
    const body=$(button.dataset.target);if(!body)return;
    const opening=body.classList.contains("hidden");
    body.classList.toggle("hidden",!opening);
    button.setAttribute("aria-expanded",opening?"true":"false");
    const arrow=button.querySelector(".batterHistoryArrowV291067");if(arrow)arrow.textContent=opening?"▼":"▶";
  });
  const status=$("playerAtBatsRefreshStatusV291073");
  if(status)status.textContent=statusText||`${(typeof gt==="function"?gt():[]).length} History tags analyzed`;
}
function et291073Refresh(){
  const refresh=$("playerAtBatsRefreshV291073");
  if(refresh){refresh.disabled=true;refresh.textContent="ANALYZING...";}
  setTimeout(()=>{
    et291073ReloadPersistedState();
    try{renderHistory();}catch(_e){}
    et291073Draw(`${(typeof gt==="function"?gt():[]).length} History tags analyzed now`);
    if(refresh){refresh.disabled=false;refresh.textContent="REFRESH";}
  },80);
}
function et291073Open(){
  if(!et291067RequireActivity())return;
  const sheet=$("runnerEventSheetV294");if(!sheet)return;
  sheet.innerHTML='<div class="sheetHead"><h2>PLAYER AT-BATS</h2><button class="close" type="button">×</button></div><div class="playerAtBatsRefreshBarV291073"><button id="playerAtBatsRefreshV291073" type="button">REFRESH</button><small id="playerAtBatsRefreshStatusV291073">Ready to analyze History</small></div><div id="batterHistoryListV291067" class="batterHistoryListV291067"></div>';
  sheet.querySelector(".close")?.addEventListener("click",closeSheets);
  $("playerAtBatsRefreshV291073")?.addEventListener("click",et291073Refresh);
  et291073ReloadPersistedState();
  et291073Draw();
  if(typeof et291031ShowOnlySheet==="function")et291031ShowOnlySheet("runnerEventSheetV294");else openSheet("runnerEventSheetV294");
}
function et291073Post(){const button=$("runnerEventBtnV294");if(button){button.textContent="PLAYER AT-BATS";button.onclick=et291073Open;}}
window.et291066OpenBatterHistory=et291073Open;
window.et291067OpenBatterHistory=et291073Open;
const et291073RenderBase=render;
render=function(){const output=et291073RenderBase();setTimeout(et291073Post,0);return output;};
window.addEventListener("load",()=>setTimeout(et291073Post,650));

/* ================= EASY TAGG v2.9.10.74 =================
   Automatic Player At-Bats analysis.
   Removes the manual refresh UI and rebuilds the panel automatically from
   the same persisted History tags whenever the panel opens or History changes.
   ======================================================== */
const ET291074_VERSION="2.9.10.74 Automatic Player At-Bats Refresh";
let et291074RefreshTimer=null;
let et291074Rendering=false;

function et291074PanelIsOpen(){
  const sheet=$("runnerEventSheetV294");
  return !!(sheet&&!sheet.classList.contains("hidden"));
}
function et291074AnalyzeNow(){
  if(et291074Rendering)return;
  et291074Rendering=true;
  try{
    et291073ReloadPersistedState();
    et291073Draw();
  }finally{
    et291074Rendering=false;
  }
}
function et291074ScheduleAnalysis(){
  clearTimeout(et291074RefreshTimer);
  et291074RefreshTimer=setTimeout(()=>{
    if(et291074PanelIsOpen())et291074AnalyzeNow();
  },60);
}
function et291074Open(){
  if(!et291067RequireActivity())return;
  const sheet=$("runnerEventSheetV294");
  if(!sheet)return;
  sheet.innerHTML='<div class="sheetHead"><h2>PLAYER AT-BATS</h2><button class="close" type="button">×</button></div><div id="batterHistoryListV291067" class="batterHistoryListV291067"></div>';
  sheet.querySelector(".close")?.addEventListener("click",closeSheets);
  et291074AnalyzeNow();
  if(typeof et291031ShowOnlySheet==="function")et291031ShowOnlySheet("runnerEventSheetV294");
  else openSheet("runnerEventSheetV294");
  requestAnimationFrame(et291074AnalyzeNow);
}
function et291074Post(){
  const button=$("runnerEventBtnV294");
  if(button){button.textContent="PLAYER AT-BATS";button.onclick=et291074Open;}
  const sheet=$("runnerEventSheetV294");
  const title=sheet?.querySelector(".sheetHead h2");
  if(title)title.textContent="PLAYER AT-BATS";
}
window.et291066OpenBatterHistory=et291074Open;
window.et291067OpenBatterHistory=et291074Open;

const et291074RenderHistoryBase=renderHistory;
renderHistory=function(){
  const output=et291074RenderHistoryBase.apply(this,arguments);
  et291074ScheduleAnalysis();
  return output;
};

const et291074RenderBase=render;
render=function(){
  const output=et291074RenderBase.apply(this,arguments);
  setTimeout(et291074Post,0);
  et291074ScheduleAnalysis();
  return output;
};

window.addEventListener("storage",event=>{
  if(event.key==="etd_tags"||event.key==="etd_players"||event.key==="etd_game")et291074ScheduleAnalysis();
});
window.addEventListener("load",()=>{
  setTimeout(()=>{et291074Post();et291074ScheduleAnalysis();},700);
});

/* ================= EASY TAGG v2.9.10.75 =================
   Manual Player At-Bats refresh, compact-on-close, and OZ-only swing markers.
   No automatic History analysis runs while the panel is open.
   CSV/export logic is untouched.
   ======================================================== */
const ET291075_VERSION="2.9.10.75 Manual Refresh Compact OZ Only";

/* Disable the v2.9.10.74 background analysis scheduler. */
et291074ScheduleAnalysis=function(){
  if(et291074RefreshTimer){clearTimeout(et291074RefreshTimer);et291074RefreshTimer=null;}
};

function et291075IsSwingEvent(tag){
  const value=String(tag?.final_result||tag?.result||"").trim().toLowerCase();
  return value==="foul"||value==="sw miss"||value==="swing miss"||value==="swinging strike"||
    value==="check swing"||value==="single"||value==="double"||value==="triple"||
    value==="home run"||value==="homerun"||value==="out"||value==="groundout"||
    value==="flyout"||value==="lineout"||value==="field error"||value==="error";
}
function et291075IsOutsideZone(tag){
  const zone=String(et291072Zone(tag)||"").trim().toUpperCase();
  return zone==="OZ";
}
function et291075Event(tag){
  const result=String(tag?.final_result||tag?.result||"").trim()||"Tag";
  return result+(et291075IsSwingEvent(tag)&&et291075IsOutsideZone(tag)?" OZ":"");
}
function et291075CollapseAll(){
  const sheet=$("runnerEventSheetV294");
  if(!sheet)return;
  sheet.querySelectorAll(".batterHistoryBodyV291067").forEach(body=>body.classList.add("hidden"));
  sheet.querySelectorAll(".batterHistoryToggleV291067").forEach(button=>{
    button.setAttribute("aria-expanded","false");
    const arrow=button.querySelector(".batterHistoryArrowV291067");
    if(arrow)arrow.textContent="▶";
  });
}
function et291075Draw(statusText){
  const box=$("batterHistoryListV291067");
  if(!box)return;
  const players=et291073AnalyzeHistory();
  box.innerHTML=players.map((player,playerIndex)=>{
    const body=player.abs.map((tags,abIndex)=>{
      const events=tags.map(et291075Event).filter(Boolean);
      const last=tags[tags.length-1]||{};
      const lastResult=String(last.final_result||last.result||"").trim();
      const completed=(typeof pa==="function"&&pa(lastResult));
      return `<div class="batterHistoryAbV291067"><b>AB-${abIndex+1}${completed?"":" (LIVE)"}</b><div class="batterHistorySequenceV291067">${xlsEsc(events.join(" · ")||"No pitch sequence recorded.")}</div><div class="batterHistoryResultV291067">Result: <strong>${xlsEsc(completed?(lastResult||"-"):"In Progress")}</strong></div></div>`;
    }).join("");
    return `<section class="batterHistoryDropdownV291067"><button type="button" class="batterHistoryToggleV291067" aria-expanded="false" data-target="playerAtBatsRefreshBody-${playerIndex}"><span class="batterHistoryArrowV291067">▶</span><b>#${xlsEsc(player.number)} ${xlsEsc(player.name)}</b><strong>${player.abs.length} AB</strong></button><div id="playerAtBatsRefreshBody-${playerIndex}" class="batterHistoryBodyV291067 hidden">${body||'<p class="batterHistoryEmptyV291067">No plate appearances recorded.</p>'}</div></section>`;
  }).join("")||'<p class="batterHistoryEmptyV291067">No History tags found for the current activity.</p>';
  box.querySelectorAll(".batterHistoryToggleV291067").forEach(button=>button.onclick=()=>{
    const body=$(button.dataset.target);if(!body)return;
    const opening=body.classList.contains("hidden");
    body.classList.toggle("hidden",!opening);
    button.setAttribute("aria-expanded",opening?"true":"false");
    const arrow=button.querySelector(".batterHistoryArrowV291067");if(arrow)arrow.textContent=opening?"▼":"▶";
  });
  const status=$("playerAtBatsRefreshStatusV291073");
  if(status)status.textContent=statusText||"Press REFRESH to analyze History";
}
function et291075Refresh(){
  const refresh=$("playerAtBatsRefreshV291073");
  if(refresh){refresh.disabled=true;refresh.textContent="ANALYZING...";}
  setTimeout(()=>{
    et291073ReloadPersistedState();
    et291075Draw(`${(typeof gt==="function"?gt():[]).length} History tags analyzed`);
    if(refresh){refresh.disabled=false;refresh.textContent="REFRESH";}
  },80);
}
function et291075Close(){
  et291075CollapseAll();
  closeSheets();
}
function et291075Open(){
  if(!et291067RequireActivity())return;
  const sheet=$("runnerEventSheetV294");if(!sheet)return;
  sheet.innerHTML='<div class="sheetHead"><h2>PLAYER AT-BATS</h2><button class="close" type="button">×</button></div><div class="playerAtBatsRefreshBarV291073"><button id="playerAtBatsRefreshV291073" type="button">REFRESH</button><small id="playerAtBatsRefreshStatusV291073">Press REFRESH to analyze History</small></div><div id="batterHistoryListV291067" class="batterHistoryListV291067"></div>';
  sheet.querySelector(".close")?.addEventListener("click",et291075Close);
  $("playerAtBatsRefreshV291073")?.addEventListener("click",et291075Refresh);
  /* Draw the last in-memory view without triggering a persisted-state analysis. */
  et291075Draw();
  et291075CollapseAll();
  if(typeof et291031ShowOnlySheet==="function")et291031ShowOnlySheet("runnerEventSheetV294");else openSheet("runnerEventSheetV294");
}
function et291075Post(){
  const button=$("runnerEventBtnV294");
  if(button){button.textContent="PLAYER AT-BATS";button.onclick=et291075Open;}
}
window.et291066OpenBatterHistory=et291075Open;
window.et291067OpenBatterHistory=et291075Open;

const et291075RenderBase=render;
render=function(){
  const output=et291075RenderBase.apply(this,arguments);
  setTimeout(et291075Post,0);
  return output;
};
window.addEventListener("load",()=>setTimeout(et291075Post,750));


/* ================= EASY TAGG v2.9.10.80 SAFE DELETE SYNC POSITION =================
   Deleted tags become hidden sync placeholders instead of being physically removed.
   This preserves every following tag's CSV row position and original timestamp.
=========================================================================== */
const et291080BaseGt=gt;
gt=function(){
  return state.tags.filter(t=>t.game_id===state.activeGameId&&!t.sync_deleted);
};

function et291080SyncTags(){
  return state.tags
    .filter(t=>t.game_id===state.activeGameId)
    .slice()
    .sort((a,b)=>Number(a.game_seconds||0)-Number(b.game_seconds||0));
}

csv=function(){
  return headers.join(",")+"\n"+et291080SyncTags().map(t=>{
    const row=etSyncExportTag(t);
    return headers.map(h=>esc(row[h])).join(",");
  }).join("\n");
};

window.et291080RestoreDeletedTag=function(id){
  const tag=state.tags.find(t=>t.tag_id===id&&t.sync_deleted);
  if(!tag)return false;
  tag.sync_deleted=false;
  tag.result=tag.sync_original_result||tag.result||"";
  tag.final_result=tag.sync_original_result||tag.final_result||"";
  tag.note=(tag.note||"").replace(/^SYNC DELETE PLACEHOLDER\s*\|?\s*/i,"");
  save();render();
  return true;
};

/* ================= EASY TAGG v2.9.10.81 OMIT + LATE TAG FLAG =================
   - History X toggles OMIT instead of physically deleting a tag.
   - Omitted tags stay visible and keep their original timestamp/position.
   - Manual red flag marks a tag as LATE_TAG for Easy Tagg Sync.
   - Sync CSV exports sync_status and sync_flag.
=========================================================================== */
const ET291081_VERSION="2.9.10.82 Corner Late Flag UI";

if(Array.isArray(headers)){
  if(!headers.includes("sync_status"))headers.push("sync_status");
  if(!headers.includes("sync_flag"))headers.push("sync_flag");
}

const et291081BaseSyncExportTag=etSyncExportTag;
etSyncExportTag=function(t){
  const row=et291081BaseSyncExportTag(t);
  row.sync_status=t.sync_deleted?"OMIT":"ACTIVE";
  row.sync_flag=t.sync_flag||"";
  return row;
};

function et291081ActiveGameTags(){
  return (state.tags||[])
    .filter(t=>t.game_id===state.activeGameId)
    .slice();
}

async function et291081ToggleOmit(id){
  const tag=(state.tags||[]).find(t=>t.tag_id===id);
  if(!tag)return;
  if(tag.sync_deleted){
    tag.sync_deleted=false;
    tag.sync_deleted_at="";
    tag.result=tag.sync_original_result||tag.result||"";
    tag.final_result=tag.sync_original_result||tag.final_result||"";
    tag.note=String(tag.note||"").replace(/^SYNC DELETE PLACEHOLDER\s*\|?\s*/i,"");
    save();render();
    if(typeof v243Toast==="function")v243Toast("Tag restored");
    return;
  }
  const label=`${tag.pitcher||"Pitcher"} vs ${tag.batter||"Batter"} · ${tag.final_result||tag.result||"Tag"}`;
  const confirmed=await etAppConfirmV131(
    `${label}\n\nThe tag will remain in History and keep its Sync position.`,
    {title:"OMIT TAG?",confirmText:"OMIT TAG",danger:true}
  );
  if(!confirmed)return;
  tag.sync_deleted=true;
  tag.sync_deleted_at=new Date().toISOString();
  tag.sync_original_result=tag.sync_original_result||tag.final_result||tag.result||"";
  tag.result="Omit";
  tag.final_result="Omit";
  tag.note=String(tag.note||"").replace(/^SYNC DELETE PLACEHOLDER\s*\|?\s*/i,"").trim();
  tag.note="SYNC DELETE PLACEHOLDER"+(tag.note?" | "+tag.note:"");
  save();render();
  if(typeof v243Toast==="function")v243Toast("Tag omitted; Sync position preserved");
}

function et291081ToggleLateFlag(id){
  const tag=(state.tags||[]).find(t=>t.tag_id===id);
  if(!tag)return;
  tag.sync_flag=tag.sync_flag==="LATE_TAG"?"":"LATE_TAG";
  tag.sync_flag_at=tag.sync_flag?new Date().toISOString():"";
  save();render();
  if(typeof v243Toast==="function")v243Toast(tag.sync_flag?"Late tag flagged":"Late tag flag removed");
}

window.et291081ToggleOmit=et291081ToggleOmit;
window.et291081ToggleLateFlag=et291081ToggleLateFlag;
window.v243DeleteTag=et291081ToggleOmit;
window.delTag=et291081ToggleOmit;
v243DeleteTag=et291081ToggleOmit;

renderHistory=function(){
  const list=$("historyList");
  if(!list)return;
  const q=($("histSearch")?.value||"").toLowerCase();
  const type=$("histType")?.value||"";
  const apMap=(typeof et29107BuildAPMap==="function")?et29107BuildAPMap():new Map();
  const rows=et291081ActiveGameTags().reverse().filter(t=>{
    const original=t.sync_deleted?(t.sync_original_result||""):(t.final_result||t.result||"");
    const txt=((t.pitcher||"")+" "+(t.batter||"")+" "+original+" "+(t.sync_flag||"")+" "+(t.sync_deleted?"omitted":"")).toLowerCase();
    if(q&&!txt.includes(q))return false;
    if(t.sync_deleted)return !type;
    if(type==="hits"&&!['Single','Double','Triple','HR'].includes(original))return false;
    if(type==="outs"&&!['Out','Ground Out','Fly Out','Line Out','Pop Out'].includes(original))return false;
    if(type==="k"&&!['K Swinging','K Looking','Strikeout'].includes(original))return false;
    if(type==="walks"&&!['BB','HBP'].includes(original))return false;
    return true;
  });
  list.innerHTML=rows.map(t=>{
    const original=t.sync_original_result||t.final_result||t.result||"";
    const displayResult=t.sync_deleted?"OMITTED":original;
    const cls=t.sync_deleted?"":((typeof resultClass==="function")?resultClass(original):"");
    const ap=apMap.get(t.tag_id)||1;
    const contact=t.contact_quality||"No Contact";
    const late=t.sync_flag==="LATE_TAG";
    return `<div class="tagCard ${t.sync_deleted?'tagCardOmittedV291081':''} ${late?'tagCardLateV291081':''}">
      <button class="historyCornerFlagV291082 ${late?'active':''}" type="button" title="Late Tag / Short Clip" aria-label="Late Tag / Short Clip" onclick="et291081ToggleLateFlag('${t.tag_id}')">🚩</button>
      <div class="tagTime">${t.game_time||""}<br><small>${t.half||""} ${t.inning||""}</small></div>
      <div class="tagMain"><b>${t.pitcher||""} vs ${t.batter||""}</b><br><small>${t.pitch_type||""} · ${contact} <span class="historyAPV29107">${t.null_pa?"· NULL":"· AB-"+ap}</span></small>${t.sync_deleted?'<div class="omitBadgeV291081">OMITTED · SYNC POSITION SAVED</div>':''}</div>
      <div class="tagRight"><div class="tagResult ${cls}">${displayResult}</div><div class="tagActions"><button class="editMini" type="button" onclick="openEditTag('${t.tag_id}')" ${t.sync_deleted?'disabled':''}>Edit</button><button class="deleteMini ${t.sync_deleted?'restoreOmitV291081':''}" type="button" title="${t.sync_deleted?'Restore tag':'Omit tag'}" onclick="et291081ToggleOmit('${t.tag_id}')">${t.sync_deleted?'↶':'X'}</button></div></div>
    </div>`;
  }).join("")||"<p>No tags recorded.</p>";
};

/* ================= EASY TAGG v2.9.10.89 ROSTER CARD RENDER FIX =================
   Restores one independent card per activity player.
   Prevents malformed/nested action markup and duplicated Edit Number buttons.
   Preserves database-player editing, activity removal, deletion, search and lineup logic.
   ============================================================================== */
const ET291089_VERSION="2.9.10.89 Roster Card Render Fix";
function et291089ActivityRosterPlayers(){
  const source=typeof et253Players==="function"
    ? et253Players()
    : (typeof et252ActivityPlayers==="function"?et252ActivityPlayers():(state.players||[]));
  const q=String($("search")?.value||"").trim().toLowerCase();
  return source.filter(player=>!q||String(player?.name||"").toLowerCase().includes(q));
}
function et291089RosterDetails(player){
  const isDatabase=typeof et2991IsDatabasePlayer==="function"&&et2991IsDatabasePlayer(player);
  if(isDatabase&&typeof et2992RosterDetails==="function")return et2992RosterDetails(player);
  if(typeof et299PlayerDetails==="function")return et299PlayerDetails(player);
  return `<div class="playerDetailsV299"><span><b>Role:</b> ${xlsEsc(player?.role||"—")}</span></div>`;
}
function et291089RenderRosterCards(){
  const box=$("players");
  if(!box)return;
  const players=et291089ActivityRosterPlayers();
  box.innerHTML=players.map(player=>{
    const id=String(player?.id||"").replace(/'/g,"\\'");
    const isDatabase=typeof et2991IsDatabasePlayer==="function"&&et2991IsDatabasePlayer(player);
    const hand=!isDatabase
      ? `<div class="playerHandV299">${xlsEsc(player?.bat||"")}${player?.bat&&player?.thr?" / ":""}${xlsEsc(player?.thr||"")}</div>`
      : "";
    return `<div class="playerCard ${isDatabase?"databasePlayerCardV2991":""}" data-player-id="${xlsEsc(player?.id||"")}">
      <div class="playerRow ${isDatabase?"databasePlayerRowV2992":""}">
        <div class="num">${xlsEsc(player?.num||"-")}</div>
        <div class="playerMainInfoV299">
          <b>${xlsEsc(player?.name||"No name")}</b>
          ${et291089RosterDetails(player)}
          <div class="activityScopeV252">Current Activity</div>
        </div>
        ${hand}
      </div>
      <div class="actions">
        <button type="button" onclick="editPlayer('${id}')">Edit</button>
        <button type="button" onclick="et254RemoveFromActivity('${id}')">Remove from Activity</button>
        <button type="button" class="danger" onclick="et254DeletePlayer('${id}')">Delete</button>
      </div>
    </div>`;
  }).join("")||"<p>No players are assigned to this activity. Use Add Existing Player or create a new one.</p>";
}
const et291089RenderPlayersBase=renderPlayers;
renderPlayers=function(){
  if(typeof et27RenderPlayers==="function")et27RenderPlayers();
  else if(typeof et291089RenderPlayersBase==="function")et291089RenderPlayersBase();
  et291089RenderRosterCards();
};
window.et291089RenderRosterCards=et291089RenderRosterCards;
window.addEventListener("load",()=>{et291089RenderRosterCards();});


/* ================= EASY TAGG v2.9.10.90 ADD EXISTING PLAYER SEARCH =================
   Adds a focused search field and alphabetical ordering only inside
   Add Existing Player. Does not mutate player data or alter roster cards,
   lineup, tagging, History, reports, Sync, TrackMan or update behavior.
   ================================================================================ */
const ET291090_VERSION="2.9.10.90 Add Existing Player Search & Alphabetical Sort";
function et291090NormalizeSearch(value){
  return String(value||"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/\s+/g," ")
    .trim();
}
function et291090ExistingPlayerRows(){
  const query=et291090NormalizeSearch($("activityRosterSearchV291090")?.value||"");
  return [...(state.players||[])]
    .filter(player=>{
      if(!query)return true;
      const searchable=et291090NormalizeSearch([
        player?.name,
        player?.num,
        player?.team,
        player?.role,
        player?.position,
        player?.player_code,
        player?.db_player_code
      ].filter(Boolean).join(" "));
      return searchable.includes(query);
    })
    .sort((a,b)=>String(a?.name||"").localeCompare(String(b?.name||""),undefined,{sensitivity:"base",numeric:true}));
}
function et291090RenderActivityPicker(){
  const box=$("activityRosterListV252");
  if(!box)return;
  const ids=typeof et254ActivityIds==="function"?et254ActivityIds():(typeof et253GetIds==="function"?et253GetIds():[]);
  const players=et291090ExistingPlayerRows();
  box.innerHTML=players.map((player,index)=>{
    const inside=ids.includes(player.id);
    const id=String(player.id||"").replace(/'/g,"\\'");
    const hand=typeof et254HandText==="function"?et254HandText(player):[player.bat||"",player.thr||""].filter(Boolean).join(" / ");
    return `<div class="activityPlayerV252" data-player-id="${xlsEsc(player.id||"")}">
      <div class="num">${xlsEsc(player.num||index+1)}</div>
      <div>
        <b>${xlsEsc(player.name||"No name")}</b><br>
        <small>${xlsEsc(player.role||"")} · ${xlsEsc(hand||"-")}</small>
      </div>
      <button type="button" class="${inside?"danger":""}" onclick="${inside?"et254RemoveFromActivity":"et254AddToActivity"}('${id}')">${inside?"Remove":"Add"}</button>
    </div>`;
  }).join("")||(query=>query?"<p>No players found.</p>":"<p>No players are in the main roster.</p>")(et291090NormalizeSearch($("activityRosterSearchV291090")?.value||""));
}
window.et291090RenderActivityPicker=et291090RenderActivityPicker;
window.et252RenderPicker=et291090RenderActivityPicker;
window.addEventListener("load",()=>{
  const search=$("activityRosterSearchV291090");
  if(search&&!search.dataset.et291090Bound){
    search.dataset.et291090Bound="1";
    search.addEventListener("input",et291090RenderActivityPicker);
  }
  const button=$("addToActivityRosterBtnV252");
  if(button){
    button.onclick=()=>{
      if(search)search.value="";
      et291090RenderActivityPicker();
      openSheet("activityRosterSheetV252");
      setTimeout(()=>search?.focus(),50);
    };
  }
});

/* ================= EASY TAGG v2.9.10.91 PLAYER AT-BATS STABILITY FIX =================
   - Single, reliable vertical scroll for every plate appearance.
   - REFRESH controls are initialized immediately when the game UI is available.
   - Stable top-player labels prevent the visible Spanish-to-English/name repaint.
   - History analysis, tagging, roster, Sync, reports and exports remain untouched.
   ==================================================================================== */
const ET291091_VERSION="2.9.10.91 Player At-Bats Stability Fix";

function et291091SetText(id,value){
  const element=$(id);
  if(element&&element.textContent!==String(value))element.textContent=String(value);
}

/* Keep the original top-panel data contract, but write final English labels once. */
renderTop=function(){
  const batter=pl(state.batter),pitcher=pl(state.pitcher);
  et291091SetText("batterName",batter?`#${batter.num||""} ${batter.name}`:"Select");
  et291091SetText("pitcherName",pitcher?`#${pitcher.num||""} ${pitcher.name}`:"Select");
  et291091SetText("balls",state.balls);
  et291091SetText("strikes",state.strikes);
  et291091SetText("outs",state.outs);
  const activeTags=gt();
  et291091SetText("tagCount",activeTags.length);
  et291091SetText("clipCount",activeTags.filter(tag=>tag.clip_start_seconds!=="").length);
  et291091SetText("pitchCount",activeTags.length);
  const side=$("battingSide");
  if(side&&side.value!==(state.battingSide||"away"))side.value=state.battingSide||"away";
};

function et291091BuildPlayerAtBatsShell(){
  const sheet=$("runnerEventSheetV294");
  if(!sheet)return false;
  sheet.classList.add("playerAtBatsSheetV291091");
  sheet.innerHTML='<div class="sheetHead"><h2>PLAYER AT-BATS</h2><button class="close" type="button">×</button></div><div class="playerAtBatsRefreshBarV291073"><button id="playerAtBatsRefreshV291073" type="button">REFRESH</button><small id="playerAtBatsRefreshStatusV291073">Press REFRESH to analyze History</small></div><div id="batterHistoryListV291067" class="batterHistoryListV291067"></div>';
  sheet.querySelector(".close")?.addEventListener("click",et291075Close);
  $("playerAtBatsRefreshV291073")?.addEventListener("click",et291075Refresh);
  return true;
}

function et291091OpenPlayerAtBats(){
  if(!et291067RequireActivity())return;
  if(!et291091BuildPlayerAtBatsShell())return;
  et291075Draw();
  et291075CollapseAll();
  if(typeof et291031ShowOnlySheet==="function")et291031ShowOnlySheet("runnerEventSheetV294");
  else openSheet("runnerEventSheetV294");
  requestAnimationFrame(()=>{
    const list=$("batterHistoryListV291067");
    if(list)list.scrollTop=0;
  });
}

function et291091BindPlayerAtBats(){
  const button=$("runnerEventBtnV294");
  if(button){
    button.textContent="PLAYER AT-BATS";
    button.onclick=et291091OpenPlayerAtBats;
  }
  /* Prepare the controls immediately, even before the first panel opening. */
  const sheet=$("runnerEventSheetV294");
  if(sheet&&!$("playerAtBatsRefreshV291073")&&sheet.classList.contains("hidden")){
    et291091BuildPlayerAtBatsShell();
  }
}

window.et291066OpenBatterHistory=et291091OpenPlayerAtBats;
window.et291067OpenBatterHistory=et291091OpenPlayerAtBats;
window.et291091OpenPlayerAtBats=et291091OpenPlayerAtBats;

const et291091RenderBase=render;
render=function(){
  const output=et291091RenderBase.apply(this,arguments);
  et291091BindPlayerAtBats();
  return output;
};

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",()=>{
    et291091BindPlayerAtBats();
    renderTop();
  },{once:true});
}else{
  et291091BindPlayerAtBats();
  renderTop();
}
window.addEventListener("load",()=>{
  et291091BindPlayerAtBats();
  renderTop();
});

/* ================= EASY TAGG v2.9.10.92 PLAYER AT-BATS FULL SCREEN ACCORDION =================
   - Dedicated full-screen Player At-Bats view.
   - Only one player may be expanded at a time.
   - One vertical scroll area for the complete player/AB list.
   - Existing History analysis and REFRESH behavior are preserved.
   ============================================================================================= */
const ET291092_VERSION="2.9.10.92 Player At-Bats Full Screen Accordion";

function et291092CollapseExcept(activeBody){
  const sheet=$("runnerEventSheetV294");
  if(!sheet)return;
  sheet.querySelectorAll(".batterHistoryBodyV291067").forEach(body=>{
    const shouldOpen=body===activeBody;
    body.classList.toggle("hidden",!shouldOpen);
    const button=sheet.querySelector(`.batterHistoryToggleV291067[data-target="${body.id}"]`);
    if(button){
      button.setAttribute("aria-expanded",shouldOpen?"true":"false");
      const arrow=button.querySelector(".batterHistoryArrowV291067");
      if(arrow)arrow.textContent=shouldOpen?"▼":"▶";
    }
  });
}

function et291092Draw(statusText){
  const box=$("batterHistoryListV291067");
  if(!box)return;
  const players=et291073AnalyzeHistory();
  box.innerHTML=players.map((player,playerIndex)=>{
    const body=player.abs.map((tags,abIndex)=>{
      const events=tags.map(et291075Event).filter(Boolean);
      const last=tags[tags.length-1]||{};
      const lastResult=String(last.final_result||last.result||"").trim();
      const completed=(typeof pa==="function"&&pa(lastResult));
      return `<div class="batterHistoryAbV291067"><b>AB-${abIndex+1}${completed?"":" (LIVE)"}</b><div class="batterHistorySequenceV291067">${xlsEsc(events.join(" · ")||"No pitch sequence recorded.")}</div><div class="batterHistoryResultV291067">Result: <strong>${xlsEsc(completed?(lastResult||"-"):"In Progress")}</strong></div></div>`;
    }).join("");
    return `<section class="batterHistoryDropdownV291067"><button type="button" class="batterHistoryToggleV291067" aria-expanded="false" data-target="playerAtBatsFullBody-${playerIndex}"><span class="batterHistoryArrowV291067">▶</span><b>#${xlsEsc(player.number)} ${xlsEsc(player.name)}</b><strong>${player.abs.length} AB</strong></button><div id="playerAtBatsFullBody-${playerIndex}" class="batterHistoryBodyV291067 hidden">${body||'<p class="batterHistoryEmptyV291067">No plate appearances recorded.</p>'}</div></section>`;
  }).join("")||'<p class="batterHistoryEmptyV291067">No History tags found for the current activity.</p>';

  box.querySelectorAll(".batterHistoryToggleV291067").forEach(button=>{
    button.onclick=()=>{
      const body=$(button.dataset.target);
      if(!body)return;
      const opening=body.classList.contains("hidden");
      if(opening){
        et291092CollapseExcept(body);
        requestAnimationFrame(()=>{
          button.scrollIntoView({block:"start",behavior:"smooth"});
        });
      }else{
        et291092CollapseExcept(null);
      }
    };
  });

  const status=$("playerAtBatsRefreshStatusV291073");
  if(status)status.textContent=statusText||"Press REFRESH to analyze History";
}

/* Keep REFRESH behavior but render the new accordion view. */
et291075Draw=et291092Draw;

function et291092BuildPlayerAtBatsShell(){
  const sheet=$("runnerEventSheetV294");
  if(!sheet)return false;
  sheet.classList.add("playerAtBatsSheetV291091","playerAtBatsFullScreenV291092");
  sheet.innerHTML='<div class="sheetHead"><h2>PLAYER AT-BATS</h2><button class="close" type="button" aria-label="Close Player At-Bats">×</button></div><div class="playerAtBatsRefreshBarV291073"><button id="playerAtBatsRefreshV291073" type="button">REFRESH</button><small id="playerAtBatsRefreshStatusV291073">Press REFRESH to analyze History</small></div><div id="batterHistoryListV291067" class="batterHistoryListV291067"></div>';
  sheet.querySelector(".close")?.addEventListener("click",et291075Close);
  $("playerAtBatsRefreshV291073")?.addEventListener("click",et291075Refresh);
  return true;
}

function et291092OpenPlayerAtBats(){
  if(!et291067RequireActivity())return;
  if(!et291092BuildPlayerAtBatsShell())return;
  et291092Draw();
  et291092CollapseExcept(null);
  if(typeof et291031ShowOnlySheet==="function")et291031ShowOnlySheet("runnerEventSheetV294");
  else openSheet("runnerEventSheetV294");
  requestAnimationFrame(()=>{
    const list=$("batterHistoryListV291067");
    if(list)list.scrollTop=0;
  });
}

function et291092BindPlayerAtBats(){
  const button=$("runnerEventBtnV294");
  if(button){
    button.textContent="PLAYER AT-BATS";
    button.onclick=et291092OpenPlayerAtBats;
  }
}

window.et291066OpenBatterHistory=et291092OpenPlayerAtBats;
window.et291067OpenBatterHistory=et291092OpenPlayerAtBats;
window.et291091OpenPlayerAtBats=et291092OpenPlayerAtBats;
window.et291092OpenPlayerAtBats=et291092OpenPlayerAtBats;

const et291092RenderBase=render;
render=function(){
  const output=et291092RenderBase.apply(this,arguments);
  et291092BindPlayerAtBats();
  return output;
};

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",et291092BindPlayerAtBats,{once:true});
else et291092BindPlayerAtBats();
window.addEventListener("load",et291092BindPlayerAtBats);

/* ================= EASY TAGG v2.9.10.93 PLAYER AT-BATS INTERNAL AB SCROLL FIX =================
   - Preserves the full-screen accordion introduced in v2.9.10.92.
   - Only the expanded player's plate appearances scroll internally.
   - Opening a player resets its AB list to AB-1 and keeps other players closed.
   - Existing History analysis and REFRESH behavior remain unchanged.
   ============================================================================================== */
const ET291093_VERSION="2.9.10.93 Player At-Bats Internal AB Scroll Fix";

function et291093PrepareExpandedBody(body){
  if(!body)return;
  body.scrollTop=0;
  body.addEventListener("click",event=>event.stopPropagation());
  body.addEventListener("touchstart",event=>event.stopPropagation(),{passive:true});
  body.addEventListener("touchmove",event=>event.stopPropagation(),{passive:true});
  body.addEventListener("wheel",event=>event.stopPropagation(),{passive:true});
}

function et291093CollapseExcept(activeBody){
  const sheet=$("runnerEventSheetV294");
  if(!sheet)return;
  sheet.querySelectorAll(".batterHistoryBodyV291067").forEach(body=>{
    const shouldOpen=body===activeBody;
    body.classList.toggle("hidden",!shouldOpen);
    if(shouldOpen)et291093PrepareExpandedBody(body);
    const button=sheet.querySelector(`.batterHistoryToggleV291067[data-target="${body.id}"]`);
    if(button){
      button.setAttribute("aria-expanded",shouldOpen?"true":"false");
      const arrow=button.querySelector(".batterHistoryArrowV291067");
      if(arrow)arrow.textContent=shouldOpen?"▼":"▶";
    }
  });
}

/* Replace only the accordion interaction after the existing renderer builds the cards. */
const et291093DrawBase=et291092Draw;
function et291093Draw(statusText){
  et291093DrawBase(statusText);
  const box=$("batterHistoryListV291067");
  if(!box)return;
  box.querySelectorAll(".batterHistoryToggleV291067").forEach(button=>{
    button.onclick=()=>{
      const body=$(button.dataset.target);
      if(!body)return;
      const opening=body.classList.contains("hidden");
      if(opening){
        et291093CollapseExcept(body);
        requestAnimationFrame(()=>{
          button.scrollIntoView({block:"nearest",behavior:"smooth"});
          body.scrollTop=0;
        });
      }else{
        et291093CollapseExcept(null);
      }
    };
  });
}

et291075Draw=et291093Draw;
window.et291093CollapseExcept=et291093CollapseExcept;

/* ================= EASY TAGG v2.9.10.94 PLAYER AT-BATS TWO-LEVEL VIEW =================
   - Replaces nested accordion scrolling with a stable two-level navigation flow.
   - Level 1 shows the player list; Level 2 shows one player's complete AB history.
   - The detail view uses one dedicated vertical scroll area and a BACK button.
   - Existing manual REFRESH and History analysis logic remain unchanged.
   ====================================================================================== */
const ET291094_VERSION="2.9.10.94 Player At-Bats Two-Level View";
let et291094SelectedPlayerKey="";

function et291094PlayerKey(player){
  return `${String(player?.number||"").trim()}|${String(player?.name||"").trim()}`;
}

function et291094BuildAbHtml(player){
  const nullHtml=(player?.null_pas||[]).map(tags=>{
    const events=tags.map(et291075Event).filter(Boolean);
    const last=tags[tags.length-1]||{};
    const reason=String(last.null_pa_reason||"INNING ENDED").trim();
    return `<article class="playerAtBatsDetailAbV291094 playerAtBatsNullPaV2910104"><b>INCOMPLETE PA · NULL</b><div class="batterHistorySequenceV291067">${xlsEsc(events.join(" · ")||"No pitch sequence recorded.")}</div><div class="batterHistoryResultV291067">Status: <strong>${xlsEsc(reason)}</strong></div></article>`;
  }).join("");
  const abHtml=(player?.abs||[]).map((tags,abIndex)=>{
    const events=tags.map(et291075Event).filter(Boolean);
    const last=tags[tags.length-1]||{};
    const lastResult=String(last.final_result||last.result||"").trim();
    const completed=(typeof pa==="function"&&pa(lastResult));
    return `<article class="playerAtBatsDetailAbV291094"><b>AB-${abIndex+1}${completed?"":" (LIVE)"}</b><div class="batterHistorySequenceV291067">${xlsEsc(events.join(" · ")||"No pitch sequence recorded.")}</div><div class="batterHistoryResultV291067">Result: <strong>${xlsEsc(completed?(lastResult||"-"):"In Progress")}</strong></div></article>`;
  }).join("");
  return nullHtml+abHtml||'<p class="batterHistoryEmptyV291067">No plate appearances recorded.</p>';
}

function et291094RenderPlayerList(players){
  const box=$("batterHistoryListV291067");
  if(!box)return;
  box.className="batterHistoryListV291067 playerAtBatsPlayerListV291094";
  box.innerHTML=players.map((player,index)=>`<button type="button" class="playerAtBatsPlayerRowV291094" data-player-index="${index}"><span class="playerAtBatsPlayerArrowV291094">▶</span><b>#${xlsEsc(player.number)} ${xlsEsc(player.name)}</b><strong>${player.abs.length} AB</strong></button>`).join("")||'<p class="batterHistoryEmptyV291067">No History tags found for the current activity.</p>';
  box.querySelectorAll(".playerAtBatsPlayerRowV291094").forEach(button=>{
    button.onclick=()=>{
      const player=players[Number(button.dataset.playerIndex)];
      if(!player)return;
      et291094SelectedPlayerKey=et291094PlayerKey(player);
      et291094RenderDetail(player);
    };
  });
  box.scrollTop=0;
}

function et291094RenderDetail(player){
  const box=$("batterHistoryListV291067");
  if(!box)return;
  box.className="batterHistoryListV291067 playerAtBatsDetailViewV291094";
  box.innerHTML=`<div class="playerAtBatsDetailHeaderV291094"><button type="button" class="playerAtBatsBackV291094" aria-label="Back to player list">← BACK</button><div class="playerAtBatsDetailIdentityV291094"><b>#${xlsEsc(player.number)} ${xlsEsc(player.name)}</b><strong>${player.abs.length} AB</strong></div></div><div class="playerAtBatsAbScrollV291094">${et291094BuildAbHtml(player)}</div>`;
  box.querySelector(".playerAtBatsBackV291094")?.addEventListener("click",()=>{
    et291094SelectedPlayerKey="";
    et291094Draw();
  });
  const scroller=box.querySelector(".playerAtBatsAbScrollV291094");
  if(scroller)scroller.scrollTop=0;
}

function et291094Draw(statusText){
  const players=et291073AnalyzeHistory();
  const selected=et291094SelectedPlayerKey?players.find(player=>et291094PlayerKey(player)===et291094SelectedPlayerKey):null;
  if(selected)et291094RenderDetail(selected);
  else{
    et291094SelectedPlayerKey="";
    et291094RenderPlayerList(players);
  }
  const status=$("playerAtBatsRefreshStatusV291073");
  if(status)status.textContent=statusText||"Press REFRESH to analyze History";
}

function et291094OpenPlayerAtBats(){
  if(!et291067RequireActivity())return;
  et291094SelectedPlayerKey="";
  if(!et291092BuildPlayerAtBatsShell())return;
  const sheet=$("runnerEventSheetV294");
  if(sheet)sheet.classList.add("playerAtBatsTwoLevelV291094");
  et291094Draw();
  if(typeof et291031ShowOnlySheet==="function")et291031ShowOnlySheet("runnerEventSheetV294");
  else openSheet("runnerEventSheetV294");
}

/* Preserve the existing REFRESH function while routing its output through the two-level renderer. */
et291075Draw=et291094Draw;

function et291094BindPlayerAtBats(){
  const button=$("runnerEventBtnV294");
  if(button){
    button.textContent="PLAYER AT-BATS";
    button.onclick=et291094OpenPlayerAtBats;
  }
}

window.et291066OpenBatterHistory=et291094OpenPlayerAtBats;
window.et291067OpenBatterHistory=et291094OpenPlayerAtBats;
window.et291091OpenPlayerAtBats=et291094OpenPlayerAtBats;
window.et291092OpenPlayerAtBats=et291094OpenPlayerAtBats;
window.et291094OpenPlayerAtBats=et291094OpenPlayerAtBats;

const et291094RenderBase=render;
render=function(){
  const output=et291094RenderBase.apply(this,arguments);
  et291094BindPlayerAtBats();
  return output;
};

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",et291094BindPlayerAtBats,{once:true});
else et291094BindPlayerAtBats();
window.addEventListener("load",et291094BindPlayerAtBats);


/* ================= EASY TAGG v2.9.10.100 =================
   Persistent complete Light / Dark Mode.
   ======================================================== */
const ET2910100_THEME_KEY="easyTaggThemeV2910100";
function et2910100GetTheme(){
  try{return localStorage.getItem(ET2910100_THEME_KEY)==="light"?"light":"dark";}catch(_e){return "dark";}
}
function et2910100ApplyTheme(theme,persist=true){
  const normalized=theme==="light"?"light":"dark";
  document.documentElement.setAttribute("data-theme",normalized);
  document.body?.setAttribute("data-theme",normalized);
  const toggle=document.getElementById("themeToggleV2910100");
  const label=document.getElementById("themeModeLabelV2910100");
  const icon=document.querySelector(".themeIconV2910100");
  if(toggle){toggle.checked=normalized==="light";toggle.setAttribute("aria-checked",toggle.checked?"true":"false");}
  if(label)label.textContent=normalized==="light"?"LIGHT MODE":"DARK MODE";
  if(icon)icon.textContent=normalized==="light"?"☀":"☾";
  if(persist){try{localStorage.setItem(ET2910100_THEME_KEY,normalized);}catch(_e){}}
  window.dispatchEvent(new CustomEvent("easytaggthemechange",{detail:{theme:normalized}}));
}
function et2910100BindTheme(){
  const toggle=document.getElementById("themeToggleV2910100");
  et2910100ApplyTheme(et2910100GetTheme(),false);
  if(toggle&&!toggle.dataset.themeBound){
    toggle.dataset.themeBound="1";
    toggle.addEventListener("change",()=>et2910100ApplyTheme(toggle.checked?"light":"dark",true));
  }
}
window.et2910100ApplyTheme=et2910100ApplyTheme;
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",et2910100BindTheme,{once:true});
else et2910100BindTheme();
window.addEventListener("load",et2910100BindTheme);


/* ================= EASY TAGG v2.9.10.101 RESULT FOUL + PITCHER NUMBER CONTRAST =================
   - Adds FOUL to the RESULT outcome sheet.
   - RESULT > FOUL preserves the exact live count and current batter.
   - Existing quick FOUL behavior is untouched and still follows normal pitch-count logic.
   - Ensures Foul remains available in History > Edit Tag.
   ================================================================================================ */
const ET2910101_VERSION="2.9.10.101 Result Foul + Pitcher Number Contrast";

/* RESULT > FOUL is an outcome annotation, not a count-changing quick pitch tag. */
const et2910101FinalizeNonContactBase=etV275FinalizeNonContact;
etV275FinalizeNonContact=function(result){
  if(result!=="Foul")return et2910101FinalizeNonContactBase.apply(this,arguments);
  const preserved={
    balls:state.balls,
    strikes:state.strikes,
    outs:state.outs,
    batter:state.batter,
    paInHalf:state.paInHalf
  };
  const out=et2910101FinalizeNonContactBase.apply(this,arguments);
  state.balls=preserved.balls;
  state.strikes=preserved.strikes;
  state.outs=preserved.outs;
  state.batter=preserved.batter;
  state.paInHalf=preserved.paInHalf;
  save();
  render();
  return out;
};
window.etV275FinalizeNonContact=etV275FinalizeNonContact;

function et2910101EnsureFoulEditor(){
  const sel=$("editResult");
  if(sel&&!Array.from(sel.options).some(o=>o.value==="Foul"||o.textContent.trim()==="Foul")){
    const outOpt=Array.from(sel.options).find(o=>o.value==="Out");
    const opt=new Option("Foul","Foul");
    if(outOpt)sel.insertBefore(opt,outOpt);else sel.add(opt);
  }
  if(typeof et2999ValueConfig!=="undefined"&&et2999ValueConfig.editResult){
    const vals=et2999ValueConfig.editResult.values;
    if(Array.isArray(vals)&&!vals.includes("Foul")){
      const outIndex=vals.indexOf("Out");
      if(outIndex>=0)vals.splice(outIndex,0,"Foul");else vals.push("Foul");
    }
  }
}

function et2910101WireResultFoul(){
  document.querySelectorAll('[data-sheet-result="Foul"]').forEach(btn=>{
    btn.textContent="FOUL";
    btn.onclick=()=>etV275ChooseResult("Foul");
  });
  et2910101EnsureFoulEditor();
}

window.addEventListener("load",()=>{
  et2910101WireResultFoul();
  setTimeout(et2910101WireResultFoul,250);
  setTimeout(et2910101WireResultFoul,900);
});


/* ================= EASY TAGG v2.9.10.102 FOUL COUNT + NULL PA INNING CARRY =================
   - RESULT > FOUL follows baseball count rules: adds strike at 0/1 strikes, stays at 2.
   - Keeps same batter, balls and outs for Result > Foul.
   - When a half-inning/inning is changed with an unfinished batter, prior pitches are marked
     as a NULL plate-appearance fragment, excluded from official AB/PA grouping, and never
     merged into the batter's next-inning plate appearance.
   - The lineup position is not advanced for a NULL fragment; count restarts 0-0 on inning/side change.
   ============================================================================================ */
const ET2910102_VERSION="2.9.10.102 Foul Count + Null PA Inning Carry";

/* Correct RESULT > FOUL count while preserving batter and non-strike state. */
const et2910102FinalizeBase=etV275FinalizeNonContact;
etV275FinalizeNonContact=function(result){
  if(result!=="Foul")return et2910102FinalizeBase.apply(this,arguments);
  const before={balls:state.balls,strikes:state.strikes,outs:state.outs,batter:state.batter,paInHalf:state.paInHalf};
  const out=et2910102FinalizeBase.apply(this,arguments);
  state.balls=before.balls;
  state.strikes=before.strikes<2?before.strikes+1:2;
  state.outs=before.outs;
  state.batter=before.batter;
  state.paInHalf=before.paInHalf;
  save();render();
  return out;
};
window.etV275FinalizeNonContact=etV275FinalizeNonContact;

function et2910102IsTerminalTag(tag){
  if(!tag)return false;
  if(typeof reportTerminalResultV292==="function")return reportTerminalResultV292(tag);
  return new Set(["BB","HBP","K Swinging","K Looking","Single","Double","Triple","HR","Out","Error","Fielder's Choice","Sac Fly","Sac Bunt","Ground Out","Fly Out","Line Out","Pop Out"]).has(String(tag.final_result||tag.result||"").trim());
}

/* Mark only the unfinished current PA fragment for the active batter/half. */
function et2910102MarkOpenPaNull(reason="INNING END"){
  if(!game()||!state.batter)return 0;
  const inning=String($("inning")?.value||"");
  const half=String($("half")?.value||"");
  const side=String(state.battingSide||"");
  const tags=gt().slice().sort((a,b)=>{
    const sa=Number(a.game_seconds),sb=Number(b.game_seconds);
    if(Number.isFinite(sa)&&Number.isFinite(sb)&&sa!==sb)return sa-sb;
    return String(a.created_at||"").localeCompare(String(b.created_at||""));
  });
  const open=[];
  for(let i=tags.length-1;i>=0;i--){
    const t=tags[i];
    if(String(t.batter_id||"")!==String(state.batter||""))continue;
    if(et2910102IsTerminalTag(t))break;
    const sameInning=!inning||String(t.inning||"")===inning;
    const sameHalf=!half||String(t.half||"")===half;
    const sameSide=!side||!t.batting_side||String(t.batting_side)===side;
    if(sameInning&&sameHalf&&sameSide&&!t.pending_result)open.push(t);
  }
  if(!open.length)return 0;
  open.forEach(t=>{t.null_pa=true;t.null_pa_reason=reason;});
  save();
  return open.length;
}
window.et2910102MarkOpenPaNull=et2910102MarkOpenPaNull;

/* Official PA/AB reports ignore NULL fragments, but the raw tags remain in History/CSV/Sync. */
reportPaGroupsV279=function(){
  const groups={},open={};
  const tags=gt().slice().sort((a,b)=>{
    const sa=Number(a.game_seconds),sb=Number(b.game_seconds);
    if(Number.isFinite(sa)&&Number.isFinite(sb)&&sa!==sb)return sa-sb;
    return String(a.created_at||"").localeCompare(String(b.created_at||""));
  });
  tags.forEach(t=>{
    if(t.null_pa)return;
    const player=String(t.batter||"No Player").trim()||"No Player";
    if(!open[player])open[player]=[];
    open[player].push(t);
    if(reportTerminalResultV292(t)){
      if(!groups[player])groups[player]=[];
      groups[player].push(open[player].slice());
      open[player]=[];
    }
  });
  return groups;
};

/* Keep resolved Batter History from merging NULL fragments into the next inning. */
if(typeof et291068ResolvedGroups==="function"){
  et291068ResolvedGroups=function(){
    const tags=gt().slice().filter(t=>!t.null_pa);
    const abMap=et291068ResolvedAbMap(tags);
    const players=new Map();
    tags.forEach((tag,index)=>{
      const playerKey=String(tag.batter_id||("name:"+(tag.batter||"No Player")));
      if(!players.has(playerKey))players.set(playerKey,{id:tag.batter_id||"",name:String(tag.batter||pn(tag.batter_id)||"No Player"),abs:new Map()});
      const ab=Number(abMap.get(tag.tag_id)||1),group=players.get(playerKey);
      if(!group.abs.has(ab))group.abs.set(ab,[]);
      group.abs.get(ab).push({tag,index});
    });
    return [...players.values()].map(player=>{
      player.abs=[...player.abs.entries()].sort((a,b)=>a[0]-b[0]).map(([number,items])=>({number,tags:items.sort((a,b)=>a.index-b.index).map(item=>item.tag)}));
      return player;
    }).sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:"base"}));
  };
}

/* Side change = end/start of a half inning. Preserve lineup pointer, null unfinished PA, reset live count. */
if(typeof et2998SetSide==="function"){
  const et2910102SetSideBase=et2998SetSide;
  et2998SetSide=function(side){
    const old=state.battingSide||"away";
    if(side!==old)et2910102MarkOpenPaNull("HALF INNING END");
    const out=et2910102SetSideBase.apply(this,arguments);
    if(side!==old){state.balls=0;state.strikes=0;state.outs=0;state.paInHalf=0;save();render();}
    return out;
  };
  window.et2998SetSide=et2998SetSide;
}

/* Inning picker can also end an unfinished PA (BP/manual workflows). */
if(typeof et2998RenderInningPicker==="function"){
  const et2910102InningPickerBase=et2998RenderInningPicker;
  et2998RenderInningPicker=function(){
    const out=et2910102InningPickerBase.apply(this,arguments);
    document.querySelectorAll('[data-inning-v2998]').forEach(btn=>{
      const target=String(btn.dataset.inningV2998||"");
      btn.onclick=()=>{
        const current=String($("inning")?.value||"");
        if(target!==current){
          et2910102MarkOpenPaNull("INNING END");
          state.balls=0;state.strikes=0;state.outs=0;state.paInHalf=0;
          if($("inning"))$("inning").value=target;
          save();closeSheets();render();
        }else closeSheets();
      };
    });
    return out;
  };
  window.et2998RenderInningPicker=et2998RenderInningPicker;
}

/* Re-wire Result > Foul after all wrappers are installed. */
function et2910102Wire(){
  document.querySelectorAll('[data-sheet-result="Foul"]').forEach(btn=>{btn.textContent="FOUL";btn.onclick=()=>etV275ChooseResult("Foul");});
}
window.addEventListener("load",()=>{et2910102Wire();setTimeout(et2910102Wire,300);setTimeout(et2910102Wire,1000);});

/* ================= EASY TAGG v2.9.10.103 CS / PICKOFF NULL-PA LOGIC =================
   - Adds CS and Pickoff to Result and History > Edit Tag > Result.
   - Both are runner-out events, not official batter terminal results.
   - They add one out. Only when the event creates the third out is the open batter sequence
     marked NULL/INCOMPLETE, excluded from In-Game Data and Batter Chart, while remaining in
     History, Sync and pitcher pitch data.
   - On a non-third-out CS/Pickoff, the batter and count remain unchanged.
   - On a third-out CS/Pickoff, the same batter remains next in the lineup with a fresh 0-0 count.
   ==================================================================================== */
const ET2910103_VERSION="2.9.10.103 CS Pickoff Null PA";

function et2910103IsRunnerOutResult(result){
  return result==="CS"||result==="Pickoff";
}

function et2910103EnsureRunnerOutEditor(){
  const sel=$("editResult");
  if(sel){
    ["CS","Pickoff"].forEach(v=>{
      if(!Array.from(sel.options).some(o=>o.value===v||o.textContent.trim()===v)){
        const outOpt=Array.from(sel.options).find(o=>o.value==="Out");
        const opt=new Option(v,v);
        if(outOpt)sel.insertBefore(opt,outOpt);else sel.add(opt);
      }
    });
  }
  if(typeof et2999ValueConfig!=="undefined"&&et2999ValueConfig.editResult){
    const vals=et2999ValueConfig.editResult.values;
    if(Array.isArray(vals)){
      ["CS","Pickoff"].forEach(v=>{
        if(!vals.includes(v)){
          const outIndex=vals.indexOf("Out");
          if(outIndex>=0)vals.splice(outIndex,0,v);else vals.push(v);
        }
      });
    }
  }
}

function et2910103SortedGameTags(){
  return gt().slice().sort((a,b)=>{
    const sa=Number(a.game_seconds),sb=Number(b.game_seconds);
    if(Number.isFinite(sa)&&Number.isFinite(sb)&&sa!==sb)return sa-sb;
    return String(a.created_at||"").localeCompare(String(b.created_at||""));
  });
}

/* Mark the open sequence ending at a specific CS/Pickoff tag as one NULL group. */
function et2910103MarkNullGroup(endTag,reason){
  if(!endTag)return 0;
  const tags=et2910103SortedGameTags();
  const endIndex=tags.findIndex(t=>t.tag_id===endTag.tag_id);
  if(endIndex<0)return 0;
  const group=[];
  for(let i=endIndex;i>=0;i--){
    const t=tags[i];
    if(String(t.batter_id||"")!==String(endTag.batter_id||""))continue;
    if(String(t.inning||"")!==String(endTag.inning||""))continue;
    if(String(t.half||"")!==String(endTag.half||""))continue;
    if(i!==endIndex&&et2910102IsTerminalTag(t))break;
    group.push(t);
  }
  group.forEach(t=>{
    t.null_pa=true;
    t.null_pa_reason=reason||"RUNNER OUT - INNING END";
    t.null_pa_end_tag_id=endTag.tag_id;
    t.counts_as_ab=false;
    t.counts_as_pa=false;
  });
  return group.length;
}

function et2910103ClearNullGroup(endTagId){
  if(!endTagId)return 0;
  let n=0;
  gt().forEach(t=>{
    if(String(t.null_pa_end_tag_id||"")===String(endTagId)){
      delete t.null_pa;delete t.null_pa_reason;delete t.null_pa_end_tag_id;
      delete t.counts_as_ab;delete t.counts_as_pa;n++;
    }
  });
  return n;
}

function et2910103FinalizeRunnerOut(result){
  const tag=etV275PendingTag();
  if(!tag||!state.pending)return;
  const before={
    balls:Number(state.balls||0),strikes:Number(state.strikes||0),outs:Number(state.outs||0),
    batter:state.batter,paInHalf:state.paInHalf
  };
  tag.result=result;
  tag.final_result=result;
  tag.pending_result=false;
  tag.contact_quality="No Contact";
  tag.trajectory="";
  tag.rbi=0;
  tag.runner_out_event=true;
  tag.outs_after=Math.min(3,before.outs+1);
  state.pending=null;

  if(before.outs>=2){
    et2910103MarkNullGroup(tag,result+" - THIRD OUT");
    state.balls=0;
    state.strikes=0;
    state.outs=0;
    state.batter=before.batter;
    state.paInHalf=before.paInHalf;
    tag.null_pa_inning_end=true;
  }else{
    /* Runner was out, but the PA continues because the inning did not end. */
    state.balls=before.balls;
    state.strikes=before.strikes;
    state.outs=before.outs+1;
    state.batter=before.batter;
    state.paInHalf=before.paInHalf;
  }
  ["mph","exitVelo","note"].forEach(id=>{if($(id))$(id).value="";});
  if(window.AndroidBridge)AndroidBridge.vibrateShort();
  save();closeSheets();render();
}
window.et2910103FinalizeRunnerOut=et2910103FinalizeRunnerOut;

/* Bypass the RBI/contact terminal-result flow for runner-out events. */
const et2910103ChooseBase=etV275ChooseResult;
etV275ChooseResult=function(result){
  if(et2910103IsRunnerOutResult(result))return et2910103FinalizeRunnerOut(result);
  return et2910103ChooseBase.apply(this,arguments);
};
window.etV275ChooseResult=etV275ChooseResult;

/* In-Game Data must never merge NULL pitches into the next official batter row. */
inGameRows=function(){
  const g=game()||{},rows=[],abByPlayer={},currentByPlayer={};
  gt().filter(t=>!t.null_pa).forEach(t=>{
    const player=t.batter||"No Player";
    if(!currentByPlayer[player])currentByPlayer[player]=[];
    currentByPlayer[player].push(t);
    if(isTerminalTag(t)){
      const paTags=currentByPlayer[player];
      abByPlayer[player]=(abByPlayer[player]||0)+1;
      const hard=paTags.some(x=>String(x.contact_quality||"").toLowerCase()==="hard")?1:0;
      const swings=paTags.filter(isSwingTag).length;
      const misses=paTags.filter(isMissTag).length;
      const oz=paTags.filter(isOutOfZone).length;
      const ozSwings=paTags.filter(x=>isOutOfZone(x)&&isSwingTag(x)).length;
      const secondary=paTags.filter(isSecondaryPitch);
      const swingsSecondary=secondary.filter(isSwingTag).length;
      const missesSecondary=secondary.filter(isMissTag).length;
      const ozSecondary=secondary.filter(isOutOfZone).length;
      const ozSwingsSecondary=secondary.filter(x=>isOutOfZone(x)&&isSwingTag(x)).length;
      const databaseId=etPlayerDatabaseId(paTags[0]?.batter_id||t.batter_id,player);
      rows.push({
        date:formatDateUS(g.date||new Date().toISOString().slice(0,10)),
        ab_num:abByPlayer[player],player:etInGamePlayerLabel(paTags[0]?.batter_id||t.batter_id,player),
        sfg_id:databaseId,game_type:g.game_type||"game",result:normalizeReportResultValue(reportResult(paTags)),
        hard_contact:hard,swings_total:swings,misses_total:misses,oz_pitches_total:oz,oz_swings_total:ozSwings,
        pitches_total:paTags.length,swings_secondary:swingsSecondary,misses_secondary:missesSecondary,
        oz_pitches_secondary:ozSecondary,oz_swings_secondary:ozSwingsSecondary
      });
      currentByPlayer[player]=[];
    }
  });
  rows.sort((a,b)=>String(a.player||"").localeCompare(String(b.player||""))||Number(a.ab_num||0)-Number(b.ab_num||0));
  return rows;
};

/* Editing a tag to CS/Pickoff also makes that PA fragment NULL for batter-facing outputs.
   Editing away from CS/Pickoff restores that specifically linked NULL group. */
const et2910103CommitEditBase=et291065CommitHistoryEdit;
et291065CommitHistoryEdit=function(){
  const id=$("editTagId")?.value||"";
  const beforeTag=state.tags.find(t=>t.tag_id===id);
  const oldResult=String(beforeTag?.final_result||beforeTag?.result||"");
  const newResult=String($("editResult")?.value||"");
  const out=et2910103CommitEditBase.apply(this,arguments);
  const edited=state.tags.find(t=>t.tag_id===id);
  if(!edited)return out;
  if(et2910103IsRunnerOutResult(newResult)){
    if(oldResult!==newResult&&edited.null_pa_end_tag_id)et2910103ClearNullGroup(edited.null_pa_end_tag_id);
    et2910103MarkNullGroup(edited,newResult+" - EDITED NULL PA");
  }else if(et2910103IsRunnerOutResult(oldResult)){
    et2910103ClearNullGroup(id);
  }
  save();render();
  return out;
};
saveEditedTag=et291065CommitHistoryEdit;
window.saveEditedTag=saveEditedTag;
window.saveEditedTagV21=saveEditedTag;

function et2910103Wire(){
  et2910103EnsureRunnerOutEditor();
  document.querySelectorAll('[data-sheet-result="CS"]').forEach(btn=>{btn.textContent="CS";btn.onclick=()=>etV275ChooseResult("CS");});
  document.querySelectorAll('[data-sheet-result="Pickoff"]').forEach(btn=>{btn.textContent="PICKOFF";btn.onclick=()=>etV275ChooseResult("Pickoff");});
  const saveBtn=$("saveEditedTag");
  if(saveBtn){
    saveBtn.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();et291065CommitHistoryEdit();};
  }
}
window.addEventListener("load",()=>{et2910103Wire();setTimeout(et2910103Wire,250);setTimeout(et2910103Wire,900);});


/* ================= EASY TAGG v2.9.10.104 PLAYER AT-BATS NULL PA FIX =================
   - Player At-Bats separates null_pa tags from official/live AB groups.
   - NULL sequences are displayed as INCOMPLETE PA and never consume an AB number.
   - The next inning starts a clean AB for the same batter when applicable.
   ==================================================================================== */
const ET2910104_VERSION="2.9.10.104 Player At-Bats Null PA Fix";


/* ================= EASY TAGG v2.9.10.105 EDIT TAG CLOSE + ZONE EDIT =================
   - Restores the X on the main Edit Tag sheet. X cancels the edit and saves nothing.
   - Adds IN / OUT zone correction to History > Edit Tag.
   - Zone editing changes zone_status only; original zone coordinates/timestamp remain intact.
   ===================================================================================== */
const ET2910105_VERSION="2.9.10.105 Edit Tag Close + Zone Edit";

/* Add Zone to the same internal picker system already used by Result/Contact/etc. */
if(typeof et2999ValueConfig!=="undefined"){
  et2999ValueConfig.editZoneStatus={
    title:"Zone",
    values:["","In Zone","Out of Zone"],
    labels:["NOT SET","IN","OUT"]
  };
}

function et2910105ZoneLabel(value){
  const v=String(value||"").toLowerCase();
  if(v.includes("out"))return "OUT";
  if(v.includes("in"))return "IN";
  return "NOT SET";
}

/* Populate the temporary zone field every time Edit Tag opens. */
const et2910105OpenEditBase=window.openEditTag||openEditTag;
openEditTag=function(id){
  const out=et2910105OpenEditBase(id);
  const tag=(state.tags||[]).find(t=>t.tag_id===id);
  const sel=$("editZoneStatus");
  if(sel){
    sel.value=tag?.zone_status||"";
    /* Normalize older short forms if present. */
    const raw=String(tag?.zone_status||"").trim().toLowerCase();
    if(raw==="in"||raw==="iz"||raw.includes("in zone")||raw.includes("inside"))sel.value="In Zone";
    else if(raw==="out"||raw==="oz"||raw.includes("out zone")||raw.includes("outside"))sel.value="Out of Zone";
    else if(!["In Zone","Out of Zone"].includes(sel.value))sel.value="";
  }
  setTimeout(()=>{
    try{et2999InstallHistoryValuePickers?.();}catch(_){}
    const btn=$("editZoneStatusButtonV2999");
    if(btn)btn.textContent=et2910105ZoneLabel(sel?.value);
    et2910105WireCancelX();
  },0);
  return out;
};
window.openEditTag=openEditTag;
window.openEditTagV21=openEditTag;

/* Save Zone only when SAVE CHANGES is explicitly pressed. */
const et2910105CommitBase=et291065CommitHistoryEdit;
et291065CommitHistoryEdit=function(){
  const id=$("editTagId")?.value||"";
  const selectedZone=$("editZoneStatus")?.value;
  const out=et2910105CommitBase.apply(this,arguments);
  const tag=(state.tags||[]).find(t=>t.tag_id===id);
  if(tag && selectedZone!==undefined){
    tag.zone_status=selectedZone||"";
    save();
    render();
  }
  return out;
};
saveEditedTag=et291065CommitHistoryEdit;
window.saveEditedTag=saveEditedTag;
window.saveEditedTagV21=saveEditedTag;

/* X means CANCEL: restore the snapshot defensively and close without committing form values. */
function et2910105CancelEdit(){
  const id=$("editTagId")?.value||et291065EditId||"";
  if(et2910EditSnapshot && id){
    const idx=(state.tags||[]).findIndex(t=>t.tag_id===id);
    if(idx>=0)state.tags[idx]=JSON.parse(JSON.stringify(et2910EditSnapshot));
  }
  et2910Editing=false;
  et2910EditSnapshot=null;
  et291065Editing=false;
  et291065EditId="";
  et291065AllowEditClose=true;
  try{
    if(typeof et291065CloseSheetsBase==="function")et291065CloseSheetsBase();
    else document.querySelectorAll(".sheet").forEach(s=>s.classList.add("hidden"));
  }finally{
    et291065AllowEditClose=false;
  }
  $("overlay")?.classList.add("hidden");
}
window.et2910105CancelEdit=et2910105CancelEdit;

function et2910105WireCancelX(){
  const sheet=$("editTagSheet");
  if(!sheet)return;
  const x=sheet.querySelector(".sheetHead .close");
  if(!x)return;
  x.style.removeProperty("display");
  x.style.display="";
  x.setAttribute("aria-label","Close without saving");
  if(x.dataset.cancel2910105)return;
  x.dataset.cancel2910105="1";
  x.addEventListener("click",e=>{
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    et2910105CancelEdit();
  },true);
}

/* The old lock routine may hide X again after render, so restore it after every render. */
const et2910105RenderBase=render;
render=function(){
  const out=et2910105RenderBase.apply(this,arguments);
  setTimeout(()=>{
    try{et2999InstallHistoryValuePickers?.();}catch(_){}
    et2910105WireCancelX();
  },0);
  return out;
};

function et2910105Wire(){
  try{et2999InstallHistoryValuePickers?.();}catch(_){}
  et2910105WireCancelX();
  const saveBtn=$("saveEditedTag");
  if(saveBtn)saveBtn.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();et291065CommitHistoryEdit();};
}
window.addEventListener("load",()=>{
  et2910105Wire();
  setTimeout(et2910105Wire,250);
  setTimeout(et2910105Wire,900);
});


/* ================= EASY TAGG v2.9.10.106 GLOBAL PLAYER LIST A-Z =================
   Alphabetizes every player-name list/picker in the UI by the player's real name.
   The batting LINEUP is explicitly excluded and its manual/order logic is untouched.
   Covers activity roster, pitcher picker, Add Existing Player, Player Database,
   Edit Tag batter/pitcher selectors, Player At-Bats and internal player pickers.
   ================================================================================ */
const ET2910106_VERSION="2.9.10.106 Global Player Lists A-Z";

function et2910106Norm(value){
  return String(value||"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLocaleLowerCase()
    .replace(/\s+/g," ")
    .trim();
}
function et2910106CompareNames(a,b){
  return et2910106Norm(a).localeCompare(et2910106Norm(b),undefined,{sensitivity:"base",numeric:true});
}
function et2910106SortPlayers(players){
  return [...(players||[])].sort((a,b)=>{
    const byName=et2910106CompareNames(a?.name,b?.name);
    if(byName)return byName;
    return String(a?.id||"").localeCompare(String(b?.id||""));
  });
}
function et2910106PlayerIdFromElement(el){
  if(!el)return "";
  const direct=String(el.dataset?.playerId||el.getAttribute?.("data-player-id")||"").trim();
  if(direct&&pl(direct))return direct;
  const raw=String(el.getAttribute?.("onclick")||"");
  const m=raw.match(/(?:selPitcher|selBatter|et254AddToActivity|et254RemoveFromActivity|editPlayer|et254RemoveFromActivity)\(['\"]([^'\"]+)['\"]\)/);
  return m&&pl(m[1])?m[1]:"";
}
function et2910106ElementName(el){
  if(!el)return "";
  const id=et2910106PlayerIdFromElement(el);
  if(id){const p=pl(id);if(p?.name)return p.name;}
  const explicit=el.getAttribute?.("data-player-name");
  if(explicit)return explicit;
  const b=el.querySelector?.("b");
  if(b?.textContent)return b.textContent.replace(/^#?\s*\d+\s*/,"").trim();
  const spans=el.querySelectorAll?.("span");
  if(spans&&spans.length>1)return String(spans[1].textContent||"").trim();
  return String(el.textContent||"").replace(/^#?\s*\d+\s*/,"").trim();
}
function et2910106SortContainer(container){
  if(!container)return;
  /* Never reorder the batting lineup or anything explicitly identified as lineup. */
  const id=String(container.id||"").toLowerCase();
  if(id==="batterlist"||id.includes("lineup"))return;
  const rows=[...container.children].filter(el=>
    el.matches?.("button.listBtn,.playerCard,.activityPlayerV252,.activityRosterPlayerV252,.playerDbRowV297,.playerAtBatsPlayerRowV291094,.activityPlayerV252,.rosterAddCleanV241,.rosterAddCleanV255,button[data-runner-player-v291031]")
  );
  if(rows.length<2)return;
  rows.sort((a,b)=>et2910106CompareNames(et2910106ElementName(a),et2910106ElementName(b)));
  rows.forEach(row=>container.appendChild(row));
}
function et2910106SortPlayerSelect(select){
  if(!select||!(select.id==="editBatter"||select.id==="editPitcher"))return;
  const value=select.value;
  const options=[...select.options];
  options.sort((a,b)=>{
    const pa=pl(a.value),pb=pl(b.value);
    return et2910106CompareNames(pa?.name||a.textContent,pb?.name||b.textContent);
  });
  options.forEach(o=>select.appendChild(o));
  select.value=value;
}
function et2910106PostSort(){
  [
    "players",
    "pitcherList",
    "activityRosterListV252",
    "activityRosterPickerListV252",
    "runnerPlayerListV291031",
    "editBatterListV291022",
    "editPitcherListV291022"
  ].forEach(id=>et2910106SortContainer($(id)));
  et2910106SortPlayerSelect($("editBatter"));
  et2910106SortPlayerSelect($("editPitcher"));
  document.querySelectorAll('[id*="RosterList"],[id*="PlayerList"],[id*="playerList"],[id*="PitcherList"]').forEach(el=>et2910106SortContainer(el));
}

/* Activity roster cards: source is sorted before rendering, not merely rearranged visually. */
if(typeof et291089ActivityRosterPlayers==="function"){
  const et2910106ActivityRosterBase=et291089ActivityRosterPlayers;
  et291089ActivityRosterPlayers=function(){return et2910106SortPlayers(et2910106ActivityRosterBase());};
}

/* Add Existing Player already had A-Z behavior; enforce the same shared comparator. */
if(typeof et291090ExistingPlayerRows==="function"){
  const et2910106ExistingBase=et291090ExistingPlayerRows;
  et291090ExistingPlayerRows=function(){return et2910106SortPlayers(et2910106ExistingBase());};
}

/* Player Database: alphabetize all matching names BEFORE applying the 30-result cap. */
et297SearchDatabase=function(){
  const input=$("playerDbSearchV297"),results=$("playerDbResultsV297"),status=$("playerDbStatusV297");
  if(!input||!results)return;
  const raw=String(input.value||"").trim(),q=et297Norm(raw);
  if(q.length<2){
    results.innerHTML='<p class="playerDbEmptyV297">Enter at least 2 letters or an ID.</p>';
    if(status)status.textContent=`${et297Db().length.toLocaleString()} players available`;
    return;
  }
  const allMatches=et297Db().filter(row=>{
    const pid=String(row.player_code||"");
    return et297Norm(`${row.name||""} ${row.first_name||""} ${row.last_name||""} ${pid}`).includes(q);
  }).sort((a,b)=>et2910106CompareNames(a?.name,b?.name));
  const found=allMatches.slice(0,30);
  if(status)status.textContent=allMatches.length>30?"Showing the first 30 results":`${found.length} result${found.length===1?"":"s"}`;
  if(!found.length){results.innerHTML='<p class="playerDbEmptyV297">No players found.</p>';return;}
  results.innerHTML=found.map(row=>{
    const existing=et297ExistingByCode(row.player_code);
    const inActivity=existing?et297ActivityIds().includes(existing.id):false;
    const details=typeof et2992DbDetails==="function"?et2992DbDetails(row):`<small>Code ${xlsEsc(row.player_code||"")}</small>`;
    return `<div class="playerDbRowV297 playerDbRowFullV2991" data-player-name="${xlsEsc(row.name||"")}">
      <div class="playerDbIdentityV297"><b>${xlsEsc(row.name||"No name")}</b>${details}</div>
      <button type="button" ${inActivity?"disabled":""} onclick="et297AddDatabasePlayer('${String(row.player_code||"").replace(/'/g,"\\'")}')">${inActivity?"Added":"Add"}</button>
    </div>`;
  }).join("");
  et2910106SortContainer(results);
};
window.et297SearchDatabase=et297SearchDatabase;

/* Player At-Bats level-one player list is alphabetical rather than first-tag order. */
if(typeof et291073AnalyzeHistory==="function"){
  const et2910106AnalyzeBase=et291073AnalyzeHistory;
  et291073AnalyzeHistory=function(){
    return [...et2910106AnalyzeBase()].sort((a,b)=>et2910106CompareNames(a?.name,b?.name));
  };
}

/* Sort the pitcher picker after its legacy renderer without touching batterList/lineup. */
const et2910106RenderBase=render;
render=function(){
  const out=et2910106RenderBase.apply(this,arguments);
  et2910106PostSort();
  setTimeout(et2910106PostSort,0);
  return out;
};

/* Edit Tag creates its select options on demand, so sort them immediately after opening. */
const et2910106OpenEditBase=window.openEditTag||openEditTag;
function et2910106OpenEditTag(id){
  const out=et2910106OpenEditBase(id);
  et2910106SortPlayerSelect($("editBatter"));
  et2910106SortPlayerSelect($("editPitcher"));
  setTimeout(()=>{et2910106SortPlayerSelect($("editBatter"));et2910106SortPlayerSelect($("editPitcher"));},0);
  return out;
}
window.openEditTag=et2910106OpenEditTag;
window.openEditTagV21=et2910106OpenEditTag;

window.addEventListener("load",()=>{
  et2910106PostSort();
  setTimeout(et2910106PostSort,150);
  setTimeout(et2910106PostSort,600);
});

/* ================= EASY TAGG v2.9.10.107 COMPLETE PLAYER LISTS A-Z =================
   Final A-Z audit requested from v2.9.10.106:
   - Every roster / player picker / pitcher picker / Edit Tag player picker is A-Z by name.
   - "Add from Roster" candidate lists are A-Z.
   - The actual batting LINEUP is the only player list whose manual batting order is preserved.
   - Jersey numbers and player IDs remain attached to the same player after sorting.
   ================================================================================ */
const ET2910107_VERSION="2.9.10.107 Complete Player Lists A-Z";

function et2910107IsActualBattingLineup(container){
  if(!container)return false;
  if(container.id!=="batterList")return false;
  return !!container.querySelector(".lineupPlayerCleanV241,.lineupPlayerCleanV255,.lineupTeamLabelV27");
}
function et2910107SortContainer(container){
  if(!container||et2910107IsActualBattingLineup(container))return;
  const rows=[...container.children].filter(el=>
    el.matches?.("button.listBtn,.playerCard,.activityPlayerV252,.activityRosterPlayerV252,.playerDbRowV297,.playerAtBatsPlayerRowV291094,.rosterAddCleanV241,.rosterAddCleanV255,button[data-runner-player-v291031]")
  );
  if(rows.length<2)return;
  rows.sort((a,b)=>et2910106CompareNames(et2910106ElementName(a),et2910106ElementName(b)));
  rows.forEach(row=>container.appendChild(row));
}
function et2910107PostSort(){
  [
    "players","batterList","pitcherList","activityRosterListV252","activityRosterPickerListV252",
    "runnerPlayerListV291031","editBatterListV291022","editPitcherListV291022",
    "lineupRosterListV241","lineupRosterListV255"
  ].forEach(id=>et2910107SortContainer($(id)));

  et2910106SortPlayerSelect($("editBatter"));
  et2910106SortPlayerSelect($("editPitcher"));

  document.querySelectorAll('[id*="RosterList"],[id*="rosterList"],[id*="PlayerList"],[id*="playerList"],[id*="PitcherList"],[id*="pitcherList"],[id*="BatterList"],[id*="batterList"]').forEach(et2910107SortContainer);
}

/* Sort at source for the active roster and pitcher pool used by the current v2.7 engine. */
if(typeof et27ActivityPlayers==="function"){
  const et2910107ActivityBase=et27ActivityPlayers;
  et27ActivityPlayers=function(){return et2910106SortPlayers(et2910107ActivityBase());};
}

/* Add-from-Roster is a candidate list, not the batting order: keep it alphabetical. */
if(typeof et27OpenLineupPicker==="function"){
  const et2910107LineupPickerBase=et27OpenLineupPicker;
  et27OpenLineupPicker=function(){
    const out=et2910107LineupPickerBase.apply(this,arguments);
    et2910107PostSort();
    setTimeout(et2910107PostSort,0);
    return out;
  };
  window.et27OpenLineupPicker=et27OpenLineupPicker;
}

/* Any sheet opened as a player selector is sorted immediately after its content is rendered. */
const et2910107OpenSheetBase=openSheet;
openSheet=function(id){
  const out=et2910107OpenSheetBase.apply(this,arguments);
  if(id!=="batterSheet" || !et2910107IsActualBattingLineup($("batterList"))) et2910107PostSort();
  setTimeout(et2910107PostSort,0);
  return out;
};
window.openSheet=openSheet;

/* Last render authority: run after all legacy render/patch layers. */
const et2910107RenderBase=render;
render=function(){
  const out=et2910107RenderBase.apply(this,arguments);
  et2910107PostSort();
  setTimeout(et2910107PostSort,0);
  return out;
};

window.addEventListener("load",()=>{
  et2910107PostSort();
  setTimeout(et2910107PostSort,150);
  setTimeout(et2910107PostSort,700);
});


/* ================= EASY TAGG v2.9.10.108 FAST PLAYER DATABASE SEARCH =================
   Player Database search is intentionally EXCLUDED from global A-Z sorting.
   Search scans the existing database in its stored order and stops as soon as 30
   matches are found. This avoids sorting/reprocessing the full database on every
   keystroke while leaving every other v2.9.10.107 A-Z player list unchanged.
   ================================================================================ */
const ET2910108_VERSION="2.9.10.108 Fast Player Database Search";

et297SearchDatabase=function(){
  const input=$("playerDbSearchV297"),results=$("playerDbResultsV297"),status=$("playerDbStatusV297");
  if(!input||!results)return;
  const raw=String(input.value||"").trim(),q=et297Norm(raw);
  if(q.length<2){
    results.innerHTML='<p class="playerDbEmptyV297">Enter at least 2 letters or an ID.</p>';
    if(status)status.textContent=`${et297Db().length.toLocaleString()} players available`;
    return;
  }
  const found=[];
  const db=et297Db();
  for(let i=0;i<db.length&&found.length<30;i++){
    const row=db[i],pid=String(row.player_code||"");
    const hay=et297Norm(`${row.name||""} ${row.first_name||""} ${row.last_name||""} ${pid}`);
    if(hay.includes(q))found.push(row);
  }
  if(status)status.textContent=found.length===30?"Showing the first 30 results":`${found.length} result${found.length===1?"":"s"}`;
  if(!found.length){results.innerHTML='<p class="playerDbEmptyV297">No players found.</p>';return;}
  results.innerHTML=found.map(row=>{
    const existing=et297ExistingByCode(row.player_code);
    const inActivity=existing?et297ActivityIds().includes(existing.id):false;
    const details=typeof et2992DbDetails==="function"?et2992DbDetails(row):(typeof et2991DbDetails==="function"?et2991DbDetails(row):`<small>Code ${xlsEsc(row.player_code||"")}</small>`);
    return `<div class="playerDbRowV297 playerDbRowFullV2991">
      <div class="playerDbIdentityV297"><b>${xlsEsc(row.name||"No name")}</b>${details}</div>
      <button type="button" ${inActivity?"disabled":""} onclick="et297AddDatabasePlayer('${String(row.player_code||"").replace(/'/g,"\\'")}')">${inActivity?"Added":"Add"}</button>
    </div>`;
  }).join("");
};
window.et297SearchDatabase=et297SearchDatabase;

/* ================= EASY TAGG v2.9.10.111 MANUAL IZ/OZ ZONE MODE =================
   Adds a persistent second zone-input method without changing downstream zone logic.
   Coordinate mode remains the default. Manual mode stores zone_status normally and
   intentionally leaves zone_x / zone_y empty so future charts never invent locations.
   ================================================================================ */
const ET2910111_VERSION="2.9.10.111 Manual IZ/OZ Zone Mode";
const ET2910111_ZONE_MODE_KEY="easyTaggZoneModeV2910111";
function et2910111GetMode(){try{return localStorage.getItem(ET2910111_ZONE_MODE_KEY)==="manual"?"manual":"coordinate"}catch(_){return "coordinate"}}
function et2910111ApplyMode(mode,persist=true){
  mode=mode==="manual"?"manual":"coordinate";
  document.documentElement.setAttribute("data-zone-mode",mode);
  const toggle=$("zoneModeToggleV2910111"),label=$("zoneModeLabelV2910111");
  if(toggle)toggle.checked=mode==="manual";
  if(label)label.textContent=mode==="manual"?"IN / OUT":"COORDINATE";
  if(persist)try{localStorage.setItem(ET2910111_ZONE_MODE_KEY,mode)}catch(_){}
  state.zoneX="";state.zoneY="";state.zoneStatus="";et2910111RenderManual();renderZone();
}
function et2910111RenderManual(){
  const manual=et2910111GetMode()==="manual",z=String(state.zoneStatus||"").toLowerCase();
  $("manualInZoneV2910111")?.classList.toggle("selected",manual&&z.includes("in"));
  $("manualOutZoneV2910111")?.classList.toggle("selected",manual&&z.includes("out"));
  if(manual&&$("zoneText"))$("zoneText").textContent=state.zoneStatus||"Select IN or OUT";
}
function et2910111SelectManual(status){
  state.zoneX="";state.zoneY="";state.zoneStatus=status;et2910111RenderManual();
}
function et2910111Bind(){
  const toggle=$("zoneModeToggleV2910111");
  const mode=et2910111GetMode();document.documentElement.setAttribute("data-zone-mode",mode);
  if(toggle){toggle.checked=mode==="manual";if(!toggle.dataset.bound111){toggle.dataset.bound111="1";toggle.addEventListener("change",()=>et2910111ApplyMode(toggle.checked?"manual":"coordinate",true));}}
  const label=$("zoneModeLabelV2910111");if(label)label.textContent=mode==="manual"?"IN / OUT":"COORDINATE";
  const iz=$("manualInZoneV2910111"),oz=$("manualOutZoneV2910111");
  if(iz&&!iz.dataset.bound111){iz.dataset.bound111="1";iz.onclick=()=>et2910111SelectManual("In Zone")}
  if(oz&&!oz.dataset.bound111){oz.dataset.bound111="1";oz.onclick=()=>et2910111SelectManual("Out of Zone")}
  et2910111RenderManual();
}
/* Protect coordinate zone from accidental touches while manual mode is active. */
$("zone")?.addEventListener("pointerdown",e=>{if(et2910111GetMode()==="manual"){e.preventDefault();e.stopImmediatePropagation()}},true);
/* Mark origin on newly saved tags while preserving the existing CSV schema and Sync compatibility. */
const et2910111SaveTagBase=saveTag;
saveTag=function(){
  const before=(state.tags||[]).length,mode=et2910111GetMode();
  const out=et2910111SaveTagBase.apply(this,arguments);
  if((state.tags||[]).length>before){const t=state.tags[state.tags.length-1];t.zone_input_mode=mode;if(mode==="manual"){t.zone_x="";t.zone_y="";}save();}
  return out;
};
/* If History changes a tag to manual IN/OUT and it has no coordinates, retain that truth.
   Existing coordinate tags keep their coordinates exactly as v105 specified. */
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",et2910111Bind,{once:true});else et2910111Bind();
window.addEventListener("load",et2910111Bind);


/* ================= EASY TAGG v2.9.10.112 PITCHER S/B COUNTER =================
   TAG screen: replaces the former CLIPS display with S/B (Strikes/Balls) for
   the currently selected pitcher. It is derived from saved pitch tags, so
   History edits automatically flow into the visible counter on the next render.
   S + B always equals the selected pitcher's PITCHES total. Zone mode does not
   affect this classification; zone describes location, while S/B describes pitch outcome.
   ================================================================================ */
const ET2910112_VERSION="2.9.10.112 Pitcher S/B Counter";
function et2910112IsStrikePitch(t){
  const r=String((t&&(t.final_result||t.result))||"").trim().toLowerCase();
  if(!r)return false;
  /* Explicit non-strike pitch outcomes. */
  if(r==="ball"||r==="bb"||r==="walk"||r==="hbp"||r==="hit by pitch"||r==="hit_by_pitch")return false;
  /* Called/swinging strikes, fouls and strikeouts. */
  if(r.includes("strike")||r.includes("swing & miss")||r.includes("swing miss")||r.includes("sw miss")||r.includes("foul")||r.includes("k swinging")||r.includes("k looking"))return true;
  /* Any ball put in play is a strike for pitch-count S/B purposes. */
  if(["single","double","triple","hr","home run","out","ground out","groundout","line out","lineout","fly out","flyout","pop out","popout","fielder's choice","sac fly","sac bunt","error"].includes(r))return true;
  try{if(typeof isSwingTag==="function"&&isSwingTag(t))return true;}catch(_){ }
  return false;
}
function et2910112Counts(){
  const tags=et274GetGameTags().filter(et274TagBelongsToSelectedPitcher);
  let strikes=0;
  tags.forEach(t=>{if(et2910112IsStrikePitch(t))strikes++;});
  return {pitches:tags.length,strikes,balls:Math.max(0,tags.length-strikes)};
}
function et2910112PatchStats(){
  const c=et2910112Counts();
  const sb=$("clipCount"),pc=$("pitchCount");
  if(sb){sb.textContent=`${c.strikes}/${c.balls}`;sb.title=`${c.strikes} strikes / ${c.balls} balls`;}
  if(pc)pc.textContent=String(c.pitches);
}
const et2910112RenderBase=render;
render=function(){const out=et2910112RenderBase.apply(this,arguments);et2910112PatchStats();return out;};
window.addEventListener("load",et2910112PatchStats);

/* ================= EASY TAGG v2.9.10.113 LIVE S/B + CURRENT PA REBUILD =================
   - PITCHES and S/B refresh immediately after every saved/edited tag.
   - History edits rebuild the live B-S count only when the edited pitch belongs to
     the currently active/open PA. Subsequent pitches in that open PA get corrected
     balls_before / strikes_before / count_before values as well.
   - Completed/older PAs are not allowed to overwrite the live count.
   ================================================================================ */
const ET2910113_VERSION="2.9.10.113 Live S/B + Current PA Count Rebuild";

function et2910113Result(t){return String((t&&(t.final_result||t.result))||"").trim();}
function et2910113IsPaTerminal(r){
  r=String(r||"").trim();
  try{if(typeof pa==="function"&&pa(r))return true;}catch(_){ }
  return ["BB","HBP","K Swinging","K Looking","Single","Double","Triple","HR","Home Run","Out","Fielder's Choice","Sac Fly","Sac Bunt","Error"].includes(r);
}
function et2910113ApplyPitchToCount(r,c){
  r=String(r||"").trim();
  if(r==="Ball"){c.balls=Math.min(4,c.balls+1);return;}
  if(["Strike","Check Swing","Swing & Miss"].includes(r)){c.strikes=Math.min(3,c.strikes+1);return;}
  if(r==="Foul"){if(c.strikes<2)c.strikes++;return;}
  /* Terminal outcomes end the PA; their historical before-count remains useful,
     but they must not leak a count into the next batter. */
}
function et2910113SameActivePAContext(t){
  const g=game(); if(!g||!t)return false;
  const inn=String($("inning")?.value||"");
  const side=String(state.battingSide||$("battingSide")?.value||"");
  return String(t.game_id||"")===String(g.id||"") &&
         String(t.batter_id||"")===String(state.batter||"") &&
         String(t.inning||"")===inn &&
         String(t.batting_side||t.half||"")===side;
}
function et2910113RebuildCurrentPA(editedTag){
  if(!et2910113SameActivePAContext(editedTag))return false;
  const g=game();
  const inn=String($("inning")?.value||"");
  const side=String(state.battingSide||$("battingSide")?.value||"");
  const rows=(state.tags||[]).filter(t=>
    String(t.game_id||"")===String(g.id||"") &&
    String(t.batter_id||"")===String(state.batter||"") &&
    String(t.inning||"")===inn &&
    String(t.batting_side||t.half||"")===side
  ).sort((a,b)=>{
    const sa=Number(a.game_seconds),sb=Number(b.game_seconds);
    if(Number.isFinite(sa)&&Number.isFinite(sb)&&sa!==sb)return sa-sb;
    return String(a.created_at||"").localeCompare(String(b.created_at||""));
  });
  if(!rows.length)return false;

  /* The live PA is everything after the most recent terminal result. If the last
     row itself is terminal, there is no open PA to rebuild. */
  let start=0;
  for(let i=0;i<rows.length;i++)if(et2910113IsPaTerminal(et2910113Result(rows[i])))start=i+1;
  const open=rows.slice(start);
  if(!open.some(t=>t.tag_id===editedTag.tag_id))return false;

  const c={balls:0,strikes:0};
  open.forEach(t=>{
    t.balls_before=c.balls;
    t.strikes_before=c.strikes;
    t.count_before=`${c.balls}-${c.strikes}`;
    et2910113ApplyPitchToCount(et2910113Result(t),c);
  });
  state.balls=c.balls;
  state.strikes=c.strikes;
  return true;
}
function et2910113RefreshPitchStats(){
  try{et2910112PatchStats();}catch(_){ }
  /* Explicitly keep total PITCHES visible alongside S/B. */
  try{
    const c=et2910112Counts();
    if($("pitchCount"))$("pitchCount").textContent=String(c.pitches);
    if($("clipCount"))$("clipCount").textContent=`${c.strikes}/${c.balls}`;
  }catch(_){ }
}

/* renderTop is called by several fast paths that do not call full render(). Patch
   after it so old CLIPS logic can never remain visible for a frame. */
const et2910113RenderTopBase=renderTop;
renderTop=function(){
  const out=et2910113RenderTopBase.apply(this,arguments);
  et2910113RefreshPitchStats();
  return out;
};
window.renderTop=renderTop;

/* Refresh once more after a tag transaction is fully committed. */
const et2910113SaveTagBase=saveTag;
saveTag=function(){
  const out=et2910113SaveTagBase.apply(this,arguments);
  et2910113RefreshPitchStats();
  return out;
};
window.saveTag=saveTag;

/* Extend the locked transactional History editor, then rebuild only the active PA. */
const et2910113HistoryCommitBase=et291065CommitHistoryEdit;
et291065CommitHistoryEdit=function(){
  const id=$("editTagId")?.value||et291065EditId;
  const out=et2910113HistoryCommitBase.apply(this,arguments);
  const edited=(state.tags||[]).find(t=>t.tag_id===id);
  if(edited){
    const rebuilt=et2910113RebuildCurrentPA(edited);
    if(rebuilt)save();
  }
  render();
  et2910113RefreshPitchStats();
  return out;
};
saveEditedTag=et291065CommitHistoryEdit;
window.saveEditedTag=saveEditedTag;
window.saveEditedTagV21=saveEditedTag;

function et2910113Wire(){
  const btn=$("saveEditedTag");
  if(btn){
    btn.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();et291065CommitHistoryEdit();};
  }
  et2910113RefreshPitchStats();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",et2910113Wire,{once:true});else et2910113Wire();
window.addEventListener("load",et2910113Wire);

/* ================= EASY TAGG v2.9.10.114 ISOLATED PA COUNT EDIT FIX =================
   History result edits are count-scoped to the PA/AB that contained the edited tag
   BEFORE the edit. No neighboring PA is rebuilt or merged. Pitcher PITCHES/S-B from
   v113 remains unchanged. If the edited PA is the currently open PA, only then is
   the live batter B-S state synchronized to that PA's recalculated count.
   ================================================================================ */
const ET2910114_VERSION="2.9.10.114 Isolated PA Count Edit Fix";
function et2910114SortedContext(tag){
  return (state.tags||[]).filter(t=>
    String(t.game_id||"")===String(tag.game_id||"") &&
    String(t.batter_id||t.batter||"")===String(tag.batter_id||tag.batter||"") &&
    String(t.inning||"")===String(tag.inning||"") &&
    String(t.batting_side||t.half||"")===String(tag.batting_side||tag.half||"")
  ).sort((a,b)=>{
    const sa=Number(a.game_seconds),sb=Number(b.game_seconds);
    if(Number.isFinite(sa)&&Number.isFinite(sb)&&sa!==sb)return sa-sb;
    return String(a.created_at||"").localeCompare(String(b.created_at||""));
  });
}
function et2910114CapturePA(tag){
  const rows=et2910114SortedContext(tag),idx=rows.findIndex(t=>t.tag_id===tag.tag_id);
  if(idx<0)return null;
  let start=0,end=rows.length-1;
  for(let i=idx-1;i>=0;i--){if(et2910113IsPaTerminal(et2910113Result(rows[i]))){start=i+1;break;}}
  for(let i=idx;i<rows.length;i++){if(et2910113IsPaTerminal(et2910113Result(rows[i]))){end=i;break;}}
  return {ids:rows.slice(start,end+1).map(t=>t.tag_id),wasOpen:!rows.slice(start,end+1).some(t=>et2910113IsPaTerminal(et2910113Result(t)))};
}
function et2910114RecalcCapturedPA(cap){
  if(!cap||!cap.ids?.length)return {balls:0,strikes:0};
  const map=new Map((state.tags||[]).map(t=>[t.tag_id,t]));
  const c={balls:0,strikes:0};
  cap.ids.forEach(id=>{
    const t=map.get(id); if(!t)return;
    t.balls_before=c.balls;t.strikes_before=c.strikes;t.count_before=`${c.balls}-${c.strikes}`;
    et2910113ApplyPitchToCount(et2910113Result(t),c);
  });
  return c;
}
function et2910114IsCurrentOpenPA(cap){
  if(!cap||!cap.wasOpen||!cap.ids.length)return false;
  const last=(state.tags||[]).find(t=>t.tag_id===cap.ids[cap.ids.length-1]);
  return !!last&&et2910113SameActivePAContext(last);
}
const et2910114HistoryCommitBase=et291065CommitHistoryEdit;
et291065CommitHistoryEdit=function(){
  const id=$("editTagId")?.value||et291065EditId;
  const beforeTag=(state.tags||[]).find(t=>t.tag_id===id);
  const cap=beforeTag?et2910114CapturePA(beforeTag):null;
  const liveBefore={balls:state.balls,strikes:state.strikes};
  const countsBefore=new Map((state.tags||[]).map(t=>[t.tag_id,[t.balls_before,t.strikes_before,t.count_before]]));
  const out=et2910114HistoryCommitBase.apply(this,arguments);
  if(!out||!cap)return out;
  const target=new Set(cap.ids);
  /* Undo any broad v113 count rewrite outside the original PA. */
  (state.tags||[]).forEach(t=>{if(!target.has(t.tag_id)&&countsBefore.has(t.tag_id)){const v=countsBefore.get(t.tag_id);t.balls_before=v[0];t.strikes_before=v[1];t.count_before=v[2];}});
  const c=et2910114RecalcCapturedPA(cap);
  if(et2910114IsCurrentOpenPA(cap)){state.balls=c.balls;state.strikes=c.strikes;}
  else{state.balls=liveBefore.balls;state.strikes=liveBefore.strikes;}
  save();render();et2910113RefreshPitchStats();
  return out;
};
saveEditedTag=et291065CommitHistoryEdit;
window.saveEditedTag=saveEditedTag;window.saveEditedTagV21=saveEditedTag;
function et2910114Wire(){const btn=$("saveEditedTag");if(btn)btn.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();et291065CommitHistoryEdit();};}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",et2910114Wire,{once:true});else et2910114Wire();
window.addEventListener("load",et2910114Wire);

/* ================= EASY TAGG v2.9.10.115 HISTORY-DRIVEN COUNTERS =================
   History is the single source of truth for live B/S/O and pitcher PITCHES/S-B.
   B/S/O are display-only on TAG: no manual +/- editing.
   Any save/edit/delete is reflected by recalculating from saved History tags.
   ================================================================================ */
const ET2910115_VERSION="2.9.10.115 History-Driven Counters";
function et2910115SortTags(tags){return (tags||[]).slice().sort((a,b)=>{const sa=Number(a.game_seconds),sb=Number(b.game_seconds);if(Number.isFinite(sa)&&Number.isFinite(sb)&&sa!==sb)return sa-sb;return String(a.created_at||"").localeCompare(String(b.created_at||""));});}
function et2910115Result(t){return String((t&&(t.final_result||t.result))||"").trim();}
function et2910115IsRunnerOut(r){return r==="CS"||r==="Pickoff";}
function et2910115IsOut(r){return ["K Swinging","K Looking","Out","Ground Out","Fly Out","Line Out","Pop Out","Fielder's Choice","Sac Fly","Sac Bunt","CS","Pickoff"].includes(r);}
function et2910115IsTerminal(r){if(et2910115IsRunnerOut(r))return false;try{if(typeof et2910102IsTerminalTag==="function")return et2910102IsTerminalTag({result:r,final_result:r});}catch(_){ }return ["BB","HBP","K Swinging","K Looking","Single","Double","Triple","HR","Home Run","Out","Ground Out","Fly Out","Line Out","Pop Out","Error","Fielder's Choice","Sac Fly","Sac Bunt"].includes(r);}
function et2910115ApplyBS(r,c){if(r==="Ball"){c.balls++;return;}if(["Strike","Check Swing","Swing & Miss"].includes(r)){c.strikes++;return;}if(r==="Foul"&&c.strikes<2)c.strikes++;}
function et2910115ContextMatch(t,inning,half,side){if(String(t.inning||"")!==String(inning||""))return false;const th=String(t.half||"");if(half&&th&&th!==String(half))return false;const ts=String(t.batting_side||"");if(side&&ts&&ts!==String(side))return false;return true;}
/* Rewrites historical before-counts deterministically from the tag sequence itself.
   This does not invent/edit results; it only makes each History row's count metadata
   agree with the results already saved in History. */
function et2910115NormalizeHistoryCounts(){
  const g=game();if(!g)return;
  const rows=et2910115SortTags((state.tags||[]).filter(t=>String(t.game_id||"")===String(g.id||"")));
  let key="",activeBatter="",c={balls:0,strikes:0},outs=0;
  rows.forEach(t=>{
    const ctx=String(t.inning||"")+"|"+String(t.half||t.batting_side||"");
    if(ctx!==key){key=ctx;activeBatter="";c={balls:0,strikes:0};outs=0;}
    const bid=String(t.batter_id||t.batter||"");
    if(activeBatter&&bid&&bid!==activeBatter){c={balls:0,strikes:0};}
    if(bid)activeBatter=bid;
    t.balls_before=c.balls;t.strikes_before=c.strikes;t.outs_before=outs;t.count_before=`${c.balls}-${c.strikes}`;
    const r=et2910115Result(t);
    et2910115ApplyBS(r,c);
    if(et2910115IsOut(r))outs++;
    if(et2910115IsTerminal(r)){c={balls:0,strikes:0};activeBatter="";}
    if(t.null_pa_inning_end||outs>=3){c={balls:0,strikes:0};activeBatter="";}
  });
}
function et2910115DerivedLive(){
  const g=game();if(!g)return {balls:0,strikes:0,outs:0};
  const inning=String($("inning")?.value||""),half=String($("half")?.value||""),side=String(state.battingSide||"");
  const rows=et2910115SortTags((state.tags||[]).filter(t=>String(t.game_id||"")===String(g.id||"")&&et2910115ContextMatch(t,inning,half,side)));
  let outs=0,c={balls:0,strikes:0},activeBatter="";
  rows.forEach(t=>{
    const bid=String(t.batter_id||t.batter||"");
    if(activeBatter&&bid&&bid!==activeBatter)c={balls:0,strikes:0};
    if(bid)activeBatter=bid;
    const r=et2910115Result(t);et2910115ApplyBS(r,c);
    if(et2910115IsOut(r))outs++;
    if(et2910115IsTerminal(r)){c={balls:0,strikes:0};activeBatter="";}
    if(t.null_pa_inning_end||outs>=3){c={balls:0,strikes:0};activeBatter="";}
  });
  /* Only an open sequence for the batter currently on TAG can supply B/S. */
  if(activeBatter&&String(activeBatter)!==String(state.batter||""))c={balls:0,strikes:0};
  return {balls:Math.min(3,c.balls),strikes:Math.min(2,c.strikes),outs:outs%3};
}
function et2910115SyncFromHistory(persist=false){
  et2910115NormalizeHistoryCounts();
  const d=et2910115DerivedLive();state.balls=d.balls;state.strikes=d.strikes;state.outs=d.outs;
  if(persist)save();
  try{et2910113RefreshPitchStats();}catch(_){ }
  return d;
}
function et2910115RenderCounters(){const d=et2910115SyncFromHistory(false);if($("balls"))$("balls").textContent=d.balls;if($("strikes"))$("strikes").textContent=d.strikes;if($("outs"))$("outs").textContent=d.outs;try{et2910113RefreshPitchStats();}catch(_){ }}
/* Keep the existing visual B/S/O boxes, but make them read-only indicators. */
function et2910115LockManualCounters(){["bBtn","sBtn","oBtn","resetCount"].forEach(id=>{const el=$(id);if(!el)return;el.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();};el.setAttribute("aria-disabled","true");el.title="Automatic from History";});}
const et2910115RenderTopBase=renderTop;
renderTop=function(){const out=et2910115RenderTopBase.apply(this,arguments);et2910115RenderCounters();et2910115LockManualCounters();return out;};window.renderTop=renderTop;
const et2910115SaveTagBase=saveTag;
saveTag=function(){const out=et2910115SaveTagBase.apply(this,arguments);et2910115SyncFromHistory(true);et2910115RenderCounters();return out;};window.saveTag=saveTag;
/* Let the existing transactional editor save the result, then discard all derived
   counter state and derive it again from History. This supersedes v113/v114 live-count
   reconstruction and prevents 4-ball/extra-pitch count drift. */
const et2910115HistoryCommitBase=et291065CommitHistoryEdit;
et291065CommitHistoryEdit=function(){const out=et2910115HistoryCommitBase.apply(this,arguments);et2910115SyncFromHistory(true);render();et2910115RenderCounters();return out;};
saveEditedTag=et291065CommitHistoryEdit;window.saveEditedTag=saveEditedTag;window.saveEditedTagV21=saveEditedTag;
function et2910115Wire(){et2910115LockManualCounters();et2910115SyncFromHistory(true);et2910115RenderCounters();const btn=$("saveEditedTag");if(btn)btn.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();et291065CommitHistoryEdit();};}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",et2910115Wire,{once:true});else et2910115Wire();window.addEventListener("load",et2910115Wire);


/* ================================================================================
   Easy Tagg v2.9.10.117 - SAFE ACTIVE PA COUNT HOTFIX
   IMPORTANT: Quick Tag / pitch-type / clock / Sync pipeline is intentionally untouched.
   This patch only replaces the History-derived live B/S/O reader used by v115.
   ================================================================================ */
const ET2910117_VERSION="2.9.10.117 Safe Active PA Count Hotfix";
function et2910117SameHalf(t,inning,half){
  if(String(t.inning||"")!==String(inning||""))return false;
  const th=String(t.half||"").trim().toLowerCase(), h=String(half||"").trim().toLowerCase();
  return !h||!th||th===h;
}
function et2910117DerivedLive(){
  const g=game();if(!g)return {balls:0,strikes:0,outs:0};
  const inning=String($("inning")?.value||""),half=String($("half")?.value||"");
  const currentBatter=String(state.batter||"");
  const currentName=String(pn(state.batter)||"");
  const rows=et2910115SortTags((state.tags||[]).filter(t=>
    String(t.game_id||"")===String(g.id||"") && et2910117SameHalf(t,inning,half)
  ));
  let outs=0;
  rows.forEach(t=>{if(et2910115IsOut(et2910115Result(t)))outs++;});
  let c={balls:0,strikes:0},open=false;
  rows.forEach(t=>{
    const bid=String(t.batter_id||"");
    const name=String(t.batter||"");
    const isCurrent=(currentBatter&&bid===currentBatter)||(!bid&&name&&name===currentName);
    if(!isCurrent)return;
    const r=et2910115Result(t);
    if(!open){c={balls:0,strikes:0};open=true;}
    et2910115ApplyBS(r,c);
    if(et2910115IsTerminal(r)||t.null_pa_inning_end){c={balls:0,strikes:0};open=false;}
  });
  return {balls:open?Math.min(3,c.balls):0,strikes:open?Math.min(2,c.strikes):0,outs:outs%3};
}
et2910115DerivedLive=et2910117DerivedLive;
window.et2910115DerivedLive=et2910117DerivedLive;

/* ================= EASY TAGG v2.9.10.118 EDITABLE CS/PICKOFF + PA REVALIDATION =================
   History Edit only. Quick Tag / Pitch Type / clock / Sync pipeline is untouched.
   - Adds one combined "CS/Pickoff" choice to Edit Tag > Result.
   - A runner-out edit makes the PA NULL only when it is the third out.
   - Editing that tag back to Ball/Strike/etc immediately clears the linked NULL PA flags.
   ================================================================================================ */
const ET2910118_VERSION="2.9.10.118 Editable CS/Pickoff PA Revalidation";

/* Treat the combined History-editor value exactly like the existing runner-out family. */
const et2910118RunnerOutBase=et2910103IsRunnerOutResult;
et2910103IsRunnerOutResult=function(result){
  return result==="CS/Pickoff" || et2910118RunnerOutBase(result);
};
window.et2910103IsRunnerOutResult=et2910103IsRunnerOutResult;

function et2910118EnsureEditorValue(){
  const sel=$("editResult");
  if(sel && ![...sel.options].some(o=>o.value==="CS/Pickoff")){
    const outOpt=[...sel.options].find(o=>o.value==="Out");
    const opt=new Option("CS/Pickoff","CS/Pickoff");
    if(outOpt)sel.insertBefore(opt,outOpt); else sel.add(opt);
  }
  if(typeof et2999ValueConfig!=="undefined" && et2999ValueConfig.editResult){
    const vals=et2999ValueConfig.editResult.values;
    if(Array.isArray(vals) && !vals.includes("CS/Pickoff")){
      const oi=vals.indexOf("Out"); if(oi>=0)vals.splice(oi,0,"CS/Pickoff"); else vals.push("CS/Pickoff");
    }
  }
}

/* Final Result picker: preserve all current choices and expose the requested combined button. */
const et2910118PickerBase=et2999OpenValuePicker;
et2999OpenValuePicker=function(id){
  if(id!=="editResult")return et2910118PickerBase(id);
  et2910118EnsureEditorValue();
  const sel=$("editResult"),grid=$("historyValueGridV2999"),title=$("historyValueTitleV2999");
  if(!sel||!grid||!title)return;
  const values=["Ball","Strike","Swing & Miss","Check Swing","Foul","Single","Double","Triple","HR","BB","HBP","K Swinging","K Looking","Out","CS/Pickoff"];
  title.textContent="Result";
  grid.innerHTML=values.map(v=>`<button type="button" class="${sel.value===v?"selected":""}" data-edit-value-v2910118="${encodeURIComponent(v)}">${v}</button>`).join("");
  grid.querySelectorAll("[data-edit-value-v2910118]").forEach(button=>button.onclick=()=>{
    sel.value=decodeURIComponent(button.dataset.editValueV2910118);
    const display=$("editResultButtonV2999");if(display)display.textContent=button.textContent;
    closeSheets();
  });
  openSheet("historyValueSheetV2999");
};
window.et2999OpenValuePicker=et2999OpenValuePicker;

function et2910118ClearLinkedNull(endTagId){
  if(!endTagId)return;
  (state.tags||[]).forEach(t=>{
    if(String(t.null_pa_end_tag_id||"")===String(endTagId)){
      delete t.null_pa; delete t.null_pa_reason; delete t.null_pa_end_tag_id;
      delete t.counts_as_ab; delete t.counts_as_pa;
    }
  });
  const end=(state.tags||[]).find(t=>String(t.tag_id||"")===String(endTagId));
  if(end)delete end.null_pa_inning_end;
}
function et2910118OutsBefore(tag){
  const rows=et2910103SortedGameTags();
  let outs=0;
  for(const t of rows){
    if(t.tag_id===tag.tag_id)break;
    if(String(t.inning||"")!==String(tag.inning||""))continue;
    if(String(t.half||"")!==String(tag.half||""))continue;
    if(et2910115IsOut(et2910115Result(t)))outs++;
  }
  return outs%3;
}
function et2910118RevalidateEditedPA(tag){
  if(!tag)return;
  /* Always remove stale NULL metadata created by this edited event first. */
  et2910118ClearLinkedNull(tag.tag_id);
  delete tag.null_pa_inning_end;
  const result=et2910115Result(tag);
  tag.runner_out_event=et2910103IsRunnerOutResult(result);
  if(!tag.runner_out_event){ delete tag.runner_out_event; return; }
  const before=et2910118OutsBefore(tag);
  tag.outs_after=Math.min(3,before+1);
  if(before>=2){
    et2910103MarkNullGroup(tag,result+" - THIRD OUT");
    tag.null_pa_inning_end=true;
  }
}

/* Wrap only the transactional History save. No Quick Tag/startTag/saveTag/clock hooks. */
const et2910118CommitBase=et291065CommitHistoryEdit;
et291065CommitHistoryEdit=function(){
  const id=$("editTagId")?.value||et291065EditId||"";
  const out=et2910118CommitBase.apply(this,arguments);
  const edited=(state.tags||[]).find(t=>t.tag_id===id);
  if(edited){
    et2910118RevalidateEditedPA(edited);
    try{et2910115SyncFromHistory(true);}catch(_){save();}
    render();
  }
  return out;
};
saveEditedTag=et291065CommitHistoryEdit;
window.saveEditedTag=saveEditedTag;
window.saveEditedTagV21=saveEditedTag;

const et2910118OpenEditBase=window.openEditTag||openEditTag;
openEditTag=function(id){
  et2910118EnsureEditorValue();
  const out=et2910118OpenEditBase(id);
  setTimeout(et2910118EnsureEditorValue,0);
  return out;
};
window.openEditTag=openEditTag;window.openEditTagV21=openEditTag;

function et2910118Wire(){
  et2910118EnsureEditorValue();
  const btn=$("saveEditedTag");
  if(btn)btn.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();et291065CommitHistoryEdit();};
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",et2910118Wire,{once:true});else et2910118Wire();
window.addEventListener("load",()=>{et2910118Wire();setTimeout(et2910118Wire,300);});


/* ================= EASY TAGG v2.9.10.120 PLAYER PROFILE DISPLAY =================
   Presentation/profile-only extension. Does not touch tagging, clock, Sync or PA logic.
   ================================================================================ */
const ET2910120_VERSION="2.9.10.120 Player Profile Display";
function et2910120Date(v){
  const raw=String(v||"").trim().replace(/\s+00?:00(?::00)?$/,'');
  if(!raw)return "";
  let y,m,d,hit=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(hit){y=hit[1];m=+hit[2];d=+hit[3]}else{
    hit=raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if(!hit)return raw.replace(/\b00:00(?::00)?\b/g,'').trim();
    m=+hit[1];d=+hit[2];y=hit[3];
  }
  const mons=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return (mons[m-1]||String(m).padStart(2,'0'))+"/"+String(d).padStart(2,'0')+"/"+y;
}
function et2910120InitYears(){
  const sel=$("playerInfoEligibleV120");if(!sel||sel.options.length>1)return;
  const y=new Date().getFullYear();for(let n=y-2;n<=y+12;n++){const o=document.createElement('option');o.value=o.textContent=String(n);sel.appendChild(o)}
}
function et2910120ResetInfo(){
  ["playerInfoPosV120","playerInfoCountryV120","playerInfoDateV120","playerInfoEligibleV120","playerInfoHeightV120","playerInfoWeightV120"].forEach(id=>{if($(id))$(id).value=""});
  const d=$("playerInfoV120");if(d)d.open=false;
}
const et2910120SavePlayerBase=et252SavePlayer;
et252SavePlayer=function(){
  const editingId=$("editId")?.value||"";
  const vals={position:$("playerInfoPosV120")?.value||"",country:$("playerInfoCountryV120")?.value||"",birth_date:$("playerInfoDateV120")?.value||"",date_eligible:$("playerInfoEligibleV120")?.value||"",height:$("playerInfoHeightV120")?.value||"",weight:$("playerInfoWeightV120")?.value||""};
  if($("position")&&vals.position)$("position").value=vals.position;
  const beforeIds=new Set((state.players||[]).map(p=>p.id));
  const out=et2910120SavePlayerBase.apply(this,arguments);
  let p=editingId?state.players.find(x=>x.id===editingId):(state.players||[]).find(x=>!beforeIds.has(x.id));
  if(p){Object.assign(p,vals);save();render()}
  et2910120ResetInfo();return out;
};
function et2910120FillInfo(p){
  if(!p)return;et2910120InitYears();
  const map={playerInfoPosV120:p.position,playerInfoCountryV120:p.country,playerInfoDateV120:String(p.birth_date||'').slice(0,10),playerInfoEligibleV120:p.date_eligible||p.eligible,playerInfoHeightV120:p.height,playerInfoWeightV120:p.weight};
  Object.entries(map).forEach(([id,v])=>{if($(id))$(id).value=v||""});
  const d=$("playerInfoV120");if(d)d.open=Object.values(map).some(Boolean);
}
const et2910120EditBase=editPlayer;
editPlayer=function(id){const out=et2910120EditBase.apply(this,arguments);et2910120FillInfo(pl(id));return out};window.editPlayer=editPlayer;window.et254EditPlayer=editPlayer;window.et251EditPlayer=editPlayer;
const et2910120OldDetails=et299PlayerDetails;
et299PlayerDetails=function(p){
  const rows=[];const code=String(p.db_player_code||p.player_code||'').trim();
  if(code)rows.push(`<span><b>ID:</b> ${xlsEsc(code)}</span>`);
  if(p.position)rows.push(`<span><b>Pos:</b> ${xlsEsc(p.position)}</span>`);
  if(p.country)rows.push(`<span><b>Country:</b> ${xlsEsc(p.country)}</span>`);
  const date=et2910120Date(p.birth_date);if(date)rows.push(`<span><b>Date:</b> ${xlsEsc(date)}</span>`);
  const eligible=String(p.date_eligible||p.eligible||'').trim();if(eligible)rows.push(`<span><b>Eligible:</b> ${xlsEsc(eligible)}</span>`);
  if(p.height)rows.push(`<span><b>Height:</b> ${xlsEsc(p.height)} in</span>`);
  if(p.weight)rows.push(`<span><b>Weight:</b> ${xlsEsc(p.weight)} lb</span>`);
  if(p.role)rows.push(`<span><b>Role:</b> ${xlsEsc(p.role)}</span>`);
  return rows.length?`<div class="playerDetailsV299">${rows.join("")}</div>`:"";
};
const et2910120DbDetailsBase=et2992DbDetails;
et2992DbDetails=function(row){
  const parts=[];
  parts.push(`<span><b>ID:</b> ${xlsEsc(et2991Val(row.player_code))}</span>`);
  parts.push(`<span><b>Pos:</b> ${xlsEsc(et2991Val(row.position))}</span>`);
  parts.push(`<span><b>Country:</b> ${xlsEsc(et2991Val(row.country))}</span>`);
  const bd=et2910120Date(row.birth_date);if(bd)parts.push(`<span><b>Date:</b> ${xlsEsc(bd)}</span>`);
  const el=String(row.eligible||row.date_eligible||'').trim();if(el)parts.push(`<span><b>Eligible:</b> ${xlsEsc(el)}</span>`);
  const h=String(row.height||'').trim();if(h)parts.push(`<span><b>Height:</b> ${xlsEsc(h)}${/^\d+(?:\.\d+)?$/.test(h)?' in':''}</span>`);
  const w=String(row.weight||'').trim();if(w)parts.push(`<span><b>Weight:</b> ${xlsEsc(w)}${/^\d+(?:\.\d+)?$/.test(w)?' lb':''}</span>`);
  return `<div class="playerDbFullDetailsV2991">${parts.join('')}</div>`;
};
/* Force all database date helpers to the approved MMM/DD/YYYY display and remove useless 00:00. */
et299FormatPlayerDate=et2910120Date;et2991Birth=et2910120Date;
window.addEventListener('load',et2910120InitYears);

/* ================= EASY TAGG v2.9.10.121 PLAYER PROFILE INTEGRATION FIX =================
   - Visual action emphasis uses exact live controls/classes.
   - New Player profile fields reset only after a successful create.
   - Roster cards read current profile fields from the player master object.
   - No tagging/clock/Sync/PA handlers are modified.
   ================================================================================ */
const ET2910121_VERSION="2.9.10.121 Player Profile Integration Fix";

function et2910121ProfileDetails(p){
  if(!p)return "";
  const rows=[];
  const code=String(p.db_player_code||p.player_code||"").trim();
  const pos=String(p.position||p.position_code||"").trim();
  const country=String(p.country||"").trim();
  const date=et2910120Date(p.birth_date);
  const eligible=String(p.date_eligible||p.eligible||"").trim();
  const height=String(p.height||"").trim();
  const weight=String(p.weight||"").trim();
  if(code)rows.push(`<span><b>ID:</b> ${xlsEsc(code)}</span>`);
  if(pos)rows.push(`<span><b>Pos:</b> ${xlsEsc(pos)}</span>`);
  if(country)rows.push(`<span><b>Country:</b> ${xlsEsc(country)}</span>`);
  if(date)rows.push(`<span><b>Date:</b> ${xlsEsc(date)}</span>`);
  if(eligible)rows.push(`<span><b>Eligible:</b> ${xlsEsc(eligible)}</span>`);
  if(height)rows.push(`<span><b>Height:</b> ${xlsEsc(height)}${/^\d+(?:\.\d+)?$/.test(height)?' in':''}</span>`);
  if(weight)rows.push(`<span><b>Weight:</b> ${xlsEsc(weight)}${/^\d+(?:\.\d+)?$/.test(weight)?' lb':''}</span>`);
  if(p.role)rows.push(`<span><b>Role:</b> ${xlsEsc(p.role)}</span>`);
  return rows.length?`<div class="playerDetailsV299 playerDetailsFullV2991">${rows.join("")}</div>`:"";
}
/* Both manual and CSV/database roster cards use the same current profile renderer. */
et299PlayerDetails=et2910121ProfileDetails;
et2992RosterDetails=et2910121ProfileDetails;

/* Keep the form clean after a successful NEW player creation. Editing remains populated. */
const et2910121SaveBase=et252SavePlayer;
et252SavePlayer=function(){
  const wasEditing=!!($('editId')?.value||'');
  const beforeCount=(state.players||[]).length;
  const vals={position:$('playerInfoPosV120')?.value||'',country:$('playerInfoCountryV120')?.value||'',birth_date:$('playerInfoDateV120')?.value||'',date_eligible:$('playerInfoEligibleV120')?.value||'',height:$('playerInfoHeightV120')?.value||'',weight:$('playerInfoWeightV120')?.value||''};
  if($('position')&&vals.position)$('position').value=vals.position;
  const out=et2910121SaveBase.apply(this,arguments);
  let p=null;
  if(wasEditing){p=state.players.find(x=>x.id===($('editId')?.value||''));}
  if(!wasEditing && (state.players||[]).length>beforeCount)p=state.players[state.players.length-1];
  if(p){Object.assign(p,vals);save();render();}
  if(!wasEditing && (state.players||[]).length>beforeCount)et2910120ResetInfo();
  return out;
};
/* Re-apply the v120 profile wrapper to the corrected save base and bind it. */
const et2910121ProfileSaveBase=et252SavePlayer;
et252SavePlayer=function(){return et2910121ProfileSaveBase.apply(this,arguments)};
savePlayer=et252SavePlayer;
window.addEventListener('load',()=>{const b=$('savePlayer');if(b)b.onclick=savePlayer;});

/* Re-rendering a roster always resolves profile values from the master player object. */
const et2910121RenderBase=et252RenderPlayers;
et252RenderPlayers=function(){const out=et2910121RenderBase.apply(this,arguments);return out;};

/* ================= EASY TAGG v2.9.10.124 CONSERVATIVE HISTORY PERFORMANCE =================
   Performance-only consolidation built on v2.9.10.123.
   - History remains the only source of truth for B/S/O, PITCHES and S/B.
   - One sorted History pass now normalizes before-counts and derives every TAG counter.
   - Repeated PITCHES/S-B readers reuse that same verified snapshot during the render.
   - No incremental History rendering is attempted in this conservative release.
   - Quick Tag, pitch type, clock, timestamp, Sync and clip windows are untouched.
   =========================================================================================== */
const ET2910124_VERSION="2.9.10.124 Conservative History Performance";
let et2910124CounterSnapshot=null;

function et2910124SnapshotKey(){
  const g=game();
  return [
    String(g?.id||""),String((state.tags||[]).length),String(state.pitcher||""),
    String(state.batter||""),String($("inning")?.value||""),
    String($("half")?.value||""),String(state.battingSide||"")
  ].join("|");
}

function et2910124BuildHistoryCounters(){
  const g=game();
  const empty={balls:0,strikes:0,outs:0,pitches:0,pitchStrikes:0,pitchBalls:0};
  if(!g){et2910124CounterSnapshot={key:et2910124SnapshotKey(),value:empty};return empty;}

  const gameId=String(g.id||"");
  const inning=String($("inning")?.value||"");
  const half=String($("half")?.value||"");
  const currentBatter=String(state.batter||"");
  const currentBatterName=String(pn(state.batter)||"");
  const selectedPitcher=String(state.pitcher||"");
  const selectedPitcherName=selectedPitcher?String(pn(state.pitcher)||"").trim().toLowerCase():"";
  const rows=et2910115SortTags((state.tags||[]).filter(t=>String(t.game_id||"")===gameId));

  let contextKey="",contextBatter="",contextCount={balls:0,strikes:0},contextOuts=0;
  let liveCount={balls:0,strikes:0},liveOpen=false,liveOuts=0;
  let pitches=0,pitchStrikes=0;

  for(const t of rows){
    const tagHalf=String(t.half||t.batting_side||"");
    const nextContext=String(t.inning||"")+"|"+tagHalf;
    if(nextContext!==contextKey){
      contextKey=nextContext;contextBatter="";contextCount={balls:0,strikes:0};contextOuts=0;
    }
    const batterId=String(t.batter_id||t.batter||"");
    if(contextBatter&&batterId&&batterId!==contextBatter)contextCount={balls:0,strikes:0};
    if(batterId)contextBatter=batterId;
    t.balls_before=contextCount.balls;
    t.strikes_before=contextCount.strikes;
    t.outs_before=contextOuts;
    t.count_before=`${contextCount.balls}-${contextCount.strikes}`;

    const result=et2910115Result(t);
    et2910115ApplyBS(result,contextCount);
    if(et2910115IsOut(result))contextOuts++;
    if(et2910115IsTerminal(result)){contextCount={balls:0,strikes:0};contextBatter="";}
    if(t.null_pa_inning_end||contextOuts>=3){contextCount={balls:0,strikes:0};contextBatter="";}

    const sameHalf=String(t.inning||"")===inning&&(!half||!String(t.half||"")||String(t.half||"")===half);
    if(sameHalf){
      if(et2910115IsOut(result))liveOuts++;
      const tagBatterId=String(t.batter_id||"");
      const tagBatterName=String(t.batter||"");
      const isCurrent=(currentBatter&&tagBatterId===currentBatter)||(!tagBatterId&&tagBatterName&&tagBatterName===currentBatterName);
      if(isCurrent){
        if(!liveOpen){liveCount={balls:0,strikes:0};liveOpen=true;}
        et2910115ApplyBS(result,liveCount);
        if(et2910115IsTerminal(result)||t.null_pa_inning_end){liveCount={balls:0,strikes:0};liveOpen=false;}
      }
    }

    const tagPitcher=String(t.pitcher_id||t.pitcherId||"");
    const tagPitcherName=String(t.pitcher||"").trim().toLowerCase();
    if((selectedPitcher&&tagPitcher===selectedPitcher)||(!tagPitcher&&selectedPitcherName&&tagPitcherName===selectedPitcherName)){
      pitches++;if(et2910112IsStrikePitch(t))pitchStrikes++;
    }
  }

  const value={
    balls:liveOpen?Math.min(3,liveCount.balls):0,
    strikes:liveOpen?Math.min(2,liveCount.strikes):0,
    outs:liveOuts%3,
    pitches,
    pitchStrikes,
    pitchBalls:Math.max(0,pitches-pitchStrikes)
  };
  et2910124CounterSnapshot={key:et2910124SnapshotKey(),value};
  return value;
}

function et2910124CachedCounters(){
  const key=et2910124SnapshotKey();
  return et2910124CounterSnapshot&&et2910124CounterSnapshot.key===key
    ?et2910124CounterSnapshot.value:et2910124BuildHistoryCounters();
}

/* Replace only the repeated derived readers; all mutations and persistence stay in
   the existing v115/v117/v118 transaction paths. */
et2910115SyncFromHistory=function(persist=false){
  const d=et2910124BuildHistoryCounters();
  state.balls=d.balls;state.strikes=d.strikes;state.outs=d.outs;
  if(persist)save();
  return d;
};
window.et2910115SyncFromHistory=et2910115SyncFromHistory;

et2910112Counts=function(){
  const d=et2910124CachedCounters();
  return {pitches:d.pitches,strikes:d.pitchStrikes,balls:d.pitchBalls};
};
window.et2910112Counts=et2910112Counts;

et2910113RefreshPitchStats=function(){
  const c=et2910112Counts();
  if($("pitchCount"))$("pitchCount").textContent=String(c.pitches);
  if($("clipCount")){
    $("clipCount").textContent=`${c.strikes}/${c.balls}`;
    $("clipCount").title=`${c.strikes} strikes / ${c.balls} balls`;
  }
};
window.et2910113RefreshPitchStats=et2910113RefreshPitchStats;

et2910115RenderCounters=function(){
  const d=et2910115SyncFromHistory(false);
  if($("balls"))$("balls").textContent=d.balls;
  if($("strikes"))$("strikes").textContent=d.strikes;
  if($("outs"))$("outs").textContent=d.outs;
  et2910113RefreshPitchStats();
};
window.et2910115RenderCounters=et2910115RenderCounters;

/* ================= EASY TAGG v2.9.10.125 EDIT TAG ACTIVE ROSTER ONLY =================
   History > Edit Tag player pickers now use only the active activity roster.
   Historical players and tags remain stored and unchanged; only the available choices
   shown for a new Batter/Pitcher assignment are restricted.
   ===================================================================================== */
const ET2910125_VERSION="2.9.10.125 Edit Tag Active Roster Only";

function et2910125EditRosterPlayers(type){
  const isBatter=type==="batter";
  const roster=typeof et27ActivityPlayers==="function"?et27ActivityPlayers():[];
  return roster.filter(p=>isBatter
    ?(p.role==="Bateador"||p.role==="Ambos")
    :(p.role==="Pitcher"||p.role==="Ambos"));
}

/* Final authority for the visible History player sheet. The hidden transactional
   select remains intact so the currently saved historical assignment is never erased
   merely by opening Edit Tag. */
et2998OpenHistoryPlayers=function(type){
  et2998HistoryField=type;
  const isBatter=type==="batter";
  const title=$("historyPlayerTitleV2998"),box=$("historyPlayerListV2998");
  if(title)title.textContent=isBatter?"Select Batter":"Select Pitcher";
  if(!box)return;
  const list=et2910125EditRosterPlayers(type);
  box.innerHTML=list.map((p,i)=>`<button type="button" class="listBtn" data-history-player-v2998="${p.id}"><span class="lineupOrderCleanV255">${p.num||i+1}</span><span>${p.name}</span><small>${isBatter?(p.bat||""):(p.thr||"")}</small></button>`).join("")||"<p>No eligible players in the current roster.</p>";
  box.querySelectorAll("[data-history-player-v2998]").forEach(button=>button.onclick=()=>{
    const id=button.dataset.historyPlayerV2998;
    const select=$(isBatter?"editBatter":"editPitcher");
    if(select)select.value=id;
    const display=$(isBatter?"editBatterButtonV2998":"editPitcherButtonV2998");
    if(display)display.textContent=pn(id);
    et2910HideChild("historyPlayerSheetV2998");
  });
  openSheet("historyPlayerSheetV2998");
};
window.et2998OpenHistoryPlayers=et2998OpenHistoryPlayers;

/* ================= EASY TAGG v2.9.10.126 CONFIRMED START GAME TAG LOCK =================
   New activities stay in PRE-GAME. Only Lineup/Batter and Pitcher remain available
   on TAG until the centered zone overlay is confirmed. Confirmation starts the
   existing native clock engine from exactly 00:00 and permanently unlocks that activity.
   Clock math, timestamp capture, Sync mapping and clip windows are unchanged.
   ====================================================================================== */
const ET2910126_VERSION="2.9.10.126 Confirmed Start Game Tag Lock";
const ET2910126_STARTED_PREFIX="etd_game_started_v2910126_";

function et2910126StartedKey(gameId=state.activeGameId){return ET2910126_STARTED_PREFIX+String(gameId||"no_game")}
function et2910126ExistingGameHasTags(){return !!state.activeGameId&&(state.tags||[]).some(t=>String(t.game_id||"")===String(state.activeGameId||""))}
function et2910126IsStarted(){
  if(!state.activeGameId)return false;
  if(localStorage.getItem(et2910126StartedKey())==="1")return true;
  /* Safe migration: never lock or reset an activity that already contains tags. */
  if(et2910126ExistingGameHasTags()){localStorage.setItem(et2910126StartedKey(),"1");return true;}
  return false;
}
function et2910126ShouldRunClock(){return et2910126IsStarted()}

function et2910126StopClock(reset=false){
  if(state.timer){clearInterval(state.timer);state.timer=null;}
  state.run=false;state.clockAnchorMs=null;
  if(reset){state.clock=0;state.clockBase=0;localStorage.setItem("etd_clock","0");}
  else state.clockBase=Number(state.clock)||0;
}

function et2910126EnsureUi(){
  const zone=$("zone");
  const zoneCard=zone?.closest(".zoneCard");
  if(zoneCard&&!$("startGameOverlayV126")){
    const overlay=document.createElement("div");
    overlay.id="startGameOverlayV126";overlay.className="startGameOverlayV126";
    overlay.innerHTML='<div class="startGamePanelV126"><small>PRE-GAME</small><button id="startGameBtnV126" type="button">START GAME</button><span>Lineup and Pitcher available</span></div>';
    overlay.addEventListener("pointerdown",e=>e.stopPropagation());
    /* The overlay belongs to zoneCard, not #zone: manual IN/OUT mode hides #zone. */
    zoneCard.appendChild(overlay);
  }
  if(!$("startGameConfirmSheetV126")){
    const sheet=document.createElement("div");
    sheet.id="startGameConfirmSheetV126";sheet.className="sheet hidden startGameConfirmSheetV126";
    sheet.innerHTML='<div class="sheetHead"><h2>START GAME</h2></div><p>The clock will begin at exactly 00:00 and TAG will be unlocked.</p><div class="startGameConfirmActionsV126"><button id="cancelStartGameV126" type="button">CANCEL</button><button id="confirmStartGameV126" type="button">CONFIRM START</button></div>';
    document.body.appendChild(sheet);
  }
  const start=$("startGameBtnV126"),cancel=$("cancelStartGameV126"),confirmBtn=$("confirmStartGameV126");
  if(start)start.onclick=et2910126RequestStart;
  if(cancel)cancel.onclick=()=>{closeSheets();et2910126ApplyLock()};
  if(confirmBtn)confirmBtn.onclick=et2910126ConfirmStart;
}

function et2910126HasLineup(){
  try{
    return typeof et27GetLineup==="function"&&(
      et27GetLineup("away").length>0||et27GetLineup("home").length>0
    );
  }catch(_){return false;}
}
function et2910126RequestStart(){
  if(!game())return etAppAlert("Create or select an activity before starting.","ACTIVITY REQUIRED");
  if(!et2910126HasLineup())return etAppAlert("Add at least one batter to the current lineup before starting.","LINEUP REQUIRED");
  if(!state.pitcher)return etAppAlert("Select a pitcher before starting.","PITCHER REQUIRED");
  openSheet("startGameConfirmSheetV126");
}
function et2910126ConfirmStart(){
  if(et2910126IsStarted())return closeSheets();
  et2910126StopClock(true);
  state.balls=0;state.strikes=0;state.outs=0;state.paInHalf=0;
  state.pending=null;state.zoneX="";state.zoneY="";state.zoneStatus="";
  localStorage.setItem(et2910126StartedKey(),"1");
  clock();
  save();closeSheets();render();et2910126ApplyLock();
  try{if(window.AndroidBridge)AndroidBridge.vibrateShort();}catch(_){ }
}

function et2910126ApplyLock(){
  et2910126EnsureUi();
  const locked=!et2910126IsStarted();
  $("tagScreen")?.classList.toggle("tagPregameV126",locked);
  const overlay=$("startGameOverlayV126");if(overlay)overlay.hidden=!locked;
  const controls=document.querySelectorAll('#tagScreen #inning,#tagScreen #battingSide,#tagScreen #bBtn,#tagScreen #sBtn,#tagScreen #oBtn,#tagScreen #resultBtn,#tagScreen #runnerEventBtnV294,#tagScreen [data-pitch],#tagScreen [data-result],#tagScreen [data-sheet-result],#tagScreen [data-contact],#tagScreen [data-traj],#tagScreen #manualInZoneV2910111,#tagScreen #manualOutZoneV2910111,#tagScreen #mph,#tagScreen #exitVelo,#tagScreen #note,#tagScreen #half');
  controls.forEach(el=>{el.disabled=locked;el.setAttribute("aria-disabled",locked?"true":"false")});
}

function et2910126GuardTag(){
  if(et2910126IsStarted())return true;
  et2910126ApplyLock();
  etAppAlert("Press START GAME in the zone before creating tags.","GAME NOT STARTED");
  return false;
}

/* Defense in depth: UI is disabled, and every direct tag entry point is guarded. */
const et2910126StartTagBase=startTag;
startTag=function(){if(!et2910126GuardTag())return;return et2910126StartTagBase.apply(this,arguments)};
window.startTag=startTag;
const et2910126SaveTagBase=saveTag;
saveTag=function(){if(!et2910126GuardTag())return;return et2910126SaveTagBase.apply(this,arguments)};
window.saveTag=saveTag;
const et2910126ImmediateResultBase=etV275CreateImmediateResultTag;
etV275CreateImmediateResultTag=function(){if(!et2910126GuardTag())return;return et2910126ImmediateResultBase.apply(this,arguments)};
window.etV275CreateImmediateResultTag=etV275CreateImmediateResultTag;

/* Every newly created activity returns to a stopped 00:00 PRE-GAME state. */
const et2910126CreateGameBase=createGame;
createGame=function(){
  const out=et2910126CreateGameBase.apply(this,arguments);
  if(state.activeGameId)localStorage.removeItem(et2910126StartedKey());
  et2910126StopClock(true);save();render();et2910126ApplyLock();
  return out;
};
window.createGame=createGame;

window.addEventListener("load",()=>{
  et2910126EnsureUi();et2910126ApplyLock();
  const gameSelect=$("gameSelect");
  if(gameSelect)gameSelect.addEventListener("change",()=>setTimeout(()=>{
    if(et2910126IsStarted()){if(!state.run)clock();}
    else et2910126StopClock(false);
    save();et2910126ApplyLock();
  },0));
});

/* ================= EASY TAGG v2.9.10.127 FLEXIBLE START REQUIREMENT =================
   START GAME requires only one non-empty lineup (Visitor OR Home) and one selected
   pitcher. It never requires both lineups, nine batters or any fixed player count.
   ==================================================================================== */
const ET2910127_VERSION="2.9.10.127 Flexible Start Requirement";

/* ================= EASY TAGG v2.9.10.128 START OVERLAY BOTH ZONE MODES =================
   The PRE-GAME overlay is attached to zoneCard so it remains visible when manual
   IN/OUT mode hides the coordinate #zone. Confirmation contrast is explicit in Light Mode.
   ======================================================================================== */
const ET2910128_VERSION="2.9.10.128 Start Overlay Both Zone Modes";

/* ================= EASY TAGG v2.9.10.130 HISTORY NEWEST TAG FIRST =================
   History display follows the real append/insertion order of state.tags and reverses
   it in the existing renderer. The last tag added is always the first visible card.
   NULL, OMITTED and edited tags receive no artificial time-based priority.
   Sync/export ordering, timestamps and game_seconds are untouched.
   ================================================================================== */
const ET2910130_VERSION="2.9.10.130 History Newest Tag First";

/* ================= EASY TAGG v2.9.10.132 ORANGE ACTIONS + RELIABLE HAPTICS =================
   Visual identification is CSS-only. Haptics confirm completed saves/tags/deletes
   and successful navigation into Edit, CSV Player Database and Player At-Bats.
   Clock, timestamps, Sync and clip calculations remain untouched.
   ============================================================================================ */
const ET2910132_VERSION="2.9.10.132 Orange Actions + Reliable Haptics";
let et2910132SaveEligible=false;

function et2910132Haptic(kind){
  try{
    const bridge=window.AndroidBridge;if(!bridge)return;
    if(kind==="navigate"&&bridge.vibrateNavigate)bridge.vibrateNavigate();
    else if(kind==="tag"&&bridge.vibrateTag)bridge.vibrateTag();
    else if(kind==="save"&&bridge.vibrateSave)bridge.vibrateSave();
    else if(kind==="delete"&&bridge.vibrateDelete)bridge.vibrateDelete();
  }catch(_err){}
}

/* Keep the existing selective call sites, but do not confirm an invalid Save tap. */
et291056Haptic=function(kind){
  if(kind==="save"&&!et2910132SaveEligible)return;
  et2910132Haptic(kind);
  if(kind==="save")et2910132SaveEligible=false;
};

function et2910132SuccessfulOpen(selector){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const target=document.querySelector(selector);
    if(target&&!target.classList.contains("hidden"))et2910132Haptic("navigate");
  }));
}

/* Wrap current edit entry points once; aliases are updated for dynamic roster cards. */
const et2910132OpenEditBase=window.openEditTag||openEditTag;
openEditTag=function(){
  const out=et2910132OpenEditBase.apply(this,arguments);
  et2910132SuccessfulOpen("#editTagSheet");return out;
};
window.openEditTag=openEditTag;window.openEditTagV21=openEditTag;

const et2910132EditPlayerBase=window.editPlayer||editPlayer;
editPlayer=function(){
  const out=et2910132EditPlayerBase.apply(this,arguments);
  requestAnimationFrame(()=>{
    const quick=$("dbPlayerQuickEditV2995");
    const openedQuick=quick&&!quick.classList.contains("hidden");
    const openedRoster=$("rosterScreen")?.classList.contains("active");
    if(openedQuick||openedRoster)et2910132Haptic("navigate");
  });
  return out;
};
window.editPlayer=editPlayer;window.et254EditPlayer=editPlayer;window.et251EditPlayer=editPlayer;

const et2910132ToggleOmitBase=window.et291081ToggleOmit;
if(typeof et2910132ToggleOmitBase==="function"){
  et291081ToggleOmit=async function(id){
    const tag=(state.tags||[]).find(item=>item.tag_id===id);if(!tag)return;
    const wasOmitted=!!tag.sync_deleted;
    await et2910132ToggleOmitBase.apply(this,arguments);
    const updated=(state.tags||[]).find(item=>item.tag_id===id);
    if(updated&&!!updated.sync_deleted!==wasOmitted)et2910132Haptic(updated.sync_deleted?"delete":"save");
  };
  window.et291081ToggleOmit=et291081ToggleOmit;
  window.v243DeleteTag=et291081ToggleOmit;window.delTag=et291081ToggleOmit;v243DeleteTag=et291081ToggleOmit;
}

document.addEventListener("click",event=>{
  const button=event.target.closest("button");if(!button)return;
  if(button.matches("#savePlayer"))et2910132SaveEligible=!!$("pname")?.value.trim();
  else if(button.matches("#saveEditedTag"))et2910132SaveEligible=!!$("editTagId")?.value;
  else if(button.matches("#dbPlayerQuickEditSaveV2995"))et2910132SaveEligible=!!$("dbPlayerQuickEditIdV2995")?.value;
  else if(button.matches("#openPlayerDatabaseBtnV297"))et2910132SuccessfulOpen("#playerDatabaseSheetV297");
  else if(button.matches("#runnerEventBtnV294"))et2910132SuccessfulOpen("#runnerEventSheetV294");
},true);

/* START GAME is a confirmed completed action; replace its legacy silent pulse. */
const et2910132ConfirmStartBase=et2910126ConfirmStart;
et2910126ConfirmStart=function(){
  const wasStarted=et2910126IsStarted();
  const out=et2910132ConfirmStartBase.apply(this,arguments);
  if(!wasStarted&&et2910126IsStarted())et2910132Haptic("save");
  return out;
};

/* ================= EASY TAGG v2.9.10.133 EDIT SAVE RETURN TO TAG =================
   A successful History edit returns directly to TAG unless the saved edit changed
   the Batter or Pitcher. Player reassignment edits stay on History for verification.
   The transactional save, PA revalidation and History-derived counters run first.
   ================================================================================= */
const ET2910133_VERSION="2.9.10.133 Edit Save Return To Tag";
const et2910133CommitEditBase=et291065CommitHistoryEdit;
et291065CommitHistoryEdit=function(){
  const id=$("editTagId")?.value||et291065EditId||"";
  const original=(state.tags||[]).find(tag=>tag.tag_id===id);
  const originalBatter=String(original?.batter_id||"");
  const originalPitcher=String(original?.pitcher_id||"");
  const selectedBatter=String($("editBatter")?.value||originalBatter);
  const selectedPitcher=String($("editPitcher")?.value||originalPitcher);
  const playerChanged=selectedBatter!==originalBatter||selectedPitcher!==originalPitcher;
  const saved=et2910133CommitEditBase.apply(this,arguments);
  if(saved&&!playerChanged)show("tagScreen");
  return saved;
};
saveEditedTag=et291065CommitHistoryEdit;
window.saveEditedTag=saveEditedTag;window.saveEditedTagV21=saveEditedTag;
