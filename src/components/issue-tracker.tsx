import { useEffect, useState } from 'react';
import { issuesCollection } from '../lib/jira-firebase';
import { Issue } from '../models/jira';
import { getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export default function IssueTracker() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIssue, setNewIssue] = useState({ title: '', description: '' });

  useEffect(() => {
    async function fetchIssues() {
      setLoading(true);
      const snapshot = await getDocs(issuesCollection);
      setIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Issue)));
      setLoading(false);
    }
    fetchIssues();
  }, []);

  async function handleCreateIssue() {
    await addDoc(issuesCollection, {
      title: newIssue.title,
      description: newIssue.description,
      status: 'todo',
      assignee: '',
      reporter: 'currentUser', // Replace with actual user
      projectId: '',
      boardId: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setNewIssue({ title: '', description: '' });
    // Refresh issues
    const snapshot = await getDocs(issuesCollection);
    setIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Issue)));
  }

  async function handleUpdateIssue(id: string, status: Issue['status']) {
    const issueRef = doc(issuesCollection, id);
    await updateDoc(issueRef, { status, updatedAt: Date.now() });
    const snapshot = await getDocs(issuesCollection);
    setIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Issue)));
  }

  async function handleDeleteIssue(id: string) {
    const issueRef = doc(issuesCollection, id);
    await deleteDoc(issueRef);
    setIssues(issues.filter(issue => issue.id !== id));
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Issue Tracker</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Title"
          value={newIssue.title}
          onChange={e => setNewIssue({ ...newIssue, title: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="text"
          placeholder="Description"
          value={newIssue.description}
          onChange={e => setNewIssue({ ...newIssue, description: e.target.value })}
          className="border p-2 mr-2"
        />
        <button onClick={handleCreateIssue} className="bg-blue-500 text-white px-4 py-2">Create Issue</button>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {issues.map(issue => (
            <li key={issue.id} className="border p-2 mb-2 flex justify-between items-center">
              <div>
                <strong>{issue.title}</strong> - {issue.description} <span className="text-xs">[{issue.status}]</span>
              </div>
              <div>
                <button onClick={() => handleUpdateIssue(issue.id, 'in-progress')} className="bg-yellow-500 text-white px-2 py-1 mr-2">In Progress</button>
                <button onClick={() => handleUpdateIssue(issue.id, 'done')} className="bg-green-500 text-white px-2 py-1 mr-2">Done</button>
                <button onClick={() => handleDeleteIssue(issue.id)} className="bg-red-500 text-white px-2 py-1">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
