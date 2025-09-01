'use client';

import { ClientForm } from '@/components/clients/client-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Client {
    id?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    preferredStaff?: string;
    notes?: string;
    emailMarketing: boolean;
    smsMarketing: boolean;
}

interface EditClientPageProps {
    params: {
        clientId: string;
    };
}

export default function EditClientPage({ params }: EditClientPageProps) {
    const router = useRouter();
    const [client, setClient] = useState<Client | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadClient = async () => {
            try {
                const response = await fetch(`/api/clients/${params.clientId}`);
                if (response.ok) {
                    const data = await response.json();
                    setClient(data);
                } else {
                    router.push('/clients');
                }
            } catch (error) {
                console.error('Error loading client:', error);
                router.push('/clients');
            } finally {
                setIsLoading(false);
            }
        };

        loadClient();
    }, [params.clientId, router]);

    const handleSubmit = () => {
        router.push(`/clients/${params.clientId}`);
    };

    const handleCancel = () => {
        router.push(`/clients/${params.clientId}`);
    };

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="h-96 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-500">Client not found</div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Back Button */}
            <div>
                <Button asChild variant="ghost" size="sm">
                    <Link href={`/clients/${params.clientId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Client
                    </Link>
                </Button>
            </div>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Client</h1>
                <p className="text-gray-600">
                    Update {client.firstName} {client.lastName}&apos;s information and preferences
                </p>
            </div>

            {/* Form */}
            <div className="max-w-2xl">
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <ClientForm
                        client={client}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                    />
                </div>
            </div>
        </div>
    );
}