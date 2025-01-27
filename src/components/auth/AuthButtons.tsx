import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Button } from '../ui/button';

export const LoginButton = () => {
  const { login } = useAuth();
  return (
    <Button 
      onClick={() => login()} 
      variant="outline"
    >
      Sign In
    </Button>
  );
};

export const RegisterButton = () => {
  const { register } = useAuth();
  return (
    <Button 
      onClick={() => register()} 
      variant="default"
    >
      Sign Up
    </Button>
  );
};

export const LogoutButton = () => {
  const { logout } = useAuth();
  return (
    <Button 
      onClick={() => logout()} 
      variant="ghost"
    >
      Sign Out
    </Button>
  );
};

export const AuthButtons = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <LogoutButton />;
  }

  return (
    <div className="flex gap-2">
      <LoginButton />
      <RegisterButton />
    </div>
  );
};
