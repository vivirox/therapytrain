import { describe, it, expect, beforeEach } from 'vitest';
import {
  cleanupTestData,
  createTestUser,
  createTestProfile,
  updateTestProfile,
  withTransaction,
  verifyDataIntegrity,
  TABLES,
} from '../db-utils';
import { createClient } from '@supabase/supabase-js';

// Replace auth-helpers-nextjs with direct client creation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

describe('User Profile Integration Tests', () => {
  let testUser: any;

  // Setup test environment
  beforeEach(async () => {
    testUser = await createTestUser();
    await cleanupTestData();
  });

  describe('Profile Creation', () => {
    it('should create profile with default values', async () => {
      await withTransaction(async () => {
        const profile = await createTestProfile(testUser.id);

        expect(profile).toBeDefined();
        expect(profile.id).toBe(testUser.id);
        expect(profile.display_name).toMatch(/^Test User /);
        expect(profile.preferences).toEqual({
          theme: 'light',
          notifications: true,
          language: 'en',
        });

        // Verify data integrity
        const exists = await verifyDataIntegrity(TABLES.PROFILES, profile.id);
        expect(exists).toBe(true);
      });
    });

    it('should create profile with custom data', async () => {
      await withTransaction(async () => {
        const customData = {
          display_name: 'Custom Name',
          bio: 'Custom bio',
          avatar_url: 'https://example.com/avatar.jpg',
          preferences: {
            theme: 'dark',
            notifications: false,
            language: 'es',
          },
        };

        const profile = await createTestProfile(testUser.id, customData);

        expect(profile).toBeDefined();
        expect(profile.display_name).toBe(customData.display_name);
        expect(profile.bio).toBe(customData.bio);
        expect(profile.avatar_url).toBe(customData.avatar_url);
        expect(profile.preferences).toEqual(customData.preferences);
      });
    });

    it('should enforce unique user_id constraint', async () => {
      await withTransaction(async () => {
        // Create first profile
        await createTestProfile(testUser.id);

        // Attempt to create duplicate profile
        const { error } = await supabase
          .from(TABLES.PROFILES)
          .insert({
            user_id: testUser.id,
            display_name: 'Duplicate Profile',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        expect(error).toBeDefined();
        expect((error as any).code).toBe('23505'); // Unique violation
      });
    });
  });

  describe('Profile Retrieval', () => {
    it('should retrieve profile by user ID', async () => {
      await withTransaction(async () => {
        const createdProfile = await createTestProfile(testUser.id);

        const { data: profile, error } = await supabase
          .from(TABLES.PROFILES)
          .select('*')
          .eq('user_id', testUser.id)
          .single();

        expect(error).toBeNull();
        expect(profile).toBeDefined();
        expect(profile.id).toBe(createdProfile.id);
        expect(profile.display_name).toBe(createdProfile.display_name);
      });
    });

    it('should retrieve profile with related data', async () => {
      await withTransaction(async () => {
        const profile = await createTestProfile(testUser.id);

        const { data: profileWithUser, error } = await supabase
          .from(TABLES.PROFILES)
          .select(`
            *,
            user:users!inner(*)
          `)
          .eq('id', profile.id)
          .single();

        expect(error).toBeNull();
        expect(profileWithUser).toBeDefined();
        expect(profileWithUser.user.id).toBe(testUser.id);
        expect(profileWithUser.user.email).toBe(testUser.email);
      });
    });
  });

  describe('Profile Updates', () => {
    it('should update profile fields', async () => {
      await withTransaction(async () => {
        // Create initial profile
        const profile = await createTestProfile(testUser.id);

        // Update profile
        const updates = {
          display_name: 'Updated Name',
          bio: 'Updated bio',
          avatar_url: 'https://example.com/new-avatar.jpg',
        };

        const updatedProfile = await updateTestProfile(testUser.id, updates);

        expect(updatedProfile.display_name).toBe(updates.display_name);
        expect(updatedProfile.bio).toBe(updates.bio);
        expect(updatedProfile.avatar_url).toBe(updates.avatar_url);
        expect(new Date(updatedProfile.updated_at).getTime())
          .toBeGreaterThan(new Date(profile.updated_at).getTime());
      });
    });

    it('should update profile preferences', async () => {
      await withTransaction(async () => {
        // Create initial profile
        await createTestProfile(testUser.id);

        // Update preferences
        const newPreferences = {
          theme: 'dark',
          notifications: false,
          language: 'fr',
          customSetting: 'value',
        };

        const updatedProfile = await updateTestProfile(testUser.id, {
          preferences: newPreferences,
        });

        expect(updatedProfile.preferences).toEqual(newPreferences);
      });
    });

    it('should handle partial preference updates', async () => {
      await withTransaction(async () => {
        // Create initial profile
        const profile = await createTestProfile(testUser.id);
        const initialPreferences = profile.preferences;

        // Update only some preferences
        const partialUpdate = {
          theme: 'dark',
          newSetting: 'value',
        };

        const updatedProfile = await updateTestProfile(testUser.id, {
          preferences: {
            ...initialPreferences,
            ...partialUpdate,
          },
        });

        expect(updatedProfile.preferences).toEqual({
          ...initialPreferences,
          ...partialUpdate,
        });
      });
    });
  });

  describe('Profile Deletion', () => {
    it('should delete profile', async () => {
      await withTransaction(async () => {
        // Create profile
        const profile = await createTestProfile(testUser.id);

        // Delete profile
        const { error } = await supabase
          .from(TABLES.PROFILES)
          .delete()
          .eq('id', profile.id);

        expect(error).toBeNull();

        // Verify profile is deleted
        const exists = await verifyDataIntegrity(TABLES.PROFILES, profile.id);
        expect(exists).toBe(false);
      });
    });

    it('should cascade delete profile when user is deleted', async () => {
      await withTransaction(async () => {
        // Create profile
        const profile = await createTestProfile(testUser.id);

        // Delete user
        const { error } = await supabase.auth.admin.deleteUser(testUser.id);
        expect(error).toBeNull();

        // Verify profile is deleted
        const exists = await verifyDataIntegrity(TABLES.PROFILES, profile.id);
        expect(exists).toBe(false);
      });
    });
  });

  describe('Profile Validation', () => {
    it('should validate required fields', async () => {
      await withTransaction(async () => {
        const { error } = await supabase
          .from(TABLES.PROFILES)
          .insert({
            // Missing required user_id
            display_name: 'Test Profile',
          });

        expect(error).toBeDefined();
        expect((error as any).code).toBe('23502'); // Not null violation
      });
    });

    it('should validate preference schema', async () => {
      await withTransaction(async () => {
        // Create profile with invalid preferences
        const { error } = await supabase
          .from(TABLES.PROFILES)
          .insert({
            user_id: testUser.id,
            preferences: 'invalid', // Should be an object
          });

        expect(error).toBeDefined();
        expect((error as any).code).toBe('22023'); // Invalid parameter value
      });
    });

    it('should handle long text fields', async () => {
      await withTransaction(async () => {
        const longBio = 'a'.repeat(1000); // Assuming max length is less than this
        const { error } = await supabase
          .from(TABLES.PROFILES)
          .insert({
            user_id: testUser.id,
            bio: longBio,
          });

        expect(error).toBeDefined();
        expect((error as any).code).toBe('22001'); // String data right truncation
      });
    });
  });
}); 