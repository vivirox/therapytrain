import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { KindeProvider, useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { Navigate, useLocation } from 'react-router-dom';

interface Permission {
  id: string;
  name: string;
}

interface Organization {
  id: string;
  name: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: () => void;
  logout: () => void;
  register: () => void;
  permissions: Permission[];
  organizations: Organization[];
  hasPermission: (permissionId: string) => boolean;
  isOrgAdmin: (orgId?: string) => boolean;
}

interface KindePermissionResponse {
  permissions: Array<{ id: string; name?: string } | string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Wrapper component that provides Kinde context
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <KindeProvider
      clientId={import.meta.env.VITE_KINDE_CLIENT_ID}
      domain={import.meta.env.VITE_KINDE_DOMAIN}
      redirectUri={import.meta.env.VITE_KINDE_REDIRECT_URL}
      logoutUri={import.meta.env.VITE_KINDE_LOGOUT_URL}
    >
      <AuthStateProvider>{children}</AuthStateProvider>
    </KindeProvider>
  );
};

// Component that provides the authentication state
const AuthStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    isAuthenticated,
    user,
    login,
    logout,
    register,
    getPermissions,
    getUserOrganizations
  } = useKindeAuth();

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      // Fetch permissions and organizations when authenticated
      const fetchUserData = async () => {
        try {
          const [permsResponse, orgsResponse] = await Promise.all([
            getPermissions(),
            getUserOrganizations()
          ]) as [KindePermissionResponse, { orgCodes: string[] }];

          // Transform the permissions data to match the Permission type
          const transformedPermissions = permsResponse.permissions.map(perm => ({
            id: typeof perm === 'string' ? perm : perm.id,
            name: typeof perm === 'string' ? perm : (perm.name || perm.id)
          }));

          setPermissions(transformedPermissions);
          const orgResponse = orgsResponse.orgCodes.map(code => ({
            id: code,
            name: code,
            role: 'member' // Default role, adjust as needed
          }));
          setOrganizations(orgResponse);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };

      fetchUserData();
    } else {
      // Reset state when not authenticated
      setPermissions([]);
      setOrganizations([]);
    }
  }, [isAuthenticated, getPermissions, getUserOrganizations]);

  const hasPermission = (permissionId: string): boolean => {
    return permissions.some(p => p.id === permissionId);
  };

  const isOrgAdmin = (orgId?: string): boolean => {
    if (!orgId) {
      // Check if user is admin in any organization
      return organizations.some(org => org.role === 'admin');
    }
    // Check if user is admin in specific organization
    return organizations.some(org => org.id === orgId && org.role === 'admin');
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    register,
    permissions,
    organizations,
    hasPermission,
    isOrgAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Auth context hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Protected route component with optional permission check
interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  requireOrgAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermission,
  requireOrgAdmin
}) => {
  const { isAuthenticated, hasPermission, isOrgAdmin: checkOrgAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requireOrgAdmin && !checkOrgAdmin()) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
