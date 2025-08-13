import { Suspense } from 'react';
import { SignUpForm } from '@/components/auth/signup-form';
import { Loader2 } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-light-grey px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lumina p-8">
          <Suspense
            fallback={
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-lumina-coral" />
              </div>
            }
          >
            <SignUpForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Sign Up | Lumina',
  description: 'Create your Lumina account',
};