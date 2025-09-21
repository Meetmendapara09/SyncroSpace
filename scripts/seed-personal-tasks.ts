'use strict';

import { db, auth } from '../src/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { TaskStatus, TaskPriority } from '../src/components/tasks/task-types';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { config } from 'dotenv';

// Load environment variables
config();

const EMAIL = process.env.ADMIN_EMAIL || '';
const PASSWORD = process.env.ADMIN_PASSWORD || '';

// Define example tasks
const exampleTasks = [
  {
    title: 'Prepare project presentation',
    description: 'Create slides for the upcoming quarterly review meeting',
    status: 'todo' as TaskStatus,
    priority: 'high' as TaskPriority,
    progress: 20,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    tags: ['presentation', 'quarterly review'],
    isMilestone: false,
  },
  {
    title: 'Research competitor products',
    description: 'Analyze key features and pricing strategies of main competitors',
    status: 'in-progress' as TaskStatus,
    priority: 'medium' as TaskPriority,
    progress: 60,
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    tags: ['research', 'competition'],
    isMilestone: false,
  },
  {
    title: 'Update personal development plan',
    description: 'Review skills matrix and set learning objectives for next quarter',
    status: 'todo' as TaskStatus,
    priority: 'low' as TaskPriority,
    progress: 0,
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    tags: ['career', 'learning'],
    isMilestone: false,
  },
  {
    title: 'Complete security training',
    description: 'Finish required cybersecurity awareness course',
    status: 'in-progress' as TaskStatus,
    priority: 'high' as TaskPriority,
    progress: 75,
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
    tags: ['training', 'security'],
    isMilestone: false,
  },
  {
    title: 'Review client feedback',
    description: 'Analyze recent customer satisfaction surveys and identify improvement areas',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    progress: 0,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    tags: ['feedback', 'customer'],
    isMilestone: false,
  },
  {
    title: 'Q3 Performance Review',
    description: 'Major milestone for quarterly performance evaluation',
    status: 'on-hold' as TaskStatus,
    priority: 'urgent' as TaskPriority,
    progress: 30,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    tags: ['review', 'performance'],
    isMilestone: true,
  },
  {
    title: 'Write documentation for API',
    description: 'Create comprehensive documentation for the new REST API endpoints',
    status: 'todo' as TaskStatus,
    priority: 'high' as TaskPriority,
    progress: 10,
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    tags: ['documentation', 'api'],
    isMilestone: false,
  },
  {
    title: 'Update personal profile',
    description: 'Update skills and information on company directory',
    status: 'done' as TaskStatus,
    priority: 'low' as TaskPriority,
    progress: 100,
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    tags: ['profile', 'personal'],
    isMilestone: false,
  },
];

// Sample time entries (for tasks that have progress)
const createSampleTimeEntries = (progress: number) => {
  if (progress === 0) return { timeEntries: [], totalTime: 0 };
  
  const timeEntries = [];
  const now = new Date();
  
  // Create between 1-5 time entries depending on progress
  const entriesCount = Math.max(1, Math.floor(progress / 20));
  let totalTime = 0;
  
  for (let i = 0; i < entriesCount; i++) {
    const startTime = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000 - Math.random() * 3600000);
    const durationInSeconds = Math.floor(Math.random() * 7200) + 1800; // Between 30 min and 2.5 hours
    const endTime = new Date(startTime.getTime() + durationInSeconds * 1000);
    
    timeEntries.push({
      startTime: Timestamp.fromDate(startTime),
      endTime: Timestamp.fromDate(endTime),
      duration: durationInSeconds,
      description: `Work session ${i + 1}`
    });
    
    totalTime += durationInSeconds;
  }
  
  return {
    timeEntries,
    totalTime
  };
};

// Seed data function
async function seedPersonalTasks() {
  if (!EMAIL || !PASSWORD) {
    console.error('Please set ADMIN_EMAIL and ADMIN_PASSWORD environment variables');
    process.exit(1);
  }

  try {
    // Sign in
    const userCredential = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
    const userId = userCredential.user.uid;
    console.log(`Signed in as ${EMAIL} with UID: ${userId}`);
    
    // Add tasks
    let successCount = 0;
    
    for (const task of exampleTasks) {
      // Create time tracking data if task has progress
      const timeTracking = createSampleTimeEntries(task.progress);
      
      const taskData = {
        userId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        progress: task.progress,
        dueDate: Timestamp.fromDate(task.dueDate),
        tags: task.tags,
        isMilestone: task.isMilestone,
        timeTracking: {
          totalTime: timeTracking.totalTime || 0,
          timeEntries: timeTracking.timeEntries || [],
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'personalTasks'), taskData);
      console.log(`Added task: ${task.title} with ID: ${docRef.id}`);
      successCount++;
    }
    
    console.log(`Successfully added ${successCount} of ${exampleTasks.length} tasks`);
    
    // We don't sign out, as Firebase will handle the cleanup on process exit
  } catch (error) {
    console.error('Error seeding personal tasks:', error);
    process.exit(1);
  }
}

// Run the seed function
seedPersonalTasks();