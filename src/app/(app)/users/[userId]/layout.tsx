// Required for static export with dynamic routes
export const dynamic = 'error';

export default function DynamicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
