import { createBrowserRouter, Navigate, RouterProvider, Outlet } from 'react-router-dom'
import { Home } from './pages/home'
import Campus from './pages/campus'
import { PAGE_PATHS } from './constants/PagePaths'
import { AppContextProvider } from './contexts/AppContext'
import { PageNotFound } from './pages/notfound'
import { Student } from './pages/student'
import { AuthPage } from './pages/auth' 
import { StudentProfile } from './pages/profile' 
import { TeacherDashboard } from './pages/teacher' 
import { TpoDashboard } from './pages/tpo'
import { AdminDashboard } from './pages/admin'; 

// --- NEW: Import the SessionTimer ---
import { SessionTimer } from './components/SessionTimer'; 

// ==========================================
// VERSION 2.0 & 3.0: SECURITY GUARD COMPONENT
// ==========================================
const ProtectedRoute = ({ children, allowedRoles }) => {
  // Grab the digital wristband and role from the browser's local storage
  const token = localStorage.getItem('access_token');
  const role = localStorage.getItem('role');

  // If they are not logged in at all, kick them back to the login page
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If this page requires specific roles, and the user's role isn't one of them:
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Safely redirect them back to their designated dashboard
    if (role === 'Admin') return <Navigate to={PAGE_PATHS.ADMIN_DASHBOARD} replace />;
    if (role === 'Student') return <Navigate to={PAGE_PATHS.STUDENT_PLACEMENT_ANALYZER} replace />;
    if (role === 'TPO') return <Navigate to={PAGE_PATHS.CAMPUS_PLACEMENT_ANALYZER} replace />;
    return <Navigate to={PAGE_PATHS.INSIGHTS} replace />;
  }

  // If they pass all checks, let them view the page!
  return children;
};
// ==========================================

// --- NEW: Global Layout to wrap the whole app with the SessionTimer ---
const GlobalLayout = () => {
  return (
    <>
      <SessionTimer />
      <Outlet />
    </>
  );
};
// ==========================================

const router = createBrowserRouter([
  {
    // Wrap ALL routes inside the GlobalLayout so the timer is always active
    element: <GlobalLayout />,
    children: [
      {
        // Make login the very first page people see if they aren't authenticated
        path: '/login',
        element: <AuthPage />,
      },
      {
        path: '/',
        element: <Navigate to="/login" />, 
      },
      {
        path: PAGE_PATHS.INSIGHTS,
        element: (
          // Everyone can see the general insights
          <ProtectedRoute allowedRoles={['TPO', 'Teacher', 'Student']}>
            <Home />
          </ProtectedRoute>
        ),
      },
      {
        path: PAGE_PATHS.CAMPUS_PLACEMENT_ANALYZER,
        element: (
          // ONLY Placement Officers get access to the massive batch Excel analyzer
          <ProtectedRoute allowedRoles={['TPO']}>
            <Campus />
          </ProtectedRoute>
        ),
      },
      {
        path: PAGE_PATHS.STUDENT_PLACEMENT_ANALYZER,
        element: (
          // Students and Teachers can use the individual student analyzer
          <ProtectedRoute allowedRoles={['Student', 'Teacher']}>
            <Student />
          </ProtectedRoute>
        ),
      },
      {
        path: PAGE_PATHS.STUDENT_PROFILE,
        element: (
          // ONLY Students get access to their personal edit profile page
          <ProtectedRoute allowedRoles={['Student']}>
            <StudentProfile />
          </ProtectedRoute>
        ),
      },
      {
        path: PAGE_PATHS.TEACHER_DASHBOARD,
        element: (
          // ONLY Teachers get access to the class management dashboard
          <ProtectedRoute allowedRoles={['Teacher']}>
            <TeacherDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: PAGE_PATHS.TPO_DASHBOARD,
        element: (
          // ONLY TPOs get access to the Company Filter
          <ProtectedRoute allowedRoles={['TPO']}>
            <TpoDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: PAGE_PATHS.ADMIN_DASHBOARD,
        element: (
          // ONLY Superuser Admins get access to the Admin Dashboard
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <PageNotFound />,
      },
    ]
  }
])

function App() {
  return (
    <AppContextProvider>
      <RouterProvider router={router} />
    </AppContextProvider>
  )
}

export default App;