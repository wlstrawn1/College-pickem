import {initializeApp} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendPasswordResetEmail,signOut,onAuthStateChanged,setPersistence,browserLocalPersistence} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
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
await setPersistence(auth,browserLocalPersistence);
const db=getFirestore(fb);
const google=new GoogleAuthProvider();
// Week 1 is kept in the exact original Google Form / commissioner order.
// IDs intentionally stay attached to the same matchup they had in earlier builds,
// so existing picks/results in Firestore remain compatible after the reorder.
const baseGames=[
  {id:"g20",fav:"Georgia Tech",dog:"Colorado",spread:-6.5,points:1},
  {id:"g2",fav:"#7 Miami",dog:"Stanford",spread:-24.5,points:2},
  {id:"g3",fav:"#14 USC",dog:"Fresno State",spread:-22.5,points:2},
  {id:"g4",fav:"#6 Indiana",dog:"North Texas",spread:-40.5,points:2},
  {id:"g1",fav:"#13 Alabama",dog:"East Carolina",spread:-28.5,points:2},
  {id:"g5",fav:"#23 Houston",dog:"Oregon State",spread:-20.5,points:2},
  {id:"g6",fav:"Auburn",dog:"Baylor",spread:-6.5,points:1},
  {id:"g7",fav:"#2 Oregon",dog:"Boise State",spread:-24.5,points:2},
  {id:"g8",fav:"#18 Penn State",dog:"Marshall",spread:-24.5,points:2},
  {id:"g9",fav:"Cincinnati",dog:"Boston College",spread:-7.5,points:1},
  {id:"g10",fav:"Arkansas",dog:"North Alabama",spread:-40.5,points:1},
  {id:"g11",fav:"Mississippi State",dog:"UL Monroe",spread:-28.5,points:1},
  {id:"g12",fav:"#11 LSU",dog:"Clemson",spread:-10.5,points:2},
  {id:"g13",fav:"#16 Michigan",dog:"Western Michigan",spread:-27.5,points:2},
  {id:"g14",fav:"Florida",dog:"Florida Atlantic",spread:-27.5,points:1},
  {id:"g15",fav:"UCLA",dog:"California",spread:-1.5,points:1},
  {id:"g16",fav:"#17 Washington",dog:"Washington State",spread:-23.5,points:2},
  {id:"g17",fav:"#4 Notre Dame",dog:"Wisconsin",spread:-20.5,points:2},
  {id:"g18",fav:"#9 Ole Miss",dog:"#24 Louisville",spread:-6.5,points:3},
  {id:"g19",fav:"#19 SMU",dog:"Florida State",spread:-2.5,points:2}
];

let user=null,profile=null,picks={},submittedAt=null,weekData=null,currentWeekId="week-1",availableWeeks=[],trackingEntries=[];
// Players resolve their landing week once per sign-in/page load. After that, manual
// week selections are respected so browsing history does not snap back to the newest week.
let playerDefaultWeekResolved=false;
let loginIntent=null;
let lastCountdownLocked=null;
let scoreFeedLastUpdated=null,scoreFeedError="",scoreRefreshTimer=null,importedSlateCandidates=[],slateView="recommended",slateSearch="",slateReviewSignature="",seasonDataCache=null,playerDirectoryCache=null,historicalImportState=null;
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

function lockAtDate(){
  if(!weekData?.lockAt) return null;
  const d=weekData.lockAt.toDate?weekData.lockAt.toDate():new Date(weekData.lockAt);
  return Number.isNaN(d.getTime())?null:d;
}

function formatLockCountdown(ms){
  const totalSeconds=Math.max(0,Math.floor(ms/1000));
  const days=Math.floor(totalSeconds/86400);
  const hours=Math.floor((totalSeconds%86400)/3600);
  const minutes=Math.floor((totalSeconds%3600)/60);
  const seconds=totalSeconds%60;
  const pad=n=>String(n).padStart(2,"0");
  return days>0?`${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`:`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function updateLockCountdown(){
  const lock=lockAtDate();
  const top=$("weekCountdownTop"),wrap=$("weekCountdownWrap"),submit=$("submitCountdown"),submitValue=$("submitCountdownValue"),deadline=$("submitCountdownDeadline");
  if(!lock){
    if(top) top.textContent="NOT SET";
    if(submitValue) submitValue.textContent="NOT SET";
    if(deadline) deadline.textContent="Commissioner has not published a deadline.";
    if(wrap) wrap.classList.remove("locked");
    if(submit) submit.classList.remove("locked");
    lastCountdownLocked=null;
    return;
  }

  const remaining=lock.getTime()-Date.now();
  const locked=remaining<=0;
  const value=locked?"LOCKED":formatLockCountdown(remaining);
  if(top) top.textContent=value;
  if(submitValue) submitValue.textContent=value;
  if(deadline) deadline.textContent=locked?`Locked ${formatCentral(lock)}`:`Deadline: ${formatCentral(lock)}`;
  if(wrap) wrap.classList.toggle("locked",locked);
  if(submit) submit.classList.toggle("locked",locked);
  if($("weekStatusTop")){
    $("weekStatusTop").textContent=locked?"PICKS LOCKED":"PICKS OPEN";
    $("weekStatusTop").classList.toggle("locked-state",locked);
  }
  if($("picksOpenLabel")){
    $("picksOpenLabel").textContent=locked?"PICKS LOCKED":"PICKS OPEN";
    $("picksOpenLabel").className=`lock-state ${locked?"locked":"open"}`;
  }

  // If the deadline passes while the Picks page is already open, immediately
  // disable the pick buttons and score fields without requiring a refresh.
  if(lastCountdownLocked===false && locked){
    renderGames();
    renderMy();
  }
  lastCountdownLocked=locked;
}

function normalizedTeamKey(name){
  return String(name||"").toLowerCase().replace(/#\d+\s*/g,"").replace(/[^a-z0-9]/g,"");
}

function orderWeekOneGames(games){
  const list=Array.isArray(games)?games:[];
  if(!list.length) return baseGames;
  const used=new Set();
  const ordered=[];
  for(const canonical of baseGames){
    let found=list.find(g=>!used.has(g) && g.id===canonical.id);
    if(!found){
      const cf=normalizedTeamKey(canonical.fav), cd=normalizedTeamKey(canonical.dog);
      found=list.find(g=>{
        if(used.has(g)) return false;
        const gf=normalizedTeamKey(g.fav), gd=normalizedTeamKey(g.dog);
        return (gf===cf&&gd===cd)||(gf===cd&&gd===cf);
      });
    }
    if(found){ordered.push(found);used.add(found);}
  }
  list.forEach(g=>{if(!used.has(g)) ordered.push(g);});
  return ordered;
}

function gamesForWeek(){
  let games;
  if(Array.isArray(weekData?.games)) games=weekData.games;
  else games=currentWeekId==="week-1"?baseGames:[];
  return currentWeekId==="week-1"?orderWeekOneGames(games.length?games:baseGames):games;
}

async function seedWeekOne(){
  if(profile?.role!=="admin") return;
  currentWeekId="week-1";
  const existing=await getDoc(doc(db,"weeks","week-1"));
  const existingData=existing.exists()?existing.data():{};
  await setDoc(doc(db,"weeks","week-1"),{
    label:"Week 1",
    weekNumber:1,
    isTest:false,
    seasonYear:2026,
    published:existingData.published??false,
    games:baseGames,
    tiebreakerGameId:existingData.tiebreakerGameId||"g12",
    createdAt:existingData.createdAt||serverTimestamp(),
    slateUpdatedAt:serverTimestamp()
  },{merge:true});
  await loadWeeks();
  await switchWeek("week-1");
  $("adminMsg").textContent="Week 1 loaded with all 20 games. Set the lock date/time, then Publish / Update Week when you are ready.";
  setTab("admin");
}

async function loadWeeks(){
  const snap=await getDocs(collection(db,"weeks"));
  availableWeeks=snap.docs.map(d=>({id:d.id,...d.data()}))
    .filter(w=>profile?.role==="admin" ? true : (w.published && !w.isTest))
    .sort((a,b)=>(a.weekNumber||999)-(b.weekNumber||999));

  // Always let the commissioner preview the built-in Week 1 slate before it is written to Firestore.
  if(profile?.role==="admin" && !availableWeeks.some(w=>w.id==="week-1")){
    availableWeeks.unshift({id:"week-1",label:"Week 1",weekNumber:1,isTest:false,published:false,games:baseGames,virtual:true});
  }

  // Player landing behavior: default to the newest published REAL week.
  // Drafts stay commissioner-only and test weeks never become the player default.
  if(profile?.role!=="admin" && !playerDefaultWeekResolved){
    const latestPublishedReal=[...availableWeeks]
      .filter(w=>w.published && !w.isTest)
      .sort((a,b)=>{
        const seasonDiff=(Number(b.seasonYear)||2026)-(Number(a.seasonYear)||2026);
        if(seasonDiff) return seasonDiff;
        return (Number(b.weekNumber)||0)-(Number(a.weekNumber)||0);
      })[0];
    if(latestPublishedReal) currentWeekId=latestPublishedReal.id;
    playerDefaultWeekResolved=true;
  }

  if(!availableWeeks.some(w=>w.id===currentWeekId)){
    currentWeekId=availableWeeks[0]?.id||"week-1";
  }

  $("weekSelectTop").innerHTML=availableWeeks.length
    ? availableWeeks.map(w=>`<option value="${w.id}">${w.label||w.id}${w.isTest?" — TEST":(!w.published?" — DRAFT":"")}</option>`).join("")
    : '<option value="week-1">Week 1</option>';
  $("weekSelectTop").value=currentWeekId;
  renderFutureWeekManager();
}


function updateWeekContextCard(){
  const title=$("weekContextTitle"), badge=$("testModeBadge"), text=$("testModeText");
  if(!badge || !text) return;
  badge.hidden=false;

  if(profile?.role==="admin"){
    if(title) title.textContent="Week Status";
    if(weekData?.isTest){
      badge.textContent="TEST WEEK";
      badge.className="test-week-badge";
      text.innerHTML="Commissioner-only practice week.<br>Does not affect season standings.";
    }else if(!weekData?.published){
      badge.textContent="DRAFT WEEK";
      badge.className="test-week-badge draft-week-badge";
      text.innerHTML="Not published.<br>Players cannot see this week yet.";
    }else{
      badge.textContent="PUBLISHED";
      badge.className="test-week-badge real-week-badge";
      text.innerHTML="Visible to players.<br>Counts toward season standings.";
    }
    return;
  }

  if(title) title.textContent="Your Picks";
  if(submittedAt){
    badge.textContent=isLocked()?"LOCKED IN":"SUBMITTED";
    badge.className="test-week-badge real-week-badge";
    text.innerHTML=isLocked()
      ?"Your picks are locked for this week."
      :"Your picks are saved. You can edit them until the deadline.";
  }else if(isLocked()){
    badge.textContent="NO ENTRY";
    badge.className="test-week-badge no-entry-badge";
    text.innerHTML="The weekly pick deadline has passed.";
  }else{
    badge.textContent="NOT SUBMITTED";
    badge.className="test-week-badge draft-week-badge";
    text.innerHTML="Submit your weekly card before the deadline.";
  }
}

async function updateWeeklyPersonalSummary(){
  const labelEl=$("personalWeekLabel"), recEl=$("personalWeekRecord"), rankEl=$("personalWeekRank");
  if(!labelEl||!recEl||!rankEl||!user) return;
  labelEl.textContent=weekData?.label||currentWeekId||"This Week";

  const gs=gamesForWeek();
  if(!gs.length){recEl.textContent="0-0";rankEl.textContent="—";return;}
  const own=entryScore({picks},gs);
  recEl.textContent=`${own.wins}-${own.losses}${own.pushes?`-${own.pushes}`:""}`;

  if(weekData?.isTest){rankEl.textContent="Test week";return;}
  if(profile?.role!=="admin" && !isLocked()){rankEl.textContent="Unlocks at lock";return;}

  try{
    const snap=await getDocs(collection(db,"weeks",currentWeekId,"entries"));
    const entries=snap.docs.map(d=>({id:d.id,...d.data()})).filter(e=>e.submitted!==false);
    const ranked=rankWeeklyEntries(entries,{...weekData,games:gs});
    const idx=ranked.findIndex(e=>e.id===user.uid);
    rankEl.innerHTML=idx>=0?`#${ranked[idx]._rank}<small> of ${ranked.length}</small>`:(submittedAt?"—":"No entry");
  }catch(e){
    rankEl.textContent="—";
  }
}

function updateWeekUI(){
  const label=weekData?.label||currentWeekId;
  document.querySelector("#picks h2").textContent=`${label} Games`;
  document.querySelector("#confirmation .confirmation-subtitle").textContent=`${label} • College Pick'em`;
  $("resultsTitle").textContent=`${label} Game Results`;
  if($("builderWeekContext")){
    const state=weekData?.published?"PUBLISHED":"DRAFT";
    $("builderWeekContext").textContent=`BUILDING ${label.toUpperCase()} · ${state}`;
    $("builderWeekContext").classList.toggle("published",!!weekData?.published);
  }
  if($("historicalImportPanel")){
    // The bulk historical importer is a Week 1 recovery/setup tool only.
    // Keep it out of the normal weekly commissioner workflow for Week 2+.
    $("historicalImportPanel").hidden=currentWeekId!=="week-1";
  }

    if($("weekLockTop")) $("weekLockTop").textContent=weekData?.lockAt?`Lock: ${formatCentral(weekData.lockAt)}`:"Lock: Not set";
  if($("weekStatusTop")){
    $("weekStatusTop").textContent=isLocked()?"PICKS LOCKED":"PICKS OPEN";
    $("weekStatusTop").classList.toggle("locked-state",isLocked());
  }
  if($("picksOpenLabel")){
    $("picksOpenLabel").textContent=isLocked()?"PICKS LOCKED":"PICKS OPEN";
    $("picksOpenLabel").className=`lock-state ${isLocked()?"locked":"open"}`;
  }
  if($("picksLockDisplay")) $("picksLockDisplay").textContent=weekData?.lockAt?formatCentral(weekData.lockAt):"Not set";
  updateWeekContextCard();
  updateLockCountdown();
  updateWeeklyPersonalSummary();
}

function updateLockUI(){
  const lockText=weekData?.lockAt?`Picks lock ${formatCentral(weekData.lockAt)}`:"Pick deadline has not been published yet.";
  const text=weekData?.lineLockedAt?`${lockText} · Lines locked ${formatCentral(weekData.lineLockedAt)}`:lockText;
  $("lockNotice").textContent=text;
  $("myPicksLockNotice").textContent=text;
  $("confirmLock").textContent=weekData?.lockAt?formatCentral(weekData.lockAt):"Not set";
  const locked=isLocked(), hasGames=gamesForWeek().length>0;
  $("savePicks").disabled=locked||!hasGames;
  $("clemsonScore").disabled=locked||!hasGames;
  $("lsuScore").disabled=locked||!hasGames;
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
  const pct=gs.length?Math.round((count/gs.length)*100):0;
  $("pickProgress").textContent=`${count} of ${gs.length} complete`;
  if($("pickProgressPercent")) $("pickProgressPercent").textContent=`${pct}%`;
  if($("pickProgressBar")) $("pickProgressBar").style.width=`${pct}%`;
  if(!isLocked()) $("savePicks").textContent=submittedAt?"Update Picks":"Submit Picks";
}

function renderGames(){
  const locked=isLocked(), gs=gamesForWeek();
  if(!gs.length){
    $("games").innerHTML='<div class="empty-week-card"><strong>No games loaded for this draft yet.</strong><span>Go to Admin → Weekly Card Builder and load the ESPN slate for this selected week.</span></div>';
    updateProgress(); updateLockUI();
    return;
  }
  $("games").innerHTML=gs.map((g,i)=>{
    const favSelected=picks[g.id]===g.fav, dogSelected=picks[g.id]===g.dog;
    const valueLabel=`${g.points} PT${g.points>1?"S":""}`;
    return `<article class="game ${g.points>=3?"featured-game":""}">
      <div class="game-number"><span>GAME</span><strong>${String(i+1).padStart(2,"0")}</strong></div>
      <div class="game-head">
        <div class="game-meta">
          <div class="game-value">${valueLabel}${g.points>=3?' · FEATURED':''}</div>
          <b>${g.dog} <span class="vs-word">vs</span> ${g.fav}</b>
          <div class="matchup-spread">LINE: ${g.fav} ${g.spread}</div>
        </div>
      </div>
      <div class="choices">
        <button class="choice ${favSelected?"selected":""}" ${locked?"disabled":""} data-g="${g.id}" data-p="${g.fav}">
          <span class="choice-role">FAVORITE</span>
          <span class="choice-team">${g.fav}</span>
          <span class="choice-line">${g.spread}</span>
          ${favSelected?'<span class="choice-picked">✓ PICKED</span>':''}
        </button>
        <button class="choice ${dogSelected?"selected":""}" ${locked?"disabled":""} data-g="${g.id}" data-p="${g.dog}">
          <span class="choice-role">UNDERDOG</span>
          <span class="choice-team">${g.dog}</span>
          <span class="choice-line">+${Math.abs(g.spread)}</span>
          ${dogSelected?'<span class="choice-picked">✓ PICKED</span>':''}
        </button>
      </div>
    </article>`;
  }).join("");
  if(!locked) document.querySelectorAll(".choice").forEach(b=>b.onclick=()=>{picks[b.dataset.g]=b.dataset.p;renderGames();});
  updateProgress(); updateLockUI();
}

function tiebreakerGame(){
  const gs=gamesForWeek();
  return gs.find(g=>g.id===weekData?.tiebreakerGameId) || gs.find(g=>normalizeTeamName(g.dog)==="clemson"&&normalizeTeamName(g.fav)==="lsu") || gs[0] || null;
}

function updateTiebreakUI(){
  const g=tiebreakerGame();
  if(!g) return;
  if($("tiebreakMatchup")) $("tiebreakMatchup").textContent=`${g.dog} @ ${g.fav}`;
  if($("tiebreakDogLabel")) $("tiebreakDogLabel").textContent=shortTeam(g.dog);
  if($("tiebreakFavLabel")) $("tiebreakFavLabel").textContent=shortTeam(g.fav);
  if($("clemsonScore")) $("clemsonScore").placeholder="Score";
  if($("lsuScore")) $("lsuScore").placeholder="Score";
}

function atsMarginForPick(g,pick){
  const scores=finalScoresForGame(g);
  if(!scores||!pick) return null;
  const spreadAbs=Math.abs(Number(g.spread)||0);
  const coverMargin=(scores.teamB-scores.teamA)-spreadAbs; // teamB=favorite score, teamA=dog score
  return pick===g.fav?coverMargin:-coverMargin;
}

function scorecardResultLabel(status,margin){
  if(status==="push") return "PUSH";
  if(status==="no-pick") return "NO PICK";
  if(margin==null) return status==="correct"?"WON":"LOST";
  if(status==="correct") return `WON BY ${Math.abs(margin).toFixed(1)}`;
  return `MISSED BY ${Math.abs(margin).toFixed(1)}`;
}

function scorecardGameMeta(g){
  const when=g.date?slateTimeLabel(g.date):"Time TBA";
  return g.network?`${when} · ${htmlEscape(g.network)}`:when;
}

function renderMy(){
  const gs=gamesForWeek(), tb=tiebreakerGame();
  const host=$("myPicksView");
  if(!gs.length){
    host.innerHTML='<p class="helper">No games loaded for this week yet.</p>';
    updateLockUI();
    return;
  }

  const onBoard=[], graded=[];
  let earnedPts=0,lostPts=0,pendingPts=0,wins=0,losses=0,pushes=0;
  for(const g of gs){
    const pick=picks[g.id]||null;
    const status=gradePick(g,pick);
    const pts=Number(g.points)||1;
    const row={g,pick,status,pts,margin:atsMarginForPick(g,pick)};
    if(status==="correct"){earnedPts+=pts;wins++;graded.push(row);}
    else if(status==="wrong"){lostPts+=pts;losses++;graded.push(row);}
    else if(status==="push"){pushes++;graded.push(row);}
    else if(status==="pending"){pendingPts+=pts;onBoard.push(row);}
    else{ // no-pick
      if(isGameComplete(g)){lostPts+=pts;losses++;graded.push(row);}
      else{pendingPts+=pts;onBoard.push(row);}
    }
  }
  const maxFinish=earnedPts+pendingPts;
  const totalPts=earnedPts+lostPts+pendingPts;
  const barPct=v=>totalPts?Math.max(0,Math.round(v/totalPts*1000)/10):0;

  const tbFilledIn=$("clemsonScore").value!==""&&$("lsuScore").value!=="";
  const tbLine=(tbFilledIn&&tb)?`Game of the Week guess: ${htmlEscape(tb.dog)} ${$("clemsonScore").value} – ${htmlEscape(tb.fav)} ${$("lsuScore").value}`:"";

  const rowHtml=(r,graded)=>{
    const pickTeam=r.pick?shortTeam(r.pick):"No pick";
    const statusClass=graded?(r.status==="correct"?"won":r.status==="wrong"||r.status==="no-pick"?"lost":"push"):"pending";
    const rightSide=graded
      ? `<div class="scorecard-row-result ${statusClass}">${scorecardResultLabel(r.status,r.margin)}<span>${r.status==="correct"?`+${r.pts} pt${r.pts>1?"s":""}`:r.status==="push"?"0 pts":`0 of ${r.pts} pt${r.pts>1?"s":""}`}</span></div>`
      : `<div class="scorecard-row-result pending"><span class="scorecard-row-meta">${scorecardGameMeta(r.g)}</span></div>`;
    const scoreLine=graded?(gameScoreLabel(r.g)||r.g.final||""):"";
    return `<article class="scorecard-row ${statusClass}">
      <div class="scorecard-row-main">
        <div class="scorecard-row-matchup">${htmlEscape(r.g.dog)} <span class="vs-word">vs</span> ${htmlEscape(r.g.fav)}</div>
        <div class="scorecard-row-sub">
          <span class="scorecard-pick-chip">${htmlEscape(pickTeam)}</span>
          <span class="scorecard-row-detail">${htmlEscape(r.g.fav)} ${r.g.spread} · ${r.pts} pt${r.pts>1?"s":""}${scoreLine?` · ${htmlEscape(scoreLine)}`:""}</span>
        </div>
      </div>
      ${rightSide}
    </article>`;
  };

  host.innerHTML=`
    <div class="scorecard-stats">
      <div class="scorecard-stat"><span>Points Earned</span><strong>${earnedPts}<i class="unit">pts</i><small>of ${maxFinish} possible</small></strong></div>
      <div class="scorecard-stat"><span>Record</span><strong>${wins}-${losses}${pushes?`-${pushes}`:""}<small>${onBoard.length} game${onBoard.length===1?"":"s"} left</small></strong></div>
      <div class="scorecard-stat"><span>Points Open</span><strong>${pendingPts}<i class="unit">pts</i><small>${onBoard.length} game${onBoard.length===1?"":"s"} still to grade</small></strong></div>
    </div>
    <div class="scorecard-bar-wrap">
      <div class="scorecard-bar">
        <div class="scorecard-bar-seg won" style="width:${barPct(earnedPts)}%"></div>
        <div class="scorecard-bar-seg lost" style="width:${barPct(lostPts)}%"></div>
        <div class="scorecard-bar-seg pending" style="width:${barPct(pendingPts)}%"></div>
      </div>
      <div class="scorecard-legend">
        <span><b class="tracking-dot correct"></b>${earnedPts} points won</span>
        <span><b class="tracking-dot wrong"></b>${lostPts} points missed</span>
        <span><b class="tracking-dot pending"></b>${pendingPts} points still available</span>
      </div>
    </div>
    ${tbLine?`<p class="pick-lock-note muted">${tbLine}</p>`:""}
    ${onBoard.length?`<div class="scorecard-section-head"><h3>On The Board</h3><span>${pendingPts} pts · ${onBoard.length} game${onBoard.length===1?"":"s"}</span></div>
    <div class="scorecard-list">${onBoard.map(r=>rowHtml(r,false)).join("")}</div>`:""}
    ${graded.length?`<div class="scorecard-section-head"><h3>Graded</h3><span>${earnedPts} of ${totalPts} pts · ${graded.length} game${graded.length===1?"":"s"}</span></div>
    <div class="scorecard-list">${graded.map(r=>rowHtml(r,true)).join("")}</div>`:""}
  `;
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
  const year=Number(w?.seasonYear)||(raw?Number(String(raw).slice(0,4)):new Date().getFullYear());
  const week=Number(w?.weekNumber)||1;
  return {year,week};
}

async function fetchEspnEventsForWeek(w,{force=false}={}){
  const {year,week}=weekFeedParams(w);
  const cacheKey=`${year}-${week}`;
  const cached=scoreFeedCache.get(cacheKey);
  if(!force && cached && Date.now()-cached.fetchedAt<60000) return cached.events;
  const url=`${ESPN_SCOREBOARD}?dates=${year}&seasontype=2&week=${week}&groups=80&limit=300`;
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok) throw new Error(`Score feed returned ${response.status}`);
  const data=await response.json();
  const events=Array.isArray(data?.events)?data.events:[];
  scoreFeedCache.set(cacheKey,{events,fetchedAt:Date.now()});
  return events;
}

function rankedTeamLabel(comp){
  const t=comp?.team||{};
  const name=t.shortDisplayName||t.location||t.displayName||t.name||"Team";
  const rank=Number(comp?.curatedRank?.current);
  return Number.isFinite(rank)&&rank>0&&rank<=25?`#${rank} ${name}`:name;
}

function lineFavoriteFromOdds(competition,away,home){
  const odds=(competition?.odds||[]).find(o=>o?.details)||(competition?.odds||[])[0]||null;
  if(!odds) return {favorite:null,spread:null,details:""};
  const details=String(odds.details||"").trim();
  let favorite=null;
  if(odds?.awayTeamOdds?.favorite) favorite=away;
  if(odds?.homeTeamOdds?.favorite) favorite=home;
  if(!favorite&&details){
    const prefix=normalizeTeamName(details.replace(/[-+]?\d+(?:\.\d+)?\s*$/,""));
    if(prefix){
      if(espnCompetitorKeys(away).has(prefix)) favorite=away;
      else if(espnCompetitorKeys(home).has(prefix)) favorite=home;
      else {
        const abbr=normalizeTeamName(details.split(/\s+/)[0]);
        if(espnCompetitorKeys(away).has(abbr)) favorite=away;
        else if(espnCompetitorKeys(home).has(abbr)) favorite=home;
      }
    }
  }
  const m=details.match(/(-?\d+(?:\.\d+)?)\s*$/);
  let spread=m?Number(m[1]):Number(odds.spread);
  if(!Number.isFinite(spread)||spread===0) spread=null;
  if(spread!==null) spread=-Math.abs(spread);
  return {favorite,spread,details};
}

function isMajorNetwork(network){
  return /^(ABC|CBS|FOX|NBC|ESPN|ESPN2|ESPNU|SECN|SEC Network|FS1)$/i.test(String(network||"").trim());
}

function suggestedSlatePoints(c){
  if(Number(c?.rankedCount)>=2) return 3;
  const spreadNumber=c?.spread===null||c?.spread===""?NaN:Number(c?.spread);
  const absSpread=Math.abs(spreadNumber);
  if(Number(c?.rankedCount)===1) return 2;
  if(isMajorNetwork(c?.network) && (!Number.isFinite(absSpread)||absSpread<=14.5)) return 2;
  return 1;
}

function slateRecommendationScore(c){
  let score=0;
  if(Number(c?.rankedCount)>=2) score-=1200;
  else if(Number(c?.rankedCount)===1) score-=650;
  if(isMajorNetwork(c?.network)) score-=140;
  if(c?.hasLine) score-=110;
  const spreadNumber=c?.spread===null||c?.spread===""?NaN:Number(c?.spread);
  const absSpread=Math.abs(spreadNumber);
  if(Number.isFinite(absSpread)) score+=Math.min(absSpread,45)*5;
  else score+=160;
  const best=Number(c?.bestRank);
  if(Number.isFinite(best)&&best<99) score+=best;
  return score;
}

function eventToSlateCandidate(event){
  const competition=event?.competitions?.[0];
  const competitors=competition?.competitors||[];
  if(competitors.length<2) return null;
  const away=competitors.find(c=>c.homeAway==="away")||competitors[1];
  const home=competitors.find(c=>c.homeAway==="home")||competitors[0];
  if(!away||!home) return null;
  const awayName=rankedTeamLabel(away),homeName=rankedTeamLabel(home);
  const line=lineFavoriteFromOdds(competition,away,home);
  const favoriteComp=line.favorite;
  const favorite=favoriteComp===away?awayName:favoriteComp===home?homeName:homeName;
  const dog=favorite===awayName?homeName:awayName;
  const awayRank=Number(away?.curatedRank?.current),homeRank=Number(home?.curatedRank?.current);
  const bestRank=Math.min(Number.isFinite(awayRank)&&awayRank<=25?awayRank:99,Number.isFinite(homeRank)&&homeRank<=25?homeRank:99);
  const rankedCount=[awayRank,homeRank].filter(r=>Number.isFinite(r)&&r<=25).length;
  const candidate={
    id:`espn-${event.id}`,feedEventId:String(event.id),away:awayName,home:homeName,teams:[awayName,homeName],fav:favorite,dog,spread:line.spread,points:1,
    date:event.date||competition?.date||"",network:(competition?.broadcasts?.[0]?.names||[])[0]||"",venue:competition?.venue?.fullName||"",lineDetails:line.details,hasLine:!!line.favorite&&line.spread!==null,
    rankedCount,bestRank
  };
  candidate.points=suggestedSlatePoints(candidate);
  candidate.recommendationScore=slateRecommendationScore(candidate);
  return candidate;
}

function slateTimeLabel(value){
  if(!value) return "Time TBA";
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return "Time TBA";
  return new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(d);
}

function syncSlateStateFromDom(){
  document.querySelectorAll(".slate-game-row").forEach(row=>{
    const c=importedSlateCandidates.find(x=>x.id===row.dataset.candidateId);
    if(!c) return;
    const select=row.querySelector('[data-slate-select]');
    if(select) c.selected=select.checked;
    const fav=row.querySelector('[data-slate-favorite]');
    if(fav) c.fav=fav.value;
    const spread=row.querySelector('[data-slate-spread]');
    if(spread) c.spread=spread.value===""?null:Number(spread.value);
    const points=row.querySelector('[data-slate-points]');
    if(points) c.points=Number(points.value)||1;
    const tb=row.querySelector('[data-slate-tiebreak]');
    if(tb) c.tiebreak=tb.checked;
  });
}

function selectedSlateCandidates(){
  syncSlateStateFromDom();
  return importedSlateCandidates.filter(c=>c.selected);
}

function slateLineConfirmed(c){
  return !!c?.fav && c?.teams?.includes(c.fav) && Number.isFinite(Number(c?.spread)) && Number(c.spread)!==0;
}

function currentSlateSignature(){
  return JSON.stringify(selectedSlateCandidates().map(c=>[c.id,c.fav,Number(c.spread),Number(c.points)||1,!!c.tiebreak]));
}

function invalidateSlateReview(){
  slateReviewSignature="";
  const panel=$("slateReviewPanel");
  if(panel) panel.hidden=true;
}

function applySlateFilters(){
  const term=normalizeTeamName(slateSearch);
  document.querySelectorAll(".slate-game-row").forEach(row=>{
    const c=importedSlateCandidates.find(x=>x.id===row.dataset.candidateId);
    if(!c) return;
    const viewOk=slateView==="all"||!!c.recommended;
    const searchText=normalizeTeamName(`${c.away} ${c.home} ${c.network||""}`);
    row.hidden=!(viewOk && (!term||searchText.includes(term)));
  });
  document.querySelectorAll('[data-slate-view]').forEach(b=>b.classList.toggle("active",b.dataset.slateView===slateView));
}

function updateSlateSelectionUI(){
  syncSlateStateFromDom();
  const selected=importedSlateCandidates.filter(c=>c.selected);
  const wanted=Math.max(1,Number($("importGameCount")?.value)||20);
  const confirmed=selected.filter(slateLineConfirmed).length;
  if($("slateSelectedCount")) $("slateSelectedCount").textContent=`${selected.length} selected · ${wanted} wanted`;
  if($("slateConfirmedCount")) $("slateConfirmedCount").textContent=`${confirmed} of ${wanted} spreads confirmed`;
  document.querySelectorAll(".slate-game-row").forEach(row=>{
    const c=importedSlateCandidates.find(x=>x.id===row.dataset.candidateId);
    const input=row.querySelector('[data-slate-spread]');
    if(!c||!input) return;
    const needs=!!c.selected&&!slateLineConfirmed(c);
    input.classList.toggle("spread-required",needs);
    row.classList.toggle("needs-line",needs);
  });
  const valid=!!importedSlateCandidates.length&&selected.length===wanted&&confirmed===wanted&&selected.some(c=>c.tiebreak);
  const reviewed=valid&&slateReviewSignature&&slateReviewSignature===currentSlateSignature();
  if($("reviewImportedSlate")) $("reviewImportedSlate").disabled=!valid;
  if($("saveImportedSlate")) $("saveImportedSlate").disabled=!reviewed;
  if($("slateReadyState")) $("slateReadyState").textContent=reviewed?"REVIEWED · READY TO SAVE":valid?"READY FOR REVIEW":"FINISH CARD SETUP";
}

function selectRecommendedSlate(){
  syncSlateStateFromDom();
  const wanted=Math.max(1,Number($("importGameCount")?.value)||20);
  importedSlateCandidates.forEach((c,i)=>{
    c.recommended=i<wanted;
    c.selected=i<wanted;
    c.points=suggestedSlatePoints(c);
    c.tiebreak=false;
  });
  const first=importedSlateCandidates.find(c=>c.selected);
  if(first) first.tiebreak=true;
  invalidateSlateReview();
  renderSlatePreview();
}

function clearSlateSelections(){
  syncSlateStateFromDom();
  importedSlateCandidates.forEach(c=>{c.selected=false;c.tiebreak=false;});
  invalidateSlateReview();
  renderSlatePreview();
}

function renderSlatePreview(candidates=null){
  const host=$("importSlatePreview");
  if(!host) return;
  const wanted=Math.max(1,Number($("importGameCount")?.value)||20);
  if(Array.isArray(candidates)){
    importedSlateCandidates=[...candidates].sort((a,b)=>Number(a.recommendationScore)-Number(b.recommendationScore)||String(a.date).localeCompare(String(b.date))||a.away.localeCompare(b.away));
    importedSlateCandidates.forEach((c,i)=>{c.recommended=i<wanted;c.selected=i<wanted;c.points=suggestedSlatePoints(c);c.tiebreak=i===0;});
    slateView="recommended";slateSearch="";slateReviewSignature="";
  }else syncSlateStateFromDom();
  if(!importedSlateCandidates.length){host.innerHTML='<p class="helper">No games involving FBS teams were returned for that week.</p>';updateSlateSelectionUI();return;}
  host.innerHTML=`
    <div class="slate-preview-toolbar">
      <strong>${importedSlateCandidates.length} games involving FBS teams</strong>
      <div class="slate-toolbar-status"><span id="slateSelectedCount">0 selected · ${wanted} wanted</span><span id="slateConfirmedCount">0 of ${wanted} spreads confirmed</span></div>
    </div>
    <div class="slate-filterbar">
      <div class="slate-view-tabs"><button type="button" data-slate-view="recommended" class="active">Recommended ${wanted}</button><button type="button" data-slate-view="all">All Games (${importedSlateCandidates.length})</button></div>
      <input id="slateSearch" type="search" value="${String(slateSearch).replace(/&/g,"&amp;").replace(/\"/g,"&quot;")}" placeholder="Search team or network">
      <button type="button" id="selectRecommendedSlate">Select Recommended ${wanted}</button>
      <button type="button" id="clearSlateSelections">Clear Selections</button>
    </div>
    <div class="slate-preview-list">${importedSlateCandidates.map((c,i)=>{
      const valid=slateLineConfirmed(c),missing=!valid;
      return `<div class="slate-game-row ${c.selected&&missing?"needs-line":""}" data-candidate-id="${c.id}" data-recommended="${c.recommended?"1":"0"}">
        <label class="slate-select"><input type="checkbox" data-slate-select ${c.selected?"checked":""}><span>Use</span></label>
        <div class="slate-matchup"><strong>${c.away} @ ${c.home}</strong><span>${slateTimeLabel(c.date)}${c.network?` · ${c.network}`:""}</span><small class="${c.hasLine?"line-found":"line-missing"}">${c.hasLine?`ESPN line: ${c.lineDetails||`${c.fav} ${c.spread}`}`:"NO ESPN SPREAD — REQUIRED BEFORE REVIEW"}</small>${c.recommended?'<em class="recommended-tag">RECOMMENDED</em>':""}</div>
        <label><span>Favorite</span><select data-slate-favorite><option value="${c.away}" ${c.fav===c.away?"selected":""}>${c.away}</option><option value="${c.home}" ${c.fav===c.home?"selected":""}>${c.home}</option></select></label>
        <label><span>Spread</span><input data-slate-spread class="${c.selected&&missing?"spread-required":""}" type="number" step="0.5" value="${c.spread!==null&&c.spread!==""&&Number.isFinite(Number(c.spread))?c.spread:""}" placeholder="REQUIRED"></label>
        <label><span>Pts</span><select data-slate-points><option value="1" ${Number(c.points)===1?"selected":""}>1</option><option value="2" ${Number(c.points)===2?"selected":""}>2</option><option value="3" ${Number(c.points)===3?"selected":""}>3</option></select></label>
        <label class="slate-tiebreak"><span>Tiebreak</span><input type="radio" name="slateTiebreak" data-slate-tiebreak ${c.tiebreak?"checked":""}></label>
      </div>`;
    }).join("")}</div>`;
  host.querySelectorAll('[data-slate-select],[data-slate-favorite],[data-slate-spread],[data-slate-points],[data-slate-tiebreak]').forEach(el=>{
    const evt=el.matches('[data-slate-spread]')?"input":"change";
    el.addEventListener(evt,()=>{invalidateSlateReview();updateSlateSelectionUI();});
  });
  host.querySelectorAll('[data-slate-view]').forEach(btn=>btn.onclick=()=>{slateView=btn.dataset.slateView;applySlateFilters();});
  $("slateSearch").oninput=e=>{slateSearch=e.target.value;applySlateFilters();};
  $("selectRecommendedSlate").onclick=selectRecommendedSlate;
  $("clearSlateSelections").onclick=clearSlateSelections;
  applySlateFilters();
  updateSlateSelectionUI();
}


function regularWeekNumberFromId(id){
  const m=String(id||"").match(/^week-(\d+)$/);
  return m?Number(m[1]):null;
}

function renderFutureWeekManager(){
  const host=$("futureWeekList");
  if(!host||profile?.role!=="admin") return;
  const regular=availableWeeks.filter(w=>!w.isTest&&Number.isFinite(Number(w.weekNumber))).sort((a,b)=>Number(a.weekNumber)-Number(b.weekNumber));
  if($("futureWeekSeason")){
    const currentSeason=weekData?.seasonYear||regular.find(w=>w.seasonYear)?.seasonYear||2026;
    $("futureWeekSeason").value=currentSeason;
  }
  const next=Math.min(20,Math.max(1,...regular.map(w=>Number(w.weekNumber)||0))+1);
  if($("futureWeekNumber")&&!$("futureWeekNumber").matches(":focus")) $("futureWeekNumber").value=Math.max(2,next);
  host.innerHTML=regular.map(w=>{
    const status=w.published?"PUBLISHED":"DRAFT";
    const games=Array.isArray(w.games)?w.games.length:0;
    const selected=w.id===currentWeekId;
    return `<button type="button" class="future-week-item ${selected?"selected":""}" data-open-week="${w.id}">
      <span><strong>${htmlEscape(w.label||`Week ${w.weekNumber}`)}</strong><small>${status} · ${games} game${games===1?"":"s"}</small></span>
      <em>${selected?"OPEN":"Open →"}</em>
    </button>`;
  }).join("")||'<p class="helper">No regular-season weeks have been created yet.</p>';
  host.querySelectorAll("[data-open-week]").forEach(btn=>btn.onclick=async()=>{
    await switchWeek(btn.dataset.openWeek);
    setTab("admin");
  });
}

async function createFutureWeekDraft(explicitWeek=null){
  if(profile?.role!=="admin") return;
  const regular=availableWeeks.filter(w=>!w.isTest).map(w=>Number(w.weekNumber)||0);
  const next=Math.max(1,...regular)+1;
  const week=Number(explicitWeek??$("futureWeekNumber")?.value??next);
  const season=Number($("futureWeekSeason")?.value||weekData?.seasonYear||2026);
  if(!Number.isInteger(week)||week<2||week>20){
    $("futureWeekMsg").textContent="Choose a week number from 2 through 20.";
    return;
  }
  if(!Number.isInteger(season)||season<2020||season>2100){
    $("futureWeekMsg").textContent="Choose a valid season year.";
    return;
  }
  const id=`week-${week}`;
  const existing=await getDoc(doc(db,"weeks",id));
  if(existing.exists()){
    currentWeekId=id;
    await loadWeeks(); await switchWeek(id); setTab("admin");
    $("futureWeekMsg").textContent=`Week ${week} already exists, so I opened it instead of creating a duplicate.`;
    return;
  }
  await setDoc(doc(db,"weeks",id),{
    label:`Week ${week}`,
    weekNumber:week,
    seasonYear:season,
    isTest:false,
    published:false,
    games:[],
    tiebreakerGameId:null,
    createdAt:serverTimestamp(),
    draftCreatedAt:serverTimestamp()
  });
  currentWeekId=id;
  await loadWeeks(); await switchWeek(id); setTab("admin");
  $("futureWeekMsg").textContent=`Week ${week} draft created. It is admin-only until published. Load its ESPN slate below when you are ready.`;
}

async function importEspnSlate(){
  if(profile?.role!=="admin") return;
  const year=Number($("importSeason").value),week=Number($("importWeek").value);
  if(!year||!week){$("importSlateMsg").textContent="Enter a season and week first.";return;}
  const targetId=`week-${week}`;
  if(currentWeekId!==targetId){
    $("importSlateMsg").textContent=`Open or create Week ${week} in Week Management first. This prevents a future slate from being built while ${weekData?.label||currentWeekId} is selected.`;
    return;
  }
  $("importEspnSlate").disabled=true;$("importEspnSlate").textContent="Loading…";$("importSlateMsg").textContent="Loading the college football slate from ESPN…";
  try{
    const events=await fetchEspnEventsForWeek({seasonYear:year,weekNumber:week},{force:true});
    const candidates=events.map(eventToSlateCandidate).filter(Boolean);
    renderSlatePreview(candidates);
    const withLines=candidates.filter(c=>c.hasLine).length;
    $("importSlateMsg").textContent=`Loaded ${candidates.length} games involving FBS teams. ESPN supplied a usable spread for ${withLines}. Missing lines stay blank and must be confirmed before review.`;
  }catch(e){
    importedSlateCandidates=[];renderSlatePreview([]);$("importSlateMsg").textContent=`Unable to load ESPN slate: ${e.message}`;
  }finally{$("importEspnSlate").disabled=false;$("importEspnSlate").textContent="Load ESPN Slate";}
}

function reviewImportedSlate(){
  if(profile?.role!=="admin") return;
  const wanted=Math.max(1,Number($("importGameCount")?.value)||20);
  const selected=selectedSlateCandidates();
  const confirmed=selected.filter(slateLineConfirmed).length;
  if(selected.length!==wanted){$("importSlateMsg").textContent=`Select exactly ${wanted} games before review.`;return;}
  if(confirmed!==wanted){$("importSlateMsg").textContent=`Confirm all ${wanted} spreads before review. ${confirmed} are ready right now.`;return;}
  let tb=selected.find(c=>c.tiebreak);
  if(!tb){$("importSlateMsg").textContent="Choose a tiebreaker game before review.";return;}
  const panel=$("slateReviewPanel");
  panel.hidden=false;
  panel.innerHTML=`<div class="review-card-head"><div><div class="login-kicker gold">FINAL CARD REVIEW</div><h4>Week ${Number($("importWeek").value)} · ${wanted} Games</h4><p>Review the exact card below. Saving stays disabled until this review matches the current selections.</p></div><button type="button" id="closeSlateReview">Close</button></div><div class="review-card-list">${selected.map((c,i)=>{
    const dog=c.teams.find(t=>t!==c.fav)||"Underdog";
    return `<div class="review-card-row ${c.tiebreak?"review-tiebreak":""}"><span class="review-number">${String(i+1).padStart(2,"0")}</span><div><strong>${dog} vs ${c.fav}</strong><small>${c.fav} ${-Math.abs(Number(c.spread))} · ${Number(c.points)||1} pt${Number(c.points)!==1?"s":""}${c.tiebreak?" · TIEBREAKER":""}</small></div></div>`;
  }).join("")}</div>`;
  $("closeSlateReview").onclick=()=>{panel.hidden=true;};
  slateReviewSignature=currentSlateSignature();
  updateSlateSelectionUI();
  panel.scrollIntoView({behavior:"smooth",block:"start"});
  $("importSlateMsg").textContent="Card reviewed. Save Selected Games as Draft when ready.";
}

async function saveImportedSlateDraft(){
  if(profile?.role!=="admin") return;
  const year=Number($("importSeason").value),week=Number($("importWeek").value),wanted=Math.max(1,Number($("importGameCount").value)||20);
  const selected=selectedSlateCandidates();
  if(selected.length!==wanted){$("importSlateMsg").textContent=`Select exactly ${wanted} games before saving.`;return;}
  if(selected.some(c=>!slateLineConfirmed(c))){$("importSlateMsg").textContent="Every selected game needs a confirmed favorite and non-zero spread before saving.";return;}
  if(!slateReviewSignature||slateReviewSignature!==currentSlateSignature()){$("importSlateMsg").textContent="Review the final card before saving the draft.";return;}
  const targetId=`week-${week}`;
  if(currentWeekId!==targetId){$("importSlateMsg").textContent=`Open Week ${week} before saving its draft.`;return;}
  const existing=await getDoc(doc(db,"weeks",targetId));
  if(existing.exists()&&existing.data()?.published){$("importSlateMsg").textContent=`Week ${week} is already published. This builder will not overwrite a live card.`;return;}
  const games=[];let tiebreakerGameId="";
  for(const c of selected){
    const fav=c.fav,dog=c.teams.find(t=>t!==fav),rawSpread=Number(c.spread),points=Number(c.points)||1;
    const game={id:c.id,feedEventId:c.feedEventId,fav,dog,spread:-Math.abs(rawSpread),points,date:c.date||null,network:c.network||"",lineSource:c.hasLine?"ESPN":"Commissioner",lineConfirmed:true};
    games.push(game);
    if(c.tiebreak) tiebreakerGameId=game.id;
  }
  if(!tiebreakerGameId){$("importSlateMsg").textContent="Choose a tiebreaker game before saving.";return;}
  const existingData=existing.exists()?existing.data():{};
  await setDoc(doc(db,"weeks",targetId),{label:`Week ${week}`,weekNumber:week,seasonYear:year,isTest:false,published:false,games,tiebreakerGameId,importedFrom:"ESPN",importedAt:serverTimestamp(),cardReviewed:true,cardReviewedAt:serverTimestamp(),createdAt:existingData.createdAt||serverTimestamp()},{merge:true});
  currentWeekId=targetId;
  $("importSlateMsg").textContent=`Week ${week} draft saved with ${games.length} games. Set the lock date/time, then publish when ready.`;
  await loadWeeks();await switchWeek(targetId);setTab("admin");
}

function matchEspnEvent(game,events){
  const directId=String(game?.feedEventId||game?.espnEventId||"");
  if(directId){
    const direct=events.find(e=>String(e?.id||"")===directId);
    if(direct){
      const competitors=direct?.competitions?.[0]?.competitors||[];
      const fav=competitors.find(c=>namesOverlap(game.fav,c));
      const dog=competitors.find(c=>namesOverlap(game.dog,c));
      if(fav&&dog&&fav!==dog) return {event:direct,fav,dog};
    }
  }
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
    const next={...game,feedMatched:true,feedSource:"ESPN",feedEventId:event.id,feedStatus:detail,feedCompleted:completed,feedState:status.state||null,feedPeriod:event?.status?.period??null,feedClock:event?.status?.displayClock||null};
    if(!next.date && event.date) next.date=event.date;
    if(!next.network){
      const broadcastName=(event?.competitions?.[0]?.broadcasts?.[0]?.names||[])[0];
      if(broadcastName) next.network=broadcastName;
    }
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
  if(Array.isArray(w.games)&&w.games.length===0) return w;
  try{
    const events=await fetchEspnEventsForWeek(w,{force});
    const base=Array.isArray(w.games)?w.games:(w.id==="week-1"?baseGames:[]);
    if(!base.length) return w;
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
  if(!pick) return "no-pick";
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
    else if(status==="pending") possible+=Number(g.points)||1;
    else if(status==="no-pick"){
      // A game the player never picked (e.g. a late submission that came in
      // after kickoff). Once the game is decided, an unpicked game is a loss
      // — it must not just silently disappear from the record. If the game
      // hasn't been decided yet, still count it toward "max possible" since
      // the outcome (and whether they'll ever submit a pick) isn't settled.
      if(isGameComplete(g)) losses++;
      else possible+=Number(g.points)||1;
    }
  }
  return {score,max:score+possible,wins,losses,pushes};
}

function shortTeam(name){
  return String(name||"").replace(/^#\d+\s+/,"");
}

function gameFeedState(g){
  if(g.feedCompleted) return "final";
  if(g.feedState==="in") return "live";
  return "scheduled";
}

function gameFeedLabel(g){
  if(g.feedCompleted) return "FINAL";
  if(g.feedState==="in"){
    const detail=String(g.feedStatus||"").trim();
    return detail?`LIVE · ${detail}`:"LIVE";
  }
  return g.feedStatus||"Scheduled";
}

function gameScoreLabel(g){
  if(g.liveFavScore===undefined||g.liveDogScore===undefined) return "";
  return `${shortTeam(g.dog)} ${g.liveDogScore} – ${shortTeam(g.fav)} ${g.liveFavScore}`;
}

function pickPopularityForGame(g,entries){
  const valid=(entries||[]).filter(e=>e.picks?.[g.id]===g.fav||e.picks?.[g.id]===g.dog);
  if(!valid.length) return {favPct:0,dogPct:0,total:0};
  const favCount=valid.filter(e=>e.picks?.[g.id]===g.fav).length;
  const favPct=Math.round((favCount/valid.length)*100);
  return {favPct,dogPct:100-favPct,total:valid.length};
}


function weekIsFinal(gs){
  return Array.isArray(gs) && gs.length>0 && gs.every(isGameComplete);
}

function finalScoresForGame(g){
  if(!g) return null;
  const dog=Number(g.liveDogScore), fav=Number(g.liveFavScore);
  if(Number.isFinite(dog)&&Number.isFinite(fav)) return {teamA:dog,teamB:fav};
  const text=String(g.final||g.finalScore||"").trim();
  const nums=text.match(/\d+/g)?.map(Number)||[];
  if(nums.length>=2) return {teamA:nums[0],teamB:nums[1]};
  return null;
}

function entryTiebreakMetrics(entry,w){
  const gs=Array.isArray(w?.games)?w.games:[];
  const tb=gs.find(g=>g.id===w?.tiebreakerGameId)||gs[0];
  const actual=finalScoresForGame(tb);
  if(!tb||!actual) return {available:false,error:null,totalError:null,predicted:null,actual:null};
  const a=Number(entry?.tiebreak?.teamA??entry?.tiebreak?.clemson);
  const b=Number(entry?.tiebreak?.teamB??entry?.tiebreak?.lsu);
  if(!Number.isFinite(a)||!Number.isFinite(b)) return {available:false,error:null,totalError:null,predicted:null,actual};
  // Tiebreak is decided by margin of victory, not by how close each individual
  // team's score was. "Margin" is teamB's score minus teamA's score, applied
  // consistently to both the prediction and the actual result, so a guess
  // that nails the point spread wins even if both raw scores end up higher
  // or lower than predicted (e.g. predicting 30-37 for an actual 20-27 is a
  // perfect margin call despite missing both scores by 10).
  const predictedMargin=b-a;
  const actualMargin=actual.teamB-actual.teamA;
  return {
    available:true,
    error:Math.abs(predictedMargin-actualMargin),
    totalError:Math.abs((a+b)-(actual.teamA+actual.teamB)),
    predicted:{teamA:a,teamB:b},
    actual
  };
}

function rankWeeklyEntries(entries,w){
  const gs=Array.isArray(w?.games)?w.games:[];
  const final=weekIsFinal(gs);
  const ranked=(entries||[]).map(e=>({...e,_grade:entryScore(e,gs),_tb:entryTiebreakMetrics(e,w)}));
  ranked.sort((a,b)=>{
    if(b._grade.score!==a._grade.score) return b._grade.score-a._grade.score;
    if(!final) return b._grade.max-a._grade.max || String(a.name||"").localeCompare(String(b.name||""));
    if(a._tb.available&&b._tb.available){
      if(a._tb.error!==b._tb.error) return a._tb.error-b._tb.error;
      if(a._tb.totalError!==b._tb.totalError) return a._tb.totalError-b._tb.totalError;
    }else if(a._tb.available!==b._tb.available){
      return a._tb.available?-1:1;
    }
    return String(a.name||"").localeCompare(String(b.name||""));
  });

  let previousKey=null,previousRank=0;
  ranked.forEach((e,i)=>{
    const tieKey=final
      ? `${e._grade.score}|${e._tb.available?e._tb.error:"na"}|${e._tb.available?e._tb.totalError:"na"}`
      : `${e._grade.score}|${e._grade.max}`;
    e._rank=tieKey===previousKey?previousRank:i+1;
    previousKey=tieKey; previousRank=e._rank;
  });
  return ranked;
}

function weeklyChampionInfo(entries,w){
  const gs=Array.isArray(w?.games)?w.games:[];
  if(!weekIsFinal(gs)) return null;
  const ranked=rankWeeklyEntries(entries,w);
  if(!ranked.length) return null;
  const winners=ranked.filter(e=>e._rank===1);
  const tb=gs.find(g=>g.id===w?.tiebreakerGameId)||gs[0];
  const actual=finalScoresForGame(tb);
  return {
    winners,
    score:ranked[0]._grade.score,
    tiebreakGame:tb,
    actual,
    ranked
  };
}

function formatPct(wins,losses){
  const decisions=Number(wins||0)+Number(losses||0);
  return decisions?`${((Number(wins||0)/decisions)*100).toFixed(1)}%`:"—";
}

async function loadTracking({skipScoreRefresh=false}={}){
  if(!skipScoreRefresh && weekData && !weekData.isTest) weekData=await hydrateWeekFromScoreFeed(weekData);
  const gs=gamesForWeek();
  const tbGame=tiebreakerGame();
  $("trackingTitle").textContent=`${weekData?.label||currentWeekId} Weekly Tracking`;
  $("trackingComplete").textContent=`${gs.filter(isGameComplete).length} / ${gs.length}`;
  $("trackingRemaining").textContent=String(gs.filter(g=>!isGameComplete(g)).length);
  const championHost=$("weeklyChampionBanner");
  if(championHost){championHost.hidden=true;championHost.innerHTML="";}

  if(!isLocked() && profile?.role!=="admin"){
    trackingEntries=[];
    $("trackingEntries").textContent="0";
    $("trackingLeader").textContent="Hidden until lock";
    $("trackingStatus").textContent=weekData?.lockAt?`League picks unlock after ${formatCentral(weekData.lockAt)}.`:"League picks unlock after the weekly deadline.";
    $("trackingView").innerHTML='<div class="tracking-empty"><p class="helper">Tracking is hidden until picks lock so nobody can see another player\'s selections early.</p></div>';
    return;
  }

  try{
    const [snap,directory]=await Promise.all([
      getDocs(collection(db,"weeks",currentWeekId,"entries")),
      getPlayerDirectoryMap()
    ]);
    trackingEntries=snap.docs.map(d=>{
      const entry={id:d.id,...d.data()};
      const identity=resolveEntryIdentity(entry,directory);
      return {...entry,_canonicalUid:identity.canonicalUid,name:identity.name,email:identity.email};
    }).filter(e=>e.submitted!==false);
  }catch(e){
    trackingEntries=[];
    $("trackingView").innerHTML=`<p class="helper">Unable to load tracking: ${e.message}</p>`;
    return;
  }

  const ranked=rankWeeklyEntries(trackingEntries,{...weekData,games:gs});
  $("trackingEntries").textContent=String(ranked.length);
  const topScore=ranked[0]?._grade.score;
  const leaders=ranked.filter(e=>e._grade.score===topScore).map(e=>e.name||"Player");
  $("trackingLeader").textContent=ranked.length?(leaders.length>2?`${leaders.length}-way tie · ${topScore} pts`:`${leaders.join(" / ")} · ${topScore} pts`):"—";
  $("trackingStatus").textContent=weekData?.isTest?"Test week tracking — does not affect season standings.":scoreFeedStatusText();

  const champion=weeklyChampionInfo(trackingEntries,{...weekData,games:gs});
  if(champion){
    const championNames=champion.winners.map(e=>e.name||"Player");
    $("trackingLeader").textContent=`${championNames.join(" / ")} · ${champion.score} pts`;
  }
  if(champion&&championHost){
    const winnerNames=champion.winners.map(e=>e.name||"Player");
    const topPointTies=ranked.filter(e=>e._grade.score===champion.score);
    let detail=`${champion.score} points`;
    if(topPointTies.length>1){
      const winner=champion.winners[0];
      if(champion.winners.length===1 && winner?._tb?.available){
        detail+=` · margin error ${winner._tb.error}`;
      }else if(champion.winners.length>1){
        detail+=` · exact tiebreak remains tied`;
      }
    }
    if(champion.actual&&champion.tiebreakGame){
      detail+=` · GOTW final ${shortTeam(champion.tiebreakGame.dog)} ${champion.actual.teamA} – ${shortTeam(champion.tiebreakGame.fav)} ${champion.actual.teamB}`;
    }
    championHost.innerHTML=`<div class="weekly-champion-kicker">${champion.winners.length>1?"CO-CHAMPIONS":"WEEKLY CHAMPION"}</div><div class="weekly-champion-name">🏆 ${htmlEscape(winnerNames.join(" & "))}</div><div class="weekly-champion-detail">${htmlEscape(detail)}</div>`;
    championHost.hidden=false;
  }

  if(!ranked.length){
    $("trackingView").innerHTML='<p class="helper" style="padding:16px">No submitted entries yet.</p>';
    return;
  }

  const final=weekIsFinal(gs);
  // Tiebreak only matters when it's actually deciding who lands in 1st/2nd/3rd.
  const rows=ranked.map(e=>{
    const rank=e._rank;
    const cells=gs.map(g=>{
      const pick=e.picks?.[g.id]||"—";
      const state=gradePick(g,pick);
      const icon=state==="correct"?"✓":state==="wrong"?"✕":state==="push"?"—":"•";
      return `<td class="tracking-pick ${state}" title="${g.dog} vs ${g.fav}: ${pick}"><span class="tracking-pick-name">${icon} ${shortTeam(pick)}</span><small>${g.points||1} pt${Number(g.points||1)!==1?"s":""}</small></td>`;
    }).join("");
    const tbNote=final&&e._tb.available?` title="Margin error: ${e._tb.error}"`:"";
    // Show everyone's prediction, not just whoever it decided — the margin
    // error line only appears once the tiebreak game is actually final (can't
    // compute an error against a score that hasn't happened yet).
    const tbCell=`<td class="tracking-tiebreak">${e._tb.predicted?`${htmlEscape(String(e._tb.predicted.teamA))}-${htmlEscape(String(e._tb.predicted.teamB))}${final&&e._tb.available?`<small>${e._tb.error} margin err</small>`:""}`:"—"}</td>`;
    return `<tr class="${rank===1&&final?"tracking-leader-row":""}"><td class="sticky-rank">${rank}</td><td class="sticky-player"${tbNote}>${e.name||"Player"}</td><td class="score-col sticky-score">${e._grade.score}</td><td class="score-col sticky-max">${e._grade.max}</td>${tbCell}${cells}</tr>`;
  }).join("");
  const heads=gs.map(g=>{
    const pop=pickPopularityForGame(g,ranked);
    const feedState=gameFeedState(g);
    const score=gameScoreLabel(g);
    const status=gameFeedLabel(g);
    return `<th class="tracking-matchup-head" title="${g.dog} vs ${g.fav} — ${g.fav} ${g.spread}"><span class="tracking-matchup-name">${g.dog}<span class="tracking-vs">vs</span>${g.fav}</span><span class="tracking-matchup-meta">${g.fav} ${g.spread} · ${g.points||1} pt${Number(g.points||1)!==1?"s":""}</span><span class="tracking-game-status ${feedState}">${status}</span>${score?`<span class="tracking-live-score">${score}</span>`:""}<span class="tracking-popularity"><b>${shortTeam(g.fav)}</b> ${pop.favPct}% · <b>${shortTeam(g.dog)}</b> ${pop.dogPct}%</span></th>`;
  }).join("");
  const tbHeadLabel=tbGame?`${shortTeam(tbGame.dog)}-${shortTeam(tbGame.fav)}`:"";
  $("trackingView").innerHTML=`<table class="tracking-table"><thead><tr><th class="sticky-rank">#</th><th class="sticky-player">Player</th><th class="sticky-score">Score</th><th class="sticky-max">Max</th><th class="tracking-tiebreak-head" title="${tbGame?`Everyone's prediction for ${tbGame.dog} vs ${tbGame.fav}, in that order (${shortTeam(tbGame.dog)} score - ${shortTeam(tbGame.fav)} score). Margin error shows once that game is final.`:"Game of the Week prediction"}">Tiebreak${tbHeadLabel?`<small>${htmlEscape(tbHeadLabel)}</small>`:""}</th>${heads}</tr></thead><tbody>${rows}</tbody></table>`;
}

async function deleteCommissionerEntry(entryId,button){
  if(profile?.role!=="admin"||!entryId) return;
  const ref=doc(db,"weeks",currentWeekId,"entries",entryId);
  const snap=await getDoc(ref);
  if(!snap.exists()){
    if($("adminEntryDeleteMsg")) $("adminEntryDeleteMsg").textContent="That entry no longer exists.";
    await loadCommissionerDashboard();
    return;
  }
  const entry={id:snap.id,...snap.data()};
  const directory=playerDirectoryCache||new Map();
  const identity=resolveEntryIdentity(entry,directory);
  const playerName=identity.name||entry.name||"this player";
  const weekLabel=weekData?.label||currentWeekId;
  const ok=window.confirm(`Delete ${playerName}'s ${weekLabel} submission?\n\nThis permanently removes the picks and tiebreaker for this week. This cannot be undone.`);
  if(!ok) return;
  const original=button?.textContent;
  if(button){button.disabled=true;button.textContent="Deleting…";}
  try{
    await deleteDoc(ref);
    if($("adminEntryDeleteMsg")) $("adminEntryDeleteMsg").textContent=`Deleted ${playerName}'s ${weekLabel} entry.`;
    if(user?.uid===entryId) await loadPicks();
    await loadCommissionerDashboard();
    await loadTracking();
    await renderSeasonLeaderboard();
  }catch(e){
    if($("adminEntryDeleteMsg")) $("adminEntryDeleteMsg").textContent=`Delete failed: ${e.message}`;
    if(button){button.disabled=false;button.textContent=original||"Delete Entry";}
  }
}

async function loadCommissionerDashboard(){
  if(profile?.role!=="admin" || !$('adminMissingList')) return;
  try{
    const [usersSnap,entriesSnap]=await Promise.all([
      getDocs(collection(db,"users")),
      getDocs(collection(db,"weeks",currentWeekId,"entries"))
    ]);
    const allUsers=usersSnap.docs.map(d=>({uid:d.id,...d.data()}));
    playerDirectoryCache=new Map(allUsers.map(p=>[p.uid,p]));
    const players=allUsers.filter(p=>p.role==="player");
    renderAdminPlayerDirectory(players);

    const submittedEntries=entriesSnap.docs
      .filter(d=>d.data().submitted!==false)
      .map(d=>{
        const entry={id:d.id,...d.data()};
        return {...entry,_docId:d.id,_identity:resolveEntryIdentity(entry,playerDirectoryCache)};
      })
      .sort((a,b)=>String(a._identity?.name||a.name||a.email||"").localeCompare(String(b._identity?.name||b.name||b.email||"")));
    const submittedIds=new Set(submittedEntries.map(e=>e._identity?.canonicalUid||e._docId));
    const missing=players.filter(p=>!submittedIds.has(p.uid)).sort((a,b)=>String(a.name||a.email||"").localeCompare(String(b.name||b.email||"")));
    const submitted=players.length-missing.length;
    $('adminRegisteredPlayers').textContent=String(players.length);
    $('adminSubmittedCount').textContent=String(submitted);
    $('adminMissingCount').textContent=String(missing.length);
    const lockText=weekData?.lockAt?formatCentral(weekData.lockAt):"not set";
    $('adminEntryStatus').textContent=isLocked()?`Deadline passed ${lockText}. ${missing.length?`${missing.length} player${missing.length===1?"":"s"} did not submit.`:"Everyone submitted."}`:`Picks lock ${lockText}. ${missing.length} player${missing.length===1?"":"s"} still need to submit.`;
    if(!players.length){
      $('adminMissingList').innerHTML='<p class="helper">No player profiles found yet.</p>';
    }else if(!missing.length){
      $('adminMissingList').innerHTML='<div class="all-picks-in">✓ Everyone is in for this week.</div>';
    }else{
      $('adminMissingList').innerHTML=missing.map(p=>`<div class="missing-player"><div><strong>${htmlEscape(p.name||"Unnamed Player")}</strong><span>${htmlEscape(p.email||"No email saved")}</span></div>${p.seasonPool?'<b class="pool-badge">Season Pool</b>':''}</div>`).join("");
    }

    if($("adminSubmittedEntries")){
      if(!submittedEntries.length){
        $("adminSubmittedEntries").innerHTML='<p class="helper">No submitted entries for this week.</p>';
      }else{
        $("adminSubmittedEntries").innerHTML=submittedEntries.map(e=>{
          const name=e._identity?.name||e.name||"Unnamed Player";
          const email=e._identity?.email||e.email||"No email saved";
          const submittedAt=e.submittedAt||e.updatedAt||null;
          const source=e._docId.startsWith("hist-")?"Historical import":"Account entry";
          const when=submittedAt?formatCentral(submittedAt):"Submission time unavailable";
          return `<div class="submitted-entry-row"><div class="submitted-entry-person"><strong>${htmlEscape(name)}</strong><span>${htmlEscape(email)}</span><small>${htmlEscape(source)} · ${htmlEscape(when)}</small></div><button class="danger-entry-btn" type="button" data-delete-entry="${htmlEscape(e._docId)}">Delete Entry</button></div>`;
        }).join("");
        $("adminSubmittedEntries").querySelectorAll("[data-delete-entry]").forEach(btn=>{
          btn.onclick=()=>deleteCommissionerEntry(btn.dataset.deleteEntry,btn);
        });
      }
    }
  }catch(e){
    $('adminEntryStatus').textContent="Unable to load entry status.";
    $('adminMissingList').innerHTML=`<p class="helper">${htmlEscape(e.message)}</p>`;
    if($("adminSubmittedEntries")) $("adminSubmittedEntries").innerHTML=`<p class="helper">${htmlEscape(e.message)}</p>`;
  }
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
  $("resultsAdminMsg").textContent="Weekly results saved. Weekly Tracking has been recalculated.";
  await loadCurrentWeek();
  renderGames();renderResults();renderAdminResults();await loadTracking();
}


function htmlEscape(value){
  return String(value??"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function normalizedImportText(value){
  return String(value??"")
    .toLowerCase()
    .replace(/#\s*\d+/g," ")
    .replace(/&/g," and ")
    .replace(/\bst\.?\b/g,"state")
    .replace(/[^a-z0-9]+/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function compactImportText(value){ return normalizedImportText(value).replace(/\s+/g,""); }

function parseDelimitedText(text){
  const source=String(text??"").replace(/^\uFEFF/,"");
  if(!source.trim()) return [];
  const firstPhysicalLine=source.split(/\r?\n/,1)[0]||"";
  const delimiter=(firstPhysicalLine.match(/\t/g)||[]).length>(firstPhysicalLine.match(/,/g)||[]).length?"\t":",";
  const rows=[]; let row=[],field="",quoted=false;
  for(let i=0;i<source.length;i++){
    const ch=source[i];
    if(quoted){
      if(ch==='"'&&source[i+1]==='"'){field+='"';i++;continue;}
      if(ch==='"'){quoted=false;continue;}
      field+=ch;continue;
    }
    if(ch==='"'){quoted=true;continue;}
    if(ch===delimiter){row.push(field);field="";continue;}
    if(ch==='\n'){
      row.push(field.replace(/\r$/,""));field="";
      if(row.some(v=>String(v).trim()!=="")) rows.push(row);
      row=[];continue;
    }
    field+=ch;
  }
  row.push(field.replace(/\r$/,""));
  if(row.some(v=>String(v).trim()!=="")) rows.push(row);
  return rows;
}

function findImportColumn(headers,predicate){
  for(let i=0;i<headers.length;i++) if(predicate(normalizedImportText(headers[i]),compactImportText(headers[i]),headers[i],i)) return i;
  return -1;
}

function findGameImportColumn(headers,g,index){
  const fav=normalizedImportText(g.fav),dog=normalizedImportText(g.dog);
  const favCompact=fav.replace(/\s+/g,""),dogCompact=dog.replace(/\s+/g,"");
  const gameNumber=index+1;
  let best=-1;
  for(let i=0;i<headers.length;i++){
    const h=normalizedImportText(headers[i]),hc=h.replace(/\s+/g,"");
    if(new RegExp(`^(g|game)0?${gameNumber}(\\D|$)`).test(hc)) return i;
    if(h.includes("tiebreak")||h.includes("score prediction")||h.includes("gameday score")) continue;
    if(favCompact&&dogCompact&&hc.includes(favCompact)&&hc.includes(dogCompact)&&best<0) best=i;
  }
  return best;
}

const HISTORICAL_IMPORTER_VERSION="7.0.14";

// Exact answer codes used by the original 2026 Week 1 Google Form.
// This intentionally bypasses fuzzy team-name matching for the historical import.
const HISTORICAL_WEEK1_PICK_CODES={
  g1:{ALA:"fav",BAMA:"fav",ECU:"dog"},
  g2:{MIA:"fav",STAN:"dog"},
  g3:{USC:"fav",FRES:"dog"},
  g4:{IU:"fav",INDIANA:"fav",NT:"dog"},
  g5:{HOU:"fav",OSU:"dog"},
  g6:{AUB:"fav",AUBURN:"fav",BARN:"fav",BAY:"dog",BAYLOR:"dog"},
  g7:{ORE:"fav",OREGON:"fav",BOISE:"dog"},
  g8:{PSU:"fav",MAR:"dog"},
  g9:{CIN:"fav",BC:"dog"},
  g10:{ARK:"fav",UNA:"dog"},
  g11:{MSST:"fav",ULM:"dog"},
  g12:{LSU:"fav",CLEM:"dog",CLEMSON:"dog"},
  g13:{UM:"fav",MICH:"fav",MICHIGAN:"fav",WMU:"dog"},
  g14:{UF:"fav",FLORIDA:"fav",FAU:"dog"},
  g15:{UCLA:"fav",CAL:"dog",CALIFORNIA:"dog"},
  g16:{WAS:"fav",UW:"fav",WASHINGTON:"fav",WSU:"dog"},
  g17:{ND:"fav",NOTREDAME:"fav",WIS:"dog"},
  g18:{MISS:"fav",OM:"fav",OLEMISS:"fav",LOU:"dog"},
  g19:{SMU:"fav",FSU:"dog"},
  g20:{GT:"fav",GEORGIATECH:"fav",COL:"dog",COLORADO:"dog"}
};

function historicalWeekOneCodePick(value,g){
  const code=String(value??"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(!code) return null;
  const side=HISTORICAL_WEEK1_PICK_CODES[g?.id]?.[code];
  return side==="fav"?g.fav:side==="dog"?g.dog:null;
}

const IMPORT_TEAM_ALIASES={
  "alabama":["ALA","BAMA"],"east carolina":["ECU"],"miami":["MIA"],"stanford":["STAN"],
  "usc":["USC"],"fresno state":["FRES"],"indiana":["IU"],"north texas":["NT"],
  "houston":["HOU"],"oregon state":["OSU"],"auburn":["AUB","BARN"],"baylor":["BAY"],
  "oregon":["ORE"],"boise state":["BOISE"],"penn state":["PSU"],"marshall":["MAR"],
  "cincinnati":["CIN"],"boston college":["BC"],"arkansas":["ARK"],"north alabama":["UNA"],
  "mississippi state":["MSST"],"ul monroe":["ULM"],"lsu":["LSU"],"clemson":["CLEM"],
  "michigan":["UM","MICH"],"western michigan":["WMU"],"florida":["UF"],"florida atlantic":["FAU"],
  "ucla":["UCLA"],"california":["CAL"],"washington":["WAS","UW"],"washington state":["WSU"],
  "notre dame":["ND"],"wisconsin":["WIS"],"ole miss":["MISS","OM"],"louisville":["LOU"],
  "smu":["SMU"],"florida state":["FSU"],"georgia tech":["GT"],"colorado":["COL"]
};

function importAliasesForTeam(team){
  const normalized=normalizedImportText(team),aliases=IMPORT_TEAM_ALIASES[normalized]||[];
  return new Set([compactImportText(team),...aliases.map(compactImportText)]);
}

function importedTeamEquivalent(a,b){
  const na=normalizedImportText(a),nb=normalizedImportText(b);
  if(!na||!nb) return false;
  if(na===nb||na.includes(nb)||nb.includes(na)) return true;
  const aa=importAliasesForTeam(a),bb=importAliasesForTeam(b);
  for(const key of aa) if(bb.has(key)) return true;
  return false;
}

function historicalTargetGame(canonical,weekGames){
  const sameId=weekGames.find(g=>g.id===canonical.id);
  if(sameId) return sameId;
  return weekGames.find(g=>{
    const direct=importedTeamEquivalent(canonical.fav,g.fav)&&importedTeamEquivalent(canonical.dog,g.dog);
    const swapped=importedTeamEquivalent(canonical.fav,g.dog)&&importedTeamEquivalent(canonical.dog,g.fav);
    return direct||swapped;
  })||null;
}

function historicalPickForTarget(canonicalPick,canonicalGame,targetGame){
  const selected=canonicalPick===canonicalGame.fav?canonicalGame.fav:canonicalGame.dog;
  if(importedTeamEquivalent(selected,targetGame.fav)) return targetGame.fav;
  if(importedTeamEquivalent(selected,targetGame.dog)) return targetGame.dog;
  return null;
}

function matchImportedPick(value,g){
  const raw=normalizedImportText(value),compact=raw.replace(/\s+/g,"");
  if(!compact) return null;
  if(["fav","favorite","favourite"].includes(compact)) return g.fav;
  if(["dog","underdog"].includes(compact)) return g.dog;
  const favAliases=importAliasesForTeam(g.fav),dogAliases=importAliasesForTeam(g.dog);
  if(favAliases.has(compact)&&!dogAliases.has(compact)) return g.fav;
  if(dogAliases.has(compact)&&!favAliases.has(compact)) return g.dog;
  const fav=compactImportText(g.fav),dog=compactImportText(g.dog);
  const favHit=fav&&compact.includes(fav),dogHit=dog&&compact.includes(dog);
  if(favHit&&!dogHit) return g.fav;
  if(dogHit&&!favHit) return g.dog;
  return null;
}

function importEmailLooksValid(value){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||"").trim());
}

function parseCombinedTiebreak(value,tb){
  const raw=String(value??"").trim();
  const numbers=(raw.match(/\d+/g)||[]).map(Number).filter(Number.isFinite);
  if(numbers.length<2) return null;
  const dogName=normalizedImportText(tb?.dog||"Team A"),favName=normalizedImportText(tb?.fav||"Team B");
  const escaped=name=>name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/\s+/g,"\\s+");
  const dogRe=escaped(dogName),favRe=escaped(favName);
  const findNamedScore=re=>{
    let m=raw.match(new RegExp(`${re}[^0-9]{0,10}(\\d+)`,"i"));
    if(m) return Number(m[1]);
    m=raw.match(new RegExp(`(\\d+)[^0-9A-Za-z]{0,10}${re}`,"i"));
    return m?Number(m[1]):null;
  };
  const dogScore=findNamedScore(dogRe),favScore=findNamedScore(favRe);
  if(Number.isFinite(dogScore)&&Number.isFinite(favScore)) return {teamA:dogScore,teamB:favScore};
  const normalized=normalizedImportText(raw),dogMention=dogName&&normalized.includes(dogName),favMention=favName&&normalized.includes(favName);
  if(dogMention&&!favMention) return {teamA:numbers[0],teamB:numbers[1]};
  if(favMention&&!dogMention) return {teamA:numbers[1],teamB:numbers[0]};
  // Some Google Form responses use an informal winner label after the score instead of a school name.
  // For this historical form, the listed favorite is treated as that named winner; otherwise preserve question order.
  if(!dogMention&&!favMention&&/\d+\s*[-–]\s*\d+\s+[A-Za-z]/.test(raw)) return {teamA:numbers[1],teamB:numbers[0]};
  return {teamA:numbers[0],teamB:numbers[1]};
}

function historicalIdHash(value){
  let h=2166136261;
  const str=String(value||"").toLowerCase();
  for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(36);
}

function parseImportDate(value){
  const raw=String(value??"").trim();
  if(!raw) return null;
  const date=new Date(raw);
  return Number.isNaN(date.getTime())?null:date;
}

function directoryProfileByEmail(directory,email){
  const key=String(email||"").trim().toLowerCase();
  if(!key) return null;
  for(const p of directory.values()) if(String(p.email||"").trim().toLowerCase()===key) return p;
  return null;
}

function resolveEntryIdentity(entry,directory){
  const direct=directory.get(entry.uid||entry.id);
  const byEmail=direct||directoryProfileByEmail(directory,entry.email);
  return {
    profile:byEmail||null,
    canonicalUid:byEmail?.uid||entry.uid||entry.id,
    name:byEmail?.name||entry.name||"Player",
    email:byEmail?.email||entry.email||""
  };
}

async function weekOneForHistoricalImport(){
  const snap=await getDoc(doc(db,"weeks","week-1"));
  const data=snap.exists()?{id:snap.id,...snap.data()}:{id:"week-1",label:"Week 1",weekNumber:1,seasonYear:2026,isTest:false,games:baseGames,tiebreakerGameId:"g12"};
  if(!Array.isArray(data.games)||!data.games.length) data.games=baseGames;
  if(!data.tiebreakerGameId) data.tiebreakerGameId="g12";
  return data;
}

async function prepareHistoricalImport(text){
  if(profile?.role!=="admin") throw new Error("Commissioner access is required.");
  const matrix=parseDelimitedText(text);
  if(matrix.length<2) throw new Error("The file needs a header row and at least one submission.");
  const headers=matrix[0].map(v=>String(v||"").trim());
  const week=await weekOneForHistoricalImport();

  // Historical Week 1 always uses the original 20-game card. Parse the Google Form
  // against that canonical slate first, then map each school to whatever Week 1
  // game objects are currently stored in Firestore. This prevents ESPN/full-name
  // labels or a different stored game order from making every pick look invalid.
  const canonicalGames=baseGames;
  const weekGames=Array.isArray(week.games)&&week.games.length?week.games:baseGames;
  const targetGames=canonicalGames.map(g=>historicalTargetGame(g,weekGames));
  const directory=await getPlayerDirectoryMap(true);
  const existingSnap=await getDocs(collection(db,"weeks","week-1","entries"));
  const existingIds=new Set(existingSnap.docs.map(d=>d.id));

  const nameCol=findImportColumn(headers,(h)=>/\b(name|player|participant|entrant)\b/.test(h)&&!h.includes("team"));
  const emailCol=findImportColumn(headers,(h)=>h.includes("email")||h.includes("e mail"));
  const submittedCol=findImportColumn(headers,(h)=>h.includes("timestamp")||h.includes("submitted")||h.includes("submission time")||h.includes("date submitted"));
  const seasonPoolCol=findImportColumn(headers,(h)=>h.includes("overall against the spread")||h.includes("season ats")||h.includes("season pool"));
  if(nameCol<0) throw new Error('Could not find a player name column. Name it "Name" or "Player".');

  // Match each original form question by the two schools, not by the current Week 1 order.
  const gameCols=canonicalGames.map((g,i)=>findGameImportColumn(headers,g,i));
  const missingGameHeaders=gameCols.map((c,i)=>c<0?i:-1).filter(i=>i>=0);
  const missingTargetGames=targetGames.map((g,i)=>!g?i:-1).filter(i=>i>=0);

  // The original Week 1 Game of the Week was Clemson at LSU (canonical g12).
  const canonicalTb=canonicalGames.find(g=>g.id==="g12")||canonicalGames[11];
  const targetTb=targetGames[canonicalGames.indexOf(canonicalTb)]||historicalTargetGame(canonicalTb,weekGames)||weekGames.find(g=>g.id===week.tiebreakerGameId)||weekGames[0];
  const teamAKey=compactImportText(canonicalTb?.dog),teamBKey=compactImportText(canonicalTb?.fav);
  let tbACol=findImportColumn(headers,(h,hc)=>hc==="tiebreakteama"||hc==="teamascore"||((hc.includes(teamAKey)&&!hc.includes(teamBKey))&&(h.includes("score")||h.includes("tiebreak")||h.includes("prediction"))));
  let tbBCol=findImportColumn(headers,(h,hc)=>hc==="tiebreakteamb"||hc==="teambscore"||((hc.includes(teamBKey)&&!hc.includes(teamAKey))&&(h.includes("score")||h.includes("tiebreak")||h.includes("prediction"))));
  let tbCombinedCol=findImportColumn(headers,(h,hc)=>
    (h.includes("tiebreak")||h.includes("score prediction")||h.includes("gameday score"))&&
    (hc.includes(teamAKey)||hc.includes(teamBKey)||h.includes("tiebreak"))
  );
  if(tbCombinedCol<0){
    const combinedCandidates=headers.map((value,i)=>({i,h:normalizedImportText(value)}))
      .filter(x=>x.h.includes("tiebreak")||x.h.includes("score prediction")||x.h.includes("gameday score"));
    if(combinedCandidates.length===1) tbCombinedCol=combinedCandidates[0].i;
  }

  // Google Forms exports can contain appended summary rows beneath the real responses.
  const sourceRows=matrix.slice(1).map((cells,i)=>({cells,sourceRow:i+2}));
  const formRows=(emailCol>=0&&submittedCol>=0)
    ?sourceRows.filter(({cells})=>importEmailLooksValid(cells[emailCol])&&!!parseImportDate(cells[submittedCol]))
    :[];
  const rowsToParse=formRows.length>=2?formRows:sourceRows;

  const parsed=[];
  for(const source of rowsToParse){
    const cells=source.cells,r=source.sourceRow;
    const name=String(cells[nameCol]??"").trim().replace(/\s+/g," ");
    if(!name&&cells.every(v=>String(v||"").trim()==="")) continue;
    const email=emailCol>=0?String(cells[emailCol]??"").trim().toLowerCase():"";
    const submittedRaw=submittedCol>=0?String(cells[submittedCol]??"").trim():"";
    const submittedDate=parseImportDate(submittedRaw);
    const seasonPoolRaw=seasonPoolCol>=0?normalizedImportText(cells[seasonPoolCol]):"";
    const seasonPool=["yes","y","true","1","joined","participating"].includes(seasonPoolRaw);
    const existingProfile=directoryProfileByEmail(directory,email);
    const seed=existingProfile?.uid||email||`${name}|${submittedRaw}|${r}`;
    const entryId=existingProfile?.uid||`hist-${historicalIdHash(seed)}`;
    const rowErrors=[];
    if(!name) rowErrors.push("Missing player name");

    const rowPicks={};
    const noPickGameIds=[];
    canonicalGames.forEach((canonicalGame,i)=>{
      const col=gameCols[i],targetGame=targetGames[i];
      if(col<0){rowErrors.push(`Game ${i+1} header not mapped`);return;}
      if(!targetGame){rowErrors.push(`Game ${i+1} not found on stored Week 1 card`);return;}
      const rawPick=cells[col];
      if(!String(rawPick??"").trim()){ noPickGameIds.push(targetGame.id); return; }
      const canonicalPick=matchImportedPick(rawPick,canonicalGame)||historicalWeekOneCodePick(rawPick,canonicalGame);
      if(!canonicalPick){rowErrors.push(`Game ${i+1} pick not recognized (${String(rawPick??"").trim()||"blank"})`);return;}
      const targetPick=historicalPickForTarget(canonicalPick,canonicalGame,targetGame);
      if(!targetPick){rowErrors.push(`Game ${i+1} could not match selected team to Week 1`);return;}
      rowPicks[targetGame.id]=targetPick;
    });

    let tbA=tbACol>=0?Number(String(cells[tbACol]??"").trim()):NaN;
    let tbB=tbBCol>=0?Number(String(cells[tbBCol]??"").trim()):NaN;
    if((!Number.isFinite(tbA)||!Number.isFinite(tbB))&&tbCombinedCol>=0){
      const combined=parseCombinedTiebreak(cells[tbCombinedCol],canonicalTb);
      if(combined){tbA=combined.teamA;tbB=combined.teamB;}
    }
    if(!Number.isFinite(tbA)||tbA<0) rowErrors.push(`${canonicalTb?.dog||"Clemson"} tiebreak score missing`);
    if(!Number.isFinite(tbB)||tbB<0) rowErrors.push(`${canonicalTb?.fav||"LSU"} tiebreak score missing`);

    parsed.push({sourceRow:r,entryId,name,email,submittedRaw,submittedDate,seasonPool,picks:rowPicks,noPickGameIds,tbA,tbB,existingProfile,willOverwrite:existingIds.has(entryId),errors:rowErrors});
  }

  const idCounts=new Map();
  parsed.forEach(row=>idCounts.set(row.entryId,(idCounts.get(row.entryId)||0)+1));
  parsed.forEach(row=>{if(idCounts.get(row.entryId)>1) row.errors.push("Duplicate player identity in import");});

  const globalErrors=[];
  if(missingGameHeaders.length) globalErrors.push(`Could not map ${missingGameHeaders.length} original Week 1 form question${missingGameHeaders.length===1?"":"s"}: ${missingGameHeaders.map(i=>`G${i+1}`).join(", ")}.`);
  if(missingTargetGames.length) globalErrors.push(`The stored Week 1 card is missing ${missingTargetGames.length} historical matchup${missingTargetGames.length===1?"":"s"}. Use Admin → Load Week 1 Games once, then preview again.`);
  if((tbACol<0||tbBCol<0)&&tbCombinedCol<0) globalErrors.push(`Could not map the Game of the Week score prediction (Clemson / LSU).`);

  const valid=parsed.filter(row=>!row.errors.length);
  return {
    week,headers,rows:parsed,valid,globalErrors,nameCol,emailCol,submittedCol,seasonPoolCol,
    gameCols,tbACol,tbBCol,tbCombinedCol,ignoredRowCount:sourceRows.length-rowsToParse.length,
    historicalTiebreakerGame:targetTb
  };
}

function renderHistoricalImportPreview(state){
  const host=$("historicalImportPreview"),status=$("historicalImportStatus"),button=$("runHistoricalImport");
  if(!host||!status||!button) return;
  const invalid=state.rows.length-state.valid.length;
  const linked=state.rows.filter(r=>r.existingProfile).length;
  const overwrite=state.rows.filter(r=>r.willOverwrite).length;
  const ready=state.rows.length>0&&!invalid&&!state.globalErrors.length;
  const ignoredNote=state.ignoredRowCount?` Ignored ${state.ignoredRowCount} non-submission row${state.ignoredRowCount===1?"":"s"} from the source file.`:"";
  status.textContent=`Importer v${HISTORICAL_IMPORTER_VERSION} · `+(ready?`${state.rows.length} Week 1 submissions are ready to import.`:`Preview found ${invalid+state.globalErrors.length} issue${invalid+state.globalErrors.length===1?"":"s"}. Fix the source data before importing.`)+ignoredNote;
  button.disabled=!ready;
  button.textContent=ready?`Import ${state.rows.length} Week 1 Entries`:`Import Week 1 Entries`;
  const errors=state.globalErrors.length?`<div class="history-import-errors"><strong>Column mapping needs attention:</strong><br>${state.globalErrors.map(htmlEscape).join("<br>")}</div>`:"";
  host.innerHTML=`${errors}<div class="history-import-summary">
      <div><span>Submissions</span><strong>${state.rows.length}</strong></div>
      <div><span>Ready</span><strong>${state.valid.length}</strong></div>
      <div><span>Linked Accounts</span><strong>${linked}</strong></div>
      <div><span>Existing Entries</span><strong>${overwrite}</strong></div>
    </div>
    <table class="history-import-table"><thead><tr><th>Row</th><th>Player</th><th>Email / Link</th><th>Picks</th><th>Tiebreak</th><th>Status</th></tr></thead><tbody>${state.rows.map(row=>{
      const noPickCount=row.noPickGameIds?.length||0;
      const baseReady=row.willOverwrite?"Ready · replaces existing Week 1 entry":"Ready";
      const statusText=row.errors.length?row.errors.join("; "):(noPickCount?`${baseReady} · ${noPickCount} no-pick game${noPickCount===1?"":"s"} excluded`:baseReady);
      const linkText=row.existingProfile?`Linked to ${row.existingProfile.email||"account"}`:(row.email?"Historical · will link by email later":"Historical participant");
      const pickClass=row.errors.length?"bad":noPickCount?"warn":"ok";
      const pickText=noPickCount?`${Object.keys(row.picks).length}/${state.week.games.length} · ${noPickCount} no pick${noPickCount===1?"":"s"}`:`${Object.keys(row.picks).length}/${state.week.games.length}`;
      return `<tr class="${row.errors.length?"invalid-row":""}"><td>${row.sourceRow}</td><td><strong>${htmlEscape(row.name||"—")}</strong></td><td>${htmlEscape(row.email||"No email")}<br><small>${htmlEscape(linkText)}</small></td><td><span class="${pickClass}">${pickText}</span></td><td>${Number.isFinite(row.tbA)&&Number.isFinite(row.tbB)?`<span class="ok">${row.tbA}-${row.tbB}</span>`:'<span class="bad">Missing</span>'}</td><td class="${row.errors.length?"bad":(row.willOverwrite||noPickCount)?"warn":"ok"}">${htmlEscape(statusText)}</td></tr>`;
    }).join("")}</tbody></table>`;
}

async function previewHistoricalImport(){
  const text=$("historicalImportPaste")?.value||"";
  if(!text.trim()){if($("historicalImportStatus")) $("historicalImportStatus").textContent="Choose a CSV/TSV file or paste the Week 1 table first.";return;}
  if($("historicalImportStatus")) $("historicalImportStatus").textContent="Checking Week 1 submissions…";
  if($("runHistoricalImport")) $("runHistoricalImport").disabled=true;
  try{
    historicalImportState=await prepareHistoricalImport(text);
    renderHistoricalImportPreview(historicalImportState);
  }catch(e){
    historicalImportState=null;
    if($("historicalImportStatus")) $("historicalImportStatus").textContent=e.message;
    if($("historicalImportPreview")) $("historicalImportPreview").innerHTML=`<p class="helper">${htmlEscape(e.message)}</p>`;
  }
}

async function importHistoricalWeekOne(){
  if(profile?.role!=="admin"||!historicalImportState) return;
  const state=historicalImportState;
  if(state.globalErrors.length||state.rows.some(r=>r.errors.length)){
    $("historicalImportStatus").textContent="Resolve the preview errors before importing.";return;
  }
  const button=$("runHistoricalImport");
  button.disabled=true;button.textContent="Importing…";
  try{
    const tb=state.historicalTiebreakerGame||state.week.games.find(g=>g.id===state.week.tiebreakerGameId)||state.week.games[0];
    await Promise.all(state.rows.map(row=>setDoc(doc(db,"weeks","week-1","entries",row.entryId),{
      uid:row.entryId,
      name:row.name,
      email:row.email||null,
      picks:row.picks,
      tiebreak:{teamA:row.tbA,teamB:row.tbB,teamAName:tb?.dog||"Team A",teamBName:tb?.fav||"Team B",gameId:tb?.id||null},
      submitted:true,
      submittedAt:row.submittedDate?Timestamp.fromDate(row.submittedDate):serverTimestamp(),
      updatedAt:serverTimestamp(),
      isTest:false,
      seasonPool:!!row.seasonPool,
      historical:true,
      historicalSource:"Week 1 bulk import",
      noPickGameIds:row.noPickGameIds||[],
      historicalNote:(row.noPickGameIds?.length?`${row.noPickGameIds.length} historical no-pick game(s) excluded from scoring`:null),
      importedAt:serverTimestamp()
    })));
    await setDoc(doc(db,"weeks","week-1"),{historicalImportCount:state.rows.length,historicalImportedAt:serverTimestamp(),tiebreakerGameId:tb?.id||state.week.tiebreakerGameId||"g12"},{merge:true});
    playerDirectoryCache=null;seasonDataCache=null;
    $("historicalImportStatus").textContent=`Imported ${state.rows.length} Week 1 submissions successfully.`;
    button.textContent=`Imported ${state.rows.length} Entries`;
    if(currentWeekId==="week-1"){
      await loadCurrentWeek();
      await loadTracking({skipScoreRefresh:true});
    }
    await renderSeasonLeaderboard();
    await loadCommissionerDashboard();
  }catch(e){
    $("historicalImportStatus").textContent=`Import failed: ${e.message}`;
    button.disabled=false;button.textContent=`Import ${state.rows.length} Week 1 Entries`;
  }
}

async function downloadHistoricalTemplate(){
  const week=await weekOneForHistoricalImport();
  const gs=week.games;
  const tb=gs.find(g=>g.id===week.tiebreakerGameId)||gs[0];
  const headers=["Name","Email","Submitted At",...gs.map((g,i)=>`G${i+1}: ${g.dog} vs ${g.fav}`),`Tiebreak ${tb?.dog||"Team A"} Score`,`Tiebreak ${tb?.fav||"Team B"} Score`];
  const csv=headers.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")+"\n";
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="week-1-historical-import-template.csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}

async function getPlayerDirectoryMap(force=false){
  if(playerDirectoryCache&&!force) return playerDirectoryCache;
  try{
    const snap=await getDocs(collection(db,"users"));
    playerDirectoryCache=new Map(snap.docs.map(d=>[d.id,{uid:d.id,...d.data()}]));
  }catch{
    playerDirectoryCache=new Map();
  }
  return playerDirectoryCache;
}

async function findUnlinkedHistoricalEntries(){
  // A historical-import row only gets keyed by a real account's uid if that
  // account already existed at import time (see prepareHistoricalImport).
  // Anyone who signed up afterward has their picks sitting under a synthetic
  // "hist-xxxx" doc id instead. Season Leaderboard/Weekly Tracking already
  // work around this by matching email at display time (resolveEntryIdentity),
  // but that's read-only — it never fixes the player's OWN lookups (My Picks,
  // Week Record/Rank), which query their entry by their real uid directly and
  // find nothing. This scans every week for exactly that mismatch.
  const directory=await getPlayerDirectoryMap(true);
  const weeksSnap=await getDocs(collection(db,"weeks"));
  const found=[];
  for(const weekDoc of weeksSnap.docs){
    const weekId=weekDoc.id;
    let entriesSnap;
    try{ entriesSnap=await getDocs(collection(db,"weeks",weekId,"entries")); }
    catch{ continue; }
    for(const d of entriesSnap.docs){
      if(!d.id.startsWith("hist-")) continue;
      const entry={id:d.id,...d.data()};
      const match=directoryProfileByEmail(directory,entry.email);
      if(match && match.uid && match.uid!==d.id){
        found.push({weekId,weekLabel:weekDoc.data()?.label||weekId,entryId:d.id,entry,matchedUid:match.uid,matchedName:match.name||match.email});
      }
    }
  }
  return found;
}

async function relinkHistoricalEntry(weekId,entryId,realUid,button){
  if(profile?.role!=="admin") return;
  if(button){button.disabled=true;button.textContent="Relinking…";}
  try{
    const ref=doc(db,"weeks",weekId,"entries",entryId);
    const snap=await getDoc(ref);
    if(!snap.exists()) return;
    const {uid,...rest}=snap.data();
    await setDoc(doc(db,"weeks",weekId,"entries",realUid),{...rest,uid:realUid,relinkedFromEntryId:entryId,relinkedAt:serverTimestamp()},{merge:true});
    await deleteDoc(ref);
    // Carry the season-pool opt-in forward if it was set on the historical
    // row — but only ever move it toward true, matching the one-way lock.
    if(rest.seasonPool){
      await setDoc(doc(db,"users",realUid),{seasonPool:true},{merge:true}).catch(()=>{});
    }
    playerDirectoryCache=null; seasonDataCache=null;
    if($("unlinkedEntriesStatus")) $("unlinkedEntriesStatus").textContent=`Relinked ${weekId}. Refreshing…`;
    await renderUnlinkedHistoricalEntries();
    if(currentWeekId===weekId){ await loadPicks(); await updateWeeklyPersonalSummary(); }
  }catch(e){
    if($("unlinkedEntriesStatus")) $("unlinkedEntriesStatus").textContent=`Could not relink: ${e.message}`;
    if(button){button.disabled=false;button.textContent="Relink";}
  }
}

async function renderUnlinkedHistoricalEntries(){
  const host=$("unlinkedEntriesList"), status=$("unlinkedEntriesStatus");
  if(!host) return;
  host.innerHTML='<p class="helper">Scanning every week for unlinked historical entries…</p>';
  let found;
  try{
    found=await findUnlinkedHistoricalEntries();
  }catch(e){
    host.innerHTML=`<p class="helper">Could not scan: ${htmlEscape(e.message)}</p>`;
    return;
  }
  if(!found.length){
    host.innerHTML='<p class="helper">No unlinked historical entries found — everyone with a real account is properly linked.</p>';
    if(status) status.textContent="A historical import entry stays unlinked from a real account until that email signs up. Relink it here once they have.";
    return;
  }
  if(status) status.textContent=`${found.length} historical entr${found.length===1?"y":"ies"} can be relinked to a real account now.`;
  host.innerHTML=found.map(f=>`<div class="unlinked-entry-row">
    <div><strong>${htmlEscape(f.entry.name||"Unnamed")}</strong><span>${htmlEscape(f.entry.email||"No email")} · ${htmlEscape(f.weekLabel)}</span></div>
    <button type="button" data-relink-week="${htmlEscape(f.weekId)}" data-relink-entry="${htmlEscape(f.entryId)}" data-relink-uid="${htmlEscape(f.matchedUid)}">Relink to ${htmlEscape(f.matchedName)}</button>
  </div>`).join("");
  host.querySelectorAll("[data-relink-entry]").forEach(btn=>{
    btn.onclick=()=>relinkHistoricalEntry(btn.dataset.relinkWeek,btn.dataset.relinkEntry,btn.dataset.relinkUid,btn);
  });
}
if($("refreshUnlinkedEntries")) $("refreshUnlinkedEntries").onclick=()=>renderUnlinkedHistoricalEntries();

function updatePersonalSeasonSummary(data){
  const row=data?.rows?.find(r=>r.uid===user?.uid);
  if($("personalRank")) $("personalRank").textContent=row?`#${row.rank}`:"—";
  if($("personalAts")) $("personalAts").textContent=row?`${row.wins}-${row.losses}-${row.pushes} (${formatPct(row.wins,row.losses)})`:"0-0-0 (—)";
}

function renderAdminPlayerDirectory(players){
  const host=$("adminPlayerDirectory"),status=$("adminPlayerDirectoryStatus");
  if(!host) return;
  const normalized=new Map();
  for(const p of players){
    const key=String(p.name||"").trim().toLowerCase();
    if(!key) continue;
    normalized.set(key,(normalized.get(key)||0)+1);
  }
  const duplicates=players.filter(p=>normalized.get(String(p.name||"").trim().toLowerCase())>1);
  if(status){
    status.textContent=duplicates.length
      ?`${duplicates.length} player profile${duplicates.length===1?" has":"s have"} a duplicate display name. Edit the names below and save.`
      :"Display names are unique. Changes here flow through Weekly Tracking, Season Leaderboard, History, and Player Cards.";
  }
  if(!players.length){host.innerHTML='<p class="helper">No player profiles found yet.</p>';return;}
  const ordered=players.slice().sort((a,b)=>String(a.name||a.email||"").localeCompare(String(b.name||b.email||"")));
  host.innerHTML=ordered.map(p=>{
    const duplicate=normalized.get(String(p.name||"").trim().toLowerCase())>1;
    return `<div class="player-directory-row ${duplicate?"duplicate-name":""}">
      <div class="player-directory-identity"><strong>${htmlEscape(p.email||"No email")}</strong><span>${duplicate?'<b class="duplicate-name-badge">DUPLICATE NAME</b>':''}</span></div>
      <input type="text" data-player-name-input="${htmlEscape(p.uid)}" value="${htmlEscape(p.name||"")}" placeholder="First and last name">
      <button type="button" data-save-player-name="${htmlEscape(p.uid)}">Save Name</button>
    </div>`;
  }).join("");
  host.querySelectorAll("[data-save-player-name]").forEach(btn=>btn.onclick=()=>savePlayerDisplayName(btn.dataset.savePlayerName));
}

async function savePlayerDisplayName(uid){
  if(profile?.role!=="admin") return;
  const input=$("adminPlayerDirectory")?.querySelector(`[data-player-name-input="${uid}"]`);
  const name=input?.value.trim().replace(/\s+/g," ")||"";
  if(name.split(" ").filter(Boolean).length<2){
    if($("adminPlayerDirectoryStatus")) $("adminPlayerDirectoryStatus").textContent="Enter a first and last name before saving.";
    input?.focus();
    return;
  }
  try{
    await setDoc(doc(db,"users",uid),{name,profileUpdatedAt:serverTimestamp()},{merge:true});
    playerDirectoryCache=null;seasonDataCache=null;
    if($("adminPlayerDirectoryStatus")) $("adminPlayerDirectoryStatus").textContent=`Saved ${name}. Refreshing league displays…`;
    await loadCommissionerDashboard();
    await renderSeasonLeaderboard();
    await loadTracking({skipScoreRefresh:true});
  }catch(e){
    if($("adminPlayerDirectoryStatus")) $("adminPlayerDirectoryStatus").textContent=`Unable to save name: ${e.message}`;
  }
}

function standingRowsFromTotals(totals){
  const rows=[...totals.values()].map(r=>({...r}));
  // Season standings rank by ATS record (games correct vs. incorrect), not by the
  // weighted point system — the point/featured-game weighting only decides each
  // individual week's tiebreak and champion, not the season-long ranking. Points is
  // only a sort-order nudge for otherwise-identical records; two players with the
  // same W-L-P record are a true tie and must share the same rank number, so the
  // tie-detection key below intentionally does NOT include points.
  rows.sort((a,b)=>b.wins-a.wins||a.losses-b.losses||b.points-a.points||String(a.name||"").localeCompare(String(b.name||"")));
  let lastKey=null,lastRank=0;
  rows.forEach((r,i)=>{
    const key=`${r.wins}|${r.losses}|${r.pushes}`;
    r.rank=key===lastKey?lastRank:i+1;
    lastKey=key;lastRank=r.rank;
  });
  return rows;
}

async function buildSeasonData(){
  const weeksSnap=await getDocs(collection(db,"weeks"));
  const rawWeeks=weeksSnap.docs.map(d=>({id:d.id,...d.data()}))
    .filter(w=>w.published&&!w.isTest)
    .sort((a,b)=>(a.weekNumber||999)-(b.weekNumber||999));

  const directory=await getPlayerDirectoryMap();
  const weekRecords=[];
  for(const rawWeek of rawWeeks){
    const w=await hydrateWeekFromScoreFeed(rawWeek);
    const gs=Array.isArray(w.games)?w.games:[];
    if(!gs.some(isGameComplete)) continue;
    let entriesSnap;
    try{entriesSnap=await getDocs(collection(db,"weeks",w.id,"entries"));}catch{continue;}
    const entries=entriesSnap.docs.map(d=>{
      const entry={id:d.id,...d.data()};
      const identity=resolveEntryIdentity(entry,directory);
      return {...entry,_canonicalUid:identity.canonicalUid,name:identity.name,email:identity.email};
    }).filter(e=>e.submitted!==false);
    const ranked=rankWeeklyEntries(entries,w);
    const champion=weeklyChampionInfo(entries,w);
    weekRecords.push({week:w,entries,ranked,champion,final:weekIsFinal(gs)});
  }

  const totals=new Map();
  for(const wr of weekRecords){
    for(const e of wr.ranked){
      const uid=e._canonicalUid||e.uid||e.id;
      const displayName=directory.get(uid)?.name||e.name||"Player";
      const cur=totals.get(uid)||{
        uid,name:displayName,email:e.email||directory.get(uid)?.email||"",points:0,wins:0,losses:0,pushes:0,weeks:0,weeklyWins:0,bestWeek:0,weekRows:[]
      };
      cur.name=displayName;cur.email=e.email||directory.get(uid)?.email||cur.email;
      cur.points+=e._grade.score;cur.wins+=e._grade.wins;cur.losses+=e._grade.losses;cur.pushes+=e._grade.pushes;cur.weeks++;
      cur.bestWeek=Math.max(cur.bestWeek,e._grade.wins);
      cur.weekRows.push({
        weekId:wr.week.id,label:wr.week.label||wr.week.id,weekNumber:wr.week.weekNumber||999,
        rank:e._rank,score:e._grade.score,wins:e._grade.wins,losses:e._grade.losses,pushes:e._grade.pushes,
        tiebreak:e._tb,final:wr.final
      });
      totals.set(uid,cur);
    }
    if(wr.final&&wr.champion){
      wr.champion.winners.forEach(winner=>{
        const uid=winner._canonicalUid||winner.uid||winner.id;
        const cur=totals.get(uid);
        if(cur) cur.weeklyWins++;
      });
    }
  }

  const rows=standingRowsFromTotals(totals);
  const latest=weekRecords.length?weekRecords[weekRecords.length-1]:null;
  const previousTotals=new Map();
  if(latest){
    for(const wr of weekRecords){
      if(wr.week.id===latest.week.id) continue;
      for(const e of wr.ranked){
        const uid=e._canonicalUid||e.uid||e.id;
        const cur=previousTotals.get(uid)||{uid,name:e.name||"Player",points:0,wins:0,losses:0,pushes:0};
        cur.points+=e._grade.score;cur.wins+=e._grade.wins;cur.losses+=e._grade.losses;cur.pushes+=e._grade.pushes;
        previousTotals.set(uid,cur);
      }
    }
  }
  const previousRows=standingRowsFromTotals(previousTotals);
  const previousRankMap=new Map(previousRows.map(r=>[r.uid,r.rank]));
  rows.forEach(r=>{
    const prev=previousRankMap.get(r.uid);
    r.previousRank=prev??null;
    r.rankDelta=prev==null?null:prev-r.rank;
  });

  return {rows,weekRecords,latest,hasMovementBaseline:weekRecords.length>1};
}

function renderSeasonHistory(data){
  const host=$("seasonHistory"),detail=$("seasonHistoryDetail");
  if(!host) return;
  const records=data.weekRecords.slice().reverse();
  if(!records.length){
    host.innerHTML='<p class="helper">No graded weeks yet. The current week will appear here once games begin.</p>';
    if(detail) detail.innerHTML="";
    return;
  }
  host.innerHTML=`<div class="season-history-grid">${records.map(wr=>{
    if(wr.final){
      const c=wr.champion;
      const names=c?c.winners.map(w=>htmlEscape(w.name||"Player")).join(" & "):"—";
      const tb=c?.winners?.[0]?._tb;
      const tieText=c&&wr.ranked.filter(e=>e._grade.score===c.score).length>1&&tb?.available?`Tiebreak error ${tb.error}`:"Won on points";
      return `<button type="button" class="week-history-card complete" data-week-history="${htmlEscape(wr.week.id)}">
        <span class="week-history-label">${htmlEscape(wr.week.label||wr.week.id)} · FINAL</span>
        <strong>🏆 ${names}</strong>
        <span>${c?`${c.score} pts · ${tieText}`:"Final"}</span>
        <em>View final standings →</em>
      </button>`;
    }
    const complete=(wr.week.games||[]).filter(isGameComplete).length;
    const total=(wr.week.games||[]).length;
    const leaders=wr.ranked.filter(e=>e._rank===1);
    const leaderText=leaders.length?leaders.map(e=>htmlEscape(e.name||"Player")).join(" / "):"No leader yet";
    const leaderScore=leaders[0]?._grade.score??0;
    return `<button type="button" class="week-history-card in-progress" data-week-history="${htmlEscape(wr.week.id)}">
      <span class="week-history-label">${htmlEscape(wr.week.label||wr.week.id)} · IN PROGRESS</span>
      <strong>${leaderText}</strong>
      <span>${complete} of ${total} final · ${leaderScore} pts leading</span>
      <em>View live standings →</em>
    </button>`;
  }).join("")}</div>`;
  host.querySelectorAll("[data-week-history]").forEach(btn=>btn.onclick=()=>showWeekHistory(btn.dataset.weekHistory));
}

function showWeekHistory(weekId){
  const detail=$("seasonHistoryDetail");
  const wr=seasonDataCache?.weekRecords?.find(x=>x.week.id===weekId);
  if(!detail||!wr) return;
  const tb=wr.week.games?.find(g=>g.id===wr.week.tiebreakerGameId)||wr.week.games?.[0];
  const actual=finalScoresForGame(tb);
  const live=!wr.final;
  detail.innerHTML=`<div class="week-history-detail-head">
      <div><div class="login-kicker gold">${live?"LIVE STANDINGS":"FINAL STANDINGS"}</div><h3>${htmlEscape(wr.week.label||weekId)}</h3></div>
      ${actual&&tb?`<div class="history-tiebreak-final"><span>Game of the Week</span><strong>${htmlEscape(shortTeam(tb.dog))} ${actual.teamA} – ${htmlEscape(shortTeam(tb.fav))} ${actual.teamB}</strong></div>`:""}
    </div>
    <div class="tracking-table-wrap"><table class="tracking-table history-standings-table">
      <thead><tr><th>#</th><th>Player</th><th>Points</th>${live?"<th>Max</th>":""}<th>ATS</th><th>Tiebreak</th></tr></thead>
      <tbody>${wr.ranked.map(e=>{
        const tbText=wr.final&&e._tb.available?`${e._tb.error} margin error · ${e._tb.predicted.teamA}-${e._tb.predicted.teamB}`:(live?"Pending final":"—");
        return `<tr class="${e._rank===1?(wr.final?"history-winner-row":"history-live-leader-row"):""}"><td>${e._rank}</td><td>${htmlEscape(e.name||"Player")}</td><td><strong>${e._grade.score}</strong></td>${live?`<td>${e._grade.max}</td>`:""}<td>${e._grade.wins}-${e._grade.losses}-${e._grade.pushes}</td><td>${htmlEscape(tbText)}</td></tr>`;
      }).join("")}</tbody>
    </table></div>`;
  detail.scrollIntoView({behavior:"smooth",block:"nearest"});
}

function showPlayerProfile(uid){
  const panel=$("playerProfilePanel"),nameHost=$("playerProfileName"),body=$("playerProfileBody");
  const player=seasonDataCache?.rows?.find(r=>r.uid===uid);
  if(!panel||!nameHost||!body||!player) return;
  nameHost.textContent=player.name||"Player";
  body.innerHTML=`<div class="player-profile-stats">
      <div><span>Season Rank</span><strong>#${player.rank}</strong></div>
      <div><span>Total Points</span><strong>${player.points}</strong></div>
      <div><span>ATS Record</span><strong>${player.wins}-${player.losses}-${player.pushes}</strong></div>
      <div><span>Win %</span><strong>${formatPct(player.wins,player.losses)}</strong></div>
      <div><span>Weekly Wins</span><strong>${player.weeklyWins}</strong></div>
      <div><span>Best Week</span><strong>${player.bestWeek} correct</strong></div>
    </div>
    <div class="tracking-table-wrap"><table class="tracking-table player-history-table">
      <thead><tr><th>Week</th><th>Finish</th><th>Points</th><th>ATS</th><th>Tiebreak</th></tr></thead>
      <tbody>${player.weekRows.slice().sort((a,b)=>a.weekNumber-b.weekNumber).map(w=>{
        const tb=w.tiebreak?.available?`${w.tiebreak.error} margin error`:"—";
        return `<tr><td>${htmlEscape(w.label)}</td><td>${w.final?`#${w.rank}`:"Live"}</td><td>${w.score}</td><td>${w.wins}-${w.losses}-${w.pushes}</td><td>${htmlEscape(tb)}</td></tr>`;
      }).join("")}</tbody>
    </table></div>`;
  panel.hidden=false;
  panel.scrollIntoView({behavior:"smooth",block:"start"});
}

async function renderSeasonLeaderboard(){
  const host=$("seasonLeaderboard");
  if(!host) return;
  host.innerHTML='<p class="helper">Loading standings…</p>';
  try{
    seasonDataCache=await buildSeasonData();
    const rows=seasonDataCache.rows;
    updatePersonalSeasonSummary(seasonDataCache);
    if(!rows.length){
      host.innerHTML='<p>No graded real weeks yet.</p>';
      renderSeasonHistory(seasonDataCache);
      return;
    }
    host.innerHTML=`<div class="tracking-table-wrap"><table class="tracking-table standings-table">
      <thead><tr><th>#</th><th class="sticky-player">Player</th><th>ATS</th><th>Win %</th><th>Weekly Wins</th><th>Best Week</th></tr></thead>
      <tbody>${rows.map(r=>`<tr class="${r.rank===1?"standings-leader-row":""}">
        <td class="standings-rank">${r.rank}</td>
        <td class="sticky-player"><button type="button" class="player-link" data-player-profile="${htmlEscape(r.uid)}"><span>${htmlEscape(r.name)}</span><small>View card →</small></button></td>
        <td>${r.wins}-${r.losses}-${r.pushes}</td>
        <td>${formatPct(r.wins,r.losses)}</td>
        <td>${r.weeklyWins}</td>
        <td>${r.bestWeek}</td>
      </tr>`).join("")}</tbody>
    </table></div>`;
    host.querySelectorAll("[data-player-profile]").forEach(btn=>btn.onclick=()=>showPlayerProfile(btn.dataset.playerProfile));
    renderSeasonHistory(seasonDataCache);
  }catch(e){
    updatePersonalSeasonSummary(null);
    host.innerHTML=`<p class="helper">Unable to load season standings: ${htmlEscape(e.message)}</p>`;
    if($("seasonHistory")) $("seasonHistory").innerHTML='<p class="helper">Season history could not be loaded.</p>';
  }
}

function renderResults(){
  const gs=gamesForWeek();
  $("resultsStatus").textContent=weekData?.isTest?"Test results never affect the real season standings.":scoreFeedStatusText();
  $("resultsView").innerHTML=gs.map(g=>{
    const outcome=gameOutcome(g);
    const score=gameScoreLabel(g)||(g.final||"Score pending");
    const feedState=gameFeedState(g);
    const state=gameFeedLabel(g);
    return `<div class="result-row ${feedState}"><span><strong>${g.dog} vs ${g.fav}</strong><br><small>${g.fav} ${g.spread}</small></span><span class="result-status-block"><b class="result-status ${feedState}">${state}</b><span class="result-final">${score}${outcome?` · ${outcome==="PUSH"?"Push":`${outcome} covers`}`:""}</span></span></div>`;
  }).join("");
}

function renderConfirmation(){
  const gs=gamesForWeek(), count=gs.filter(g=>picks[g.id]).length;
  $("confirmCompleted").textContent=`${count} of ${gs.length}`;
  const tb=tiebreakerGame();
  $("confirmTiebreak").textContent=tb?`${tb.dog} ${$("clemsonScore").value} – ${tb.fav} ${$("lsuScore").value}`:"—";
  $("confirmSubmitted").textContent=submittedAt?.toDate?submittedAt.toDate().toLocaleString():new Date().toLocaleString();
  updateLockUI();
}

function applyWeekSnap(weekSnap){
  if(weekSnap.exists()) weekData={id:weekSnap.id,...weekSnap.data()};
  else if(currentWeekId==="week-1") weekData={id:"week-1",label:"Week 1",weekNumber:1,seasonYear:2026,published:false,isTest:false,games:baseGames,tiebreakerGameId:"g12"};
  else{
    const n=regularWeekNumberFromId(currentWeekId)||1;
    weekData={id:currentWeekId,label:`Week ${n}`,weekNumber:n,seasonYear:2026,published:false,isTest:false,games:[],tiebreakerGameId:null};
  }
  if(profile?.role==="admin"){
    $("lockDate").value=weekData.lockDate||"";
    $("lockTime").value=weekData.lockTime||"";
    if($("importSeason")) $("importSeason").value=weekData.seasonYear||weekFeedParams(weekData).year;
    if($("importWeek")) $("importWeek").value=weekData.weekNumber||1;
  }
}

async function loadCurrentWeek(){
  const s=await getDoc(doc(db,"weeks",currentWeekId));
  applyWeekSnap(s);
  updateWeekUI();
  updateTiebreakUI();
  renderAdminResults();
  // Live ESPN scores are fetched separately (see hydrateCurrentWeekScores) —
  // that's an external API call and shouldn't block the page from showing
  // everything Firestore already gave us (lock time, publish status, your
  // own picks). It fills in live/final scores a moment later instead.
}

async function hydrateCurrentWeekScores(weekIdAtStart){
  if(!weekData || weekData.isTest) return;
  try{
    weekData=await hydrateWeekFromScoreFeed(weekData);
  }catch{
    return; // score feed hiccup shouldn't break anything already on screen
  }
  if(currentWeekId!==weekIdAtStart) return; // user already switched weeks
  updateWeekUI();
  updateTiebreakUI();
  renderAdminResults();
  renderGames(); renderMy(); renderResults();
}

function applyPicksSnap(s){
  picks={}; submittedAt=null; $("clemsonScore").value=""; $("lsuScore").value="";
  if(s.exists()){
    const d=s.data(); picks=d.picks||{};
    $("clemsonScore").value=d.tiebreak?.teamA??d.tiebreak?.clemson??"";
    $("lsuScore").value=d.tiebreak?.teamB??d.tiebreak?.lsu??"";
    submittedAt=d.submittedAt||d.updatedAt||null;
  }
}

async function loadPicks(){
  const s=await getDoc(doc(db,"weeks",currentWeekId,"entries",user.uid));
  applyPicksSnap(s);
  renderGames(); renderMy(); renderResults();
  updateWeekContextCard();
  // Weekly Tracking and Season Leaderboard are separate tabs with their own
  // (often heavier — Season Leaderboard scans every published week) data
  // fetches, already triggered on-demand when the user opens those tabs.
  // Loading them here too was pure wasted latency on every login/week
  // switch for tabs the person isn't even looking at yet.
}

async function switchWeek(id){
  currentWeekId=id;
  lastCountdownLocked=null;
  // Give immediate visual feedback before the network round trip even starts —
  // on a slow connection, stale/zeroed numbers just look broken. A visible
  // "loading" state makes clear the app is working, not stuck.
  if($("personalWeekRecord")) $("personalWeekRecord").textContent="…";
  if($("personalWeekRank")) $("personalWeekRank").textContent="…";
  if($("myPicksLockNotice")) $("myPicksLockNotice").textContent="Loading your picks…";
  // The week doc and this player's entries doc are independent reads — fetch
  // both in parallel instead of one-after-the-other. On a slow connection
  // this is the difference between two round trips and one, on every single
  // login and every week switch.
  const [weekSnap,picksSnap]=await Promise.all([
    getDoc(doc(db,"weeks",id)),
    getDoc(doc(db,"weeks",id,"entries",user.uid))
  ]);
  applyWeekSnap(weekSnap);
  applyPicksSnap(picksSnap);
  updateWeekUI();
  updateTiebreakUI();
  renderAdminResults();
  renderGames(); renderMy(); renderResults();
  updateWeekContextCard();
  if(profile?.role==="admin") await loadCommissionerDashboard();
  hydrateCurrentWeekScores(id); // fire-and-forget: don't block on the ESPN call
}

async function loadProfile(){
  const s=await getDoc(doc(db,"users",user.uid));
  profile=s.exists()?s.data():null;
  if(!profile){$("profileCard").hidden=false;$("appArea").hidden=true;return;}
  if($("welcomeName")) $("welcomeName").textContent=(profile.name||"Player").split(" ")[0];
  if($("footerUser")) $("footerUser").textContent=profile.name||user.email;
  $("profileCard").hidden=true;$("appArea").hidden=false;$("adminTab").hidden=profile.role!=="admin";
  await loadWeeks(); await switchWeek(currentWeekId);
  if(profile.role==="admin"){
    setTab("admin");
  }
  // Season Rank/ATS on the Welcome card comes from the same season-wide scan
  // that powers the Season Leaderboard (every published week, each hydrated
  // from ESPN). That's real work — it must not block the initial paint of
  // Picks/My Picks, but it still needs to run automatically so Season Rank
  // doesn't sit blank until someone happens to open that tab. Fire-and-forget.
  renderSeasonLeaderboard();
}

$("weekSelectTop").onchange=()=>switchWeek($("weekSelectTop").value);
$("googleBtn").onclick=()=>{loginIntent="player";return signInWithPopup(auth,google).catch(e=>$("authMsg").textContent=e.message);};
$("emailCreate").onclick=()=>{loginIntent="player";return createUserWithEmailAndPassword(auth,$("email").value,$("password").value).catch(e=>$("authMsg").textContent=e.message);};
$("emailSignIn").onclick=()=>{loginIntent="player";return signInWithEmailAndPassword(auth,$("email").value,$("password").value).catch(e=>$("authMsg").textContent=e.message);};
$("adminSignIn").onclick=async()=>{
  loginIntent="admin"; $("adminAuthMsg").textContent="Signing in…";
  try{await signInWithEmailAndPassword(auth,$("adminEmail").value.trim(),$("adminPassword").value);}
  catch(e){loginIntent=null;$("adminAuthMsg").textContent=e.message;}
};
$("adminGoogle").onclick=async()=>{
  loginIntent="admin"; $("adminAuthMsg").textContent="Signing in…";
  try{await signInWithPopup(auth,google);}
  catch(e){loginIntent=null;$("adminAuthMsg").textContent=e.message;}
};
$("forgotPassword").onclick=async()=>{
  const email=$("email").value.trim();
  if(!email){$("authMsg").textContent="Enter your email address first, then click Forgot password.";return;}
  try{await sendPasswordResetEmail(auth,email);$("authMsg").textContent="Password reset email sent. Check your inbox and junk/spam folder.";}
  catch(e){$("authMsg").textContent=e.message;}
};

$("saveProfile").onclick=async()=>{
  const name=$("displayName").value.trim().replace(/\s+/g," ");
  if(name.split(" ").length<2){$("profileMsg").textContent="Please enter both your first and last name.";return;}
  if(profile){
    // Editing an existing profile: merge only the fields this form controls.
    // Never touch role/createdAt here, so an existing player (or admin who
    // somehow reaches this form) can't accidentally have their role reset.
    // seasonPool can only ever move false -> true here, never true -> false
    // (the checkbox is disabled once joined, and the Firestore rule enforces
    // this server-side too, but we also just never send a false here).
    const seasonPool=profile.seasonPool?true:$("seasonPool").checked;
    await setDoc(doc(db,"users",user.uid),{name,seasonPool,profileUpdatedAt:serverTimestamp()},{merge:true});
    playerDirectoryCache=null;seasonDataCache=null;
  }else{
    await setDoc(doc(db,"users",user.uid),{name,email:user.email,seasonPool:$("seasonPool").checked,role:"player",createdAt:serverTimestamp()});
  }
  await loadProfile();
};

$("editNameBtn").onclick=()=>{
  if(!profile) return;
  $("displayName").value=profile.name||"";
  $("seasonPool").checked=!!profile.seasonPool;
  $("seasonPool").disabled=!!profile.seasonPool;
  $("seasonPoolLockNote").hidden=!profile.seasonPool;
  $("profileMsg").textContent="";
  $("profileCardTitle").textContent="Edit your name";
  $("cancelProfileEdit").hidden=false;
  $("profileCard").hidden=false;
  $("appArea").hidden=true;
  $("profileCard").scrollIntoView({behavior:"smooth",block:"start"});
};

$("cancelProfileEdit").onclick=()=>{
  $("profileMsg").textContent="";
  $("profileCard").hidden=true;
  $("appArea").hidden=false;
};

$("savePicks").onclick=async()=>{
  if(isLocked()){$("saveMsg").textContent="Picks are locked for this week.";return;}
  const gs=gamesForWeek(), completed=gs.filter(g=>picks[g.id]).length, clemson=$("clemsonScore").value, lsu=$("lsuScore").value;
  if(completed!==gs.length){$("saveMsg").textContent=`Please complete all ${gs.length} picks before submitting.`;return;}
  if(clemson===""||lsu===""){$("saveMsg").textContent="Please enter both Game of the Week score predictions.";return;}
  const now=serverTimestamp(),tb=tiebreakerGame();
  await setDoc(doc(db,"weeks",currentWeekId,"entries",user.uid),{uid:user.uid,name:profile.name,email:user.email||profile.email||null,picks,tiebreak:{teamA:+clemson,teamB:+lsu,teamAName:tb?.dog||"Team A",teamBName:tb?.fav||"Team B",gameId:tb?.id||null},submitted:true,submittedAt:submittedAt||now,updatedAt:now,isTest:!!weekData?.isTest},{merge:true});
  const refreshed=await getDoc(doc(db,"weeks",currentWeekId,"entries",user.uid));
  if(refreshed.exists()) submittedAt=refreshed.data().submittedAt||refreshed.data().updatedAt||null;
  updateWeekContextCard();
  $("saveMsg").textContent="";renderMy();renderConfirmation();setTab("confirmation");updateWeeklyPersonalSummary();
};

$("viewMyPicks").onclick=()=>setTab("mypicks");
$("editPicks").onclick=()=>{if(!isLocked())setTab("picks");};
$("myPicksEdit").onclick=()=>{if(!isLocked())setTab("picks");};
if($("closePlayerProfile")) $("closePlayerProfile").onclick=()=>{$("playerProfilePanel").hidden=true;};
if($("refreshAdminDashboard")) $("refreshAdminDashboard").onclick=async()=>{
  $("refreshAdminDashboard").disabled=true; $("refreshAdminDashboard").textContent="Refreshing…";
  try{await loadCommissionerDashboard();}
  finally{$("refreshAdminDashboard").disabled=false; $("refreshAdminDashboard").textContent="Refresh Entry Status";}
};
$("refreshTracking").onclick=async()=>{
  $("refreshTracking").disabled=true; $("refreshTracking").textContent="Refreshing…";
  try{await refreshAutomaticScores({force:true}); await renderSeasonLeaderboard();}
  finally{$("refreshTracking").disabled=false; $("refreshTracking").textContent="Refresh Scores";}
};
$("saveResults").onclick=()=>saveWeeklyResults().catch(e=>$("resultsAdminMsg").textContent=e.message);
$("loadWeek1").onclick=()=>seedWeekOne().catch(e=>$("adminMsg").textContent=e.message);
$("importEspnSlate").onclick=()=>importEspnSlate();
$("reviewImportedSlate").onclick=()=>reviewImportedSlate();
$("saveImportedSlate").onclick=()=>saveImportedSlateDraft().catch(e=>$("importSlateMsg").textContent=e.message);
$("publishWeekBuilder").onclick=()=>$("publishWeek").click();
$("importGameCount").onchange=()=>{if(importedSlateCandidates.length)selectRecommendedSlate();};
if($("historicalImportFile")) $("historicalImportFile").onchange=async e=>{
  const file=e.target.files?.[0];
  if(!file) return;
  try{
    const text=await file.text();
    $("historicalImportPaste").value=text;
    $("historicalImportStatus").textContent=`Loaded ${file.name}. Previewing…`;
    await previewHistoricalImport();
  }catch(err){$("historicalImportStatus").textContent=`Could not read file: ${err.message}`;}
};
if($("previewHistoricalImport")) $("previewHistoricalImport").onclick=()=>previewHistoricalImport();
if($("runHistoricalImport")) $("runHistoricalImport").onclick=()=>importHistoricalWeekOne();
if($("downloadHistoricalTemplate")) $("downloadHistoricalTemplate").onclick=()=>downloadHistoricalTemplate().catch(e=>$("historicalImportStatus").textContent=e.message);

$("publishWeek").onclick=async()=>{
  if(profile?.role!=="admin")return;
  const gs=gamesForWeek();
  if(!gs.length||gs.some(g=>!g?.fav||!g?.dog||!Number.isFinite(Number(g?.spread))||Number(g.spread)===0)){$("adminMsg").textContent="Cannot publish: every game needs a confirmed favorite and non-zero spread.";return;}
  if(weekData?.importedFrom==="ESPN"&&!weekData?.cardReviewed){$("adminMsg").textContent="Review and save the imported card before publishing.";return;}
  const dateStr=$("lockDate").value,timeStr=$("lockTime").value;
  if(!dateStr||!timeStr){$("adminMsg").textContent="Choose both a lock date and lock time.";return;}
  const lockDate=centralPartsToDate(dateStr,timeStr);
  await setDoc(doc(db,"weeks",currentWeekId),{label:weekData?.label||"Week 1",weekNumber:weekData?.weekNumber||1,seasonYear:weekData?.seasonYear||weekFeedParams(weekData).year,isTest:!!weekData?.isTest,games:gs,tiebreakerGameId:weekData?.tiebreakerGameId||tiebreakerGame()?.id||null,lockDate:dateStr,lockTime:timeStr,lockTimezone:"America/Chicago",lockAt:Timestamp.fromDate(lockDate),published:true,publishedAt:serverTimestamp(),linesLocked:true,lineLockedAt:serverTimestamp()},{merge:true});
  $("adminMsg").textContent=`${weekData?.label||"Week"} published. Picks lock ${formatCentral(lockDate)}. Weekly spreads are now frozen.`;
  await loadWeeks();await switchWeek(currentWeekId);
};

if($("createFutureWeek")) $("createFutureWeek").onclick=()=>createFutureWeekDraft().catch(e=>$("futureWeekMsg").textContent=e.message);
if($("createNextWeek")) $("createNextWeek").onclick=()=>{
  const regular=availableWeeks.filter(w=>!w.isTest).map(w=>Number(w.weekNumber)||0);
  const next=Math.max(1,...regular)+1;
  createFutureWeekDraft(next).catch(e=>$("futureWeekMsg").textContent=e.message);
};

$("createTestWeek").onclick=async()=>{
  if(profile?.role!=="admin")return;
  const existing=availableWeeks.filter(w=>w.isTest).map(w=>w.weekNumber||0);
  const n=Math.max(2,...existing)+1;
  const id=`test-week-${n}`;
  await setDoc(doc(db,"weeks",id),{label:`Test Week ${n}`,weekNumber:n,seasonYear:new Date().getFullYear(),isTest:true,published:true,games:baseGames,tiebreakerGameId:"g12",createdAt:serverTimestamp()});
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

document.querySelectorAll("nav button[data-tab]").forEach(b=>b.onclick=async()=>{setTab(b.dataset.tab);updateWeeklyPersonalSummary();if(b.dataset.tab==="tracking")await loadTracking();if(b.dataset.tab==="results")await refreshAutomaticScores();if(b.dataset.tab==="leaderboard")await renderSeasonLeaderboard();if(b.dataset.tab==="admin")await loadCommissionerDashboard();if(b.dataset.tab==="mypicks"){await refreshAutomaticScores();renderMy();updateWeeklyPersonalSummary();}});

setInterval(updateLockCountdown,1000);

scoreRefreshTimer=setInterval(async()=>{
  if(!user||!weekData||weekData.isTest) return;
  const active=document.querySelector(".tab.active")?.id;
  if(active==="tracking"||active==="results") await refreshAutomaticScores({force:true});
},60000);

onAuthStateChanged(auth,async u=>{
  user=u;
  if($("loginChooser")) $("loginChooser").hidden=!!u;
  if(u){
    // Commissioner login is verified before the normal app/profile UI is loaded.
    // Clicking the Admin Login button never grants admin access by itself.
    if(loginIntent==="admin"){
      try{
        const adminProfileSnap=await getDoc(doc(db,"users",u.uid));
        const candidate=adminProfileSnap.exists()?adminProfileSnap.data():null;
        if(candidate?.role!=="admin"){
          if($("adminAuthMsg")) $("adminAuthMsg").textContent="This account is not authorized as a commissioner.";
          loginIntent=null;
          await signOut(auth);
          return;
        }
      }catch(e){
        if($("adminAuthMsg")) $("adminAuthMsg").textContent=`Unable to verify commissioner access: ${e.message}`;
        loginIntent=null;
        await signOut(auth);
        return;
      }
    }

    $("authBox").innerHTML=`<button id="logout">${u.email} · Sign out</button>`;
    $("logout").onclick=()=>signOut(auth);
    await loadProfile();
    if(loginIntent==="admin" && $("adminAuthMsg")) $("adminAuthMsg").textContent="";
    loginIntent=null;
  }else{
    playerDefaultWeekResolved=false;
    currentWeekId="week-1";
    $("authBox").innerHTML="";
    $("profileCard").hidden=true;$("appArea").hidden=true;
    if($("loginChooser")) $("loginChooser").hidden=false;
    updateLockCountdown();
  }
});
