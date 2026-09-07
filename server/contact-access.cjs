const { randomBytes, createHash } = require('node:crypto');
const hash = value => createHash('sha256').update(value).digest('hex');
const schema = [
  'CREATE TABLE IF NOT EXISTS contact_codes (id TEXT PRIMARY KEY, code_hash TEXT UNIQUE NOT NULL, label TEXT NOT NULL, expires_at INTEGER NOT NULL, max_uses INTEGER NOT NULL, uses INTEGER NOT NULL DEFAULT 0, revoked INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS contact_grants (token_hash TEXT PRIMARY KEY, code_id TEXT NOT NULL, expires_at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS contact_attempts (id INTEGER PRIMARY KEY CHECK(id=1), attempts INTEGER NOT NULL, resets_at INTEGER NOT NULL)',
];
function publicResume(data) {
  const { name, nameZh, languages } = data.contacts;
  return { ...data, contacts: { name, nameZh, languages, phone: '', email: '', location: '', linkedin: '', whatsapp: '', telegram: '' } };
}
// batch must execute every statement atomically against the primary database.
function createContactAccess(batch, InputError) {
  return {
    async listContactCodes() {
      const result = await batch(['SELECT id,label,expires_at,max_uses,uses,revoked,created_at FROM contact_codes ORDER BY created_at DESC LIMIT 200']);
      return result[0].rows;
    },
    async createContactCode(input) {
      const { label = '', hours = 168, maxUses = 1 } = input ?? {};
      if (typeof label !== 'string' || label.length > 100 || !Number.isInteger(hours) || hours < 1 || hours > 2160 || !Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100)
        throw new InputError('备注最多 100 字，有效期 1–2160 小时，使用次数 1–100 次');
      const code = randomBytes(16).toString('hex'), id = randomBytes(16).toString('hex'), now = Date.now();
      await batch([{ sql: 'INSERT INTO contact_codes VALUES(?,?,?,?,?,0,0,?)', args: [id, hash(code), label.trim(), now + hours * 3600000, maxUses, now] }]);
      return { id, code, expiresAt: now + hours * 3600000 };
    },
    async revokeContactCode(id) {
      if (typeof id !== 'string' || !/^[a-f0-9]{32}$/.test(id)) throw new InputError('无效的访问码编号');
      await batch([{ sql: 'UPDATE contact_codes SET revoked=1 WHERE id=?', args: [id] }]);
    },
    async contactAccess(token) {
      if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return false;
      const result = await batch([{ sql: 'SELECT 1 FROM contact_grants g JOIN contact_codes c ON c.id=g.code_id WHERE g.token_hash=? AND g.expires_at>? AND c.expires_at>? AND c.revoked=0', args: [hash(token), Date.now(), Date.now()] }]);
      return result[0].rows.length > 0;
    },
    async redeemContactCode(value) {
      const now = Date.now();
      const attempts = await batch([{ sql: 'INSERT INTO contact_attempts VALUES(1,1,?) ON CONFLICT(id) DO UPDATE SET attempts=CASE WHEN resets_at<=? THEN 1 ELSE attempts+1 END,resets_at=CASE WHEN resets_at<=? THEN ? ELSE resets_at END RETURNING attempts', args: [now + 900000, now, now, now + 900000] }]);
      if (Number(attempts[0].rows[0].attempts) > 100) throw new InputError('验证尝试过多，请 15 分钟后重试', 429);
      const code = typeof value === 'string' ? value.trim().toLowerCase() : '';
      if (!/^[a-f0-9]{32}$/.test(code)) throw new InputError('访问码无效、已过期或使用次数已用完', 403);
      const token = randomBytes(32).toString('hex');
      const result = await batch([
        { sql: 'DELETE FROM contact_grants WHERE expires_at<=?', args: [now] },
        { sql: 'INSERT INTO contact_grants SELECT ?,id,MIN(expires_at,?) FROM contact_codes WHERE code_hash=? AND revoked=0 AND expires_at>? AND uses<max_uses RETURNING expires_at', args: [hash(token), now + 28800000, hash(code), now] },
        { sql: 'UPDATE contact_codes SET uses=uses+1 WHERE id=(SELECT code_id FROM contact_grants WHERE token_hash=?)', args: [hash(token)] },
      ]);
      if (!result[1].rows.length) throw new InputError('访问码无效、已过期或使用次数已用完', 403);
      return { token, expiresAt: Number(result[1].rows[0].expires_at) };
    },
  };
}
module.exports = { schema, createContactAccess, publicResume };
