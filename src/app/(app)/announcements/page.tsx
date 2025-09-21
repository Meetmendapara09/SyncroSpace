'use client';

import { useState, useEffect } from 'react';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, addDoc, query, doc, getDocs, Timestamp, serverTimestamp, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { logUserActivity } from '@/lib/user-activity';

export default function AnnouncementsPage() {
  const [user] = useAuthState(auth);
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData, userDataLoading] = useDocumentData(userDocRef);
  
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [allTeams, setAllTeams] = useState<string[]>([]);
  
  const usersQuery = query(collection(db, 'users'));
  const [usersSnapshot, usersLoading, usersError] = useCollection(usersQuery);
  
  // Get all unique teams for filtering
  useEffect(() => {
    if (usersSnapshot) {
      const teams = new Set<string>();
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (Array.isArray(userData.teams)) {
          userData.teams.forEach((team: string) => teams.add(team));
        }
      });
      setAllTeams(Array.from(teams));
    }
  }, [usersSnapshot]);
  
  // Filter users based on team selection
  const filteredUsers = usersSnapshot?.docs.filter(doc => {
    const userData = doc.data();
    if (teamFilter === 'all') return true;
    return Array.isArray(userData.teams) && userData.teams.includes(teamFilter);
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredUsers) {
      setSelectedUsers(filteredUsers.map(doc => doc.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleToggleUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSendAnnouncement = async () => {
    if (!title.trim() || !message.trim() || selectedUsers.length === 0) {
      toast({
        title: 'Invalid Announcement',
        description: 'Please provide a title, message, and select at least one recipient.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSending(true);
      
      // Create the announcement document
      const announcement = {
        title,
        message,
        sender: user?.uid,
        senderName: userData?.name || user?.displayName || user?.email,
        timestamp: serverTimestamp(),
        recipients: selectedUsers
      };
      
      const announcementRef = await addDoc(collection(db, 'announcements'), announcement);
      
      // Log activity for current user
      if (user) {
        await logUserActivity(user.uid, 'sent_announcement', { 
          announcementId: announcementRef.id,
          recipientCount: selectedUsers.length
        });
      }
      
      toast({
        title: 'Announcement Sent',
        description: `Your message has been sent to ${selectedUsers.length} users.`
      });
      
      // Reset form
      setTitle('');
      setMessage('');
      setSelectedUsers([]);
      
    } catch (error: any) {
      toast({
        title: 'Failed to Send',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };
  
  // Check admin access
  if (userDataLoading) {
    return <div className="p-8">Loading...</div>;
  }
  
  if (userData?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h1 className="text-3xl font-bold text-destructive">Access Denied</h1>
        <p className="mt-2 text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Announcements & Messages</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Send Announcement</CardTitle>
            <CardDescription>
              Send a message to selected users. They will see it in their notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement Title"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your message here..."
                rows={5}
              />
            </div>
            <Button 
              onClick={handleSendAnnouncement} 
              disabled={sending || selectedUsers.length === 0 || !title || !message}
            >
              {sending ? 'Sending...' : `Send to ${selectedUsers.length} User${selectedUsers.length === 1 ? '' : 's'}`}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Select Recipients</CardTitle>
            <CardDescription>Choose users to receive your announcement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Filter by Team</Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {allTeams.map(team => (
                    <SelectItem key={team} value={team}>{team}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="mb-2 flex items-center">
              <Checkbox 
                id="selectAll"
                checked={filteredUsers?.length === selectedUsers.length && filteredUsers?.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="selectAll" className="ml-2">Select All</Label>
            </div>
            
            <div className="max-h-96 overflow-y-auto border rounded-md p-2">
              {usersLoading ? (
                <p>Loading users...</p>
              ) : filteredUsers?.length === 0 ? (
                <p>No users found.</p>
              ) : (
                <ul className="space-y-2">
                  {filteredUsers?.map(doc => {
                    const u = doc.data();
                    const isSelected = selectedUsers.includes(doc.id);
                    return (
                      <li key={doc.id} className="flex items-center">
                        <Checkbox 
                          id={doc.id}
                          checked={isSelected}
                          onCheckedChange={(checked) => handleToggleUser(doc.id, checked === true)}
                        />
                        <Label htmlFor={doc.id} className="ml-2 flex-1">
                          <span className="font-medium">{u.name || u.email}</span>
                          {u.teams && u.teams.length > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">({u.teams.join(', ')})</span>
                          )}
                        </Label>
                      </li>
                    );
                  })}
                </ul>
              )}
              {usersError && <p className="text-destructive">Error loading users: {usersError.message}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}