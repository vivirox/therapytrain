import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const AuthTest: React.FC = () => {
  const { signIn, isAuthenticated } = useAuth();

  useEffect(() => {
    const testSignIn = async () => {
      try {
        await signIn('test@example.com', 'password123'); // Use valid test credentials
        console.log('Sign-in successful');
      } catch (error) {
        console.error('Sign-in failed:', error);
      }
    };

    testSignIn();
  }, [signIn]);

  return (
    <div>
      <h1>Auth Test Component</h1>
      <p>{isAuthenticated ? 'User is authenticated' : 'User is not authenticated'}</p>
    </div>
  );
};

export default AuthTest;
