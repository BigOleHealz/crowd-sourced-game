import { randomBytes, randomUUID, scrypt as scryptCallback, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import pg from 'pg';
import googleAuth from 'google-auth-library';

const scrypt = promisify(scryptCallback);
const cookieName = 'gta_session';
const sessionAge = 30 * 24 * 60 * 60;
const usernamePattern = /^[A-Za-z0-9_]{3,20}$/;
const attempts = new Map();
const dummySalt = '00000000000000000000000000000000';
const dummyHash = Buffer.alloc(64);

function tokenHash(token) { return createHash('sha256').update(token).digest('hex'); }
function cookie(request, token, maxAge = sessionAge) {
  const secure = process.env.RENDER === 'true' || request.socket.encrypted || request.headers['x-forwarded-proto'] === 'https';
  return `${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
function tokenFrom(request) {
  const match = request.headers.cookie?.match(/(?:^|;\s*)gta_session=([a-f0-9]{64})(?:;|$)/);
  return match?.[1] ?? null;
}
function json(response, status, body, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  response.end(JSON.stringify(body));
}
function allowedOrigin(request) {
  const origin = request.headers.origin;
  return typeof origin === 'string' &&
    (origin === `https://${request.headers.host}` || origin === `http://${request.headers.host}`);
}
async function bodyFrom(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new Error('JSON required');
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 8192) throw new Error('Request too large');
  }
  return JSON.parse(raw);
}
async function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}
async function passwordMatches(password, stored) {
  const [salt, hex] = stored?.split(':') ?? [dummySalt, dummyHash.toString('hex')];
  const expected = Buffer.from(hex, 'hex');
  const actual = await scrypt(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual) && !!stored;
}
function attemptKey(request, pathname) {
  // Render's edge supplies the client IP here; the TCP peer is its shared proxy.
  const address = process.env.RENDER === 'true' && request.headers['cf-connecting-ip'] || request.socket.remoteAddress;
  return `${address}:${pathname}`;
}
function limited(request, pathname) {
  const key = attemptKey(request, pathname);
  const now = Date.now();
  if (attempts.size > 10000) attempts.clear();
  const item = attempts.get(key);
  const entry = item && item.until > now ? item : { count: 0, until: now + 15 * 60_000 };
  entry.count++;
  attempts.set(key, entry);
  return entry.count > 10;
}

export async function createAccountStore(databaseUrl = process.env.DATABASE_URL, options = {}) {
  if (!databaseUrl) return null;
  const googleClientId = options.googleClientId ?? process.env.GOOGLE_CLIENT_ID;
  const googleClient = googleClientId ? new googleAuth.OAuth2Client() : null;
  const verifyGoogleToken = options.verifyGoogleToken ?? (async credential => {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: googleClientId });
    return ticket.getPayload();
  });
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 5000 });
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS player_accounts (
      id uuid PRIMARY KEY, username varchar(20) NOT NULL UNIQUE,
      password_hash text, google_sub text, created_at timestamptz NOT NULL DEFAULT now(),
      kills integer NOT NULL DEFAULT 0, deaths integer NOT NULL DEFAULT 0,
      play_seconds integer NOT NULL DEFAULT 0, sessions integer NOT NULL DEFAULT 0
    )`);
    await pool.query('ALTER TABLE player_accounts ALTER COLUMN password_hash DROP NOT NULL');
    await pool.query('ALTER TABLE player_accounts ADD COLUMN IF NOT EXISTS google_sub text');
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS player_accounts_google_sub ON player_accounts (google_sub)');
    await pool.query(`CREATE TABLE IF NOT EXISTS player_sessions (
      token_hash char(64) PRIMARY KEY, player_id uuid NOT NULL REFERENCES player_accounts(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL
    )`);
    await pool.query('CREATE INDEX IF NOT EXISTS player_sessions_expiry ON player_sessions (expires_at)');
  } catch (error) {
    await pool.end();
    throw error;
  }
  async function session(request) {
    const token = tokenFrom(request);
    if (!token) return null;
    const { rows } = await pool.query(`SELECT a.id, a.username, a.kills, a.deaths, a.play_seconds, a.sessions
      FROM player_sessions s JOIN player_accounts a ON a.id=s.player_id
      WHERE s.token_hash=$1 AND s.expires_at>now()`, [tokenHash(token)]);
    return rows[0] ?? null;
  }
  async function startSession(id) {
    const token = randomBytes(32).toString('hex');
    await pool.query(`INSERT INTO player_sessions (token_hash, player_id, expires_at)
      VALUES ($1,$2,now() + interval '30 days')`, [tokenHash(token), id]);
    return token;
  }
  async function googleSignIn(credential, username) {
    if (!googleClientId) return { status: 503, body: { error: 'Google sign-in is not configured yet.' } };
    if (typeof credential !== 'string' || credential.length > 8000) {
      return { status: 400, body: { error: 'Invalid Google credential.' } };
    }
    let payload;
    try { payload = await verifyGoogleToken(credential); }
    catch { return { status: 401, body: { error: 'Google sign-in failed. Please try again.' } }; }
    if (typeof payload?.sub !== 'string' || !payload.sub) {
      return { status: 401, body: { error: 'Google sign-in failed. Please try again.' } };
    }
    const existing = await pool.query('SELECT id FROM player_accounts WHERE google_sub=$1', [payload.sub]);
    if (existing.rows[0]) return { status: 200, token: await startSession(existing.rows[0].id), body: { ok: true } };
    if (username == null) return { status: 200, body: { needsUsername: true } };
    if (typeof username !== 'string' || !usernamePattern.test(username)) {
      return { status: 400, body: { error: 'Choose a username with 3–20 letters, numbers, or underscores.' } };
    }
    try {
      const id = randomUUID();
      await pool.query('INSERT INTO player_accounts (id,username,google_sub) VALUES ($1,$2,$3)',
        [id, username.toLowerCase(), payload.sub]);
      return { status: 201, token: await startSession(id), body: { ok: true } };
    } catch (error) {
      if (error.code === '23505') return { status: 409, body: { error: 'Username already taken, or this Google account is already registered.' } };
      throw error;
    }
  }
  return {
    session,
    googleSignIn,
    close: () => pool.end(),
    async stats(id, kills, deaths, playSeconds, sessions = 0) {
      await pool.query(`UPDATE player_accounts SET kills=kills+$2, deaths=deaths+$3,
        play_seconds=play_seconds+$4, sessions=sessions+$5 WHERE id=$1`,
      [id, kills, deaths, playSeconds, sessions]);
    },
    async handle(request, response, pathname) {
      if (request.method === 'GET' && pathname === '/api/account') {
        return json(response, 200, { enabled: true, googleClientId, account: await session(request) });
      }
      if (request.method !== 'POST' || !allowedOrigin(request)) {
        return json(response, 403, { error: 'Forbidden' });
      }
      if (pathname === '/api/account/logout') {
        const token = tokenFrom(request);
        if (token) await pool.query('DELETE FROM player_sessions WHERE token_hash=$1', [tokenHash(token)]);
        return json(response, 200, { ok: true }, { 'Set-Cookie': cookie(request, '', 0) });
      }
      if (pathname !== '/api/account/register' && pathname !== '/api/account/login' && pathname !== '/api/account/google') {
        return json(response, 404, { error: 'Not found' });
      }
      if (limited(request, pathname)) return json(response, 429, { error: 'Too many attempts. Try again later.' });
      let body;
      try { body = await bodyFrom(request); }
      catch { return json(response, 400, { error: 'Invalid request' }); }
      if (pathname === '/api/account/google') {
        const result = await googleSignIn(body?.credential, body?.username);
        if (result.token) attempts.delete(attemptKey(request, pathname));
        return json(response, result.status, result.body,
          result.token ? { 'Set-Cookie': cookie(request, result.token) } : {});
      }
      const username = body?.username;
      const password = body?.password;
      if (typeof username !== 'string' || !usernamePattern.test(username) ||
          typeof password !== 'string' || password.length < 10 || password.length > 128) {
        return json(response, 400, { error: 'Use a 3–20 character username and a password of 10–128 characters.' });
      }
      if (pathname === '/api/account/register') {
        try {
          const id = randomUUID();
          const hash = await passwordHash(password);
          await pool.query(`INSERT INTO player_accounts (id,username,password_hash) VALUES ($1,$2,$3)`,
            [id, username.toLowerCase(), hash]);
          const token = await startSession(id);
          attempts.delete(attemptKey(request, pathname));
          return json(response, 201, { ok: true }, { 'Set-Cookie': cookie(request, token) });
        } catch (error) {
          if (error.code === '23505') return json(response, 409, { error: 'Username already taken.' });
          throw error;
        }
      }
      if (pathname === '/api/account/login') {
        const { rows } = await pool.query('SELECT id,password_hash FROM player_accounts WHERE username=$1',
          [username.toLowerCase()]);
        if (!await passwordMatches(password, rows[0]?.password_hash)) {
          return json(response, 401, { error: 'Username or password is incorrect.' });
        }
        const token = await startSession(rows[0].id);
        attempts.delete(attemptKey(request, pathname));
        return json(response, 200, { ok: true }, { 'Set-Cookie': cookie(request, token) });
      }
      return json(response, 404, { error: 'Not found' });
    },
  };
}

export function accountUnavailable(response) {
  json(response, 503, { enabled: false, error: 'Accounts are not available yet.' });
}
