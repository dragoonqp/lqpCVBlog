require('@next/env').loadEnvConfig(process.cwd());
const { randomBytes } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { db, createAdmin, readResume } = require('../server/store.cjs');
(async () => {
  if (process.env.TURSO_DATABASE_URL || process.env.TURSO_AUTH_TOKEN) {
    if (!process.env.RESUME_ADMIN_PASSWORD)
      throw new Error(
        '云端初始化请设置 RESUME_ADMIN_PASSWORD；保留原账号请使用 npm run db:migrate:turso 迁移空数据库。',
      );
    await readResume();
    console.log('云端数据库初始化完成；已有管理员和密码不会被覆盖。');
    return;
  }
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
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
