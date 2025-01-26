import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
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

export const UserProfile = () => {
  const { user, isAuthenticated } = useAuth();
  const { getPermissions, getUserOrganizations } = useKindeAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      // Get user permissions
      const fetchPermissions = async () => {
        const perms = await getPermissions();
        setPermissions(perms.permissions.map(p => 
          typeof p === 'string' ? p : (p as { id: string }).id
        ));
      };

      // Get user organizations
      const fetchOrganizations = async () => {
        const orgs = await getUserOrganizations();
        if (orgs && Array.isArray(orgs)) {
          setOrganizations(orgs);
        } else if (orgs && 'organizations' in orgs) {
          setOrganizations((orgs as { organizations: Organization[] }).organizations);
        } else {
          setOrganizations([]);
        }
      };

      fetchPermissions();
      fetchOrganizations();
    }
  }, [isAuthenticated, getPermissions, getUserOrganizations]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{user.given_name} {user.family_name}</CardTitle>
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
