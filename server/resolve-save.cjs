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
  return ['roles', 'skills', 'contacts'].every(
    (key) =>
      JSON.stringify(canonical(a[key])) === JSON.stringify(canonical(b[key])),
  );
}
function resolveSave(data, baseline, current, InputError) {
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
