import { ReactNode } from 'react';
import { layout } from '@/lib/design-system';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function AdminLayout({ children, title, description }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header with proper spacing from navbar */}
      <div className={`${layout.container} pt-20 pb-8`}>
        {title && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
