import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { MdChat, MdPsychology, MdSchool, MdGroup, MdMenuBook, MdDashboard, MdSettings, MdPeople } from "react-icons/md";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import MetricCard from '../components/MetricCard';
import MonthlyChart from '../components/MonthlyChart';
import TherapyInsights from '../components/CustomerRequests';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useState } from "react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useKindeAuth();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
    }
  }, [isAuthenticated, navigate]);

  const features = [
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

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      {/* Side Navigation */}
      <div className="fixed left-0 top-0 w-64 h-screen glass-card border-r border-white/10">
        <div className="p-6">
          <h2 className="text-xl font-medium mb-6 text-white">TherapyTrain</h2>
          <Tabs
            defaultValue="overview"
            orientation="vertical"
            className="w-full"
            onValueChange={setActiveTab}
          >
            <TabsList className="flex flex-col h-auto bg-transparent text-white">
              <TabsTrigger
                value="overview"
                className="w-full justify-start gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-white"
              >
                <MdDashboard className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="education"
                className="w-full justify-start gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-white"
                onClick={() => navigate("/education")}
              >
                <MdMenuBook className="w-4 h-4" />
                Education
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="w-full justify-start gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-white"
              >
                <MdPeople className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="w-full justify-start gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-white"
              >
                <MdSettings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <TabsContent value="overview" className="text-white">
          <header className="mb-8">
            <h1 className="text-3xl font-medium mb-2">Welcome back, {user?.given_name || "Therapist"}</h1>
            <p className="text-gray-400">Here's an overview of your therapy journey</p>
          </header>

          {/* Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <MetricCard
              title="Total Sessions"
              value={24}
              color="#7EBF8E"
            />
            <MetricCard
              title="Progress Score"
              value={85}
              color="#8989DE"
            />
            <MetricCard
              title="Weekly Goals"
              value={92}
              color="#61AAF2"
            />
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="bg-white/5 border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <feature.icon className="w-8 h-8 text-blue-500" />
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
                      {Object.entries(feature.metrics).map(([key, value]) => (
                        <p key={key} className="text-sm text-gray-400">
                          {key}: <span className="text-white">{value}</span>
                        </p>
                      ))}
                    </div>
                    <Button
                      onClick={() => navigate(feature.path)}
                      variant="outline"
                      className="border-white/10 hover:bg-white/10"
                    >
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <MonthlyChart />
            <TherapyInsights />
          </div>
        </TabsContent>

        <TabsContent value="education" className="text-white">
          <header className="mb-8">
            <h1 className="text-3xl font-medium mb-2">Education Center</h1>
            <p className="text-gray-400">Access therapeutic resources and training materials</p>
          </header>
          {/* Add education content here */}
        </TabsContent>

        <TabsContent value="profile" className="text-white">
          <header className="mb-8">
            <h1 className="text-3xl font-medium mb-2">Profile</h1>
            <p className="text-gray-400">Manage your personal information and preferences</p>
          </header>
          {/* Add profile content here */}
        </TabsContent>

        <TabsContent value="settings" className="text-white">
          <header className="mb-8">
            <h1 className="text-3xl font-medium mb-2">Settings</h1>
            <p className="text-gray-400">Configure your therapy environment and notifications</p>
          </header>
          {/* Add settings content here */}
        </TabsContent>
      </div>
    </div>
  );
};

export default Dashboard;
