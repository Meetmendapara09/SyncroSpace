import { useEffect, useState } from 'react';
import { commentsCollection, attachmentsCollection } from '../lib/jira-firebase';
import { Comment, Attachment } from '../models/jira';
import { getDocs, addDoc } from 'firebase/firestore';

export default function CommentsAttachments({ issueId }: { issueId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const commentSnap = await getDocs(commentsCollection);
      setComments(commentSnap.docs.filter(doc => doc.data().issueId === issueId).map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
      const attachmentSnap = await getDocs(attachmentsCollection);
      setAttachments(attachmentSnap.docs.filter(doc => doc.data().issueId === issueId).map(doc => ({ id: doc.id, ...doc.data() } as Attachment)));
      setLoading(false);
    }
    fetchData();
  }, [issueId]);

  async function handleAddComment() {
    await addDoc(commentsCollection, {
      issueId,
      author: 'currentUser', // Replace with actual user
      content: newComment,
      createdAt: Date.now(),
    });
    setNewComment('');
    const commentSnap = await getDocs(commentsCollection);
    setComments(commentSnap.docs.filter(doc => doc.data().issueId === issueId).map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
  }

  // Attachment upload logic would use Firebase Storage, not Firestore

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-2">Comments</h3>
      <div className="mb-2">
        <input
          type="text"
          placeholder="Add a comment"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          className="border p-2 mr-2"
        />
        <button onClick={handleAddComment} className="bg-blue-500 text-white px-4 py-2">Add Comment</button>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {comments.map(comment => (
            <li key={comment.id} className="border p-2 mb-2">
              <strong>{comment.author}</strong>: {comment.content}
            </li>
          ))}
        </ul>
      )}
      <h3 className="font-semibold mt-4 mb-2">Attachments</h3>
      <ul>
        {attachments.map(att => (
          <li key={att.id} className="border p-2 mb-2">
            <a href={att.url} target="_blank" rel="noopener noreferrer">Attachment</a> by {att.uploadedBy}
          </li>
        ))}
      </ul>
      {/* Add file upload UI for attachments here */}
    </div>
  );
}
