import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <AppSidebar />
        <div className="flex flex-col transition-all duration-300 ease-linear peer-data-[state=expanded]:md:ml-[16rem]">
          <AppHeader />
          <main className="flex-1 bg-background p-4 md:p-6">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}