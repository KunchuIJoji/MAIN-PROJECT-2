import axios from 'axios'; // <-- THIS IS THE MISSING LINE!

const BASE_URL = 'http://127.0.0.1:5000/api';

export const LoginUser = async (data) => {
    const response = await axios.post(`${BASE_URL}/login`, data);
    return response.data;
};

export const RegisterUser = async (data) => {
    const response = await axios.post(`${BASE_URL}/register`, data);
    return response.data;
};

export const CheckAdminExists = async () => {
    const response = await axios.get(`${BASE_URL}/check-admin`);
    return response.data.adminExists;
};

export const ChangePassword = async (data) => {
    try {
        const token = localStorage.getItem('access_token');
        const response = await axios.put(`${BASE_URL}/change-password`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error("Backend Password Error Details:", error);
        throw error;
    }
};