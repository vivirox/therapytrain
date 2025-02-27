import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

class DataService {
  private static instance: DataService;
  private supabase;

  private constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  // Add your data service methods here
  async getData<T>(table: string, query: any = {}): Promise<T[]> {
    const { data, error } = await this.supabase
      .from(table)
      .select()
      .match(query);

    if (error) throw error;
    return data as T[];
  }

  async insertData<T>(table: string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await this.supabase
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result as T;
  }

  async updateData<T>(table: string, id: string | number, data: Partial<T>): Promise<T> {
    const { data: result, error } = await this.supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result as T;
  }

  async deleteData(table: string, id: string | number): Promise<void> {
    const { error } = await this.supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const dataService = DataService.getInstance(); 