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
import { useState } from 'react';
import { skillGroups } from '@/lib/resume-types';
import type { ResumeData, Skill } from '@/lib/resume-types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const articles = [
  {
    no: '01',
    type: 'Architecture',
    title: 'Making organizational data feel simple',
    blurb:
      'A field guide to component boundaries and calculation utilities for deeply nested enterprise hierarchies.',
  },
  {
    no: '02',
    type: 'Visualization',
    title: 'From dashboard to spatial story',
    blurb:
      'What changed when a Three.js globe became a real navigation surface instead of decoration.',
  },
  {
    no: '03',
    type: 'Engineering',
    title: 'Reliable releases are a product feature',
    blurb:
      'Practical notes on UAT automation, production incident rotation and keeping delivery calm.',
  },
];

function SkillTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Skill }>;
}) {
  if (!active || !payload?.[0]) return null;
  const skill = payload[0].payload;
  return (
    <div className="chart-tip">
      <strong>{skill.name}</strong>
      <span>
        {skill.level}% mastery · {skill.years} yrs in production
      </span>
      <small>Impact radius {skill.impact}/10</small>
    </div>
  );
}

export default function ResumeView({ data }: { data: ResumeData }) {
  const { skills, roles, contacts } = data;
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
          <h1>Qiuping Long</h1>
          <p className="headline">
            Senior Front-End Engineer · Full-Stack Delivery
          </p>
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
              Profile
            </h2>
            <ul className="strengths">
              <li>
                7+ years delivering enterprise products across financial
                services, manufacturing, telecom and government platforms.
              </li>
              <li>
                Front-end architecture with JavaScript, TypeScript, Vue and
                React, supported by reusable components and resilient
                engineering.
              </li>
              <li>
                Full-stack delivery spanning Java Spring, SQL Server and
                automated UAT deployments.
              </li>
              <li>
                Expressive data visualization with ECharts and Three.js,
                bridging complex data and clear product experiences.
              </li>
            </ul>
          </section>
          <section id="expertise" aria-labelledby="skills-heading">
            <h2 id="skills-heading">
              <span className="section-icon">
                <Code2 size={17} />
              </span>
              Technical Skills
            </h2>
            {skillGroups
              .filter((group) => skills.some((skill) => skill.group === group))
              .map((group) => (
                <div
                  className={'skill-group skill-' + group.toLowerCase()}
                  key={group}
                >
                  <h3>
                    {group === 'Frontend'
                      ? 'Front-End Development'
                      : group === 'Visual'
                        ? 'Data Visualization'
                        : group === 'Engineering'
                          ? 'Engineering & Delivery'
                          : 'Full-Stack Development'}
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
                    Click me <ChartNoAxesCombined size={14} />
                  </button>
                </div>
              ))}
          </section>
          <section aria-labelledby="highlights-heading">
            <h2 id="highlights-heading">
              <span className="section-icon">
                <ChartNoAxesCombined size={16} />
              </span>
              Highlights
            </h2>
            <dl className="highlights">
              <div>
                <dt>2024 performance rank</dt>
                <dd>
                  6 <span>/ 38</span>
                </dd>
              </div>
              <div>
                <dt>Critical defects</dt>
                <dd>0</dd>
              </div>
              <div>
                <dt>HSBC platforms maintained full-stack</dt>
                <dd>2</dd>
              </div>
            </dl>
            <p className="language">
              <strong>Languages</strong>
              <br />
              English · CEFR C1
            </p>
          </section>
        </aside>
        <div className="resume-main">
          <section id="work" aria-labelledby="work-heading">
            <h2 id="work-heading">
              <span className="section-icon">
                <BriefcaseBusiness size={16} />
              </span>
              Work Experience
            </h2>
            <div className="timeline">
              {roles.map((role) => (
                <article className="role" key={role.id}>
                  <div className="role-heading">
                    <h3>{role.company}</h3>
                    <span className="role-date">{role.dates}</span>
                  </div>
                  <h4>{role.role}</h4>
                  <ul className="role-description">
                    <li>{role.summary}</li>
                  </ul>
                  <div className="tags">
                    {role.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                    {role.stat && (
                      <span className="achievement">{role.stat}</span>
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
              Engineering Notes
            </h2>
            <div className="notes-list">
              {articles.map((article) => (
                <article className="note" key={article.no}>
                  <div className="note-heading">
                    <h3>{article.title}</h3>
                    <span>{article.type}</span>
                  </div>
                  <p>{article.blurb}</p>
                </article>
              ))}
            </div>
          </section>
          <Dialog open={chartOpen} onOpenChange={setChartOpen}>
            <DialogContent className="skill-dialog">
              <DialogTitle>Technology depth map</DialogTitle>
              <DialogDescription>
                掌握程度 × 使用年限；气泡大小代表项目影响范围。
              </DialogDescription>
              <div className="chart-card">
                <div className="chart-head">
                  <span>TECHNOLOGY DEPTH MAP</span>
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
                      该分组尚未设置掌握程度和使用年限，可在管理页面补充。
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
                            name="Mastery"
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
                            name="Experience"
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
                              value: 'CORE ZONE',
                              position: 'insideTopRight',
                              fill: '#7d827d',
                              fontSize: 9,
                            }}
                          />
                          <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={<SkillTooltip />}
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
                        {skill.level}% · {skill.years} years · impact{' '}
                        {skill.impact}/10
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
                  <span>← growing capability</span>
                  <span>mastery →</span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <footer>
        <span>© 2026 Qiuping Long</span>
        {contacts.email && (
          <a href={'mailto:' + contacts.email}>Let’s talk · {contacts.email}</a>
        )}
        <a href="/admin">Manage</a>
      </footer>
    </main>
  );
}
