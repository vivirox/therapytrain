import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  MdWarning,
  MdError,
  MdCheckCircle,
  MdLock,
  MdSecurity,
  MdShield,
  MdRefresh,
} from 'react-icons/md';
import { supabase } from '@/lib/supabaseClient';
import { HipaaMonitoringService } from '@/lib/compliance/hipaa-monitoring';

interface ViolationMetrics {
  day: string;
  type: string;
  counts: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

interface ActiveIncident {
  id: string;
  type: string;
  severity: string;
  description: string;
  created_at: string;
  status: string;
  remediation_steps?: string[];
}

export const HipaaMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ViolationMetrics[]>([]);
  const [activeIncidents, setActiveIncidents] = useState<ActiveIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    fetchData();
    initializeMonitoring();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const initializeMonitoring = async () => {
    try {
      const sub = await HipaaMonitoringService.startMonitoring();
      setSubscription(sub);
    } catch (err) {
      console.error('Failed to initialize monitoring:', err);
      setError('Failed to initialize real-time monitoring');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch violation metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('violation_metrics')
        .select('*')
        .order('day', { ascending: false })
        .limit(30);

      if (metricsError) throw metricsError;
      setMetrics(metricsData || []);

      // Fetch active incidents
      const { data: incidentsData, error: incidentsError } = await supabase
        .from('breach_incidents')
        .select('*')
        .in('status', ['initiated', 'investigating'])
        .order('created_at', { ascending: false });

      if (incidentsError) throw incidentsError;
      setActiveIncidents(incidentsData || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData();
  };

  const SEVERITY_COLORS = {
    low: '#22c55e',
    medium: '#eab308',
    high: '#f97316',
    critical: '#ef4444',
  };

  const renderViolationTrends = () => {
    const data = metrics.map(m => ({
      date: new Date(m.day).toLocaleDateString(),
      critical: m.counts.critical,
      high: m.counts.high,
      medium: m.counts.medium,
      low: m.counts.low,
    }));

    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Violation Trends</CardTitle>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
          >
            <MdRefresh className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="critical"
                  stroke={SEVERITY_COLORS.critical}
                  name="Critical"
                />
                <Line
                  type="monotone"
                  dataKey="high"
                  stroke={SEVERITY_COLORS.high}
                  name="High"
                />
                <Line
                  type="monotone"
                  dataKey="medium"
                  stroke={SEVERITY_COLORS.medium}
                  name="Medium"
                />
                <Line
                  type="monotone"
                  dataKey="low"
                  stroke={SEVERITY_COLORS.low}
                  name="Low"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderActiveIncidents = () => {
    if (activeIncidents.length === 0) {
      return (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Active Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <MdCheckCircle className="h-8 w-8 mb-2" />
              <p>No active incidents</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Active Incidents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeIncidents.map((incident) => (
            <Alert
              key={incident.id}
              variant={incident.severity as any}
              className="relative"
            >
              <div className="flex items-start gap-2">
                {incident.severity === 'critical' ? (
                  <MdError className="h-5 w-5" />
                ) : (
                  <MdWarning className="h-5 w-5" />
                )}
                <div className="flex-1">
                  <AlertTitle>{incident.description}</AlertTitle>
                  <AlertDescription>
                    <div className="text-sm mt-1">
                      Status: {incident.status}
                      <br />
                      Created: {new Date(incident.created_at).toLocaleString()}
                    </div>
                    {incident.remediation_steps && (
                      <div className="mt-2">
                        <div className="font-medium">Remediation Steps:</div>
                        <ul className="list-disc list-inside text-sm">
                          {incident.remediation_steps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ))}
        </CardContent>
      </Card>
    );
  };

  const renderMetricCards = () => {
    const totalViolations = metrics.reduce((acc, m) => (
      acc + m.counts.low + m.counts.medium + m.counts.high + m.counts.critical
    ), 0);

    const criticalViolations = metrics.reduce((acc, m) => acc + m.counts.critical, 0);
    const highViolations = metrics.reduce((acc, m) => acc + m.counts.high, 0);

    const cards = [
      {
        title: 'Total Violations',
        value: totalViolations,
        icon: <MdShield className="h-6 w-6" />,
      },
      {
        title: 'Critical Violations',
        value: criticalViolations,
        icon: <MdError className="h-6 w-6 text-red-500" />,
      },
      {
        title: 'High Severity',
        value: highViolations,
        icon: <MdWarning className="h-6 w-6 text-orange-500" />,
      },
      {
        title: 'Active Incidents',
        value: activeIncidents.length,
        icon: <MdSecurity className="h-6 w-6" />,
      },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <Card key={index} className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {error && (
        <Alert variant="destructive">
          <MdError className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {renderMetricCards()}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {renderViolationTrends()}
        {renderActiveIncidents()}
      </div>
    </div>
  );
}; 