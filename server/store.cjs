const local = require('./local-store.cjs');
let remote;
function activeStore() {
  if (process.env.TURSO_DATABASE_URL || process.env.TURSO_AUTH_TOKEN) {
    if (!remote) {
      const { createRemoteStore, openClient } = require('./remote-store.cjs');
      remote = createRemoteStore(openClient());
    }
    return remote;
  }
  if (process.env.VERCEL)
    throw new local.InputError(
      'Vercel 不支持持久写入本地 SQLite。请配置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN 后重新部署。',
      503,
    );
  return local;
}
module.exports = {
  InputError: local.InputError,
  validateResume: local.validateResume,
  db: local.db,
};
for (const name of [
  'listContactCodes', 'createContactCode', 'revokeContactCode', 'contactAccess', 'redeemContactCode',
  'readResume',
  'saveResume',
  'createAdmin',
  'login',
  'sessionUser',
  'logout',
  'changePassword',
])
  module.exports[name] = (...args) => activeStore()[name](...args);
