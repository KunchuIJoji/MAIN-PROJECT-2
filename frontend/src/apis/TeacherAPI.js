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

export const GetTeacherProfile = async () => {
    const response = await api.get('/teacher/profile', getAuthHeaders());
    return response.data;
};

// --- UPDATED: To support profile photo upload (multipart) ---
export const UpdateTeacherProfile = async (formData) => {
    const response = await api.post('/teacher/profile', formData, getMultipartAuthHeaders());
    return response.data;
};

export const GetAssignedStudents = async () => {
    const response = await api.get('/teacher/students', getAuthHeaders());
    return response.data;
};

export const VerifyStudentProfile = async (studentId, status) => {
    const response = await api.put(`/teacher/student/${studentId}/verify-profile`, { status }, getAuthHeaders());
    return response.data;
};

export const EditStudentProfile = async (studentId, data) => {
    const response = await api.put(`/teacher/student/${studentId}/edit`, data, getAuthHeaders());
    return response.data;
};

export const UpdateStudentGPA = async (studentId, sgpaHistory) => {
    const response = await api.put(`/teacher/student/${studentId}/gpa`, { sgpa_history: sgpaHistory }, getAuthHeaders());
    return response.data;
};

export const VerifyCertification = async (certId, updateData) => {
    const response = await api.put(`/teacher/certification/${certId}/verify`, updateData, getAuthHeaders());
    return response.data;
};

export const BulkVerifyCertifications = async (data) => {
    const response = await api.post('/teacher/certifications/bulk-verify', data, getAuthHeaders());
    return response.data;
};

export const GetStudentRoadmap = async (studentId) => {
    const response = await api.get(`/teacher/student/${studentId}/roadmap`, getAuthHeaders());
    return response.data;
};

export const ToggleMilestone = async (milestoneId) => {
    const response = await api.put(`/teacher/milestone/${milestoneId}/toggle`, {}, getAuthHeaders());
    return response.data;
};

export const PromoteStudent = async (studentId) => {
    const response = await api.put(`/teacher/student/${studentId}/promote`, {}, getAuthHeaders());
    return response.data;
};

export const GetTeacherJobRequests = async () => {
    const response = await api.get('/teacher/placement-requests', getAuthHeaders());
    return response.data;
};

export const RecommendStudent = async (data) => {
    const response = await api.post('/teacher/recommend-student', data, getAuthHeaders());
    return response.data;
};