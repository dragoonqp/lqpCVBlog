'use client';

import { ArrowDownRight, ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react';
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
import { SkillGroup, useProfileStore } from '@/lib/profile-store';

const skills = [
  {
    name: 'JavaScript',
    level: 97,
    years: 7.0,
    impact: 10,
    group: 'Frontend',
    fill: '#ffb454',
  },
  {
    name: 'HTML / CSS',
    level: 96,
    years: 7.0,
    impact: 10,
    group: 'Frontend',
    fill: '#ffb454',
  },
  {
    name: 'Vue',
    level: 95,
    years: 5.7,
    impact: 9,
    group: 'Frontend',
    fill: '#ffb454',
  },
  {
    name: 'TypeScript',
    level: 90,
    years: 4.5,
    impact: 8,
    group: 'Frontend',
    fill: '#ffb454',
  },
  {
    name: 'React',
    level: 83,
    years: 2.8,
    impact: 7,
    group: 'Frontend',
    fill: '#8ec5ff',
  },
  {
    name: 'ECharts',
    level: 84,
    years: 3.7,
    impact: 8,
    group: 'Visual',
    fill: '#8ec5ff',
  },
  {
    name: 'Java',
    level: 79,
    years: 1.6,
    impact: 6,
    group: 'Full-stack',
    fill: '#8ec5ff',
  },
  {
    name: 'SQL',
    level: 76,
    years: 1.6,
    impact: 6,
    group: 'Full-stack',
    fill: '#8ec5ff',
  },
  {
    name: 'Three.js',
    level: 70,
    years: 1.2,
    impact: 5,
    group: 'Visual',
    fill: '#b797ff',
  },
  {
    name: 'Tailwind',
    level: 68,
    years: 0.8,
    impact: 4,
    group: 'Frontend',
    fill: '#b797ff',
  },
] as const;

const roles = [
  {
    dates: '2025.09 — 2026.07',
    company: 'CEC GienTech',
    role: 'Specialist Engineer · P8',
    summary:
      'Full-stack delivery for HSBC service management systems, spanning Vue 3, React, Java Spring, SQL Server and automated UAT deployments.',
    tags: ['Vue 3', 'React', 'Java', 'Jenkins'],
  },
  {
    dates: '2021.12 — 2025.08',
    company: 'iSoftStone',
    role: 'Senior Front-End Engineer',
    summary:
      'Architected Midea’s quality and manufacturing data platform from zero, including responsive workflows, geographic analytics and Three.js scenes.',
    tags: ['Vue 3', 'ECharts', 'Three.js', 'DevOps'],
    stat: '0 critical defects',
  },
  {
    dates: '2020.08 — 2021.11',
    company: 'Chinasoft International',
    role: 'Front-End Engineer',
    summary:
      'Built HSBC hybrid applications for innovation proposals and workspace booking, including granular permissions and gesture-rich floor maps.',
    tags: ['Vue', 'React', 'Hybrid H5', 'Redux'],
  },
  {
    dates: '2019.07 — 2020.07',
    company: 'Xinshihonghui',
    role: 'Front-End Engineer',
    summary:
      'Delivered reusable enterprise order-management modules and high-level editable table and validation components for Guangzhou Unicom.',
    tags: ['React', 'Dva.js', 'Ant Design'],
  },
];

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
  payload?: Array<{ payload: (typeof skills)[number] }>;
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

export default function Home() {
  const { activeGroup, setActiveGroup } = useProfileStore();
  const visibleSkills =
    activeGroup === 'All'
      ? skills
      : skills.filter((skill) => skill.group === activeGroup);
  const groups: SkillGroup[] = ['All', 'Frontend', 'Full-stack', 'Visual'];

  return (
    <main>
      <nav className="nav-shell" aria-label="Primary navigation">
        <a className="wordmark" href="#top" aria-label="Qiuping Long home">
          QL<span>·</span>
        </a>
        <div className="nav-links">
          <a href="#expertise">Expertise</a>
          <a href="#work">Experience</a>
          <a href="#notes">Notes</a>
          <a href="mailto:dragoonqp@outlook.com">
            Let’s talk <ArrowDownRight size={15} />
          </a>
        </div>
      </nav>

      <div className="contact-bar section-shell" aria-label="Contact information">
        <span><MapPin size={14} /> Guangzhou, China</span>
        <a href="tel:+8618620445753"><Phone size={14} /> +86 186 2044 5753</a>
        <a href="mailto:dragoonqp@outlook.com"><Mail size={14} /> dragoonqp@outlook.com</a>
        <span>CEFR C1 English</span>
      </div>

      <section id="top" className="hero section-shell">
        <div className="eyebrow">
          <span className="pulse" />
          Available for meaningful products
        </div>
        <h1>
          I build complex
          <br />
          systems that feel <em>clear.</em>
        </h1>
        <div className="hero-bottom">
          <p>
            Senior front-end engineer bridging product judgment, resilient
            engineering, and expressive data visualization.
          </p>
          <div className="hero-meta">
            <span>
              <MapPin size={15} /> Guangzhou, China
            </span>
            <span>7+ years shipping</span>
            <span>CEFR C1 English</span>
          </div>
        </div>
      </section>

      <section id="expertise" className="expertise section-shell">
        <div className="section-intro">
          <p className="kicker">01 — Engineering profile</p>
          <div>
            <h2>Depth, plotted.</h2>
            <p>
              A two-dimensional view of hands-on experience: mastery meets time
              in production. Bubble size represents breadth of project impact.
            </p>
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-head">
            <span>TECHNOLOGY DEPTH MAP</span>
            <div className="filters" role="group" aria-label="Filter skills">
              {groups.map((group) => (
                <button
                  key={group}
                  className={activeGroup === group ? 'active' : ''}
                  onClick={() => setActiveGroup(group)}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-wrap">
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
                  domain={[60, 100]}
                  tickCount={5}
                  unit="%"
                  name="Mastery"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="number"
                  dataKey="years"
                  domain={[0, 8]}
                  unit="y"
                  name="Experience"
                  tickLine={false}
                  axisLine={false}
                />
                <ZAxis type="number" dataKey="impact" range={[160, 760]} />
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
                    fontSize={10}
                  />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="axis-note">
            <span>← growing capability</span>
            <span>mastery →</span>
          </div>
        </div>
        <div className="capability-strip">
          <div>
            <span>CORE</span>
            <strong>Front-end architecture</strong>
          </div>
          <div>
            <span>EDGE</span>
            <strong>Data visualization</strong>
          </div>
          <div>
            <span>RANGE</span>
            <strong>Full-stack delivery</strong>
          </div>
          <div>
            <span>MODE</span>
            <strong>AI-assisted development</strong>
          </div>
        </div>
      </section>

      <section id="work" className="work section-shell">
        <div className="section-intro">
          <p className="kicker">02 — Experience</p>
          <div>
            <h2>Built in the real world.</h2>
            <p>
              Seven years across financial services, manufacturing data,
              telecom, government platforms and hybrid mobile products.
            </p>
          </div>
        </div>
        <div className="timeline">
          {roles.map((role, index) => (
            <article className="role" key={role.company}>
              <span className="role-index">0{index + 1}</span>
              <div className="role-date">{role.dates}</div>
              <div className="role-main">
                <div className="role-title">
                  <h3>{role.company}</h3>
                  {role.stat && <span>{role.stat}</span>}
                </div>
                <h4>{role.role}</h4>
                <p>{role.summary}</p>
                <div className="tags">
                  {role.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="selected section-shell">
        <p className="kicker">Selected impact</p>
        <div className="impact-grid">
          <div>
            <strong>
              6<sup>/38</sup>
            </strong>
            <span>2024 performance rank</span>
          </div>
          <div>
            <strong>0</strong>
            <span>critical defects</span>
          </div>
          <div>
            <strong>2</strong>
            <span>HSBC platforms maintained full-stack</span>
          </div>
          <div>
            <strong>7+</strong>
            <span>years of product delivery</span>
          </div>
        </div>
      </section>

      <section id="notes" className="notes section-shell">
        <div className="section-intro">
          <p className="kicker">03 — Field notes</p>
          <div>
            <h2>Thinking in public.</h2>
            <p>
              Short essays on the engineering decisions behind reliable,
              understandable products.
            </p>
          </div>
        </div>
        <div className="article-grid">
          {articles.map((article) => (
            <article key={article.no}>
              <div className="article-meta">
                <span>{article.no}</span>
                <span>{article.type}</span>
              </div>
              <h3>{article.title}</h3>
              <p>{article.blurb}</p>
              <button aria-label={`Read ${article.title}`}>
                Read note <ArrowUpRight size={16} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="contact section-shell">
        <p className="kicker">Let’s make the difficult feel obvious.</p>
        <a href="mailto:dragoonqp@outlook.com">
          Start a conversation <ArrowUpRight />
        </a>
      </section>
      <footer className="section-shell">
        <span>© 2026 Qiuping Long</span>
        <a href="mailto:dragoonqp@outlook.com">
          <Mail size={16} /> dragoonqp@outlook.com
        </a>
        <span>Built with React, Next.js & Recharts</span>
      </footer>
    </main>
  );
}
