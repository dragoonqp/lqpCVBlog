# Vercel 部署

Vercel Functions 没有共享的持久可写本地磁盘。`/var/task/data` 不能用于 SQLite，`/tmp` 也不是持久数据库。项目现在根据环境选择：

- 本地：原来的 `data/resume.sqlite`，无需额外配置。
- Vercel：Turso 云端 SQLite / libSQL，通过 HTTPS 访问。
- Vercel 未配置云数据库时：返回明确配置错误，不会创建本地数据库或悄悄保存到临时目录。

## 推荐：迁移现有内容和管理员

1. 在 Turso 创建一个**空数据库**，取得数据库 URL 和读写令牌。
2. 在项目的 `.env.local` 中填写 `TURSO_DATABASE_URL` 与 `TURSO_AUTH_TOKEN`。不要使用 `NEXT_PUBLIC_` 前缀，也不要把令牌提交 Git。
3. 部署前在项目目录执行 `npm run db:migrate:turso`。脚本读取本地 SQLite 的一致快照，迁移经历、技能、联系信息、数据版本及管理员密码哈希。原密码继续有效；会话不迁移。本地文件不变；目标数据库有任何已有记录时停止，不覆盖数据。
4. 在 Vercel 项目 **Settings → Environment Variables** 添加：

| 变量                 | 内容                                                             |
| -------------------- | ---------------------------------------------------------------- |
| `TURSO_DATABASE_URL` | `libsql://数据库名-组织.turso.io` 或 HTTPS 地址                  |
| `TURSO_AUTH_TOKEN`   | 该数据库的读写令牌                                               |
| `APP_ORIGIN`         | 管理页实际使用的来源，例如 `https://www.lqp7.info`，不带末尾斜杠 |

5. 重新部署最新代码和 `package-lock.json`；运行时使用 Node.js 22.x 或 24.x。访问 `/admin`，使用原管理员账号密码登录。保存后刷新首页验证。

本地只要设置了 Turso 环境变量，也会连接云数据库。如要继续编辑本地 SQLite，可在迁移结束后从本地环境移除这两个值；Vercel 中保留。

## 没有本地数据，使用初始内容

可以跳过迁移，首次云端访问将导入 `server/seed.json`。额外设置：

- `RESUME_ADMIN_USERNAME=admin`
- `RESUME_ADMIN_PASSWORD`：自行生成 12–128 字符强密码。

这些变量只用于**不存在管理员时**初始化账号，不会覆盖数据库内的已有密码。设置好后重新部署。不要再把本地 `.admin-credentials.txt` 当作这份新数据库的密码。迁移已有管理员则无需这两个变量。

## 注意事项

- Preview 和 Production 推荐使用不同数据库，避免预览编辑真实简历。`APP_ORIGIN` 必须与进入管理页的域名一致。
- 不设置 `RESUME_DB_PATH=/tmp/...`，不上传 SQLite 到 `public`，不把令牌或密码放进客户端变量。
- 云端数据库中的账号、会话、登录尝试限制共享于所有函数实例，改密和退出会在后续请求中生效。
- 修改 Vercel 环境变量后必须重新部署，旧部署不会自动使用新值。
- 本地验证：`npm test` 包含云端适配器、事务回滚、迁移和本地数据库测试；`npm run build` 后执行 `node scripts/test-http.cjs` 检查页面和登录接口。云端适配器测试使用本地 libSQL 传输替身，实际 Turso 连接仍须在配置真实凭据后验证。

参考：[Vercel SQLite 限制](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel)、[Turso TypeScript](https://docs.turso.tech/sdk/ts/quickstart)。
