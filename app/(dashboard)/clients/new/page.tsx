import { auth } from '@/auth';
import { ClientForm } from '@/components/clients/client-form';
import { redirect } from 'next/navigation';

export default async function NewClientPage() {
    const session = await auth();

    if (!session) {
        redirect('/auth/signin');
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Add New Client</h1>
                <p className="text-gray-600">
                    Create a new client profile with contact information and preferences
                </p>
            </div>

            {/* Form */}
            <div className="max-w-2xl">
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <ClientForm />
                </div>
            </div>
        </div>
    );
}