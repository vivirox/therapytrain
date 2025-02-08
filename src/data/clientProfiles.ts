import { ClientProfile } from '@/types/Client';

export const clientProfiles: ClientProfile[] = [
  {
    id: "1",
    name: "John Doe",
    primary_issue: "Anxiety",
    preferences: {
      communicationPreference: "text",
      appointmentReminders: true,
      language: "English",
      timezone: "UTC-5",
      communication_style: "Direct and analytical"
    }
  },
  {
    id: "2",
    name: "Jane Smith",
    primary_issue: "Depression",
    preferences: {
      communicationPreference: "email",
      appointmentReminders: true,
      language: "English",
      timezone: "UTC-8",
      communication_style: "Logical and structured"
    }
  }
];

export const getClientProfile = (id: string): ClientProfile | undefined => {
  return clientProfiles.find(profile => profile.id === id);
};
