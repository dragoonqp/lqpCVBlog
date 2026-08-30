import { create } from 'zustand';

export type SkillGroup = 'All' | 'Frontend' | 'Full-stack' | 'Visual';

type ProfileState = {
  activeGroup: SkillGroup;
  setActiveGroup: (group: SkillGroup) => void;
};

export const useProfileStore = create<ProfileState>((set) => ({
  activeGroup: 'All',
  setActiveGroup: (activeGroup) => set({ activeGroup }),
}));
