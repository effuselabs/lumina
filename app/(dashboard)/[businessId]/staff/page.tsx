import { StaffList } from '@/components/staff';
import { Metadata } from 'next';

interface StaffPageProps {
    params: {
        businessId: string;
    };
}

export const metadata: Metadata = {
    title: 'Staff Management | Lumina',
    description: 'Manage your team members and their employment settings',
};

export default function StaffPage({ params }: StaffPageProps) {
    return (
        <div className="space-y-6">
            <StaffList businessId={params.businessId} />
        </div>
    );
}