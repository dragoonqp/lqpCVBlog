const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const folder = mkdtempSync(path.join(tmpdir(), 'resume-store-test-'));
process.env.RESUME_DB_PATH = path.join(folder, 'test.sqlite');
const store = require('../server/store.cjs');
test.after(() => {
  store.db().close();
  rmSync(folder, { recursive: true, force: true });
});
test('SQLite seeds existing content, validates, persists ordered edits and prevents stale overwrites', () => {
  const initial = store.readResume();
  assert.equal(initial.roles.length, 4);
  assert.equal(initial.skills.length, 13);
  const next = structuredClone(initial);
  next.roles.reverse();
  next.roles[0].company = "Company'); DROP TABLE admins; --";
  next.contacts.linkedin = 'https://www.linkedin.com/in/test';
  next.skills[0].level = 0;
  const saved = store.saveResume(next);
  assert.equal(saved.revision, 1);
  assert.deepEqual(store.readResume(), saved);
  assert.throws(
    () => store.saveResume(initial),
    (error) => error.status === 409,
  );
  assert.ok(
    store
      .db()
      .prepare('SELECT name FROM sqlite_schema WHERE name=?')
      .get('admins'),
  );
  for (const mutate of [
    (x) => (x.contacts.linkedin = 'javascript:alert(1)'),
    (x) => (x.contacts.telegram = 'https://evil.example/t.me'),
    (x) => (x.skills[0].level = 101),
    (x) => x.roles.push(x.roles[0]),
  ]) {
    const invalid = structuredClone(saved);
    mutate(invalid);
    assert.throws(() => store.saveResume(invalid));
    assert.deepEqual(store.readResume(), saved);
  }
  const empty = store.saveResume({ ...saved, roles: [], skills: [] });
  assert.deepEqual(store.readResume(), empty);
  assert.equal(store.readResume().roles.length, 0);
});
test('Passwords are hashed, login is throttled, sessions expire/revoke and password updates invalidate all sessions', async () => {
  await store.createAdmin('test-admin', 'original-password-123');
  assert.notEqual(
    store.db().prepare('SELECT password_hash FROM admins').get().password_hash,
    'original-password-123',
  );
  await assert.rejects(
    store.login('test-admin', 'wrong'),
    (e) => e.status === 401,
  );
  const a = await store.login('test-admin', 'original-password-123');
  const b = await store.login('test-admin', 'original-password-123');
  assert.equal(store.sessionUser(a), 'test-admin');
  assert.equal(store.sessionUser('forged'), null);
  store.logout(a);
  assert.equal(store.sessionUser(a), null);
  await assert.rejects(store.changePassword(b, 'wrong', 'new-password-456'));
  await store.changePassword(b, 'original-password-123', 'new-password-456');
  assert.equal(store.sessionUser(b), null);
  await assert.rejects(store.login('test-admin', 'original-password-123'));
  const c = await store.login('test-admin', 'new-password-456');
  store.db().prepare('UPDATE sessions SET expires_at=0').run();
  assert.equal(store.sessionUser(c), null);
  for (let i = 0; i < 10; i++)
    await assert.rejects(
      store.login('test-admin', 'wrong'),
      (e) => e.status === 401,
    );
  await assert.rejects(
    store.login('test-admin', 'new-password-456'),
    (e) => e.status === 429,
  );
});
