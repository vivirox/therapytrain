import { supabase } from '../config/database';

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
