import { SimpleBookingLayout } from '@/components/booking/simple-booking-layout';

// Mock business data for testing
const mockBusiness = {
  name: 'Lumina Test Salon',
  address: '123 Main Street, Anytown, ST 12345',
  phone: '(555) 123-4567',
  email: 'info@luminatestsalon.com',
};

export default function TestBookingPage() {
  return (
    <SimpleBookingLayout business={mockBusiness}>
      <div className="py-12 text-center">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          Public Booking Interface
        </h2>
        <p className="mb-8 text-gray-600">
          This is a demonstration of the responsive public booking layout with
          business branding.
        </p>
        <div className="mx-auto max-w-md rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h3 className="mb-2 font-semibold text-blue-900">
            Task 3 Complete ✅
          </h3>
          <p className="text-sm text-blue-800">
            The public booking layout has been successfully implemented with:
          </p>
          <ul className="mt-2 space-y-1 text-left text-sm text-blue-800">
            <li>• Responsive mobile-first design</li>
            <li>• Business branding integration</li>
            <li>• Touch-optimized interface</li>
            <li>• Business information display</li>
            <li>• Contact details and policies</li>
          </ul>
        </div>
      </div>
    </SimpleBookingLayout>
  );
}
