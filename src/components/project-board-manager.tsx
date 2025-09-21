import { useEffect, useState } from 'react';
import { boardsCollection, projectsCollection } from '../lib/jira-firebase';
import { Board, Project } from '../models/jira';
import { getDocs, addDoc } from 'firebase/firestore';

export default function ProjectBoardManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [newBoard, setNewBoard] = useState({ name: '', type: 'kanban', projectId: '' });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const projectSnap = await getDocs(projectsCollection);
      setProjects(projectSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
      const boardSnap = await getDocs(boardsCollection);
      setBoards(boardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board)));
      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleCreateProject() {
    await addDoc(projectsCollection, {
      name: newProject.name,
      description: newProject.description,
      owner: 'currentUser', // Replace with actual user
      members: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setNewProject({ name: '', description: '' });
    const projectSnap = await getDocs(projectsCollection);
    setProjects(projectSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
  }

  async function handleCreateBoard() {
    await addDoc(boardsCollection, {
      name: newBoard.name,
      type: newBoard.type,
      projectId: newBoard.projectId,
      columns: ['todo', 'in-progress', 'done'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setNewBoard({ name: '', type: 'kanban', projectId: '' });
    const boardSnap = await getDocs(boardsCollection);
    setBoards(boardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board)));
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Project & Board Manager</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Project Name"
          value={newProject.name}
          onChange={e => setNewProject({ ...newProject, name: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="text"
          placeholder="Description"
          value={newProject.description}
          onChange={e => setNewProject({ ...newProject, description: e.target.value })}
          className="border p-2 mr-2"
        />
        <button onClick={handleCreateProject} className="bg-blue-500 text-white px-4 py-2">Create Project</button>
      </div>
      <div className="mb-4">
        <select
          value={newBoard.projectId}
          onChange={e => setNewBoard({ ...newBoard, projectId: e.target.value })}
          className="border p-2 mr-2"
        >
          <option value="">Select Project</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Board Name"
          value={newBoard.name}
          onChange={e => setNewBoard({ ...newBoard, name: e.target.value })}
          className="border p-2 mr-2"
        />
        <select
          value={newBoard.type}
          onChange={e => setNewBoard({ ...newBoard, type: e.target.value })}
          className="border p-2 mr-2"
        >
          <option value="kanban">Kanban</option>
          <option value="scrum">Scrum</option>
        </select>
        <button onClick={handleCreateBoard} className="bg-green-500 text-white px-4 py-2">Create Board</button>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <h3 className="font-semibold">Projects</h3>
          <ul>
            {projects.map(project => (
              <li key={project.id} className="border p-2 mb-2">{project.name} - {project.description}</li>
            ))}
          </ul>
          <h3 className="font-semibold mt-4">Boards</h3>
          <ul>
            {boards.map(board => (
              <li key={board.id} className="border p-2 mb-2">{board.name} ({board.type}) - Project: {board.projectId}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
