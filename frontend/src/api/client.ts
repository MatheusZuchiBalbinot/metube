import axios, { type AxiosError } from 'axios';
import i18n from '../i18n';
import { APP_EVENTS } from '../utils/events';

const client = axios.create({
    baseURL: '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        const url = error.config?.url ?? '';
        if (error.response?.status === 401 && !url.includes('/auth/login')) {
            window.dispatchEvent(new CustomEvent(APP_EVENTS.SESSION_EXPIRED, {
                detail: { message: i18n.t('auth.session_expired') },
            }));
        }
        return Promise.reject(error);
    },
);

export default client;
