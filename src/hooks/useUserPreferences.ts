import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { UserPreferences, UserPreferenceService } from '../services/UserPreferenceService';
import { Redis } from '@upstash/redis';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

// Initialize Redis client
const redis = new Redis({
  url: process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL!,
  token: process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN!,
});

export function useUserPreferences() {
  const { supabase, session } = useSupabase();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { i18n } = useTranslation();
  const router = useRouter();

  // Initialize UserPreferenceService
  const preferenceService = UserPreferenceService.getInstance(supabase, redis);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const prefs = await preferenceService.getPreferences(session.user.id);
      setPreferences(prefs);

      // Update language if different from current
      if (prefs.language && prefs.language !== i18n.language) {
        await i18n.changeLanguage(prefs.language);
        // Update URL locale
        const { pathname, asPath, query } = router;
        router.push({ pathname, query }, asPath, { locale: prefs.language });
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch preferences'));
      console.error('Error fetching preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, preferenceService, i18n, router]);

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!session?.user?.id || !preferences) return;

    try {
      setLoading(true);
      const updatedPrefs = await preferenceService.updatePreferences(session.user.id, updates);
      setPreferences(updatedPrefs);

      // Update language if it was changed
      if (updates.language && updates.language !== i18n.language) {
        await i18n.changeLanguage(updates.language);
        // Update URL locale
        const { pathname, asPath, query } = router;
        router.push({ pathname, query }, asPath, { locale: updates.language });
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update preferences'));
      console.error('Error updating preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, preferences, preferenceService, i18n, router]);

  // Subscribe to preference changes
  useEffect(() => {
    if (!session?.user?.id) return;

    const unsubscribe = preferenceService.subscribeToPreferenceChanges(
      session.user.id,
      (newPreferences) => {
        setPreferences(newPreferences);

        // Update language if different from current
        if (newPreferences.language && newPreferences.language !== i18n.language) {
          i18n.changeLanguage(newPreferences.language);
          // Update URL locale
          const { pathname, asPath, query } = router;
          router.push({ pathname, query }, asPath, { locale: newPreferences.language });
        }
      }
    );

    // Fetch initial preferences
    fetchPreferences();

    return () => {
      unsubscribe();
    };
  }, [session?.user?.id, preferenceService, fetchPreferences, i18n, router]);

  return {
    preferences,
    updatePreferences,
    loading,
    error,
  };
} 