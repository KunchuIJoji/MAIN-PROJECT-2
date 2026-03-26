import api from './configs/axiosConfig'

export const ResumeParser = async (file) => {
    const formData = new FormData();
    formData.append('file', file); 

    const res = await api.post('/resume-parser', formData);
    return res.data;
}

export const PredictStudent = async (data) => {
    const res = await api.post('/predict-student-placement', data);
    return res; 
}

export const RecommendSkills = async (data) => {
    const res = await api.post('/recommendSkills', data);
    return res.data;
}

// ==========================================
// VERSION 2.0: NEW STUDENT PROFILE ROUTES
// ==========================================

const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
};

export const GetStudentProfile = async () => {
    const response = await api.get('/student/profile', getAuthHeaders());
    return response.data;
};

// --- UPDATED: Uses FormData instead of JSON to handle Photo and Resume file uploads ---
export const UpdateStudentProfile = async (formData) => {
    const token = localStorage.getItem('access_token');
    const response = await api.post('/student/profile', formData, {
        headers: {
            Authorization: `Bearer ${token}`
            // Do NOT set Content-Type here; the browser will automatically set it to multipart/form-data
        }
    });
    return response.data;
};

// --- UPDATED: Uses FormData instead of JSON to handle PDF file uploads ---
export const AddCertification = async (formData) => {
    const token = localStorage.getItem('access_token');
    const response = await api.post('/student/certification', formData, {
        headers: {
            Authorization: `Bearer ${token}`,
            // Do NOT set Content-Type here; the browser will automatically set it to multipart/form-data
        }
    });
    return response.data;
};

// ==========================================
// NEW: STUDENT JOB INBOX ROUTES
// ==========================================

export const GetStudentJobRequests = async () => {
    const response = await api.get('/student/job-requests', getAuthHeaders());
    return response.data;
};

export const RespondToJobRequest = async (appId, status) => {
    const response = await api.put(`/student/job-requests/${appId}`, { status }, getAuthHeaders());
    return response.data;
};

// ==========================================
// NEW: STUDENT ROADMAP ROUTES
// ==========================================

export const SetupRoadmap = async (data) => {
    const response = await api.post('/student/setup-roadmap', data, getAuthHeaders());
    return response.data;
};

export const GetStudentRoadmap = async () => {
    const response = await api.get('/student/roadmap', getAuthHeaders());
    return response.data;
};