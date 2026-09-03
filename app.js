import {initializeApp} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendPasswordResetEmail,signOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {getFirestore,doc,getDoc,setDoc,serverTimestamp,Timestamp} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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

const games=[["#13 Alabama", "East Carolina", -28.5, 2], ["#7 Miami", "Stanford", -24.5, 2], ["#14 USC", "Fresno State", -22.5, 2], ["#6 Indiana", "North Texas", -40.5, 2], ["#23 Houston", "Oregon State", -20.5, 2], ["Auburn", "Baylor", -6.5, 1], ["#2 Oregon", "Boise State", -24.5, 2], ["#18 Penn State", "Marshall", -24.5, 2], ["Cincinnati", "Boston College", -7.5, 1], ["Arkansas", "North Alabama", -40.5, 1], ["Mississippi State", "UL Monroe", -28.5, 1], ["#11 LSU", "Clemson", -10.5, 2], ["#16 Michigan", "Western Michigan", -27.5, 2], ["Florida", "Florida Atlantic", -27.5, 1], ["UCLA", "California", -1.5, 1], ["#17 Washington", "Washington State", -23.5, 2], ["#4 Notre Dame", "Wisconsin", -20.5, 2], ["#9 Ole Miss", "#24 Louisville", -6.5, 3], ["#19 SMU", "Florida State", -2.5, 2], ["Georgia Tech", "Colorado", -6.5, 1]].map((g,i)=>({id:"g"+(i+1),fav:g[0],dog:g[1],spread:g[2],points:g[3]}));
let user=null,profile=null,picks={},submittedAt=null,weekData=null;
const $=x=>document.getElementById(x);

function setTab(tabId){
  document.querySelectorAll("nav button,.tab").forEach(x=>x.classList.remove("active"));
  const navBtn=document.querySelector(`nav button[data-tab="${tabId}"]`);
  if(navBtn) navBtn.classList.add("active");
  $(tabId).classList.add("active");
}

function centralPartsToDate(dateStr,timeStr){
  if(!dateStr || !timeStr) return null;
  const [y,m,d]=dateStr.split("-").map(Number);
  const [hh,mm]=timeStr.split(":").map(Number);

  // Convert an America/Chicago wall-clock time to an instant without relying on the viewer's timezone.
  let guess=new Date(Date.UTC(y,m-1,d,hh,mm));
  for(let i=0;i<3;i++){
    const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(guess);
    const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    const represented=Date.UTC(Number(map.year),Number(map.month)-1,Number(map.day),Number(map.hour),Number(map.minute));
    const desired=Date.UTC(y,m-1,d,hh,mm);
    guess=new Date(guess.getTime()+(desired-represented));
  }
  return guess;
}

function formatCentral(value){
  if(!value) return "Not set";
  const date=value.toDate ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",weekday:"short",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(date);
}

function isLocked(){
  if(!weekData?.lockAt) return false;
  const d=weekData.lockAt.toDate ? weekData.lockAt.toDate() : new Date(weekData.lockAt);
  return Date.now() >= d.getTime();
}

function updateLockUI(){
  const text=weekData?.lockAt ? `Picks lock ${formatCentral(weekData.lockAt)}` : "Pick deadline has not been published yet.";
  $("lockNotice").textContent=text;
  $("myPicksLockNotice").textContent=text;
  $("confirmLock").textContent=weekData?.lockAt ? formatCentral(weekData.lockAt) : "Not set";

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
  const count=Object.keys(picks).filter(k=>picks[k]).length;
  $("pickProgress").textContent=`${count} of ${games.length} complete`;
  if(!isLocked()) $("savePicks").textContent=submittedAt ? "Update Picks" : "Submit Picks";
}

function renderGames(){
  const locked=isLocked();
  $("games").innerHTML=games.map(g=>`<div class="game">
    <div class="game-head">
      <b>${g.fav} ${g.spread}</b>
      <span class="points">${g.points} pt${g.points>1?"s":""}</span>
    </div>
    <div class="choices">
      <button class="choice ${picks[g.id]===g.fav?"selected":""}" ${locked?"disabled":""} data-g="${g.id}" data-p="${g.fav}">${g.fav} ${g.spread}</button>
      <button class="choice ${picks[g.id]===g.dog?"selected":""}" ${locked?"disabled":""} data-g="${g.id}" data-p="${g.dog}">${g.dog} +${Math.abs(g.spread)}</button>
    </div>
  </div>`).join("");

  if(!locked){
    document.querySelectorAll(".choice").forEach(b=>b.onclick=()=>{
      picks[b.dataset.g]=b.dataset.p;
      renderGames();
      updateProgress();
    });
  }
  updateProgress();
  updateLockUI();
}

function renderMy(){
  const chosen=games.map(g=>`<p><b>${g.id.toUpperCase()}</b>: ${picks[g.id]||"No pick yet"}</p>`).join("");
  const tb=($("clemsonScore").value!=="" && $("lsuScore").value!=="")
    ? `<p><b>Game of the Week:</b> Clemson ${$("clemsonScore").value} – LSU ${$("lsuScore").value}</p>`
    : "";
  $("myPicksView").innerHTML=tb+chosen;
  updateLockUI();
}

function formatSubmitted(ts){
  if(!ts) return new Date().toLocaleString();
  if(ts.toDate) return ts.toDate().toLocaleString();
  return new Date(ts).toLocaleString();
}

function renderConfirmation(){
  const count=Object.keys(picks).filter(k=>picks[k]).length;
  $("confirmCompleted").textContent=`${count} of ${games.length}`;
  $("confirmTiebreak").textContent=`Clemson ${$("clemsonScore").value} – LSU ${$("lsuScore").value}`;
  $("confirmSubmitted").textContent=formatSubmitted(submittedAt);
  updateLockUI();
}

async function loadWeek(){
  const s=await getDoc(doc(db,"weeks","week-1"));
  weekData=s.exists()?s.data():null;
  if(profile?.role==="admin" && weekData?.lockDate && weekData?.lockTime){
    $("lockDate").value=weekData.lockDate;
    $("lockTime").value=weekData.lockTime;
  }
}

async function loadPicks(){
  const s=await getDoc(doc(db,"weeks","week-1","entries",user.uid));
  if(s.exists()){
    const d=s.data();
    picks=d.picks||{};
    $("clemsonScore").value=d.tiebreak?.clemson??"";
    $("lsuScore").value=d.tiebreak?.lsu??"";
    submittedAt=d.submittedAt||d.updatedAt||null;
  }
  renderGames();
  renderMy();
}

async function loadProfile(){
  const s=await getDoc(doc(db,"users",user.uid));
  profile=s.exists()?s.data():null;
  if(!profile){
    $("profileCard").hidden=false;
    $("appArea").hidden=true;
    return;
  }
  $("profileCard").hidden=true;
  $("appArea").hidden=false;
  $("adminTab").hidden=profile.role!=="admin";
  await loadWeek();
  await loadPicks();
}

$("googleBtn").onclick=()=>signInWithPopup(auth,google).catch(e=>$("authMsg").textContent=e.message);
$("emailCreate").onclick=()=>createUserWithEmailAndPassword(auth,$("email").value,$("password").value).catch(e=>$("authMsg").textContent=e.message);
$("emailSignIn").onclick=()=>signInWithEmailAndPassword(auth,$("email").value,$("password").value).catch(e=>$("authMsg").textContent=e.message);
$("forgotPassword").onclick=async()=>{
  const email=$("email").value.trim();
  if(!email){
    $("authMsg").textContent="Enter your email address first, then click Forgot password.";
    return;
  }
  try{
    await sendPasswordResetEmail(auth,email);
    $("authMsg").textContent="Password reset email sent. Check your inbox.";
  }catch(e){
    $("authMsg").textContent=e.message;
  }
};

$("saveProfile").onclick=async()=>{
  const name=$("displayName").value.trim().replace(/\s+/g," ");
  if(name.split(" ").length<2){
    $("profileMsg").textContent="Please enter both your first and last name.";
    return;
  }
  await setDoc(doc(db,"users",user.uid),{
    name,
    email:user.email,
    seasonPool:$("seasonPool").checked,
    role:"player",
    createdAt:serverTimestamp()
  });
  $("profileMsg").textContent="";
  await loadProfile();
};

$("savePicks").onclick=async()=>{
  if(isLocked()){
    $("saveMsg").textContent="Picks are locked for this week.";
    return;
  }
  const completed=Object.keys(picks).filter(k=>picks[k]).length;
  const clemson=$("clemsonScore").value;
  const lsu=$("lsuScore").value;

  if(completed!==games.length){
    $("saveMsg").textContent=`Please complete all ${games.length} picks before submitting.`;
    return;
  }
  if(clemson==="" || lsu===""){
    $("saveMsg").textContent="Please enter both Game of the Week score predictions.";
    return;
  }

  const now=serverTimestamp();
  await setDoc(doc(db,"weeks","week-1","entries",user.uid),{
    uid:user.uid,
    name:profile.name,
    picks,
    tiebreak:{clemson:Number(clemson),lsu:Number(lsu)},
    submitted:true,
    submittedAt:submittedAt || now,
    updatedAt:now
  },{merge:true});

  const refreshed=await getDoc(doc(db,"weeks","week-1","entries",user.uid));
  if(refreshed.exists()) submittedAt=refreshed.data().submittedAt||refreshed.data().updatedAt||null;

  $("saveMsg").textContent="";
  renderMy();
  renderConfirmation();
  setTab("confirmation");
};

$("viewMyPicks").onclick=()=>setTab("mypicks");
$("editPicks").onclick=()=>{ if(!isLocked()) setTab("picks"); };
$("myPicksEdit").onclick=()=>{ if(!isLocked()) setTab("picks"); };

$("publishWeek").onclick=async()=>{
  if(profile?.role!=="admin") return;
  const dateStr=$("lockDate").value;
  const timeStr=$("lockTime").value;
  if(!dateStr || !timeStr){
    $("adminMsg").textContent="Choose both a lock date and lock time.";
    return;
  }

  const lockDate=centralPartsToDate(dateStr,timeStr);
  await setDoc(doc(db,"weeks","week-1"),{
    label:"Week 1",
    lockDate:dateStr,
    lockTime:timeStr,
    lockTimezone:"America/Chicago",
    lockAt:Timestamp.fromDate(lockDate),
    published:true,
    publishedAt:serverTimestamp()
  },{merge:true});

  $("adminMsg").textContent=`Week published. Picks lock ${formatCentral(lockDate)}.`;
  await loadWeek();
  renderGames();
  renderMy();
};

document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));

onAuthStateChanged(auth,async u=>{
  user=u;
  $("loginCard").hidden=!!u;
  if(u){
    $("authBox").innerHTML=`<button id="logout">${u.email} · Sign out</button>`;
    $("logout").onclick=()=>signOut(auth);
    await loadProfile();
  }else{
    $("authBox").innerHTML="";
    $("profileCard").hidden=true;
    $("appArea").hidden=true;
  }
});
