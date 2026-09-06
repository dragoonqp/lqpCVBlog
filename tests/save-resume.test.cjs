const test = require('node:test');
const assert = require('node:assert/strict');
const {
  saveWithRebase,
  rebaseDraft,
  DraftConflict,
} = require('../lib/save-resume.cjs');
const seed = require('../server/seed.json');
const stale = () => Object.assign(new Error('stale'), { status: 409 });
test('Object key ordering does not cause a false conflict after server normalization', () => {
  const base = structuredClone(seed),
    draft = structuredClone(base);
  draft.roles[0].roleZh = '中文职位';
  const latest = {
    ...draft,
    revision: 5,
    roles: draft.roles.map((row) =>
      Object.fromEntries(Object.entries(row).reverse()),
    ),
  };
  assert.equal(rebaseDraft(base, draft, latest).revision, 5);
});
test('Stale revision safely merges work edits with changes to a different section', async () => {
  const base = structuredClone(seed),
    draft = structuredClone(base),
    latest = structuredClone(base);
  draft.roles[0].company = 'Draft company';
  latest.skills[0].level = 34;
  latest.revision++;
  let calls = 0;
  const saved = await saveWithRebase(
    base,
    draft,
    async (value) => {
      if (++calls === 1) throw stale();
      assert.equal(value.revision, latest.revision);
      return { ...value, revision: value.revision + 1 };
    },
    async () => latest,
  );
  assert.equal(saved.roles[0].company, 'Draft company');
  assert.equal(saved.skills[0].level, 34);
  assert.equal(draft.revision, base.revision);
  assert.equal(calls, 2);
});
test('Same-section edits and deletion conflicts preserve the draft without another write', async () => {
  const base = structuredClone(seed),
    draft = structuredClone(base),
    latest = structuredClone(base);
  draft.roles[0].company = 'Local';
  latest.roles = [];
  latest.revision++;
  let calls = 0;
  await assert.rejects(
    saveWithRebase(
      base,
      draft,
      async () => {
        calls++;
        throw stale();
      },
      async () => latest,
    ),
    (e) => e instanceof DraftConflict,
  );
  assert.equal(calls, 1);
  assert.equal(draft.roles[0].company, 'Local');
});
test('Identical already-saved draft recovers without an additional write', async () => {
  const base = structuredClone(seed),
    draft = structuredClone(base);
  draft.roles[0].company = 'Saved';
  const latest = { ...draft, revision: draft.revision + 1 };
  let calls = 0;
  assert.deepEqual(
    await saveWithRebase(
      base,
      draft,
      async () => {
        calls++;
        throw stale();
      },
      async () => latest,
    ),
    latest,
  );
  assert.equal(calls, 1);
});
test('Retry is bounded, and validation/network errors do not trigger conflict retries', async () => {
  const base = structuredClone(seed),
    draft = structuredClone(base);
  draft.roles[0].company = 'Changed';
  let calls = 0;
  await assert.rejects(
    saveWithRebase(
      base,
      draft,
      async () => {
        calls++;
        throw stale();
      },
      async () => ({ ...base, revision: 3 }),
    ),
    /再次更新/,
  );
  assert.equal(calls, 2);
  await assert.rejects(
    saveWithRebase(
      base,
      draft,
      async () => {
        throw new Error('offline');
      },
      async () => {
        throw new Error('should not fetch');
      },
    ),
    /offline/,
  );
});
