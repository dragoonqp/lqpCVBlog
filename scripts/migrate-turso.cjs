require('@next/env').loadEnvConfig(process.cwd());
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const {
  openClient,
  schema,
  transaction,
  writeStatements,
} = require('../server/remote-store.cjs');
const { validateResume } = require('../server/local-store.cjs');
async function migrateLocal(source, target) {
  source.exec('BEGIN');
  let data, admins;
  try {
    data = validateResume({
      revision: source.prepare('SELECT revision FROM metadata WHERE id=1').get()
        .revision,
      roles: source
        .prepare('SELECT payload FROM work_experiences ORDER BY position')
        .all()
        .map((row) => JSON.parse(row.payload)),
      skills: source
        .prepare('SELECT payload FROM technical_skills ORDER BY position')
        .all()
        .map((row) => JSON.parse(row.payload)),
      contacts: JSON.parse(
        source.prepare('SELECT payload FROM contact_info WHERE id=1').get()
          .payload,
      ),
    });
    admins = source.prepare('SELECT username, password_hash FROM admins').all();
    source.exec('COMMIT');
  } catch (error) {
    source.exec('ROLLBACK');
    throw error;
  }
  await target.batch(schema, 'write');
  await transaction(target, 'write', async (tx) => {
    // Refuse existing records, even if the destination has only seed data. Never silently overwrite a cloud database.
    const occupied = await tx.execute(
      'SELECT ' +
        [
          'metadata',
          'work_experiences',
          'technical_skills',
          'contact_info',
          'admins',
          'sessions',
          'login_attempts',
        ]
          .map((table) => 'EXISTS(SELECT 1 FROM ' + table + ')')
          .join(' OR ') +
        ' AS occupied',
    );
    if (occupied.rows[0].occupied)
      throw new Error(
        '目标数据库已有数据，迁移已停止且没有覆盖记录。请使用空数据库。',
      );
    await tx.batch([
      ...writeStatements(data),
      ...admins.map((admin) => ({
        sql: 'INSERT INTO admins VALUES(?, ?)',
        args: [admin.username, admin.password_hash],
      })),
      { sql: 'INSERT INTO metadata VALUES(1, ?)', args: [data.revision] },
    ]);
  });
  return {
    roles: data.roles.length,
    skills: data.skills.length,
    admins: admins.length,
  };
}
if (require.main === module)
  (async () => {
    const source = new DatabaseSync(
      process.env.RESUME_DB_PATH ||
        path.join(process.cwd(), 'data', 'resume.sqlite'),
      { readOnly: true },
    );
    let target;
    try {
      target = openClient();
      const counts = await migrateLocal(source, target);
      console.log(
        '迁移完成：',
        counts,
        '。原管理员密码继续有效；登录会话不迁移。',
      );
    } finally {
      source.close();
      target?.close();
    }
  })().catch((error) => {
    console.error(
      '迁移失败：',
      error instanceof Error ? error.message : '未知错误',
    );
    process.exitCode = 1;
  });
module.exports = { migrateLocal };
