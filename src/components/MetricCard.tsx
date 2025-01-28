import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface MetricCardProps {
  title: string;
  value: number;
  color: string;
}

const MetricCard = ({ title, value, color }: MetricCardProps) => {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" style={{ color }}>
          {value}%
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;