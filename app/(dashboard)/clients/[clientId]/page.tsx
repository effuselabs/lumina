import { auth } from '@/auth';
import { ClientDetail } from '@/components/clients/client-detail';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

interface ClientDetailPageProps {
    params: {
        clientId: string;
    };
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
    const session = await auth();

    if (!session) {
        redirect('/auth/signin');
    }

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <div>
                <Button asChild variant="ghost" size="sm">
                    <Link href="/clients">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Clients
                    </Link>
                </Button>
            </div>

            {/* Client Detail */}
            <ClientDetail
                clientId={params.clientId}
                onEdit={() => {
                    // This will be handled by the ClientDetail component
                    window.location.href = `/clients/${params.clientId}/edit`;
                }}
            />
        </div>
    );
}