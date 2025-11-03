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

const MAJOR_SUBJECTS: Record<Major, string[]> = {
  'Biomedical Engineering': [
    'Neural Interface Design',
    'Biomechatronics Studio',
    'Biomedical Signal Processing',
    'Global Health Innovation Lab'
  ],
  'Data Science': [
    'Responsible AI Systems',
    'Immersive Analytics Workshop',
    'Bayesian Machine Learning',
    'Advanced Data Ethics'
  ],
  'Business Administration': [
    'Strategic Leadership Lab',
    'Financial Modeling and Valuation',
    'Global Marketing Strategy',
    'Operations Innovation Clinic'
  ],
  'International Relations': [
    'Diplomacy in Practice',
    'Global Conflict Simulation',
    'Policy Analysis Studio',
    'Comparative Governance'
  ],
  'Digital Media Design': [
    'Interactive Storytelling Lab',
    'Motion Graphics Studio',
    'Immersive Experience Design',
    'Design Systems Workshop'
  ],
  'Environmental Science': [
    'Climate Modeling Practicum',
    'Urban Sustainability Studio',
    'Ecosystem Restoration Lab',
    'Environmental Policy Clinic'
  ],
  'Hospitality Management': [
    'Luxury Service Design',
    'Culinary Innovation Lab',
    'Resort Operations Studio',
    'Event Experience Management'
  ],
  'Artificial Intelligence': [
    'Ethical Machine Intelligence',
    'Autonomous Systems Lab',
    'Human-Centered AI Design',
    'Generative AI Studio'
  ],
  Cybersecurity: [
    'Advanced Threat Hunting',
    'Secure Systems Architecture',
    'Incident Response Workshop',
    'Cloud Security Operations'
  ]
};

export function getSubjectsForMajor(major: string): string[] {
  if (!major) {
    return [];
  }

  const normalizedMajor = AVAILABLE_MAJORS.find((item) => item === major);
  if (!normalizedMajor) {
    return [];
  }

  return MAJOR_SUBJECTS[normalizedMajor] ?? [];
}

export function listMajorsWithSubjects(): Array<{ major: Major; subjects: string[] }> {
  return AVAILABLE_MAJORS.map((major) => ({
    major,
    subjects: getSubjectsForMajor(major)
  }));
}
