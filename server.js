// =========================================================================
// Roleplay Hub - Production Server & Real-Time Sync Engine
// Compatible with Render.com Node Web Service & Local Node environments
// Includes persistent JSON storage, WebSocket relay, and robust REST APIs
// =========================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
// Same files the browser loads via <script src="shoal-tales/*.js"> - required
// directly here so the server computes every paying roll with the identical
// formulas/data the client previews with. See docs/shoal-tales-spec/ARCHITECTURE.md.
const ShoalTalesEngine = require('./shoal-tales/engine.js');
const ShoalTalesData = require('./shoal-tales/data.js');

const PORT = process.env.PORT || 10000;
// Overridable so a Render persistent disk (or any other host's mounted volume)
// can be pointed at from outside the app directory, instead of the ephemeral
// local repo checkout that gets wiped on every redeploy.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultDb = {
  users: {
    '@earlgreyfae': {
      handle: '@EarlGreyFae',
      name: 'Kitty',
      password: 'TacticalPugActivated',
      role: 'superadmin',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      passkeys: [],
      createdAt: '2026-09-01T00:00:00.000Z'
    }
  },
  worlds: {},
  channels: {},
  messages: [],
  dmMessages: [],
  wikiEntries: [],
  invites: [],
  pushSubscriptions: [],
  vapidKeys: null,
  scratchpadNotes: [],
  shoalTalesSaves: {}
};

let db = { ...defaultDb };

let webpush = null;
try {
  webpush = require('web-push');
} catch (e) {
  console.warn('[Push] web-push module not installed; push notifications disabled.');
}

let pgPool = null;
if (process.env.DATABASE_URL) {
  try {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    console.log('[DB] PostgreSQL pool initialized via DATABASE_URL');
  } catch (e) {
    console.warn('[DB] PostgreSQL driver note:', e.message);
  }
}

function loadDatabaseFromFile() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      db = {
        users: { ...defaultDb.users, ...(parsed.users || {}) },
        worlds: parsed.worlds || {},
        channels: parsed.channels || {},
        messages: parsed.messages || [],
        dmMessages: parsed.dmMessages || [],
        wikiEntries: parsed.wikiEntries || [],
        invites: parsed.invites || [],
        pushSubscriptions: parsed.pushSubscriptions || [],
        vapidKeys: parsed.vapidKeys || null,
        scratchpadNotes: parsed.scratchpadNotes || [],
        shoalTalesSaves: parsed.shoalTalesSaves || {}
      };
      if (!db.users['@earlgreyfae']) {
        db.users['@earlgreyfae'] = defaultDb.users['@earlgreyfae'];
      }
      return true;
    }
  } catch (err) {
    console.error('[DB] Error loading local database file:', err.message);
    db = { ...defaultDb };
  }
  return false;
}

let saveTimeout = null;
function saveDatabase() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveDatabaseSync, 300);
}

// Once PG sync fails a few times in a row (typically a stale/incorrect
// DATABASE_URL, or the Postgres instance itself is gone - e.g. a deleted or
// expired Render database - so every single retry is doomed the same way),
// stop hammering it on every save and re-logging the identical error. Back
// off for a cooldown period instead, then try again once in case it was a
// transient network blip; local-disk persistence is unaffected either way.
const PG_FAILURE_THRESHOLD = 3;
const PG_COOLDOWN_MS = 60000;
let pgConsecutiveFailures = 0;
let pgRetryAfter = 0;

function saveDatabaseSync() {
  try {
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
    if (pgPool && Date.now() >= pgRetryAfter) {
      pgPool.query(
        "INSERT INTO roleplay_hub_store (key, value, updated_at) VALUES ('database_state', $1, now()) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()",
        [JSON.stringify(db)]
      ).then(() => {
        pgConsecutiveFailures = 0;
      }).catch(err => {
        pgConsecutiveFailures++;
        console.error('[DB] PG save error:', err.message);
        if (pgConsecutiveFailures >= PG_FAILURE_THRESHOLD) {
          pgRetryAfter = Date.now() + PG_COOLDOWN_MS;
          console.error(
            `[DB] PostgreSQL has failed ${pgConsecutiveFailures} saves in a row - pausing PG sync for ${PG_COOLDOWN_MS / 1000}s ` +
            `(local disk is still saving normally, so no data is being lost). This usually means DATABASE_URL points at a ` +
            `database that no longer exists or isn't reachable from here - check the Postgres instance still exists in the ` +
            `Render dashboard and that DATABASE_URL is its current connection string.`
          );
        }
      });
    }
  } catch (err) {
    console.error('[DB] Error saving database:', err.message);
  }
}

// PostgreSQL is the durable source of truth across redeploys, since Render
// wipes local disk on every deploy. This MUST finish resolving before the
// server starts accepting requests or writing anything back — otherwise a
// fresh container's empty in-memory db can race ahead and overwrite the
// real data in Postgres before the restore even completes.
async function initializeDatabase() {
  if (pgPool) {
    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS roleplay_hub_store (
          key text PRIMARY KEY,
          value jsonb NOT NULL,
          updated_at timestamptz DEFAULT now()
        );
      `);
      const res = await pgPool.query("SELECT value FROM roleplay_hub_store WHERE key = 'database_state'");
      if (res.rows && res.rows[0] && res.rows[0].value) {
        const pgData = res.rows[0].value;
        db = {
          users: { ...defaultDb.users, ...(pgData.users || {}) },
          worlds: pgData.worlds || {},
          channels: pgData.channels || {},
          messages: pgData.messages || [],
          dmMessages: pgData.dmMessages || [],
          wikiEntries: pgData.wikiEntries || [],
          invites: pgData.invites || [],
          pushSubscriptions: pgData.pushSubscriptions || [],
          vapidKeys: pgData.vapidKeys || null,
          scratchpadNotes: pgData.scratchpadNotes || [],
          shoalTalesSaves: pgData.shoalTalesSaves || {}
        };
        console.log('[DB] Restored database state from PostgreSQL (source of truth)');
        saveDatabaseSync();
        return;
      }
      console.log('[DB] No existing PostgreSQL record found - seeding it from local disk once');
      loadDatabaseFromFile();
      saveDatabaseSync();
      return;
    } catch (err) {
      console.error('[DB] PostgreSQL unreachable at startup, falling back to local disk (data will NOT survive the next redeploy until this is resolved):', err.message);
    }
  }

  if (!loadDatabaseFromFile()) {
    saveDatabaseSync();
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch (err) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// =========================================================================
// Shoal Tales - helper functions (core loop: dredging + sorting)
// See docs/shoal-tales-spec/ for the full design and ARCHITECTURE.md for why
// every paying roll (haul contents, curio rarity, etc.) is computed HERE,
// server-side, using the exact same shoal-tales/engine.js the client previews
// with - never trust a client-submitted haul or sort outcome.
// =========================================================================

const SHOAL_DEPTH_NAMES = ['Shallows', 'Reef Depth', 'The Deep', 'The Abyss'];

function shoalDepthRangeFromString(depthsStr) {
  // "Shallows to The Deep" -> [0, 2]. Single-depth strings aren't used in the
  // data, but handled for safety.
  const parts = (depthsStr || '').split(' to ').map(s => s.trim());
  const start = SHOAL_DEPTH_NAMES.indexOf(parts[0]);
  const end = parts.length > 1 ? SHOAL_DEPTH_NAMES.indexOf(parts[1]) : start;
  return [start < 0 ? 0 : start, end < 0 ? 3 : end];
}

function defaultShoalTalesSave(handle) {
  const bins = {};
  ShoalTalesEngine.BINS.forEach(b => { bins[b] = { units: 0, value: 0 }; });
  return {
    handle,
    createdAt: new Date().toISOString(),
    coins: 0,
    lifetimeCoinsThisRun: 0,
    tray: [],
    basketLevel: 0,
    winchLevel: 0,
    brushLevel: 0,
    charmLevel: 0,
    stationsInstalled: [],
    sortedGoods: bins,
    cooler: [],
    streak: 0,
    bestStreakThisRun: 0,
    bestStreakEver: 0,
    depth: 0,
    area: 'shoalbay',
    unlockedAreas: ['shoalbay'],
    unlockedDepths: [0],
    retirements: 0,
    lastHaulDate: null,
    allTimeStats: { hauls: 0, junkSorted: 0, fishOnIce: 0, coinsEarned: 0, bestStreak: 0, curiosScrubbed: 0, cratesOpened: 0, creaturesReleased: 0 },
    // Kept for good across retiring (docs/shoal-tales-spec/11-retiring.md) -
    // not reset by anything in this phase since retiring itself isn't built yet.
    collectorsLog: { curios: {}, fish: {} },
    magicCurios: [],
    creaturesSeen: [],
    goldenLog: [],
    storedCurios: [],
    bottleLettersFound: [],
    // Story and the Town (docs/shoal-tales-spec/07-story.md). Until the Town
    // opens there is no selling, no requests, no Crow's letters - per spec.
    townOpen: false,
    anyFishDressed: false,
    crowLettersReceived: [],
    rareMaterials: {},
    // Next story-request index per townsperson; once a person's chain is
    // exhausted (index >= their request count), further fulfillments go to
    // their standing order instead (see fulfill-request).
    storyRequestIndex: { walt: 0, dot: 0, rosalind: 0, hank: 0, priya: 0 },
    standingOrdersFilled: { walt: 0, dot: 0, rosalind: 0, hank: 0, priya: 0 },
    dailyRequestsDate: null,
    dailyRequestsDone: [],
    // Stations & economy (docs/shoal-tales-spec/08-stations-upgrades.md).
    // Stations arrive one at a time, strictly in ShoalTalesData.stations
    // order; stationProgress tracks "amount handled" toward whichever
    // station is next (index stationsInstalled.length) and resets to 0 once
    // that station is installed. Knick-knacks/ingots/materials are produced
    // from stored junk at Carpentry/Crucible/Recycling and sold like sorted
    // goods - {units, value} mirrors the sortedGoods bin shape.
    stationProgress: 0,
    knickKnacks: { units: 0, value: 0 },
    ingots: { units: 0, value: 0 },
    materials: { units: 0, value: 0 }
  };
}

function getOrCreateShoalTalesSave(handle) {
  const key = (handle || '').trim();
  if (!key) return null;
  if (!db.shoalTalesSaves[key]) {
    db.shoalTalesSaves[key] = defaultShoalTalesSave(key);
    saveDatabase();
  }
  return db.shoalTalesSaves[key];
}

function shoalAreaById(id) {
  return ShoalTalesData.mapAreas.find(a => a.id === id) || ShoalTalesData.mapAreas[0];
}

// Delivers a Crow's letter. Per the spec a letter is dropped off and then
// read separately at the Desk to take effect; this implementation collapses
// that into one step (received = read = effect applied immediately) since
// there's no mail-reading UI in this phase - the letter's text is still kept
// and viewable in crowLettersReceived. The first letter ("An invitation
// ashore") opens the Town; letters 2-6 are triggered by station installs and
// the Emporium opening, wired in those later phases via this same function.
function shoalDeliverCrowLetter(save, letterId) {
  if (save.crowLettersReceived.indexOf(letterId) !== -1) return null;
  const letter = ShoalTalesData.crowLetters.find(l => l.id === letterId);
  if (!letter) return null;
  save.crowLettersReceived.push(letterId);
  if (letterId === 'an-invitation-ashore') {
    save.townOpen = true;
  }
  return letter;
}

function shoalTownspersonAppears(save, personId) {
  const person = ShoalTalesData.townsfolk.find(p => p.id === personId);
  if (!person) return false;
  if (person.appearsWhen === 'townOpen') return save.townOpen;
  if (person.appearsWhen === 'carpentry-installed') return save.stationsInstalled.indexOf('carpentry') !== -1;
  if (person.appearsWhen === 'crucible-installed') return save.stationsInstalled.indexOf('crucible') !== -1;
  return false;
}

// Current request for a person: the next story request in their chain, or
// (once that chain is exhausted) their repeatable standing order. Returns
// null if the person hasn't appeared yet.
function shoalCurrentRequestFor(save, personId) {
  if (!shoalTownspersonAppears(save, personId)) return null;
  const chain = ShoalTalesData.storyRequests.filter(r => r.personId === personId).sort((a, b) => a.order - b.order);
  const idx = save.storyRequestIndex[personId] || 0;
  if (idx < chain.length) {
    return { kind: 'story', request: chain[idx] };
  }
  const standing = ShoalTalesData.standingOrders.find(s => s.personId === personId);
  if (!standing) return null;
  const filled = save.standingOrdersFilled[personId] || 0;
  const amount = standing.baseAmount + standing.amountPerFill * filled;
  return { kind: 'standing', standing, amount };
}

// How many units of `requires.type` the player currently has on hand.
function shoalAvailableFor(save, requires) {
  if (requires.type === 'rawFish') return save.cooler.filter(f => f.stage === 'raw').length;
  if (requires.type === 'dressedFish') return save.cooler.filter(f => f.stage === 'dressed').length;
  if (requires.type === 'sortedBin') return save.sortedGoods[requires.bin] ? save.sortedGoods[requires.bin].units : 0;
  if (requires.type === 'meals') return save.cooler.filter(f => f.stage === 'meal').length;
  if (requires.type === 'knickKnacks') return save.knickKnacks ? save.knickKnacks.units : 0;
  if (requires.type === 'ingots') return save.ingots ? save.ingots.units : 0;
  if (requires.type === 'materials') return save.materials ? save.materials.units : 0;
  return 0;
}

// Consumes `amount` units of `requires.type` from the player's holdings.
// Caller must have already checked shoalAvailableFor(...) >= amount.
function shoalConsume(save, requires, amount) {
  if (requires.type === 'rawFish' || requires.type === 'dressedFish' || requires.type === 'meals') {
    const stage = requires.type === 'rawFish' ? 'raw' : requires.type === 'dressedFish' ? 'dressed' : 'meal';
    let left = amount;
    save.cooler = save.cooler.filter(f => {
      if (left > 0 && f.stage === stage) { left--; return false; }
      return true;
    });
    return;
  }
  if (requires.type === 'sortedBin') {
    const bin = save.sortedGoods[requires.bin];
    const perUnit = bin.units > 0 ? bin.value / bin.units : 0;
    bin.units -= amount;
    bin.value = Math.max(0, bin.value - perUnit * amount);
    return;
  }
  if (requires.type === 'knickKnacks' || requires.type === 'ingots' || requires.type === 'materials') {
    const store = save[requires.type];
    const perUnit = store.units > 0 ? store.value / store.units : 0;
    store.units = Math.max(0, store.units - amount);
    store.value = Math.max(0, store.value - perUnit * amount);
    return;
  }
}

// Which station (if any) is next in line (strictly in ShoalTalesData.stations
// order), and the progress-type it's waiting on. Null once all 4 are in.
function shoalNextStationDef(save) {
  return ShoalTalesData.stations[save.stationsInstalled.length] || null;
}

// Adds to stationProgress only when the handled amount matches what the
// *currently pending* station is waiting on - progress toward a station
// that isn't next yet (or no longer exists) simply doesn't count.
function shoalTrackStationProgress(save, type, amount, bin) {
  const station = shoalNextStationDef(save);
  if (!station || station.requiresType !== type) return;
  if (type === 'sortedBin' && station.requiresBin !== bin) return;
  save.stationProgress = (save.stationProgress || 0) + amount;
}

// Vague progress hint for the pending station, never exact numbers (per
// 08-stations-upgrades.md) - once requiresAmount is met the real cost is
// shown instead, ready to install.
function shoalNextStationInfo(save) {
  const station = shoalNextStationDef(save);
  if (!station) return null;
  const progress = save.stationProgress || 0;
  const unlocked = progress >= station.requiresAmount;
  if (unlocked) {
    const unlockScale = ShoalTalesEngine.retireGoalForRun(save.retirements + 1).unlockScale;
    return { id: station.id, name: station.name, unlocked: true, cost: ShoalTalesEngine.stationCost(station.cost, unlockScale) };
  }
  const frac = Math.min(1, progress / station.requiresAmount);
  const hint = frac < 0.25 ? 'It feels a long way off.'
    : frac < 0.5 ? "You're getting somewhere."
    : frac < 0.75 ? 'More than halfway there.'
    : 'Almost there!';
  return { id: station.id, name: station.name, unlocked: false, hint };
}

function shoalNewTrayId(i) {
  return 'tray_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 7);
}

// Produces the N items for one haul, following the exact cascade in
// docs/shoal-tales-spec/03-dredging.md "What each haul contains": per item
// slot, roll (1) puzzle box, (2) magic curio, (3) otherwise the catch-type
// weighted roll among junk/fish/curio/crate/bottle/sea creature. Puzzle boxes
// are gated behind the Emporium being open (not built yet, so that branch is
// permanently 0% until the Emporium phase lands) - documented here rather
// than silently omitted so it's not mistaken for missing.
function generateShoalHaul(save) {
  const area = shoalAreaById(save.area);
  const isFirstHaulOfDay = save.lastHaulDate !== new Date().toISOString().slice(0, 10);
  const isVeryFirstHaul = save.allTimeStats.hauls === 0;
  const count = ShoalTalesEngine.hauledItemCount(save.basketLevel, 0, { isFirstHaulOfDay: isFirstHaulOfDay });
  const luck = 0; // no luck-bonus sources wired in yet (sets/magic curios/upgrades) - see 09-economy.md bonus stacking, deferred to the Economy phase.

  const junkPool = ShoalTalesData.junk.filter(j => j.foundIn === 'Everywhere' || j.foundIn === area.name);
  const fishPool = ShoalTalesData.fish.filter(f => {
    if (f.area !== area.name) return false;
    const range = shoalDepthRangeFromString(f.depths);
    return save.depth >= range[0] && save.depth <= range[1];
  });
  const curioPool = ShoalTalesData.curios.filter(c => c.area === area.name);
  const emporiumOpen = false; // Emporium phase not built yet.
  const magicCuriosRemaining = ShoalTalesData.magicCurios.filter(m => save.magicCurios.indexOf(m.id) === -1);

  const catchWeights = ShoalTalesEngine.catchTypeWeights(save.depth, luck, false);
  const tray = [];
  let forcedFishUsed = false;
  let forcedCurioUsed = false;

  for (let i = 0; i < count; i++) {
    const areaMultiplier = area.valueMultiplier; // locked in at haul time, see 03-dredging.md
    const id = shoalNewTrayId(i);

    const puzzleBoxChance = emporiumOpen ? 0.03 * (1 + 0.5 * save.depth) : 0;
    const magicCurioChance = magicCuriosRemaining.length > 0 ? 0.006 * (1 + luck) * (1 + 0.5 * save.depth) : 0;
    const roll = Math.random();

    if (roll < puzzleBoxChance) {
      tray.push({ id, kind: 'puzzleBox', name: 'Puzzle Box', areaMultiplier });
      continue;
    }
    if (roll < puzzleBoxChance + magicCurioChance) {
      tray.push({ id, kind: 'magicCurio', name: 'Strange Curio', identified: false, areaMultiplier });
      continue;
    }

    let kind = ShoalTalesEngine.weightedPick(catchWeights);
    if (isVeryFirstHaul && !forcedFishUsed) { kind = 'fish'; forcedFishUsed = true; } // "the very first haul of a save always contains a fish"
    else if (isFirstHaulOfDay && !forcedCurioUsed && !(isVeryFirstHaul && !forcedFishUsed)) { kind = 'curio'; forcedCurioUsed = true; } // "the first haul of each real-world day ... always includes a curio"
    if (kind === 'fish' && fishPool.length === 0) kind = 'junk';
    if (kind === 'curio' && curioPool.length === 0) kind = 'junk';

    if (kind === 'fish') {
      const f = fishPool[Math.floor(Math.random() * fishPool.length)];
      tray.push({ id, kind: 'fish', name: f.name, baseCoins: f.baseCoins, weight: f.weight, description: f.description, areaMultiplier });
    } else if (kind === 'curio') {
      tray.push({ id, kind: 'curio', name: 'Encrusted Curio', identified: false, areaMultiplier });
    } else if (kind === 'crate') {
      tray.push({ id, kind: 'crate', name: 'Sealed Crate', areaMultiplier });
    } else if (kind === 'bottle') {
      tray.push({ id, kind: 'bottle', name: 'Message in a Bottle', areaMultiplier });
    } else if (kind === 'seaCreature') {
      const creature = ShoalTalesData.creaturesSeen[Math.floor(Math.random() * ShoalTalesData.creaturesSeen.length)];
      tray.push({ id, kind: 'seaCreature', name: creature.name, creatureId: creature.id, areaMultiplier });
    } else {
      const j = junkPool[Math.floor(Math.random() * junkPool.length)];
      tray.push({ id, kind: 'junk', name: j.name, bin: j.bin, baseCoins: j.baseCoins, weight: j.weight, description: j.description, areaMultiplier });
    }
  }
  return tray;
}

function getRoleForWorld(world, handle) {
  const h = (handle || '').trim().toLowerCase();
  if (!world || !h) return 'viewer';
  if ((world.creatorHandle || '').toLowerCase() === h) return 'creator';
  if (Array.isArray(world.members)) {
    const mem = world.members.find(m => (m.handle || '').toLowerCase() === h);
    if (mem && mem.role) return mem.role;
  }
  return 'viewer';
}

function isWorldMember(world, handle) {
  const h = (handle || '').trim().toLowerCase();
  if (!world || !h) return false;
  if ((world.creatorHandle || '').toLowerCase() === h) return true;
  return Array.isArray(world.members) && world.members.some(m => (m.handle || '').toLowerCase() === h);
}

function isSuperAdminHandle(handle) {
  const h = (handle || '').trim().toLowerCase();
  const u = db.users[h];
  return !!u && u.role === 'superadmin';
}

// Passwords are salted + hashed with scrypt (Node's built-in crypto, no new
// dependency needed) and stored as "scrypt:<saltHex>:<hashHex>". Accounts
// created before this existed still have their raw password string stored;
// verifyPassword() falls back to a plain comparison for those and the login
// handler transparently upgrades them to the hashed format on next
// successful login, so nobody gets locked out.
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  if (stored.startsWith('scrypt:')) {
    const parts = stored.split(':');
    if (parts.length !== 3) return false;
    const [, salt, hashHex] = parts;
    try {
      const candidate = crypto.scryptSync(password, salt, 64);
      const expected = Buffer.from(hashHex, 'hex');
      return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
    } catch (e) {
      return false;
    }
  }
  // Legacy plaintext account, pre-dating password hashing.
  return stored === password;
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const [reqPath, queryString] = (req.url || '/').split('?');
  const query = new URLSearchParams(queryString || '');

  // Auto-Sync endpoint for zero-button seamless restore upon redeployment
  if (reqPath === '/api/sync/auto-sync' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const snapshot = payload.snapshot || payload;
      const userHandle = (payload.userHandle || '').trim().toLowerCase();

      if (snapshot.worlds && typeof snapshot.worlds === 'object') {
        db.worlds = { ...db.worlds, ...snapshot.worlds };
      }
      if (snapshot.channels && typeof snapshot.channels === 'object') {
        db.channels = { ...db.channels, ...snapshot.channels };
      }
      if (Array.isArray(snapshot.messages)) {
        const existingIds = new Set(db.messages.map(m => m.id));
        snapshot.messages.forEach(m => {
          if (!existingIds.has(m.id)) {
            db.messages.push(m);
            existingIds.add(m.id);
          }
        });
      }
      if (Array.isArray(snapshot.dmMessages)) {
        const existingDmIds = new Set(db.dmMessages.map(d => d.id));
        snapshot.dmMessages.forEach(d => {
          if (!existingDmIds.has(d.id)) {
            db.dmMessages.push(d);
            existingDmIds.add(d.id);
          }
        });
      }
      if (Array.isArray(snapshot.wikiEntries)) {
        const existingWikiIds = new Set(db.wikiEntries.map(w => w.id));
        snapshot.wikiEntries.forEach(w => {
          if (!existingWikiIds.has(w.id)) {
            db.wikiEntries.push(w);
            existingWikiIds.add(w.id);
          }
        });
      }
      if (Array.isArray(snapshot.invites)) {
        const existingInvIds = new Set(db.invites.map(i => i.id));
        snapshot.invites.forEach(i => {
          if (!existingInvIds.has(i.id)) {
            db.invites.push(i);
            existingInvIds.add(i.id);
          }
        });
      }

      saveDatabaseSync();
      broadcast({ type: 'SERVER_DATA_RESTORED' });

      const userWorlds = Object.values(db.worlds).filter(w => {
        if ((w.creatorHandle || '').toLowerCase() === userHandle) return true;
        if (Array.isArray(w.members) && w.members.some(m => (m.handle || '').toLowerCase() === userHandle)) return true;
        return false;
      });
      const userWorldIds = userWorlds.map(w => w.id);
      const userChannels = Object.values(db.channels).filter(ch => userWorldIds.includes(ch.worldId));
      const userMessages = db.messages.filter(m => userWorldIds.includes(m.worldId));
      const userWiki = db.wikiEntries.filter(w => userWorldIds.includes(w.worldId)).map(w => {
        const img = w.avatarUrl || w.coverUrl || w.imageUrl || '';
        return { ...w, avatarUrl: img, coverUrl: img, imageUrl: img };
      });
      const userDMs = db.dmMessages.filter(d => (d.senderHandle || '').toLowerCase() === userHandle || (d.recipientHandle || '').toLowerCase() === userHandle);
      const userInvites = db.invites.filter(inv => (inv.toHandle || '').toLowerCase() === userHandle && inv.status === 'pending');

      return sendJson(res, 200, {
        success: true,
        message: 'Server data auto-restored seamlessly',
        data: {
          worlds: userWorlds,
          channels: userChannels,
          messages: userMessages,
          wikiEntries: userWiki,
          dmMessages: userDMs,
          invites: userInvites
        }
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Backup & Restore Database
  if (reqPath === '/api/sync/backup' && req.method === 'GET') {
    return sendJson(res, 200, {
      worlds: db.worlds,
      channels: db.channels,
      messages: db.messages,
      dmMessages: db.dmMessages,
      wikiEntries: db.wikiEntries,
      invites: db.invites,
      exportedAt: new Date().toISOString()
    });
  }

  if (reqPath === '/api/sync/restore' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const snapshot = payload.snapshot || payload;

      let restoredCount = 0;
      if (snapshot.worlds && typeof snapshot.worlds === 'object') {
        db.worlds = { ...db.worlds, ...snapshot.worlds };
        restoredCount += Object.keys(snapshot.worlds).length;
      }
      if (snapshot.channels && typeof snapshot.channels === 'object') {
        db.channels = { ...db.channels, ...snapshot.channels };
      }
      if (Array.isArray(snapshot.messages)) {
        const existingIds = new Set(db.messages.map(m => m.id));
        snapshot.messages.forEach(m => {
          if (!existingIds.has(m.id)) {
            db.messages.push(m);
            existingIds.add(m.id);
          }
        });
      }
      if (Array.isArray(snapshot.dmMessages)) {
        const existingDmIds = new Set(db.dmMessages.map(d => d.id));
        snapshot.dmMessages.forEach(d => {
          if (!existingDmIds.has(d.id)) {
            db.dmMessages.push(d);
            existingDmIds.add(d.id);
          }
        });
      }
      if (Array.isArray(snapshot.wikiEntries)) {
        const existingWikiIds = new Set(db.wikiEntries.map(w => w.id));
        snapshot.wikiEntries.forEach(w => {
          if (!existingWikiIds.has(w.id)) {
            db.wikiEntries.push(w);
            existingWikiIds.add(w.id);
          }
        });
      }
      if (Array.isArray(snapshot.invites)) {
        const existingInvIds = new Set(db.invites.map(i => i.id));
        snapshot.invites.forEach(i => {
          if (!existingInvIds.has(i.id)) {
            db.invites.push(i);
            existingInvIds.add(i.id);
          }
        });
      }

      saveDatabaseSync();
      return sendJson(res, 200, { success: true, message: 'Database restored successfully', restoredCount });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 1. Health check
  if (reqPath === '/healthz' || reqPath === '/api/health') {
    return sendJson(res, 200, {
      status: 'healthy',
      activeClients: wsClients.size,
      totalUsers: Object.keys(db.users).length,
      totalWorlds: Object.keys(db.worlds).length,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  }

  // 2. Auth Endpoints
  if (reqPath === '/api/auth/login' && req.method === 'POST') {
    try {
      const { handle, password } = await parseJsonBody(req);
      if (!handle || !password) {
        return sendJson(res, 400, { error: 'Username (@handle) and password are required.' });
      }
      const normHandle = handle.trim().toLowerCase().startsWith('@') ? handle.trim().toLowerCase() : '@' + handle.trim().toLowerCase();
      const user = db.users[normHandle];
      if (!user) {
        return sendJson(res, 401, { error: `No account found for ${handle}. Please check your handle or create an account.` });
      }
      if (!verifyPassword(password, user.password)) {
        return sendJson(res, 401, { error: 'Incorrect password. Please try again.' });
      }
      if (!user.password.startsWith('scrypt:')) {
        user.password = hashPassword(password);
        saveDatabase();
      }
      return sendJson(res, 200, {
        success: true,
        user: {
          handle: user.handle,
          name: user.name,
          role: user.role || 'user',
          avatarUrl: user.avatarUrl,
          passkeys: user.passkeys || [],
          createdAt: user.createdAt,
          themeMode: user.themeMode,
          staticTheme: user.staticTheme
        }
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/auth/register' && req.method === 'POST') {
    try {
      const { handle, name, password, avatarUrl } = await parseJsonBody(req);
      if (!handle || !name || !password) {
        return sendJson(res, 400, { error: 'Display name, @handle, and password are required.' });
      }
      let h = handle.trim();
      if (!h.startsWith('@')) h = '@' + h;
      const normKey = h.toLowerCase();

      if (db.users[normKey]) {
        return sendJson(res, 409, { error: `The handle ${h} is already taken. Please choose another handle.` });
      }

      const newUser = {
        handle: h,
        name: name.trim(),
        password: hashPassword(password),
        role: 'user',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name.trim())}`,
        passkeys: [],
        createdAt: new Date().toISOString()
      };

      db.users[normKey] = newUser;
      saveDatabase();
      broadcast({ type: 'USER_REGISTERED', user: { handle: newUser.handle, name: newUser.name, avatarUrl: newUser.avatarUrl } });

      return sendJson(res, 201, {
        success: true,
        user: {
          handle: newUser.handle,
          name: newUser.name,
          role: newUser.role,
          avatarUrl: newUser.avatarUrl,
          passkeys: newUser.passkeys,
          createdAt: newUser.createdAt
        }
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/auth/change-password' && req.method === 'POST') {
    try {
      const { handle, newPassword } = await parseJsonBody(req);
      if (!handle || !newPassword) return sendJson(res, 400, { error: 'Missing handle or new password' });
      const normKey = handle.trim().toLowerCase();
      if (!db.users[normKey]) return sendJson(res, 404, { error: 'User not found' });
      db.users[normKey].password = hashPassword(newPassword);
      saveDatabase();
      return sendJson(res, 200, { success: true, message: 'Password updated successfully' });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/auth/update-profile' && req.method === 'POST') {
    try {
      const { handle, name, avatarUrl, themeMode, staticTheme } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const normKey = handle.trim().toLowerCase();
      const u = db.users[normKey];
      if (!u) return sendJson(res, 404, { error: 'User not found' });
      if (name) u.name = name.trim();
      if (avatarUrl) u.avatarUrl = avatarUrl;
      if (themeMode === 'per-world' || themeMode === 'static') u.themeMode = themeMode;
      if (staticTheme) u.staticTheme = staticTheme;
      saveDatabase();
      broadcast({ type: 'PROFILE_UPDATED', user: { handle: u.handle, name: u.name, avatarUrl: u.avatarUrl } });
      return sendJson(res, 200, {
        success: true,
        user: {
          handle: u.handle,
          name: u.name,
          role: u.role,
          avatarUrl: u.avatarUrl,
          passkeys: u.passkeys || [],
          createdAt: u.createdAt,
          themeMode: u.themeMode,
          staticTheme: u.staticTheme
        }
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/auth/passkey-register' && req.method === 'POST') {
    try {
      const { handle, credentialId } = await parseJsonBody(req);
      const normKey = (handle || '').trim().toLowerCase();
      if (!db.users[normKey]) return sendJson(res, 404, { error: 'User not found' });
      if (!db.users[normKey].passkeys) db.users[normKey].passkeys = [];
      if (!db.users[normKey].passkeys.includes(credentialId)) {
        db.users[normKey].passkeys.push(credentialId);
      }
      saveDatabase();
      return sendJson(res, 200, { success: true, passkeys: db.users[normKey].passkeys });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/auth/passkey-login' && req.method === 'POST') {
    try {
      const { credentialId } = await parseJsonBody(req);
      const found = Object.values(db.users).find(u => (u.passkeys || []).includes(credentialId));
      if (found) {
        return sendJson(res, 200, {
          success: true,
          user: {
            handle: found.handle,
            name: found.name,
            role: found.role || 'user',
            avatarUrl: found.avatarUrl,
            passkeys: found.passkeys || [],
            createdAt: found.createdAt,
            themeMode: found.themeMode,
            staticTheme: found.staticTheme
          }
        });
      }
      return sendJson(res, 401, { error: 'Passkey not recognized.' });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/auth/delete-account' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      const normKey = (handle || '').trim().toLowerCase();
      if (!db.users[normKey]) return sendJson(res, 404, { error: 'Account not found' });

      const deletedWorldIds = [];
      for (const [wId, w] of Object.entries(db.worlds)) {
        if ((w.creatorHandle || '').toLowerCase() === normKey) {
          deletedWorldIds.push(wId);
          delete db.worlds[wId];
        }
      }

      for (const [cId, ch] of Object.entries(db.channels)) {
        if (deletedWorldIds.includes(ch.worldId)) {
          delete db.channels[cId];
        }
      }
      db.messages = db.messages.filter(m => !deletedWorldIds.includes(m.worldId));
      db.wikiEntries = db.wikiEntries.filter(w => !deletedWorldIds.includes(w.worldId) && (w.authorHandle || '').toLowerCase() !== normKey);

      for (const w of Object.values(db.worlds)) {
        if (Array.isArray(w.members)) {
          w.members = w.members.filter(m => (m.handle || '').toLowerCase() !== normKey);
        }
      }

      db.dmMessages = db.dmMessages.filter(d => (d.senderHandle || '').toLowerCase() !== normKey && (d.recipientHandle || '').toLowerCase() !== normKey);
      db.invites = db.invites.filter(inv => (inv.fromHandle || '').toLowerCase() !== normKey && (inv.toHandle || '').toLowerCase() !== normKey);
      db.pushSubscriptions = db.pushSubscriptions.filter(s => (s.handle || '').toLowerCase() !== normKey);
      db.scratchpadNotes = db.scratchpadNotes.filter(n => (n.handle || '').toLowerCase() !== normKey);

      delete db.users[normKey];
      saveDatabase();

      broadcast({ type: 'ACCOUNT_DELETED', handle, deletedWorldIds });
      return sendJson(res, 200, { success: true, message: 'Account permanently deleted' });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 3. Bootstrap & Sync Data
  if (reqPath === '/api/bootstrap' && req.method === 'GET') {
    const rawHandle = query.get('handle') || '';
    const normKey = rawHandle.trim().toLowerCase();

    const userWorlds = Object.values(db.worlds).filter(w => {
      if ((w.creatorHandle || '').toLowerCase() === normKey) return true;
      if (Array.isArray(w.members) && w.members.some(m => (m.handle || '').toLowerCase() === normKey)) return true;
      return false;
    });

    const userWorldIds = userWorlds.map(w => w.id);
    const userChannels = Object.values(db.channels).filter(ch => userWorldIds.includes(ch.worldId));
    const userMessages = db.messages.filter(m => userWorldIds.includes(m.worldId));
    const userWiki = db.wikiEntries.filter(w => userWorldIds.includes(w.worldId)).map(w => {
      const img = w.avatarUrl || w.coverUrl || w.imageUrl || '';
      return {
        ...w,
        avatarUrl: img,
        coverUrl: img,
        imageUrl: img
      };
    });
    const userDMs = db.dmMessages.filter(d => (d.senderHandle || '').toLowerCase() === normKey || (d.recipientHandle || '').toLowerCase() === normKey);
    const userInvites = db.invites.filter(inv => (inv.toHandle || '').toLowerCase() === normKey && inv.status === 'pending');
    // Private, per-account scratch pad notes - never returned for any handle but the caller's own.
    const userScratchpadNotes = db.scratchpadNotes.filter(n => (n.handle || '').toLowerCase() === normKey);

    const directory = Object.values(db.users).map(u => ({
      handle: u.handle,
      name: u.name,
      avatarUrl: u.avatarUrl
    }));

    const userObj = db.users[normKey] ? {
      handle: db.users[normKey].handle,
      name: db.users[normKey].name,
      role: db.users[normKey].role,
      avatarUrl: db.users[normKey].avatarUrl,
      passkeys: db.users[normKey].passkeys || [],
      createdAt: db.users[normKey].createdAt,
      themeMode: db.users[normKey].themeMode,
      staticTheme: db.users[normKey].staticTheme
    } : null;

    return sendJson(res, 200, {
      user: userObj,
      worlds: userWorlds,
      channels: userChannels,
      messages: userMessages,
      wikiEntries: userWiki,
      dmMessages: userDMs,
      invites: userInvites,
      scratchpadNotes: userScratchpadNotes,
      directory
    });
  }

  // 4. Worlds Endpoints
  if (reqPath === '/api/worlds' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const { name, tagline, description, visualTheme, creatorHandle, creatorName, coverUrl } = payload;
      if (!name || !creatorHandle) {
        return sendJson(res, 400, { error: 'World name and creator handle required' });
      }

      const worldId = `world_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newWorld = {
        id: worldId,
        name: name.trim(),
        genre: payload.genre || 'Roleplay Realm',
        tagline: tagline ? tagline.trim() : 'An unwritten story awaits.',
        description: description ? description.trim() : '',
        visualTheme: visualTheme || 'modern',
        coverUrl: coverUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
        creatorHandle: creatorHandle,
        createdAt: new Date().toISOString(),
        members: [{
          handle: creatorHandle,
          name: creatorName || creatorHandle.replace('@', ''),
          role: 'creator',
          joinedAt: new Date().toISOString()
        }]
      };

      db.worlds[worldId] = newWorld;

      // Seed starter channels:
      // 1. #main-roleplay
      // 2. #ooc-lounge
      const starterChannels = [
        {
          id: `ch_${worldId}_main_roleplay`,
          worldId,
          name: 'main-roleplay',
          category: 'Roleplay',
          description: `Primary roleplay storytelling and in-character scenes for ${newWorld.name}`,
          topic: 'Act 1: The journey begins'
        },
        {
          id: `ch_${worldId}_ooc_lounge`,
          worldId,
          name: 'ooc-lounge',
          category: 'Discussion',
          description: 'Out-of-character chat, plot coordination, and player questions',
          topic: 'OOC discussion & planning'
        }
      ];

      starterChannels.forEach(c => {
        db.channels[c.id] = c;
      });

      saveDatabase();
      broadcast({ type: 'WORLD_CREATED', world: newWorld, channels: starterChannels });

      return sendJson(res, 201, { world: newWorld, channels: starterChannels });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Update World Profile (Name, Tagline, Description, Genre, Theme, Members)
  if (reqPath.startsWith('/api/worlds/') && !reqPath.includes('/transfer') && !reqPath.includes('/members') && !reqPath.includes('/join') && !reqPath.includes('/leave') && (req.method === 'PUT' || req.method === 'PATCH' || (req.method === 'POST' && !reqPath.endsWith('/worlds')))) {
    try {
      const worldId = reqPath.replace('/api/worlds/', '').split('/')[0];
      const w = db.worlds[worldId];
      if (!w) return sendJson(res, 404, { error: 'World not found' });

      const payload = await parseJsonBody(req);
      const callerHandle = payload.callerHandle || '';
      const role = getRoleForWorld(w, callerHandle);
      const isAdmin = isSuperAdminHandle(callerHandle);
      const changingMembers = Array.isArray(payload.members);

      if (changingMembers && role !== 'creator' && !isAdmin) {
        return sendJson(res, 403, { error: 'Only the World Creator can change member roles.' });
      }
      if (!changingMembers && role !== 'creator' && role !== 'editor' && !isAdmin) {
        return sendJson(res, 403, { error: 'Only the Creator or World Editors can edit this world.' });
      }

      if (payload.name) w.name = payload.name.trim();
      if (payload.tagline !== undefined) w.tagline = payload.tagline.trim();
      if (payload.description !== undefined) w.description = payload.description.trim();
      if (payload.genre !== undefined) w.genre = payload.genre.trim();
      if (payload.visualTheme !== undefined) w.visualTheme = payload.visualTheme;
      if (payload.coverUrl !== undefined) w.coverUrl = payload.coverUrl;
      if (changingMembers && (role === 'creator' || isAdmin)) w.members = payload.members;
      w.updatedAt = new Date().toISOString();

      saveDatabase();
      broadcast({ type: 'WORLD_UPDATED', world: w });
      return sendJson(res, 200, { success: true, world: w });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath.startsWith('/api/worlds/') && req.method === 'DELETE') {
    try {
      const worldId = reqPath.replace('/api/worlds/', '').split('/')[0];
      const w = db.worlds[worldId];
      if (!w) return sendJson(res, 404, { error: 'World not found' });

      const callerHandle = query.get('callerHandle') || '';
      const role = getRoleForWorld(w, callerHandle);
      if (role !== 'creator' && !isSuperAdminHandle(callerHandle)) {
        return sendJson(res, 403, { error: 'Only the World Creator can delete this world.' });
      }

      delete db.worlds[worldId];
      for (const [cId, ch] of Object.entries(db.channels)) {
        if (ch.worldId === worldId) delete db.channels[cId];
      }
      db.messages = db.messages.filter(m => m.worldId !== worldId);
      db.wikiEntries = db.wikiEntries.filter(w => w.worldId !== worldId);

      saveDatabase();
      broadcast({ type: 'WORLD_DELETED', worldId });
      return sendJson(res, 200, { success: true, worldId });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath.includes('/transfer') && req.method === 'POST') {
    try {
      const worldId = reqPath.split('/api/worlds/')[1].split('/transfer')[0];
      const { newCreatorHandle, currentHandle } = await parseJsonBody(req);
      const w = db.worlds[worldId];
      if (!w) return sendJson(res, 404, { error: 'World not found' });
      if ((w.creatorHandle || '').toLowerCase() !== (currentHandle || '').toLowerCase()) {
        return sendJson(res, 403, { error: 'Only the current creator can transfer ownership.' });
      }

      w.creatorHandle = newCreatorHandle;
      if (Array.isArray(w.members)) {
        const oldM = w.members.find(m => (m.handle || '').toLowerCase() === currentHandle.toLowerCase());
        if (oldM) oldM.role = 'editor';
        const newM = w.members.find(m => (m.handle || '').toLowerCase() === newCreatorHandle.toLowerCase());
        if (newM) {
          newM.role = 'creator';
        } else {
          w.members.push({ handle: newCreatorHandle, role: 'creator', joinedAt: new Date().toISOString() });
        }
      }

      saveDatabase();
      broadcast({ type: 'WORLD_OWNERSHIP_TRANSFERRED', worldId, newCreatorHandle });
      return sendJson(res, 200, { success: true, world: w });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 5. Invites & Joining Worlds
  if (reqPath === '/api/invites' && req.method === 'POST') {
    try {
      const { worldId, fromHandle, toHandle, role } = await parseJsonBody(req);
      const w = db.worlds[worldId];
      if (!w) return sendJson(res, 404, { error: 'World not found' });

      let normTo = toHandle.trim();
      if (!normTo.startsWith('@')) normTo = '@' + normTo;

      const chosenRole = (role === 'editor' ? 'editor' : 'viewer');

      const invite = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        worldId,
        worldName: w.name,
        fromHandle,
        toHandle: normTo,
        role: chosenRole,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      db.invites.push(invite);

      const dm = {
        id: `dm_inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderHandle: fromHandle,
        senderName: fromHandle.replace('@', ''),
        recipientHandle: normTo,
        content: `I invited you to join the world **${w.name}** as **${chosenRole === 'editor' ? 'World Editor' : 'Viewer'}**!`,
        inviteId: invite.id,
        inviteWorldId: worldId,
        inviteWorldName: w.name,
        inviteRole: chosenRole,
        timestamp: new Date().toISOString(),
        status: 'delivered'
      };
      db.dmMessages.push(dm);

      saveDatabase();
      broadcast({ type: 'NEW_INVITE', invite, dm });
      sendPushToHandles([normTo], {
        title: 'World Invitation',
        body: `${fromHandle} invited you to join "${w.name}"`,
        tag: 'invite',
        url: '/'
      }).catch(() => {});
      return sendJson(res, 201, { success: true, invite, dm });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath.startsWith('/api/invites/') && reqPath.endsWith('/respond') && req.method === 'POST') {
    try {
      const inviteId = reqPath.split('/api/invites/')[1].split('/respond')[0];
      const { handle, action } = await parseJsonBody(req);
      const inv = db.invites.find(i => i.id === inviteId);
      if (!inv) return sendJson(res, 404, { error: 'Invite not found' });

      inv.status = action === 'accept' ? 'accepted' : 'declined';

      let assignedRole = inv.role || 'viewer';
      const w = db.worlds[inv.worldId];
      let worldChannels = [];

      if (action === 'accept' && w) {
        if (!Array.isArray(w.members)) w.members = [];
        const existingMember = w.members.find(m => (m.handle || '').toLowerCase() === handle.toLowerCase());
        if (existingMember) {
          existingMember.role = assignedRole;
        } else {
          w.members.push({ handle, role: assignedRole, joinedAt: new Date().toISOString() });
        }
        worldChannels = Object.values(db.channels).filter(c => c.worldId === w.id);
      }

      saveDatabase();
      broadcast({ type: 'INVITE_RESPONDED', inviteId, action, worldId: inv.worldId, handle, role: assignedRole });
      if (action === 'accept' && w) {
        broadcast({ type: 'WORLD_MEMBERS_UPDATED', world: w, channels: worldChannels, member: { handle, role: assignedRole } });
      }
      return sendJson(res, 200, { success: true, invite: inv, world: w, channels: worldChannels, role: assignedRole });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath.startsWith('/api/worlds/') && reqPath.endsWith('/join') && req.method === 'POST') {
    try {
      const worldId = reqPath.split('/api/worlds/')[1].split('/join')[0];
      const { handle, role } = await parseJsonBody(req);
      const w = db.worlds[worldId];
      if (!w) return sendJson(res, 404, { error: 'World not found' });

      // Find any pending invite for this user and world
      const inv = db.invites.find(i => i.worldId === worldId && (i.toHandle || '').toLowerCase() === handle.toLowerCase() && i.status === 'pending');
      let assignedRole = (role === 'editor' || (inv && inv.role === 'editor')) ? 'editor' : 'viewer';
      if (inv) inv.status = 'accepted';

      if (!Array.isArray(w.members)) w.members = [];
      const existingMember = w.members.find(m => (m.handle || '').toLowerCase() === handle.toLowerCase());
      if (existingMember) {
        existingMember.role = assignedRole;
      } else {
        w.members.push({ handle, role: assignedRole, joinedAt: new Date().toISOString() });
      }

      const worldChannels = Object.values(db.channels).filter(c => c.worldId === w.id);
      saveDatabase();

      broadcast({ type: 'WORLD_MEMBERS_UPDATED', world: w, channels: worldChannels, member: { handle, role: assignedRole } });
      return sendJson(res, 200, { success: true, world: w, channels: worldChannels, role: assignedRole });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath.startsWith('/api/worlds/') && reqPath.endsWith('/leave') && req.method === 'POST') {
    try {
      const worldId = reqPath.split('/api/worlds/')[1].split('/leave')[0];
      const { handle } = await parseJsonBody(req);
      const w = db.worlds[worldId];
      if (!w) return sendJson(res, 404, { error: 'World not found' });

      const hKey = (handle || '').toLowerCase();
      if ((w.creatorHandle || '').toLowerCase() === hKey) {
        return sendJson(res, 400, { error: 'The Creator cannot leave their own world. Transfer ownership or delete the world instead.' });
      }

      const wasMember = (w.members || []).some(m => (m.handle || '').toLowerCase() === hKey);
      if (!wasMember) return sendJson(res, 404, { error: 'You are not a member of this world.' });

      w.members = (w.members || []).filter(m => (m.handle || '').toLowerCase() !== hKey);
      saveDatabase();

      const worldChannels = Object.values(db.channels).filter(c => c.worldId === w.id);
      broadcast({ type: 'WORLD_MEMBERS_UPDATED', world: w, channels: worldChannels });
      return sendJson(res, 200, { success: true, world: w });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 6. Channels
  if (reqPath === '/api/channels' && req.method === 'POST') {
    try {
      const { worldId, name, description, topic, category, callerHandle } = await parseJsonBody(req);
      const w = db.worlds[worldId];
      if (!w) return sendJson(res, 404, { error: 'World not found' });

      const role = getRoleForWorld(w, callerHandle);
      if (role !== 'creator' && role !== 'editor' && !isSuperAdminHandle(callerHandle)) {
        return sendJson(res, 403, { error: 'Only the Creator or World Editors can create channels.' });
      }

      const normName = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/^#/, '');
      const channelId = `ch_${worldId}_${normName}_${Date.now()}`;
      const newChan = {
        id: channelId,
        worldId,
        name: normName,
        category: category || 'General',
        description: description ? description.trim() : '',
        topic: topic ? topic.trim() : '',
        archived: false
      };

      db.channels[channelId] = newChan;
      saveDatabase();
      broadcast({ type: 'CHANNEL_CREATED', channel: newChan });
      return sendJson(res, 201, { channel: newChan });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath.startsWith('/api/channels/') && reqPath.endsWith('/archive') && req.method === 'POST') {
    try {
      const channelId = reqPath.split('/api/channels/')[1].split('/archive')[0];
      const { callerHandle, archived } = await parseJsonBody(req);
      const ch = db.channels[channelId];
      if (!ch) return sendJson(res, 404, { error: 'Channel not found' });

      const w = db.worlds[ch.worldId];
      const role = getRoleForWorld(w, callerHandle);
      if (role !== 'creator' && role !== 'editor' && !isSuperAdminHandle(callerHandle)) {
        return sendJson(res, 403, { error: 'Only the Creator or World Editors can archive channels.' });
      }

      ch.archived = !!archived;
      saveDatabase();
      broadcast({ type: 'CHANNEL_UPDATED', channel: ch });
      return sendJson(res, 200, { success: true, channel: ch });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 7. World Messages
  if (reqPath === '/api/messages' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);

      // Only the creator of a character/NPC may speak as it in chat.
      const speakerType = payload.persona?.type;
      const characterId = payload.persona?.characterId;
      if ((speakerType === 'IC' || speakerType === 'NPC') && characterId) {
        const linkedEntry = db.wikiEntries.find(w => w.id === characterId);
        const isAuthor = linkedEntry && (linkedEntry.authorHandle || '').toLowerCase() === (payload.narratorHandle || '').toLowerCase();
        if (!linkedEntry || !isAuthor) {
          return sendJson(res, 403, { error: "Only the character's creator can speak as it." });
        }
      }

      const msg = {
        id: payload.clientMessageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        worldId: payload.worldId,
        channelId: payload.channelId,
        speakerName: payload.persona?.name || 'Storyteller',
        speakerType: payload.persona?.type || 'IC',
        speakerHandle: payload.persona?.handle || payload.narratorHandle,
        avatarUrl: payload.persona?.avatarUrl,
        characterId: payload.persona?.characterId,
        narratorName: payload.narratorName,
        narratorHandle: payload.narratorHandle,
        content: payload.content || '',
        imageUrl: payload.imageUrl || null,
        timestamp: new Date().toISOString()
      };

      db.messages.push(msg);
      if (db.messages.length > 5000) {
        db.messages = db.messages.slice(-5000);
      }

      saveDatabase();
      broadcast({ type: 'NEW_MESSAGE', message: msg });

      const msgWorld = db.worlds[msg.worldId];
      if (msgWorld) {
        const senderKey = (msg.speakerHandle || msg.narratorHandle || '').toLowerCase();
        const otherHandles = (msgWorld.members || [])
          .map(m => m.handle)
          .filter(h => (h || '').toLowerCase() !== senderKey);
        sendPushToHandles(otherHandles, {
          title: `${msg.speakerName} in ${msgWorld.name}`,
          body: msg.content || (msg.imageUrl ? 'Sent an image' : 'Sent a message'),
          tag: `chat-${msg.channelId}`,
          url: '/'
        }).catch(() => {});
      }

      return sendJson(res, 201, { message: msg });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath.startsWith('/api/messages/') && req.method === 'PUT') {
    try {
      const messageId = reqPath.replace('/api/messages/', '').split('?')[0];
      const { content, callerHandle } = await parseJsonBody(req);
      const msg = db.messages.find(m => m.id === messageId);
      if (!msg) return sendJson(res, 404, { error: 'Message not found' });

      // Only the original sender may edit their own message.
      const isAuthor = (msg.narratorHandle || '').toLowerCase() === (callerHandle || '').toLowerCase();
      if (!isAuthor) return sendJson(res, 403, { error: 'You can only edit your own messages.' });

      if (typeof content !== 'string' || !content.trim()) {
        return sendJson(res, 400, { error: 'Message content cannot be empty.' });
      }

      msg.content = content;
      msg.edited = true;
      msg.editedAt = new Date().toISOString();

      saveDatabase();
      broadcast({ type: 'MESSAGE_UPDATED', message: msg });
      return sendJson(res, 200, { message: msg });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath.startsWith('/api/messages/') && req.method === 'DELETE') {
    try {
      const messageId = reqPath.replace('/api/messages/', '').split('?')[0];
      const callerHandle = query.get('callerHandle') || '';
      const msg = db.messages.find(m => m.id === messageId);
      if (!msg) return sendJson(res, 404, { error: 'Message not found' });

      // Only the message's own sender, or the world's Creator, may delete it.
      const isAuthor = (msg.narratorHandle || '').toLowerCase() === callerHandle.toLowerCase();
      const world = db.worlds[msg.worldId];
      const isWorldCreator = (world?.creatorHandle || '').toLowerCase() === callerHandle.toLowerCase();
      if (!isAuthor && !isWorldCreator) {
        return sendJson(res, 403, { error: 'You can only delete your own messages, unless you are the Creator of this world.' });
      }

      db.messages = db.messages.filter(m => m.id !== messageId);
      saveDatabase();
      broadcast({ type: 'MESSAGE_DELETED', messageId, channelId: msg.channelId, worldId: msg.worldId });
      return sendJson(res, 200, { success: true, messageId });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 8. Direct Messages (DMs)
  if (reqPath === '/api/dms' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      let rHandle = (payload.recipientHandle || '').trim();
      if (!rHandle.startsWith('@')) rHandle = '@' + rHandle;

      const senderKey = (payload.senderHandle || '').trim().toLowerCase();
      const senderUser = db.users[senderKey];
      const dm = {
        id: payload.clientMessageId || `dm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderHandle: payload.senderHandle,
        senderName: payload.senderName || senderUser?.name || payload.senderHandle.replace('@', ''),
        senderAvatarUrl: payload.senderAvatarUrl || senderUser?.avatarUrl || null,
        recipientHandle: rHandle,
        content: payload.content || '',
        imageUrl: payload.imageUrl || null,
        inviteWorldId: payload.inviteWorldId || null,
        inviteWorldName: payload.inviteWorldName || null,
        timestamp: new Date().toISOString(),
        status: 'delivered'
      };

      db.dmMessages.push(dm);
      saveDatabase();
      broadcast({ type: 'NEW_DM', message: dm });
      sendPushToHandles([dm.recipientHandle], {
        title: `New message from ${dm.senderName}`,
        body: dm.content || (dm.imageUrl ? 'Sent an image' : 'Sent a message'),
        tag: 'dm',
        url: '/'
      }).catch(() => {});
      return sendJson(res, 201, { message: dm });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/dms/read' && req.method === 'POST') {
    try {
      const { readerHandle, contactHandle } = await parseJsonBody(req);
      const rKey = (readerHandle || '').toLowerCase();
      const cKey = (contactHandle || '').toLowerCase();
      let updatedCount = 0;

      db.dmMessages.forEach(m => {
        if ((m.recipientHandle || '').toLowerCase() === rKey && (m.senderHandle || '').toLowerCase() === cKey && m.status !== 'read') {
          m.status = 'read';
          m.readAt = new Date().toISOString();
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        saveDatabase();
        broadcast({ type: 'DMS_READ', readerHandle, contactHandle });
      }
      return sendJson(res, 200, { success: true, updatedCount });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Single-message delete - checked before the thread-delete route below since both
  // start with /api/dms/ and this one needs the more specific match to win.
  if (reqPath.startsWith('/api/dms/message/') && req.method === 'DELETE') {
    try {
      const messageId = reqPath.replace('/api/dms/message/', '').split('?')[0];
      const callerHandle = query.get('callerHandle') || '';
      const dm = db.dmMessages.find(d => d.id === messageId);
      if (!dm) return sendJson(res, 404, { error: 'Message not found' });

      // Only the original sender may delete their own DM.
      const isAuthor = (dm.senderHandle || '').toLowerCase() === callerHandle.toLowerCase();
      if (!isAuthor) return sendJson(res, 403, { error: 'You can only delete your own messages.' });

      db.dmMessages = db.dmMessages.filter(d => d.id !== messageId);
      saveDatabase();
      broadcast({ type: 'DM_DELETED', messageId, senderHandle: dm.senderHandle, recipientHandle: dm.recipientHandle });
      return sendJson(res, 200, { success: true, messageId });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath.startsWith('/api/dms/') && req.method === 'DELETE') {
    try {
      const contactHandle = decodeURIComponent(reqPath.replace('/api/dms/', '').split('?')[0]);
      const userHandle = query.get('userHandle') || '';
      const cKey = contactHandle.toLowerCase();
      const uKey = userHandle.toLowerCase();

      db.dmMessages = db.dmMessages.filter(d => {
        const s = (d.senderHandle || '').toLowerCase();
        const r = (d.recipientHandle || '').toLowerCase();
        const matches = (s === uKey && r === cKey) || (s === cKey && r === uKey);
        return !matches;
      });

      saveDatabase();
      broadcast({ type: 'DMS_THREAD_DELETED', userHandle, contactHandle });
      return sendJson(res, 200, { success: true, contactHandle });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath.startsWith('/api/dms/') && req.method === 'PUT') {
    try {
      const messageId = reqPath.replace('/api/dms/', '').split('?')[0];
      const { content, callerHandle } = await parseJsonBody(req);
      const dm = db.dmMessages.find(d => d.id === messageId);
      if (!dm) return sendJson(res, 404, { error: 'Message not found' });

      // Only the original sender may edit their own message.
      const isAuthor = (dm.senderHandle || '').toLowerCase() === (callerHandle || '').toLowerCase();
      if (!isAuthor) return sendJson(res, 403, { error: 'You can only edit your own messages.' });

      if (typeof content !== 'string' || !content.trim()) {
        return sendJson(res, 400, { error: 'Message content cannot be empty.' });
      }

      dm.content = content;
      dm.edited = true;
      dm.editedAt = new Date().toISOString();

      saveDatabase();
      broadcast({ type: 'DM_UPDATED', message: dm });
      return sendJson(res, 200, { message: dm });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 9. Wiki & Cast Endpoints
  if (reqPath === '/api/wiki' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const entry = payload.entry;
      const callerHandle = payload.callerHandle || '';
      if (!entry || !entry.worldId || !entry.title) {
        return sendJson(res, 400, { error: 'Missing required entry fields' });
      }

      const world = db.worlds[entry.worldId];
      const isChar = entry.category === 'character' || entry.category === 'npc';
      const isAdmin = isSuperAdminHandle(callerHandle);
      const worldRole = getRoleForWorld(world, callerHandle);
      const existingIndex = db.wikiEntries.findIndex(w => w.id === entry.id);
      const existing = existingIndex >= 0 ? db.wikiEntries[existingIndex] : null;

      if (existing) {
        if (isChar) {
          // No exceptions, not even Superadmin: only the character's own creator can edit it.
          const isAuthor = (existing.authorHandle || '').toLowerCase() === callerHandle.toLowerCase();
          if (!isAuthor) {
            return sendJson(res, 403, { error: "Only the character's creator can edit it." });
          }
        } else if (worldRole !== 'creator' && worldRole !== 'editor' && !isAdmin) {
          return sendJson(res, 403, { error: 'Only the Creator or World Editors can edit this entry.' });
        }
      } else if (isChar) {
        if (!isWorldMember(world, callerHandle) && !isAdmin) {
          return sendJson(res, 403, { error: 'You must be a member of this world to create a character here.' });
        }
        if ((entry.authorHandle || '').toLowerCase() !== callerHandle.toLowerCase()) {
          return sendJson(res, 403, { error: 'Cannot create a character on behalf of another user.' });
        }
      } else if (worldRole !== 'creator' && worldRole !== 'editor' && !isAdmin) {
        return sendJson(res, 403, { error: 'Only the Creator or World Editors can add wiki lore entries.' });
      }

      const img = entry.avatarUrl || entry.coverUrl || entry.imageUrl || '';
      const updatedEntry = {
        ...entry,
        avatarUrl: img,
        coverUrl: img,
        imageUrl: img,
        id: entry.id || `wiki_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        updatedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        db.wikiEntries[existingIndex] = updatedEntry;
      } else {
        db.wikiEntries.push(updatedEntry);
      }

      saveDatabase();
      broadcast({ type: 'WIKI_UPDATED', entry: updatedEntry });
      return sendJson(res, 200, { entry: updatedEntry });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath.startsWith('/api/wiki/') && req.method === 'DELETE') {
    try {
      const entryId = reqPath.replace('/api/wiki/', '').split('/')[0];
      const callerHandle = query.get('callerHandle') || '';
      const entry = db.wikiEntries.find(w => w.id === entryId);
      if (!entry) return sendJson(res, 404, { error: 'Entry not found' });

      const isChar = entry.category === 'character' || entry.category === 'npc';
      const isAdmin = isSuperAdminHandle(callerHandle);
      if (isChar) {
        // No exceptions, not even Superadmin: only the character's own creator can delete it.
        const isAuthor = (entry.authorHandle || '').toLowerCase() === callerHandle.toLowerCase();
        if (!isAuthor) {
          return sendJson(res, 403, { error: "Only the character's creator can delete it." });
        }
      } else {
        const world = db.worlds[entry.worldId];
        const worldRole = getRoleForWorld(world, callerHandle);
        if (worldRole !== 'creator' && worldRole !== 'editor' && !isAdmin) {
          return sendJson(res, 403, { error: 'Only the Creator or World Editors can delete this entry.' });
        }
      }

      db.wikiEntries = db.wikiEntries.filter(w => w.id !== entryId);
      saveDatabase();
      broadcast({ type: 'WIKI_DELETED', entryId, worldId: entry.worldId });
      return sendJson(res, 200, { success: true, entryId });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 9b. Push Notifications
  if (reqPath === '/api/push/vapid-public-key' && req.method === 'GET') {
    return sendJson(res, 200, { publicKey: (db.vapidKeys && db.vapidKeys.publicKey) || null });
  }

  if (reqPath === '/api/push/subscribe' && req.method === 'POST') {
    try {
      const { handle, subscription } = await parseJsonBody(req);
      if (!handle || !subscription || !subscription.endpoint) {
        return sendJson(res, 400, { error: 'Missing handle or subscription' });
      }
      db.pushSubscriptions = db.pushSubscriptions.filter(s => s.subscription.endpoint !== subscription.endpoint);
      db.pushSubscriptions.push({
        handle,
        subscription,
        createdAt: new Date().toISOString()
      });
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/push/unsubscribe' && req.method === 'POST') {
    try {
      const { endpoint } = await parseJsonBody(req);
      db.pushSubscriptions = db.pushSubscriptions.filter(s => s.subscription.endpoint !== endpoint);
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Sends one real push immediately and reports back exactly what happened,
  // instead of the fire-and-forget path every other push goes through
  // (sendPushToHandles only logs non-404/410 errors server-side and never
  // surfaces them to whoever triggered the notification) - lets someone
  // whose pushes "just don't arrive" get the actual underlying error
  // (wrong VAPID key, a malformed subscription, the push service rejecting
  // the payload, etc.) instead of only ever seeing silence.
  if (reqPath === '/api/push/test' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      if (!webpush) return sendJson(res, 503, { error: 'The web-push module is not installed on this server.' });
      if (!db.vapidKeys || !db.vapidKeys.publicKey) return sendJson(res, 503, { error: 'VAPID keys have not been initialized on this server yet.' });

      const key = handle.trim().toLowerCase();
      const subs = db.pushSubscriptions.filter(s => (s.handle || '').toLowerCase() === key);
      if (subs.length === 0) {
        return sendJson(res, 404, { error: 'No push subscription is stored for this account on this server. Try disabling and re-enabling push notifications in Settings first.' });
      }

      const payload = JSON.stringify({
        title: 'Test Notification',
        body: 'If you can see this, push notifications are working end to end.',
        tag: 'test',
        url: '/'
      });

      const results = await Promise.all(subs.map(async s => {
        try {
          await webpush.sendNotification(s.subscription, payload);
          return { endpoint: s.subscription.endpoint, success: true };
        } catch (err) {
          return {
            endpoint: s.subscription.endpoint,
            success: false,
            statusCode: err.statusCode || null,
            error: (err.body && String(err.body)) || err.message || 'Unknown error'
          };
        }
      }));

      return sendJson(res, 200, { success: results.some(r => r.success), results });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Removes every stored subscription for an account, regardless of which
  // device/browser it came from. "Disable on This Device" only ever removes
  // *this* device's own endpoint - it can't reach a stale entry left behind
  // by a different browser/device under the same account (e.g. one created
  // before a subscribe attempt from a new device silently failed to ever
  // reach the server - see the res.ok check added to the client's
  // subscribe() - leaving an old, unrelated entry as the only thing on
  // file). This is the only way to actually clear that out and get every
  // device subscribing fresh.
  if (reqPath === '/api/push/unsubscribe-all' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const key = handle.trim().toLowerCase();
      const before = db.pushSubscriptions.length;
      db.pushSubscriptions = db.pushSubscriptions.filter(s => (s.handle || '').toLowerCase() !== key);
      const removed = before - db.pushSubscriptions.length;
      if (removed > 0) saveDatabase();
      return sendJson(res, 200, { success: true, removed });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 9c. Scratch Pad Notes (private, per-account - never shared or broadcast)
  if (reqPath === '/api/scratchpad' && req.method === 'POST') {
    try {
      const { handle, entryId, content } = await parseJsonBody(req);
      if (!handle || !entryId) {
        return sendJson(res, 400, { error: 'Missing handle or entryId' });
      }
      const key = handle.toLowerCase();
      const existingIndex = db.scratchpadNotes.findIndex(n => (n.handle || '').toLowerCase() === key && n.entryId === entryId);
      const trimmed = (content || '').trim();

      if (!trimmed) {
        if (existingIndex >= 0) db.scratchpadNotes.splice(existingIndex, 1);
      } else if (existingIndex >= 0) {
        db.scratchpadNotes[existingIndex].content = content;
        db.scratchpadNotes[existingIndex].updatedAt = new Date().toISOString();
      } else {
        db.scratchpadNotes.push({
          id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          handle,
          entryId,
          content,
          updatedAt: new Date().toISOString()
        });
      }

      saveDatabase();
      // Intentionally no broadcast: scratch pad notes are private to the author.
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 11b. Shoal Tales (minigame) - core loop: dredging, sorting, selling, upgrades.
  // Account-level, not World-scoped. See docs/shoal-tales-spec/ for the design
  // and ARCHITECTURE.md for the server-authoritative-RNG rationale.
  if (reqPath === '/api/shoal-tales/save' && req.method === 'GET') {
    try {
      const handle = query.get('handle') || '';
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      // nextStation is derived (never persisted) so the stored save stays
      // clean - it's recomputed fresh on every GET.
      const withDerived = Object.assign({}, save, { nextStation: shoalNextStationInfo(save) });
      return sendJson(res, 200, { success: true, save: withDerived });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/dredge' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (save.tray.length > 0) {
        return sendJson(res, 400, { error: 'Clear your tray before dropping the dredge again.' });
      }
      const dredgeTimeSeconds = ShoalTalesEngine.dredgeTimeSeconds(save.depth, save.winchLevel, 0);
      const tray = generateShoalHaul(save);
      save.tray = tray;
      save.lastHaulDate = new Date().toISOString().slice(0, 10);
      save.allTimeStats.hauls += 1;
      saveDatabase();
      return sendJson(res, 200, { success: true, tray, dredgeTimeSeconds });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/sort' && req.method === 'POST') {
    try {
      const { handle, trayItemId, bin } = await parseJsonBody(req);
      if (!handle || !trayItemId || !bin) return sendJson(res, 400, { error: 'Missing handle, trayItemId or bin' });
      const save = getOrCreateShoalTalesSave(handle);
      const itemIndex = save.tray.findIndex(t => t.id === trayItemId);
      if (itemIndex < 0) return sendJson(res, 404, { error: 'That item is not in your tray.' });
      const item = save.tray[itemIndex];

      if (item.kind === 'fish') {
        if (bin !== 'cooler') {
          return sendJson(res, 400, { error: 'Fish can only go in the cooler.' });
        }
        // Golden finds are endgame-only (8th retirement+, 09-economy.md); this
        // stays inert (golden never true) until the Retiring phase lands.
        const goldenEligible = save.retirements >= 8;
        const golden = goldenEligible && Math.random() < 0.01;
        const value = ShoalTalesEngine.fishValue({
          base: item.baseCoins, streakCount: save.streak, area: item.areaMultiplier, bPayout: 0, bFish: 0, golden: golden
        });
        save.cooler.push({ id: 'fish_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), name: item.name, value: value, golden: golden, stage: 'raw', caughtAt: new Date().toISOString() });
        save.streak += 1;
        save.bestStreakThisRun = Math.max(save.bestStreakThisRun, save.streak);
        save.bestStreakEver = Math.max(save.bestStreakEver, save.streak);
        save.allTimeStats.fishOnIce += 1;
        save.allTimeStats.bestStreak = Math.max(save.allTimeStats.bestStreak, save.streak);
        save.tray.splice(itemIndex, 1);

        // "The first catch of each fish species logs it in the Collector's
        // Log" - automatic, unlike curios which require an explicit Log choice.
        const fishData = ShoalTalesData.fish.find(f => f.name === item.name);
        let newlyLogged = false;
        if (fishData) {
          const existing = save.collectorsLog.fish[fishData.id];
          if (!existing || (golden && !existing.golden)) {
            save.collectorsLog.fish[fishData.id] = { foundAt: new Date().toISOString(), golden: golden };
            newlyLogged = !existing;
            if (golden) save.goldenLog.push({ kind: 'fish', id: fishData.id, foundAt: new Date().toISOString() });
          }
        }
        saveDatabase();
        return sendJson(res, 200, { success: true, correct: true, kind: 'fish', value, newStreak: save.streak, golden, newlyLogged });
      }

      // Junk: validate the target is one of the 7 real bins (never 'cooler').
      if (!ShoalTalesEngine.BINS.includes(bin)) {
        return sendJson(res, 400, { error: 'Not a real bin.' });
      }
      const move = ShoalTalesEngine.stationMoveFor(item.name);
      const stationInstalled = !!(move && save.stationsInstalled.includes(move.station));
      const effectiveCorrectBin = stationInstalled ? move.newBin : item.bin;
      const correct = bin === effectiveCorrectBin;
      const movedByStation = correct && stationInstalled;

      let value;
      if (correct) {
        value = ShoalTalesEngine.correctSortValue({
          base: item.baseCoins, streakCount: save.streak, bPayout: 0, bBin: 0, movedByStation: movedByStation, area: item.areaMultiplier
        });
        save.streak += 1;
      } else {
        value = ShoalTalesEngine.wrongSortValue(item.baseCoins, 0, item.areaMultiplier);
        save.streak = 0;
      }
      save.bestStreakThisRun = Math.max(save.bestStreakThisRun, save.streak);
      save.bestStreakEver = Math.max(save.bestStreakEver, save.streak);
      save.allTimeStats.bestStreak = Math.max(save.allTimeStats.bestStreak, save.streak);
      save.sortedGoods[bin].units += (1 + item.weight);
      save.sortedGoods[bin].value += value;
      save.allTimeStats.junkSorted += 1;
      if (correct) shoalTrackStationProgress(save, 'sortedBin', 1 + item.weight, bin);
      save.tray.splice(itemIndex, 1);
      saveDatabase();
      return sendJson(res, 200, { success: true, correct, kind: 'junk', value, newStreak: save.streak, effectiveCorrectBin, bin });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/sell' && req.method === 'POST') {
    try {
      const { handle, what } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      // "Until the Town opens there is no selling" (07-story.md) - dress your
      // first fish (Cutting Board, always free/available) to open it.
      if (!save.townOpen) {
        return sendJson(res, 400, { error: 'The Town is not open yet. Dress a fish first.' });
      }
      const sellWhat = what || 'all';
      let coinsEarned = 0;

      if (sellWhat === 'goods' || sellWhat === 'all') {
        ShoalTalesEngine.BINS.forEach(b => {
          coinsEarned += save.sortedGoods[b].value;
          save.sortedGoods[b] = { units: 0, value: 0 };
        });
      }
      if (sellWhat === 'fish' || sellWhat === 'all') {
        save.cooler.forEach(f => { coinsEarned += f.value; });
        save.cooler = [];
      }
      ['knickKnacks', 'ingots', 'materials'].forEach(key => {
        if (sellWhat === key || sellWhat === 'all') {
          coinsEarned += save[key].value;
          save[key] = { units: 0, value: 0 };
        }
      });
      coinsEarned = Math.round(coinsEarned);
      save.coins += coinsEarned;
      save.lifetimeCoinsThisRun += coinsEarned;
      save.allTimeStats.coinsEarned += coinsEarned;
      saveDatabase();
      return sendJson(res, 200, { success: true, coinsEarned, coins: save.coins });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/upgrade' && req.method === 'POST') {
    try {
      const { handle, upgradeId } = await parseJsonBody(req);
      if (!handle || !upgradeId) return sendJson(res, 400, { error: 'Missing handle or upgradeId' });
      const save = getOrCreateShoalTalesSave(handle);
      const LEVEL_FIELD = { 'bigger-basket': 'basketLevel', 'faster-winch': 'winchLevel', 'soft-brush': 'brushLevel', 'lucky-charm': 'charmLevel' };
      const MAX_LEVEL = { 'bigger-basket': 29, 'faster-winch': 12, 'soft-brush': 3, 'lucky-charm': 10 };
      const field = LEVEL_FIELD[upgradeId];
      if (!field) return sendJson(res, 400, { error: 'Unknown upgrade.' });
      const currentLevel = save[field];
      if (currentLevel >= MAX_LEVEL[upgradeId]) {
        return sendJson(res, 400, { error: 'Already at max level.' });
      }
      const unlockScale = ShoalTalesEngine.retireGoalForRun(save.retirements + 1).unlockScale;
      const cost = ShoalTalesEngine.upgradeCost(upgradeId, currentLevel, unlockScale);
      if (save.coins < cost) {
        return sendJson(res, 400, { error: `Not enough coins (need ${cost}, have ${save.coins}).` });
      }
      save.coins -= cost;
      save[field] = currentLevel + 1;
      saveDatabase();
      return sendJson(res, 200, { success: true, upgradeId, newLevel: save[field], coinsSpent: cost, coins: save.coins });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/depth' && req.method === 'POST') {
    try {
      const { handle, depth } = await parseJsonBody(req);
      if (!handle || depth === undefined) return sendJson(res, 400, { error: 'Missing handle or depth' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.unlockedDepths.includes(depth)) {
        return sendJson(res, 400, { error: 'That depth is not unlocked yet.' });
      }
      save.depth = depth;
      saveDatabase();
      return sendJson(res, 200, { success: true, depth: save.depth });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/area' && req.method === 'POST') {
    try {
      const { handle, area } = await parseJsonBody(req);
      if (!handle || !area) return sendJson(res, 400, { error: 'Missing handle or area' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.unlockedAreas.includes(area)) {
        return sendJson(res, 400, { error: 'That area is not unlocked yet.' });
      }
      save.area = area;
      saveDatabase();
      return sendJson(res, 200, { success: true, area: save.area });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Scrub: identifies an Encrusted Curio (rolls which curio + its rarity) or
  // resolves a Strange Curio (one of the 6 magic curios - identified and kept
  // forever in one step, no further choice, per 06-curios.md).
  if (reqPath === '/api/shoal-tales/scrub' && req.method === 'POST') {
    try {
      const { handle, trayItemId } = await parseJsonBody(req);
      if (!handle || !trayItemId) return sendJson(res, 400, { error: 'Missing handle or trayItemId' });
      const save = getOrCreateShoalTalesSave(handle);
      const itemIndex = save.tray.findIndex(t => t.id === trayItemId);
      if (itemIndex < 0) return sendJson(res, 404, { error: 'That item is not in your tray.' });
      const item = save.tray[itemIndex];

      if (item.kind === 'magicCurio') {
        const remaining = ShoalTalesData.magicCurios.filter(m => save.magicCurios.indexOf(m.id) === -1);
        if (remaining.length === 0) return sendJson(res, 400, { error: 'All magic curios are already found.' });
        const found = remaining[Math.floor(Math.random() * remaining.length)];
        save.magicCurios.push(found.id);
        save.tray.splice(itemIndex, 1);
        save.allTimeStats.curiosScrubbed += 1;
        saveDatabase();
        return sendJson(res, 200, { success: true, kind: 'magicCurio', magicCurio: found, allSixFound: save.magicCurios.length >= 6 });
      }

      if (item.kind !== 'curio' || item.identified) {
        return sendJson(res, 400, { error: 'Nothing to scrub here.' });
      }
      const area = shoalAreaById(save.area);
      const curioPool = ShoalTalesData.curios.filter(c => c.area === area.name);
      if (curioPool.length === 0) return sendJson(res, 500, { error: 'No curios available to identify in this area.' });
      const picked = curioPool[Math.floor(Math.random() * curioPool.length)];
      const goldenEligible = save.retirements >= 8;
      const rarityShift = 0; // no rarity-boosting bonuses wired in yet (Glowing Pearl / set bonuses) - Economy phase.
      const rarity = ShoalTalesEngine.weightedPick(ShoalTalesEngine.curioRarityWeights(rarityShift));

      item.identified = true;
      item.name = picked.name;
      item.set = picked.set;
      item.bin = picked.bin;
      item.baseCoins = picked.baseCoins;
      item.description = picked.description;
      item.rarity = rarity;
      item.curioId = picked.id;
      item.golden = goldenEligible && Math.random() < 0.01;
      save.allTimeStats.curiosScrubbed += 1;
      saveDatabase();
      return sendJson(res, 200, { success: true, kind: 'curio', item });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Pry open a Sealed Crate: 50% coins, 30% two more junk items, 20% a curio.
  if (reqPath === '/api/shoal-tales/pry' && req.method === 'POST') {
    try {
      const { handle, trayItemId } = await parseJsonBody(req);
      if (!handle || !trayItemId) return sendJson(res, 400, { error: 'Missing handle or trayItemId' });
      const save = getOrCreateShoalTalesSave(handle);
      const itemIndex = save.tray.findIndex(t => t.id === trayItemId);
      if (itemIndex < 0) return sendJson(res, 404, { error: 'That item is not in your tray.' });
      const item = save.tray[itemIndex];
      if (item.kind !== 'crate') return sendJson(res, 400, { error: 'That is not a crate.' });

      const area = shoalAreaById(save.area);
      save.tray.splice(itemIndex, 1);
      save.allTimeStats.cratesOpened += 1;

      const roll = Math.random();
      let result;
      if (roll < 0.5) {
        const coins = Math.round((5 + Math.random() * 20) * item.areaMultiplier);
        save.coins += coins;
        save.allTimeStats.coinsEarned += coins;
        result = { outcome: 'coins', coins };
      } else if (roll < 0.8) {
        const junkPool = ShoalTalesData.junk.filter(j => j.foundIn === 'Everywhere' || j.foundIn === area.name);
        const newItems = [0, 1].map(i => {
          const j = junkPool[Math.floor(Math.random() * junkPool.length)];
          const newItem = { id: shoalNewTrayId('crate' + i), kind: 'junk', name: j.name, bin: j.bin, baseCoins: j.baseCoins, weight: j.weight, description: j.description, areaMultiplier: item.areaMultiplier };
          save.tray.push(newItem);
          return newItem;
        });
        result = { outcome: 'junk', items: newItems };
      } else {
        const curioPool = ShoalTalesData.curios.filter(c => c.area === area.name);
        const newItem = { id: shoalNewTrayId('cratecurio'), kind: 'curio', name: 'Encrusted Curio', identified: false, areaMultiplier: item.areaMultiplier };
        if (curioPool.length > 0) save.tray.push(newItem);
        result = { outcome: 'curio', item: curioPool.length > 0 ? newItem : null };
      }
      saveDatabase();
      return sendJson(res, 200, Object.assign({ success: true }, result, { tray: save.tray }));
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Uncork a Message in a Bottle: 35% a letter, otherwise becomes an empty
  // glass bottle (the real "Glass Bottle" junk item) to sort.
  if (reqPath === '/api/shoal-tales/uncork' && req.method === 'POST') {
    try {
      const { handle, trayItemId } = await parseJsonBody(req);
      if (!handle || !trayItemId) return sendJson(res, 400, { error: 'Missing handle or trayItemId' });
      const save = getOrCreateShoalTalesSave(handle);
      const itemIndex = save.tray.findIndex(t => t.id === trayItemId);
      if (itemIndex < 0) return sendJson(res, 404, { error: 'That item is not in your tray.' });
      const item = save.tray[itemIndex];
      if (item.kind !== 'bottle') return sendJson(res, 400, { error: 'That is not a bottle.' });

      save.tray.splice(itemIndex, 1);
      const unfoundLetters = ShoalTalesData.bottleLetters.filter(l => save.bottleLettersFound.indexOf(l.id) === -1);
      if (Math.random() < 0.35 && unfoundLetters.length > 0) {
        const letter = unfoundLetters[Math.floor(Math.random() * unfoundLetters.length)];
        save.bottleLettersFound.push(letter.id);
        saveDatabase();
        return sendJson(res, 200, { success: true, outcome: 'letter', letter, tray: save.tray });
      }
      const glassBottle = ShoalTalesData.junk.find(j => j.name === 'Glass Bottle');
      const newItem = { id: shoalNewTrayId('bottleglass'), kind: 'junk', name: glassBottle.name, bin: glassBottle.bin, baseCoins: glassBottle.baseCoins, weight: glassBottle.weight, description: glassBottle.description, areaMultiplier: item.areaMultiplier };
      save.tray.push(newItem);
      saveDatabase();
      return sendJson(res, 200, { success: true, outcome: 'emptyBottle', item: newItem, tray: save.tray });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Release a sea creature: 2-6 coins, first-of-kind logs it in Creatures Seen.
  if (reqPath === '/api/shoal-tales/release' && req.method === 'POST') {
    try {
      const { handle, trayItemId } = await parseJsonBody(req);
      if (!handle || !trayItemId) return sendJson(res, 400, { error: 'Missing handle or trayItemId' });
      const save = getOrCreateShoalTalesSave(handle);
      const itemIndex = save.tray.findIndex(t => t.id === trayItemId);
      if (itemIndex < 0) return sendJson(res, 404, { error: 'That item is not in your tray.' });
      const item = save.tray[itemIndex];
      if (item.kind !== 'seaCreature') return sendJson(res, 400, { error: 'That is not a sea creature.' });

      const coins = Math.round((2 + Math.random() * 4) * item.areaMultiplier);
      save.coins += coins;
      save.allTimeStats.coinsEarned += coins;
      save.allTimeStats.creaturesReleased += 1;
      const newlySeen = save.creaturesSeen.indexOf(item.creatureId) === -1;
      if (newlySeen) save.creaturesSeen.push(item.creatureId);
      save.tray.splice(itemIndex, 1);
      saveDatabase();
      return sendJson(res, 200, { success: true, coins, newlySeen, allFiveSeen: save.creaturesSeen.length >= 5 });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Resolve an identified curio: Log (museum it, no coins), Sell (coins now),
  // Store (keep for later), or Sort (break it down like junk).
  if (reqPath === '/api/shoal-tales/curio-action' && req.method === 'POST') {
    try {
      const { handle, trayItemId, action, bin } = await parseJsonBody(req);
      if (!handle || !trayItemId || !action) return sendJson(res, 400, { error: 'Missing handle, trayItemId or action' });
      const save = getOrCreateShoalTalesSave(handle);
      const itemIndex = save.tray.findIndex(t => t.id === trayItemId);
      if (itemIndex < 0) return sendJson(res, 404, { error: 'That item is not in your tray.' });
      const item = save.tray[itemIndex];
      if (item.kind !== 'curio' || !item.identified) {
        return sendJson(res, 400, { error: 'Scrub this curio first.' });
      }
      const fullValue = ShoalTalesEngine.curioValue(item.baseCoins, item.rarity, 0) * (item.golden ? 3 : 1);
      const RARITY_RANK = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3 };

      if (action === 'log') {
        const existing = save.collectorsLog.curios[item.curioId];
        const better = !existing || RARITY_RANK[item.rarity] > RARITY_RANK[existing.rarity] || (item.golden && !existing.golden);
        if (better) {
          save.collectorsLog.curios[item.curioId] = { rarity: item.rarity, golden: item.golden, foundAt: new Date().toISOString() };
          if (item.golden) save.goldenLog.push({ kind: 'curio', id: item.curioId, foundAt: new Date().toISOString() });
        }
        save.tray.splice(itemIndex, 1);
        saveDatabase();
        return sendJson(res, 200, { success: true, action: 'log', logged: better });
      }
      if (action === 'sell') {
        const coins = Math.round(fullValue);
        save.coins += coins;
        save.allTimeStats.coinsEarned += coins;
        save.tray.splice(itemIndex, 1);
        saveDatabase();
        return sendJson(res, 200, { success: true, action: 'sell', coins });
      }
      if (action === 'store') {
        save.storedCurios.push({ id: 'stored_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), curioId: item.curioId, name: item.name, set: item.set, bin: item.bin, baseCoins: item.baseCoins, rarity: item.rarity, golden: item.golden, storedAt: new Date().toISOString() });
        save.tray.splice(itemIndex, 1);
        saveDatabase();
        return sendJson(res, 200, { success: true, action: 'store' });
      }
      if (action === 'sort') {
        if (!bin || !ShoalTalesEngine.BINS.includes(bin)) return sendJson(res, 400, { error: 'Not a real bin.' });
        const correct = bin === item.bin;
        const streakMult = ShoalTalesEngine.streakMultiplier(save.streak, 0, 0);
        const value = ShoalTalesEngine.curioSortValue(fullValue, streakMult, correct);
        save.streak = correct ? save.streak + 1 : 0;
        save.bestStreakThisRun = Math.max(save.bestStreakThisRun, save.streak);
        save.bestStreakEver = Math.max(save.bestStreakEver, save.streak);
        save.sortedGoods[bin].units += 2;
        save.sortedGoods[bin].value += value;
        save.tray.splice(itemIndex, 1);
        saveDatabase();
        return sendJson(res, 200, { success: true, action: 'sort', correct, value, newStreak: save.streak });
      }
      // 'donate' needs a guild (Social phase, not built yet).
      return sendJson(res, 400, { error: 'Unknown or not-yet-available action.' });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Dress a raw fish at the Cutting Board (always free/available, unlike the
  // 4 paid stations - 05-fish.md): x1.6 value, or x1.6*1.3 with Limes (Priya's
  // only Cutting Board supply - Sushi Rice was dropped so every station keeps
  // exactly one upgrade material). The very first fish ever dressed brings
  // Crow's first letter and opens the Town (07-story.md's opening sequence).
  if (reqPath === '/api/shoal-tales/dress' && req.method === 'POST') {
    try {
      const { handle, coolerItemId, useLimes } = await parseJsonBody(req);
      if (!handle || !coolerItemId) return sendJson(res, 400, { error: 'Missing handle or coolerItemId' });
      const save = getOrCreateShoalTalesSave(handle);
      const fish = save.cooler.find(f => f.id === coolerItemId);
      if (!fish) return sendJson(res, 404, { error: 'That fish is not in your cooler.' });
      if (fish.stage !== 'raw') return sendJson(res, 400, { error: 'That fish is already dressed.' });

      let mult = 1;
      if (useLimes) {
        if (save.coins < 1) return sendJson(res, 400, { error: 'Not enough coins for Limes (need 1).' });
        save.coins -= 1;
        mult = 1.3;
      }
      const rawValue = fish.rawValue != null ? fish.rawValue : fish.value;
      fish.rawValue = rawValue;
      fish.value = ShoalTalesEngine.processedFishValue(rawValue, 'dressed', mult);
      fish.stage = 'dressed';
      shoalTrackStationProgress(save, 'fishDressed', 1);

      let newLetter = null;
      if (!save.anyFishDressed) {
        save.anyFishDressed = true;
        newLetter = shoalDeliverCrowLetter(save, 'an-invitation-ashore');
      }
      saveDatabase();
      return sendJson(res, 200, { success: true, fish, newLetter, townOpen: save.townOpen });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Make a meal from a dressed fish at the Oven (x1.5 of the dressed value,
  // or x1.5*1.4 with Herb Butter), once the Oven station is installed.
  if (reqPath === '/api/shoal-tales/make-meal' && req.method === 'POST') {
    try {
      const { handle, coolerItemId, useHerbButter } = await parseJsonBody(req);
      if (!handle || !coolerItemId) return sendJson(res, 400, { error: 'Missing handle or coolerItemId' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.stationsInstalled.includes('oven')) return sendJson(res, 400, { error: 'The Oven is not installed yet.' });
      const fish = save.cooler.find(f => f.id === coolerItemId);
      if (!fish) return sendJson(res, 404, { error: 'That fish is not in your cooler.' });
      if (fish.stage !== 'dressed') return sendJson(res, 400, { error: 'Only dressed fish can be made into a meal.' });

      let mult = 1;
      if (useHerbButter) {
        if (save.coins < 2) return sendJson(res, 400, { error: 'Not enough coins for Herb Butter (need 2).' });
        save.coins -= 2;
        mult = 1.4;
      }
      const rawValue = fish.rawValue != null ? fish.rawValue : fish.value;
      fish.rawValue = rawValue;
      fish.value = ShoalTalesEngine.processedFishValue(rawValue, 'meal', mult);
      fish.stage = 'meal';
      saveDatabase();
      return sendJson(res, 200, { success: true, fish });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Process a whole stored-junk bin at its station (Carpentry/Crucible/
  // Recycling) into knick-knacks/ingots/materials - base value x the
  // station's factor, optionally x its one Priya add-in. Whole stacks only,
  // same as selling (07-story.md's "Selling is by whole stacks").
  if (reqPath === '/api/shoal-tales/process-junk' && req.method === 'POST') {
    try {
      const { handle, bin, useAddIn } = await parseJsonBody(req);
      if (!handle || !bin) return sendJson(res, 400, { error: 'Missing handle or bin' });
      const save = getOrCreateShoalTalesSave(handle);
      const STATION_FOR_BIN = { Wood: 'carpentry', Metal: 'crucible', Mixed: 'recycling' };
      const RESOURCE_FOR_BIN = { Wood: 'knickKnacks', Metal: 'ingots', Mixed: 'materials' };
      const ADDIN_FOR_BIN = {
        Wood: { name: 'Furniture Polish', cost: 2, mult: 1.5 },
        Metal: { name: 'Borax Flux', cost: 2, mult: 1.4 },
        Mixed: { name: 'Binding Resin', cost: 2, mult: 1.4 }
      };
      const stationId = STATION_FOR_BIN[bin];
      if (!stationId) return sendJson(res, 400, { error: 'That bin cannot be processed.' });
      if (!save.stationsInstalled.includes(stationId)) return sendJson(res, 400, { error: 'That station is not installed yet.' });
      const stack = save.sortedGoods[bin];
      if (!stack || stack.units <= 0) return sendJson(res, 400, { error: 'Nothing stored in that bin to process.' });

      let mult = 1;
      const addIn = ADDIN_FOR_BIN[bin];
      if (useAddIn) {
        if (save.coins < addIn.cost) return sendJson(res, 400, { error: `Not enough coins for ${addIn.name} (need ${addIn.cost}).` });
        save.coins -= addIn.cost;
        mult = addIn.mult;
      }
      const station = ShoalTalesData.stations.find(s => s.id === stationId);
      const producedUnits = stack.units;
      const producedValue = ShoalTalesEngine.processedJunkValue(stack.value, station.valueFactor, 1, mult);
      const resourceKey = RESOURCE_FOR_BIN[bin];
      save[resourceKey].units += producedUnits;
      save[resourceKey].value += producedValue;
      save.sortedGoods[bin] = { units: 0, value: 0 };
      saveDatabase();
      return sendJson(res, 200, { success: true, bin, resource: resourceKey, producedUnits, producedValue });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Install the next pending station (strictly in order - 08-stations-
  // upgrades.md), once its hidden requirement is met. Resets stationProgress,
  // opens that station's Town buyer (via shoalTownspersonAppears's
  // stationsInstalled check) and brings a Crow letter (first run only).
  if (reqPath === '/api/shoal-tales/install-station' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      const station = shoalNextStationDef(save);
      if (!station) return sendJson(res, 400, { error: 'All stations are already installed.' });
      const progress = save.stationProgress || 0;
      if (progress < station.requiresAmount) {
        return sendJson(res, 400, { error: 'This station is not ready to install yet.' });
      }
      const unlockScale = ShoalTalesEngine.retireGoalForRun(save.retirements + 1).unlockScale;
      const cost = ShoalTalesEngine.stationCost(station.cost, unlockScale);
      if (save.coins < cost) return sendJson(res, 400, { error: `Not enough coins (need ${cost}, have ${Math.floor(save.coins)}).` });

      save.coins -= cost;
      save.stationsInstalled.push(station.id);
      save.stationProgress = 0;
      const letterId = { oven: 'something-warm', carpentry: 'good-hands', crucible: 'fire-and-iron', recycling: 'nothing-wasted' }[station.id];
      const newLetter = letterId ? shoalDeliverCrowLetter(save, letterId) : null;
      saveDatabase();
      return sendJson(res, 200, { success: true, stationId: station.id, coinsSpent: cost, newLetter });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Fulfill a townsperson's current request: their next story request if
  // their chain isn't exhausted, otherwise their repeatable standing order.
  if (reqPath === '/api/shoal-tales/fulfill-request' && req.method === 'POST') {
    try {
      const { handle, personId } = await parseJsonBody(req);
      if (!handle || !personId) return sendJson(res, 400, { error: 'Missing handle or personId' });
      const save = getOrCreateShoalTalesSave(handle);
      const current = shoalCurrentRequestFor(save, personId);
      if (!current) return sendJson(res, 400, { error: 'That person has nothing to ask for right now.' });

      if (current.kind === 'story') {
        const req2 = current.request;
        const have = shoalAvailableFor(save, req2.requires);
        if (have < req2.requires.amount) {
          return sendJson(res, 400, { error: `Not enough yet (have ${have}, need ${req2.requires.amount}).` });
        }
        shoalConsume(save, req2.requires, req2.requires.amount);
        save.storyRequestIndex[personId] = (save.storyRequestIndex[personId] || 0) + 1;
        let rewardMessage;
        if (req2.reward.type === 'coins') {
          save.coins += req2.reward.amount;
          save.allTimeStats.coinsEarned += req2.reward.amount;
          rewardMessage = req2.reward.amount + ' coins';
        } else {
          save.rareMaterials[req2.reward.material] = (save.rareMaterials[req2.reward.material] || 0) + 1;
          rewardMessage = req2.reward.material;
        }
        saveDatabase();
        return sendJson(res, 200, { success: true, kind: 'story', requestId: req2.id, reward: req2.reward, rewardMessage });
      }

      // Standing order. The spec documents the requirement scaling
      // (baseAmount + amountPerFill per fill) but not an explicit reward
      // formula for standing orders - this coins-per-unit payout is an
      // inferred placeholder (consistent with the design bible's own "all
      // writing/several prices are placeholder" note, docs/shoal-tales-
      // spec/17-open-items.md) pending the original, uncaptured design doc.
      const standing = current.standing;
      const amount = current.amount;
      const requires = standing.wants.type === 'sortedBinCycle'
        ? { type: 'sortedBin', bin: ShoalTalesEngine.BINS[(save.standingOrdersFilled[personId] || 0) % ShoalTalesEngine.BINS.length] }
        : { type: standing.wants.type };
      const have = shoalAvailableFor(save, requires);
      if (have < amount) {
        return sendJson(res, 400, { error: `Not enough yet (have ${have}, need ${amount}).` });
      }
      shoalConsume(save, requires, amount);
      save.standingOrdersFilled[personId] = (save.standingOrdersFilled[personId] || 0) + 1;
      const reward = Math.round(amount * 3); // placeholder, see comment above
      save.coins += reward;
      save.allTimeStats.coinsEarned += reward;
      saveDatabase();
      return sendJson(res, 200, { success: true, kind: 'standing', personId, amount, reward });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Each real-world day, one fresh request per appeared townsperson.
  if (reqPath === '/api/shoal-tales/fulfill-daily' && req.method === 'POST') {
    try {
      const { handle, personId } = await parseJsonBody(req);
      if (!handle || !personId) return sendJson(res, 400, { error: 'Missing handle or personId' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!shoalTownspersonAppears(save, personId)) {
        return sendJson(res, 400, { error: 'That person has not appeared yet.' });
      }
      const today = new Date().toISOString().slice(0, 10);
      if (save.dailyRequestsDate !== today) {
        save.dailyRequestsDate = today;
        save.dailyRequestsDone = [];
      }
      if (save.dailyRequestsDone.indexOf(personId) !== -1) {
        return sendJson(res, 400, { error: "Already done today's request for this person." });
      }
      const daily = ShoalTalesData.dailyRequests.find(d => d.personId === personId);
      if (!daily) return sendJson(res, 400, { error: 'No daily request for this person.' });

      const typeMap = { fishOnIceToday: 'rawFish', sortedUnitsToday: null, knickKnacksToday: 'knickKnacks', ingotsToday: 'ingots', materialsToday: 'materials' };
      let have, requires;
      if (daily.requires.type === 'sortedUnitsToday') {
        const totalSorted = ShoalTalesEngine.BINS.reduce((sum, b) => sum + save.sortedGoods[b].units, 0);
        have = totalSorted;
        requires = null; // consuming a cross-bin total is handled specially below
      } else {
        requires = { type: typeMap[daily.requires.type] };
        have = shoalAvailableFor(save, requires);
      }
      if (have < daily.requires.amount) {
        return sendJson(res, 400, { error: `Not enough yet (have ${have}, need ${daily.requires.amount}).` });
      }
      if (requires) {
        shoalConsume(save, requires, daily.requires.amount);
      } else {
        // Spread the consumption across bins, largest stacks first.
        let left = daily.requires.amount;
        ShoalTalesEngine.BINS.slice().sort((a, b) => save.sortedGoods[b].units - save.sortedGoods[a].units).forEach(b => {
          if (left <= 0) return;
          const take = Math.min(left, save.sortedGoods[b].units);
          shoalConsume(save, { type: 'sortedBin', bin: b }, take);
          left -= take;
        });
      }
      save.dailyRequestsDone.push(personId);
      const reward = 50; // placeholder, see standing-order comment above - not specified in the extracted spec.
      save.coins += reward;
      save.allTimeStats.coinsEarned += reward;
      saveDatabase();
      return sendJson(res, 200, { success: true, personId, reward });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 11. Static File Serving
  let targetFile = (reqPath === '/' || reqPath === '') ? 'index.html' : reqPath.replace(/^\/+/, '');
  let filePath = path.join(__dirname, targetFile);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      // sw.js must never be cached: browsers only detect a new service worker by
      // byte-comparing a fresh fetch of this exact file, so a stale cached copy
      // can keep an old service worker (and whatever it intercepts) installed
      // long after a redeploy ships a fix.
      'Cache-Control': (ext === '.html' || targetFile === 'sw.js') ? 'no-cache' : 'public, max-age=86400'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      fs.createReadStream(indexPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Roleplay Hub index.html not found');
    }
  }
});

let wsClients = new Set();

function broadcast(dataObj) {
  const jsonStr = JSON.stringify(dataObj);
  for (const client of wsClients) {
    try {
      if (client.readyState === 1 || client.readyState === client.OPEN) {
        if (typeof client.send === 'function') {
          client.send(jsonStr);
        } else if (typeof client.sendFrame === 'function') {
          client.sendFrame(jsonStr);
        }
      }
    } catch (e) {
      console.error('[WS] Broadcast error:', e.message);
    }
  }
}

try {
  const WebSocket = require('ws');
  const wss = new WebSocket.Server({ server });
  wss.on('connection', (ws, req) => {
    wsClients.add(ws);
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.send(JSON.stringify({
      type: 'SERVER_CONNECT',
      status: 'Connected to Roleplay Hub Cloud Server',
      activeClients: wsClients.size,
      timestamp: new Date().toISOString()
    }));

    ws.on('message', (msgData) => {
      try {
        const parsed = JSON.parse(msgData.toString());
        if (parsed.type === 'IDENTIFY') {
          ws.userHandle = parsed.handle;
        }
      } catch (e) {}
    });

    ws.on('close', () => {
      wsClients.delete(ws);
    });

    ws.on('error', () => {
      wsClients.delete(ws);
    });
  });

  const keepAlive = setInterval(() => {
    for (const ws of wsClients) {
      if (ws.isAlive === false) {
        wsClients.delete(ws);
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);

  wss.on('close', () => clearInterval(keepAlive));
  console.log('[WS] External ws library loaded successfully');
} catch (err) {
  console.log('[WS] ws library not found, activating built-in RFC 6455 WebSocket engine');

  server.on('upgrade', (req, socket, head) => {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const digest = crypto.createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      'Sec-WebSocket-Accept: ' + digest + '\r\n\r\n'
    );

    const client = {
      socket,
      readyState: 1,
      sendFrame: (text) => {
        try {
          const payload = Buffer.from(text, 'utf8');
          const len = payload.length;
          let header;
          if (len <= 125) {
            header = Buffer.from([0x81, len]);
          } else if (len <= 65535) {
            header = Buffer.alloc(4);
            header[0] = 0x81;
            header[1] = 126;
            header.writeUInt16BE(len, 2);
          } else {
            header = Buffer.alloc(10);
            header[0] = 0x81;
            header[1] = 127;
            header.writeBigUInt64BE(BigInt(len), 2);
          }
          socket.write(Buffer.concat([header, payload]));
        } catch (e) {
          wsClients.delete(client);
        }
      }
    };

    wsClients.add(client);

    client.sendFrame(JSON.stringify({
      type: 'SERVER_CONNECT',
      status: 'Connected to Roleplay Hub Cloud Server (Native Engine)',
      activeClients: wsClients.size,
      timestamp: new Date().toISOString()
    }));

    let buffer = Buffer.alloc(0);
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 2) {
        const b0 = buffer[0];
        const b1 = buffer[1];
        const opcode = b0 & 0x0f;
        const isMasked = (b1 & 0x80) !== 0;
        let payloadLen = b1 & 0x7f;
        let offset = 2;

        if (payloadLen === 126) {
          if (buffer.length < 4) break;
          payloadLen = buffer.readUInt16BE(2);
          offset = 4;
        } else if (payloadLen === 127) {
          if (buffer.length < 10) break;
          payloadLen = Number(buffer.readBigUInt64BE(2));
          offset = 10;
        }

        let mask = null;
        if (isMasked) {
          if (buffer.length < offset + 4) break;
          mask = buffer.slice(offset, offset + 4);
          offset += 4;
        }

        if (buffer.length < offset + payloadLen) break;

        const payloadData = buffer.slice(offset, offset + payloadLen);
        buffer = buffer.slice(offset + payloadLen);

        if (isMasked && mask) {
          for (let i = 0; i < payloadData.length; i++) {
            payloadData[i] ^= mask[i % 4];
          }
        }

        if (opcode === 8) {
          socket.destroy();
          wsClients.delete(client);
          return;
        } else if (opcode === 9) {
          socket.write(Buffer.from([0x8a, 0x00]));
        } else if (opcode === 1) {
          try {
            const parsed = JSON.parse(payloadData.toString('utf8'));
            if (parsed.type === 'IDENTIFY') {
              client.userHandle = parsed.handle;
            }
          } catch (e) {}
        }
      }
    });

    socket.on('close', () => {
      wsClients.delete(client);
    });

    socket.on('error', () => {
      wsClients.delete(client);
    });
  });
}

// One-time migration: the '#related-images' starter channel was removed from
// the product; purge any that already exist so old worlds don't keep it.
function pruneRelatedImagesChannels() {
  const staleIds = Object.values(db.channels)
    .filter(c => (c.name || '').toLowerCase() === 'related-images')
    .map(c => c.id);
  if (staleIds.length === 0) return;
  staleIds.forEach(id => { delete db.channels[id]; });
  db.messages = db.messages.filter(m => !staleIds.includes(m.channelId));
  console.log(`[Migration] Removed ${staleIds.length} #related-images channel(s)`);
  saveDatabaseSync();
}

// Apple's web push service validates the VAPID JWT's "sub" claim and rejects
// a mailto: address on a reserved/non-resolvable TLD (.local, .invalid, .test,
// .example) with a 403 "BadJwtToken" - confirmed as the actual cause of a real
// iPhone subscription's test push failing that way. FCM doesn't enforce this,
// which is why the same subject "worked" (was silently accepted) there. Kept
// overridable via env var in case a real contact domain is ever configured.
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'https://roleplay-hub.onrender.com';

// Push notifications need a stable VAPID keypair. Generate one on first boot
// and persist it in the (now-durable) db so every device that subscribes
// keeps working across restarts instead of silently breaking.
function ensureVapidKeys() {
  if (!webpush) return;
  if (!db.vapidKeys || !db.vapidKeys.publicKey || !db.vapidKeys.privateKey) {
    db.vapidKeys = webpush.generateVAPIDKeys();
    saveDatabaseSync();
    console.log('[Push] Generated new VAPID keypair');
  }
  webpush.setVapidDetails(VAPID_SUBJECT, db.vapidKeys.publicKey, db.vapidKeys.privateKey);
}

async function sendPushToHandles(handles, payload) {
  if (!webpush || !db.vapidKeys) return;
  const targets = new Set((handles || []).map(h => (h || '').trim().toLowerCase()).filter(Boolean));
  if (targets.size === 0) return;
  const subs = db.pushSubscriptions.filter(s => targets.has((s.handle || '').toLowerCase()));
  if (subs.length === 0) return;

  let removedAny = false;
  await Promise.all(subs.map(async s => {
    try {
      await webpush.sendNotification(s.subscription, JSON.stringify(payload));
    } catch (err) {
      // 404/410: the push service dropped this subscription (uninstalled, expired).
      // 401/403: the subscription was created under a VAPID key we no longer hold
      // (e.g. a wiped database regenerated the keypair) - sending to it will never
      // succeed again either, so it's just as dead. Drop both rather than retrying
      // forever on every future notification.
      if ([401, 403, 404, 410].includes(err.statusCode)) {
        db.pushSubscriptions = db.pushSubscriptions.filter(x => x.subscription.endpoint !== s.subscription.endpoint);
        removedAny = true;
      } else {
        console.error('[Push] Send error:', err.message);
      }
    }
  }));
  if (removedAny) saveDatabase();
}

function startServer() {
  server.listen(PORT, () => {
    console.log('=======================================================');
    console.log(`>>> Roleplay Hub Cloud Server online on port ${PORT} <<<`);
    console.log(`>>> Render Deployment Ready (Persistent DB & WebSockets) <<<`);
    console.log(`>>> Data directory: ${DATA_DIR}${process.env.DATA_DIR ? ' (from DATA_DIR env var)' : ' (default - NOT a persistent path unless the platform guarantees one)'} <<<`);
    console.log('=======================================================');
  });
}

initializeDatabase()
  .then(() => {
    pruneRelatedImagesChannels();
    ensureVapidKeys();
    startServer();
  })
  .catch(err => {
    console.error('[DB] Fatal error during database initialization, starting server with in-memory defaults:', err.message);
    startServer();
  });
