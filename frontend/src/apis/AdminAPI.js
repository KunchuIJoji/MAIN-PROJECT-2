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
        headers: {
            Authorization: `Bearer ${token}`
            // Axios automatically sets 'Content-Type': 'multipart/form-data' with boundaries when FormData is passed
        }
    };
};

export const GetRequests = async () => {
    const response = await api.get('/admin/requests', getAuthHeaders());
    return response.data;
};

export const ResolveRequest = async (userId, status) => {
    const response = await api.put(`/admin/resolve-request/${userId}`, { status }, getAuthHeaders());
    return response.data;
};

export const GetUsers = async () => {
    const response = await api.get('/admin/users', getAuthHeaders());
    return response.data;
};

export const VerifyStudentProfile = async (profileId, status) => {
    const response = await api.put(`/admin/verify-profile/${profileId}`, { status }, getAuthHeaders());
    return response.data;
};

// --- UPDATED: Uses Multipart Headers to support Photo Uploads ---
export const EditStudentProfile = async (profileId, formData) => {
    const response = await api.put(`/admin/edit-student/${profileId}`, formData, getMultipartAuthHeaders());
    return response.data;
};

// --- UPDATED: Uses Multipart Headers to support Photo Uploads ---
export const EditTeacherProfile = async (profileId, formData) => {
    const response = await api.put(`/admin/edit-teacher/${profileId}`, formData, getMultipartAuthHeaders());
    return response.data;
};

// --- NEW: Added TPO Edit for Photos ---
export const EditTpoProfile = async (userId, formData) => {
    const response = await api.put(`/admin/edit-tpo/${userId}`, formData, getMultipartAuthHeaders());
    return response.data;
};

export const DeleteUser = async (userId) => {
    const response = await api.delete(`/admin/delete-user/${userId}`, getAuthHeaders());
    return response.data;
};

export const BulkUploadUsers = async (formData) => {
    const response = await api.post('/admin/bulk-upload', formData, getMultipartAuthHeaders());
    return response.data;
};