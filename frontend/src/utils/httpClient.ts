/**
 * HTTP client with JWT authentication support
 */

import { getCookie, setCookie } from './cookieUtils';
import { authApi } from './authApi';

interface RequestOptions extends RequestInit {
  data?: any;
  params?: Record<string, any>;
}

interface HTTPResponse<T = any> {
  status: number;
  data: T;
  headers: Record<string, string>;
  ok: boolean;
}

class HTTPClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api') {
    this.baseURL = baseURL;
  }

  /**
   * Get full URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    let url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

    if (params) {
      const queryString = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          queryString.append(key, String(value));
        }
      });

      const query = queryString.toString();
      if (query) {
        url += (url.includes('?') ? '&' : '?') + query;
      }
    }

    return url;
  }

  /**
   * Get headers with JWT token
   */
  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers = { ...this.defaultHeaders, ...customHeaders };
    const token = getCookie('accessToken');

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Make HTTP request
   */
  private async request<T = any>(
    method: string,
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<HTTPResponse<T>> {
    const { data, params, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const headers = this.getHeaders(options.headers as Record<string, string>);

    let body: string | undefined;
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      body = JSON.stringify(data);
    }

    let response = await fetch(url, {
      method,
      headers,
      body,
      credentials: 'include',
      ...fetchOptions
    });

    // Handle 401 - try token refresh
    if (response.status === 401) {
      const refreshResponse = await authApi.refreshToken();
      if (refreshResponse.success && refreshResponse.accessToken) {
        // Retry request with new token
        headers['Authorization'] = `Bearer ${refreshResponse.accessToken}`;
        response = await fetch(url, {
          method,
          headers,
          body,
          credentials: 'include',
          ...fetchOptions
        });
      } else {
        // Refresh failed, token is invalid
        throw new Error('Authentication failed');
      }
    }

    const contentType = response.headers.get('content-type');
    let responseData: T;

    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = (await response.text()) as any;
    }

    if (!response.ok) {
      const error: any = new Error('HTTP Error');
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    // Convert headers to object
    const headersObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    return {
      status: response.status,
      data: responseData,
      headers: headersObj,
      ok: response.ok
    };
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<HTTPResponse<T>> {
    return this.request<T>('GET', endpoint, options);
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<HTTPResponse<T>> {
    return this.request<T>('POST', endpoint, { ...options, data });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<HTTPResponse<T>> {
    return this.request<T>('PUT', endpoint, { ...options, data });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<HTTPResponse<T>> {
    return this.request<T>('PATCH', endpoint, { ...options, data });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<HTTPResponse<T>> {
    return this.request<T>('DELETE', endpoint, options);
  }

  /**
   * Set base URL
   */
  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
  }

  /**
   * Set default header
   */
  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  /**
   * Remove default header
   */
  removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key];
  }
}

export const httpClient = new HTTPClient();
