
import Link from 'next/link';

function AppLogo() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 text-primary"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
      </svg>
    );
  }

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
       <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <AppLogo />
            <span className="text-lg font-semibold">SyncroSpace</span>
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <div className="container mx-auto max-w-4xl py-12">
            <article className="prose dark:prose-invert">
                {children}
            </article>
        </div>
      </main>
      <footer className="border-t bg-muted/50 py-6">
        <div className="container text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} SyncroSpace. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
