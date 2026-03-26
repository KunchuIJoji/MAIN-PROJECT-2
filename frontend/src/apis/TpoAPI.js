import api from './configs/axiosConfig';

const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
};

const getMultipartAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
        headers: { Authorization: `Bearer ${token}` }
    };
};

// --- NEW: TPO Profile Endpoints ---
export const GetTpoProfile = async () => {
    const response = await api.get('/tpo/profile', getAuthHeaders());
    return response.data;
};

export const UpdateTpoProfile = async (formData) => {
    const response = await api.post('/tpo/profile', formData, getMultipartAuthHeaders());
    return response.data;
};

export const GetExistingBranches = async () => {
    const response = await api.get('/tpo/branches', getAuthHeaders());
    return response.data;
};

export const FilterStudents = async (filters) => {
    const response = await api.post('/tpo/filter-students', filters, getAuthHeaders());
    return response.data;
};

export const SendJobRequest = async (data) => {
    const response = await api.post('/tpo/send-request', data, getAuthHeaders());
    return response.data;
};

export const GetTpoJobRequests = async () => {
    const response = await api.get('/tpo/job-requests', getAuthHeaders());
    return response.data;
};

export const HandleRecommendation = async (data) => {
    const response = await api.post('/tpo/handle-recommendation', data, getAuthHeaders());
    return response.data;
};

export const SendJobReminders = async (reqId) => {
    const response = await api.post(`/tpo/job-requests/${reqId}/remind`, {}, getAuthHeaders());
    return response.data;
};