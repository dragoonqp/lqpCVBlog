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
const { createRemoteStore, openClient } = require('../server/remote-store.cjs');
test('Cloud save merges against the current transaction snapshot and preserves simultaneous edits', async () => {
  const client = createClient({ url: ':memory:' });
  try {
    const store = createRemoteStore(client),
      base = await store.readResume({ consistent: true });
    const other = await store.saveResume({
      ...base,
      contacts: { ...base.contacts, location: 'Other tab' },
    });
    const draft = structuredClone(base);
    draft.roles[0].company = 'My work edit';
    const saved = await store.saveResume({ ...draft, baseline: base });
    assert.equal(saved.revision, other.revision + 1);
    assert.equal(saved.contacts.location, 'Other tab');
    assert.equal(saved.roles[0].company, 'My work edit');
    const noOp = await store.saveResume({ ...draft, baseline: base });
    assert.equal(noOp.revision, saved.revision);
    assert.deepEqual(await store.readResume({ consistent: true }), saved);
    const conflicting = structuredClone(base);
    conflicting.roles[0].company = 'Conflicting edit';
    await assert.rejects(
      store.saveResume({ ...conflicting, baseline: base }),
      (e) => e.status === 409 && e.currentRevision === saved.revision,
    );
    assert.deepEqual(await store.readResume({ consistent: true }), saved);
  } finally {
    client.close();
  }
});
test('Unchanged saves do not increment revision, including replay after a lost response', async () => {
  const client = createClient({ url: ':memory:' });
  try {
    const store = createRemoteStore(client),
      base = await store.readResume();
    assert.equal((await store.saveResume(base)).revision, base.revision);
    const draft = structuredClone(base);
    draft.contacts.location = 'Changed';
    const saved = await store.saveResume(draft);
    assert.equal((await store.saveResume(draft)).revision, saved.revision);
    assert.deepEqual(await store.readResume(), saved);
  } finally {
    client.close();
  }
});
test('All Turso HTTP requests explicitly bypass Next fetch caching', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  let client;
  process.env.TURSO_DATABASE_URL = 'https://example.turso.io';
  process.env.TURSO_AUTH_TOKEN = 'test-token';
  try {
    globalThis.fetch = async (input, init) => {
      calls++;
      assert.equal(init.cache, 'no-store');
      throw new Error('test transport blocked');
    };
    client = openClient();
    await assert.rejects(client.execute('SELECT 1'));
    assert.ok(calls > 0);
  } finally {
    client?.close();
    globalThis.fetch = original;
    process.env.TURSO_DATABASE_URL = '';
    process.env.TURSO_AUTH_TOKEN = '';
  }
});
