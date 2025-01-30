import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdPsychology as Brain } from "react-icons/md";
import { Button } from "../components/ui/button";
import { supabase } from "../utils/supabase"; // Import Supabase client

const AuthPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        console.log("User authenticated, redirecting to dashboard");
        navigate("/dashboard", { replace: true });
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async () => {
    console.log("Attempting to login...");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Login error:", error.message);
    } else if (data.user) {
      navigate("/dashboard", { replace: true });
    }
  };

  const handleRegister = async () => {
    console.log("Attempting to register...");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error("Registration error:", error.message);
    } else if (data.user) {
             navigate("/dashboard", { replace: true });
           }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-8 bg-[#1A1A1D] p-8 rounded-lg shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Brain className="h-16 w-16 text-blue-500" />
          <h1 className="text-center text-3xl font-bold tracking-tight text-white">
            Welcome to TherapyTrain
          </h1>
          <p className="text-center text-gray-400">
            Sign in or create an account to start your journey
          </p>
        </div>
        
        <div className="space-y-4 mt-8">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
          <Button
            onClick={handleLogin}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3"
          >
            Sign in with Supabase
          </Button>
          
          <Button
            onClick={handleRegister}
            variant="outline"
            className="w-full border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white py-3"
          >
            Create an Account
          </Button>
        </div>

        <p className="mt-4 text-center text-sm text-gray-400">
          By continuing, you agree to our{" "}
          <a href="/terms-of-service" className="text-blue-500 hover:text-blue-400">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy-policy" className="text-blue-500 hover:text-blue-400">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
