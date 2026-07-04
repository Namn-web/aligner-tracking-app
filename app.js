const STORAGE_KEYS = {
  events: 'kyousei_events',
  goalHours: 'kyousei_goalHours',
  stages: 'kyousei_stages',
  totalAligners: 'kyousei_totalAligners',
  undoStack: 'kyousei_undoStack',
  overrides: 'kyousei_dayOverrides',
  alertMinutes: 'kyousei_alertMinutes',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const REQUIRED_DAYS = 7;
const UNDO_LIMIT = 20;
const HISTORY_DAYS = 10;

const el = {
  setup: document.getElementById('setup'),
  setupOn: document.getElementById('setupOn'),
  setupOff: document.getElementById('setupOff'),
  mainView: document.getElementById('mainView'),
  toggleBtn: document.getElementById('toggleBtn'),
  toggleIcon: document.getElementById('toggleIcon'),
  toggleState: document.getElementById('toggleState'),
  toggleElapsed: document.getElementById('toggleElapsed'),
  todayWorn: document.getElementById('todayWorn'),
  goalLabel: document.getElementById('goalLabel'),
  progressFill: document.getElementById('progressFill'),
  statusMessage: document.getElementById('statusMessage'),
  historyList: document.getElementById('historyList'),
  goalInput: document.getElementById('goalInput'),
  stageAlert: document.getElementById('stageAlert'),
  stageNumber: document.getElementById('stageNumber'),
  stageStartInput: document.getElementById('stageStartInput'),
  stageProgress: document.getElementById('stageProgress'),
  stageEstimate: document.getElementById('stageEstimate'),
  replaceBtn: document.getElementById('replaceBtn'),
  stageChecklist: document.getElementById('stageChecklist'),
  totalAlignersInput: document.getElementById('totalAlignersInput'),
  ringFill: document.getElementById('ringFill'),
  stageDots: document.getElementById('stageDots'),
  stageDeficit: document.getElementById('stageDeficit'),
  undoBtn: document.getElementById('undoBtn'),
  menuBtn: document.getElementById('menuBtn'),
  navMenu: document.getElementById('navMenu'),
  navSettingsBtn: document.getElementById('navSettingsBtn'),
  navQaBtn: document.getElementById('navQaBtn'),
  settingsPage: document.getElementById('settingsPage'),
  settingsBackBtn: document.getElementById('settingsBackBtn'),
  qaPage: document.getElementById('qaPage'),
  qaBackBtn: document.getElementById('qaBackBtn'),
  resetBtn: document.getElementById('resetBtn'),
  wearAlert: document.getElementById('wearAlert'),
  alertInput: document.getElementById('alertInput'),
  notifBtn: document.getElementById('notifBtn'),
  notifStatus: document.getElementById('notifStatus'),
};

function loadEvents() {
  const raw = localStorage.getItem(STORAGE_KEYS.events);
  return raw ? JSON.parse(raw) : [];
}

function saveEvents(events) {
  localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events));
}

function loadGoalHours() {
  const raw = localStorage.getItem(STORAGE_KEYS.goalHours);
  return raw ? Number(raw) : 22;
}

function saveGoalHours(hours) {
  localStorage.setItem(STORAGE_KEYS.goalHours, String(hours));
}

function loadStages() {
  const raw = localStorage.getItem(STORAGE_KEYS.stages);
  return raw ? JSON.parse(raw) : [];
}

function saveStages(value) {
  localStorage.setItem(STORAGE_KEYS.stages, JSON.stringify(value));
}

function loadTotalAligners() {
  const raw = localStorage.getItem(STORAGE_KEYS.totalAligners);
  return raw ? Number(raw) : null;
}

function saveTotalAligners(value) {
  if (value === null) {
    localStorage.removeItem(STORAGE_KEYS.totalAligners);
  } else {
    localStorage.setItem(STORAGE_KEYS.totalAligners, String(value));
  }
}

function loadUndoStack() {
  const raw = localStorage.getItem(STORAGE_KEYS.undoStack);
  return raw ? JSON.parse(raw) : [];
}

function saveUndoStack(stack) {
  localStorage.setItem(STORAGE_KEYS.undoStack, JSON.stringify(stack));
}

function loadOverrides() {
  const raw = localStorage.getItem(STORAGE_KEYS.overrides);
  return raw ? JSON.parse(raw) : {};
}

function saveOverrides(value) {
  localStorage.setItem(STORAGE_KEYS.overrides, JSON.stringify(value));
}

function loadAlertMinutes() {
  const raw = localStorage.getItem(STORAGE_KEYS.alertMinutes);
  return raw !== null ? Number(raw) : 60;
}

function saveAlertMinutes(value) {
  localStorage.setItem(STORAGE_KEYS.alertMinutes, String(value));
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// rangeStart <= t < rangeEnd の間で type === 'on' だった時間(ms)を計算
function wornMsInRange(events, rangeStart, rangeEnd) {
  let total = 0;
  let state = null;
  let idx = 0;

  for (; idx < events.length; idx++) {
    if (events[idx].ts <= rangeStart) {
      state = events[idx].type;
    } else {
      break;
    }
  }

  let cursor = rangeStart;
  for (; idx < events.length && events[idx].ts < rangeEnd; idx++) {
    const ev = events[idx];
    if (state === 'on') total += ev.ts - cursor;
    state = ev.type;
    cursor = ev.ts;
  }
  if (state === 'on') total += rangeEnd - cursor;
  return total;
}

function dateKey(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// その日に手動修正(overrides)があればそれを優先し、なければ装着ログから計算する
function getDayWornMs(dayStart, now) {
  const key = dateKey(dayStart);
  if (Object.prototype.hasOwnProperty.call(overrides, key)) return overrides[key];
  const rangeEnd = Math.min(dayStart + DAY_MS, now);
  return wornMsInRange(events, dayStart, rangeEnd);
}

function toInputValue(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromInputValue(str) {
  return new Date(str).getTime();
}

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ステージ開始後、すでに終わっている「丸1日」の開始時刻一覧を返す
function fullDayStarts(stageStart, now) {
  let firstDay = startOfDay(stageStart);
  if (firstDay < stageStart) firstDay += DAY_MS;
  const days = [];
  let d = firstDay;
  while (d + DAY_MS <= now) {
    days.push(d);
    d += DAY_MS;
  }
  return days;
}

function stageProgress(stage, now) {
  const goalMs = goalHours * 60 * 60 * 1000;
  const days = fullDayStarts(stage.start, now);
  let met = 0;
  let missed = 0;
  days.forEach((dayStart) => {
    const wornMs = getDayWornMs(dayStart, now);
    if (wornMs >= goalMs) met++; else missed++;
  });
  const ready = met >= REQUIRED_DAYS;
  // 残り日数分、毎日目標を達成できた場合の交換目安日（達成済みなら本日）
  const remaining = Math.max(0, REQUIRED_DAYS - met);
  const estimatedTs = startOfDay(now) + remaining * DAY_MS;
  return { met, missed, total: days.length, ready, estimatedTs };
}

// ステージ内の全経過日の累計不足時間(ms)を返す
function getStageCumulativeDeficit(stage, now) {
  const goalMs = goalHours * 60 * 60 * 1000;
  const days = fullDayStarts(stage.start, now);
  let deficit = 0;
  days.forEach((dayStart) => {
    const worn = getDayWornMs(dayStart, now);
    if (worn < goalMs) deficit += goalMs - worn;
  });
  return deficit;
}

function renderStageDots(stage, now) {
  el.stageDots.innerHTML = '';
  const goalMs = goalHours * 60 * 60 * 1000;
  const days = fullDayStarts(stage.start, now);

  for (let i = 0; i < REQUIRED_DAYS; i++) {
    const dot = document.createElement('span');
    dot.className = 'stage-dot';

    if (i < days.length) {
      const wornMs = getDayWornMs(days[i], now);
      if (wornMs >= goalMs) {
        dot.classList.add('met');
        dot.title = `${formatDate(days[i])}: ✓ 達成`;
      } else {
        dot.classList.add('missed');
        dot.title = `${formatDate(days[i])}: 不足 ${formatDuration(goalMs - wornMs)}`;
      }
    } else if (i === days.length) {
      dot.classList.add('today');
      dot.title = '今日（進行中）';
    } else {
      dot.classList.add('future');
    }

    el.stageDots.appendChild(dot);
  }
}

function formatDuration(ms) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}分`;
  return `${h}時間${m}分`;
}

let events = loadEvents();
let goalHours = loadGoalHours();
let stages = loadStages();
let totalAligners = loadTotalAligners();
let undoStack = loadUndoStack();
let overrides = loadOverrides();
let alertMinutes = loadAlertMinutes();
let lastAlertTs = 0; // メモリのみ（ページ再読込でリセット）

// 既存ユーザー向け：装着ログはあるがステージ未設定の場合、初回ログを1枚目の開始とする
if (stages.length === 0 && events.length > 0) {
  stages = [{ start: events[0].ts, end: null }];
  saveStages(stages);
}

function currentStage() {
  return stages.length ? stages[stages.length - 1] : null;
}

// 操作前の状態を保存しておき、「元に戻す」で復元できるようにする
function pushUndo() {
  undoStack.push({
    events: JSON.parse(JSON.stringify(events)),
    stages: JSON.parse(JSON.stringify(stages)),
    goalHours,
    totalAligners,
    overrides: JSON.parse(JSON.stringify(overrides)),
  });
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  saveUndoStack(undoStack);
}

function undo() {
  if (undoStack.length === 0) return;
  const snap = undoStack.pop();
  saveUndoStack(undoStack);
  events = snap.events;
  stages = snap.stages;
  goalHours = snap.goalHours;
  totalAligners = snap.totalAligners;
  overrides = snap.overrides || {};
  saveEvents(events);
  saveStages(stages);
  saveGoalHours(goalHours);
  saveTotalAligners(totalAligners);
  saveOverrides(overrides);
  el.goalInput.value = goalHours;
  el.totalAlignersInput.value = totalAligners || '';
  render();
}

function resetAll() {
  if (!confirm('保存されているすべてのデータを削除します。よろしいですか？')) return;
  pushUndo();
  events = [];
  stages = [];
  goalHours = 22;
  totalAligners = null;
  overrides = {};
  saveEvents(events);
  saveStages(stages);
  saveGoalHours(goalHours);
  saveTotalAligners(totalAligners);
  saveOverrides(overrides);
  el.goalInput.value = goalHours;
  el.totalAlignersInput.value = '';
  render();
}

function notifPermissionLabel() {
  if (!('Notification' in window)) return '（この環境では通知非対応）';
  if (Notification.permission === 'granted') return '✅ 通知許可済み';
  if (Notification.permission === 'denied') return '❌ ブロック済み（ブラウザ設定から変更してください）';
  return '未許可';
}

function requestNotifPermission() {
  if (!('Notification' in window)) return;
  Notification.requestPermission().then(() => {
    el.notifStatus.textContent = notifPermissionLabel();
  });
}

function fireNotification(offDurationMs) {
  if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('マウスピース管理', {
      body: `${formatDuration(offDurationMs)}外しています。そろそろ着けましょう！`,
      icon: 'icon.svg',
    });
  }
}

// 外している時間がアラート設定値を超えたら通知（クールタイム：設定値と同じ間隔）
function checkWearAlert(now) {
  const state = currentState();

  if (state !== 'off') {
    lastAlertTs = 0;
    el.wearAlert.classList.add('hidden');
    el.wearAlert.textContent = '';
    return;
  }

  const lastOffEvent = events[events.length - 1];
  if (!lastOffEvent) return;
  const offMs = now - lastOffEvent.ts;
  const alertMs = alertMinutes > 0 ? alertMinutes * 60 * 1000 : 0;

  if (alertMs > 0 && offMs >= alertMs) {
    el.wearAlert.classList.remove('hidden');
    el.wearAlert.textContent = `⚠️ ${formatDuration(offMs)}外しています！そろそろ着けましょう`;

    const cooldown = alertMs;
    if (now - lastAlertTs >= cooldown) {
      lastAlertTs = now;
      fireNotification(offMs);
    }
  } else {
    el.wearAlert.classList.add('hidden');
    el.wearAlert.textContent = '';
  }
}

function currentState() {
  if (events.length === 0) return null;
  return events[events.length - 1].type;
}

function render() {
  const now = Date.now();
  const state = currentState();

  el.undoBtn.classList.toggle('hidden', undoStack.length === 0);

  if (state === null) {
    el.setup.classList.remove('hidden');
    el.mainView.classList.add('hidden');
    return;
  }

  el.setup.classList.add('hidden');
  el.mainView.classList.remove('hidden');

  // トグルボタン
  const isOn = state === 'on';
  el.toggleBtn.classList.toggle('off-state', !isOn);
  el.toggleBtn.classList.toggle('on-state', isOn);
  el.toggleIcon.textContent = isOn ? '🦷' : '✋';
  el.toggleState.textContent = isOn ? '装着中' : '外している';
  const lastTs = events[events.length - 1].ts;
  el.toggleElapsed.textContent = `${formatDuration(now - lastTs)}経過`;

  // 今日の装着時間
  const todayStart = startOfDay(now);
  const wornMs = getDayWornMs(todayStart, now);
  el.todayWorn.textContent = formatDuration(wornMs);
  el.goalLabel.textContent = `${goalHours}時間`;

  const goalMs = goalHours * 60 * 60 * 1000;
  const goalMet = wornMs >= goalMs;
  const pct = Math.min(100, (wornMs / goalMs) * 100);
  el.progressFill.style.width = `${pct}%`;
  el.progressFill.classList.toggle('done', goalMet);

  // 円形プログレスリング
  const circumference = 691.2;
  el.ringFill.style.strokeDashoffset = circumference * (1 - pct / 100);
  el.ringFill.classList.toggle('done', goalMet);

  const remMs = goalMs - wornMs;
  if (goalMet) {
    el.statusMessage.textContent = '今日の目標を達成しました！🎉';
    el.statusMessage.className = 'status-message achieved';
  } else if (!isOn) {
    el.statusMessage.textContent = `不足 ${formatDuration(remMs)} — そろそろ着けましょう`;
    el.statusMessage.className = 'status-message deficit';
  } else {
    el.statusMessage.textContent = `あと${formatDuration(remMs)}で達成`;
    el.statusMessage.className = 'status-message deficit';
  }

  renderHistory(now);
  renderStage(now);
  renderChecklist();
  checkWearAlert(now);
  el.notifStatus.textContent = notifPermissionLabel();
}

function renderStage(now) {
  const stage = currentStage();
  if (!stage) return;

  el.stageNumber.textContent = totalAligners
    ? `${stages.length}枚目 / 全${totalAligners}枚`
    : `${stages.length}枚目`;

  el.stageStartInput.value = toInputValue(stage.start);

  const progress = stageProgress(stage, now);
  el.stageProgress.textContent =
    `${progress.met}/${REQUIRED_DAYS}日達成` +
    (progress.missed > 0 ? `（未達成${progress.missed}日）` : '');

  renderStageDots(stage, now);

  const deficit = getStageCumulativeDeficit(stage, now);
  if (deficit > 0) {
    el.stageDeficit.textContent = `ステージ累計不足: ${formatDuration(deficit)}`;
    el.stageDeficit.className = 'stage-deficit has-deficit';
  } else {
    el.stageDeficit.textContent = progress.total > 0 ? '不足なし ✓' : '';
    el.stageDeficit.className = 'stage-deficit';
  }

  el.stageEstimate.textContent = progress.ready
    ? `交換目安日: 本日（${formatDate(progress.estimatedTs)}）`
    : `交換目安日: ${formatDate(progress.estimatedTs)}（このペースで目標を達成できた場合）`;

  el.stageAlert.classList.remove('hidden', 'ready', 'extended');
  if (progress.ready) {
    el.stageAlert.classList.add('ready');
    el.stageAlert.textContent = '✅ 交換予定日です。新しいマウスピースに交換しましょう';
  } else if (progress.missed > 0) {
    el.stageAlert.classList.add('extended');
    el.stageAlert.textContent = `⚠️ 目標未達成の日が${progress.missed}日あり、交換が延長になっています`;
  } else {
    el.stageAlert.classList.add('hidden');
    el.stageAlert.textContent = '';
  }
}

function renderChecklist() {
  el.stageChecklist.innerHTML = '';
  const slots = Math.max(stages.length, totalAligners || 0);

  for (let i = 0; i < slots; i++) {
    const stage = stages[i];
    const li = document.createElement('li');

    const icon = document.createElement('span');
    icon.className = 'checklist-icon';

    const label = document.createElement('span');
    label.textContent = `${i + 1}枚目`;

    const range = document.createElement('span');
    range.className = 'checklist-range';

    if (stage && stage.end) {
      li.classList.add('done');
      icon.textContent = '✅';
      range.textContent = `${formatDate(stage.start)}〜${formatDate(stage.end)}`;
    } else if (stage) {
      li.classList.add('current');
      icon.textContent = '●';
      range.textContent = `${formatDate(stage.start)}〜（進行中）`;
    } else {
      li.classList.add('future');
      icon.textContent = '○';
      range.textContent = '未着手';
    }

    li.appendChild(icon);
    li.appendChild(label);
    li.appendChild(range);
    el.stageChecklist.appendChild(li);
  }
}

function renderHistory(now) {
  el.historyList.innerHTML = '';
  const goalMs = goalHours * 60 * 60 * 1000;
  const todayStart = startOfDay(now);

  for (let i = 0; i < HISTORY_DAYS; i++) {
    const dayStart = todayStart - i * DAY_MS;
    const wornMs = getDayWornMs(dayStart, now);

    const d = new Date(dayStart);
    const label = i === 0 ? '今日' : `${d.getMonth() + 1}/${d.getDate()}`;

    const li = document.createElement('li');
    if (wornMs >= goalMs) li.classList.add('goal-met');

    const dateSpan = document.createElement('span');
    dateSpan.className = 'history-date';
    dateSpan.textContent = label;

    const valueWrap = document.createElement('span');
    valueWrap.className = 'history-value';

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'history-input';
    input.min = '0';
    input.max = '24';
    input.step = '0.5';
    input.value = Math.round((wornMs / (60 * 60 * 1000)) * 10) / 10;
    input.addEventListener('change', () => {
      pushUndo();
      const key = dateKey(dayStart);
      if (input.value === '') {
        delete overrides[key];
      } else {
        const hours = Math.max(0, Math.min(24, Number(input.value)));
        overrides[key] = Math.round(hours * 60 * 60 * 1000);
      }
      saveOverrides(overrides);
      render();
    });

    const unitSpan = document.createElement('span');
    unitSpan.className = 'history-unit';
    unitSpan.textContent = '時間';

    valueWrap.appendChild(input);
    valueWrap.appendChild(unitSpan);

    // 過去日のみバッジ表示（今日は進行中のため除外）
    if (i > 0) {
      const badge = document.createElement('span');
      if (wornMs >= goalMs) {
        badge.className = 'history-badge ok';
        badge.textContent = '✓';
      } else {
        const defMs = goalMs - wornMs;
        badge.className = 'history-badge miss';
        badge.textContent = `−${formatDuration(defMs)}`;
      }
      valueWrap.appendChild(badge);
    }

    li.appendChild(dateSpan);
    li.appendChild(valueWrap);
    el.historyList.appendChild(li);
  }
}

function toggle() {
  const state = currentState();
  const nextType = state === 'on' ? 'off' : 'on';
  if (nextType === 'on' && !confirm('歯磨きをしましたか？\n歯磨き後にマウスピースを装着してください。')) {
    return;
  }
  pushUndo();
  events.push({ type: nextType, ts: Date.now() });
  saveEvents(events);
  render();
}

function setup(initialType) {
  pushUndo();
  events = [{ type: initialType, ts: Date.now() }];
  saveEvents(events);
  stages = [{ start: Date.now(), end: null }];
  saveStages(stages);
  render();
}

function replaceStage() {
  pushUndo();
  const now = Date.now();
  const stage = currentStage();
  stage.end = now;
  saveStages(stages);
  stages.push({ start: now, end: null });
  saveStages(stages);
  render();
}

el.setupOn.addEventListener('click', () => setup('on'));
el.setupOff.addEventListener('click', () => setup('off'));
el.toggleBtn.addEventListener('click', toggle);
el.replaceBtn.addEventListener('click', replaceStage);
el.undoBtn.addEventListener('click', undo);
el.resetBtn.addEventListener('click', resetAll);
el.menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  el.navMenu.classList.toggle('open');
});

el.navSettingsBtn.addEventListener('click', () => {
  el.navMenu.classList.remove('open');
  el.settingsPage.classList.add('open');
});

el.navQaBtn.addEventListener('click', () => {
  el.navMenu.classList.remove('open');
  el.qaPage.classList.add('open');
});

el.settingsBackBtn.addEventListener('click', () => el.settingsPage.classList.remove('open'));
el.qaBackBtn.addEventListener('click', () => el.qaPage.classList.remove('open'));

// メニュー外クリックで閉じる
document.addEventListener('click', () => el.navMenu.classList.remove('open'));

// Q&Aアコーディオン
document.querySelectorAll('.qa-question').forEach((btn) => {
  btn.addEventListener('click', () => btn.parentElement.classList.toggle('open'));
});

el.stageStartInput.addEventListener('change', () => {
  const stage = currentStage();
  const ts = fromInputValue(el.stageStartInput.value);
  if (stage && ts) {
    pushUndo();
    stage.start = ts;
    saveStages(stages);
    render();
  }
});

el.totalAlignersInput.value = totalAligners || '';
el.totalAlignersInput.addEventListener('change', () => {
  pushUndo();
  const val = el.totalAlignersInput.value;
  totalAligners = val ? Number(val) : null;
  saveTotalAligners(totalAligners);
  render();
});

el.goalInput.value = goalHours;
el.goalInput.addEventListener('change', () => {
  const val = Number(el.goalInput.value);
  if (val >= 1 && val <= 24) {
    pushUndo();
    goalHours = val;
    saveGoalHours(goalHours);
    render();
  }
});

el.alertInput.value = alertMinutes > 0 ? alertMinutes : '';
el.alertInput.addEventListener('change', () => {
  const val = Number(el.alertInput.value);
  alertMinutes = val >= 0 ? val : 60;
  saveAlertMinutes(alertMinutes);
  lastAlertTs = 0;
  render();
});

el.notifBtn.addEventListener('click', requestNotifPermission);

render();
setInterval(render, 30000);

// 以前のバージョンで登録したservice workerが古い画面をキャッシュし続けるのを防ぐ
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}
if ('caches' in window) {
  caches.keys().then((keys) => {
    keys.forEach((k) => caches.delete(k));
  });
}
