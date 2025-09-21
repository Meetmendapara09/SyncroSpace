'use client';

import * as React from 'react';
import { Widget } from '@/components/dashboard/widget';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, query, where, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Users, FolderKanban, Clock, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDashboardPreferences } from '@/hooks/use-dashboard-preferences';
import { cn } from '@/lib/utils';

interface FavoritesWidgetProps {
  id: string;
  size: 'small' | 'medium' | 'large' | 'full';
  title: string;
  isEditing: boolean;
  isMoving: boolean;
  onRemove: (id: string) => void;
  onSizeChange?: (id: string, size: string) => void;
}

export function FavoritesWidget({
  id,
  size,
  title,
  isEditing,
  isMoving,
  onRemove,
  onSizeChange,
}: FavoritesWidgetProps) {
  const [user] = useAuthState(auth);
  const [tab, setTab] = React.useState<'teams' | 'projects'>('teams');
  const [searchQuery, setSearchQuery] = React.useState('');
  const { 
    preferences, 
    updatePreference,
    loading: preferencesLoading 
  } = useDashboardPreferences();
  
  // Get user document
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData, userLoading] = useDocumentData(userDocRef);
  
  // Get teams
  const teamsQuery = user ? 
    query(
      collection(db, 'teams'),
      where('members', 'array-contains', user.uid)
    ) : null;
    
  const [teamsSnapshot, teamsLoading] = useCollection(teamsQuery);
  
  // Get projects
  const projectsQuery = user ? 
    query(
      collection(db, 'projects'),
      where('members', 'array-contains', user.uid)
    ) : null;
    
  const [projectsSnapshot, projectsLoading] = useCollection(projectsQuery);
  
  // Extract teams and projects
  const teams = React.useMemo(() => {
    if (!teamsSnapshot) return [];
    return teamsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }, [teamsSnapshot]);
  
  const projects = React.useMemo(() => {
    if (!projectsSnapshot) return [];
    return projectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }, [projectsSnapshot]);
  
  // Filter teams and projects by search query
  const filteredTeams = React.useMemo(() => {
    if (!searchQuery) return teams;
    return teams.filter((team: any) => 
      team.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      team.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [teams, searchQuery]);
  
  const filteredProjects = React.useMemo(() => {
    if (!searchQuery) return projects;
    return projects.filter((project: any) => 
      project.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);
  
  // Check if team/project is favorited
  const isTeamFavorited = (teamId: string) => {
    return preferences.favoriteTeams.includes(teamId);
  };
  
  const isProjectFavorited = (projectId: string) => {
    return preferences.favoriteProjects.includes(projectId);
  };
  
  // Toggle favorite status
  const toggleFavoriteTeam = async (teamId: string) => {
    try {
      if (isTeamFavorited(teamId)) {
        // Remove from favorites
        const updatedFavorites = preferences.favoriteTeams.filter(id => id !== teamId);
        await updatePreference('favoriteTeams', updatedFavorites);
      } else {
        // Add to favorites
        const updatedFavorites = [...preferences.favoriteTeams, teamId];
        await updatePreference('favoriteTeams', updatedFavorites);
      }
    } catch (error) {
      console.error('Error updating favorite teams:', error);
    }
  };
  
  const toggleFavoriteProject = async (projectId: string) => {
    try {
      if (isProjectFavorited(projectId)) {
        // Remove from favorites
        const updatedFavorites = preferences.favoriteProjects.filter(id => id !== projectId);
        await updatePreference('favoriteProjects', updatedFavorites);
      } else {
        // Add to favorites
        const updatedFavorites = [...preferences.favoriteProjects, projectId];
        await updatePreference('favoriteProjects', updatedFavorites);
      }
    } catch (error) {
      console.error('Error updating favorite projects:', error);
    }
  };
  
  const loading = userLoading || teamsLoading || projectsLoading || preferencesLoading;

  return (
    <Widget
      id={id}
      type="favorites"
      title={title}
      size={size}
      isEditing={isEditing}
      isMoving={isMoving}
      onRemove={onRemove}
      onSizeChange={onSizeChange}
    >
      <Tabs value={tab} onValueChange={(value) => setTab(value as any)} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="teams" className="flex-1">
            <Users className="h-4 w-4 mr-2" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex-1">
            <FolderKanban className="h-4 w-4 mr-2" />
            Projects
          </TabsTrigger>
        </TabsList>

        <div className="relative mt-4 mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${tab === 'teams' ? 'teams' : 'projects'}...`}
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <TabsContent value="teams" className="space-y-4">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            ))
          ) : filteredTeams.length > 0 ? (
            <>
              {/* Favorited teams first */}
              {filteredTeams.filter((team: any) => isTeamFavorited(team.id)).map((team: any) => (
                <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg bg-primary/5">
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Users className="h-3 w-3 mr-1" />
                      {team.members?.length || 0} members
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-yellow-500 hover:text-yellow-600"
                    onClick={() => toggleFavoriteTeam(team.id)}
                  >
                    <Star className="h-4 w-4 fill-current" />
                  </Button>
                </div>
              ))}
              
              {/* Non-favorited teams */}
              {filteredTeams.filter((team: any) => !isTeamFavorited(team.id)).map((team: any) => (
                <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Users className="h-3 w-3 mr-1" />
                      {team.members?.length || 0} members
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-yellow-500"
                    onClick={() => toggleFavoriteTeam(team.id)}
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No teams found</p>
              {searchQuery && <p className="text-xs mt-1">Try a different search term</p>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            ))
          ) : filteredProjects.length > 0 ? (
            <>
              {/* Favorited projects first */}
              {filteredProjects.filter((project: any) => isProjectFavorited(project.id)).map((project: any) => (
                <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg bg-primary/5">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{project.name}</p>
                      <Badge variant="outline" className={cn(
                        project.status === 'active' && 'bg-green-100 text-green-700 border-green-200',
                        project.status === 'on-hold' && 'bg-amber-100 text-amber-700 border-amber-200',
                        project.status === 'completed' && 'bg-blue-100 text-blue-700 border-blue-200'
                      )}>
                        {project.status}
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {project.deadline && new Date(project.deadline.seconds * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-yellow-500 hover:text-yellow-600"
                    onClick={() => toggleFavoriteProject(project.id)}
                  >
                    <Star className="h-4 w-4 fill-current" />
                  </Button>
                </div>
              ))}
              
              {/* Non-favorited projects */}
              {filteredProjects.filter((project: any) => !isProjectFavorited(project.id)).map((project: any) => (
                <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{project.name}</p>
                      <Badge variant="outline" className={cn(
                        project.status === 'active' && 'bg-green-100 text-green-700 border-green-200',
                        project.status === 'on-hold' && 'bg-amber-100 text-amber-700 border-amber-200',
                        project.status === 'completed' && 'bg-blue-100 text-blue-700 border-blue-200'
                      )}>
                        {project.status}
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {project.deadline && new Date(project.deadline.seconds * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-yellow-500"
                    onClick={() => toggleFavoriteProject(project.id)}
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No projects found</p>
              {searchQuery && <p className="text-xs mt-1">Try a different search term</p>}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Widget>
  );
}