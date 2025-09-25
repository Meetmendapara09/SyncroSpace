'use client';

import { TeamManagementSystem } from '@/components/teams/team-management-system';

export default function TeamsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Teams</h1>
        <p className="text-muted-foreground">
          Manage your teams, members, and collaborative spaces
        </p>
      </div>
      <TeamManagementSystem />
    </div>
  );
}