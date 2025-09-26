// Static export configuration for dynamic route
export const dynamic = 'error';

export function generateStaticParams() {
  // Return empty array - no static params needed for spaces
  return [];
}

export default function Layout({ children }) {
  return children;
}
