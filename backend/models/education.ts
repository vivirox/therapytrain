import { supabase } from '@/config/database';

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProgress {
  userId: string;
  tutorialId: string;
  progress: number; // percentage of completion
  updatedAt: Date;
}

// Function to get user's progress
export const getUserProgress = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('userId', userId);

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

// Function to get user's skills
export const getUserSkills = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_skills')
    .select('*')
    .eq('userId', userId);

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const createTutorial = async (tutorial: Omit<Tutorial, 'id' | 'createdAt' | 'updatedAt'>) => {
  const { data, error } = await supabase
    .from('tutorials')
    .insert([{
      ...tutorial,
      createdAt: new Date(),
      updatedAt: new Date()
    }])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

// Function to get all tutorials
export const getAllTutorials = async () => {
  const { data, error } = await supabase
    .from('tutorials')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

// Function to get a tutorial by ID
export const getTutorialById = async (id: string) => {
  const { data, error } = await supabase
    .from('tutorials')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

// Function to update a tutorial
export const updateTutorial = async (id: string, tutorial: Partial<Omit<Tutorial, 'id' | 'createdAt'>>) => {
  const { data, error } = await supabase
    .from('tutorials')
    .update({
      ...tutorial,
      updatedAt: new Date()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

// Function to delete a tutorial
export const deleteTutorial = async (id: string) => {
  const { error } = await supabase
    .from('tutorials')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
  return true;
};

// Function to track real-time analytics
export const trackRealTimeAnalytics = async (userId: string, eventType: string, metadata: Record<string, any>) => {
  const { error } = await supabase
    .from('real_time_analytics')
    .insert([{ userId, eventType, metadata, createdAt: new Date() }]);

  if (error) {
    throw new Error(error.message);
  }
};
