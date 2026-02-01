import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Assets
import bgImage from './assets/bg.png';

// Auth Screens
import SignUpScreen from './features/auth/SignUpScreen'; 
import LoginScreen from './features/auth/LoginScreen';

// Layouts & Pages
import DashboardLayout from './layouts/DashboardLayout';
import EmailCampaigns from './pages/EmailCampaign';

function App() {
  return (
    <Router>
      <main 
        className="w-full min-h-screen flex flex-col bg-cover bg-center bg-no-repeat bg-fixed overflow-x-hidden font-sans"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <Routes>
          {/* --- Auth Routes --- */}
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/signup" element={<SignUpScreen />} />

          {/* --- Dashboard Routes (Protected) --- */}
          <Route element={<DashboardLayout />}>
             {/* Redirect root to campaigns for now */}
             <Route path="/" element={<Navigate to="/campaigns/email" replace />} />
             
             {/* The Page we just built */}
             <Route path="/campaigns/email" element={<EmailCampaigns />} />
             
             {/* Placeholders for other links */}
             <Route path="*" element={<Navigate to="/campaigns/email" replace />} />
          </Route>

        </Routes>
      </main>
    </Router>
  );
}

export default App;