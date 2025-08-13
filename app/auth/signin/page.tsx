import { Suspense } from 'react';
import { SignInForm } from '@/components/auth/signin-form';
import { Loader2 } from 'lucide-react';

export default function SignInPage() {
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
            <SignInForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Sign In | Lumina',
  description: 'Sign in to your Lumina account',
};