export const skillGroups = [
  'Frontend',
  'Full-stack',
  'Visual',
  'Engineering',
] as const;
export type Group = (typeof skillGroups)[number];
export type Skill = {
  id: string;
  name: string;
  group: Group;
  level: number | null;
  years: number | null;
  impact: number;
  fill: string;
};
export type Role = {
  roleZh?: string;
  summaryZh?: string;
  id: string;
  company: string;
  role: string;
  dates: string;
  summary: string;
  tags: string[];
  stat: string;
};
export type Contacts = {
  phone: string;
  email: string;
  location: string;
  linkedin: string;
  whatsapp: string;
  telegram: string;
};
export type ResumeData = {
  revision: number;
  roles: Role[];
  skills: Skill[];
  contacts: Contacts;
};
