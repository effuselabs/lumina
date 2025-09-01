'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuthRedirect(
  redirectTo: string,
  condition: 'authenticated' | 'unauthenticated' = 'authenticated'
) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    const shouldRedirect =
      (condition === 'authenticated' && session) ||
      (condition === 'unauthenticated' && !session);

    if (shouldRedirect) {
      router.push(redirectTo);
      router.refresh();
    }
  }, [session, status, router, redirectTo, condition]);

  return { session, status };
}
