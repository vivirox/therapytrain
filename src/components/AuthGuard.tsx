import { Navigate } from "react-router-dom";

export const AuthGuard = ({ children }) => {
  // Placeholder for authentication logic
  const isAuthenticated = true; // Update this with actual authentication logic

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  return children;
};