import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const SessionTimer = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const checkSession = () => {
            const token = localStorage.getItem('access_token');
            // If there's no token or we are already on the login page, do nothing
            if (!token || location.pathname === '/') return;

            try {
                // Decode the JWT token to find its exact expiration time
                const payload = JSON.parse(atob(token.split('.')[1]));
                const expirationTime = payload.exp * 1000; // Convert to milliseconds
                const currentTime = Date.now();

                if (currentTime >= expirationTime) {
                    // Time is up! Log them out.
                    alert("Session timed out due to expiration. Logging you out securely.");
                    localStorage.clear();
                    navigate('/');
                }
            } catch (error) {
                console.error("Invalid token format");
                localStorage.clear();
                navigate('/');
            }
        };

        // Check immediately when the component loads or route changes
        checkSession();

        // Check in the background every 1 minute (60000 ms) while the tab is open
        const interval = setInterval(checkSession, 60000);

        return () => clearInterval(interval);
    }, [navigate, location]);

    return null; // This component operates silently in the background
};