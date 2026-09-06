const { randomBytes } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { db, createAdmin } = require('../server/store.cjs');
(async () => {
  if (db().prepare('SELECT username FROM admins LIMIT 1').get()) {
    console.log('Administrator already exists; no credentials changed.');
    return;
  }
  const password = randomBytes(18).toString('base64url');
  await createAdmin('admin', password);
  writeFileSync(
    '.admin-credentials.txt',
    `管理地址：http://localhost:3000/admin\n账号：admin\n初始密码：${password}\n\n登录后可在管理页面更改密码；请妥善保存后删除此文件。\n`,
    { mode: 0o600, flag: 'wx' },
  );
  console.log(
    'Administrator created. Initial credentials saved to .admin-credentials.txt (git-ignored).',
  );
})();
