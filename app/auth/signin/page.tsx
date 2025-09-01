import { SignInForm } from '@/components/auth/signin-form';
import { ClientOnly } from '@/components/ui/client-only';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Sign In | Lumina',
  description: 'Sign in to your Lumina account',
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <ClientOnly
            fallback={
              <div className="space-y-6">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Welcome back
                  </h1>
                  <p className="mt-2 text-gray-600">
                    Sign in to your Lumina account
                  </p>
                </div>
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-lumina-coral" />
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