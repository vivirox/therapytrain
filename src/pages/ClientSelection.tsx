import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '@/context/authcontext'; // Updated import
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MdGroups as Users, MdPersonAdd as UserPlus, MdArrowBack as ArrowLeft } from "react-icons/md";
interface Client {
    id: string;
    name: string;
    lastSession?: string;
}
const ClientSelection: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth(); // Updated to use useAuth
    const [clients, setClients] = useState<Array<Client>>([]);
    const [searchTerm, setSearchTerm] = useState<string>("");
    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/auth");
            return;
        }
        // TODO: Fetch clients from Supabase
        // For now, using mock data
        setClients([
            { id: "1", name: "John Doe", lastSession: "2024-01-20" },
            { id: "2", name: "Jane Smith", lastSession: "2024-01-25" },
        ]);
    }, [isAuthenticated, navigate]);
    const filteredClients = clients.filter((client: any) => client.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return (<div className="min-h-screen bg-[#0A0A0B] text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2"></ArrowLeft>
            Back to Dashboard
          </Button>
          <Button onClick={() => { }} className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="h-4 w-4 mr-2"></UserPlus>
            Add New Client
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Users className="h-8 w-8 mr-4 text-blue-500"></Users>
            Client Management
          </h1>
          <p className="text-gray-400 mt-2">Select a client to start a session or manage their profile</p>
        </div>

        <Input 
          type="search" 
          placeholder="Search clients..." 
          className="bg-[#1A1A1D] border-gray-800" 
          value={searchTerm} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClients.map((client: any) => (<Card key={client.id} className="bg-[#1A1A1D] border-gray-800 hover:border-blue-500 transition-colors cursor-pointer" onClick={() => navigate("/chat", { state: { clientId: client.id } })}>
              <CardHeader>
                <CardTitle>{client.name}</CardTitle>
                {client.lastSession && (<CardDescription className="text-gray-400">
                    Last session: {new Date(client.lastSession).toLocaleDateString()}
                  </CardDescription>)}
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Start Session
                </Button>
              </CardContent>
            </Card>))}
        </div>

        {filteredClients.length === 0 && (<div className="text-center text-gray-400 py-8">
            No clients found. Add a new client to get started.
          </div>)}
      </div>
    </div>);
};
export default ClientSelection;
