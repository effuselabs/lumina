import { SignUpForm } from '@/components/auth/signup-form';
import { ClientOnly } from '@/components/ui/client-only';
import { decideSignup, isOpenSignupEnabled } from '@/lib/auth/signup-policy';
import { prisma } from '@/lib/prisma';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

/*
 * Decided per request, not at build time: whether registration is open depends
 * on an environment variable and on whether any account exists yet.
 */
export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  const decision = decideSignup({
    openSignupEnabled: isOpenSignupEnabled(),
    existingUserCount: await prisma.user.count(),
  });

  return (
    <div className="bg-neutral-light-grey flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-lumina">
          {decision.allowed ? (
            <ClientOnly
              fallback={
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-lumina-coral" />
                </div>
              }
            >
              <SignUpForm />
            </ClientOnly>
          ) : (
            /*
             * The API rejects this case regardless — this only avoids
             * presenting a form that cannot succeed.
             */
            <div className="space-y-4 text-center">
              <h1 className="text-xl font-semibold">Registration is closed</h1>
              <p className="text-sm text-neutral-600">
                This Lumina instance does not accept public sign-ups. If you
                work at a salon that uses it, ask an owner to invite you.
              </p>
              <p className="text-sm text-neutral-600">
                Running your own copy?{' '}
                <a
                  className="text-lumina-coral underline"
                  href="https://github.com/effuselabs/lumina"
                >
                  Lumina is open source
                </a>
                .
              </p>
              <Link
                className="inline-block text-sm text-lumina-coral underline"
                href="/auth/signin"
              >
                Sign in instead
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Sign Up | Lumina',
  description: 'Create your Lumina account',
};
