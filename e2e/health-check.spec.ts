import { test, expect } from '@playwright/test';

test.describe('Health Check API', () => {
  test('should return healthy status', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.checks.database).toBe('healthy');
    expect(data.checks.memory).toBe('healthy');
    expect(data.timestamp).toBeTruthy();
    expect(data.environment).toBeTruthy();
  });
  
  test('should return proper headers', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.headers()['cache-control']).toBe('no-cache, no-store, must-revalidate');
    expect(response.headers()['pragma']).toBe('no-cache');
    expect(response.headers()['expires']).toBe('0');
  });
  
  test('should support HEAD requests', async ({ request }) => {
    const response = await request.head('/api/health');
    
    expect(response.status()).toBe(200);
    
    const text = await response.text();
    expect(text).toBe('');
  });
});