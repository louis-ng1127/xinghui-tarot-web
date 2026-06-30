const cards = [
  ["0","愚者 · The Fool","♢"],["I","魔术师 · The Magician","✦"],["II","女祭司 · The High Priestess","☾"],["III","皇后 · The Empress","❀"],["IV","皇帝 · The Emperor","♜"],["V","教皇 · The Hierophant","♙"],
  ["VI","恋人 · The Lovers","♡"],["VII","战车 · The Chariot","♞"],["VIII","力量 · Strength","∞"],["IX","隐者 · The Hermit","⌁"],["X","命运之轮 · Wheel of Fortune","☸"],["XI","正义 · Justice","⚖"],
  ["XII","倒吊人 · The Hanged Man","♆"],["XIII","死神 · Death","♠"],["XIV","节制 · Temperance","⚗"],["XV","恶魔 · The Devil","♑"],["XVI","高塔 · The Tower","ϟ"],["XVII","星星 · The Star","☆"],
  ["XVIII","月亮 · The Moon","☽"],["XIX","太阳 · The Sun","☀"],["XX","审判 · Judgement","♬"],["XXI","世界 · The World","◎"]
];
const spreadInfo = {
  single: { count: 1, positions: ["核心指引 · Core Guidance"] },
  timeline: { count: 3, positions: ["过去 · Past", "现在 · Present", "趋势 · Direction"] },
  love: { count: 3, positions: ["你 · You", "对方 · Them", "关系 · Connection"] },
  career: { count: 3, positions: ["现状 · Present", "阻力 · Obstacle", "行动 · Action"] }
};
const state = { spread: "timeline", question: "", selected: [], revealed: 0 };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const remoteConfig = window.TAROT_CONFIG || {};
const apiBaseUrl = String(remoteConfig.apiBaseUrl || "").replace(/\/$/, "");
let inviteCode = sessionStorage.getItem("tarot_invite") || "";
let inviteResolver = null;

const soundscape = {
  ctx: null, master: null, ambient: null, wind: null, drone: [], enabled: false, bellTimer: null,
  ensure() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.0001;
    this.master.connect(this.ctx.destination);

    this.ambient = this.ctx.createGain();
    this.ambient.gain.value = 0.7;
    this.ambient.connect(this.master);
    [43, 64.5].forEach((frequency, index) => {
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      oscillator.type = index ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.value = index ? 0.018 : 0.026;
      oscillator.connect(gain).connect(this.ambient);
      oscillator.start();
      this.drone.push(oscillator);
    });

    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 4, this.ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) channel[i] = (Math.random() * 2 - 1) * (0.55 + 0.45 * Math.sin(i / 19000));
    const noise = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const windGain = this.ctx.createGain();
    noise.buffer = buffer; noise.loop = true;
    filter.type = "lowpass"; filter.frequency.value = 420; filter.Q.value = 0.7;
    windGain.gain.value = 0.018;
    noise.connect(filter).connect(windGain).connect(this.ambient);
    noise.start(); this.wind = noise;
  },
  async toggle() {
    this.ensure();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.enabled = !this.enabled;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(this.master.gain.value, 0.0001), now);
    this.master.gain.exponentialRampToValueAtTime(this.enabled ? 0.32 : 0.0001, now + 0.8);
    if (this.enabled) {
      this.bell();
      this.bellTimer = setInterval(() => this.bell(), 15000);
    } else {
      clearInterval(this.bellTimer); this.bellTimer = null;
    }
  },
  tone(frequency = 220, duration = 0.35, gainValue = 0.08, type = "sine", endFrequency = null) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now); oscillator.stop(now + duration + 0.03);
  },
  noise(duration = 0.35, gainValue = 0.04, frequency = 1200) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * duration), this.ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = buffer; filter.type = "bandpass"; filter.frequency.value = frequency; filter.Q.value = 0.8;
    gain.gain.setValueAtTime(gainValue, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(this.master); source.start(now);
  },
  bell() {
    if (!this.enabled) return;
    this.tone(174, 3.8, 0.045, "sine");
    this.tone(261, 3.2, 0.022, "sine");
    this.tone(348, 2.7, 0.012, "sine");
  },
  click() { this.tone(190, 0.12, 0.045, "triangle", 135); },
  shuffle() { this.noise(1.1, 0.075, 1450); this.tone(82, 1.2, 0.035, "sine", 58); },
  select() { this.tone(294, 0.45, 0.065, "sine", 196); },
  reveal() { this.noise(0.42, 0.055, 900); this.tone(130, 0.9, 0.07, "triangle", 390); }
};

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
  if (!value) { $("#inviteError").textContent = "请输入邀请码 / Please enter the invite code"; return; }
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
  soundscape.shuffle();
  $("#shuffleStatus").textContent = "让念头慢慢沉静…… / Let your thoughts settle…";
  setTimeout(() => { $("#shuffleStatus").textContent = "牌阵已经准备好 / The spread is ready"; }, 1150);
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
  soundscape.select();
  button.classList.add("chosen");
  updateDrawProgress();
  if (state.selected.length === info.count) $("#revealButton").classList.remove("hidden");
}

function updateDrawProgress() {
  const count = spreadInfo[state.spread].count;
  $("#drawCount").textContent = `已选择 · Selected ${state.selected.length} / ${count}`;
  $("#drawBar").style.width = `${state.selected.length / count * 100}%`;
}

$("#revealButton").addEventListener("click", () => { buildReveal(); show("revealScreen"); });
function buildReveal() {
  const grid = $("#revealedGrid"); grid.innerHTML = ""; state.revealed = 0;
  $("#interpretButton").classList.add("hidden");
  state.selected.forEach((card) => {
    const wrap = document.createElement("div"); wrap.className = "reveal-wrap";
    wrap.innerHTML = `<div class="reveal-card"><div class="face back"></div><div class="face front"><span class="card-number">${card.number}</span><div class="card-art">${card.symbol}</div><strong class="card-name">${card.name}</strong><span class="orientation">${card.orientation === "reversed" ? "逆位 · Reversed" : "正位 · Upright"}</span></div></div><span class="card-position">${card.position}</span>`;
    const reveal = wrap.querySelector(".reveal-card");
    reveal.addEventListener("click", () => {
      if (reveal.classList.contains("open")) return;
      soundscape.reveal();
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
  const phases = ["回望你的问题…… / Returning to your question…", "感受每张牌的位置…… / Sensing each card's place…", "连接牌与牌之间的线索…… / Connecting the signs…", "将象征整理成可以带走的话…… / Shaping symbols into guidance…"];
  let phase = 0;
  const timer = setInterval(() => { phase = (phase + 1) % phases.length; $("#waitingText").textContent = phases[phase]; }, 1800);
  try {
    let response = await fetch(apiUrl("/api/reading"), { method: "POST", headers: { "Content-Type": "application/json", "X-Tarot-Invite": inviteCode }, body: JSON.stringify({ spread: state.spread, question: state.question, cards: state.selected }) });
    if (response.status === 401 && remoteConfig.inviteRequired) {
      sessionStorage.removeItem("tarot_invite");
      inviteCode = "";
      await requestInvite("邀请码不正确，请重新输入 / Incorrect code, please try again");
      response = await fetch(apiUrl("/api/reading"), { method: "POST", headers: { "Content-Type": "application/json", "X-Tarot-Invite": inviteCode }, body: JSON.stringify({ spread: state.spread, question: state.question, cards: state.selected }) });
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "解读请求失败 / Reading request failed");
    renderReading(data);
  } catch (error) {
    renderReading({ text: `暂时无法连接解读服务。 / The reading service is temporarily unavailable.\n\n${error.message}\n\n请稍后重新尝试。 / Please try again later.`, notice: "当前仅网页可用，解读后端未连接。 / The page is online, but the reading service is offline." });
  } finally { clearInterval(timer); }
}

function formatOffline(data) {
  if (data.text) return data.text;
  return `${data.summary}\n\n${data.cards.join("\n\n")}\n\n行动建议 · Action Guidance\n${data.guidance}\n\n留给你的问题 · A Question for You\n${data.reflection}`;
}
function renderReading(data) {
  $("#miniCards").innerHTML = state.selected.map((card) => `<span>${card.position} · ${card.name}${card.orientation === "reversed" ? "逆" : "正"}</span>`).join("");
  const text = formatOffline(data);
  const reading = $("#reading"); reading.textContent = "";
  $("#notice").textContent = data.notice || (data.source === "codex"
    ? "本次解读由你电脑上的本机 Codex 生成，并已建立独立 Codex Chat。 / Generated by Codex on your computer in a separate Codex Chat."
    : "本次为本地规则演示解读，未调用 Codex。 / Local demonstration only; Codex was not used.");
  show("resultScreen");
  let index = 0;
  const type = setInterval(() => { reading.textContent += text.slice(index, index + 3); index += 3; if (index >= text.length) clearInterval(type); }, 12);
}

$("#againButton").addEventListener("click", () => { $("#question").value = ""; $("#counter").textContent = "0 / 240"; state.selected = []; show("spreadScreen"); });
$("#copyButton").addEventListener("click", async () => { await navigator.clipboard.writeText($("#reading").textContent); $("#copyButton").textContent = "已复制 · Copied"; setTimeout(() => $("#copyButton").textContent = "复制解读 · Copy", 1500); });
$("#soundToggle").addEventListener("click", async (event) => {
  await soundscape.toggle();
  const on = soundscape.enabled;
  event.currentTarget.setAttribute("aria-pressed", String(on));
  event.currentTarget.classList.toggle("sound-on", on);
  event.currentTarget.textContent = on ? "♪" : "♫";
  event.currentTarget.title = on ? "关闭音乐与音效 / Mute" : "开启音乐与音效 / Sound on";
});
$$('button:not(#soundToggle)').forEach((button) => button.addEventListener("click", () => soundscape.click()));
