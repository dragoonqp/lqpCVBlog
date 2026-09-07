'use client';
import { useEffect, useState } from 'react';
import { Phone, Mail, MapPin, Link, MessageCircle, Send } from 'lucide-react';
import type { Contacts } from '@/lib/resume-types';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
export default function ContactViewer({ locale }: { locale: 'zh' | 'en' }) {
  const [contacts, setContacts] = useState<Contacts | null>(null);
  const [open, setOpen] = useState(false), [code, setCode] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const zh = locale === 'zh';
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try { const response = await fetch('/api/contact-access', { cache: 'no-store' }); const result = await response.json(); if (active) setContacts(response.ok ? result.contacts : null); } catch { if (active) setContacts(null); }
    };
    void refresh();
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  return <div className="contact-access-view">
    {contacts ? <address className="contact-info">
      {contacts.phone && <a href={'tel:' + contacts.phone.replace(/[^+0-9]/g, '')}><Phone size={15} aria-hidden="true" />{contacts.phone}</a>}
      {contacts.email && <a href={'mailto:' + contacts.email}><Mail size={15} aria-hidden="true" />{contacts.email}</a>}
      {contacts.location && <span><MapPin size={15} aria-hidden="true" />{contacts.location}</span>}
      {(['linkedin', 'whatsapp', 'telegram'] as const).map(key => contacts[key] && <a key={key} href={contacts[key]} target="_blank" rel="noopener noreferrer">{key === 'linkedin' ? <Link size={15} aria-hidden="true" /> : key === 'whatsapp' ? <MessageCircle size={15} aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}{{linkedin: 'LinkedIn', whatsapp: 'WhatsApp', telegram: 'Telegram'}[key]} ↗</a>)}
      {!['phone', 'email', 'location', 'linkedin', 'whatsapp', 'telegram'].some(key => contacts[key as keyof Contacts]) && <span>{zh ? '暂无联系方式' : 'No contact details available'}</span>}
    </address> : <button className="contact-unlock" onClick={() => { setError(''); setOpen(true); }}>{zh ? '查看联系方式' : 'View contact details'}</button>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="save-success-dialog" showCloseButton={false}>
      <DialogTitle>{zh ? '查看联系方式' : 'Unlock contact details'}</DialogTitle>
      <DialogDescription>{zh ? '请输入简历所有者分享给你的访问码。' : 'Enter the access code shared by the resume owner.'}</DialogDescription>
      <form className="contact-unlock-form" onSubmit={async event => {
        event.preventDefault(); if (busy) return; setBusy(true); setError('');
        try {
          const response = await fetch('/api/contact-access', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({code}) });
          const result = await response.json();
          if (!response.ok) throw new Error(zh ? result.error : response.status === 429 ? 'Too many attempts. Try again in 15 minutes.' : 'The code is invalid, expired or has no uses remaining.');
          setContacts(result.contacts); setCode(''); setOpen(false);
        } catch (error) { setError(error instanceof Error ? error.message : 'Unable to verify'); } finally { setBusy(false); }
      }}>
        <label>{zh ? '访问码' : 'Access code'}<input value={code} onChange={event => setCode(event.target.value)} maxLength={64} autoComplete="off" autoCapitalize="none" spellCheck={false} required /></label>
        {error && <p role="alert">{error}</p>}
        <button disabled={busy} type="submit">{busy ? (zh ? '验证中…' : 'Verifying…') : (zh ? '解锁查看' : 'Unlock')}</button>
        <button type="button" onClick={() => setOpen(false)}>{zh ? '取消' : 'Cancel'}</button>
      </form>
    </DialogContent></Dialog>
  </div>;
}
