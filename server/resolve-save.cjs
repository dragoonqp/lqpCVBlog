const { rebaseDraft } = require('../lib/save-resume.cjs');
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
function sameContent(a, b) {
  return ['roles', 'skills', 'contacts', 'notes'].every(
    (key) =>
      JSON.stringify(canonical(a[key])) === JSON.stringify(canonical(b[key])),
  );
}
function resolveSave(data, baseline, current, InputError) {
  for (const key of ['name', 'nameZh', 'languages']) {
    if (data.contacts[key] === undefined && current.contacts[key] !== undefined) {
      data = { ...data, contacts: { ...data.contacts, [key]: current.contacts[key] } };
      if (baseline) baseline = { ...baseline, contacts: { ...baseline.contacts, [key]: current.contacts[key] } };
    }
  }
  // Older open admin pages must not erase newly managed notes.
  if (data.notes === undefined) data = { ...data, notes: current.notes };
  if (baseline && baseline.notes === undefined) baseline = { ...baseline, notes: current.notes };
  if (sameContent(data, current)) return current;
  if (data.revision === current.revision) return data;
  if (baseline && baseline.revision === data.revision) {
    try {
      return rebaseDraft(baseline, data, current);
    } catch {
      /* Keep true conflicts protected rather than overwriting newer data. */
    }
  }
  const error = new InputError(
    `内容与其他修改发生冲突（草稿版本 ${data.revision}，当前版本 ${current.revision}）。草稿已保留。`,
    409,
  );
  error.draftRevision = data.revision;
  error.currentRevision = current.revision;
  throw error;
}
module.exports = { resolveSave, sameContent };
