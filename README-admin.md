# 简历数据管理

Vercel 使用 Turso 云端 SQLite，配置和迁移步骤见 [Vercel 部署指南](README-vercel.md)。未配置云连接的本地环境继续使用项目内 SQLite。

- 简历：`/`
- 管理页面：`/admin`
- 数据文件：`data/resume.sqlite`，不放入 `public`，不提交 Git。
- 运行：Node.js 22.13+（当前验证版本 24.14），`npm run dev` 或 `npm run build` 后 `npm start`。
- 第一次运行 `npm run admin:init` 导入现有内容并创建管理员。随机初始密码写入被 Git 忽略的 `.admin-credentials.txt`。已有账号不会被覆盖。登录后可修改密码，之后妥善保存并删除初始密码文件。
- 工作经历和技能支持增删改及上下排序，联系信息支持电话、邮箱、地点、LinkedIn、WhatsApp、Telegram。保存后刷新公开简历即可看到变化。
- 技能掌握程度与使用年限可留空；未填完整的技能保留标签，但不绘制气泡，避免虚构指标。
- `npm test` 使用独立临时数据库；`node scripts/test-http.cjs` 在构建后使用独立数据库和 3109 端口测试生产接口，不修改实际简历数据。

## 运行与备份

本地 SQLite 模式需要有持久磁盘的 Node.js 服务。Vercel 使用新增的 Turso 连接模式，不写入函数磁盘。数据库首次创建时才导入 `server/seed.json`，清空某个列表后不会重新填入旧数据。

生产环境设置 `APP_ORIGIN=https://你的域名`，由 HTTPS 反向代理转发给 Node 服务；HTTPS 下会话 Cookie 使用 Secure 属性。SQLite 所在目录必须对服务进程可写。多实例必须共享同一个受支持的本地数据库访问环境；推荐单进程服务。

可用 `RESUME_DB_PATH` 指定其他持久数据路径。备份前停止服务，然后保存 `data` 整个目录（包含可能存在的 WAL/SHM 文件）；恢复到相同位置再启动。数据库包含账号哈希和会话，备份应保密。

密码使用 scrypt 加盐哈希；会话有效期 8 小时，数据库只保存令牌哈希。退出或修改密码会撤销会话。登录有持久化的 15 分钟尝试限制，所有写接口检查同源请求和服务端登录状态。保存带版本检查，避免覆盖其他页面已提交的更新。
