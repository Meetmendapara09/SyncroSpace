import { DashboardSwitch } from '@/components/dashboard/dashboard-switch';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export default function DashboardHeader() {
  return (
    <div>
      <div className="fixed top-24 right-8 z-10">
        <ThemeToggle />
      </div>
      <div className="mb-6">
        <DashboardSwitch />
      </div>
    </div>
  );
}