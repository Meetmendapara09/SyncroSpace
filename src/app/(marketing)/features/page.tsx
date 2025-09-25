
'use client';

import { CheckCircle, Users, Video, Rocket, Share2, KanbanSquare, Calendar, Building, Network } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const features = [
  {
    Icon: Users,
    title: 'Customizable Virtual Spaces',
    description: 'Create unique, branded virtual environments that reflect your company culture. Arrange furniture, set up meeting rooms, and design collaborative zones with our powerful editor.',
    details: [
      'Drag-and-drop space editor with real-time updates',
      'Custom branding and personalized assets',
      'Multiple floors and intelligent room layouts',
      'Optimized for fast loading and smooth navigation',
    ],
  },
  {
    Icon: Video,
    title: 'High-Performance Chat',
    description: 'Experience natural, spontaneous conversations with our optimized communication system. Enjoy smooth video calls and instant messaging without lag or interruptions.',
    details: [
        'High-quality, low-latency video and audio',
        'Spatial audio for immersive sound experience',
        'Advanced network optimization for reliable connections',
        'Seamless transition between chat rooms and spaces',
    ],
  },
  {
    Icon: KanbanSquare,
    title: 'Integrated Task Management',
    description: 'Keep projects on track with a built-in Kanban board and task lists. Assign tasks, set deadlines, and visualize your team\'s workflow without leaving the app.',
    details: [
        'Responsive drag-and-drop Kanban interface',
        'Multiple views (Board, List, Calendar, and Gantt)',
        'Automated notifications and reminders',
        'Performance analytics and productivity tracking',
    ],
  },
  {
    Icon: Calendar,
    title: 'Unified Team Calendar',
    description: 'Schedule meetings, plan events, and see your team\'s availability in one place. Our calendar system optimizes scheduling and minimizes conflicts.',
    details: [
        'Real-time synchronization with external calendars',
        'Smart scheduling assistant with conflict detection',
        'Customizable notification preferences',
        'Timezone-aware scheduling for remote teams',
    ],
  },
  {
    Icon: Building,
    title: 'Company Hub',
    description: 'Build and share your company\'s culture with a dedicated space for your story, mission, and important announcements. Engage your team with rich media content.',
    details: [
        'Markdown-supported company story page',
        'Interactive photo galleries with analytics',
        'Rich media support for videos and presentations',
        'Customizable onboarding experience for new employees',
    ],
  },
  {
    Icon: Network,
    title: 'SyncroSpace Connect',
    description: 'Collaborate securely with partners and clients in shared channels without giving them access to your full workspace. The system maintains optimal performance even with external participants.',
    details: [
        'End-to-end encrypted channels for external users',
        'Granular permission controls for shared content',
        'Activity tracking and audit logging',
        'Fast loading for both internal and external users',
    ],
  },
  {
    Icon: Rocket,
    title: 'Performance Optimization',
    description: 'Experience lightning-fast navigation between all sections of the application. Our platform is engineered for speed and responsiveness even under heavy loads.',
    details: [
        'Optimized code splitting and lazy loading',
        'Advanced caching for frequently accessed content',
        'Efficient real-time database synchronization',
        'Background data prefetching for instant transitions',
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent animate-gradient">
          A New Dimension of Collaboration
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          SyncroSpace isn't just another tool. It's a high-performance platform designed for teams to connect, collaborate, and create together without technical limitations.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {features.map((feature) => (
          <Card key={feature.title} className="transition-all duration-300 hover:shadow-lg hover:border-primary/50 group">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <feature.Icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">{feature.title}</CardTitle>
              </div>
              <CardDescription className="pt-2">{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {feature.details.map((detail) => (
                  <li key={detail} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-muted-foreground">{detail}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to experience the difference?</h2>
        <p className="max-w-2xl mx-auto mb-6 text-muted-foreground">
          Join thousands of teams who have transformed their collaboration with our high-performance platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-primary hover:bg-primary/90">Get Started</Button>
          <Button size="lg" variant="outline">Schedule a Demo</Button>
        </div>
      </div>
    </div>
  );
}
