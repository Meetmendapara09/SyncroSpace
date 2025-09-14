import { db } from '@/lib/firebase';
import { DataSync } from '@/lib/bigquery';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

// Data synchronization service to keep BigQuery updated with Firebase data
export class BigQueryDataSyncService {
  private static instance: BigQueryDataSyncService;
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  static getInstance(): BigQueryDataSyncService {
    if (!BigQueryDataSyncService.instance) {
      BigQueryDataSyncService.instance = new BigQueryDataSyncService();
    }
    return BigQueryDataSyncService.instance;
  }

  // Start automatic data synchronization
  startAutoSync(intervalMinutes: number = 60) {
    if (this.isRunning) {
      console.log('BigQuery sync is already running');
      return;
    }

    console.log(`Starting BigQuery auto-sync every ${intervalMinutes} minutes`);
    this.isRunning = true;

    // Initial sync
    this.syncAllData();

    // Set up interval
    this.syncInterval = setInterval(() => {
      this.syncAllData();
    }, intervalMinutes * 60 * 1000);
  }

  // Stop automatic data synchronization
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('BigQuery auto-sync stopped');
  }

  // Sync all data to BigQuery
  async syncAllData() {
    try {
      console.log('Starting BigQuery data sync...');
      
      await Promise.all([
        this.syncUserData(),
        this.syncMeetingData(),
        this.syncSpaceData(),
        this.syncEngagementData()
      ]);

      console.log('BigQuery data sync completed successfully');
    } catch (error) {
      console.error('BigQuery data sync failed:', error);
    }
  }

  // Sync user data to BigQuery
  private async syncUserData() {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userData = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        name: doc.data().name || '',
        email: doc.data().email || '',
        role: doc.data().role || 'user',
        lastActive: doc.data().lastActive || new Date().toISOString(),
        spacesCount: doc.data().spacesCount || 0,
        meetingsAttended: doc.data().meetingsAttended || 0,
        engagementScore: this.calculateEngagementScore(doc.data()),
        createdAt: doc.data().createdAt || new Date().toISOString()
      }));

      if (userData.length > 0) {
        await DataSync.exportUserAnalytics(userData);
        console.log(`Synced ${userData.length} users to BigQuery`);
      }
    } catch (error) {
      console.error('Failed to sync user data:', error);
    }
  }

  // Sync meeting data to BigQuery
  private async syncMeetingData() {
    try {
      const meetingsSnapshot = await getDocs(collection(db, 'meetings'));
      const meetingData = meetingsSnapshot.docs.map(doc => ({
        id: doc.id,
        spaceId: doc.data().spaceId || '',
        title: doc.data().title || '',
        durationMinutes: doc.data().durationMinutes || 30,
        participantCount: doc.data().attendees?.length || 0,
        actionItemsCount: doc.data().actionItems?.length || 0,
        effectivenessScore: this.calculateMeetingEffectiveness(doc.data()),
        type: doc.data().type || 'general',
        createdAt: doc.data().createdAt || new Date().toISOString()
      }));

      if (meetingData.length > 0) {
        await DataSync.exportMeetingAnalytics(meetingData);
        console.log(`Synced ${meetingData.length} meetings to BigQuery`);
      }
    } catch (error) {
      console.error('Failed to sync meeting data:', error);
    }
  }

  // Sync space data to BigQuery
  private async syncSpaceData() {
    try {
      const spacesSnapshot = await getDocs(collection(db, 'spaces'));
      const spaceData = spacesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || '',
        category: doc.data().category || 'general',
        memberCount: doc.data().members?.length || 0,
        activeMeetings: doc.data().activeMeeting ? 1 : 0,
        totalMeetings: doc.data().totalMeetings || 0,
        avgRating: doc.data().avgRating || 4.5,
        createdAt: doc.data().createdAt || new Date().toISOString()
      }));

      if (spaceData.length > 0) {
        await DataSync.exportSpaceAnalytics(spaceData);
        console.log(`Synced ${spaceData.length} spaces to BigQuery`);
      }
    } catch (error) {
      console.error('Failed to sync space data:', error);
    }
  }

  // Sync engagement data to BigQuery
  private async syncEngagementData() {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const engagementData = usersSnapshot.docs.map(doc => {
        const userData = doc.data();
        return {
          userId: doc.id,
          engagementScore: this.calculateEngagementScore(userData),
          lastActiveDate: userData.lastActive || new Date().toISOString(),
          spaceInteractions: userData.spacesCount || 0,
          meetingCount: userData.meetingsAttended || 0,
          avgMeetingDuration: userData.avgMeetingDuration || 30,
          activityPattern: this.determineActivityPattern(userData),
          createdAt: new Date().toISOString()
        };
      });

      if (engagementData.length > 0) {
        // Export to user engagement table
        const sql = `
          INSERT INTO \`470012.syncrospace_analytics.user_engagement\`
          (user_id, engagement_score, last_active_date, space_interactions, meeting_count, avg_meeting_duration, activity_pattern, created_at)
          VALUES ${engagementData.map(data => 
            `('${data.userId}', ${data.engagementScore}, '${data.lastActiveDate}', ${data.spaceInteractions}, ${data.meetingCount}, ${data.avgMeetingDuration}, '${data.activityPattern}', '${data.createdAt}')`
          ).join(', ')}
        `;
        
        const { executeBigQuerySQL } = await import('@/lib/bigquery');
        await executeBigQuerySQL(sql);
        console.log(`Synced ${engagementData.length} engagement records to BigQuery`);
      }
    } catch (error) {
      console.error('Failed to sync engagement data:', error);
    }
  }

  // Calculate user engagement score
  private calculateEngagementScore(userData: any): number {
    let score = 0;
    
    // Base score from user activity
    if (userData.lastActive) {
      const daysSinceActive = Math.floor((Date.now() - new Date(userData.lastActive).getTime()) / (1000 * 60 * 60 * 24));
      score += Math.max(0, 10 - daysSinceActive);
    }
    
    // Space participation score
    score += Math.min((userData.spacesCount || 0) * 2, 20);
    
    // Meeting participation score
    score += Math.min((userData.meetingsAttended || 0) * 1.5, 15);
    
    // Role-based score
    if (userData.role === 'admin') score += 10;
    
    return Math.min(score, 100);
  }

  // Calculate meeting effectiveness score
  private calculateMeetingEffectiveness(meetingData: any): number {
    let score = 5; // base score
    
    // Duration factor
    const duration = meetingData.durationMinutes || 30;
    if (duration > 60) score += 2;
    if (duration < 15) score -= 2;
    
    // Participant factor
    const participants = meetingData.attendees?.length || 0;
    if (participants > 5) score += 1;
    if (participants < 2) score -= 1;
    
    // Action items factor
    const actionItems = meetingData.actionItems?.length || 0;
    if (actionItems > 3) score += 2;
    if (actionItems === 0) score -= 1;
    
    return Math.max(1, Math.min(10, score));
  }

  // Determine user activity pattern
  private determineActivityPattern(userData: any): string {
    if (!userData.lastActive) return 'new_user';
    
    const daysSinceActive = Math.floor((Date.now() - new Date(userData.lastActive).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceActive <= 1) return 'highly_active';
    if (daysSinceActive <= 7) return 'moderately_active';
    return 'low_activity';
  }

  // Manual sync for specific data types
  async syncUsers() {
    await this.syncUserData();
  }

  async syncMeetings() {
    await this.syncMeetingData();
  }

  async syncSpaces() {
    await this.syncSpaceData();
  }

  async syncEngagement() {
    await this.syncEngagementData();
  }

  // Get sync status
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: !!this.syncInterval
    };
  }
}

// Export singleton instance
export const bigQueryDataSync = BigQueryDataSyncService.getInstance();
