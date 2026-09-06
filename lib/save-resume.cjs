function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
const equal = (a, b) =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const sections = {
  roles: '工作经历',
  skills: 'Technical Skills',
  contacts: '联系信息',
};
class DraftConflict extends Error {
  constructor(latest, names) {
    super(
      `以下栏目也在其他页面发生了修改：${names.join('、')}。当前草稿已保留，请先备份草稿，再载入最新数据进行核对。`,
    );
    this.latest = latest;
  }
}
function rebaseDraft(baseline, draft, latest) {
  const merged = { ...latest },
    conflicts = [];
  for (const [key, name] of Object.entries(sections)) {
    if (equal(draft[key], baseline[key])) continue;
    if (equal(latest[key], baseline[key]) || equal(latest[key], draft[key]))
      merged[key] = draft[key];
    else conflicts.push(name);
  }
  if (conflicts.length) throw new DraftConflict(latest, conflicts);
  return merged;
}
async function saveWithRebase(baseline, draft, put, get) {
  try {
    return await put(draft, baseline);
  } catch (error) {
    if (error.status !== 409) throw error;
  }
  const latest = await get();
  const merged = rebaseDraft(baseline, draft, latest);
  // A previous save may have committed even if the client lost its response.
  if (equal(merged, latest)) return latest;
  try {
    return await put(merged, latest);
  } catch (error) {
    if (error.status === 409)
      throw new Error(
        '保存期间数据再次更新。草稿仍然保留，请稍后重新点击保存。',
      );
    throw error;
  }
}
module.exports = { rebaseDraft, saveWithRebase, DraftConflict };
