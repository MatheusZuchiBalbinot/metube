// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@api/client';

// Spy on the axios instance methods directly through the exposed getter
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
    it('returns data on successful GET', async () => {
        mockAxiosGet({ id: 1, name: 'Alice' });
        const result = await apiClient.get('/test');
        expect(result).toEqual({ id: 1, name: 'Alice' });
    });

    it('returns null for empty object response', async () => {
        mockAxiosGet({});
        const result = await apiClient.get('/empty');
        expect(result).toBeNull();
    });

    it('returns null on network error', async () => {
        mockAxiosGetError(new Error('Network error'));
        const result = await apiClient.get('/fail');
        expect(result).toBeNull();
    });

    it('returns array responses (valid even if empty)', async () => {
        mockAxiosGet([]);
        const result = await apiClient.get('/list');
        expect(result).toEqual([]);
    });
});

describe('ApiClient.post', () => {
    it('returns data on successful POST', async () => {
        mockAxiosPost({ created: true });
        const result = await apiClient.post('/post', { name: 'x' });
        expect(result).toEqual({ created: true });
    });

    it('returns null on POST failure', async () => {
        mockAxiosPostError(new Error('Server error'));
        const result = await apiClient.post('/fail');
        expect(result).toBeNull();
    });

    it('returns null when POST response is empty object', async () => {
        mockAxiosPost({});
        const result = await apiClient.post('/empty');
        expect(result).toBeNull();
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
    it('returns data on successful PATCH', async () => {
        mockAxiosPatch({ updated: true });
        const result = await apiClient.patch('/item/1', {});
        expect(result).toEqual({ updated: true });
    });

    it('returns null on PATCH failure', async () => {
        vi.spyOn(axiosInstance, 'patch').mockRejectedValue(new Error('422'));
        const result = await apiClient.patch('/item/1');
        expect(result).toBeNull();
    });

    it('returns null for empty response', async () => {
        mockAxiosPatch({});
        const result = await apiClient.patch('/item/1');
        expect(result).toBeNull();
    });
});

describe('ApiClient.put', () => {
    it('returns data on successful PUT', async () => {
        mockAxiosPut({ ok: true });
        const result = await apiClient.put('/item/1', {});
        expect(result).toEqual({ ok: true });
    });

    it('returns null on PUT failure', async () => {
        vi.spyOn(axiosInstance, 'put').mockRejectedValue(new Error('500'));
        const result = await apiClient.put('/item/1');
        expect(result).toBeNull();
    });

    it('returns null for empty PUT response', async () => {
        mockAxiosPut({});
        const result = await apiClient.put('/item/1');
        expect(result).toBeNull();
    });
});

describe('ApiClient.delete', () => {
    it('returns null for 204 (no content)', async () => {
        mockAxiosDelete(null);
        const result = await apiClient.delete('/item/1');
        expect(result).toBeNull();
    });

    it('returns null on DELETE failure', async () => {
        vi.spyOn(axiosInstance, 'delete').mockRejectedValue(new Error('403'));
        const result = await apiClient.delete('/item/1');
        expect(result).toBeNull();
    });
});

describe('ApiClient.getValidated', () => {
    it('parses and returns valid response', async () => {
        mockAxiosGet({ foo: 'bar' });
        const parse = vi.fn((raw: unknown) => ({ parsed: (raw as Record<string, string>).foo }));
        const result = await apiClient.getValidated('/validated', parse);
        expect(result).toEqual({ parsed: 'bar' });
        expect(parse).toHaveBeenCalled();
    });

    it('returns null when get returns null', async () => {
        mockAxiosGetError(new Error('network'));
        const parse = vi.fn(() => ({ ok: true }));
        const result = await apiClient.getValidated('/null', parse);
        expect(result).toBeNull();
        expect(parse).not.toHaveBeenCalled();
    });

    it('returns null when parse returns null', async () => {
        mockAxiosGet({ x: 1 });
        const result = await apiClient.getValidated('/bad-shape', () => null);
        expect(result).toBeNull();
    });
});

describe('ApiClient.postValidated', () => {
    it('parses and returns valid response', async () => {
        mockAxiosPost({ id: 42 });
        const parse = vi.fn((raw: unknown) => ({ id: (raw as Record<string, number>).id }));
        const result = await apiClient.postValidated('/create', parse, {});
        expect(result).toEqual({ id: 42 });
    });

    it('returns null when parse fails', async () => {
        mockAxiosPost({ id: 1 });
        const result = await apiClient.postValidated('/bad', () => null, {});
        expect(result).toBeNull();
    });

    it('returns null when post fails', async () => {
        mockAxiosPostError(new Error('fail'));
        const result = await apiClient.postValidated('/fail', v => v, {});
        expect(result).toBeNull();
    });
});

describe('ApiClient.patchValidated', () => {
    it('returns parsed result on success', async () => {
        mockAxiosPatch({ name: 'new' });
        const result = await apiClient.patchValidated('/update', (raw: unknown) => (raw as Record<string, string>).name, {});
        expect(result).toBe('new');
    });

    it('returns null when patch fails', async () => {
        vi.spyOn(axiosInstance, 'patch').mockRejectedValue(new Error('fail'));
        const result = await apiClient.patchValidated('/fail', v => v, {});
        expect(result).toBeNull();
    });
});

describe('ApiClient.putValidated', () => {
    it('returns parsed result on success', async () => {
        mockAxiosPut({ status: 'ok' });
        const result = await apiClient.putValidated('/replace', (raw: unknown) => (raw as Record<string, string>).status, {});
        expect(result).toBe('ok');
    });

    it('returns null when put fails', async () => {
        vi.spyOn(axiosInstance, 'put').mockRejectedValue(new Error('fail'));
        const result = await apiClient.putValidated('/fail', v => v, {});
        expect(result).toBeNull();
    });
});
