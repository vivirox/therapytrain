import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import UserManagement from '@/components/admin/UserManagement';
import SecuritySettings from '@/components/admin/SecuritySettings';
import Analytics from '@/components/admin/Analytics';
import EmailAnalyticsDashboard from '@/components/email/EmailAnalyticsDashboard';
import { HipaaMonitoringDashboard } from '@/components/compliance/HipaaMonitoringDashboard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MdPeople,
  MdSecurity,
  MdInsights,
  MdSettings,
  MdMenu,
  MdOutlineEmail,
  MdHealthAndSafety,
} from 'react-icons/md';

type Tab = 'users' | 'security' | 'analytics' | 'settings' | 'email' | 'hipaa';

interface NavItem {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const AdminDashboard: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  const navItems: NavItem[] = [
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <MdInsights className="w-5 h-5" />,
      component: <Analytics />,
    },
    {
      id: 'email',
      label: 'Email Analytics',
      icon: <MdOutlineEmail className="w-5 h-5" />,
      component: <EmailAnalyticsDashboard />,
    },
    {
      id: 'hipaa',
      label: 'HIPAA Monitoring',
      icon: <MdHealthAndSafety className="w-5 h-5" />,
      component: <HipaaMonitoringDashboard />,
    },
    {
      id: 'users',
      label: 'User Management',
      icon: <MdPeople className="w-5 h-5" />,
      component: <UserManagement />,
    },
    {
      id: 'security',
      label: 'Security',
      icon: <MdSecurity className="w-5 h-5" />,
      component: <SecuritySettings />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <MdSettings className="w-5 h-5" />,
      component: <div>Settings Component (Coming Soon)</div>,
    },
  ];

  const activeComponent = navItems.find((item) => item.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Mobile Menu Button */}
      <div className="md:hidden p-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <MdMenu className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <nav
          className={`
            md:w-64 bg-gray-900 p-4
            ${isMobileMenuOpen ? 'block' : 'hidden'}
            md:block
          `}
        >
          <div className="space-y-2">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </Button>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-4">
          {activeComponent}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard; 