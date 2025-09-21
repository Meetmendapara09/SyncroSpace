'use client';

import * as React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Settings2 } from "lucide-react";
import { useDashboardPreferences } from '@/hooks/use-dashboard-preferences';
import { toast } from '@/hooks/use-toast';

interface DashboardSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const appearanceFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"], {
    required_error: "Please select a theme.",
  }),
  compactView: z.boolean().default(false),
});

const contentFormSchema = z.object({
  showActiveMeetings: z.boolean().default(true),
  showNotifications: z.boolean().default(true),
});

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;
type ContentFormValues = z.infer<typeof contentFormSchema>;

export function DashboardSettingsDialog({ 
  open, 
  onOpenChange 
}: DashboardSettingsDialogProps) {
  const [activeTab, setActiveTab] = React.useState("appearance");
  const { 
    preferences, 
    loading, 
    updatePreference, 
    updateAllPreferences,
    resetPreferences 
  } = useDashboardPreferences();

  // Create form instances
  const appearanceForm = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      theme: preferences.theme as "light" | "dark" | "system",
      compactView: preferences.compactView,
    },
  });

  const contentForm = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
      showActiveMeetings: preferences.showActiveMeetings,
      showNotifications: preferences.showNotifications,
    },
  });

  // Update form values when preferences load
  React.useEffect(() => {
    if (!loading) {
      appearanceForm.reset({
        theme: preferences.theme as "light" | "dark" | "system",
        compactView: preferences.compactView,
      });
      
      contentForm.reset({
        showActiveMeetings: preferences.showActiveMeetings,
        showNotifications: preferences.showNotifications,
      });
    }
  }, [preferences, loading, appearanceForm, contentForm]);

  // Submit handlers
  const onAppearanceSubmit = async (data: AppearanceFormValues) => {
    try {
      await updateAllPreferences({
        theme: data.theme,
        compactView: data.compactView,
      });
      
      toast({
        title: "Appearance updated",
        description: "Your dashboard appearance preferences have been saved.",
      });
    } catch (error) {
      console.error("Error updating appearance settings:", error);
      toast({
        variant: "destructive",
        title: "Failed to save preferences",
        description: "Please try again later.",
      });
    }
  };

  const onContentSubmit = async (data: ContentFormValues) => {
    try {
      await updateAllPreferences({
        showActiveMeetings: data.showActiveMeetings,
        showNotifications: data.showNotifications,
      });
      
      toast({
        title: "Content preferences updated",
        description: "Your dashboard content preferences have been saved.",
      });
    } catch (error) {
      console.error("Error updating content settings:", error);
      toast({
        variant: "destructive",
        title: "Failed to save preferences",
        description: "Please try again later.",
      });
    }
  };

  const handleResetPreferences = async () => {
    try {
      await resetPreferences();
      
      // Reset form values
      appearanceForm.reset({
        theme: "system",
        compactView: false,
      });
      
      contentForm.reset({
        showActiveMeetings: true,
        showNotifications: true,
      });
      
      toast({
        title: "Preferences reset",
        description: "Your dashboard preferences have been reset to defaults.",
      });
    } catch (error) {
      console.error("Error resetting preferences:", error);
      toast({
        variant: "destructive",
        title: "Failed to reset preferences",
        description: "Please try again later.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings2 className="mr-2 h-5 w-5" />
            Dashboard Settings
          </DialogTitle>
          <DialogDescription>
            Customize your dashboard experience with these settings.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
            <span className="ml-3">Loading preferences...</span>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>
            
            <TabsContent value="appearance">
              <div className="py-4 space-y-4">
                <Form {...appearanceForm}>
                  <form onSubmit={appearanceForm.handleSubmit(onAppearanceSubmit)} className="space-y-6">
                    <FormField
                      control={appearanceForm.control}
                      name="theme"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel>Theme</FormLabel>
                          <FormDescription>
                            Select a theme for your dashboard.
                          </FormDescription>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-3 gap-4 pt-2"
                          >
                            <FormItem>
                              <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                                <FormControl>
                                  <RadioGroupItem value="light" className="sr-only" />
                                </FormControl>
                                <span className="block text-center text-sm font-medium mb-2">
                                  Light
                                </span>
                                <div className="h-16 w-16 rounded-md bg-[#FFFFFF] border"></div>
                              </FormLabel>
                            </FormItem>
                            
                            <FormItem>
                              <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                                <FormControl>
                                  <RadioGroupItem value="dark" className="sr-only" />
                                </FormControl>
                                <span className="block text-center text-sm font-medium mb-2">
                                  Dark
                                </span>
                                <div className="h-16 w-16 rounded-md bg-slate-900"></div>
                              </FormLabel>
                            </FormItem>
                            
                            <FormItem>
                              <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                                <FormControl>
                                  <RadioGroupItem value="system" className="sr-only" />
                                </FormControl>
                                <span className="block text-center text-sm font-medium mb-2">
                                  System
                                </span>
                                <div className="h-16 w-16 rounded-md bg-gradient-to-tr from-[#FFFFFF] to-slate-900"></div>
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={appearanceForm.control}
                      name="compactView"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Compact View
                            </FormLabel>
                            <FormDescription>
                              Display more content in a compact layout.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit">Save Appearance Settings</Button>
                  </form>
                </Form>
              </div>
            </TabsContent>
            
            <TabsContent value="content">
              <div className="py-4 space-y-4">
                <Form {...contentForm}>
                  <form onSubmit={contentForm.handleSubmit(onContentSubmit)} className="space-y-6">
                    <FormField
                      control={contentForm.control}
                      name="showActiveMeetings"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Show Active Meetings
                            </FormLabel>
                            <FormDescription>
                              Display active meetings on your dashboard.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={contentForm.control}
                      name="showNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Show Notifications
                            </FormLabel>
                            <FormDescription>
                              Display notifications on your dashboard.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit">Save Content Settings</Button>
                  </form>
                </Form>
              </div>
            </TabsContent>
          </Tabs>
        )}
        
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
          <Button
            variant="outline"
            onClick={handleResetPreferences}
            disabled={loading}
          >
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}