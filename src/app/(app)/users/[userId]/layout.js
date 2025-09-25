// Static export configuration for dynamic route
export const dynamic = 'error';

export function generateStaticParams() {
  // Return static parameters for build
  return [
    { userId: 'demo-1' },
    { userId: 'demo-2' },
    { userId: 'demo-3' },
  ];
}

export default function Layout({ children }) {
  return children;
}
