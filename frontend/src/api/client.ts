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
            (error: AxiosError) => this.handleResponseError(error),
        );
    }

    /** Dispatches a global app event carrying a translated message for the given key. */
    private emitAppEvent(name: string, messageKey: string): void {
        window.dispatchEvent(new CustomEvent(name, { detail: { message: i18n.t(messageKey) } }));
    }

    /** Extracts the url, lowercased method and status from a failed request. */
    private describeError(error: AxiosError): { url: string; method: string; status: number | undefined } {
        return {
            url: error.config?.url ?? '',
            method: (error.config?.method ?? '').toLowerCase(),
            status: error.response?.status,
        };
    }

    /** Maps interesting HTTP statuses to global app events, then re-rejects so callers still see the error. */
    private handleResponseError(error: AxiosError): Promise<never> {
        const { url, method, status } = this.describeError(error);

        // A 401 on the login request (POST /sessions) is a wrong-credentials
        // error, not an expired session — don't fire the global event for it.
        // GET/DELETE /sessions/current (me/logout) still count as expired.
        const isLoginAttempt = method === 'post' && url.endsWith('/sessions');

        if (status === 401 && !isLoginAttempt) {
            this.emitAppEvent(APP_EVENTS.SESSION_EXPIRED, 'auth.session_expired');
        }

        if (status === 403) {
            this.emitAppEvent(APP_EVENTS.FORBIDDEN, 'errors.forbidden');
        }

        if (status === 503) {
            this.emitAppEvent(APP_EVENTS.SERVICE_UNAVAILABLE, 'errors.service_unavailable');
        }

        return Promise.reject(error);
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

    /** Runs a body-bearing request, validates the response shape, and maps it to an ApiResult. */
    private async runMutation<T>(method: string, url: string, send: () => Promise<{ data: T }>): Promise<ApiResult<T>> {
        try {
            const { data } = await send();

            if (!this.isValidResponse<T>(data)) {
                this.logError(url, method, 'Invalid response: empty or null data');
                return { ok: false, error: 'Invalid response' };
            }

            return { ok: true, data };
        } catch (error) {
            this.logError(url, method, error);
            return { ok: false, error: this.extractErrorMessage(error) };
        }
    }

    async post<T>(url: string, payload?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
        return this.runMutation<T>('POST', url, () => this.axiosInstance.post<T>(url, payload, config));
    }

    async patch<T>(url: string, payload?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
        return this.runMutation<T>('PATCH', url, () => this.axiosInstance.patch<T>(url, payload, config));
    }

    async put<T>(url: string, payload?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
        return this.runMutation<T>('PUT', url, () => this.axiosInstance.put<T>(url, payload, config));
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

    /** Parses a successful raw result, mapping a parse miss to a 'Parse failed' ApiResult. */
    private finalizeValidated<T>(raw: ApiResult<unknown>, parse: (raw: unknown) => T | null, url: string, method: string): ApiResult<T> {
        if (!raw.ok) {
            return raw;
        }

        const result = parse(raw.data);

        if (result === null) {
            this.logError(url, method, 'Parse failed: unexpected response shape');
            return { ok: false, error: 'Parse failed' };
        }

        return { ok: true, data: result };
    }

    async getValidated<T>(url: string, parse: (raw: unknown) => T | null, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
        return this.finalizeValidated(await this.get<unknown>(url, config), parse, url, 'GET');
    }

    async postValidated<T>(url: string, parse: (raw: unknown) => T | null, payload?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
        return this.finalizeValidated(await this.post<unknown>(url, payload, config), parse, url, 'POST');
    }

    async patchValidated<T>(url: string, parse: (raw: unknown) => T | null, payload?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
        return this.finalizeValidated(await this.patch<unknown>(url, payload, config), parse, url, 'PATCH');
    }

    async putValidated<T>(url: string, parse: (raw: unknown) => T | null, payload?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
        return this.finalizeValidated(await this.put<unknown>(url, payload, config), parse, url, 'PUT');
    }

    getAxiosInstance(): AxiosInstance {
        return this.axiosInstance;
    }
}

export const apiClient = new ApiClient();
export default apiClient;
