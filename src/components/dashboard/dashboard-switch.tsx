'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, LayoutPanelLeft } from 'lucide-react';

export function DashboardSwitch() {
  const pathname = usePathname();
  const isCustomDashboard = pathname?.includes('customized') ?? false;
  
  return (
    <Card className="shadow-sm">
      <CardContent className="p-2">
        <Tabs defaultValue={isCustomDashboard ? "custom" : "default"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="default" asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Default
              </Link>
            </TabsTrigger>
            <TabsTrigger value="custom" asChild>
              <Link href="/dashboard/customized">
                <LayoutPanelLeft className="mr-2 h-4 w-4" />
                Customized
              </Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardContent>
    </Card>
  );
}