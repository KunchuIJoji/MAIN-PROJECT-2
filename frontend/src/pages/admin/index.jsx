import { useState, useEffect } from 'react';
import { Container, Paper, Typography, Button, Grid, Box, Alert, Card, CardContent, Divider, Chip, Tab, Tabs, Badge, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Avatar, IconButton } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { GetRequests, ResolveRequest, GetUsers, EditStudentProfile, EditTeacherProfile, EditTpoProfile, DeleteUser, VerifyStudentProfile, BulkUploadUsers } from '../../apis/AdminAPI';
import { Header } from '../../components/header';

export const AdminDashboard = () => {
    // --- FIXED: Set initial tab index to 1 so "Manage Users" loads first ---
    const [tabIndex, setTabIndex] = useState(1);
    
    const [requests, setRequests] = useState([]);
    const [users, setUsers] = useState([]);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const [filterRole, setFilterRole] = useState('All');
    const [filterBatch, setFilterBatch] = useState('');
    const [filterBranch, setFilterBranch] = useState('');

    // Editing Modal State
    const [openModal, setOpenModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [editData, setEditData] = useState({});
    const [photoFile, setPhotoFile] = useState(null);

    // Viewing Modal State
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewUser, setViewUser] = useState(null);

    // Bulk Upload State
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [csvFile, setCsvFile] = useState(null);
    const [photoFiles, setPhotoFiles] = useState([]);
    const [bulkErrors, setBulkErrors] = useState([]);

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        try {
            const reqData = await GetRequests();
            const userData = await GetUsers();
            setRequests(reqData);
            setUsers(userData);
        } catch (err) {
            setError("Failed to load admin data. Are you sure you are an Admin?");
        }
    };

    const handleResolve = async (userId, status) => {
        try {
            await ResolveRequest(userId, status);
            setMessage(`User successfully ${status}!`);
            fetchAdminData(); 
        } catch (err) {
            setError(err.response?.data?.message || "Error resolving request.");
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (window.confirm(`Are you absolutely sure you want to permanently delete user '${username}'? This action cannot be undone and will erase all their data.`)) {
            try {
                const res = await DeleteUser(userId);
                setMessage(res.message);
                fetchAdminData(); 
            } catch (err) {
                setError(err.response?.data?.message || "Failed to delete user.");
            }
        }
    };

    const handleVerifyProfile = async (profileId, status) => {
        try {
            const res = await VerifyStudentProfile(profileId, status);
            setMessage(res.message);
            fetchAdminData(); 
        } catch (err) {
            setError(err.response?.data?.message || "Error verifying profile.");
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setPhotoFile(null); 
        
        if (user.role === 'Student') {
            setEditData({
                full_name: user.profile?.full_name || '',
                batch: user.profile?.batch || '',
                branch: user.profile?.branch || '',
                gpa: user.profile?.gpa || '',
                gender: user.profile?.gender || '',
                active_backlogs: user.profile?.active_backlogs || 0
            });
        } else if (user.role === 'Teacher') {
            setEditData({
                assigned_batch: user.profile?.assigned_batch || '',
                assigned_branch: user.profile?.assigned_branch || '',
                advisor_role: user.profile?.advisor_role || '' 
            });
        } else if (user.role === 'TPO') {
            setEditData({});
        }
        setOpenModal(true);
    };

    const handleViewUser = (user) => {
        setViewUser(user);
        setViewModalOpen(true);
    };

    const handleSaveEdit = async () => {
        const formData = new FormData();
        if (photoFile) formData.append('profile_photo', photoFile);

        try {
            if (selectedUser.role === 'Student') {
                if (!selectedUser.profile) return setError("Cannot edit. Profile not setup yet.");
                Object.keys(editData).forEach(key => formData.append(key, editData[key]));
                await EditStudentProfile(selectedUser.profile.profile_id, formData);
                
            } else if (selectedUser.role === 'Teacher') {
                if (!selectedUser.profile) return setError("Cannot edit. Profile not setup yet.");
                Object.keys(editData).forEach(key => formData.append(key, editData[key]));
                await EditTeacherProfile(selectedUser.profile.profile_id, formData);
                
            } else if (selectedUser.role === 'TPO') {
                await EditTpoProfile(selectedUser.id, formData);
            }
            
            setMessage(`${selectedUser.role} profile updated successfully!`);
            setOpenModal(false);
            fetchAdminData(); 
        } catch (err) {
            setError(err.response?.data?.message || "Error updating profile.");
        }
    };

    const handleBulkSubmit = async () => {
        setMessage(null); setError(null); setBulkErrors([]);
        if (!csvFile) return setError("Please select a CSV file first.");

        const formData = new FormData();
        formData.append('file', csvFile);
        
        photoFiles.forEach(file => {
            formData.append('photos', file);
        });

        try {
            const res = await BulkUploadUsers(formData);
            setMessage(res.message);
            if (res.errors && res.errors.length > 0) {
                setBulkErrors(res.errors); 
            }
            setCsvFile(null);
            setPhotoFiles([]);
            setBulkModalOpen(false);
            fetchAdminData();
        } catch (err) {
            setError(err.response?.data?.message || "Error uploading files.");
        }
    };

    const filteredUsers = users.filter(user => {
        if (user.role === 'Admin') return false; 
        
        let match = true;

        if (filterRole !== 'All' && user.role !== filterRole) {
            match = false;
        }

        if (filterBatch) {
            if (user.role === 'Student' && user.profile?.batch !== filterBatch) match = false;
            else if (user.role === 'Teacher' && user.profile?.assigned_batch !== filterBatch) match = false;
            else if (user.role === 'TPO') match = false; 
        }

        if (filterBranch) {
            if (user.role === 'Student' && (!user.profile?.branch || !user.profile.branch.toLowerCase().includes(filterBranch.toLowerCase()))) match = false;
            else if (user.role === 'Teacher' && (!user.profile?.assigned_branch || !user.profile.assigned_branch.toLowerCase().includes(filterBranch.toLowerCase()))) match = false;
            else if (user.role === 'TPO') match = false; 
        }

        return match;
    });

    const inputStyles = { backgroundColor: '#fff', borderRadius: '4px', mb: 2 };

    return (
        <>
            <Header />
            <Box sx={{ background: 'linear-gradient(135deg, #62cff4 0%, #2c67f2 50%, #9c27b0 100%)', minHeight: '100vh', width: '100%', pt: 12, pb: 5 }}>
                <Container maxWidth="lg">
                    <Typography variant="h3" fontWeight="bold" color="white" mb={4} textAlign="center">
                        Superuser Admin Dashboard
                    </Typography>

                    {message && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setMessage(null)}>{message}</Alert>}
                    {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
                    
                    {bulkErrors.length > 0 && (
                        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setBulkErrors([])}>
                            Some rows failed to import:
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                {bulkErrors.map((e, i) => <li key={i}><Typography variant="body2">{e}</Typography></li>)}
                            </ul>
                        </Alert>
                    )}

                    <Paper elevation={3} sx={{ borderRadius: '15px', overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'rgba(255, 255, 255, 0.5)' }}>
                            <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} centered>
                                <Tab label={
                                    <Badge badgeContent={requests.length} color="error">
                                        Pending Requests
                                    </Badge>
                                } />
                                <Tab label="Manage Users" />
                            </Tabs>
                        </Box>

                        <Box p={4}>
                            {tabIndex === 0 && (
                                <Box>
                                    <Typography variant="h5" fontWeight="bold" mb={3} color="primary">Access Requests</Typography>
                                    {requests.length === 0 ? (
                                        <Typography variant="body1" fontStyle="italic">No pending requests at this time.</Typography>
                                    ) : (
                                        <Grid container spacing={3}>
                                            {requests.map(req => (
                                                <Grid item xs={12} md={6} key={req.id}>
                                                    <Card elevation={2}>
                                                        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Box>
                                                                <Typography variant="h6" fontWeight="bold">{req.username}</Typography>
                                                                <Typography variant="body2" color="textSecondary">Requested Role: <Chip label={req.role} size="small" color="info" /></Typography>
                                                            </Box>
                                                            <Box display="flex" gap={1}>
                                                                <Button variant="contained" color="success" onClick={() => handleResolve(req.id, 'approved')}>Approve</Button>
                                                                <Button variant="outlined" color="error" onClick={() => handleResolve(req.id, 'rejected')}>Reject</Button>
                                                            </Box>
                                                        </CardContent>
                                                    </Card>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    )}
                                </Box>
                            )}

                            {tabIndex === 1 && (
                                <Box>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                                        <Typography variant="h5" fontWeight="bold" color="primary">Approved Users Database</Typography>
                                        
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Typography variant="body2" color="textSecondary">Total: {filteredUsers.length} users</Typography>
                                            <Button variant="contained" color="secondary" startIcon={<CloudUploadIcon />} onClick={() => {
                                                setCsvFile(null);
                                                setPhotoFiles([]);
                                                setBulkModalOpen(true);
                                            }}>
                                                Bulk Add Students (CSV)
                                            </Button>
                                        </Box>
                                    </Box>

                                    <Box mb={4} p={2} sx={{ backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '8px', border: '1px solid #ddd' }}>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={4}>
                                                <TextField select fullWidth label="Filter by Role" value={filterRole} onChange={(e) => setFilterRole(e.target.value)} size="small" sx={{ backgroundColor: '#fff', borderRadius: '4px' }}>
                                                    <MenuItem value="All">All Roles</MenuItem>
                                                    <MenuItem value="Student">Students</MenuItem>
                                                    <MenuItem value="Teacher">Teachers</MenuItem>
                                                    <MenuItem value="TPO">TPOs</MenuItem>
                                                </TextField>
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <TextField fullWidth label="Filter by Passout Year (e.g. 2024)" value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} size="small" sx={{ backgroundColor: '#fff', borderRadius: '4px' }} />
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <TextField fullWidth label="Filter by Branch (e.g. CSE)" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} size="small" sx={{ backgroundColor: '#fff', borderRadius: '4px' }} />
                                            </Grid>
                                        </Grid>
                                    </Box>

                                    {filteredUsers.length === 0 ? (
                                        <Typography variant="body1" fontStyle="italic">No users match your filters.</Typography>
                                    ) : (
                                        <Grid container spacing={3}>
                                            {filteredUsers.map(user => (
                                                <Grid item xs={12} md={4} key={user.id}>
                                                    <Card 
                                                        elevation={2} 
                                                        sx={{ 
                                                            height: '100%', 
                                                            display: 'flex', 
                                                            flexDirection: 'column', 
                                                            justifyContent: 'space-between',
                                                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                                            '&:hover': {
                                                                transform: 'translateY(-6px)',
                                                                boxShadow: '0px 12px 24px rgba(0, 0, 0, 0.2)'
                                                            }
                                                        }}
                                                    >
                                                        <CardContent>
                                                            <Box display="flex" gap={2}>
                                                                <Avatar 
                                                                    src={user.profile_photo_url ? `http://127.0.0.1:5000${user.profile_photo_url}` : ''} 
                                                                    sx={{ width: 60, height: 60, border: '2px solid #ccc' }} 
                                                                />
                                                                <Box flex={1}>
                                                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
                                                                        <Typography 
                                                                            variant="h6" 
                                                                            fontWeight="bold" 
                                                                            lineHeight={1.2} 
                                                                            onClick={() => handleViewUser(user)}
                                                                            sx={{ 
                                                                                wordBreak: 'break-word',
                                                                                cursor: 'pointer',
                                                                                transition: 'color 0.2s',
                                                                                '&:hover': { color: 'primary.main', textDecoration: 'underline' }
                                                                            }}
                                                                        >
                                                                            {user.username}
                                                                        </Typography>
                                                                        <Chip label={user.role} size="small" color={user.role === 'Teacher' ? 'secondary' : user.role === 'Student' ? 'primary' : 'default'} />
                                                                    </Box>
                                                                    <Typography variant="caption" color="textSecondary" display="block" mb={1} sx={{ wordBreak: 'break-word' }}>{user.email}</Typography>
                                                                    
                                                                    <Divider sx={{ my: 1 }} />
                                                                    
                                                                    {user.role === 'Student' && user.profile && (
                                                                        <Box>
                                                                            <Typography variant="body2"><b>Name:</b> {user.profile.full_name}</Typography>
                                                                            <Typography variant="body2"><b>Batch/Branch:</b> {user.profile.batch} {user.profile.branch}</Typography>
                                                                            <Typography variant="body2"><b>Gender:</b> {user.profile.gender || 'N/A'} | <b>GPA:</b> {user.profile.gpa || 'N/A'}</Typography>
                                                                            <Typography variant="body2">
                                                                                <b>Active Backlogs:</b> <span style={{ color: user.profile.active_backlogs > 0 ? '#d32f2f' : '#4caf50', fontWeight: 'bold' }}>{user.profile.active_backlogs || 0}</span>
                                                                            </Typography>
                                                                            
                                                                            {user.profile.resume_url && (
                                                                                <Button size="small" sx={{ mt: 0.5, p: 0, textTransform: 'none' }} color="secondary" href={`http://127.0.0.1:5000${user.profile.resume_url}`} target="_blank" startIcon={<PictureAsPdfIcon fontSize="small"/>}>
                                                                                    View Resume
                                                                                </Button>
                                                                            )}
                                                                            <Typography variant="body2" sx={{mb: 1, mt: 1}} display="flex" alignItems="center" gap={1}>
                                                                                <b>Status:</b> <Chip label={user.profile.verification_status} size="small" color={user.profile.verification_status === 'Approved' ? 'success' : user.profile.verification_status === 'Rejected' ? 'error' : 'warning'} sx={{ height: '20px' }}/>
                                                                            </Typography>
                                                                        </Box>
                                                                    )}
                                                                    
                                                                    {user.role === 'Teacher' && user.profile && (
                                                                        <Box>
                                                                            <Typography variant="body2"><b>Name:</b> {user.username} (Teacher)</Typography>
                                                                            <Typography variant="body2"><b>Jurisdiction:</b> {user.profile.assigned_branch || 'N/A'} / {user.profile.assigned_batch || 'N/A'}</Typography>
                                                                            <Typography variant="body2"><b>Role:</b> {user.profile.advisor_role === 'CSA' ? 'Chief Staff Advisor' : user.profile.advisor_role === 'SA' ? 'Staff Advisor' : 'Not Assigned'}</Typography>
                                                                        </Box>
                                                                    )}
                                                                    
                                                                    {user.role === 'TPO' && (
                                                                        <Box>
                                                                            <Typography variant="body2"><b>Name:</b> {user.username} (TPO)</Typography>
                                                                            <Typography variant="body2"><b>Assigned Dept/Batches:</b> All / All</Typography>
                                                                        </Box>
                                                                    )}

                                                                    {(!user.profile && user.role !== 'TPO') && (
                                                                        <Typography variant="body2" fontStyle="italic" color="error">Profile not setup yet.</Typography>
                                                                    )}
                                                                </Box>
                                                            </Box>

                                                        </CardContent>

                                                        <Box p={2} pt={0} display="flex" flexDirection="column" gap={1}>
                                                            {user.role === 'Student' && user.profile && user.profile.verification_status === 'Pending' && (
                                                                <Box display="flex" gap={1} mb={1}>
                                                                    <Button variant="contained" color="success" fullWidth onClick={() => handleVerifyProfile(user.profile.profile_id, 'Approved')}>Approve Profile</Button>
                                                                    <Button variant="outlined" color="error" fullWidth onClick={() => handleVerifyProfile(user.profile.profile_id, 'Rejected')}>Reject</Button>
                                                                </Box>
                                                            )}

                                                            <Box display="flex" gap={1}>
                                                                <Button 
                                                                    variant="outlined" 
                                                                    fullWidth 
                                                                    disabled={!user.profile && user.role !== 'TPO'} 
                                                                    onClick={() => openEditModal(user)}
                                                                >
                                                                    Edit
                                                                </Button>
                                                                <Button 
                                                                    variant="contained" 
                                                                    color="error" 
                                                                    fullWidth 
                                                                    onClick={() => handleDeleteUser(user.id, user.username)}
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </Box>
                                                        </Box>
                                                    </Card>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Container>
            </Box>

            {/* --- DETAILED VIEW MODAL --- */}
            <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} maxWidth="sm" fullWidth>
                {viewUser && (
                    <>
                        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white' }}>
                            <Typography variant="h6" fontWeight="bold">User Profile Details</Typography>
                            <IconButton onClick={() => setViewModalOpen(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
                        </DialogTitle>
                        <DialogContent dividers sx={{ backgroundColor: '#f9f9f9', p: 4 }}>
                            <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                                <Avatar 
                                    src={viewUser.profile_photo_url ? `http://127.0.0.1:5000${viewUser.profile_photo_url}` : ''} 
                                    sx={{ width: 120, height: 120, border: '4px solid #2196f3', mb: 2 }} 
                                />
                                <Typography variant="h5" fontWeight="bold">{viewUser.profile?.full_name || viewUser.username}</Typography>
                                <Typography variant="body1" color="textSecondary">{viewUser.email}</Typography>
                                <Chip label={viewUser.role} color={viewUser.role === 'Teacher' ? 'secondary' : viewUser.role === 'Student' ? 'primary' : 'default'} sx={{ mt: 1, fontWeight: 'bold' }} />
                            </Box>

                            <Divider sx={{ mb: 3 }} />

                            {viewUser.role === 'Student' && viewUser.profile ? (
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="caption" color="textSecondary">Program & Batch</Typography>
                                        <Typography variant="body1" fontWeight="bold">{viewUser.profile.batch} • {viewUser.profile.branch}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="caption" color="textSecondary">Gender</Typography>
                                        <Typography variant="body1" fontWeight="bold">{viewUser.profile.gender || 'Not Specified'}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="caption" color="textSecondary">Academic CGPA</Typography>
                                        <Typography variant="body1" fontWeight="bold" color="primary.main">{viewUser.profile.gpa || 'Pending'}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="caption" color="textSecondary">Active Backlogs</Typography>
                                        <Typography variant="body1" fontWeight="bold" color={viewUser.profile.active_backlogs > 0 ? 'error.main' : 'success.main'}>{viewUser.profile.active_backlogs || 0}</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="textSecondary" display="block">Profile Verification Status</Typography>
                                        <Chip 
                                            icon={<VerifiedUserIcon />}
                                            label={viewUser.profile.verification_status} 
                                            color={viewUser.profile.verification_status === 'Approved' ? 'success' : viewUser.profile.verification_status === 'Rejected' ? 'error' : 'warning'} 
                                            sx={{ mt: 0.5, fontWeight: 'bold' }} 
                                        />
                                    </Grid>
                                    {viewUser.profile.resume_url && (
                                        <Grid item xs={12} mt={1}>
                                            <Button variant="outlined" color="primary" href={`http://127.0.0.1:5000${viewUser.profile.resume_url}`} target="_blank" startIcon={<PictureAsPdfIcon />}>
                                                Download Attached Resume
                                            </Button>
                                        </Grid>
                                    )}
                                </Grid>
                            ) : viewUser.role === 'Teacher' && viewUser.profile ? (
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="caption" color="textSecondary">Assigned Batch</Typography>
                                        <Typography variant="body1" fontWeight="bold">{viewUser.profile.assigned_batch}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="caption" color="textSecondary">Assigned Branch</Typography>
                                        <Typography variant="body1" fontWeight="bold">{viewUser.profile.assigned_branch}</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="textSecondary">Faculty Role</Typography>
                                        <Typography variant="body1" fontWeight="bold" color="secondary.main">{viewUser.profile.advisor_role === 'CSA' ? 'Chief Staff Advisor (CSA)' : 'Staff Advisor (SA)'}</Typography>
                                    </Grid>
                                </Grid>
                            ) : viewUser.role === 'TPO' ? (
                                <Typography variant="body1" textAlign="center" color="textSecondary" fontStyle="italic">
                                    Placement Officers have unrestricted access across all batches.
                                </Typography>
                            ) : (
                                <Typography variant="body1" textAlign="center" color="error">
                                    This user has not configured their profile details yet.
                                </Typography>
                            )}
                        </DialogContent>
                    </>
                )}
            </Dialog>

            {/* --- BULK UPLOAD MODAL --- */}
            <Dialog open={bulkModalOpen} onClose={() => setBulkModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight="bold" color="secondary">Bulk Add Students via CSV</DialogTitle>
                <DialogContent dividers sx={{ backgroundColor: '#f9f9f9' }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Your CSV file MUST include the following headers exactly as written: <br/><br/>
                        <b>username, email, password, full_name, batch, branch, gender, program_duration, photo_filename</b><br/><br/>
                        <i>* To automatically assign profile photos, select the image files below and enter their exact filenames (e.g., john_doe.jpg) in the 'photo_filename' column of your CSV.</i>
                    </Alert>
                    
                    <Button variant="outlined" component="label" fullWidth sx={{ backgroundColor: '#fff', py: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <CloudUploadIcon fontSize="large" color="primary" />
                        <Typography fontWeight="bold">Step 1: Choose .CSV File</Typography>
                        <input type="file" hidden accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} />
                    </Button>
                    {csvFile && <Typography variant="caption" color="success.main" display="block" mt={1} textAlign="center"><b>{csvFile.name}</b> selected</Typography>}

                    <Button variant="outlined" component="label" fullWidth sx={{ backgroundColor: '#fff', py: 2, display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                        <AddPhotoAlternateIcon fontSize="large" color="primary" />
                        <Typography fontWeight="bold">Step 2: Select Profile Photos (Optional)</Typography>
                        <input type="file" hidden multiple accept="image/*" onChange={(e) => setPhotoFiles(Array.from(e.target.files))} />
                    </Button>
                    {photoFiles.length > 0 && <Typography variant="caption" color="success.main" display="block" mt={1} textAlign="center"><b>{photoFiles.length} photos</b> selected</Typography>}

                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setBulkModalOpen(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleBulkSubmit} variant="contained" color="secondary" disabled={!csvFile}>Import Students</Button>
                </DialogActions>
            </Dialog>

            {/* --- EDIT MODAL (DIALOG) --- */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight="bold">Edit {selectedUser?.role} Profile</DialogTitle>
                <DialogContent dividers sx={{ backgroundColor: '#f9f9f9' }}>
                    
                    <Button variant="outlined" component="label" fullWidth sx={{ mb: 2, backgroundColor: '#fff', borderStyle: 'dashed' }}>
                        <AddPhotoAlternateIcon sx={{ mr: 1 }} color="primary" />
                        Update Profile Picture
                        <input type="file" hidden accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} />
                    </Button>
                    {photoFile && <Typography variant="caption" color="success.main" display="block" mb={2} fontWeight="bold">✓ {photoFile.name} selected</Typography>}

                    {selectedUser?.role === 'Student' && (
                        <>
                            <TextField fullWidth label="Full Name" value={editData.full_name} sx={inputStyles} onChange={(e) => setEditData({...editData, full_name: e.target.value})} />
                            <TextField fullWidth label="Passout Year (e.g. 2024)" value={editData.batch} sx={inputStyles} onChange={(e) => setEditData({...editData, batch: e.target.value})} />
                            <TextField fullWidth label="Branch" value={editData.branch} sx={inputStyles} onChange={(e) => setEditData({...editData, branch: e.target.value})} />
                            <TextField fullWidth select label="Gender" value={editData.gender || ''} sx={inputStyles} onChange={(e) => setEditData({...editData, gender: e.target.value})}>
                                <MenuItem value="Male">Male</MenuItem>
                                <MenuItem value="Female">Female</MenuItem>
                                <MenuItem value="Other">Other</MenuItem>
                            </TextField>
                            <TextField fullWidth label="GPA" type="number" value={editData.gpa} sx={inputStyles} onChange={(e) => setEditData({...editData, gpa: e.target.value})} />
                            <TextField fullWidth label="Active Backlogs" type="number" value={editData.active_backlogs} sx={inputStyles} onChange={(e) => setEditData({...editData, active_backlogs: e.target.value})} />
                        </>
                    )}
                    {selectedUser?.role === 'Teacher' && (
                        <>
                            <TextField fullWidth label="Assigned Batch" value={editData.assigned_batch} sx={inputStyles} onChange={(e) => setEditData({...editData, assigned_batch: e.target.value})} />
                            <TextField fullWidth label="Assigned Branch" value={editData.assigned_branch} sx={inputStyles} onChange={(e) => setEditData({...editData, assigned_branch: e.target.value})} />
                            <TextField fullWidth select label="Advisor Role" value={editData.advisor_role || ''} sx={inputStyles} onChange={(e) => setEditData({...editData, advisor_role: e.target.value})}>
                                <MenuItem value="CSA">Chief Staff Advisor (CSA)</MenuItem>
                                <MenuItem value="SA">Staff Advisor (SA)</MenuItem>
                            </TextField>
                        </>
                    )}
                    {selectedUser?.role === 'TPO' && (
                        <Alert severity="info">
                            TPOs only require a profile picture. There are no additional details to configure.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenModal(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleSaveEdit} variant="contained" color="primary">Save Changes</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AdminDashboard;