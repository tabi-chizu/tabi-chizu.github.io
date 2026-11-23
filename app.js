(function () {
"use strict";
// ============================================================
// Core_Util : 文字列・日付・距離・小さな図
// ============================================================
function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function(m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
function pad2(n) { return String(n).padStart(2, '0'); }
function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function today() { return ymd(new Date()); }
function nowStamp() { var d = new Date(); return ymd(d) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
function dateLabel(s) { var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[1] + '/' + Number(m[2]) + '/' + Number(m[3]) : ''; }
function normKey(t) { return String(t || '').normalize('NFKC').replace(/[\s・\-_()（）【】\[\]「」『』]+/g, '').toLowerCase(); }

// 2 点間の距離（km）
function distKm(a, b, c, d) {
  var r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2);
  return 12742 * Math.asin(Math.sqrt(x * x + Math.cos(a * r) * Math.cos(c * r) * y * y));
}
function kmLabel(km) { return km < 1 ? Math.round(km * 1000) + ' m' : km < 10 ? km.toFixed(1) + ' km' : Math.round(km) + ' km'; }

// 外のアプリで開く（キー不要の URL。Android では Google マップのアプリが開く）
function gmapPlace(s) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.la + ',' + s.lo); }
function gmapRoute(s) { return 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + encodeURIComponent(s.la + ',' + s.lo); }

var ICONS = {
  map: 'M9 4L3 6.500v13.500l6-2.500 6 2.500 6-2.500V4l-6 2.500zM9 4v13.500M15 6.500V20', book: 'M5 4h6a2 2 0 012 2v14a2 2 0 00-2-2H5zM19 4h-6a2 2 0 00-2 2v14a2 2 0 012-2h6z',
  award: 'M12 14a5 5 0 100-10 5 5 0 000 10zM8.500 13l-1.500 8 5-3 5 3-1.500-8', near: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 15a3 3 0 100-6 3 3 0 000 6z',
  gear: 'M4 7h9M19 7h1M4 17h1M11 17h9M16 9.500a2.500 2.500 0 100-5 2.500 2.500 0 000 5zM8 19.500a2.500 2.500 0 100-5 2.500 2.500 0 000 5z', search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM16 16l5 5',
  close: 'M6 6l12 12M18 6L6 18', check: 'M5 12.500l4.500 4.500L19 7.500', locate: 'M12 2v3M12 19v3M2 12h3M19 12h3M12 17a5 5 0 100-10 5 5 0 000 10z', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  plus: 'M12 5v14M5 12h14', ext: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6', down: 'M6 9l6 6 6-6', up: 'M6 15l6-6 6 6'
};
function icon(n) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICONS[n] + '"/></svg>'; }

// 種類の記号（色ではなく形で見分ける。行った所は塗る）
var SHAPES = {
  circle: '<circle cx="8" cy="8" r="5.2"/>', square: '<rect x="3.200" y="3.200" width="9.600" height="9.600"/>',
  triangle: '<path d="M8 2.600L13.600 12.800H2.400z"/>', diamond: '<path d="M8 2.200L13.800 8 8 13.800 2.200 8z"/>', ring: '<circle cx="8" cy="8" r="5.200"/><circle cx="8" cy="8" r="1.800"/>'
};
function mark(shape, done, cls) { return '<svg class="mk ' + (done ? 'done ' : '') + (cls || '') + '" viewBox="0 0 16 16" aria-hidden="true">' + SHAPES[shape] + '</svg>'; }

// 配色は 04_開発ツール/theme.mjs だけで決める。地図の点など CSS で塗れないものはここから読む
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim(); }

// 進み具合の細い線
function bar(n, total) { var p = total ? Math.min(100, n / total * 100) : 0; return '<i class="bar" style="--p:' + p.toFixed(1) + '%"></i>'; }

// ============================================================
// Data_Defs : 種類・地方・称号の定義（名所そのものはサーバーから受け取る）
// ============================================================
var FUTARI_URL = 'https://couple-log.github.io/';
var APP_URL = 'https://tabi-chizu.github.io/';
var FEATURES = { futari: true };

// 種類。印は形で見分ける
var CATS = {
  michinoeki: { name: '道の駅', shape: 'square' },
  shrine: { name: '神社', shape: 'triangle' },
  temple: { name: '寺', shape: 'diamond' },
  museum: { name: '美術館・博物館', shape: 'circle' },
  other: { name: 'そのほか', shape: 'ring' }
};
var CAT_ORDER = ['michinoeki', 'shrine', 'temple', 'museum', 'other'];
// ふたりログの大分類（ログを書くときに渡す）
var FUTARI_CAT = { michinoeki: '旅行', shrine: '旅行', temple: '旅行', museum: 'エンタメ', other: '旅行' };

var PREFS = ['', '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];
var REGIONS = [
  ['北海道', [1]], ['東北', [2, 3, 4, 5, 6, 7]], ['関東', [8, 9, 10, 11, 12, 13, 14]], ['北陸・信越', [15, 16, 17, 18, 20]], ['中部', [19, 21, 22, 23, 24]],
  ['近畿', [25, 26, 27, 28, 29, 30]], ['中国', [31, 32, 33, 34, 35]], ['四国', [36, 37, 38, 39]], ['九州・沖縄', [40, 41, 42, 43, 44, 45, 46, 47]]
];
// 都道府県の並べ図（列, 行）。形は大まかで、塗りの具合を見るためのもの
var PREF_GRID = {
  1: [12, 0], 2: [12, 2], 3: [12, 3], 5: [11, 3], 4: [12, 4], 6: [11, 4], 7: [12, 5], 15: [11, 5], 8: [12, 6], 9: [11, 6], 10: [10, 6],
  16: [9, 5], 17: [8, 5], 20: [10, 7], 11: [11, 7], 12: [12, 7], 18: [8, 6], 21: [9, 7], 19: [10, 8], 13: [11, 8], 14: [11, 9],
  25: [8, 7], 26: [7, 7], 24: [8, 8], 23: [9, 8], 22: [10, 9], 28: [6, 7], 27: [7, 8], 29: [8, 9], 30: [7, 9],
  31: [5, 7], 32: [4, 7], 33: [5, 8], 34: [4, 8], 35: [3, 8], 37: [5, 10], 36: [6, 10], 38: [4, 10], 39: [5, 11],
  40: [2, 9], 41: [1, 9], 42: [0, 9], 44: [2, 10], 43: [1, 10], 45: [2, 11], 46: [1, 11], 47: [0, 13]
};

// 数の称号（種類ごと）。名前は案。本人と一覧で見て決める
var COUNT_TITLES = {
  michinoeki: [[1, '道の駅に立ち寄る'], [10, '街道の常連'], [30, '道の駅めぐり'], [80, '街道の通人'], [200, '全国の道を知る人'], [500, '道の駅の達人']],
  shrine: [[1, '初めての参拝'], [10, '社をめぐる人'], [30, '古社を訪ねる人'], [70, '社の通人']],
  temple: [[1, '初めての参詣'], [10, '古寺をめぐる人'], [30, '寺をたずねる人'], [70, '寺の通人']],
  museum: [[1, '展示室へ'], [10, '館をめぐる人'], [30, '美と学びの旅人'], [70, '館の通人']],
  other: [[1, '寄り道'], [20, '寄り道の名人']],
  stamp: [[1, '最初のスタンプ'], [10, 'スタンプ帳の 1 冊目'], [50, 'スタンプを集める人'], [150, 'スタンプの通人'], [400, 'スタンプの達人']],
  ticket: [[1, '最初のきっぷ'], [10, 'きっぷを集める人'], [50, 'きっぷの通人'], [150, 'きっぷの達人']]
};
// 一覧の制覇。段階は割合
var LIST_STEPS = [[0.25, '四分の一'], [0.5, '半分'], [0.75, '四分の三'], [1, '制覇']];
var WHO_LABEL = function(w) { return w === '1' ? names()[0] : w === '2' ? names()[1] : 'ふたりで'; };

// ============================================================
// Core_State : 端末の控え・送信待ち・取得内容の重ね合わせ（画面に依存しない。テストから直接動かす）
// ふたりログの Core_State と同じ考え方（変えた項目だけを送る・送れるまで端末に残す）
// ============================================================
var TYPES = ['visit', 'myspot'];
var SAVE_FN = { visit: 'saveVisit', myspot: 'saveMySpot' };
var ID_PREFIX = { visit: 'vis_', myspot: 'my_' };
var MAX_TRIES = 6;

function emptyServer() {
  var s = { me: null, names: ['1人目', '2人目'], tables: {}, spotsVersion: '', syncedAt: '' };
  TYPES.forEach(function(t) { s.tables[t] = {}; });
  return s;
}

// persist: {server, queue, failed}  call: (fn, arg) => Promise  now: () => ms
function createStore(deps) {
  var st = { server: emptyServer(), queue: [], failed: [], flushing: false, doneCount: 0, views: {}, n: 0 };

  function changed() { st.views = {}; if (deps.onChange) deps.onChange(); }
  function saveQueue() { return deps.persist.queue(st.queue); }
  function saveFailed() { return deps.persist.failed(st.failed); }
  function newId(type) { st.n++; return ID_PREFIX[type] + deps.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8) + st.n.toString(36); }
  function opKey(op) { return op.type + ':' + (op.id || op.qid); }

  // 控え + 未送信の変更 = 画面に出す内容
  function overlay(map, type) {
    st.queue.forEach(function(op) {
      if (op.type !== type) return;
      var cur = map[op.id];
      if (op.fn === 'trash' || op.fn === 'restore') {
        if (cur) map[op.id] = Object.assign({}, cur, { deletedAt: op.fn === 'trash' ? op.at : '' });
        return;
      }
      if (!cur && !op.create) return;
      map[op.id] = Object.assign({}, cur || { id: op.id, deletedAt: '', by: st.server.me ? st.server.me.name : '' }, op.set, { _pending: true });
    });
    return map;
  }
  function all(type) {
    if (!st.views[type]) {
      var map = overlay(Object.assign({}, st.server.tables[type]), type);
      st.views[type] = { map: map, list: Object.keys(map).map(function(k) { return map[k]; }) };
    }
    return st.views[type];
  }
  function list(type) { return all(type).list.filter(function(x) { return !x.deletedAt; }); }
  function get(type, id) { return all(type).map[id] || null; }

  function push(op) { op.qid = deps.now() + '_' + (++st.n); op.tries = 0; op.at = op.at || deps.stamp(); st.queue.push(op); return op; }
  function kick() { changed(); var p = saveQueue(); flush(); return p; }

  // 変えた項目だけを積む。まだ送っていない同じ記録の変更にはまとめる
  function save(type, id, set, create) {
    if (!create && !Object.keys(set).length) return Promise.resolve();
    var last = null;
    st.queue.forEach(function(op) { if (op.type === type && op.id === id) last = op; });
    if (last && last.fn === SAVE_FN[type] && !last.sending) {
      Object.keys(set).forEach(function(f) { last.set[f] = set[f]; });
      last.create = last.create || !!create;
    } else push({ fn: SAVE_FN[type], type: type, id: id, set: Object.assign({}, set), create: !!create });
    return kick();
  }
  // 今の値との差だけを保存する
  function patch(type, id, next) {
    var cur = get(type, id);
    if (!cur) return Promise.resolve();
    var set = {};
    Object.keys(next).forEach(function(f) {
      var a = cur[f] === undefined || cur[f] === null ? '' : cur[f], b = next[f] === undefined || next[f] === null ? '' : next[f];
      if (String(a) !== String(b)) set[f] = next[f];
    });
    return save(type, id, set, false);
  }
  function add(type, values, id) { id = id || newId(type); save(type, id, values, true); return id; }
  function trash(type, id) { push({ fn: 'trash', type: type, id: id }); return kick(); }
  function restore(type, id) { push({ fn: 'restore', type: type, id: id }); return kick(); }

  function argOf(op) {
    if (op.fn === 'trash' || op.fn === 'restore') return { type: op.type, id: op.id };
    return { id: op.id, set: op.set, create: op.create };
  }
  function isPermanent(code) { return code === 'BAD_REQUEST' || code === 'NOT_FOUND' || code === 'UNKNOWN_ACTION'; }
  function isOffline(code) { return code === 'NETWORK' || code === 'NO_TOKEN' || code === 'UNAUTHORIZED' || code === 'SCHEMA'; }

  function nextOp() {
    var blocked = {}, t = deps.now();
    for (var i = 0; i < st.queue.length; i++) {
      var op = st.queue[i], k = opKey(op);
      if (!blocked[k] && (op.nextAt || 0) <= t) return op;
      blocked[k] = true; // 同じ記録への操作は順番を守る
    }
    return null;
  }
  function remove(op) { st.queue = st.queue.filter(function(x) { return x !== op; }); }

  function flush() {
    if (st.flushing) return Promise.resolve();
    st.flushing = true;
    var step = function() {
      var op = deps.canCall() ? nextOp() : null;
      if (!op) return Promise.resolve();
      op.sending = true;
      return deps.call(op.fn, argOf(op)).then(function(res) {
        remove(op);
        st.doneCount++;
        if (res && res.item) st.server.tables[op.type][res.item.id] = res.item;
        changed();
        return Promise.all([saveQueue(), deps.persist.server(st.server)]).then(step);
      }, function(err) {
        op.sending = false;
        var code = err && err.code;
        op.error = (err && err.message) || '';
        if (isOffline(code)) return saveQueue();
        op.tries++;
        if (isPermanent(code) || op.tries >= MAX_TRIES) {
          remove(op);
          st.failed.push(op);
          changed();
          return saveFailed().then(saveQueue).then(step);
        }
        op.nextAt = deps.now() + Math.min(300000, 3000 * Math.pow(2, op.tries));
        return saveQueue().then(step);
      });
    };
    return step().then(function() { st.flushing = false; }, function(e) { st.flushing = false; throw e; })
      .then(function() { if (deps.onIdle) deps.onIdle(); });
  }

  function applyBundle(b) {
    var s = emptyServer();
    s.me = b.me; s.names = b.names || s.names; s.spotsVersion = b.spotsVersion || ''; s.syncedAt = b.serverTime || '';
    TYPES.forEach(function(t) { ((b.tables || {})[t] || []).forEach(function(o) { s.tables[t][o.id] = o; }); });
    st.server = s;
    changed();
    return deps.persist.server(s);
  }
  // 先に送ってから取得する。取得中に送信が済んだ場合、その応答は古いので取り直す
  function pull(retry) {
    return flush().then(function() {
      if (!deps.canCall()) return;
      var mark = st.doneCount;
      return deps.call('getBundle', {}).then(function(b) {
        if (st.doneCount !== mark && (retry || 0) < 3) return pull((retry || 0) + 1);
        return applyBundle(b);
      });
    });
  }
  function load(saved) {
    if (saved.server) { st.server = Object.assign(emptyServer(), saved.server); TYPES.forEach(function(t) { if (!st.server.tables[t]) st.server.tables[t] = {}; }); }
    st.queue = (saved.queue || []).map(function(op) { op.sending = false; op.nextAt = 0; return op; });
    st.failed = saved.failed || [];
    changed();
  }
  function retryFailed(qid) {
    var op = st.failed.filter(function(x) { return x.qid === qid; })[0];
    if (!op) return Promise.resolve();
    op.tries = 0; op.nextAt = 0; op.error = '';
    st.queue.push(op);
    st.failed = st.failed.filter(function(x) { return x !== op; });
    changed();
    return saveQueue().then(saveFailed).then(flush);
  }
  function dropFailed(qid) { st.failed = st.failed.filter(function(x) { return x.qid !== qid; }); changed(); return saveFailed(); }

  return { st: st, list: list, get: get, save: save, patch: patch, add: add, trash: trash, restore: restore, flush: flush, pull: pull, applyBundle: applyBundle, load: load, retryFailed: retryFailed, dropFailed: dropFailed, newId: newId };
}

// ============================================================
// Core_Io : 端末内の保存（IndexedDB）・通信
// 保存名はすべて tabimap- で始める（ふたりログの保存名と混ざらないように）
// ============================================================
var DB_NAME = 'tabimap-db', KEY_TOKEN = 'tabimap-token', KEY_PREFS = 'tabimap-prefs';
var dbPromise = null;

function openDb() {
  if (!dbPromise) dbPromise = new Promise(function(res, rej) {
    var r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = function() { r.result.createObjectStore('kv'); };
    r.onsuccess = function() { res(r.result); };
    r.onerror = function() { dbPromise = null; rej(r.error); };
  });
  return dbPromise;
}
function kvRun(mode, fn) {
  return openDb().then(function(db) {
    return new Promise(function(res, rej) {
      var tx = db.transaction('kv', mode), rq = fn(tx.objectStore('kv'));
      tx.oncomplete = function() { res(rq && rq.result); };
      tx.onerror = tx.onabort = function() { rej(tx.error); };
    });
  });
}
function kvGet(k) { return kvRun('readonly', function(s) { return s.get(k); }); }
function kvSet(k, v) { return kvRun('readwrite', function(s) { return s.put(v, k); }); }

function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
function lsSet(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
function prefs() { try { return JSON.parse(lsGet(KEY_PREFS)) || {}; } catch (e) { return {}; } }
function setPref(k, v) { var p = prefs(); p[k] = v; lsSet(KEY_PREFS, JSON.stringify(p)); }

// ---- 通信（POST の本文にトークンを入れ、URL には載せない） ----
var authRejected = false;
function apiError(message, code) { var e = new Error(message); e.code = code; return e; }
function canCall() { return !!lsGet(KEY_TOKEN) && !authRejected && navigator.onLine !== false && !!window.APP_ENDPOINT; }

function postApi(token, fn, arg, timeoutMs) {
  var ctrl = new AbortController(), timer = setTimeout(function() { ctrl.abort(); }, timeoutMs || 45000);
  return fetch(window.APP_ENDPOINT, { method: 'POST', redirect: 'follow', credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ token: token, fn: fn, arg: arg || {} }), signal: ctrl.signal })
    .then(function(r) { return r.text(); })
    .catch(function(e) { throw apiError(e && e.name === 'AbortError' ? '通信がタイムアウトしました' : '通信できませんでした', 'NETWORK'); })
    .then(function(txt) {
      var res;
      try { res = JSON.parse(txt); } catch (e) { throw apiError('サーバーの応答を読み取れません', 'BAD_RESPONSE'); }
      if (!res || !res.ok) throw apiError((res && res.error) || 'サーバーエラー', (res && res.code) || 'ERROR');
      return res.result;
    })
    .finally(function() { clearTimeout(timer); });
}
function callApi(fn, arg, timeoutMs) {
  var token = lsGet(KEY_TOKEN);
  if (!window.APP_ENDPOINT) return Promise.reject(apiError('接続先が設定されていません', 'NETWORK'));
  if (!token) return Promise.reject(apiError('接続トークンが未設定です', 'NO_TOKEN'));
  return postApi(token, fn, arg, timeoutMs).catch(function(e) {
    if (e.code === 'UNAUTHORIZED') { authRejected = true; renderBadge(); }
    throw e;
  });
}

// ---- 地名の検索（国土地理院の住所検索。キー不要） ----
function searchPlace(q) {
  return fetch('https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + encodeURIComponent(q), { credentials: 'omit', referrerPolicy: 'no-referrer' })
    .then(function(r) { return r.json(); })
    .then(function(list) {
      return (list || []).slice(0, 8).map(function(x) { return { name: x.properties.title, lat: x.geometry.coordinates[1], lng: x.geometry.coordinates[0] }; });
    });
}

// ============================================================
// Core_Spots : 名所の一覧（サーバーから受け取って端末に控える）と、行った記録からの集計
// 称号や数はシートに持たず、毎回ここで数える（二重に持たない）
// ============================================================
var SPOTS = { version: '', spots: [], lists: [], sources: [], byId: {} };
var CALC = null;

function setSpots(d) {
  SPOTS = { version: d.version || '', spots: d.spots || [], lists: d.lists || [], sources: d.sources || [], byId: {} };
  SPOTS.spots.forEach(function(s) { SPOTS.byId[s.id] = s; });
  CALC = null;
}
// 名所の一覧が古ければ取り直す（版が同じなら中身は送られてこない）
function refreshSpots() {
  var want = store.st.server.spotsVersion;
  if (!want || want === SPOTS.version || !canCall()) return Promise.resolve();
  return callApi('getSpots', { version: SPOTS.version }, 90000).then(function(d) {
    if (d.same) return;
    setSpots(d);
    renderSoon();
    return kvSet('spots', d);
  });
}

// 自分で足した名所も同じ形にそろえる
function mySpots() {
  return store.list('myspot').filter(function(m) { return m.lat && m.lng; }).map(function(m) {
    return { id: m.id, n: m.name, c: CATS[m.cat] ? m.cat : 'other', p: Number(m.pref) || 0, la: Number(m.lat), lo: Number(m.lng), l: [], mine: true, memo: m.memo };
  });
}
function spotById(id) { return SPOTS.byId[id] || mySpots().filter(function(s) { return s.id === id; })[0] || null; }

function calc() {
  if (CALC) return CALC;
  var c = { all: SPOTS.spots.concat(mySpots()), visits: {}, done: {}, stamp: {}, ticket: {}, byCat: {}, nStamp: 0, nTicket: 0, lists: {}, prefs: {}, years: {}, recent: [] };
  store.list('visit').forEach(function(v) {
    (c.visits[v.spotId] = c.visits[v.spotId] || []).push(v);
    c.recent.push(v);
    if (v.stamp === 'true') c.stamp[v.spotId] = true;
    if (v.ticket === 'true') c.ticket[v.spotId] = true;
    var y = String(v.date || '').slice(0, 4);
    if (y) { var ys = (c.years[y] = c.years[y] || {}); ys[v.spotId] = true; }
  });
  Object.keys(c.visits).forEach(function(k) { c.visits[k].sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); }); });
  c.recent.sort(function(a, b) { return String(b.date).localeCompare(String(a.date)) || String(b.updatedAt).localeCompare(String(a.updatedAt)); });
  CAT_ORDER.forEach(function(k) { c.byCat[k] = { done: 0, total: 0 }; });
  c.all.forEach(function(s) {
    var b = c.byCat[s.c] || c.byCat.other, hit = !!c.visits[s.id];
    b.total++;
    if (hit) { b.done++; c.done[s.id] = true; if (s.p) c.prefs[s.p] = (c.prefs[s.p] || 0) + 1; }
  });
  c.nStamp = Object.keys(c.stamp).length;
  c.nTicket = Object.keys(c.ticket).length;
  // 一覧の制覇。group がある一覧（一宮の旧国など）は、その中のどれか 1 か所で 1 つと数える
  SPOTS.lists.forEach(function(L) {
    var groups = {}, doneGroups = {};
    c.all.forEach(function(s) {
      if ((s.l || []).indexOf(L.key) < 0) return;
      var g = L.group ? (groupOf(s, L.key) || s.id) : s.id;
      groups[g] = true;
      if (c.done[s.id]) doneGroups[g] = true;
    });
    c.lists[L.key] = { done: Object.keys(doneGroups).length, total: Object.keys(groups).length };
  });
  CALC = c;
  return c;
}

// 一覧ごとのまとまり（一宮なら旧国、世界遺産なら資産名）と番号（四国八十八か所の札所番号）
function groupOf(s, key) { return (s.gl || {})[key] || ''; }
function numberOf(s, key) { return (s.no || {})[key] || 0; }
// 位置の分かっている名所だけ（地図・近くに出せるもの）
function located(s) { return typeof s.la === 'number' && typeof s.lo === 'number'; }

// 段階 [[数, 名前]] から、今の称号と次の段階
function stepOf(steps, n) {
  var cur = null, next = null;
  steps.forEach(function(x) { if (n >= x[0]) cur = x; else if (!next) next = x; });
  return { cur: cur, next: next };
}
// 持っている称号の一覧（数の称号・一覧の制覇）
function titles() {
  var c = calc(), out = [];
  var counted = function(key, label, n) {
    var s = stepOf(COUNT_TITLES[key], n);
    out.push({ kind: 'count', key: key, label: label, n: n, cur: s.cur, next: s.next });
  };
  CAT_ORDER.forEach(function(k) { counted(k, CATS[k].name, c.byCat[k].done); });
  counted('stamp', 'スタンプ', c.nStamp);
  counted('ticket', 'きっぷ', c.nTicket);
  SPOTS.lists.forEach(function(L) {
    var p = c.lists[L.key], r = p.total ? p.done / p.total : 0, s = stepOf(LIST_STEPS, r);
    out.push({ kind: 'list', key: L.key, label: L.name, n: p.done, total: p.total, cur: s.cur && p.done ? s.cur : null, next: s.next });
  });
  return out;
}

// 近い順（km 以内）
function nearSpots(lat, lng, km, cats) {
  return calc().all.filter(function(s) { return located(s) && (!cats || cats[s.c]); }).map(function(s) { return { s: s, d: distKm(lat, lng, s.la, s.lo) }; })
    .filter(function(x) { return x.d <= km; }).sort(function(a, b) { return a.d - b.d; });
}
function findSpots(q) {
  var k = normKey(q);
  if (!k) return [];
  return calc().all.filter(function(s) { return normKey(s.n).indexOf(k) >= 0; }).slice(0, 30);
}

// ============================================================
// Core_App : 画面の枠・操作の受付・同期・起動
// ============================================================
var APP = { tab: 'map', sheets: [] };
var ACT = {}, INPUT = {}, SUBMIT = {}, RENDER = {};

// 操作は data-act / data-input / data-submit で受ける（CSP で inline script を禁止するため）
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  if (el.tagName === 'BUTTON' || (el.tagName === 'A' && !el.target)) e.preventDefault();
  if (ACT[el.dataset.act]) ACT[el.dataset.act](el, e);
});
['input', 'change'].forEach(function(ev) {
  document.addEventListener(ev, function(e) {
    var el = e.target.closest('[data-' + ev + ']');
    if (el && INPUT[el.dataset[ev]]) INPUT[el.dataset[ev]](el, e);
  });
});
document.addEventListener('submit', function(e) {
  e.preventDefault();
  var f = e.target;
  if (SUBMIT[f.dataset.submit]) SUBMIT[f.dataset.submit](f);
});
document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && APP.sheets.length) closeSheet(); });

function $(id) { return document.getElementById(id); }
function options(list, cur) {
  return list.map(function(o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('');
}

// ---- 下から出る小窓 ----
function openSheet(title, body, opt) {
  opt = opt || {};
  var el = document.createElement('div');
  el.className = 'sheet-bg';
  el.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><header><h2>' + esc(title) + '</h2><button type="button" class="icon-btn" data-act="closeSheet" aria-label="閉じる">' + icon('close') + '</button></header><div class="sheet-body">' + body + '</div></div>';
  el.addEventListener('mousedown', function(e) { if (e.target === el) closeSheet(); });
  el._onClose = opt.onClose;
  el._key = opt.key || '';
  document.body.appendChild(el);
  APP.sheets.push(el);
  document.body.classList.add('locked');
  return el;
}
function closeSheet() {
  var el = APP.sheets.pop();
  if (!el) return;
  if (el._onClose) el._onClose();
  el.remove();
  if (!APP.sheets.length) document.body.classList.remove('locked');
}
function closeAllSheets() { while (APP.sheets.length) closeSheet(); }
function topSheet() { return APP.sheets[APP.sheets.length - 1]; }
// 開いている小窓の中身だけを描き直す
function refreshSheet(key, html) { var el = topSheet(); if (el && el._key === key) el.querySelector('.sheet-body').innerHTML = html; }
ACT.closeSheet = closeSheet;

var toastTimer = null;
function toast(msg, undo) {
  var t = $('toast');
  t.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button type="button" data-act="undo">取り消す</button>' : '');
  APP.undo = undo || null;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { t.classList.remove('on'); }, undo ? 7000 : 2600);
}
ACT.undo = function() { if (APP.undo) APP.undo(); APP.undo = null; $('toast').classList.remove('on'); };

// ---- 同期の印 ----
function renderBadge() {
  var b = $('syncBadge'); if (!b) return;
  var wait = store.st.queue.length, bad = store.st.failed.length;
  var t = bad ? '失敗 ' + bad : authRejected ? '要接続' : APP.syncError ? '同期エラー' : !lsGet(KEY_TOKEN) ? '未接続' : wait > 0 ? '未送信 ' + wait : APP.syncing ? '同期中' : '';
  b.textContent = t;
  b.className = 'badge' + (bad || authRejected || APP.syncError ? ' bad' : '');
  b.hidden = !t;
}
function sync(manual) {
  if (APP.syncing) return APP.syncing;
  if (!canCall()) { renderBadge(); if (manual) toast(lsGet(KEY_TOKEN) ? '今は通信できません' : '接続トークンが未設定です'); return Promise.resolve(); }
  APP.syncing = store.pull().then(refreshSpots).then(function() { APP.syncError = ''; if (manual) toast('最新の状態です'); }, function(e) { if (e.code !== 'NETWORK') APP.syncError = e.message; if (manual) toast(e.message); console.warn(e.message); })
    .then(function() { APP.syncing = null; renderBadge(); });
  renderBadge();
  return APP.syncing;
}
ACT.sync = function() { sync(true); };

// ---- 描画 ----
var renderTimer = null;
function renderSoon() { if (!renderTimer) renderTimer = setTimeout(function() { renderTimer = null; render(); }, 0); }
// 入力中の欄があるときは作り直さない（日本語変換が切れるため）
function render() {
  renderBadge();
  var a = document.activeElement, main = $('main');
  if (!(a && main.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) RENDER[APP.tab]();
  if (APP.sheets.length && topSheet()._refresh) topSheet()._refresh();
}
function go(tab) {
  APP.tab = tab;
  document.body.dataset.tab = tab;
  document.querySelectorAll('nav [data-tab]').forEach(function(b) { b.classList.toggle('on', b.dataset.tab === tab); if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  RENDER[tab]();
  window.scrollTo(0, 0);
}
ACT.go = function(el) { closeAllSheets(); go(el.dataset.tab); };

// ---- 地図の部品（開いたときだけ読む） ----
var leafletPromise = null;
function needLeaflet() {
  if (!leafletPromise) leafletPromise = new Promise(function(res, rej) {
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = './vendor/leaflet.css'; document.head.appendChild(l);
    var s = document.createElement('script'); s.src = './vendor/leaflet.js'; s.onload = res; s.onerror = function() { leafletPromise = null; rej(new Error('地図の部品を読み込めません')); }; document.head.appendChild(s);
  });
  return leafletPromise;
}

// 現在地（その場だけ使う。保存も送信もしない）
function here() {
  return new Promise(function(res, rej) {
    if (!navigator.geolocation) return rej(new Error('この端末では現在地を使えません'));
    navigator.geolocation.getCurrentPosition(function(p) { res({ lat: p.coords.latitude, lng: p.coords.longitude }); }, function() { rej(new Error('現在地を取得できません')); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
}

var store = createStore({
  persist: { server: function(v) { return kvSet('server', v); }, queue: function(v) { return kvSet('queue', v); }, failed: function(v) { return kvSet('failed', v); } },
  call: callApi, canCall: canCall, now: function() { return Date.now(); }, stamp: nowStamp,
  onChange: function() { CALC = null; if (APP.ready) renderSoon(); }
});
function names() { return store.st.server.names; }
function myName() { return store.st.server.me ? store.st.server.me.name : ''; }

// 端末の控えだけで画面を出す。通信はその後
function boot() {
  document.querySelectorAll('[data-icon]').forEach(function(b) { b.insertAdjacentHTML('afterbegin', icon(b.dataset.icon)); });
  Promise.all([kvGet('server'), kvGet('queue'), kvGet('failed'), kvGet('spots')]).then(function(r) {
    store.load({ server: r[0], queue: r[1], failed: r[2] });
    if (r[3]) setSpots(r[3]);
  }, function(e) {
    console.warn(e);
    toast('端末内の保存領域を開けません。プライベートブラウズを解除してください');
  }).then(function() {
    APP.ready = true;
    go(RENDER[prefs().start] ? prefs().start : 'map');
    renderBadge();
    document.body.classList.add('ready');
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function() {});
    if (!lsGet(KEY_TOKEN)) openConnect();
    takeHash();
    sync(false);
  });
  window.addEventListener('online', function() { sync(false); });
  window.addEventListener('hashchange', takeHash);
  document.addEventListener('visibilitychange', function() { if (!document.hidden) sync(false); });
  setInterval(function() { if (!document.hidden && store.st.queue.length && canCall()) store.flush(); }, 20000);
  if ('serviceWorker' in navigator && !window.APP_NO_SW) navigator.serviceWorker.register('./sw.js').catch(function(e) { console.warn(e); });
}

// ============================================================
// Mod_Spot : 名所の詳細・行った記録・ふたりログとの行き来
// ============================================================

// 名所の詳細（下から出る小窓）
function openSpot(id) {
  var s = spotById(id);
  if (!s) { toast('この名所は一覧にありません'); return; }
  var el = openSheet(s.n, spotHtml(s), { key: 'spot:' + id });
  el._refresh = function() { var x = spotById(id); if (x) refreshSheet('spot:' + id, spotHtml(x)); };
}
ACT.spot = function(el) { openSpot(el.dataset.id); };

function listNames(s) {
  return (s.l || []).map(function(k) {
    var L = SPOTS.lists.filter(function(x) { return x.key === k; })[0], g = groupOf(s, k), no = numberOf(s, k);
    return L ? L.name + (no ? ' ' + no + '番' : '') + (g ? '（' + g + '）' : '') : '';
  }).filter(Boolean);
}
function sourceOf(s) { return SPOTS.sources.filter(function(x) { return x.key === s.s; })[0] || null; }

function spotHtml(s) {
  var c = calc(), vs = c.visits[s.id] || [], cat = CATS[s.c] || CATS.other, src = sourceOf(s), isEki = s.c === 'michinoeki';
  var h = '<div class="spot-head">' + mark(cat.shape, vs.length) + '<span>' + esc(cat.name) + (s.p ? '・' + esc(PREFS[s.p]) : '') + '</span></div>';
  if (s.a) h += '<p class="muted small">' + esc(s.a) + '</p>';
  var ln = listNames(s);
  if (ln.length) h += '<p class="lists">' + ln.map(function(x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</p>';
  if (s.memo) h += '<p class="small">' + esc(s.memo) + '</p>';
  h += '<div class="row gap wrap"><button type="button" class="btn primary" data-act="visitNew" data-id="' + esc(s.id) + '">' + icon('check') + '行った</button>' +
    (located(s) ? '<a class="btn" href="' + esc(gmapRoute(s)) + '" target="_blank" rel="noopener noreferrer">' + icon('ext') + '道順</a>' +
    '<a class="btn" href="' + esc(gmapPlace(s)) + '" target="_blank" rel="noopener noreferrer">' + icon('map') + '地図</a>' : '<span class="muted small">位置は未確認のため地図に出していません</span>') +
    (s.u && /^https?:\/\//.test(s.u) ? '<a class="btn quiet" href="' + esc(s.u) + '" target="_blank" rel="noopener noreferrer">公式</a>' : '') + '</div>';
  if (FEATURES.futari) h += '<div class="row gap"><a class="btn quiet" href="' + esc(futariUrl('new', s)) + '" target="_blank" rel="noopener">ふたりログに書く</a><a class="btn quiet" href="' + esc(futariUrl('wish', s)) + '" target="_blank" rel="noopener">気になるに入れる</a></div>';
  h += '<h3 class="sec">行った記録</h3>';
  if (!vs.length) h += '<p class="muted small">まだ記録がありません。</p>';
  else h += '<ul class="rows">' + vs.map(function(v) {
    var tags = [WHO_LABEL(v.who)];
    if (isEki && v.stamp === 'true') tags.push('スタンプ');
    if (isEki && v.ticket === 'true') tags.push('きっぷ' + (v.ticketNo ? ' ' + v.ticketNo : ''));
    if (v.logId) tags.push('ふたりログあり');
    return '<li><button type="button" class="rowbtn" data-act="visitEdit" data-id="' + esc(v.id) + '"><b>' + esc(dateLabel(v.date) || '日付なし') + '</b><span class="muted">' + esc(tags.join('・')) + (v._pending ? '・未送信' : '') + '</span></button></li>';
  }).join('') + '</ul>';
  if (src) h += '<p class="src">' + esc(src.label) + '</p>';
  if (s.mine) h += '<p class="row"><button type="button" class="btn quiet small" data-act="mySpotEdit" data-id="' + esc(s.id) + '">この名所を直す</button></p>';
  return h;
}

// ---- 行った記録の入力 ----
function visitForm(s, v) {
  var isEki = s.c === 'michinoeki', who = v ? v.who : (prefs().who || 'ふたり');
  return '<form data-submit="visit" class="form" data-spot="' + esc(s.id) + '" data-id="' + esc(v ? v.id : '') + '">' +
    '<label><span>日付</span><input type="date" name="date" value="' + esc(v ? v.date : today()) + '" max="' + today() + '" required></label>' +
    '<fieldset class="seg"><legend>だれ</legend>' + [['ふたり', 'ふたりで'], ['1', names()[0]], ['2', names()[1]]].map(function(o) {
      return '<label><input type="radio" name="who" value="' + o[0] + '"' + (who === o[0] ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label>';
    }).join('') + '</fieldset>' +
    (isEki ? '<label class="check"><input type="checkbox" name="stamp" value="true"' + (v && v.stamp === 'true' ? ' checked' : '') + '><span>スタンプを押した</span></label>' +
      '<label class="check"><input type="checkbox" name="ticket" value="true"' + (v && v.ticket === 'true' ? ' checked' : '') + '><span>きっぷを買った</span></label>' +
      '<label><span>きっぷ番号（任意）</span><input name="ticketNo" maxlength="40" value="' + esc(v ? v.ticketNo : '') + '" inputmode="numeric"></label>' : '') +
    '<div class="form-foot">' + (v ? '<button type="button" class="btn danger" data-act="visitTrash" data-id="' + esc(v.id) + '">記録を消す</button>' : '') + '<button type="submit" class="btn primary">保存</button></div></form>';
}
ACT.visitNew = function(el) { var s = spotById(el.dataset.id); if (s) openSheet(s.n + ' に行った', visitForm(s, null)); };
ACT.visitEdit = function(el) { var v = store.get('visit', el.dataset.id), s = v && spotById(v.spotId); if (v && s) openSheet(s.n + ' の記録', visitForm(s, v)); };
SUBMIT.visit = function(f) {
  var s = spotById(f.dataset.spot), fd = new FormData(f), id = f.dataset.id;
  if (!s) return;
  var val = { spotId: s.id, spotName: s.n, date: String(fd.get('date') || ''), who: String(fd.get('who') || 'ふたり'), stamp: fd.get('stamp') ? 'true' : '', ticket: fd.get('ticket') ? 'true' : '', ticketNo: String(fd.get('ticketNo') || '').trim() };
  if (!val.ticket) val.ticketNo = '';
  setPref('who', val.who);
  if (id) store.patch('visit', id, val);
  else store.add('visit', val);
  closeSheet();
  toast(id ? '記録を直しました' : s.n + ' に行った記録を残しました');
};
ACT.visitTrash = function(el) {
  var id = el.dataset.id;
  closeSheet();
  store.trash('visit', id);
  toast('記録を消しました', function() { store.restore('visit', id); });
};

// ---- ふたりログへ渡す（名前・座標・日付・種類だけ。トークン・氏名・住所は渡さない） ----
function futariUrl(kind, s) {
  var q = { src: 'tabimap', spot: s.id, title: s.n, cat: FUTARI_CAT[s.c] || '旅行', back: APP_URL };
  if (located(s)) { q.lat = s.la.toFixed(6); q.lng = s.lo.toFixed(6); }
  if (kind === 'new') q.date = (calc().visits[s.id] || [{}])[0].date || today();
  return FUTARI_URL + '#' + kind + '?' + Object.keys(q).map(function(k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
}

// ---- URL の # で受け取る（ふたりログから・戻り） ----
//  #spot=ID            その名所を開く
//  #near?lat=&lng=      その地点の近くを探す
//  #linked?spot=&log=   ふたりログで書いたログを、その名所のいちばん新しい記録に結ぶ
function hashParams(s) { var o = {}; String(s || '').split('&').forEach(function(p) { var i = p.indexOf('='); if (i > 0) o[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1)); }); return o; }
function takeHash() {
  var h = location.hash.slice(1);
  if (!h) return;
  history.replaceState(null, '', location.pathname + location.search);
  var at = h.indexOf('?'), kind = at < 0 ? h.split('=')[0] : h.slice(0, at), q = hashParams(at < 0 ? h : h.slice(at + 1));
  if (kind === 'spot' && q.spot) { go('map'); openSpot(q.spot); return; }
  if (kind === 'near') {
    var lat = Number(q.lat), lng = Number(q.lng);
    if (lat > 20 && lat < 46 && lng > 122 && lng < 154) { NEAR.at = { lat: lat, lng: lng, name: 'ふたりログの地点' }; go('near'); }
    return;
  }
  if (kind === 'linked' && q.spot && /^[A-Za-z0-9_\-]{3,64}$/.test(q.log || '')) {
    var vs = calc().visits[q.spot] || [], target = vs.filter(function(v) { return !v.logId; })[0];
    if (!target) { toast('結ぶ記録が見つかりません'); return; }
    store.patch('visit', target.id, { logId: q.log });
    toast('ふたりログのログと結びました');
    openSpot(q.spot);
  }
}

// ============================================================
// Mod_Map : 地図（背景は国土地理院。種類は形、行った所は塗り）
// ============================================================
var MAP = { map: null, layer: null, base: null, me: null, timer: null };
var TILES = {
  pale: ['淡色', 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', 18, '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a>'],
  std: ['標準', 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', 18, '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a>'],
  osm: ['OSM', 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', 19, '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>']
};
function shownCats() { var p = prefs().cats; return p || { michinoeki: true, shrine: true, temple: true, museum: true, other: true }; }

RENDER.map = function() {
  var main = $('main');
  if (!$('mapBox')) {
    main.innerHTML = '<section class="mapwrap"><div class="maptools"><form data-submit="mapSearch" class="searchbar"><input type="search" name="q" placeholder="名所・地名をさがす" enterkeyhint="search" aria-label="名所・地名をさがす"><button type="submit" class="icon-btn" aria-label="さがす">' + icon('search') + '</button></form>' +
      '<button type="button" class="icon-btn" data-act="mapLocate" aria-label="現在地">' + icon('locate') + '</button><button type="button" class="icon-btn" data-act="mapLayers" aria-label="表示する種類">' + icon('layers') + '</button></div>' +
      '<div id="mapBox" class="mapbox"></div><div id="mapCount" class="mapcount"></div></section>';
    MAP.map = null;
  }
  needLeaflet().then(function() {
    if (!MAP.map) {
      var v = prefs().view || [36.2, 138.2, 5];
      MAP.map = L.map('mapBox', { zoomControl: false, attributionControl: true, preferCanvas: true }).setView([v[0], v[1]], v[2]);
      L.control.zoom({ position: 'bottomright' }).addTo(MAP.map);
      MAP.map.attributionControl.setPrefix('');
      setBase(prefs().tile || 'pale');
      MAP.map.on('moveend', function() { var c = MAP.map.getCenter(); setPref('view', [+c.lat.toFixed(4), +c.lng.toFixed(4), MAP.map.getZoom()]); drawSoon(); });
    }
    MAP.map.invalidateSize();
    drawMarks();
  }, function(e) { $('mapBox').innerHTML = '<p class="empty">' + esc(e.message) + '</p>'; });
};
function setBase(k) {
  var t = TILES[k] || TILES.pale;
  if (MAP.base) MAP.map.removeLayer(MAP.base);
  MAP.base = L.tileLayer(t[1], { maxZoom: t[2], attribution: t[3] + '｜<a href="#" data-act="about">出典</a>' }).addTo(MAP.map);
  setPref('tile', k);
}
function drawSoon() { clearTimeout(MAP.timer); MAP.timer = setTimeout(drawMarks, 120); }

// 見えている範囲だけを描く。広域は小さな点、寄ると種類の形
function drawMarks() {
  if (!MAP.map) return;
  var c = calc(), cats = shownCats(), b = MAP.map.getBounds().pad(0.2), z = MAP.map.getZoom();
  if (MAP.layer) MAP.map.removeLayer(MAP.layer);
  MAP.layer = L.layerGroup().addTo(MAP.map);
  var inView = c.all.filter(function(s) { return cats[s.c] && located(s) && b.contains([s.la, s.lo]); });
  var ac = cssVar('accent'), mu = cssVar('muted'), bg = cssVar('bg');
  inView.forEach(function(s) {
    var done = !!c.done[s.id];
    if (z < 10 || inView.length > 500) {
      L.circleMarker([s.la, s.lo], { radius: done ? 4 : 3, weight: 1, color: done ? ac : mu, fillColor: done ? ac : bg, fillOpacity: 1 })
        .on('click', function() { openSpot(s.id); }).addTo(MAP.layer);
    } else {
      L.marker([s.la, s.lo], { icon: L.divIcon({ className: 'pin', html: mark((CATS[s.c] || CATS.other).shape, done) + (z >= 12 ? '<span>' + esc(s.n) + '</span>' : ''), iconSize: [16, 16], iconAnchor: [8, 8] }), title: s.n, keyboard: false })
        .on('click', function() { openSpot(s.id); }).addTo(MAP.layer);
    }
  });
  if (MAP.me) L.circleMarker([MAP.me.lat, MAP.me.lng], { radius: 6, weight: 2, color: bg, fillColor: cssVar('red'), fillOpacity: 1, interactive: false }).addTo(MAP.layer);
  var n = $('mapCount');
  if (n) n.textContent = SPOTS.spots.length ? 'この範囲 ' + inView.length + ' か所・行った ' + inView.filter(function(s) { return c.done[s.id]; }).length : '名所の一覧を受け取っていません';
}

ACT.mapLocate = function() {
  here().then(function(p) { MAP.me = p; MAP.map.setView([p.lat, p.lng], Math.max(MAP.map.getZoom(), 12)); drawMarks(); }, function(e) { toast(e.message); });
};
ACT.mapLayers = function() {
  var cats = shownCats(), t = prefs().tile || 'pale';
  openSheet('表示', '<h3 class="sec">種類</h3><div class="checks">' + CAT_ORDER.map(function(k) {
    return '<label class="check"><input type="checkbox" data-change="mapCat" value="' + k + '"' + (cats[k] ? ' checked' : '') + '>' + mark(CATS[k].shape, false) + '<span>' + esc(CATS[k].name) + '</span></label>';
  }).join('') + '</div><h3 class="sec">背景</h3><div class="seg">' + Object.keys(TILES).map(function(k) {
    return '<label><input type="radio" name="tile" data-change="mapTile" value="' + k + '"' + (k === t ? ' checked' : '') + '><span>' + TILES[k][0] + '</span></label>';
  }).join('') + '</div><p class="muted small">印は、塗ってあれば行った所です。</p>');
};
INPUT.mapCat = function(el) { var c = shownCats(); c[el.value] = el.checked; setPref('cats', c); if (APP.tab === 'near') RENDER.near(); else drawMarks(); };
INPUT.mapTile = function(el) { setBase(el.value); };

// 名所の名前は端末の中だけで探す。地名は国土地理院の住所検索に送る
SUBMIT.mapSearch = function(f) {
  var q = String(new FormData(f).get('q') || '').trim();
  if (!q) return;
  APP.nearPick = false;
  var hits = findSpots(q);
  var el = openSheet('「' + q + '」', '<h3 class="sec">名所</h3>' + (hits.length ? spotRows(hits.map(function(s) { return { s: s }; })) : '<p class="muted small">一致する名所はありません。</p>') + '<h3 class="sec">地名</h3><div id="placeHits"><p class="muted small">さがしています…</p></div>', { key: 'search' });
  searchPlace(q).then(function(list) {
    var box = el.querySelector('#placeHits');
    if (box) box.innerHTML = list.length ? '<ul class="rows">' + list.map(function(p) { return '<li><button type="button" class="rowbtn" data-act="placeGo" data-lat="' + p.lat + '" data-lng="' + p.lng + '" data-name="' + esc(p.name) + '"><b>' + esc(p.name) + '</b></button></li>'; }).join('') + '</ul>' : '<p class="muted small">見つかりません。</p>';
  }, function() { var box = el.querySelector('#placeHits'); if (box) box.innerHTML = '<p class="muted small">地名を検索できません（通信を確かめてください）。</p>'; });
};
ACT.placeGo = function(el) {
  var p = { lat: Number(el.dataset.lat), lng: Number(el.dataset.lng), name: el.dataset.name };
  closeAllSheets();
  if (APP.nearPick) { APP.nearPick = false; NEAR.at = p; go('near'); return; }
  go('map');
  if (MAP.map) MAP.map.setView([p.lat, p.lng], 12);
  else setPref('view', [p.lat, p.lng, 12]);
};

// 名所の行（近く・検索・集めるで共通）
function spotRows(items) {
  var c = calc();
  return '<ul class="rows">' + items.map(function(x) {
    var s = x.s, cat = CATS[s.c] || CATS.other, n = (c.visits[s.id] || []).length;
    return '<li><button type="button" class="rowbtn" data-act="spot" data-id="' + esc(s.id) + '">' + mark(cat.shape, n) + '<b>' + esc(s.n) + '</b><span class="muted">' + esc((s.p ? PREFS[s.p] : '') + (x.d !== undefined ? '・' + kmLabel(x.d) : '')) + '</span>' + (n ? '<em>' + n + ' 回</em>' : '') + '</button></li>';
  }).join('') + '</ul>';
}

// ============================================================
// Mod_Near : 現在地・検索した地点から半径 ○ km の名所
// ============================================================
var NEAR = { at: null, km: 10, busy: false };
var NEAR_KM = [5, 10, 30, 50];

RENDER.near = function() {
  var km = prefs().nearKm || NEAR.km, cats = shownCats();
  var h = '<section class="page"><div class="row gap wrap"><button type="button" class="btn primary" data-act="nearHere"' + (NEAR.busy ? ' disabled' : '') + '>' + icon('locate') + (NEAR.busy ? '取得中…' : '現在地') + '</button>' +
    '<button type="button" class="btn" data-act="nearPlace">' + icon('search') + '地名で</button>' + (MAP.map ? '<button type="button" class="btn" data-act="nearCenter">地図の中心</button>' : '') + '</div>' +
    '<div class="seg km">' + NEAR_KM.map(function(k) { return '<label><input type="radio" name="km" data-change="nearKm" value="' + k + '"' + (k === km ? ' checked' : '') + '><span>' + k + ' km</span></label>'; }).join('') + '</div>' +
    '<div class="chips">' + CAT_ORDER.map(function(k) { return '<label class="chip"><input type="checkbox" data-change="mapCat" value="' + k + '"' + (cats[k] ? ' checked' : '') + '>' + mark(CATS[k].shape, false) + '<span>' + esc(CATS[k].name) + '</span></label>'; }).join('') + '</div>';
  if (!NEAR.at) h += '<p class="empty">現在地か地名を選ぶと、近い順に並べます。<br><span class="small">現在地はこの端末の中だけで使い、送りも残しもしません。</span></p>';
  else {
    var list = nearSpots(NEAR.at.lat, NEAR.at.lng, km, cats), c = calc(), notYet = list.filter(function(x) { return !c.done[x.s.id]; }).length;
    h += '<h2 class="sec">' + esc(NEAR.at.name) + ' から ' + km + ' km<span class="muted"> ' + list.length + ' か所・まだ ' + notYet + '</span></h2>' + (list.length ? spotRows(list.slice(0, 200)) : '<p class="empty">この範囲に名所はありません。</p>');
  }
  $('main').innerHTML = h + '</section>';
};
ACT.nearHere = function() {
  NEAR.busy = true; RENDER.near();
  here().then(function(p) { NEAR.at = { lat: p.lat, lng: p.lng, name: '現在地' }; MAP.me = p; }, function(e) { toast(e.message); })
    .then(function() { NEAR.busy = false; if (APP.tab === 'near') RENDER.near(); });
};
ACT.nearCenter = function() { var c = MAP.map.getCenter(); NEAR.at = { lat: c.lat, lng: c.lng, name: '地図の中心' }; RENDER.near(); };
ACT.nearPlace = function() {
  openSheet('地名で探す', '<form data-submit="nearPlace" class="form"><label><span>地名・駅名・住所</span><input type="search" name="q" required enterkeyhint="search"></label><div class="form-foot"><button type="submit" class="btn primary">さがす</button></div></form><div id="nearHits"></div>');
  var i = topSheet().querySelector('input'); if (i) i.focus();
};
SUBMIT.nearPlace = function(f) {
  var q = String(new FormData(f).get('q') || '').trim(), box = topSheet().querySelector('#nearHits');
  box.innerHTML = '<p class="muted small">さがしています…</p>';
  APP.nearPick = true;
  searchPlace(q).then(function(list) {
    box.innerHTML = list.length ? '<ul class="rows">' + list.map(function(p) { return '<li><button type="button" class="rowbtn" data-act="placeGo" data-lat="' + p.lat + '" data-lng="' + p.lng + '" data-name="' + esc(p.name) + '"><b>' + esc(p.name) + '</b></button></li>'; }).join('') + '</ul>' : '<p class="muted small">見つかりません。</p>';
  }, function() { box.innerHTML = '<p class="muted small">地名を検索できません（通信を確かめてください）。</p>'; });
};
INPUT.nearKm = function(el) { setPref('nearKm', Number(el.value)); RENDER.near(); };

// ============================================================
// Mod_Collect : 道の駅のスタンプ帳・集める一覧の達成表
// ============================================================
RENDER.collect = function() {
  var mode = prefs().collect || 'stamp';
  var h = '<section class="page"><div class="seg tabs">' + [['stamp', 'スタンプ帳'], ['lists', '集める一覧']].map(function(o) {
    return '<label><input type="radio" name="collect" data-change="collectMode" value="' + o[0] + '"' + (o[0] === mode ? ' checked' : '') + '><span>' + o[1] + '</span></label>';
  }).join('') + '</div>';
  if (!SPOTS.spots.length) h += '<p class="empty">名所の一覧をまだ受け取っていません。接続すると届きます。</p>';
  else h += mode === 'lists' ? listsHtml() : stampHtml();
  $('main').innerHTML = h + '</section>';
};
INPUT.collectMode = function(el) { setPref('collect', el.value); RENDER.collect(); };

// 地方 → 都道府県 → 駅。押した・買ったが一目で分かる細い表
function stampHtml() {
  var c = calc(), eki = c.all.filter(function(s) { return s.c === 'michinoeki'; }), open = prefs().openPref || {};
  var byPref = {};
  eki.forEach(function(s) { (byPref[s.p] = byPref[s.p] || []).push(s); });
  var tot = { n: eki.length, v: 0, st: 0, tk: 0 };
  eki.forEach(function(s) { if (c.done[s.id]) tot.v++; if (c.stamp[s.id]) tot.st++; if (c.ticket[s.id]) tot.tk++; });
  var h = '<div class="sum"><div><b>' + tot.v + '</b><span>行った</span></div><div><b>' + tot.st + '</b><span>スタンプ</span></div><div><b>' + tot.tk + '</b><span>きっぷ</span></div><div><b>' + tot.n + '</b><span>全国</span></div></div>';
  REGIONS.forEach(function(r) {
    var ps = r[1].filter(function(p) { return byPref[p]; });
    if (!ps.length) return;
    h += '<h2 class="sec">' + esc(r[0]) + '</h2>';
    ps.forEach(function(p) {
      var list = byPref[p].slice().sort(function(a, b) { return a.n.localeCompare(b.n, 'ja'); }), st = list.filter(function(s) { return c.stamp[s.id]; }).length;
      h += '<details class="pref" data-pref="' + p + '"' + (open[p] ? ' open' : '') + '><summary><b>' + esc(PREFS[p]) + '</b><span class="muted">スタンプ ' + st + ' / ' + list.length + '</span>' + bar(st, list.length) + '</summary>' +
        '<table class="stamps"><thead><tr><th>駅</th><th>行った</th><th>スタンプ</th><th>きっぷ</th></tr></thead><tbody>' + list.map(function(s) {
          return '<tr data-act="spot" data-id="' + esc(s.id) + '"><td>' + esc(s.n.replace(/^道の駅\s*/, '')) + '</td><td>' + (c.done[s.id] ? '<i class="dot on"></i>' : '<i class="dot"></i>') + '</td><td>' + (c.stamp[s.id] ? '<i class="dot on"></i>' : '<i class="dot"></i>') + '</td><td>' + (c.ticket[s.id] ? '<i class="dot gold"></i>' : '<i class="dot"></i>') + '</td></tr>';
        }).join('') + '</tbody></table></details>';
    });
  });
  return h;
}
// 開いた県を覚えておく（描き直しで閉じないように）
document.addEventListener('toggle', function(e) {
  var d = e.target;
  if (!d.matches || !d.matches('details.pref')) return;
  var o = prefs().openPref || {};
  if (d.open) o[d.dataset.pref] = 1; else delete o[d.dataset.pref];
  setPref('openPref', o);
}, true);

function listsHtml() {
  var c = calc();
  return '<ul class="rows lists-progress">' + SPOTS.lists.map(function(L) {
    var p = c.lists[L.key];
    return '<li><button type="button" class="rowbtn" data-act="listOpen" data-key="' + esc(L.key) + '"><b>' + esc(L.name) + '</b><span class="muted">' + p.done + ' / ' + p.total + (L.group ? ' ' + esc(L.unit || '') : '') + '</span>' + bar(p.done, p.total) + '</button></li>';
  }).join('') + '</ul>';
}
ACT.listOpen = function(el) {
  var L = SPOTS.lists.filter(function(x) { return x.key === el.dataset.key; })[0];
  if (!L) return;
  var c = calc(), spots = c.all.filter(function(s) { return (s.l || []).indexOf(L.key) >= 0; }), groups = {}, order = [];
  if (L.order) spots.sort(function(a, b) { return numberOf(a, L.key) - numberOf(b, L.key); });
  spots.forEach(function(s) { var g = L.group || L.show ? (groupOf(s, L.key) || s.n) : PREFS[s.p] || 'そのほか'; if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(s); });
  if (!L.group && !L.show) order.sort(function(a, b) { return PREFS.indexOf(a) - PREFS.indexOf(b); });
  var h = (L.note ? '<p class="muted small">' + esc(L.note) + '</p>' : '') + order.map(function(g) {
    var done = groups[g].some(function(s) { return c.done[s.id]; });
    return '<h3 class="sec">' + (L.group ? mark('circle', done, 'sm') : '') + esc(g) + '</h3>' + spotRows(groups[g].map(function(s) { return { s: s }; }));
  }).join('');
  openSheet(L.name, h);
};

// ============================================================
// Mod_Titles : 称号・都道府県の塗り・年ごとの数・最近行った所
// ============================================================
RENDER.titles = function() {
  var c = calc(), ts = titles(), h = '<section class="page">';
  var held = ts.filter(function(t) { return t.cur; });
  h += '<h2 class="sec">いまの称号<span class="muted"> ' + held.length + '</span></h2>';
  h += held.length ? '<ul class="titles">' + held.map(function(t) { return '<li><b>' + esc(t.kind === 'list' ? t.label + ' ' + t.cur[1] : t.cur[1]) + '</b><span class="muted">' + esc(t.label) + ' ' + t.n + (t.total ? ' / ' + t.total : '') + '</span></li>'; }).join('') + '</ul>' : '<p class="empty">行った記録を残すと、ここに称号が並びます。</p>';
  h += '<h2 class="sec">次の称号まで</h2><ul class="rows next">' + ts.filter(function(t) { return t.next && (t.kind === 'count' || t.total); }).map(function(t) {
    var goal = t.kind === 'list' ? Math.ceil(t.next[0] * t.total) : t.next[0], prev = t.kind === 'list' ? (t.cur ? Math.ceil(t.cur[0] * t.total) : 0) : (t.cur ? t.cur[0] : 0);
    return '<li><div class="rowline"><b>' + esc(t.kind === 'list' ? t.label + ' ' + t.next[1] : t.next[1]) + '</b><span class="muted">' + esc(t.label) + ' あと ' + Math.max(0, goal - t.n) + '</span>' + bar(t.n - prev, goal - prev) + '</div></li>';
  }).join('') + '</ul>';
  h += '<h2 class="sec">都道府県<span class="muted"> ' + Object.keys(c.prefs).length + ' / 47</span></h2>' + prefGrid(c);
  var years = Object.keys(c.years).sort().reverse();
  if (years.length) {
    var max = Math.max.apply(null, years.map(function(y) { return Object.keys(c.years[y]).length; }));
    h += '<h2 class="sec">年ごと</h2><ul class="years">' + years.map(function(y) { var n = Object.keys(c.years[y]).length; return '<li><span>' + y + '</span><b>' + n + '</b>' + bar(n, max) + '</li>'; }).join('') + '</ul>';
  }
  if (c.recent.length) h += '<h2 class="sec">最近</h2><ul class="rows">' + c.recent.slice(0, 12).map(function(v) {
    var s = spotById(v.spotId);
    return '<li><button type="button" class="rowbtn" data-act="spot" data-id="' + esc(v.spotId) + '">' + mark(s ? (CATS[s.c] || CATS.other).shape : 'ring', true) + '<b>' + esc(s ? s.n : v.spotName) + '</b><span class="muted">' + esc(dateLabel(v.date) + '・' + WHO_LABEL(v.who)) + '</span></button></li>';
  }).join('') + '</ul>';
  $('main').innerHTML = h + '</section>';
};

// 行った名所の数で濃さを 4 段に分ける
function prefGrid(c) {
  var max = 0;
  Object.keys(c.prefs).forEach(function(p) { max = Math.max(max, c.prefs[p]); });
  var cells = Object.keys(PREF_GRID).map(function(p) {
    var g = PREF_GRID[p], n = c.prefs[p] || 0, lv = !n ? 0 : n >= max * 0.75 ? 4 : n >= max * 0.5 ? 3 : n >= max * 0.25 ? 2 : 1;
    return '<span class="pg l' + lv + '" style="grid-column:' + (g[0] + 1) + ';grid-row:' + (g[1] + 1) + '" title="' + esc(PREFS[p] + ' ' + n) + '">' + esc(PREFS[p].replace(/[都府県]$/, '').slice(0, 3)) + '</span>';
  }).join('');
  return '<div class="prefgrid" role="img" aria-label="行った名所のある都道府県">' + cells + '</div>';
}

// ============================================================
// Mod_Misc : 設定・接続・自分で足す名所・出典・起動
// ============================================================
ACT.settings = function() {
  var st = store.st, h = '<div class="block"><div class="rowline"><b>' + (lsGet(KEY_TOKEN) ? (authRejected ? 'トークンが一致しません' : '接続済み' + (myName() ? '（' + esc(myName()) + '）' : '')) : '未接続') + '</b><button type="button" class="btn small" data-act="connect">接続トークン</button></div>' +
    '<p class="muted small">最終同期 ' + esc(st.server.syncedAt || '-') + '・未送信 ' + st.queue.length + ' 件・名所 ' + SPOTS.spots.length + ' か所' + (SPOTS.version ? '（' + esc(SPOTS.version) + '）' : '') + '</p><button type="button" class="btn small" data-act="sync">今すぐ同期</button></div>';
  if (st.failed.length) h += '<h3 class="sec">送れなかった変更</h3><ul class="rows">' + st.failed.map(function(op) {
    return '<li><div class="rowline"><span>' + esc((op.set && op.set.spotName) || op.fn) + '</span><span class="muted small">' + esc(op.error) + '</span><button type="button" class="btn small" data-act="retryFailed" data-q="' + esc(op.qid) + '">再送</button><button type="button" class="btn small quiet" data-act="dropFailed" data-q="' + esc(op.qid) + '">捨てる</button></div></li>';
  }).join('') + '</ul>';
  h += '<h3 class="sec">名所</h3><button type="button" class="btn" data-act="mySpotNew">' + icon('plus') + '一覧にない名所を足す</button>';
  h += '<h3 class="sec">最初に開く画面</h3><div class="seg">' + [['map', '地図'], ['near', '近く'], ['collect', '集める'], ['titles', '称号']].map(function(o) {
    return '<label><input type="radio" name="start" data-change="startTab" value="' + o[0] + '"' + ((prefs().start || 'map') === o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>';
  }).join('') + '</div>';
  h += '<h3 class="sec">ほか</h3><div class="row gap wrap"><button type="button" class="btn quiet" data-act="about">この地図について（出典）</button>' + (FEATURES.futari ? '<a class="btn quiet" href="' + FUTARI_URL + '" target="_blank" rel="noopener">ふたりログを開く</a>' : '') + '</div><p class="muted small">版 ' + esc(window.APP_VERSION || '-') + '</p>';
  openSheet('設定', h, { key: 'settings' });
};
INPUT.startTab = function(el) { setPref('start', el.value); };
ACT.retryFailed = function(el) { store.retryFailed(el.dataset.q); closeSheet(); };
ACT.dropFailed = function(el) { store.dropFailed(el.dataset.q); closeSheet(); };

function openConnect() {
  openSheet('接続トークン', '<form data-submit="connect" class="form"><p class="muted small">設定する人から受け取ったトークンを貼り付けます。ふたりログのトークンとは別のものです。トークンはこの端末にだけ置きます。</p><label><span>トークン</span><input name="token" type="password" autocomplete="off" required minlength="32"></label><div class="form-foot"><button type="submit" class="btn primary">接続</button></div></form>');
}
ACT.connect = function() { closeAllSheets(); openConnect(); };
SUBMIT.connect = function(f) {
  var token = String(new FormData(f).get('token') || '').trim();
  postApi(token, 'ping', {}).then(function(r) {
    lsSet(KEY_TOKEN, token);
    authRejected = false;
    closeAllSheets();
    toast(r.name + ' として接続しました');
    sync(false);
  }, function(e) { toast(e.code === 'UNAUTHORIZED' ? 'トークンが一致しません' : e.message); });
};

// ---- 自分で足す名所（第 3 段階までの百名城なども、ここで記録できる） ----
function mySpotForm(m, at) {
  m = m || {};
  return '<form data-submit="mySpot" class="form" data-id="' + esc(m.id || '') + '"><label><span>名前</span><input name="name" required maxlength="100" value="' + esc(m.name || '') + '"></label>' +
    '<label><span>種類</span><select name="cat">' + options(CAT_ORDER.map(function(k) { return [k, CATS[k].name]; }), m.cat || 'other') + '</select></label>' +
    '<label><span>都道府県</span><select name="pref">' + options(PREFS.map(function(p, i) { return [i, p || '—']; }), m.pref || 0) + '</select></label>' +
    '<div class="row gap"><label class="half"><span>緯度</span><input name="lat" inputmode="decimal" required value="' + esc(m.lat || (at ? at.lat.toFixed(6) : '')) + '"></label><label class="half"><span>経度</span><input name="lng" inputmode="decimal" required value="' + esc(m.lng || (at ? at.lng.toFixed(6) : '')) + '"></label></div>' +
    '<button type="button" class="btn small quiet" data-act="mySpotHere">現在地を入れる</button>' +
    '<label><span>メモ</span><textarea name="memo" rows="2" maxlength="500">' + esc(m.memo || '') + '</textarea></label>' +
    '<div class="form-foot">' + (m.id ? '<button type="button" class="btn danger" data-act="mySpotTrash" data-id="' + esc(m.id) + '">消す</button>' : '') + '<button type="submit" class="btn primary">保存</button></div></form>';
}
ACT.mySpotNew = function() { var c = MAP.map ? MAP.map.getCenter() : null; openSheet('名所を足す', mySpotForm(null, c ? { lat: c.lat, lng: c.lng } : null)); };
ACT.mySpotEdit = function(el) { var m = store.get('myspot', el.dataset.id); if (m) openSheet('名所を直す', mySpotForm(m)); };
ACT.mySpotHere = function(el) {
  var f = el.closest('form');
  here().then(function(p) { f.lat.value = p.lat.toFixed(6); f.lng.value = p.lng.toFixed(6); }, function(e) { toast(e.message); });
};
SUBMIT.mySpot = function(f) {
  var fd = new FormData(f), val = { name: String(fd.get('name')).trim(), cat: String(fd.get('cat')), pref: Number(fd.get('pref')) || '', lat: Number(fd.get('lat')), lng: Number(fd.get('lng')), memo: String(fd.get('memo') || '').trim() };
  if (!(val.lat > 20 && val.lat < 46 && val.lng > 122 && val.lng < 154)) { toast('緯度・経度が日本の範囲にありません'); return; }
  var id = f.dataset.id;
  if (id) store.patch('myspot', id, val); else id = store.add('myspot', val);
  closeAllSheets();
  toast('名所を保存しました');
  openSpot(id);
};
ACT.mySpotTrash = function(el) {
  var id = el.dataset.id;
  closeAllSheets();
  store.trash('myspot', id);
  toast('名所を消しました', function() { store.restore('myspot', id); });
};

// ---- 出典 ----
ACT.about = function() {
  var h = '<p class="small">名所の一覧は、次の資料を加工して作成しています。国や各団体が作ったものではありません。</p><ul class="srcs">' + SPOTS.sources.map(function(s) {
    return '<li>' + esc(s.label) + (s.url ? '<br><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.url) + '</a>' : '') + (s.license ? '<br><span class="muted">' + esc(s.license) + '</span>' : '') + '</li>';
  }).join('') + '</ul><p class="small">地図: 国土地理院（地理院タイル）、OpenStreetMap contributors（ODbL）。地名の検索は国土地理院の住所検索を使い、入力した語句だけを送ります。</p>' +
    '<p class="small">公式のスタンプ・きっぷの絵柄は使っていません。記録は自分たちの控えです。</p>';
  openSheet('この地図について', h);
};

boot();

})();
