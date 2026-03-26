import { useState, useEffect } from 'react';
import { 
    Container, Paper, Typography, Button, Grid, Box, Alert, TextField, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, 
    Dialog, DialogTitle, DialogContent, DialogActions, Tab, Tabs, Accordion, 
    AccordionSummary, AccordionDetails, Select, MenuItem, Checkbox, 
    ListItemText, OutlinedInput, FormControl, InputLabel, FormControlLabel, IconButton, Divider, Card, CardContent, Avatar
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CancelIcon from '@mui/icons-material/Cancel';
import WcIcon from '@mui/icons-material/Wc'; 
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EmailIcon from '@mui/icons-material/Email';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { Header } from '../../components/header';
import { FilterStudents, SendJobRequest, GetTpoJobRequests, GetExistingBranches, HandleRecommendation, SendJobReminders, GetTpoProfile, UpdateTpoProfile } from '../../apis/TpoAPI';

export const TpoDashboard = () => {
    const [tabIndex, setTabIndex] = useState(0);

    const [filters, setFilters] = useState({ min_gpa: '', branches: [], batch: '', cert_category: '', specific_skill: '', min_grade_points: '', placement_ready_only: false, roadmap_preference: '', gender: '', max_backlogs: '' });
    const [availableBranches, setAvailableBranches] = useState([]);
    
    const [students, setStudents] = useState([]);
    const [filterMessage, setFilterMessage] = useState(null);
    
    const [advisors, setAdvisors] = useState([]);
    const [sortBy, setSortBy] = useState('name_asc');

    const [studentModalOpen, setStudentModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [openModal, setOpenModal] = useState(false);
    const [jobDetails, setJobDetails] = useState({ company_name: '', job_role: '', description: '', expiry_date: '' });
    const [jobMessage, setJobMessage] = useState(null);
    const [jobError, setJobError] = useState(null);

    const [sentRequests, setSentRequests] = useState([]);

    // --- NEW: TPO Own Profile State ---
    const [tpoProfile, setTpoProfile] = useState({});
    const [myProfileModalOpen, setMyProfileModalOpen] = useState(false);
    const [photoFile, setPhotoFile] = useState(null);

    useEffect(() => {
        fetchTpoProfileData();
        if (tabIndex === 0) {
            fetchBranches();
        } else if (tabIndex === 1) {
            fetchTrackingData();
        }
    }, [tabIndex]);

    const fetchTpoProfileData = async () => {
        try {
            const data = await GetTpoProfile();
            setTpoProfile(data);
        } catch(err) {
            console.error("Failed to load TPO profile");
        }
    };

    const handleUpdateMyProfile = async () => {
        if (!photoFile) return alert("Please select a photo first.");
        const formData = new FormData();
        formData.append('profile_photo', photoFile);

        try {
            const res = await UpdateTpoProfile(formData);
            alert(res.message);
            if (res.profile_photo_url) {
                localStorage.setItem('profile_photo', res.profile_photo_url);
            }
            setMyProfileModalOpen(false);
            setPhotoFile(null);
            fetchTpoProfileData();
        } catch (err) {
            alert("Failed to update profile picture.");
        }
    };

    const fetchBranches = async () => {
        try {
            const data = await GetExistingBranches();
            setAvailableBranches(data);
        } catch (err) {
            console.error("Failed to load branches");
        }
    };

    const fetchTrackingData = async () => {
        try {
            const data = await GetTpoJobRequests();
            setSentRequests(data);
        } catch (err) {
            console.error("Failed to load tracking data");
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleBranchChange = (event) => {
        const { target: { value } } = event;
        setFilters({
            ...filters,
            branches: typeof value === 'string' ? value.split(',') : value,
        });
    };

    const handleCheckboxChange = (e) => {
        setFilters({ ...filters, placement_ready_only: e.target.checked });
    };

    const handleSearch = async () => {
        try {
            const res = await FilterStudents(filters);
            setStudents(res.students);
            setAdvisors(res.advisors || []);
            setFilterMessage(`Found ${res.count} eligible students matching your criteria.`);
        } catch (err) {
            setFilterMessage("Error fetching students.");
        }
    };

    const handleViewProfile = (student) => {
        setSelectedStudent(student);
        setStudentModalOpen(true);
    };

    const handleSendJobRequest = async () => {
        setJobError(null);
        setJobMessage(null);
        
        const studentIds = students.map(s => s.id);

        try {
            const res = await SendJobRequest({
                ...jobDetails,
                student_ids: studentIds
            });
            setJobMessage(res.message);
            setTimeout(() => {
                setOpenModal(false);
                setJobMessage(null);
                setJobDetails({ company_name: '', job_role: '', description: '', expiry_date: '' });
            }, 2000);
        } catch (err) {
            setJobError(err.response?.data?.message || "Failed to send request.");
        }
    };

    const handleProcessRecommendation = async (recId, status) => {
        try {
            await HandleRecommendation({ recommendation_id: recId, status: status });
            fetchTrackingData();
        } catch (err) {
            alert(err.response?.data?.message || "Error processing recommendation");
        }
    };

    const handleSendReminders = async (reqId) => {
        try {
            const res = await SendJobReminders(reqId);
            alert(res.message); 
        } catch (err) {
            alert(err.response?.data?.message || "Failed to send reminders.");
        }
    };

    const downloadCSV = (csvContent, fileName) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportEligibleStudents = () => {
        if (students.length === 0) return;
        
        const headers = ["Full Name", "Gender", "Email", "Batch", "Branch", "Program", "Pathway", "Current Year", "CGPA", "Active Backlogs", "Total Cert Points", "Roadmap Ready", "Matched Skills"];
        const rows = sortedStudents.map(s => [ 
            `"${s.full_name}"`, 
            `"${s.gender || 'N/A'}"`, 
            `"${s.email}"`,
            `"${s.batch}"`,
            `"${s.branch}"`,
            `"${s.program_duration === 2 ? 'MCA' : s.program_duration === 5 ? 'IMCA' : 'B.Tech'}"`,
            `"${s.roadmap_preference || 'Unassigned'}"`,
            s.current_year || 'N/A',
            s.gpa || 'N/A',
            s.active_backlogs || 0,
            s.total_grade_points,
            s.is_placement_ready ? 'YES' : 'NO',
            `"${s.verified_certs.map(c => `${c.specific_skill} (${c.grade_point}/5)`).join(', ')}"`
        ]);

        const csvString = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        downloadCSV(csvString, "Eligible_Students_List.csv");
    };

    const handleExportAcceptedStudents = (req) => {
        const acceptedStudents = req.responses.filter(r => r.status === 'Accepted');
        
        if (acceptedStudents.length === 0) {
            alert("No students have accepted this job offer yet.");
            return;
        }

        const headers = ["Student Name", "Email", "Phone/Contact", "Gender", "Program", "Batch", "Branch", "CGPA", "Active Backlogs", "Company", "Job Role"];
        const rows = acceptedStudents.map(s => [
            `"${s.student_name}"`,
            `"${s.email}"`,
            `""`, 
            `"${s.gender || 'N/A'}"`,
            `"${s.program_duration === 2 ? 'MCA' : s.program_duration === 5 ? 'IMCA' : 'N/A'}"`,
            `"${s.batch}"`,
            `"${s.branch}"`,
            `"${s.gpa || 'N/A'}"`,
            `"${s.active_backlogs || 0}"`,
            `"${req.company_name}"`,
            `"${req.job_role}"`
        ]);

        const csvString = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        downloadCSV(csvString, `${req.company_name}_Accepted_Candidates.csv`);
    };

    const sortedStudents = [...students].sort((a, b) => {
        if (sortBy === 'name_asc') return a.full_name.localeCompare(b.full_name);
        if (sortBy === 'name_desc') return b.full_name.localeCompare(a.full_name);
        if (sortBy === 'cgpa_desc') return (parseFloat(b.gpa) || 0) - (parseFloat(a.gpa) || 0);
        if (sortBy === 'cgpa_asc') return (parseFloat(a.gpa) || 0) - (parseFloat(b.gpa) || 0);
        return 0;
    });

    const inputStyles = { backgroundColor: '#fff', borderRadius: '4px' };

    return (
        <>
            <Header />
            <Box sx={{ background: 'linear-gradient(135deg, #62cff4 0%, #2c67f2 50%, #9c27b0 100%)', minHeight: '100vh', pt: 12, pb: 5 }}>
                <Container maxWidth="xl">
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                        <Typography variant="h3" fontWeight="bold" color="white">
                            TPO Management Console
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

                    <Paper elevation={3} sx={{ borderRadius: '15px', overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'rgba(255, 255, 255, 0.5)' }}>
                            <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} centered>
                                <Tab label="Filter & Send Job Requests" sx={{ fontWeight: 'bold' }} />
                                <Tab label="Track Student Responses" sx={{ fontWeight: 'bold' }} />
                            </Tabs>
                        </Box>

                        <Box p={4}>
                            {tabIndex === 0 && (
                                <Box>
                                    <Typography variant="h5" fontWeight="bold" color="primary" mb={3}>Search Eligible Candidates</Typography>
                                    
                                    <Grid container spacing={2} mb={3}>
                                        <Grid item xs={6} sm={4} md={2}>
                                            <TextField fullWidth select label="Pathway Interest" name="roadmap_preference" value={filters.roadmap_preference} onChange={handleFilterChange} sx={inputStyles} size="small">
                                                <MenuItem value="">Any</MenuItem>
                                                <MenuItem value="Data Science">Data Science & AI</MenuItem>
                                                <MenuItem value="Web Development">Full-Stack Web Development</MenuItem>
                                                <MenuItem value="Cybersecurity">Cybersecurity & Networking</MenuItem>
                                                <MenuItem value="Cloud Computing">Cloud Computing & DevOps</MenuItem>
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={6} sm={4} md={2}>
                                            <TextField fullWidth label="Min CGPA" name="min_gpa" type="number" value={filters.min_gpa} onChange={handleFilterChange} sx={inputStyles} size="small"/>
                                        </Grid>
                                        <Grid item xs={6} sm={4} md={2}>
                                            <TextField fullWidth label="Max Active Backlogs" name="max_backlogs" type="number" value={filters.max_backlogs} onChange={handleFilterChange} sx={inputStyles} size="small"/>
                                        </Grid>
                                        <Grid item xs={6} sm={4} md={3}>
                                            <FormControl fullWidth size="small" sx={inputStyles}>
                                                <InputLabel id="branch-multiple-checkbox-label">Branches</InputLabel>
                                                <Select
                                                    labelId="branch-multiple-checkbox-label"
                                                    id="branch-multiple-checkbox"
                                                    multiple
                                                    value={filters.branches}
                                                    onChange={handleBranchChange}
                                                    input={<OutlinedInput label="Branches" />}
                                                    renderValue={(selected) => selected.join(', ')}
                                                >
                                                    {availableBranches.map((branch) => (
                                                        <MenuItem key={branch} value={branch}>
                                                            <Checkbox checked={filters.branches.indexOf(branch) > -1} />
                                                            <ListItemText primary={branch} />
                                                        </MenuItem>
                                                    ))}
                                                    {availableBranches.length === 0 && (
                                                        <MenuItem disabled>No branches available</MenuItem>
                                                    )}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={6} sm={4} md={3}>
                                            <TextField fullWidth select label="Gender" name="gender" value={filters.gender} onChange={handleFilterChange} sx={inputStyles} size="small">
                                                <MenuItem value="">Any</MenuItem>
                                                <MenuItem value="Male">Male</MenuItem>
                                                <MenuItem value="Female">Female</MenuItem>
                                                <MenuItem value="Other">Other</MenuItem>
                                            </TextField>
                                        </Grid>

                                        <Grid item xs={6} sm={4} md={2}>
                                            <TextField fullWidth label="Passout Year (e.g. 2024)" name="batch" value={filters.batch} onChange={handleFilterChange} sx={inputStyles} size="small"/>
                                        </Grid>
                                        <Grid item xs={6} sm={4} md={2}>
                                            <TextField fullWidth label="Min Cert Points" name="min_grade_points" type="number" value={filters.min_grade_points} onChange={handleFilterChange} sx={inputStyles} size="small"/>
                                        </Grid>
                                        <Grid item xs={12} sm={4} md={2}>
                                            <TextField fullWidth label="Cert Category" name="cert_category" value={filters.cert_category} onChange={handleFilterChange} sx={inputStyles} size="small"/>
                                        </Grid>
                                        <Grid item xs={12} sm={4} md={3}>
                                            <TextField fullWidth label="Specific Skill" name="specific_skill" value={filters.specific_skill} onChange={handleFilterChange} sx={inputStyles} size="small"/>
                                        </Grid>
                                        
                                        <Grid item xs={12} sm={8} md={3} display="flex" alignItems="center">
                                            <FormControlLabel 
                                                control={<Checkbox checked={filters.placement_ready_only} onChange={handleCheckboxChange} color="success" />} 
                                                label={<Typography fontWeight="bold" color="success.main" variant="body2">Only "Placement Ready" (Roadmap 100%)</Typography>} 
                                            />
                                        </Grid>
                                        
                                        <Grid item xs={12} display="flex" justifyContent="flex-end" alignItems="center">
                                            <Button variant="contained" color="primary" onClick={handleSearch} sx={{ fontWeight: 'bold', height: 'fit-content', px: 4 }}>
                                                Apply Filters
                                            </Button>
                                        </Grid>
                                    </Grid>

                                    {filterMessage && <Alert severity="info" sx={{ mb: 3 }}>{filterMessage}</Alert>}

                                    {advisors.length > 0 && (
                                        <Box mb={3} p={2} sx={{ bgcolor: '#f0f7ff', borderRadius: '8px', border: '1px solid #90caf9' }}>
                                            <Typography variant="subtitle2" fontWeight="bold" color="primary.dark" mb={1}>Faculty Assigned to Searched Batch:</Typography>
                                            <Grid container spacing={1}>
                                                {advisors.map((adv, idx) => (
                                                    <Grid item key={idx}>
                                                        <Chip 
                                                            icon={<VerifiedUserIcon />} 
                                                            label={`${adv.advisor_role === 'CSA' ? 'Chief Staff Advisor' : 'Staff Advisor'}: ${adv.name} (${adv.branch})`} 
                                                            color={adv.advisor_role === 'CSA' ? 'secondary' : 'primary'} 
                                                            variant="outlined" 
                                                            sx={{ fontWeight: 'bold', bgcolor: '#fff' }}
                                                        />
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </Box>
                                    )}

                                    {students.length > 0 && (
                                        <>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
                                                <Box display="flex" alignItems="center" gap={2}>
                                                    <Typography variant="h6" fontWeight="bold">Search Results</Typography>
                                                    <FormControl size="small" sx={{ minWidth: 200, backgroundColor: '#fff' }}>
                                                        <InputLabel id="sort-label">Sort Results By</InputLabel>
                                                        <Select
                                                            labelId="sort-label"
                                                            value={sortBy}
                                                            label="Sort Results By"
                                                            onChange={(e) => setSortBy(e.target.value)}
                                                        >
                                                            <MenuItem value="name_asc">Name (A-Z)</MenuItem>
                                                            <MenuItem value="name_desc">Name (Z-A)</MenuItem>
                                                            <MenuItem value="cgpa_desc">CGPA (High to Low)</MenuItem>
                                                            <MenuItem value="cgpa_asc">CGPA (Low to High)</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                </Box>
                                                <Box display="flex" gap={2}>
                                                    <Button variant="outlined" color="primary" onClick={handleExportEligibleStudents} sx={{ fontWeight: 'bold' }}>
                                                        Export to CSV
                                                    </Button>
                                                    <Button variant="contained" color="success" onClick={() => setOpenModal(true)} sx={{ fontWeight: 'bold' }}>
                                                        Send Job Request to All {students.length} Students
                                                    </Button>
                                                </Box>
                                            </Box>
                                            
                                            <TableContainer component={Paper} elevation={1}>
                                                <Table size="small">
                                                    <TableHead sx={{ bgcolor: 'primary.light' }}>
                                                        <TableRow>
                                                            <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Student Name</TableCell>
                                                            <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Program & Pathway</TableCell>
                                                            <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Batch / Branch</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {sortedStudents.map((row) => (
                                                            <TableRow key={row.id} hover>
                                                                <TableCell>
                                                                    <Typography 
                                                                        fontWeight="bold" 
                                                                        color="primary.dark" 
                                                                        onClick={() => handleViewProfile(row)}
                                                                        sx={{ 
                                                                            cursor: 'pointer', 
                                                                            display: 'inline-block',
                                                                            '&:hover': { textDecoration: 'underline', color: 'primary.main' } 
                                                                        }}
                                                                    >
                                                                        {row.full_name}
                                                                    </Typography>
                                                                    <br />
                                                                    {row.is_placement_ready && (
                                                                        <Chip label="Placement Ready" color="success" size="small" icon={<VerifiedUserIcon />} sx={{ mt: 0.5, fontWeight: 'bold', fontSize: '0.7rem' }} />
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Typography variant="body2" fontWeight="bold" color="secondary.main">
                                                                        {row.program_duration === 2 ? 'MCA' : row.program_duration === 5 ? 'IMCA' : 'N/A'}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="textSecondary">{row.roadmap_preference || 'Unassigned'}</Typography>
                                                                </TableCell>
                                                                <TableCell>{row.batch} - {row.branch}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </>
                                    )}
                                </Box>
                            )}

                            {tabIndex === 1 && (
                                <Box>
                                    <Typography variant="h5" fontWeight="bold" color="primary" mb={3}>Tracking & Responses</Typography>
                                    {sentRequests.length === 0 ? (
                                        <Typography>You have not sent any job requests yet.</Typography>
                                    ) : (
                                        sentRequests.map((req) => {
                                            const pendingCount = req.responses.filter(r => r.status === 'Pending').length;

                                            return (
                                            <Accordion key={req.request_id} sx={{ mb: 2, borderRadius: '8px', overflow: 'hidden', borderLeft: '5px solid #2196f3' }}>
                                                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'rgba(0,0,0,0.03)' }}>
                                                    <Box display="flex" justifyContent="space-between" width="100%" alignItems="center" pr={2}>
                                                        <Box>
                                                            <Typography variant="h6" fontWeight="bold">{req.company_name}</Typography>
                                                            <Typography variant="body2" color="textSecondary">{req.job_role} • Sent: {req.created_at}</Typography>
                                                        </Box>
                                                        <Box display="flex" gap={2}>
                                                            {req.recommendations && req.recommendations.some(r => r.status === 'Pending') && (
                                                                <Chip label="New Recommendations" color="warning" size="small" sx={{ alignSelf: 'center' }} />
                                                            )}
                                                            <Chip label={`Total Sent: ${req.total_sent}`} color="default" />
                                                            <Chip label={`Accepted: ${req.accepted}`} color="success" />
                                                        </Box>
                                                    </Box>
                                                </AccordionSummary>
                                                <AccordionDetails>
                                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                                        <Box>
                                                            <Typography variant="body2"><b>Description:</b> {req.description}</Typography>
                                                            <Typography variant="caption" color="error" fontWeight="bold">Expires: {req.expiry_date}</Typography>
                                                        </Box>
                                                        <Box display="flex" gap={1}>
                                                            {pendingCount > 0 && (
                                                                <Button 
                                                                    variant="contained" color="warning" size="small" sx={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}
                                                                    startIcon={<EmailIcon />}
                                                                    onClick={() => handleSendReminders(req.request_id)}
                                                                >
                                                                    Remind Pending ({pendingCount})
                                                                </Button>
                                                            )}
                                                            <Button 
                                                                variant="outlined" color="success" size="small" sx={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}
                                                                onClick={() => handleExportAcceptedStudents(req)}
                                                            >
                                                                Export Accepted to CSV
                                                            </Button>
                                                        </Box>
                                                    </Box>

                                                    {req.recommendations && req.recommendations.length > 0 && (
                                                        <Box mt={3} mb={3} p={2} sx={{ bgcolor: '#fff3e0', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
                                                            <Typography variant="subtitle1" fontWeight="bold" color="success.dark" mb={2}>
                                                                Teacher Recommendations ({req.recommendations.length})
                                                            </Typography>
                                                            <Grid container spacing={2}>
                                                                {req.recommendations.map(rec => (
                                                                    <Grid item xs={12} key={rec.recommendation_id}>
                                                                        <Card elevation={1}>
                                                                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                                                    <Box>
                                                                                        <Typography 
                                                                                            variant="body1" 
                                                                                            fontWeight="bold" 
                                                                                            color="primary"
                                                                                            onClick={() => handleViewProfile(rec.student_profile)}
                                                                                            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                                                                        >
                                                                                            {rec.student_profile.full_name}
                                                                                        </Typography>
                                                                                        <Typography variant="caption" color="textSecondary" display="block">
                                                                                            Recommended by <b>CSA {rec.recommender_name}</b> (Batch: {rec.recommender_batch})
                                                                                        </Typography>
                                                                                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: '#555' }}>
                                                                                            "{rec.reason}"
                                                                                        </Typography>
                                                                                    </Box>
                                                                                    <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
                                                                                        {rec.status === 'Pending' ? (
                                                                                            <Box display="flex" gap={1}>
                                                                                                <Button size="small" variant="contained" color="success" startIcon={<HowToRegIcon />} onClick={() => handleProcessRecommendation(rec.recommendation_id, 'Accepted')}>
                                                                                                    Accept & Send
                                                                                                </Button>
                                                                                                <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => handleProcessRecommendation(rec.recommendation_id, 'Rejected')}>
                                                                                                    Reject
                                                                                                </Button>
                                                                                            </Box>
                                                                                        ) : (
                                                                                            <Chip label={rec.status} color={rec.status === 'Accepted' ? 'success' : 'error'} size="small" fontWeight="bold" />
                                                                                        )}
                                                                                    </Box>
                                                                                </Box>
                                                                            </CardContent>
                                                                        </Card>
                                                                    </Grid>
                                                                ))}
                                                            </Grid>
                                                        </Box>
                                                    )}

                                                    <Typography variant="subtitle2" fontWeight="bold" mb={1} color="primary">Student Responses</Typography>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell><b>Student Name</b></TableCell>
                                                                <TableCell><b>Email (For Communication)</b></TableCell>
                                                                <TableCell><b>Branch</b></TableCell>
                                                                <TableCell><b>Status</b></TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {req.responses.map((res, i) => (
                                                                <TableRow key={i}>
                                                                    <TableCell>{res.student_name}</TableCell>
                                                                    <TableCell><a href={`mailto:${res.email}`}>{res.email}</a></TableCell>
                                                                    <TableCell>{res.branch}</TableCell>
                                                                    <TableCell>
                                                                        <Chip 
                                                                            label={res.status} size="small" 
                                                                            color={res.status === 'Accepted' ? 'success' : res.status === 'Rejected' ? 'error' : res.status === 'Expired' ? 'default' : 'warning'} 
                                                                        />
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </AccordionDetails>
                                            </Accordion>
                                        )})
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Container>
            </Box>

            {/* --- TPO OWN PROFILE MODAL --- */}
            <Dialog open={myProfileModalOpen} onClose={() => setMyProfileModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle fontWeight="bold" color="secondary">My TPO Profile</DialogTitle>
                <DialogContent dividers sx={{ backgroundColor: '#f9f9f9', textAlign: 'center' }}>
                    <Avatar 
                        src={tpoProfile.profile_photo_url ? `http://127.0.0.1:5000${tpoProfile.profile_photo_url}` : ''} 
                        sx={{ width: 120, height: 120, border: '4px solid #9c27b0', margin: '0 auto', mb: 2 }} 
                    />
                    <Typography variant="h6" fontWeight="bold">{tpoProfile.username}</Typography>
                    <Typography variant="body2" color="textSecondary" mb={3}>{tpoProfile.email}</Typography>

                    <Button variant="outlined" component="label" fullWidth sx={{ backgroundColor: '#fff', borderStyle: 'dashed' }}>
                        <AddPhotoAlternateIcon sx={{ mr: 1 }} color="secondary" />
                        Change Profile Picture
                        <input type="file" hidden accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} />
                    </Button>
                    {photoFile && <Typography variant="caption" color="success.main" display="block" mt={1}>✓ {photoFile.name} selected</Typography>}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setMyProfileModalOpen(false)} color="inherit">Close</Button>
                    <Button onClick={handleUpdateMyProfile} variant="contained" color="secondary" disabled={!photoFile}>Save New Photo</Button>
                </DialogActions>
            </Dialog>

            {/* --- DETAILED STUDENT PROFILE CARD MODAL --- */}
            <Dialog open={studentModalOpen} onClose={() => setStudentModalOpen(false)} maxWidth="md" fullWidth>
                {selectedStudent && (
                    <>
                        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white' }}>
                            <Typography variant="h5" fontWeight="bold">Candidate Profile</Typography>
                            <IconButton onClick={() => setStudentModalOpen(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
                        </DialogTitle>
                        <DialogContent dividers sx={{ backgroundColor: '#f9f9f9', p: 4 }}>
                            <Grid container spacing={4}>
                                <Grid item xs={12} md={5}>
                                    <Paper elevation={1} sx={{ p: 3, borderRadius: '10px', height: '100%', position: 'relative' }}>
                                        
                                        <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                                            <Avatar 
                                                src={selectedStudent.profile_photo_url ? `http://127.0.0.1:5000${selectedStudent.profile_photo_url}` : ''} 
                                                sx={{ width: 100, height: 100, border: '3px solid #2196f3', mb: 1 }} 
                                            />
                                            <Typography variant="h6" fontWeight="bold" textAlign="center">{selectedStudent.full_name}</Typography>
                                        </Box>
                                        
                                        <Box display="flex" justifyContent="center" mb={3}>
                                            {selectedStudent.resume_url ? (
                                                <Button variant="contained" color="secondary" startIcon={<PictureAsPdfIcon />} href={`http://127.0.0.1:5000${selectedStudent.resume_url}`} target="_blank">
                                                    View Resume
                                                </Button>
                                            ) : (
                                                <Button variant="outlined" disabled startIcon={<PictureAsPdfIcon />}>
                                                    No Resume Uploaded
                                                </Button>
                                            )}
                                        </Box>
                                        
                                        <Divider sx={{ mb: 2 }} />

                                        <Typography variant="overline" color="textSecondary" fontWeight="bold">Identity</Typography>
                                        <Typography variant="body1" mb={1}><b>Email:</b> {selectedStudent.email}</Typography>
                                        <Typography variant="body1" mb={1}><b>Batch/Branch:</b> {selectedStudent.batch} - {selectedStudent.branch}</Typography>
                                        <Typography variant="body1" display="flex" alignItems="center" gap={1} mb={3}>
                                            <b>Gender:</b> {selectedStudent.gender || 'N/A'}
                                        </Typography>
                                        
                                        <Divider sx={{ mb: 3 }} />
                                        
                                        <Typography variant="overline" color="textSecondary" fontWeight="bold">Career Trajectory</Typography>
                                        <Typography variant="body1" mb={1}><b>Program:</b> {selectedStudent.program_duration === 2 ? 'MCA (2 Years)' : selectedStudent.program_duration === 5 ? 'IMCA (5 Years)' : 'N/A'}</Typography>
                                        <Typography variant="body1" mb={1}><b>Specialization:</b> {selectedStudent.roadmap_preference || 'Not Selected'}</Typography>
                                        
                                        <Typography variant="body1" mb={2}><b>Current Status:</b> {selectedStudent.current_year ? `Year ${selectedStudent.current_year}` : 'N/A'}</Typography>
                                        
                                        {selectedStudent.is_placement_ready ? (
                                            <Alert severity="success" icon={<VerifiedUserIcon />} sx={{ fontWeight: 'bold', mb: 2 }}>Placement Ready!</Alert>
                                        ) : (
                                            <Alert severity="warning" sx={{ fontWeight: 'bold', mb: 2 }}>Roadmap Incomplete</Alert>
                                        )}

                                        {selectedStudent.roadmap_details && selectedStudent.roadmap_details.length > 0 && (
                                            <Box sx={{ mt: 2, bgcolor: '#f0f7ff', p: 2, borderRadius: '8px', border: '1px solid #90caf9' }}>
                                                <Typography variant="overline" color="primary.dark" fontWeight="bold">Roadmap Progress</Typography>
                                                {selectedStudent.roadmap_details.map((m, idx) => (
                                                    <Box key={idx} display="flex" alignItems="flex-start" gap={1} mt={1}>
                                                        {m.is_completed ? (
                                                            <CheckCircleIcon color="success" fontSize="small" sx={{ mt: 0.3 }} />
                                                        ) : (
                                                            <RadioButtonUncheckedIcon color="disabled" fontSize="small" sx={{ mt: 0.3 }} />
                                                        )}
                                                        <Box>
                                                            <Typography variant="body2" color={m.is_completed ? 'textPrimary' : 'textSecondary'} fontWeight={m.is_completed ? 'bold' : 'normal'} sx={{ textDecoration: m.is_completed ? 'line-through' : 'none' }}>
                                                                Year {m.year_number}: {m.title}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Box>
                                        )}

                                    </Paper>
                                </Grid>

                                <Grid item xs={12} md={7}>
                                    <Paper elevation={1} sx={{ p: 3, borderRadius: '10px', mb: 3 }}>
                                        <Typography variant="overline" color="textSecondary" fontWeight="bold">Academic Performance</Typography>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                            <Typography variant="h6" fontWeight="bold">Overall CGPA: <span style={{ color: '#1976d2' }}>{selectedStudent.gpa || 'N/A'}</span></Typography>
                                        </Box>
                                        
                                        <Typography variant="body1" mb={2}>
                                            <b>Active Backlogs:</b> <span style={{ color: selectedStudent.active_backlogs > 0 ? '#d32f2f' : '#4caf50', fontWeight: 'bold' }}>{selectedStudent.active_backlogs || 0}</span>
                                        </Typography>
                                        
                                        {selectedStudent.sgpa_history && Object.keys(selectedStudent.sgpa_history).length > 0 ? (
                                            <Box>
                                                <Typography variant="caption" color="textSecondary" display="block" mb={1}>Semester Breakdown (SGPA):</Typography>
                                                <Grid container spacing={1}>
                                                    {Object.entries(selectedStudent.sgpa_history).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([sem, score]) => (
                                                        <Grid item key={sem}>
                                                            <Chip label={`S${sem}: ${score}`} size="small" variant="outlined" sx={{ fontWeight: 'bold', borderColor: '#90caf9', bgcolor: '#e3f2fd' }} />
                                                        </Grid>
                                                    ))}
                                                </Grid>
                                            </Box>
                                        ) : (
                                            <Typography variant="body2" color="textSecondary" fontStyle="italic">No semester data recorded.</Typography>
                                        )}
                                    </Paper>

                                    <Paper elevation={1} sx={{ p: 3, borderRadius: '10px' }}>
                                        <Typography variant="overline" color="textSecondary" fontWeight="bold">Verified Skills & Certifications</Typography>
                                        <Typography variant="body2" mb={2} color="secondary.main" fontWeight="bold">Total Value Points: {selectedStudent.total_grade_points}</Typography>
                                        
                                        {selectedStudent.verified_certs && selectedStudent.verified_certs.length > 0 ? (
                                            <Box display="flex" gap={1} flexWrap="wrap">
                                                {selectedStudent.verified_certs.map((c, idx) => (
                                                    <Chip key={idx} label={`${c.specific_skill} (${c.category})`} color="primary" variant="outlined" />
                                                ))}
                                            </Box>
                                        ) : (
                                            <Typography variant="body2" color="textSecondary" fontStyle="italic">No verified skills yet.</Typography>
                                        )}
                                    </Paper>
                                </Grid>
                            </Grid>
                        </DialogContent>
                    </>
                )}
            </Dialog>

            {/* --- MASS SEND REQUEST MODAL --- */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight="bold" color="primary">Mass Placement Request</DialogTitle>
                <DialogContent dividers>
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        This will send a job request to all <b>{students.length}</b> students currently shown in your filter results.
                    </Alert>

                    {jobError && <Alert severity="error" sx={{ mb: 2 }}>{jobError}</Alert>}
                    {jobMessage && <Alert severity="success" sx={{ mb: 2 }}>{jobMessage}</Alert>}

                    <TextField fullWidth label="Company Name" required margin="dense" value={jobDetails.company_name} onChange={(e) => setJobDetails({...jobDetails, company_name: e.target.value})} />
                    <TextField fullWidth label="Job Role (e.g. SDE-1)" required margin="dense" sx={{ mt: 2 }} value={jobDetails.job_role} onChange={(e) => setJobDetails({...jobDetails, job_role: e.target.value})} />
                    <TextField fullWidth label="Job Description & Requirements" multiline rows={4} margin="dense" sx={{ mt: 2 }} value={jobDetails.description} onChange={(e) => setJobDetails({...jobDetails, description: e.target.value})} />
                    <TextField 
                        fullWidth 
                        label="Offer Expiry Date & Time" 
                        type="datetime-local" 
                        InputLabelProps={{ shrink: true }}
                        required 
                        margin="dense" 
                        sx={{ mt: 2 }} 
                        value={jobDetails.expiry_date} 
                        onChange={(e) => setJobDetails({...jobDetails, expiry_date: e.target.value})} 
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenModal(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleSendJobRequest} variant="contained" color="success" disabled={!jobDetails.company_name || !jobDetails.job_role || !jobDetails.expiry_date}>Confirm & Send Requests</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default TpoDashboard;