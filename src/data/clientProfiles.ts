import { ClientProfile } from '../types/Client';

export const clientProfiles: ClientProfile[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    age: 28,
    gender: "Female",
    primary_issue: "Anxiety and Depression",
    key_traits: ["Perfectionist", "High-achiever", "Self-critical"],
    background: "Corporate professional experiencing burnout and anxiety",
    goals: [
      "Develop better work-life balance",
      "Reduce anxiety symptoms",
      "Improve self-compassion"
    ],
    preferences: {
      communication_style: "Direct and analytical",
      therapy_type: ["CBT", "Mindfulness"],
      session_frequency: "Weekly"
    },
    progress: {
      sessions_completed: 12,
      goals_achieved: ["Established daily mindfulness practice"],
      current_focus: ["Stress management techniques", "Boundary setting"],
      customized_focus: ["Work-related anxiety", "Perfectionism"]
    },
    risk_factors: ["High stress work environment", "Family history of depression"],
    support_network: ["Partner", "Close friend", "Sister"],
    medications: ["Sertraline 50mg"],
    notes: "Responds well to structured approaches and homework assignments",
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-03-15T00:00:00Z"
  },
  {
    id: "2",
    name: "Michael Chen",
    age: 35,
    gender: "Male",
    primary_issue: "Relationship Difficulties",
    key_traits: ["Introverted", "Analytical", "Reserved"],
    background: "Tech professional struggling with work-life balance and relationships",
    goals: [
      "Improve communication skills",
      "Build meaningful relationships",
      "Manage work stress"
    ],
    preferences: {
      communication_style: "Logical and structured",
      therapy_type: ["Solution-focused", "CBT"],
      session_frequency: "Bi-weekly"
    },
    progress: {
      sessions_completed: 8,
      goals_achieved: ["Improved assertiveness at work"],
      current_focus: ["Dating skills", "Social anxiety"],
      customized_focus: ["Professional relationships", "Dating confidence"]
    },
    risk_factors: ["Social isolation", "Work pressure"],
    support_network: ["Parents", "Online gaming friends"],
    medications: [],
    notes: "Prefers concrete examples and practical exercises",
    created_at: "2024-02-01T00:00:00Z",
    updated_at: "2024-03-14T00:00:00Z"
  }
];

export const getClientProfile = (id: string): ClientProfile | undefined => {
  return clientProfiles.find(profile => profile.id === id);
};
