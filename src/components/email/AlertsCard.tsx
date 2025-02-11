import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert as AlertUI, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  MdWarning,
  MdError,
  MdInfo,
  MdCheckCircle,
  MdClose,
} from 'react-icons/md';
import { AlertService, Alert, AlertSeverity } from '@/lib/email/alert-service';

interface AlertsCardProps {
  sender?: string;
  onAlertChange?: () => void;
}

export const AlertsCard: React.FC<AlertsCardProps> = ({
  sender,
  onAlertChange,
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, [sender]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const activeAlerts = await AlertService.getActiveAlerts(sender);
      setAlerts(activeAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await AlertService.acknowledgeAlert(alertId);
      await fetchAlerts();
      onAlertChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await AlertService.resolveAlert(alertId);
      await fetchAlerts();
      onAlertChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve alert');
    }
  };

  const getAlertIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return <MdError className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <MdWarning className="h-5 w-5 text-yellow-500" />;
      default:
        return <MdInfo className="h-5 w-5 text-blue-500" />;
    }
  };

  const getAlertVariant = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <span>Alerts</span>
          {alerts.length > 0 && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/10 text-red-500">
              {alerts.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <AlertUI variant="destructive">
            <MdError className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </AlertUI>
        )}

        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <MdCheckCircle className="h-8 w-8 mb-2" />
            <p>No active alerts</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertUI
              key={alert.id}
              variant={getAlertVariant(alert.severity)}
              className="relative"
            >
              <div className="flex items-start gap-2">
                {getAlertIcon(alert.severity)}
                <div className="flex-1">
                  <AlertTitle>{alert.message}</AlertTitle>
                  <AlertDescription>
                    <div className="text-sm mt-1">
                      Created: {new Date(alert.created_at).toLocaleString()}
                    </div>
                    {alert.acknowledged_at && (
                      <div className="text-sm">
                        Acknowledged: {new Date(alert.acknowledged_at).toLocaleString()}
                      </div>
                    )}
                  </AlertDescription>
                </div>
                <div className="flex gap-2">
                  {!alert.acknowledged_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledge(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolve(alert.id)}
                  >
                    <MdClose className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </AlertUI>
          ))
        )}
      </CardContent>
    </Card>
  );
}; 