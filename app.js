
const games = [
  {id:1, away:"Colorado", home:"Georgia Tech", spreadTeam:"Georgia Tech", spread:-6.5, points:1, time:"Thu 6:00 PM CT"},
  {id:2, away:"#7 Miami", home:"Stanford", spreadTeam:"#7 Miami", spread:-24.5, points:2, time:"Fri 7:00 PM CT"},
  {id:3, away:"Fresno State", home:"#14 USC", spreadTeam:"#14 USC", spread:-22.5, points:2, time:"Sat 11:00 AM CT"},
  {id:4, away:"North Texas", home:"#6 Indiana", spreadTeam:"#6 Indiana", spread:-40.5, points:2, time:"Sat 11:00 AM CT"},
  {id:5, away:"East Carolina", home:"#13 Alabama", spreadTeam:"#13 Alabama", spread:-28.5, points:2, time:"Sat 11:00 AM CT"},
  {id:6, away:"Oregon State", home:"#23 Houston", spreadTeam:"#23 Houston", spread:-20.5, points:2, time:"Sat 2:30 PM CT"},
  {id:7, away:"Baylor", home:"Auburn", spreadTeam:"Auburn", spread:-6.5, points:1, time:"Sat 2:30 PM CT"},
  {id:8, away:"Boise State", home:"#2 Oregon", spreadTeam:"#2 Oregon", spread:-24.5, points:2, time:"Sat 2:30 PM CT"},
  {id:9, away:"Marshall", home:"#18 Penn State", spreadTeam:"#18 Penn State", spread:-24.5, points:2, time:"Sat 2:30 PM CT"},
  {id:10, away:"Boston College", home:"Cincinnati", spreadTeam:"Cincinnati", spread:-7.5, points:1, time:"Sat 2:30 PM CT"},
  {id:11, away:"North Alabama", home:"Arkansas", spreadTeam:"Arkansas", spread:-40.5, points:1, time:"Sat 3:00 PM CT"},
  {id:12, away:"UL Monroe", home:"Mississippi State", spreadTeam:"Mississippi State", spread:-28.5, points:1, time:"Sat 3:00 PM CT"},
  {id:13, away:"Clemson", home:"#11 LSU", spreadTeam:"#11 LSU", spread:-10.5, points:2, time:"Sat 6:00 PM CT"},
  {id:14, away:"Western Michigan", home:"#16 Michigan", spreadTeam:"#16 Michigan", spread:-27.5, points:2, time:"Sat 6:30 PM CT"},
  {id:15, away:"Florida Atlantic", home:"Florida", spreadTeam:"Florida", spread:-27.5, points:1, time:"Sat 6:30 PM CT"},
  {id:16, away:"UCLA", home:"California", spreadTeam:"UCLA", spread:-1.5, points:1, time:"Sat 7:00 PM CT"},
  {id:17, away:"Washington State", home:"#17 Washington", spreadTeam:"#17 Washington", spread:-23.5, points:2, time:"Sat 7:00 PM CT"},
  {id:18, away:"Wisconsin", home:"#4 Notre Dame", spreadTeam:"#4 Notre Dame", spread:-20.5, points:2, time:"Sat 7:30 PM CT"},
  {id:19, away:"#24 Louisville", home:"#9 Ole Miss", spreadTeam:"#9 Ole Miss", spread:-6.5, points:3, time:"Sat 7:30 PM CT"},
  {id:20, away:"#19 SMU", home:"Florida State", spreadTeam:"#19 SMU", spread:-2.5, points:2, time:"Sat 8:00 PM CT"}
];

const leaderboard = [
  {rank:1,name:"Will",p3:6,p2:18,p1:4,total:28},
  {rank:2,name:"Ben",p3:3,p2:20,p1:3,total:26},
  {rank:3,name:"Jake",p3:6,p2:16,p1:3,total:25},
  {rank:4,name:"Luke",p3:3,p2:18,p1:2,total:23},
  {rank:5,name:"Mason",p3:3,p2:16,p1:3,total:22},
  {rank:6,name:"Cole",p3:0,p2:18,p1:3,total:21},
];

const sampleResults = {
  1:{score:"Colorado 27 • Georgia Tech 31", cover:"Colorado +6.5"},
  2:{score:"Miami 42 • Stanford 14", cover:"Miami -24.5"},
  3:{score:"Fresno State 17 • USC 38", cover:"Fresno State +22.5"},
  4:{score:"North Texas 10 • Indiana 48", cover:"North Texas +40.5"},
  5:{score:"East Carolina 13 • Alabama 45", cover:"Alabama -28.5"},
};

let state = JSON.parse(localStorage.getItem("collegePickemState") || "{}");
state.picks = state.picks || {};
state.submitted = !!state.submitted;
state.tiebreak = state.tiebreak || {};
state.seasonPot = !!state.seasonPot;

function spreadLabel(game, team) {
  if (team === game.spreadTeam) return `${team} ${game.spread}`;
  const dogSpread = Math.abs(game.spread);
  return `${team} +${dogSpread}`;
}

function save() {
  state.tiebreak.away = document.getElementById("tbAway")?.value || state.tiebreak.away || "";
  state.tiebreak.home = document.getElementById("tbHome")?.value || state.tiebreak.home || "";
  state.seasonPot = !!document.getElementById("seasonPot")?.checked;
  localStorage.setItem("collegePickemState", JSON.stringify(state));
}

function renderGames() {
  const list = document.getElementById("gamesList");
  list.innerHTML = "";
  games.forEach(game => {
    const card = document.createElement("div");
    card.className = "game-card";
    card.innerHTML = `
      <div class="game-top">
        <div class="game-meta">${game.time}</div>
        <div class="points-badge">${game.points} point${game.points === 1 ? "" : "s"}</div>
      </div>
      <div class="teams">
        ${[game.away, game.home].map(team => `
          <button class="team-choice ${state.picks[game.id] === team ? "selected":""}" data-game="${game.id}" data-team="${team}" ${state.submitted ? "disabled":""}>
            <span class="team-main">
              <span class="team-name">${team}</span>
              <span class="spread">${spreadLabel(game, team)}</span>
            </span>
            <span class="radio-dot"></span>
          </button>
        `).join("")}
      </div>
    `;
    list.appendChild(card);
  });

  document.querySelectorAll(".team-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      if (state.submitted) return;
      state.picks[btn.dataset.game] = btn.dataset.team;
      save();
      renderGames();
      updatePickCount();
    });
  });
}

function updatePickCount() {
  const count = Object.keys(state.picks).length;
  document.getElementById("pickCount").textContent = `${count} / ${games.length} picked`;
  const submit = document.getElementById("submitPicks");
  submit.disabled = count !== games.length || state.submitted;
  if (state.submitted) {
    submit.textContent = "Picks Submitted";
    document.getElementById("saveStatus").textContent = "Your Week 1 card is locked in this prototype.";
  }
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2200);
}

function renderLeaderboard() {
  document.getElementById("leaderBody").innerHTML = leaderboard.map(r => `
    <tr><td>${r.rank}</td><td>${r.name}</td><td>${r.p3}</td><td>${r.p2}</td><td>${r.p1}</td><td><strong>${r.total}</strong></td></tr>
  `).join("");
}

function renderResults() {
  document.getElementById("resultsList").innerHTML = games.map(g => {
    const r = sampleResults[g.id];
    return `
      <div class="result-row">
        <div><strong>${g.away} @ ${g.home}</strong><div class="game-meta">${g.points} point${g.points===1?"":"s"}</div></div>
        <div>${r ? r.score : '<span class="pending">Pending</span>'}</div>
        <div>${r ? `<span class="cover">${r.cover}</span>` : '<span class="pending">—</span>'}</div>
      </div>`;
  }).join("");
}

function renderMyPicks() {
  const el = document.getElementById("myPicksContent");
  if (!Object.keys(state.picks).length) {
    el.innerHTML = `<div class="empty-state">You have not made any picks yet.</div>`;
    return;
  }
  const rows = games.map(g => `
    <tr>
      <td>${g.away} @ ${g.home}</td>
      <td>${state.picks[g.id] ? spreadLabel(g, state.picks[g.id]) : "—"}</td>
      <td>${g.points}</td>
    </tr>`).join("");
  el.innerHTML = `
    <table>
      <thead><tr><th>Game</th><th>Your Pick</th><th>Value</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="padding:16px">
      <strong>Tiebreaker:</strong> Clemson ${state.tiebreak.away || "—"} • LSU ${state.tiebreak.home || "—"}
      &nbsp;&nbsp; <strong>Season pot:</strong> ${state.seasonPot ? "IN" : "OUT"}
    </div>`;
}

function renderAdminGames() {
  document.getElementById("adminGamesBody").innerHTML = games.map(g => `
    <tr>
      <td>${g.away} @ ${g.home}</td>
      <td>${g.spreadTeam} ${g.spread}</td>
      <td>${g.points}</td>
      <td>Published</td>
    </tr>`).join("");
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.view).classList.add("active");
    if (tab.dataset.view === "mypicks") renderMyPicks();
  });
});

document.getElementById("submitPicks").addEventListener("click", () => {
  save();
  if (Object.keys(state.picks).length !== games.length) {
    showToast("Finish all 20 picks first.");
    return;
  }
  if (state.tiebreak.away === "" || state.tiebreak.home === "") {
    showToast("Enter your Game of the Week prediction.");
    return;
  }
  state.submitted = true;
  save();
  renderGames();
  updatePickCount();
  renderMyPicks();
  showToast("Week 1 picks submitted.");
});

document.getElementById("tbAway").value = state.tiebreak.away || "";
document.getElementById("tbHome").value = state.tiebreak.home || "";
document.getElementById("seasonPot").checked = state.seasonPot;
["tbAway","tbHome","seasonPot"].forEach(id => document.getElementById(id).addEventListener("change", save));

document.getElementById("publishBtn").addEventListener("click", () => showToast("Week 1 published in prototype."));
document.getElementById("profileBtn").addEventListener("click", () => showToast("Login/accounts will be added with Firebase."));

renderGames();
renderLeaderboard();
renderResults();
renderAdminGames();
renderMyPicks();
updatePickCount();
