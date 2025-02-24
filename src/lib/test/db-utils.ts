import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import { Logger } from '@/lib/logger';

const logger = new Logger('db-utils');

// Initialize test client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_TEST_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_TEST_ANON_KEY!
);

// Types
interface TestUser {
  id: string;
  email: string;
  encrypted_password: string;
  created_at: string;
  updated_at: string;
}

interface TestMessage {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  iv: string;
  role: string;
  created_at: string;
  sender_public_key: string;
}

interface TestThread {
  id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

interface TestProfile {
  id: string;
  user_id: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Table names
const TABLES = {
  USERS: 'users',
  MESSAGES: 'messages',
  THREADS: 'threads',
  PROFILES: 'profiles',
  SESSIONS: 'sessions',
  AUDIT_LOGS: 'audit_logs',
};

/**
 * Cleans up test data from all tables
 */
export async function cleanupTestData() {
  try {
    const tables = Object.values(TABLES);
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', 'system'); // Preserve system records
        
      if (error) {
        throw error;
      }
    }
  } catch (error) {
    logger.error('Failed to clean up test data', error as Error);
    throw error;
  }
}

/**
 * Creates a test user with associated profile
 */
export async function createTestUser(email?: string): Promise<TestUser> {
  try {
    const testEmail = email || `test-${nanoid()}@example.com`;
    const password = 'Test123!@#';
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password,
    });
    
    if (authError || !authData.user) {
      throw authError || new Error('Failed to create test user');
    }
    
    // Create profile
    const { error: profileError } = await supabase
      .from(TABLES.PROFILES)
      .insert({
        id: authData.user.id,
        email: testEmail,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
    if (profileError) {
      throw profileError;
    }
    
    return {
      id: authData.user.id,
      email: testEmail,
      encrypted_password: password, // Note: This is just for testing
      created_at: authData.user.created_at,
      updated_at: authData.user.updated_at,
    };
  } catch (error) {
    logger.error('Failed to create test user', error as Error);
    throw error;
  }
}

/**
 * Creates a test thread with optional initial message
 */
export async function createTestThread(
  userId: string,
  initialMessage?: string
): Promise<TestThread> {
  try {
    // Create thread
    const { data: thread, error: threadError } = await supabase
      .from(TABLES.THREADS)
      .insert({
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {},
      })
      .select()
      .single();
      
    if (threadError || !thread) {
      throw threadError || new Error('Failed to create test thread');
    }
    
    // Add initial message if provided
    if (initialMessage) {
      const { error: messageError } = await supabase
        .from(TABLES.MESSAGES)
        .insert({
          thread_id: thread.id,
          user_id: userId,
          content: initialMessage,
          iv: nanoid(),
          role: 'user',
          created_at: new Date().toISOString(),
          sender_public_key: nanoid(),
        });
        
      if (messageError) {
        throw messageError;
      }
    }
    
    return thread;
  } catch (error) {
    logger.error('Failed to create test thread', error as Error);
    throw error;
  }
}

/**
 * Creates a test message in a thread
 */
export async function createTestMessage(
  threadId: string,
  userId: string,
  content: string,
  role: string = 'user'
): Promise<TestMessage> {
  try {
    const { data: message, error } = await supabase
      .from(TABLES.MESSAGES)
      .insert({
        thread_id: threadId,
        user_id: userId,
        content,
        iv: nanoid(),
        role,
        created_at: new Date().toISOString(),
        sender_public_key: nanoid(),
      })
      .select()
      .single();
      
    if (error || !message) {
      throw error || new Error('Failed to create test message');
    }
    
    return message;
  } catch (error) {
    logger.error('Failed to create test message', error as Error);
    throw error;
  }
}

/**
 * Wraps a test in a transaction
 */
export async function withTransaction<T>(
  callback: () => Promise<T>
): Promise<T> {
  try {
    await supabase.rpc('begin_transaction');
    const result = await callback();
    await supabase.rpc('commit_transaction');
    return result;
  } catch (error) {
    await supabase.rpc('rollback_transaction');
    throw error;
  }
}

/**
 * Verifies data integrity constraints
 */
export async function verifyDataIntegrity(
  table: string,
  id: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      throw error;
    }
    
    return !!data;
  } catch (error) {
    logger.error('Failed to verify data integrity', error as Error);
    throw error;
  }
}

/**
 * Gets all test data for a table
 */
export async function getTestData(table: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    logger.error('Failed to get test data', error as Error);
    throw error;
  }
}

/**
 * Creates a test profile with optional customization
 */
export async function createTestProfile(
  userId: string,
  customData: Partial<TestProfile> = {}
): Promise<TestProfile> {
  try {
    const defaultProfile = {
      id: userId, // Profile ID matches user ID
      user_id: userId,
      display_name: `Test User ${nanoid(6)}`,
      bio: 'Test user bio',
      avatar_url: null,
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const profileData = { ...defaultProfile, ...customData };

    const { data: profile, error } = await supabase
      .from(TABLES.PROFILES)
      .upsert(profileData)
      .select()
      .single();

    if (error || !profile) {
      throw error || new Error('Failed to create test profile');
    }

    return profile;
  } catch (error) {
    logger.error('Failed to create test profile', error as Error);
    throw error;
  }
}

/**
 * Updates a test profile
 */
export async function updateTestProfile(
  userId: string,
  updates: Partial<TestProfile>
): Promise<TestProfile> {
  try {
    const { data: profile, error } = await supabase
      .from(TABLES.PROFILES)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error || !profile) {
      throw error || new Error('Failed to update test profile');
    }

    return profile;
  } catch (error) {
    logger.error('Failed to update test profile', error as Error);
    throw error;
  }
}

/**
 * Enhanced transaction wrapper with retry and timeout
 */
export async function withTransactionRetry<T>(
  callback: () => Promise<T>,
  options: {
    maxRetries?: number;
    timeoutMs?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, timeoutMs = 5000, onRetry } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Transaction timeout after ${timeoutMs}ms`)), timeoutMs);
      });

      const result = await Promise.race([
        withTransaction(callback),
        timeoutPromise
      ]);

      return result as T;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        onRetry?.(lastError, attempt);
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100)); // Exponential backoff
      }
    }
  }

  throw lastError;
}

/**
 * Bulk test data creation utility
 */
export async function createBulkTestData<T extends keyof typeof TABLES>(
  table: T,
  count: number,
  template: Partial<any> = {},
  options: {
    transaction?: boolean;
    batchSize?: number;
  } = {}
): Promise<any[]> {
  const { transaction = true, batchSize = 50 } = options;

  const createBatch = async (size: number): Promise<any[]> => {
    const items = Array.from({ length: size }, () => ({
      ...template,
      id: nanoid(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from(TABLES[table])
      .insert(items)
      .select();

    if (error) throw error;
    return data;
  };

  const execute = async () => {
    const results: any[] = [];
    for (let i = 0; i < count; i += batchSize) {
      const batchCount = Math.min(batchSize, count - i);
      const batchResults = await createBatch(batchCount);
      results.push(...batchResults);
    }
    return results;
  };

  if (transaction) {
    return await withTransactionRetry(execute);
  }

  return await execute();
}

/**
 * Verify referential integrity
 */
export async function verifyReferentialIntegrity(
  table: string,
  id: string,
  relations: Array<{ table: string; foreignKey: string }>
): Promise<boolean> {
  try {
    // Check main record
    const recordExists = await verifyDataIntegrity(table, id);
    if (!recordExists) return false;

    // Check related records
    for (const relation of relations) {
      const { data, error } = await supabase
        .from(relation.table)
        .select('id')
        .eq(relation.foreignKey, id)
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) return false;
    }

    return true;
  } catch (error) {
    logger.error('Failed to verify referential integrity', error as Error);
    throw error;
  }
}

export { TABLES }; 