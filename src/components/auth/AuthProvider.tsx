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

interface FeatureFlag {
  key: string;
  value: boolean | string | number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: (options?: { org_code?: string; login_hint?: string }) => void;
  logout: () => void;
  register: (options?: { org_code?: string; }) => void;
  createOrg: (orgName: string) => Promise<void>;
  permissions: Permission[];
  organizations: Organization[];
  hasPermission: (permissionId: string) => boolean;
  isOrgAdmin: (orgId?: string) => boolean;
  getFeatureFlag: (key: string) => FeatureFlag | null;
  switchOrganization: (orgId: string) => Promise<void>;
}

interface KindePermissionResponse {
  permissions: Array<{ id: string; name?: string } | string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Wrapper component that provides Kinde context
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  
  return (
    <KindeProvider
      clientId={import.meta.env.VITE_KINDE_CLIENT_ID}
      domain={import.meta.env.VITE_KINDE_DOMAIN}
      redirectUri={import.meta.env.VITE_KINDE_REDIRECT_URL}
      logoutUri={import.meta.env.VITE_KINDE_LOGOUT_URL}
      onRedirectCallback={(user, appState) => {
        // Handle redirect after authentication
        if (appState?.returnTo) {
          window.location.href = appState.returnTo;
        }
      }}
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
    login: kindeLogin,
    logout: kindeLogout,
    register: kindeRegister,
    getPermissions,
    getOrganization,
    getUserOrganizations,
    createOrg: kindeCreateOrg,
    getToken,
    getClaim
  } = useKindeAuth();

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [featureFlags, setFeatureFlags] = useState<Record<string, FeatureFlag>>({});
  
  useEffect(() => {
    if (isAuthenticated) {
      // Fetch permissions
      const fetchPermissions = async () => {
        const perms = await getPermissions();
        if (Array.isArray(perms)) {
          const transformedPerms: Permission[] = perms.map(perm => {
            if (typeof perm === 'string') {
              return { id: perm, name: perm };
            } else if (typeof perm === 'object' && perm !== null && 'id' in perm) {
              return { 
                id: perm.id, 
                name: (perm.name as string) ?? perm.id 
              };
            }
            // fallback case
            return { id: String(perm), name: String(perm) };
          });
          setPermissions(transformedPerms);
        } else {
          setPermissions([]);
        }
      };

      // Fetch organizations
      const fetchOrganizations = async () => {
        const orgs = await getUserOrganizations();
        setOrganizations(orgs || []);
      };

      // Fetch feature flags
      const fetchFeatureFlags = async () => {
        const flags = await getClaim('feature_flags');
        setFeatureFlags(flags || {});
      };

      fetchPermissions();
      fetchOrganizations();
      fetchFeatureFlags();
    }
  }, [isAuthenticated, getPermissions, getUserOrganizations, getClaim]);

  const login = (options?: { org_code?: string; login_hint?: string }) => {
    const { org_code, login_hint } = options || {};
    kindeLogin({
      authUrlParams: {
        ...(org_code && { org_code }),
        ...(login_hint && { login_hint }),
      },
      app_state: {
        returnTo: window.location.pathname
      }
    });
  };

  const register = (options?: { org_code?: string }) => {
    const { org_code } = options || {};
    kindeRegister({
      authUrlParams: {
        ...(org_code && { org_code }),
      },
      app_state: {
        returnTo: window.location.pathname
      }
    });
  };

  const createOrg = async (orgName: string) => {
    await kindeCreateOrg({
      name: orgName,
      // You can add additional org creation options here
    });
  };

  const switchOrganization = async (orgId: string) => {
    // Implementation depends on your backend setup
    const token = await getToken();
    await fetch(`${import.meta.env.VITE_API_URL}/api/switch-organization`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ organizationId: orgId }),
    });
    // Refresh the page to update the context
    window.location.reload();
  };

  const hasPermission = (permissionId: string) => {
    return permissions.some(p => p.id === permissionId);
  };

  const isOrgAdmin = (orgId?: string) => {
    const org = organizations.find(o => !orgId || o.id === orgId);
    return org?.role === 'admin';
  };

  const getFeatureFlag = (key: string): FeatureFlag | null => {
    return featureFlags[key] || null;
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout: kindeLogout,
    register,
    createOrg,
    permissions,
    organizations,
    hasPermission,
    isOrgAdmin,
    getFeatureFlag,
    switchOrganization,
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
  const location = useLocation();
  const { isAuthenticated, hasPermission, isOrgAdmin: checkIsOrgAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requireOrgAdmin && !checkIsOrgAdmin()) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
