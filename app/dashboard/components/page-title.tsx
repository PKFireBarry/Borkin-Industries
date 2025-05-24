import React from 'react';

interface PageTitleProps {
  title: string;
  children?: React.ReactNode;
}

export function PageTitle({ title, children }: PageTitleProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {title}
      </h1>
      {children && <div className="flex items-center space-x-2">{children}</div>}
    </div>
  );
} 