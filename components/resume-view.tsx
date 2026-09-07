'use client';

import {
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Code2,
  FileText,
  Mail,
  MapPin,
  Phone,
  Star,
  Link,
  MessageCircle,
  Send,
} from 'lucide-react';
import {
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { useState, useEffect } from 'react';
import { translate } from '@/lib/resume-i18n.cjs';
import { useRouter } from 'next/navigation';
import { skillGroups } from '@/lib/resume-types';
import type { ResumeData, Skill } from '@/lib/resume-types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';


function SkillTooltip({
  active,
  payload,
  locale = 'en',
}: {
  locale?: 'en' | 'zh';
  active?: boolean;
  payload?: Array<{ payload: Skill }>;
}) {
  if (!active || !payload?.[0]) return null;
  const skill = payload[0].payload;
  const t = (text: string) => translate(text, locale);
  return (
    <div className="chart-tip">
      <strong>{skill.name}</strong>
      <span>
        {t('Mastery')}: {skill.level}% · {skill.years} {t('years')}
      </span>
      <small>
        {t('impact')}: {skill.impact}/10
      </small>
    </div>
  );
}

export default function ResumeView({ data }: { data: ResumeData }) {
  const { skills, roles, contacts, notes } = data;
  const [locale, setLocale] = useState<'en' | 'zh'>('en');
  useEffect(() => {
    try {
      if (localStorage.getItem('resume-language') === 'zh') setLocale('zh');
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  }, [locale]);
  const t = (text: string, override?: string) =>
    translate(text, locale, override);
  function chooseLanguage(value: 'en' | 'zh') {
    setLocale(value);
    try {
      localStorage.setItem('resume-language', value);
    } catch {}
  }
  const router = useRouter();
  useEffect(() => {
    const refresh = () => router.refresh();
    const channel =
      'BroadcastChannel' in window
        ? new BroadcastChannel('resume-updates')
        : null;
    if (channel)
      channel.onmessage = (event) => {
        if (event.data === 'saved') refresh();
      };
    window.addEventListener('focus', refresh);
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => {
      channel?.close();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [router]);
  const [activeGroup, setActiveGroup] = useState<string>('All');
  const [chartOpen, setChartOpen] = useState(false);
  const visibleSkills = skills.filter(
    (skill) =>
      (activeGroup === 'All' || skill.group === activeGroup) &&
      skill.level !== null &&
      skill.years !== null,
  );
  const groups = ['All', ...skillGroups];
  return (
    <main className="resume" id="top">
      <header className="resume-header">
        <div>
          <h1>{t(contacts.name || 'Qiuping Long', contacts.nameZh)}</h1>
          <div
            className="language-switch"
            role="group"
            aria-label="Language / 语言"
          >
            <button
              type="button"
              aria-pressed={locale === 'zh'}
              onClick={() => chooseLanguage('zh')}
            >
              中文
            </button>
            <button
              type="button"
              aria-pressed={locale === 'en'}
              onClick={() => chooseLanguage('en')}
            >
              English
            </button>
          </div>
          <p className="headline">
            {t('Senior Front-End Engineer · Full-Stack Delivery')}
          </p>
          {!!contacts.languages?.length && <div className="work-languages"><strong>{locale === 'zh' ? '工作语言' : 'Working languages'}</strong><ul>{contacts.languages.map(language => <li key={language.id}>{t(language.name, language.nameZh)}{(language.proficiency || (locale === 'zh' && language.proficiencyZh)) && <> · {t(language.proficiency || '', language.proficiencyZh)}</>}</li>)}</ul></div>}
        </div>
        <address className="contact-info">
          {contacts.phone && (
            <a href={'tel:' + contacts.phone.replace(/[^+0-9]/g, '')}>
              <Phone size={15} />
              {contacts.phone}
            </a>
          )}
          {contacts.email && (
            <a href={'mailto:' + contacts.email}>
              <Mail size={15} />
              {contacts.email}
            </a>
          )}
          {contacts.location && (
            <span>
              <MapPin size={15} />
              {contacts.location}
            </span>
          )}
          {contacts.linkedin && (
            <a
              href={contacts.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Link size={15} />
              LinkedIn
            </a>
          )}
          {contacts.whatsapp && (
            <a
              href={contacts.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={15} />
              WhatsApp
            </a>
          )}
          {contacts.telegram && (
            <a
              href={contacts.telegram}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Send size={15} />
              Telegram
            </a>
          )}
        </address>
      </header>
      <div className="resume-columns">
        <aside className="sidebar">
          <section aria-labelledby="profile-heading">
            <h2 id="profile-heading">
              <span className="section-icon">
                <Star size={16} />
              </span>
              {t('Profile')}
            </h2>
            <ul className="strengths">
              <li>
                {t(
                  '7+ years delivering enterprise products across financial services, manufacturing, telecom and government platforms.',
                )}
              </li>
              <li>
                {t(
                  'Front-end architecture with JavaScript, TypeScript, Vue and React, supported by reusable components and resilient engineering.',
                )}
              </li>
              <li>
                {t(
                  'Full-stack delivery spanning Java Spring, SQL Server and automated UAT deployments.',
                )}
              </li>
              <li>
                {t(
                  'Expressive data visualization with ECharts and Three.js, bridging complex data and clear product experiences.',
                )}
              </li>
            </ul>
          </section>
          <section id="expertise" aria-labelledby="skills-heading">
            <h2 id="skills-heading">
              <span className="section-icon">
                <Code2 size={17} />
              </span>
              {t('Technical Skills')}
            </h2>
            {skillGroups
              .filter((group) => skills.some((skill) => skill.group === group))
              .map((group) => (
                <div
                  className={'skill-group skill-' + group.toLowerCase()}
                  key={t(group)}
                >
                  <h3>
                    {group === 'Frontend'
                      ? t('Front-End Development')
                      : group === 'Visual'
                        ? t('Data Visualization')
                        : group === 'Engineering'
                          ? t('Engineering & Delivery')
                          : t('Full-Stack Development')}
                  </h3>
                  <div className="skill-tags">
                    {skills
                      .filter((skill) => skill.group === group)
                      .map((skill) => (
                        <span key={skill.id}>{skill.name}</span>
                      ))}
                  </div>
                  <button
                    className="skill-explore"
                    aria-label={'Explore ' + group + ' skill mastery'}
                    onClick={() => {
                      setActiveGroup(group);
                      setChartOpen(true);
                    }}
                  >
                    {t('Click me')}
                    <ChartNoAxesCombined size={14} />
                  </button>
                </div>
              ))}
          </section>
          <section aria-labelledby="highlights-heading">
            <h2 id="highlights-heading">
              <span className="section-icon">
                <ChartNoAxesCombined size={16} />
              </span>
              {t('Highlights')}
            </h2>
            <dl className="highlights">
              <div>
                <dt>{t('2024 performance rank')}</dt>
                <dd>
                  6 <span>/ 38</span>
                </dd>
              </div>
              <div>
                <dt>{t('Critical defects')}</dt>
                <dd>0</dd>
              </div>
              <div>
                <dt>{t('HSBC platforms maintained full-stack')}</dt>
                <dd>2</dd>
              </div>
            </dl>
          </section>
        </aside>
        <div className="resume-main">
          <section id="work" aria-labelledby="work-heading">
            <h2 id="work-heading">
              <span className="section-icon">
                <BriefcaseBusiness size={16} />
              </span>
              {t('Work Experience')}
            </h2>
            <div className="timeline">
              {roles.map((role) => (
                <article className="role" key={role.id}>
                  <div className="role-heading">
                    <h3>{role.company}</h3>
                    <span className="role-date">{role.dates}</span>
                  </div>
                  <h4>{t(role.role, role.roleZh)}</h4>
                  <ul className="role-description">
                    <li>{t(role.summary, role.summaryZh)}</li>
                  </ul>
                  <div className="tags">
                    {role.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                    {role.stat && (
                      <span className="achievement">{t(role.stat)}</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section
            id="notes"
            className="main-section"
            aria-labelledby="notes-heading"
          >
            <h2 id="notes-heading">
              <span className="section-icon">
                <FileText size={16} />
              </span>
              {t('Engineering Notes')}
            </h2>
            <div className="notes-list">
              {notes.map((article) => (
                <article className="note" key={article.id}>
                  <div className="note-heading">
                    <h3>{t(article.title, article.titleZh)}</h3>
                    <span>{t(article.type, article.typeZh)}</span>
                  </div>
                  <p>{t(article.blurb, article.blurbZh)}</p>
                </article>
              ))}
            </div>
          </section>
          <Dialog open={chartOpen} onOpenChange={setChartOpen}>
            <DialogContent className="skill-dialog">
              <DialogTitle>{t('Technology depth map')}</DialogTitle>
              <DialogDescription>
                {t(
                  'Mastery × years of experience; bubble size represents project impact.',
                )}
              </DialogDescription>
              <div className="chart-card">
                <div className="chart-head">
                  <span>{t('TECHNOLOGY DEPTH MAP')}</span>
                  <div
                    className="filters"
                    role="group"
                    aria-label="Filter skills"
                  >
                    {groups.map((group) => (
                      <button
                        key={group}
                        aria-pressed={activeGroup === group}
                        className={activeGroup === group ? 'active' : ''}
                        onClick={() => setActiveGroup(group)}
                      >
                        {group}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="chart-wrap">
                  {!visibleSkills.length ? (
                    <p className="empty-state">
                      {t(
                        'No mastery and experience data yet. Add these values in Admin.',
                      )}
                    </p>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart
                          margin={{ top: 40, right: 45, bottom: 25, left: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="2 7"
                            vertical={false}
                            stroke="#17211b18"
                          />
                          <XAxis
                            type="number"
                            dataKey="level"
                            domain={[0, 100]}
                            tickCount={5}
                            unit="%"
                            name={t('Mastery')}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            type="number"
                            dataKey="years"
                            domain={[
                              0,
                              Math.max(
                                8,
                                ...visibleSkills.map(
                                  (skill) => skill.years ?? 0,
                                ),
                              ) + 1,
                            ]}
                            unit="y"
                            name={t('Experience')}
                            tickLine={false}
                            axisLine={false}
                          />
                          <ZAxis
                            type="number"
                            dataKey="impact"
                            domain={[0, 10]}
                            range={[160, 760]}
                          />
                          <ReferenceLine
                            x={85}
                            stroke="#17211b30"
                            strokeDasharray="4 5"
                            label={{
                              value: t('CORE ZONE'),
                              position: 'insideTopRight',
                              fill: '#7d827d',
                              fontSize: 9,
                            }}
                          />
                          <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={<SkillTooltip locale={locale} />}
                          />
                          <Scatter data={[...visibleSkills]} shape="circle">
                            <LabelList
                              dataKey="name"
                              position="top"
                              offset={12}
                              fill="#535b55"
                              fontSize={12}
                            />
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </>
                  )}
                </div>
                <div className="skill-metrics">
                  {visibleSkills.map((skill) => (
                    <div key={skill.id}>
                      <strong>{skill.name}</strong>
                      <span>
                        {skill.level}% · {skill.years} {t('years')} ·{' '}
                        {t('impact')} {skill.impact}/10
                      </span>
                      <progress
                        aria-label={skill.name + ' mastery'}
                        value={skill.level ?? 0}
                        max={100}
                      />
                    </div>
                  ))}
                </div>
                <div className="axis-note">
                  <span>{t('← growing capability')}</span>
                  <span>{t('mastery →')}</span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <footer>
        <span>© 2026 {t(contacts.name || 'Qiuping Long', contacts.nameZh)}</span>
        {contacts.email && (
          <a href={'mailto:' + contacts.email}>
            {t('Let’s talk')} · {contacts.email}
          </a>
        )}
        <a href="/admin">{t('Manage')}</a>
      </footer>
    </main>
  );
}
