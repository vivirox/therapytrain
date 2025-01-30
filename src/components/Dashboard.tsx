import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

export const Dashboard = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-2">Welcome to Your Dashboard</h2>
            <p className="text-gray-600">
              This is your personalized dashboard. Start adding your content here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;