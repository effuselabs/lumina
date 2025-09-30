/**
 * WebSocket Service Tests
 * 
 * Tests for WebSocket connection management, message handling, and reconnection logic.
 */

import { ConnectionConfig, WebSocketService, WebSocketServiceCallbacks } from '@/lib/services/websocket-service';

// Mock WebSocket
class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState = MockWebSocket.CONNECTING;
    url: string;
    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;

    constructor(url: string) {
        this.url = url;
        // Simulate connection opening
        setTimeout(() => {
            this.readyState = MockWebSocket.OPEN;
            if (this.onopen) {
                this.onopen(new Event('open'));
            }
        }, 10);
    }

    send(data: string) {
        if (this.readyState !== MockWebSocket.OPEN) {
            throw new Error('WebSocket is not open');
        }
    }

    close(code?: number, reason?: string) {
        this.readyState = MockWebSocket.CLOSED;
        if (this.onclose) {
            this.onclose(new CloseEvent('close', { code: code || 1000, reason }));
        }
    }

    // Test helpers
    simulateMessage(data: any) {
        if (this.onmessage) {
            this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
        }
    }

    simulateError() {
        if (this.onerror) {
            this.onerror(new Event('error'));
        }
    }

    simulateClose(code = 1000) {
        this.readyState = MockWebSocket.CLOSED;
        if (this.onclose) {
            this.onclose(new CloseEvent('close', { code }));
        }
    }
}

// Mock global WebSocket
(global as any).WebSocket = MockWebSocket;

describe('WebSocketService', () => {
    let service: WebSocketService;
    let callbacks: WebSocketServiceCallbacks;
    let config: ConnectionConfig;

    beforeEach(() => {
        callbacks = {
            onMessage: jest.fn(),
            onConnect: jest.fn(),
            onDisconnect: jest.fn(),
            onError: jest.fn(),
            onReconnect: jest.fn(),
        };

        config = {
            url: 'ws://localhost:3001/ws',
            businessId: 'business-1',
            userId: 'user-1',
            reconnectInterval: 100,
            maxReconnectAttempts: 3,
            heartbeatInterval: 1000,
        };

        service = new WebSocketService(config, callbacks);
    });

    afterEach(() => {
        service.disconnect();
        jest.clearAllMocks();
    });

    describe('Connection Management', () => {
        it('should establish WebSocket connection', async () => {
            service.connect();

            // Wait for connection to open
            await new Promise(resolve => setTimeout(resolve, 20));

            expect(callbacks.onConnect).toHaveBeenCalled();
            expect(service.getConnectionStatus()).toBe('connected');
        });

        it('should disconnect WebSocket connection', () => {
            service.connect();
            service.disconnect();

            expect(service.getConnectionStatus()).toBe('disconnected');
        });

        it('should not create multiple connections', () => {
            service.connect();
            service.connect(); // Second call should be ignored

            expect(service.getConnectionStatus()).toBe('connecting');
        });

        it('should handle connection errors', () => {
            service.connect();

            // Simulate connection error
            const ws = (service as any).ws as MockWebSocket;
            ws.simulateError();

            expect(callbacks.onError).toHaveBeenCalled();
        });
    });

    describe('Message Handling', () => {
        beforeEach(async () => {
            service.connect();
            await new Promise(resolve => setTimeout(resolve, 20));
        });

        it('should handle valid WebSocket messages', () => {
            const message = {
                type: 'appointment_updated',
                data: {
                    appointmentId: 'apt-1',
                    businessId: 'business-1',
                    timestamp: new Date().toISOString(),
                },
            };

            const ws = (service as any).ws as MockWebSocket;
            ws.simulateMessage(message);

            expect(callbacks.onMessage).toHaveBeenCalledWith(message);
        });

        it('should ignore messages from other businesses', () => {
            const message = {
                type: 'appointment_updated',
                data: {
                    appointmentId: 'apt-1',
                    businessId: 'other-business',
                    timestamp: new Date().toISOString(),
                },
            };

            const ws = (service as any).ws as MockWebSocket;
            ws.simulateMessage(message);

            expect(callbacks.onMessage).not.toHaveBeenCalled();
        });

        it('should handle invalid message format', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const ws = (service as any).ws as MockWebSocket;
            ws.simulateMessage({ invalid: 'message' });

            expect(callbacks.onMessage).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(
                'Invalid WebSocket message received:',
                expect.any(Object)
            );

            consoleSpy.mockRestore();
        });

        it('should send messages when connected', () => {
            const message = {
                type: 'appointment_updated' as const,
                data: {
                    appointmentId: 'apt-1',
                    businessId: 'business-1',
                    timestamp: new Date().toISOString(),
                },
            };

            const result = service.send(message);
            expect(result).toBe(true);
        });

        it('should fail to send messages when disconnected', () => {
            service.disconnect();

            const message = {
                type: 'appointment_updated' as const,
                data: {
                    appointmentId: 'apt-1',
                    businessId: 'business-1',
                    timestamp: new Date().toISOString(),
                },
            };

            const result = service.send(message);
            expect(result).toBe(false);
        });
    });

    describe('Reconnection Logic', () => {
        beforeEach(async () => {
            service.connect();
            await new Promise(resolve => setTimeout(resolve, 20));
        });

        it('should attempt reconnection on unexpected disconnect', async () => {
            const ws = (service as any).ws as MockWebSocket;
            ws.simulateClose(1006); // Abnormal closure

            // Wait for reconnection attempt
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(callbacks.onReconnect).toHaveBeenCalledWith(1);
        });

        it('should not reconnect on manual disconnect', () => {
            service.disconnect();

            // Wait to ensure no reconnection attempt
            setTimeout(() => {
                expect(callbacks.onReconnect).not.toHaveBeenCalled();
            }, 150);
        });

        it('should stop reconnecting after max attempts', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Simulate multiple failed connections
            for (let i = 0; i < config.maxReconnectAttempts + 1; i++) {
                const ws = (service as any).ws as MockWebSocket;
                ws.simulateClose(1006);
                await new Promise(resolve => setTimeout(resolve, 150));
            }

            expect(consoleSpy).toHaveBeenCalledWith('Max reconnection attempts reached');
            consoleSpy.mockRestore();
        });
    });

    describe('Heartbeat', () => {
        beforeEach(async () => {
            service.connect();
            await new Promise(resolve => setTimeout(resolve, 20));
        });

        it('should send heartbeat messages', async () => {
            const ws = (service as any).ws as MockWebSocket;
            const sendSpy = jest.spyOn(ws, 'send');

            // Wait for heartbeat interval
            await new Promise(resolve => setTimeout(resolve, config.heartbeatInterval + 50));

            expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
        });

        it('should stop heartbeat on disconnect', () => {
            service.disconnect();

            const ws = (service as any).ws as MockWebSocket;
            const sendSpy = jest.spyOn(ws, 'send');

            // Wait for heartbeat interval
            setTimeout(() => {
                expect(sendSpy).not.toHaveBeenCalled();
            }, config.heartbeatInterval + 50);
        });
    });

    describe('Connection Status', () => {
        it('should return correct status for different states', () => {
            expect(service.getConnectionStatus()).toBe('disconnected');

            service.connect();
            expect(service.getConnectionStatus()).toBe('connecting');

            // Connection should be established after timeout
            setTimeout(() => {
                expect(service.getConnectionStatus()).toBe('connected');
            }, 20);
        });
    });
});