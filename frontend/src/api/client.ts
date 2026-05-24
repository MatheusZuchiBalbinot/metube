import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import i18n from '../i18n';
import { APP_EVENTS } from '../utils/events';
import { logger } from '../utils/logger';

export type ApiResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string };

class ApiClient {
    private axiosInstance: AxiosInstance;
    private readonly pendingGets = new Map<string, AbortController>();

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
        if (data === null || data === undefined) {
            return false;
        }

        if (Array.isArray(data)) {
            return true;
        }

        if (typeof data === 'object') {
            return Object.keys(data).length > 0;
        }

        return true;
    }

    private logError(url: string, method: string, error: unknown): void {
        const message = error instanceof AxiosError
            ? `${method} ${url} - Status ${error.response?.status}: ${error.message}`
            : `${method} ${url} - ${String(error)}`;

        logger.error('[ApiClient]', { message, url, method });
    }

    private extractErrorMessage(error: unknown): string {
        if (error instanceof AxiosError) {
            return error.message;
        }

        return String(error);
    }

    async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
        const signal = this.startGet(url);

        try {
            const { data } = await this.axiosInstance.get<T>(url, { ...config, signal });

            if (!this.isValidResponse<T>(data)) {
                this.logError(url, 'GET', 'Invalid response: empty or null data');
                return { ok: false, error: 'Invalid response' };
            }

            return { ok: true, data };
        } catch (error) {
            const isAborted = axios.isCancel(error);

            if (!isAborted) {
                this.logError(url, 'GET', error);
            }

            return { ok: false, error: this.extractErrorMessage(error) };
        } finally {
            this.finishGet(url);
        }
    }

    async postEmpty(url: string, payload?: unknown): Promise<boolean> {
        try {
            await this.axiosInstance.post(url, payload);
            return true;
        } catch (error) {
            this.logError(url, 'POST', error);
            return false;
        }
    }

    async post<T>(url: string, payload?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
        try {
            const { data } = await this.axiosInstance.post<T>(url, payload, config);

            if (!this.isValidResponse<T>(data)) {
                this.logError(url, 'POST', 'Invalid response: empty or null data');
                return { ok: false, error: 'Invalid response' };
            }

            return { ok: true, data };
        } catch (error) {
            this.logError(url, 'POST', error);
            return { ok: false, error: this.extractErrorMessage(error) };
        }
    }

    async patch<T>(url: string, payload?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
        try {
            const { data } = await this.axiosInstance.patch<T>(url, payload, config);

            if (!this.isValidResponse<T>(data)) {
                this.logError(url, 'PATCH', 'Invalid response: empty or null data');
                return { ok: false, error: 'Invalid response' };
            }

            return { ok: true, data };
        } catch (error) {
            this.logError(url, 'PATCH', error);
            return { ok: false, error: this.extractErrorMessage(error) };
        }
    }

    async put<T>(url: string, payload?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
        try {
            const { data } = await this.axiosInstance.put<T>(url, payload, config);

            if (!this.isValidResponse<T>(data)) {
                this.logError(url, 'PUT', 'Invalid response: empty or null data');
                return { ok: false, error: 'Invalid response' };
            }

            return { ok: true, data };
        } catch (error) {
            this.logError(url, 'PUT', error);
            return { ok: false, error: this.extractErrorMessage(error) };
        }
    }

    async delete(url: string, config?: AxiosRequestConfig): Promise<ApiResult<void>> {
        try {
            await this.axiosInstance.delete(url, config);
            return { ok: true, data: undefined };
        } catch (error) {
            this.logError(url, 'DELETE', error);
            return { ok: false, error: this.extractErrorMessage(error) };
        }
    }

    async getValidated<T>(url: string, parse: (raw: unknown) => T | null, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
        const raw = await this.get<unknown>(url, config);

        if (!raw.ok) {
            return raw;
        }

        const result = parse(raw.data);

        if (result === null) {
            this.logError(url, 'GET', 'Parse failed: unexpected response shape');
            return { ok: false, error: 'Parse failed' };
        }

        return { ok: true, data: result };
    }

    async postValidated<T>(url: string, parse: (raw: unknown) => T | null, payload?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
        const raw = await this.post<unknown>(url, payload, config);

        if (!raw.ok) {
            return raw;
        }

        const result = parse(raw.data);

        if (result === null) {
            this.logError(url, 'POST', 'Parse failed: unexpected response shape');
            return { ok: false, error: 'Parse failed' };
        }

        return { ok: true, data: result };
    }

    async patchValidated<T>(url: string, parse: (raw: unknown) => T | null, payload?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
        const raw = await this.patch<unknown>(url, payload, config);

        if (!raw.ok) {
            return raw;
        }

        const result = parse(raw.data);

        if (result === null) {
            this.logError(url, 'PATCH', 'Parse failed: unexpected response shape');
            return { ok: false, error: 'Parse failed' };
        }

        return { ok: true, data: result };
    }

    async putValidated<T>(url: string, parse: (raw: unknown) => T | null, payload?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
        const raw = await this.put<unknown>(url, payload, config);

        if (!raw.ok) {
            return raw;
        }

        const result = parse(raw.data);

        if (result === null) {
            this.logError(url, 'PUT', 'Parse failed: unexpected response shape');
            return { ok: false, error: 'Parse failed' };
        }

        return { ok: true, data: result };
    }

    getAxiosInstance(): AxiosInstance {
        return this.axiosInstance;
    }
}

export const apiClient = new ApiClient();
export default apiClient;
