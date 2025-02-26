import React from "react";
import { MdDashboard, MdPeople, MdSettings } from "react-icons/md";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/errorboundary";
import { createClient } from "@/integrations/supabase/client";

interface DashboardMetrics {
  totalClients: number;
  activeProjects: number;
  completedProjects: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = React.useState<DashboardMetrics>({
    totalClients: 0,
    activeProjects: 0,
    completedProjects: 0,
  });

  React.useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const { data: clientData, error: clientError } = await createClient
        .from("client_profiles")
        .select("count");

      if (clientError) throw clientError;

      setMetrics({
        totalClients: clientData?.length > 0 ? clientData[0].count : 0,
        activeProjects: 0, // TODO: Implement when projects table is ready
        completedProjects: 0, // TODO: Implement when projects table is ready
      });
    } catch (error) {
      console.error("Error loading metrics:", error);
    }
  };

  return (
    <ErrorBoundary>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <MdPeople className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <h2 className="text-2xl font-bold">{metrics.totalClients}</h2>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <MdDashboard className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Active Projects</p>
                <h2 className="text-2xl font-bold">{metrics.activeProjects}</h2>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <MdSettings className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Completed Projects
                </p>
                <h2 className="text-2xl font-bold">
                  {metrics.completedProjects}
                </h2>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add more dashboard widgets here as needed */}
        </div>
      </div>
    </ErrorBoundary>
  );
}
