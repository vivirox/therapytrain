import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MdChat, MdPsychology, MdSchool, MdGroup } from "react-icons/md";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useKindeAuth();

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
    },
    {
      title: "AI Therapist",
      description: "Configure and customize your AI therapist",
      icon: MdPsychology,
      path: "/therapist",
    },
    {
      title: "Learning Hub",
      description: "Access therapeutic resources and exercises",
      icon: MdSchool,
      path: "/learn",
    },
    {
      title: "Community",
      description: "Connect with others on similar journeys",
      icon: MdGroup,
      path: "/community",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user?.given_name || "Therapist"}</h1>
            <p className="text-gray-400 mt-2">Your AI-powered therapy assistant is ready to help</p>
          </div>
          <MdPsychology className="h-12 w-12 text-blue-500" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="bg-[#1A1A1D] border-gray-800 hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => navigate(feature.path)}
            >
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <feature.icon className="h-6 w-6 text-blue-500 mr-4" />
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity or Stats could go here */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
          <div className="bg-[#1A1A1D] rounded-lg p-6">
            <p className="text-gray-400">Your activity will appear here once you start using the platform.</p>
            <Button
              className="mt-4"
              onClick={() => navigate("/chat")}
            >
              Start Your First Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
