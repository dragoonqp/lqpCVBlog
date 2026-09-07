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
export type WorkLanguage = { id: string; name: string; nameZh?: string; proficiency?: string; proficiencyZh?: string };
export type Contacts = {
  languages?: WorkLanguage[];
  name?: string;
  nameZh?: string;
  phone: string;
  email: string;
  location: string;
  linkedin: string;
  whatsapp: string;
  telegram: string;
};
export type EngineeringNote = {
  id: string; type: string; title: string; blurb: string;
  typeZh?: string; titleZh?: string; blurbZh?: string;
};
export type ResumeData = {
  notes: EngineeringNote[];
  revision: number;
  roles: Role[];
  skills: Skill[];
  contacts: Contacts;
};
