'use client';
import { useEffect, useState } from 'react';
type Code = {id: string; label: string; expires_at: number; max_uses: number; uses: number; revoked: number};
export default function ContactCodes() {
  const [codes, setCodes] = useState<Code[]>([]), [label, setLabel] = useState(''), [hours, setHours] = useState(168), [maxUses, setMaxUses] = useState(1);
  const [generated, setGenerated] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [copied, setCopied] = useState(false);
  async function request(method = 'GET', body?: unknown) {
    const response = await fetch('/api/admin/contact-codes', { method, cache: 'no-store', ...(body === undefined ? {} : { headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || '操作失败'); return result;
  }
  useEffect(() => { let active = true; request().then(data => {if (active) setCodes(data)}).catch(error => {if (active) setError(error.message)}); return () => {active = false}; }, []);
  async function act(fn: () => Promise<void>) { if (busy) return; setBusy(true); setError(''); try {await fn()} catch(error) {setError(error instanceof Error ? error.message : '操作失败')} finally {setBusy(false)} }
  return <section className="contact-codes"><h2>联系方式访问码</h2><p>首页默认隐藏联系方式。访问码在生成或撤销后立即生效，无需再保存简历。每次在新浏览器解锁会消耗一次，权限最长 8 小时且不超过访问码有效期。</p>
    <div className="editor-card form-grid">
      <label>备注<input maxLength={100} value={label} onChange={e => setLabel(e.target.value)} placeholder="例如：某公司招聘方" /></label>
      <label>有效期（小时，1–2160）<input type="number" min={1} max={2160} value={hours} onChange={e => setHours(Number(e.target.value))} /></label>
      <label>可兑换次数（1–100）<input type="number" min={1} max={100} value={maxUses} onChange={e => setMaxUses(Number(e.target.value))} /></label>
      <button type="button" disabled={busy} onClick={() => void act(async () => { const result = await request('POST', {label, hours, maxUses}); setGenerated(result.code); setCopied(false); setCodes(await request()); })}>生成访问码</button>
    </div>
    {generated && <div className="editor-card" role="status"><p>请立即复制并自行分享，离开此栏目后不再显示明文。</p><code className="generated-access-code">{generated}</code><button type="button" onClick={() => void act(async () => {await navigator.clipboard.writeText(generated); setCopied(true)})}>{copied ? '已复制' : '复制访问码'}</button></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {codes.map(code => <article className="editor-card" key={code.id}><div className="editor-card-heading"><h3>{code.label || '未命名访问码'}</h3><button className="danger" type="button" disabled={busy || !!code.revoked} onClick={() => void act(async () => {await request('DELETE', {id: code.id}); setCodes(await request()); setGenerated('')})}>撤销</button></div><p>{code.revoked ? '已撤销' : Number(code.expires_at) <= Date.now() ? '已过期' : code.uses >= code.max_uses ? '兑换次数已用完' : '可用'} · 已兑换 {code.uses} / {code.max_uses} 次 · 到期：{new Date(Number(code.expires_at)).toLocaleString()}</p></article>)}
  </section>;
}
