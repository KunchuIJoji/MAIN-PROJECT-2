import { useState, useEffect } from 'react';
import { Box, Button, Container, TextField, Typography, Paper, Alert, MenuItem, Grid, Card, CardContent, Divider, InputAdornment, IconButton } from '@mui/material';
import { School, TrendingUp, VerifiedUser, FactCheck, Insights, CheckCircle, Visibility, VisibilityOff } from '@mui/icons-material';
import { LoginUser, RegisterUser, CheckAdminExists } from '../../apis/AuthAPI'; 
import { useNavigate } from 'react-router-dom';

export const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    
    // --- UPDATED: Added 'program_duration' to formData ---
    const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'Student', full_name: '', batch: '', branch: '', gender: '', program_duration: '' });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    
    const [adminExists, setAdminExists] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const verifyAdminStatus = async () => {
            try {
                const exists = await CheckAdminExists();
                setAdminExists(exists);
            } catch (err) {
                console.error("Could not check admin status");
            }
        };
        verifyAdminStatus();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleClickShowPassword = () => setShowPassword(!showPassword);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            if (isLogin) {
                const res = await LoginUser({ username: formData.username, password: formData.password });
                setSuccess(`Welcome back, ${res.username}! You are logged in as a ${res.role}.`);
                
                localStorage.setItem('access_token', res.access_token);
                localStorage.setItem('role', res.role);
                localStorage.setItem('username', res.username);
                
                if (res.profile_photo_url) {
                    localStorage.setItem('profile_photo', res.profile_photo_url);
                }
                if (res.role === 'Student') {
                    navigate('/student-profile'); 
                } else if (res.role === 'Teacher') {
                    navigate('/teacher-dashboard'); 
                } else if (res.role === 'TPO') {
                    navigate('/company-filter'); 
                } else if (res.role === 'Admin') {
                    navigate('/admin-dashboard'); 
                } else {
                    navigate('/'); 
                }
            } else {
                const res = await RegisterUser(formData);
                setSuccess(res.message);
                setIsLogin(true); 
                
                if (formData.role === 'Admin') {
                    setAdminExists(true);
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong.');
        }
    };

    const FeatureCard = ({ icon, title, description }) => (
        <Card 
            elevation={4} 
            sx={{ 
                borderRadius: '15px', 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                mb: 3,
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0px 12px 24px rgba(0, 0, 0, 0.3)',
                    cursor: 'default',
                    '& .icon-box': {
                        backgroundColor: '#1565c0', // Darkens the icon box on hover
                        transform: 'scale(1.05)',
                        transition: 'transform 0.3s ease, background-color 0.3s ease'
                    }
                }
            }}
        >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
                <Box 
                    className="icon-box"
                    sx={{ 
                        backgroundColor: '#2196f3', 
                        color: 'white', 
                        p: 1.5, 
                        borderRadius: '10px', 
                        display: 'flex',
                        transition: 'transform 0.3s ease, background-color 0.3s ease'
                    }}
                >
                    {icon}
                </Box>
                <Box>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary.dark" lineHeight={1.2} mb={0.5}>
                        {title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" lineHeight={1.3}>
                        {description}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ 
            background: 'linear-gradient(135deg, #62cff4 0%, #2c67f2 50%, #9c27b0 100%)', 
            minHeight: '100vh', 
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            py: 4
        }}>
            <Container maxWidth="xl">
                
                <Box textAlign="center" mb={5}>
                    <Box display="flex" justifyContent="center" alignItems="center" mb={1}>
                        <TrendingUp sx={{ fontSize: 50, color: '#ff9800', mr: -2, zIndex: 1 }} />
                        <School sx={{ fontSize: 60, color: '#ffffff', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))' }} />
                        <Typography variant="h2" fontWeight="900" color="white" sx={{ ml: 2, letterSpacing: '2px', textShadow: '2px 4px 8px rgba(0,0,0,0.3)' }}>
                            PLACEMATE
                        </Typography>
                    </Box>
                    <Typography variant="h6" color="white" sx={{ opacity: 0.9, fontWeight: 500 }}>
                        Connecting graduates to career opportunities.
                    </Typography>
                </Box>

                <Grid container spacing={4} justifyContent="center" alignItems="center">
                    
                    <Grid item xs={12} md={4} lg={3} sx={{ display: { xs: 'none', md: 'block' } }}>
                        <FeatureCard 
                            icon={<Insights fontSize="large" />} 
                            title="Placement Analyzer" 
                            description="Gain data-driven recruiter insights and placement probabilities." 
                        />
                        <FeatureCard 
                            icon={<FactCheck fontSize="large" />} 
                            title="Student Profiles" 
                            description="Verified profiles highlighting academic GPA and external certifications." 
                        />
                    </Grid>

                    <Grid item xs={12} sm={8} md={5} lg={4}>
                        <Paper elevation={6} sx={{ 
                            padding: '3rem 2rem', 
                            borderRadius: '20px', 
                            backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                            backdropFilter: 'blur(10px)',
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
                        }}>
                            <Typography variant="h4" textAlign="center" fontWeight="bold" mb={3} color="primary.dark">
                                {isLogin ? 'Welcome Back' : 'Create an Account'}
                            </Typography>

                            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                            <form onSubmit={handleSubmit}>
                                <TextField
                                    fullWidth
                                    label="Username (e.g., student_id)"
                                    name="username"
                                    variant="outlined"
                                    margin="normal"
                                    required
                                    value={formData.username}
                                    onChange={handleChange}
                                    sx={{ backgroundColor: '#f9f9f9', borderRadius: '5px' }}
                                />

                                {!isLogin && (
                                    <TextField
                                        fullWidth
                                        label="Email Address"
                                        name="email"
                                        type="email"
                                        variant="outlined"
                                        margin="normal"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        sx={{ backgroundColor: '#f9f9f9', borderRadius: '5px' }}
                                    />
                                )}
                                
                                <TextField
                                    fullWidth
                                    label="Password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    variant="outlined"
                                    margin="normal"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    sx={{ backgroundColor: '#f9f9f9', borderRadius: '5px', mb: isLogin ? 3 : 1 }}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={handleClickShowPassword} edge="end">
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                />

                                {!isLogin && (
                                    <TextField
                                        fullWidth
                                        select
                                        label="Role"
                                        name="role"
                                        variant="outlined"
                                        margin="normal"
                                        value={formData.role}
                                        onChange={handleChange}
                                        sx={{ backgroundColor: '#f9f9f9', borderRadius: '5px', mb: 2 }}
                                    >
                                        <MenuItem value="Student">Student</MenuItem>
                                        <MenuItem value="Teacher">Teacher</MenuItem>
                                        <MenuItem value="TPO">Placement Officer (TPO)</MenuItem>
                                        
                                        {!adminExists && (
                                            <MenuItem value="Admin">Admin (Superuser)</MenuItem>
                                        )}
                                    </TextField>
                                )}

                                {!isLogin && formData.role === 'Student' && (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
                                        <TextField
                                            fullWidth
                                            label="Full Legal Name"
                                            name="full_name"
                                            required
                                            value={formData.full_name}
                                            onChange={handleChange}
                                            sx={{ backgroundColor: '#f9f9f9', borderRadius: '5px', mt: 1 }}
                                        />
                                        
                                        {/* --- NEW: Program Dropdown integrated into Registration --- */}
                                        <TextField
                                            fullWidth
                                            select
                                            label="Program"
                                            name="program_duration"
                                            required
                                            value={formData.program_duration}
                                            onChange={handleChange}
                                            sx={{ backgroundColor: '#f9f9f9', borderRadius: '5px', mt: 1 }}
                                        >
                                            <MenuItem value={2}>MCA (2 Years)</MenuItem>
                                            <MenuItem value={5}>IMCA (5 Years)</MenuItem>
                                        </TextField>

                                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                            <TextField
                                              fullWidth
                                              label="Graduating Year" 
                                              name="batch"
                                              required
                                              value={formData.batch}
                                              onChange={handleChange}
                                              sx={{ backgroundColor: '#f9f9f9', borderRadius: '5px' }}
                                            />
                                            <TextField
                                                fullWidth
                                                label="Department (e.g., CSE)"
                                                name="branch"
                                                required
                                                value={formData.branch}
                                                onChange={handleChange}
                                                sx={{ backgroundColor: '#f9f9f9', borderRadius: '5px' }}
                                            />
                                        </Box>
                                        <TextField
                                            fullWidth
                                            select
                                            label="Gender"
                                            name="gender"
                                            required
                                            value={formData.gender}
                                            onChange={handleChange}
                                            sx={{ backgroundColor: '#f9f9f9', borderRadius: '5px', mt: 1 }}
                                        >
                                            <MenuItem value="Male">Male</MenuItem>
                                            <MenuItem value="Female">Female</MenuItem>
                                            <MenuItem value="Other">Other</MenuItem>
                                        </TextField>
                                    </Box>
                                )}

                                <Button 
                                    type="submit" 
                                    fullWidth 
                                    variant="contained" 
                                    color="primary" 
                                    size="large"
                                    sx={{ py: 1.5, fontWeight: 'bold', fontSize: '1.1rem', borderRadius: '8px', textTransform: 'none', boxShadow: '0 4px 14px rgba(44, 103, 242, 0.4)', mt: 2 }}
                                >
                                    {isLogin ? 'LOGIN' : 'REGISTER'}
                                </Button>
                            </form>

                            <Box textAlign="center" mt={3}>
                                <Button 
                                    onClick={() => {
                                        setIsLogin(!isLogin);
                                        setError(null);
                                        setSuccess(null);
                                        setFormData({ ...formData, role: 'Student' }); 
                                    }} 
                                    sx={{ textTransform: 'none', fontWeight: 'bold' }}
                                >
                                    {isLogin ? "Don't have an account? Register here" : "Already have an account? Login here"}
                                </Button>
                            </Box>

                            <Divider sx={{ my: 3 }} />

                            <Box textAlign="center" display="flex" justifyContent="center" gap={1.5} flexWrap="wrap">
                                <Typography variant="caption" color="textSecondary"><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a></Typography>
                                <Typography variant="caption" color="textSecondary">|</Typography>
                                <Typography variant="caption" color="textSecondary"><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</a></Typography>
                            </Box>

                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={4} lg={3} sx={{ display: { xs: 'none', md: 'block' } }}>
                        <FeatureCard 
                            icon={<VerifiedUser fontSize="large" />} 
                            title="Verified Skill Matching" 
                            description="TPOs can match recruiters with students based on proven skills." 
                        />
                        <FeatureCard 
                            icon={<CheckCircle fontSize="large" />} 
                            title="Placement Ready Filtering" 
                            description="Track students who have successfully completed their career roadmaps." 
                        />
                    </Grid>

                </Grid>
            </Container>
        </Box>
    );
};

export default AuthPage;