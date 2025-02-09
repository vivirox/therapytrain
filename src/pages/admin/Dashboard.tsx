import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import UserManagement from '@/components/admin/UserManagement';
import SecuritySettings from '@/components/admin/SecuritySettings';
import Analytics from '@/components/admin/Analytics';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MdPeople,
  MdSecurity,
  MdInsights,
  MdSettings,
  MdMenu,
} from 'react-icons/md';

type Tab = 'users' | 'security' | 'analytics' | 'settings';

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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Mobile Menu Button */}
      <div className="lg:hidden p-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <MdMenu className="w-6 h-6" />
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-50
            w-64 bg-gray-800 transform transition-transform duration-200 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="p-6">
            <h1 className="text-xl font-bold mb-8">Admin Dashboard</h1>
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? 'default' : 'ghost'}
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  {item.icon}
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          <div className="p-4">
            <Card className="bg-gray-800 border-gray-700">
              {activeComponent}
            </Card>
          </div>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard; 