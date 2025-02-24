import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MdPeople, MdSettings, MdSecurity, MdAnalytics } from 'react-icons/md';
import { MetricsDashboard } from '../metricsdashboard';

interface AdminSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType;
  path: string;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Admin sections following PocketBase's organization
  const adminSections: Array<AdminSection> = [
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: MdPeople,
      path: '/admin/Dashboard',
    },
    {
      id: 'security',
      title: 'Security Settings',
      description: 'Configure security policies and audit logs',
      icon: MdSecurity,
      path: '/admin/Dashboard',
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'View system analytics and metrics',
      icon: MdAnalytics,
      path: '/admin/Dashboard',
    },
    {
      id: 'settings',
      title: 'System Settings',
      description: 'Configure system-wide settings',
      icon: MdSettings,
      path: '/admin/Dashboard',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">
            Welcome back, {user?.email?.split('@')[0] || 'Admin'}
          </p>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricsDashboard />
        </div>

        {/* Admin Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {adminSections.map((section) => (
            <Card key={section.id} className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-center gap-4">
                  {React.createElement(section.icon, {
                    className: 'w-8 h-8 text-blue-500',
                    style: { width: '2rem', height: '2rem' }
                  } as React.SVGProps<SVGSVGElement>)}
                  <div>
                    <CardTitle className="text-xl">{section.title}</CardTitle>
                    <p className="text-gray-400">{section.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate(section.path)}
                  variant="outline"
                  className="w-full border-white/10 hover:bg-white/10"
                >
                  Manage
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Security Audit */}
        {/*<Card className="bg-white/5 border-white/10">*/}
        {/*<CardHeader>*/}
        {/*<CardTitle className="text-xl">Security Audit Log</CardTitle>*/}
        {/*</CardHeader>*/}
        {/*<CardContent>*/}
        {/*<AuditDashboard />*/}
        {/*</CardContent>*/}
        {/*</Card>*/}
      </div>
    </div>
  );
};

export default AdminDashboard;
