
'use client';

import { CheckCircle, Users, Video, Rocket, Share2, KanbanSquare, Calendar, Building, Network } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const features = [
  {
    Icon: Users,
    title: 'Customizable Virtual Spaces',
    description: 'Create unique, branded virtual environments that reflect your company culture. Arrange furniture, set up meeting rooms, and design collaborative zones.',
    details: [
      'Drag-and-drop space editor',
      'Branded assets and logos',
      'Multiple floors and room layouts',
    ],
  },
  {
    Icon: Video,
    title: 'Proximity-Based Chat',
    description: 'Experience natural, spontaneous conversations. Audio and video fade in and out as you move closer to or further from other participants, just like in real life.',
    details: [
        'High-quality, low-latency video',
        'Spatial audio for immersive sound',
        'Adjustable audio falloff range',
    ],
  },
  {
    Icon: KanbanSquare,
    title: 'Integrated Task Management',
    description: 'Keep projects on track with a built-in Kanban board and task lists. Assign tasks, set deadlines, and visualize your team\'s workflow without leaving the app.',
    details: [
        'Draggable Kanban cards',
        'Multiple views (Board and List)',
        'Milestone tracking for key deadlines',
    ],
  },
  {
    Icon: Calendar,
    title: 'Unified Team Calendar',
    description: 'Schedule meetings, plan events, and see your team\'s availability in one place. Sync with your Google Calendar to never miss a beat.',
    details: [
        'Personal and team event scheduling',
        'Google Calendar integration',
        'Clear daily and monthly views',
    ],
  },
  {
    Icon: Building,
    title: 'Company Hub',
    description: 'Build and share your company\'s culture with a dedicated space for your story, mission, and important announcements.',
    details: [
        'Admin-editable company story page',
        'Photo galleries to share memories',
        'Centralized place for company values',
    ],
  },
  {
    Icon: Network,
    title: 'SyncroSpace Connect',
    description: 'Collaborate securely with partners and clients in shared channels without giving them access to your full workspace.',
    details: [
        'Secure, isolated channels for external users',
        'Guest access to chat and tasks',
        'Maintain privacy for your internal workspace',
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          A New Dimension of Collaboration
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          SyncroSpace isn't just another tool. It's a place for your team to connect, collaborate, and create together.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <feature.Icon className="h-8 w-8 text-primary" />
                <CardTitle className="text-2xl">{feature.title}</CardTitle>
              </div>
              <CardDescription className="pt-2">{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {feature.details.map((detail) => (
                  <li key={detail} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-muted-foreground">{detail}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
