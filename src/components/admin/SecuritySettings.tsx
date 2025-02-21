import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MdSecurity, MdWarning, MdInfo } from 'react-icons/md';

interface SecuritySettings {
  mfa_enabled: boolean;
  password_min_length: number;
  password_require_special: boolean;
  password_require_numbers: boolean;
  max_login_attempts: number;
  lockout_duration: number;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user_id: string;
  event_type: string;
  description: string;
  ip_address: string;
  severity: 'info' | 'warning' | 'error';
}

const SecuritySettings: React.FC = () => {
  const [settings, setSettings] = useState<SecuritySettings>({
    mfa_enabled: false,
    password_min_length: 8,
    password_require_special: true,
    password_require_numbers: true,
    max_login_attempts: 5,
    lockout_duration: 30,
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSecuritySettings();
    fetchAuditLogs();
  }, []);

  const fetchSecuritySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('security_settings')
        .select('*')
        .single();

      if (error) throw error;
      if (data) setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch security settings');
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (data) setAuditLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const updateSecuritySettings = async () => {
    try {
      const { error } = await supabase
        .from('security_settings')
        .upsert(settings);

      if (error) throw error;
      setError('Security settings updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update security settings');
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <MdWarning className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <MdWarning className="w-5 h-5 text-yellow-500" />;
      default:
        return <MdInfo className="w-5 h-5 text-blue-500" />;
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <MdSecurity className="w-6 h-6" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded mb-4">
              {error}
            </div>
          )}

          <div className="grid gap-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="mfa_enabled">Multi-Factor Authentication</Label>
              <Switch
                id="mfa_enabled"
                checked={settings.mfa_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, mfa_enabled: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password_min_length">Minimum Password Length</Label>
              <Input
                id="password_min_length"
                type="number"
                value={settings.password_min_length}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    password_min_length: parseInt(e.target.value),
                  })
                }
                min={8}
                max={32}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="password_require_special">
                Require Special Characters
              </Label>
              <Switch
                id="password_require_special"
                checked={settings.password_require_special}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, password_require_special: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="password_require_numbers">Require Numbers</Label>
              <Switch
                id="password_require_numbers"
                checked={settings.password_require_numbers}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, password_require_numbers: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_login_attempts">Max Login Attempts</Label>
              <Input
                id="max_login_attempts"
                type="number"
                value={settings.max_login_attempts}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_login_attempts: parseInt(e.target.value),
                  })
                }
                min={1}
                max={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lockout_duration">
                Account Lockout Duration (minutes)
              </Label>
              <Input
                id="lockout_duration"
                type="number"
                value={settings.lockout_duration}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lockout_duration: parseInt(e.target.value),
                  })
                }
                min={5}
                max={1440}
              />
            </div>

            <Button onClick={updateSecuritySettings}>Save Settings</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-xl">Security Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>{log.event_type}</TableCell>
                  <TableCell>{log.description}</TableCell>
                  <TableCell>{log.ip_address}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(log.severity)}
                      <span className="capitalize">{log.severity}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings; 