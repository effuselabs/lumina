'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ReactNode } from 'react';

interface StepContainerProps {
  title: string;
  description: string;
  children: ReactNode;
  icon?: ReactNode;
}

export function StepContainer({
  title,
  description,
  children,
  icon,
}: StepContainerProps) {
  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader className="text-center">
        {icon && (
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-gradient-to-r from-yellow-100 to-orange-100 p-3">
              {icon}
            </div>
          </div>
        )}
        <CardTitle className="text-2xl font-bold text-gray-900">
          {title}
        </CardTitle>
        <CardDescription className="mt-2 text-gray-600">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}
