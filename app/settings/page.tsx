import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CategoryManager } from '../components/settings/CategoryManager';
import { ArrowLeft } from 'lucide-react';

export default function SettingsPage() {
  return (
    <main className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application preferences
        </p>
      </div>

      <div className="space-y-6">
        <CategoryManager />
        
        {/* Future settings sections can be added here */}
      </div>
    </main>
  );
}
