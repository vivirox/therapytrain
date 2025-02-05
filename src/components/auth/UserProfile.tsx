import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { useSupabaseClient } from '@supabase/ssr';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Organization {
  id: string;
  name: string;
  role: string;
}

interface UserPermission {
  permission: string;
}

export const UserProfile = () => {
  const { user, isAuthenticated } = useAuth();
  const supabase = useSupabaseClient();
  const [permissions, setPermissions] = useState<Array<string>>([]);
  const [organizations, setOrganizations] = useState<Array<Organization>>([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Get user permissions
      const fetchPermissions = async () => {
        const { data: userPermissions, error } = await supabase
          .from('user_permissions')
          .select('permission')
          .eq('user_id', user.id);

        if (!error && userPermissions) {
          setPermissions(userPermissions.map((p: UserPermission) => p.permission));
        }
      };

      // Get user organizations
      const fetchOrganizations = async () => {
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

        if (!error && userOrgs) {
          const formattedOrgs = userOrgs.map(org => ({
            id: org.organization_id,
            name: org.organizations[0].name,
            role: org.role
          }));
          setOrganizations(formattedOrgs);
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
        {permissions.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Permissions</h3>
            <div className="flex flex-wrap gap-2">
              {permissions.map((permission) => (
                <Badge key={permission} variant="secondary">
                  {permission}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {organizations.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Organizations</h3>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};