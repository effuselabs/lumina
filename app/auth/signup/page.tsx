import { SignUpForm } from '@/components/auth/signup-form';
import { ClientOnly } from '@/components/ui/client-only';
import { Loader2 } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-light-grey px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-lumina">
          <ClientOnly
            fallback={
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-lumina-coral" />
              </div>
            }
          >
            <SignUpForm />
          </ClientOnly>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Sign Up | Lumina',
  description: 'Create your Lumina account',
};
