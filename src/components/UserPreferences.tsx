'use client';

import { useTranslation } from 'next-i18next';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { UserPreferences as UserPreferencesType } from '../services/UserPreferenceService';
import { Button } from './ui/button';
import { Select } from './ui/select';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function UserPreferences() {
  const { t } = useTranslation();
  const { preferences, updatePreferences, loading, error } = useUserPreferences();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        {error.message}
      </div>
    );
  }

  const handleUpdate = async (updates: Partial<UserPreferencesType>) => {
    try {
      await updatePreferences(updates);
      toast.success(t('preferences.saved'));
    } catch (err) {
      toast.error(t('preferences.error'));
    }
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold">{t('preferences.title')}</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="font-medium">{t('preferences.language')}</label>
          <Select
            value={preferences?.language}
            onValueChange={(value) => handleUpdate({ language: value })}
            options={[
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Español' },
              { value: 'fr', label: 'Français' },
              { value: 'de', label: 'Deutsch' },
              { value: 'ja', label: '日本語' },
              { value: 'ko', label: '한국어' },
              { value: 'zh', label: '中文' }
            ]}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="font-medium">{t('preferences.theme')}</label>
          <Select
            value={preferences?.theme}
            onValueChange={(value) => handleUpdate({ theme: value })}
            options={[
              { value: 'light', label: t('preferences.themes.light') },
              { value: 'dark', label: t('preferences.themes.dark') },
              { value: 'system', label: t('preferences.themes.system') }
            ]}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="font-medium">{t('preferences.notifications')}</label>
          <Switch
            checked={preferences?.notifications}
            onCheckedChange={(checked) => handleUpdate({ notifications: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="font-medium">{t('preferences.timeFormat')}</label>
          <Select
            value={preferences?.timeFormat}
            onValueChange={(value) => handleUpdate({ timeFormat: value })}
            options={[
              { value: '12h', label: t('preferences.timeFormats.12h') },
              { value: '24h', label: t('preferences.timeFormats.24h') }
            ]}
          />
        </div>
      </div>
    </div>
  );
} 