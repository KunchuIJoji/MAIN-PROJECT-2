import { useState, useEffect } from 'react';
import { Container, Paper, Typography, TextField, Button, Grid, Chip, Box, Alert, MenuItem, Tabs, Tab, Card, CardContent, Divider, Badge, Avatar } from '@mui/material';
import { GetStudentProfile, UpdateStudentProfile, AddCertification, GetStudentJobRequests, RespondToJobRequest, SetupRoadmap, GetStudentRoadmap } from '../../apis/StudentAPI';
import { Header } from '../../components/header';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

export const StudentProfile = () => {
    const [tabIndex, setTabIndex] = useState(0);

    const [profile, setProfile] = useState({ full_name: '', batch: '', branch: '', gender: '', gpa: 'Pending Teacher Update', sgpa_history: {}, active_backlogs: 0, verification_status: 'Unsubmitted', current_year: 1, program_duration: 4, roadmap_preference: null, profile_photo_url: null, resume_url: null });
    const [certifications, setCertifications] = useState([]);
    
    const [photoFile, setPhotoFile] = useState(null);
    const [resumeFile, setResumeFile] = useState(null);

    // --- UPDATED: Added 'source' to state ---
    const [newCert, setNewCert] = useState({ name: '', category: 'Programming', specific_skill: '', source: 'Coursera' });
    const [certFile, setCertFile] = useState(null); 
    
    const [milestoneFiles, setMilestoneFiles] = useState({});

    const [roadmapData, setRoadmapData] = useState(null);
    const [roadmapSetup, setRoadmapSetup] = useState({ preference: '' });
    
    const [isEditingRoadmap, setIsEditingRoadmap] = useState(false);

    const [jobRequests, setJobRequests] = useState([]);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProfile();
        fetchJobs(); 
    }, []);

    useEffect(() => {
        if (tabIndex === 2) fetchRoadmap();
    }, [tabIndex]);

    const fetchProfile = async () => {
        try {
            const data = await GetStudentProfile();
            setProfile({
                full_name: data.full_name || '', batch: data.batch || '', branch: data.branch || '', gender: data.gender || '',
                gpa: data.gpa || 'Pending Teacher Update', 
                sgpa_history: data.sgpa_history || {}, 
                active_backlogs: data.active_backlogs || 0,
                verification_status: data.verification_status || 'Unsubmitted',
                current_year: data.current_year || 1, program_duration: data.program_duration || 4, roadmap_preference: data.roadmap_preference || null,
                profile_photo_url: data.profile_photo_url || null, resume_url: data.resume_url || null
            });
            setCertifications(data.certifications || []);
        } catch (err) {
            if (err.response?.status === 404) setProfile(prev => ({ ...prev, verification_status: 'Unsubmitted' }));
            else setError("Failed to load profile data.");
        }
    };

    const fetchJobs = async () => {
        try { setJobRequests(await GetStudentJobRequests()); } 
        catch (err) { console.error(err); }
    };

    const fetchRoadmap = async () => {
        try { setRoadmapData(await GetStudentRoadmap()); } 
        catch (err) { setRoadmapData(null); }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault(); setMessage(null); setError(null);
        
        const formData = new FormData();
        formData.append('full_name', profile.full_name);
        formData.append('batch', profile.batch);
        formData.append('branch', profile.branch);
        formData.append('gender', profile.gender);
        
        if (photoFile) formData.append('profile_photo', photoFile);
        if (resumeFile) formData.append('resume', resumeFile);

        try {
            const res = await UpdateStudentProfile(formData);
            setMessage(res.message || "Profile updated!");
            
            if (res.profile_photo_url) {
                localStorage.setItem('profile_photo', res.profile_photo_url);
            }
            
            setPhotoFile(null);
            setResumeFile(null);
            fetchProfile(); 
        } catch (err) { setError(err.response?.data?.message || "Error updating profile."); }
    };

    const handleCertSubmit = async (e) => {
        e.preventDefault(); setMessage(null); setError(null);
        
        if (!certFile) {
            setError("Please upload the PDF file of your certificate.");
            return;
        }

        const formData = new FormData();
        formData.append('name', newCert.name);
        formData.append('category', newCert.category);
        formData.append('specific_skill', newCert.specific_skill);
        // --- NEW: Appending Source ---
        formData.append('source', newCert.source);
        formData.append('file', certFile);

        try {
            await AddCertification(formData);
            setMessage("Certification submitted! Points will be auto-assigned when verified.");
            // --- UPDATED: Resetting Source to default ---
            setNewCert({ name: '', category: 'Programming', specific_skill: '', source: 'Coursera' }); 
            setCertFile(null); 
            fetchProfile(); 
        } catch (err) { setError(err.response?.data?.message || "Error adding certification."); }
    };

    const handleMilestoneFileChange = (milestoneId, file) => {
        setMilestoneFiles(prev => ({ ...prev, [milestoneId]: file }));
    };

    const handleMilestoneCertSubmit = async (m) => {
        setMessage(null); setError(null);
        const file = milestoneFiles[m.id];
        if (!file) {
            setError("Please select a PDF file first.");
            return;
        }

        const formData = new FormData();
        formData.append('name', `Milestone Proof: ${m.title}`);
        formData.append('category', 'Roadmap Milestone');
        formData.append('specific_skill', m.required_skills || 'Roadmap Task');
        formData.append('source', 'Other'); // Milestones just default to "Other"
        formData.append('file', file);

        try {
            await AddCertification(formData);
            setMessage(`Proof submitted for "${m.title}". Your teacher will review it and manually update your roadmap.`);
            setMilestoneFiles(prev => ({ ...prev, [m.id]: null })); 
            fetchProfile(); 
        } catch (err) { 
            setError(err.response?.data?.message || "Error uploading proof."); 
        }
    };

    const handleResponse = async (appId, status) => {
        try {
            await RespondToJobRequest(appId, status);
            setMessage(`You have successfully ${status.toLowerCase()} the offer!`);
            fetchJobs(); setTimeout(() => setMessage(null), 3000);
        } catch (err) { setError(err.response?.data?.message || "Failed to submit response."); setTimeout(() => setError(null), 3000); }
    };

    const handleEditRoadmapClick = () => {
        setRoadmapSetup({
            preference: profile.roadmap_preference || ''
        });
        setIsEditingRoadmap(true);
    };

    const handleRoadmapSetup = async (e) => {
        e.preventDefault(); setMessage(null); setError(null);
        try {
            await SetupRoadmap({
                preference: roadmapSetup.preference,
                duration: profile.program_duration
            });
            setMessage("Your College Roadmap has been successfully updated!");
            setIsEditingRoadmap(false);
            fetchProfile(); fetchRoadmap();
        } catch (err) { setError(err.response?.data?.message || "Error generating roadmap."); }
    };

    const pendingCount = jobRequests.filter(req => req.status === 'Pending').length;
    const isTextLocked = profile.verification_status === 'Pending' || profile.verification_status === 'Approved';

    return (
        <>
            <Header /> 
            <Box sx={{ background: 'linear-gradient(135deg, #62cff4 0%, #2c67f2 50%, #9c27b0 100%)', minHeight: '100vh', pt: 12, pb: 5 }}>
                <Container maxWidth="lg">
                    <Typography variant="h3" fontWeight="bold" color="white" mb={4} textAlign="center">My Student Portal</Typography>

                    {message && <Alert severity="success" sx={{ mb: 3 }}>{message}</Alert>}
                    {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                    <Paper elevation={3} sx={{ borderRadius: '15px', overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'rgba(255, 255, 255, 0.5)' }}>
                            <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} centered>
                                <Tab label="My Profile & Certs" sx={{ fontWeight: 'bold' }} />
                                <Tab label={<Badge badgeContent={pendingCount} color="error">Job Offers Inbox</Badge>} sx={{ fontWeight: 'bold' }} />
                                <Tab label="My Roadmap" sx={{ fontWeight: 'bold' }} />
                            </Tabs>
                        </Box>

                        <Box p={4}>
                            {tabIndex === 0 && (
                                <Grid container spacing={4}>
                                    <Grid item xs={12} md={6}>
                                        <Paper elevation={2} sx={{ padding: '2rem', borderRadius: '15px', height: '100%', backgroundColor: 'rgba(255,255,255,0.7)' }}>
                                            
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                                                <Typography variant="h5" fontWeight="bold" color="primary">My Profile</Typography>
                                                <Avatar 
                                                    src={profile.profile_photo_url ? `http://127.0.0.1:5000${profile.profile_photo_url}` : ''} 
                                                    sx={{ width: 60, height: 60, border: '2px solid #2196f3' }} 
                                                />
                                            </Box>
                                            
                                            {profile.verification_status === 'Pending' && <Alert severity="warning" sx={{ mb: 2 }}>Your profile text details are under review and temporarily locked. You may still upload new files.</Alert>}
                                            {profile.verification_status === 'Approved' && <Alert severity="success" sx={{ mb: 2 }}>Your profile details are verified and locked. You may still upload new files.</Alert>}
                                            {profile.verification_status === 'Rejected' && <Alert severity="error" sx={{ mb: 2 }}>Your profile was rejected. Please correct your details below.</Alert>}
                                            
                                            <form onSubmit={handleProfileSubmit}>
                                                <TextField fullWidth label="Full Name" margin="normal" value={profile.full_name} disabled={isTextLocked} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} required />
                                                
                                                {/* --- FILE UPLOADS --- */}
                                                <Box sx={{ display: 'flex', gap: 2, mt: 1, mb: 1 }}>
                                                    <Button variant="outlined" component="label" fullWidth sx={{ backgroundColor: '#f9f9f9', display: 'flex', flexDirection: 'column', gap: 0.5, py: 1.5 }}>
                                                        <CloudUploadIcon color="primary" />
                                                        <Typography variant="caption" fontWeight="bold">Upload Photo (JPG/PNG)</Typography>
                                                        <input type="file" hidden accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} />
                                                    </Button>
                                                    <Button variant="outlined" component="label" fullWidth sx={{ backgroundColor: '#f9f9f9', display: 'flex', flexDirection: 'column', gap: 0.5, py: 1.5 }}>
                                                        <PictureAsPdfIcon color="error" />
                                                        <Typography variant="caption" fontWeight="bold">Upload Resume (PDF)</Typography>
                                                        <input type="file" hidden accept="application/pdf" onChange={(e) => setResumeFile(e.target.files[0])} />
                                                    </Button>
                                                </Box>

                                                {(photoFile || resumeFile) && (
                                                    <Alert severity="info" sx={{ py: 0, mb: 1 }}>
                                                        {photoFile && `Photo: ${photoFile.name} `} 
                                                        {resumeFile && `| Resume: ${resumeFile.name}`}
                                                    </Alert>
                                                )}

                                                {profile.resume_url && !resumeFile && (
                                                    <Box mb={2} display="flex" alignItems="center" gap={1}>
                                                        <CheckCircleIcon color="success" fontSize="small"/>
                                                        <Typography variant="body2" color="success.main" fontWeight="bold">Resume Uploaded:</Typography>
                                                        <Button size="small" href={`http://127.0.0.1:5000${profile.resume_url}`} target="_blank">View Current Resume</Button>
                                                    </Box>
                                                )}

                                                <Box sx={{ display: 'flex', gap: 2 }}>
                                                    <TextField fullWidth label="Batch Year" margin="normal" value={profile.batch} disabled={isTextLocked} onChange={(e) => setProfile({ ...profile, batch: e.target.value })} required />
                                                    <TextField fullWidth label="Branch" margin="normal" value={profile.branch} disabled={isTextLocked} onChange={(e) => setProfile({ ...profile, branch: e.target.value })} required />
                                                </Box>
                                                
                                                <TextField fullWidth select label="Gender" margin="normal" value={profile.gender} disabled={isTextLocked} onChange={(e) => setProfile({ ...profile, gender: e.target.value })} required>
                                                    <MenuItem value="Male">Male</MenuItem>
                                                    <MenuItem value="Female">Female</MenuItem>
                                                    <MenuItem value="Other">Other</MenuItem>
                                                </TextField>

                                                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                                                    <TextField fullWidth label="Official CGPA" value={profile.gpa} disabled sx={{ backgroundColor: '#f5f5f5', borderRadius: '5px' }} helperText="* Updated by your Teacher." />
                                                    <TextField fullWidth label="Active Backlogs" value={profile.active_backlogs} disabled sx={{ backgroundColor: '#f5f5f5', borderRadius: '5px' }} helperText="* Updated by your Teacher." />
                                                </Box>
                                                
                                                {profile.sgpa_history && Object.keys(profile.sgpa_history).length > 0 && (
                                                    <Box mt={2} mb={2} p={1.5} sx={{ backgroundColor: '#f0f7ff', borderRadius: '8px', border: '1px solid #90caf9' }}>
                                                        <Typography variant="subtitle2" color="primary.dark" fontWeight="bold" mb={1}>Semester Records (SGPA):</Typography>
                                                        <Grid container spacing={1}>
                                                            {Object.entries(profile.sgpa_history).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([sem, score]) => (
                                                                <Grid item xs={4} sm={3} key={sem}>
                                                                    <Chip label={`Sem ${sem}: ${score}`} size="small" sx={{ width: '100%', fontWeight: 'bold', backgroundColor: '#fff', border: '1px solid #bbdefb' }} />
                                                                </Grid>
                                                            ))}
                                                        </Grid>
                                                    </Box>
                                                )}

                                                <Button 
                                                    type="submit" 
                                                    variant="contained" 
                                                    color="primary" 
                                                    sx={{ mt: 2, width: '100%' }} 
                                                    disabled={isTextLocked && !photoFile && !resumeFile}
                                                >
                                                    {(photoFile || resumeFile) ? "Upload Selected Files" : 
                                                     profile.verification_status === 'Approved' ? "Profile Verified & Locked" : 
                                                     profile.verification_status === 'Pending' ? "Pending Teacher Approval" : "Save Details"}
                                                </Button>
                                            </form>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Paper elevation={2} sx={{ padding: '2rem', borderRadius: '15px', height: '100%', backgroundColor: 'rgba(255,255,255,0.7)' }}>
                                            <Typography variant="h5" fontWeight="bold" mb={3} color="secondary">My Certifications</Typography>
                                            
                                            {/* --- CERTIFICATE UPLOAD FORM --- */}
                                            <form onSubmit={handleCertSubmit} style={{ marginBottom: '2rem' }}>
                                                <TextField fullWidth label="Certificate Name" size="small" margin="normal" required value={newCert.name} onChange={(e) => setNewCert({ ...newCert, name: e.target.value })} />
                                                
                                                <Box sx={{ display: 'flex', gap: 2 }}>
                                                    <TextField fullWidth select label="Category" size="small" margin="normal" value={newCert.category} onChange={(e) => setNewCert({ ...newCert, category: e.target.value })} >
                                                        <MenuItem value="Programming">Programming</MenuItem>
                                                        <MenuItem value="Networking">Networking</MenuItem>
                                                        <MenuItem value="Cloud">Cloud/DevOps</MenuItem>
                                                        <MenuItem value="Data Science">Data Science</MenuItem>
                                                        <MenuItem value="Other">Other</MenuItem>
                                                    </TextField>

                                                    {/* --- NEW: SOURCE SELECTION DROPDOWN --- */}
                                                    <TextField fullWidth select label="Certificate Source" size="small" margin="normal" value={newCert.source} onChange={(e) => setNewCert({ ...newCert, source: e.target.value })} >
                                                        <MenuItem value="NPTEL">NPTEL (5 Pts)</MenuItem>
                                                        <MenuItem value="Coursera">Coursera (4 Pts)</MenuItem>
                                                        <MenuItem value="edX">edX (4 Pts)</MenuItem>
                                                        <MenuItem value="Udemy">Udemy (3 Pts)</MenuItem>
                                                        <MenuItem value="LinkedIn Learning">LinkedIn (3 Pts)</MenuItem>
                                                        <MenuItem value="Other">Other (2 Pts)</MenuItem>
                                                    </TextField>
                                                </Box>

                                                <TextField fullWidth label="Specific Skill (e.g. Python, React)" size="small" margin="normal" required value={newCert.specific_skill} onChange={(e) => setNewCert({ ...newCert, specific_skill: e.target.value })} />
                                                
                                                <Button variant="outlined" component="label" fullWidth sx={{ mt: 2, mb: 1, backgroundColor: '#f9f9f9' }}>
                                                    Upload Certificate PDF *
                                                    <input type="file" hidden accept="application/pdf" onChange={(e) => setCertFile(e.target.files[0])} />
                                                </Button>
                                                {certFile && <Typography variant="caption" color="success.main" display="block" mb={2} fontWeight="bold">{certFile.name} selected</Typography>}
                                                <Button type="submit" variant="contained" color="secondary" sx={{ mt: 1, width: '100%' }}>Add Certification</Button>
                                            </form>
                                            
                                            {/* --- CERTIFICATE DISPLAY AREA --- */}
                                            <Box>
                                                <Typography variant="subtitle2" color="textSecondary" mb={1}>Uploaded Certifications:</Typography>
                                                {certifications.length === 0 ? (
                                                    <Typography variant="body2" color="textSecondary" fontStyle="italic">No certifications uploaded yet.</Typography>
                                                ) : (
                                                    certifications.map((cert) => (
                                                        <Box key={cert.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, p: 1, border: '1px solid #ccc', borderRadius: '8px', bgcolor: '#fff' }}>
                                                            <Box>
                                                                <Typography variant="body1" fontWeight="bold">{cert.name}</Typography>
                                                                
                                                                {/* --- UPDATED: Displaying the Source --- */}
                                                                <Typography variant="caption" color="textSecondary" display="block">
                                                                    {cert.category} | Source: <span style={{fontWeight: 'bold'}}>{cert.source || 'Other'}</span>
                                                                </Typography>
                                                                <Typography variant="caption" color="textSecondary">
                                                                    Skill: <span style={{color: '#1976d2', fontWeight: 'bold'}}>{cert.specific_skill}</span>
                                                                </Typography>
                                                            </Box>
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                {cert.file_url && (
                                                                    <Button size="small" variant="text" href={`http://127.0.0.1:5000${cert.file_url}`} target="_blank" startIcon={<PictureAsPdfIcon />}>
                                                                        View
                                                                    </Button>
                                                                )}
                                                                <Box textAlign="right">
                                                                    <Chip label={cert.status || (cert.is_verified ? "Verified" : "Pending")} color={cert.status === 'Verified' || cert.is_verified ? "success" : cert.status === 'Rejected' ? "error" : "warning"} size="small" />
                                                                    {/* --- NEW: Display Grade Points if verified --- */}
                                                                    {(cert.status === 'Verified' || cert.is_verified) && (
                                                                        <Typography variant="caption" display="block" color="success.main" fontWeight="bold" mt={0.5}>
                                                                            +{cert.grade_point} Pts
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                        </Box>
                                                    ))
                                                )}
                                            </Box>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            )}

                            {tabIndex === 1 && (
                                <Box>
                                    <Typography variant="h5" fontWeight="bold" color="primary" mb={3}>Placement Opportunities</Typography>
                                    {jobRequests.length === 0 ? (
                                        <Typography fontStyle="italic" color="textSecondary">You currently have no pending job requests from the TPO.</Typography>
                                    ) : (
                                        jobRequests.map((req) => (
                                            <Card key={req.application_id} elevation={2} sx={{ mb: 3, borderRadius: '10px', borderLeft: req.status === 'Pending' ? '6px solid #ff9800' : req.status === 'Accepted' ? '6px solid #4caf50' : '6px solid #f44336' }}>
                                                <CardContent>
                                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                                        <Box>
                                                            <Typography variant="h6" fontWeight="bold" color="primary.dark">{req.company_name}</Typography>
                                                            <Typography variant="subtitle1" fontWeight="bold">Role: {req.job_role}</Typography>
                                                        </Box>
                                                        <Chip label={req.status} color={req.status === 'Pending' ? 'warning' : req.status === 'Accepted' ? 'success' : req.status === 'Expired' ? 'default' : 'error'} sx={{ fontWeight: 'bold' }} />
                                                    </Box>
                                                    <Typography variant="caption" color="textSecondary" display="block" mb={2}>Received: {req.created_at}</Typography>
                                                    <Typography variant="caption" color="error" display="block" mb={2} fontWeight="bold">Expires: {req.expiry_date}</Typography>
                                                    <Typography variant="body2" mb={3} sx={{ whiteSpace: 'pre-line' }}>{req.description || "No specific job description provided."}</Typography>
                                                    <Divider sx={{ mb: 2 }} />

                                                    {req.status === 'Pending' ? (
                                                        <Box display="flex" gap={2} justifyContent="flex-end">
                                                            <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => handleResponse(req.application_id, 'Rejected')}>Decline</Button>
                                                            <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleResponse(req.application_id, 'Accepted')}>Accept Offer</Button>
                                                        </Box>
                                                    ) : (
                                                        <Box display="flex" justifyContent="flex-end">
                                                            <Typography variant="body2" fontStyle="italic" color="textSecondary">{req.status === 'Expired' ? "This job offer has expired." : `You have already ${req.status.toLowerCase()} this offer.`}</Typography>
                                                        </Box>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </Box>
                            )}

                            {tabIndex === 2 && (
                                <Box>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
                                        <Typography variant="h5" fontWeight="bold" color="primary">My Career Roadmap Journey</Typography>
                                        
                                        {roadmapData && !isEditingRoadmap && (
                                            <Box display="flex" gap={1} alignItems="center">
                                                <Chip label={`${roadmapData.preference} Pathway`} color="secondary" sx={{ fontWeight: 'bold' }} />
                                                <Button size="small" variant="outlined" color="primary" onClick={handleEditRoadmapClick}>
                                                    Edit Pathway
                                                </Button>
                                            </Box>
                                        )}
                                    </Box>

                                    {!roadmapData || isEditingRoadmap ? (
                                        <Paper elevation={1} sx={{ p: 4, textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '10px' }}>
                                            <Typography variant="h6" mb={2}>{isEditingRoadmap ? "Update Your Journey" : "Set Up Your Journey"}</Typography>
                                            <Typography variant="body2" color="textSecondary" mb={3}>
                                                Choose your program and primary career interest. General aptitude skills are loaded for early years automatically.
                                            </Typography>
                                            <form onSubmit={handleRoadmapSetup} style={{ maxWidth: '400px', margin: '0 auto' }}>
                                                <TextField 
                                                    fullWidth 
                                                    select 
                                                    label="Program" 
                                                    margin="normal" 
                                                    value={profile.program_duration || ''} 
                                                    disabled={true}
                                                    helperText="Program is permanently locked from your registration details."
                                                    sx={{ backgroundColor: '#e0e0e0', borderRadius: '4px' }}
                                                >
                                                    <MenuItem value={2}>MCA (2 Years)</MenuItem>
                                                    <MenuItem value={5}>IMCA (5 Years)</MenuItem>
                                                    <MenuItem value={4}>B.Tech (4 Years)</MenuItem>
                                                </TextField>

                                                <TextField fullWidth select label="Area of Interest (Specialization)" required margin="normal" value={roadmapSetup.preference} onChange={(e) => setRoadmapSetup({ ...roadmapSetup, preference: e.target.value })}>
                                                    <MenuItem value="Data Science">Data Science & AI</MenuItem>
                                                    <MenuItem value="Web Development">Full-Stack Web Development</MenuItem>
                                                    <MenuItem value="Cybersecurity">Cybersecurity & Networking</MenuItem>
                                                    <MenuItem value="Cloud Computing">Cloud Computing & DevOps</MenuItem>
                                                </TextField>
                                                
                                                <Box display="flex" gap={2} mt={2}>
                                                    {isEditingRoadmap && (
                                                        <Button fullWidth variant="outlined" color="inherit" onClick={() => setIsEditingRoadmap(false)}>Cancel</Button>
                                                    )}
                                                    <Button type="submit" variant="contained" color="secondary" fullWidth sx={{ fontWeight: 'bold' }}>
                                                        {isEditingRoadmap ? "Update Roadmap" : "Generate AI Roadmap"}
                                                    </Button>
                                                </Box>
                                            </form>
                                        </Paper>
                                    ) : (
                                        <Box sx={{ position: 'relative', pt: 2, pb: 4 }}>
                                            <Box sx={{ position: 'absolute', top: '30px', bottom: '30px', left: '26px', width: '8px', backgroundColor: '#cfd8dc', zIndex: 1, borderRadius: '4px' }} />

                                            {Array.from({ length: roadmapData.program_duration }, (_, i) => i + 1).map(year => {
                                                const yearMilestones = roadmapData.milestones.filter(m => m.year_number === year);
                                                
                                                const isYearCompleted = yearMilestones.length > 0 && yearMilestones.every(m => m.is_completed);
                                                const isPast = year < roadmapData.current_year || isYearCompleted;
                                                const isCurrent = year === roadmapData.current_year && !isYearCompleted;
                                                const isFuture = year > roadmapData.current_year && !isYearCompleted;
                                                const cityColor = isPast ? '#4caf50' : (isCurrent ? '#2196f3' : '#9e9e9e');
                                                const isLastYear = year === roadmapData.program_duration;

                                                return (
                                                    <Box key={`city-${year}`} sx={{ position: 'relative', mb: 6 }}>
                                                        
                                                        {(isPast || isCurrent) && (
                                                            <Box sx={{ 
                                                                position: 'absolute', 
                                                                top: '30px', 
                                                                bottom: isLastYear ? '-30px' : '-60px', 
                                                                left: '26px', 
                                                                width: '8px', 
                                                                backgroundColor: '#4caf50', 
                                                                zIndex: 1, 
                                                                borderRadius: '4px' 
                                                            }} />
                                                        )}

                                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, position: 'relative', zIndex: 2 }}>
                                                            <Box sx={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: cityColor, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', border: '4px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                                                                <LocationCityIcon fontSize="large" />
                                                            </Box>
                                                            <Box sx={{ ml: 3, flexGrow: 1, p: 2, borderRadius: '8px', backgroundColor: isCurrent ? 'rgba(33, 150, 243, 0.05)' : 'transparent', border: isCurrent ? `1px dashed ${cityColor}` : 'none' }}>
                                                                <Typography variant="h5" fontWeight="bold" color={cityColor}> Year {year}</Typography>
                                                                <Typography variant="body2" color="textSecondary">{isPast ? "Journey completed." : isCurrent ? "You are here. Complete the junctions to advance." : "Road ahead is locked."}</Typography>
                                                            </Box>
                                                        </Box>

                                                        <Box sx={{ pl: 10, position: 'relative', zIndex: 2 }}>
                                                            {yearMilestones.map((m) => (
                                                                <Box key={m.id} sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                                                                    <Box sx={{ mr: 2, mt: 2, display: 'flex', alignItems: 'center' }}>
                                                                        <AltRouteIcon sx={{ color: m.is_completed ? '#4caf50' : (isCurrent ? '#ff9800' : '#9e9e9e'), transform: 'rotate(90deg)' }} />
                                                                    </Box>

                                                                    <Card elevation={m.is_completed ? 1 : 3} sx={{ flexGrow: 1, opacity: isFuture ? 0.6 : 1, borderLeft: m.is_completed ? '6px solid #4caf50' : (isCurrent ? '6px solid #ff9800' : '6px solid #9e9e9e') }}>
                                                                        <CardContent>
                                                                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                                                                <Typography variant="h6" fontWeight="bold" color={m.is_completed ? 'textSecondary' : 'textPrimary'} sx={{ textDecoration: m.is_completed ? 'line-through' : 'none' }}>
                                                                                    {m.title}
                                                                                </Typography>
                                                                                <Chip label={m.is_completed ? "Completed" : (isFuture ? "Locked" : "In Progress")} color={m.is_completed ? "success" : (isCurrent ? "warning" : "default")} icon={m.is_completed ? <CheckCircleIcon /> : null} size="small" />
                                                                            </Box>
                                                                            
                                                                            <Typography variant="body2" color="textSecondary" mb={2}>{m.description}</Typography>
                                                                            <Divider sx={{ mb: 2 }} />
                                                                            <Typography variant="subtitle2" fontWeight="bold" color="primary">Action Plan:</Typography>
                                                                            <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#555' }}>
                                                                                {m.sub_tasks && m.sub_tasks.split('\n').map((task, i) => (
                                                                                    <li key={i}><Typography variant="body2">{task}</Typography></li>
                                                                                ))}
                                                                            </ul>

                                                                            <Box display="flex" justifyContent="space-between" alignItems="flex-end" mt={2}>
                                                                                <Box flexGrow={1} mr={2}>
                                                                                    {!m.is_completed && !isFuture && (
                                                                                        <Box p={1.5} sx={{ backgroundColor: '#f4f6f8', borderRadius: '8px', border: '1px dashed #bbdefb' }}>
                                                                                            <Typography variant="caption" fontWeight="bold" color="primary" display="block" mb={1}>
                                                                                                Submit Proof of Work (PDF):
                                                                                            </Typography>
                                                                                            <Box display="flex" alignItems="center" gap={1} flexWrap="nowrap">
                                                                                                <Button variant="outlined" component="label" size="small" sx={{ backgroundColor: '#fff', whiteSpace: 'nowrap' }}>
                                                                                                    Choose File
                                                                                                    <input type="file" hidden accept="application/pdf" onChange={(e) => handleMilestoneFileChange(m.id, e.target.files[0])} />
                                                                                                </Button>
                                                                                                <Button 
                                                                                                    variant="contained" 
                                                                                                    color="primary" 
                                                                                                    size="small" 
                                                                                                    disabled={!milestoneFiles[m.id]}
                                                                                                    onClick={() => handleMilestoneCertSubmit(m)}
                                                                                                    sx={{ whiteSpace: 'nowrap' }}
                                                                                                >
                                                                                                    Upload Proof
                                                                                                </Button>
                                                                                            </Box>
                                                                                            {milestoneFiles[m.id] && <Typography variant="caption" color="success.main" display="block" mt={0.5}>✓ {milestoneFiles[m.id].name} selected</Typography>}
                                                                                        </Box>
                                                                                    )}
                                                                                </Box>
                                                                                
                                                                                {m.resource_link && (
                                                                                    <Button size="small" variant="outlined" endIcon={<OpenInNewIcon />} href={m.resource_link} target="_blank" disabled={isFuture}>
                                                                                        Study Resource
                                                                                    </Button>
                                                                                )}
                                                                            </Box>
                                                                        </CardContent>
                                                                    </Card>
                                                                </Box>
                                                            ))}
                                                        </Box>
                                                    </Box>
                                                )
                                            })}
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Container>
            </Box>
        </>
    );
};

export default StudentProfile;