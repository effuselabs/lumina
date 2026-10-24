import { startClientErrorReporting } from '@/lib/monitoring/client-error-reporting';

// Runs in the browser before the app hydrates (#100).
startClientErrorReporting();
