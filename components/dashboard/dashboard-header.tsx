'use client';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface DashboardHeaderProps {
    businessName: string;
    userRole: string;
    userName: string;
    businessSlug?: string;
}

export function DashboardHeader({
    businessName,
    userRole,
    userName,
    businessSlug,
}: DashboardHeaderProps) {
    const handleSignOut = async () => {
        await signOut({ callbackUrl: '/auth/signin' });
    };

    return (
        <div className="border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {businessName}
                        </h1>
                        <span className="ml-3 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
                            {userRole}
                        </span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">
                            Welcome back, {userName}
                        </span>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center space-x-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-56">
                                <div className="px-2 py-1.5">
                                    <p className="text-sm font-medium">{userName}</p>
                                    <p className="text-xs text-gray-500">{userRole}</p>
                                </div>

                                <DropdownMenuSeparator />

                                {businessSlug && (
                                    <>
                                        <DropdownMenuItem asChild>
                                            <a href={`/dashboard/${businessSlug}/settings`}>
                                                <Settings className="mr-2 h-4 w-4" />
                                                Business Settings
                                            </a>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}

                                <DropdownMenuItem
                                    onClick={handleSignOut}
                                    className="text-red-600 focus:text-red-600"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>
    );
}