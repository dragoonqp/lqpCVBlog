for (const key of [
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'RESUME_ADMIN_PASSWORD',
  'RESUME_ADMIN_USERNAME',
  'VERCEL',
])
  process.env[key] = '';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('@libsql/client');
const { createRemoteStore } = require('../server/remote-store.cjs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { existsSync } = require('node:fs');

test('Vercel without cloud credentials fails before attempting local filesystem writes', () => {
  const filename = path.join(
    tmpdir(),
    'must-not-create-' + Date.now(),
    'resume.sqlite',
  );
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `const assert=require('node:assert/strict'); const store=require('./server/store.cjs'); assert.throws(()=>store.readResume(), e=>e.status===503 && e.message.includes('TURSO_DATABASE_URL'));`,
    ],
    {
      env: {
        ...process.env,
        VERCEL: '1',
        TURSO_DATABASE_URL: '',
        TURSO_AUTH_TOKEN: '',
        RESUME_DB_PATH: filename,
      },
      encoding: 'utf8',
      windowsHide: true,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(filename), false);
});

test('Async cloud store: initialization, CRUD, rollback, revisions, login, expiry and password revocation', async () => {
  const client = createClient({ url: ':memory:' });
  try {
    const store = createRemoteStore(client, {
      adminUsername: 'cloud-admin',
      adminPassword: 'cloud-password-123',
    });
    const initial = await store.readResume();
    assert.equal(initial.roles.length, 4);
    const draft = structuredClone(initial);
    draft.roles.reverse();
    draft.roles[0].company = "O'Reilly Cloud";
    draft.contacts.telegram = 'https://t.me/cloud';
    draft.skills[0].level = 0;
    const saved = await store.saveResume(draft);
    assert.deepEqual(await store.readResume(), saved);
    await assert.rejects(store.saveResume(initial), (e) => e.status === 409);
    await assert.rejects(
      store.saveResume({
        ...saved,
        contacts: { ...saved.contacts, linkedin: 'javascript:alert(1)' },
      }),
      (e) => e.status === 400,
    );
    assert.deepEqual(await store.readResume(), saved);
    // Force failure after a destructive statement inside the open transaction; rollback must restore data.
    const originalTransaction = client.transaction.bind(client);
    client.transaction = async (mode) => {
      const tx = await originalTransaction(mode);
      tx.batch = async () => {
        await tx.execute('DELETE FROM work_experiences');
        throw new Error('simulated transport failure');
      };
      return tx;
    };
    await assert.rejects(
      store.saveResume(saved),
      /simulated transport failure/,
    );
    client.transaction = originalTransaction;
    assert.deepEqual(await store.readResume(), saved);
    await assert.rejects(
      store.login('cloud-admin', 'wrong'),
      (e) => e.status === 401,
    );
    const token = await store.login('cloud-admin', 'cloud-password-123');
    assert.equal(await store.sessionUser(token), 'cloud-admin');
    assert.equal(await store.sessionUser('forged'), null);
    await store.logout(token);
    assert.equal(await store.sessionUser(token), null);
    const second = await store.login('cloud-admin', 'cloud-password-123');
    await store.changePassword(
      second,
      'cloud-password-123',
      'updated-cloud-password-456',
    );
    assert.equal(await store.sessionUser(second), null);
    // A fresh function instance cannot reset a changed password via the original bootstrap environment.
    const newInstance = createRemoteStore(client, {
      adminPassword: 'cloud-password-123',
    });
    await assert.rejects(
      newInstance.login('cloud-admin', 'cloud-password-123'),
      (e) => e.status === 401,
    );
    const third = await newInstance.login(
      'cloud-admin',
      'updated-cloud-password-456',
    );
    await client.execute('UPDATE sessions SET expires_at=0');
    assert.equal(await newInstance.sessionUser(third), null);
    for (let i = 0; i < 10; i++)
      await assert.rejects(
        newInstance.login('cloud-admin', 'wrong'),
        (e) => e.status === 401,
      );
    await assert.rejects(
      newInstance.login('cloud-admin', 'updated-cloud-password-456'),
      (e) => e.status === 429,
    );
    await client.execute('UPDATE login_attempts SET resets_at=0');
    assert.ok(
      await newInstance.login('cloud-admin', 'updated-cloud-password-456'),
    );
    const empty = await store.saveResume({ ...saved, roles: [], skills: [] });
    assert.deepEqual(await createRemoteStore(client).readResume(), empty);
  } finally {
    client.close();
  }
});

test('Initialization retries cleanly after a transient connection failure', async () => {
  const client = createClient({ url: ':memory:' });
  try {
    const batch = client.batch.bind(client);
    let failed = false;
    client.batch = (...args) => {
      if (!failed) {
        failed = true;
        return Promise.reject(new Error('offline'));
      }
      return batch(...args);
    };
    const store = createRemoteStore(client);
    await assert.rejects(store.readResume(), /offline/);
    assert.equal((await store.readResume()).roles.length, 4);
  } finally {
    client.close();
  }
});

test('Migration preserves edited data and password hashes and refuses nonempty destinations', async () => {
  const { DatabaseSync } = require('node:sqlite');
  const { migrateLocal } = require('../scripts/migrate-turso.cjs');
  const { schema, writeStatements } = require('../server/remote-store.cjs');
  const seed = structuredClone(require('../server/seed.json'));
  seed.roles[0].company = 'Migrated Company';
  seed.revision = 17;
  const source = new DatabaseSync(':memory:');
  const target = createClient({ url: ':memory:' });
  try {
    source.exec(schema.join(';'));
    for (const statement of writeStatements(seed))
      typeof statement === 'string'
        ? source.exec(statement)
        : source.prepare(statement.sql).run(...statement.args);
    source.prepare('INSERT INTO metadata VALUES(1, ?)').run(seed.revision);
    const { hashPassword } = require('../server/local-store.cjs');
    source
      .prepare('INSERT INTO admins VALUES(?, ?)')
      .run('original-admin', await hashPassword('migrated-password-123'));
    assert.deepEqual(await migrateLocal(source, target), {
      roles: 4,
      skills: 13,
      admins: 1,
    });
    const store = createRemoteStore(target);
    assert.deepEqual(await store.readResume(), seed);
    assert.ok(await store.login('original-admin', 'migrated-password-123'));
    await assert.rejects(migrateLocal(source, target), /已有数据/);
    assert.deepEqual(await store.readResume(), seed);
  } finally {
    source.close();
    target.close();
  }
});

test('Consistent admin reads bypass a stale replica snapshot', async () => {
  const client = createClient({ url: ':memory:' });
  try {
    const store = createRemoteStore(client);
    const old = await store.readResume();
    const batch = client.batch.bind(client);
    const staleSnapshot = await batch(
      [
        'SELECT revision FROM metadata WHERE id=1',
        'SELECT payload FROM work_experiences ORDER BY position',
        'SELECT payload FROM technical_skills ORDER BY position',
        'SELECT payload FROM contact_info WHERE id=1',
        'SELECT payload FROM engineering_notes WHERE id=1',
      ],
      'read',
    );
    const saved = await store.saveResume({
      ...old,
      contacts: { ...old.contacts, location: 'Latest location' },
    });
    client.batch = (statements, mode) =>
      mode === 'read'
        ? Promise.resolve(staleSnapshot)
        : batch(statements, mode);
    assert.equal((await store.readResume()).revision, old.revision);
    const fresh = await store.readResume({ consistent: true });
    assert.equal(fresh.revision, saved.revision);
    assert.equal(fresh.contacts.location, 'Latest location');
  } finally {
    client.close();
  }
});
