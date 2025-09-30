/**
 * WebSocket Service for Real-Time Appointment Updates
 * 
 * Provides WebSocket connection management, message handling, and real-time
 * synchronization for appointment management dashboard.
 */

import { DashboardAppointment } from '@/types/dashboard-appointments';

export interface WebSocketMessage {
    type: 'appointment_created' | 'appointment_updated' | 'appointment_deleted' | 'appointment_status_changed';
    data: {
        appointmentId: string;
        businessId: string;
        appointment?: DashboardAppointment;
        changes?: Partial<DashboardAppointment>;
        userId?: string;
        timestamp: string;
    };
}

export interface ConnectionConfig {
    url: string;
    businessId: string;
    userId: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
    heartbeatInterval: number;
}

export interface WebSocketServiceCallbacks {
    onMessage: (message: WebSocketMessage) => void;
    onConnect: () => void;
    onDisconnect: () => void;
    onError: (error: Event) => void;
    onReconnect: (attempt: number) => void;
}

export class WebSocketService {
    private ws: WebSocket | null = null;
    private config: ConnectionConfig;
    private callbacks: WebSocketServiceCallbacks;
    private reconnectAttempts = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private isConnecting = false;
    private isManuallyDisconnected = false;

    constructor(config: ConnectionConfig, callbacks: WebSocketServiceCallbacks) {
        this.config = config;
        this.callbacks = callbacks;
    }

    /**
     * Establish WebSocket connection
     */
    connect(): void {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            return;
        }

        this.isConnecting = true;
        this.isManuallyDisconnected = false;

        try {
            const wsUrl = `${this.config.url}?businessId=${this.config.businessId}&userId=${this.config.userId}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = this.handleOpen.bind(this);
            this.ws.onmessage = this.handleMessage.bind(this);
            this.ws.onclose = this.handleClose.bind(this);
            this.ws.onerror = this.handleError.bind(this);
        } catch (error) {
            this.isConnecting = false;
            console.error('WebSocket connection failed:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Disconnect WebSocket connection
     */
    disconnect(): void {
        this.isManuallyDisconnected = true;
        this.clearTimers();

        if (this.ws) {
            this.ws.close(1000, 'Manual disconnect');
            this.ws = null;
        }
    }

    /**
     * Send message through WebSocket
     */
    send(message: WebSocketMessage): boolean {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not connected, message not sent:', message);
            return false;
        }

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            return false;
        }
    }

    /**
     * Get current connection status
     */
    getConnectionStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
        if (this.isConnecting) return 'connecting';
        if (!this.ws) return 'disconnected';

        switch (this.ws.readyState) {
            case WebSocket.OPEN:
                return 'connected';
            case WebSocket.CONNECTING:
                return 'connecting';
            case WebSocket.CLOSED:
            case WebSocket.CLOSING:
                return 'disconnected';
            default:
                return 'error';
        }
    }

    /**
     * Handle WebSocket open event
     */
    private handleOpen(): void {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.callbacks.onConnect();
    }

    /**
     * Handle WebSocket message event
     */
    private handleMessage(event: MessageEvent): void {
        try {
            const message: WebSocketMessage = JSON.parse(event.data);

            // Validate message structure
            if (!this.isValidMessage(message)) {
                console.warn('Invalid WebSocket message received:', message);
                return;
            }

            // Only process messages for our business
            if (message.data.businessId !== this.config.businessId) {
                return;
            }

            this.callbacks.onMessage(message);
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }

    /**
     * Handle WebSocket close event
     */
    private handleClose(event: CloseEvent): void {
        this.isConnecting = false;
        this.clearTimers();
        this.callbacks.onDisconnect();

        // Attempt reconnection if not manually disconnected
        if (!this.isManuallyDisconnected && event.code !== 1000) {
            this.scheduleReconnect();
        }
    }

    /**
     * Handle WebSocket error event
     */
    private handleError(event: Event): void {
        this.isConnecting = false;
        this.callbacks.onError(event);
    }

    /**
     * Schedule reconnection attempt
     */
    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

        this.reconnectTimer = setTimeout(() => {
            this.callbacks.onReconnect(this.reconnectAttempts);
            this.connect();
        }, delay);
    }

    /**
     * Start heartbeat to keep connection alive
     */
    private startHeartbeat(): void {
        this.heartbeatTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, this.config.heartbeatInterval);
    }

    /**
     * Clear all timers
     */
    private clearTimers(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * Validate WebSocket message structure
     */
    private isValidMessage(message: any): message is WebSocketMessage {
        return (
            message &&
            typeof message.type === 'string' &&
            message.data &&
            typeof message.data.appointmentId === 'string' &&
            typeof message.data.businessId === 'string' &&
            typeof message.data.timestamp === 'string'
        );
    }
}

/**
 * Create WebSocket service instance with default configuration
 */
export function createWebSocketService(
    businessId: string,
    userId: string,
    callbacks: WebSocketServiceCallbacks
): WebSocketService {
    const config: ConnectionConfig = {
        url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
        businessId,
        userId,
        reconnectInterval: 1000,
        maxReconnectAttempts: 5,
        heartbeatInterval: 30000,
    };

    return new WebSocketService(config, callbacks);
}