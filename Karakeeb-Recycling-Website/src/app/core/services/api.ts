import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl || 'http://localhost:5289/api';

  constructor(private http: HttpClient) {}

  get<T>(url: string, options?: { params?: any }): Observable<T> {
    let httpParams = new HttpParams();
    if (options?.params) {
      Object.keys(options.params).forEach(key => {
        if (options.params[key] !== undefined && options.params[key] !== null) {
          httpParams = httpParams.set(key, options.params[key].toString());
        }
      });
    }
    return this.http.get<T>(`${this.baseUrl}${url}`, { 
      params: httpParams,
      withCredentials: true // Required for refresh token cookie
    });
  }

  post<T>(url: string, body: any): Observable<T> {
    // Handle FormData for file uploads
    if (body instanceof FormData) {
      return this.http.post<T>(`${this.baseUrl}${url}`, body, {
        withCredentials: true // Required for refresh token cookie
      });
    }
    // Set Content-Type header for JSON requests
    return this.http.post<T>(`${this.baseUrl}${url}`, body, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true // Required for refresh token cookie
    });
  }

  put<T>(url: string, body: any): Observable<T> {
    // Handle FormData for file uploads
    if (body instanceof FormData) {
      return this.http.put<T>(`${this.baseUrl}${url}`, body, {
        withCredentials: true // Required for refresh token cookie
      });
    }
    // Set Content-Type header for JSON requests
    return this.http.put<T>(`${this.baseUrl}${url}`, body, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true // Required for refresh token cookie
    });
  }

  patch<T>(url: string, body: any): Observable<T> {
    // Handle FormData for file uploads
    if (body instanceof FormData) {
      return this.http.patch<T>(`${this.baseUrl}${url}`, body, {
        withCredentials: true // Required for refresh token cookie
      });
    }
    // Set Content-Type header for JSON requests
    return this.http.patch<T>(`${this.baseUrl}${url}`, body, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true // Required for refresh token cookie
    });
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${url}`, {
      withCredentials: true // Required for refresh token cookie
    });
  }
}