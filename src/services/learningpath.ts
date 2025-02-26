import { createClient } from '@/integrations/supabase/client';

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    completed: boolean;
  }>;
}

export class LearningPathService {
  static async getUserPath(userId: string): Promise<LearningPath | null> {
    try {
      const { data, error } = await createClient
        .from('learning_paths')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching learning path:', error);
      return null;
    }
  }

  static async updateStepStatus(userId: string, stepId: string, completed: boolean): Promise<boolean> {
    try {
      const { error } = await createClient
        .from('learning_path_progress')
        .upsert({
          user_id: userId,
          step_id: stepId,
          completed,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating step status:', error);
      return false;
    }
  }

  static async getRecommendedPath(userId: string): Promise<LearningPath | null> {
    try {
      const { data, error } = await createClient
        .rpc('get_recommended_learning_path', { user_id: userId });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching recommended path:', error);
      return null;
    }
  }
} 