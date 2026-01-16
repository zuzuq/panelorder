/*
  © Created by : Tn Ajie Inc (Developer)
      Thanks yang tidak hapus WM :)

  WARNING..!!
- DI LARANG MEMBAGIKAN SC SECARA GRATIS
- DI LARANG MENJUAL DENGAN HARGA 271T

© Copyright 2021 - 2025 Nexus Inc
*/

const { Telegraf, Markup } = require("telegraf");
const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const fetch = require("node-fetch");
const config = require("./config");
const userFile = path.join(__dirname, "src", "database", "users.json");
// [BARU] Tambahkan path untuk resellers.json
const resellersFile = path.join(__dirname, "src", "database", "resellers.json");
// [TAMBAHKAN INI]
const CONFIG_FILE = path.join(__dirname, "config.js");

// [BARU] Tambahkan crypto dan qrcode
const crypto = require("crypto");
const QRCode = require("qrcode");

const OWNER_ID = config.OWNER_ID;
const BOT_TOKEN = config.BOT_TOKEN;
let domain = config.domain;
let urladmin = config.urladmin;
let urlchannel = config.urlchannel;
let plta = config.plta;
// Di config.js kamu tertulis 'ptlc', jadi kita ambil itu
let pltc = config.ptlc;
let egg = config.egg;
let loc = config.loc;

// [DIMODIFIKASI] Hapus atlantic, tambahkan Duitku
const {
  apiAtlantic,
  typeewallet,
  nopencairan,
  atasnamaewallet,
  DUITKU_MERCHANT_CODE, // [BARU]
  DUITKU_API_KEY, // [BARU]
} = require("./config");
const axios = require("axios");
const qs = require("qs");

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN kosong di config.js");
  process.exit(1);
}
const bot = new Telegraf(BOT_TOKEN);
// ==========================================
//  FUNGSI CEK STATUS PANEL (ANTI CRASH)
// ==========================================
async function checkPanelHealth() {
  try {
    // Cek koneksi ke API Application (Timeout 3 detik)
    await axios.get(`${domain}/api/application/users?per_page=1`, {
      headers: {
        'Authorization': `Bearer ${plta}`,
        'Accept': 'application/json'
      },
      timeout: 3000 // Wajib ada timeout pendek agar bot tidak hang
    });
    return true; // Server Hidup
  } catch (e) {
    console.error("Panel Health Check Failed:", e.message);
    return false; // Server Mati/Timeout
  }
}

// util: simple sleep
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Pastikan directory & file ada
function ensureUserFile() {
  const dir = path.dirname(userFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(userFile)) fs.writeFileSync(userFile, "[]", "utf8");
}

function readUsers() {
  try {
    ensureUserFile();
    const raw = fs.readFileSync(userFile, "utf8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return Array.from(new Set(arr.map(Number))).filter(Boolean); // unik & numeric
  } catch (e) {
    console.error("readUsers error:", e);
    return [];
  }
}

function saveUsers(users) {
  try {
    ensureUserFile();
    const normalized = Array.from(new Set(users.map(Number))).filter(Boolean);
    fs.writeFileSync(userFile, JSON.stringify(normalized, null, 2), "utf8");
  } catch (e) {
    console.error("saveUsers error:", e);
  }
}

function addUser(id) {
  try {
    const users = readUsers();
    const nid = Number(id);
    if (!users.includes(nid)) {
      users.push(nid);
      saveUsers(users);
    }
  } catch (e) {
    console.error("addUser error:", e);
  }
}

// [BARU] Fungsi Pengecekan Owner Utama
function isMainOwner(id) {
    return String(id) === String(OWNER_ID);
}

// [DIMODIFIKASI] isOwner (true jika Main Owner ATAU ada di list reseller)
function isOwner(id) {
  if (isMainOwner(id)) return true; // Main owner selalu true

  const resellers = readResellers();
  // Cek jika ID ada sebagai 'key' di objek reseller
  return resellers.hasOwnProperty(String(id));
}

function removeUser(id) {
  try {
    const users = readUsers();
    const nid = Number(id);
    const filtered = users.filter(u => u !== nid);
    saveUsers(filtered);
  } catch (e) {
    console.error("removeUser error:", e);
  }
}

// [BARU] Path untuk file premium users
const premUsersFile = path.join(__dirname, "src", "database", "premusers.json");

// [BARU] Fungsi untuk file premusers.json (Format Objek)
function ensurePremFile() {
  const dir = path.dirname(premUsersFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(premUsersFile)) {
    fs.writeFileSync(premUsersFile, "{}", "utf8"); // Default objek kosong
  }
}

function readPremUsers() {
  try {
    ensurePremFile();
    const raw = fs.readFileSync(premUsersFile, "utf8");
    let data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return {};
    return data;
  } catch (e) {
    console.error("readPremUsers error:", e);
    return {};
  }
}

function savePremUsers(obj) {
  try {
    ensurePremFile();
    fs.writeFileSync(premUsersFile, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.error("savePremUsers error:", e);
  }
}
// [BARU] Path untuk file produk generik
const genericProductsFile = path.join(__dirname, "src", "database", "generic_products.json");

// [BARU] Fungsi untuk file generic_products.json (Format Array)
function ensureGenericProductsFile() {
  const dir = path.dirname(genericProductsFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(genericProductsFile)) {
    fs.writeFileSync(genericProductsFile, "[]", "utf8"); // Default array kosong
  }
}

// ... (setelah 'const fs = require("fs");')

// [BARU] Fungsi Helper untuk membuat tombol 2 kolom
function createButtonRows(buttons, columns = 2) {
    const rows = [];
    for (let i = 0; i < buttons.length; i += columns) {
        const row = buttons.slice(i, i + columns);
        rows.push(row);
    }
    return rows;
}

// ... (sisa kode)
function readGenericProducts() {
  try {
    ensureGenericProductsFile();
    const raw = fs.readFileSync(genericProductsFile, "utf8");
    let data = JSON.parse(raw);
    if (!Array.isArray(data)) return []; // Pastikan array
    return data;
  } catch (e) {
    console.error("readGenericProducts error:", e);
    return [];
  }
}

function saveGenericProducts(arr) {
  try {
    ensureGenericProductsFile();
    // Pastikan selalu menyimpan array
    if (!Array.isArray(arr)) {
        console.error("saveGenericProducts error: Data bukan array!");
        return;
    }
    fs.writeFileSync(genericProductsFile, JSON.stringify(arr, null, 2), "utf8");
  } catch (e) {
    console.error("saveGenericProducts error:", e);
  }
}

// [BARU] Cek apakah user adalah Premium User
function isPremiumUser(id) {
  const premUsers = readPremUsers();
  return premUsers.hasOwnProperty(String(id));
}

// [BARU] Ambil kuota Premium User
function getPremQuota(id) {
  if (!isPremiumUser(id)) return 0; // Bukan premium = 0 kuota
  const premUsers = readPremUsers();
  return Number(premUsers[String(id)]) || 0; // Ambil kuota
}

// [BARU] Kurangi kuota Premium User (return true/false)
function usePremQuota(id) {
  const currentQuota = getPremQuota(id);
  if (currentQuota <= 0) return false; // Kuota habis atau bukan premium

  const premUsers = readPremUsers();
  const userId = String(id);
  premUsers[userId] = currentQuota - 1; // Kurangi 1
  savePremUsers(premUsers);
  return true;
}

// Pastikan fungsi isMainOwner ada (dari langkah sebelumnya)
function isMainOwner(id) {
    return String(id) === String(OWNER_ID);
}

// [BARU] Path untuk file user yang sudah klaim
const claimedUsersFile = path.join(__dirname, "src", "database", "claimed_users.json");

// [BARU] Fungsi untuk file claimed_users.json (Format Array)
function ensureClaimedFile() {
  const dir = path.dirname(claimedUsersFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(claimedUsersFile)) {
    fs.writeFileSync(claimedUsersFile, "[]", "utf8"); // Default array kosong
  }
}

function readClaimedUsers() {
  try {
    ensureClaimedFile();
    const raw = fs.readFileSync(claimedUsersFile, "utf8");
    let data = JSON.parse(raw);
    if (!Array.isArray(data)) return []; // Pastikan array
    // Kembalikan array ID sebagai number
    return Array.from(new Set(data.map(Number))).filter(Boolean);
  } catch (e) {
    console.error("readClaimedUsers error:", e);
    return [];
  }
}

function saveClaimedUsers(arr) {
  try {
    ensureClaimedFile();
    if (!Array.isArray(arr)) {
        console.error("saveClaimedUsers error: Data bukan array!");
        return;
    }
    // Simpan array ID number
    const normalized = Array.from(new Set(arr.map(Number))).filter(Boolean);
    fs.writeFileSync(claimedUsersFile, JSON.stringify(normalized, null, 2), "utf8");
  } catch (e) {
    console.error("saveClaimedUsers error:", e);
  }
}

// [BARU] Cek apakah user sudah pernah klaim
function hasUserClaimed(userId) {
  const claimedUsers = readClaimedUsers();
  return claimedUsers.includes(Number(userId));
}

// [BARU] Tandai user sudah klaim
function markUserAsClaimed(userId) {
  const claimedUsers = readClaimedUsers();
  const numUserId = Number(userId);
  if (!claimedUsers.includes(numUserId)) {
    claimedUsers.push(numUserId);
    saveClaimedUsers(claimedUsers);
    return true; // Berhasil menandai
  }
  return false; // User sudah ada sebelumnya
}

// [BARU] Fungsi untuk mengelola Reseller (Owner baru)
function ensureResellerFile() {
  const dir = path.dirname(resellersFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(resellersFile)) fs.writeFileSync(resellersFile, "[]", "utf8");
}

function readResellers() {
  try {
    ensureResellerFile();
    const raw = fs.readFileSync(resellersFile, "utf8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return Array.from(new Set(arr.map(Number))).filter(Boolean); // unik & numeric
  } catch (e) {
    console.error("readResellers error:", e);
    return [];
  }
}

function saveResellers(users) {
  try {
    ensureResellerFile();
    const normalized = Array.from(new Set(users.map(Number))).filter(Boolean);
    fs.writeFileSync(resellersFile, JSON.stringify(normalized, null, 2), "utf8");
  } catch (e) {
    console.error("saveResellers error:", e);
  }
}

function addReseller(id) {
  try {
    const resellers = readResellers();
    const nid = Number(id);
    if (!resellers.includes(nid)) {
      resellers.push(nid);
      saveResellers(resellers);
    }
  } catch (e) {
    console.error("addReseller error:", e);
  }
}

// [BARU] Path untuk file klaim harian
const dailyClaimsFile = path.join(__dirname, "src", "database", "daily_claims.json");
// [BARU] Batas klaim harian
const DAILY_CLAIM_LIMIT = 0;

// [BARU] Fungsi untuk file daily_claims.json (Format Objek)
function ensureDailyClaimsFile() {
  const dir = path.dirname(dailyClaimsFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Default: tanggal null, array kosong
  if (!fs.existsSync(dailyClaimsFile)) {
    fs.writeFileSync(dailyClaimsFile, JSON.stringify({ date: null, claimedToday: [] }), "utf8");
  }
}

function readDailyClaims() {
  try {
    ensureDailyClaimsFile();
    const raw = fs.readFileSync(dailyClaimsFile, "utf8");
    let data = JSON.parse(raw);

    // Dapatkan tanggal hari ini (YYYY-MM-DD)
    const today = new Date().toLocaleDateString('sv'); // Format 'sv' = YYYY-MM-DD

    // Reset jika file kosong, format salah, atau tanggal berbeda
    if (typeof data !== 'object' || data === null || !Array.isArray(data.claimedToday) || data.date !== today) {
        console.log(`[DailyClaim] Mereset data klaim harian untuk tanggal ${today}.`);
        data = { date: today, claimedToday: [] };
        saveDailyClaims(data); // Simpan data yang sudah direset
    }
    return data; // Kembalikan data (sudah direset jika perlu)

  } catch (e) {
    console.error("readDailyClaims error:", e);
    // Jika error, kembalikan data default agar tidak crash
    return { date: new Date().toLocaleDateString('sv'), claimedToday: [] };
  }
}

function saveDailyClaims(obj) {
  try {
    ensureDailyClaimsFile();
    // Validasi sederhana sebelum menyimpan
    if (typeof obj !== 'object' || obj === null || !Array.isArray(obj.claimedToday)) {
         throw new Error("Format data daily claims tidak valid saat menyimpan.");
    }
    fs.writeFileSync(dailyClaimsFile, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.error("saveDailyClaims error:", e);
  }
}

// [BARU] Fungsi untuk menambahkan klaim harian (cek limit)
// Mengembalikan true jika berhasil ditambahkan, false jika gagal (limit/sudah ada)
function addClaimToDaily(userId) {
    const data = readDailyClaims(); // Baca data (sudah handle reset)
    const numUserId = Number(userId);

    // Cek limit harian
    if (data.claimedToday.length >= DAILY_CLAIM_LIMIT) {
        return false; // Limit tercapai
    }

    // Cek jika user ini sudah klaim HARI INI
    if (data.claimedToday.includes(numUserId)) {
        // Seharusnya tidak terjadi jika logika handleClaimQuota benar, tapi sebagai pengaman
        console.warn(`[DailyClaim] User ${numUserId} mencoba klaim lagi hari ini.`);
        return false;
    }

    // Tambahkan ke daftar harian dan simpan
    data.claimedToday.push(numUserId);
    saveDailyClaims(data);
    return true; // Berhasil ditambahkan
}

// [BARU] Import modul OS dan Performance
const os = require('os');
const { performance } = require('perf_hooks');

// [BARU] Helper functions dari ZentriX-case.js (disalin)

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'; // Diubah sedikit agar lebih aman
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function cpuAverage() {
    let totalIdle = 0, totalTick = 0;
    let cpus = os.cpus();
    if (!cpus || cpus.length === 0) return { idle: 0, total: 0 }; // Handle jika cpus() gagal

    cpus.forEach((cpu) => {
        for (let type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    });

    return { idle: totalIdle / cpus.length, total: totalTick / cpus.length };
}

// Ubah nama fungsi 'runtime' agar tidak bentrok (jika sudah ada)
// Jika Anda belum punya fungsi 'runtime', bisa pakai nama 'runtime' saja
function formatUptime(seconds) {
    if (isNaN(seconds) || seconds < 0) return 'N/A';
    seconds = Math.floor(seconds);
    let days = Math.floor(seconds / (3600 * 24));
    let hours = Math.floor((seconds % (3600 * 24)) / 3600);
    let minutes = Math.floor((seconds % 3600) / 60);
    let secs = Math.floor(seconds % 60);
    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`); // Tampilkan detik jika uptime < 1m
    return parts.join(' ');
}


// [DIMODIFIKASI] getCPUUsage diubah agar return Promise
function getCPUUsagePromise() {
    return new Promise((resolve) => {
        const startMeasure = cpuAverage();
        // Cek jika startMeasure valid
        if (startMeasure.total === 0) return resolve("N/A");

        setTimeout(() => {
            const endMeasure = cpuAverage();
            // Cek jika endMeasure valid
            if (endMeasure.total === 0 || endMeasure.total <= startMeasure.total) return resolve("N/A");

            const idleDifference = endMeasure.idle - startMeasure.idle;
            const totalDifference = endMeasure.total - startMeasure.total;
            const percentageCPU = 100 - Math.max(0, Math.min(100, (100 * idleDifference / totalDifference))); // Clamp between 0-100

            resolve(percentageCPU.toFixed(2) + "%");
        }, 1000); // Tunggu 1 detik untuk pengukuran
    });
}

// [BARU] Fungsi helper untuk cek apakah user adalah Owner atau Reseller
function isOwner(id) {
  const userId = String(id);
  const mainOwnerId = String(OWNER_ID);
  
  // Cek jika dia adalah Main Owner
  if (userId === mainOwnerId) return true;
  
  // Cek jika dia ada di list Reseller
  const resellers = readResellers();
  return resellers.includes(Number(id));
}
// [END BARU]


//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// Function Timezone WIB 
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

function formatDate() {
  const now = new Date();

  const options = {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  };

  // hasil format misalnya: 26/09/2025, 08.30.45
  const parts = new Intl.DateTimeFormat("id-ID", options).formatToParts(now);

  const year = parts.find(p => p.type === "year").value;
  const month = parts.find(p => p.type === "month").value;
  const day = parts.find(p => p.type === "day").value;
  const hour = parts.find(p => p.type === "hour").value;
  const minute = parts.find(p => p.type === "minute").value;
  const second = parts.find(p => p.type === "second").value;

  return `${year}-${month}-${day} ${hour}:${minute}:${second} WIB`;
}

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// Menu Start
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.start(async (ctx) => {
  try {
    // tambahkan user id ke src/database/users.json
    addUser(ctx.from.id);
  } catch (e) {
    console.error("Error adding user on start:", e);
  }

  const me = ctx.from;
  const caption = `
Halo *${me.first_name || ""}* Aku adalah Bot Auto Order, siap membantu anda untuk membuat Akun dan Server *Panel Pterodactyl*.

┌ 🤖 *AUTO ORDER PANEL*
└─ *Pterodactyl Server*

*📊 Panel - Reseller - Admin Panel.
🔑 Semua Di Proses Secara Otomatis.*

--- [ Benefit Membeli Disini ] ---
*♻️ Garansi 15 Hari*
*🔒 Anti Colong & Rusuh*
*📉 Server Stabil*

Pilih *📦 Order Panel* Untuk Beli.
Pilih *🛍️ Order Admin Panel* Untuk Beli.
Pilih *👑 Order Reseller* Untuk Beli.
`; // <-- String Selesai di sini

  // Kode Keyboard BARU (dengan tombol Free Panel):
  const keyboard = Markup.keyboard([
    ["📦 Order Panel", "🛍️ Order Admin Panel"], // Baris 1
    ["👑 Order Reseller", "🛒 Beli Produk Lain"], // Baris 2
    ["🎁 Free Panel"],                        // Baris 3: Tombol Klaim [BARU]
    ["📞 Hubungi Customer Service"]             // Baris 4: CS
  ]).resize();

  const startImage = path.join(__dirname, "src", "media", "start.webp");
  await ctx.replyWithPhoto(
    { source: startImage },
    { caption, parse_mode: "Markdown", ...keyboard }
  );
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// Help Command (/help)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("help", async (ctx) => {
  const helpText = `
╭─━━━━━━ ✦ ✧ ✦ ━━━━━━─╮
          ⚙️ *DAFTAR FITUR BOT* ⚙️
╰─━━━━━━ ✦ ✧ ✦ ━━━━━━─╯

📦 *FITUR UTAMA UNTUK USER*
───────────────────────
• /start — Menampilkan menu utama bot
• /buypanel <username> — Membeli panel user
• /buyadmin <username> — Membeli panel admin
• /buyreseller — Membeli akses reseller

💰 *FITUR PEMBAYARAN (OWNER)*
───────────────────────
• /saldo — Mengecek saldo Atlantic
• /cairkan — Mencairkan saldo Atlantic ke e-wallet

🧰 *FITUR PANEL (OWNER)*
───────────────────────
• /createpanel <username> — Membuat panel manual
• /installpanel ipvps|pwvps|panel.com|node.com|ram — Instalasi otomatis Panel & Wings di VPS

🧹 *FITUR ADMIN PANEL (OWNER)*
───────────────────────
• /delallusr — Mengecek user tanpa server
• /confirmdelusr — Konfirmasi Menghapus semua user tanpa server

📢 *FITUR BROADCAST (OWNER)*
───────────────────────
• /broadcast <pesan> — Kirim pesan ke semua pengguna bot

───────────────────────
📞 *Customer Service*
Hubungi admin: [Klik di sini](${urladmin})
───────────────────────

🕒 *Terakhir diperbarui:* ${formatDate()}
`;
  await ctx.replyWithMarkdown(helpText);
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// Buy Panel Pterodactyl 
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("buypanel", async (ctx) => {
const isOnline = await checkPanelHealth();
  if (!isOnline) {
    return ctx.reply("❌ **MAINTENANCE SERVER**\n\nMaaf, server panel sedang down/gangguan. Silakan coba beberapa saat lagi.", { parse_mode: "Markdown" });
  }
  const text = ctx.message.text.split(" ").slice(1);
  const username = text[0];
  if (!username) return ctx.reply(`
╭─━━━━━━ ✦ ✧ ✦ ━━━━━━─╮
           📦𝗢𝗥𝗗𝗘𝗥 𝗣𝗔𝗡𝗘𝗟📦
╰─━━━━━━ ✦ ✧ ✦ ━━━━━━─╯
📝 𝗖𝗮𝗿𝗮 𝗠𝗲𝗺𝗯𝘂𝗮𝘁 :
/buypanel <username>

📝 𝗖𝗼𝗻𝘁𝗼𝗵 :
/buypanel picung`);

  if (await isUsernameTaken(username)) {
    return ctx.reply(`⚠️ Username "${username}" sudah dipakai. Silakan pilih username lain.`);
  }

  const products = readProducts();
  if (!products.length) return ctx.reply("Belum ada produk.");

  const normalProducts = products.filter(p => p.id !== "unlimited");
  const rows = [];
  for (let i = 0; i < normalProducts.length; i += 2) {
    const left = normalProducts[i];
    const right = normalProducts[i + 1];
    const row = [];
    row.push(Markup.button.callback(`${left.name} • Rp${left.price}`, `ORDER|${left.id}|${username}`));
    if (right) row.push(Markup.button.callback(`${right.name} • Rp${right.price}`, `ORDER|${right.id}|${username}`));
    rows.push(row);
  }

  const unlimited = products.find(p => p.id === "unlimited");
  if (unlimited) {
    rows.push([
      Markup.button.callback(`${unlimited.name} • Rp${unlimited.price}`, `ORDER|${unlimited.id}|${username}`)
    ]);
  }

  await ctx.reply(`
╭─━━━━━━ ✦ ✧ ✦ ━━━━━━─╮
         💯 𝗕𝗘𝗦𝗧 𝗤𝗨𝗔𝗟𝗜𝗧𝗬 💯
╰─━━━━━━ ✦ ✧ ✦ ━━━━━━─╯
╭──❏「 𝗣𝗮𝗻𝗲𝗹 𝗣𝘁𝗲𝗿𝗼𝗱𝗮𝗰𝘁𝘆𝗹 」❏
┃
┃➥  𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲 : ${username}
┃➥  𝗥𝗔𝗠 : ?
┃
┗━━━━━[ 𝗔𝘂𝘁𝗼 𝗢𝗿𝗱𝗲𝗿 𝗕𝗢𝗧 ]━━━━

Silahkan pilih paket yang di inginkan.

⏰ 𝗧𝗨𝗡𝗚𝗚𝗨 𝗜𝗡𝗩𝗢𝗜𝗖𝗘 𝗗𝗔𝗡 𝗕𝗔𝗬𝗔𝗥`, Markup.inlineKeyboard(rows));
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// Callback handler (Order, Cancel)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.on("callback_query", async (ctx) => {
  try {
    const data = ctx.callbackQuery.data;
    if (!data) return ctx.answerCbQuery();

    const [cmd, arg1, arg2, arg3] = data.split("|");
    const orders = readOrders();

    // [START] LOGIKA PEMBAYARAN DUITKU
    if (cmd === "ORDER") {
      const username = arg2;
      const products = readProducts();
      const product = products.find(p => p.id === arg1);
      if (!product) return ctx.answerCbQuery("Produk tidak ditemukan.", { show_alert: true });

      const reff = `PANEL-${Date.now()}`; // Ini akan jadi merchantOrderId
      const amount = product.price;

      // 1. Buat signature Duitku
      const rawSignature = config.DUITKU_MERCHANT_CODE + reff + amount + config.DUITKU_API_KEY;
      const signature = crypto.createHash("md5").update(rawSignature).digest("hex");

      let paymentResp;
      try {
        // 2. Request Inquiry ke Duitku
        paymentResp = await axios.post("https://passport.duitku.com/webapi/api/merchant/v2/inquiry", {
          merchantCode: config.DUITKU_MERCHANT_CODE,
          paymentAmount: amount,
          paymentMethod: "SP", // QRIS
          merchantOrderId: reff,
          productDetails: `Panel ${product.name}`,
          customerVaName: ctx.from.first_name || "Telegram User",
          email: `${username}@private.id`, // Ambil dari logika create user
          phoneNumber: "08123456789", // Placeholder
          itemDetails: [{
            name: `Panel ${product.name}`,
            price: amount,
            quantity: 1
          }],
          // Ganti callbackUrl & returnUrl dengan domain Anda jika perlu
          callbackUrl: `https://example.com/callback/${reff}`,
          returnUrl: `https://example.com/return/${reff}`,
          signature: signature,
          expiryPeriod: 5 // Kadaluarsa 5 menit (300 detik)
        }, {
          headers: { "Content-Type": "application/json" }
        });

      } catch (e) {
        console.error("Duitku inquiry error:", e.response ? e.response.data : e.message);
        return ctx.reply("Gagal menghubungi gateway Duitku. Coba lagi nanti.");
      }
      
      const result = paymentResp.data;

      // 3. Cek respon Duitku
      if (result.statusCode !== "00") {
          console.error("Duitku Error Response:", result);
          return ctx.reply("Gagal membuat transaksi Duitku: " + result.statusMessage);
      }

      const qrString = result.qrString;
      const reference = result.reference; // ID Transaksi Duitku
      const checkoutUrl = result.paymentUrl; // Link bayar web

      // 4. Buat QR Code dari qrString
      const buffer = await QRCode.toBuffer(qrString, { width: 400, color: { dark: "#000000", light: "#ffffff" } });

      // 5. Kirim QR Code ke user
      const sentMsg = await ctx.replyWithPhoto({ source: buffer }, {
        caption: `𝗜𝗡𝗩𝗢𝗜𝗖𝗘 𝗣𝗔𝗬𝗠𝗘𝗡𝗧 💰

𝗣𝗿𝗼𝗱𝘂𝗸 : Panel ${product.name}
𝗧𝗼𝘁𝗮𝗹 𝗧𝗮𝗴𝗶𝗵𝗮𝗻 : Rp${product.price}
𝗕𝗶𝗮𝘆𝗮 𝗔𝗱𝗺𝗶𝗻 : Rp0
𝗤𝗿𝗶𝘀 𝗞𝗮𝗱𝗮𝗹𝘂𝗮𝗿𝘀𝗮 𝗗𝗮𝗹𝗮𝗺 : 5 menit
------------------------------------------
🕓 Sistem akan 𝗰𝗲𝗸 𝗼𝘁𝗼𝗺𝗮𝘁𝗶𝘀 setiap 15 detik hingga pembayaran terverifikasi.`,
        ...Markup.inlineKeyboard([
          [Markup.button.url("Bayar di Website", checkoutUrl)], // Tombol bayar web
          [Markup.button.callback("❌ Batalkan", `CANCEL|${reff}`)]
        ])
      });

      // 6. Simpan order ke orders.json
      orders[reff] = {
        reff, // Ini adalah merchantOrderId
        productId: product.id,
        domain: domain,
        username,
        buyer: ctx.from.id,
        status: "pending",
        created: Date.now(),
        reference, // ID Duitku
        paymentData: result,
        qrisMessageId: sentMsg.message_id,
        chatId: ctx.chat.id
      };
      saveOrders(orders);

      // 7. POLLING PEMBAYARAN
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        // 20 * 15 detik = 300 detik = 5 menit (sesuai expiryPeriod)
        if (attempts > 20) { 
          clearInterval(interval);
          const order = orders[reff];
          if (order?.status === "pending") {

            // Hapus pesan QRIS jika kadaluarsa
            if (order.qrisMessageId && order.chatId) {
              try {
                await bot.telegram.deleteMessage(order.chatId, order.qrisMessageId);
              } catch (e) {
                // biarkan jika gagal
              }
            }

            delete orders[reff];
            saveOrders(orders);
            await ctx.reply("⏳ Invoice kadaluarsa, silakan buat order baru.");
          }
          return;
        }

        try {
          // 8. Cek status Duitku
          const sigCheck = crypto.createHash("md5")
            .update(config.DUITKU_MERCHANT_CODE + reff + config.DUITKU_API_KEY) // merchantCode + merchantOrderId + apiKey
            .digest("hex");

          const statusResp = await axios.post("https://passport.duitku.com/webapi/api/merchant/transactionStatus", {
            merchantCode: config.DUITKU_MERCHANT_CODE,
            merchantOrderId: reff,
            signature: sigCheck
          }, {
            headers: { "Content-Type": "application/json" }
          });
          
          const status = statusResp?.data?.statusCode;

          if (status === "00") { // "00" = Sukses
            clearInterval(interval);
            orders[reff].status = "paid";
            saveOrders(orders);

            await ctx.reply(`𝗧𝗥𝗔𝗡𝗦𝗔𝗞𝗦𝗜 𝗕𝗘𝗥𝗛𝗔𝗦𝗜𝗟 ✅
𝗧𝗮𝗻𝗴𝗴𝗮𝗹 : ${formatDate()}
𝗡𝗼𝗺𝗼𝗿 𝗥𝗲𝗳𝗲𝗿𝗲𝗻𝘀𝗶 : ${reff}
𝗜𝗗 𝗧𝗿𝗮𝗻𝘀𝗮𝗸𝘀𝗶 : ${reference}
𝗦𝘁𝗮𝘁𝘂𝘀 : Berhasil
------------------------------------------
𝗣𝗿𝗼𝗱𝘂𝗸 : Panel ${product.name}
𝗧𝗼𝘁𝗮𝗹 𝗧𝗮𝗴𝗶𝗵𝗮𝗻 : Rp${product.price}
𝗕𝗶𝗮𝘆𝗮 𝗔𝗱𝗺𝗶𝗻 : Rp0
------------------------------------------
📌 Data Panel akan segera dikirim.
`);
            
            // 9. Buat Panel (logika lama)
            const account = await createUserAndServer({ username, product });
            if (account.error) {
              await ctx.reply("⚠️ Pembayaran sukses tapi gagal membuat panel.\nError: " + JSON.stringify(account.details));
              return;
            }

            await bot.telegram.sendMessage(ctx.from.id, `┌  PANEL BERHASIL DIBUAT ┐

Berikut adalah data login Anda.
Mohon simpan baik-baik.

╭─ 🔐 𝗔𝗞𝗨𝗡 𝗔𝗡𝗗𝗔 ─────────
│ 👤 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲: ${account.username}
│ 🔑 𝗣𝗮𝘀𝘀𝘄𝗼𝗿𝗱: ${account.password}
│ 📧 𝗘𝗺𝗮𝗶𝗹: ${account.email}
│
│ 🔗 𝗟𝗢𝗚𝗜𝗡 𝗨𝗥𝗟:
│ ${account.url}
╰─────────────────────

╭─ ⚙️ 𝗦𝗣𝗘𝗦𝗜𝗙𝗜𝗞𝗔𝗦𝗜 ───────
│ ⚡ 𝗥𝗔𝗠: ${product.ram === "0" ? "Unlimited" : product.ram + " MB"}
│ 💾 𝗗𝗜𝗦𝗞: ${product.disk} MB
│ 🧠 𝗖𝗣𝗨: ${product.cpu}%
╰─────────────────────

╭─ ⚠️ 𝗣𝗘𝗥𝗔𝗧𝗨𝗥𝗔𝗡 ─────────
│ 1. DILARANG PAKAI SC DDOS
│ 2. DILARANG SPAM SC PAIRING
│ 3. DILARANG MENJUAL PANEL
╰─────────────────────

📆 𝗧𝗮𝗻𝗴𝗴𝗮𝗹 : ${formatDate()}
📮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹 𝗔𝗱𝗺𝗶𝗻 : ${urlchannel}`);
            
            // 10. Kirim Notif ke Admin
            await bot.telegram.sendMessage(-1001864324191, // Ganti dengan ID grup log Anda
`PEMBELIAN PANEL✅

𝗧𝗮𝗻𝗴𝗴𝗮𝗹 : ${formatDate()}
𝗡𝗼𝗺𝗼𝗿 𝗥𝗲𝗳𝗲𝗿𝗲𝗻𝘀𝗶 : ${reff}
𝗜𝗗 𝗧𝗿𝗮𝗻𝘀𝗮𝗸𝘀𝗶 : ${reference}
------------------------------------------
👤𝗨𝘀er @${ctx.from.username || "tanpa_username"} (ID: ${ctx.from.id})
Telah membeli Produk dengan data berikut:

• 𝗣𝗿𝗼𝗱𝘂𝗸 : Panel Pterodactyl
• 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲 : ${account.username}
• 𝗥𝗔𝗠 : ${product.ram} MB`);
          
          } else if (status === "01") {
            // "01" = Pending, biarkan loop berlanjut
          } else if (status) {
            // Status lain = Gagal, Batal, Expired
            clearInterval(interval);
            if (orders[reff]) {
                delete orders[reff];
                saveOrders(orders);
            }
            await ctx.reply(`⏳ Invoice gagal atau kadaluarsa (Status: ${statusResp?.data?.statusMessage || 'N/A'}). Silakan buat order baru.`);
          }
        } catch (e) {
          console.error("checkPayment (Duitku) error", e);
        }
      }, 15000); // Cek setiap 15 detik

      return ctx.answerCbQuery("Invoice Duitku dibuat.");
    }
    // [END] LOGIKA PEMBAYARAN DUITKU

// ... di dalam bot.on("callback_query", async (ctx) => { ...
// ... setelah blok if (cmd === "ORDER") { ... } ...

  // [BLOK UNTUK MENANGANI /createpanel]
    if (cmd === "CP_SELECT") {
      const productId = arg1;
      const username = arg2;

      // Keamanan: Cek jika dia Owner/Reseller
      const userId = ctx.from.id;
      if (!isOwner(userId)) {
        return ctx.answerCbQuery("❌ Anda tidak diizinkan.", { show_alert: true });
      }
      
      const isOnline = await checkPanelHealth();
  if (!isOnline) {
    return ctx.reply("❌ **MAINTENANCE SERVER**\n\nMaaf, server panel sedang down/gangguan. Silakan coba beberapa saat lagi.", { parse_mode: "Markdown" });
  }

      const products = readProducts();
      const product = products.find(p => p.id === productId);
      
      if (!product) {
        await ctx.editMessageText("⚠️ Produk tidak ditemukan. Proses dibatalkan.");
        return ctx.answerCbQuery("Produk tidak ditemukan.", { show_alert: true });
      }

      try {
        await ctx.editMessageText(`⏳ Membuat panel *${product.name}* untuk *${username}*...`, { parse_mode: "Markdown" });
      } catch (e) {
        console.log("Gagal edit pesan, lanjut membuat panel...");
      }

      // Panggil fungsi create
      const account = await createUserAndServer({ username, product });

      // Handle jika GAGAL
      if (account.error) {
        await ctx.reply("⚠️ Gagal membuat panel.\nError: " + JSON.stringify(account.details));
        try {
            await ctx.editMessageText(`Gagal membuat panel untuk *${username}*.`, { parse_mode: "Markdown" });
        } catch(e) {}
        return ctx.answerCbQuery("Gagal membuat panel.");
      }

      // [DIUBAH] Tidak ada lagi pengurangan kuota

      // ===============================================
      // [INI NOTIFIKASI LOG YANG ANDA MINTA]
      // ===============================================
      try {
        const resellerUsername = ctx.from.username || "tanpa_username";
        await bot.telegram.sendMessage(-1001864324191, // ID grup log Anda
`PANEL MANUAL DIBUAT ✅

𝗧𝗮𝗻𝗴𝗴𝗮𝗹 : ${formatDate()}
------------------------------------------
👤 Dibuat oleh: @${resellerUsername} (ID: ${userId})
Untuk user panel baru:
• 𝗣𝗿𝗼𝗱𝘂𝗸 : ${product.name}
• 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲 : ${account.username}
• 𝗥𝗔𝗠 : ${product.ram === 0 ? "Unlimited" : product.ram + " MB"}
• 𝗗𝗜𝗦𝗞 : ${product.disk === 0 ? "Unlimited" : product.disk + " MB"}
• 𝗖𝗣𝗨 : ${product.cpu === 0 || product.cpu > 990 ? "Unlimited" : product.cpu + "%"}`);
      } catch (e) {
        console.error("Gagal kirim notif log /createpanel:", e.message);
        // Opsi: Kirim peringatan kecil ke reseller jika log gagal
        await ctx.reply("*(Panel sukses dibuat, tapi gagal kirim notif ke grup log.)*");
      }
      // ===============================================
      // [AKHIR BLOK NOTIFIKASI]
      // ===============================================


      // [DIUBAH] Pesan balasan sukses (tanpa info kuota)
      await ctx.reply(
`┌  PANEL BERHASIL DIBUAT ┐

Berikut adalah data login Anda.
Mohon simpan baik-baik.

╭─ 🔐 𝗔𝗞𝗨𝗡 𝗔𝗡𝗗𝗔 ─────────
│ 👤 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲: ${account.username}
│ 🔑 𝗣𝗮𝘀𝘀𝘄𝗼𝗿𝗱: ${account.password}
│ 📧 𝗘𝗺𝗮𝗶𝗹: ${account.email}
│
│ 🔗 𝗟𝗢𝗚𝗜𝗡 𝗨𝗥𝗟:
│ ${account.url}
╰─────────────────────

╭─ ⚙️ 𝗦𝗣𝗘𝗦𝗜𝗙𝗜𝗞𝗔𝗦𝗜 ───────
│ ⚡ 𝗥𝗔𝗠: ${product.ram === 0 ? "Unlimited" : product.ram + " MB"}
│ 💾 𝗗𝗜𝗦𝗞: ${product.disk === 0 ? "Unlimited" : product.disk + " MB"}
│ 🧠 𝗖𝗣𝗨: ${product.cpu === 0 || product.cpu > 990 ? "Unlimited" : product.cpu + "%"}
╰─────────────────────

╭─ ⚠️ 𝗣𝗘𝗥𝗔𝗧𝗨𝗥𝗔𝗡 ─────────
│ 1. DILARANG PAKAI SC DDOS
│ 2. DILARANG SPAM SC PAIRING
│ 3. DILARANG MENJUAL PANEL
╰─────────────────────

📆 𝗧𝗮𝗻𝗴𝗴𝗮𝗹 : ${formatDate()}
📮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹 𝗔𝗱𝗺𝗶𝗻 : ${urlchannel}`);
      
      // Edit pesan tombol menjadi sukses
      try {
          await ctx.editMessageText(
            `✅ Panel *${product.name}* untuk *${username}* berhasil dibuat.`,
            { parse_mode: "Markdown" }
          );
      } catch (e) {}
      
      return ctx.answerCbQuery("Panel Berhasil Dibuat!");
    }
    
    // ... di dalam bot.on("callback_query", async (ctx) => { ...

    // [BARU] BLOK UNTUK MENANGANI /create (Premium User)
    if (cmd === "CREATE_SELECT") {
      const productId = arg1;
      const username = arg2;

      // Keamanan: Pastikan yang mengklik tombol adalah Premium User
      const userId = ctx.from.id;
      if (!isPremiumUser(userId)) {
        return ctx.answerCbQuery("❌ Anda bukan Premium User.", { show_alert: true });
      }
      
      const isOnline = await checkPanelHealth();
  if (!isOnline) {
    return ctx.reply("❌ **MAINTENANCE SERVER**\n\nMaaf, server panel sedang down/gangguan. Silakan coba beberapa saat lagi.", { parse_mode: "Markdown" });
  }

      // Pengecekan kuota SEBELUM membuat
      const quotaCheck = getPremQuota(userId);
      if (quotaCheck <= 0) {
          await ctx.editMessageText("⚠️ Kuota Anda habis. Proses dibatalkan.");
          return ctx.answerCbQuery("Kuota Anda habis.", { show_alert: true });
      }

      const products = readProducts();
      const product = products.find(p => p.id === productId);
      
      if (!product) {
        await ctx.editMessageText("⚠️ Produk tidak ditemukan. Proses dibatalkan.");
        return ctx.answerCbQuery("Produk tidak ditemukan.", { show_alert: true });
      }

      try {
        await ctx.editMessageText(
          `⏳ Membuat panel *${product.name}* untuk *${username}*...`,
          { parse_mode: "Markdown" }
        );
      } catch (e) {
        console.log("Gagal edit pesan, lanjut membuat panel...");
      }

      // Panggil fungsi create user dan server
      const account = await createUserAndServer({ username, product });

      if (account.error) {
        await ctx.reply("⚠️ Gagal membuat panel.\nError: " + JSON.stringify(account.details));
        try {
            await ctx.editMessageText(`Gagal membuat panel untuk *${username}*.`, { parse_mode: "Markdown" });
        } catch(e) {}
        return ctx.answerCbQuery("Gagal membuat panel.");
      }

      // SUKSES! Kurangi kuota Premium
      usePremQuota(userId); 
      
      // Ambil kuota terbaru
      const sisaKuota = getPremQuota(userId);
      const quotaMsg = sisaKuota;

      // Kirim Notifikasi Log ke Admin/Grup
      try {
        const premiumUsername = ctx.from.username || "tanpa_username";
        await bot.telegram.sendMessage(-1001864324191, // ID grup log Anda
`PANEL PREMIUM DIBUAT ✅

𝗧𝗮𝗻𝗴𝗴𝗮𝗹 : ${formatDate()}
------------------------------------------
👤 Dibuat oleh (Premium): @${premiumUsername} (ID: ${userId})
Sisa Kuota: *${quotaMsg}*

Untuk user panel baru:
• 𝗣𝗿𝗼𝗱𝘂𝗸 : ${product.name}
• 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲 : ${account.username}
• 𝗥𝗔𝗠 : ${product.ram === 0 ? "Unlimited" : product.ram + " MB"}`);
      } catch (e) {
        console.error("Gagal kirim notif log /create:", e.message);
      }

      // Kirim pesan sukses ke Premium User
      await ctx.reply(
`┌  PANEL BERHASIL DIBUAT ┐

Berikut adalah data login Anda.
Mohon simpan baik-baik.

╭─ 🔐 𝗔𝗞𝗨𝗡 𝗔𝗡𝗗𝗔 ─────────
│ 👤 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲: ${account.username}
│ 🔑 𝗣𝗮𝘀𝘀𝘄𝗼𝗿𝗱: ${account.password}
│ 📧 𝗘𝗺𝗮𝗶𝗹: ${account.email}
│
│ 🔗 𝗟𝗢𝗚𝗜𝗡 𝗨𝗥𝗟:
│ ${account.url}
╰─────────────────────

╭─ ⚙️ 𝗦𝗣𝗘𝗦𝗜𝗙𝗜𝗞𝗔𝗦𝗜 ───────
│ ⚡ 𝗥𝗔𝗠: ${product.ram === 0 ? "Unlimited" : product.ram + " MB"}
│ 💾 𝗗𝗜𝗦𝗞: ${product.disk === 0 ? "Unlimited" : product.disk + " MB"}
│ 🧠 𝗖𝗣𝗨: ${product.cpu === 0 || product.cpu > 990 ? "Unlimited" : product.cpu + "%"}
╰─────────────────────

╭─ ⚠️ 𝗣𝗘𝗥𝗔𝗧𝗨𝗥𝗔𝗡 ─────────
│ 1. DILARANG PAKAI SC DDOS
│ 2. DILARANG SPAM SC PAIRING
│ 3. DILARANG MENJUAL PANEL
╰─────────────────────

📆 𝗧𝗮𝗻𝗴𝗴𝗮𝗹 : ${formatDate()}
📮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹 𝗔𝗱𝗺𝗶𝗻 : ${urlchannel}

💳 Sisa kuota /create Anda: *${quotaMsg}*`);
      
      try {
          await ctx.editMessageText(
            `✅ Panel *${product.name}* untuk *${username}* berhasil dibuat.`,
            { parse_mode: "Markdown" }
          );
      } catch (e) {}

      return ctx.answerCbQuery("Panel Berhasil Dibuat!");
    }
    // ... di dalam bot.on("callback_query", async (ctx) => { ...

    // ... (di dalam 'bot.on("callback_query", async (ctx) => {') ...

    // [BARU] 1. Kembali ke Daftar Kategori Utama
    if (cmd === "LISTPROD") {
      try {
        await showGenericProducts(ctx, true); // (isEdit = true)
        return ctx.answerCbQuery("Kembali ke daftar utama.");
      } catch (e) {
        console.error("Callback LISTPROD error:", e);
        return ctx.answerCbQuery("Gagal memuat list.");
      }
    }

    // [BARU] 2. Menampilkan SUB-KATEGORI (dari Kategori Utama)
    if (cmd === "VIEWMAINCAT") {
      const mainCatId = arg1;
      const mainCategories = readGenericProducts();
      const mainCat = mainCategories.find(c => c.id === mainCatId);
      
      if (!mainCat || !mainCat.sub_items) {
          await ctx.editMessageText("⚠️ Kategori utama tidak ditemukan.");
          return ctx.answerCbQuery("Kategori error.", { show_alert: true });
      }

      // Buat tombol untuk setiap Sub-Kategori
      const buttons = mainCat.sub_items.map(subCat => {
          // Callback: VIEWSCAT | id_utama | id_sub
          return Markup.button.callback(`🏷️ ${subCat.name}`, `VIEWSCAT|${mainCatId}|${subCat.id}`);
      });
      
      let buttonRows = createButtonRows(buttons, 2); // 2-kolom
      buttonRows.push([Markup.button.callback("⬅️ Kembali ke Kategori Utama", "LISTPROD")]);
      
      const text = `📁 *Kategori: ${mainCat.name}*\n\n${mainCat.description || "Silakan pilih sub-kategori:"}`;
      
      try {
          await ctx.editMessageText(text, {
              parse_mode: "Markdown",
              ...Markup.inlineKeyboard(buttonRows)
          });
          return ctx.answerCbQuery(`Menampilkan ${mainCat.name}`);
      } catch(e) {
           console.error("Callback VIEWMAINCAT error:", e);
           return ctx.answerCbQuery("Gagal menampilkan list.");
      }
    }
    
    // [BARU] 3. Menampilkan VARIASI (dari Sub-Kategori)
    if (cmd === "VIEWSCAT") { // Dulu namanya 'VIEWPROD'
      const mainCatId = arg1;
      const subCatId = arg2;
      const mainCat = readGenericProducts().find(c => c.id === mainCatId);
      const subCat = mainCat?.sub_items.find(s => s.id === subCatId);

      if (!subCat || !subCat.variations) {
          await ctx.editMessageText("⚠️ Sub-Kategori tidak ditemukan.");
          return ctx.answerCbQuery("Sub-Kategori error.", { show_alert: true });
      }

      // ... (di dalam 'if (cmd === "VIEWSCAT")') ...

      // Buat tombol untuk setiap Variasi
      // [FIX] Pastikan ada koma (,) setelah ${v.name}
      const buttons = subCat.variations.map(v => {
          return Markup.button.callback(
            `${v.name}`, // Teks Tombol
            `VIEWVAR|${mainCatId}|${subCatId}|${v.id}` // Data Callback
          );
      });
      
      
      let buttonRows = createButtonRows(buttons, 2); // 2-kolom
      buttonRows.push([Markup.button.callback("⬅️ Kembali ke Sub-Kategori", `VIEWMAINCAT|${mainCatId}`)]);
      
      const text = `🏷️ *Produk: ${subCat.name}*\n\n${subCat.description || "Silakan pilih variasi:"}`;
      
      try {
          await ctx.editMessageText(text, {
              parse_mode: "Markdown",
              ...Markup.inlineKeyboard(buttonRows)
          });
          return ctx.answerCbQuery(`Menampilkan ${subCat.name}`);
      } catch(e) {
           console.error("Callback VIEWSCAT error:", e);
           return ctx.answerCbQuery("Gagal menampilkan variasi.");
      }
    }

    // [BARU] 4. Menampilkan DETAIL PRODUK (dari Variasi)
    if (cmd === "VIEWVAR") {
      const mainCatId = arg1;
      const subCatId = arg2;
      const variationId = arg3;
      
      const mainCat = readGenericProducts().find(c => c.id === mainCatId);
      const subCat = mainCat?.sub_items.find(s => s.id === subCatId);
      const product = subCat?.variations.find(v => v.id === variationId);

      if (!product) {
          await ctx.editMessageText("⚠️ Variasi produk tidak ditemukan.");
          return ctx.answerCbQuery("Variasi error.", { show_alert: true });
      }

      // Tampilan rapi (yang tidak jadi dihapus fileText-nya)
      const descText = product.description || "Tidak ada deskripsi.";
      const fileTextLine = product.filePath ? `📦 *File:* \`${product.filePath}\`\n` : "";
      
      const detailMessage = `
🛒 *Detail Produk*
──────────────────
📛 *Nama:* ${product.name}
💰 *Harga:* Rp${product.price.toLocaleString()}
${fileTextLine}📝 *Deskripsi:* ${descText}
`;
      // Callback: BUYVAR | id_utama | id_sub | id_variasi
      const inlineKeyboard = Markup.inlineKeyboard([
          [Markup.button.callback(`✅ Beli Sekarang (Rp${product.price.toLocaleString()})`, `BUYVAR|${mainCatId}|${subCatId}|${variationId}`)],
          [Markup.button.callback("⬅️ Kembali ke Variasi", `VIEWSCAT|${mainCatId}|${subCatId}`)] 
      ]);

      try {
          await ctx.editMessageText(detailMessage, { parse_mode: "Markdown", ...inlineKeyboard });
          return ctx.answerCbQuery("Menampilkan detail variasi.");
      } catch(e) {
           console.error("Callback VIEWVAR error:", e);
           return ctx.answerCbQuery("Gagal menampilkan detail.");
      }
    }

    // [BARU] 5. Logika MEMBELI Variasi
    if (cmd === "BUYVAR") {
      const mainCatId = arg1;
      const subCatId = arg2;
      const variationId = arg3;
      
      const mainCat = readGenericProducts().find(c => c.id === mainCatId);
      const subCat = mainCat?.sub_items.find(s => s.id === subCatId);
      const product = subCat?.variations.find(v => v.id === variationId);

      if (!product) {
          await ctx.editMessageText("⚠️ Produk ini tidak ditemukan lagi.");
          return ctx.answerCbQuery("Produk error.", { show_alert: true });
      }

      // Mulai alur Duitku (Sama seperti BUYPROD, tapi menggunakan 'product' dari variasi)
      const reff = `PROD-${product.id}-${Date.now()}`; // Pakai ID variasi
      const amount = product.price;
      // ... (sisa kode Duitku di bawah ini SAMA SEPERTI KODE BUYVAR LAMA ANDA) ...
      const buyerId = ctx.from.id;
      const buyerUsername = ctx.from.username || "tanpa_username";
      const buyerFirstName = ctx.from.first_name || "User";

      // 1. Buat signature Duitku
      const rawSignature = config.DUITKU_MERCHANT_CODE + reff + amount + config.DUITKU_API_KEY;
      const signature = crypto.createHash("md5").update(rawSignature).digest("hex");

      let paymentResp;
      try {
        // 2. Request Inquiry ke Duitku
        paymentResp = await axios.post("https://passport.duitku.com/webapi/api/merchant/v2/inquiry", {
          merchantCode: config.DUITKU_MERCHANT_CODE,
          paymentAmount: amount,
          paymentMethod: "SP",
          merchantOrderId: reff,
          productDetails: product.name,
          customerVaName: buyerFirstName,
          email: `${buyerId}@telegram.user`,
          phoneNumber: "08123456789",
          itemDetails: [{ name: product.name, price: amount, quantity: 1 }],
          callbackUrl: `https://example.com/callback/${reff}`,
          returnUrl: `https://example.com/return/${reff}`,
          signature: signature,
          expiryPeriod: 5
        }, { headers: { "Content-Type": "application/json" } });

      } catch (e) {
        console.error("Duitku inquiry error (BUYVAR):", e.response ? e.response.data : e.message);
        await ctx.reply("Gagal menghubungi gateway Duitku. Coba lagi nanti.");
        return ctx.answerCbQuery("Gagal membuat invoice.", { show_alert: true });
      }

      const result = paymentResp.data;

      // 3. Cek respon Duitku
      if (result.statusCode !== "00") {
          console.error("Duitku Error Response (BUYVAR):", result);
          await ctx.reply("Gagal membuat transaksi Duitku: " + result.statusMessage);
          return ctx.answerCbQuery("Gagal membuat invoice Duitku.", { show_alert: true });
      }

      const qrString = result.qrString;
      const reference = result.reference;
      const checkoutUrl = result.paymentUrl;

      // 4. Buat QR Code
      const buffer = await QRCode.toBuffer(qrString, { width: 400, color: { dark: "#000000", light: "#ffffff" } });

      // 5. Kirim QR Code ke user
      const sentMsg = await ctx.replyWithPhoto({ source: buffer }, {
        caption: `𝗜𝗡𝗩𝗢ICE 𝗣𝗔𝗬𝗠𝗘𝗡𝗧 💰

𝗣𝗿𝗼𝗱𝘂𝗸 : ${product.name}
𝗧𝗼𝘁𝗮𝗹 𝗧𝗮𝗴𝗶𝗵𝗮𝗻 : Rp${amount.toLocaleString()}
𝗤𝗿𝗶𝘀 K𝗮𝗱𝗮𝗹𝘂𝗮𝗿𝘀𝗮 𝗗𝗮𝗹𝗮𝗺 : 5 menit
------------------------------------------
🕓 Sistem akan 𝗰𝗲𝗸 𝗼𝘁𝗼𝗺𝗮𝘁𝗶𝘀 setiap 15 detik.`,
        ...Markup.inlineKeyboard([
          [Markup.button.url("Bayar di Website", checkoutUrl)],
          [Markup.button.callback("❌ Batalkan", `CANCEL|${reff}`)]
        ])
      });

      // 6. Simpan order ke orders.json
      orders[reff] = {
        reff,
        productId: product.id, // Simpan ID Variasi
        type: "generic_variation", // Tipe baru
        buyer: buyerId,
        buyerUsername: buyerUsername,
        status: "pending",
        created: Date.now(),
        reference,
        paymentData: result,
        qrisMessageId: sentMsg.message_id,
        chatId: ctx.chat.id,
        productName: product.name,
        price: amount,
        filePath: product.filePath // Simpan filePath
      };
      saveOrders(orders);

      // 7. POLLING PEMBAYARAN (Sama persis seperti sebelumnya)
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 20) {
            clearInterval(interval);
            const order = orders[reff];
            if (order?.status === "pending") {
                if (order.qrisMessageId && order.chatId) { try { await bot.telegram.deleteMessage(order.chatId, order.qrisMessageId); } catch(e){} }
                delete orders[reff]; saveOrders(orders);
                await bot.telegram.sendMessage(order.chatId || ctx.chat.id, "⏳ Invoice kadaluarsa, silakan buat order baru.");
            }
            return;
        }

        try {
          const sigCheck = crypto.createHash("md5").update(config.DUITKU_MERCHANT_CODE + reff + config.DUITKU_API_KEY).digest("hex");
          const statusResp = await axios.post("https://passport.duitku.com/webapi/api/merchant/transactionStatus", {
             merchantCode: config.DUITKU_MERCHANT_CODE, merchantOrderId: reff, signature: sigCheck
          }, { headers: { "Content-Type": "application/json" } });

          const status = statusResp?.data?.statusCode;

          if (status === "00") { // "00" = Sukses
            clearInterval(interval);
            const finalOrder = orders[reff];
            if (!finalOrder || finalOrder.status === "paid") return;
            finalOrder.status = "paid";
            saveOrders(orders);

            let fileSent = false;
            let deliveryMessage = "✅ Pembayaran Anda telah dikonfirmasi.";
            if (finalOrder.filePath) {
                const filePathToSend = path.join(__dirname, "src", "products_files", finalOrder.filePath);
                if (fs.existsSync(filePathToSend)) {
                    try {
                        await ctx.replyWithChatAction('upload_document');
                        await bot.telegram.sendDocument(finalOrder.buyer, {
                             source: filePathToSend,
                             filename: finalOrder.filePath
                        }, {
                             caption: `Terima kasih telah membeli *${finalOrder.productName}*!\n\nIni file Anda.` ,
                             parse_mode: "Markdown"
                        });
                        fileSent = true;
                        deliveryMessage += "\n\n📦 File produk Anda telah dikirimkan.";
                        console.log(`[BUYVAR] File ${finalOrder.filePath} terkirim ke user ${finalOrder.buyer}.`);
                    } catch (sendError) {
                        console.error(`[BUYVAR] Gagal mengirim file ${finalOrder.filePath} ke user ${finalOrder.buyer}:`, sendError);
                        deliveryMessage += "\n\n⚠️ Terjadi kesalahan saat mengirim file produk Anda. Mohon hubungi Owner.";
                        await bot.telegram.sendMessage(OWNER_ID,
                             `🚨 GAGAL KIRIM FILE OTOMATIS (BUYVAR) 🚨\n\nRef: \`${reff}\`\nUser: @${finalOrder.buyerUsername} (${finalOrder.buyer})\nProduk: ${finalOrder.productName}\nFile: \`${finalOrder.filePath}\`\n\nError: ${sendError.message}\n\n‼️ Mohon kirim file secara manual! ‼️`,
                             { parse_mode: "Markdown" });
                    }
                } else {
                    console.error(`[BUYVAR] File tidak ditemukan di server untuk Ref ${reff}: ${filePathToSend}`);
                    deliveryMessage += "\n\n⚠️ File produk tidak ditemukan di server. Mohon hubungi Owner.";
                    await bot.telegram.sendMessage(OWNER_ID,
                         `🚨 FILE PRODUK TIDAK DITEMUKAN (BUYVAR) 🚨\n\nRef: \`${reff}\`\nUser: @${finalOrder.buyerUsername} (${finalOrder.buyer})\nProduk: ${finalOrder.productName}\nFile yang dicari: \`${finalOrder.filePath}\`\n\n‼️ Mohon periksa folder \`src/products_files/\` dan kirim file manual! ‼️`,
                         { parse_mode: "Markdown" });
                }
            }
            if (!fileSent) {
                deliveryMessage += "\n⏳ Owner akan segera memproses pesanan Anda.";
                await bot.telegram.sendMessage(OWNER_ID, `📦 PEMBELIAN PRODUK BARU (BUYVAR - MANUAL) 📦\n\nRef: ${reff}\nPembeli: @${finalOrder.buyerUsername}\nProduk: ${finalOrder.productName}\n\n‼️ SEGERA proses pesanan ini secara manual! ‼️`, { parse_mode: "Markdown" });
            } else {
                 await bot.telegram.sendMessage(OWNER_ID, `✅ PEMBELIAN PRODUK (BUYVAR - FILE TERKIRIM) ✅\n\nRef: ${reff}\nPembeli: @${finalOrder.buyerUsername}\nProduk: ${finalOrder.productName}\nFile: ${finalOrder.filePath}`, { parse_mode: "Markdown" });
            }
            await bot.telegram.sendMessage(finalOrder.buyer, `𝗧𝗥𝗔𝗡𝗦𝗔𝗞𝗦𝗜 𝗕𝗘𝗥𝗛𝗔𝗦𝗜𝗟 ✅\n... (info invoice) ...\n𝗣𝗿𝗼𝗱𝘂𝗸 : ${finalOrder.productName}\n------------------------------------------\n${deliveryMessage}`);
          } else if (status === "01") { /* Pending */ } else if (status) {
            clearInterval(interval);
            const order = orders[reff];
            if (order) {
                delete orders[reff]; saveOrders(orders);
                await bot.telegram.sendMessage(order.chatId, `⏳ Invoice gagal atau kadaluarsa (Status: ${statusResp?.data?.statusMessage || 'N/A'}). Silakan buat order baru.`);
            }
          }
        } catch (e) { console.error("checkPayment (Duitku BUYVAR) error", e); }
      }, 15000); 

      return ctx.answerCbQuery("Invoice Duitku dibuat.");
    }
    
    // [BARU] 6. Kita biarkan BUYPROD (untuk produk simpel jika nanti Anda butuh)
    // Blok ini tidak akan terpakai oleh alur baru, tapi tidak mengganggu.
    if (cmd === "BUYPROD") {
       
    }

// ... (ini adalah akhir dari 'bot.on("callback_query", ...)')

    if (cmd === "BUYPROD") {
      const productId = arg1;

      const products = readGenericProducts();
      const product = products.find(p => p.id === productId);

      if (!product) {
        await ctx.editMessageText("⚠️ Produk tidak ditemukan atau sudah dihapus. Silakan coba lagi /buyproduk.");
        return ctx.answerCbQuery("Produk tidak ditemukan.", { show_alert: true });
      }

      // Mulai alur Duitku
      const reff = `PROD-${productId}-${Date.now()}`;
      const amount = product.price;
      const buyerId = ctx.from.id;
      const buyerUsername = ctx.from.username || "tanpa_username";
      const buyerFirstName = ctx.from.first_name || "User";

      // 1. Buat signature Duitku
      const rawSignature = config.DUITKU_MERCHANT_CODE + reff + amount + config.DUITKU_API_KEY;
      const signature = crypto.createHash("md5").update(rawSignature).digest("hex");

      let paymentResp;
      try {
        // 2. Request Inquiry ke Duitku
        paymentResp = await axios.post("https://passport.duitku.com/webapi/api/merchant/v2/inquiry", {
          merchantCode: config.DUITKU_MERCHANT_CODE,
          paymentAmount: amount,
          paymentMethod: "SP",
          merchantOrderId: reff,
          productDetails: product.name,
          customerVaName: buyerFirstName,
          email: `${buyerId}@telegram.user`,
          phoneNumber: "08123456789",
          itemDetails: [{ name: product.name, price: amount, quantity: 1 }],
          callbackUrl: `https://example.com/callback/${reff}`,
          returnUrl: `https://example.com/return/${reff}`,
          signature: signature,
          expiryPeriod: 5
        }, { headers: { "Content-Type": "application/json" } });

      } catch (e) {
        console.error("Duitku inquiry error (BUYPROD):", e.response ? e.response.data : e.message);
        await ctx.reply("Gagal menghubungi gateway Duitku. Coba lagi nanti.");
        return ctx.answerCbQuery("Gagal membuat invoice.", { show_alert: true });
      }

      const result = paymentResp.data;

      // 3. Cek respon Duitku
      if (result.statusCode !== "00") {
          console.error("Duitku Error Response (BUYPROD):", result);
          await ctx.reply("Gagal membuat transaksi Duitku: " + result.statusMessage);
          return ctx.answerCbQuery("Gagal membuat invoice Duitku.", { show_alert: true });
      }

      const qrString = result.qrString;
      const reference = result.reference;
      const checkoutUrl = result.paymentUrl;

      // 4. Buat QR Code
      const buffer = await QRCode.toBuffer(qrString, { width: 400, color: { dark: "#000000", light: "#ffffff" } });

      // 5. Kirim QR Code ke user
      const sentMsg = await ctx.replyWithPhoto({ source: buffer }, {
        caption: `𝗜𝗡𝗩𝗢𝗜𝗖𝗘 𝗣𝗔𝗬𝗠𝗘𝗡𝗧 💰

𝗣𝗿𝗼𝗱𝘂𝗸 : ${product.name}
𝗧𝗼𝘁𝗮𝗹 𝗧𝗮𝗴𝗶𝗵𝗮𝗻 : Rp${amount.toLocaleString()}
𝗤𝗿𝗶𝘀 𝗞𝗮𝗱𝗮𝗹𝘂𝗮𝗿𝘀𝗮 𝗗𝗮𝗹𝗮𝗺 : 5 menit
------------------------------------------
🕓 Sistem akan 𝗰𝗲𝗸 𝗼𝘁𝗼𝗺𝗮𝘁𝗶𝘀 setiap 15 detik.`,
        ...Markup.inlineKeyboard([
          [Markup.button.url("Bayar di Website", checkoutUrl)],
          [Markup.button.callback("❌ Batalkan", `CANCEL|${reff}`)]
        ])
      });

      // 6. Simpan order ke orders.json
      orders[reff] = {
        reff,
        productId: productId,
        type: "generic",
        buyer: buyerId,
        buyerUsername: buyerUsername,
        status: "pending",
        created: Date.now(),
        reference,
        paymentData: result,
        qrisMessageId: sentMsg.message_id,
        chatId: ctx.chat.id,
        productName: product.name,
        price: amount,
        filePath: product.filePath // Simpan filePath
      };
      saveOrders(orders);

      // 7. POLLING PEMBAYARAN
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 20) {
            clearInterval(interval);
            const order = orders[reff];
            if (order?.status === "pending") {
                if (order.qrisMessageId && order.chatId) { try { await bot.telegram.deleteMessage(order.chatId, order.qrisMessageId); } catch(e){} }
                delete orders[reff]; saveOrders(orders);
                await bot.telegram.sendMessage(order.chatId || ctx.chat.id, "⏳ Invoice kadaluarsa, silakan buat order baru.");
            }
            return;
        }

        try {
          // 8. Cek status Duitku
          const sigCheck = crypto.createHash("md5").update(config.DUITKU_MERCHANT_CODE + reff + config.DUITKU_API_KEY).digest("hex");

          // ===============================================
          // [INI PERBAIKANNYA] Tambahkan 'const statusResp ='
          // ===============================================
          const statusResp = await axios.post("https://passport.duitku.com/webapi/api/merchant/transactionStatus", {
             merchantCode: config.DUITKU_MERCHANT_CODE, merchantOrderId: reff, signature: sigCheck
          }, { headers: { "Content-Type": "application/json" } });
          // ===============================================

          const status = statusResp?.data?.statusCode; // Sekarang statusResp sudah ada

          if (status === "00") { // "00" = Sukses
            clearInterval(interval);

            const finalOrder = orders[reff];
            if (!finalOrder || finalOrder.status === "paid") return;

            finalOrder.status = "paid";
            saveOrders(orders);

            // [AWAL MODIFIKASI PENGIRIMAN]
            let fileSent = false;
            let deliveryMessage = "✅ Pembayaran Anda telah dikonfirmasi.";

            // Cek apakah produk ini punya file untuk dikirim
            if (finalOrder.filePath) {
                const filePathToSend = path.join(__dirname, "src", "products_files", finalOrder.filePath);

                if (fs.existsSync(filePathToSend)) {
                    try {
                        await ctx.replyWithChatAction('upload_document');
                        await bot.telegram.sendDocument(finalOrder.buyer, {
                             source: filePathToSend,
                             filename: finalOrder.filePath
                        }, {
                             caption: `Terima kasih telah membeli *${finalOrder.productName}*!\n\nIni file Anda.` ,
                             parse_mode: "Markdown"
                        });
                        fileSent = true;
                        deliveryMessage += "\n\n📦 File produk Anda telah dikirimkan.";
                        console.log(`[BUYPROD] File ${finalOrder.filePath} terkirim ke user ${finalOrder.buyer}.`);
                    } catch (sendError) {
                        console.error(`[BUYPROD] Gagal mengirim file ${finalOrder.filePath} ke user ${finalOrder.buyer}:`, sendError);
                        deliveryMessage += "\n\n⚠️ Terjadi kesalahan saat mengirim file produk Anda. Mohon hubungi Owner.";
                        // Notifikasi Owner jika pengiriman file gagal
                        await bot.telegram.sendMessage(OWNER_ID,
                             `🚨 GAGAL KIRIM FILE OTOMATIS 🚨\n\nPembelian Ref: \`${reff}\`\nUser: @${finalOrder.buyerUsername} (${finalOrder.buyer})\nProduk: ${finalOrder.productName}\nFile: \`${finalOrder.filePath}\`\n\nError: ${sendError.message}\n\n‼️ Mohon kirim file secara manual! ‼️`,
                             { parse_mode: "Markdown" });
                    }
                } else {
                    // File tidak ditemukan di server
                    console.error(`[BUYPROD] File tidak ditemukan di server untuk Ref ${reff}: ${filePathToSend}`);
                    deliveryMessage += "\n\n⚠️ File produk tidak ditemukan di server. Mohon hubungi Owner.";
                    // Notifikasi Owner jika file tidak ada
                    await bot.telegram.sendMessage(OWNER_ID,
                         `🚨 FILE PRODUK TIDAK DITEMUKAN 🚨\n\nPembelian Ref: \`${reff}\`\nUser: @${finalOrder.buyerUsername} (${finalOrder.buyer})\nProduk: ${finalOrder.productName}\nFile yang dicari: \`${finalOrder.filePath}\`\n\n‼️ Mohon periksa folder \`src/products_files/\` dan kirim file manual! ‼️`,
                         { parse_mode: "Markdown" });
                }
            }

            // Jika tidak ada file atau pengiriman file GAGAL, tetap beritahu Owner
            if (!fileSent) {
                deliveryMessage += "\n⏳ Owner akan segera memproses pesanan Anda.";
                await bot.telegram.sendMessage(OWNER_ID, // Kirim ke Owner Utama
`📦 PEMBELIAN PRODUK BARU (PROSES MANUAL) 📦

𝗧𝗮𝗻𝗴𝗴𝗮𝗹 : ${formatDate()}
𝗡𝗼. 𝗥𝗲𝗳 : ${reff}
𝗜𝗗 Duitku : ${reference}
------------------------------------------
👤 Pembeli: @${finalOrder.buyerUsername} (ID: ${finalOrder.buyer})
🏷️ Produk ID: \`${finalOrder.productId}\`
📛 Nama Produk: ${finalOrder.productName}
💰 Harga: Rp${finalOrder.price.toLocaleString()}
------------------------------------------
‼️ SEGERA proses pesanan ini secara manual! (Tidak ada file terkirim otomatis atau gagal kirim) ‼️`, { parse_mode: "Markdown" });
            } else {
                 // Jika file berhasil dikirim, kirim log biasa ke Owner
                 await bot.telegram.sendMessage(OWNER_ID, // Kirim ke Owner Utama
`✅ PEMBELIAN PRODUK (FILE TERKIRIM) ✅

𝗧𝗮𝗻𝗴𝗴𝗮𝗹 : ${formatDate()}
𝗡𝗼. 𝗥𝗲𝗳 : ${reff}
𝗜𝗗 Duitku : ${reference}
------------------------------------------
👤 Pembeli: @${finalOrder.buyerUsername} (ID: ${finalOrder.buyer})
🏷️ Produk ID: \`${finalOrder.productId}\`
📛 Nama Produk: ${finalOrder.productName}
💰 Harga: Rp${finalOrder.price.toLocaleString()}
------------------------------------------
📦 File \`${finalOrder.filePath}\` telah terkirim otomatis ke pembeli.`, { parse_mode: "Markdown" });
            }

            // Kirim pesan akhir ke pembeli
            await bot.telegram.sendMessage(finalOrder.buyer, `𝗧𝗥𝗔𝗡𝗦𝗔𝗞𝗦𝗜 𝗕𝗘𝗥𝗛𝗔𝗦𝗜𝗟 ✅
𝗧𝗮𝗻𝗴𝗴𝗮𝗹 : ${formatDate()}
𝗡𝗼𝗺𝗼𝗿 𝗥𝗲𝗳𝗲𝗿𝗲𝗻𝘀𝗶 : ${reff}
𝗜𝗗 𝗧𝗿𝗮𝗻𝘀𝗮𝗸𝘀𝗶 : ${reference}
𝗦𝘁𝗮𝘁𝘂𝘀 : Berhasil
------------------------------------------
𝗣𝗿𝗼𝗱𝘂𝗸 : ${finalOrder.productName}
𝗧𝗼𝘁𝗮𝗹 𝗧𝗮𝗴𝗶𝗵𝗮𝗻 : Rp${finalOrder.price.toLocaleString()}
------------------------------------------
${deliveryMessage}`); // Gunakan pesan delivery yang sudah dibuat

            // [AKHIR MODIFIKASI PENGIRIMAN]

          } else if (status === "01") {
            // Pending
          } else if (status) {
            // Gagal/Expired
            clearInterval(interval);
            const order = orders[reff];
            if (order) {
                delete orders[reff]; saveOrders(orders);
                await bot.telegram.sendMessage(order.chatId, `⏳ Invoice gagal atau kadaluarsa (Status: ${statusResp?.data?.statusMessage || 'N/A'}). Silakan buat order baru.`);
            }
          }
        } catch (e) {
          console.error("checkPayment (Duitku BUYPROD) error", e);
          // Tambahkan notifikasi error ke Owner jika pengecekan gagal berulang kali
          if (attempts > 5) { // Misalnya, jika gagal 5 kali berturut-turut
              clearInterval(interval);
              await bot.telegram.sendMessage(OWNER_ID, `🚨 ERROR POLLING DUITKU (BUYPROD) 🚨\n\nRef: ${reff}\nError: ${e.message}\n\nPolling dihentikan. Cek manual!`);
          }
        }
      }, 15000); // Cek setiap 15 detik

      return ctx.answerCbQuery("Invoice Duitku dibuat.");
    }
    // [AKHIR BLOK BARU BUYPROD]L)

    // ❌ HANDLE CANCEL (Logika lama, tetap berfungsi)
    if (cmd === "CANCEL") {
      const reff = arg1;
      const order = orders[reff];
      if (!order) return ctx.answerCbQuery("Order tidak ditemukan.", { show_alert: true });

      if (order.qrisMessageId && order.chatId) {
        try {
          await bot.telegram.deleteMessage(order.chatId, order.qrisMessageId);
        } catch (e) {
          // biarkan
        }
      }

      delete orders[reff];
      saveOrders(orders);

      await ctx.reply("❌ Order dibatalkan.");
      return ctx.answerCbQuery("Order dibatalkan.", { show_alert: true });
    }

  } catch (err) {
    console.error("callback_query error:", err);
  }
});


//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Perintah Beli Admin Panel (/buyadmin)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("buyadmin", async (ctx) => {
  // 1. UBAH PARSING ARGUMEN: Hanya ambil username
  const text = ctx.message.text.split(" ").slice(1);
  const username = text[0];
  
  // 2. UBAH VALIDASI: Hanya cek username
  if (!username) {
    return ctx.reply(`
╭─━━━━━━ ✦ ✧ ✦ ━━━━━━─╮
    🔥𝗢𝗥𝗗𝗘𝗥 𝗔𝗗𝗠𝗜𝗡 𝗣𝗔𝗡𝗘𝗟🔥
╰─━━━━━━ ✦ ✧ ✦ ━━━━━━─╯
📝 𝗖𝗮𝗿𝗮 𝗠𝗲𝗺𝗯𝘂𝗮𝘁 :
/buyadmin <username>

📝 𝗖𝗼𝗻𝘁𝗼𝗵 :
/buyadmin picung

🏧 𝗛𝗮𝗿𝗴𝗮 : Rp10.000
    `);
  }
  
  // 3. UBAH TARGET ID: Ambil ID dari user yang mengirim perintah
  const targetTelegramId = ctx.from.id;
  const buyerUsername = ctx.from.username || "tanpa_username";

  // Harga dan detail produk virtual untuk Admin Panel
  const amount = 10000;
  const productName = "Admin Panel";
  const productId = "ADMIN_PANEL"; // ID unik untuk order ini

  const reff = `BUYADMIN-${Date.now()}`; // merchantOrderId (ganti dari CADP)

  // 1. Buat signature Duitku
  const rawSignature = config.DUITKU_MERCHANT_CODE + reff + amount + config.DUITKU_API_KEY;
  const signature = crypto.createHash("md5").update(rawSignature).digest("hex");

  let paymentResp;
  try {
    // 2. Request Inquiry ke Duitku
    paymentResp = await axios.post("https://passport.duitku.com/webapi/api/merchant/v2/inquiry", {
      merchantCode: config.DUITKU_MERCHANT_CODE,
      paymentAmount: amount,
      paymentMethod: "SP", // QRIS
      merchantOrderId: reff,
      productDetails: `Pembelian Admin Panel (${username})`,
      customerVaName: ctx.from.first_name || "Telegram User",
      email: `${username}@admin.Xhin`, // Format email dari /createadmin lama
      phoneNumber: "08123456789", // Placeholder
      itemDetails: [{
        name: `Admin Panel ${username}`,
        price: amount,
        quantity: 1
      }],
      callbackUrl: `https://example.com/callback/${reff}`,
      returnUrl: `https://example.com/return/${reff}`,
      signature: signature,
      expiryPeriod: 5 // Kadaluarsa 5 menit
    }, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    console.error("Duitku inquiry error (/buyadmin):", e.response ? e.response.data : e.message);
    return ctx.reply("Gagal menghubungi gateway Duitku. Coba lagi nanti.");
  }

  const result = paymentResp.data;

  // 3. Cek respon Duitku
  if (result.statusCode !== "00") {
    console.error("Duitku Error Response (/buyadmin):", result);
    return ctx.reply("Gagal membuat transaksi Duitku: " + result.statusMessage);
  }

  const qrString = result.qrString;
  const reference = result.reference; // ID Transaksi Duitku
  const checkoutUrl = result.paymentUrl; // Link bayar web

  // 4. Buat QR Code dari qrString
  const buffer = await QRCode.toBuffer(qrString, { width: 400, color: { dark: "#000000", light: "#ffffff" } });

  // 5. Kirim QR Code ke user
  const sentMsg = await ctx.replyWithPhoto({ source: buffer }, {
    caption: `𝗜𝗡𝗩𝗢𝗜𝗖𝗘 𝗣𝗔𝗬𝗠𝗘𝗡𝗧 💰

𝗣𝗿𝗼𝗱𝘂𝗸 : ${productName} (${username})
𝗧𝗼𝘁𝗮𝗹 𝗧𝗮𝗴𝗶𝗵𝗮𝗻 : Rp${amount}
𝗕𝗶𝗮𝘆𝗮 𝗔𝗱𝗺𝗶𝗻 : Rp0
𝗤𝗿𝗶𝘀 𝗞𝗮𝗱𝗮𝗹𝘂𝗮𝗿𝘀𝗮 𝗗𝗮𝗹𝗮𝗺 : 5 menit
------------------------------------------
🕓 Sistem akan 𝗰𝗲𝗸 𝗼𝘁𝗼𝗺𝗮𝘁𝗶𝘀 setiap 15 detik hingga pembayaran terverifikasi.`,
    ...Markup.inlineKeyboard([
      [Markup.button.url("Bayar di Website", checkoutUrl)],
      [Markup.button.callback("❌ Batalkan", `CANCEL|${reff}`)]
    ])
  });

  // 6. Simpan order ke orders.json
  const orders = readOrders();
  orders[reff] = {
    reff,
    productId: productId,
    username: username, // Username panel baru
    targetTelegramId: targetTelegramId, // 4. UBAH DISINI: Simpan ID pembeli sebagai target
    buyer: ctx.from.id,
    buyerUsername: buyerUsername, // Simpan username untuk log
    status: "pending",
    created: Date.now(),
    reference, // ID Duitku
    paymentData: result,
    qrisMessageId: sentMsg.message_id,
    chatId: ctx.chat.id
  };
  saveOrders(orders);

  // 7. POLLING PEMBAYARAN
  let attempts = 0;
  const interval = setInterval(async () => {
    attempts++;
    
    if (attempts > 20) { 
      clearInterval(interval);
      const order = orders[reff];
      if (order?.status === "pending") {
        if (order.qrisMessageId && order.chatId) {
          try {
            await bot.telegram.deleteMessage(order.chatId, order.qrisMessageId);
          } catch (e) { /* biarkan */ }
        }
        delete orders[reff];
        saveOrders(orders);
        
        // Kirim ke chat yang benar
        await bot.telegram.sendMessage(order.chatId, "⏳ Invoice kadaluarsa, silakan buat order baru.");
      }
      return;
    }

    try {
      // 8. Cek status Duitku
      const sigCheck = crypto.createHash("md5")
        .update(config.DUITKU_MERCHANT_CODE + reff + config.DUITKU_API_KEY)
        .digest("hex");

      const statusResp = await axios.post("https://passport.duitku.com/webapi/api/merchant/transactionStatus", {
        merchantCode: config.DUITKU_MERCHANT_CODE,
        merchantOrderId: reff,
        signature: sigCheck
      }, {
        headers: { "Content-Type": "application/json" }
      });

      const status = statusResp?.data?.statusCode;

      if (status === "00") { // "00" = Sukses
        clearInterval(interval);
        
        const finalOrder = orders[reff];
        if (!finalOrder || finalOrder.status === "paid") return; 

        finalOrder.status = "paid";
        saveOrders(orders);

        // 5. UBAH PENGIRIMAN PESAN: Gunakan finalOrder.chatId, jangan ctx.reply
        await bot.telegram.sendMessage(finalOrder.chatId, `𝗧𝗥𝗔𝗡𝗦𝗔𝗞𝗦𝗜 𝗕𝗘𝗥𝗛𝗔𝗦𝗜𝗟 ✅
𝗧𝗮𝗻𝗴𝗴𝗮𝗹 : ${formatDate()}
𝗡𝗼𝗺𝗼𝗿 𝗥𝗲𝗳𝗲𝗿𝗲𝗻𝘀𝗶 : ${reff}
𝗜𝗗 𝗧𝗿𝗮𝗻𝘀𝗮𝗸𝘀𝗶 : ${reference}
𝗦𝘁𝗮𝘁𝘂𝘀 : Berhasil
------------------------------------------
𝗣𝗿𝗼𝗱𝘂𝗸 : ${productName} (${finalOrder.username})
𝗧𝗼𝘁𝗮𝗹 𝗧𝗮𝗴𝗶𝗵𝗮𝗻 : Rp${amount}
𝗕𝗶𝗮𝘆𝗮 𝗔𝗱𝗺𝗶𝗻 : Rp0
------------------------------------------
📌 Data Admin Panel akan segera dibuat dan dikirim.
`);

        // 9. LOGIKA CREATE ADMIN (tidak berubah)
        const randomSuffix = crypto.randomBytes(3).toString('hex');
        const password = finalOrder.username + randomSuffix;
        let newAdminData;

        try {
          const response = await fetch(`${domain}/api/application/users`, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${plta}`,
            },
            body: JSON.stringify({
              email: `${finalOrder.username}@admin.Xhin`,
              username: finalOrder.username,
              first_name: finalOrder.username,
              last_name: "Memb",
              language: "en",
              root_admin: true,
              password: password,
            }),
          });
          newAdminData = await response.json();

          if (newAdminData.errors) {
            console.error("Gagal buat admin Pterodactyl:", newAdminData.errors);
            // Kirim ke chat yang benar
            await bot.telegram.sendMessage(finalOrder.chatId, "⚠️ Pembayaran sukses tapi gagal membuat admin panel.\nError: " + JSON.stringify(newAdminData.errors[0], null, 2));
            return;
          }

          const user = newAdminData.attributes;

          // 10. Kirim detail ke admin baru (finalOrder.targetTelegramId sekarang adalah ID pembeli)
          await bot.telegram.sendMessage(
            finalOrder.targetTelegramId, // Ini adalah ID si pembeli
            `
· · ─────  INFO ADMIN ───── · ·

   🌐  Login    : ${domain}
   👤  Username : ${user.username}
   🔑  Password : ${password}

· · ───── 📜 RULES 📜 ───── · ·

   •  Jangan Curi Sc
   •  Jangan Buka Panel Orang
   •  Jangan Ddos Server
   •  Kalo jualan sensor domainnya
   •  Jangan Bagi² Panel Free !!
   •  Jangan bagi bagi panel free !! ngelanggar? maklu matyy

· · ───── THANKS ───── · ·

     🙏 Terima Kasih Telah Membeli!
          `
          );
          
          // 11. UBAH KONFIRMASI (OPSIONAL, dihapus agar tidak spam)
          // Pesan "Admin panel berhasil dibuat..." dihapus karena user sudah langsung dapat datanya.

          // 12. UBAH LOG ADMIN: Sederhanakan pesannya
          await bot.telegram.sendMessage(-1001864324191, // ID grup log Anda
`PEMBELIAN ADMIN PANEL✅

𝗧𝗮𝗻𝗴𝗴𝗮𝗹 : ${formatDate()}
𝗡𝗼𝗺𝗼𝗿 𝗥𝗲𝗳𝗲𝗿𝗲𝗻𝘀𝗶 : ${reff}
𝗜𝗗 𝗧𝗿𝗮𝗻𝘀𝗮𝗸𝘀𝗶 : ${reference}
------------------------------------------
👤User @${finalOrder.buyerUsername} (ID: ${finalOrder.buyer})
Telah membeli Admin Panel untuk dirinya sendiri:

• 𝗣𝗿𝗼𝗱𝘂𝗸 : Admin Panel
• 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲 : ${user.username}`);

        } catch (error) {
          console.error(error);
          await bot.telegram.sendMessage(
            finalOrder.chatId,
            "⚠️ Pembayaran sukses, tapi terjadi kesalahan dalam pembuatan admin. Silakan hubungi admin."
          );
        }

      } else if (status === "01") {
        // Pending, biarkan
      } else if (status) {
        // Gagal/Expired
        clearInterval(interval);
        const order = orders[reff]; // Ambil order sekali lagi
        if (order) {
            delete orders[reff];
            saveOrders(orders);
            // Kirim ke chat yang benar
            await bot.telegram.sendMessage(order.chatId, `⏳ Invoice gagal atau kadaluarsa (Status: ${statusResp?.data?.statusMessage || 'N/A'}). Silakan buat order baru.`);
        }
      }
    } catch (e) {
      console.error("checkPayment (Duitku /buyadmin) error", e);
    }
  }, 15000); // Cek setiap 15 detik

});


//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Perintah Beli Reseller (/buyreseller)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("buyreseller", async (ctx) => {
  
  // [BARU] TENTUKAN HARGA RESELLER DI SINI
  const amount = 7000; 
  const productName = "Akses Reseller";
  const productId = "RESELLER_ACCESS";

  // Cek jika user sudah jadi owner/reseller
  if (isOwner(ctx.from.id)) {
    return ctx.reply("Anda sudah menjadi Reseller/Owner.");
  }
  
  const targetTelegramId = ctx.from.id;
  const buyerUsername = ctx.from.username || "tanpa_username";

  const reff = `BUYRESELLER-${Date.now()}`;

  // 1. Buat signature Duitku
  const rawSignature = config.DUITKU_MERCHANT_CODE + reff + amount + config.DUITKU_API_KEY;
  const signature = crypto.createHash("md5").update(rawSignature).digest("hex");

  let paymentResp;
  try {
    // 2. Request Inquiry ke Duitku
    paymentResp = await axios.post("https://passport.duitku.com/webapi/api/merchant/v2/inquiry", {
      merchantCode: config.DUITKU_MERCHANT_CODE,
      paymentAmount: amount,
      paymentMethod: "SP", // QRIS
      merchantOrderId: reff,
      productDetails: `Pembelian Akses Reseller`,
      customerVaName: ctx.from.first_name || "Telegram User",
      email: `${targetTelegramId}@reseller.id`, // Email placeholder
      phoneNumber: "08123456789", // Placeholder
      itemDetails: [{
        name: productName,
        price: amount,
        quantity: 1
      }],
      callbackUrl: `https://example.com/callback/${reff}`,
      returnUrl: `https://example.com/return/${reff}`,
      signature: signature,
      expiryPeriod: 5 // Kadaluarsa 5 menit
    }, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    console.error("Duitku inquiry error (/buyreseller):", e.response ? e.response.data : e.message);
    return ctx.reply("Gagal menghubungi gateway Duitku. Coba lagi nanti.");
  }

  const result = paymentResp.data;

  // 3. Cek respon Duitku
  if (result.statusCode !== "00") {
    console.error("Duitku Error Response (/buyreseller):", result);
    return ctx.reply("Gagal membuat transaksi Duitku: " + result.statusMessage);
  }

  const qrString = result.qrString;
  const reference = result.reference; // ID Transaksi Duitku
  const checkoutUrl = result.paymentUrl; // Link bayar web

  // 4. Buat QR Code dari qrString
  const buffer = await QRCode.toBuffer(qrString, { width: 400, color: { dark: "#000000", light: "#ffffff" } });

  // 5. Kirim QR Code ke user
  const sentMsg = await ctx.replyWithPhoto({ source: buffer }, {
    caption: `𝗜𝗡𝗩𝗢𝗜𝗖𝗘 𝗣𝗔𝗬𝗠𝗘𝗡𝗧 💰

𝗣𝗿𝗼𝗱𝘂𝗸 : ${productName}
𝗧𝗼𝘁𝗮𝗹 𝗧𝗮𝗴𝗶𝗵𝗮𝗻 : Rp${amount}
𝗕𝗶𝗮𝘆𝗮 𝗔𝗱𝗺𝗶𝗻 : Rp0
𝗤𝗿𝗶𝘀 𝗞𝗮𝗱𝗮𝗹𝘂𝗮𝗿𝘀𝗮 𝗗𝗮𝗹𝗮𝗺 : 5 menit
------------------------------------------
🕓 Sistem akan 𝗰𝗲𝗸 𝗼𝘁𝗼𝗺𝗮𝘁𝗶𝘀 setiap 15 detik hingga pembayaran terverifikasi.`,
    ...Markup.inlineKeyboard([
      [Markup.button.url("Bayar di Website", checkoutUrl)],
      [Markup.button.callback("❌ Batalkan", `CANCEL|${reff}`)]
    ])
  });

  // 6. Simpan order ke orders.json
  const orders = readOrders();
  orders[reff] = {
    reff,
    productId: productId,
    targetTelegramId: targetTelegramId, // ID pembeli
    buyer: ctx.from.id,
    buyerUsername: buyerUsername, // Simpan username untuk log
    status: "pending",
    created: Date.now(),
    reference, // ID Duitku
    paymentData: result,
    qrisMessageId: sentMsg.message_id,
    chatId: ctx.chat.id
  };
  saveOrders(orders);

  // 7. POLLING PEMBAYARAN
  let attempts = 0;
  const interval = setInterval(async () => {
    attempts++;
    
    if (attempts > 20) { 
      clearInterval(interval);
      const order = orders[reff];
      if (order?.status === "pending") {
        if (order.qrisMessageId && order.chatId) {
          try {
            await bot.telegram.deleteMessage(order.chatId, order.qrisMessageId);
          } catch (e) { /* biarkan */ }
        }
        delete orders[reff];
        saveOrders(orders);
        
        await bot.telegram.sendMessage(order.chatId, "⏳ Invoice kadaluarsa, silakan buat order baru.");
      }
      return;
    }

    try {
      // 8. Cek status Duitku
      const sigCheck = crypto.createHash("md5")
        .update(config.DUITKU_MERCHANT_CODE + reff + config.DUITKU_API_KEY)
        .digest("hex");

      const statusResp = await axios.post("https://passport.duitku.com/webapi/api/merchant/transactionStatus", {
        merchantCode: config.DUITKU_MERCHANT_CODE,
        merchantOrderId: reff,
        signature: sigCheck
      }, {
        headers: { "Content-Type": "application/json" }
      });

      const status = statusResp?.data?.statusCode;

      if (status === "00") { // "00" = Sukses
        clearInterval(interval);
        
        const finalOrder = orders[reff];
        if (!finalOrder || finalOrder.status === "paid") return; 

        finalOrder.status = "paid";
        saveOrders(orders);

        // [DIMODIFIKASI] Logika sukses untuk Reseller
        try {
          // 1. Tambahkan ID pembeli ke file resellers.json
          addReseller(finalOrder.targetTelegramId);

          // 2. Kirim pesan sukses ke pembeli
          await bot.telegram.sendMessage(finalOrder.chatId, `𝗧𝗥𝗔𝗡𝗦𝗔𝗞𝗦𝗜 𝗕𝗘𝗥𝗛𝗔𝗦𝗜𝗟 ✅
𝗧𝗮𝗻𝗴𝗴𝗮𝗹 : ${formatDate()}
𝗡𝗼𝗺𝗼𝗿 𝗥𝗲𝗳𝗲𝗿𝗲𝗻𝘀𝗶 : ${reff}
𝗜𝗗 𝗧𝗿𝗮𝗻𝘀𝗮𝗸𝘀𝗶 : ${reference}
𝗦𝘁𝗮𝘁𝘂𝘀 : Berhasil
------------------------------------------
𝗣𝗿𝗼𝗱𝘂𝗸 : ${productName}
𝗧𝗼𝘁𝗮𝗹 𝗧𝗮𝗴𝗶𝗵𝗮𝗻 : Rp${amount}
------------------------------------------
🎉 Selamat! Akun Anda telah di-upgrade menjadi Reseller.

🛡️ Gunakan Perintah /createpanel Untuk Membuat Panel 
`);

          // 3. Kirim log ke Admin
          await bot.telegram.sendMessage(-1001864324191, // ID grup log Anda
`PEMBELIAN RESELLER✅

𝗧𝗮𝗻𝗴𝗴𝗮𝗹 : ${formatDate()}
𝗡𝗼𝗺𝗼𝗿 𝗥𝗲𝗳𝗲𝗿𝗲𝗻𝘀𝗶 : ${reff}
𝗜𝗗 𝗧𝗿𝗮𝗻𝘀𝗮𝗸𝘀𝗶 : ${reference}
------------------------------------------
👤User @${finalOrder.buyerUsername} (ID: ${finalOrder.buyer})
Telah membeli Akses Reseller.`);

        } catch (error) {
          console.error(error);
          await bot.telegram.sendMessage(
            finalOrder.chatId,
            "⚠️ Pembayaran sukses, tapi terjadi kesalahan dalam upgrade akun. Silakan hubungi admin."
          );
        }

      } else if (status === "01") {
        // Pending, biarkan
      } else if (status) {
        // Gagal/Expired
        clearInterval(interval);
        const order = orders[reff]; // Ambil order sekali lagi
        if (order) {
            delete orders[reff];
            saveOrders(orders);
            await bot.telegram.sendMessage(order.chatId, `⏳ Invoice gagal atau kadaluarsa (Status: ${statusResp?.data?.statusMessage || 'N/A'}). Silakan buat order baru.`);
        }
      }
    } catch (e) {
      console.error("checkPayment (Duitku /buyreseller) error", e);
    }
  }, 15000); // Cek setiap 15 detik

});


//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// Headler Button Keyboard
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.hears("📦 Order Panel", (ctx) => ctx.reply(`
╭─━━━━━━ ✦ ✧ ✦ ━━━━━━─╮
           ⚡𝗢𝗥𝗗𝗘𝗥 𝗣𝗔𝗡𝗘𝗟⚡
╰─━━━━━━ ✦ ✧ ✦ ━━━━━━─╯
📝 𝗖𝗮𝗿𝗮 𝗠𝗲𝗺𝗯𝘂𝗮𝘁 :
/buypanel <username>

📝 𝗖𝗼𝗻𝘁𝗼𝗵 :
/buypanel picung`));

bot.hears("🛍️ Order Admin Panel", (ctx) => ctx.reply(`
╭─━━━━━━ ✦ ✧ ✦ ━━━━━━─╮
    🔥𝗢𝗥𝗗𝗘𝗥 𝗔𝗗𝗠𝗜𝗡 𝗣𝗔𝗡𝗘𝗟🔥
╰─━━━━━━ ✦ ✧ ✦ ━━━━━━─╯
📝 𝗖𝗮𝗿𝗮 𝗠𝗲𝗺𝗯𝘂𝗮𝘁 :
/buyadmin <username>

📝 𝗖𝗼𝗻𝘁𝗼𝗵 :
/buyadmin picung

🏧 𝗛𝗮𝗿𝗴𝗮 : Rp10.000
`));

// [BARU] Hears untuk tombol Reseller
bot.hears("👑 Order Reseller", (ctx) => ctx.reply(`
╭─━━━━━━ ✦ ✧ ✦ ━━━━━━─╮
    👑 𝗢𝗥𝗗𝗘𝗥 𝗥𝗘𝗦𝗘𝗟𝗟𝗘𝗥 👑
╰─━━━━━━ ✦ ✧ ✦ ━━━━━━─╯
Setelah Pembayaran Berhasil Anda Mendapatkan Akses /createpanel

📝 𝗖𝗮𝗿𝗮 𝗠𝗲𝗺𝗯𝗲𝗹𝗶 :
Ketik /buyreseller

🏧 𝗛𝗮𝗿𝗴𝗮 : Rp7.000
`));

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Handler untuk tombol "🛒 Beli Produk Lain"
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
bot.hears("🛒 Beli Produk Lain", async (ctx) => {
  await showGenericProducts(ctx, false, 1); // Tambahkan false dan 1
});

// [BARU] Handler untuk tombol Free Panel (klaim)
bot.hears("🎁 Free Panel", async (ctx) => {
    await handleClaimQuota(ctx); // Panggil fungsi klaim yang sama
});

bot.hears("📞 Hubungi Customer Service", (ctx) => {
  const infoOwner = `
📞 *Customer Service*

👤 Owner: [Klik disini](${urladmin})
  `;
  ctx.replyWithMarkdown(infoOwner);
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// Withdraw (Atlantic - Dibiarkan)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

// helper sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// helper sensor
function sensorString(input, visibleCount = 3, maskChar = "X") {
  if (!input) return "";
  if (input.length <= visibleCount) return input;
  return input.slice(0, visibleCount) + maskChar.repeat(input.length - visibleCount);
}

function sensorWithSpace(str, visibleCount = 3, maskChar = "X") {
  if (!str) return "";
  let result = "";
  let count = 0;
  for (let char of str) {
    if (char === " ") {
      result += char;
    } else if (count < visibleCount) {
      result += char;
      count++;
    } else {
      result += maskChar;
    }
  }
  return result;
}

// ✅ Command cek saldo (versi sederhana & stabil)
bot.command("saldo", async (ctx) => {
  // [DIMODIFIKASI] Gunakan isOwner()
  if (!isOwner(ctx.from.id)) {
    return ctx.reply("❌ Hanya Owner/Reseller yang bisa mengakses perintah ini.");
  }

  try {
    const res = await axios.post(
      "https://atlantich2h.com/get_profile",
      qs.stringify({ api_key: config.apiAtlantic }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const saldoUtama = res?.data?.data?.balance || 0;
    const saldoSettle = res?.data?.data?.settlement_balance || 0;

    const message = `
📊 *INFORMASI SALDO ATLANTIC*
━━━━━━━━━━━━━━━━━━━━━
💰 *User Balance:* Rp${saldoUtama.toLocaleString()}
🏦 *Settlement Balance:* Rp${saldoSettle.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━
🕒 *Update:* ${formatDate()}
`;

    return ctx.reply(message, { parse_mode: "Markdown" });
  } catch (err) {
    const msgErr = err.response?.data?.message || err.message;
    console.error("❌ Error cek saldo:", msgErr);
    return ctx.reply(`❌ Gagal memuat saldo.\n\n${msgErr}`);
  }
});


// ✅ Command cairkan saldo
bot.command("cairkan", async (ctx) => {
  // [DIMODIFIKASI] Gunakan isOwner()
  if (!isOwner(ctx.from.id)) {
    return ctx.reply("❌ Hanya Owner/Reseller yang bisa mengakses perintah ini.");
  }

  try {
    // ambil saldo dulu
    const res = await axios.post(
      "https://atlantich2h.com/get_profile",
      qs.stringify({ api_key: config.apiAtlantic }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const saldoAwal = res?.data?.data?.balance || 0;
    if (saldoAwal <= 0) {
      return ctx.reply("⚠️ Tidak ada saldo yang bisa dicairkan.");
    }

    const totalsaldo = Math.max(0, saldoAwal - 2000); // potong fee 2000

    await ctx.reply(
      `⏳ *Proses Pencairan*\n\n` +
      `Sedang mencairkan saldo sebesar *Rp${totalsaldo.toLocaleString()}*...\n\nMohon tunggu sebentar.`
    , { parse_mode: "Markdown" });

    // request pencairan
    const transfer = await axios.post(
      "https://atlantich2h.com/transfer/create",
      qs.stringify({
        api_key: config.apiAtlantic,
        ref_id: `${Date.now()}`,
        kode_bank: config.typeewallet,
        nomor_akun: config.nopencairan,
        nama_pemilik: config.atasnamaewallet,
        nominal: totalsaldo.toString(),
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const ids = transfer?.data?.data?.id;
    let status = transfer?.data?.data?.status || "unknown";

    const notif = (st) => (
      `🏦 *Slip Pencairan Saldo*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 Nominal     : Rp${saldoAwal.toLocaleString()}\n` +
      `🏧 Fee         : Rp2.000\n` +
      `📲 Tujuan      : ${sensorString(config.nopencairan)}\n` +
      `🏷️ Ewallet     : ${config.typeewallet}\n` +
      `👤 Pemilik     : ${sensorWithSpace(config.atasnamaewallet)}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📍 Status      : *${st.toUpperCase()}*`
    );

    if (status === "success") {
      return ctx.reply(notif("success"), { parse_mode: "Markdown" });
    }

    if (status === "pending") {
      for (let i = 0; i < 6; i++) {
        await sleep(5000);

        const checkRes = await axios.post(
          "https://atlantich2h.com/transfer/status",
          qs.stringify({ api_key: config.apiAtlantic, id: ids }),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        const result = checkRes?.data?.data || {};
        if (result?.status && result.status !== "pending") {
          return ctx.reply(notif(result.status), { parse_mode: "Markdown" });
        }
      }

      await ctx.reply("⚠️ Pencairan masih *pending*, silakan cek manual di dashboard Atlantic.", { parse_mode: "Markdown" });
    }

  } catch (err) {
    const msgErr = err.response?.data?.message || err.message;
    console.error("❌ Error cairkan saldo:", msgErr);
    return ctx.reply(`❌ Gagal mencairkan saldo.\n\n${msgErr}`);
  }
});

// [FIX - HANYA LIMIT HARIAN] Fungsi terpisah untuk menangani logika klaim kuota
async function handleClaimQuota(ctx) {
    const userId = ctx.from.id;
    const userIdStr = String(userId);

    // 1. Cek Limit Klaim Harian (Sudah Benar)
    const dailyData = readDailyClaims(); // Baca data harian (sudah handle reset)
    if (dailyData.claimedToday.length >= DAILY_CLAIM_LIMIT) {
        // [FIX PESAN] Perbaiki variabel di pesan error limit
        return ctx.reply(`⚠️ Maaf, limit klaim kuota gratis harian (${DAILY_CLAIM_LIMIT} orang) sudah tercapai hari ini. Silakan coba lagi besok.`);
    }

    // 2. Cek apakah user sudah pernah klaim SEUMUR HIDUP (Sudah Benar)
    if (hasUserClaimed(userId)) {
        return ctx.reply("⚠️ Anda sudah pernah mengklaim kuota gratis sebelumnya.");
    }

    // 3. Jika belum pernah & limit harian belum tercapai, proses
    try {
        const premUsers = readPremUsers(); // Baca format simpel {id: quota}
        // [FIX BACA KUOTA] Baca kuota sebagai angka langsung
        const currentQuota = Number(premUsers[userIdStr]) || 0;
        const newQuota = currentQuota + 1;

        // ===============================================
        // [PERBAIKAN UTAMA] Simpan kuota sebagai ANGKA biasa
        // ===============================================
        premUsers[userIdStr] = newQuota; // Langsung simpan angka kuota
        savePremUsers(premUsers);
        // ===============================================

        // 4. Tandai user sudah klaim HARI INI (Sudah Benar)
        const dailyClaimAdded = addClaimToDaily(userId);
        if (!dailyClaimAdded) {
             console.error(`[Claim Critical] Gagal menambahkan user ${userId} ke daily claim padahal limit belum penuh!`);
             // Anda bisa tambahkan pesan error ke user di sini jika mau
        }

        // 5. Tandai user sudah klaim SEUMUR HIDUP (Sudah Benar)
        markUserAsClaimed(userId);

        // 6. Beri pesan sukses (Hapus info 5GB)
        await ctx.reply(
            `✅ Klaim berhasil!\n\n` +
            `Anda mendapatkan *1 kuota* gratis untuk menggunakan perintah /create.\n\n`+ // Hapus "(Hanya 5GB)"
            `Total kuota /create Anda sekarang: *${newQuota}*.\n\n` +
            `Gunakan perintah /mypremquota untuk mengecek sisa kuota Anda.`
            , { parse_mode: "Markdown" }
        );

        // [FIX LOG] Perbaiki pesan log console
        console.log(`[Claim] User ${userId} berhasil klaim 1 kuota. Kuota baru: ${newQuota}. Klaim hari ini: ${dailyData.claimedToday.length + (dailyClaimAdded ? 1:0)}/${DAILY_CLAIM_LIMIT}`);

    } catch (error) {
        console.error("[Claim] Error saat memproses klaim:", error);
        await ctx.reply("❌ Terjadi kesalahan saat mencoba mengklaim kuota. Silakan coba lagi nanti atau hubungi admin.");
    }
}

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [DIMODIFIKASI] Perintah User: Klaim Kuota /create Gratis (1x)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("claim", async (ctx) => {
    await handleClaimQuota(ctx); // Panggil fungsi klaim
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// FITUR AUTO CLAIM GARANSI (FINAL FIX)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("claimgaransi", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1);
  const targetUsername = text[0];

  if (!targetUsername) {
    return ctx.reply(`
╭─━━━━━━ 🛡️ 𝗚𝗔𝗥𝗔𝗡𝗦𝗜 🛡️ ━━━━━━─╮
🔄 𝗙𝗜𝗧𝗨𝗥 𝗖𝗟𝗔𝗜𝗠 𝗚𝗔𝗥𝗔𝗡𝗦𝗜
╰─━━━━━━━━━━━━━━━━━━━━━━━─╯
Fitur ini digunakan jika panel Anda mati/suspend sebelum masa garansi habis (Ganti Server).

📝 𝗖𝗮𝗿𝗮 𝗣𝗮𝗸𝗮𝗶 :
/claimgaransi <username_panel_lama>
`);
  }

  const userId = ctx.from.id;
  const orders = readOrders();
  const products = readProducts();

  // 1. CARI DATA TRANSAKSI
  const orderKey = Object.keys(orders).find(key => {
    const o = orders[key];
    // Cek username, buyer ID, dan status paid
    return o.status === "paid" && o.username === targetUsername && o.buyer === userId;
  });

  if (!orderKey) {
    return ctx.reply("❌ 𝗚𝗔𝗚𝗔𝗟: Data pembelian tidak ditemukan atau Anda bukan pemilik panel ini.");
  }

  const orderData = orders[orderKey];

  // 2. CEK STATUS SUDAH CLAIM ATAU BELUM
  if (orderData.isClaimed) {
    return ctx.reply("⚠️ 𝗚𝗔𝗚𝗔𝗟: Garansi untuk transaksi ini sudah pernah diklaim.");
  }

  // 3. CEK MASA GARANSI (15 HARI)
  const purchaseDate = new Date(orderData.created);
  const today = new Date();
  const diffTime = Math.abs(today - purchaseDate);
  const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysDiff > 15) {
    return ctx.reply(`❌ 𝗚𝗔𝗚𝗔𝗟: Masa garansi habis (Sudah ${daysDiff} hari).`);
  }

  // ============================================================
  // 🔥 LOGIKA INTI: CEK URL/DOMAIN (PLTA CHANGE TRIGGER) 🔥
  // ============================================================
  
  // Ambil domain saat dia beli (dari database order)
  const orderDomain = orderData.domain; 
  // Ambil domain bot saat ini (dari config/memory)
  const currentDomain = config.domain; 

  let isEligibleForClaim = false;
  let claimReason = "";

  if (orderDomain && orderDomain !== currentDomain) {
      // KASUS A: Domain di struk BEDA dengan Domain Bot sekarang.
      // Artinya Owner sudah ganti VPS (PLTA).
      // Buyer SAH melakukan klaim.
      isEligibleForClaim = true;
      claimReason = "Migrasi Server / VPS Lama Suspend";
      
  } else {
      // KASUS B: Domain MASIH SAMA.
      // Buyer mencoba klaim di server yang sama. Kita harus cek status panel.
      
      await ctx.reply("⏳ 𝗖𝗘𝗞 𝗦𝗧𝗔𝗧𝗨𝗦: Domain server sama, mengecek kondisi panel Anda...");
      
      try {
        // 1. Cek User via API
        const userSearch = await fetch(`${domain}/api/application/users?filter[username]=${targetUsername}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${plta}` }
        });
        const userRes = await userSearch.json();

        if (userRes.data && userRes.data.length > 0) {
            // User ditemukan
            const pteroUserId = userRes.data[0].attributes.id;
            
            // 2. Cek Server berdasarkan Owner ID
            let serverSearch = await fetch(`${domain}/api/application/servers?filter[owner_id]=${pteroUserId}`, {
                 method: 'GET',
                 headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${plta}` }
            });
            let serverRes = await serverSearch.json();

            // [FIX PENTING] Jika pencarian ID kosong, Cek berdasarkan NAMA SERVER (Backup Check)
            // Ini agar jika API delay, tidak langsung dianggap hilang.
            if (!serverRes.data || serverRes.data.length === 0) {
                 serverSearch = await fetch(`${domain}/api/application/servers?filter[name]=${targetUsername}`, {
                     method: 'GET',
                     headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${plta}` }
                 });
                 serverRes = await serverSearch.json();
            }

            if (serverRes.data && serverRes.data.length > 0) {
                const srv = serverRes.data[0].attributes;
                
                // Jika server TIDAK suspended, berarti masih sehat -> TOLAK
                if (!srv.suspended) {
                     return ctx.reply(`⛔ 𝗞𝗟𝗔𝗜𝗠 𝗗𝗜𝗧𝗢𝗟𝗔𝗞 (ANTI-CURANG)\n\nPanel Anda (${srv.name}) terdeteksi masih **AKTIF** (Running).\n\nSilahkan login ke panel. Garansi hanya berlaku jika VPS mati atau Panel Suspend.`);
                } else {
                    // Jika suspended -> ACC
                    isEligibleForClaim = true;
                    claimReason = "Panel Suspend di Server Aktif";
                    
                    // Hapus panel lama agar tidak menumpuk
                    try {
                        await fetch(`${domain}/api/application/servers/${srv.id}`, {
                            method: 'DELETE',
                            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${plta}` }
                        });
                        await fetch(`${domain}/api/application/users/${pteroUserId}`, {
                            method: 'DELETE',
                            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${plta}` }
                        });
                    } catch(e) {}
                }
            } else {
                // [FIX] User Ada, tapi Server TIDAK ADA di kedua pengecekan?
                // Jangan langsung ACC. Kemungkinan akun normal tapi server belum terindex API.
                // Kita tolak agar tidak double claim.
                return ctx.reply(`⚠️ 𝗞𝗟𝗔𝗜𝗠 𝗗𝗜𝗧𝗔𝗛𝗔𝗡\n\nAkun panel Anda terdeteksi di database, tapi sistem gagal membaca status server.\n\n✅ **Solusi:** Coba login manual ke panel. Akun Anda kemungkinan masih aman.`);
            }
        } else {
            // User tidak ditemukan sama sekali di panel (Terhapus) -> ACC
            // Ini valid, karena kalau user hilang, dia pasti tidak bisa login.
            isEligibleForClaim = true;
            claimReason = "Akun Tidak Ditemukan (Terhapus)";
        }
      } catch (e) {
         console.log("Error cek status:", e);
         // Jika error API parah (misal panel mati total/timeout), baru kita ACC
         isEligibleForClaim = true;
         claimReason = "Koneksi Panel Error (Server Down)";
      }
  }

  // ============================================================
  // EKSEKUSI KLAIM (JIKA ELIGIBLE)
  // ============================================================
  
  if (isEligibleForClaim) {
      const productInfo = products.find(p => p.id === orderData.productId);
      if (!productInfo) return ctx.reply("⚠️ Produk database tidak ditemukan.");

      await ctx.reply(`✅ 𝗞𝗟𝗔𝗜𝗠 𝗗𝗜𝗧𝗘𝗥𝗜𝗠𝗔 (${claimReason})\nMembuat panel pengganti...`);

      // Buat username baru (tambah angka random)
      const randomTag = Math.floor(Math.random() * 999);
      const newUsername = `${targetUsername}${randomTag}`;

      // Buat Panel Baru
      const account = await createUserAndServer({ 
          username: newUsername, 
          product: productInfo 
      });

      if (account.error) {
        return ctx.reply("❌ Gagal membuat panel baru. Hubungi Admin.\nErr: " + JSON.stringify(account.details));
      }

      // Update Database
      orders[orderKey].isClaimed = true;
      orders[orderKey].claimDate = Date.now();
      orders[orderKey].newUsername = newUsername;
      saveOrders(orders);

      // Kirim Hasil
      await ctx.reply(`
🎉 𝗣𝗔𝗡𝗘𝗟 𝗣𝗘𝗡𝗚𝗚𝗔𝗡𝗧𝗜 𝗥𝗘𝗔𝗗𝗬

Karena VPS lama mati/bermasalah, berikut akun baru Anda di server ini:

╭─ 🔐 𝗔𝗞𝗨𝗡 𝗕𝗔𝗥𝗨 ────────
│ 👤 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲: ${account.username}
│ 🔑 𝗣𝗮𝘀𝘀𝘄𝗼𝗿𝗱: ${account.password}
│ 🔗 𝗟𝗼𝗴𝗶𝗻: ${domain}
╰─────────────────────
⚙️ Spek sama dengan pembelian awal.
`);
      
      // Log Admin
       await bot.telegram.sendMessage(OWNER_ID, 
`🔄 𝗔𝗨𝗧𝗢 𝗖𝗟𝗔𝗜𝗠 𝗦𝗨𝗞𝗦𝗘𝗦

User: @${ctx.from.username}
Alasan: ${claimReason}
Old Panel: ${targetUsername}
New Panel: ${account.username}`);

  } else {
      // Fallback jika lolos pengecekan tapi status tidak jelas (Sangat jarang)
      return ctx.reply("⛔ Klaim tidak dapat diproses otomatis. Hubungi Admin.");
  }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// Create Panel (Owner Only) - [DIMODIFIKASI DENGAN PILIHAN RAM]
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("createpanel", async (ctx) => {
  // [DIMODIFIKASI] Gunakan isOwner()
  if (!isOwner(ctx.from.id)) {
    return ctx.reply("⚠️ Silahkan Membeli Akses Reseller Dengan Mengetik /buyreseller", { parse_mode: "Markdown" });
  }

  const text = ctx.message.text.split(" ").slice(1);
  const username = text[0];
  if (!username) {
    return ctx.reply("Format: /createpanel <username>\n\nContoh:\n/createpanel picung");
  }

  // [BARU] Cek apakah username sudah dipakai
  if (await isUsernameTaken(username)) {
    return ctx.reply(`⚠️ Username "${username}" sudah dipakai. Silakan pilih username lain.`);
  }

  // [BARU] Baca produk untuk ditampilkan sebagai tombol
  const products = readProducts();
  if (!products.length) return ctx.reply("Belum ada produk di products.json.");

  // [BARU] Buat tombol inline keyboard dari daftar produk
  const rows = [];
  for (let i = 0; i < products.length; i += 2) {
    const left = products[i];
    const right = products[i + 1];
    const row = [];
    
    // Format callback: CP_SELECT | ProductID | Username
    // (CP_SELECT = Create Panel Select)
    row.push(Markup.button.callback(
      `${left.name}`, // Tampilkan nama produk
      `CP_SELECT|${left.id}|${username}` // Kirim ID produk dan username
    ));
    
    if (right) {
      row.push(Markup.button.callback(
        `${right.name}`,
        `CP_SELECT|${right.id}|${username}`
      ));
    }
    rows.push(row);
  }

  // [BARU] Kirim pesan dengan pilihan produk
  await ctx.reply(
    `Membuat panel untuk username: *${username}*\n\nSilakan pilih paket spesifikasi:`, 
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(rows)
    }
  );
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Menambah Reseller Manual (Owner Utama Saja)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("addreseller", async (ctx) => {
    // 1. [DIMODIFIKASI] Pengecekan HANYA untuk OWNER_ID
    // Kita tidak pakai isOwner() agar reseller lain tidak bisa pakai.
    const senderId = String(ctx.from.id);
    const mainOwnerId = String(OWNER_ID); 

    if (senderId !== mainOwnerId) {
        return ctx.reply("⛔ Perintah ini hanya untuk *Owner Utama*.", {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Hubungi Admin', url: urladmin }]
                ]
            }
        });
    }

    // 2. [DIMODIFIKASI] Ambil argumen ID
    const text = ctx.message.text.split(" ").slice(1);
    const targetId = text[0];

    if (!targetId || !/^\d+$/.test(targetId)) { // Cek jika formatnya angka
        return ctx.reply(
            "Format salah. Mohon masukkan ID Telegram target.\n" +
            "Contoh: `/addreseller 123456789`",
            { parse_mode: "Markdown" }
        );
    }

    const targetIdNum = Number(targetId);
    
    // 3. [DIMODIFIKASI] Cek dan tambahkan ke resellers.json
    const resellers = readResellers();

    if (resellers.includes(targetIdNum)) {
        return ctx.reply(`⚠️ User \`${targetIdNum}\` sudah terdaftar sebagai Reseller.`, { 
            parse_mode: "Markdown" 
        });
    }

    // Tambahkan user
    addReseller(targetIdNum); // Fungsi ini otomatis membaca dan menyimpan

    await ctx.reply(`✅ User \`${targetIdNum}\` berhasil ditambahkan sebagai Reseller.`, { 
        parse_mode: "Markdown" 
    });

    // 4. [BONUS] Kirim notifikasi ke reseller yang baru ditambahkan
    try {
        await bot.telegram.sendMessage(targetIdNum,
            "🎉 *Selamat!* Akun Anda telah di-upgrade menjadi *Reseller* oleh Owner.\n\n" +
            "Anda sekarang dapat menggunakan perintah seperti `/createpanel`.",
            { parse_mode: "Markdown" }
        );
    } catch (e) {
        console.error("Gagal kirim notif ke reseller baru:", e.message);
        await ctx.reply("*(Info: Gagal mengirim notifikasi ke user tersebut. Mungkin mereka memblokir bot.)*");
    }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] List semua Reseller (Owner Utama Saja)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("listreseller", async (ctx) => {
    // 1. [DIMODIFIKASI] Pengecekan HANYA untuk OWNER_ID
    const senderId = String(ctx.from.id);
    const mainOwnerId = String(OWNER_ID); 

    if (senderId !== mainOwnerId) {
        return ctx.reply("⛔ Perintah ini hanya untuk *Owner Utama*.", {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Hubungi Admin', url: urladmin }]
                ]
            }
        });
    }

    // 2. [DIMODIFIKASI] Baca data dari resellers.json
    const resellers = readResellers();

    // 3. [DIMODIFIKASI] Handle jika kosong
    if (resellers.length === 0) {
        return ctx.reply('📭 Tidak ada user yang terdaftar sebagai Reseller.', {
            parse_mode: 'Markdown'
        });
    }

    // 4. [DIMODIFIKASI] Format daftar (sesuai contoh Anda)
    const list = resellers.map((id, index) => `${index + 1}. \`${id}\``).join('\n');
    
    await ctx.reply(`📋 *Daftar Reseller Users:*\n\n${list}`, {
        parse_mode: 'Markdown'
    });
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Menghapus Reseller Manual (Owner Utama Saja)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("delreseller", async (ctx) => {
    // 1. [DIMODIFIKASI] Pengecekan HANYA untuk OWNER_ID
    const senderId = String(ctx.from.id);
    const mainOwnerId = String(OWNER_ID); 

    if (senderId !== mainOwnerId) {
        return ctx.reply("⛔ Perintah ini hanya untuk *Owner Utama*.", {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Hubungi Admin', url: urladmin }]
                ]
            }
        });
    }

    // 2. [DIMODIFIKASI] Ambil argumen ID
    const text = ctx.message.text.split(" ").slice(1);
    const targetId = text[0];

    if (!targetId || !/^\d+$/.test(targetId)) { // Cek jika formatnya angka
        return ctx.reply(
            "Format salah. Mohon masukkan ID Telegram target.\n" +
            "Contoh: `/delreseller 123456789`",
            { parse_mode: "Markdown" }
        );
    }

    const targetIdNum = Number(targetId);
    
    // 3. [DIMODIFIKASI] Cek dan hapus dari resellers.json
    const resellers = readResellers();

    if (!resellers.includes(targetIdNum)) {
        return ctx.reply(`⚠️ User \`${targetIdNum}\` tidak ditemukan dalam database Reseller.`, { 
            parse_mode: "Markdown" 
        });
    }

    // Buat array baru tanpa ID target
    const updatedResellers = resellers.filter(id => id !== targetIdNum);
    // Simpan array baru
    saveResellers(updatedResellers);

    await ctx.reply(`✅ User \`${targetIdNum}\` berhasil dihapus dari database Reseller.`, { 
        parse_mode: "Markdown" 
    });

    // 4. [BONUS] Kirim notifikasi ke reseller yang baru dihapus
    try {
        await bot.telegram.sendMessage(targetIdNum,
            "ℹ️ *Info:* Akun Anda telah diturunkan dari status *Reseller* oleh Owner.\n\n" +
            "Anda tidak dapat lagi menggunakan perintah /createpanel",
            { parse_mode: "Markdown" }
        );
    } catch (e) {
        console.error("Gagal kirim notif ke reseller (demote):", e.message);
        await ctx.reply("*(Info: Gagal mengirim notifikasi ke user tersebut.)*");
    }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Buat Admin Panel Manual (Owner Utama Saja)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("createadmin", async (ctx) => {
    // 1. Pengecekan HANYA untuk Owner Utama
    if (!isMainOwner(ctx.from.id)) {
        return ctx.reply("⛔ Perintah ini hanya untuk *Owner Utama*.", {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Hubungi Admin', url: urladmin }]
                ]
            }
        });
    }

    // 2. Ambil username dari argumen
    const text = ctx.message.text.split(" ").slice(1);
    const username = text[0];
  
    // 3. Validasi username
    if (!username) {
        return ctx.reply(
            "Format salah.\n" +
            "Gunakan: `/createadmin <username>`\n" +
            "Contoh: `/createadmin adminbaru`",
            { parse_mode: "Markdown" }
        );
    }

    await ctx.reply(`⏳ Membuat Admin Panel untuk \`${username}\`...`, { parse_mode: "Markdown" });

    // 4. Ini adalah LOGIKA CREATE ADMIN dari /buyadmin (Step 9)
    //    yang diekstrak dan disesuaikan
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    const password = username + randomSuffix; // Password acak
    const targetTelegramId = ctx.from.id; // Kirim detailnya kembali ke Owner Utama
    const ownerUsername = ctx.from.username || "tanpa_username";
    let newAdminData;

    try {
        const response = await fetch(`${domain}/api/application/users`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${plta}`,
            },
            body: JSON.stringify({
                email: `${username}@admin.Xhin`,
                username: username,
                first_name: username,
                last_name: "Memb",
                language: "en",
                root_admin: true, // Ini yang menjadikannya Admin
                password: password,
            }),
        });
        newAdminData = await response.json();

        // 5. Handle jika GAGAL
        if (newAdminData.errors) {
            console.error("Gagal buat admin Pterodactyl (manual):", newAdminData.errors);
            return ctx.reply(
                "⚠️ Gagal membuat admin panel.\n" +
                `Error: \`${JSON.stringify(newAdminData.errors[0].detail)}\``,
                { parse_mode: "Markdown" }
            );
        }

        const user = newAdminData.attributes;

        // 6. Handle jika SUKSES (Kirim detail ke Owner Utama)
        await bot.telegram.sendMessage(
            targetTelegramId, // Kirim ke Owner Utama
            `
ADMIN PANEL DIBUAT (MANUAL) ✅

· · ─────  INFO ADMIN ───── · ·

   🌐  Login    : ${domain}
   👤  Username : ${user.username}
   🔑  Password : ${password}

· · ───── 📜 RULES 📜 ───── · ·

   •  Jangan Curi Sc
   •  Jangan Buka Panel Orang
   •  Jangan Ddos Server
   •  Kalo jualan sensor domainnya
   •  Jangan Bagi² Panel Free !!
   •  Jangan bagi bagi panel free !! ngelanggar? maklu matyy

· · ───── THANKS ───── · ·
          `
        );
          
        // 7. Kirim Log ke grup log
        await bot.telegram.sendMessage(-1001864324191, // ID grup log Anda
`ADMIN MANUAL DIBUAT ✅

𝗧𝗮𝗻𝗴𝗴𝗮𝗹 : ${formatDate()}
------------------------------------------
👤Owner @${ownerUsername} (ID: ${targetTelegramId})
Telah membuat Admin Panel baru secara manual:

• 𝗣𝗿𝗼𝗱𝘂𝗸 : Admin Panel
• 𝗨𝘀𝗲𝗿𝗻𝗮m𝗲 : ${user.username}`);

    } catch (error) {
        console.error(error);
        await ctx.reply(
            "⚠️ Terjadi kesalahan dalam pembuatan admin. Silakan cek console.",
            { parse_mode: "Markdown" }
        );
    }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Perintah Owner: Tambah/Set Kuota Premium User
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("addprem", async (ctx) => {
    // Hanya Owner Utama
    if (!isMainOwner(ctx.from.id)) {
        return ctx.reply("⛔ Perintah ini hanya untuk *Owner Utama*.", { parse_mode: "Markdown" });
    }

    const text = ctx.message.text.split(" ").slice(1);
    const targetId = text[0];
    const amountStr = text[1];

    if (!targetId || !amountStr || !/^\d+$/.test(targetId) || !/^\d+$/.test(amountStr)) {
        return ctx.reply(
            "Format salah.\n" +
            "Gunakan: `/addprem <id_telegram> <jumlah_kuota>`\n" +
            "Contoh: `/addprem 123456789 10`\n\n" +
            "Ini akan menambah user premium baru atau mengganti kuota yang sudah ada.",
            { parse_mode: "Markdown" }
        );
    }

    const targetIdStr = String(targetId);
    const amount = Number(amountStr);
    
    const premUsers = readPremUsers();
    
    // Set kuota
    premUsers[targetIdStr] = amount;
    savePremUsers(premUsers);

    await ctx.reply(
        `✅ Premium User berhasil diatur.\n` +
        `User ID: \`${targetIdStr}\`\n` +
        `Kouta Baru: *${amount}*`,
        { parse_mode: "Markdown" }
    );
    
    // Notifikasi user
    try {
        await bot.telegram.sendMessage(targetId,
            `🎉 *Selamat!* 🎉\n` +
            `Anda telah ditambahkan sebagai *Premium User* oleh Owner.\n\n` +
            `Anda mendapatkan *${amount} kuota* untuk menggunakan perintah /create.`,
            { parse_mode: "Markdown" }
        );
    } catch (e) {
        await ctx.reply(`(Gagal mengirim notifikasi ke user ${targetIdStr})`);
    }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Perintah Owner: Hapus Premium User
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("delprem", async (ctx) => {
    // Hanya Owner Utama
    if (!isMainOwner(ctx.from.id)) {
        return ctx.reply("⛔ Perintah ini hanya untuk *Owner Utama*.", { parse_mode: "Markdown" });
    }

    const text = ctx.message.text.split(" ").slice(1);
    const targetId = text[0];

    if (!targetId || !/^\d+$/.test(targetId)) {
        return ctx.reply("Format salah. Contoh: `/delprem 123456789`", { parse_mode: "Markdown" });
    }

    const targetIdStr = String(targetId);
    const premUsers = readPremUsers();

    if (!premUsers.hasOwnProperty(targetIdStr)) {
        return ctx.reply(`⚠️ User \`${targetIdStr}\` tidak ditemukan dalam database Premium.`, { parse_mode: "Markdown" });
    }

    // Hapus user dari objek
    delete premUsers[targetIdStr];
    savePremUsers(premUsers);

    await ctx.reply(`✅ User \`${targetIdStr}\` berhasil dihapus dari database Premium.`, { parse_mode: "Markdown" });
    
    try {
        await bot.telegram.sendMessage(targetId,
            "ℹ️ *Info:* Status *Premium User* Anda telah dihapus oleh Owner.",
            { parse_mode: "Markdown" }
        );
    } catch (e) {}
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [DIMODIFIKASI] Perintah Owner: Tambah Produk Generik (dengan File Path)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
bot.command("addproduk", async (ctx) => {
    if (!isMainOwner(ctx.from.id)) {
        return ctx.reply("⛔ Perintah ini hanya untuk *Owner Utama*.", { parse_mode: "Markdown" });
    }

    const text = ctx.message.text;
    // Format Baru: /addproduk <id_unik> <harga> <nama...> [nama_file.zip]
    // Regex untuk memisahkan nama file di akhir (jika ada)
    const match = text.match(/^\/addproduk\s+(\S+)\s+(\d+)\s+(.+?)(?:\s+\[(.+\..+)\])?$/);

    if (!match) {
        return ctx.reply(
            "Format salah.\n\n" +
            "Gunakan:\n" +
            "`/addproduk <id> <harga> <nama produk>`\n" +
            "*Atau (jika ada file):*\n" +
            "`/addproduk <id> <harga> <nama produk> [nama_file.zip]`\n\n" +
            "*Contoh:*\n" +
            "`/addproduk vpn1 15000 VPN SGDO 1 Bulan`\n" +
            "`/addproduk scriptxyz 50000 Script Install V2 [script_v2.zip]`\n\n" +
            "*PENTING:* Nama file harus di dalam kurung siku `[]` dan diletakkan di akhir.",
            { parse_mode: "Markdown" }
        );
    }

    const [, productId, priceStr, productName, filePath] = match; // filePath bisa undefined
    const price = Number(priceStr);

    if (/[^a-zA-Z0-9_-]/.test(productId)) {
         return ctx.reply("❌ ID Unik hanya boleh berisi huruf, angka, underscore (_), atau hyphen (-).", { parse_mode: "Markdown" });
    }

    // [BARU] Validasi nama file (jika ada)
    let fullFilePath = null;
    if (filePath) {
        // Cek karakter ilegal sederhana di nama file
        if (/[\\/:*?"<>|]/.test(filePath)) {
             return ctx.reply("❌ Nama file mengandung karakter ilegal.", { parse_mode: "Markdown" });
        }
        // Cek apakah file benar-benar ada di folder src/products_files/
        fullFilePath = path.join(__dirname, "src", "products_files", filePath);
        if (!fs.existsSync(fullFilePath)) {
             return ctx.reply(
                `❌ File \`${filePath}\` tidak ditemukan di folder \`src/products_files/\`.\n` +
                `Pastikan Anda sudah mengupload file dan nama filenya sama persis (termasuk besar/kecil huruf).`,
                { parse_mode: "Markdown" }
            );
        }
    }


    const products = readGenericProducts();
    if (products.some(p => p.id === productId)) {
        return ctx.reply(`❌ ID Produk \`${productId}\` sudah digunakan.`, { parse_mode: "Markdown" });
    }

    // Tambah produk baru
    const newProduct = {
        id: productId,
        name: productName.trim(), // Hapus spasi ekstra di nama
        price: price,
        description: "",
        filePath: filePath || null // Simpan nama file atau null jika tidak ada
    };
    products.push(newProduct);
    saveGenericProducts(products);

    let replyMsg = `✅ Produk berhasil ditambahkan:\n\n` +
                   `ID: \`${productId}\`\n` +
                   `Nama: ${newProduct.name}\n` +
                   `Harga: Rp${price.toLocaleString()}`;
    if (filePath) {
        replyMsg += `\nFile: \`${filePath}\``;
    }

    await ctx.reply(replyMsg, { parse_mode: "Markdown" });
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Perintah Owner: Set Deskripsi Produk Generik
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
bot.command("setdesc", async (ctx) => {
    if (!isMainOwner(ctx.from.id)) {
        return ctx.reply("⛔ Perintah ini hanya untuk *Owner Utama*.", { parse_mode: "Markdown" });
    }

    // Format: /setdesc <id_produk> <teks deskripsi...>
    const text = ctx.message.text;
    const match = text.match(/^\/setdesc\s+(\S+)\s+(.+)$/s); // 's' flag agar '.' bisa mencakup baris baru

    if (!match) {
        return ctx.reply(
            "Format salah.\n" +
            "Gunakan: `/setdesc <id_produk> <deskripsi...>`\n\n" +
            "Contoh: `/setdesc vpn1 Ini adalah deskripsi produk VPN.`",
            { parse_mode: "Markdown" }
        );
    }

    const [, productId, description] = match;

    const products = readGenericProducts();
    const productIndex = products.findIndex(p => p.id === productId);

    if (productIndex === -1) {
        return ctx.reply(`⚠️ Produk dengan ID \`${productId}\` tidak ditemukan.`, { parse_mode: "Markdown" });
    }

    // Update deskripsi
    products[productIndex].description = description;
    saveGenericProducts(products);

    await ctx.reply(
        `✅ Deskripsi produk berhasil diubah:\n\n` +
        `ID: \`${productId}\`\n` +
        `Nama: ${products[productIndex].name}\n` +
        `Deskripsi Baru: ${description}`,
        { parse_mode: "Markdown" }
    );
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Perintah Owner: Hapus Produk Generik
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
bot.command("delproduct", async (ctx) => {
    if (!isMainOwner(ctx.from.id)) {
        return ctx.reply("⛔ Perintah ini hanya untuk *Owner Utama*.", { parse_mode: "Markdown" });
    }

    const args = ctx.message.text.split(" ").slice(1);
    const productId = args[0];

    if (!productId) {
        return ctx.reply("Format salah. Gunakan: `/delproduct <id_produk>`", { parse_mode: "Markdown" });
    }

    let products = readGenericProducts();
    const initialLength = products.length;

    // Filter produk, hapus yang ID-nya cocok
    products = products.filter(p => p.id !== productId);

    if (products.length === initialLength) {
        return ctx.reply(`⚠️ Produk dengan ID \`${productId}\` tidak ditemukan.`, { parse_mode: "Markdown" });
    }

    saveGenericProducts(products);
    await ctx.reply(`✅ Produk dengan ID \`${productId}\` berhasil dihapus.`, { parse_mode: "Markdown" });
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Perintah Owner: Set Harga Produk Generik
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
bot.command("setprice", async (ctx) => {
    if (!isMainOwner(ctx.from.id)) {
        return ctx.reply("⛔ Perintah ini hanya untuk *Owner Utama*.", { parse_mode: "Markdown" });
    }

    const args = ctx.message.text.split(" ").slice(1);
    const productId = args[0];
    const newPriceStr = args[1];

    if (!productId || !newPriceStr || !/^\d+$/.test(newPriceStr)) {
        return ctx.reply(
            "Format salah.\n" +
            "Gunakan: `/setprice <id_produk> <harga_baru>`\n" +
            "Contoh: `/setprice vpn1 20000`",
            { parse_mode: "Markdown" }
        );
    }
    const newPrice = Number(newPriceStr);

    const products = readGenericProducts();
    const productIndex = products.findIndex(p => p.id === productId);

    if (productIndex === -1) {
        return ctx.reply(`⚠️ Produk dengan ID \`${productId}\` tidak ditemukan.`, { parse_mode: "Markdown" });
    }

    // Update harga
    products[productIndex].price = newPrice;
    saveGenericProducts(products);

    await ctx.reply(
        `✅ Harga produk berhasil diubah:\n\n` +
        `ID: \`${productId}\`\n` +
        `Nama: ${products[productIndex].name}\n` +
        `Harga Baru: Rp${newPrice.toLocaleString()}`,
        { parse_mode: "Markdown" }
    );
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [DIMODIFIKASI] Perintah Owner: List Produk Generik (dengan File Path)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
bot.command("listproducts", async (ctx) => {
    if (!isMainOwner(ctx.from.id)) {
        return ctx.reply("⛔ Perintah ini hanya untuk *Owner Utama*.", { parse_mode: "Markdown" });
    }

    const products = readGenericProducts();

    if (products.length === 0) {
        return ctx.reply('📭 Belum ada produk generik yang ditambahkan.', { parse_mode: 'Markdown' });
    }

    const list = products.map((p, index) => {
        let entry = `${index + 1}. \`${p.id}\`\n` +
                    `   Nama: ${p.name}\n` +
                    `   Harga: Rp${p.price.toLocaleString()}`;
        // [BARU] Tampilkan nama file jika ada
        if (p.filePath) {
            entry += `\n   File: \`${p.filePath}\``;
        }
        return entry;
    }).join('\n\n');
    
    await ctx.reply(`📋 *Daftar Produk Generik:*\n\n${list}`, {
        parse_mode: 'Markdown'
    });
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [DIMODIFIKASI V4] Menampilkan KATEGORI UTAMA (2 Kolom)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
async function showGenericProducts(ctx, isEdit = false) {
  const mainCategories = readGenericProducts(); // Membaca struktur [ Kategori Utama ]
  
  if (!mainCategories || !mainCategories.length) {
    const text = "⚠️ Maaf, belum ada produk yang tersedia saat ini.";
    try {
        if (isEdit) { await ctx.editMessageText(text); } else { await ctx.reply(text); }
    } catch (e) { /* biarkan */ }
    return;
  }
  
  // Buat tombol untuk setiap Kategori Utama
  const buttons = mainCategories.map(cat => {
      // Callback: VIEWMAINCAT | id_kategori_utama
      return Markup.button.callback(`📁 ${cat.name}`, `VIEWMAINCAT|${cat.id}`);
  });
  
  // Gunakan helper 2-kolom
  const buttonRows = createButtonRows(buttons, 2); 

  const text = `🛒 *KATEGORI PRODUK*\n\nSilakan pilih kategori utama:`;
  const extra = {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard(buttonRows)
  };

  try {
    if (isEdit) {
      await ctx.editMessageText(text, extra);
    } else {
      await ctx.reply(text, extra);
    }
  } catch (e) {
    console.error("Gagal edit/reply showGenericProducts:", e.message);
    if (isEdit) await ctx.reply(text, extra);
  }
}

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [DIMODIFIKASI] Perintah Owner: Backup Database (5 Files)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("backupdb", async (ctx) => {
    // 1. Hanya Owner Utama
    if (!isMainOwner(ctx.from.id)) {
        return ctx.reply("⛔ Perintah ini hanya untuk *Owner Utama*.", { parse_mode: "Markdown" });
    }

    // [DIUBAH] Sebutkan semua file termasuk orders.json
    await ctx.reply("⏳ Membuat backup database `users.json`, `premusers.json`, `resellers.json`, `claimed_users.json`, dan `orders.json`...", { parse_mode: 'Markdown' });

    try {
        // 2. Buat Timestamp
        const now = new Date();
        const timestamp = now.getFullYear().toString() +
                          (now.getMonth() + 1).toString().padStart(2, '0') +
                          now.getDate().toString().padStart(2, '0') + '_' +
                          now.getHours().toString().padStart(2, '0') +
                          now.getMinutes().toString().padStart(2, '0') +
                          now.getSeconds().toString().padStart(2, '0');

        // Nama-nama file backup
        const usersBackupFilename = `users_backup_${timestamp}.json`;
        const premBackupFilename = `premusers_backup_${timestamp}.json`;
        const resellerBackupFilename = `resellers_backup_${timestamp}.json`;
        const claimedBackupFilename = `claimed_users_backup_${timestamp}.json`;
        const ordersBackupFilename = `orders_backup_${timestamp}.json`; // [BARU]

        let successFiles = [];
        let failedFiles = [];

        // ---------------------------------------------------------
        // A. File di folder src/database/
        // ---------------------------------------------------------

        // 1. Backup users.json
        try {
            ensureUserFile(); 
            const userContent = fs.readFileSync(userFile);
            await ctx.replyWithDocument({ source: userContent, filename: usersBackupFilename });
            successFiles.push(usersBackupFilename);
        } catch (fileError) {
            console.error("Gagal backup users.json:", fileError);
            failedFiles.push("users.json");
        }

        // 2. Backup premusers.json
        try {
            ensurePremFile();
            const premContent = fs.readFileSync(premUsersFile);
            await ctx.replyWithDocument({ source: premContent, filename: premBackupFilename });
            successFiles.push(premBackupFilename);
        } catch (fileError) {
            console.error("Gagal backup premusers.json:", fileError);
            failedFiles.push("premusers.json");
        }

        // 3. Backup resellers.json
        try {
            ensureResellerFile();
            const resellerContent = fs.readFileSync(resellersFile);
            await ctx.replyWithDocument({ source: resellerContent, filename: resellerBackupFilename });
            successFiles.push(resellerBackupFilename);
        } catch (fileError) {
            console.error("Gagal backup resellers.json:", fileError);
            failedFiles.push("resellers.json");
        }

        // 4. Backup claimed_users.json
        try {
            ensureClaimedFile();
            const claimedContent = fs.readFileSync(claimedUsersFile);
            await ctx.replyWithDocument({ source: claimedContent, filename: claimedBackupFilename });
            successFiles.push(claimedBackupFilename);
        } catch (fileError) {
            console.error("Gagal backup claimed_users.json:", fileError);
            failedFiles.push("claimed_users.json");
        }

        // ---------------------------------------------------------
        // B. File di folder src/ (orders.json)
        // ---------------------------------------------------------

        // 5. Backup orders.json [BARU]
        try {
            // ORDERS_FILE sudah didefinisikan di atas script (path.join(__dirname, "src", "orders.json"))
            if (fs.existsSync(ORDERS_FILE)) {
                const ordersContent = fs.readFileSync(ORDERS_FILE);
                await ctx.replyWithDocument({ source: ordersContent, filename: ordersBackupFilename });
                successFiles.push(ordersBackupFilename);
            } else {
                failedFiles.push("orders.json (File Tidak Ditemukan)");
                await ctx.reply("⚠️ File `orders.json` tidak ditemukan di folder src.", { parse_mode: 'Markdown' });
            }
        } catch (fileError) {
            console.error("Gagal backup orders.json:", fileError);
            failedFiles.push("orders.json");
            await ctx.reply(`❌ Gagal backup \`orders.json\`. Error: ${fileError.message}`, { parse_mode: 'Markdown' });
        }

        // 6. Kirim ringkasan
        let summary = `✅ Proses Backup Selesai.\n\n`;
        if (successFiles.length > 0) {
            summary += `📂 *Berhasil Dikirim:*\n- ${successFiles.join('\n- ')}\n\n`;
        }
        if (failedFiles.length > 0) {
            summary += `❌ *Gagal Dibackup:*\n- ${failedFiles.join('\n- ')}`;
        }
        
        await ctx.reply(summary, { parse_mode: "Markdown" });

    } catch (mainError) {
        console.error("[backupdb] Error utama:", mainError);
        await ctx.reply("❌ Terjadi kesalahan tak terduga saat proses backup.");
    }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Perintah Owner: List User yang Sudah Klaim Kuota Gratis
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("listclaim", async (ctx) => {
    // 1. Hanya Owner Utama
    if (!isMainOwner(ctx.from.id)) {
        return ctx.reply("⛔ Perintah ini hanya untuk *Owner Utama*.", { parse_mode: "Markdown" });
    }

    // 2. Baca daftar ID dari claimed_users.json
    const claimedUserIds = readClaimedUsers(); // Fungsi ini mengembalikan array [123, 456]

    if (claimedUserIds.length === 0) {
        return ctx.reply('📭 Belum ada pengguna yang mengklaim kuota gratis.', { parse_mode: 'Markdown' });
    }

    await ctx.reply("⏳ Mengambil data username pengguna yang sudah klaim, mohon tunggu...");

    // 3. Ambil detail username (mirip /listprem)
    const userDetailPromises = claimedUserIds.map(async (id) => {
        let usernameInfo = `ID: \`${id}\``; // Default
        try {
            const chatInfo = await bot.telegram.getChat(id);
            if (chatInfo && chatInfo.username) {
                usernameInfo = `@${chatInfo.username} (\`${id}\`)`;
            } else if (chatInfo && chatInfo.first_name) {
                usernameInfo = `${chatInfo.first_name} (\`${id}\`)`;
            }
        } catch (e) {
            console.error(`[listclaim] Gagal getChat untuk ID ${id}:`, e.message);
             if (e.description && e.description.includes('chat not found')) {
                 usernameInfo = `User Tidak Aktif (\`${id}\`)`;
             } else {
                 usernameInfo = `Error Ambil Info (\`${id}\`)`;
             }
        }
        return usernameInfo; // Kembalikan string info user
    });

    // 4. Tunggu semua proses ambil info selesai
    const usersDetails = await Promise.all(userDetailPromises);

    // 5. Format daftar
    const list = usersDetails.map((userInfo, index) => {
        return `${index + 1}. ${userInfo}`; // Format: 1. @username (12345)
    }).join('\n');

    // 6. Kirim hasil
    try {
        // Coba edit pesan loading
        await ctx.telegram.editMessageText(ctx.chat.id, ctx.message.message_id + 1, null,
         `📋 *Daftar Pengguna yang Sudah Klaim Kuota Gratis:*\n\n${list}`, { parse_mode: 'Markdown' });
    } catch (editError) {
        // Jika gagal edit, kirim pesan baru
        await ctx.reply(`📋 *Daftar Pengguna yang Sudah Klaim Kuota Gratis:*\n\n${list}`, { parse_mode: 'Markdown' });
    }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Perintah Owner: Cek Status Klaim Harian
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("claimstatus", async (ctx) => {
    // 1. Hanya Owner Utama
    if (!isMainOwner(ctx.from.id)) {
        return ctx.reply("⛔ Perintah ini hanya untuk *Owner Utama*.", { parse_mode: "Markdown" });
    }

    // 2. Baca data klaim harian (sudah handle reset tanggal)
    const dailyData = readDailyClaims();
    const claimedIDsToday = dailyData.claimedToday;
    const claimedCountToday = claimedIDsToday.length;
    const dailyLimit = DAILY_CLAIM_LIMIT; // Ambil dari konstanta

    let messageText = `📊 *Status Klaim Harian (${dailyData.date})*\n\n` +
                      `Limit Tercapai: *${claimedCountToday} / ${dailyLimit}* klaim.\n\n`;

    // 3. Jika ada yang klaim hari ini, ambil username mereka
    if (claimedCountToday > 0) {
        messageText += "⏳ Mengambil detail username...";
        const loadingMessage = await ctx.reply(messageText, { parse_mode: 'Markdown' });

        const userDetailPromises = claimedIDsToday.map(async (id) => {
            let usernameInfo = `ID: \`${id}\``; // Default
            try {
                const chatInfo = await bot.telegram.getChat(id);
                if (chatInfo && chatInfo.username) {
                    usernameInfo = `@${chatInfo.username} (\`${id}\`)`;
                } else if (chatInfo && chatInfo.first_name) {
                    usernameInfo = `${chatInfo.first_name} (\`${id}\`)`;
                }
            } catch (e) {
                console.error(`[claimstatus] Gagal getChat untuk ID ${id}:`, e.message);
                 if (e.description && e.description.includes('chat not found')) {
                     usernameInfo = `User Tidak Aktif (\`${id}\`)`;
                 } else {
                     usernameInfo = `Error Ambil Info (\`${id}\`)`;
                 }
            }
            return usernameInfo;
        });

        const usersDetails = await Promise.all(userDetailPromises);

        // Format daftar user yang klaim hari ini
        const list = usersDetails.map((userInfo, index) => {
            return `${index + 1}. ${userInfo}`;
        }).join('\n');

        // Update pesan loading
        messageText = `📊 *Status Klaim Harian (${dailyData.date})*\n\n` +
                      `Limit Tercapai: *${claimedCountToday} / ${dailyLimit}* klaim.\n\n` +
                      `👤 *Pengguna yang Klaim Hari Ini:*\n${list}`;

        try {
            await ctx.telegram.editMessageText(ctx.chat.id, loadingMessage.message_id, null, messageText, { parse_mode: 'Markdown' });
        } catch (editError) {
             console.error("[claimstatus] Gagal edit pesan:", editError);
             // Jika edit gagal, kirim pesan baru (jarang terjadi)
             await ctx.reply(messageText, { parse_mode: 'Markdown' });
        }

    } else {
        // Jika belum ada yang klaim hari ini
        messageText += "👤 Belum ada pengguna yang mengklaim hari ini.";
        await ctx.reply(messageText, { parse_mode: 'Markdown' });
    }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Perintah Ping (Info Server & Bot)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("ping", async (ctx) => {
    const startTime = performance.now(); // Catat waktu mulai

    try {
        const totalMem = formatBytes(os.totalmem());
        const freeMem = formatBytes(os.freemem());
        const cpuCount = os.cpus() ? os.cpus().length : 'N/A'; // Handle jika cpus() gagal
        const platform = os.type();
        const vpsUptime = formatUptime(os.uptime()); // Gunakan formatUptime
        const botUptime = formatUptime(process.uptime()); // Gunakan formatUptime

        // Ambil CPU Usage (menggunakan Promise)
        const cpuUsage = await getCPUUsagePromise();

        let response = `*🔴 SERVER INFORMATION*\n` +
                       `• Platform : ${platform}\n` +
                       `• Total RAM : ${totalMem}\n` +
                       `• Free RAM : ${freeMem}\n` +
                       `• Total CPU : ${cpuCount} Core\n` +
                       `• CPU Usage : ${cpuUsage}\n` +
                       `• VPS Uptime : ${vpsUptime}\n\n` +
                       `*🔵 BOT INFORMATION*\n` +
                       `• Response Speed : Calculating...\n` +
                       `• Bot Uptime : ${botUptime}`;

        // Kirim pesan awal
        const sentMessage = await ctx.reply(response, { parse_mode: 'Markdown' });

        // Hitung latency
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);

        // Update pesan dengan latency
        const updatedResponse = response.replace('Calculating...', `${latency} ms`);

        // Edit pesan menggunakan ctx.telegram.editMessageText
        // Tambahkan try-catch untuk handle jika edit gagal (misal pesan dihapus user)
        try {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                sentMessage.message_id,
                null, // inline_message_id (tidak dipakai)
                updatedResponse,
                { parse_mode: 'Markdown' }
            );
        } catch (editError) {
             console.error("[Ping] Gagal mengedit pesan:", editError.message);
             // Jika edit gagal, kirim pesan baru sebagai fallback (opsional)
             // await ctx.reply(`Pong! ${latency} ms`);
        }

    } catch (error) {
        console.error("[Ping] Error:", error);
        await ctx.reply("❌ Terjadi kesalahan saat mengambil info ping.");
    }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [DIMODIFIKASI] Perintah Owner: List Premium User (dengan Username)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("listprem", async (ctx) => {
    if (!isMainOwner(ctx.from.id)) { // Hanya Owner Utama
        return ctx.reply("⛔ Perintah ini hanya untuk *Owner Utama*.", { parse_mode: "Markdown" });
    }

    const premUsers = readPremUsers();
    const premUserIds = Object.keys(premUsers);

    if (premUserIds.length === 0) {
        return ctx.reply('📭 Tidak ada user yang terdaftar sebagai Premium.', { parse_mode: 'Markdown' });
    }

    await ctx.reply("⏳ Mengambil data username, mohon tunggu..."); // Tambah pesan loading

    // [BARU] Buat array promise untuk mengambil info chat semua user
    const userDetailPromises = premUserIds.map(async (id) => {
        let usernameInfo = `ID: \`${id}\``; // Default jika gagal ambil info
        try {
            const chatInfo = await bot.telegram.getChat(id);
            if (chatInfo && chatInfo.username) {
                usernameInfo = `@${chatInfo.username} (\`${id}\`)`; // Ada username
            } else if (chatInfo && chatInfo.first_name) {
                usernameInfo = `${chatInfo.first_name} (\`${id}\`)`; // Tidak ada username, pakai nama depan
            }
        } catch (e) {
            console.error(`Gagal getChat untuk ID ${id}:`, e.message);
             if (e.description && e.description.includes('chat not found')) {
                 usernameInfo = `User Tidak Aktif (\`${id}\`)`;
             } else {
                 usernameInfo = `Error Ambil Info (\`${id}\`)`;
             }
        }
        const quota = premUsers[id];
        return { usernameInfo, quota }; // Kembalikan objek dengan info
    });

    // [BARU] Tunggu semua promise (pengambilan info) selesai
    const usersDetails = await Promise.all(userDetailPromises);

    // [DIMODIFIKASI] Buat daftar string dari hasil yang sudah ada username-nya
    const list = usersDetails.map((detail, index) => {
        return `${index + 1}. ${detail.usernameInfo} - Kuota: *${detail.quota}*`;
    }).join('\n');
    
    // Edit pesan loading menjadi daftar
    // (Jika gagal edit, kirim pesan baru - ini handle jika proses terlalu lama)
    try {
        await ctx.telegram.editMessageText(ctx.chat.id, ctx.message.message_id + 1, null, // +1 untuk ID pesan loading
         `📋 *Daftar Premium Users:*\n\n${list}`, { parse_mode: 'Markdown' });
    } catch (editError) {
        await ctx.reply(`📋 *Daftar Premium Users:*\n\n${list}`, { parse_mode: 'Markdown' });
    }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Perintah Premium: Cek Kuota
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("mypremquota", async (ctx) => {
    const userId = ctx.from.id;
    
    if (!isPremiumUser(userId)) {
        return ctx.reply("Perintah ini hanya untuk *Premium User*.", { parse_mode: "Markdown" });
    }

    const quota = getPremQuota(userId);
    await ctx.reply(`Sisa kuota /create Anda: *${quota}*`, { parse_mode: "Markdown" });
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Perintah Premium: Create Panel (/create)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("create", async (ctx) => {
  const userId = ctx.from.id;

  // Cek jika dia Premium User
  if (!isPremiumUser(userId)) {
    return ctx.reply("⚠️ Perintah ini hanya untuk *Premium User*.", { parse_mode: "Markdown" });
  }

  // Pengecekan Kuota
  const quota = getPremQuota(userId);
  if (quota <= 0) {
      return ctx.reply(
          `⚠️ Kuota /create Anda habis (Sisa: 0).\n` +
          `Silakan hubungi Owner Utama untuk menambah kuota.`,
          { parse_mode: "Markdown" }
      );
  }
  const quotaMsg = quota; // Tidak perlu cek unlimited

  const text = ctx.message.text.split(" ").slice(1);
  const username = text[0];
  if (!username) {
    return ctx.reply(
        `Format: /create <username>\n`+
        `Contoh: /create picung\n\n`+ // <-- BARIS CONTOH DITAMBAHKAN
        `Sisa kuota Anda: *${quotaMsg}*`, 
        { parse_mode: "Markdown" }
    );
  }

  if (await isUsernameTaken(username)) {
    return ctx.reply(`⚠️ Username "${username}" sudah dipakai. Silakan pilih username lain.`);
  }

  const products = readProducts();
  if (!products.length) return ctx.reply("Belum ada produk di products.json.");

  const rows = [];
  for (let i = 0; i < products.length; i += 2) {
    const left = products[i];
    const right = products[i + 1];
    const row = [];
    // [BARU] Gunakan callback 'CREATE_SELECT'
    row.push(Markup.button.callback(
      `${left.name}`, 
      `CREATE_SELECT|${left.id}|${username}`
    ));
    if (right) {
      row.push(Markup.button.callback(
        `${right.name}`,
        `CREATE_SELECT|${right.id}|${username}`
      ));
    }
    rows.push(row);
  }

  await ctx.reply(
    `Membuat panel untuk username: *${username}*\n` +
    `Sisa kuota Anda: *${quotaMsg}*\n\n` +
    `Silakan pilih paket spesifikasi:`, 
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(rows)
    }
  );
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [FIX FINAL] List Server - Cepat & Anti Error Pesan Panjang
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("listsrv", async (ctx) => {
    const userId = ctx.from.id;

    // 1. Pengecekan Otorisasi
    if (!isOwner(userId)) {
        return ctx.reply("⚠️ Hanya Owner/Reseller yang bisa mengakses perintah ini.", {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'HUBUNGI ADMIN', url: urladmin }] 
                ]
            }
        });
    }

    try {
        await ctx.reply("⏳ Sedang memuat data server (Parallel Fetching)...");

        // 2. Ambil List Server dari Panel (Naikkan limit per_page agar termuat semua)
        let serverRes = await fetch(`${domain}/api/application/servers?per_page=200`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${plta}`
            }
        });
        
        let serverData = await serverRes.json();
        let servers = serverData.data;

        if (!servers || servers.length === 0) {
            return ctx.reply("✅ Tidak ada server yang ditemukan di panel.");
        }

        // 3. PROSES PARALEL (Mengambil status semua server sekaligus agar cepat)
        const statusPromises = servers.map(async (server) => {
            const s = server.attributes;
            let statusIcon = "❓"; // Default jika gagal cek

            try {
                // Cek resources (Client API)
                const utilRes = await fetch(`${domain}/api/client/servers/${s.identifier}/resources`, {
                    headers: { 
                        'Authorization': `Bearer ${pltc}`,
                        'Accept': 'application/json' 
                    }
                });

                if (utilRes.ok) {
                    const utilData = await utilRes.json();
                    const state = utilData.attributes.current_state;
                    if (state === "running" || state === "starting") {
                         statusIcon = "🟢"; // Aktif
                    } else {
                         statusIcon = "🔴"; // Mati
                    }
                } else if (s.suspended) {
                    statusIcon = "🔒"; // Suspend
                } else if (!s.status) {
                    statusIcon = "🌀"; // Installing
                }

            } catch (err) {
                // Jangan log error per item agar console tidak penuh
                statusIcon = "⚠️"; 
            }

            // Kembalikan format teks per baris
            return `🆔 \`${s.id}\` | ${statusIcon} | ${s.name}`;
        });

        // Tunggu semua proses pengecekan selesai
        const results = await Promise.all(statusPromises);

        // 4. KIRIM PESAN (Dipecah agar tidak error "Message too long")
        let messageBuffer = `📋 **DAFTAR SERVER (${results.length})**\n\n`;
        
        for (const line of results) {
            // Jika pesan sudah mau penuh (batas aman Telegram ~3500 karakter), kirim dulu
            if (messageBuffer.length + line.length > 3500) {
                await ctx.reply(messageBuffer, { parse_mode: "Markdown" });
                messageBuffer = ""; // Reset buffer
            }
            messageBuffer += line + "\n";
        }

        // Kirim sisa pesan
        if (messageBuffer) {
            await ctx.reply(messageBuffer, { parse_mode: "Markdown" });
        }

    } catch (error) {
        console.error(error);
        ctx.reply('❌ Terjadi kesalahan sistem. Cek console log.');
    }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Auto Delete Server Offline (> 5 Menit)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("autodelsrv", async (ctx) => {
    const userId = ctx.from.id;

    // 1. Otorisasi
    if (!isOwner(userId)) {
        return ctx.reply("⚠️ Hanya Owner yang bisa mengakses perintah ini.");
    }

    await ctx.reply("🔍 *Menganalisa Server...*\nMencari server yang sudah dibuat > 2 Hari tapi statusnya OFFLINE.", { parse_mode: "Markdown" });

    // Pastikan Anda sudah mendefinisikan variabel 'pltc' (Client API Key) di config Anda
    // Jika belum, buat variable baru: const pltc = 'ptlc_xxxxx'; (Ambil di Account Settings > API Credentials)
    if (typeof pltc === 'undefined' || !pltc) {
        return ctx.reply("❌ **Error Config:** Bot membutuhkan `pltc` (Client API Key) untuk mengecek status offline/online.");
    }

    let deletedCount = 0;
    let onlineCount = 0;
    let newServerCount = 0; // Server yang umurnya < 5 menit (aman)
    let errorCount = 0;

    try {
        // 2. Ambil semua server (Application API)
        const serverRes = await fetch(`${domain}/api/application/servers?per_page=10000`, {
            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${plta}` }
        });
        const serverData = await serverRes.json();
        const servers = serverData.data;

        if (!servers || servers.length === 0) {
            return ctx.reply("✅ Tidak ada server di panel.");
        }

        const now = new Date();

        // 3. Loop setiap server
        for (const server of servers) {
            const srvId = server.attributes.id;
            const srvIdentifier = server.attributes.identifier; // Butuh identifier untuk Client API
            const createdDate = new Date(server.attributes.created_at);
            
            // Hitung selisih waktu dalam menit
            const diffMs = now - createdDate;
            const diffMins = Math.floor(diffMs / 60000);

            // LOGIKA 1: Proteksi Server Baru (Umur < 5 menit jangan disentuh)
            if (diffMins < 5) {
                newServerCount++;
                continue; // Skip ke server berikutnya
            }

            try {
                // LOGIKA 2: Cek Status Power (Client API)
                // Kita cek resources untuk tahu statusnya
                const resStatus = await fetch(`${domain}/api/client/servers/${srvIdentifier}/resources`, {
                    headers: { 
                        'Accept': 'application/json', 
                        'Authorization': `Bearer ${pltc}` // Pakai PLTC di sini
                    }
                });
                
                const resData = await resStatus.json();
                
                // Cek state: 'running', 'starting', 'stopping', atau 'offline'
                const currentState = resData.attributes ? resData.attributes.current_state : 'unknown';

                if (currentState === 'offline') {
                    // EKSEKUSI: Hapus Server
                    const delRes = await fetch(`${domain}/api/application/servers/${srvId}`, {
                        method: 'DELETE',
                        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${plta}` }
                    });

                    if (delRes.ok) {
                        deletedCount++;
                        // Opsional: Kirim notif kecil jika mau, tapi biar rapi di summary aja
                    } else {
                        errorCount++;
                    }
                } else {
                    // Server Online atau Starting
                    onlineCount++;
                }

            } catch (innerErr) {
                // Biasanya error di sini karena Node/Server suspended atau error API Client
                console.error(`Gagal cek status server ${srvId}:`, innerErr);
                errorCount++;
            }

            // Anti-Rate Limit (Penting karena kita hit 2 API per server)
            await sleep(500); 
        }

        // 4. Laporan Akhir
        return ctx.reply(
            `♻️ *Auto-Delete Selesai*\n\n` +
            `🗑️ **Dihapus (Offline):** ${deletedCount}\n` +
            `🟢 **Aman (Online):** ${onlineCount}\n` +
            `👶 **Skip (Baru < 5m):** ${newServerCount}\n` +
            `❌ **Gagal/Error:** ${errorCount}`,
            { parse_mode: "Markdown" }
        );

    } catch (e) {
        return ctx.reply(`❌ Terjadi kesalahan sistem: ${e.message}`);
    }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [MODIFIKASI] Hapus Server (Single, Multi, All, Except)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("delsrv", async (ctx) => {
    const userId = ctx.from.id;

    // 1. Otorisasi (Sudah benar)
    if (!isOwner(userId)) {
        return ctx.reply("⚠️ Hanya Owner/Reseller yang bisa mengakses perintah ini.", {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'HUBUNGI ADMIN', url: urladmin }]
                ]
            }
        });
    }

    // 2. Ambil SEMUA argumen
    const args = ctx.message.text.split(" ").slice(1);

    // Handle jika tidak ada argumen
    if (args.length === 0) {
        return ctx.reply(
            'Perintah salah. Gunakan:\n' +
            '`/delsrv <id>` - Hapus 1 server\n' +
            '`/delsrv <id1> <id2> ...` - Hapus multi server\n' +
            '`/delsrv all` - Hapus semua (butuh konfirmasi)\n' +
            '`/delsrv all confirm except <id>` - Hapus semua KECUALI ID tertentu', // [BARU]
            { parse_mode: "Markdown" }
        );
    }

    // 3. Handle '/delsrv all'
    if (args[0].toLowerCase() === 'all') {
        
        // Cek konfirmasi
        if (args[1] === 'confirm') {
            
            // [BARU] Logika Pengecualian (except)
            let excludedIds = [];
            if (args[2] && args[2].toLowerCase() === 'except') {
                // Ambil semua ID setelah 'except' dan ubah ke Angka
                excludedIds = args.slice(3).map(Number).filter(Boolean); 
            }
            
            let exceptMsg = excludedIds.length > 0 ? ` (kecuali ID: ${excludedIds.join(', ')})` : "";
            await ctx.reply(`⏳ *KONFIRMASI DITERIMA.*\nMenghapus SEMUA server${exceptMsg}... Ini mungkin butuh waktu lama.`, { parse_mode: "Markdown" });
            
            let successCount = 0;
            let failCount = 0;
            let skippedCount = 0; // [BARU] Untuk menghitung yang di-skip
            
            try {
                // Ambil semua server
                const serverRes = await fetch(`${domain}/api/application/servers?per_page=10000`, {
                    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${plta}` }
                });
                const serverData = await serverRes.json();
                const servers = serverData.data;

                if (servers.length === 0) {
                    return ctx.reply("✅ Tidak ada server untuk dihapus.");
                }

                // Loop dan hapus satu per satu
                for (const server of servers) {
                    const srvId = server.attributes.id; // Ini adalah Angka

                    // [BARU] Cek apakah ID ini harus di-skip
                    if (excludedIds.includes(srvId)) {
                        skippedCount++;
                        continue; // Lewati server ini
                    }
                    
                    // Logika hapus
                    const f = await fetch(`${domain}/api/application/servers/${srvId}`, {
                        method: 'DELETE',
                        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${plta}` }
                    });
                    
                    if (f.ok) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                    await sleep(200); // Jeda rate limit
                }

                // [DIUBAH] Tambahkan info 'Dilewati'
                let summary = `✅ *Proses Hapus Semua Selesai.*\n` +
                              `Berhasil: ${successCount}\n` +
                              `Gagal: ${failCount}\n` +
                              `Dilewati: ${skippedCount}`;
                
                if (skippedCount > 0) {
                    summary += ` (ID: ${excludedIds.join(', ')})`;
                }

                return ctx.reply(summary, { parse_mode: "Markdown" });

            } catch (e) {
                return ctx.reply(`❌ Terjadi error saat mengambil/menghapus daftar server: ${e.message}`);
            }

        } else {
            // Jika hanya '/delsrv all' (tanpa 'confirm')
            // [DIUBAH] Tambahkan info 'except'
            return ctx.reply(
                '‼️ *PERINGATAN* ‼️\n' +
                'Anda akan menghapus *SEMUA* server di panel. Perintah ini tidak dapat dibatalkan.\n\n' +
                'Untuk melanjutkan, ketik:\n' +
                '`/delsrv all confirm`\n\n' +
                '*OPSIONAL (Kustom):*\n' + 
                'Untuk mengecualikan server, ketik:\n' + 
                '`/delsrv all confirm except 51`\n' + 
                '`/delsrv all confirm except 51 52 53`',
                { parse_mode: "Markdown" }
            );
        }
    }

    // 4. Handle Hapus Multi-ID (Tidak berubah)
    await ctx.reply(`⏳ Memulai proses hapus untuk *${args.length}* server...`, { parse_mode: "Markdown" });
    
    let results = [];
    let successCount = 0;
    let failCount = 0;

    for (const srv of args) {
        if (!/^\d+$/.test(srv)) {
            results.push(`⚠️ \`${srv}\` - Bukan ID valid`);
            failCount++;
            continue;
        }

        try {
            let f = await fetch(`${domain}/api/application/servers/${srv}`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${plta}` }
            });

            if (f.ok) {
                results.push(`✅ \`${srv}\` - Berhasil`);
                successCount++;
            } else {
                results.push(`❌ \`${srv}\` - Gagal (Not Found)`);
                failCount++;
            }
        } catch (error) {
            console.error(error);
            results.push(`❌ \`${srv}\` - Gagal (Error)`);
            failCount++;
        }
        await sleep(200); 
    }

    // 5. Kirim ringkasan hasil
    await ctx.reply(
        `Proses hapus multi-server selesai:\n\n` +
        `${results.join('\n')}\n\n` +
        `*Ringkasan:*\n` +
        `Berhasil: ${successCount}\n` +
        `Gagal: ${failCount}`,
        { parse_mode: "Markdown" }
    );
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] List semua User Panel (Owner/Reseller)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("listusr", async (ctx) => {
    const userId = ctx.from.id;

    // 1. [DIMODIFIKASI] Menggunakan auth isOwner()
    if (!isOwner(userId)) {
        return ctx.reply("⚠️ Hanya Owner/Reseller yang bisa mengakses perintah ini.", {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'HUBUNGI ADMIN', url: urladmin }]
                ]
            }
        });
    }

    // 2. [DIMODIFIKASI] Ambil halaman dari argumen
    const text = ctx.message.text.split(" ").slice(1);
    let page = parseInt(text[0]) || 1;

    try {
        await ctx.reply(`⏳ Mengambil daftar user (Halaman ${page})...`);

        // 3. [DIMODIFIKASI] Logika fetch API Pterodactyl
        let f = await fetch(`${domain}/api/application/users?page=${page}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${plta}` // Menggunakan plta
            }
        });
        
        let res = await f.json();
        let users = res.data;

        if (!users || users.length === 0) {
            return ctx.reply(`✅ Tidak ada user yang ditemukan di Halaman ${page}.`);
        }

        let messageText = `Daftar User Panel (Halaman ${page}):\n\n`;
        
        for (let user of users) {
            let u = user.attributes;
            messageText += `🆔 ID User: \`${u.id}\`\n`; // Tambah backticks
            messageText += `📛 Username: ${u.username}\n`;
            messageText += `📣 Nama: ${u.first_name} ${u.last_name}\n\n`;
        }

        // 4. [DIMODIFIKASI] Menambahkan info paginasi dari data meta
        const pagination = res.meta.pagination;
        messageText += `Halaman : ${pagination.current_page}/${pagination.total_pages}\n`;
        messageText += `Total User : ${pagination.total}`;
        
        // 5. [DIMODIFIKASI] Menggunakan ctx.reply
        await ctx.reply(messageText, { parse_mode: "Markdown" });

    } catch (error) {
        console.error(error);
        ctx.reply('❌ Terjadi kesalahan dalam memproses permintaan.');
    }
});


//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// [BARU] Hapus User Panel (Owner/Reseller)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("delusr", async (ctx) => {
    const userId = ctx.from.id;

    // 1. [DIMODIFIKASI] Menggunakan auth isOwner()
    if (!isOwner(userId)) {
        return ctx.reply("⚠️ Hanya Owner/Reseller yang bisa mengakses perintah ini.", {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'HUBUNGI ADMIN', url: urladmin }]
                ]
            }
        });
    }

    // 2. [DIMODIFIKASI] Cara ambil argumen di Telegraf
    const text = ctx.message.text.split(" ").slice(1);
    const usr = text[0]; // Ambil argumen pertama (ID User)

    if (!usr) {
        return ctx.reply('Mohon masukkan ID User yang ingin dihapus.\nContoh: `/delusr 123`', { parse_mode: "Markdown" });
    }

    try {
        await ctx.reply(`⏳ Menghapus user dengan ID: \`${usr}\`...`, { parse_mode: "Markdown" });

        // 3. Logika Fetch API (Sudah benar)
        let f = await fetch(`${domain}/api/application/users/${usr}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${plta}` // Menggunakan plta
            }
        });

        // 4. [DIMODIFIKASI] Menggunakan f.ok untuk cek sukses
        if (f.ok) {
            await ctx.reply(`✅ Berhasil menghapus user ID: \`${usr}\``, { parse_mode: "Markdown" });
        } else {
            // Jika error (misal 404 Not Found)
            const res = await f.json();
            console.error("Gagal hapus user:", res.errors);
            await ctx.reply(`❌ Gagal menghapus user. Error: \`USER NOT FOUND / TERKAIT DENGAN SERVER\``, { parse_mode: "Markdown" });
        }

    } catch (error) {
        console.error(error);
        ctx.reply('❌ Terjadi kesalahan saat menghapus user.');
    }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// Broadcast ke semua pengguna Bot
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

// === BROADCAST ===
const BROADCAST_DELAY_MS = 5; // delay antar pesan (ubah sesuai kebutuhan)

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

bot.command("broadcast", async (ctx) => {
  try {
    // [DIMODIFIKASI] Gunakan isOwner()
    if (!isOwner(ctx.from.id)) {
      return ctx.reply("❌ Hanya Owner/Reseller yang bisa menggunakan command ini.");
    }

    const text = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!text) {
      return ctx.reply("⚠️ Format salah!\nGunakan: /broadcast Isi pesan yang mau dikirim");
    }

    const users = readUsers();
    if (!users.length) return ctx.reply("⚠️ Database user kosong. Tidak ada yang dikirimi broadcast.");

    await ctx.reply(`📢 Mengirim broadcast ke ${users.length} user...`);

    let success = 0, fail = 0, removed = [];

    for (const uid of users) {
      try {
        await bot.telegram.sendMessage(uid, `${text}`, { parse_mode: "Markdown" });
        success++;
      } catch (err) {
        fail++;
        // Hapus user jika memang block atau chat not found (error 403)
        const code = err && (err.code || (err.response && err.response.error_code));
        const desc = err && (err.response && err.response.description || err.message || "");
        const blocked = code === 403 || /blocked/i.test(String(desc)) || /chat not found/i.test(String(desc));
        if (blocked) {
          removeUser(uid);
          removed.push(uid);
        }
        console.error(`Broadcast failed to ${uid}:`, desc);
      }
      // delay kecil untuk mengurangi risiko rate limit
      if (BROADCAST_DELAY_MS > 0) await sleep(BROADCAST_DELAY_MS);
    }

    await ctx.reply(`✅ Broadcast selesai.\nBerhasil: ${success}\nGagal: ${fail}\nDihapus (auto): ${removed.length}`);
  } catch (e) {
    console.error("broadcast error:", e);
    ctx.reply("❌ Terjadi kesalahan saat broadcast.");
  }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// Install Panel & Wings
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("installpanel", async (ctx) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  // [DIMODIFIKASI] Gunakan isOwner()
  if (!isOwner(userId)) {
    return ctx.reply("⚠️ Hanya *Owner* yang bisa menjalankan perintah ini.", {
      parse_mode: "Markdown"
    });
  }

  const text = ctx.message.text.split(" ").slice(1).join(" ");

  // Kalau argumen tidak ada, tampilkan tutorial lengkap
  if (!text) {
    return ctx.reply(`
📦 *TUTORIAL INSTALASI PANEL PTERODACTYL*

Gunakan perintah dengan format:
\`/installpanel ipvps|pwvps|panel.com|node.com|ram\`

📌 *Penjelasan Parameter:*
1. \`ipvps\` – IP VPS tujuan, contoh: \`34.101.XX.XX\`
2. \`pwvps\` – Password root SSH VPS
3. \`panel.com\` – Domain untuk panel admin (misal: \`panel.nexus.com\`)
4. \`node.com\` – Domain untuk node wings (misal: \`node.nexus.com\`)
5. \`ram\` – RAM untuk node dalam *MB* (contoh: \`10240\` untuk 10GB)

🔧 *Contoh Penggunaan:*
\`/installpanel 34.101.XX.XX|passwordroot|panel.nexus.com|node.nexus.com|10240\`

⏱️ Proses ini memakan waktu 5–10 menit. Jangan keluar dari bot.
`, { parse_mode: "Markdown" });
  }

  const vii = text.split("|");
  if (vii.length < 5) {
    return ctx.reply("❌ Format salah. Harus 5 parameter:\nipvps|pwvps|panel.com|node.com|ram *(contoh 100000)*");
  }

  const [ipVps, pwVps, domainPanel, domainNode, ramServer] = vii;
  const passwordPanel = "admin" + Math.floor(Math.random() * 10000);
  const commandPanel = `bash <(curl -s https://pterodactyl-installer.se)`;

  const ress = new Client();
  const connSettings = {
    host: ipVps,
    port: '22',
    username: 'root',
    password: pwVps
  };

  function instalWings() {
    ress.exec('bash <(curl -s https://raw.githubusercontent.com/SkyzoOffc/Pterodactyl-Theme-Autoinstaller/main/createnode.sh)', async (err, stream) => {
      if (err) throw err;

      stream.on('close', async () => {
        const teks = `
╭─━━━━━━━━━━━━━━━━━━━━━╮
  *INSTALL PANEL SUKSES ✅*
╰─━━━━━━━━━━━━━━━━━━━━━╯

📦 *Detail Panel :*
👤 *Username :* admin
🔐 *Password :* ${passwordPanel}
🌐 *Domain :* ${domainPanel}

📌 *Langkah selanjutnya:* Ketik perintah:  
\`/startwings ${ipVps}|${pwVps}|<TOKEN_WINGS>\`

Token Wings bisa diambil dari panel node.
`.trim();

        await ctx.reply(teks, { parse_mode: "Markdown" });
      });

      stream.on('data', (data) => {
        const d = data.toString();
        console.log('Wings STDOUT:', d);
        if (d.includes("Masukkan nama lokasi: ")) stream.write('Singapore\n');
        if (d.includes("Masukkan deskripsi lokasi: ")) stream.write('by picung\n');
        if (d.includes("Masukkan domain: ")) stream.write(`${domainNode}\n`);
        if (d.includes("Masukkan nama node: ")) stream.write('Node01\n');
        if (d.includes("Masukkan RAM (dalam MB): ")) stream.write(`${ramServer}\n`);
        if (d.includes("Masukkan jumlah maksimum disk space (dalam MB): ")) stream.write(`${ramServer}\n`);
        if (d.includes("Masukkan Locid: ")) stream.write('1\n');
      });

      stream.stderr.on('data', (data) => console.error("Wings STDERR:", data.toString()));
    });
  }

  function instalPanel() {
    ress.exec(commandPanel, (err, stream) => {
      if (err) throw err;

      stream.on('close', () => {
        instalWings();
      });

      stream.on('data', (data) => {
        const d = data.toString();
        console.log('InstallPanel STDOUT:', d);
        if (d.includes('Input 0-6')) stream.write('0\n');
        if (d.includes('(y/N)')) stream.write('y\n');
        if (d.includes('Database name')) stream.write('\n');
        if (d.includes('Database username')) stream.write('adminnnn\n');
        if (d.includes('Password (press enter')) stream.write('admin\n');
        if (d.includes('Select timezone')) stream.write('Asia/Jakarta\n');
        if (d.includes('Provide the email address')) stream.write('admin@gmail.com\n');
        if (d.includes('Email address for the initial admin account')) stream.write('admin@gmail.com\n');
        if (d.includes('Username for the initial admin account')) stream.write('admin\n');
        if (d.includes('First name')) stream.write('admin\n');
        if (d.includes('Last name')) stream.write('panel\n');
        if (d.includes('Password for the initial admin account')) stream.write(`${passwordPanel}\n`);
        if (d.includes('Set the FQDN')) stream.write(`${domainPanel}\n`);
        if (d.includes('Do you want to automatically configure UFW')) stream.write('y\n');
        if (d.includes('Do you want to automatically configure HTTPS')) stream.write('y\n');
        if (d.includes('Select the appropriate number')) stream.write('1\n');
        if (d.includes('I agree that this HTTPS request')) stream.write('y\n');
        if (d.includes('Proceed anyways')) stream.write('y\n');
        if (d.includes('(yes/no)')) stream.write('y\n');
        if (d.includes('Continue with installation?')) stream.write('y\n');
        if (d.includes('Still assume SSL?')) stream.write('y\n');
        if (d.includes('Please read the Terms')) stream.write('y\n');
        if (d.includes('(A)gree/(C)ancel:')) stream.write('A\n');
      });

      stream.stderr.on('data', (data) => console.error("InstallPanel STDERR:", data.toString()));
    });
  }

  ress.on('ready', async () => {
    await ctx.reply("🚀 Memulai proses *install panel VPS*. Harap tunggu sekitar 5–10 menit...", {
      parse_mode: 'Markdown'
    });

    ress.exec("\n", (err, stream) => {
      if (err) throw err;
      stream.on('close', () => instalPanel());
      stream.on('data', (data) => console.log("PRE-setup:", data.toString()));
      stream.stderr.on('data', (data) => console.error("PRE-setup ERR:", data.toString()));
    });
  });

  ress.on('error', (err) => {
    console.error("❌ SSH Connection Error:", err.message);
    ctx.reply(`❌ Gagal konek ke VPS:\n${err.message}`);
  });

  ress.connect(connSettings);
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// Command: /startwings
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("startwings", async (ctx) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id.toString();

  // [DIMODIFIKASI] Gunakan isOwner()
  if (!isOwner(userId)) {
    return ctx.reply("⚠️ Hanya *Owner* yang bisa menjalankan perintah ini.", {
      parse_mode: "Markdown"
    });
  }

  const text = ctx.message.text.split(" ").slice(1).join(" ");
  if (!text) {
    return ctx.reply(
      `
📖 *TUTORIAL START WINGS* 📖

Gunakan format:
/startwings ipvps|password|token

🔧 *Contoh:*
/startwings 123.45.67.89|myPassword|token-xyz-123456

➡️ *Keterangan:*
• ipvps   = IP VPS tujuan
• password = Password root VPS
• token    = Token konfigurasi node dari panel

⚡ Setelah berhasil, node akan otomatis terkoneksi dengan panel.
`,
      { parse_mode: "Markdown" }
    );
  }

  const args = text.split(",");
  if (args.length < 3) {
    return ctx.reply(
      "❌ *Format salah!*\n\nGunakan format:\n/startwings ipvps|password|token",
      { parse_mode: "Markdown" }
    );
  }

  const [ipvps, passwd, token] = args.map((a) => a.trim());
  const conn = new Client();

  conn
    .on("ready", () => {
      ctx.reply("⚙️ *PROSES CONFIGURE WINGS...*", { parse_mode: "Markdown" });

      const command = "bash <(curl -s https://raw.githubusercontent.com/SkyzoOffc/Pterodactyl-Theme-Autoinstaller/main/startwings.sh)";

      conn.exec(command, (err, stream) => {
        if (err) {
          ctx.reply("❌ Terjadi error saat eksekusi command!");
          return conn.end();
        }

        stream
          .on("data", (data) => {
            const output = data.toString();
            console.log("STDOUT:", output);

            // Respon otomatis terhadap prompt dari script
            if (output.includes("Masukkan token:") || output.includes("Input token:")) {
              stream.write(`${token}\n`);
            }
            if (output.includes("Pilih opsi") || output.includes("Masukkan pilihan:")) {
              stream.write("3\n");
            }

            // Info progres ke Telegram (tanpa spam)
            if (output.toLowerCase().includes("selesai") || output.toLowerCase().includes("berhasil")) {
              ctx.reply("✅ *Wings Berhasil Dikoneksikan ke Panel!*", {
                parse_mode: "Markdown",
              });
            }
          })
          .stderr.on("data", (data) => {
            console.error("STDERR:", data.toString());
          })
          .on("close", () => {
            ctx.reply("✅ *Proses konfigurasi Wings selesai!*", {
              parse_mode: "Markdown",
            });
            conn.end();
          });
      });
    })
    .on("error", (err) => {
      console.error("Connection Error:", err.message);
      ctx.reply(`❌ Gagal konek ke VPS:\n${err.message}`);
    })
    .connect({
      host: ipvps,
      port: 22,
      username: "root",
      password: passwd,
    });
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// Hapus semua User yang tidak ada Server
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.command("delallusr", async (ctx) => {
  const userId = ctx.from.id;
  // [DIMODIFIKASI] Gunakan isOwner()
  if (!isOwner(userId)) {
    return ctx.reply("⚠️ Hanya Owner/Reseller yang bisa mengakses perintah ini.", { parse_mode: "Markdown" });
  }

  try {
    // 🔹 Ambil semua user
    const usersResp = await fetch(`${domain}/api/application/users?per_page=10000`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${plta}`,
      },
    });
    const usersData = await usersResp.json();
    const users = usersData.data || [];

    // 🔹 Ambil semua server
    const serversResp = await fetch(`${domain}/api/application/servers?per_page=10000`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${plta}`,
      },
    });
    const serversData = await serversResp.json();
    const servers = serversData.data || [];

    // 🔹 Cari user tanpa server
    const serverUserIds = servers.map((srv) => String(srv.attributes.user));
    const usersNoServer = users.filter((usr) => !serverUserIds.includes(String(usr.attributes.id)));

    const total = usersNoServer.length;

    if (total === 0) {
      return ctx.reply("✅ Tidak ada user tanpa server.");
    }

    await ctx.reply(
      `📋 Total user tanpa server: *${total}*\n\nKetik /confirmdelusr untuk menghapus semuanya.`,
      { parse_mode: "Markdown" }
    );

  } catch (err) {
    console.error("Error:", err);
    ctx.reply("❌ Terjadi kesalahan mengambil data.");
  }
});

// === Command /confirmdelusr ===
bot.command("confirmdelusr", async (ctx) => {
  const userId = ctx.from.id;
  // [DIMODIFIKASI] Gunakan isOwner()
  if (!isOwner(userId)) {
    return ctx.reply("⚠️ Hanya Owner/Reseller yang bisa mengakses perintah ini.", { parse_mode: "Markdown" });
  }
  
  try {
    // 🔹 Fetch ulang data user & server
    const usersResp = await fetch(`${domain}/api/application/users?per_page=10000`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${plta}`,
      },
    });
    const usersData = await usersResp.json();
    const users = usersData.data || [];

    const serversResp = await fetch(`${domain}/api/application/servers?per_page=10000`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${plta}`,
      },
    });
    const serversData = await serversResp.json();
    const servers = serversData.data || [];

    // 🔹 Cari user tanpa server lagi
    const serverUserIds = servers.map((srv) => String(srv.attributes.user));
    const usersNoServer = users.filter((usr) => !serverUserIds.includes(String(usr.attributes.id)));

    if (!usersNoServer.length) {
      return ctx.reply("✅ Semua user sudah punya server, tidak ada yang dihapus.");
    }

    let success = 0, fail = 0;

    // 🔹 Loop hapus user
    for (const usr of usersNoServer) {
      try {
        await fetch(`${domain}/api/application/users/${usr.attributes.id}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${plta}`,
          },
        });
        success++;
      } catch (e) {
        fail++;
      }
    }

    await ctx.reply(`✅ Selesai menghapus user tanpa server.\n\nBerhasil: ${success}\nGagal: ${fail}`);

  } catch (err) {
    console.error("Error delete:", err);
    ctx.reply("❌ Terjadi kesalahan saat menghapus user.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// File Data
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

const PRODUCTS_FILE = path.join(__dirname, "src", "products.json");
const ORDERS_FILE = path.join(__dirname, "src", "orders.json");
// [BARU] Definisikan konstanta untuk file reseller, meskipun path sudah ada di atas
const RESELLERS_FILE = path.join(__dirname, "src", "database", "resellers.json");


if (!fs.existsSync(PRODUCTS_FILE)) fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, JSON.stringify({}, null, 2));
// [BARU] Pastikan file reseller ada saat start
ensureResellerFile();

function readProducts() { return JSON.parse(fs.readFileSync(PRODUCTS_FILE)); }
function saveProducts(arr) { fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(arr, null, 2)); }
function readOrders() { return JSON.parse(fs.readFileSync(ORDERS_FILE)); }
function saveOrders(obj) { fs.writeFileSync(ORDERS_FILE, JSON.stringify(obj, null, 2)); }
function readPremium() { return JSON.parse(fs.readFileSync(PREMIUM_FILE)); } // PREMIUM_FILE tidak terdefinisi, tapi saya biarkan dari skrip asli Anda

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// Pterodactyl Function 
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

async function createUserAndServer({ username, product }) {
  const name = username + " Server";
  const memo = product?.ram;
  const cpu = product?.cpu;
  const disk = product?.disk;
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';

  const email = `${username}@private.id`;
  const randomSuffix = crypto.randomBytes(3).toString('hex'); // acak 6 karakter
  const password = `${username}${randomSuffix}`;

  let user, server;

  try {
    // 🔹 Buat user
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email,
        username,
        first_name: username,
        last_name: username,
        language: "en",
        password,
      }),
    });

    const data = await response.json();
    if (data.errors) {
      return { error: true, details: data.errors };
    }
    user = data.attributes;

    // 🔹 Buat server
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_23",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });

    const data2 = await response2.json();
    if (data2.errors) {
      return { error: true, details: data2.errors };
    }
    server = data2.attributes;

    return {
      error: false,
      username,
      password,
      email,
      url: `${domain}`,
      user,
      server,
    };
  } catch (error) {
    return { error: true, details: error.message };
  }
}
// === Tambahan: cek username sudah ada di panel
async function isUsernameTaken(username) {
  try {
    const resp = await fetch(`${domain}/api/application/users?filter[username]=${username}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${plta}`
      }
    });
    const data = await resp.json();
    return Array.isArray(data.data) && data.data.length > 0;
  } catch (e) {
    console.error("check username error:", e);
    return false;
  }
}

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// FITUR SETTING PANEL (AUTO UPDATE MEMORY)
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

// Helper: Update file fisik
function updateConfigFile(key, newValue) {
    try {
        let content = fs.readFileSync(CONFIG_FILE, "utf8");
        const regex = new RegExp(`(${key}\\s*:\\s*")([^"]*)(")`);
        if (!regex.test(content)) return false;
        const newContent = content.replace(regex, `$1${newValue}$3`);
        fs.writeFileSync(CONFIG_FILE, newContent, "utf8");
        return true;
    } catch (e) {
        console.error("Error update config:", e);
        return false;
    }
}

// 1. SET URL / DOMAIN
bot.command("seturl", async (ctx) => {
    if (!isMainOwner(ctx.from.id)) return ctx.reply("⛔ Khusus Owner Utama.");
    
    const args = ctx.message.text.split(" ");
    const newUrl = args[1];

    if (!newUrl) return ctx.reply("❌ Format salah.\nGunakan: `/seturl https://domainkamu.com`", { parse_mode: "Markdown" });

    // Update File
    if (updateConfigFile("domain", newUrl)) {
        // UPDATE MEMORY LANGSUNG (Ini rahasianya biar gak perlu restart)
        domain = newUrl; 
        config.domain = newUrl;

        await ctx.reply(`✅ Domain berhasil diubah ke:\n\`${newUrl}\`\n\n⚡ Perubahan langsung aktif!`, { parse_mode: "Markdown" });
    } else {
        await ctx.reply("❌ Gagal mengubah domain di file config.");
    }
});

// 2. SET PLTA
bot.command("setplta", async (ctx) => {
    if (!isMainOwner(ctx.from.id)) return ctx.reply("⛔ Khusus Owner Utama.");
    
    const args = ctx.message.text.split(" ");
    const newKey = args[1];

    if (!newKey) return ctx.reply("❌ Format salah.\nGunakan: `/setplta ptla_xxxx`", { parse_mode: "Markdown" });

    if (updateConfigFile("plta", newKey)) {
        // UPDATE MEMORY LANGSUNG
        plta = newKey;
        config.plta = newKey;

        await ctx.reply(`✅ PLTA berhasil diubah.\n⚡ Perubahan langsung aktif!`, { parse_mode: "Markdown" });
    } else {
        await ctx.reply("❌ Gagal mengubah PLTA.");
    }
});

// 3. SET PLTC
bot.command("setpltc", async (ctx) => {
    if (!isMainOwner(ctx.from.id)) return ctx.reply("⛔ Khusus Owner Utama.");
    
    const args = ctx.message.text.split(" ");
    const newKey = args[1];

    if (!newKey) return ctx.reply("❌ Format salah.\nGunakan: `/setpltc ptlc_xxxx`", { parse_mode: "Markdown" });

    // Kita update key 'ptlc' sesuai nama di config.js kamu
    if (updateConfigFile("ptlc", newKey)) {
        // UPDATE MEMORY LANGSUNG
        pltc = newKey;
        config.ptlc = newKey;

        await ctx.reply(`✅ PLTC berhasil diubah.\n⚡ Perubahan langsung aktif!`, { parse_mode: "Markdown" });
    } else {
        await ctx.reply("❌ Gagal mengubah PLTC.");
    }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// === Launch
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.launch();
console.log(chalk.blue.bold(`
⠀⠀⠀⢸⣦⡀⠀⠀⠀⠀⢀⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣏⠻⣶⣤⡶⢾⡿⠁⠀⢠⣄⡀⢀⣴⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⠀⠀⠀
⠀⠀⣀⣼⠷⠀⠀⠁⢀⣿⠃⠀⠀⢀⣿⣿⣿⣇⠀⠀⠀⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠴⣾⣯⣅⣀⠀⠀⠀⠈⢻⣦⡀⠒⠻⠿⣿⡿⠿⠓⠂⠀⠀⢂⡇⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠉⢻⡇⣤⣾⣿⣷⣿⣿⣤⠀⠀⣿⠁⠀⠀⠀⢀⣴⣿⣿⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠸⣿⡿⠏⠀⢀⠀⠀⠿⣶⣤⣤⣤⣄⣀⣴⣿⡿⢻⣿⡆⠂⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠟⠁⠀⢀⣼⠀⠀⠀⠹⣿⣟⠿⠿⠿⡿⠋⠀⠘⣿⣇⠀⠄⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢳⣶⣶⣿⣿⣇⣀⠀⠀⠙⣿⣆⠀⠀⠀⠀⠀⠀⠛⠿⣿⣦⣤⣀⠀⠀
⠀⠀⠀⠀⠀⠀⣹⣿⣿⣿⣿⠿⠋⠁⠀⣹⣿⠳⠀⠀⠀⠀⠀⠀⢀⣠⣽⣿⡿⠟⠃
⠀⠀⠀⠈⠀⢰⠿⠛⠻⢿⡇⠀⠀⠀⣰⣿⠏⠀⠀⢀⠀⠀⠁⣾⣿⠟⠋⠁⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠋⠀⠀⣰⣿⣿⣾⣿⠿⢿⣷⣀⢀⣿⡇⠁⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠠⠀⠀⠀⠋⠉⠁⠀⠀⠀⠀⠙⢿⣿⣿⠇⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢿⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠀⠀⠀⠀`));
console.log(chalk.green.bold('[✅ ] Berhasil tersambung!\n\n'));
console.log(chalk.blue.bold('Thanks for using this script.'));
console.log(chalk.yellow.bold('- Develover: @bapakmu'));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));