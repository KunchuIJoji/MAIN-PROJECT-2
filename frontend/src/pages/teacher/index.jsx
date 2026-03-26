import { useState, useEffect } from 'react';
import { Container, Paper, Typography, TextField, Button, Grid, Box, Alert, Card, CardContent, Divider, Chip, Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress, MenuItem, Tabs, Tab, Accordion, AccordionSummary, AccordionDetails, Avatar, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton } from '@mui/material';
import { GetTeacherProfile, UpdateTeacherProfile, GetAssignedStudents, UpdateStudentGPA, VerifyCertification, GetStudentRoadmap, ToggleMilestone, PromoteStudent, VerifyStudentProfile, EditStudentProfile, GetTeacherJobRequests, RecommendStudent, BulkVerifyCertifications } from '../../apis/TeacherAPI';
import { Header } from '../../components/header'; 
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SendIcon from '@mui/icons-material/Send';
import WcIcon from '@mui/icons-material/Wc';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import WarningIcon from '@mui/icons-material/Warning';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';

export const TeacherDashboard = () => {
    const [tabIndex, setTabIndex] = useState(0); 

    const [profile, setProfile] = useState({ assigned_batch: '', assigned_branch: '', advisor_role: '', profile_photo_url: null });
    const [photoFile, setPhotoFile] = useState(null); 
    const [myProfileModalOpen, setMyProfileModalOpen] = useState(false); 

    const [students, setStudents] = useState([]);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [isLocked, setIsLocked] = useState(false);

    const [openRoadmapModal, setOpenRoadmapModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [roadmapData, setRoadmapData] = useState([]);

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({ id: null, full_name: '', batch: '', branch: '', gender: '', gpa: '', active_backlogs: 0 });

    const [academicModalOpen, setAcademicModalOpen] = useState(false);
    const [currentAcademicStudent, setCurrentAcademicStudent] = useState(null);
    const [sgpaData, setSgpaData] = useState({});

    const [jobRequests, setJobRequests] = useState([]);
    const [recModalOpen, setRecModalOpen] = useState(false);
    const [recData, setRecData] = useState({ request_id: null, student_id: null, student_name: '', reason: '' });

    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [selectedCerts, setSelectedCerts] = useState([]);

    useEffect(() => { 
        fetchData(); 
    }, []);

    useEffect(() => {
        if (tabIndex === 1 && isLocked) {
            fetchJobRequests();
        }
    }, [tabIndex, isLocked]);

    const fetchData = async () => {
        try {
            const profileData = await GetTeacherProfile();
            setProfile({ 
                assigned_batch: profileData.assigned_batch || '', 
                assigned_branch: profileData.assigned_branch || '',
                advisor_role: profileData.advisor_role || '',
                profile_photo_url: profileData.profile_photo_url || null
            });

            if (profileData.assigned_batch && profileData.assigned_branch) {
                setIsLocked(true); 
                const studentsData = await GetAssignedStudents();
                setStudents(studentsData);
            }
        } catch (err) {
            if (err.response?.status !== 404) setError("Failed to load data.");
        }
    };

    const fetchJobRequests = async () => {
        try {
            const data = await GetTeacherJobRequests();
            setJobRequests(data);
        } catch (err) {
            setError("Failed to load corporate requests.");
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setMessage(null); setError(null);
        
        const formData = new FormData();
        if (photoFile) formData.append('profile_photo', photoFile);
        formData.append('assigned_batch', profile.assigned_batch);
        formData.append('assigned_branch', profile.assigned_branch);
        formData.append('advisor_role', profile.advisor_role);

        try {
            const res = await UpdateTeacherProfile(formData);
            setMessage(res.message);
            
            if (res.profile_photo_url) {
                localStorage.setItem('profile_photo', res.profile_photo_url);
            }
            
            setPhotoFile(null);
            setMyProfileModalOpen(false); 
            fetchData(); 
        } catch (err) { setError(err.response?.data?.message || "Error updating profile."); }
    };

    const handleVerifyProfile = async (studentId, status) => {
        try {
            await VerifyStudentProfile(studentId, status);
            setMessage(`Student profile successfully marked as ${status}!`);
            fetchData(); 
        } catch (err) { setError("Failed to verify student profile."); }
    };

    const handleEditClick = (student) => {
        setEditData({ 
            id: student.id, 
            full_name: student.full_name || '', 
            batch: student.batch || '', 
            branch: student.branch || '',
            gender: student.gender || '',
            gpa: student.gpa || '',
            active_backlogs: student.active_backlogs || 0
        });
        setEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setMessage(null); setError(null);
        try {
            await EditStudentProfile(editData.id, editData);
            setMessage("Student details updated successfully!");
            setEditModalOpen(false);
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update student details.");
        }
    };

    const handleOpenAcademicRecord = (student) => {
        setCurrentAcademicStudent(student);
        setSgpaData(student.sgpa_history || {});
        setAcademicModalOpen(true);
    };

    const handleSgpaChange = (semester, value) => {
        setSgpaData(prev => ({ ...prev, [semester]: value }));
    };

    const handleAcademicSubmit = async (e) => {
        e.preventDefault();
        setMessage(null); setError(null);
        try {
            await UpdateStudentGPA(currentAcademicStudent.id, sgpaData);
            setMessage("Academic records updated and CGPA recalculated successfully!");
            setAcademicModalOpen(false);
            fetchData(); 
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update academic records.");
        }
    };

    // --- UPDATED: Automated Grading ---
    const handleVerifyCert = async (certId, currentStatus) => {
        try {
            let requestData = {};
            if (!currentStatus) {
                // If it is currently pending, we want to verify it
                requestData = { status: 'Verified' }; 
            } else {
                // If it is verified, we want to reject/undo it
                requestData = { status: 'Pending' }; 
            }
            
            // The backend handles the grade_point calculation now based on 'source'
            await VerifyCertification(certId, requestData);
            setMessage(`Certification ${!currentStatus ? 'verified and graded automatically' : 'unverified'} successfully!`);
            fetchData(); 
        } catch (err) { setError("Failed to process certification."); }
    };

    const handleBulkVerifyOpen = () => {
        setSelectedCerts([]);
        setBulkModalOpen(true);
    };

    const handleCertCheckboxToggle = (certId) => {
        setSelectedCerts(prev => 
            prev.includes(certId) ? prev.filter(id => id !== certId) : [...prev, certId]
        );
    };

    // --- UPDATED: Bulk Verify now uses Auto-grading ---
    const handleBulkVerifySubmit = async () => {
        setMessage(null); setError(null);
        if (selectedCerts.length === 0) return setError("Please select at least one certification.");
        
        try {
            // We no longer send the manual bulkGrade from the state. 
            // The backend will grade each individually based on source.
            const res = await BulkVerifyCertifications({
                cert_ids: selectedCerts
            });
            setMessage(res.message);
            setBulkModalOpen(false);
            fetchData();
        } catch (err) {
            setError("Failed to bulk verify certifications.");
        }
    };

    const handleOpenRoadmap = async (student) => {
        setSelectedStudent(student);
        try {
            const data = await GetStudentRoadmap(student.id);
            setRoadmapData(data);
            setOpenRoadmapModal(true);
        } catch (err) {
            setError("Could not load roadmap. Student may not have set it up yet.");
        }
    };

    const handleToggleMilestone = async (milestoneId) => {
        try {
            await ToggleMilestone(milestoneId);
            const data = await GetStudentRoadmap(selectedStudent.id);
            setRoadmapData(data);
        } catch (err) { setError("Failed to update milestone."); }
    };

    const handlePromoteStudent = async (studentId) => {
        if (window.confirm("Are you sure you want to promote this student to the next year?")) {
            try {
                await PromoteStudent(studentId);
                setMessage("Student successfully promoted!");
                fetchData(); 
                setOpenRoadmapModal(false);
            } catch (err) { setError(err.response?.data?.message || "Failed to promote student."); }
        }
    };

    const openRecommendModal = (reqId, studentId, studentName) => {
        setRecData({ request_id: reqId, student_id: studentId, student_name: studentName, reason: '' });
        setRecModalOpen(true);
    };

    const handleRecommendSubmit = async () => {
        setMessage(null); setError(null);
        try {
            await RecommendStudent({
                request_id: recData.request_id,
                student_id: recData.student_id,
                reason: recData.reason
            });
            setMessage(`Successfully recommended ${recData.student_name} to the TPO!`);
            setRecModalOpen(false);
            fetchJobRequests(); 
        } catch (err) {
            setError(err.response?.data?.message || "Failed to send recommendation.");
        }
    };

    const formstyles = {
        width: '100%', backgroundColor: isLocked ? '#f5f5f5' : '#ffffff', borderRadius: '4px',
        '& .MuiInputLabel-root': { color: '#333' },
        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#ccc' }, '&:hover fieldset': { borderColor: isLocked ? '#ccc' : '#21D4FD' }, '&.Mui-focused fieldset': { borderColor: '#21D4FD' } },
    };

    const completedMilestones = roadmapData.filter(m => m.is_completed).length;
    const progressPercent = roadmapData.length > 0 ? (completedMilestones / roadmapData.length) * 100 : 0;

    const allPendingCerts = students.flatMap(s => 
        s.certifications.filter(c => !c.is_verified).map(c => ({...c, studentName: s.full_name}))
    );

    const atRiskStudents = students.filter(s => (s.active_backlogs >= 2) || (s.gpa !== null && s.gpa < 6.5));

    return (
        <>
            <Header /> 
            <Box sx={{ background: 'linear-gradient(135deg, #62cff4 0%, #2c67f2 50%, #9c27b0 100%)', minHeight: '100vh', width: '100%', pt: 12, pb: 5 }}>
                <Container maxWidth="lg">
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                        <Typography variant="h3" fontWeight="bold" color="white">
                            Teacher Dashboard
                        </Typography>
                        <Button 
                            variant="contained" 
                            color="secondary" 
                            onClick={() => setMyProfileModalOpen(true)}
                            sx={{ fontWeight: 'bold', borderRadius: '20px', px: 3 }}
                        >
                            My Profile
                        </Button>
                    </Box>

                    {message && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setMessage(null)}>{message}</Alert>}
                    {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

                    <Paper elevation={3} sx={{ borderRadius: '15px', overflow: 'hidden', mb: 4, backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'rgba(255, 255, 255, 0.5)' }}>
                            <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} centered>
                                <Tab label="My Jurisdiction & Students" sx={{ fontWeight: 'bold' }} />
                                <Tab label="Corporate Job Requests" sx={{ fontWeight: 'bold' }} disabled={!isLocked} />
                            </Tabs>
                        </Box>

                        <Box p={4}>
                            {tabIndex === 0 && (
                                <Box>
                                    {atRiskStudents.length > 0 && (
                                        <Box mb={4}>
                                            <Typography variant="h6" fontWeight="bold" color="error.main" mb={2} display="flex" alignItems="center" gap={1}>
                                                <WarningIcon color="error" /> Students Requiring Attention ({atRiskStudents.length})
                                            </Typography>
                                            <Grid container spacing={2}>
                                                {atRiskStudents.map(student => (
                                                    <Grid item xs={12} sm={6} md={4} key={`risk-${student.id}`}>
                                                        <Card elevation={1} sx={{ borderLeft: '4px solid #d32f2f', backgroundColor: '#fff5f5' }}>
                                                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                                <Typography variant="subtitle2" fontWeight="bold">{student.full_name}</Typography>
                                                                <Box display="flex" flexDirection="column" gap={0.5} mt={1}>
                                                                    {student.active_backlogs >= 2 && (
                                                                        <Typography variant="caption" color="error.dark"><b>High Backlogs:</b> {student.active_backlogs}</Typography>
                                                                    )}
                                                                    {student.gpa !== null && student.gpa < 6.5 && (
                                                                        <Typography variant="caption" color="error.dark"><b>Low CGPA:</b> {student.gpa}</Typography>
                                                                    )}
                                                                </Box>
                                                                <Button size="small" variant="text" color="error" sx={{ mt: 1, p: 0, minWidth: 0, fontWeight: 'bold' }} onClick={() => handleEditClick(student)}>Review / Edit</Button>
                                                            </CardContent>
                                                        </Card>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </Box>
                                    )}
                                    
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
                                        <Typography variant="h5" fontWeight="bold" color="primary">Enrolled Students ({students.length})</Typography>
                                        
                                        {allPendingCerts.length > 0 && (
                                            <Button variant="contained" color="secondary" startIcon={<FactCheckIcon />} onClick={handleBulkVerifyOpen}>
                                                Bulk Verify Certs ({allPendingCerts.length} Pending)
                                            </Button>
                                        )}
                                    </Box>

                                    {students.length === 0 ? (
                                        <Typography variant="body1" fontStyle="italic">No students found for this Batch and Branch.</Typography>
                                    ) : (
                                        <Grid container spacing={3}>
                                            {students.map((student) => (
                                                <Grid item xs={12} md={6} key={student.id}>
                                                    <Card elevation={2} sx={{ borderRadius: '10px', height: '100%', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                        <CardContent>
                                                            
                                                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                                                <Box display="flex" gap={2}>
                                                                    <Avatar 
                                                                        src={student.profile_photo_url ? `http://127.0.0.1:5000${student.profile_photo_url}` : ''} 
                                                                        sx={{ width: 60, height: 60, border: '2px solid #1976d2' }} 
                                                                    />
                                                                    <Box>
                                                                        <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>
                                                                            {student.full_name}
                                                                        </Typography>
                                                                        <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                                                                            Gender: {student.gender || 'Not Specified'}
                                                                        </Typography>
                                                                        
                                                                        <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                                                                            {student.verification_status === 'Pending' && (
                                                                                <>
                                                                                    <Button size="small" variant="contained" color="success" onClick={() => handleVerifyProfile(student.id, 'Approved')}>Approve</Button>
                                                                                    <Button size="small" variant="outlined" color="error" onClick={() => handleVerifyProfile(student.id, 'Rejected')}>Reject</Button>
                                                                                </>
                                                                            )}
                                                                            {student.verification_status === 'Approved' && (
                                                                                <Chip label="Profile Approved" color="success" size="small" sx={{ fontWeight: 'bold' }} />
                                                                            )}
                                                                            <Button size="small" variant="outlined" color="primary" onClick={() => handleEditClick(student)}>Edit</Button>
                                                                        </Box>
                                                                    </Box>
                                                                </Box>

                                                                <Box textAlign="right">
                                                                    <Typography variant="body2" color="textSecondary" fontWeight="bold">
                                                                        CGPA: <span style={{ color: '#1976d2', fontSize: '1.1rem' }}>{student.gpa || 'N/A'}</span> <br/> 
                                                                        <span style={{ color: student.active_backlogs > 0 ? '#d32f2f' : '#4caf50' }}>Backlogs: {student.active_backlogs || 0}</span> <br/>
                                                                        <span style={{ color: '#9c27b0' }}>Points: {student.total_grade_points || 0}</span>
                                                                    </Typography>
                                                                </Box>
                                                            </Box>

                                                            <Box display="flex" justifyContent="space-between" alignItems="flex-end" mt={2} mb={1}>
                                                                <Box>
                                                                    {student.roadmap_preference ? (
                                                                        <Typography variant="caption" color="primary" fontWeight="bold">Year {student.current_year} of {student.program_duration} • {student.roadmap_preference}</Typography>
                                                                    ) : (
                                                                        <Typography variant="caption" color="textSecondary" fontStyle="italic" display="block">Roadmap not setup</Typography>
                                                                    )}
                                                                </Box>
                                                                
                                                                <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end">
                                                                    {student.resume_url && (
                                                                        <Button size="small" variant="outlined" color="inherit" href={`http://127.0.0.1:5000${student.resume_url}`} target="_blank" startIcon={<PictureAsPdfIcon />}>
                                                                            Resume
                                                                        </Button>
                                                                    )}
                                                                    <Button size="small" variant="outlined" color="secondary" disabled={!student.roadmap_preference} onClick={() => handleOpenAcademicRecord(student)}>Academics</Button>
                                                                    <Button size="small" variant="contained" color="info" disabled={!student.roadmap_preference} onClick={() => handleOpenRoadmap(student)}>Mentorship</Button>
                                                                </Box>
                                                            </Box>
                                                            
                                                            <Divider sx={{ my: 1 }} />
                                                            <Typography variant="subtitle2" color="textSecondary" mb={1}>Certifications ({student.certifications.length}):</Typography>
                                                            {student.certifications.length === 0 ? (
                                                                <Typography variant="body2" fontStyle="italic" color="textSecondary">No certifications uploaded.</Typography>
                                                            ) : (
                                                                student.certifications.map((cert) => (
                                                                    <Box key={cert.id} display="flex" justifyContent="space-between" alignItems="center" mb={1} p={1} sx={{ backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
                                                                        <Box>
                                                                            <Typography variant="body2" fontWeight="bold">{cert.name}</Typography>
                                                                            <Typography variant="caption" color="textSecondary">
                                                                                {cert.category} | Source: <span style={{fontWeight: 'bold'}}>{cert.source || 'Other'}</span>
                                                                            </Typography>
                                                                            <br/>
                                                                            <Typography variant="caption" color="textSecondary">
                                                                                Skill: <span style={{color: '#1976d2', fontWeight: 'bold'}}>{cert.specific_skill}</span>
                                                                                {cert.is_verified && <span style={{color: '#4caf50', fontWeight: 'bold'}}> | Auto-Grade: {cert.grade_point}/5</span>}
                                                                            </Typography>
                                                                        </Box>
                                                                        <Box display="flex" alignItems="center" gap={1}>
                                                                            {cert.file_url && (
                                                                                <Button size="small" variant="outlined" color="primary" href={`http://127.0.0.1:5000${cert.file_url}`} target="_blank" startIcon={<PictureAsPdfIcon />}>
                                                                                    View PDF
                                                                                </Button>
                                                                            )}
                                                                            <Chip label={cert.status || (cert.is_verified ? "Verified" : "Pending")} color={cert.status === 'Verified' || cert.is_verified ? "success" : cert.status === 'Rejected' ? "error" : "warning"} size="small" />
                                                                            
                                                                            <Button size="small" variant={cert.is_verified || cert.status === 'Verified' ? "text" : "contained"} color={cert.is_verified || cert.status === 'Verified' ? "error" : "success"} onClick={() => handleVerifyCert(cert.id, cert.is_verified || cert.status === 'Verified')}>
                                                                                {cert.is_verified || cert.status === 'Verified' ? "Undo" : "Verify & Assign Pts"}
                                                                            </Button>
                                                                        </Box>
                                                                    </Box>
                                                                ))
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    )}
                                </Box>
                            )}

                            {/* --- TAB 1: CORPORATE JOB REQUESTS --- */}
                            {tabIndex === 1 && (
                                <Box>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                                        <Typography variant="h5" fontWeight="bold" color="primary">TPO Placement Opportunities</Typography>
                                        {profile.advisor_role !== 'CSA' && (
                                            <Alert severity="info" sx={{ py: 0 }}>Note: Only the CSA can officially recommend students.</Alert>
                                        )}
                                    </Box>

                                    {jobRequests.length === 0 ? (
                                        <Typography fontStyle="italic" color="textSecondary">The TPO has not sent any job requests yet.</Typography>
                                    ) : (
                                        jobRequests.map(req => {
                                            return (
                                                <Accordion key={req.request_id} sx={{ mb: 2, borderRadius: '8px', overflow: 'hidden', borderLeft: '5px solid #2196f3' }}>
                                                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#f4f6f8' }}>
                                                        <Box display="flex" flexDirection="column" width="100%">
                                                            <Typography variant="h6" fontWeight="bold" color="primary.dark">{req.company_name}</Typography>
                                                            <Typography variant="body2" color="textSecondary">Role: {req.job_role}</Typography>
                                                        </Box>
                                                    </AccordionSummary>
                                                    <AccordionDetails sx={{ p: 3, bgcolor: '#fff' }}>
                                                        <Typography variant="body2" mb={2}><b>Description:</b> {req.description}</Typography>
                                                        <Typography variant="caption" color="error" fontWeight="bold" display="block" mb={3}>Expires: {req.expiry_date}</Typography>

                                                        <Grid container spacing={4}>
                                                            <Grid item xs={12} md={6}>
                                                                <Typography variant="subtitle2" fontWeight="bold" color="success.main" mb={1}>Students Selected by TPO:</Typography>
                                                                {req.received_students.length === 0 ? (
                                                                    <Typography variant="body2" fontStyle="italic" color="textSecondary">None of your students were directly selected.</Typography>
                                                                ) : (
                                                                    req.received_students.map(s => (
                                                                        <Box key={s.id} display="flex" justifyContent="space-between" alignItems="center" p={1} mb={1} sx={{ bgcolor: '#e8f5e9', borderRadius: '4px' }}>
                                                                            <Typography variant="body2" fontWeight="bold">{s.name}</Typography>
                                                                            <Chip label={s.status} size="small" color={s.status === 'Accepted' ? 'success' : s.status === 'Pending' ? 'warning' : 'error'} />
                                                                        </Box>
                                                                    ))
                                                                )}
                                                            </Grid>
                                                            
                                                            <Grid item xs={12} md={6}>
                                                                <Typography variant="subtitle2" fontWeight="bold" color="primary.main" mb={1}>Other Eligible Students in Batch:</Typography>
                                                                {req.eligible_to_recommend.length === 0 ? (
                                                                    <Typography variant="body2" fontStyle="italic" color="textSecondary">All students already received this offer.</Typography>
                                                                ) : (
                                                                    req.eligible_to_recommend.map(s => {
                                                                        const existingRec = req.my_recommendations.find(r => r.student_name === s.name);
                                                                        
                                                                        return (
                                                                            <Box key={s.id} display="flex" justifyContent="space-between" alignItems="center" p={1} mb={1} sx={{ border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                                                                                <Typography variant="body2" fontWeight="bold">{s.name}</Typography>
                                                                                
                                                                                {existingRec ? (
                                                                                    <Chip label={`Recommended: ${existingRec.status}`} size="small" color={existingRec.status === 'Accepted' ? 'success' : existingRec.status === 'Rejected' ? 'error' : 'info'} />
                                                                                ) : (
                                                                                    profile.advisor_role === 'CSA' ? (
                                                                                        <Button size="small" variant="contained" color="secondary" endIcon={<SendIcon />} onClick={() => openRecommendModal(req.request_id, s.id, s.name)}>
                                                                                            Recommend
                                                                                        </Button>
                                                                                    ) : (
                                                                                        <Chip label="Not Requested" size="small" variant="outlined" />
                                                                                    )
                                                                                )}
                                                                            </Box>
                                                                        );
                                                                    })
                                                                )}
                                                            </Grid>
                                                        </Grid>
                                                    </AccordionDetails>
                                                </Accordion>
                                            )
                                        })
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Container>
            </Box>

            {/* --- NEW: TEACHER OWN PROFILE MODAL --- */}
            <Dialog open={myProfileModalOpen} onClose={() => setMyProfileModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'secondary.main' }}>
                    <Typography variant="h6" fontWeight="bold">My Teacher Profile</Typography>
                    {isLocked && profile.advisor_role && (
                        <Chip icon={<AssignmentIndIcon />} label={profile.advisor_role === 'CSA' ? "Chief Staff Advisor" : "Staff Advisor"} color="primary" size="small" sx={{ fontWeight: 'bold' }} />
                    )}
                </DialogTitle>
                <form id="teacher-profile-form" onSubmit={handleProfileSubmit}>
                    <DialogContent dividers sx={{ backgroundColor: '#f9f9f9' }}>
                        <Box display="flex" flexDirection="column" alignItems="center" gap={2} mb={3}>
                            <Avatar 
                                src={profile.profile_photo_url ? `http://127.0.0.1:5000${profile.profile_photo_url}` : ''} 
                                sx={{ width: 100, height: 100, border: '3px solid #2196f3' }} 
                            />
                            <Button variant="outlined" component="label" startIcon={<AddPhotoAlternateIcon />} sx={{ backgroundColor: '#fff' }}>
                                Upload Profile Picture
                                <input type="file" hidden accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} />
                            </Button>
                            {photoFile && <Typography variant="caption" color="success.main" display="block">✓ {photoFile.name} selected</Typography>}
                        </Box>
                        
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Jurisdiction details (Batch, Branch, Role) are locked permanently once saved.
                        </Alert>
                        
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Batch Year" required value={profile.assigned_batch} disabled={isLocked} sx={formstyles} onChange={(e) => setProfile({ ...profile, assigned_batch: e.target.value })} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Branch" required value={profile.assigned_branch} disabled={isLocked} sx={formstyles} onChange={(e) => setProfile({ ...profile, assigned_branch: e.target.value })} />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField fullWidth select label="Role" required value={profile.advisor_role} disabled={isLocked} sx={formstyles} onChange={(e) => setProfile({ ...profile, advisor_role: e.target.value })}>
                                    <MenuItem value="CSA">Chief Staff Advisor (CSA)</MenuItem>
                                    <MenuItem value="SA">Staff Advisor (SA)</MenuItem>
                                </TextField>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setMyProfileModalOpen(false)} color="inherit">Cancel</Button>
                        <Button type="submit" form="teacher-profile-form" variant="contained" color={isLocked && !photoFile ? "success" : "primary"} disabled={isLocked && !photoFile}>
                            {isLocked && !photoFile ? "Locked" : "Save Profile"}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* --- UPDATED BULK VERIFY MODAL --- */}
            <Dialog open={bulkModalOpen} onClose={() => setBulkModalOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle fontWeight="bold" color="secondary">Bulk Verify Pending Certifications</DialogTitle>
                <DialogContent dividers sx={{ backgroundColor: '#f9f9f9' }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Select the certificates below that you wish to approve simultaneously. 
                        <strong> The system will automatically assign the appropriate Point Value based on the certificate's Source.</strong>
                    </Alert>

                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: 'secondary.main' }}>
                                <TableRow>
                                    <TableCell padding="checkbox">
                                        <Checkbox 
                                            sx={{ color: '#fff' }}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedCerts(allPendingCerts.map(c => c.id));
                                                } else {
                                                    setSelectedCerts([]);
                                                }
                                            }}
                                            checked={selectedCerts.length === allPendingCerts.length && allPendingCerts.length > 0}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Student</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Certificate</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Source</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>View Document</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {allPendingCerts.map((cert) => (
                                    <TableRow key={cert.id} hover>
                                        <TableCell padding="checkbox">
                                            <Checkbox 
                                                checked={selectedCerts.includes(cert.id)} 
                                                onChange={() => handleCertCheckboxToggle(cert.id)} 
                                            />
                                        </TableCell>
                                        <TableCell>{cert.studentName}</TableCell>
                                        <TableCell>{cert.name} <br/> <Typography variant="caption" color="primary">{cert.specific_skill}</Typography></TableCell>
                                        <TableCell><b>{cert.source || 'Other'}</b></TableCell>
                                        <TableCell>
                                            {cert.file_url ? (
                                                <Button size="small" href={`http://127.0.0.1:5000${cert.file_url}`} target="_blank" startIcon={<PictureAsPdfIcon />}>View</Button>
                                            ) : "No PDF"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {allPendingCerts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 3, fontStyle: 'italic' }}>No pending certificates found in your class.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setBulkModalOpen(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleBulkVerifySubmit} variant="contained" color="secondary" disabled={selectedCerts.length === 0}>
                        Auto-Grade Selected ({selectedCerts.length})
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- RECOMMENDATION MODAL --- */}
            <Dialog open={recModalOpen} onClose={() => setRecModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight="bold" color="secondary">Recommend Student to TPO</DialogTitle>
                <DialogContent dividers sx={{ backgroundColor: '#f9f9f9' }}>
                    <Typography variant="body1" mb={2}>
                        You are recommending <b>{recData.student_name}</b> for the selected job request.
                    </Typography>
                    <TextField 
                        fullWidth 
                        multiline 
                        rows={3} 
                        label="Reason for Recommendation" 
                        placeholder="E.g., This student has excellent soft skills and independently completed a relevant project..."
                        value={recData.reason} 
                        onChange={(e) => setRecData({...recData, reason: e.target.value})} 
                        sx={{ backgroundColor: '#fff' }}
                        required
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setRecModalOpen(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleRecommendSubmit} variant="contained" color="secondary" disabled={!recData.reason}>Send Recommendation</Button>
                </DialogActions>
            </Dialog>

            {/* --- ROADMAP MODAL --- */}
            <Dialog open={openRoadmapModal} onClose={() => setOpenRoadmapModal(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h6" fontWeight="bold">{selectedStudent?.full_name}'s Roadmap</Typography>
                        <Typography variant="body2" color="textSecondary">{selectedStudent?.roadmap_preference} • Year {selectedStudent?.current_year}</Typography>
                    </Box>
                    <Button variant="contained" color="secondary" disabled={selectedStudent?.current_year >= selectedStudent?.program_duration} onClick={() => handlePromoteStudent(selectedStudent?.id)}>Promote to Next Year</Button>
                </DialogTitle>
                <DialogContent dividers sx={{ backgroundColor: '#f9f9f9' }}>
                    <Box mb={3}>
                        <Typography variant="body2" fontWeight="bold" mb={1}>Overall Journey Progress: {Math.round(progressPercent)}%</Typography>
                        <LinearProgress variant="determinate" value={progressPercent} sx={{ height: 10, borderRadius: 5 }} color="success" />
                    </Box>
                    {roadmapData.map((m) => (
                        <Card key={m.id} elevation={1} sx={{ mb: 2, borderLeft: m.is_completed ? '5px solid #4caf50' : m.year_number === selectedStudent?.current_year ? '5px solid #2196f3' : '5px solid #ccc' }}>
                            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold" color={m.is_completed ? 'textSecondary' : 'textPrimary'}>{m.title}</Typography>
                                    <Typography variant="body2" color="textSecondary">{m.description}</Typography>
                                </Box>
                                <Button variant={m.is_completed ? "outlined" : "contained"} color={m.is_completed ? "inherit" : "success"} onClick={() => handleToggleMilestone(m.id)}>
                                    {m.is_completed ? "Undo" : "Mark Complete"}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenRoadmapModal(false)} variant="contained" color="inherit">Close Tracker</Button>
                </DialogActions>
            </Dialog>

            {/* --- EDIT STUDENT MODAL --- */}
            <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle fontWeight="bold" color="primary">Edit Student Details</DialogTitle>
                <form onSubmit={handleEditSubmit}>
                    <DialogContent dividers>
                        <TextField fullWidth label="Full Name" margin="dense" value={editData.full_name} onChange={(e) => setEditData({...editData, full_name: e.target.value})} required />
                        <TextField fullWidth label="Passout Year (e.g., 2024)" margin="dense" value={editData.batch} onChange={(e) => setEditData({...editData, batch: e.target.value})} required />
                        <TextField fullWidth label="Branch" margin="dense" value={editData.branch} onChange={(e) => setEditData({...editData, branch: e.target.value})} required />
                        <TextField fullWidth select label="Gender" margin="dense" value={editData.gender} onChange={(e) => setEditData({...editData, gender: e.target.value})} required>
                            <MenuItem value="Male">Male</MenuItem>
                            <MenuItem value="Female">Female</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                        </TextField>
                        <TextField fullWidth label="Active Backlogs" type="number" margin="dense" value={editData.active_backlogs} onChange={(e) => setEditData({...editData, active_backlogs: e.target.value})} required />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setEditModalOpen(false)} color="inherit">Cancel</Button>
                        <Button type="submit" variant="contained" color="primary">Save Changes</Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* --- ACADEMIC RECORDS (SGPA) MODAL --- */}
            <Dialog open={academicModalOpen} onClose={() => setAcademicModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight="bold" color="secondary">
                    Update Academic Records
                </DialogTitle>
                <form onSubmit={handleAcademicSubmit}>
                    <DialogContent dividers>
                        <Typography variant="body2" mb={3} color="textSecondary">
                            Enter the SGPA (Semester Grade Point Average) for each completed semester. 
                            The system will automatically average them to calculate the overall CGPA.
                        </Typography>
                        <Grid container spacing={2}>
                            {currentAcademicStudent && Array.from({ length: currentAcademicStudent.program_duration * 2 }, (_, i) => i + 1).map(sem => (
                                <Grid item xs={12} sm={6} key={`sem-${sem}`}>
                                    <TextField
                                        fullWidth
                                        label={`Semester ${sem} SGPA`}
                                        type="number"
                                        inputProps={{ step: "0.01", min: "0", max: "10" }}
                                        value={sgpaData[sem] || ''}
                                        onChange={(e) => handleSgpaChange(sem, e.target.value)}
                                        size="small"
                                        sx={{ backgroundColor: '#f9f9f9', borderRadius: '4px' }}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setAcademicModalOpen(false)} color="inherit">Cancel</Button>
                        <Button type="submit" variant="contained" color="secondary">Save & Update CGPA</Button>
                    </DialogActions>
                </form>
            </Dialog>

        </>
    );
};

export default TeacherDashboard;