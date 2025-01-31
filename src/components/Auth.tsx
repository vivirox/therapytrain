import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';


interface AuthProps {
  redirectTo?: string;
}

const Auth: React.FC<AuthProps> = ({ redirectTo = '/dashboard' }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        navigate(redirectTo);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Show confirmation message or redirect
        alert('Please check your email for confirmation link');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <h2>Welcome</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleLogin} className="auth-form">
          <h3>Sign In</h3>
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            disabled={loading}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : 'Sign In'}
          </button>
        </form>

        <form onSubmit={handleSignUp} className="auth-form">
          <h3>Sign Up</h3>
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            disabled={loading}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
