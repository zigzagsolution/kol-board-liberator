# KOL Approval Board — Liberator (คู่มือส่งต่อ)

MIDI digital Co., Ltd. · ผู้ดูแล: NUENG · แคมเปญ **"AI คิดให้ คุณตัดสินใจ"** เปิดตัวฟีเจอร์ AI ใหม่ในแอป Liberator · โพสต์ 29 ต.ค. – 20 พ.ย. 2569 · 4 ระยะ Tease → Reveal → Prove → Convert

- หน้าเว็บ (ลูกค้าใช้): https://zigzagsolution.github.io/kol-board-liberator/
- โค้ด: GitHub `zigzagsolution/kol-board-liberator` (branch `main` = เว็บจริง)
- ชีตต้นทาง: "ข้อมูล KOL สาย IT/Technology" id `19Y-Vec0IqTksB8NJwZfu4MkLQpy2iMkQrGtm1RqVU8c` (แท็บแรก) — **คอลัมน์ "เรท" ถูกตัดทิ้งฝั่งเซิร์ฟเวอร์ ไม่ส่งไปหน้าเว็บ และเบอร์โทรในทุกช่องถูกปิดบัง** (`sanitize_` ใน server.js)
- ชีตผล: "KOL Reviews — Liberator" (สร้างอัตโนมัติใน Drive ของบัญชีที่รัน Apps Script)
- โค้ดเดียวกับบอร์ดอวดเมืองโคราช แต่ **ไม่มี PLAN MEDIA / Nano Week** และทุกอย่างที่เป็นแคมเปญอยู่ใน `config.js` (START, DAYS, PHASES, EVENTS, HASHTAGS, INTENSITY, TARGET) — เปลี่ยนลูกค้าครั้งหน้าแก้ไฟล์นี้ไฟล์เดียว + ธีมใน `style.css` + `logo.png`

## ติดตั้งครั้งแรก (ฝั่ง NUENG)
1. แชร์ชีตต้นทางให้บัญชีที่จะรัน Apps Script (เช่น mididigitalevent@gmail.com) แบบ Viewer
2. script.google.com → โปรเจกต์ใหม่ → วาง `Code.gs` → Deploy → Web app (Execute as: Me, Who has access: Anyone) → คัดลอก URL `/exec`
3. ใส่ URL ใน `config.js` → `APP_URL` → push
4. Script Properties: `LINE_TOKEN`, `LINE_TO` (คั่นด้วย , ได้หลายคน), `APP_URL`
5. GitHub → Settings → Pages → main / root

## วันในระบบ
วันโพสต์เก็บเป็น "ดัชนีวัน" นับจาก `START` (0 = 29 ต.ค.) ไม่ใช่เลขวันที่ — ถ้าเปลี่ยน START ต้องล้างวันโพสต์เก่า

## คำสั่งลับ (ช่องชื่อใน "เพิ่ม KOL ใหม่")
- `ล้างข้อมูลทดสอบ 2569` → ล้าง Reviews/History/Suggestions/Log
- `ทดสอบไลน์` → ส่ง LINE ทดสอบ
- รหัสทีมงานหน้า gate: `9999`
