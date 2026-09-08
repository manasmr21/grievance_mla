import axios from 'axios';
import { shouldIgnoreUnauthorizedUrl } from '../../utils/session';

export const api = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL, // Replace with your API base URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

let unauthorizedHandler = null;

/** Register a handler invoked on auth-expired API responses (401). */
export const setUnauthorizedHandler = (handler) => {
    unauthorizedHandler = typeof handler === 'function' ? handler : null;
};

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const url = error?.config?.url || '';

        if (status === 401 && !shouldIgnoreUnauthorizedUrl(url) && unauthorizedHandler) {
            try {
                unauthorizedHandler(error);
            } catch (handlerError) {
                console.error('Unauthorized handler failed:', handlerError);
            }
        }

        return Promise.reject(error);
    },
);

//Error catcher
export const getApiError = (error) => {
    // Preserve abort/cancel errors so callers can detect them via isAbortError().
    // getApiError must NOT wrap these in a new Error or the code/name properties are lost.
    if (
        error?.code === 'ERR_CANCELED' ||
        error?.name === 'CanceledError' ||
        error?.name === 'AbortError'
    ) {
        return error;
    }

    const context = {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        url: error?.config?.url,
        method: error?.config?.method
    };

    console.error("API Error context:", context);

    // If context is essentially empty, log the raw error too
    if (!context.message && !context.status && !context.url) {
        console.error("Raw API Error:", error);
    }

    const responseData = error?.response?.data;

    if (responseData && typeof responseData === 'object') {
        if (typeof responseData.message === "string") {
            return new Error(responseData.message);
        }

        if (Array.isArray(responseData.message)) {
            return new Error(responseData.message.join(", "));
        }
    }

    // If it's a string like "null" or something that isn't an object
    if (typeof responseData === 'string') {
        return new Error(responseData);
    }

    if (error?.message) {
        return new Error(error.message);
    }

    return error || new Error("An unknown API error occurred");
};