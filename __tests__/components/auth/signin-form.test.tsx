import { SignInForm } from '@/components/auth/signin-form';
import { hardNavigate } from '@/lib/navigation/hard-navigate';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { signIn, useSession } from 'next-auth/react';

/**
 * Signing in sent the browser to /dashboard twice: once from the submit
 * handler, and again from the "already signed in" effect when the same
 * sign-in refreshed the session. The second navigation cancels the first —
 * WebKit reports "Navigation canceled by policy check" — and the user loads
 * the dashboard twice.
 */

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  useSession: jest.fn(),
}));
jest.mock('@/lib/navigation/hard-navigate', () => ({
  hardNavigate: jest.fn(),
}));

const session = (status: 'authenticated' | 'unauthenticated') =>
  status === 'authenticated'
    ? { data: { user: { id: 'owner' }, expires: '' }, status }
    : { data: null, status };

describe('SignInForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useSession)
      .mockReturnValue(
        session('unauthenticated') as ReturnType<typeof useSession>
      );
  });

  it('goes to the dashboard once when signing in also refreshes the session', async () => {
    jest.mocked(signIn).mockImplementation(async () => {
      // The session refresh lands before signIn resolves.
      jest
        .mocked(useSession)
        .mockReturnValue(
          session('authenticated') as ReturnType<typeof useSession>
        );
      return {
        ok: true,
        error: undefined,
        status: 200,
        url: null,
        code: undefined,
      };
    });
    const { rerender } = render(<SignInForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'owner@lumina-demo.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'demo123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(hardNavigate).toHaveBeenCalled());
    rerender(<SignInForm />);

    expect(hardNavigate).toHaveBeenCalledTimes(1);
    expect(hardNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('sends someone already signed in to the dashboard', () => {
    jest
      .mocked(useSession)
      .mockReturnValue(
        session('authenticated') as ReturnType<typeof useSession>
      );

    render(<SignInForm />);

    expect(hardNavigate).toHaveBeenCalledTimes(1);
  });
});
