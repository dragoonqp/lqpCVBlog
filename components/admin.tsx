'use client';
import { useEffect, useState, useRef } from 'react';
import type { Contacts, ResumeData, Role, Skill } from '@/lib/resume-types';
import { saveWithRebase, DraftConflict } from '@/lib/save-resume.cjs';
import { skillGroups } from '@/lib/resume-types';

async function request(url: string, method: string, body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(result.error || '操作失败，请重试'), {
      status: response.status,
    });
  return result;
}
const contactFields: {
  key: keyof Contacts;
  label: string;
  placeholder: string;
  type?: string;
}[] = [
  { key: 'phone', label: '电话', placeholder: '+86 186 2044 5753' },
  {
    key: 'email',
    label: '邮箱',
    placeholder: 'name@example.com',
    type: 'email',
  },
  { key: 'location', label: '所在地', placeholder: 'Guangzhou, China' },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'https://www.linkedin.com/in/your-name',
    type: 'url',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    placeholder: 'https://wa.me/8618620445753',
    type: 'url',
  },
  {
    key: 'telegram',
    label: 'Telegram / TG',
    placeholder: 'https://t.me/username',
    type: 'url',
  },
];
export default function Admin({
  initialData,
}: {
  initialData: ResumeData | null;
}) {
  const [data, setData] = useState(initialData);
  const [baseline, setBaseline] = useState(JSON.stringify(initialData));
  const [tab, setTab] = useState<'roles' | 'skills' | 'contacts' | 'account'>(
    'roles',
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [hasConflict, setHasConflict] = useState(false);
  async function loadLatest(): Promise<ResumeData> {
    const response = await fetch('/api/admin/resume', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '无法读取最新数据');
    return result;
  }
  function downloadDraft() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'resume-draft.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const dirty = !!data && JSON.stringify(data) !== baseline;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function action(fn: () => Promise<void>) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const updateRole = (id: string, patch: Partial<Role>) =>
    setData(
      (value) =>
        value && {
          ...value,
          roles: value.roles.map((row) =>
            row.id === id ? { ...row, ...patch } : row,
          ),
        },
    );
  const updateSkill = (id: string, patch: Partial<Skill>) =>
    setData(
      (value) =>
        value && {
          ...value,
          skills: value.skills.map((row) =>
            row.id === id ? { ...row, ...patch } : row,
          ),
        },
    );
  function move(kind: 'roles' | 'skills', index: number, direction: number) {
    if (!data) return;
    const rows = [...data[kind]];
    [rows[index], rows[index + direction]] = [
      rows[index + direction],
      rows[index],
    ];
    setData({ ...data, [kind]: rows });
  }
  function rowActions(kind: 'roles' | 'skills', index: number, name: string) {
    return (
      <div className="row-actions">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => move(kind, index, -1)}
          aria-label={`上移 ${name}`}
        >
          ↑ 上移
        </button>
        <button
          type="button"
          disabled={index === data![kind].length - 1}
          onClick={() => move(kind, index, 1)}
          aria-label={`下移 ${name}`}
        >
          ↓ 下移
        </button>
        <button
          className="danger"
          type="button"
          onClick={() =>
            setData(
              (value) =>
                value && {
                  ...value,
                  [kind]: value[kind].filter((_, i) => i !== index),
                },
            )
          }
        >
          删除
        </button>
      </div>
    );
  }
  if (!data)
    return (
      <main className="admin-shell login-shell">
        <a href="/">← 返回简历</a>
        <div className="login-card">
          <span className="admin-eyebrow">RESUME ADMIN</span>
          <h1>登录数据管理</h1>
          <p>使用管理员账号编辑简历内容。</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void action(async () => {
                await request('/api/admin/login', 'POST', {
                  username: form.get('username'),
                  password: form.get('password'),
                });
                const response = await fetch('/api/admin/resume', {
                  cache: 'no-store',
                });
                if (!response.ok) throw new Error('无法读取数据，请重新登录');
                const next = await response.json();
                setData(next);
                setBaseline(JSON.stringify(next));
              });
            }}
          >
            <fieldset disabled={busy}>
              <label>
                账号
                <input
                  name="username"
                  autoComplete="username"
                  required
                  maxLength={80}
                />
              </label>
              <label>
                密码
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                />
              </label>
              <button className="primary" type="submit">
                {busy ? '登录中…' : '登录'}
              </button>
            </fieldset>
          </form>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="form-success" role="status">
              {message}
            </p>
          )}
        </div>
      </main>
    );
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">RESUME ADMIN</span>
          <h1>简历数据管理</h1>
          <p>编辑后点击保存，简历页面刷新即可显示最新内容。</p>
        </div>
        <div className="admin-header-actions">
          <a href="/" target="_blank" rel="noreferrer">
            查看简历 ↗
          </a>
          <button
            disabled={busy || dirty}
            title={dirty ? '请先保存或撤销修改' : ''}
            onClick={() =>
              void action(async () => {
                await request('/api/admin/logout', 'POST', {});
                setData(null);
                setBaseline('null');
              })
            }
          >
            退出登录
          </button>
        </div>
      </header>
      <div
        className="admin-tabs"
        role="tablist"
        aria-label="管理内容"
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
            return;
          event.preventDefault();
          const buttons = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              '[role="tab"]',
            ),
          );
          const index = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? buttons.length - 1
                : (index +
                    (event.key === 'ArrowRight' ? 1 : -1) +
                    buttons.length) %
                  buttons.length;
          buttons[next].focus();
          buttons[next].click();
        }}
      >
        {(
          [
            ['roles', '工作经历'],
            ['skills', 'Technical Skills'],
            ['contacts', '联系信息'],
            ['account', '账号安全'],
          ] as const
        ).map(([key, title]) => (
          <button
            key={key}
            id={`tab-${key}`}
            role="tab"
            tabIndex={tab === key ? 0 : -1}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            onClick={() => {
              setTab(key);
              setError('');
              setMessage('');
            }}
          >
            {title}
          </button>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}
      {hasConflict && (
        <div className="editor-card" role="status">
          <p>当前输入仍保留在表单中。建议先下载草稿，再载入最新数据核对。</p>
          <div className="row-actions">
            <button type="button" disabled={busy} onClick={downloadDraft}>
              下载当前草稿
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void action(async () => {
                  const latest = await loadLatest();
                  setData(latest);
                  setBaseline(JSON.stringify(latest));
                  setHasConflict(false);
                  setMessage('已载入最新数据，请结合备份草稿重新编辑。');
                })
              }
            >
              载入最新数据（替换当前草稿）
            </button>
          </div>
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void action(async () => {
            let next: ResumeData;
            try {
              next = await saveWithRebase(
                JSON.parse(baseline),
                data,
                (value, base) =>
                  request('/api/admin/resume', 'PUT', {
                    ...value,
                    baseline: base,
                  }),
                loadLatest,
              );
            } catch (failure) {
              if (failure instanceof DraftConflict) setHasConflict(true);
              throw failure;
            }
            setHasConflict(false);
            setData(next);
            setBaseline(JSON.stringify(next));
            setMessage('已保存，简历页面刷新后即可查看。');
            if ('BroadcastChannel' in window) {
              const channel = new BroadcastChannel('resume-updates');
              channel.postMessage('saved');
              channel.close();
            }
          });
        }}
      >
        <fieldset disabled={busy}>
          <section
            className="admin-panel"
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
          >
            {tab === 'roles' && (
              <>
                <div className="panel-heading">
                  <div>
                    <h2>工作经历</h2>
                    <p>按展示顺序排列；删除后需保存才会生效。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setData({
                        ...data,
                        roles: [
                          ...data.roles,
                          {
                            id: crypto.randomUUID(),
                            company: '',
                            role: '',
                            dates: '',
                            summary: '',
                            tags: [],
                            stat: '',
                          },
                        ],
                      })
                    }
                  >
                    ＋ 添加经历
                  </button>
                </div>
                {!data.roles.length && (
                  <p className="empty-state">
                    还没有工作经历，点击“添加经历”开始。
                  </p>
                )}
                {data.roles.map((row, i) => (
                  <article className="editor-card" key={row.id}>
                    <div className="editor-card-heading">
                      <h3>
                        {String(i + 1).padStart(2, '0')} ·{' '}
                        {row.company || '新工作经历'}
                      </h3>
                      {rowActions('roles', i, row.company)}
                    </div>
                    <div className="form-grid">
                      <label>
                        公司
                        <input
                          required
                          maxLength={200}
                          value={row.company}
                          onChange={(e) =>
                            updateRole(row.id, { company: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        职位
                        <input
                          required
                          maxLength={200}
                          value={row.role}
                          onChange={(e) =>
                            updateRole(row.id, { role: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        起止日期
                        <input
                          required
                          maxLength={200}
                          placeholder="2025.09 — Present"
                          value={row.dates}
                          onChange={(e) =>
                            updateRole(row.id, { dates: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        成果标注（可选）
                        <input
                          maxLength={200}
                          value={row.stat}
                          onChange={(e) =>
                            updateRole(row.id, { stat: e.target.value })
                          }
                        />
                      </label>
                      <label className="wide">
                        经历描述
                        <textarea
                          required
                          maxLength={10000}
                          rows={4}
                          value={row.summary}
                          onChange={(e) =>
                            updateRole(row.id, { summary: e.target.value })
                          }
                        />
                      </label>
                      <label className="wide">
                        中文职位（可选）
                        <input
                          maxLength={200}
                          value={row.roleZh ?? ''}
                          onChange={(e) =>
                            updateRole(row.id, { roleZh: e.target.value })
                          }
                        />
                      </label>
                      <label className="wide">
                        中文经历描述（可选，中文模式优先显示；留空保留原文或内置翻译）
                        <textarea
                          rows={3}
                          maxLength={10000}
                          value={row.summaryZh ?? ''}
                          onChange={(e) =>
                            updateRole(row.id, { summaryZh: e.target.value })
                          }
                        />
                      </label>
                      <label className="wide">
                        技术标签（英文逗号分隔，每个最多 200 个字符）
                        <input
                          value={row.tags.join(',')}
                          onChange={(e) =>
                            updateRole(row.id, {
                              tags: e.target.value
                                ? e.target.value.split(',')
                                : [],
                            })
                          }
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </>
            )}
            {tab === 'skills' && (
              <>
                <div className="panel-heading">
                  <div>
                    <h2>Technical Skills</h2>
                    <p>
                      掌握程度
                      0–100%；使用年限与影响范围用于技能气泡图。留空的指标不绘制。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setData({
                        ...data,
                        skills: [
                          ...data.skills,
                          {
                            id: crypto.randomUUID(),
                            name: '',
                            group: 'Frontend',
                            level: null,
                            years: null,
                            impact: 5,
                            fill: '#5685d6',
                          },
                        ],
                      })
                    }
                  >
                    ＋ 添加技能
                  </button>
                </div>
                {!data.skills.length && (
                  <p className="empty-state">
                    还没有技能，点击“添加技能”开始。
                  </p>
                )}
                {data.skills.map((row, i) => (
                  <article className="editor-card" key={row.id}>
                    <div className="editor-card-heading">
                      <h3>{row.name || '新技能'}</h3>
                      {rowActions('skills', i, row.name)}
                    </div>
                    <div className="form-grid skill-form">
                      <label>
                        技能名称
                        <input
                          required
                          maxLength={100}
                          value={row.name}
                          onChange={(e) =>
                            updateSkill(row.id, { name: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        所属分组
                        <select
                          value={row.group}
                          onChange={(e) =>
                            updateSkill(row.id, {
                              group: e.target.value as Skill['group'],
                            })
                          }
                        >
                          {skillGroups.map((group) => (
                            <option key={group}>{group}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        掌握程度（%）
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="any"
                          placeholder="未设置"
                          value={row.level ?? ''}
                          onChange={(e) =>
                            updateSkill(row.id, {
                              level:
                                e.target.value === ''
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        使用年限
                        <input
                          type="number"
                          min={0}
                          max={60}
                          step="any"
                          placeholder="未设置"
                          value={row.years ?? ''}
                          onChange={(e) =>
                            updateSkill(row.id, {
                              years:
                                e.target.value === ''
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        影响范围（0–10）
                        <input
                          type="number"
                          required
                          min={0}
                          max={10}
                          step="any"
                          value={row.impact}
                          onChange={(e) =>
                            updateSkill(row.id, {
                              impact: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        图表颜色
                        <input
                          type="color"
                          value={row.fill}
                          onChange={(e) =>
                            updateSkill(row.id, { fill: e.target.value })
                          }
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </>
            )}
            {tab === 'contacts' && (
              <>
                <div className="panel-heading">
                  <div>
                    <h2>联系信息</h2>
                    <p>
                      右上角显示已填写的项目；留空则隐藏。社交账号填写完整 HTTPS
                      链接。
                    </p>
                  </div>
                </div>
                <div className="editor-card form-grid">
                  {contactFields.map((field) => (
                    <label key={field.key}>
                      {field.label}
                      <input
                        type={field.type || 'text'}
                        maxLength={300}
                        placeholder={field.placeholder}
                        value={data.contacts[field.key]}
                        onChange={(e) =>
                          setData({
                            ...data,
                            contacts: {
                              ...data.contacts,
                              [field.key]: e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </>
            )}
            {tab === 'account' && (
              <>
                <h2>账号安全</h2>
                <p>在下方更新密码，更新后所有登录会话都会失效。</p>
              </>
            )}
          </section>
          {tab !== 'account' && (
            <div className="save-bar">
              <span>{dirty ? '有尚未保存的修改' : '所有修改已保存'}</span>
              <div>
                <button
                  type="button"
                  disabled={!dirty}
                  onClick={() => {
                    setData(JSON.parse(baseline));
                    setError('');
                    setMessage('已撤销未保存的修改');
                  }}
                >
                  撤销修改
                </button>
                <button className="primary" type="submit" disabled={!dirty}>
                  {busy ? '保存中…' : '保存修改'}
                </button>
              </div>
            </div>
          )}
        </fieldset>
      </form>
      {tab === 'account' && (
        <form
          className="password-form editor-card"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            if (form.get('next') !== form.get('confirm')) {
              setError('两次新密码不一致');
              return;
            }
            void action(async () => {
              await request('/api/admin/password', 'POST', {
                current: form.get('current'),
                next: form.get('next'),
              });
              setData(null);
              setBaseline('null');
              setMessage('密码已更新，请使用新密码登录。');
            });
          }}
        >
          <fieldset disabled={busy || dirty}>
            <label>
              当前密码
              <input
                name="current"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
            <label>
              新密码（12–128 个字符）
              <input
                name="next"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
            </label>
            <label>
              确认新密码
              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
            </label>
            <button type="submit" className="primary">
              更新密码
            </button>
          </fieldset>
          {dirty && <p>请先保存或撤销简历修改，再更改密码。</p>}
        </form>
      )}
    </main>
  );
}
