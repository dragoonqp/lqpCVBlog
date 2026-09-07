for (const key of ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'RESUME_ADMIN_PASSWORD', 'VERCEL']) process.env[key] = '';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('@libsql/client');
const { createRemoteStore } = require('../server/remote-store.cjs');
const { translate } = require('../lib/resume-i18n.cjs');

test('Notes support bilingual CRUD, ordering, legacy databases and conflict protection', async () => {
  const client = createClient({ url: ':memory:' });
  try {
    const store = createRemoteStore(client);
    await store.readResume();
    // An existing database has metadata but no stored notes yet.
    await client.execute('DELETE FROM engineering_notes');
    const base = await store.readResume();
    assert.equal(base.notes.length, 3);
    const draft = structuredClone(base);
    draft.notes.reverse();
    draft.notes.push({ id: 'custom', type: 'Delivery', title: 'Release notes', blurb: '\n  One\n\nTwo\n', titleZh: '发布笔记', typeZh: '交付', blurbZh: '\n  第一行\n\n第二行\n' });
    const saved = await store.saveResume(draft);
    assert.deepEqual((await store.readResume()).notes, draft.notes);
    assert.equal(translate(saved.notes[3].blurb, 'zh', saved.notes[3].blurbZh), draft.notes[3].blurbZh);
    const legacy = structuredClone(base);
    delete legacy.notes;
    legacy.contacts.location = 'Legacy editor';
    const merged = await store.saveResume({ ...legacy, baseline: { ...base, notes: undefined } });
    assert.deepEqual(merged.notes, saved.notes);
    const conflicting = structuredClone(base);
    conflicting.notes[0].title = 'Conflicting title';
    await assert.rejects(store.saveResume({ ...conflicting, baseline: base }), e => e.status === 409);
    const invalid = structuredClone(merged);
    invalid.notes[0].title = ' ';
    await assert.rejects(store.saveResume(invalid), e => e.status === 400);
    const empty = await store.saveResume({ ...merged, notes: [] });
    assert.deepEqual((await store.readResume()).notes, []);
    assert.equal((await store.saveResume(empty)).revision, empty.revision);
    assert.deepEqual((await createRemoteStore(client).readResume()).notes, []);
  } finally { client.close(); }
});
