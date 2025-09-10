
'use client';

import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '../ui/skeleton';
import { Task, TaskStatus } from './kanban-board';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';

const statusVariant: { [key in TaskStatus]: "default" | "secondary" | "destructive" } = {
    'todo': 'secondary',
    'in-progress': 'default',
    'done': 'destructive'
}


export function TaskList() {
    const [tasksSnapshot, loading, error] = useCollection(
        query(collection(db, 'tasks'), orderBy('createdAt', 'desc'))
    );

    const tasks = tasksSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[] | undefined;
    
    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
        )
    }

    if (error) {
        return <p className="text-destructive">Error: {error.message}</p>
    }

    return (
        <div className="rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead className="w-[150px]">Status</TableHead>
                        <TableHead className="w-[200px]">Created</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tasks && tasks.length > 0 ? (
                        tasks.map(task => (
                            <TableRow key={task.id}>
                                <TableCell className="font-medium">{task.title}</TableCell>
                                <TableCell>
                                    <Badge variant={statusVariant[task.status] || 'secondary'}>
                                        {task.status.replace('-', ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {task.createdAt?.toDate().toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                No tasks found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
