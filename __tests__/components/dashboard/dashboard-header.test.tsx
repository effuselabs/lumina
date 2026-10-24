import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { fireEvent, render, screen } from '@testing-library/react';
import { signOut } from 'next-auth/react';

/**
 * The header defined a sign-out handler and rendered nothing that called it,
 * so no page in the dashboard offered a way to sign out (#136) — on salon
 * devices that are shared, with sessions that last a day.
 */

jest.mock('next-auth/react', () => ({ signOut: jest.fn() }));
jest.mock('@/hooks/use-theme-switcher', () => ({
  useThemeSwitcher: () => ({
    isDark: false,
    isTransitioning: false,
    toggleTheme: jest.fn(),
  }),
}));

describe('DashboardHeader', () => {
  it('offers a labelled way to sign out, which ends the session', () => {
    render(
      <DashboardHeader
        businessName="Sunset Salon"
        userName="Sam"
        userRole="OWNER"
        businessSlug="sunset-salon"
        onMenuToggle={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/auth/signin' });
  });
});
