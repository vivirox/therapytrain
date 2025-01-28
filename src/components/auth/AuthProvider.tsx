import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { KindeProvider, useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

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
  permissions: Array<Permission>;
  organizations: Array<Organization>;
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
  const navigate = useNavigate();
  
  console.log("Kinde Config:", {
    clientId: import.meta.env.VITE_KINDE_CLIENT_ID,
    domain: import.meta.env.VITE_KINDE_DOMAIN,
    redirectUri: import.meta.env.VITE_KINDE_REDIRECT_URL,
    logoutUri: import.meta.env.VITE_KINDE_LOGOUT_URL
  });
      return (
        <KindeProvider
          clientId={import.meta.env.VITE_KINDE_CLIENT_ID}
          domain={import.meta.env.VITE_KINDE_DOMAIN}
          redirectUri={import.meta.env.VITE_KINDE_REDIRECT_URL}
          logoutUri={import.meta.env.VITE_KINDE_LOGOUT_URL}
          onRedirectCallback={(user, appState) => {
            // Add logging to track the flow
            console.log("Redirect callback triggered", { user, appState });
        
            if (appState?.returnTo && typeof appState.returnTo === 'string') {
              navigate(appState.returnTo);
            } else {
              // Use the callback route instead of dashboard directly
              navigate('/callback', { replace: true });
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
    getUserOrganizations,
    createOrg: kindeCreateOrg,
    getToken,
    getClaim
  } = useKindeAuth();

  const [permissions, setPermissions] = useState<Array<Permission>>([]);
  const [organizations, setOrganizations] = useState<Array<Organization>>([]);
  const [featureFlags, setFeatureFlags] = useState<Record<string, FeatureFlag>>({});
  
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    // Fetch permissions
    const fetchPermissions = async () => {
      try {
        const perms = await getPermissions();
        if (!perms) {
          setPermissions([]);
          return;
        }
          
        if (Array.isArray(perms)) {
          const transformedPerms: Array<Permission> = perms.map(perm => {
            if (typeof perm === 'string') {
              return { id: perm, name: perm };
            } else if (typeof perm === 'object' && perm !== null && 'id' in perm) {
              const permId = perm.id;
              if (typeof permId !== 'string') {
                return { id: String(permId), name: String(permId) };
              }
              return { 
                id: permId,
                name: typeof perm.name === 'string' ? perm.name : permId 
              };
            }
            // fallback case
            return { id: String(perm), name: String(perm) };
          });
          setPermissions(transformedPerms);
        } else {
          setPermissions([]);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions([]);
      }
    };

    // Fetch organizations
    const fetchOrganizations = async () => {
      try {
        const orgs = await getUserOrganizations();
        if (orgs && Array.isArray(orgs)) {
          setOrganizations(orgs.map(org => ({
            id: org.id,
            name: org.name,
            role: org.role || 'member'
          })));
        } else if (orgs && 'organizations' in orgs) {
          setOrganizations(
            (orgs as { organizations: Array<any> }).organizations.map(org => ({
              id: org.id,
              name: org.name,
              role: org.role || 'member'
            }))
          );
        } else {
          setOrganizations([]);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
        setOrganizations([]);
      }
    };

    // Fetch feature flags
    const fetchFeatureFlags = async () => {
      try {
        const flags = await getClaim('feature_flags');
        if (flags && typeof flags === 'object') {
          const transformedFlags: Record<string, FeatureFlag> = {};
          Object.entries(flags).forEach(([key, value]) => {
            transformedFlags[key] = {
              key,
              value: value as boolean | string | number
            };
          });
          setFeatureFlags(transformedFlags);
        } else {
          setFeatureFlags({});
        }
      } catch (error) {
        console.error('Error fetching feature flags:', error);
        setFeatureFlags({});
      }
    };

    fetchPermissions();
    fetchOrganizations();
    fetchFeatureFlags();
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
      org_name: orgName,
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
