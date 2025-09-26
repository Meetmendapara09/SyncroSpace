# SyncroSpace - Your Team's Digital Headquarters

Welcome to SyncroSpace, an all-in-one virtual collaboration platform designed for remote-first teams. SyncroSpace brings the serendipitous interactions of a physical office into a dynamic digital environment, helping teams connect, collaborate, and build culture from anywhere in the world.

## ✨ Key Features

-   **Customizable Virtual Spaces**: Build your own virtual office with drag-and-drop ease.
-   **Proximity-Based Video Chat**: Experience natural, spontaneous conversations as you move around the space.
-   **Integrated Task Management**: Keep projects on track with built-in Kanban boards and task lists.
-   **Real-Time Collaborative Whiteboard**: Brainstorm and sketch out ideas together in real-time with Excalidraw.
-   **AI-Powered Assistant**: Get smart suggestions, meeting summaries, and more from our integrated AI.
-   **Team & Company Hubs**: A centralized place for team calendars, company stories, and announcements.
-   **SyncroSpace Connect**: Collaborate securely with external partners in dedicated channels.
-   **🤖 BigQuery AI Integration**: Advanced analytics and insights powered by Google's generative AI.
-   **📊 Team Analytics System**: Track and analyze team performance with customizable metrics and dashboards.
-   **🎯 Team Goals & OKRs**: Set, monitor, and achieve team objectives with integrated key results tracking.
-   **👋 Onboarding Workflows**: Create customized onboarding experiences for new team members.

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

You'll need to have [Node.js](https://nodejs.org/en/) (v20 or later) installed on your machine.

### Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/Meetmendapara09/SyncroSpace.git
    ```
2.  Navigate to the project directory:
    ```sh
    cd SyncroSpace
    ```
3.  Install NPM packages:
    ```sh
    npm install
    ```
4.  Set up your environment variables by creating a `.env` file in the root of the project and adding your Firebase configuration keys:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
    NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
    ```
    
## 🔐 Team Management Features

SyncroSpace offers comprehensive team management capabilities:

### Core Team Features
- **Team Creation & Management**: Create and manage teams with customizable settings
- **Member Roles & Permissions**: Define roles with granular permission controls
- **Team Resources**: Manage team resources with allocation tracking

### Team Communication
- **Channels**: Create topic-based communication channels
- **Direct Messaging**: Private messaging between team members
- **File Sharing**: Secure file sharing within the team

### Task Management
- **Task Creation & Assignment**: Create, assign, and track tasks
- **Task Comments**: Collaborate on tasks with threaded comments
- **Task Checklists**: Break down tasks into actionable items
- **Task Dependencies**: Manage relationships between tasks

### Goal Tracking
- **OKR Framework**: Set Objectives and Key Results for the team
- **Progress Tracking**: Automatic calculation of goal completion percentages
- **Goal Alignment**: Link goals to parent objectives

### Team Analytics
- **Activity Metrics**: Track team activity and engagement
- **Performance Metrics**: Measure team performance against goals
- **Resource Utilization**: Monitor resource allocation and usage
- **Custom Reports**: Generate custom analytics reports

### Onboarding System
- **Custom Workflows**: Create personalized onboarding journeys
- **Step-by-Step Guidance**: Guide new members through onboarding steps
- **Resource Links**: Provide relevant resources for each step
- **Progress Tracking**: Monitor onboarding completion

### Running the Development Server

Once you've installed the dependencies, you can run the development server:

```bash
npm run dev
```

This will start the application on `http://localhost:9002`. Open this URL in your browser to see the application in action.

## 🤖 BigQuery AI Integration

SyncroSpace now includes advanced AI-powered analytics using Google BigQuery's generative AI functions:

### Features
- **Hyper-Personalized Marketing Engine**: Generate unique content for every user based on their behavior patterns
- **Executive Insights Dashboard**: Automatically transform raw data into actionable business insights
- **User Engagement Forecasting**: Predict future user engagement and behavior patterns
- **Enhanced Meeting Analytics**: AI-powered meeting effectiveness scoring and categorization
- **Smart Space Recommendations**: Intelligent suggestions for optimal team collaboration

### Setup BigQuery AI Features

1. **Initialize BigQuery Setup**:
   ```bash
   npm run bigquery:setup
   ```

2. **Test the Integration**:
   ```bash
   npm run bigquery:test
   ```

3. **Sync Your Data**:
   ```bash
   npm run bigquery:sync
   ```

4. **Start Auto-Sync** (optional):
   ```bash
   npm run bigquery:sync start 60  # Sync every 60 minutes
   ```

### BigQuery AI Functions Used
- `ML.GENERATE_TEXT`: Personalized content generation
- `AI.GENERATE_TABLE`: Executive insights and summaries
- `AI.FORECAST`: User engagement prediction
- `AI.GENERATE_INT`: Meeting effectiveness scoring
- `AI.GENERATE_BOOL`: Meeting categorization
- `AI.GENERATE`: Space recommendations

For detailed setup instructions, see [BigQuery Setup Guide](docs/bigquery-setup-guide.md).

## 🛠️ Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
-   **Database & Auth**: [Firebase](https://firebase.google.com/)
-   **Real-time Whiteboard**: [Excalidraw](https://excalidraw.com/)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **Generative AI**: [Google AI & Genkit](https://firebase.google.com/docs/genkit)
-   **Advanced Analytics**: [Google BigQuery AI](https://cloud.google.com/bigquery/docs/generative-ai)
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
-   **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

## 📊 Analytics & Insights

The platform includes comprehensive analytics powered by BigQuery AI:

- **Real-time User Engagement**: Track and predict user behavior patterns
- **Meeting Effectiveness**: AI-scored meeting quality and categorization
- **Executive Dashboards**: Automated business insights and recommendations
- **Personalized Content**: AI-generated marketing and engagement content
- **Space Optimization**: Intelligent recommendations for team collaboration

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run bigquery:setup` - Initialize BigQuery AI features
- `npm run bigquery:test` - Test BigQuery integration
- `npm run bigquery:sync` - Sync data to BigQuery

Thank you for checking out SyncroSpace! We're excited to see how you use it to bring your team closer together with the power of AI-driven insights.
