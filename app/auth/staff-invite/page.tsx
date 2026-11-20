import { Suspense } from 'react';
import { StaffInviteForm } from './staff-invite-form';

export default function StaffInvitePage() {
  return (
    <div className="bg-surface-muted flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-ink-strong text-3xl font-bold">Join the Team</h1>
          <p className="text-ink-soft mt-2">
            Accept your staff invitation to get started
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface px-4 py-8 shadow-sm sm:rounded-lg sm:px-10">
          <Suspense fallback={<div>Loading...</div>}>
            <StaffInviteForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
