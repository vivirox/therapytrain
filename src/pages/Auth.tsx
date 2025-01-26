import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Brain } from "lucide-react";

const AuthPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useKindeAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/chat");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Brain className="h-12 w-12 text-primary" />
          <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            Welcome to TherapyTrain
          </h1>
          <p className="text-center text-gray-600">
            Sign in to start your session
          </p>
        </div>
        <button
          onClick={() => login()}
          className="flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Sign in with Kinde
        </button>
      </div>
    </div>
  );
};

export default AuthPage;