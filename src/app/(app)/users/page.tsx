
'use client';

import { useState } from 'react';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Trash2, UserX, Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { deleteUser as deleteFirebaseAuthUser, sendPasswordResetEmail } from 'firebase/auth';
import { exportUsers, exportUserDetail } from '@/lib/export-user-data';
import UserDataExportButton from '@/components/users/user-data-export-button';
import Link from 'next/link';

export default function UsersPage() {
    const [user] = useAuthState(auth);
    const userDocRef = user ? doc(db, 'users', user.uid) : null;
    const [userData, userDataLoading] = useDocumentData(userDocRef);

    const usersQuery = query(collection(db, 'users'));
    const [usersSnapshot, usersLoading, error] = useCollection(usersQuery);
    const { toast } = useToast();
    
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [alertAction, setAlertAction] = useState<'deactivate' | 'delete' | 'changeRole' | null>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedRole, setSelectedRole] = useState<'admin' | 'employee' | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const handleChangeRole = (userId: string, newRole: 'admin' | 'employee') => {
        setSelectedUser(usersSnapshot?.docs.find(doc => doc.data().uid === userId)?.data());
        setSelectedRole(newRole);
        setAlertAction('changeRole');
        setIsAlertOpen(true);
    }
    
    const handleConfirmAction = async () => {
        if (!selectedUser || !alertAction) return;

        if (alertAction === 'deactivate') {
            const userRef = doc(db, 'users', selectedUser.uid);
            await updateDoc(userRef, { deactivatedAt: new Date() });
            toast({ title: 'User Deactivated', description: `${selectedUser.name} has been deactivated.` });
        } else if (alertAction === 'delete') {
            try {
                // This is a placeholder for a server-side function, as deleting users requires admin privileges
                // not typically available on the client. In a real app, you would call a Cloud Function here.
                await deleteDoc(doc(db, 'users', selectedUser.uid));
                toast({ 
                    title: 'User Deleted (Firestore)',
                    description: `${selectedUser.name} has been deleted from Firestore. Authentication record may still exist.`,
                    variant: 'default'
                 });
            } catch (e: any) {
                 toast({ 
                    title: 'Deletion Failed',
                    description: e.message,
                    variant: 'destructive'
                 });
            }
        } else if (alertAction === 'changeRole' && selectedRole) {
            const targetUserDocRef = doc(db, 'users', selectedUser.uid);
            await updateDoc(targetUserDocRef, { role: selectedRole });
            toast({
                title: "User Role Updated",
                description: `${selectedUser.name}'s role has been changed to ${selectedRole}.`
            });
        }

        setIsAlertOpen(false);
        setSelectedUser(null);
        setAlertAction(null);
        setSelectedRole(null);
    }

    const openConfirmationDialog = (user: any, action: 'deactivate' | 'delete') => {
        setSelectedUser(user);
        setAlertAction(action);
        setIsAlertOpen(true);
    };

    const filteredUsers = usersSnapshot?.docs.filter(doc => {
        const u = doc.data();
        if (!u.name && !u.email) return false;

        const searchMatch = searchTerm === '' ||
            u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const roleMatch = roleFilter === 'all' || u.role === roleFilter;
        
        const statusMatch = statusFilter === 'all' ||
            (statusFilter === 'active' && !u.deactivatedAt) ||
            (statusFilter === 'deactivated' && u.deactivatedAt);
        
        return searchMatch && roleMatch && statusMatch;
    });

    const handleExport = () => {
        if (!filteredUsers) return;
        const result = exportUsers(filteredUsers.map(doc => doc.data()));
        if (result) {
            toast({ title: 'Export Complete', description: result });
        }
    };

    const loading = userDataLoading || usersLoading;

    if (loading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <Skeleton className="h-10 w-1/3" />
                <Card>
                    <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (userData?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8">
                <h1 className="text-3xl font-bold text-destructive">Access Denied</h1>
                <p className="mt-2 text-muted-foreground">You do not have permission to view this page.</p>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="mb-8 flex flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">
                        View, manage, and assign roles to users in your workspace.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                        </SelectContent>
                    </Select>
                     <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="deactivated">Deactivated</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto ml-auto">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </header>

            <Card>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers?.map(doc => {
                                const u = doc.data();
                                return (
                                    <TableRow key={u.uid}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={u.photoURL} alt={u.name} />
                                                    <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold">
                                                        <Link href={`/users/${u.uid}`} className="hover:underline">
                                                            {u.name}
                                                        </Link>
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">{u.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={u.role}
                                                onValueChange={(value: 'admin' | 'employee') => handleChangeRole(u.uid, value)}
                                                disabled={u.uid === user?.uid}
                                            >
                                                <SelectTrigger className="w-[120px]">
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                    <SelectItem value="employee">Employee</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={u.deactivatedAt ? 'destructive' : 'default'}>
                                                {u.deactivatedAt ? 'Deactivated' : 'Active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {u.createdAt?.toDate().toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {u.uid !== user?.uid && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">More actions</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => {
                                                          sendPasswordResetEmail(auth, u.email)
                                                            .then(() => {
                                                              toast({
                                                                title: "Password Reset Email Sent",
                                                                description: `A password reset email has been sent to ${u.email}.`
                                                              });
                                                            })
                                                            .catch((error) => {
                                                              toast({
                                                                title: "Error",
                                                                description: error.message,
                                                                variant: "destructive"
                                                              });
                                                            });
                                                        }}>
                                                            <span className="mr-2">🔑</span>
                                                            Reset Password
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openConfirmationDialog(u, 'deactivate')}>
                                                            <UserX className="mr-2 h-4 w-4" />
                                                            Deactivate
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <UserDataExportButton userId={u.uid} />
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive" onClick={() => openConfirmationDialog(u, 'delete')}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                    {error && <p className="p-4 text-center text-sm text-destructive">Error: {error.message}</p>}
                </CardContent>
            </Card>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {alertAction === 'changeRole' && `Are you sure you want to change ${selectedUser?.name}'s role to ${selectedRole}?`}
                            {alertAction === 'deactivate' && ` This will prevent ${selectedUser?.name} from logging in.`}
                            {alertAction === 'delete' && `This will permanently delete the user's data from Firestore.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleConfirmAction}
                            className={alertAction === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
                        >
                            Yes, confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
