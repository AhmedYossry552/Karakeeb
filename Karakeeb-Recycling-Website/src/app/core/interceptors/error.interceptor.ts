import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized errors
      if (error.status === 401) {
        console.warn('🔁 401 Unauthorized - Attempting token refresh...');
        
        // Skip refresh for auth endpoints
        const isAuthEndpoint = req.url.includes('/auth/login') || 
                               req.url.includes('/auth/register') || 
                               req.url.includes('/auth/refresh') || 
                               req.url.includes('/auth/provider');
        
        if (isAuthEndpoint) {
          return throwError(() => error);
        }

        // Check if we have a token to refresh
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('❌ No token found - redirecting to login');
          authService.logout();
          router.navigate(['/auth']);
          return throwError(() => error);
        }

        // Attempt to refresh the token
        return authService.refreshAccessToken().pipe(
          switchMap((response: any) => {
            console.log('✅ Token refreshed successfully', response);
            
            // Get the new token from response
            let newToken: string | null = null;
            if (response?.accessToken) {
              newToken = response.accessToken;
            } else if (response?.data?.accessToken) {
              newToken = response.data.accessToken;
            } else if (typeof response === 'string') {
              newToken = response;
            } else {
              // Check if token was updated in localStorage (backend might set it via cookie)
              newToken = localStorage.getItem('token');
            }

            if (newToken) {
              // Update token in localStorage
              localStorage.setItem('token', newToken);
              authService.setToken(newToken);
              
              // Retry the original request with new token
              const clonedReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next(clonedReq);
            } else {
              console.error('❌ No token in refresh response');
              authService.logout();
              router.navigate(['/auth']);
              return throwError(() => new Error('Token refresh failed: No token received'));
            }
          }),
          catchError((refreshError) => {
            console.error('❌ Token refresh failed:', refreshError);
            authService.logout();
            router.navigate(['/auth']);
            return throwError(() => refreshError);
          })
        );
      }

      // Handle 403 Forbidden errors
      if (error.status === 403) {
        console.warn('⚠️ 403 Forbidden - Access denied');
        const message = error.error?.message || error.message || 'Access denied';
        if (message.includes('Invalid session') || message.includes('session')) {
          authService.logout();
          router.navigate(['/auth']);
        }
      }

      // Re-throw other errors
      return throwError(() => error);
    })
  );
};

