const { createClient } = require('@libsql/client/web');
const { randomBytes, createHash } = require('node:crypto');
const {
  validateResume,
  InputError,
  hashPassword,
  verifyPassword,
} = require('./local-store.cjs');
const seed = require('./seed.json');
const schema = [
  'CREATE TABLE IF NOT EXISTS metadata (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS work_experiences (id TEXT PRIMARY KEY, position INTEGER NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)))',
  'CREATE TABLE IF NOT EXISTS technical_skills (id TEXT PRIMARY KEY, position INTEGER NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)))',
  'CREATE TABLE IF NOT EXISTS contact_info (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL CHECK(json_valid(payload)))',
  'CREATE TABLE IF NOT EXISTS admins (username TEXT PRIMARY KEY, password_hash TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, username TEXT NOT NULL REFERENCES admins(username) ON DELETE CASCADE, expires_at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, resets_at INTEGER NOT NULL)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)',
];
function openClient() {
  const url = process.env.TURSO_DATABASE_URL,
    authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken)
    throw new InputError(
      '请配置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN，然后重新部署。',
      503,
    );
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new InputError('TURSO_DATABASE_URL 格式不正确', 503);
  }
  if (
    !['libsql:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  )
    throw new InputError('云端数据库必须使用 libsql:// 或 https:// 地址', 503);
  return createClient({ url, authToken });
}
function writeStatements(data) {
  return [
    'DELETE FROM work_experiences',
    'DELETE FROM technical_skills',
    ...data.roles.map((row, index) => ({
      sql: 'INSERT INTO work_experiences VALUES(?, ?, ?)',
      args: [row.id, index, JSON.stringify(row)],
    })),
    ...data.skills.map((row, index) => ({
      sql: 'INSERT INTO technical_skills VALUES(?, ?, ?)',
      args: [row.id, index, JSON.stringify(row)],
    })),
    {
      sql: 'INSERT INTO contact_info VALUES(1, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',
      args: [JSON.stringify(data.contacts)],
    },
  ];
}
async function transaction(client, mode, action) {
  const tx = await client.transaction(mode);
  try {
    const result = await action(tx);
    await tx.commit();
    return result;
  } catch (error) {
    try {
      await tx.rollback();
    } catch {}
    throw error;
  } finally {
    tx.close();
  }
}
// Factory keeps transport injectable for tests; application uses one remote client per warm instance.
function createRemoteStore(client, options = {}) {
  let initialization;
  async function ready() {
    if (!initialization)
      initialization = (async () => {
        await client.batch(schema, 'write');
        const password =
          options.adminPassword ?? process.env.RESUME_ADMIN_PASSWORD;
        const username =
          options.adminUsername ??
          (process.env.RESUME_ADMIN_USERNAME || 'admin');
        if (
          typeof username !== 'string' ||
          !username.trim() ||
          username.length > 80
        )
          throw new InputError('管理员账号应为 1–80 个字符', 503);
        // Hash before taking the transaction lock; never overwrite an existing administrator.
        const hash = password ? await hashPassword(password) : null;
        await transaction(client, 'write', async (tx) => {
          if (
            !(await tx.execute('SELECT id FROM metadata WHERE id=1')).rows
              .length
          ) {
            await tx.batch([
              ...writeStatements(seed),
              'INSERT INTO metadata VALUES(1, 0)',
            ]);
          }
          if (hash)
            await tx.execute({
              sql: 'INSERT INTO admins(username, password_hash) SELECT ?, ? WHERE NOT EXISTS(SELECT 1 FROM admins)',
              args: [username.trim(), hash],
            });
        });
        return client;
      })().catch((error) => {
        initialization = undefined;
        throw error;
      });
    return initialization;
  }
  async function readResume() {
    const db = await ready();
    const results = await db.batch(
      [
        'SELECT revision FROM metadata WHERE id=1',
        'SELECT payload FROM work_experiences ORDER BY position',
        'SELECT payload FROM technical_skills ORDER BY position',
        'SELECT payload FROM contact_info WHERE id=1',
      ],
      'read',
    );
    return {
      revision: Number(results[0].rows[0].revision),
      roles: results[1].rows.map((row) => JSON.parse(row.payload)),
      skills: results[2].rows.map((row) => JSON.parse(row.payload)),
      contacts: JSON.parse(results[3].rows[0].payload),
    };
  }
  async function saveResume(input) {
    const data = validateResume(input),
      db = await ready();
    return transaction(db, 'write', async (tx) => {
      if (
        Number(
          (await tx.execute('SELECT revision FROM metadata WHERE id=1')).rows[0]
            .revision,
        ) !== data.revision
      )
        throw new InputError(
          '数据已被其他页面修改，请重新载入后再编辑。当前草稿尚未保存。',
          409,
        );
      await tx.batch([
        ...writeStatements(data),
        'UPDATE metadata SET revision=revision+1 WHERE id=1',
      ]);
      return { ...data, revision: data.revision + 1 };
    });
  }
  const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
  async function sessionUser(token) {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
    const db = await ready();
    return (
      (
        await db.execute({
          sql: 'SELECT username FROM sessions WHERE token_hash=? AND expires_at>?',
          args: [tokenHash(token), Date.now()],
        })
      ).rows[0]?.username || null
    );
  }
  async function login(username, password) {
    if (
      typeof username !== 'string' ||
      username.length > 80 ||
      typeof password !== 'string' ||
      password.length > 128
    )
      throw new InputError('账号或密码不正确', 401);
    const db = await ready(),
      now = Date.now();
    const attempt = await db.execute({
      sql: `INSERT INTO login_attempts VALUES('admin-login', 1, ?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN resets_at<=? THEN 1 ELSE attempts+1 END, resets_at=CASE WHEN resets_at<=? THEN ? ELSE resets_at END RETURNING attempts`,
      args: [now + 900000, now, now, now + 900000],
    });
    if (Number(attempt.rows[0].attempts) > 10)
      throw new InputError('登录尝试过多，请 15 分钟后重试', 429);
    const admin = (
      await db.execute({
        sql: 'SELECT * FROM admins WHERE username=?',
        args: [username.trim()],
      })
    ).rows[0];
    const verified = await verifyPassword(
      password,
      admin?.password_hash || '0'.repeat(32) + ':' + '0'.repeat(128),
    );
    if (!admin || !verified) throw new InputError('账号或密码不正确', 401);
    const token = randomBytes(32).toString('hex');
    const result = await db.batch(
      [
        { sql: 'DELETE FROM sessions WHERE expires_at<=?', args: [now] },
        {
          sql: 'INSERT INTO sessions(token_hash, username, expires_at) SELECT ?, username, ? FROM admins WHERE username=? AND password_hash=?',
          args: [
            tokenHash(token),
            now + 28800000,
            admin.username,
            admin.password_hash,
          ],
        },
        "DELETE FROM login_attempts WHERE key='admin-login'",
      ],
      'write',
    );
    if (!result[1].rowsAffected)
      throw new InputError('账号状态已改变，请重新登录', 401);
    return token;
  }
  async function logout(token) {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return;
    const db = await ready();
    await db.execute({
      sql: 'DELETE FROM sessions WHERE token_hash=?',
      args: [tokenHash(token)],
    });
  }
  async function changePassword(token, current, next) {
    const username = await sessionUser(token);
    if (!username) throw new InputError('登录已失效，请重新登录', 401);
    const db = await ready(),
      admin = (
        await db.execute({
          sql: 'SELECT password_hash FROM admins WHERE username=?',
          args: [username],
        })
      ).rows[0];
    if (!(await verifyPassword(current, admin.password_hash)))
      throw new InputError('当前密码不正确');
    const hash = await hashPassword(next);
    await transaction(db, 'write', async (tx) => {
      const session = await tx.execute({
        sql: 'SELECT username FROM sessions WHERE token_hash=? AND expires_at>?',
        args: [tokenHash(token), Date.now()],
      });
      if (!session.rows.length)
        throw new InputError('登录已失效，请重新登录', 401);
      const updated = await tx.execute({
        sql: 'UPDATE admins SET password_hash=? WHERE username=? AND password_hash=?',
        args: [hash, username, admin.password_hash],
      });
      if (!updated.rowsAffected)
        throw new InputError('密码已改变，请重新登录', 401);
      await tx.execute({
        sql: 'DELETE FROM sessions WHERE username=?',
        args: [username],
      });
    });
  }
  async function createAdmin(username, password) {
    if (
      typeof username !== 'string' ||
      !username.trim() ||
      username.length > 80
    )
      throw new InputError('账号格式不正确');
    const hash = await hashPassword(password),
      db = await ready();
    await db.execute({
      sql: 'INSERT INTO admins VALUES(?, ?)',
      args: [username.trim(), hash],
    });
  }
  return {
    readResume,
    saveResume,
    sessionUser,
    login,
    logout,
    changePassword,
    createAdmin,
  };
}
module.exports = {
  openClient,
  createRemoteStore,
  schema,
  writeStatements,
  transaction,
};
