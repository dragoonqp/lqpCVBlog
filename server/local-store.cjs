const { schema: contactSchema, createContactAccess } = require('./contact-access.cjs');
const { resolveSave, sameContent } = require('./resolve-save.cjs');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const {
  randomBytes,
  createHash,
  scrypt: scryptCallback,
  timingSafeEqual,
} = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(scryptCallback);
const seed = require('./seed.json');
const defaultNotes = require('./notes-seed.json');
let connection;
function db() {
  if (process.env.VERCEL)
    throw new InputError('Vercel 不能写入本地 SQLite，请配置云端数据库。', 503);
  const { DatabaseSync } = require('node:sqlite');
  if (connection) return connection;
  const filename =
    process.env.RESUME_DB_PATH ||
    path.join(process.cwd(), 'data', 'resume.sqlite');
  mkdirSync(path.dirname(filename), { recursive: true });
  connection = new DatabaseSync(filename);
  connection.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS engineering_notes (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL CHECK(json_valid(payload)));
    CREATE TABLE IF NOT EXISTS metadata (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS work_experiences (id TEXT PRIMARY KEY, position INTEGER NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)));
    CREATE TABLE IF NOT EXISTS technical_skills (id TEXT PRIMARY KEY, position INTEGER NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)));
    CREATE TABLE IF NOT EXISTS contact_info (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL CHECK(json_valid(payload)));
    CREATE TABLE IF NOT EXISTS admins (username TEXT PRIMARY KEY, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, username TEXT NOT NULL REFERENCES admins(username) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, resets_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);`);
  connection.exec(contactSchema.join(';'));
  connection.exec('BEGIN IMMEDIATE');
  try {
    if (!connection.prepare('SELECT id FROM metadata WHERE id=1').get()) {
      writeRows(connection, seed);
      connection.prepare('INSERT INTO metadata VALUES(1, 0)').run();
    }
    connection.exec('COMMIT');
  } catch (error) {
    connection.exec('ROLLBACK');
    throw error;
  }
  return connection;
}
function writeRows(database, data) {
  database.prepare('INSERT INTO engineering_notes VALUES(1, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(JSON.stringify(data.notes ?? defaultNotes));
  database.prepare('DELETE FROM work_experiences').run();
  database.prepare('DELETE FROM technical_skills').run();
  const roleInsert = database.prepare(
    'INSERT INTO work_experiences VALUES(?, ?, ?)',
  );
  const skillInsert = database.prepare(
    'INSERT INTO technical_skills VALUES(?, ?, ?)',
  );
  data.roles.forEach((row, i) =>
    roleInsert.run(row.id, i, JSON.stringify(row)),
  );
  data.skills.forEach((row, i) =>
    skillInsert.run(row.id, i, JSON.stringify(row)),
  );
  database
    .prepare(
      'INSERT INTO contact_info VALUES(1, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',
    )
    .run(JSON.stringify(data.contacts));
}
function readResume() {
  const database = db();
  database.exec('BEGIN');
  try {
    const result = {
      revision: database
        .prepare('SELECT revision FROM metadata WHERE id=1')
        .get().revision,
      roles: database
        .prepare('SELECT payload FROM work_experiences ORDER BY position')
        .all()
        .map((row) => JSON.parse(row.payload)),
      skills: database
        .prepare('SELECT payload FROM technical_skills ORDER BY position')
        .all()
        .map((row) => JSON.parse(row.payload)),
      notes: JSON.parse(database.prepare('SELECT payload FROM engineering_notes WHERE id=1').get()?.payload ?? JSON.stringify(defaultNotes)),
      contacts: JSON.parse(
        database.prepare('SELECT payload FROM contact_info WHERE id=1').get()
          .payload,
      ),
    };
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new InputError('数据格式不正确');
  return value;
}
function text(value, label, max = 200, required = true, preserveWhitespace = false) {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new InputError(`${label}不能为空且不能超过 ${max} 字符`);
  return preserveWhitespace ? value : value.trim();
}
function number(value, label, max, nullable = false) {
  if (nullable && value === null) return null;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max
  )
    throw new InputError(`${label}必须在 0–${max} 之间`);
  return value;
}
function validateResume(input) {
  const data = object(input);
  if (!Number.isSafeInteger(data.revision) || data.revision < 0)
    throw new InputError('无效的数据版本');
  function rows(values, label, map) {
    if (!Array.isArray(values) || values.length > 200)
      throw new InputError(`${label}最多 200 条`);
    const ids = new Set();
    return values.map((value) => {
      const row = object(value),
        id = text(row.id, 'ID', 64);
      if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id))
        throw new InputError('ID 无效或重复');
      ids.add(id);
      return { id, ...map(row) };
    });
  }
  const roles = rows(data.roles, '工作经历', (row) => {
    if (!Array.isArray(row.tags) || row.tags.length > 30)
      throw new InputError('每条经历最多 30 个标签');
    return {
      ...(row.roleZh !== undefined
        ? { roleZh: text(row.roleZh, '中文职位', 200, false) }
        : {}),
      ...(row.summaryZh !== undefined
        ? { summaryZh: text(row.summaryZh, '中文经历描述', 10000, false, true) }
        : {}),
      company: text(row.company, '公司'),
      role: text(row.role, '职位'),
      dates: text(row.dates, '日期'),
      summary: text(row.summary, '经历描述', 10000, true, true),
      stat: text(row.stat, '成果', 200, false),
      tags: row.tags.map((tag) => text(tag, '标签', 200)),
    };
  });
  const skills = rows(data.skills, '技能', (row) => {
    if (
      !['Frontend', 'Full-stack', 'Visual', 'Engineering'].includes(row.group)
    )
      throw new InputError('无效的技能分组');
    if (typeof row.fill !== 'string' || !/^#[0-9a-f]{6}$/i.test(row.fill))
      throw new InputError('无效的技能颜色');
    return {
      name: text(row.name, '技能名称', 100),
      group: row.group,
      fill: row.fill,
      level: number(row.level, '掌握程度', 100, true),
      years: number(row.years, '使用年限', 60, true),
      impact: number(row.impact, '影响范围', 10),
    };
  });
  const c = object(data.contacts);
  const contacts = Object.fromEntries(
    ['phone', 'email', 'location', 'linkedin', 'whatsapp', 'telegram'].map(
      (key) => [key, text(c[key], key, 300, false)],
    ),
  );
  if (c.languages !== undefined) {
    if (!Array.isArray(c.languages) || c.languages.length > 20) throw new InputError('工作语言最多 20 项');
    contacts.languages = rows(c.languages, '工作语言', row => ({
      name: text(row.name, '语言名称', 100),
      nameZh: text(row.nameZh ?? '', '中文语言名称', 100, false),
      proficiency: text(row.proficiency ?? '', '熟练程度', 100, false),
      proficiencyZh: text(row.proficiencyZh ?? '', '中文熟练程度', 100, false),
    }));
  }
  if (c.name !== undefined) contacts.name = text(c.name, '姓名', 100);
  if (c.nameZh !== undefined) contacts.nameZh = text(c.nameZh, '中文姓名', 100, false);
  if (contacts.phone && !/^\+?[\d ()-]{5,40}$/.test(contacts.phone))
    throw new InputError('电话格式不正确');
  if (
    contacts.email &&
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(contacts.email)
  )
    throw new InputError('邮箱格式不正确');
  for (const [key, domains] of [
    ['linkedin', ['linkedin.com', 'www.linkedin.com']],
    ['whatsapp', ['wa.me', 'api.whatsapp.com']],
    ['telegram', ['t.me']],
  ]) {
    if (!contacts[key]) continue;
    let url;
    try {
      url = new URL(contacts[key]);
    } catch {
      throw new InputError(`${key} 请填写完整 HTTPS 链接`);
    }
    if (
      url.protocol !== 'https:' ||
      !domains.includes(url.hostname) ||
      url.username ||
      url.password ||
      url.port
    )
      throw new InputError(`${key} 请填写该平台的 HTTPS 链接`);
  }
  const notes = data.notes === undefined ? undefined : rows(data.notes, '工程笔记', row => ({
    type: text(row.type, '笔记分类', 100),
    title: text(row.title, '笔记标题', 200),
    blurb: text(row.blurb, '笔记内容', 10000, true, true),
    ...Object.fromEntries(['typeZh', 'titleZh', 'blurbZh'].filter(key => row[key] !== undefined).map(key => [key, text(row[key], '中文笔记', key === 'blurbZh' ? 10000 : key === 'typeZh' ? 100 : 200, false, key === 'blurbZh')])),
  }));
  return { revision: data.revision, roles, skills, contacts, ...(notes === undefined ? {} : { notes }) };
}
function saveResume(input) {
  const data = validateResume(input);
  const baseline =
    input.baseline === undefined ? null : validateResume(input.baseline);
  const database = db();
  database.exec('BEGIN IMMEDIATE');
  try {
    const current = {
      revision: database
        .prepare('SELECT revision FROM metadata WHERE id=1')
        .get().revision,
      roles: database
        .prepare('SELECT payload FROM work_experiences ORDER BY position')
        .all()
        .map((row) => JSON.parse(row.payload)),
      skills: database
        .prepare('SELECT payload FROM technical_skills ORDER BY position')
        .all()
        .map((row) => JSON.parse(row.payload)),
      notes: JSON.parse(database.prepare('SELECT payload FROM engineering_notes WHERE id=1').get()?.payload ?? JSON.stringify(defaultNotes)),
      contacts: JSON.parse(
        database.prepare('SELECT payload FROM contact_info WHERE id=1').get()
          .payload,
      ),
    };
    const merged = resolveSave(data, baseline, current, InputError);
    if (sameContent(merged, current)) {
      database.exec('COMMIT');
      return current;
    }
    writeRows(database, merged);
    database
      .prepare('UPDATE metadata SET revision=revision+1 WHERE id=1')
      .run();
    database.exec('COMMIT');
    return { ...merged, revision: current.revision + 1 };
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
async function hashPassword(password) {
  if (
    typeof password !== 'string' ||
    password.length < 12 ||
    password.length > 128
  )
    throw new InputError('密码须为 12–128 个字符');
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + (await scrypt(password, salt, 64)).toString('hex');
}
async function verifyPassword(password, hash) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const [salt, hex] = hash.split(':');
  const actual = await scrypt(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hex, 'hex'));
}
const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
async function createAdmin(username, password) {
  username = text(username, '账号', 80);
  const hash = await hashPassword(password);
  db().prepare('INSERT INTO admins VALUES(?, ?)').run(username, hash);
}
async function login(username, password) {
  if (
    typeof username !== 'string' ||
    username.length > 80 ||
    typeof password !== 'string' ||
    password.length > 128
  )
    throw new InputError('账号或密码不正确', 401);
  const database = db(),
    now = Date.now();
  // One administrator application: a global budget also prevents rotating usernames to bypass throttling.
  database.prepare('DELETE FROM login_attempts WHERE resets_at<=?').run(now);
  database
    .prepare(
      'INSERT INTO login_attempts VALUES(?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1',
    )
    .run('admin-login', now + 15 * 60 * 1000);
  if (
    database
      .prepare('SELECT attempts FROM login_attempts WHERE key=?')
      .get('admin-login').attempts > 10
  )
    throw new InputError('登录尝试过多，请 15 分钟后重试', 429);
  const admin = database
    .prepare('SELECT * FROM admins WHERE username=?')
    .get(username.trim());
  const dummy = '0'.repeat(32) + ':' + '0'.repeat(128);
  const verified = await verifyPassword(
    password,
    admin?.password_hash || dummy,
  );
  if (!admin || !verified) throw new InputError('账号或密码不正确', 401);
  database.prepare('DELETE FROM login_attempts WHERE key=?').run('admin-login');
  database.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
  const token = randomBytes(32).toString('hex');
  database
    .prepare('INSERT INTO sessions VALUES(?, ?, ?)')
    .run(tokenHash(token), admin.username, now + 8 * 60 * 60 * 1000);
  return token;
}
function sessionUser(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  return (
    db()
      .prepare(
        'SELECT username FROM sessions WHERE token_hash=? AND expires_at>?',
      )
      .get(tokenHash(token), Date.now())?.username || null
  );
}
function logout(token) {
  if (typeof token === 'string')
    db()
      .prepare('DELETE FROM sessions WHERE token_hash=?')
      .run(tokenHash(token));
}
async function changePassword(token, current, next) {
  const username = sessionUser(token);
  if (!username) throw new InputError('登录已失效，请重新登录', 401);
  const database = db(),
    admin = database
      .prepare('SELECT password_hash FROM admins WHERE username=?')
      .get(username);
  if (!(await verifyPassword(current, admin.password_hash)))
    throw new InputError('当前密码不正确');
  const hash = await hashPassword(next);
  database.exec('BEGIN IMMEDIATE');
  try {
    database
      .prepare('UPDATE admins SET password_hash=? WHERE username=?')
      .run(hash, username);
    database.prepare('DELETE FROM sessions WHERE username=?').run(username);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
const contactAccessStore = createContactAccess(statements => {
  const database = db();
  database.exec('BEGIN IMMEDIATE');
  try {
    const results = statements.map(statement => {
      const sql = typeof statement === 'string' ? statement : statement.sql;
      const args = typeof statement === 'string' ? [] : statement.args ?? [];
      const prepared = database.prepare(sql);
      if (/^SELECT|RETURNING/i.test(sql) || /RETURNING/i.test(sql)) return { rows: prepared.all(...args) };
      const result = prepared.run(...args); return { rows: [], rowsAffected: result.changes };
    });
    database.exec('COMMIT'); return results;
  } catch (error) { database.exec('ROLLBACK'); throw error; }
}, InputError);
module.exports = {
  ...contactAccessStore,
  db,
  readResume,
  validateResume,
  saveResume,
  createAdmin,
  login,
  sessionUser,
  logout,
  changePassword,
  InputError,
  hashPassword,
  verifyPassword,
};
