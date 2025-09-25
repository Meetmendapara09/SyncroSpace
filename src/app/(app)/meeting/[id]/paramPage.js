// This file exists solely to provide static parameters for Next.js static export
// It's separate from the page component to avoid conflicts with 'use client'

export function generateStaticParams() {
  return [
    { id: ['demo-1', 'demo-2', 'demo-3'] },
  ];
}
