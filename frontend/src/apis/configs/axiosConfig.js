import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:5000/api',
});

// --- NEW: Global interceptor for Session Expiration ---
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // If the backend returns a 401 Unauthorized (Token Expired/Invalid)
        if (error.response && error.response.status === 401) {
            alert("Your session has expired. Please log in again.");
            localStorage.clear(); // Wipe the session data
            window.location.href = '/'; // Kick them back to the login page
        }
        return Promise.reject(error);
    }
);

export default api;