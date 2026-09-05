import {initializeApp} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendPasswordResetEmail,signOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {getFirestore,doc,getDoc,setDoc,deleteDoc,getDocs,collection,query,orderBy,serverTimestamp,Timestamp} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig={
  apiKey:"AIzaSyCIMT-DdodNdetlKApnrbpRdWMkMRlBKe4",
  authDomain:"college-pickem-6caa9.firebaseapp.com",
  projectId:"college-pickem-6caa9",
  storageBucket:"college-pickem-6caa9.firebasestorage.app",
  messagingSenderId:"706617130616",
  appId:"1:706617130616:web:48d7ae2faf9b1c796ab78d",
  measurementId:"G-9ZYCQ6806Y"
};

const fb=initializeApp(firebaseConfig);
const auth=getAuth(fb);
const db=getFirestore(fb);
const google=new GoogleAuthProvider();
const baseGames=[["#13 Alabama", "East Carolina", -28.5, 2], ["#7 Miami", "Stanford", -24.5, 2], ["#14 USC", "Fresno State", -22.5, 2], ["#6 Indiana", "North Texas", -40.5, 2], ["#23 Houston", "Oregon State", -20.5, 2], ["Auburn", "Baylor", -6.5, 1], ["#2 Oregon", "Boise State", -24.5, 2], ["#18 Penn State", "Marshall", -24.5, 2], ["Cincinnati", "Boston College", -7.5, 1], ["Arkansas", "North Alabama", -40.5, 1], ["Mississippi State", "UL Monroe", -28.5, 1], ["#11 LSU", "Clemson", -10.5, 2], ["#16 Michigan", "Western Michigan", -27.5, 2], ["Florida", "Florida Atlantic", -27.5, 1], ["UCLA", "California", -1.5, 1], ["#17 Washington", "Washington State", -23.5, 2], ["#4 Notre Dame", "Wisconsin", -20.5, 2], ["#9 Ole Miss", "#24 Louisville", -6.5, 3], ["#19 SMU", "Florida State", -2.5, 2], ["Georgia Tech", "Colorado", -6.5, 1]].map((g,i)=>({id:"g"+(i+1),fav:g[0],dog:g[1],spread:g[2],points:g[3]}));

let user=null,profile=null,picks={},submittedAt=null,weekData=null,currentWeekId="week-1",availableWeeks=[],trackingEntries=[];
let scoreFeedLastUpdated=null,scoreFeedError="",scoreRefreshTimer=null;
const ESPN_SCOREBOARD="https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard";
const scoreFeedCache=new Map();
const $=x=>document.getElementById(x);

function setTab(tabId){
  document.querySelectorAll("nav button,.tab").forEach(x=>x.classList.remove("active"));
  const navBtn=document.querySelector(`nav button[data-tab="${tabId}"]`);
  if(navBtn) navBtn.classList.add("active");
  $(tabId).classList.add("active");
}

function centralPartsToDate(dateStr,timeStr){
  if(!dateStr||!timeStr) return null;
  const [y,m,d]=dateStr.split("-").map(Number), [hh,mm]=timeStr.split(":").map(Number);
  let guess=new Date(Date.UTC(y,m-1,d,hh,mm));
  for(let i=0;i<3;i++){
    const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(guess);
    const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    const represented=Date.UTC(+map.year,+map.month-1,+map.day,+map.hour,+map.minute);
    const desired=Date.UTC(y,m-1,d,hh,mm);
    guess=new Date(guess.getTime()+(desired-represented));
  }
  return guess;
}

function formatCentral(value){
  if(!value) return "Not set";
  const date=value.toDate?value.toDate():new Date(value);
  return new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",weekday:"short",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(date);
}

function isLocked(){
  if(!weekData?.lockAt) return false;
  const d=weekData.lockAt.toDate?weekData.lockAt.toDate():new Date(weekData.lockAt);
  return Date.now()>=d.getTime();
}

function gamesForWeek(){ return Array.isArray(weekData?.games) && weekData.games.length ? weekData.games : baseGames; }

async function loadWeeks(){
  const snap=await getDocs(collection(db,"weeks"));
  availableWeeks=snap.docs.map(d=>({id:d.id,...d.data()}))
    .filter(w=>w.published || profile?.role==="admin")
    .sort((a,b)=>(a.weekNumber||999)-(b.weekNumber||999));

  if(!availableWeeks.some(w=>w.id===currentWeekId)){
    currentWeekId=availableWeeks[0]?.id||"week-1";
  }

  $("weekSelectTop").innerHTML=availableWeeks.length
    ? availableWeeks.map(w=>`<option value="${w.id}">${w.label||w.id}${w.isTest?" — TEST":""}</option>`).join("")
    : '<option value="week-1">Week 1</option>';
  $("weekSelectTop").value=currentWeekId;
}

function updateWeekUI(){
  const label=weekData?.label||currentWeekId;
  document.querySelector("#picks h2").textContent=`${label} Games`;
  document.querySelector("#confirmation .confirmation-subtitle").textContent=`${label} • College Pick'em`;
  $("resultsTitle").textContent=`${label} Results`;

    if($("weekLockTop")) $("weekLockTop").textContent=weekData?.lockAt?`Lock: ${formatCentral(weekData.lockAt)}`:"Lock: Not set";
  if($("weekStatusTop")) $("weekStatusTop").textContent=isLocked()?"PICKS LOCKED":"PICKS OPEN";
  if($("testModeBadge")) $("testModeBadge").hidden=!weekData?.isTest;
  if($("testModeText")) $("testModeText").innerHTML=weekData?.isTest
    ?"This is a test week.<br>It does not affect standings."
    :"This is a real week.<br>It affects standings.";
}

function updateLockUI(){
  const text=weekData?.lockAt?`Picks lock ${formatCentral(weekData.lockAt)}`:"Pick deadline has not been published yet.";
  $("lockNotice").textContent=text;
  $("myPicksLockNotice").textContent=text;
  $("confirmLock").textContent=weekData?.lockAt?formatCentral(weekData.lockAt):"Not set";
  const locked=isLocked();
  $("savePicks").disabled=locked;
  $("clemsonScore").disabled=locked;
  $("lsuScore").disabled=locked;
  $("myPicksEdit").disabled=locked;
  $("editPicks").disabled=locked;
  if(locked){
    $("savePicks").textContent="Picks Locked";
    $("myPicksEdit").textContent="🔒 Picks Locked";
    $("editPicks").textContent="🔒 Picks Locked";
    $("confirmHelper").textContent="The weekly deadline has passed. Your picks are now locked.";
  }else{
    $("myPicksEdit").textContent="Edit My Picks";
    $("editPicks").textContent="Edit Picks";
    $("confirmHelper").textContent="You can edit your picks until the weekly lock time.";
  }
}

function updateProgress(){
  const gs=gamesForWeek(), count=gs.filter(g=>picks[g.id]).length;
  $("pickProgress").textContent=`${count} of ${gs.length} complete`;
  if(!isLocked()) $("savePicks").textContent=submittedAt?"Update Picks":"Submit Picks";
}

function renderGames(){
  const locked=isLocked(), gs=gamesForWeek();
  $("games").innerHTML=gs.map(g=>`<div class="game">
    <div class="game-head"><div><b>${g.dog} vs ${g.fav}</b><div class="matchup-spread">${g.fav} ${g.spread}</div></div>
    <span class="points">${g.points} pt${g.points>1?"s":""}</span></div>
    <div class="choices">
      <button class="choice ${picks[g.id]===g.fav?"selected":""}" ${locked?"disabled":""} data-g="${g.id}" data-p="${g.fav}">${g.fav} ${g.spread}</button>
      <button class="choice ${picks[g.id]===g.dog?"selected":""}" ${locked?"disabled":""} data-g="${g.id}" data-p="${g.dog}">${g.dog} +${Math.abs(g.spread)}</button>
    </div></div>`).join("");
  if(!locked) document.querySelectorAll(".choice").forEach(b=>b.onclick=()=>{picks[b.dataset.g]=b.dataset.p;renderGames();});
  updateProgress(); updateLockUI();
}

function renderMy(){
  const gs=gamesForWeek();
  $("myPicksView").innerHTML=gs.map(g=>`<p><b>${g.dog} vs ${g.fav}:</b> ${picks[g.id]||"No pick yet"}</p>`).join("")+
    (($("clemsonScore").value!==""&&$("lsuScore").value!=="")?`<p><b>Game of the Week:</b> Clemson ${$("clemsonScore").value} – LSU ${$("lsuScore").value}</p>`:"");
  updateLockUI();
}


function normalizeTeamName(value){
  return String(value||"")
    .replace(/^#\d+\s+/,"")
    .toLowerCase()
    .replace(/&/g,"and")
    .replace(/[^a-z0-9]+/g," ")
    .trim()
    .replace(/\s+/g," ");
}

const teamAliases={
  "ul monroe":["louisiana monroe","ulm"],
  "louisiana monroe":["ul monroe","ulm"],
  "miami":["miami hurricanes"],
  "usc":["southern california","usc trojans"],
  "smu":["southern methodist"],
  "lsu":["louisiana state"],
  "ucla":["california los angeles"],
  "california":["cal"],
  "ole miss":["mississippi"],
  "florida atlantic":["fau"],
  "north alabama":["una"]
};

function teamNameKeys(value){
  const base=normalizeTeamName(value);
  return new Set([base,...(teamAliases[base]||[]).map(normalizeTeamName)]);
}

function espnCompetitorKeys(comp){
  const t=comp?.team||{};
  const raw=[t.displayName,t.shortDisplayName,t.location,t.name,t.abbreviation,t.slug];
  const keys=new Set();
  raw.filter(Boolean).forEach(v=>{
    const n=normalizeTeamName(v);
    if(n) keys.add(n);
    (teamAliases[n]||[]).forEach(a=>keys.add(normalizeTeamName(a)));
  });
  return keys;
}

function namesOverlap(target,comp){
  const a=teamNameKeys(target), b=espnCompetitorKeys(comp);
  for(const k of a) if(b.has(k)) return true;
  return false;
}

function weekFeedParams(w){
  const raw=w?.lockDate || (w?.lockAt?.toDate?w.lockAt.toDate().toISOString().slice(0,10):"");
  const year=raw?Number(String(raw).slice(0,4)):new Date().getFullYear();
  const week=Number(w?.weekNumber)||1;
  return {year,week};
}

async function fetchEspnEventsForWeek(w,{force=false}={}){
  const {year,week}=weekFeedParams(w);
  const cacheKey=`${year}-${week}`;
  const cached=scoreFeedCache.get(cacheKey);
  if(!force && cached && Date.now()-cached.fetchedAt<60000) return cached.events;
  const url=`${ESPN_SCOREBOARD}?dates=${year}&seasontype=2&week=${week}&limit=200`;
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok) throw new Error(`Score feed returned ${response.status}`);
  const data=await response.json();
  const events=Array.isArray(data?.events)?data.events:[];
  scoreFeedCache.set(cacheKey,{events,fetchedAt:Date.now()});
  return events;
}

function matchEspnEvent(game,events){
  for(const event of events){
    const competitors=event?.competitions?.[0]?.competitors||[];
    if(competitors.length<2) continue;
    const fav=competitors.find(c=>namesOverlap(game.fav,c));
    const dog=competitors.find(c=>namesOverlap(game.dog,c));
    if(fav && dog && fav!==dog) return {event,fav,dog};
  }
  return null;
}

function numericScore(comp){
  const n=Number(comp?.score);
  return Number.isFinite(n)?n:null;
}

function calculateAtsWinner(game,favScore,dogScore){
  if(favScore===null||dogScore===null) return null;
  const adjustedFav=favScore+Number(game.spread||0);
  if(Math.abs(adjustedFav-dogScore)<0.0001) return "PUSH";
  return adjustedFav>dogScore?game.fav:game.dog;
}

function mergeScoreFeedIntoGames(games,events){
  return games.map(game=>{
    const match=matchEspnEvent(game,events);
    if(!match) return {...game,feedMatched:false};
    const {event,fav,dog}=match;
    const favScore=numericScore(fav), dogScore=numericScore(dog);
    const status=event?.status?.type||{};
    const completed=!!status.completed;
    const detail=status.shortDetail||status.detail||status.description||"Scheduled";
    const next={...game,feedMatched:true,feedSource:"ESPN",feedEventId:event.id,feedStatus:detail,feedCompleted:completed};
    if(favScore!==null&&dogScore!==null){
      next.liveFavScore=favScore; next.liveDogScore=dogScore;
      next.final=`${shortTeam(game.dog)} ${dogScore} – ${shortTeam(game.fav)} ${favScore}`;
    }
    if(completed){
      const autoWinner=calculateAtsWinner(game,favScore,dogScore);
      if(autoWinner) next.atsWinner=autoWinner;
      next.autoGraded=true;
    }
    return next;
  });
}

async function hydrateWeekFromScoreFeed(w,{force=false}={}){
  if(!w || w.isTest) return w;
  try{
    const events=await fetchEspnEventsForWeek(w,{force});
    const base=Array.isArray(w.games)&&w.games.length?w.games:baseGames;
    const hydrated={...w,games:mergeScoreFeedIntoGames(base,events)};
    scoreFeedLastUpdated=new Date(); scoreFeedError="";
    return hydrated;
  }catch(e){
    scoreFeedError=e?.message||String(e);
    return w;
  }
}

function scoreFeedStatusText(){
  if(weekData?.isTest) return "Test week — automatic score feed is disabled.";
  if(scoreFeedError) return `Automatic score feed unavailable (${scoreFeedError}). Manual overrides remain available to the commissioner.`;
  if(scoreFeedLastUpdated) return `Scores update automatically from ESPN. Last checked ${scoreFeedLastUpdated.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}.`;
  return "Scores update automatically from ESPN when this page is open.";
}

async function refreshAutomaticScores({force=false}={}){
  if(!weekData || weekData.isTest) return;
  weekData=await hydrateWeekFromScoreFeed(weekData,{force});
  renderResults(); renderAdminResults();
  await loadTracking({skipScoreRefresh:true});
}

function gameOutcome(g){
  const raw=g.atsWinner??g.coverWinner??g.resultWinner??g.winner??null;
  if(!raw) return null;
  const value=String(raw).trim();
  if(!value) return null;
  if(value.toUpperCase()==="PUSH") return "PUSH";
  return value;
}

function isGameComplete(g){ return !!gameOutcome(g); }

function gradePick(g,pick){
  const outcome=gameOutcome(g);
  if(!outcome) return "pending";
  if(outcome==="PUSH") return "push";
  return pick===outcome?"correct":"wrong";
}

function entryScore(entry,gs=gamesForWeek()){
  let score=0,possible=0,wins=0,losses=0,pushes=0;
  for(const g of gs){
    const status=gradePick(g,entry.picks?.[g.id]);
    if(status==="correct"){score+=Number(g.points)||1;wins++;}
    else if(status==="wrong") losses++;
    else if(status==="push") pushes++;
    else possible+=Number(g.points)||1;
  }
  return {score,max:score+possible,wins,losses,pushes};
}

function shortTeam(name){
  return String(name||"").replace(/^#\d+\s+/,"");
}

async function loadTracking({skipScoreRefresh=false}={}){
  if(!skipScoreRefresh && weekData && !weekData.isTest) weekData=await hydrateWeekFromScoreFeed(weekData);
  const gs=gamesForWeek();
  $("trackingTitle").textContent=`${weekData?.label||currentWeekId} Tracking`;
  $("trackingComplete").textContent=`${gs.filter(isGameComplete).length} / ${gs.length}`;
  $("trackingRemaining").textContent=String(gs.filter(g=>!isGameComplete(g)).length);

  if(!isLocked() && profile?.role!=="admin"){
    trackingEntries=[];
    $("trackingEntries").textContent="0";
    $("trackingLeader").textContent="Hidden until lock";
    $("trackingStatus").textContent=weekData?.lockAt?`League picks unlock after ${formatCentral(weekData.lockAt)}.`:"League picks unlock after the weekly deadline.";
    $("trackingView").innerHTML='<div class="tracking-empty"><p class="helper">Tracking is hidden until picks lock so nobody can see another player\'s selections early.</p></div>';
    return;
  }

  try{
    const snap=await getDocs(collection(db,"weeks",currentWeekId,"entries"));
    trackingEntries=snap.docs.map(d=>({id:d.id,...d.data()})).filter(e=>e.submitted!==false);
  }catch(e){
    trackingEntries=[];
    $("trackingView").innerHTML=`<p class="helper">Unable to load tracking: ${e.message}</p>`;
    return;
  }

  const ranked=trackingEntries.map(e=>({...e,_grade:entryScore(e,gs)})).sort((a,b)=>
    b._grade.score-a._grade.score || b._grade.max-a._grade.max || String(a.name||"").localeCompare(String(b.name||""))
  );
  $("trackingEntries").textContent=String(ranked.length);
  const topScore=ranked[0]?._grade.score;
  const leaders=ranked.filter(e=>e._grade.score===topScore).map(e=>e.name||"Player");
  $("trackingLeader").textContent=ranked.length?(leaders.length>2?`${leaders.length}-way tie · ${topScore} pts`:`${leaders.join(" / ")} · ${topScore} pts`):"—";
  $("trackingStatus").textContent=weekData?.isTest?"Test week tracking — does not affect season standings.":scoreFeedStatusText();

  if(!ranked.length){
    $("trackingView").innerHTML='<p class="helper" style="padding:16px">No submitted entries yet.</p>';
    return;
  }

  let lastScore=null,lastRank=0;
  const rows=ranked.map((e,i)=>{
    const rank=e._grade.score===lastScore?lastRank:i+1;
    lastScore=e._grade.score; lastRank=rank;
    const cells=gs.map(g=>{
      const pick=e.picks?.[g.id]||"—";
      const state=gradePick(g,pick);
      const icon=state==="correct"?"✓":state==="wrong"?"✕":state==="push"?"—":"•";
      return `<td class="tracking-pick ${state}" title="${g.dog} vs ${g.fav}: ${pick}"><span class="tracking-pick-name">${icon} ${shortTeam(pick)}</span><small>${g.points||1} pt${Number(g.points||1)!==1?"s":""}</small></td>`;
    }).join("");
    return `<tr class="${rank===1?"tracking-leader-row":""}"><td class="sticky-rank">${rank}</td><td class="sticky-player">${e.name||"Player"}</td><td class="score-col">${e._grade.score}</td><td class="score-col">${e._grade.max}</td>${cells}</tr>`;
  }).join("");
  const heads=gs.map((g,i)=>`<th title="${g.dog} vs ${g.fav}">G${i+1}<br><span class="muted">${g.points||1}pt</span></th>`).join("");
  $("trackingView").innerHTML=`<table class="tracking-table"><thead><tr><th class="sticky-rank">#</th><th class="sticky-player">Player</th><th>Score</th><th>Max</th>${heads}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderAdminResults(){
  if(profile?.role!=="admin" || !$("adminResultsGames")) return;
  const gs=gamesForWeek();
  $("adminResultsGames").innerHTML=gs.map((g,i)=>{
    const outcome=gameOutcome(g)||"";
    const finalText=g.final||g.finalScore||"";
    return `<div class="admin-result-row"><div class="admin-result-game"><strong>${i+1}. ${g.dog} vs ${g.fav}</strong><span>${g.fav} ${g.spread} · ${g.points||1} pt${Number(g.points||1)!==1?"s":""}</span></div><select data-result-game="${g.id}"><option value="" ${!outcome?"selected":""}>Pending</option><option value="${g.fav}" ${outcome===g.fav?"selected":""}>${g.fav} covers</option><option value="${g.dog}" ${outcome===g.dog?"selected":""}>${g.dog} covers</option><option value="PUSH" ${outcome==="PUSH"?"selected":""}>Push</option></select><input data-final-game="${g.id}" value="${String(finalText).replace(/&/g,"&amp;").replace(/\"/g,"&quot;")}" placeholder="Final score (optional)"></div>`;
  }).join("");
}

async function saveWeeklyResults(){
  if(profile?.role!=="admin") return;
  const updated=gamesForWeek().map(g=>{
    const winner=$("adminResultsGames").querySelector(`[data-result-game="${g.id}"]`)?.value||"";
    const finalText=$("adminResultsGames").querySelector(`[data-final-game="${g.id}"]`)?.value.trim()||"";
    const next={...g};
    if(winner) next.atsWinner=winner; else delete next.atsWinner;
    if(finalText) next.final=finalText; else delete next.final;
    return next;
  });
  await setDoc(doc(db,"weeks",currentWeekId),{games:updated,resultsUpdatedAt:serverTimestamp()},{merge:true});
  $("resultsAdminMsg").textContent="Weekly results saved. Tracking has been recalculated.";
  await loadCurrentWeek();
  renderGames();renderResults();renderAdminResults();await loadTracking();
}

async function renderSeasonLeaderboard(){
  const host=$("seasonLeaderboard");
  if(!host) return;
  host.innerHTML='<p class="helper">Loading standings…</p>';
  try{
    const weeksSnap=await getDocs(collection(db,"weeks"));
    const rawRealWeeks=weeksSnap.docs.map(d=>({id:d.id,...d.data()})).filter(w=>w.published && !w.isTest);
    const realWeeks=[];
    for(const rawWeek of rawRealWeeks) realWeeks.push(await hydrateWeekFromScoreFeed(rawWeek));
    const totals=new Map();
    for(const w of realWeeks){
      const gs=Array.isArray(w.games)?w.games:[];
      if(!gs.some(isGameComplete)) continue;
      let entriesSnap;
      try{entriesSnap=await getDocs(collection(db,"weeks",w.id,"entries"));}catch{continue;}
      entriesSnap.docs.forEach(d=>{
        const e={id:d.id,...d.data()};
        const grade=entryScore(e,gs);
        const cur=totals.get(e.uid||d.id)||{name:e.name||"Player",points:0,wins:0,losses:0,pushes:0,weeks:0};
        cur.name=e.name||cur.name; cur.points+=grade.score; cur.wins+=grade.wins; cur.losses+=grade.losses; cur.pushes+=grade.pushes; cur.weeks++;
        totals.set(e.uid||d.id,cur);
      });
    }
    const rows=[...totals.values()].sort((a,b)=>b.points-a.points||b.wins-a.wins||a.name.localeCompare(b.name));
    if(!rows.length){host.innerHTML='<p>No graded real weeks yet.</p>';return;}
    host.innerHTML=`<div class="tracking-table-wrap"><table class="tracking-table standings-table"><thead><tr><th>#</th><th class="sticky-player">Player</th><th>Points</th><th>ATS</th><th>Weeks</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td class="sticky-player">${r.name}</td><td class="score-col">${r.points}</td><td>${r.wins}-${r.losses}-${r.pushes}</td><td>${r.weeks}</td></tr>`).join("")}</tbody></table></div>`;
  }catch(e){host.innerHTML=`<p class="helper">Unable to load season standings: ${e.message}</p>`;}
}

function renderResults(){
  const gs=gamesForWeek();
  $("resultsStatus").textContent=weekData?.isTest?"Test results never affect the real season standings.":scoreFeedStatusText();
  $("resultsView").innerHTML=gs.map(g=>{
    const outcome=gameOutcome(g);
    const score=(g.liveFavScore!==undefined&&g.liveDogScore!==undefined)?`${shortTeam(g.dog)} ${g.liveDogScore} – ${shortTeam(g.fav)} ${g.liveFavScore}`:(g.final||"Score pending");
    const state=g.feedCompleted?"Final":(g.feedStatus||"Scheduled");
    return `<div class="result-row"><span><strong>${g.dog} vs ${g.fav}</strong><br><small>${g.fav} ${g.spread} · ${state}</small></span><span class="result-final">${score}${outcome?` · ${outcome==="PUSH"?"Push":`${outcome} covers`}`:""}</span></div>`;
  }).join("");
}

function renderConfirmation(){
  const gs=gamesForWeek(), count=gs.filter(g=>picks[g.id]).length;
  $("confirmCompleted").textContent=`${count} of ${gs.length}`;
  $("confirmTiebreak").textContent=`Clemson ${$("clemsonScore").value} – LSU ${$("lsuScore").value}`;
  $("confirmSubmitted").textContent=submittedAt?.toDate?submittedAt.toDate().toLocaleString():new Date().toLocaleString();
  updateLockUI();
}

async function loadCurrentWeek(){
  const s=await getDoc(doc(db,"weeks",currentWeekId));
  weekData=s.exists()?{id:s.id,...s.data()}:{id:currentWeekId,label:"Week 1",weekNumber:1,published:false,isTest:false,games:baseGames};
  weekData=await hydrateWeekFromScoreFeed(weekData);
  if(profile?.role==="admin"){
    $("lockDate").value=weekData.lockDate||"";
    $("lockTime").value=weekData.lockTime||"";
  }
  updateWeekUI();
  renderAdminResults();
}

async function loadPicks(){
  picks={}; submittedAt=null; $("clemsonScore").value=""; $("lsuScore").value="";
  const s=await getDoc(doc(db,"weeks",currentWeekId,"entries",user.uid));
  if(s.exists()){
    const d=s.data(); picks=d.picks||{};
    $("clemsonScore").value=d.tiebreak?.clemson??"";
    $("lsuScore").value=d.tiebreak?.lsu??"";
    submittedAt=d.submittedAt||d.updatedAt||null;
  }
  renderGames(); renderMy(); renderResults();
  await loadTracking();
  await renderSeasonLeaderboard();
}

async function switchWeek(id){
  currentWeekId=id;
  await loadCurrentWeek();
  await loadPicks();
}

async function loadProfile(){
  const s=await getDoc(doc(db,"users",user.uid));
  profile=s.exists()?s.data():null;
  if(!profile){$("profileCard").hidden=false;$("appArea").hidden=true;return;}
  if($("welcomeName")) $("welcomeName").textContent=(profile.name||"Player").split(" ")[0];
  if($("footerUser")) $("footerUser").textContent=profile.name||user.email;
  $("profileCard").hidden=true;$("appArea").hidden=false;$("adminTab").hidden=profile.role!=="admin";
  await loadWeeks(); await switchWeek(currentWeekId);
}

$("weekSelectTop").onchange=()=>switchWeek($("weekSelectTop").value);
$("googleBtn").onclick=()=>signInWithPopup(auth,google).catch(e=>$("authMsg").textContent=e.message);
$("emailCreate").onclick=()=>createUserWithEmailAndPassword(auth,$("email").value,$("password").value).catch(e=>$("authMsg").textContent=e.message);
$("emailSignIn").onclick=()=>signInWithEmailAndPassword(auth,$("email").value,$("password").value).catch(e=>$("authMsg").textContent=e.message);
$("forgotPassword").onclick=async()=>{
  const email=$("email").value.trim();
  if(!email){$("authMsg").textContent="Enter your email address first, then click Forgot password.";return;}
  try{await sendPasswordResetEmail(auth,email);$("authMsg").textContent="Password reset email sent. Check your inbox and junk/spam folder.";}
  catch(e){$("authMsg").textContent=e.message;}
};

$("saveProfile").onclick=async()=>{
  const name=$("displayName").value.trim().replace(/\s+/g," ");
  if(name.split(" ").length<2){$("profileMsg").textContent="Please enter both your first and last name.";return;}
  await setDoc(doc(db,"users",user.uid),{name,email:user.email,seasonPool:$("seasonPool").checked,role:"player",createdAt:serverTimestamp()});
  await loadProfile();
};

$("savePicks").onclick=async()=>{
  if(isLocked()){$("saveMsg").textContent="Picks are locked for this week.";return;}
  const gs=gamesForWeek(), completed=gs.filter(g=>picks[g.id]).length, clemson=$("clemsonScore").value, lsu=$("lsuScore").value;
  if(completed!==gs.length){$("saveMsg").textContent=`Please complete all ${gs.length} picks before submitting.`;return;}
  if(clemson===""||lsu===""){$("saveMsg").textContent="Please enter both Game of the Week score predictions.";return;}
  const now=serverTimestamp();
  await setDoc(doc(db,"weeks",currentWeekId,"entries",user.uid),{uid:user.uid,name:profile.name,picks,tiebreak:{clemson:+clemson,lsu:+lsu},submitted:true,submittedAt:submittedAt||now,updatedAt:now,isTest:!!weekData?.isTest},{merge:true});
  const refreshed=await getDoc(doc(db,"weeks",currentWeekId,"entries",user.uid));
  if(refreshed.exists()) submittedAt=refreshed.data().submittedAt||refreshed.data().updatedAt||null;
  $("saveMsg").textContent="";renderMy();renderConfirmation();setTab("confirmation");
};

$("viewMyPicks").onclick=()=>setTab("mypicks");
$("editPicks").onclick=()=>{if(!isLocked())setTab("picks");};
$("myPicksEdit").onclick=()=>{if(!isLocked())setTab("picks");};
$("refreshTracking").onclick=async()=>{
  $("refreshTracking").disabled=true; $("refreshTracking").textContent="Refreshing…";
  try{await refreshAutomaticScores({force:true}); await renderSeasonLeaderboard();}
  finally{$("refreshTracking").disabled=false; $("refreshTracking").textContent="Refresh Scores";}
};
$("saveResults").onclick=()=>saveWeeklyResults().catch(e=>$("resultsAdminMsg").textContent=e.message);

$("publishWeek").onclick=async()=>{
  if(profile?.role!=="admin")return;
  const dateStr=$("lockDate").value,timeStr=$("lockTime").value;
  if(!dateStr||!timeStr){$("adminMsg").textContent="Choose both a lock date and lock time.";return;}
  const lockDate=centralPartsToDate(dateStr,timeStr);
  await setDoc(doc(db,"weeks",currentWeekId),{label:weekData?.label||"Week 1",weekNumber:weekData?.weekNumber||1,isTest:!!weekData?.isTest,games:gamesForWeek(),lockDate:dateStr,lockTime:timeStr,lockTimezone:"America/Chicago",lockAt:Timestamp.fromDate(lockDate),published:true,publishedAt:serverTimestamp()},{merge:true});
  $("adminMsg").textContent=`${weekData?.label||"Week"} published. Picks lock ${formatCentral(lockDate)}.`;
  await loadWeeks();await switchWeek(currentWeekId);
};

$("createTestWeek").onclick=async()=>{
  if(profile?.role!=="admin")return;
  const existing=availableWeeks.filter(w=>w.isTest).map(w=>w.weekNumber||0);
  const n=Math.max(2,...existing)+1;
  const id=`test-week-${n}`;
  await setDoc(doc(db,"weeks",id),{label:`Test Week ${n}`,weekNumber:n,isTest:true,published:true,games:baseGames,createdAt:serverTimestamp()});
  currentWeekId=id;
  await loadWeeks();await switchWeek(id);
  $("adminMsg").textContent=`Test Week ${n} created. Set its Central Time lock date/time and publish when ready.`;
};

$("resetTestWeek").onclick=async()=>{
  if(profile?.role!=="admin")return;
  if(!weekData?.isTest){$("adminMsg").textContent="Reset Test Week only works while a test week is selected.";return;}
  const entries=await getDocs(collection(db,"weeks",currentWeekId,"entries"));
  await Promise.all(entries.docs.map(d=>deleteDoc(d.ref)));
  picks={};submittedAt=null;$("clemsonScore").value="";$("lsuScore").value="";
  renderGames();renderMy();
  $("adminMsg").textContent="Test submissions cleared. The test week itself is still available.";
};

document.querySelectorAll("nav button[data-tab]").forEach(b=>b.onclick=async()=>{setTab(b.dataset.tab);if(b.dataset.tab==="tracking")await loadTracking();if(b.dataset.tab==="results")await refreshAutomaticScores();if(b.dataset.tab==="leaderboard")await renderSeasonLeaderboard();});

scoreRefreshTimer=setInterval(async()=>{
  if(!user||!weekData||weekData.isTest) return;
  const active=document.querySelector(".tab.active")?.id;
  if(active==="tracking"||active==="results") await refreshAutomaticScores({force:true});
},60000);

onAuthStateChanged(auth,async u=>{
  user=u;$("loginCard").hidden=!!u;
  if(u){$("authBox").innerHTML=`<button id="logout">${u.email} · Sign out</button>`;$("logout").onclick=()=>signOut(auth);await loadProfile();}
  else{$("authBox").innerHTML="";$("profileCard").hidden=true;$("appArea").hidden=true;}
});
