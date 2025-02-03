import { ComponentChildren } from 'preact';
import type { Location } from 'preact-router';
import { route } from 'preact-router';
import { useAuth } from './auth/AuthProvider';

interface AuthGuardProps {
    children: ComponentChildren;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const { isAuthenticated } = useAuth();
    const navigate = route;
    const location = new Location();

    if (!isAuthenticated) {
        navigate('/auth', true);
        return null;
    }

    return <>{children}</>;
}