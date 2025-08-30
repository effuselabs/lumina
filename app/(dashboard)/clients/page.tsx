import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';
import { Plus, Upload, Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function ClientsPage() {
    const session = await auth();

    if (!session) {
        redirect('/auth/signin');
    }

    // Get user's businesses and client count
    const userBusinesses = await prisma.businessUser.findMany({
        where: {
            userId: session.user.id,
        },
        include: {
            business: {
                select: {
                    id: true,
                    name: true,
                    _count: {
                        select: {
                            clients: true,
                        },
                    },
                },
            },
        },
    });

    const business = userBusinesses[0]?.business;
    const clientCount = business?._count.clients || 0;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
                    <p className="text-gray-600">
                        Manage your client database and import new clients
                        {clientCount > 0 && (
                            <span className="ml-2 text-sm">
                                ({clientCount} client{clientCount !== 1 ? 's' : ''})
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex gap-3">
                    <Button asChild variant="outline">
                        <Link href="/clients/import">
                            <Upload className="mr-2 h-4 w-4" />
                            Import CSV
                        </Link>
                    </Button>

                    <Button asChild className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600">
                        <Link href="/clients/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Client
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Content */}
            {clientCount === 0 ? (
                <EmptyClientsState />
            ) : (
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <div className="text-center py-12">
                        <Users className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">
                            Client Management Coming Soon
                        </h3>
                        <p className="mt-2 text-gray-600">
                            You have {clientCount} clients in your database.
                            Full client management features will be available soon.
                        </p>
                        <div className="mt-6">
                            <Button asChild variant="outline">
                                <Link href="/clients/import">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Import More Clients
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function EmptyClientsState() {
    return (
        <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 flex items-center justify-center mb-6">
                <Users className="h-12 w-12 text-blue-600" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No clients yet
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Start building your client database by adding clients individually or importing them from a CSV file.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild variant="outline" className="sm:w-auto">
                    <Link href="/clients/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Client
                    </Link>
                </Button>

                <Button asChild className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 sm:w-auto">
                    <Link href="/clients/import">
                        <Upload className="mr-2 h-4 w-4" />
                        Import from CSV
                    </Link>
                </Button>
            </div>

            <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4 max-w-md mx-auto">
                <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Import Benefits</h4>
                <ul className="text-sm text-blue-700 space-y-1 text-left">
                    <li>• Import hundreds of clients at once</li>
                    <li>• Automatic duplicate detection</li>
                    <li>• Data validation and error reporting</li>
                    <li>• Easy field mapping interface</li>
                </ul>
            </div>
        </div>
    );
}