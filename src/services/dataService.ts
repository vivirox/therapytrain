// This service acts as a data layer abstraction
// Currently using MongoDB through API for development

import { Types } from 'mongoose';
import { api } from './api';

export interface StorageItem<T> {
  _id: Types.ObjectId;
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

  public async create<T>(collection: string, data: T): Promise<StorageItem<T>> {
    const response = await api.data.create(collection, data);
    return response;
  }

  public async get<T>(collection: string, id: string): Promise<StorageItem<T> | null> {
    const response = await api.data.get(collection, id);
    return response;
  }

  public async update<T>(collection: string, id: string, data: Partial<T>): Promise<StorageItem<T> | null> {
    const response = await api.data.update(collection, id, data);
    return response;
  }

  public async delete(collection: string, id: string): Promise<void> {
    await api.data.delete(collection, id);
  }

  public async list<T>(collection: string, query: Record<string, any> = {}): Promise<StorageItem<T>[]> {
    const response = await api.data.list(collection, query);
    return response;
  }

  public async findOne<T>(collection: string, query: Record<string, any>): Promise<StorageItem<T> | null> {
    const response = await api.data.findOne(collection, query);
    return response;
  }

  public async query<T>(
    collection: string,
    predicate: (item: StorageItem<T>) => boolean
  ): Promise<StorageItem<T>[]> {
    const items = await this.list<T>(collection);
    return items.filter(predicate);
  }
}

export const dataService = DataService.getInstance();
