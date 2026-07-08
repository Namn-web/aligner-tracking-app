const STORAGE_KEYS = {
  events: 'kyousei_events',
  goalHours: 'kyousei_goalHours',
  stages: 'kyousei_stages',
  totalAligners: 'kyousei_totalAligners',
  undoStack: 'kyousei_undoStack',
  overrides: 'kyousei_dayOverrides',
  alertMinutes: 'kyousei_alertMinutes',
  replaceCycle: 'kyousei_replaceCycle',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const UNDO_LIMIT = 20;
const HISTORY_DAYS = 10;
const SESSION_LOG_LIMIT = 30;

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
  historyLabel: document.getElementById('historyLabel'),
  historyFrom: document.getElementById('historyFrom'),
  historyTo: document.getElementById('historyTo'),
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
  bottomNav: document.getElementById('bottomNav'),
  tabPages: document.querySelectorAll('.tab-page'),
  tabSettings: document.getElementById('tabSettings'),
  resetBtn: document.getElementById('resetBtn'),
  wearAlert: document.getElementById('wearAlert'),
  alertInput: document.getElementById('alertInput'),
  notifBtn: document.getElementById('notifBtn'),
  notifStatus: document.getElementById('notifStatus'),
  cycleBtns: document.querySelectorAll('.replace-cycle-btn'),
  sessionTabs: document.querySelectorAll('.session-tab'),
  sessionLogList: document.getElementById('sessionLogList'),
  pastStagesList: document.getElementById('pastStagesList'),
  addPastStageBtn: document.getElementById('addPastStageBtn'),
  savePastStagesBtn: document.getElementById('savePastStagesBtn'),
  toast: document.getElementById('toast'),
};

let toastTimer = null;
function hideToast() {
  el.toast.classList.remove('show');
  clearTimeout(toastTimer);
}

function showToast(message, opts = {}) {
  el.toast.innerHTML = '';

  const text = document.createElement('span');
  text.className = 'toast-message';
  text.textContent = message;
  el.toast.appendChild(text);

  if (opts.undo) {
    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className = 'toast-undo-btn';
    undoBtn.textContent = '元に戻す';
    undoBtn.addEventListener('click', undo);
    el.toast.appendChild(undoBtn);
  }

  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, opts.undo ? 4500 : 1800);
}

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

function loadReplaceCycle() {
  const v = Number(localStorage.getItem(STORAGE_KEYS.replaceCycle));
  return [7, 8, 9, 10].includes(v) ? v : 7;
}

function saveReplaceCycle(v) {
  localStorage.setItem(STORAGE_KEYS.replaceCycle, String(v));
}

let replaceCycle = loadReplaceCycle();

function syncCycleBtns() {
  el.cycleBtns.forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.days) === replaceCycle);
  });
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
// ただし今日は装着中でライブ集計中のため、上書き値があっても常にログから計算する
function getDayWornMs(dayStart, now) {
  const key = dateKey(dayStart);
  const isToday = dayStart === startOfDay(now);
  if (!isToday && Object.prototype.hasOwnProperty.call(overrides, key)) return overrides[key];
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

function formatTime(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

// ステージ全体で必要な装着時間（交換周期 × 1日の目標時間）
function getStageRequiredMs() {
  return replaceCycle * goalHours * 60 * 60 * 1000;
}

// ステージ内の経過済み「丸1日」の装着時間を合計する（多く装着した日は不足の穴埋めになる）
function getStageWornTotalMs(stage, now) {
  const end = stage.end || now;
  const days = fullDayStarts(stage.start, end);
  let total = 0;
  days.forEach((dayStart) => { total += getDayWornMs(dayStart, now); });
  return total;
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

  const requiredMs = getStageRequiredMs();
  const wornTotalMs = getStageWornTotalMs(stage, now);
  const deficitMs = Math.max(0, requiredMs - wornTotalMs);
  const ready = deficitMs <= 0;
  // 累計不足を今のペース（1日の目標時間）で埋めた場合の交換目安日
  const remainingDays = ready ? 0 : Math.ceil(deficitMs / goalMs);
  const estimatedTs = startOfDay(now) + remainingDays * DAY_MS;
  // 交換周期の日数を経過してもなお不足が残っている＝延長中
  const extended = !ready && days.length >= replaceCycle;

  return { met, missed, total: days.length, ready, extended, estimatedTs, requiredMs, wornTotalMs, deficitMs };
}

function renderStageDots(stage, now) {
  el.stageDots.innerHTML = '';
  const goalMs = goalHours * 60 * 60 * 1000;
  const days = fullDayStarts(stage.start, now);

  for (let i = 0; i < replaceCycle; i++) {
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
  showToast('元に戻しました');
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
  showToast('データを初期化しました', { undo: true });
}

function notifPermissionLabel() {
  if (!('Notification' in window)) return '（この環境では通知非対応）';
  if (Notification.permission === 'granted') return '✓ 通知許可済み';
  if (Notification.permission === 'denied') return 'ブロック済み（ブラウザ設定から変更してください）';
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
    el.wearAlert.textContent = `${formatDuration(offMs)}外しています。そろそろ着けましょう`;

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
  el.toggleIcon.classList.toggle('off', !isOn);
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
  renderSessionLog(now);
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
    `累計 ${formatDuration(progress.wornTotalMs)} / ${formatDuration(progress.requiredMs)}`;

  renderStageDots(stage, now);

  if (progress.deficitMs > 0) {
    el.stageDeficit.textContent = `ステージ累計不足: ${formatDuration(progress.deficitMs)}`;
    el.stageDeficit.className = 'stage-deficit has-deficit';
  } else {
    el.stageDeficit.textContent = progress.total > 0 ? '不足なし ✓（クリア）' : '';
    el.stageDeficit.className = 'stage-deficit';
  }

  el.stageEstimate.innerHTML = progress.ready
    ? `<span class="stage-estimate-label">交換目安日:</span> <span class="stage-estimate-date">本日（${formatDate(progress.estimatedTs)}）</span>`
    : `<span class="stage-estimate-label">交換目安日:</span><br><span class="stage-estimate-date">${formatDate(progress.estimatedTs)}</span><br><span class="stage-estimate-note">（このペースで目標を達成できた場合）</span>`;

  el.stageAlert.classList.remove('hidden', 'ready', 'extended');
  if (progress.ready) {
    el.stageAlert.classList.add('ready');
    el.stageAlert.textContent = '不足時間をクリアしました。新しいマウスピースに交換しましょう';
  } else if (progress.extended) {
    el.stageAlert.classList.add('extended');
    el.stageAlert.textContent = `累計不足時間が残っており、交換が延長になっています（残り${formatDuration(progress.deficitMs)}）`;
  } else {
    el.stageAlert.classList.add('hidden');
    el.stageAlert.textContent = '';
  }
}

// 完了・進行中ステージの内訳（日別装着時間 or 手動登録の期間のみ）を組み立てる
function buildStageBreakdown(stage, now) {
  if (stage.manual) {
    const daysCount = Math.round((stage.end - stage.start) / DAY_MS);
    return { manual: true, daysCount };
  }
  const goalMs = goalHours * 60 * 60 * 1000;
  const end = stage.end || now;
  const days = fullDayStarts(stage.start, end);
  const rows = days.map((dayStart) => {
    const wornMs = getDayWornMs(dayStart, now);
    return { label: formatDate(dayStart), wornMs, met: wornMs >= goalMs };
  });
  return { manual: false, rows };
}

const CHECKLIST_VISIBLE_COUNT = 4;

function buildChecklistItem(i, stage, now) {
  const li = document.createElement('li');

  const row = document.createElement('div');
  row.className = 'checklist-row';

  const icon = document.createElement('span');
  icon.className = 'checklist-icon';

  const label = document.createElement('span');
  label.textContent = `${i + 1}枚目`;

  const range = document.createElement('span');
  range.className = 'checklist-range';

  if (stage && stage.end) {
    li.classList.add('done');
    icon.textContent = '✓';
    icon.classList.add('done');
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

  row.appendChild(icon);
  row.appendChild(label);
  row.appendChild(range);
  li.appendChild(row);

  if (stage) {
    li.classList.add('has-detail');
    const detail = document.createElement('div');
    detail.className = 'checklist-detail';

    const breakdown = buildStageBreakdown(stage, now);
    if (breakdown.manual) {
      const note = document.createElement('p');
      note.className = 'checklist-detail-note';
      note.textContent = `手動登録（${breakdown.daysCount}日間）。このアプリを使う前の記録のため、日ごとの装着時間はありません。`;
      detail.appendChild(note);
    } else if (breakdown.rows.length === 0) {
      const note = document.createElement('p');
      note.className = 'checklist-detail-note';
      note.textContent = 'まだ丸1日分のデータがありません。';
      detail.appendChild(note);
    } else {
      const list = document.createElement('ul');
      list.className = 'checklist-detail-list';
      breakdown.rows.forEach((row2) => {
        const item = document.createElement('li');
        item.classList.add(row2.met ? 'met' : 'missed');
        const dateSpan = document.createElement('span');
        dateSpan.textContent = row2.label;
        const durSpan = document.createElement('span');
        durSpan.textContent = `${formatDuration(row2.wornMs)}${row2.met ? ' ✓' : ''}`;
        item.appendChild(dateSpan);
        item.appendChild(durSpan);
        list.appendChild(item);
      });
      detail.appendChild(list);
    }

    li.appendChild(detail);
    row.addEventListener('click', () => li.classList.toggle('open'));
  }

  return li;
}

function openPastStagesRegister() {
  switchTab('settings');
  setTimeout(() => {
    el.pastStagesList.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
}

function renderChecklist() {
  el.stageChecklist.innerHTML = '';
  const slots = Math.max(stages.length, totalAligners || 0);
  const now = Date.now();

  // 実際のステージは新しい順、未着手の枠はその後ろに番号順で並べる
  const order = [];
  for (let i = stages.length - 1; i >= 0; i--) order.push(i);
  for (let i = stages.length; i < slots; i++) order.push(i);

  const hiddenGroup = document.createElement('ul');
  hiddenGroup.className = 'checklist-hidden-group';
  let hiddenCount = 0;

  order.forEach((i, pos) => {
    const li = buildChecklistItem(i, stages[i], now);
    if (pos < CHECKLIST_VISIBLE_COUNT) {
      el.stageChecklist.appendChild(li);
    } else {
      hiddenGroup.appendChild(li);
      hiddenCount++;
    }
  });

  if (hiddenCount > 0) {
    const moreLi = document.createElement('li');
    moreLi.className = 'checklist-more-item';

    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'checklist-more-btn';
    const openLabel = `過去の記録を見る（${hiddenCount}件）`;
    moreBtn.textContent = openLabel;
    moreBtn.addEventListener('click', () => {
      const open = moreLi.classList.toggle('open');
      moreBtn.textContent = open ? '閉じる' : openLabel;
    });

    moreLi.appendChild(moreBtn);
    moreLi.appendChild(hiddenGroup);
    el.stageChecklist.appendChild(moreLi);
  }

  const registerLi = document.createElement('li');
  registerLi.className = 'checklist-register-item';
  const registerBtn = document.createElement('button');
  registerBtn.type = 'button';
  registerBtn.className = 'checklist-register-link';
  registerBtn.textContent = '以前のマウスピースを登録する場合';
  registerBtn.addEventListener('click', openPastStagesRegister);
  registerLi.appendChild(registerBtn);
  el.stageChecklist.appendChild(registerLi);
}

function renderHistory(now) {
  el.historyList.innerHTML = '';
  const goalMs = goalHours * 60 * 60 * 1000;
  const todayStart = startOfDay(now);
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  const fromVal = el.historyFrom.value;
  const toVal = el.historyTo.value;
  let days = [];

  if (fromVal) {
    const fromTs = startOfDay(fromVal);
    const toTs = toVal ? startOfDay(toVal) : todayStart;
    const count = Math.min(Math.max(Math.round((toTs - fromTs) / DAY_MS) + 1, 1), 180);
    for (let i = 0; i < count; i++) days.push(toTs - i * DAY_MS);
    const fromDisp = fromVal.slice(5).replace('-', '/');
    const toDisp = (toVal || dateKey(todayStart)).slice(5).replace('-', '/');
    el.historyLabel.textContent = `${fromDisp} 〜 ${toDisp}`;
  } else {
    for (let i = 0; i < HISTORY_DAYS; i++) days.push(todayStart - i * DAY_MS);
    el.historyLabel.textContent = '直近10日間';
  }

  days.forEach((dayStart) => {
    const wornMs = getDayWornMs(dayStart, now);
    const d = new Date(dayStart);
    const isToday = dayStart === todayStart;
    const label = isToday ? '今日' : `${d.getMonth() + 1}/${d.getDate()}（${dayNames[d.getDay()]}）`;

    const li = document.createElement('li');
    if (wornMs >= goalMs) li.classList.add('goal-met');

    const dateSpan = document.createElement('span');
    dateSpan.className = isToday ? 'history-date today' : 'history-date';
    dateSpan.textContent = label;

    const valueWrap = document.createElement('span');
    valueWrap.className = 'history-value';

    const input = document.createElement('select');
    input.className = 'history-input';
    const rawHours = Math.round((wornMs / (60 * 60 * 1000)) * 10) / 10;
    const snappedHours = Math.round(rawHours * 2) / 2;
    for (let step = 0; step <= 48; step++) {
      const h = step / 2;
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = Number.isInteger(h) ? String(h) : h.toFixed(1);
      if (h === snappedHours) opt.selected = true;
      input.appendChild(opt);
    }
    if (isToday) {
      input.disabled = true;
      input.title = '今日は装着中のため編集できません';
    } else {
      input.addEventListener('change', () => {
        pushUndo();
        const key = dateKey(dayStart);
        const hours = Number(input.value);
        overrides[key] = Math.round(hours * 60 * 60 * 1000);
        saveOverrides(overrides);
        render();
        showToast('保存しました', { undo: true });
      });
    }

    const unitSpan = document.createElement('span');
    unitSpan.className = 'history-unit';
    unitSpan.textContent = '時間';

    valueWrap.appendChild(input);
    valueWrap.appendChild(unitSpan);

    if (!isToday) {
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
  });
}

// イベントログを「装着」「外し」の連続区間（セッション）に変換する
function computeSessions(events, now) {
  const sessions = [];
  for (let i = 0; i < events.length; i++) {
    const start = events[i].ts;
    const isLast = i === events.length - 1;
    const end = isLast ? now : events[i + 1].ts;
    sessions.push({ type: events[i].type, start, end, ongoing: isLast });
  }
  return sessions;
}

let sessionLogFilter = 'on';

function renderSessionLog(now) {
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const sessions = computeSessions(events, now)
    .filter((s) => s.type === sessionLogFilter)
    .reverse()
    .slice(0, SESSION_LOG_LIMIT);

  el.sessionLogList.innerHTML = '';

  if (sessions.length === 0) {
    const li = document.createElement('li');
    li.className = 'session-log-empty';
    li.textContent = sessionLogFilter === 'on' ? 'まだ装着の記録がありません。' : 'まだ外した記録がありません。';
    el.sessionLogList.appendChild(li);
    return;
  }

  sessions.forEach((s) => {
    const d = new Date(s.start);
    const li = document.createElement('li');

    const dateSpan = document.createElement('span');
    dateSpan.className = 'session-log-date';
    dateSpan.textContent = `${d.getMonth() + 1}/${d.getDate()}（${dayNames[d.getDay()]}）`;

    const rangeSpan = document.createElement('span');
    rangeSpan.className = 'session-log-range';
    rangeSpan.textContent = `${formatTime(s.start)} 〜 ${s.ongoing ? '進行中' : formatTime(s.end)}`;

    const durationSpan = document.createElement('span');
    durationSpan.className = 'session-log-duration';
    durationSpan.textContent = formatDuration(s.end - s.start);

    li.appendChild(dateSpan);
    li.appendChild(rangeSpan);
    li.appendChild(durationSpan);
    el.sessionLogList.appendChild(li);
  });
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
  showToast(nextType === 'on' ? '装着中にしました' : '外しました', { undo: true });
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
  showToast('マウスピースを交換しました', { undo: true });
}

function addPastStageRow() {
  const row = document.createElement('div');
  row.className = 'past-stage-row';

  const startInput = document.createElement('input');
  startInput.type = 'date';
  startInput.className = 'past-stage-start';

  const sep = document.createElement('span');
  sep.className = 'filter-sep';
  sep.textContent = '〜';

  const endInput = document.createElement('input');
  endInput.type = 'date';
  endInput.className = 'past-stage-end';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'past-stage-remove';
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => {
    row.remove();
    if (!el.pastStagesList.querySelector('.past-stage-row')) addPastStageRow();
  });

  row.appendChild(startInput);
  row.appendChild(sep);
  row.appendChild(endInput);
  row.appendChild(removeBtn);
  el.pastStagesList.appendChild(row);
}

function savePastStages() {
  const rows = [...el.pastStagesList.querySelectorAll('.past-stage-row')];
  const entries = [];

  for (const row of rows) {
    const s = row.querySelector('.past-stage-start').value;
    const e = row.querySelector('.past-stage-end').value;
    if (!s && !e) continue;
    if (!s || !e) {
      alert('開始日と終了日の両方を入力してください');
      return;
    }
    const startTs = startOfDay(s);
    const endTs = startOfDay(e) + DAY_MS;
    if (startTs >= endTs) {
      alert('開始日は終了日より前の日付にしてください');
      return;
    }
    entries.push({ start: startTs, end: endTs, manual: true });
  }

  if (entries.length === 0) {
    alert('開始日と終了日を入力してください');
    return;
  }

  entries.sort((a, b) => a.start - b.start);
  for (let i = 0; i < entries.length - 1; i++) {
    if (entries[i].end > entries[i + 1].start) {
      alert('登録するマウスピースの期間が重複しています');
      return;
    }
  }

  const firstExistingStart = stages.length ? stages[0].start : Infinity;
  if (entries[entries.length - 1].end > firstExistingStart) {
    alert('既存の記録より後の日付は登録できません。既存の記録の開始日より前の日付にしてください');
    return;
  }

  pushUndo();
  stages = [...entries, ...stages];
  saveStages(stages);
  el.pastStagesList.innerHTML = '';
  addPastStageRow();
  render();
  showToast(`${entries.length}枚のマウスピースを登録しました`, { undo: true });
}

el.setupOn.addEventListener('click', () => setup('on'));
el.setupOff.addEventListener('click', () => setup('off'));
el.toggleBtn.addEventListener('click', toggle);
el.replaceBtn.addEventListener('click', replaceStage);
el.resetBtn.addEventListener('click', resetAll);
function switchTab(name) {
  el.tabPages.forEach((page) => page.classList.toggle('active', page.id === `tab${name[0].toUpperCase()}${name.slice(1)}`));
  el.bottomNav.querySelectorAll('.bottom-nav-item').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === name));
}

el.bottomNav.querySelectorAll('.bottom-nav-item').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

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
    showToast('開始日時を保存しました', { undo: true });
  }
});

el.totalAlignersInput.value = totalAligners || '';
el.totalAlignersInput.addEventListener('change', () => {
  pushUndo();
  const val = el.totalAlignersInput.value;
  totalAligners = val ? Number(val) : null;
  saveTotalAligners(totalAligners);
  render();
  showToast('保存しました', { undo: true });
});

el.goalInput.value = goalHours;
el.goalInput.addEventListener('change', () => {
  const val = Number(el.goalInput.value);
  if (val >= 1 && val <= 24) {
    pushUndo();
    goalHours = val;
    saveGoalHours(goalHours);
    render();
    showToast('保存しました', { undo: true });
  }
});

el.alertInput.value = alertMinutes > 0 ? alertMinutes : '';
el.alertInput.addEventListener('change', () => {
  const val = Number(el.alertInput.value);
  alertMinutes = val >= 0 ? val : 60;
  saveAlertMinutes(alertMinutes);
  lastAlertTs = 0;
  render();
  showToast('保存しました');
});

el.notifBtn.addEventListener('click', requestNotifPermission);

el.cycleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    replaceCycle = Number(btn.dataset.days);
    saveReplaceCycle(replaceCycle);
    syncCycleBtns();
    render();
    showToast(`交換周期を${replaceCycle}日に設定しました`);
  });
});

el.addPastStageBtn.addEventListener('click', addPastStageRow);
el.savePastStagesBtn.addEventListener('click', savePastStages);
addPastStageRow();

el.sessionTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    sessionLogFilter = btn.dataset.sessionType;
    el.sessionTabs.forEach(b => b.classList.toggle('active', b === btn));
    renderSessionLog(Date.now());
  });
});

el.historyFrom.addEventListener('change', () => {
  if (el.historyFrom.value && !el.historyTo.value) {
    el.historyTo.value = dateKey(Date.now());
  }
  render();
});
el.historyTo.addEventListener('change', render);

syncCycleBtns();
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
