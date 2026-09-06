const test = require('node:test');
const assert = require('node:assert/strict');
const { translate } = require('../lib/resume-i18n.cjs');
const { validateResume } = require('../server/local-store.cjs');
test('Language switch translates known content, prefers custom Chinese, and preserves unknown content', () => {
  assert.equal(translate('Work Experience', 'zh'), '工作经历');
  assert.equal(translate('Work Experience', 'en'), 'Work Experience');
  assert.equal(translate('A custom role', 'zh', '自定义职位'), '自定义职位');
  assert.equal(translate('A custom role', 'en', '自定义职位'), 'A custom role');
  assert.equal(translate('Unknown new content', 'zh'), 'Unknown new content');
});
test('Chinese work fields survive validation without changing the 200-character tag limit', () => {
  const data = structuredClone(require('../server/seed.json'));
  data.roles[0].roleZh = '专家工程师';
  data.roles[0].summaryZh = '工作经历中文说明';
  data.roles[0].tags = ['x'.repeat(200)];
  const result = validateResume(data);
  assert.equal(result.roles[0].summaryZh, '工作经历中文说明');
  assert.equal(result.roles[0].roleZh, '专家工程师');
  data.roles[0].tags = ['x'.repeat(201)];
  assert.throws(() => validateResume(data));
});
