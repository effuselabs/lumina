import { Suspense } from 'react';
import { StaffInviteForm } from './staff-invite-form';

export default function StaffInvitePage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Join the Team</h1>
                    <p className="mt-2 text-gray-600">
                        Accept your staff invitation to get started
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <Suspense fallback={<div>Loading...</div>}>
                        <StaffInviteForm />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}