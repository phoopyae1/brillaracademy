export const AVAILABLE_MAJORS = [
  'Biomedical Engineering',
  'Data Science',
  'Business Administration',
  'International Relations',
  'Digital Media Design',
  'Environmental Science',
  'Hospitality Management',
  'Artificial Intelligence',
  'Cybersecurity'
] as const;

export type Major = (typeof AVAILABLE_MAJORS)[number];
