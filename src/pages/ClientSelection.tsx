import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRound, AlertCircle, Brain, Activity } from "lucide-react";

type Client = {
  id: number;
  name: string;
  age: number;
  primary_issue: string;
  complexity: string;
  description: string;
};

const ClientSelection = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Array<Client>>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    
    checkAuth();
    fetchClients();
  }, [navigate]);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('client_profiles')
      .select('*');
    
    if (error) {
      console.error('Error fetching clients:', error);
      return;
    }
    
    setClients(data || []);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Brain className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-white">Select Your Client</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Card 
              key={client.id}
              className="bg-[#1A1A1D] border-gray-800 hover:border-blue-500/50 hover:bg-[#222225] transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              onClick={() => navigate(`/chat/${client.id}`)}
            >
              <CardHeader className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/10 p-2 rounded-lg">
                    <UserRound className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-white">{client.name}</CardTitle>
                    <CardDescription className="text-gray-400 text-sm">Age: {client.age}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-300">{client.primary_issue}</span>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2">{client.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      client.complexity === 'High' ? 'bg-red-500/20 text-red-300' :
                      client.complexity === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-green-500/20 text-green-300'
                    }`}>
                      {client.complexity} Complexity
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientSelection;