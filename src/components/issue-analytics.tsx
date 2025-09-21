import { useEffect, useState } from 'react';
import { issuesCollection } from '../lib/jira-firebase';
import { Issue } from '../models/jira';
import { getDocs } from 'firebase/firestore';

export default function IssueAnalytics() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIssues() {
      setLoading(true);
      const snapshot = await getDocs(issuesCollection);
      setIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Issue)));
      setLoading(false);
    }
    fetchIssues();
  }, []);

  const statusCounts = issues.reduce((acc, issue) => {
    acc[issue.status] = (acc[issue.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Issue Analytics</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <h3 className="font-semibold mb-2">Issue Status Counts</h3>
          <ul>
            {Object.entries(statusCounts).map(([status, count]) => (
              <li key={status} className="mb-1">{status}: {count}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
