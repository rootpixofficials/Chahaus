import axios from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor for API calls
api.interceptors.request.use(
    (config) => {
        let token = null;
        if (typeof window !== 'undefined') {
            token = localStorage.getItem('token');
        }
        
        // Fallback to cookies if localStorage is empty
        if (!token) {
            token = Cookies.get('token');
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for API calls
api.interceptors.response.use(
    (response) => {
        // Return data directly so existing code works
        return response.data;
    },
    (error) => {
        // Uniform error handling
        const message = error.response?.data?.message || 'Something went wrong';
        return Promise.reject(new Error(message));
    }
);

// Special method for file uploads (FormData) to match previous usage
api.upload = async (endpoint, formData) => {
    return api.post(endpoint, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

export default api;
