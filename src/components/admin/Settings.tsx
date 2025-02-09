import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseclient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Error } from '@/components/ui/error';
import { Loading } from '@/components/ui/loading';
import {
  MdSettings,
  MdNotifications,
  MdBackup,
  MdIntegration,
  MdEmail,
} from 'react-icons/md';

interface SystemSettings {
  maintenance_mode: boolean;
  debug_mode: boolean;
  analytics_enabled: boolean;
  backup_frequency: number;
  backup_retention_days: number;
  notification_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  integration_api_url: string;
  max_upload_size: number;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    maintenance_mode: false,
    debug_mode: false,
    analytics_enabled: true,
    backup_frequency: 24,
    backup_retention_days: 30,
    notification_email: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: true,
    integration_api_url: '',
    max_upload_size: 10,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (error) throw error;
      if (data) setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    try {
      setSaveStatus('saving');
      const { error } = await supabase
        .from('system_settings')
        .upsert(settings);

      if (error) throw error;
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      setSaveStatus('error');
    }
  };

  if (loading) {
    return <Loading variant="card" text="Loading settings..." />;
  }

  return (
    <div className="p-8 space-y-8">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <MdSettings className="w-6 h-6" />
            System Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Error
              message={error}
              className="mb-6"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </Button>
              }
            />
          )}

          <Tabs defaultValue="general" className="space-y-6">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="backup">Backup</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <div className="grid gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-gray-500">
                      Enable maintenance mode to prevent user access during updates
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenance_mode}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, maintenance_mode: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Debug Mode</Label>
                    <p className="text-sm text-gray-500">
                      Enable detailed logging for troubleshooting
                    </p>
                  </div>
                  <Switch
                    checked={settings.debug_mode}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, debug_mode: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analytics</Label>
                    <p className="text-sm text-gray-500">
                      Collect anonymous usage data to improve the system
                    </p>
                  </div>
                  <Switch
                    checked={settings.analytics_enabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, analytics_enabled: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Maximum Upload Size (MB)</Label>
                  <Input
                    type="number"
                    value={settings.max_upload_size}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        max_upload_size: parseInt(e.target.value),
                      })
                    }
                    min={1}
                    max={100}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="backup" className="space-y-6">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label>Backup Frequency (hours)</Label>
                  <Input
                    type="number"
                    value={settings.backup_frequency}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        backup_frequency: parseInt(e.target.value),
                      })
                    }
                    min={1}
                    max={168}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Backup Retention (days)</Label>
                  <Input
                    type="number"
                    value={settings.backup_retention_days}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        backup_retention_days: parseInt(e.target.value),
                      })
                    }
                    min={1}
                    max={365}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label>Notification Email</Label>
                  <Input
                    type="email"
                    value={settings.notification_email}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notification_email: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input
                    value={settings.smtp_host}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        smtp_host: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input
                    type="number"
                    value={settings.smtp_port}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        smtp_port: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>SMTP Secure</Label>
                  <Switch
                    checked={settings.smtp_secure}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, smtp_secure: checked })
                    }
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="integrations" className="space-y-6">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label>Integration API URL</Label>
                  <Input
                    value={settings.integration_api_url}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        integration_api_url: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex items-center justify-end gap-4">
            <Button
              variant="outline"
              onClick={fetchSettings}
              disabled={saveStatus === 'saving'}
            >
              Reset
            </Button>
            <Button
              onClick={updateSettings}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? (
                <Loading variant="spinner" size="sm" />
              ) : saveStatus === 'success' ? (
                'Saved!'
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings; 