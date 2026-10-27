/**
 * KOL Approval Board — Apps Script (ตัวโหลด + API)
 * วางไฟล์นี้ใน Apps Script ครั้งเดียว แล้ว Deploy เป็น Web app (Execute as: Me / Who has access: Anyone)
 * โค้ดจริงอยู่ใน GitHub: https://github.com/zigzagsolution/kol-approval-board (server.js)
 * แก้ server.js ใน GitHub = มีผลภายใน ~1–2 นาที ไม่ต้อง Deploy ใหม่
 */
const SERVER_URL = "https://raw.githubusercontent.com/zigzagsolution/kol-board-liberator/main/server.js";
const PAGE_URL   = "https://zigzagsolution.github.io/kol-board-liberator/";

/** เปิดลิงก์ /exec ตรง ๆ → พาไปหน้าเว็บ · ?action=getData → คืน JSON */
function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action) return json_(run_(action, []));
  return HtmlService.createHtmlOutput('<meta http-equiv="refresh" content="0;url=' + PAGE_URL + '"><a href="' + PAGE_URL + '">เปิด KOL Approval Board</a>');
}

/** หน้าเว็บเรียกฟังก์ชันหลังบ้านผ่านทางนี้: body = {"name":"getData","args":[]} */
function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents || "{}"); } catch (err) { return json_({ error: "bad json" }); }
  return json_(run_(body.name, body.args || []));
}

function run_(name, args) {
  try {
    const H = server_();
    if (!H[name]) throw new Error("unknown function: " + name);
    return { result: H[name].apply(null, args) };
  } catch (err) { return { error: String(err && err.message || err) }; }
}
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

/* ให้ Apps Script รู้ว่าต้องขอสิทธิ์อะไร (โค้ดจริงถูกโหลดมาตอนรัน เลยมองไม่เห็นเอง) — ไม่ต้องเรียกใช้ */
function scopes_() {
  SpreadsheetApp.getActiveSpreadsheet(); SpreadsheetApp.create("x"); DriveApp.getRootFolder();
  UrlFetchApp.fetch("https://example.com"); LockService.getScriptLock(); PropertiesService.getScriptProperties(); CacheService.getScriptCache();
}

/* ---------- loader ---------- */
function server_() { return new Function(serverCode_())(); }
function serverCode_() {
  const cache = CacheService.getScriptCache(), key = "gh:server.js";
  const hit = cache.get(key); if (hit) return hit;
  const res = UrlFetchApp.fetch(SERVER_URL + "?t=" + Date.now(), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error("โหลด server.js จาก GitHub ไม่ได้: HTTP " + res.getResponseCode());
  const text = res.getContentText("UTF-8");
  try { cache.put(key, text, 60); } catch (e) {}
  return text;
}

/** รันครั้งเดียวเพื่อขอสิทธิ์ + ทดสอบ */
function setup() {
  const d = server_().getData();
  Logger.log("rows: " + d.grid.length + " / reviews: " + d.reviews.length);
}
