import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface Organization {
  id: string;
  name: string;
  role: string;
  organization_id: string;
  organizations: Array<{
    id: string;
    name: string;
  }>;
}

interface UserPermission {
  permission: string;
}

interface FetchError {
  type: 'permissions' | 'organizations';
  message: string;
}

export const UserProfile = () => {
  const { user, isAuthenticated } = useAuth();
  const supabase = createClientComponentClient();
  const [permissions, setPermissions] = useState<Array<string>>([]);
  const [organizations, setOrganizations] = useState<Array<Organization>>([]);
  const [loading, setLoading] = useState({ permissions: false, organizations: false });
  const [error, setError] = useState<FetchError | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Get user permissions
      const fetchPermissions = async () => {
        setLoading(prev => ({ ...prev, permissions: true }));
        try {
          const { data: userPermissions, error } = await supabase
            .from('user_permissions')
            .select('permission')
            .eq('user_id', user.id);

          if (error) throw error;

          if (userPermissions) {
            setPermissions(userPermissions.map((p: UserPermission) => p.permission));
          }
        } catch (err) {
          setError({ type: 'permissions', message: 'Failed to fetch permissions' });
          console.error('Error fetching permissions:', err);
        } finally {
          setLoading(prev => ({ ...prev, permissions: false }));
        }
      };

      // Get user organizations
      const fetchOrganizations = async () => {
        setLoading(prev => ({ ...prev, organizations: true }));
        try {
          const { data: userOrgs, error } = await supabase
            .from('user_organizations')
            .select(`
              organization_id,
              organizations (
                id,
                name
              ),
              role
            `)
            .eq('user_id', user.id);

          if (error) throw error;

          if (userOrgs) {
            const formattedOrgs = userOrgs.map(org => ({
              id: org.organization_id,
              name: org.organizations[0].name,
              role: org.role,
              organization_id: org.organization_id,
              organizations: org.organizations.map(o => ({
                id: o.id,
                name: o.name
              }))
            }));
            setOrganizations(formattedOrgs);
          }
        } catch (err) {
          setError({ type: 'organizations', message: 'Failed to fetch organizations' });
          console.error('Error fetching organizations:', err);
        } finally {
          setLoading(prev => ({ ...prev, organizations: false }));
        }
      };

      fetchPermissions();
      fetchOrganizations();
    }
  }, [isAuthenticated, user, supabase]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {user.user_metadata.given_name} {user.user_metadata.family_name}
        </CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Permissions</h3>
          {loading.permissions ? (
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {permissions.map((permission) => (
                <Badge key={permission} variant="secondary">
                  {permission}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Organizations</h3>
          {loading.organizations ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="space-y-2">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="p-3 border rounded-lg flex justify-between items-center"
                >
                  <span className="font-medium">{org.name}</span>
                  <Badge>{org.role}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};