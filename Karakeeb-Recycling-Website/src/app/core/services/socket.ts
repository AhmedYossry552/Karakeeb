import { Injectable } from '@angular/core';
import { io, Socket as SocketIOClient } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class Socket {
  private socket: SocketIOClient | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: any = null;
  private isConnecting = false;

  constructor(private authService: AuthService) {}

  connect(): void {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.warn('Cannot connect socket: No token available');
      return;
    }

    // Stop trying if we've exceeded max attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('⚠️ Socket connection failed after maximum attempts. Socket.IO may not be configured on the backend.');
      return;
    }

    this.isConnecting = true;

    // Use the same base URL as API but without /api
    const socketUrl = environment.apiUrl.replace('/api', '');
    
    this.socket = io(socketUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: false, // Disable automatic reconnection to prevent spam
      timeout: 5000 // Shorter timeout
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected, ID:', this.socket?.id);
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0; // Reset on successful connection
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.isConnected = false;
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (error) => {
      this.isConnecting = false;
      this.reconnectAttempts++;
      
      // Only log in development mode and first few errors to avoid spam
      if (!environment.production && this.reconnectAttempts <= 1) {
        console.warn(`⚠️ Socket connection error (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}):`, error.message || error);
      }
      
      // Clear any existing reconnect timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }

      // Only retry if we haven't exceeded max attempts
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(3000 * this.reconnectAttempts, 10000); // Exponential backoff, max 10s
        this.reconnectTimeout = setTimeout(() => {
          if (!this.isConnected && this.authService.getToken()) {
            this.connect();
          }
        }, delay);
      } else {
        // Only log in development mode
        if (!environment.production) {
          console.warn('⚠️ Socket.IO connection failed. The backend may not support Socket.IO. Notifications will work via polling instead.');
        }
        this.disconnect();
      }
    });

    // Listen for authentication success
    this.socket.on('authenticated', () => {
      console.log('✅ Socket authenticated');
    });

    // Listen for authentication failure
    this.socket.on('unauthorized', (error: any) => {
      console.error('❌ Socket authentication failed:', error);
      this.disconnect();
    });
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isConnecting = false;
    }
    
    this.reconnectAttempts = 0;
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event: string, ...args: any[]): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, ...args);
    }
  }

  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}
