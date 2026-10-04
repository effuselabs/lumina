import { ErrorScreen } from '@/components/errors/error-screen';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * A page that failed to load showed Next's default error screen: there was
 * no error.tsx anywhere in app/ (#57).
 */
describe('ErrorScreen', () => {
  const home = { href: '/dashboard/demo', label: 'Back to dashboard' };

  it('says what happened and offers a retry and a way back', async () => {
    const reset = jest.fn();
    render(<ErrorScreen error={new Error('boom')} reset={reset} home={home} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('link', { name: 'Back to dashboard' })
    ).toHaveAttribute('href', '/dashboard/demo');
  });

  it('shows the server digest as a reference, never the message', () => {
    const error = Object.assign(new Error('connection refused at 10.0.0.4'), {
      digest: '3141592653',
    });
    render(<ErrorScreen error={error} reset={jest.fn()} home={home} />);

    expect(screen.getByText('3141592653')).toBeInTheDocument();
    expect(screen.queryByText(/connection refused/)).not.toBeInTheDocument();
  });
});

describe('error boundaries', () => {
  it.each([
    'app/error.tsx',
    'app/global-error.tsx',
    'app/dashboard/[businessSlug]/error.tsx',
  ])('%s exists, is a client component and renders ErrorScreen', path => {
    const file = join(process.cwd(), path);
    expect(existsSync(file)).toBe(true);
    const source = readFileSync(file, 'utf8');
    // Next requires error boundaries to be client components.
    expect(source.trimStart().startsWith("'use client'")).toBe(true);
    expect(source).toContain('<ErrorScreen');
  });
});
