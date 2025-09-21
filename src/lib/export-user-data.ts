import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

// Export users list to CSV with additional fields
export function exportUsers(filteredUsers: any[]) {
  if (!filteredUsers?.length) return;
  
  const headers = [
    'UID', 'Name', 'Email', 'Role', 'Status', 'Joined Date',
    'Teams/Projects', 'Bio', 'Last Active', 'Activity Log Count'
  ];
  
  const rows = [];
  
  for (const u of filteredUsers) {
    // Format teams as a string
    const teamsStr = Array.isArray(u.teams) ? u.teams.join('; ') : '';
    
    // Format last active date
    const lastActive = u.lastActive?.toDate ? u.lastActive.toDate().toISOString() : '';
    
    // Count activity logs
    const activityCount = Array.isArray(u.activityLog) ? u.activityLog.length : 0;
    
    rows.push([
      `"${u.uid || ''}"`,
      `"${u.name || ''}"`,
      `"${u.email || ''}"`,
      `"${u.role || ''}"`,
      `"${u.deactivatedAt ? 'Deactivated' : 'Active'}"`,
      `"${u.createdAt?.toDate ? u.createdAt.toDate().toISOString() : ''}"`,
      `"${teamsStr}"`,
      `"${u.bio || ''}".replace(/"/g, '""')`,
      `"${lastActive}"`,
      `"${activityCount}"`,
    ].join(','));
  }
  
  // Create and download CSV
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `syncrospace_users_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  return `${rows.length} user records exported with detailed information.`;
}

// Export a single user's complete data including full activity logs
export async function exportUserDetail(userId: string) {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnapshot = await getDoc(userDocRef);
    
    if (!userSnapshot.exists()) {
      return { success: false, message: 'User not found' };
    }
    
    const userData = userSnapshot.data();
    
    // Create a detailed JSON export
    const exportData = {
      profile: {
        uid: userData.uid || '',
        name: userData.name || '',
        email: userData.email || '',
        role: userData.role || '',
        status: userData.deactivatedAt ? 'Deactivated' : 'Active',
        createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate().toISOString() : null,
        lastActive: userData.lastActive?.toDate ? userData.lastActive.toDate().toISOString() : null,
        bio: userData.bio || '',
        teams: userData.teams || []
      },
      activityLog: userData.activityLog || []
    };
    
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `user_${userData.uid}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return { success: true, message: 'Complete user details exported as JSON.' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}