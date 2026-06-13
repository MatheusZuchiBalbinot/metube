// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '@api/client';
import { APP_EVENTS } from '@utils';

const axiosInstance = apiClient.getAxiosInstance();

beforeEach(() => {
    vi.restoreAllMocks();
});

function mockAxiosGet(data: unknown, status = 200) {
    return vi.spyOn(axiosInstance, 'get').mockResolvedValue({ data, status });
}

function mockAxiosGetError(error: unknown) {
    return vi.spyOn(axiosInstance, 'get').mockRejectedValue(error);
}

function mockAxiosPost(data: unknown, status = 200) {
    return vi.spyOn(axiosInstance, 'post').mockResolvedValue({ data, status });
}

function mockAxiosPostError(error: unknown) {
    return vi.spyOn(axiosInstance, 'post').mockRejectedValue(error);
}

function mockAxiosPatch(data: unknown, status = 200) {
    return vi.spyOn(axiosInstance, 'patch').mockResolvedValue({ data, status });
}

function mockAxiosPut(data: unknown, status = 200) {
    return vi.spyOn(axiosInstance, 'put').mockResolvedValue({ data, status });
}

function mockAxiosDelete(data: unknown, status = 204) {
    return vi.spyOn(axiosInstance, 'delete').mockResolvedValue({ data, status });
}

describe('ApiClient.get', () => {
    it('returns ok result with data on successful GET', async () => {
        mockAxiosGet({ id: 1, name: 'Alice' });
        const result = await apiClient.get('/test');
        expect(result).toEqual({ ok: true, data: { id: 1, name: 'Alice' } });
    });

    it('returns ok:false for empty object response', async () => {
        mockAxiosGet({});
        const result = await apiClient.get('/empty');
        expect(result.ok).toBe(false);
    });

    it('returns ok:false on network error', async () => {
        mockAxiosGetError(new Error('Network error'));
        const result = await apiClient.get('/fail');
        expect(result.ok).toBe(false);
    });

    it('returns array responses as ok (valid even if empty)', async () => {
        mockAxiosGet([]);
        const result = await apiClient.get('/list');
        expect(result).toEqual({ ok: true, data: [] });
    });
});

describe('ApiClient.post', () => {
    it('returns ok result with data on successful POST', async () => {
        mockAxiosPost({ created: true });
        const result = await apiClient.post('/post', { name: 'x' });
        expect(result).toEqual({ ok: true, data: { created: true } });
    });

    it('returns ok:false on POST failure', async () => {
        mockAxiosPostError(new Error('Server error'));
        const result = await apiClient.post('/fail');
        expect(result.ok).toBe(false);
    });

    it('returns ok:false when POST response is empty object', async () => {
        mockAxiosPost({});
        const result = await apiClient.post('/empty');
        expect(result.ok).toBe(false);
    });
});

describe('ApiClient.postEmpty', () => {
    it('returns true on success', async () => {
        mockAxiosPost(null, 204);
        const result = await apiClient.postEmpty('/action');
        expect(result).toBe(true);
    });

    it('returns false on error', async () => {
        mockAxiosPostError(new Error('Fail'));
        const result = await apiClient.postEmpty('/fail');
        expect(result).toBe(false);
    });
});

describe('ApiClient.patch', () => {
    it('returns ok result with data on successful PATCH', async () => {
        mockAxiosPatch({ updated: true });
        const result = await apiClient.patch('/item/1', {});
        expect(result).toEqual({ ok: true, data: { updated: true } });
    });

    it('returns ok:false on PATCH failure', async () => {
        vi.spyOn(axiosInstance, 'patch').mockRejectedValue(new Error('422'));
        const result = await apiClient.patch('/item/1');
        expect(result.ok).toBe(false);
    });

    it('returns ok:false for empty response', async () => {
        mockAxiosPatch({});
        const result = await apiClient.patch('/item/1');
        expect(result.ok).toBe(false);
    });
});

describe('ApiClient.put', () => {
    it('returns ok result with data on successful PUT', async () => {
        mockAxiosPut({ status: 'active' });
        const result = await apiClient.put('/item/1', {});
        expect(result).toEqual({ ok: true, data: { status: 'active' } });
    });

    it('returns ok:false on PUT failure', async () => {
        vi.spyOn(axiosInstance, 'put').mockRejectedValue(new Error('500'));
        const result = await apiClient.put('/item/1');
        expect(result.ok).toBe(false);
    });

    it('returns ok:false for empty PUT response', async () => {
        mockAxiosPut({});
        const result = await apiClient.put('/item/1');
        expect(result.ok).toBe(false);
    });
});

describe('ApiClient.delete', () => {
    it('returns ok:true with undefined data for 204 (no content)', async () => {
        mockAxiosDelete(null);
        const result = await apiClient.delete('/item/1');
        expect(result).toEqual({ ok: true, data: undefined });
    });

    it('returns ok:false on DELETE failure', async () => {
        vi.spyOn(axiosInstance, 'delete').mockRejectedValue(new Error('403'));
        const result = await apiClient.delete('/item/1');
        expect(result.ok).toBe(false);
    });
});

describe('ApiClient.getValidated', () => {
    it('parses and returns ok result with parsed data', async () => {
        mockAxiosGet({ foo: 'bar' });
        const parse = vi.fn((raw: unknown) => ({ parsed: (raw as Record<string, string>).foo }));
        const result = await apiClient.getValidated('/validated', parse);
        expect(result).toEqual({ ok: true, data: { parsed: 'bar' } });
        expect(parse).toHaveBeenCalled();
    });

    it('returns ok:false when get fails', async () => {
        mockAxiosGetError(new Error('network'));
        const parse = vi.fn(() => ({ ok: true }));
        const result = await apiClient.getValidated('/null', parse);
        expect(result.ok).toBe(false);
        expect(parse).not.toHaveBeenCalled();
    });

    it('returns ok:false when parse returns null', async () => {
        mockAxiosGet({ x: 1 });
        const result = await apiClient.getValidated('/bad-shape', () => null);
        expect(result.ok).toBe(false);
    });
});

describe('ApiClient.postValidated', () => {
    it('parses and returns ok result with parsed data', async () => {
        mockAxiosPost({ id: 42 });
        const parse = vi.fn((raw: unknown) => ({ id: (raw as Record<string, number>).id }));
        const result = await apiClient.postValidated('/create', parse, {});
        expect(result).toEqual({ ok: true, data: { id: 42 } });
    });

    it('returns ok:false when parse fails', async () => {
        mockAxiosPost({ id: 1 });
        const result = await apiClient.postValidated('/bad', () => null, {});
        expect(result.ok).toBe(false);
    });

    it('returns ok:false when post fails', async () => {
        mockAxiosPostError(new Error('fail'));
        const result = await apiClient.postValidated('/fail', v => v, {});
        expect(result.ok).toBe(false);
    });
});

describe('ApiClient.patchValidated', () => {
    it('returns ok result with parsed data on success', async () => {
        mockAxiosPatch({ name: 'new' });
        const result = await apiClient.patchValidated('/update', (raw: unknown) => (raw as Record<string, string>).name, {});
        expect(result).toEqual({ ok: true, data: 'new' });
    });

    it('returns ok:false when patch fails', async () => {
        vi.spyOn(axiosInstance, 'patch').mockRejectedValue(new Error('fail'));
        const result = await apiClient.patchValidated('/fail', v => v, {});
        expect(result.ok).toBe(false);
    });
});

describe('ApiClient.putValidated', () => {
    it('returns ok result with parsed data on success', async () => {
        mockAxiosPut({ status: 'ok' });
        const result = await apiClient.putValidated('/replace', (raw: unknown) => (raw as Record<string, string>).status, {});
        expect(result).toEqual({ ok: true, data: 'ok' });
    });

    it('returns ok:false when put fails', async () => {
        vi.spyOn(axiosInstance, 'put').mockRejectedValue(new Error('fail'));
        const result = await apiClient.putValidated('/fail', v => v, {});
        expect(result.ok).toBe(false);
    });
});

describe('ApiClient interceptor — 401 handling', () => {
    const originalAdapter = axiosInstance.defaults.adapter;

    // Swap the adapter so the real response interceptor runs (spying on the
    // method would bypass the interceptor entirely).
    function rejectWith401() {
        axiosInstance.defaults.adapter = (config: InternalAxiosRequestConfig) => {
            const response = {
                status: 401,
                statusText: 'Unauthorized',
                data: {},
                headers: {},
                config,
            } as AxiosResponse;
            return Promise.reject(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, response));
        };
    }

    afterEach(() => {
        axiosInstance.defaults.adapter = originalAdapter;
    });

    it('does not fire SESSION_EXPIRED on a failed login (POST /sessions)', async () => {
        rejectWith401();
        const listener = vi.fn();
        window.addEventListener(APP_EVENTS.SESSION_EXPIRED, listener);

        const result = await apiClient.post('/sessions', { email: 'a@b.c', password: 'wrong' });

        expect(result.ok).toBe(false);
        expect(listener).not.toHaveBeenCalled();
        window.removeEventListener(APP_EVENTS.SESSION_EXPIRED, listener);
    });

    it('fires SESSION_EXPIRED on a 401 for the current session (GET /sessions/current)', async () => {
        rejectWith401();
        const listener = vi.fn();
        window.addEventListener(APP_EVENTS.SESSION_EXPIRED, listener);

        const result = await apiClient.get('/sessions/current');

        expect(result.ok).toBe(false);
        expect(listener).toHaveBeenCalledTimes(1);
        window.removeEventListener(APP_EVENTS.SESSION_EXPIRED, listener);
    });
});
