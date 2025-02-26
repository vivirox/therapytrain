import { createClient } from '@/integrations/supabase/client';

export interface AnalyticsData {
  userId: string;
  skillLevel: {
    [key: string]: number;  // skill name -> proficiency level (0-100)
  };
  learningStyle: string;
  recommendedTopics: string[];
  lastAssessment: string;
}

export class aiAnalyticsService {
  static async getUserAnalytics(userId: string): Promise<AnalyticsData | null> {
    try {
      const { data, error } = await createClient
        .from('user_analytics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      return null;
    }
  }

  static async updateSkillLevel(userId: string, skill: string, level: number): Promise<boolean> {
    try {
      const { error } = await createClient
        .from('user_analytics')
        .upsert({
          user_id: userId,
          [`skill_level.${skill}`]: level,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating skill level:', error);
      return false;
    }
  }

  static async getPersonalizedRecommendations(userId: string): Promise<string[]> {
    try {
      const { data, error } = await createClient
        .rpc('get_personalized_recommendations', { user_id: userId });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  }

  static async recordLearningActivity(userId: string, activityType: string, details: any): Promise<boolean> {
    try {
      const { error } = await createClient
        .from('learning_activities')
        .insert({
          user_id: userId,
          activity_type: activityType,
          details,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error recording learning activity:', error);
      return false;
    }
  }
} 