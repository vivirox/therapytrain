import { supabase } from '../lib/supabase';

export interface StorageItem<T> {
  id: string; // Use string for Supabase IDs
  data: T;
  createdAt: Date;
  updatedAt: Date;
}

class DataService {
  private static instance: DataService;

  private constructor() {}

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  public async create<T>(table: string, data: T): Promise<StorageItem<T>> {
    const { data: createdData, error } = await supabase.from(table).insert(data);
    if (error) throw new Error(error.message);
    if (!createdData || createdData.length === 0) throw new Error("No data returned");
    return createdData[0]; // Return the first created item
  }

  public async get<T>(table: string, id: string): Promise<StorageItem<T> | null> {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return data;
  }

  public async update<T>(table: string, id: string, data: Partial<T>): Promise<StorageItem<T> | null> {
    const { data: updatedData, error } = await supabase.from(table).update(data).eq('id', id);
    if (error) throw new Error(error.message);
    if (!updatedData || updatedData.length === 0) throw new Error("No data returned");
    return updatedData[0]; // Return the first updated item
  }

  public async delete(table: string, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  public async list<T>(table: string, query: Record<string, any> = {}): Promise<StorageItem<T>[]> {
    const { data, error } = await supabase.from(table).select('*').match(query);
    if (error) throw new Error(error.message);
    return data;
  }

  public async findOne<T>(table: string, query: Record<string, any>): Promise<StorageItem<T> | null> {
    const { data, error } = await supabase.from(table).select('*').match(query).single();
    if (error) throw new Error(error.message);
    return data;
  }

  public async query<T>(
    table: string,
    predicate: (item: StorageItem<T>) => boolean
  ): Promise<StorageItem<T>[]> {
    const items = await this.list<T>(table);
    return items.filter(predicate);
  }
}

export const dataService = DataService.getInstance();
