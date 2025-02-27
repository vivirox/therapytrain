import { singleton } from 'tsyringe';
import { dataService } from '@/lib/data';

interface Assessment {
  id: string;
  clientId: string;
  type: 'initial' | 'progress' | 'final';
  date: Date;
  scores: {
    symptoms: number;
    functioning: number;
    relationships: number;
    coping: number;
  };
  notes: string;
}

@singleton()
export class AssessmentService {
  private readonly TABLE_NAME = 'assessments';

  public async createAssessment(assessment: Omit<Assessment, 'id'>): Promise<Assessment> {
    return await dataService.create(this.TABLE_NAME, assessment);
  }

  public async getAssessment(id: string): Promise<Assessment> {
    return await dataService.get(this.TABLE_NAME, id);
  }

  public async getClientAssessments(clientId: string): Promise<Assessment[]> {
    return await dataService.getMany(this.TABLE_NAME, { clientId });
  }

  public async getLatestAssessment(clientId: string): Promise<Assessment | null> {
    const assessments = await this.getClientAssessments(clientId);
    if (!assessments.length) return null;
    
    return assessments.reduce((latest, current) => {
      return new Date(current.date) > new Date(latest.date) ? current : latest;
    });
  }

  public async updateAssessment(id: string, data: Partial<Assessment>): Promise<Assessment> {
    return await dataService.update(this.TABLE_NAME, id, data);
  }

  public async deleteAssessment(id: string): Promise<void> {
    await dataService.delete(this.TABLE_NAME, id);
  }

  public async calculateProgress(clientId: string): Promise<{
    symptoms: number;
    functioning: number;
    relationships: number;
    coping: number;
  }> {
    const assessments = await this.getClientAssessments(clientId);
    if (assessments.length < 2) return { symptoms: 0, functioning: 0, relationships: 0, coping: 0 };

    const initial = assessments.reduce((earliest, current) => {
      return new Date(current.date) < new Date(earliest.date) ? current : earliest;
    });

    const latest = assessments.reduce((latest, current) => {
      return new Date(current.date) > new Date(latest.date) ? current : latest;
    });

    return {
      symptoms: this.calculateProgressDelta(initial.scores.symptoms, latest.scores.symptoms),
      functioning: this.calculateProgressDelta(initial.scores.functioning, latest.scores.functioning),
      relationships: this.calculateProgressDelta(initial.scores.relationships, latest.scores.relationships),
      coping: this.calculateProgressDelta(initial.scores.coping, latest.scores.coping)
    };
  }

  private calculateProgressDelta(initial: number, current: number): number {
    const delta = current - initial;
    const normalizedDelta = delta / (1 - initial); // Normalize based on room for improvement
    return Math.max(0, Math.min(1, normalizedDelta));
  }
} 