import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
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
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  createOrg: (orgName: string) => Promise<void>;
  permissions: Array<Permission>;
  organizations: Array<Organization>;
  hasPermission: (permissionId: string) => boolean;
  isOrgAdmin: (orgId?: string) => boolean;
  getFeatureFlag: (key: string) => FeatureFlag | null;
  switchOrganization: (orgId: string) => Promise<void>;
}

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const AuthContext = createContext<AuthContextType | null>(null);

// Main Auth Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Array<Permission>>([]);
  const [organizations, setOrganizations] = useState<Array<Organization>>([]);
  const [featureFlags, setFeatureFlags] = useState<Record<string, FeatureFlag>>({});
  const navigate = useNavigate();

  useEffect(() => {
    // Set up Supabase auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN') {
        navigate('/dashboard');
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      return;
    }

    // Fetch user permissions
    const fetchPermissions = async () => {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching permissions:', error);
        return;
      }

      setPermissions(data.map(p => ({
        id: p.permission_id,
        name: p.permission_name
      })));
    };

    // Fetch user organizations
    const fetchOrganizations = async () => {
      const { data, error } = await supabase
        .from('user_organizations')
        .select('organization_id, organizations(id, name), role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching organizations:', error);
        return;
      }

      setOrganizations(data.map(o => ({
        id: o.organizations[0]?.id,
        name: o.organizations[0]?.name,
        role: o.role
      })));
    };

    // Fetch feature flags
    const fetchFeatureFlags = async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching feature flags:', error);
        return;
      }

      const flagsRecord: Record<string, FeatureFlag> = {};
      data.forEach(flag => {
        flagsRecord[flag.key] = {
          key: flag.key,
          value: flag.value
        };
      });
      setFeatureFlags(flagsRecord);
    };

    fetchPermissions();
    fetchOrganizations();
    fetchFeatureFlags();
  }, [user]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    navigate('/auth');
  };

  const register = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      throw error;
    }
  };

  const createOrg = async (orgName: string) => {
    const { error } = await supabase
      .from('organizations')
      .insert([{ name: orgName, created_by: user?.id }]);
    if (error) {
      throw error;
    }
  };

  const switchOrganization = async (orgId: string) => {
    const { error } = await supabase
      .from('user_organizations')
      .update({ is_active: true })
      .eq('user_id', user?.id)
      .eq('organization_id', orgId);

    if (error) {
      throw error;
    }
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
    isAuthenticated: !!user,
    user,
    login,
    logout,
    register,
    createOrg,
    permissions,
    organizations,
    hasPermission,
    isOrgAdmin,
    getFeatureFlag,
    switchOrganization,
    supabase,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
// Auth context hook
interface AuthContextType {
  user: User | null;
  supabase: SupabaseClient;
}

function isAuthContext(context: unknown): context is AuthContextType {
  return (
    typeof context === 'object' &&
    context !== null &&
    'user' in context &&
    'supabase' in context
  );
}

export const useAuth = () => {
  const context = useMemo(() => useContext(AuthContext), []);

  try {
    if (!context || !isAuthContext(context)) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
  } catch (error) {

    console.error(error);
    return null;
  }
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
import { useMemo } from 'react';import { ErrorBoundary } from 'next/dist/client/components/error-boundary';

