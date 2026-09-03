import {initializeApp} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {getFirestore,doc,getDoc,setDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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
let user=null,profile=null,picks={},submittedAt=null;
const $=x=>document.getElementById(x);

function setTab(tabId){
  document.querySelectorAll("nav button,.tab").forEach(x=>x.classList.remove("active"));
  const navBtn=document.querySelector(`nav button[data-tab="${tabId}"]`);
  if(navBtn) navBtn.classList.add("active");
  $(tabId).classList.add("active");
}

function updateProgress(){
  const count=Object.keys(picks).filter(k=>picks[k]).length;
  $("pickProgress").textContent=`${count} of ${games.length} complete`;
  $("savePicks").textContent=submittedAt ? "Update Picks" : "Submit Picks";
}

function renderGames(){
  $("games").innerHTML=games.map(g=>`<div class="game">
    <div class="game-head">
      <b>${g.fav} ${g.spread}</b>
      <span class="points">${g.points} pt${g.points>1?"s":""}</span>
    </div>
    <div class="choices">
      <button class="choice ${picks[g.id]===g.fav?"selected":""}" data-g="${g.id}" data-p="${g.fav}">${g.fav} ${g.spread}</button>
      <button class="choice ${picks[g.id]===g.dog?"selected":""}" data-g="${g.id}" data-p="${g.dog}">${g.dog} +${Math.abs(g.spread)}</button>
    </div>
  </div>`).join("");
  document.querySelectorAll(".choice").forEach(b=>b.onclick=()=>{
    picks[b.dataset.g]=b.dataset.p;
    renderGames();
    updateProgress();
  });
  updateProgress();
}

function renderMy(){
  const chosen=games.map(g=>`<p><b>${g.id.toUpperCase()}</b>: ${picks[g.id]||"No pick yet"}</p>`).join("");
  const tb=($("clemsonScore").value!=="" && $("lsuScore").value!=="")
    ? `<p><b>Game of the Week:</b> Clemson ${$("clemsonScore").value} – LSU ${$("lsuScore").value}</p>`
    : "";
  $("myPicksView").innerHTML=tb+chosen;
}

function formatSubmitted(ts){
  if(!ts) return new Date().toLocaleString();
  if(ts.toDate) return ts.toDate().toLocaleString();
  return new Date().toLocaleString();
}

function renderConfirmation(){
  const count=Object.keys(picks).filter(k=>picks[k]).length;
  $("confirmCompleted").textContent=`${count} of ${games.length}`;
  $("confirmTiebreak").textContent=`Clemson ${$("clemsonScore").value} – LSU ${$("lsuScore").value}`;
  $("confirmSubmitted").textContent=formatSubmitted(submittedAt);
  $("confirmStatus").textContent="Saved";
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
  await loadPicks();
}

$("googleBtn").onclick=()=>signInWithPopup(auth,google).catch(e=>$("authMsg").textContent=e.message);
$("emailCreate").onclick=()=>createUserWithEmailAndPassword(auth,$("email").value,$("password").value).catch(e=>$("authMsg").textContent=e.message);
$("emailSignIn").onclick=()=>signInWithEmailAndPassword(auth,$("email").value,$("password").value).catch(e=>$("authMsg").textContent=e.message);

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
    submittedAt: submittedAt || now,
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
$("editPicks").onclick=()=>setTab("picks");

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
