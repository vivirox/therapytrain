import { supabase } from '../../src/lib/supabase';

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

// Function to create a new tutorial
export const createTutorial = async (tutorial: Tutorial) => {
  const { data, error } = await supabase
    .from('tutorials')
    .insert([tutorial]);

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

// Function to get all tutorials
export const getAllTutorials = async () => {
  const { data, error } = await supabase
    .from('tutorials')
    .select('*');

  if (error) {
    throw new Error(error.message);
  }
  return data;
};
