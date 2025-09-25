// Static export configuration for dynamic route
export const dynamic = 'error';

export function generateStaticParams() {
  // Return static parameters for build
  return [
    { id: 'demo-1' },
    { id: 'demo-2' },
    { id: 'demo-3' },
  ];
}

export default function Layout({ children }) {
  return children;
}
