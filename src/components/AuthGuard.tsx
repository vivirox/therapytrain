import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { Loading } from './ui/loading';

interface AuthGuardProps {
    children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { session, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    React.useEffect(() => {
        if (!loading && !session) {
            navigate('/auth', {
                replace: true,
                state: { from: location }
            });
        }
    }, [session, loading, navigate, location]);

    if (loading) {
        return <Loading fullScreen message="Checking authentication..." />;
    }

    if (!session) {
        return null;
    }

    return <>{children}</>;
};