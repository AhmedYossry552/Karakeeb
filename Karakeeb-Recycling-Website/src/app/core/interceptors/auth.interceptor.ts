import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Get the full URL (could be absolute or relative)
  const fullUrl = req.url;
  
  // Skip interceptor for auth endpoints (login, register, refresh, provider)
  const isAuthEndpoint = fullUrl.includes('/auth/login') || 
                         fullUrl.includes('/auth/register') || 
                         fullUrl.includes('/auth/refresh') || 
                         fullUrl.includes('/auth/provider');
  
  if (isAuthEndpoint) {
    return next(req);
  }

  // Get token directly from localStorage to ensure we have the latest value
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token');
  }
  
  // Fallback to AuthService if localStorage doesn't have it
  if (!token) {
    token = authService.getToken();
  }

  if (token) {
    // Remove any quotes that might have been added by JSON.stringify
    const cleanToken = token.replace(/^["']|["']$/g, '');
    console.log('🔑 Auth Interceptor: Adding token to request:', fullUrl, 'Token:', cleanToken.substring(0, 20) + '...');
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${cleanToken}`
      }
    });
    return next(clonedReq);
  }

  console.warn('⚠️ Auth Interceptor: No token found for request:', fullUrl);
  // If no token and not an auth endpoint, still proceed (might be a public endpoint)
  return next(req);
};

