'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Staff {
    id: string;
    displayName: string;
}

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

interface ClientFormProps {
    client?: Client;
    onSubmit?: (client: Client) => void;
    onCancel?: () => void;
}

export function ClientForm({ client, onSubmit, onCancel }: ClientFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [formData, setFormData] = useState<Client>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        preferredStaff: '',
        notes: '',
        emailMarketing: true,
        smsMarketing: true,
        ...client,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Load staff members
    useEffect(() => {
        const loadStaff = async () => {
            try {
                const response = await fetch('/api/staff');
                if (response.ok) {
                    const data = await response.json();
                    setStaff(data.staff || []);
                }
            } catch (error) {
                console.error('Error loading staff:', error);
            }
        };

        loadStaff();
    }, []);

    const handleInputChange = (field: keyof Client, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const url = client?.id ? `/api/clients/${client.id}` : '/api/clients';
            const method = client?.id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    email: formData.email || undefined,
                    phone: formData.phone || undefined,
                    address: formData.address || undefined,
                    city: formData.city || undefined,
                    state: formData.state || undefined,
                    zipCode: formData.zipCode || undefined,
                    preferredStaff: formData.preferredStaff || undefined,
                    notes: formData.notes || undefined,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save client');
            }

            const savedClient = await response.json();

            if (onSubmit) {
                onSubmit(savedClient);
            } else {
                router.push('/clients');
                router.refresh();
            }
        } catch (error) {
            console.error('Error saving client:', error);
            setErrors({
                submit: error instanceof Error ? error.message : 'Failed to save client',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                            className={errors.firstName ? 'border-red-500' : ''}
                        />
                        {errors.firstName && (
                            <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                            className={errors.lastName ? 'border-red-500' : ''}
                        />
                        {errors.lastName && (
                            <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className={errors.email ? 'border-red-500' : ''}
                        />
                        {errors.email && (
                            <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Address</h3>

                <div>
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                        />
                    </div>

                    <div>
                        <Label htmlFor="state">State</Label>
                        <Input
                            id="state"
                            value={formData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                        />
                    </div>

                    <div>
                        <Label htmlFor="zipCode">ZIP Code</Label>
                        <Input
                            id="zipCode"
                            value={formData.zipCode}
                            onChange={(e) => handleInputChange('zipCode', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Preferences */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Preferences</h3>

                <div>
                    <Label htmlFor="preferredStaff">Preferred Staff Member</Label>
                    <Select
                        value={formData.preferredStaff}
                        onValueChange={(value) => handleInputChange('preferredStaff', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select preferred staff member" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">No preference</SelectItem>
                            {staff.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                    {member.displayName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Add any notes about this client..."
                        rows={3}
                    />
                </div>
            </div>

            {/* Marketing Preferences */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Marketing Preferences</h3>

                <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="emailMarketing"
                            checked={formData.emailMarketing}
                            onCheckedChange={(checked) =>
                                handleInputChange('emailMarketing', checked === true)
                            }
                        />
                        <Label htmlFor="emailMarketing">
                            Send email marketing and appointment reminders
                        </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="smsMarketing"
                            checked={formData.smsMarketing}
                            onCheckedChange={(checked) =>
                                handleInputChange('smsMarketing', checked === true)
                            }
                        />
                        <Label htmlFor="smsMarketing">
                            Send SMS marketing and appointment reminders
                        </Label>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {errors.submit && (
                <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel || (() => router.back())}
                    disabled={isLoading}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600"
                >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {client?.id ? 'Update Client' : 'Create Client'}
                </Button>
            </div>
        </form>
    );
}