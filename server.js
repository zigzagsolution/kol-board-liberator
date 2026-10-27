/* KOL Approval Board — server logic (Code.gs โหลดไฟล์นี้จาก GitHub → แก้ใน repo แล้วมีผลใน ~1–2 นาที ไม่ต้อง Deploy) */
const SOURCE_ID   = "19Y-Vec0IqTksB8NJwZfu4MkLQpy2iMkQrGtm1RqVU8c"; // ชีต Liberator "ข้อมูล KOL สาย IT/Technology" — ต้องแชร์ให้บัญชีที่รันสคริปต์
const SOURCE_TAB  = "";   // เว้นว่าง = แท็บแรก
const REVIEW_NAME = "KOL Reviews — Liberator";
/* คอลัมน์ที่ห้ามส่งออกไปหน้าเว็บ (ตัดทิ้งฝั่งเซิร์ฟเวอร์) */
const HIDE_COLS = ["เรท","ราคา","rate","งบ"];
/* ตัวเลือกเหตุผล "ไม่ผ่าน" — แก้ตรงนี้ได้เลย */
const REASONS = ["ไม่ตรงสาย / กลุ่มเป้าหมาย", "ภาพลักษณ์ยังไม่เหมาะ", "ยอดผู้ติดตามน้อยเกินไป", "คอนเทนต์ไม่น่าสนใจ", "เคยรับงานแล้วทิ้ง"];
/* รหัสล้างข้อมูลทดสอบ: พิมพ์คำนี้ในช่อง "ชื่อบัญชี" ของหน้าต่าง "เพิ่ม KOL ใหม่" แล้วบันทึก → ล้าง Reviews/History/Suggestions/Log ทั้งหมด */
const RESET_CODE = "ล้างข้อมูลทดสอบ 2569";
/* ตั้งค่า LINE: Apps Script → การตั้งค่าโปรเจกต์ → Script Properties → LINE_TOKEN, LINE_TO, APP_URL (ไม่ต้อง Deploy ใหม่) */
function config_() {
  const p = PropertiesService.getScriptProperties();
  const c = { LINE_TOKEN: p.getProperty("LINE_TOKEN") || "", LINE_TO: p.getProperty("LINE_TO") || "", APP_URL: p.getProperty("APP_URL") || "" };
  return c;
}

/* ===== สิทธิ์เข้าดู: แท็บ Access [vid, ชื่อ, เบอร์, สถานะ, ขอเมื่อ, ตัดสินโดย, ตัดสินเมื่อ, role, อุปกรณ์] ===== */
const STAFF_CODES = { "9999": "admin", "0000": "client" }; // 0000 = ลูกค้าเข้าดู · 9999 = ทีมงาน
function accessSheet_() { return tab_("Access", ["vid","ชื่อ","เบอร์","สถานะ","ขอเมื่อ","ตัดสินโดย","ตัดสินเมื่อ","role","อุปกรณ์"]); }
function accessRows_() { const sh = accessSheet_(); const n = sh.getLastRow(); return n > 1 ? sh.getRange(2, 1, n-1, 9).getValues() : []; }
function accessOf_(vid) { if (!vid) return null; const rows = accessRows_(); for (let i = rows.length-1; i >= 0; i--) if (String(rows[i][0]) === String(vid)) return { row: i+2, vid: String(rows[i][0]), name: String(rows[i][1]), phone: String(rows[i][2]), status: String(rows[i][3]), at: rows[i][4], by: String(rows[i][5]), decidedAt: rows[i][6], role: String(rows[i][7]), ua: String(rows[i][8]) }; return null; }
function auth_(p) { const a = accessOf_(p && p._vid); if (!a || a.status !== "approved") throw new Error(a && a.status === "denied" ? "คำขอเข้าดูถูกปฏิเสธ" : "ยังไม่ได้รับอนุญาตให้เข้าดู"); return a; }
function admin_(p) { const a = auth_(p); if (a.role !== "admin") throw new Error("เฉพาะทีมงาน MIDI"); return a; }
const normPhone_ = s => String(s||"").replace(/\D/g, "");
function requestAccess(p) {
  const vid = String(p && p.vid || "").trim(), name = String(p && p.name || "").trim().slice(0,60), phone = String(p && p.phone || "").trim().slice(0,20);
  if (!vid || !name) throw new Error("missing");
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const cur = accessOf_(vid); if (cur && cur.status !== "pending") return { status: cur.status, admin: cur.role === "admin", name: cur.name };
    if (cur) return { status: "pending" };
    const sh = accessSheet_(); const rows = accessRows_(); const ph = normPhone_(phone);
    const prior = ph ? rows.find(r => String(r[3]) === "approved" && normPhone_(r[2]) === ph) : null;
    if (prior) { sh.appendRow([vid, name, phone, "approved", new Date(), "auto (เบอร์เคยอนุมัติ)", new Date(), String(prior[7]||"viewer"), String(p.ua||"").slice(0,120)]); try { pushLine_("✅ เข้าดูบอร์ด KOL (เบอร์เคยอนุมัติ)\n" + name + "\n" + phone); } catch (e) {} return { status: "approved", admin: String(prior[7]) === "admin", name }; }
    sh.appendRow([vid, name, phone, "pending", new Date(), "", "", "viewer", String(p.ua||"").slice(0,120)]);
    const pending = rows.filter(r => String(r[3]) === "pending").length + 1; const C = config_();
    try { pushLine_("🔔 ขอเข้าดูบอร์ด KOL\n👤 " + name + "\n📞 " + phone + "\n⏰ " + Utilities.formatDate(new Date(), "Asia/Bangkok", "d MMM HH:mm") + "\nรออนุมัติ " + pending + " คน — เปิดบอร์ด → ปุ่ม 🔔 คำขอเข้าดู" + (C.APP_URL ? "\n" + C.APP_URL : "")); } catch (e) {}
    return { status: "pending" };
  } finally { lock.releaseLock(); }
}
function accessStatus(p) { const a = accessOf_(p && p.vid); return a ? { status: a.status, admin: a.role === "admin", name: a.name } : { status: "none" }; }
function staffLogin(p) {
  const vid = String(p && p.vid || "").trim(), code = String(p && p.code || "").trim(), name = String(p && p.name || "").trim().slice(0,40);
  if (!STAFF_CODES[code]) return { ok:false, msg:"รหัสไม่ถูกต้อง" }; if (!vid || !name) return { ok:false, msg:"กรุณาใส่ชื่อ" };
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { const sh = accessSheet_(); const cur = accessOf_(vid); const rec = [vid, name, "", "approved", cur ? cur.at : new Date(), STAFF_CODES[code] === "admin" ? "รหัสทีมงาน" : "รหัสลูกค้า", new Date(), STAFF_CODES[code], String(p.ua||"").slice(0,120)];
    if (cur) sh.getRange(cur.row, 1, 1, 9).setValues([rec]); else sh.appendRow(rec); return { ok:true, admin: STAFF_CODES[code] === "admin" }; } finally { lock.releaseLock(); }
}
function listAccess(p) { admin_(p); const rows = accessRows_(); return rows.map((r, i) => ({ vid: String(r[0]), name: String(r[1]), phone: String(r[2]), status: String(r[3]), at: r[4] ? new Date(r[4]).getTime() : 0, by: String(r[5]), decidedAt: r[6] ? new Date(r[6]).getTime() : 0, role: String(r[7]), ua: String(r[8]||"").replace(/^Mozilla\/5\.0 \(([^;)]+).*$/, "$1").slice(0,24) })).reverse().slice(0, 100); }
function setAccess(p) {
  const me = admin_(p); const target = accessOf_(p && p.target); if (!target) throw new Error("ไม่พบคำขอ");
  const status = p.status === "approved" ? "approved" : "denied";
  accessSheet_().getRange(target.row, 4, 1, 4).setValues([[status, target.at, String(p.by || me.name || "").slice(0,60), new Date()]]);
  return { ok:true };
}

/** ข้อมูลทั้งหมดที่หน้าใช้: ตารางจากชีตต้นทาง + ผลพิจารณา */
function getData(p) {
  auth_(p);
  const ss = SpreadsheetApp.openById(SOURCE_ID);
  const sh = SOURCE_TAB ? ss.getSheetByName(SOURCE_TAB) : ss.getSheets()[0];
  const grid = sanitize_(sh.getDataRange().getDisplayValues());
  return { grid: grid, reviews: readReviews_(), suggestions: readSuggestions_(), history: readHistory_(), posts: readPosts_(), reasons: REASONS, at: Date.now() };
}

/** บันทึกผล {key,name,status,by} — status: "pass" | "fail" | "" (ยกเลิก) */
function setReview(r) {
  if (!r || !r.key) throw new Error("missing key");
  auth_(r);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = reviewSheet_();
    const vals = sh.getDataRange().getValues();
    const now = new Date();
    const row = [String(r.key), String(r.name||""), String(r.status||""), String(r.by||"").slice(0,60), now, String(r.reason||"").slice(0,300)];
    if (String(vals[0][5]||"") !== "เหตุผล") sh.getRange(1, 6).setValue("เหตุผล");
    let done = false;
    for (let i = 1; i < vals.length; i++) {
      if (String(vals[i][0]) === String(r.key)) { sh.getRange(i+1, 1, 1, 6).setValues([row]); done = true; break; }
    }
    if (!done) sh.appendRow(row);
    logHistory_(sh.getParent(), row);
    if (r.status === "fail") notifyLine_(r);
    return {ok:true};
  } finally { lock.releaseLock(); }
}

/** บันทึกระยะในแผน {key,name,phase:"1,3",by} — เก็บคอลัมน์ G ของแถว Reviews */
function setPhase(r) {
  if (!r || !r.key) throw new Error("missing key");
  auth_(r);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = reviewSheet_(); const vals = sh.getDataRange().getValues();
    if (String(vals[0][6]||"") !== "ระยะ") sh.getRange(1, 7).setValue("ระยะ");
    let row = -1; for (let i = 1; i < vals.length; i++) if (String(vals[i][0]) === String(r.key)) { row = i+1; break; }
    if (String(vals[0][7]||"") !== "ผู้จัดระยะ") sh.getRange(1, 8).setValue("ผู้จัดระยะ");
    if (row < 0) { sh.appendRow([String(r.key), String(r.name||""), "", "", new Date(), "", String(r.phase||""), String(r.by||"").slice(0,60)]); }
    else sh.getRange(row, 7, 1, 2).setValues([[String(r.phase||""), String(r.by||"").slice(0,60)]]);
    return {ok:true};
  } finally { lock.releaseLock(); }
}
/** บันทึกระยะหลายคนทีเดียว (ปุ่ม AI จัดให้) */
function setPhases(list) {
  if (!list || !list.length) return {ok:true, n:0};
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = reviewSheet_(); const vals = sh.getDataRange().getValues();
    if (String(vals[0][6]||"") !== "ระยะ") sh.getRange(1, 7).setValue("ระยะ");
    if (String(vals[0][7]||"") !== "ผู้จัดระยะ") sh.getRange(1, 8).setValue("ผู้จัดระยะ");
    const idx = {}; for (let i = 1; i < vals.length; i++) idx[String(vals[i][0])] = i+1;
    list.slice(0, 300).forEach(r => { if (!r || !r.key) return; const row = idx[String(r.key)];
      if (row) sh.getRange(row, 7, 1, 2).setValues([[String(r.phase||""), String(r.by||"").slice(0,60)]]);
      else sh.appendRow([String(r.key), String(r.name||""), "", "", new Date(), "", String(r.phase||""), String(r.by||"").slice(0,60)]); });
    return {ok:true, n:list.length};
  } finally { lock.releaseLock(); }
}
/** วันโพสต์ {key,name,dates:"8,21",by} — คอลัมน์ I ของ Reviews */
function setDates(r) { auth_(r); return setDatesMany([r]); }
function setDatesMany(list) {
  if (!list || !list.length) return {ok:true, n:0};
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = reviewSheet_(); const vals = sh.getDataRange().getValues();
    if (String(vals[0][8]||"") !== "วันโพสต์") sh.getRange(1, 9).setValue("วันโพสต์");
    if (String(vals[0][9]||"") !== "ผู้กำหนดวัน") sh.getRange(1, 10).setValue("ผู้กำหนดวัน");
    const idx = {}; for (let i = 1; i < vals.length; i++) idx[String(vals[i][0])] = i+1;
    list.slice(0, 300).forEach(r => { if (!r || !r.key) return; const row = idx[String(r.key)];
      if (row) sh.getRange(row, 9, 1, 2).setValues([[String(r.dates||""), String(r.by||"").slice(0,60)]]);
      else sh.appendRow([String(r.key), String(r.name||""), "", "", new Date(), "", "", "", String(r.dates||""), String(r.by||"").slice(0,60)]); });
    return {ok:true, n:list.length};
  } finally { lock.releaseLock(); }
}
/** แนวคอนเทนต์ต่อโพสต์ {key,kol,name,day,format,brief,status,link,by} — แท็บ Posts */
function setPost(p) {
  if (!p || !p.key) throw new Error("missing key");
  auth_(p);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = tab_("Posts", ["key","kol","ชื่อ KOL","วัน","รูปแบบ","แนวคอนเทนต์","สถานะ","ลิงก์โพสต์","แก้โดย","เวลา"]);
    const vals = sh.getDataRange().getValues(); let row = -1;
    for (let i = 1; i < vals.length; i++) if (String(vals[i][0]) === String(p.key)) { row = i+1; break; }
    const rec = [String(p.key), String(p.kol||""), String(p.name||""), Number(p.day||0), String(p.format||"").slice(0,60), String(p.brief||"").slice(0,2000), String(p.status||"plan"), String(p.link||"").slice(0,300), String(p.by||"").slice(0,60), new Date()];
    if (row > 0) sh.getRange(row, 1, 1, rec.length).setValues([rec]); else sh.appendRow(rec);
    return {ok:true};
  } finally { lock.releaseLock(); }
}
function readPosts_() {
  const ss = reviewSheet_().getParent(); const sh = ss.getSheetByName("Posts"); if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh.getDataRange().getValues(); const out = [];
  for (let i = 1; i < vals.length; i++) { if (!vals[i][0]) continue; out.push({ key: String(vals[i][0]), kol: String(vals[i][1]), name: String(vals[i][2]), day: Number(vals[i][3]||0), format: String(vals[i][4]||""), brief: String(vals[i][5]||""), status: String(vals[i][6]||"plan"), link: String(vals[i][7]||""), by: dstr_(vals[i][8]) }); }
  return out;
}
/** สำเนาวันโพสต์ (ก่อนล้าง/ก่อนใช้แผน) — แท็บ Snapshots เก็บล่าสุด 20 ชุด */
function snapshotDates(p) {
  const sh = tab_("Snapshots", ["id","เวลา","โดย","รายการ","จำนวน","json"]);
  const id = Utilities.getUuid().slice(0, 8); const snap = (p && p.snap) || {};
  sh.appendRow([id, new Date(), String(p && p.by || "").slice(0,60), String(p && p.label || "").slice(0,80), Object.keys(snap).length, JSON.stringify(snap).slice(0, 45000)]);
  const n = sh.getLastRow(); if (n > 21) sh.deleteRows(2, n - 21);
  return {ok:true, id};
}
function listSnapshots() {
  const ss = reviewSheet_().getParent(); const sh = ss.getSheetByName("Snapshots"); if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh.getRange(2, 1, sh.getLastRow()-1, 5).getValues();
  return vals.map(r => ({ id: String(r[0]), at: r[1] ? new Date(r[1]).getTime() : 0, by: String(r[2]), label: String(r[3]), n: Number(r[4]||0) })).reverse();
}
function restoreSnapshot(p) {
  const ss = reviewSheet_().getParent(); const sh = ss.getSheetByName("Snapshots"); if (!sh) throw new Error("ไม่มีสำเนา");
  const vals = sh.getDataRange().getValues(); let snap = null;
  for (let i = 1; i < vals.length; i++) if (String(vals[i][0]) === String(p && p.id)) { snap = JSON.parse(vals[i][5] || "{}"); break; }
  if (!snap) throw new Error("ไม่พบสำเนา");
  snapshotDates({ by: p.by, label: "ก่อนกู้คืน", snap: currentDates_() });
  const list = Object.keys(snap).map(k => ({ key: k, name: snap[k].name, dates: snap[k].dates, by: p.by }));
  // คนที่ไม่อยู่ในสำเนา → ล้างวัน
  Object.keys(currentDates_()).forEach(k => { if (!snap[k]) list.push({ key: k, name: "", dates: "", by: p.by }); });
  return setDatesMany(list);
}
function currentDates_() {
  const sh = reviewSheet_(); const vals = sh.getDataRange().getValues(); const out = {};
  for (let i = 1; i < vals.length; i++) if (vals[i][0] && dstr_(vals[i][8])) out[String(vals[i][0])] = { name: String(vals[i][1]), dates: String(vals[i][8]) };
  return out;
}
/** คำแนะนำ KOL จากลูกค้า {name,link,f,cat,note,by,vid} */
function addSuggestion(s) {
  if (!s || !s.name) throw new Error("missing name");
  auth_(s);
  if (String(s.name).trim() === RESET_CODE) { resetAll_(); return {ok:true, reset:true}; }
  if (String(s.name).trim() === "ทดสอบไลน์") { throw new Error("LINE: " + pushLine_("✅ ทดสอบแจ้งเตือนจาก KOL Board · Liberator โดย " + (s.by||"-"))); }
  const sh = tab_("Suggestions", ["เวลา","ชื่อบัญชี","ลิงก์","ผู้ติดตาม","หมวด","หมายเหตุ","ผู้แนะนำ","visitor"]);
  sh.appendRow([new Date(), String(s.name).slice(0,80), String(s.link||"").slice(0,300), String(s.f||"").slice(0,20), String(s.cat||"").slice(0,80), String(s.note||"").slice(0,300), String(s.by||"").slice(0,60), String(s.vid||"")]);
  return {ok:true};
}
/** บันทึกเหตุการณ์การใช้งาน (เปิดหน้า, ติ๊ก, กรอง, กดลิงก์, ออกจากหน้า) */
function logEvents(events, meta) {
  if (!events || !events.length) return {ok:true};
  const sh = tab_("Log", ["เวลา","visitor","ชื่อที่ระบุ","เหตุการณ์","รายละเอียด","อยู่ในหน้า(วิ)","อุปกรณ์/เบราว์เซอร์","จอ","ภาษา","โซนเวลา","มาจาก"]);
  meta = meta || {};
  const rows = events.slice(0, 200).map(e => [new Date(e.t||Date.now()), String(e.vid||""), String(e.who||""), String(e.ev||""), String(e.detail||"").slice(0,200), Number(e.dur||0), String(meta.ua||"").slice(0,200), String(meta.screen||""), String(meta.lang||""), String(meta.tz||""), String(meta.ref||"").slice(0,200)]);
  sh.getRange(sh.getLastRow()+1, 1, rows.length, rows[0].length).setValues(rows);
  return {ok:true};
}

/* ---------- internal ---------- */
/** วันโพสต์เป็นดัชนีวัน (0 = วันแรก) — ชีตอาจเก็บ "0" เป็นตัวเลข 0 จึงห้ามใช้ ||"" */
function dstr_(v) { return (v === "" || v == null) ? "" : String(v); }
/** ตัดคอลัมน์ลับ (เรท/ราคา) และปิดบังเบอร์โทรในทุกช่อง ก่อนส่งให้หน้าเว็บ */
function sanitize_(grid) {
  const hdrRow = grid.findIndex(r => r.some(c => /ชื่อ/.test(String(c))));
  const hdr = hdrRow >= 0 ? grid[hdrRow] : [];
  const drop = hdr.map((h,i) => HIDE_COLS.some(k => String(h).toLowerCase().indexOf(k.toLowerCase()) >= 0) ? i : -1).filter(i => i >= 0);
  const phone = /(\+66|0)\d{1,2}[-\s]?\d{3,4}[-\s]?\d{3,4}/g;
  const money = /\d[\d,.]*\s*(?:[–-]\s*\d[\d,.]*\s*)?(?:บาท|฿|THB)/gi; // ราคา/เรทที่หลุดมาอยู่ในหมายเหตุ
  const noteCols = hdr.map((h,i) => /หมายเหตุ|note/i.test(String(h)) ? i : -1).filter(i => i >= 0);
  const bigNum = /\d{1,3}(?:,\d{3})+|\d{4,}/g; // ในช่องหมายเหตุ: ตัวเลข 4 หลักขึ้นไปถือเป็นราคา ปิดบังทั้งหมด
  return grid.map(r => r.filter((_, i) => drop.indexOf(i) < 0).map((c, j) => { let v = String(c).replace(phone, "0xx-xxx-xxxx").replace(money, "[เรท — ไม่แสดง]");
    const orig = hdr.length ? hdr.findIndex((_, k) => drop.indexOf(k) < 0 && hdr.slice(0, k).filter((__, q) => drop.indexOf(q) < 0).length === j) : -1;
    if (noteCols.indexOf(orig) >= 0) v = v.replace(bigNum, "[เรท]");
    return v; }));
}
function resetAll_() {
  const ss = reviewSheet_().getParent();
  ["Reviews","History","Suggestions","Log"].forEach(n => { const sh = ss.getSheetByName(n); if (sh && sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1); });
  CacheService.getScriptCache().removeAll(["gh:server.js"]);
}
function tab_(name, header) {
  const ss = reviewSheet_().getParent();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(header); sh.setFrozenRows(1); }
  return sh;
}
function readSuggestions_() {
  const ss = reviewSheet_().getParent(); const sh = ss.getSheetByName("Suggestions"); if (!sh) return [];
  const vals = sh.getDataRange().getValues(); const out = [];
  for (let i = 1; i < vals.length; i++) { if (!vals[i][1]) continue; out.push({ name: String(vals[i][1]), link: String(vals[i][2]), f: String(vals[i][3]), cat: String(vals[i][4]), note: String(vals[i][5]), by: String(vals[i][6]) }); }
  return out;
}
function reviewSheet_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty("REVIEW_SS_ID"), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) { ss = SpreadsheetApp.create(REVIEW_NAME); props.setProperty("REVIEW_SS_ID", ss.getId()); }
  let sh = ss.getSheetByName("Reviews");
  if (!sh) { sh = ss.getSheets()[0]; sh.setName("Reviews"); }
  if (sh.getLastRow() === 0) { sh.appendRow(["key","ชื่อ KOL","ผล (pass/fail)","ผู้พิจารณา","เวลา"]); sh.setFrozenRows(1); }
  return sh;
}
function logHistory_(ss, row) {
  let h = ss.getSheetByName("History");
  if (!h) { h = ss.insertSheet("History"); h.appendRow(["key","ชื่อ KOL","ผล","ผู้พิจารณา","เวลา","เหตุผล"]); h.setFrozenRows(1); }
  h.appendRow(row);
}
/** ประวัติการตัดสินต่อ KOL (ล่าสุด 8 รายการต่อคน) */
function readHistory_() {
  const ss = reviewSheet_().getParent(); const h = ss.getSheetByName("History"); if (!h) return {};
  const vals = h.getDataRange().getValues(); const out = {};
  for (let i = 1; i < vals.length; i++) {
    const k = String(vals[i][0]); if (!k) continue;
    (out[k] = out[k] || []).push({ status: String(vals[i][2]), by: String(vals[i][3]), at: vals[i][4] ? new Date(vals[i][4]).getTime() : null, reason: String(vals[i][5]||"") });
  }
  Object.keys(out).forEach(k => { out[k] = out[k].slice(-8); });
  return out;
}
/** แจ้งเตือน LINE เมื่อมี "ไม่ผ่าน" (ทำงานเมื่อใส่ LINE_TOKEN + LINE_TO) */
function notifyLine_(r) {
  const C = config_(); const APP_URL = C.APP_URL || "";
  const text = "❌ [Liberator] KOL ถูกตัดออก\n" + r.name + (r.code ? " [" + r.code + "]" : "") + "\nโดย: " + (r.by||"-") + "\nเหตุผล: " + (r.reason||"-") + (r.extra ? "\n" + r.extra : "") + (APP_URL ? "\n" + APP_URL : "");
  try { pushLine_(text); } catch (e) { /* ไม่ให้การแจ้งเตือนล้มทำให้บันทึกผลล้ม */ }
}
/** ส่ง LINE push แล้วคืนผลเป็นข้อความ (บันทึกลงแท็บ LineLog ด้วย) */
function pushLine_(text) {
  const C = config_(); const LINE_TOKEN = C.LINE_TOKEN, LINE_TO = C.LINE_TO;
  let result;
  if (!LINE_TOKEN || !LINE_TO) result = "ยังไม่ได้ตั้งค่า LINE_TOKEN/LINE_TO ใน Script Properties (token=" + (LINE_TOKEN?"มี":"ไม่มี") + ", to=" + (LINE_TO?"มี":"ไม่มี") + ")";
  else {
    try {
      const tos = String(LINE_TO).split(/[,\s]+/).filter(Boolean); const outs = [];
      tos.forEach(to => { const res = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", { method: "post", contentType: "application/json",
        headers: { Authorization: "Bearer " + LINE_TOKEN }, payload: JSON.stringify({ to: to, messages: [{ type: "text", text: text }] }), muteHttpExceptions: true });
        outs.push("HTTP " + res.getResponseCode() + " " + String(res.getContentText()).slice(0, 80)); });
      result = outs.join(" | ");
    } catch (e) { result = "ERR " + String(e && e.message || e).slice(0, 200); }
  }
  try { tab_("LineLog", ["เวลา","ข้อความ","ผล"]).appendRow([new Date(), text.slice(0,200), result]); } catch (e) {}
  return result;
}
function readReviews_() {
  const sh = reviewSheet_();
  const vals = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < vals.length; i++) {
    if (!vals[i][0]) continue;
    out.push({ key: String(vals[i][0]), name: String(vals[i][1]), status: String(vals[i][2]), by: String(vals[i][3]), at: vals[i][4] ? new Date(vals[i][4]).getTime() : null, reason: String(vals[i][5]||""), phase: String(vals[i][6]||""), phaseBy: String(vals[i][7]||""), dates: dstr_(vals[i][8]), datesBy: String(vals[i][9]||"") });
  }
  return out;
}
/** รันครั้งเดียวเพื่อสร้างชีตเก็บผล + ดูลิงก์ */
function setup_() {
  const sh = reviewSheet_();
  Logger.log("Review sheet: " + sh.getParent().getUrl());
}

return { getData, setReview, setPhase, setPhases, setDates, setDatesMany, setPost, snapshotDates, listSnapshots, restoreSnapshot, requestAccess, accessStatus, staffLogin, listAccess, setAccess, addSuggestion, logEvents };
