import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/auth/AuthProvider";
import { MdChat, MdPsychology, MdSchool, MdGroup, MdMenuBook, MdDashboard, MdSettings, MdPeople } from "react-icons/md";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { supabase } from "../lib/supabase";
import { User } from '@supabase/supabase-js';
import { cn } from "../lib/utils";
import MetricCard from "../components/MetricCard";
import MonthlyChart from "../components/MonthlyChart";
import TherapyInsights from "../components/CustomerRequests";
import React from "react";
// Error Fallback Component
const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
    return (<div className="p-4 bg-red-50 text-red-800 rounded-md">
      <h2 className="text-lg font-semibold mb-2">Something went wrong:</h2>
      <pre className="text-sm">{error.message}</pre>
      <Button onClick={resetErrorBoundary} className="mt-4 bg-red-600 text-white hover:bg-red-700">
        Try again
      </Button>
    </div>);
};
interface Permission {
    id: string;
    permission_id: string;
    permission_name: string;
}
interface Organization {
    id: string;
    name: string;
    role: string;
}
interface FeatureFlag {
    id: string;
    key: string;
    value: any;
}
interface Feature {
    title: string;
    description: string;
    icon: React.ComponentType;
    path: string;
    metrics: Record<string, string | number | boolean>;
}
const Dashboard = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState<string>("overview");
    const [, setPermissions] = useState<Array<Permission>>([]);
    const [, setOrganizations] = useState<Array<Organization>>([]);
    const [, setFeatureFlags] = useState<Array<FeatureFlag>>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    useEffect(() => {
        const fetchData = async () => {
            if (!user) {
                return;
            }
            setLoading(true);
            setError(null);
            try {
                // We'll handle these errors gracefully instead of crashing
                const fetchPermissions = async () => {
                    try {
                        const { data, error } = await supabase
                            .from('user_permissions')
                            .select('*')
                            .eq('user_id', user?.id);
                        if (error) {
                            throw error;
                        }
                        setPermissions(data || []);
                    }
                    catch (err) {
                        console.warn('Error fetching permissions:', err);
                        // Don't throw, just continue with empty permissions
                        setPermissions([]);
                    }
                };
                const fetchOrganizations = async () => {
                    try {
                        const { data, error } = await supabase
                            .from('user_organizations')
                            .select('*, organizations(id,name), role')
                            .eq('user_id', user?.id);
                        if (error) {
                            throw error;
                        }
                        setOrganizations(data || []);
                    }
                    catch (err) {
                        console.warn('Error fetching organizations:', err);
                        // Don't throw, just continue with empty organizations
                        setOrganizations([]);
                    }
                };
                const fetchFeatureFlags = async () => {
                    try {
                        const { data, error } = await supabase
                            .from('feature_flags')
                            .select('*')
                            .eq('user_id', user?.id);
                        if (error) {
                            throw error;
                        }
                        setFeatureFlags(data || []);
                    }
                    catch (err) {
                        console.warn('Error fetching feature flags:', err);
                        // Don't throw, just continue with empty feature flags
                        setFeatureFlags([]);
                    }
                };
                // Execute all fetches
                await Promise.all([
                    fetchPermissions(),
                    fetchOrganizations(),
                    fetchFeatureFlags()
                ]);
            }
            catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError(err instanceof Error ? err : new Error('An unknown error occurred'));
            }
            finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);
    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/auth");
        }
    }, [isAuthenticated, navigate]);
    if (loading) {
        return (<div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"/>
      </div>);
    }
    if (error) {
        return <ErrorFallback error={error} resetErrorBoundary={() => window.location.reload()}/>;
    }
    const features: Array<Feature> = [
        {
            title: "Start Session",
            description: "Begin a new therapy session with AI assistance",
            icon: MdChat,
            path: "/chat",
            metrics: { sessions: 12, avgDuration: "45 min" }
        },
        {
            title: "AI Therapist",
            description: "Configure and customize your AI therapist",
            icon: MdPsychology,
            path: "/therapist",
            metrics: { configured: true, style: "CBT" }
        },
        {
            title: "Education Center",
            description: "Access therapeutic resources and training materials",
            icon: MdMenuBook,
            path: "/education",
            metrics: { completed: 8, inProgress: 3 }
        },
        {
            title: "Learning Hub",
            description: "Access therapeutic resources and exercises",
            icon: MdSchool,
            path: "/learn",
            metrics: { completed: 8, inProgress: 2 }
        },
        {
            title: "Community",
            description: "Connect with others on similar journeys",
            icon: MdGroup,
            path: "/community",
            metrics: { connections: 5, groups: 2 }
        },
    ];
    const navItems = [
        { id: "overview", label: "Overview", icon: MdDashboard },
        { id: "education", label: "Education", icon: MdMenuBook },
        { id: "profile", label: "Profile", icon: MdPeople },
        { id: "settings", label: "Settings", icon: MdSettings },
    ];
    const renderContent = () => {
        switch (activeTab) {
            case "overview":
                return (<div className="text-white">
            <header className="mb-8">
              <h1 className="text-3xl font-medium mb-2">Welcome back, {user?.email?.split('@')[0] || "Therapist"}</h1>
              <p className="text-gray-400">Here's an overview of your therapy journey</p>
            </header>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <MetricCard title="Total Sessions" value={24} color="#7EBF8E"></MetricCard>
              <MetricCard title="Progress Score" value={85} color="#8989DE"></MetricCard>
              <MetricCard title="Weekly Goals" value={92} color="#61AAF2"></MetricCard>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature) => (<Card key={feature.title} className="bg-white/5 border-white/10">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      {React.createElement(feature.icon as React.ComponentType<{
                        className: string;
                    }>, { className: "w-8 h-8 text-blue-500" })}
                      <div>
                        <CardTitle className="text-xl">{feature.title}</CardTitle>
                        <CardDescription className="text-gray-400">
                          {feature.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        {Object.entries(feature.metrics).map(([key, value]) => (<p key={key} className="text-sm text-gray-400">
                            {key}: <span className="text-white">{String(value)}</span>
                          </p>))}
                      </div>
                      <Button onClick={() => navigate(feature.path)} variant="outline" className="border-white/10 hover:bg-white/10">
                        Open
                      </Button>
                    </div>
                  </CardContent>
                </Card>))}
            </div>

            {/* Charts and Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <MonthlyChart ></MonthlyChart>
              <TherapyInsights ></TherapyInsights>
            </div>
          </div>);
            case "education":
                return (<div className="text-white">
            <header className="mb-8">
              <h1 className="text-3xl font-medium mb-2">Education Center</h1>
              <p className="text-gray-400">Access therapeutic resources and training materials</p>
            </header>
            {/* Add education content here */}
          </div>);
            case "profile":
                return (<div className="text-white">
            <header className="mb-8">
              <h1 className="text-3xl font-medium mb-2">Profile</h1>
              <p className="text-gray-400">Manage your personal information and preferences</p>
            </header>
            {/* Add profile content here */}
          </div>);
            case "settings":
                return (<div className="text-white">
            <header className="mb-8">
              <h1 className="text-3xl font-medium mb-2">Settings</h1>
              <p className="text-gray-400">Configure your therapy environment and notifications</p>
            </header>
            {/* Add settings content here */}
          </div>);
            default:
                return null;
        }
    };
    return (<ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen bg-[#0A0A0B] flex">
        {/* Side Navigation */}
        <div className="fixed left-0 top-0 w-64 h-screen glass-card border-r border-white/10">
          <div className="p-6">
            <h2 className="text-xl font-medium mb-6 text-white">TherapyTrain</h2>
            <nav className="space-y-2">
              {navItems.map((item) => (<Button key={item.id} variant="ghost" className={cn("w-full justify-start gap-2 text-white", activeTab === item.id && "bg-white/10")} onClick={() => {
                if (item.id === "education") {
                    navigate("/education");
                }
                else {
                    setActiveTab(item.id);
                }
            }}>
                  <item.icon className="w-4 h-4"/>
                  {item.label}
                </Button>))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64">
          <div className="p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    </ErrorBoundary>);
};
export default Dashboard;
