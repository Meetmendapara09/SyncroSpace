// This file exists solely to provide static parameters for Next.js static export
// It's separate from the page component to avoid conflicts with 'use client'

export function generateStaticParams() {
  return [
    { userId: ['user1', 'user2', 'user3', 'user4', 'user5'] },
  ];
}
