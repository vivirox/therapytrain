import { type FC, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { Loading } from './ui/loading';

interface AuthGuardProps {
    children: React.ReactNode;
}

export const AuthGuard: FC<AuthGuardProps> = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/auth', {
                replace: true,
                state: { from: location }
            });
        }
    }, [isAuthenticated, navigate, location]);

    if (!user) {
        return <Loading fullScreen message="Checking authentication..." />;
    }

    return <>{children}</>;
};