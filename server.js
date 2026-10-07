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
  shoalTalesSaves: {},
  shoalTalesParties: {},
  shoalTalesGuilds: {},
  shoalTalesBottleLetters: {},
  shoalTalesSeasonState: { lastProcessedMonth: new Date().toISOString().slice(0, 7) },
  shoalTalesActiveTide: null,
  shoalTalesActiveEvent: null
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
        shoalTalesSaves: parsed.shoalTalesSaves || {},
        shoalTalesParties: parsed.shoalTalesParties || {},
        shoalTalesGuilds: parsed.shoalTalesGuilds || {},
        shoalTalesBottleLetters: parsed.shoalTalesBottleLetters || {},
        shoalTalesSeasonState: parsed.shoalTalesSeasonState || { lastProcessedMonth: new Date().toISOString().slice(0, 7) },
        shoalTalesActiveTide: parsed.shoalTalesActiveTide || null,
        shoalTalesActiveEvent: parsed.shoalTalesActiveEvent || null
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
          shoalTalesSaves: pgData.shoalTalesSaves || {},
          shoalTalesParties: pgData.shoalTalesParties || {},
          shoalTalesGuilds: pgData.shoalTalesGuilds || {},
          shoalTalesBottleLetters: pgData.shoalTalesBottleLetters || {},
          shoalTalesSeasonState: pgData.shoalTalesSeasonState || { lastProcessedMonth: new Date().toISOString().slice(0, 7) },
          shoalTalesActiveTide: pgData.shoalTalesActiveTide || null,
          shoalTalesActiveEvent: pgData.shoalTalesActiveEvent || null
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
    allTimeStats: {
      hauls: 0, junkSorted: 0, fishOnIce: 0, coinsEarned: 0, bestStreak: 0, curiosScrubbed: 0, cratesOpened: 0, creaturesReleased: 0,
      // Added for The Desk's Profile / feat titles (14-extras.md).
      goodsMade: 0, customersServed: 0, perfectDrinksServed: 0, unitsSold: 0, secondsAtSea: 0
    },
    // Kept for good across retiring (docs/shoal-tales-spec/11-retiring.md) -
    // shoalApplyRetire() never touches these.
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
    materials: { units: 0, value: 0 },
    // The Emporium (docs/shoal-tales-spec/10-emporium.md) - the end-of-run
    // shop-sim, opened once all 4 stations are in, 6,000 coins are spent,
    // and the exact rare materials from the Story requests are on hand.
    emporiumOpen: false,
    emporium: {
      pedestalCount: 6,
      pedestals: [null, null, null, null, null, null],
      decorationsOwned: {},
      backRoomBuilt: false,
      tickets: 0,
      lastVisit: new Date().toISOString(),
      shellStreak: 0,
      activePuzzle: null,
      workOrders: [],
      counterCustomers: [],
      // Filled by Visits (13-social.md) - was inert until task 24.
      tipJar: 0
    },
    // Cosmetics / the Shipwright (docs/shoal-tales-spec/12-cosmetics.md).
    // Free woods/sails/flags are owned from the start; exotic woods and all
    // sails/flags/pets/badges past the free set are granted (sails/flags/
    // pets/badges, for free) or made buyable (exotic woods, 5,000 coins
    // each) by shoalGrantRetirementCosmetics() on each retirement. Premium
    // (Seal Token) looks and event-set looks are NOT modeled at all - a
    // deliberate scope cut (Seal Tokens are a real-money-adjacent decision
    // for the site owner). Season Champion IS modeled now (task 24) via
    // shoalCheckSeasonRollover - the flag is granted directly, outside the
    // retirement-unlock table.
    cosmetics: {
      unlockedWoods: ShoalTalesData.woods.filter(w => w.free).map(w => w.id),
      equippedWood: { hull: 'oak', deck: 'oak', railing: 'oak', mast: 'oak' },
      unlockedSails: ShoalTalesData.sails.filter(s => s.unlocksAtRetirement === 0).map(s => s.id),
      equippedSail: 'white',
      unlockedFlags: ShoalTalesData.flags.filter(f => f.unlocksAtRetirement === 0).map(f => f.id),
      equippedFlag: 'plain-pennant',
      unlockedPets: [],
      equippedPet: null,
      unlockedBadges: [],
      equippedBadge: null,
      unlockedTracks: ShoalTalesData.radioTracks.filter(t => t.unlocksAtRetirement === 0).map(t => t.id),
      equippedTrack: null,
      petPattedDate: null,
      petTreatExpiresAt: null
    },
    // Social (docs/shoal-tales-spec/13-social.md). partyId/guildId point
    // into db.shoalTalesParties/db.shoalTalesGuilds. lastDredgeAt backs both
    // the party's "dredging at the same time" bonus and guilds' "active in
    // the last 7 days" quest-goal scaling. completedSetIds backs Collector's
    // Log set-completion announcements (new entries only, never re-fired).
    partyId: null,
    guildId: null,
    pendingPartyInvites: [],
    pendingGuildInvites: [],
    visitorsEnabled: true,
    announcementsEnabled: true,
    lastDredgeAt: null,
    completedSetIds: [],
    monthlyPeriod: null,
    monthlyCoinsEarned: 0,
    monthlySetsCompleted: 0,
    seasonChampionMonths: [],
    // "The helper earns 1 arcade ticket per 5 good sorts" (Help Sort).
    helpSortCount: 0,
    // Bottle letters, player-written (13-social.md step 1-5). emptyBottlesKept
    // holds bottles deliberately NOT sorted as junk, ready to trade for a
    // writing kit; pendingLetterReplies are delivered via a forced tray item
    // on the author's next dredge, same mechanism as "first haul of the day".
    emptyBottlesKept: 0,
    writingKits: 0,
    heartedLetterIds: [],
    pendingLetterReplies: [],
    // Feat titles (14-extras.md): earned once, permanent; featTitleChosen
    // (the ARCHITECTURE.md field name) shows instead of the retirement
    // title when set.
    unlockedFeatTitles: [],
    featTitleChosen: null,
    // Collector's Log sets whose every item was logged golden (Golden
    // Touch feat) - tracked separately from completedSetIds since a set can
    // be completed non-golden first and golden later.
    goldenSetIds: [],
    // Events (14-extras.md): sets from a past/running event the player has
    // fully logged, each granting a permanent +2% payout bonus.
    completedEventIds: [],
    // The quest book - which quests have already paid out their reward.
    // Progress itself is derived live from the rest of the save (hauls,
    // coins, sets, etc.) rather than duplicated here.
    claimedQuestIds: [],
    // New-player guide (14-extras.md): each deck fixture's sparkle hint
    // clears the first time it's used, and never reappears once retired.
    newPlayerHintsSeen: [],
    // Settings (14-extras.md) not already covered by the flat
    // visitorsEnabled/announcementsEnabled fields from task 24.
    settings: { seaSounds: true, dredgeChatLine: true, sparkles: true, titleDisplay: true }
  };
}

function getOrCreateShoalTalesSave(handle) {
  const key = (handle || '').trim();
  if (!key) return null;
  shoalCheckSeasonRollover();
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

// --- Retiring (docs/shoal-tales-spec/11-retiring.md): "+10% value on
// everything (payout bonus)" and "3% faster dredging", both "all time
// bonuses capped at 50% total" per retirement. Luck is endgame-only (past
// the 8th retirement, +3% per further retirement) - see 09-economy.md.
function shoalPayoutBonus(save) {
  const retireBonus = (save.retirements || 0) * 0.10;
  const petBonus = shoalPetTreatActive(save) ? 0.05 : 0;
  const partyBonus = shoalPartyDredgeBonus(save);
  const guildBonus = shoalGuildPayoutBonus(save);
  const tide = shoalActiveTide();
  // "Silver Tide: +25% value on everything sorted and made" (14-extras.md).
  const tideBonus = (tide && tide.type === 'silver') ? 0.25 : 0;
  // Completing an event's Collector's Log set "gives a small lasting bonus
  // of about +2%" - stacks per event completed, like a guild set.
  const eventBonus = (save.completedEventIds || []).length * 0.02;
  return Math.min(0.5, retireBonus + petBonus + partyBonus + guildBonus + tideBonus + eventBonus);
}

// --- Extras (docs/shoal-tales-spec/14-extras.md): Tides, Events ---

// Tides are "short server-wide events (1-240 minutes, default 10) started
// by staff by hand, never at random" (16-minecraft-to-web.md) - lazily
// expired, like the season rollover: nothing resets on a timer, a tide
// simply stops counting as active once its endsAt has passed.
function shoalActiveTide() {
  const t = db.shoalTalesActiveTide;
  if (!t) return null;
  if (Date.now() >= new Date(t.endsAt).getTime()) return null;
  return t;
}

// Events are "longer, dated" - staff-scheduled, with their own Collector's
// Log set (existing curios/fish repurposed into a temporary event pool,
// since the design bible explicitly leaves real event content for the
// owner to author later - 17-open-items.md).
function shoalActiveEvent() {
  const e = db.shoalTalesActiveEvent;
  if (!e) return null;
  if (Date.now() >= new Date(e.endsAt).getTime()) return null;
  return e;
}

// --- The Quest Book (14-extras.md): "the tutorial - there is deliberately
// no separate handbook. 2 chapters, 22 quests (a placeholder set the owner
// will rewrite)." Progress is derived live from the rest of the save
// rather than duplicated into its own counters - claimedQuestIds is the
// only thing actually stored. ---

function shoalQuestUnlocked(save, quest) {
  if (!quest.requires) return true;
  return (save.claimedQuestIds || []).indexOf(quest.requires) !== -1;
}

function shoalQuestProgress(save, quest) {
  const t = quest.task;
  switch (t.type) {
    case 'hauls': return { have: save.allTimeStats.hauls || 0, need: t.amount };
    case 'coinsOnHand': return { have: save.coins || 0, need: t.amount };
    case 'coinsEarnedThisRun': return { have: save.lifetimeCoinsThisRun || 0, need: t.amount };
    case 'basketSize': return { have: ShoalTalesEngine.basketSize(save.basketLevel, 0), need: t.amount };
    case 'upgradeLevel': {
      const field = { 'bigger-basket': 'basketLevel', 'faster-winch': 'winchLevel', 'soft-brush': 'brushLevel', 'lucky-charm': 'charmLevel' }[t.target];
      return { have: field ? save[field] : 0, need: t.amount };
    }
    case 'stationInstalled': return { have: save.stationsInstalled.length, need: t.amount };
    case 'emporiumOpened': return { have: save.emporiumOpen ? 1 : 0, need: 1 };
    case 'retirements': return { have: save.retirements || 0, need: t.amount };
    case 'fishSpeciesCaught': return { have: Object.keys(save.collectorsLog.fish).length, need: t.amount };
    case 'particularFish': {
      const f = ShoalTalesData.fish.find(x => x.id === t.target);
      return { have: (f && save.collectorsLog.fish[f.id]) ? 1 : 0, need: 1 };
    }
    case 'curiosLogged': return { have: Object.keys(save.collectorsLog.curios).length, need: t.amount };
    case 'particularSet': return { have: shoalCountCompletedSets(save).indexOf(t.target) !== -1 ? 1 : 0, need: 1 };
    case 'setsCompleted': return { have: shoalCountCompletedSets(save).length, need: t.amount };
    case 'areaUnlocked': return { have: save.unlockedAreas.indexOf(t.target) !== -1 ? 1 : 0, need: 1 };
    case 'townspersonMet': return { have: shoalTownspersonAppears(save, t.target) ? 1 : 0, need: 1 };
    case 'storyRequestsDone': {
      const done = Object.values(save.storyRequestIndex || {}).reduce((s, v) => s + v, 0);
      return { have: done, need: t.amount || 1 };
    }
    case 'goodsHeld': {
      const held = ShoalTalesEngine.BINS.reduce((s, b) => s + (save.sortedGoods[b] ? save.sortedGoods[b].units : 0), 0);
      return { have: held, need: t.amount };
    }
    case 'goodsHandedIn': return { have: save.allTimeStats.unitsSold || 0, need: t.amount };
    case 'message': return { have: 1, need: 1 };
    default: return { have: 0, need: 1 };
  }
}

// Grants a quest's reward. "look" rewards unlock a specific cosmetic id
// outright, bypassing its usual retirement gate - a nice bonus for
// following the quest book. "supplies" has no dedicated inventory to grant
// into (Limes/Herb Butter/etc. are bought with coins at point of use, not
// stocked anywhere) - granted as an equivalent coin value instead, flagged
// in the response rather than silently dropped.
function shoalGrantQuestReward(save, reward) {
  switch (reward.type) {
    case 'coins':
      save.coins += reward.amount;
      save.allTimeStats.coinsEarned += reward.amount;
      save.monthlyCoinsEarned = (save.monthlyCoinsEarned || 0) + reward.amount;
      return { type: 'coins', amount: reward.amount };
    case 'tickets':
      save.emporium.tickets += reward.amount;
      return { type: 'tickets', amount: reward.amount };
    case 'supplies': {
      const coinValue = reward.amount * 2;
      save.coins += coinValue;
      save.allTimeStats.coinsEarned += coinValue;
      save.monthlyCoinsEarned = (save.monthlyCoinsEarned || 0) + coinValue;
      return { type: 'coins', amount: coinValue, note: `${reward.amount}x ${reward.item} (as coins - no supplies inventory yet)` };
    }
    case 'decoration':
      return { type: 'decoration', decoration: shoalGrantRandomDecoration(save, reward.rarity) };
    case 'rareMaterial':
      save.rareMaterials[reward.item] = (save.rareMaterials[reward.item] || 0) + reward.amount;
      return { type: 'rareMaterial', item: reward.item, amount: reward.amount };
    case 'look': {
      const fieldByCategory = { badge: 'unlockedBadges', sail: 'unlockedSails', flag: 'unlockedFlags', pet: 'unlockedPets', track: 'unlockedTracks' };
      const field = fieldByCategory[reward.category];
      if (field && save.cosmetics[field].indexOf(reward.id) === -1) save.cosmetics[field].push(reward.id);
      return { type: 'look', category: reward.category, id: reward.id };
    }
    case 'message':
      return { type: 'message', text: reward.text };
    default:
      return null;
  }
}

// "The owner's first pat each real-world day gives a treat: +5% value for
// 10 minutes" (12-cosmetics.md) - petting other players' pets is covered by
// Visits (task 24, below).
function shoalPetTreatActive(save) {
  const until = save.cosmetics && save.cosmetics.petTreatExpiresAt;
  return !!until && Date.now() < new Date(until).getTime();
}

// --- Social (docs/shoal-tales-spec/13-social.md) ---

const SHOAL_ACTIVITY_WINDOW_MS = 3 * 60 * 1000; // "active in the last 3 minutes" (party dredge bonus)
const SHOAL_GUILD_ACTIVITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // "active in the last 7 days" (guild quest scaling)

function shoalIsRecentlyActive(save, windowMs) {
  return !!save.lastDredgeAt && (Date.now() - new Date(save.lastDredgeAt).getTime()) < windowMs;
}

// "+5% value for each other member dredging at the same time (active in the
// last 3 minutes), up to +15%" - counts other party members only, capped at 3.
function shoalPartyDredgeBonus(save) {
  if (!save.partyId) return 0;
  const party = db.shoalTalesParties[save.partyId];
  if (!party) return 0;
  let others = 0;
  party.members.forEach(h => {
    if (h === save.handle) return;
    const other = db.shoalTalesSaves[h];
    if (other && shoalIsRecentlyActive(other, SHOAL_ACTIVITY_WINDOW_MS)) others++;
  });
  return Math.min(3, others) * 0.05;
}

// Guild Fund upgrade ("+1% value for every member", up to 5 levels) plus
// "every guild set completed gives every member +2% value for good".
function shoalGuildPayoutBonus(save) {
  if (!save.guildId) return 0;
  const guild = db.shoalTalesGuilds[save.guildId];
  if (!guild) return 0;
  return (guild.upgrades.guildFund || 0) * 0.01 + (guild.completedSets || []).length * 0.02;
}

function shoalGetParty(partyId) { return db.shoalTalesParties[partyId] || null; }
function shoalGetGuild(guildId) { return db.shoalTalesGuilds[guildId] || null; }

function shoalIsHandleOnline(handle) {
  for (const ws of wsClients) {
    if (ws.userHandle === handle && ws.readyState === 1) return true;
  }
  return false;
}

// Broadcasts to every connected client whose own save has announcements on
// (13-social.md: "each player can switch these off"). Best-effort - if a
// connected client never IDENTIFYs, or its save can't be found, it's simply
// skipped rather than guessed at.
function shoalBroadcastAnnouncement(message) {
  for (const ws of wsClients) {
    try {
      if (ws.readyState !== 1 || !ws.userHandle) continue;
      const save = db.shoalTalesSaves[ws.userHandle];
      if (save && save.announcementsEnabled === false) continue;
      ws.send(JSON.stringify({ type: 'SHOAL_ANNOUNCEMENT', message, at: new Date().toISOString() }));
    } catch (e) { /* ignore a single bad client */ }
  }
}

// Push a new party/guild chat line live to the group's other connected
// members (the sender already has it from its own POST response) - same
// best-effort "skip clients that never IDENTIFY" approach as announcements,
// just scoped to a member list instead of everyone.
function shoalBroadcastToGroup(members, type, groupId, chatMessage) {
  for (const ws of wsClients) {
    try {
      if (ws.readyState !== 1 || !ws.userHandle) continue;
      if (members.indexOf(ws.userHandle) === -1) continue;
      if (ws.userHandle === chatMessage.handle) continue;
      ws.send(JSON.stringify({ type: type, id: groupId, message: chatMessage }));
    } catch (e) { /* ignore a single bad client */ }
  }
}

// Guild quest progress contribution - called from the gameplay endpoints
// that match a quest type (dredge/sort/scrub/dress/make-meal/process-junk/
// sell). A no-op unless the player is in a guild AND that guild has a
// matching quest active today.
function shoalContributeToGuildQuests(save, questType, amount) {
  if (!save.guildId || !amount) return;
  const guild = db.shoalTalesGuilds[save.guildId];
  if (!guild) return;
  shoalRollGuildDailyQuests(guild);
  guild.dailyQuests.forEach(q => {
    if (q.type === questType && q.progress < q.goal) {
      q.progress = Math.min(q.goal, q.progress + amount);
    }
  });
}

const GUILD_QUEST_TYPES = [
  { type: 'hauls', label: 'All Hands: haul up the dredge', baseGoal: 40 },
  { type: 'sortedUnits', label: 'Sorting Day: sort units of junk', baseGoal: 400 },
  { type: 'fishOnIce', label: 'Full Coolers: put fish on ice', baseGoal: 60 },
  { type: 'curiosScrubbed', label: 'Scrub Club: clean curios', baseGoal: 12 },
  { type: 'fishDressed', label: 'Knife Work: dress fish', baseGoal: 40 },
  { type: 'mealsBaked', label: 'Supper Rush: bake meals', baseGoal: 20 },
  { type: 'goodsMade', label: "Makers' Day: make knick-knacks, ingots, or materials", baseGoal: 60 },
  { type: 'coinsEarnedSelling', label: 'Good Trade: earn coins selling', baseGoal: 20000 }
];

function shoalGuildActiveMemberCount(guild) {
  let count = 0;
  guild.members.forEach(h => {
    const s = db.shoalTalesSaves[h];
    if (s && shoalIsRecentlyActive(s, SHOAL_GUILD_ACTIVITY_WINDOW_MS)) count++;
  });
  return Math.max(1, count);
}

// Re-rolls the guild's daily quests exactly once per real-world day - "3 a
// day" plus +1 per Busy Noticeboard level, goals scaled by active members:
// "x(1 + 0.5 per extra active member)".
function shoalRollGuildDailyQuests(guild) {
  const today = new Date().toISOString().slice(0, 10);
  if (guild.dailyQuestsDate === today) return;
  guild.dailyQuestsDate = today;
  const slotCount = Math.min(GUILD_QUEST_TYPES.length, 3 + (guild.upgrades.busyNoticeboard || 0));
  const activeMembers = shoalGuildActiveMemberCount(guild);
  const scale = 1 + 0.5 * Math.max(0, activeMembers - 1);
  const pool = GUILD_QUEST_TYPES.slice();
  const picked = [];
  while (picked.length < slotCount && pool.length > 0) {
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  guild.dailyQuests = picked.map(q => ({
    type: q.type, label: q.label, goal: Math.round(q.baseGoal * scale), progress: 0, claimedBy: []
  }));
}

// How many Collector's Log sets a save has fully completed - shared by the
// Leaderboards ("Sets Completed"/"This Month's Sets") and the set-completion
// announcement check below. Mirrors ui.js's CollectorsLogSummary exactly.
function shoalCountCompletedSets(save) {
  return ShoalTalesData.sets.filter(s => {
    const curiosDone = s.curioNames.every(n => {
      const c = ShoalTalesData.curios.find(x => x.name === n);
      return c && save.collectorsLog.curios[c.id];
    });
    const fishDone = s.fishNames.every(n => {
      const f = ShoalTalesData.fish.find(x => x.name === n);
      return f && save.collectorsLog.fish[f.id];
    });
    return curiosDone && fishDone;
  }).map(s => s.id);
}

// Diffs completed sets against what was already known, announces each newly
// completed set (and, the moment every set is done, the whole Log), and
// flags "golden sets" (every item in the set logged golden) for the
// Golden Touch feat. Called right after every collectorsLog mutation.
function shoalUpdateCompletedSets(save, handle) {
  // Checked unconditionally (not gated on a whole SET completing) - an
  // event's own set can be satisfied by ordinary fish/curio logging well
  // before/without ever completing one of the 30 area sets.
  shoalCheckEventCompletion(save, handle);
  const current = shoalCountCompletedSets(save);
  const previous = save.completedSetIds || [];
  const newlyCompleted = current.filter(id => previous.indexOf(id) === -1);
  if (newlyCompleted.length === 0) return;
  const wasWholeLogDone = previous.length === ShoalTalesData.sets.length;
  save.completedSetIds = current;
  save.monthlySetsCompleted = (save.monthlySetsCompleted || 0) + newlyCompleted.length;
  newlyCompleted.forEach(setId => {
    const set = ShoalTalesData.sets.find(s => s.id === setId);
    if (!set) return;
    shoalBroadcastAnnouncement(`${handle} completed the ${set.name} set!`);
    const allGolden = set.curioNames.every(n => {
      const c = ShoalTalesData.curios.find(x => x.name === n);
      return c && save.collectorsLog.curios[c.id] && save.collectorsLog.curios[c.id].golden;
    }) && set.fishNames.every(n => {
      const f = ShoalTalesData.fish.find(x => x.name === n);
      return f && save.collectorsLog.fish[f.id] && save.collectorsLog.fish[f.id].golden;
    });
    if (allGolden) {
      shoalBroadcastAnnouncement(`${handle} completed a GOLDEN ${set.name} set!`);
      if (!save.goldenSetIds) save.goldenSetIds = [];
      if (save.goldenSetIds.indexOf(setId) === -1) save.goldenSetIds.push(setId);
    }
  });
  if (!wasWholeLogDone && current.length === ShoalTalesData.sets.length) {
    shoalBroadcastAnnouncement(`${handle} completed the entire Collector's Log!`);
  }
  shoalCheckFeatTitles(save);
}

// Feat titles (14-extras.md): earned once, permanent. Cheap enough to
// recompute fully each time rather than tracking per-condition dirty
// flags - called after dredging, sorting, releasing a creature, serving a
// drink, and completing a set (the only actions that can cross one of
// these thresholds). "Letter Writer" is checked separately (see
// shoalCheckLetterWriterFeat) since it depends on the shared letters
// collection, not just this save.
function shoalCheckFeatTitles(save) {
  if (!save.unlockedFeatTitles) save.unlockedFeatTitles = [];
  const unlock = id => { if (save.unlockedFeatTitles.indexOf(id) === -1) save.unlockedFeatTitles.push(id); };
  if ((save.bestStreakEver || 0) >= 100) unlock('streak-master');
  if ((save.allTimeStats.hauls || 0) >= 1000) unlock('deep-dredger');
  if ((save.allTimeStats.perfectDrinksServed || 0) >= 100) unlock('barista');
  if ((save.creaturesSeen || []).length >= ShoalTalesData.creaturesSeen.length) unlock('naturalist');
  if ((save.completedSetIds || []).length >= ShoalTalesData.sets.length) unlock('completionist');
  if ((save.goldenSetIds || []).length >= 1) unlock('golden-touch');
}

// "Letter Writer: 10 of your letters out at sea" - read literally as 10
// currently-approved letters by this author at once (not a lifetime
// cumulative count, since a report can pull one back out of circulation -
// but once earned, the title stays per "earned once").
function shoalCheckLetterWriterFeat(save) {
  const count = Object.values(db.shoalTalesBottleLetters).filter(l => l.authorHandle === save.handle && l.status === 'approved').length;
  if (count >= 10) {
    if (!save.unlockedFeatTitles) save.unlockedFeatTitles = [];
    if (save.unlockedFeatTitles.indexOf('letter-writer') === -1) save.unlockedFeatTitles.push('letter-writer');
  }
}

// Events (14-extras.md): "completing it gives a small lasting bonus of
// about +2% plus looks" - detects the player's Collector's Log now covers
// every curio/fish in the event's set (same mirrors-ui.js-exactly caveat
// as shoalCountCompletedSets). The event may have already ended by the
// time this is satisfied; completedEventIds don't require it still running.
function shoalCheckEventCompletion(save, handle) {
  const event = shoalActiveEvent();
  if (!event) return;
  if (!save.completedEventIds) save.completedEventIds = [];
  if (save.completedEventIds.indexOf(event.id) !== -1) return;
  const curiosDone = (event.curioIds || []).every(id => !!save.collectorsLog.curios[id]);
  const fishDone = (event.fishIds || []).every(id => !!save.collectorsLog.fish[id]);
  if (((event.curioIds || []).length > 0 || (event.fishIds || []).length > 0) && curiosDone && fishDone) {
    save.completedEventIds.push(event.id);
    shoalBroadcastAnnouncement(`${handle} completed the ${event.name} event set!`);
  }
}

// Guild Log equivalent (13-social.md): "every guild set completed gives
// every member +2% value for good" - shoalGuildPayoutBonus reads
// guild.completedSets.length directly, so this just needs to keep it
// accurate; no golden-set tracking at guild level (donations don't carry it).
function shoalUpdateGuildCompletedSets(guild) {
  const current = ShoalTalesData.sets.filter(s => {
    const curiosDone = s.curioNames.every(n => {
      const c = ShoalTalesData.curios.find(x => x.name === n);
      return c && guild.guildLog.curios[c.id];
    });
    const fishDone = s.fishNames.every(n => {
      const f = ShoalTalesData.fish.find(x => x.name === n);
      return f && guild.guildLog.fish[f.id];
    });
    return curiosDone && fishDone;
  }).map(s => s.id);
  const previous = guild.completedSets || [];
  const newlyCompleted = current.filter(id => previous.indexOf(id) === -1);
  guild.completedSets = current;
  newlyCompleted.forEach(setId => {
    const set = ShoalTalesData.sets.find(s => s.id === setId);
    if (set) shoalBroadcastAnnouncement(`${guild.name} completed the ${set.name} set in their Guild Log!`);
  });
}

// Bottle letters, player-written (13-social.md). Never the finder's own
// letter, never one they've already found.
function shoalEligiblePlayerLetters(handle) {
  return Object.values(db.shoalTalesBottleLetters).filter(l =>
    l.status === 'approved' && l.authorHandle !== handle && l.foundBy.indexOf(handle) === -1
  );
}

// "Anyone can look round anyone's boat unless that player switched visitors
// off. Party members and guild-mates are always welcome." - visiting your
// own boat is always allowed too (there's no reason to lock a player out of
// their own Emporium preview).
function shoalCanVisit(visitorHandle, ownerSave) {
  if (visitorHandle === ownerSave.handle) return true;
  if (ownerSave.visitorsEnabled !== false) return true;
  const visitorSave = db.shoalTalesSaves[visitorHandle];
  if (!visitorSave) return false;
  if (ownerSave.partyId && visitorSave.partyId === ownerSave.partyId) return true;
  if (ownerSave.guildId && visitorSave.guildId === ownerSave.guildId) return true;
  return false;
}

// Cost-of-next-level formulas for Guild Bank upgrades (13-social.md), keyed
// by level ALREADY owned (L=0 is the first purchase).
const GUILD_UPGRADES = {
  guildFund: { maxLevel: 5, cost: L => 5000 * Math.pow(2, L) },
  busyNoticeboard: { maxLevel: 2, cost: L => 10000 * (L + 1) },
  betterRewards: { maxLevel: 4, cost: L => 4000 * (L + 1) }
};

// The real body of POST /emporium/counter/serve, factored out so a Visit
// (13-social.md: "Emporium owners can invite visitors, who can serve at the
// Counter") can run it against the OWNER's save - same "it's still the
// host's business" rule as Help Sort, so the coins earned are the owner's.
function shoalPerformCounterServe(save, customerId, drink, coolerItemId) {
  if (!save.emporiumOpen) return { status: 400, body: { error: 'The Emporium is not open yet.' } };
  const emp = save.emporium;
  const idx = emp.counterCustomers.findIndex(c => c.id === customerId);
  if (idx < 0) return { status: 404, body: { error: 'That customer is not waiting.' } };
  const customer = emp.counterCustomers[idx];
  const area = shoalAreaById(save.area).valueMultiplier;
  const correctDrink = drink.base === customer.drink.base && drink.flavour === customer.drink.flavour && drink.finish === customer.drink.finish;
  let pay = ShoalTalesEngine.counterDrinkPay({ correctDrink, customerTip: customer.tip, area, bPayout: shoalPayoutBonus(save) });
  let mealGiven = false;
  if (customer.wantsMeal && coolerItemId) {
    const meal = save.cooler.find(f => f.id === coolerItemId && f.stage === 'meal');
    if (meal) {
      pay += ShoalTalesEngine.counterMealBonus(meal.value);
      save.cooler = save.cooler.filter(f => f.id !== coolerItemId);
      mealGiven = true;
    }
  }
  pay = Math.round(pay);
  save.coins += pay;
  save.allTimeStats.coinsEarned += pay;
  save.monthlyCoinsEarned = (save.monthlyCoinsEarned || 0) + pay;
  save.allTimeStats.customersServed = (save.allTimeStats.customersServed || 0) + 1;
  if (correctDrink) {
    // "Barista: 100 perfect drinks served" (14-extras.md) - counted on
    // whoever's Counter this is, even when a Visit helper served it (same
    // "it's still the host's" rule as Help Sort).
    save.allTimeStats.perfectDrinksServed = (save.allTimeStats.perfectDrinksServed || 0) + 1;
    shoalCheckFeatTitles(save);
  }
  emp.counterCustomers.splice(idx, 1);
  return { status: 200, body: { success: true, correctDrink, mealGiven, coinsEarned: pay } };
}

// The real body of POST /sort, factored out so Parties' Help Sort (13-social.md:
// "a party member can sort the host's tray. Coins, streak, and Log stay the
// host's") can run the exact same logic against the HOST's save while only
// the caller decides who gets credited for anything outside of `save` itself
// (the ticket reward for helping, handled by the /party/help-sort endpoint).
// Returns {status, body} instead of touching `res` directly - callers do
// their own saveDatabase() once, after this returns, and send the response.
function shoalPerformSort(save, handle, trayItemId, bin) {
  const itemIndex = save.tray.findIndex(t => t.id === trayItemId);
  if (itemIndex < 0) return { status: 404, body: { error: 'That item is not in the tray.' } };
  const item = save.tray[itemIndex];

  if (item.kind === 'fish') {
    if (bin !== 'cooler') {
      return { status: 400, body: { error: 'Fish can only go in the cooler.' } };
    }
    // Golden finds are endgame-only (8th retirement+, 09-economy.md).
    const goldenEligible = save.retirements >= 8;
    const golden = goldenEligible && Math.random() < 0.01;
    const value = ShoalTalesEngine.fishValue({
      base: item.baseCoins, streakCount: save.streak, area: item.areaMultiplier, bPayout: shoalPayoutBonus(save), bFish: 0, golden: golden
    });
    save.cooler.push({ id: 'fish_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), name: item.name, value: value, golden: golden, stage: 'raw', caughtAt: new Date().toISOString() });
    save.streak += 1;
    save.bestStreakThisRun = Math.max(save.bestStreakThisRun, save.streak);
    save.bestStreakEver = Math.max(save.bestStreakEver, save.streak);
    save.allTimeStats.fishOnIce += 1;
    save.allTimeStats.bestStreak = Math.max(save.allTimeStats.bestStreak, save.streak);
    save.tray.splice(itemIndex, 1);
    shoalContributeToGuildQuests(save, 'fishOnIce', 1);

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
        shoalUpdateCompletedSets(save, handle);
      }
      // Fish donate to the Guild Log automatically, same as the
      // player's own (no separate action, unlike curios) - 13-social.md.
      if (save.guildId) {
        const guild = db.shoalTalesGuilds[save.guildId];
        if (guild && !guild.guildLog.fish[fishData.id]) {
          guild.guildLog.fish[fishData.id] = { donatedBy: handle, foundAt: new Date().toISOString() };
          shoalUpdateGuildCompletedSets(guild);
        }
      }
    }
    shoalCheckFeatTitles(save);
    return { status: 200, body: { success: true, correct: true, kind: 'fish', value, newStreak: save.streak, golden, newlyLogged } };
  }

  // Junk: validate the target is one of the 7 real bins (never 'cooler').
  if (!ShoalTalesEngine.BINS.includes(bin)) {
    return { status: 400, body: { error: 'Not a real bin.' } };
  }
  const move = ShoalTalesEngine.stationMoveFor(item.name);
  const stationInstalled = !!(move && save.stationsInstalled.includes(move.station));
  const effectiveCorrectBin = stationInstalled ? move.newBin : item.bin;
  const correct = bin === effectiveCorrectBin;
  const movedByStation = correct && stationInstalled;

  let value;
  if (correct) {
    value = ShoalTalesEngine.correctSortValue({
      base: item.baseCoins, streakCount: save.streak, bPayout: shoalPayoutBonus(save), bBin: 0, movedByStation: movedByStation, area: item.areaMultiplier
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
  if (correct) {
    shoalTrackStationProgress(save, 'sortedBin', 1 + item.weight, bin);
    shoalContributeToGuildQuests(save, 'sortedUnits', 1 + item.weight);
  }
  save.tray.splice(itemIndex, 1);
  shoalCheckFeatTitles(save);
  return { status: 200, body: { success: true, correct, kind: 'junk', value, newStreak: save.streak, effectiveCorrectBin, bin } };
}

// Leaderboards (13-social.md): all-time boards read straight off every save;
// monthly boards need a rollover that crowns the Season Champion BEFORE
// anyone's own save lazily resets its monthly counters - done here as one
// global pass, guarded so it only ever runs once per real month.
function shoalCheckSeasonRollover() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (!db.shoalTalesSeasonState) db.shoalTalesSeasonState = { lastProcessedMonth: currentMonth };
  if (db.shoalTalesSeasonState.lastProcessedMonth === currentMonth) return;
  const endedMonth = db.shoalTalesSeasonState.lastProcessedMonth;
  const ranked = Object.values(db.shoalTalesSaves)
    .filter(s => (s.monthlyCoinsEarned || 0) > 0)
    .sort((a, b) => b.monthlyCoinsEarned - a.monthlyCoinsEarned)
    .slice(0, 3);
  ranked.forEach(s => {
    if (!s.seasonChampionMonths) s.seasonChampionMonths = [];
    if (s.seasonChampionMonths.indexOf(endedMonth) === -1) s.seasonChampionMonths.push(endedMonth);
    if (s.cosmetics && s.cosmetics.unlockedFlags.indexOf('season-champion') === -1) {
      s.cosmetics.unlockedFlags.push('season-champion');
    }
    shoalBroadcastAnnouncement(`${s.handle} is a Season Champion for ${endedMonth}!`);
  });
  Object.values(db.shoalTalesSaves).forEach(s => {
    s.monthlyCoinsEarned = 0;
    s.monthlySetsCompleted = 0;
    s.monthlyPeriod = currentMonth;
  });
  db.shoalTalesSeasonState.lastProcessedMonth = currentMonth;
  saveDatabase();
}

function shoalTimeBonus(save) {
  return Math.min(0.5, (save.retirements || 0) * 0.03);
}
function shoalLuckBonus(save) {
  return save.retirements > 8 ? (save.retirements - 8) * 0.03 : 0;
}

function shoalRetirementTitle(retirements) {
  const titles = ShoalTalesData.retirementTitles;
  return titles[Math.min(retirements, titles.length - 1)];
}

// "Feat titles... shown instead of the retirement title if chosen"
// (14-extras.md). Respects the "own title display" setting (14-extras.md's
// Settings list) - callers showing a title to OTHER players should use
// this (not shoalRetirementTitle directly) so a null means "show nothing."
function shoalDisplayTitle(save) {
  if (save.settings && save.settings.titleDisplay === false) return null;
  if (save.featTitleChosen) {
    const feat = ShoalTalesData.featTitles.find(f => f.id === save.featTitleChosen);
    if (feat) return feat.name;
  }
  return shoalRetirementTitle(save.retirements);
}

// Resets "this run only" state and grants the next area/depth/title, per
// 11-retiring.md's reset table. Everything NOT touched here (Collector's
// Log, magic curios, Creatures Seen, Golden Log, Stored Curios, rare
// materials, requests/standing orders done, the Emporium and everything in
// it, letters, all-time stats, best streak ever) is "kept for good" simply
// by not being reset. Returns the new title.
function shoalApplyRetire(save) {
  const bins = {};
  ShoalTalesEngine.BINS.forEach(b => { bins[b] = { units: 0, value: 0 }; });
  save.coins = 0;
  save.lifetimeCoinsThisRun = 0;
  save.tray = [];
  save.basketLevel = 0;
  save.winchLevel = 0;
  save.brushLevel = 0;
  save.charmLevel = 0;
  save.stationsInstalled = [];
  save.sortedGoods = bins;
  save.cooler = [];
  save.streak = 0;
  save.bestStreakThisRun = 0;
  save.stationProgress = 0;
  save.knickKnacks = { units: 0, value: 0 };
  save.ingots = { units: 0, value: 0 };
  save.materials = { units: 0, value: 0 };
  save.area = 'shoalbay';
  save.depth = 0;

  save.retirements += 1;
  save.unlockedAreas = ShoalTalesData.mapAreas.filter(a => a.opensAtRetirement <= save.retirements).map(a => a.id);
  save.unlockedDepths = ShoalTalesData.depths.filter(d => d.opensAtRetirement <= save.retirements).map(d => d.level);
  shoalGrantRetirementCosmetics(save);

  return shoalRetirementTitle(save.retirements);
}

// Sails/flags/pets/chat badges are granted free the moment their retirement
// is reached; radio tracks the same. Exotic woods only become BUYABLE at
// their retirement (see defaultShoalTalesSave's cosmetics comment) - they
// are never auto-added to unlockedWoods, so nothing to grant for them here.
function shoalGrantRetirementCosmetics(save) {
  const c = save.cosmetics;
  ShoalTalesData.sails.forEach(s => { if (s.unlocksAtRetirement === save.retirements && c.unlockedSails.indexOf(s.id) === -1) c.unlockedSails.push(s.id); });
  ShoalTalesData.flags.forEach(f => { if (f.unlocksAtRetirement === save.retirements && c.unlockedFlags.indexOf(f.id) === -1) c.unlockedFlags.push(f.id); });
  ShoalTalesData.pets.forEach(p => { if (p.unlocksAtRetirement === save.retirements && c.unlockedPets.indexOf(p.id) === -1) c.unlockedPets.push(p.id); });
  ShoalTalesData.chatBadges.forEach(b => { if (b.unlocksAtRetirement === save.retirements && c.unlockedBadges.indexOf(b.id) === -1) c.unlockedBadges.push(b.id); });
  ShoalTalesData.radioTracks.forEach(t => { if (t.unlocksAtRetirement === save.retirements && c.unlockedTracks.indexOf(t.id) === -1) c.unlockedTracks.push(t.id); });
}

// --- The Emporium (docs/shoal-tales-spec/10-emporium.md) ---

const EMPORIUM_OPEN_COST = 6000;
const EMPORIUM_REQUIRED_MATERIALS = { 'Stained Glass Panel': 2, 'Old-Growth Timber': 3, 'Brass Fittings': 3, 'Neon Sign': 1 };
const PEDESTAL_EXPANSION_COSTS = [5000, 10000, 20000, 40000, 80000]; // 6->8->10->12->14->16
const BACK_ROOM_COST = 250000;
const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic'];
const PRIZE_BOXES = {
  common: { tickets: 20, weights: { Common: 70, Uncommon: 25, Rare: 5, Epic: 0 } },
  uncommon: { tickets: 60, weights: { Common: 30, Uncommon: 50, Rare: 17, Epic: 3 } },
  rare: { tickets: 150, weights: { Common: 0, Uncommon: 40, Rare: 45, Epic: 15 } }
};
const CUSTOMER_TYPES = [
  { type: 'local', chance: 45, tip: 1, names: ['Old Mrs. Penhallow', 'Tom the Postman', 'The Vicar'] },
  { type: 'townsfolk', chance: 20, tip: 1.2, names: null }, // scoped to appeared townsfolk at roll time
  { type: 'traveller', chance: 15, tip: 1.3, names: ['A Backpacker', 'A Cyclist', 'A Lorry Driver'] },
  { type: 'tourist', chance: 15, tip: 1.5, names: ['A Day-Tripper', 'A Family of Four'] },
  { type: 'rare', chance: 5, tip: 5, names: ['Zephyr the Crow', 'A Mermaid in a Raincoat', 'The Lighthouse Keeper'] }
];
const DRINK_PARTS = {
  base: ['Coffee', 'Tea', 'Hot Cocoa', 'Warm Milk'],
  flavour: ['Vanilla', 'Caramel', 'Mint', 'Salted Kelp'],
  finish: ['Whipped Cream', 'Cinnamon', 'Marshmallows', 'Sea Salt']
};

function shoalPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function shoalRareMaterialsMet(save) {
  return Object.keys(EMPORIUM_REQUIRED_MATERIALS).every(m => (save.rareMaterials[m] || 0) >= EMPORIUM_REQUIRED_MATERIALS[m]);
}

function shoalGrantRandomDecoration(save, rarity) {
  const pool = ShoalTalesData.decorations.filter(d => d.rarity === rarity);
  if (pool.length === 0) return null;
  const d = shoalPick(pool);
  save.emporium.decorationsOwned[d.id] = (save.emporium.decorationsOwned[d.id] || 0) + 1;
  return d;
}

// Lights-out puzzle generation: starting from the solved (all-off) board and
// pressing a random subset of cells gives both a guaranteed-solvable puzzle
// AND an exact solution for free - pressing that same subset once each
// undoes the scramble, since toggling is its own inverse (XOR) and order
// doesn't matter. `solution` is tracked live as "cells still needing a
// press" so a hint can always point at one that's genuinely needed.
function shoalToggleCell(cells, idx, size) {
  const row = Math.floor(idx / size), col = idx % size;
  [[row, col], [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].forEach(([r, c]) => {
    if (r >= 0 && r < size && c >= 0 && c < size) { const i = r * size + c; cells[i] = cells[i] ? 0 : 1; }
  });
}
function shoalGeneratePuzzle(size, rarity) {
  const total = size * size;
  const scramble = [];
  for (let i = 0; i < total; i++) { if (Math.random() < 0.5) scramble.push(i); }
  if (scramble.length === 0) scramble.push(Math.floor(Math.random() * total));
  const cells = new Array(total).fill(0);
  scramble.forEach(idx => shoalToggleCell(cells, idx, size));
  return { size, rarity, cells, solution: scramble.slice(), hintsUsed: 0 };
}

function shoalGenerateWorkOrder(save) {
  const useBin = Math.random() < 0.5;
  const retirements = save.retirements || 0;
  if (useBin) {
    const bin = shoalPick(ShoalTalesEngine.BINS);
    const [lo, hi] = ShoalTalesEngine.workOrderGoodsRequired('sortedGoods', retirements);
    return { id: 'wo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), requires: { type: 'sortedBin', bin, amount: lo + Math.floor(Math.random() * (hi - lo + 1)) } };
  }
  const type = shoalPick(['knickKnacks', 'ingots', 'materials', 'rawFish', 'dressedFish', 'meals']);
  const [lo, hi] = ShoalTalesEngine.workOrderGoodsRequired('other', retirements);
  return { id: 'wo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), requires: { type, amount: lo + Math.floor(Math.random() * (hi - lo + 1)) } };
}

// Value of exactly requires.amount units of whatever a Work Order asks for
// (never the whole stock, which may hold more) - used to pay 2x on fill.
// Mirrors shoalConsume's own consumption order so the two stay consistent:
// proportional per-unit for the aggregate stores, array-order for fish.
function shoalValueFor(save, requires) {
  const amount = requires.amount;
  if (requires.type === 'sortedBin') {
    const bin = save.sortedGoods[requires.bin];
    const perUnit = bin.units > 0 ? bin.value / bin.units : 0;
    return perUnit * Math.min(amount, bin.units);
  }
  if (requires.type === 'knickKnacks' || requires.type === 'ingots' || requires.type === 'materials') {
    const store = save[requires.type];
    const perUnit = store.units > 0 ? store.value / store.units : 0;
    return perUnit * Math.min(amount, store.units);
  }
  if (requires.type === 'rawFish' || requires.type === 'dressedFish' || requires.type === 'meals') {
    const stage = requires.type === 'rawFish' ? 'raw' : requires.type === 'dressedFish' ? 'dressed' : 'meal';
    return save.cooler.filter(f => f.stage === stage).slice(0, amount).reduce((s, f) => s + f.value, 0);
  }
  return 0;
}

// Produces the N items for one haul, following the exact cascade in
// docs/shoal-tales-spec/03-dredging.md "What each haul contains": per item
// slot, roll (1) puzzle box, (2) magic curio, (3) otherwise the catch-type
// weighted roll among junk/fish/curio/crate/bottle/sea creature. Puzzle boxes
// only start appearing once the Emporium is open (10-emporium.md).
function generateShoalHaul(save) {
  const area = shoalAreaById(save.area);
  const isFirstHaulOfDay = save.lastHaulDate !== new Date().toISOString().slice(0, 10);
  const isVeryFirstHaul = save.allTimeStats.hauls === 0;
  const tide = shoalActiveTide();
  const event = shoalActiveEvent();
  const springTideActive = tide && tide.type === 'spring';
  const glassTideActive = tide && tide.type === 'glass';
  const count = ShoalTalesEngine.hauledItemCount(save.basketLevel, 0, { isFirstHaulOfDay: isFirstHaulOfDay, springTideActive: springTideActive });
  // Luck is endgame-only: "+3% luck" per retirement past the 8th (09-economy.md).
  // Other luck sources (sets/magic curios/upgrades) aren't wired in yet.
  const luck = shoalLuckBonus(save);

  const junkPool = ShoalTalesData.junk.filter(j => j.foundIn === 'Everywhere' || j.foundIn === area.name);
  let fishPool = ShoalTalesData.fish.filter(f => {
    if (f.area !== area.name) return false;
    const range = shoalDepthRangeFromString(f.depths);
    return save.depth >= range[0] && save.depth <= range[1];
  });
  // Event fish turn up everywhere the event is running, ignoring the usual
  // area/depth gating - it's "its own set", not tied to a map area.
  if (event && event.fishIds && event.fishIds.length > 0) {
    const eventFish = ShoalTalesData.fish.filter(f => event.fishIds.indexOf(f.id) !== -1);
    fishPool = fishPool.concat(eventFish);
  }
  const curioPool = ShoalTalesData.curios.filter(c => c.area === area.name);
  const magicCuriosRemaining = ShoalTalesData.magicCurios.filter(m => save.magicCurios.indexOf(m.id) === -1);

  const catchWeights = ShoalTalesEngine.catchTypeWeights(save.depth, luck, glassTideActive);
  const tray = [];
  let forcedFishUsed = false;
  let forcedCurioUsed = false;

  for (let i = 0; i < count; i++) {
    const areaMultiplier = area.valueMultiplier; // locked in at haul time, see 03-dredging.md
    const id = shoalNewTrayId(i);

    const puzzleBoxChance = save.emporiumOpen ? 0.03 * (1 + 0.5 * save.depth) : 0;
    const magicCurioChance = magicCuriosRemaining.length > 0 ? 0.006 * (1 + luck) * (1 + 0.5 * save.depth) : 0;
    const roll = Math.random();

    if (roll < puzzleBoxChance) {
      // "Common/uncommon boxes are 3x3; rare/epic are 4x4" - reuses the
      // curio rarity distribution since the spec gives no separate table.
      const rarity = ShoalTalesEngine.weightedPick(ShoalTalesEngine.curioRarityWeights(0));
      const size = (rarity === 'Rare' || rarity === 'Epic') ? 4 : 3;
      tray.push({ id, kind: 'puzzleBox', name: 'Puzzle Box', rarity, size, areaMultiplier });
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
      // "15% of curio rolls come from the party-only Party Favours set"
      // (13-social.md) - a symmetric 15% is inferred for Guild Keepsakes,
      // since the spec gives no explicit number for it. Real identity
      // (which specific curio) is still resolved lazily at /scrub time;
      // this just tags which pool to scrub from.
      const curioItem = { id, kind: 'curio', name: 'Encrusted Curio', identified: false, areaMultiplier };
      // "Each curio roll has a 20% chance of coming from [the event's set]
      // while it runs" (14-extras.md).
      if (event && event.curioIds && event.curioIds.length > 0 && Math.random() < 0.20) curioItem.curioSource = 'event';
      else if (save.partyId && Math.random() < 0.15) curioItem.curioSource = 'party';
      else if (save.guildId && Math.random() < 0.15) curioItem.curioSource = 'guild';
      tray.push(curioItem);
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
      // nextStation/title are derived (never persisted) so the stored save
      // stays clean - both are recomputed fresh on every GET.
      const withDerived = Object.assign({}, save, { nextStation: shoalNextStationInfo(save), title: shoalDisplayTitle(save) });
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
      const dredgeTimeSeconds = ShoalTalesEngine.dredgeTimeSeconds(save.depth, save.winchLevel, shoalTimeBonus(save));
      const tray = generateShoalHaul(save);
      save.tray = tray;
      save.lastHaulDate = new Date().toISOString().slice(0, 10);
      save.lastDredgeAt = new Date().toISOString();
      save.allTimeStats.hauls += 1;
      save.allTimeStats.secondsAtSea = (save.allTimeStats.secondsAtSea || 0) + dredgeTimeSeconds;
      shoalContributeToGuildQuests(save, 'hauls', 1);
      // A written reply to one of this player's bottle letters is delivered
      // on their next haul (13-social.md step 5) - same forcing mechanism as
      // "first haul of the day always includes a curio".
      let deliveredReply = null;
      if (save.pendingLetterReplies.length > 0) {
        deliveredReply = save.pendingLetterReplies.shift();
      }
      shoalCheckFeatTitles(save);
      saveDatabase();
      return sendJson(res, 200, { success: true, tray, dredgeTimeSeconds, deliveredReply });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/sort' && req.method === 'POST') {
    try {
      const { handle, trayItemId, bin } = await parseJsonBody(req);
      if (!handle || !trayItemId || !bin) return sendJson(res, 400, { error: 'Missing handle, trayItemId or bin' });
      const save = getOrCreateShoalTalesSave(handle);
      const result = shoalPerformSort(save, handle, trayItemId, bin);
      saveDatabase();
      return sendJson(res, result.status, result.body);
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
      let unitsSold = 0;

      if (sellWhat === 'goods' || sellWhat === 'all') {
        ShoalTalesEngine.BINS.forEach(b => {
          coinsEarned += save.sortedGoods[b].value;
          unitsSold += save.sortedGoods[b].units;
          save.sortedGoods[b] = { units: 0, value: 0 };
        });
      }
      if (sellWhat === 'fish' || sellWhat === 'all') {
        save.cooler.forEach(f => { coinsEarned += f.value; unitsSold += 1; });
        save.cooler = [];
      }
      ['knickKnacks', 'ingots', 'materials'].forEach(key => {
        if (sellWhat === key || sellWhat === 'all') {
          coinsEarned += save[key].value;
          unitsSold += save[key].units;
          save[key] = { units: 0, value: 0 };
        }
      });
      coinsEarned = Math.round(coinsEarned);
      save.coins += coinsEarned;
      save.lifetimeCoinsThisRun += coinsEarned;
      save.allTimeStats.coinsEarned += coinsEarned;
      save.allTimeStats.unitsSold = (save.allTimeStats.unitsSold || 0) + unitsSold;
      save.monthlyCoinsEarned = (save.monthlyCoinsEarned || 0) + coinsEarned;
      shoalContributeToGuildQuests(save, 'coinsEarnedSelling', coinsEarned);
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
        shoalContributeToGuildQuests(save, 'curiosScrubbed', 1);
        saveDatabase();
        return sendJson(res, 200, { success: true, kind: 'magicCurio', magicCurio: found, allSixFound: save.magicCurios.length >= 6 });
      }

      if (item.kind !== 'curio' || item.identified) {
        return sendJson(res, 400, { error: 'Nothing to scrub here.' });
      }
      const area = shoalAreaById(save.area);
      const activeEventForScrub = shoalActiveEvent();
      let curioPool = item.curioSource === 'party' ? ShoalTalesData.curios.filter(c => c.set === 'Party Favours')
        : item.curioSource === 'guild' ? ShoalTalesData.curios.filter(c => c.set === 'Guild Keepsakes')
        : (item.curioSource === 'event' && activeEventForScrub) ? ShoalTalesData.curios.filter(c => activeEventForScrub.curioIds.indexOf(c.id) !== -1)
        : ShoalTalesData.curios.filter(c => c.area === area.name);
      // The event may have ended between haul and scrub - fall back to the
      // area pool rather than erroring on a now-empty event pool.
      if (curioPool.length === 0) curioPool = ShoalTalesData.curios.filter(c => c.area === area.name);
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
      shoalContributeToGuildQuests(save, 'curiosScrubbed', 1);
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
        save.monthlyCoinsEarned = (save.monthlyCoinsEarned || 0) + coins;
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
      // The 35% letter roll now blends the original static letters with
      // approved player-written ones (13-social.md) - never the player's
      // own, never one they've already found, weighted up by hearts
      // ("hearted letters wash up more often").
      const unfoundStatic = ShoalTalesData.bottleLetters.filter(l => save.bottleLettersFound.indexOf(l.id) === -1);
      const playerLetters = shoalEligiblePlayerLetters(handle);
      const pool = unfoundStatic.map(l => ({ kind: 'static', letter: l, weight: 1 }))
        .concat(playerLetters.map(l => ({ kind: 'player', letter: l, weight: 1 + l.heartCount * 0.1 })));
      if (Math.random() < 0.35 && pool.length > 0) {
        const totalWeight = pool.reduce((s, p) => s + p.weight, 0);
        let roll = Math.random() * totalWeight;
        let chosen = pool[pool.length - 1];
        for (const p of pool) { roll -= p.weight; if (roll <= 0) { chosen = p; break; } }
        if (chosen.kind === 'static') {
          save.bottleLettersFound.push(chosen.letter.id);
          saveDatabase();
          return sendJson(res, 200, { success: true, outcome: 'letter', letter: chosen.letter, tray: save.tray });
        }
        chosen.letter.foundBy.push(handle);
        saveDatabase();
        return sendJson(res, 200, {
          success: true, outcome: 'letter', isPlayerWritten: true,
          letter: { id: chosen.letter.id, text: chosen.letter.text, authorHandle: chosen.letter.anonymous ? null : chosen.letter.authorHandle },
          tray: save.tray
        });
      }
      // An empty bottle: kind 'emptyBottle' (not plain 'junk') so the UI can
      // offer "keep it for a writing kit" alongside the usual Glass sort -
      // /sort still accepts it exactly like junk if the player sorts it instead.
      const glassBottle = ShoalTalesData.junk.find(j => j.name === 'Glass Bottle');
      const newItem = { id: shoalNewTrayId('bottleglass'), kind: 'emptyBottle', name: glassBottle.name, bin: glassBottle.bin, baseCoins: glassBottle.baseCoins, weight: glassBottle.weight, description: glassBottle.description, areaMultiplier: item.areaMultiplier };
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
      save.monthlyCoinsEarned = (save.monthlyCoinsEarned || 0) + coins;
      save.allTimeStats.creaturesReleased += 1;
      const newlySeen = save.creaturesSeen.indexOf(item.creatureId) === -1;
      if (newlySeen) save.creaturesSeen.push(item.creatureId);
      save.tray.splice(itemIndex, 1);
      if (newlySeen) shoalCheckFeatTitles(save);
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
          shoalUpdateCompletedSets(save, handle);
        }
        save.tray.splice(itemIndex, 1);
        saveDatabase();
        return sendJson(res, 200, { success: true, action: 'log', logged: better });
      }
      if (action === 'sell') {
        const coins = Math.round(fullValue);
        save.coins += coins;
        save.allTimeStats.coinsEarned += coins;
        save.monthlyCoinsEarned = (save.monthlyCoinsEarned || 0) + coins;
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
      // Donate to the Guild Log (13-social.md): a shared log, same "better
      // copy wins" rule as the player's own Log. Completing a guild set
      // grants every member +2% value for good (shoalGuildPayoutBonus).
      if (action === 'donate') {
        if (!save.guildId) return sendJson(res, 400, { error: 'You are not in a guild.' });
        const guild = db.shoalTalesGuilds[save.guildId];
        if (!guild) return sendJson(res, 400, { error: 'Your guild no longer exists.' });
        const existing = guild.guildLog.curios[item.curioId];
        const better = !existing || RARITY_RANK[item.rarity] > RARITY_RANK[existing.rarity];
        if (better) guild.guildLog.curios[item.curioId] = { rarity: item.rarity, donatedBy: handle, foundAt: new Date().toISOString() };
        shoalUpdateGuildCompletedSets(guild);
        save.tray.splice(itemIndex, 1);
        saveDatabase();
        return sendJson(res, 200, { success: true, action: 'donate', logged: better });
      }
      return sendJson(res, 400, { error: 'Unknown action.' });
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
      shoalContributeToGuildQuests(save, 'fishDressed', 1);

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
      shoalContributeToGuildQuests(save, 'mealsBaked', 1);
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
      save.allTimeStats.goodsMade = (save.allTimeStats.goodsMade || 0) + producedUnits;
      shoalContributeToGuildQuests(save, 'goodsMade', producedUnits);
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
          save.monthlyCoinsEarned = (save.monthlyCoinsEarned || 0) + req2.reward.amount;
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
      save.monthlyCoinsEarned = (save.monthlyCoinsEarned || 0) + reward;
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
      save.monthlyCoinsEarned = (save.monthlyCoinsEarned || 0) + reward;
      saveDatabase();
      return sendJson(res, 200, { success: true, personId, reward });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- The Emporium (docs/shoal-tales-spec/10-emporium.md) ---

  if (reqPath === '/api/shoal-tales/open-emporium' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (save.emporiumOpen) return sendJson(res, 400, { error: 'The Emporium is already open.' });
      if (save.stationsInstalled.length < ShoalTalesData.stations.length) {
        return sendJson(res, 400, { error: 'All four stations must be installed first.' });
      }
      if (save.coins < EMPORIUM_OPEN_COST) {
        return sendJson(res, 400, { error: `Not enough coins (need ${EMPORIUM_OPEN_COST}, have ${Math.floor(save.coins)}).` });
      }
      if (!shoalRareMaterialsMet(save)) {
        const missing = Object.keys(EMPORIUM_REQUIRED_MATERIALS).filter(m => (save.rareMaterials[m] || 0) < EMPORIUM_REQUIRED_MATERIALS[m]);
        return sendJson(res, 400, { error: 'Missing rare materials: ' + missing.join(', ') });
      }
      save.coins -= EMPORIUM_OPEN_COST;
      Object.keys(EMPORIUM_REQUIRED_MATERIALS).forEach(m => { save.rareMaterials[m] -= EMPORIUM_REQUIRED_MATERIALS[m]; });
      save.emporiumOpen = true;
      save.emporium.workOrders = [shoalGenerateWorkOrder(save), shoalGenerateWorkOrder(save), shoalGenerateWorkOrder(save)];
      save.emporium.lastVisit = new Date().toISOString();
      const newLetter = shoalDeliverCrowLetter(save, 'the-emporium');
      saveDatabase();
      return sendJson(res, 200, { success: true, newLetter });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/emporium/place-decoration' && req.method === 'POST') {
    try {
      const { handle, pedestalIndex, decorationId } = await parseJsonBody(req);
      if (!handle || pedestalIndex == null || !decorationId) return sendJson(res, 400, { error: 'Missing handle, pedestalIndex or decorationId' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.emporiumOpen) return sendJson(res, 400, { error: 'The Emporium is not open yet.' });
      const emp = save.emporium;
      if (pedestalIndex < 0 || pedestalIndex >= emp.pedestalCount) return sendJson(res, 400, { error: 'No such pedestal.' });
      if (!(emp.decorationsOwned[decorationId] > 0)) return sendJson(res, 400, { error: "You don't have a spare of that decoration." });
      const current = emp.pedestals[pedestalIndex];
      emp.decorationsOwned[decorationId] -= 1;
      if (emp.decorationsOwned[decorationId] === 0) delete emp.decorationsOwned[decorationId];
      // A full pedestal swaps - its old decoration goes back to the spares pool.
      if (current) emp.decorationsOwned[current] = (emp.decorationsOwned[current] || 0) + 1;
      emp.pedestals[pedestalIndex] = decorationId;
      saveDatabase();
      return sendJson(res, 200, { success: true, pedestals: emp.pedestals });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/emporium/take-decoration' && req.method === 'POST') {
    try {
      const { handle, pedestalIndex } = await parseJsonBody(req);
      if (!handle || pedestalIndex == null) return sendJson(res, 400, { error: 'Missing handle or pedestalIndex' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.emporiumOpen) return sendJson(res, 400, { error: 'The Emporium is not open yet.' });
      const emp = save.emporium;
      if (pedestalIndex < 0 || pedestalIndex >= emp.pedestalCount) return sendJson(res, 400, { error: 'No such pedestal.' });
      const current = emp.pedestals[pedestalIndex];
      if (!current) return sendJson(res, 400, { error: 'That pedestal is already empty.' });
      emp.decorationsOwned[current] = (emp.decorationsOwned[current] || 0) + 1;
      emp.pedestals[pedestalIndex] = null;
      saveDatabase();
      return sendJson(res, 200, { success: true, pedestals: emp.pedestals });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/emporium/expand-pedestals' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.emporiumOpen) return sendJson(res, 400, { error: 'The Emporium is not open yet.' });
      const emp = save.emporium;
      const tier = (emp.pedestalCount - 6) / 2;
      if (tier >= PEDESTAL_EXPANSION_COSTS.length) return sendJson(res, 400, { error: 'Pedestals are already fully expanded (16).' });
      const cost = PEDESTAL_EXPANSION_COSTS[tier];
      if (save.coins < cost) return sendJson(res, 400, { error: `Not enough coins (need ${cost}, have ${Math.floor(save.coins)}).` });
      save.coins -= cost;
      emp.pedestalCount += 2;
      emp.pedestals.push(null, null);
      saveDatabase();
      return sendJson(res, 200, { success: true, pedestalCount: emp.pedestalCount, coinsSpent: cost });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/emporium/build-back-room' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.emporiumOpen) return sendJson(res, 400, { error: 'The Emporium is not open yet.' });
      const emp = save.emporium;
      if (emp.backRoomBuilt) return sendJson(res, 400, { error: 'The Back Room is already built.' });
      if (emp.pedestalCount < 16) return sendJson(res, 400, { error: 'All 16 pedestals must be open first.' });
      if (save.coins < BACK_ROOM_COST) return sendJson(res, 400, { error: `Not enough coins (need ${BACK_ROOM_COST}, have ${Math.floor(save.coins)}).` });
      save.coins -= BACK_ROOM_COST;
      emp.backRoomBuilt = true;
      emp.pedestalCount += 8;
      for (let i = 0; i < 8; i++) emp.pedestals.push(null);
      saveDatabase();
      return sendJson(res, 200, { success: true, pedestalCount: emp.pedestalCount });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/emporium/trade-up' && req.method === 'POST') {
    try {
      const { handle, rarity } = await parseJsonBody(req);
      if (!handle || !rarity) return sendJson(res, 400, { error: 'Missing handle or rarity' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.emporiumOpen) return sendJson(res, 400, { error: 'The Emporium is not open yet.' });
      const emp = save.emporium;
      const idx = RARITY_ORDER.indexOf(rarity);
      if (idx === -1 || idx === RARITY_ORDER.length - 1) return sendJson(res, 400, { error: 'That rarity cannot be traded up.' });
      const spareIds = ShoalTalesData.decorations.filter(d => d.rarity === rarity).map(d => d.id).filter(id => (emp.decorationsOwned[id] || 0) > 0);
      const totalSpare = spareIds.reduce((s, id) => s + emp.decorationsOwned[id], 0);
      if (totalSpare < 3) return sendJson(res, 400, { error: `Need 3 spare ${rarity} decorations (have ${totalSpare}).` });
      let left = 3;
      for (const id of spareIds) {
        if (left <= 0) break;
        const take = Math.min(left, emp.decorationsOwned[id]);
        emp.decorationsOwned[id] -= take;
        if (emp.decorationsOwned[id] === 0) delete emp.decorationsOwned[id];
        left -= take;
      }
      const granted = shoalGrantRandomDecoration(save, RARITY_ORDER[idx + 1]);
      saveDatabase();
      return sendJson(res, 200, { success: true, granted });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Customers walk in on request (up to 3 waiting) - the design bible has
  // them arrive on a 25s real-world timer, but there is no server-side
  // ticking loop in this request/response architecture, so the UI is
  // expected to poll this on a 25s client-side interval instead.
  if (reqPath === '/api/shoal-tales/emporium/counter/next-customer' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.emporiumOpen) return sendJson(res, 400, { error: 'The Emporium is not open yet.' });
      const emp = save.emporium;
      if (emp.counterCustomers.length >= 3) return sendJson(res, 400, { error: 'Up to 3 customers can wait at once.' });
      const typeWeights = {};
      CUSTOMER_TYPES.forEach(t => { typeWeights[t.type] = t.chance; });
      const typeId = ShoalTalesEngine.weightedPick(typeWeights);
      const typeDef = CUSTOMER_TYPES.find(t => t.type === typeId);
      let names = typeDef.names;
      if (typeId === 'townsfolk') {
        names = ShoalTalesData.townsfolk.filter(p => shoalTownspersonAppears(save, p.id)).map(p => p.name);
        if (names.length === 0) names = ['A Local']; // nobody met yet - fall back rather than erroring
      }
      const customer = {
        id: 'cust_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        type: typeId,
        tip: typeDef.tip,
        name: shoalPick(names),
        drink: { base: shoalPick(DRINK_PARTS.base), flavour: shoalPick(DRINK_PARTS.flavour), finish: shoalPick(DRINK_PARTS.finish) },
        wantsMeal: Math.random() < 0.3
      };
      emp.counterCustomers.push(customer);
      saveDatabase();
      return sendJson(res, 200, { success: true, customer });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/emporium/counter/serve' && req.method === 'POST') {
    try {
      const { handle, customerId, drink, coolerItemId } = await parseJsonBody(req);
      if (!handle || !customerId || !drink) return sendJson(res, 400, { error: 'Missing handle, customerId or drink' });
      const save = getOrCreateShoalTalesSave(handle);
      const result = shoalPerformCounterServe(save, customerId, drink, coolerItemId);
      saveDatabase();
      return sendJson(res, result.status, result.body);
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/emporium/puzzle/start' && req.method === 'POST') {
    try {
      const { handle, trayItemId } = await parseJsonBody(req);
      if (!handle || !trayItemId) return sendJson(res, 400, { error: 'Missing handle or trayItemId' });
      const save = getOrCreateShoalTalesSave(handle);
      if (save.emporium.activePuzzle) return sendJson(res, 400, { error: 'Finish your current puzzle first.' });
      const itemIndex = save.tray.findIndex(t => t.id === trayItemId);
      if (itemIndex < 0) return sendJson(res, 404, { error: 'That item is not in your tray.' });
      const item = save.tray[itemIndex];
      if (item.kind !== 'puzzleBox') return sendJson(res, 400, { error: 'That is not a puzzle box.' });
      save.emporium.activePuzzle = shoalGeneratePuzzle(item.size, item.rarity);
      save.tray.splice(itemIndex, 1);
      saveDatabase();
      return sendJson(res, 200, { success: true, puzzle: save.emporium.activePuzzle });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/emporium/puzzle/press' && req.method === 'POST') {
    try {
      const { handle, cellIndex } = await parseJsonBody(req);
      if (!handle || cellIndex == null) return sendJson(res, 400, { error: 'Missing handle or cellIndex' });
      const save = getOrCreateShoalTalesSave(handle);
      const puzzle = save.emporium.activePuzzle;
      if (!puzzle) return sendJson(res, 400, { error: 'No puzzle in progress.' });
      if (cellIndex < 0 || cellIndex >= puzzle.cells.length) return sendJson(res, 400, { error: 'Cell out of range.' });
      shoalToggleCell(puzzle.cells, cellIndex, puzzle.size);
      const pos = puzzle.solution.indexOf(cellIndex);
      if (pos !== -1) puzzle.solution.splice(pos, 1); else puzzle.solution.push(cellIndex);
      const solved = puzzle.cells.every(c => c === 0);
      let coinsEarned = 0, decoration = null;
      if (solved) {
        const area = shoalAreaById(save.area).valueMultiplier;
        coinsEarned = Math.round(ShoalTalesEngine.puzzleSolvePay(puzzle.rarity, area, shoalPayoutBonus(save)));
        save.coins += coinsEarned;
        save.allTimeStats.coinsEarned += coinsEarned;
        save.monthlyCoinsEarned = (save.monthlyCoinsEarned || 0) + coinsEarned;
        decoration = shoalGrantRandomDecoration(save, ShoalTalesEngine.weightedPick(PRIZE_BOXES.common.weights));
        save.emporium.activePuzzle = null;
      }
      saveDatabase();
      return sendJson(res, 200, { success: true, puzzle: solved ? null : puzzle, solved, coinsEarned, decoration });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/emporium/puzzle/hint' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      const puzzle = save.emporium.activePuzzle;
      if (!puzzle) return sendJson(res, 400, { error: 'No puzzle in progress.' });
      if (save.emporium.tickets < 3) return sendJson(res, 400, { error: 'Not enough tickets (need 3).' });
      if (puzzle.solution.length === 0) return sendJson(res, 400, { error: 'No hint needed - the puzzle is already solved.' });
      save.emporium.tickets -= 3;
      puzzle.hintsUsed += 1;
      const cellIndex = puzzle.solution[0];
      saveDatabase();
      return sendJson(res, 200, { success: true, cellIndex, ticketsLeft: save.emporium.tickets });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Arcade: Tide Timer and Crab Grab are real-time skill minigames in the
  // design bible (a sliding float; 1.1s crab windows). There is no live
  // timing signal available from the client over this request/response API,
  // so both outcomes are rolled directly server-side rather than trusting an
  // unverifiable client-reported score - still a real coin cost and a real
  // (random) ticket payout, just not a skill test. Shell Game keeps its real
  // 3-way guess, since that needs no timing data.
  if (reqPath === '/api/shoal-tales/emporium/arcade/tide-timer' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.emporiumOpen) return sendJson(res, 400, { error: 'The Emporium is not open yet.' });
      if (save.coins < 25) return sendJson(res, 400, { error: 'Not enough coins (need 25).' });
      save.coins -= 25;
      const stop = Math.floor(Math.random() * 9); // 0-8, center=4
      const distance = Math.abs(stop - 4);
      const tickets = [10, 5, 3, 1, 1][distance];
      save.emporium.tickets += tickets;
      saveDatabase();
      return sendJson(res, 200, { success: true, stop, distance, tickets });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/emporium/arcade/crab-grab' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.emporiumOpen) return sendJson(res, 400, { error: 'The Emporium is not open yet.' });
      if (save.coins < 25) return sendJson(res, 400, { error: 'Not enough coins (need 25).' });
      save.coins -= 25;
      const crabsHit = Math.floor(Math.random() * 21); // 0-20
      const tickets = Math.min(10, Math.floor(crabsHit / 3));
      save.emporium.tickets += tickets;
      saveDatabase();
      return sendJson(res, 200, { success: true, crabsHit, tickets });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/emporium/arcade/shell-game' && req.method === 'POST') {
    try {
      const { handle, guess } = await parseJsonBody(req);
      if (!handle || guess == null) return sendJson(res, 400, { error: 'Missing handle or guess' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.emporiumOpen) return sendJson(res, 400, { error: 'The Emporium is not open yet.' });
      if (save.coins < 25) return sendJson(res, 400, { error: 'Not enough coins (need 25).' });
      save.coins -= 25;
      const truth = Math.floor(Math.random() * 3);
      const win = guess === truth;
      let tickets = 0;
      if (win) {
        tickets = Math.min(10, 2 + 2 * save.emporium.shellStreak);
        save.emporium.shellStreak += 1;
      } else {
        save.emporium.shellStreak = 0;
      }
      save.emporium.tickets += tickets;
      saveDatabase();
      return sendJson(res, 200, { success: true, truth, win, tickets, streak: save.emporium.shellStreak });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/emporium/prize-box' && req.method === 'POST') {
    try {
      const { handle, tier } = await parseJsonBody(req);
      if (!handle || !tier) return sendJson(res, 400, { error: 'Missing handle or tier' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.emporiumOpen) return sendJson(res, 400, { error: 'The Emporium is not open yet.' });
      const box = PRIZE_BOXES[tier];
      if (!box) return sendJson(res, 400, { error: 'Unknown prize box tier.' });
      if (save.emporium.tickets < box.tickets) return sendJson(res, 400, { error: `Not enough tickets (need ${box.tickets}).` });
      save.emporium.tickets -= box.tickets;
      const rarity = ShoalTalesEngine.weightedPick(box.weights);
      const decoration = shoalGrantRandomDecoration(save, rarity);
      saveDatabase();
      return sendJson(res, 200, { success: true, decoration });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/emporium/work-order/fill' && req.method === 'POST') {
    try {
      const { handle, orderId } = await parseJsonBody(req);
      if (!handle || !orderId) return sendJson(res, 400, { error: 'Missing handle or orderId' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.emporiumOpen) return sendJson(res, 400, { error: 'The Emporium is not open yet.' });
      const emp = save.emporium;
      const idx = emp.workOrders.findIndex(o => o.id === orderId);
      if (idx < 0) return sendJson(res, 404, { error: 'That order no longer exists.' });
      const order = emp.workOrders[idx];
      const have = shoalAvailableFor(save, order.requires);
      if (have < order.requires.amount) return sendJson(res, 400, { error: `Not enough yet (have ${have}, need ${order.requires.amount}).` });
      const value = shoalValueFor(save, order.requires);
      shoalConsume(save, order.requires, order.requires.amount);
      const pay = Math.round(value * 2);
      save.coins += pay;
      save.allTimeStats.coinsEarned += pay;
      save.monthlyCoinsEarned = (save.monthlyCoinsEarned || 0) + pay;
      let decoration = null;
      if (Math.random() < 0.25) decoration = shoalGrantRandomDecoration(save, ShoalTalesEngine.weightedPick(PRIZE_BOXES.common.weights));
      emp.workOrders[idx] = shoalGenerateWorkOrder(save);
      saveDatabase();
      return sendJson(res, 200, { success: true, coinsEarned: pay, decoration, newOrder: emp.workOrders[idx] });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/emporium/work-order/swap' && req.method === 'POST') {
    try {
      const { handle, orderId } = await parseJsonBody(req);
      if (!handle || !orderId) return sendJson(res, 400, { error: 'Missing handle or orderId' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.emporiumOpen) return sendJson(res, 400, { error: 'The Emporium is not open yet.' });
      const emp = save.emporium;
      const idx = emp.workOrders.findIndex(o => o.id === orderId);
      if (idx < 0) return sendJson(res, 404, { error: 'That order no longer exists.' });
      const cost = ShoalTalesEngine.workOrderSwapCost(save.retirements || 0);
      if (save.coins < cost) return sendJson(res, 400, { error: `Not enough coins (need ${cost}, have ${Math.floor(save.coins)}).` });
      save.coins -= cost;
      emp.workOrders[idx] = shoalGenerateWorkOrder(save);
      saveDatabase();
      return sendJson(res, 200, { success: true, coinsSpent: cost, newOrder: emp.workOrders[idx] });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Tip jar isn't wired up yet - it's filled by visitors, which require the
  // Social phase (parties/guilds/visits, task 24) and the first retirement.
  // Away earnings don't need a visitor and are real today.
  if (reqPath === '/api/shoal-tales/emporium/collect-away-earnings' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.emporiumOpen) return sendJson(res, 400, { error: 'The Emporium is not open yet.' });
      const emp = save.emporium;
      const hoursAway = (Date.now() - new Date(emp.lastVisit).getTime()) / 3600000;
      const area = shoalAreaById(save.area).valueMultiplier;
      const earnings = Math.round(ShoalTalesEngine.awayEarnings(hoursAway, area, shoalPayoutBonus(save)));
      save.coins += earnings;
      save.allTimeStats.coinsEarned += earnings;
      save.monthlyCoinsEarned = (save.monthlyCoinsEarned || 0) + earnings;
      emp.lastVisit = new Date().toISOString();
      saveDatabase();
      return sendJson(res, 200, { success: true, hoursAway: Math.min(hoursAway, 8), earnings });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- Retiring (docs/shoal-tales-spec/11-retiring.md) ---

  // "Announced to everyone in the game" isn't wired up - there's no guild/
  // social broadcast channel yet (that's task 24, Social features); this
  // still fully resets/grants everything the spec calls for on its own.
  if (reqPath === '/api/shoal-tales/retire' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.emporiumOpen) return sendJson(res, 400, { error: 'The Emporium must be open first.' });
      if (save.stationsInstalled.length < ShoalTalesData.stations.length) {
        return sendJson(res, 400, { error: 'All four stations must be installed first.' });
      }
      if (save.basketLevel < 29) {
        return sendJson(res, 400, { error: 'The basket must be fully upgraded (to 32 items) first.' });
      }
      const goal = ShoalTalesEngine.retireGoalForRun(save.retirements + 1);
      if (save.coins < goal.coinsToRetire) {
        return sendJson(res, 400, { error: `Not enough coins to retire (need ${goal.coinsToRetire}, have ${Math.floor(save.coins)}).` });
      }
      const previousAreas = save.unlockedAreas.length;
      const previousDepths = save.unlockedDepths.length;
      const title = shoalApplyRetire(save);
      const newArea = save.unlockedAreas.length > previousAreas ? save.unlockedAreas[save.unlockedAreas.length - 1] : null;
      const newDepth = save.unlockedDepths.length > previousDepths ? save.unlockedDepths[save.unlockedDepths.length - 1] : null;
      saveDatabase();
      return sendJson(res, 200, {
        success: true, retirements: save.retirements, title,
        newArea: newArea ? shoalAreaById(newArea).name : null,
        newDepth: newDepth != null ? ShoalTalesData.depths.find(d => d.level === newDepth).name : null
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- Cosmetics / the Shipwright (docs/shoal-tales-spec/12-cosmetics.md) ---
  // Premium (Seal Token) looks, the Season Champion flag, and event sets are
  // NOT implemented - Seal Tokens are an explicitly-flagged real-money-
  // adjacent currency decision for the site owner, not something to build by
  // default, and Season/events need a leaderboard this build doesn't have
  // (Social, task 24). "Try It On" previews need no endpoint at all - it's a
  // client-only, never-persisted 30s timer per the spec.

  if (reqPath === '/api/shoal-tales/cosmetics/equip-wood' && req.method === 'POST') {
    try {
      const { handle, part, woodId } = await parseJsonBody(req);
      if (!handle || !part || !woodId) return sendJson(res, 400, { error: 'Missing handle, part or woodId' });
      if (!ShoalTalesData.woodParts.includes(part)) return sendJson(res, 400, { error: 'Not a real ship part.' });
      const save = getOrCreateShoalTalesSave(handle);
      if (save.cosmetics.unlockedWoods.indexOf(woodId) === -1) return sendJson(res, 400, { error: 'That wood is not unlocked yet.' });
      save.cosmetics.equippedWood[part] = woodId;
      saveDatabase();
      return sendJson(res, 200, { success: true, equippedWood: save.cosmetics.equippedWood });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/cosmetics/buy-exotic-wood' && req.method === 'POST') {
    try {
      const { handle, woodId } = await parseJsonBody(req);
      if (!handle || !woodId) return sendJson(res, 400, { error: 'Missing handle or woodId' });
      const save = getOrCreateShoalTalesSave(handle);
      const wood = ShoalTalesData.woods.find(w => w.id === woodId);
      if (!wood || wood.free) return sendJson(res, 400, { error: 'Not a purchasable exotic wood.' });
      if (save.cosmetics.unlockedWoods.indexOf(woodId) !== -1) return sendJson(res, 400, { error: 'Already owned.' });
      if (save.retirements < wood.unlocksAtRetirement) return sendJson(res, 400, { error: 'Not unlocked yet.' });
      if (save.coins < wood.cost) return sendJson(res, 400, { error: `Not enough coins (need ${wood.cost}, have ${Math.floor(save.coins)}).` });
      save.coins -= wood.cost;
      save.cosmetics.unlockedWoods.push(woodId);
      saveDatabase();
      return sendJson(res, 200, { success: true, coinsSpent: wood.cost });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/cosmetics/equip-sail' && req.method === 'POST') {
    try {
      const { handle, sailId } = await parseJsonBody(req);
      if (!handle || !sailId) return sendJson(res, 400, { error: 'Missing handle or sailId' });
      const save = getOrCreateShoalTalesSave(handle);
      if (save.cosmetics.unlockedSails.indexOf(sailId) === -1) return sendJson(res, 400, { error: 'That sail is not unlocked yet.' });
      save.cosmetics.equippedSail = sailId;
      saveDatabase();
      return sendJson(res, 200, { success: true, equippedSail: sailId });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/cosmetics/equip-flag' && req.method === 'POST') {
    try {
      const { handle, flagId } = await parseJsonBody(req);
      if (!handle || !flagId) return sendJson(res, 400, { error: 'Missing handle or flagId' });
      const save = getOrCreateShoalTalesSave(handle);
      if (save.cosmetics.unlockedFlags.indexOf(flagId) === -1) return sendJson(res, 400, { error: 'That flag is not unlocked yet.' });
      save.cosmetics.equippedFlag = flagId;
      saveDatabase();
      return sendJson(res, 200, { success: true, equippedFlag: flagId });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // petId may be null, to go pet-less (equip nothing).
  if (reqPath === '/api/shoal-tales/cosmetics/equip-pet' && req.method === 'POST') {
    try {
      const { handle, petId } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (petId && save.cosmetics.unlockedPets.indexOf(petId) === -1) return sendJson(res, 400, { error: 'That pet is not unlocked yet.' });
      save.cosmetics.equippedPet = petId || null;
      saveDatabase();
      return sendJson(res, 200, { success: true, equippedPet: save.cosmetics.equippedPet });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // badgeId may be null, to show no badge.
  if (reqPath === '/api/shoal-tales/cosmetics/equip-badge' && req.method === 'POST') {
    try {
      const { handle, badgeId } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (badgeId && save.cosmetics.unlockedBadges.indexOf(badgeId) === -1) return sendJson(res, 400, { error: 'That badge is not unlocked yet.' });
      save.cosmetics.equippedBadge = badgeId || null;
      saveDatabase();
      return sendJson(res, 200, { success: true, equippedBadge: save.cosmetics.equippedBadge });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Once per real-world day, patting your own equipped pet grants "+5% value
  // for 10 minutes" (folded into shoalPayoutBonus via shoalPetTreatActive).
  // Petting OTHER players' pets needs Visits (task 24) - not built yet.
  if (reqPath === '/api/shoal-tales/cosmetics/pat-pet' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.cosmetics.equippedPet) return sendJson(res, 400, { error: 'You have no pet equipped.' });
      const today = new Date().toISOString().slice(0, 10);
      if (save.cosmetics.petPattedDate === today) {
        return sendJson(res, 400, { error: "Already patted your pet's treat today." });
      }
      save.cosmetics.petPattedDate = today;
      save.cosmetics.petTreatExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      saveDatabase();
      return sendJson(res, 200, { success: true, petTreatExpiresAt: save.cosmetics.petTreatExpiresAt });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/cosmetics/select-track' && req.method === 'POST') {
    try {
      const { handle, trackId } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (trackId && save.cosmetics.unlockedTracks.indexOf(trackId) === -1) return sendJson(res, 400, { error: 'That track is not unlocked yet.' });
      save.cosmetics.equippedTrack = trackId || null;
      saveDatabase();
      return sendJson(res, 200, { success: true, equippedTrack: save.cosmetics.equippedTrack });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- Social: settings (docs/shoal-tales-spec/13-social.md) ---

  if (reqPath === '/api/shoal-tales/settings/visitors' && req.method === 'POST') {
    try {
      const { handle, enabled } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      save.visitorsEnabled = !!enabled;
      saveDatabase();
      return sendJson(res, 200, { success: true, visitorsEnabled: save.visitorsEnabled });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/settings/announcements' && req.method === 'POST') {
    try {
      const { handle, enabled } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      save.announcementsEnabled = !!enabled;
      saveDatabase();
      return sendJson(res, 200, { success: true, announcementsEnabled: save.announcementsEnabled });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- Parties (13-social.md) ---

  if (reqPath === '/api/shoal-tales/party/state' && req.method === 'GET') {
    try {
      const handle = query.get('handle') || '';
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.partyId) return sendJson(res, 200, { success: true, party: null });
      const party = shoalGetParty(save.partyId);
      if (!party) return sendJson(res, 200, { success: true, party: null });
      const members = party.members.map(h => {
        const s = db.shoalTalesSaves[h];
        return {
          handle: h, title: s ? shoalDisplayTitle(s) : null, active: s ? shoalIsRecentlyActive(s, SHOAL_ACTIVITY_WINDOW_MS) : false,
          // A member's own tray is exposed to the rest of the party (and only
          // the party) so Help Sort has something to show - fair game inside
          // a trusted group of up to 4.
          tray: s ? s.tray : []
        };
      });
      return sendJson(res, 200, { success: true, party: { id: party.id, members, chat: party.chat.slice(-50) }, dredgeBonus: shoalPartyDredgeBonus(save) });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/party/create' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (save.partyId) return sendJson(res, 400, { error: 'Already in a party.' });
      const id = 'party_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      db.shoalTalesParties[id] = { id, createdAt: new Date().toISOString(), members: [handle], chat: [] };
      save.partyId = id;
      saveDatabase();
      return sendJson(res, 200, { success: true, partyId: id });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/party/invite' && req.method === 'POST') {
    try {
      const { handle, toHandle } = await parseJsonBody(req);
      if (!handle || !toHandle) return sendJson(res, 400, { error: 'Missing handle or toHandle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.partyId) return sendJson(res, 400, { error: 'You are not in a party. Create one first.' });
      const party = shoalGetParty(save.partyId);
      if (!party) return sendJson(res, 400, { error: 'Your party no longer exists.' });
      if (party.members.length >= 4) return sendJson(res, 400, { error: 'The party is full (4 max).' });
      const target = getOrCreateShoalTalesSave(toHandle);
      if (target.partyId) return sendJson(res, 400, { error: 'That player is already in a party.' });
      if (target.pendingPartyInvites.indexOf(save.partyId) !== -1) return sendJson(res, 400, { error: 'Already invited.' });
      target.pendingPartyInvites.push(save.partyId);
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/party/accept-invite' && req.method === 'POST') {
    try {
      const { handle, partyId } = await parseJsonBody(req);
      if (!handle || !partyId) return sendJson(res, 400, { error: 'Missing handle or partyId' });
      const save = getOrCreateShoalTalesSave(handle);
      if (save.pendingPartyInvites.indexOf(partyId) === -1) return sendJson(res, 400, { error: 'No such invite.' });
      if (save.partyId) return sendJson(res, 400, { error: 'Leave your current party first.' });
      const party = shoalGetParty(partyId);
      if (!party) return sendJson(res, 404, { error: 'That party no longer exists.' });
      if (party.members.length >= 4) return sendJson(res, 400, { error: 'The party is full (4 max).' });
      save.pendingPartyInvites = save.pendingPartyInvites.filter(id => id !== partyId);
      party.members.push(handle);
      save.partyId = partyId;
      saveDatabase();
      return sendJson(res, 200, { success: true, partyId });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/party/decline-invite' && req.method === 'POST') {
    try {
      const { handle, partyId } = await parseJsonBody(req);
      if (!handle || !partyId) return sendJson(res, 400, { error: 'Missing handle or partyId' });
      const save = getOrCreateShoalTalesSave(handle);
      save.pendingPartyInvites = save.pendingPartyInvites.filter(id => id !== partyId);
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/party/leave' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.partyId) return sendJson(res, 400, { error: 'You are not in a party.' });
      const party = shoalGetParty(save.partyId);
      if (party) {
        party.members = party.members.filter(h => h !== handle);
        if (party.members.length === 0) delete db.shoalTalesParties[party.id];
      }
      save.partyId = null;
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/party/chat' && req.method === 'POST') {
    try {
      const { handle, text } = await parseJsonBody(req);
      if (!handle || !text) return sendJson(res, 400, { error: 'Missing handle or text' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.partyId) return sendJson(res, 400, { error: 'You are not in a party.' });
      const party = shoalGetParty(save.partyId);
      if (!party) return sendJson(res, 400, { error: 'Your party no longer exists.' });
      const chatMessage = { handle, text: String(text).slice(0, 500), at: new Date().toISOString() };
      party.chat.push(chatMessage);
      if (party.chat.length > 200) party.chat = party.chat.slice(-200);
      shoalBroadcastToGroup(party.members, 'SHOAL_PARTY_CHAT', party.id, chatMessage);
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // "A party member can sort the host's tray. Coins, streak, and Log stay
  // the host's; the helper earns 1 arcade ticket per 5 good sorts."
  if (reqPath === '/api/shoal-tales/party/help-sort' && req.method === 'POST') {
    try {
      const { handle, hostHandle, trayItemId, bin } = await parseJsonBody(req);
      if (!handle || !hostHandle || !trayItemId || !bin) return sendJson(res, 400, { error: 'Missing handle, hostHandle, trayItemId or bin' });
      const save = getOrCreateShoalTalesSave(handle);
      const hostSave = getOrCreateShoalTalesSave(hostHandle);
      if (!save.partyId || save.partyId !== hostSave.partyId) return sendJson(res, 400, { error: 'You are not in the same party as the host.' });
      const result = shoalPerformSort(hostSave, hostHandle, trayItemId, bin);
      let ticketsEarned = 0;
      if (result.status === 200 && result.body.correct) {
        save.helpSortCount = (save.helpSortCount || 0) + 1;
        if (save.helpSortCount % 5 === 0) {
          save.emporium.tickets += 1;
          ticketsEarned = 1;
        }
      }
      saveDatabase();
      return sendJson(res, result.status, Object.assign({}, result.body, { ticketsEarned }));
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- Guilds (13-social.md) ---

  if (reqPath === '/api/shoal-tales/guild/state' && req.method === 'GET') {
    try {
      const handle = query.get('handle') || '';
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.guildId) return sendJson(res, 200, { success: true, guild: null });
      const guild = shoalGetGuild(save.guildId);
      if (!guild) return sendJson(res, 200, { success: true, guild: null });
      shoalRollGuildDailyQuests(guild);
      const members = guild.members.map(h => {
        const s = db.shoalTalesSaves[h];
        return { handle: h, role: guild.memberRoles[h] || 'member', title: s ? shoalDisplayTitle(s) : null, active: s ? shoalIsRecentlyActive(s, SHOAL_GUILD_ACTIVITY_WINDOW_MS) : false };
      });
      saveDatabase();
      return sendJson(res, 200, {
        success: true,
        guild: {
          id: guild.id, name: guild.name, tag: guild.tag, tagColor: guild.tagColor,
          bannerColor: guild.bannerColor, bannerPattern: guild.bannerPattern,
          members, chat: guild.chat.slice(-50), dailyQuests: guild.dailyQuests,
          upgrades: guild.upgrades, bank: { coins: guild.bank.coins, log: guild.bank.log.slice(-50) },
          completedSets: guild.completedSets
        },
        myRole: guild.memberRoles[handle] || 'member',
        payoutBonus: shoalGuildPayoutBonus(save)
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/guild/found' && req.method === 'POST') {
    try {
      const { handle, name, tag, tagColor, bannerColor, bannerPattern } = await parseJsonBody(req);
      if (!handle || !name || !tag) return sendJson(res, 400, { error: 'Missing handle, name or tag' });
      if (tag.length < 2 || tag.length > 4) return sendJson(res, 400, { error: 'Tag must be 2-4 letters.' });
      const save = getOrCreateShoalTalesSave(handle);
      if (save.guildId) return sendJson(res, 400, { error: 'Already in a guild.' });
      const GUILD_FOUND_COST = 1500; // "A guild costs 1,500 coins" - 09-economy.md
      if (save.coins < GUILD_FOUND_COST) return sendJson(res, 400, { error: `Not enough coins (need ${GUILD_FOUND_COST}, have ${save.coins}).` });
      save.coins -= GUILD_FOUND_COST;
      const id = 'guild_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      db.shoalTalesGuilds[id] = {
        id, name: String(name).slice(0, 40), tag: String(tag).slice(0, 4).toUpperCase(),
        tagColor: tagColor || '#4a90d9', bannerColor: bannerColor || '#4a90d9', bannerPattern: bannerPattern || 'plain',
        createdAt: new Date().toISOString(), members: [handle], memberRoles: { [handle]: 'owner' },
        guildLog: { curios: {}, fish: {} }, completedSets: [],
        dailyQuests: [], dailyQuestsDate: null,
        upgrades: { guildFund: 0, busyNoticeboard: 0, betterRewards: 0 },
        bank: { coins: 0, log: [] }, chat: []
      };
      save.guildId = id;
      saveDatabase();
      return sendJson(res, 200, { success: true, guildId: id });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/guild/invite' && req.method === 'POST') {
    try {
      const { handle, toHandle } = await parseJsonBody(req);
      if (!handle || !toHandle) return sendJson(res, 400, { error: 'Missing handle or toHandle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.guildId) return sendJson(res, 400, { error: 'You are not in a guild.' });
      const guild = shoalGetGuild(save.guildId);
      if (!guild) return sendJson(res, 400, { error: 'Your guild no longer exists.' });
      const target = getOrCreateShoalTalesSave(toHandle);
      if (target.guildId) return sendJson(res, 400, { error: 'That player is already in a guild.' });
      if (target.pendingGuildInvites.indexOf(save.guildId) !== -1) return sendJson(res, 400, { error: 'Already invited.' });
      target.pendingGuildInvites.push(save.guildId);
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/guild/accept-invite' && req.method === 'POST') {
    try {
      const { handle, guildId } = await parseJsonBody(req);
      if (!handle || !guildId) return sendJson(res, 400, { error: 'Missing handle or guildId' });
      const save = getOrCreateShoalTalesSave(handle);
      if (save.pendingGuildInvites.indexOf(guildId) === -1) return sendJson(res, 400, { error: 'No such invite.' });
      if (save.guildId) return sendJson(res, 400, { error: 'Leave your current guild first.' });
      const guild = shoalGetGuild(guildId);
      if (!guild) return sendJson(res, 404, { error: 'That guild no longer exists.' });
      save.pendingGuildInvites = save.pendingGuildInvites.filter(id => id !== guildId);
      guild.members.push(handle);
      guild.memberRoles[handle] = 'member';
      save.guildId = guildId;
      saveDatabase();
      return sendJson(res, 200, { success: true, guildId });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/guild/decline-invite' && req.method === 'POST') {
    try {
      const { handle, guildId } = await parseJsonBody(req);
      if (!handle || !guildId) return sendJson(res, 400, { error: 'Missing handle or guildId' });
      const save = getOrCreateShoalTalesSave(handle);
      save.pendingGuildInvites = save.pendingGuildInvites.filter(id => id !== guildId);
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/guild/leave' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.guildId) return sendJson(res, 400, { error: 'You are not in a guild.' });
      const guild = shoalGetGuild(save.guildId);
      if (guild) {
        const wasOwner = guild.memberRoles[handle] === 'owner';
        guild.members = guild.members.filter(h => h !== handle);
        delete guild.memberRoles[handle];
        if (guild.members.length === 0) {
          delete db.shoalTalesGuilds[guild.id];
        } else if (wasOwner) {
          // No ownership-transfer UI is specced, so leaving owner hands the
          // crown to the longest-standing officer (or else member) instead
          // of leaving the guild leaderless.
          const nextOwner = guild.members.find(h => guild.memberRoles[h] === 'officer') || guild.members[0];
          guild.memberRoles[nextOwner] = 'owner';
        }
      }
      save.guildId = null;
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/guild/promote' && req.method === 'POST') {
    try {
      const { handle, targetHandle } = await parseJsonBody(req);
      if (!handle || !targetHandle) return sendJson(res, 400, { error: 'Missing handle or targetHandle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.guildId) return sendJson(res, 400, { error: 'You are not in a guild.' });
      const guild = shoalGetGuild(save.guildId);
      if (!guild) return sendJson(res, 400, { error: 'Your guild no longer exists.' });
      if (guild.memberRoles[handle] !== 'owner') return sendJson(res, 400, { error: 'Only the guild owner can promote members.' });
      if (guild.memberRoles[targetHandle] !== 'member') return sendJson(res, 400, { error: 'That member cannot be promoted.' });
      guild.memberRoles[targetHandle] = 'officer';
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/guild/demote' && req.method === 'POST') {
    try {
      const { handle, targetHandle } = await parseJsonBody(req);
      if (!handle || !targetHandle) return sendJson(res, 400, { error: 'Missing handle or targetHandle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.guildId) return sendJson(res, 400, { error: 'You are not in a guild.' });
      const guild = shoalGetGuild(save.guildId);
      if (!guild) return sendJson(res, 400, { error: 'Your guild no longer exists.' });
      if (guild.memberRoles[handle] !== 'owner') return sendJson(res, 400, { error: 'Only the guild owner can demote officers.' });
      if (guild.memberRoles[targetHandle] !== 'officer') return sendJson(res, 400, { error: 'That member is not an officer.' });
      guild.memberRoles[targetHandle] = 'member';
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/guild/disband' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.guildId) return sendJson(res, 400, { error: 'You are not in a guild.' });
      const guild = shoalGetGuild(save.guildId);
      if (!guild) return sendJson(res, 400, { error: 'Your guild no longer exists.' });
      if (guild.memberRoles[handle] !== 'owner') return sendJson(res, 400, { error: 'Only the guild owner can disband it.' });
      guild.members.forEach(h => {
        const s = db.shoalTalesSaves[h];
        if (s) s.guildId = null;
      });
      delete db.shoalTalesGuilds[guild.id];
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/guild/chat' && req.method === 'POST') {
    try {
      const { handle, text } = await parseJsonBody(req);
      if (!handle || !text) return sendJson(res, 400, { error: 'Missing handle or text' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.guildId) return sendJson(res, 400, { error: 'You are not in a guild.' });
      const guild = shoalGetGuild(save.guildId);
      if (!guild) return sendJson(res, 400, { error: 'Your guild no longer exists.' });
      const chatMessage = { handle, text: String(text).slice(0, 500), at: new Date().toISOString() };
      guild.chat.push(chatMessage);
      if (guild.chat.length > 200) guild.chat = guild.chat.slice(-200);
      shoalBroadcastToGroup(guild.members, 'SHOAL_GUILD_CHAT', guild.id, chatMessage);
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // "Each member claims each finished quest once for coins (300 x area x
  // payout) and 3 tickets" - Better Rewards adds +25% coins per level.
  if (reqPath === '/api/shoal-tales/guild/quest-claim' && req.method === 'POST') {
    try {
      const { handle, questType } = await parseJsonBody(req);
      if (!handle || !questType) return sendJson(res, 400, { error: 'Missing handle or questType' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.guildId) return sendJson(res, 400, { error: 'You are not in a guild.' });
      const guild = shoalGetGuild(save.guildId);
      if (!guild) return sendJson(res, 400, { error: 'Your guild no longer exists.' });
      shoalRollGuildDailyQuests(guild);
      const q = guild.dailyQuests.find(q => q.type === questType);
      if (!q) return sendJson(res, 400, { error: 'No such quest active today.' });
      if (q.progress < q.goal) return sendJson(res, 400, { error: 'That quest is not finished yet.' });
      if (q.claimedBy.indexOf(handle) !== -1) return sendJson(res, 400, { error: 'Already claimed.' });
      q.claimedBy.push(handle);
      const area = shoalAreaById(save.area);
      const betterRewardsBonus = (guild.upgrades.betterRewards || 0) * 0.25;
      const coins = Math.round(300 * area.valueMultiplier * (1 + shoalPayoutBonus(save)) * (1 + betterRewardsBonus));
      save.coins += coins;
      save.allTimeStats.coinsEarned += coins;
      save.monthlyCoinsEarned = (save.monthlyCoinsEarned || 0) + coins;
      save.emporium.tickets += 3;
      saveDatabase();
      return sendJson(res, 200, { success: true, coins, tickets: 3 });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/guild/bank/deposit' && req.method === 'POST') {
    try {
      const { handle, amount } = await parseJsonBody(req);
      if (!handle || !amount) return sendJson(res, 400, { error: 'Missing handle or amount' });
      if ([100, 1000, 5000].indexOf(amount) === -1) return sendJson(res, 400, { error: 'Deposit must be 100, 1,000, or 5,000 coins.' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.guildId) return sendJson(res, 400, { error: 'You are not in a guild.' });
      const guild = shoalGetGuild(save.guildId);
      if (!guild) return sendJson(res, 400, { error: 'Your guild no longer exists.' });
      if (save.coins < amount) return sendJson(res, 400, { error: `Not enough coins (need ${amount}, have ${save.coins}).` });
      save.coins -= amount;
      guild.bank.coins += amount;
      guild.bank.log.push({ type: 'deposit', handle, amount, at: new Date().toISOString() });
      if (guild.bank.log.length > 200) guild.bank.log = guild.bank.log.slice(-200);
      saveDatabase();
      return sendJson(res, 200, { success: true, bankCoins: guild.bank.coins });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/guild/bank/purchase-upgrade' && req.method === 'POST') {
    try {
      const { handle, upgradeId } = await parseJsonBody(req);
      if (!handle || !upgradeId) return sendJson(res, 400, { error: 'Missing handle or upgradeId' });
      const def = GUILD_UPGRADES[upgradeId];
      if (!def) return sendJson(res, 400, { error: 'Unknown upgradeId.' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.guildId) return sendJson(res, 400, { error: 'You are not in a guild.' });
      const guild = shoalGetGuild(save.guildId);
      if (!guild) return sendJson(res, 400, { error: 'Your guild no longer exists.' });
      const role = guild.memberRoles[handle];
      if (role !== 'owner' && role !== 'officer') return sendJson(res, 400, { error: 'Only the owner or officers can buy upgrades.' });
      const level = guild.upgrades[upgradeId] || 0;
      if (level >= def.maxLevel) return sendJson(res, 400, { error: 'That upgrade is already at max level.' });
      const cost = def.cost(level);
      if (guild.bank.coins < cost) return sendJson(res, 400, { error: `Not enough in the Guild Bank (need ${cost}, have ${guild.bank.coins}).` });
      guild.bank.coins -= cost;
      guild.upgrades[upgradeId] = level + 1;
      guild.bank.log.push({ type: 'purchase', handle, upgradeId, cost, newLevel: level + 1, at: new Date().toISOString() });
      if (guild.bank.log.length > 200) guild.bank.log = guild.bank.log.slice(-200);
      saveDatabase();
      return sendJson(res, 200, { success: true, upgradeId, newLevel: level + 1, coinsSpent: cost, bankCoins: guild.bank.coins });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- Visits (13-social.md) ---

  if (reqPath === '/api/shoal-tales/visit' && req.method === 'GET') {
    try {
      const handle = query.get('handle') || '';
      const ownerHandle = query.get('ownerHandle') || '';
      if (!ownerHandle) return sendJson(res, 400, { error: 'Missing ownerHandle' });
      const ownerSave = getOrCreateShoalTalesSave(ownerHandle);
      if (!shoalCanVisit(handle, ownerSave)) return sendJson(res, 400, { error: 'You are not welcome to visit this boat.' });
      const guild = ownerSave.guildId ? shoalGetGuild(ownerSave.guildId) : null;
      return sendJson(res, 200, {
        success: true,
        boat: {
          handle: ownerHandle, title: shoalDisplayTitle(ownerSave), retirements: ownerSave.retirements,
          cosmetics: ownerSave.cosmetics, bestStreakEver: ownerSave.bestStreakEver,
          setsCompleted: shoalCountCompletedSets(ownerSave).length,
          emporiumOpen: ownerSave.emporiumOpen,
          decorationsOwned: ownerSave.emporiumOpen ? ownerSave.emporium.decorationsOwned : null,
          tipJar: ownerSave.emporiumOpen ? ownerSave.emporium.tipJar : 0,
          guild: guild ? { name: guild.name, tag: guild.tag, tagColor: guild.tagColor } : null,
          // "After the first retirement, Emporium owners can invite visitors,
          // who can serve at the Counter (owner online) and tip." - the
          // waiting customers are exposed so a visitor has something to pick
          // a drink order against.
          counterCustomers: ownerSave.emporiumOpen ? ownerSave.emporium.counterCustomers : [],
          canServeCounter: ownerSave.emporiumOpen && ownerSave.retirements >= 1 && shoalIsHandleOnline(ownerHandle),
          canTip: ownerSave.emporiumOpen && ownerSave.retirements >= 1
        }
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/visit/tip' && req.method === 'POST') {
    try {
      const { handle, ownerHandle, amount } = await parseJsonBody(req);
      if (!handle || !ownerHandle || !amount) return sendJson(res, 400, { error: 'Missing handle, ownerHandle or amount' });
      if (handle === ownerHandle) return sendJson(res, 400, { error: "You can't tip yourself." });
      if (amount <= 0) return sendJson(res, 400, { error: 'Tip must be a positive amount.' });
      const save = getOrCreateShoalTalesSave(handle);
      const ownerSave = getOrCreateShoalTalesSave(ownerHandle);
      if (!ownerSave.emporiumOpen || ownerSave.retirements < 1) return sendJson(res, 400, { error: 'This player is not accepting tips yet.' });
      if (!shoalCanVisit(handle, ownerSave)) return sendJson(res, 400, { error: 'You are not welcome to visit this boat.' });
      if (save.coins < amount) return sendJson(res, 400, { error: `Not enough coins (need ${amount}, have ${save.coins}).` });
      save.coins -= amount;
      // Tips go straight into the owner's coins (it's real money for their
      // shop) - tipJar is kept alongside as a running "lifetime tips" total
      // for display, since nothing in 13-social.md calls for a separate
      // jar-collection step.
      ownerSave.coins += amount;
      ownerSave.allTimeStats.coinsEarned += amount;
      ownerSave.monthlyCoinsEarned = (ownerSave.monthlyCoinsEarned || 0) + amount;
      ownerSave.emporium.tipJar = (ownerSave.emporium.tipJar || 0) + amount;
      saveDatabase();
      return sendJson(res, 200, { success: true, tipJar: ownerSave.emporium.tipJar });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/visit/serve-counter' && req.method === 'POST') {
    try {
      const { handle, ownerHandle, customerId, drink, coolerItemId } = await parseJsonBody(req);
      if (!handle || !ownerHandle || !customerId || !drink) return sendJson(res, 400, { error: 'Missing handle, ownerHandle, customerId or drink' });
      const ownerSave = getOrCreateShoalTalesSave(ownerHandle);
      if (ownerSave.retirements < 1) return sendJson(res, 400, { error: 'This player cannot invite visitors to the Counter yet (needs a first retirement).' });
      if (!shoalIsHandleOnline(ownerHandle)) return sendJson(res, 400, { error: 'The owner must be online to be helped at the Counter.' });
      if (!shoalCanVisit(handle, ownerSave)) return sendJson(res, 400, { error: 'You are not welcome to visit this boat.' });
      const result = shoalPerformCounterServe(ownerSave, customerId, drink, coolerItemId);
      saveDatabase();
      return sendJson(res, result.status, result.body);
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- Gifts (13-social.md) ---

  if (reqPath === '/api/shoal-tales/gift/send' && req.method === 'POST') {
    try {
      const { handle, toHandle, storedCurioId } = await parseJsonBody(req);
      if (!handle || !toHandle || !storedCurioId) return sendJson(res, 400, { error: 'Missing handle, toHandle or storedCurioId' });
      if (handle === toHandle) return sendJson(res, 400, { error: "You can't gift yourself." });
      const save = getOrCreateShoalTalesSave(handle);
      const idx = save.storedCurios.findIndex(c => c.id === storedCurioId);
      if (idx < 0) return sendJson(res, 404, { error: 'That stored curio was not found.' });
      if (!shoalIsHandleOnline(toHandle)) return sendJson(res, 400, { error: 'That player must be online to receive a gift.' });
      const target = getOrCreateShoalTalesSave(toHandle);
      const curio = save.storedCurios[idx];
      save.storedCurios.splice(idx, 1);
      target.storedCurios.push(Object.assign({}, curio, { id: 'stored_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), giftedBy: handle }));
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- Bottle letters, player-written (13-social.md) ---

  if (reqPath === '/api/shoal-tales/bottle/keep' && req.method === 'POST') {
    try {
      const { handle, trayItemId } = await parseJsonBody(req);
      if (!handle || !trayItemId) return sendJson(res, 400, { error: 'Missing handle or trayItemId' });
      const save = getOrCreateShoalTalesSave(handle);
      const itemIndex = save.tray.findIndex(t => t.id === trayItemId);
      if (itemIndex < 0) return sendJson(res, 404, { error: 'That item is not in your tray.' });
      if (save.tray[itemIndex].kind !== 'emptyBottle') return sendJson(res, 400, { error: 'That is not an empty bottle.' });
      save.tray.splice(itemIndex, 1);
      save.emptyBottlesKept = (save.emptyBottlesKept || 0) + 1;
      saveDatabase();
      return sendJson(res, 200, { success: true, emptyBottlesKept: save.emptyBottlesKept });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/bottle/trade-for-kit' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if ((save.emptyBottlesKept || 0) < 1) return sendJson(res, 400, { error: 'You have no kept empty bottles to trade.' });
      save.emptyBottlesKept -= 1;
      save.writingKits = (save.writingKits || 0) + 1;
      saveDatabase();
      return sendJson(res, 200, { success: true, emptyBottlesKept: save.emptyBottlesKept, writingKits: save.writingKits });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // "Staff read every letter before it can wash up; at most 3 can wait for
  // review at once" - read literally, the cap is global (across all
  // authors), not per-author.
  if (reqPath === '/api/shoal-tales/letters/write' && req.method === 'POST') {
    try {
      const { handle, text, anonymous } = await parseJsonBody(req);
      if (!handle || !text) return sendJson(res, 400, { error: 'Missing handle or text' });
      const trimmed = String(text).trim();
      if (trimmed.length === 0 || trimmed.length > 900) return sendJson(res, 400, { error: 'A letter must be 1-900 characters.' });
      const save = getOrCreateShoalTalesSave(handle);
      if ((save.writingKits || 0) < 1) return sendJson(res, 400, { error: 'You need a writing kit (trade a kept empty bottle for one).' });
      const pendingCount = Object.values(db.shoalTalesBottleLetters).filter(l => l.status === 'pending').length;
      if (pendingCount >= 3) return sendJson(res, 400, { error: 'The review queue is full right now (max 3) - try again later.' });
      save.writingKits -= 1;
      const id = 'letter_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      db.shoalTalesBottleLetters[id] = {
        id, authorHandle: handle, text: trimmed, anonymous: !!anonymous, status: 'pending',
        heartCount: 0, foundBy: [], createdAt: new Date().toISOString()
      };
      saveDatabase();
      return sendJson(res, 200, { success: true, letterId: id, writingKits: save.writingKits });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Staff moderation queue - plain API endpoints gated by isSuperAdminHandle
  // rather than a dedicated admin web app (not built in this pass; see the
  // task's status report for the scope note).
  if (reqPath === '/api/shoal-tales/letters/moderate/list-pending' && req.method === 'GET') {
    try {
      const handle = query.get('handle') || '';
      if (!isSuperAdminHandle(handle)) return sendJson(res, 403, { error: 'Staff only.' });
      const pending = Object.values(db.shoalTalesBottleLetters).filter(l => l.status === 'pending');
      return sendJson(res, 200, { success: true, letters: pending });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/letters/moderate/approve' && req.method === 'POST') {
    try {
      const { handle, letterId } = await parseJsonBody(req);
      if (!isSuperAdminHandle(handle)) return sendJson(res, 403, { error: 'Staff only.' });
      const letter = db.shoalTalesBottleLetters[letterId];
      if (!letter) return sendJson(res, 404, { error: 'No such letter.' });
      letter.status = 'approved';
      shoalCheckLetterWriterFeat(getOrCreateShoalTalesSave(letter.authorHandle));
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/letters/moderate/reject' && req.method === 'POST') {
    try {
      const { handle, letterId, reason } = await parseJsonBody(req);
      if (!isSuperAdminHandle(handle)) return sendJson(res, 403, { error: 'Staff only.' });
      const letter = db.shoalTalesBottleLetters[letterId];
      if (!letter) return sendJson(res, 404, { error: 'No such letter.' });
      letter.status = 'rejected';
      letter.rejectReason = reason || null;
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // "A found letter can be hearted once; hearted letters wash up more often."
  if (reqPath === '/api/shoal-tales/letters/heart' && req.method === 'POST') {
    try {
      const { handle, letterId } = await parseJsonBody(req);
      if (!handle || !letterId) return sendJson(res, 400, { error: 'Missing handle or letterId' });
      const save = getOrCreateShoalTalesSave(handle);
      const letter = db.shoalTalesBottleLetters[letterId];
      if (!letter || letter.foundBy.indexOf(handle) === -1) return sendJson(res, 400, { error: "You haven't found this letter." });
      if ((save.heartedLetterIds || []).indexOf(letterId) !== -1) return sendJson(res, 400, { error: 'Already hearted.' });
      save.heartedLetterIds.push(letterId);
      letter.heartCount = (letter.heartCount || 0) + 1;
      saveDatabase();
      return sendJson(res, 200, { success: true, heartCount: letter.heartCount });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // "A letter can be reported with a reason, pulling it from the sea and
  // sending it back to staff" - puts it back in the pending queue (so it
  // stops surfacing to other players until re-approved).
  if (reqPath === '/api/shoal-tales/letters/report' && req.method === 'POST') {
    try {
      const { handle, letterId, reason } = await parseJsonBody(req);
      if (!handle || !letterId || !reason) return sendJson(res, 400, { error: 'Missing handle, letterId or reason' });
      const letter = db.shoalTalesBottleLetters[letterId];
      if (!letter || letter.foundBy.indexOf(handle) === -1) return sendJson(res, 400, { error: "You haven't found this letter." });
      letter.status = 'pending';
      letter.reportedBy = handle;
      letter.reportReason = String(reason).slice(0, 500);
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // "Players can write a reply to a found letter. Only the original writer
  // finds the reply, delivered on their next haul."
  if (reqPath === '/api/shoal-tales/letters/reply' && req.method === 'POST') {
    try {
      const { handle, letterId, text } = await parseJsonBody(req);
      if (!handle || !letterId || !text) return sendJson(res, 400, { error: 'Missing handle, letterId or text' });
      const trimmed = String(text).trim();
      if (trimmed.length === 0 || trimmed.length > 900) return sendJson(res, 400, { error: 'A reply must be 1-900 characters.' });
      const letter = db.shoalTalesBottleLetters[letterId];
      if (!letter || letter.foundBy.indexOf(handle) === -1) return sendJson(res, 400, { error: "You haven't found this letter." });
      const authorSave = getOrCreateShoalTalesSave(letter.authorHandle);
      authorSave.pendingLetterReplies.push({ letterId, from: handle, text: trimmed, at: new Date().toISOString() });
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- Leaderboards (13-social.md) ---

  if (reqPath === '/api/shoal-tales/leaderboard' && req.method === 'GET') {
    try {
      const type = query.get('type') || 'lifetimeCoins';
      const valueFns = {
        retirements: s => s.retirements || 0,
        setsCompleted: s => shoalCountCompletedSets(s).length,
        bestStreak: s => s.bestStreakEver || 0,
        lifetimeCoins: s => s.allTimeStats.coinsEarned || 0,
        monthlyCoins: s => s.monthlyCoinsEarned || 0,
        monthlySets: s => s.monthlySetsCompleted || 0
      };
      const valueFn = valueFns[type];
      if (!valueFn) return sendJson(res, 400, { error: 'Unknown leaderboard type.' });
      const rows = Object.values(db.shoalTalesSaves)
        .map(s => ({ handle: s.handle, title: shoalDisplayTitle(s), value: valueFn(s) }))
        .filter(r => r.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 20);
      return sendJson(res, 200, { success: true, type, rows });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- Tides (14-extras.md): "short server-wide events (1-240 minutes,
  // default 10) started by staff by hand, never at random" - maps to a
  // superadmin-triggered action, per 16-minecraft-to-web.md's mechanics note. ---

  if (reqPath === '/api/shoal-tales/tide/status' && req.method === 'GET') {
    try {
      const tide = shoalActiveTide();
      const def = tide ? ShoalTalesData.tides.find(t => t.id === tide.type) : null;
      return sendJson(res, 200, { success: true, tide: tide ? { type: tide.type, name: def ? def.name : tide.type, effect: def ? def.effect : null, endsAt: tide.endsAt } : null });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/admin/tide/start' && req.method === 'POST') {
    try {
      const { handle, type, minutes } = await parseJsonBody(req);
      if (!isSuperAdminHandle(handle)) return sendJson(res, 403, { error: 'Staff only.' });
      const def = ShoalTalesData.tides.find(t => t.id === type);
      if (!def) return sendJson(res, 400, { error: 'Unknown tide type.' });
      const mins = Math.min(240, Math.max(1, Number(minutes) || 10));
      const endsAt = new Date(Date.now() + mins * 60000).toISOString();
      db.shoalTalesActiveTide = { type, startedAt: new Date().toISOString(), endsAt, startedBy: handle };
      shoalBroadcastAnnouncement(`${def.name} has begun! (${def.effect}, ${mins} min)`);
      saveDatabase();
      return sendJson(res, 200, { success: true, tide: db.shoalTalesActiveTide });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/admin/tide/stop' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!isSuperAdminHandle(handle)) return sendJson(res, 403, { error: 'Staff only.' });
      const wasActive = shoalActiveTide();
      db.shoalTalesActiveTide = null;
      if (wasActive) {
        const def = ShoalTalesData.tides.find(t => t.id === wasActive.type);
        shoalBroadcastAnnouncement(`${def ? def.name : 'The tide'} has ended.`);
      }
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- Events (14-extras.md): "longer, dated" - staff-scheduled, reusing
  // existing curios/fish as a temporary event set rather than inventing new
  // content (17-open-items.md: "the owner designs real events after launch"). ---

  if (reqPath === '/api/shoal-tales/event/status' && req.method === 'GET') {
    try {
      const event = shoalActiveEvent();
      return sendJson(res, 200, { success: true, event: event ? { id: event.id, name: event.name, endsAt: event.endsAt } : null });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/admin/event/start' && req.method === 'POST') {
    try {
      const { handle, id, name, curioIds, fishIds, minutes } = await parseJsonBody(req);
      if (!isSuperAdminHandle(handle)) return sendJson(res, 403, { error: 'Staff only.' });
      if (!id || !name) return sendJson(res, 400, { error: 'Missing id or name' });
      const mins = Math.max(1, Number(minutes) || 1440);
      const endsAt = new Date(Date.now() + mins * 60000).toISOString();
      // "Reusing an event's id next year brings it back" - restarting the
      // same id just overwrites the run (start/end dates), nothing about
      // past completions needs resetting.
      db.shoalTalesActiveEvent = { id, name, curioIds: curioIds || [], fishIds: fishIds || [], startsAt: new Date().toISOString(), endsAt, startedBy: handle };
      shoalBroadcastAnnouncement(`The ${name} event has begun!`);
      saveDatabase();
      return sendJson(res, 200, { success: true, event: db.shoalTalesActiveEvent });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/admin/event/end' && req.method === 'POST') {
    try {
      const { handle } = await parseJsonBody(req);
      if (!isSuperAdminHandle(handle)) return sendJson(res, 403, { error: 'Staff only.' });
      const wasActive = shoalActiveEvent();
      db.shoalTalesActiveEvent = null;
      if (wasActive) shoalBroadcastAnnouncement(`The ${wasActive.name} event has ended.`);
      saveDatabase();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- Stats: The Desk's Profile (14-extras.md) ---

  if (reqPath === '/api/shoal-tales/stats' && req.method === 'GET') {
    try {
      const handle = query.get('handle') || '';
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      const lettersFound = save.bottleLettersFound.length
        + Object.values(db.shoalTalesBottleLetters).filter(l => l.foundBy.indexOf(handle) !== -1).length;
      return sendJson(res, 200, {
        success: true,
        stats: {
          allTime: Object.assign({}, save.allTimeStats, {
            setsCompleted: shoalCountCompletedSets(save).length,
            goldenSets: (save.goldenSetIds || []).length,
            creaturesSeen: save.creaturesSeen.length,
            lettersFound: lettersFound,
            retirements: save.retirements
          }),
          thisRun: { coinsEarned: save.lifetimeCoinsThisRun, bestStreak: save.bestStreakThisRun },
          unlockedFeatTitles: save.unlockedFeatTitles || [],
          featTitleChosen: save.featTitleChosen
        }
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- Feat titles (14-extras.md) ---

  if (reqPath === '/api/shoal-tales/cosmetics/equip-feat-title' && req.method === 'POST') {
    try {
      const { handle, featTitleId } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (featTitleId === null || featTitleId === undefined) {
        save.featTitleChosen = null;
      } else {
        if ((save.unlockedFeatTitles || []).indexOf(featTitleId) === -1) return sendJson(res, 400, { error: 'That feat title is not unlocked yet.' });
        save.featTitleChosen = featTitleId;
      }
      saveDatabase();
      return sendJson(res, 200, { success: true, featTitleChosen: save.featTitleChosen });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- The Quest Book (14-extras.md) ---

  if (reqPath === '/api/shoal-tales/quest-book' && req.method === 'GET') {
    try {
      const handle = query.get('handle') || '';
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      const quests = ShoalTalesData.questBook.map(q => {
        const unlocked = shoalQuestUnlocked(save, q);
        const claimed = (save.claimedQuestIds || []).indexOf(q.id) !== -1;
        const progress = unlocked ? shoalQuestProgress(save, q) : null;
        return {
          id: q.id, chapter: q.chapter, order: q.order, title: q.title, description: q.description, reward: q.reward,
          unlocked, claimed, done: !!progress && progress.have >= progress.need, progress
        };
      });
      return sendJson(res, 200, { success: true, quests });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/quest-book/claim' && req.method === 'POST') {
    try {
      const { handle, questId } = await parseJsonBody(req);
      if (!handle || !questId) return sendJson(res, 400, { error: 'Missing handle or questId' });
      const save = getOrCreateShoalTalesSave(handle);
      const quest = ShoalTalesData.questBook.find(q => q.id === questId);
      if (!quest) return sendJson(res, 404, { error: 'No such quest.' });
      if (!save.claimedQuestIds) save.claimedQuestIds = [];
      if (save.claimedQuestIds.indexOf(questId) !== -1) return sendJson(res, 400, { error: 'Already claimed.' });
      if (!shoalQuestUnlocked(save, quest)) return sendJson(res, 400, { error: 'Complete the previous quest first.' });
      const progress = shoalQuestProgress(save, quest);
      if (progress.have < progress.need) return sendJson(res, 400, { error: `Not finished yet (${progress.have}/${progress.need}).` });
      save.claimedQuestIds.push(questId);
      const granted = shoalGrantQuestReward(save, quest.reward);
      saveDatabase();
      return sendJson(res, 200, { success: true, granted });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- Settings (14-extras.md) not already covered by visitorsEnabled/
  // announcementsEnabled (task 24). Sea sounds/sparkles/the dredge-is-up
  // chat line are stored preferences the UI reads; there's no licensed
  // audio to gate (same scope note as the radio tracks in 12-cosmetics.md). ---

  if (reqPath === '/api/shoal-tales/settings/sea-sounds' && req.method === 'POST') {
    try {
      const { handle, enabled } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.settings) save.settings = { seaSounds: true, dredgeChatLine: true, sparkles: true, titleDisplay: true };
      save.settings.seaSounds = !!enabled;
      saveDatabase();
      return sendJson(res, 200, { success: true, settings: save.settings });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/settings/dredge-chat-line' && req.method === 'POST') {
    try {
      const { handle, enabled } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.settings) save.settings = { seaSounds: true, dredgeChatLine: true, sparkles: true, titleDisplay: true };
      save.settings.dredgeChatLine = !!enabled;
      saveDatabase();
      return sendJson(res, 200, { success: true, settings: save.settings });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/settings/sparkles' && req.method === 'POST') {
    try {
      const { handle, enabled } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.settings) save.settings = { seaSounds: true, dredgeChatLine: true, sparkles: true, titleDisplay: true };
      save.settings.sparkles = !!enabled;
      saveDatabase();
      return sendJson(res, 200, { success: true, settings: save.settings });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/shoal-tales/settings/title-display' && req.method === 'POST') {
    try {
      const { handle, enabled } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const save = getOrCreateShoalTalesSave(handle);
      if (!save.settings) save.settings = { seaSounds: true, dredgeChatLine: true, sparkles: true, titleDisplay: true };
      save.settings.titleDisplay = !!enabled;
      saveDatabase();
      return sendJson(res, 200, { success: true, settings: save.settings });
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
