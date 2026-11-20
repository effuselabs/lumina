import { SignInForm } from '@/components/auth/signin-form';
import { ClientOnly } from '@/components/ui/client-only';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Sign In | Lumina',
  description: 'Sign in to your Lumina account',
};

export default function SignInPage() {
  return (
    <div className="bg-surface-muted flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-lg p-8 shadow-lg">
          <ClientOnly
            fallback={
              <div className="space-y-6">
                <div className="text-center">
                  <h1 className="text-ink-strong text-2xl font-bold">
                    Welcome back
                  </h1>
                  <p className="text-ink-soft mt-2">
                    Sign in to your Lumina account
                  </p>
                </div>
                <div className="flex justify-center py-8">
                  <Loader2 className="text-lumina-coral h-6 w-6 animate-spin" />
                </div>
              </div>
            }
          >
            <SignInForm />
          </ClientOnly>
        </div>
      </div>
    </div>
  );
}
