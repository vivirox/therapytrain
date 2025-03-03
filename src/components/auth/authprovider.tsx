"use client";

import { type FC, createContext, useContext, type ReactNode, useEffect, useState, useMemo } from 'react';
import { type User, type Session, type AuthChangeEvent } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { type SupabaseContextType } from '@/types/auth';

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

interface UserPermission {
    permission_id: string;
    permission_name: string;
}

interface UserOrganization {
    organization_id: string;
    organizations: Array<{
        id: string;
        name: string;
    }>;
    role: string;
}

interface AuthContextType {
    user: User | null;
    organizations: Array<Organization>;
    permissions: Array<Permission>;
    featureFlags: Record<string, boolean>;
    loading: boolean;
    error: Error | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    createOrg: (name: string) => Promise<void>;
    switchOrganization: (orgId: string) => Promise<void>;
    hasPermission: (permission: string) => boolean;
    isOrgAdmin: () => boolean;
    getFeatureFlag: (flag: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const useSupabase = () => {
    const context = useContext(SupabaseContext);
    if (!context) {
        throw new Error('useSupabase must be used within a SupabaseProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [organizations, setOrganizations] = useState<Array<Organization>>([]);
    const [permissions, setPermissions] = useState<Array<Permission>>([]);
    const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
            setUser(session?.user ?? null);
            if (event === 'SIGNED_IN') {
                router.push('/dashboard');
            }
        });

        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

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

            if (data) {
                setPermissions(data.map((p: UserPermission) => ({
                    id: p.permission_id,
                    name: p.permission_name
                })));
            }
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

            if (data) {
                setOrganizations(data.map((o: UserOrganization) => ({
                    id: o.organizations?.[0]?.id ?? '',
                    name: o.organizations?.[0]?.name ?? '',
                    role: o.role
                })));
            }
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

            if (data) {
                const flagsRecord: Record<string, boolean> = {};
                data.forEach((flag: FeatureFlag) => {
                    flagsRecord[flag.key] = flag.value === true;
                });
                setFeatureFlags(flagsRecord);
            }
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
        router.push('/auth');
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
        if (!user)
            return;
        const { error } = await supabase
            .from('organizations')
            .insert([{ name: orgName, created_by: user.id }]);
        if (error) {
            throw error;
        }
    };
    const switchOrganization = async (orgId: string) => {
        if (!user)
            return;
        const { error } = await supabase
            .from('user_organizations')
            .update({ is_active: true })
            .eq('user_id', user.id)
            .eq('organization_id', orgId);
        if (error) {
            throw error;
        }
        window.location.reload();
    };
    const hasPermission = (permissionId: string) => {
        return permissions.some(p => p.id === permissionId);
    };
    const isOrgAdmin = () => {
        const org = organizations.find(o => o.role === 'admin');
        return !!org;
    };
    const getFeatureFlag = (key: string): boolean => {
        return featureFlags[key] || false;
    };
    const value = useMemo<AuthContextType>(() => ({
        user,
        organizations,
        permissions,
        featureFlags,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        logout,
        createOrg,
        switchOrganization,
        hasPermission,
        isOrgAdmin,
        getFeatureFlag,
    }), [user, permissions, organizations, featureFlags, loading, error]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

interface SupabaseProviderProps {
    children: ReactNode;
}

export const SupabaseProvider: FC<SupabaseProviderProps> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const supabase = createClient();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            setSession(session);
        });

        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const value = useMemo(() => ({
        supabase,
        session,
        loading
    }), [session, loading]);

    return (
        <SupabaseContext.Provider value={value}>
            {children}
        </SupabaseContext.Provider>
    );
};

// Protected route component with optional permission check
interface ProtectedRouteProps {
    children: ReactNode;
    requiredPermission?: string;
    requireOrgAdmin?: boolean;
    className?: string;
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ children, requiredPermission, requireOrgAdmin }) => {
    const router = useRouter();
    const { isAuthenticated, hasPermission, isOrgAdmin: checkIsOrgAdmin } = useAuth();
    if (!isAuthenticated) {
        router.push('/auth');
    }
    if (requiredPermission && !hasPermission(requiredPermission)) {
        router.push('/unauthorized');
    }
    if (requireOrgAdmin && !checkIsOrgAdmin()) {
        router.push('/unauthorized');
    }
    return <>{children}</>;
};

export interface Database {
    public: { Tables: { [key: string]: any } };
}
