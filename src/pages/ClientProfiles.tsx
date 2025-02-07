import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import ClientProfileCard from '@/components/ClientProfileCard';
import ClientProfileDialog from '@/components/ClientProfileDialog';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from '@/components/ui/alert-dialog';
import type { ClientProfile } from '@/types/ClientProfile';
import { supabase } from '@/integrations/supabase/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
export default function ClientProfiles(): JSX.Element {
    const [profiles, setProfiles] = useState<ClientProfile[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedProfile, setSelectedProfile] = useState<ClientProfile | null>(null);
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const [editingProfile, setEditingProfile] = useState<ClientProfile | undefined>();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
    const [profileToDelete, setProfileToDelete] = useState<ClientProfile | null>(null);
    const { toast } = useToast();
    useEffect(() => {
        loadProfiles();
    }, []);
    const loadProfiles = async () => {
        try {
            const { data, error } = await supabase
                .from('client_profiles')
                .select('*')
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            setProfiles(data || []);
        }
        catch (error) {
            console.error('Error loading profiles:', error);
            toast({
                title: 'Error',
                description: 'Failed to load client profiles',
                variant: 'destructive',
            });
        }
        finally {
            setLoading(false);
        }
    };
    const handleProfileSelect = (profile: ClientProfile) => {
        setSelectedProfile(profile);
    };
    const handleProfileEdit = (profile: ClientProfile) => {
        setEditingProfile(profile);
        setDialogOpen(true);
    };
    const handleProfileDelete = (id: number) => {
        const profileToDelete = profiles.find(p => p.id === id);
        if (profileToDelete) {
            setProfileToDelete(profileToDelete);
            setDeleteDialogOpen(true);
        }
    };
    const handleCreateProfile = () => {
        setEditingProfile(undefined);
        setDialogOpen(true);
    };
    const handleProfileSubmit = async (data: Omit<ClientProfile, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            if (editingProfile) {
                const { data: updatedProfile, error } = await supabase
                    .from('client_profiles')
                    .update(data)
                    .eq('id', editingProfile.id)
                    .select()
                    .single();
                if (error)
                    throw error;
                setProfiles(profiles.map((p: any) => p.id === editingProfile.id ? updatedProfile : p));
                toast({
                    title: 'Success',
                    description: 'Profile updated successfully',
                });
            }
            else {
                const { data: newProfile, error } = await supabase
                    .from('client_profiles')
                    .insert([data])
                    .select()
                    .single();
                if (error)
                    throw error;
                setProfiles([newProfile, ...profiles]);
                toast({
                    title: 'Success',
                    description: 'Profile created successfully',
                });
            }
            setDialogOpen(false);
        }
        catch (error) {
            console.error('Error saving profile:', error);
            toast({
                title: 'Error',
                description: 'Failed to save profile',
                variant: 'destructive',
            });
        }
    };
    const handleConfirmDelete = async () => {
        if (!profileToDelete)
            return;
        try {
            const { error } = await supabase
                .from('client_profiles')
                .delete()
                .eq('id', profileToDelete.id);
            if (error)
                throw error;
            setProfiles(profiles.filter((p: any) => p.id !== profileToDelete.id));
            toast({
                title: 'Success',
                description: 'Profile deleted successfully',
            });
        }
        catch (error) {
            console.error('Error deleting profile:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete profile',
                variant: 'destructive',
            });
        }
        finally {
            setDeleteDialogOpen(false);
            setProfileToDelete(null);
        }
    };
    return (<ErrorBoundary>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Client Profiles</h1>
          <Button onClick={handleCreateProfile}>
            <Plus className="mr-2 h-4 w-4"></Plus> Add New Profile
          </Button>
        </div>

        {loading ? (<div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile: any) => (<ClientProfileCard key={profile.id} profile={profile} onSelect={handleProfileSelect} onEdit={handleProfileEdit} onDelete={() => handleProfileDelete(profile.id)} isSelected={selectedProfile?.id === profile.id}/>))}
            {profiles.length === 0 && (<div className="col-span-full text-center py-12 text-muted-foreground">
                No client profiles found. Click "Add New Profile" to create one.
              </div>)}
          </div>)}

        <ClientProfileDialog open={dialogOpen} onOpenChange={setDialogOpen} profile={editingProfile} onSubmit={handleProfileSubmit}></ClientProfileDialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Profile</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {profileToDelete?.name}'s profile? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ErrorBoundary>);
}
