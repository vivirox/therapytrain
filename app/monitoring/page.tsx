import { Suspense } from 'react';
import { CacheDashboard } from '@/components/monitoring/CacheDashboard';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'Cache Monitoring | TherapyTrain',
  description: 'Monitor cache performance and health',
};

export default function MonitoringPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor system performance and health metrics
          </p>
        </div>

        <div className="grid gap-6">
          <Card className="p-6">
            <Suspense fallback={<div>Loading cache metrics...</div>}>
              <CacheDashboard />
            </Suspense>
          </Card>
        </div>
      </div>
    </div>
  );
} 