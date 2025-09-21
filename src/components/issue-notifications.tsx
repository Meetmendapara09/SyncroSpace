import { useEffect, useState } from 'react';
import { issuesCollection } from '../lib/jira-firebase';
import { Issue } from '../models/jira';
import { getDocs } from 'firebase/firestore';

export default function IssueNotifications({ currentUserId }: { currentUserId: string }) {
  const [assignedIssues, setAssignedIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAssignedIssues() {
      setLoading(true);
      const snapshot = await getDocs(issuesCollection);
      const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Issue));
      setAssignedIssues(issues.filter(issue => issue.assignee === currentUserId));
      setLoading(false);
    }
    fetchAssignedIssues();
  }, [currentUserId]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Assigned Task Notifications</h2>
      {loading ? (
        <div>Loading...</div>
      ) : assignedIssues.length === 0 ? (
        <div>No tasks assigned to you.</div>
      ) : (
        <ul>
          {assignedIssues.map(issue => (
            <li key={issue.id} className="border p-2 mb-2">
              <strong>{issue.title}</strong> - {issue.description} <span className="text-xs">[{issue.status}]</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
