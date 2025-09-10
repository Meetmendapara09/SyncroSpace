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

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

You'll need to have [Node.js](https://nodejs.org/en/) (v20 or later) installed on your machine.

### Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/Meetmendapara09/SGP_Trial.git
    ```
2.  Navigate to the project directory:
    ```sh
    cd SGP_Trial
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
    
### Running the Development Server

Once you've installed the dependencies, you can run the development server:

```bash
npm run dev
```

This will start the application on `http://localhost:9002`. Open this URL in your browser to see the application in action.

## 🛠️ Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
-   **Database & Auth**: [Firebase](https://firebase.google.com/)
-   **Real-time Whiteboard**: [Excalidraw](https://excalidraw.com/)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **Generative AI**: [Google AI & Genkit](https://firebase.google.com/docs/genkit)
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
-   **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

Thank you for checking out SyncroSpace! We're excited to see how you use it to bring your team closer together.
