const cards = [
  ["0","æ„šè€…","â™¢"],["I","é­”æœ¯å¸ˆ","âœ¦"],["II","å¥³ç¥­å¸","â˜¾"],["III","çš‡åŽ","â€"],["IV","çš‡å¸","â™œ"],["V","æ•™çš‡","â™™"],
  ["VI","æ‹äºº","â™¡"],["VII","æˆ˜è½¦","â™ž"],["VIII","åŠ›é‡","âˆž"],["IX","éšè€…","âŒ"],["X","å‘½è¿ä¹‹è½®","â˜¸"],["XI","æ­£ä¹‰","âš–"],
  ["XII","å€’åŠäºº","â™†"],["XIII","æ­»ç¥ž","â™ "],["XIV","èŠ‚åˆ¶","âš—"],["XV","æ¶é­”","â™‘"],["XVI","é«˜å¡”","ÏŸ"],["XVII","æ˜Ÿæ˜Ÿ","â˜†"],
  ["XVIII","æœˆäº®","â˜½"],["XIX","å¤ªé˜³","â˜€"],["XX","å®¡åˆ¤","â™¬"],["XXI","ä¸–ç•Œ","â—Ž"]
];
const spreadInfo = {
  single: { count: 1, positions: ["æ ¸å¿ƒæŒ‡å¼•"] },
  timeline: { count: 3, positions: ["è¿‡åŽ»", "çŽ°åœ¨", "è¶‹åŠ¿"] },
  love: { count: 3, positions: ["ä½ ", "å¯¹æ–¹", "å…³ç³»"] },
  career: { count: 3, positions: ["çŽ°çŠ¶", "é˜»åŠ›", "è¡ŒåŠ¨"] }
};
const state = { spread: "timeline", question: "", selected: [], revealed: 0 };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const remoteConfig = window.TAROT_CONFIG || {};
const apiBaseUrl = String(remoteConfig.apiBaseUrl || "").replace(/\/$/, "");
let inviteCode = sessionStorage.getItem("tarot_invite") || "";
let inviteResolver = null;

function apiUrl(path) { return `${apiBaseUrl}${path}`; }

function requestInvite(message = "") {
  $("#inviteError").textContent = message;
  $("#inviteInput").value = "";
  $("#inviteModal").classList.add("open");
  $("#inviteModal").setAttribute("aria-hidden", "false");
  setTimeout(() => $("#inviteInput").focus(), 50);
  return new Promise((resolve) => { inviteResolver = resolve; });
}

$("#inviteForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const value = $("#inviteInput").value.trim();
  if (!value) { $("#inviteError").textContent = "è¯·è¾“å…¥é‚€è¯·ç "; return; }
  inviteCode = value;
  sessionStorage.setItem("tarot_invite", value);
  $("#inviteModal").classList.remove("open");
  $("#inviteModal").setAttribute("aria-hidden", "true");
  const resolve = inviteResolver;
  inviteResolver = null;
  if (resolve) resolve(value);
});

function show(id) {
  $$(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$('[data-next]').forEach((button) => button.addEventListener("click", () => show(button.dataset.next)));
$$('.spread-card').forEach((button) => button.addEventListener("click", () => {
  state.spread = button.dataset.spread;
  $$('.spread-card').forEach((item) => item.classList.toggle("selected", item === button));
  setTimeout(() => show("questionScreen"), 260);
}));

$("#question").addEventListener("input", (event) => { $("#counter").textContent = `${event.target.value.length} / 240`; });
$("#toShuffle").addEventListener("click", () => {
  state.question = $("#question").value.trim();
  if (state.question.length < 2) { $("#question").focus(); $("#question").animate([{transform:"translateX(-7px)"},{transform:"translateX(7px)"},{transform:"none"}],{duration:260}); return; }
  show("shuffleScreen");
});

$("#deckStack").addEventListener("click", () => {
  const deck = $("#deckStack");
  if (deck.classList.contains("shuffling")) return;
  deck.classList.add("shuffling");
  $("#shuffleStatus").textContent = "è®©å¿µå¤´æ…¢æ…¢æ²‰é™â€¦â€¦";
  setTimeout(() => { $("#shuffleStatus").textContent = "ç‰Œé˜µå·²ç»å‡†å¤‡å¥½"; }, 1150);
  setTimeout(() => { deck.classList.remove("shuffling"); buildFan(); show("drawScreen"); }, 1950);
});

function buildFan() {
  state.selected = []; state.revealed = 0;
  const fan = $("#fan"); fan.innerHTML = "";
  const total = 17;
  for (let i = 0; i < total; i++) {
    const button = document.createElement("button");
    button.className = "fan-card";
    const angle = -42 + i * (84 / (total - 1));
    const x = (i - (total - 1) / 2) * 18;
    button.style.transform = `translateX(calc(-50% + ${x}px)) rotate(${angle}deg)`;
    button.addEventListener("click", () => chooseCard(button));
    fan.appendChild(button);
  }
  updateDrawProgress();
  $("#revealButton").classList.add("hidden");
}

function chooseCard(button) {
  const info = spreadInfo[state.spread];
  if (state.selected.length >= info.count || button.classList.contains("chosen")) return;
  const usedNames = new Set(state.selected.map((item) => item.name));
  const pool = cards.filter((item) => !usedNames.has(item[1]));
  const picked = pool[Math.floor(Math.random() * pool.length)];
  state.selected.push({ number: picked[0], name: picked[1], symbol: picked[2], orientation: Math.random() < .28 ? "reversed" : "upright", position: info.positions[state.selected.length] });
  button.classList.add("chosen");
  updateDrawProgress();
  if (state.selected.length === info.count) $("#revealButton").classList.remove("hidden");
}

function updateDrawProgress() {
  const count = spreadInfo[state.spread].count;
  $("#drawCount").textContent = `å·²é€‰æ‹© ${state.selected.length} / ${count}`;
  $("#drawBar").style.width = `${state.selected.length / count * 100}%`;
}

$("#revealButton").addEventListener("click", () => { buildReveal(); show("revealScreen"); });
function buildReveal() {
  const grid = $("#revealedGrid"); grid.innerHTML = ""; state.revealed = 0;
  $("#interpretButton").classList.add("hidden");
  state.selected.forEach((card) => {
    const wrap = document.createElement("div"); wrap.className = "reveal-wrap";
    wrap.innerHTML = `<div class="reveal-card"><div class="face back"></div><div class="face front"><span class="card-number">${card.number}</span><div class="card-art">${card.symbol}</div><strong class="card-name">${card.name}</strong><span class="orientation">${card.orientation === "reversed" ? "é€†ä½" : "æ­£ä½"}</span></div></div><span class="card-position">${card.position}</span>`;
    const reveal = wrap.querySelector(".reveal-card");
    reveal.addEventListener("click", () => {
      if (reveal.classList.contains("open")) return;
      reveal.classList.add("open"); state.revealed++;
      if (state.revealed === state.selected.length) setTimeout(() => $("#interpretButton").classList.remove("hidden"), 700);
    });
    grid.appendChild(wrap);
  });
}

$("#interpretButton").addEventListener("click", requestReading);
async function requestReading() {
  if (remoteConfig.inviteRequired && !inviteCode) await requestInvite();
  show("waitingScreen");
  const phases = ["å›žæœ›ä½ çš„é—®é¢˜â€¦â€¦", "æ„Ÿå—æ¯å¼ ç‰Œçš„ä½ç½®â€¦â€¦", "è¿žæŽ¥ç‰Œä¸Žç‰Œä¹‹é—´çš„çº¿ç´¢â€¦â€¦", "å°†è±¡å¾æ•´ç†æˆå¯ä»¥å¸¦èµ°çš„è¯â€¦â€¦"];
  let phase = 0;
  const timer = setInterval(() => { phase = (phase + 1) % phases.length; $("#waitingText").textContent = phases[phase]; }, 1800);
  try {
    let response = await fetch(apiUrl("/api/reading"), { method: "POST", headers: { "Content-Type": "application/json", "X-Tarot-Invite": inviteCode }, body: JSON.stringify({ spread: state.spread, question: state.question, cards: state.selected }) });
    if (response.status === 401 && remoteConfig.inviteRequired) {
      sessionStorage.removeItem("tarot_invite");
      inviteCode = "";
      await requestInvite("é‚€è¯·ç ä¸æ­£ç¡®ï¼Œè¯·é‡æ–°è¾“å…¥");
      response = await fetch(apiUrl("/api/reading"), { method: "POST", headers: { "Content-Type": "application/json", "X-Tarot-Invite": inviteCode }, body: JSON.stringify({ spread: state.spread, question: state.question, cards: state.selected }) });
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "è§£è¯»è¯·æ±‚å¤±è´¥");
    renderReading(data);
  } catch (error) {
    renderReading({ text: `æš‚æ—¶æ— æ³•è¿žæŽ¥è§£è¯»æœåŠ¡ã€‚\n\n${error.message}\n\nè¯·ç¨åŽé‡æ–°å°è¯•ã€‚`, notice: "å½“å‰ä»…ç½‘é¡µå¯ç”¨ï¼Œè§£è¯»åŽç«¯æœªè¿žæŽ¥ã€‚" });
  } finally { clearInterval(timer); }
}

function formatOffline(data) {
  if (data.text) return data.text;
  return `${data.summary}\n\n${data.cards.join("\n\n")}\n\nè¡ŒåŠ¨å»ºè®®\n${data.guidance}\n\nç•™ç»™ä½ çš„é—®é¢˜\n${data.reflection}`;
}
function renderReading(data) {
  $("#miniCards").innerHTML = state.selected.map((card) => `<span>${card.position} Â· ${card.name}${card.orientation === "reversed" ? "é€†" : "æ­£"}</span>`).join("");
  const text = formatOffline(data);
  const reading = $("#reading"); reading.textContent = "";
  $("#notice").textContent = data.notice || (data.source === "codex"
    ? "æœ¬æ¬¡è§£è¯»ç”±ä½ ç”µè„‘ä¸Šçš„æœ¬æœº Codex ç”Ÿæˆï¼Œå¹¶å·²å»ºç«‹ç‹¬ç«‹ Codex Chatã€‚"
    : "æœ¬æ¬¡ä¸ºæœ¬åœ°è§„åˆ™æ¼”ç¤ºè§£è¯»ï¼Œæœªè°ƒç”¨ Codexã€‚");
  show("resultScreen");
  let index = 0;
  const type = setInterval(() => { reading.textContent += text.slice(index, index + 3); index += 3; if (index >= text.length) clearInterval(type); }, 12);
}

$("#againButton").addEventListener("click", () => { $("#question").value = ""; $("#counter").textContent = "0 / 240"; state.selected = []; show("spreadScreen"); });
$("#copyButton").addEventListener("click", async () => { await navigator.clipboard.writeText($("#reading").textContent); $("#copyButton").textContent = "å·²å¤åˆ¶"; setTimeout(() => $("#copyButton").textContent = "å¤åˆ¶è§£è¯»", 1500); });
$("#soundToggle").addEventListener("click", (event) => { const on = event.currentTarget.getAttribute("aria-pressed") !== "true"; event.currentTarget.setAttribute("aria-pressed", String(on)); event.currentTarget.textContent = on ? "â™ª" : "â™«"; });
