// This service acts as a data layer abstraction
// Currently using localStorage for development, but can be replaced with any backend service

export interface StorageItem<T> {
  id: string;
  data: T;
  createdAt: string;
  updatedAt: string;
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

  private getStorageKey(collection: string, id?: string): string {
    return id ? `therapytrain_${collection}_${id}` : `therapytrain_${collection}`;
  }

  public async create<T>(collection: string, data: T): Promise<StorageItem<T>> {
    const id = crypto.randomUUID();
    const item: StorageItem<T> = {
      id,
      data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(this.getStorageKey(collection, id), JSON.stringify(item));
    
    // Update collection index
    const collectionIds = this.getCollectionIds(collection);
    collectionIds.push(id);
    localStorage.setItem(this.getStorageKey(collection), JSON.stringify(collectionIds));

    return item;
  }

  public async get<T>(collection: string, id: string): Promise<StorageItem<T> | null> {
    const item = localStorage.getItem(this.getStorageKey(collection, id));
    return item ? JSON.parse(item) : null;
  }

  public async update<T>(collection: string, id: string, data: Partial<T>): Promise<StorageItem<T> | null> {
    const item = await this.get<T>(collection, id);
    if (!item) return null;

    const updatedItem: StorageItem<T> = {
      ...item,
      data: { ...item.data, ...data },
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(this.getStorageKey(collection, id), JSON.stringify(updatedItem));
    return updatedItem;
  }

  public async delete(collection: string, id: string): Promise<void> {
    localStorage.removeItem(this.getStorageKey(collection, id));
    
    // Update collection index
    const collectionIds = this.getCollectionIds(collection);
    const updatedIds = collectionIds.filter(itemId => itemId !== id);
    localStorage.setItem(this.getStorageKey(collection), JSON.stringify(updatedIds));
  }

  public async list<T>(collection: string): Promise<StorageItem<T>[]> {
    const ids = this.getCollectionIds(collection);
    const items: StorageItem<T>[] = [];

    for (const id of ids) {
      const item = await this.get<T>(collection, id);
      if (item) items.push(item);
    }

    return items;
  }

  private getCollectionIds(collection: string): string[] {
    const idsString = localStorage.getItem(this.getStorageKey(collection));
    return idsString ? JSON.parse(idsString) : [];
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
