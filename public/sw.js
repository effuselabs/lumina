// Service Worker for Public Booking Interface
// Provides offline support and caching for better performance

const CACHE_NAME = 'lumina-booking-v1';
const STATIC_CACHE_NAME = 'lumina-static-v1';
const API_CACHE_NAME = 'lumina-api-v1';

// Resources to cache immediately
const STATIC_RESOURCES = [
  '/',
  '/offline.html',
  // Add other critical static resources
];

// API endpoints to cache
const CACHEABLE_APIS = ['/api/public/booking', '/api/public/business'];

// Install event - cache static resources
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then(cache => {
        return cache.addAll(STATIC_RESOURCES);
      }),
      caches.open(API_CACHE_NAME),
      caches.open(CACHE_NAME),
    ])
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== STATIC_CACHE_NAME &&
            cacheName !== API_CACHE_NAME
          ) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static resources
  if (request.destination === 'document') {
    event.respondWith(handleDocumentRequest(request));
    return;
  }

  // Handle other resources (images, CSS, JS)
  event.respondWith(handleResourceRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isBookingApi = CACHEABLE_APIS.some(api => url.pathname.startsWith(api));

  if (!isBookingApi) {
    // For non-booking APIs, just try network
    try {
      return await fetch(request);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Network unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // For booking APIs, use network-first with cache fallback
  try {
    const response = await fetch(request);

    if (response.ok && request.method === 'GET') {
      // Cache successful GET responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed, try cache
    if (request.method === 'GET') {
      const cache = await caches.open(API_CACHE_NAME);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        // Add header to indicate cached response
        const headers = new Headers(cachedResponse.headers);
        headers.set('X-Served-From', 'cache');

        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers,
        });
      }
    }

    // No cache available, return error
    return new Response(
      JSON.stringify({
        error: 'Service unavailable',
        message: 'Unable to connect to server and no cached data available',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handle document requests with cache-first for offline pages
async function handleDocumentRequest(request) {
  try {
    // Try network first for documents
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed, try cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page
    const offlineResponse = await cache.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }

    // Fallback offline response
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Lumina Booking</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              text-align: center; 
              padding: 2rem; 
              background: #f9fafb;
            }
            .container { 
              max-width: 400px; 
              margin: 0 auto; 
              background: white; 
              padding: 2rem; 
              border-radius: 8px; 
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .icon { font-size: 3rem; margin-bottom: 1rem; }
            h1 { color: #374151; margin-bottom: 1rem; }
            p { color: #6b7280; margin-bottom: 1.5rem; }
            button { 
              background: #3b82f6; 
              color: white; 
              border: none; 
              padding: 0.75rem 1.5rem; 
              border-radius: 6px; 
              cursor: pointer;
              font-size: 1rem;
            }
            button:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📱</div>
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again. Your booking progress has been saved.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}

// Handle resource requests with cache-first strategy
async function handleResourceRequest(request) {
  // Try cache first for resources
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  // Try network
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Return a fallback for images
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#9ca3af">Image unavailable</text></svg>',
        {
          headers: { 'Content-Type': 'image/svg+xml' },
        }
      );
    }

    // For other resources, return network error
    return new Response('Resource unavailable', { status: 503 });
  }
}

// Handle background sync for offline bookings
self.addEventListener('sync', event => {
  if (event.tag === 'booking-sync') {
    event.waitUntil(syncOfflineBookings());
  }
});

// Sync offline bookings when connection is restored
async function syncOfflineBookings() {
  try {
    // Get pending bookings from IndexedDB or localStorage
    const pendingBookings = await getPendingBookings();

    for (const booking of pendingBookings) {
      try {
        const response = await fetch('/api/public/booking/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(booking),
        });

        if (response.ok) {
          // Remove successfully synced booking
          await removePendingBooking(booking.id);

          // Notify client of successful sync
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'BOOKING_SYNCED',
                bookingId: booking.id,
              });
            });
          });
        }
      } catch (error) {
        console.error('Failed to sync booking:', error);
      }
    }
  } catch (error) {
    console.error('Failed to sync offline bookings:', error);
  }
}

// Helper functions for managing pending bookings
async function getPendingBookings() {
  // This would typically use IndexedDB
  // For now, return empty array as placeholder
  return [];
}

async function removePendingBooking(bookingId) {
  // Remove booking from IndexedDB
  console.log('Removing synced booking:', bookingId);
}

// Handle push notifications (for booking confirmations)
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: data.tag || 'booking-notification',
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const data = event.notification.data;

  if (data && data.url) {
    event.waitUntil(clients.openWindow(data.url));
  }
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_BOOKING_DATA') {
    const { businessId, data } = event.data;
    cacheBookingData(businessId, data);
  }
});

// Cache booking data for offline use
async function cacheBookingData(businessId, data) {
  try {
    const cache = await caches.open(`booking-${businessId}`);
    await cache.put(
      `/api/public/booking/${businessId}/offline-data`,
      new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  } catch (error) {
    console.error('Failed to cache booking data:', error);
  }
}
