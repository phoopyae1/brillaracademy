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

export type CourseMetadata = {
  instructor: string;
  credits: number;
};

const COURSE_METADATA: Record<string, CourseMetadata> = {
  'Neural Interface Design': { instructor: 'Dr. Priya Raman', credits: 3 },
  'Biomechatronics Studio': { instructor: 'Dr. Leila Morgan', credits: 4 },
  'Biomedical Signal Processing': { instructor: 'Dr. Priya Raman', credits: 3 },
  'Global Health Innovation Lab': { instructor: 'Dr. Priya Raman', credits: 3 },
  'Responsible AI Systems': { instructor: 'Professor Malik Chen', credits: 4 },
  'Immersive Analytics Workshop': { instructor: 'Professor Aaron Patel', credits: 3 },
  'Bayesian Machine Learning': { instructor: 'Dr. Grace Hopper', credits: 3 },
  'Advanced Data Ethics': { instructor: 'Dr. Leila Morgan', credits: 3 },
  'Strategic Leadership Lab': { instructor: 'Dr. Sarah Wilson', credits: 3 },
  'Financial Modeling and Valuation': { instructor: 'Professor James Lee', credits: 4 },
  'Global Marketing Strategy': { instructor: 'Dr. Emily Zhang', credits: 3 },
  'Operations Innovation Clinic': { instructor: 'Professor David Chen', credits: 4 },
  'Diplomacy in Practice': { instructor: 'Dr. Amara Patel', credits: 3 },
  'Global Conflict Simulation': { instructor: 'Professor Michael Brown', credits: 4 },
  'Policy Analysis Studio': { instructor: 'Dr. Lisa Anderson', credits: 3 },
  'Comparative Governance': { instructor: 'Professor Robert Taylor', credits: 3 },
  'Interactive Storytelling Lab': { instructor: 'Dr. Maria Garcia', credits: 3 },
  'Motion Graphics Studio': { instructor: 'Professor Alex Kim', credits: 4 },
  'Immersive Experience Design': { instructor: 'Dr. Jennifer Park', credits: 4 },
  'Design Systems Workshop': { instructor: 'Professor Tom Moore', credits: 3 },
  'Climate Modeling Practicum': { instructor: 'Dr. Emma Green', credits: 3 },
  'Urban Sustainability Studio': { instructor: 'Professor Noah Wilson', credits: 4 },
  'Ecosystem Restoration Lab': { instructor: 'Dr. Rachel Thompson', credits: 3 },
  'Environmental Policy Clinic': { instructor: 'Professor Sam Wright', credits: 4 },
  'Luxury Service Design': { instructor: 'Dr. Olivia Martin', credits: 3 },
  'Culinary Innovation Lab': { instructor: 'Chef Diego Rodriguez', credits: 4 },
  'Resort Operations Studio': { instructor: 'Professor Hannah Smith', credits: 3 },
  'Event Experience Management': { instructor: 'Dr. Kevin Lee', credits: 3 },
  'Ethical Machine Intelligence': { instructor: 'Dr. Grace Hopper', credits: 4 },
  'Autonomous Systems Lab': { instructor: 'Professor Malik Chen', credits: 3 },
  'Human-Centered AI Design': { instructor: 'Dr. Priya Raman', credits: 4 },
  'Generative AI Studio': { instructor: 'Professor Aaron Patel', credits: 3 },
  'Advanced Threat Hunting': { instructor: 'Dr. Chris Johnson', credits: 4 },
  'Secure Systems Architecture': { instructor: 'Professor Jessica Wu', credits: 3 },
  'Incident Response Workshop': { instructor: 'Dr. Michael Davis', credits: 3 },
  'Cloud Security Operations': { instructor: 'Professor Ryan Martinez', credits: 4 },
  'Intro to Programming': { instructor: 'Dr. Ada Lovelace', credits: 3 },
  'Data Structures & Algorithms': { instructor: 'Dr. Grace Hopper', credits: 4 },
  'Neuroscience Frontiers': { instructor: 'Professor Malik Chen', credits: 4 },
  'Immersive Visualization Studio': { instructor: 'Professor Aaron Patel', credits: 4 },
  'Web Development Lab': { instructor: 'Dr. Ada Lovelace', credits: 3 }
};

export function getCourseMetadata(subjectTitle: string): CourseMetadata | null {
  return COURSE_METADATA[subjectTitle] ?? null;
}
