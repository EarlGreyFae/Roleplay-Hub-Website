// =========================================================================
// Roleplay Hub - Production Server & Real-Time Sync Engine
// Compatible with Render.com Node Web Service & Local Node environments
// Includes persistent JSON storage, WebSocket relay, and robust REST APIs
// =========================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 10000;
const DATA_DIR = path.join(__dirname, 'data');
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
  vapidKeys: null
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
        vapidKeys: parsed.vapidKeys || null
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

function saveDatabaseSync() {
  try {
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
    if (pgPool) {
      pgPool.query(
        "INSERT INTO roleplay_hub_store (key, value, updated_at) VALUES ('database_state', $1, now()) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()",
        [JSON.stringify(db)]
      ).catch(err => console.error('[DB] PG save error:', err.message));
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
          vapidKeys: pgData.vapidKeys || null
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
      if (user.password !== password) {
        return sendJson(res, 401, { error: 'Incorrect password. Please try again.' });
      }
      return sendJson(res, 200, {
        success: true,
        user: {
          handle: user.handle,
          name: user.name,
          role: user.role || 'user',
          avatarUrl: user.avatarUrl,
          passkeys: user.passkeys || [],
          createdAt: user.createdAt
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
        password: password,
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
      db.users[normKey].password = newPassword;
      saveDatabase();
      return sendJson(res, 200, { success: true, message: 'Password updated successfully' });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (reqPath === '/api/auth/update-profile' && req.method === 'POST') {
    try {
      const { handle, name, avatarUrl } = await parseJsonBody(req);
      if (!handle) return sendJson(res, 400, { error: 'Missing handle' });
      const normKey = handle.trim().toLowerCase();
      const u = db.users[normKey];
      if (!u) return sendJson(res, 404, { error: 'User not found' });
      if (name) u.name = name.trim();
      if (avatarUrl) u.avatarUrl = avatarUrl;
      saveDatabase();
      broadcast({ type: 'PROFILE_UPDATED', user: { handle: u.handle, name: u.name, avatarUrl: u.avatarUrl } });
      return sendJson(res, 200, { success: true, user: u });
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
            createdAt: found.createdAt
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
      createdAt: db.users[normKey].createdAt
    } : null;

    return sendJson(res, 200, {
      user: userObj,
      worlds: userWorlds,
      channels: userChannels,
      messages: userMessages,
      wikiEntries: userWiki,
      dmMessages: userDMs,
      invites: userInvites,
      directory
    });
  }

  // 4. Worlds Endpoints
  if (reqPath === '/api/worlds' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const { name, tagline, description, themeAccent, creatorHandle, creatorName, coverUrl } = payload;
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
        themeAccent: themeAccent || '#38bdf8',
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
  if (reqPath.startsWith('/api/worlds/') && !reqPath.includes('/transfer') && !reqPath.includes('/members') && !reqPath.includes('/join') && (req.method === 'PUT' || req.method === 'PATCH' || (req.method === 'POST' && !reqPath.endsWith('/worlds')))) {
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
      if (payload.themeAccent !== undefined) w.themeAccent = payload.themeAccent;
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

  if (reqPath.includes('/members') && req.method === 'POST') {
    try {
      const worldId = reqPath.split('/api/worlds/')[1].split('/members')[0];
      const { handle, role, callerHandle } = await parseJsonBody(req);
      const w = db.worlds[worldId];
      if (!w) return sendJson(res, 404, { error: 'World not found' });
      const callerRole = getRoleForWorld(w, callerHandle);
      if (callerRole !== 'creator' && !isSuperAdminHandle(callerHandle)) {
        return sendJson(res, 403, { error: 'Only the World Creator can manage member roles.' });
      }
      if (!Array.isArray(w.members)) w.members = [];

      const existing = w.members.find(m => (m.handle || '').toLowerCase() === handle.toLowerCase());
      if (existing) {
        existing.role = role;
      } else {
        w.members.push({ handle, role: role || 'viewer', joinedAt: new Date().toISOString() });
      }

      saveDatabase();
      broadcast({ type: 'WORLD_MEMBERS_UPDATED', worldId, members: w.members });
      return sendJson(res, 200, { success: true, members: w.members });
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

  // 10. Dev Testing & Simulation (Superadmin Only)
  if (reqPath === '/api/dev/simulate' && req.method === 'POST') {
    try {
      const { action, callerHandle, payload } = await parseJsonBody(req);
      const callerUser = db.users[(callerHandle || '').toLowerCase()];
      if (!callerUser || callerUser.role !== 'superadmin') {
        return sendJson(res, 403, { error: 'Dev options are restricted to Superadmin.' });
      }

      if (action === 'simulate_dm') {
        const simDm = {
          id: `dm_sim_${Date.now()}`,
          senderHandle: payload?.senderHandle || '@RoleplayPartner',
          senderName: payload?.senderName || 'Rowan (Partner)',
          senderAvatarUrl: payload?.senderAvatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          recipientHandle: callerHandle,
          content: payload?.content || 'Hey! Just hopped onto the hub. Ready to continue our chapter?',
          imageUrl: payload?.imageUrl || null,
          timestamp: new Date().toISOString(),
          status: 'delivered'
        };
        db.dmMessages.push(simDm);
        saveDatabase();
        broadcast({ type: 'NEW_DM', message: simDm });
        return sendJson(res, 200, { success: true, dm: simDm });
      }

      if (action === 'simulate_chat_msg') {
        const simMsg = {
          id: `msg_sim_${Date.now()}`,
          worldId: payload.worldId,
          channelId: payload.channelId,
          speakerName: payload.speakerName || 'Elias Malakor',
          speakerType: payload.speakerType || 'IC',
          speakerHandle: payload.speakerHandle || '@RoleplayPartner',
          avatarUrl: payload.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          narratorName: 'Rowan',
          narratorHandle: '@RoleplayPartner',
          content: payload.content || 'The shadows along the obsidian archway flicker as I step into the ruins.',
          imageUrl: null,
          timestamp: new Date().toISOString()
        };
        db.messages.push(simMsg);
        saveDatabase();
        broadcast({ type: 'NEW_MESSAGE', message: simMsg });
        return sendJson(res, 200, { success: true, message: simMsg });
      }

      if (action === 'seed_demo_world') {
        const demoId = `world_aethelgard_${Date.now()}`;
        const demoWorld = {
          id: demoId,
          name: 'Aethelgard: Astral Frontier',
          genre: 'High Mystery Fantasy',
          tagline: 'Ancient celestial ruins humming with forgotten songs and wild frontiers.',
          description: 'A continent suspended between twilight seas and shattered astral gates. Haven taverns shelter travelers investigating lunar anomalies.',
          coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
          creatorHandle: '@EarlGreyFae',
          createdAt: new Date().toISOString(),
          members: [
            { handle: '@EarlGreyFae', name: 'Kitty', role: 'creator', joinedAt: new Date().toISOString() },
            { handle: '@StorySeeker', name: 'Rowan', role: 'editor', joinedAt: new Date().toISOString() }
          ]
        };
        db.worlds[demoId] = demoWorld;

        const starterChannels = [
          { id: `ch_${demoId}_main_roleplay`, worldId: demoId, name: 'main-roleplay', category: 'Roleplay', description: 'Primary IC scenes', topic: 'Act 1' },
          { id: `ch_${demoId}_ooc_lounge`, worldId: demoId, name: 'ooc-lounge', category: 'Discussion', description: 'Out-of-character chat', topic: 'OOC talk' }
        ];
        starterChannels.forEach(c => { db.channels[c.id] = c; });

        db.wikiEntries.push({
          id: `char_vera_${Date.now()}`,
          worldId: demoId,
          category: 'character',
          title: 'Vera Starlight',
          summary: 'A wandering celestial bard seeking fragments of the lost choral sphere.',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          characterDetails: {
            archetype: 'Celestial Bard',
            appearance: 'Silver-streaked dark hair, luminous amber eyes, adorned in twilight silk tunics.',
            personality: 'Witty, fiercely protective of companions, curious to a fault.',
            background: 'Trained in the High Conservatory before the Astral Gate fracture.',
            abilities: 'Harmonic resonance spells, acoustic illusions, rapier fencing.',
            equipment: 'Star-glass lute, mirrored foil, celestial compass.',
            notes: 'Searching for the missing ninth stanza of the Hymn of Solitude.'
          },
          authorHandle: '@EarlGreyFae',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        db.wikiEntries.push({
          id: `lore_gate_${Date.now()}`,
          worldId: demoId,
          category: 'lore',
          title: 'The Astral Gates',
          summary: 'Ancient conduits of light connecting floating continents across the stratosphere.',
          contentMarkdown: '== The Astral Gates ==\n\nConstructed during the First Astral Dawn, these monoliths generate gravitational pathways through the void.\n\n=== Known Anomalies ===\n* Resonant frequencies trigger spontaneous teleportation.\n* Corrupted gates emit harmonic discord.',
          authorHandle: '@EarlGreyFae',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        saveDatabase();
        broadcast({ type: 'DEMO_WORLD_SEEDED', world: demoWorld, channels: starterChannels });
        return sendJson(res, 200, { success: true, world: demoWorld });
      }

      if (action === 'clear_all_worlds') {
        const uHandle = callerHandle.toLowerCase();
        for (const [wId, w] of Object.entries(db.worlds)) {
          if ((w.creatorHandle || '').toLowerCase() === uHandle) {
            delete db.worlds[wId];
            for (const [cId, ch] of Object.entries(db.channels)) {
              if (ch.worldId === wId) delete db.channels[cId];
            }
            db.messages = db.messages.filter(m => m.worldId !== wId);
            db.wikiEntries = db.wikiEntries.filter(e => e.worldId !== wId);
          }
        }
        saveDatabase();
        broadcast({ type: 'WORLDS_RESET', handle: callerHandle });
        return sendJson(res, 200, { success: true, message: 'Worlds cleared for user' });
      }

      return sendJson(res, 400, { error: 'Unknown dev action' });
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
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
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
  webpush.setVapidDetails('mailto:admin@roleplay-hub.local', db.vapidKeys.publicKey, db.vapidKeys.privateKey);
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
      if (err.statusCode === 404 || err.statusCode === 410) {
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
