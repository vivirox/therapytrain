import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { Loading } from "../ui/loading";

export const Auth = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // If we're on the callback route and authenticated
    if (location.pathname === '/callback' && isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // If we're authenticated but on the auth page
    if (location.pathname === '/auth' && isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [isAuthenticated, location.pathname, navigate]);

  return <Loading fullScreen message="Processing authentication..." ></Loading>;
};

