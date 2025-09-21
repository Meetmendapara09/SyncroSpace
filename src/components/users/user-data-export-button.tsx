import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportUserDetail } from '@/lib/export-user-data';
import { useToast } from '@/hooks/use-toast';

export default function UserDataExportButton({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  
  const handleExport = async () => {
    try {
      setExporting(true);
      const result = await exportUserDetail(userId);
      
      if (result.success) {
        toast({ title: 'User Data Exported', description: result.message });
      } else {
        toast({ 
          title: 'Export Failed', 
          description: result.message,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({ 
        title: 'Export Failed', 
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };
  
  return (
    <Button
      size="sm"
      variant="outline"
      className="flex items-center gap-2"
      onClick={handleExport}
      disabled={exporting}
    >
      <Download className="h-4 w-4" />
      {exporting ? 'Exporting...' : 'Export User Data'}
    </Button>
  );
}