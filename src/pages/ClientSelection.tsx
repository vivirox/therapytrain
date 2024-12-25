import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRound } from "lucide-react";

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
  const [clients, setClients] = useState<Client[]>([]);

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
    <div className="min-h-screen bg-chatgpt-main p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-white">Select a Client</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <Card 
              key={client.id}
              className="bg-chatgpt-secondary hover:bg-chatgpt-hover cursor-pointer transition-colors"
              onClick={() => navigate(`/chat/${client.id}`)}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-chatgpt-hover p-3 rounded-full">
                    <UserRound className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-white">{client.name}</CardTitle>
                    <CardDescription className="text-gray-400">Age: {client.age}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-white font-medium">{client.primary_issue}</p>
                  <p className="text-sm text-gray-400">{client.description}</p>
                  <div className="flex items-center gap-2 mt-4">
                    <span className={`px-2 py-1 rounded text-xs ${
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