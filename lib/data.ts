import { createClient } from '@supabase/supabase-js';
import { cache } from './redis';

class DataService {
  private supabase;
  private cache = cache;

  constructor() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Supabase environment variables are required');
    }
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }

  public async get(table: string, id: string): Promise<any> {
    // Try cache first
    const cached = await this.cache.get(`${table}:${id}`);
    if (cached) return JSON.parse(cached);

    // If not in cache, get from database
    const { data, error } = await this.supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Cache the result
    await this.cache.set(`${table}:${id}`, JSON.stringify(data));

    return data;
  }

  public async getMany(table: string, query?: any): Promise<any[]> {
    let supabaseQuery = this.supabase.from(table).select('*');

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          supabaseQuery = supabaseQuery.in(key, value);
        } else {
          supabaseQuery = supabaseQuery.eq(key, value);
        }
      });
    }

    const { data, error } = await supabaseQuery;

    if (error) throw error;
    return data;
  }

  public async create(table: string, data: any): Promise<any> {
    const { data: result, error } = await this.supabase
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;

    // Cache the result
    await this.cache.set(`${table}:${result.id}`, JSON.stringify(result));

    return result;
  }

  public async update(table: string, id: string, data: any): Promise<any> {
    const { data: result, error } = await this.supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update cache
    await this.cache.set(`${table}:${id}`, JSON.stringify(result));

    return result;
  }

  public async delete(table: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Remove from cache
    await this.cache.del(`${table}:${id}`);
  }

  public async query(table: string, queryFn: (query: any) => any): Promise<any[]> {
    const baseQuery = this.supabase.from(table).select('*');
    const { data, error } = await queryFn(baseQuery);

    if (error) throw error;
    return data;
  }
}

export const dataService = new DataService(); 