import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { type ZodType, type ZodError } from 'zod';
import i18n from '../i18n';
import { APP_EVENTS } from '../utils/events';
import { logger } from '../utils/logger';

type ApiResponse<T> = T | null;

class ApiClient {
    private axiosInstance: AxiosInstance;
    private readonly pendingGets = new Map<string, AbortController>();
    private lastErrorStatus: number | null = null;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: '/api',
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        this.axiosInstance.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                this.lastErrorStatus = error.response?.status ?? null;
                const url = error.config?.url ?? '';
                const status = error.response?.status;

                if (status === 401 && !url.includes('/auth/login')) {
                    window.dispatchEvent(new CustomEvent(APP_EVENTS.SESSION_EXPIRED, {
                        detail: { message: i18n.t('auth.session_expired') },
                    }));
                }

                if (status === 403) {
                    window.dispatchEvent(new CustomEvent(APP_EVENTS.FORBIDDEN, {
                        detail: { message: i18n.t('errors.forbidden') },
                    }));
                }

                if (status === 503) {
                    window.dispatchEvent(new CustomEvent(APP_EVENTS.SERVICE_UNAVAILABLE, {
                        detail: { message: i18n.t('errors.service_unavailable') },
                    }));
                }

                return Promise.reject(error);
            },
        );
    }

    private startGet(url: string): AbortSignal {
        const existing = this.pendingGets.get(url);
        if (existing) {
            existing.abort('Deduplicated');
        }
        const controller = new AbortController();
        this.pendingGets.set(url, controller);
        return controller.signal;
    }

    private finishGet(url: string): void {
        this.pendingGets.delete(url);
    }

    private isValidResponse<T>(data: unknown): data is T {
        // Null/undefined are not valid responses
        if (data === null || data === undefined) {
            return false;
        }

        // For empty arrays, that's valid
        if (Array.isArray(data)) {
            return true;
        }

        // For objects, ensure it has at least one property (not empty object)
        if (typeof data === 'object') {
            return Object.keys(data).length > 0;
        }

        // For primitives, they're valid unless null/undefined (already checked)
        return true;
    }

    private formatZodError(error: ZodError): string {
        return error.issues
            .map(issue => `[${issue.path.join('.')}] ${issue.message}`)
            .join(', ');
    }

    private parseWithSchema<T>(schema: ZodType<T>, raw: unknown, url: string, method: string): T | null {
        const result = schema.safeParse(raw);
        if (!result.success) {
            this.logError(url, method, `Schema validation failed: ${this.formatZodError(result.error)}`);
            return null;
        }
        return result.data;
    }

    private logError(url: string, method: string, error: unknown): void {
        const message = error instanceof AxiosError
            ? `${method} ${url} - Status ${error.response?.status}: ${error.message}`
            : `${method} ${url} - ${String(error)}`;

        logger.error('[ApiClient]', { message, url, method });
    }

    async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const signal = this.startGet(url);
        try {
            const { data } = await this.axiosInstance.get<T>(url, { ...config, signal });

            if (!this.isValidResponse<T>(data)) {
                this.logError(url, 'GET', 'Invalid response: empty or null data');
                return null;
            }

            return data;
        } catch (error) {
            const isAborted = axios.isCancel(error);
            if (!isAborted) {
                this.logError(url, 'GET', error);
            }
            return null;
        } finally {
            this.finishGet(url);
        }
    }

    async post<T>(url: string, payload?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const { data } = await this.axiosInstance.post<T>(url, payload, config);

            if (!this.isValidResponse<T>(data)) {
                this.logError(url, 'POST', 'Invalid response: empty or null data');
                return null;
            }

            return data;
        } catch (error) {
            this.logError(url, 'POST', error);
            return null;
        }
    }

    async patch<T>(url: string, payload?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const { data } = await this.axiosInstance.patch<T>(url, payload, config);

            if (!this.isValidResponse<T>(data)) {
                this.logError(url, 'PATCH', 'Invalid response: empty or null data');
                return null;
            }

            return data;
        } catch (error) {
            this.logError(url, 'PATCH', error);
            return null;
        }
    }

    async put<T>(url: string, payload?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const { data } = await this.axiosInstance.put<T>(url, payload, config);

            if (!this.isValidResponse<T>(data)) {
                this.logError(url, 'PUT', 'Invalid response: empty or null data');
                return null;
            }

            return data;
        } catch (error) {
            this.logError(url, 'PUT', error);
            return null;
        }
    }

    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const { data } = await this.axiosInstance.delete<T>(url, config);

            if (!this.isValidResponse<T>(data)) {
                this.logError(url, 'DELETE', 'Invalid response: empty or null data');
                return null;
            }

            return data;
        } catch (error) {
            this.logError(url, 'DELETE', error);
            return null;
        }
    }

    async getValidated<T>(url: string, schema: ZodType<T>, config?: AxiosRequestConfig): Promise<T | null> {
        const raw = await this.get<unknown>(url, config);
        if (raw === null) {
            return null;
        }
        return this.parseWithSchema(schema, raw, url, 'GET');
    }

    async postValidated<T>(url: string, schema: ZodType<T>, payload?: unknown, config?: AxiosRequestConfig): Promise<T | null> {
        const raw = await this.post<unknown>(url, payload, config);
        if (raw === null) {
            return null;
        }
        return this.parseWithSchema(schema, raw, url, 'POST');
    }

    async patchValidated<T>(url: string, schema: ZodType<T>, payload?: unknown, config?: AxiosRequestConfig): Promise<T | null> {
        const raw = await this.patch<unknown>(url, payload, config);
        if (raw === null) {
            return null;
        }
        return this.parseWithSchema(schema, raw, url, 'PATCH');
    }

    async putValidated<T>(url: string, schema: ZodType<T>, payload?: unknown, config?: AxiosRequestConfig): Promise<T | null> {
        const raw = await this.put<unknown>(url, payload, config);
        if (raw === null) {
            return null;
        }
        return this.parseWithSchema(schema, raw, url, 'PUT');
    }

    getAxiosInstance(): AxiosInstance {
        return this.axiosInstance;
    }
}

export const apiClient = new ApiClient();
export default apiClient;
