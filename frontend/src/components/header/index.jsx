import { useContext, useEffect, useState } from 'react'
import DesktopView from './DesktopView'
import MobileView from './MobileView'
import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom' 
import { PAGE_PATHS } from '../../constants/PagePaths'
import { AppContext } from '../../contexts/AppContext'
import { 
  Avatar, 
  Box, 
  Typography, 
  Menu, 
  MenuItem, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Alert, 
  CircularProgress 
} from '@mui/material' 
import { ChangePassword } from '../../apis/AuthAPI' 

export const Header = () => {
  const { isMobile } = useContext(AppContext)
  const [navScrolled, setnavScrolled] = useState(false)
  
  // Initialize navigate for logging out
  const navigate = useNavigate()

  // Grab the user's role, username, and profile photo from the browser's local storage
  const role = localStorage.getItem('role')
  const username = localStorage.getItem('username') 
  const profilePhoto = localStorage.getItem('profile_photo') // --- NEW: Grab profile photo URL
  const isLoggedIn = !!localStorage.getItem('access_token')

  // --- NEW STATE FOR PROFILE MENU & PASSWORD MODAL ---
  const [anchorEl, setAnchorEl] = useState(null);
  const [openPwdModal, setOpenPwdModal] = useState(false);
  const [pwdData, setPwdData] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [pwdError, setPwdError] = useState(null);
  const [pwdSuccess, setPwdSuccess] = useState(null);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  // Dynamically build the navigation array based on the user's role
  const NAV_PAGES = [
    {
      name: 'Placement Insights',
      path: PAGE_PATHS.INSIGHTS,
    },
  ]
  // Add this block under your TPO/Teacher/Student IF statements in Header/index.jsx
  if (role === 'Admin') {
    NAV_PAGES.push({
      name: 'Admin Dashboard',
      path: PAGE_PATHS.ADMIN_DASHBOARD,
    })
  }

  // Only Placement Officers get the Campus Analyzer tab
  if (role === 'TPO') {
    NAV_PAGES.push({
      name: 'Campus Analyzer',
      path: PAGE_PATHS.CAMPUS_PLACEMENT_ANALYZER,
    })
    NAV_PAGES.push({
      name: 'Company Filter',
      path: PAGE_PATHS.TPO_DASHBOARD,
    })
  }

  // Students and Teachers get the individual Student Analyzer tab
  if (role === 'Student' || role === 'Teacher') {
    NAV_PAGES.push({
      name: 'Student Placement Analyzer',
      path: PAGE_PATHS.STUDENT_PLACEMENT_ANALYZER,
    })
  }

  // ONLY Students get the "My Profile" tab to upload certs and view their GPA
  if (role === 'Student') {
    NAV_PAGES.push({
      name: 'My Profile',
      path: PAGE_PATHS.STUDENT_PROFILE,
    })
  }
  // ONLY Teachers get the "Teacher Dashboard" tab to manage their class
  if (role === 'Teacher') {
    NAV_PAGES.push({
      name: 'Teacher Dashboard',
      path: PAGE_PATHS.TEACHER_DASHBOARD,
    })
  }

  const handleScroll = () => {
    window.scrollY >= 10 ? setnavScrolled(true) : setnavScrolled(false)
  }

  // create an event listener
  useEffect(() => {
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // The logout function
  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
    localStorage.removeItem('profile_photo') // --- NEW: Clear photo on logout
    navigate('/login', { replace: true })
  }

  // Helper function to set avatar colors based on role
  const getAvatarColor = () => {
    switch(role) {
      case 'Admin': return '#9c27b0'; // Purple
      case 'TPO': return '#ed6c02';   // Orange
      case 'Teacher': return '#2e7d32'; // Green
      default: return '#1976d2';      // Blue for Student
    }
  }

  // --- NEW FUNCTIONS FOR PASSWORD CHANGE ---
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleOpenPwdModal = () => {
    setAnchorEl(null); // Close the dropdown menu
    setPwdData({ old_password: '', new_password: '', confirm_password: '' });
    setPwdError(null);
    setPwdSuccess(null);
    setOpenPwdModal(true);
  };

  const handleClosePwdModal = () => {
    setOpenPwdModal(false);
  };

  const handleSubmitPasswordChange = async () => {
    setPwdError(null);
    setPwdSuccess(null);

    if (pwdData.new_password !== pwdData.confirm_password) {
        return setPwdError("New passwords do not match!");
    }
    if (pwdData.new_password.length < 6) {
        return setPwdError("Password must be at least 6 characters long.");
    }

    setIsChangingPwd(true);
    try {
        const res = await ChangePassword({
            old_password: pwdData.old_password,
            new_password: pwdData.new_password
        });
        setPwdSuccess(res.message);
        setTimeout(() => setOpenPwdModal(false), 2000); // Close modal automatically after 2 seconds
    } catch (err) {
        setPwdError(err.response?.data?.message || "Failed to change password.");
    } finally {
        setIsChangingPwd(false);
    }
  };

  return (
    <>
      <div
        style={
          navScrolled
            ? {
                position: 'fixed', // Changed to fixed to stay on top of the gradient
                width: '100%',
                zIndex: 100,
                top: 0,
                backgroundColor: '#fff',
                boxShadow: '0 2px 4px 0 rgba(0,0,0,.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingRight: '20px',
                transition: 'all 0.3s ease'
              }
            : {
                position: 'fixed', // Changed to fixed to stay on top of the gradient
                width: '100%',
                zIndex: 100,
                top: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.1)', // Slight blur background
                backdropFilter: 'blur(10px)',
                color: '#000', // Changed default color to black for visibility
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingRight: '20px',
                transition: 'all 0.3s ease'
              }
        }
      >
        {/* Wrap your existing views in a div that takes up the remaining space */}
        {/* We pass navScrolled down so the views can adjust their own internal text colors */}
        <div style={{ flexGrow: 1 }}>
          {!isMobile ? (
            <DesktopView NAV_PAGES={NAV_PAGES} navScrolled={navScrolled} />
          ) : (
            <MobileView NAV_PAGES={NAV_PAGES} navScrolled={navScrolled} />
          )}
        </div>

        {/* Right Side: Profile Card + Logout Button */}
        {isLoggedIn && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 3 } }}>
            
            {/* --- UPDATED IDENTITY PROFILE CARD (NOW CLICKABLE) --- */}
            <Box 
              onClick={handleMenuOpen} // <-- Opens Menu
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5, 
                backgroundColor: navScrolled ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.7)',
                padding: '6px 16px',
                borderRadius: '30px',
                boxShadow: navScrolled ? 'none' : '0 2px 8px rgba(0,0,0,0.1)',
                cursor: 'pointer', // <-- Added pointer
                transition: 'all 0.2s ease',
                '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    transform: 'scale(1.02)'
                }
              }}
            >
              <Avatar 
                src={profilePhoto && profilePhoto !== 'null' ? `http://127.0.0.1:5000${profilePhoto}` : undefined} // --- NEW: Added src for profile photo
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: getAvatarColor(),
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
              }}>
                {username ? username.charAt(0) : 'U'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#000', lineHeight: 1.1 }}>
                  {username}
                </Typography>
                <Typography variant="caption" sx={{ color: '#555', fontWeight: 'bold', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  {role}
                </Typography>
              </Box>
            </Box>

            {/* --- NEW PROFILE DROPDOWN MENU --- */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                elevation: 3,
                sx: { mt: 1.5, borderRadius: '10px', minWidth: '150px' }
              }}
            >
              <MenuItem onClick={handleOpenPwdModal} sx={{ fontWeight: 'bold' }}>
                Change Password
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main', fontWeight: 'bold' }}>
                Logout
              </MenuItem>
            </Menu>
            {/* --- END PROFILE DROPDOWN MENU --- */}

            <button
              onClick={handleLogout}
              style={{
                backgroundColor: '#ff4d4f',
                color: '#fff',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '20px', // Rounder button
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                boxShadow: '0 4px 10px rgba(255, 77, 79, 0.3)',
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap'
              }}
            >
              Logout
            </button>
          </Box>
        )}
      </div>

      {/* --- NEW CHANGE PASSWORD MODAL --- */}
      <Dialog open={openPwdModal} onClose={handleClosePwdModal} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', textAlign: 'center', color: 'primary.main' }}>
            Change Password
        </DialogTitle>
        <DialogContent dividers>
            {pwdError && <Alert severity="error" sx={{ mb: 2 }}>{pwdError}</Alert>}
            {pwdSuccess && <Alert severity="success" sx={{ mb: 2 }}>{pwdSuccess}</Alert>}

            <TextField
                fullWidth
                label="Current Password"
                type="password"
                variant="outlined"
                margin="dense"
                value={pwdData.old_password}
                onChange={(e) => setPwdData({...pwdData, old_password: e.target.value})}
            />
            <TextField
                fullWidth
                label="New Password"
                type="password"
                variant="outlined"
                margin="dense"
                sx={{ mt: 2 }}
                value={pwdData.new_password}
                onChange={(e) => setPwdData({...pwdData, new_password: e.target.value})}
            />
            <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                variant="outlined"
                margin="dense"
                sx={{ mt: 2 }}
                value={pwdData.confirm_password}
                onChange={(e) => setPwdData({...pwdData, confirm_password: e.target.value})}
            />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
            <Button onClick={handleClosePwdModal} color="inherit" disabled={isChangingPwd}>
                Cancel
            </Button>
            <Button 
                onClick={handleSubmitPasswordChange} 
                variant="contained" 
                color="primary"
                disabled={!pwdData.old_password || !pwdData.new_password || !pwdData.confirm_password || isChangingPwd}
            >
                {isChangingPwd ? <CircularProgress size={24} color="inherit" /> : 'Update Password'}
            </Button>
        </DialogActions>
      </Dialog>
      {/* --- END CHANGE PASSWORD MODAL --- */}
    </>
  )
}

Header.propTypes = {
  isMobile: PropTypes.bool,
}