import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import type { ClientProfile } from '@/types/clientprofile';

interface ClientProfileCardProps {
  profile: ClientProfile;
  onSelect: (profile: ClientProfile) => void;
  onEdit: (profile: ClientProfile) => void;
  onDelete: (profile: ClientProfile) => void;
  isSelected?: boolean;
}

export function ClientProfileCard({ profile, onSelect, onEdit, onDelete, isSelected }: ClientProfileCardProps) {
  return (
    <Card 
      className={`w-full cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={() => onSelect(profile)}
    >
      <CardHeader>
        <CardTitle>{profile.name}</CardTitle>
        <CardDescription>{profile.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(profile);
            }}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(profile);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 