import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import SignUpScreen from "./features/auth/SignUpScreen";
import SignInScreen from "./features/auth/SignInScreen";
import LoginScreen from "./features/auth/LoginScreen";
import OnboardingScreen from "./features/auth/OnboardingScreen";
import AppLayout from "./features/app/AppLayout";
import DashboardPage from "./features/app/DashboardPage";
import DashboardLayout from "./layouts/DashboardLayout";
import EmailCampaigns from "./pages/EmailCampaign";
import bgImage from "./assets/bg.png";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div
          className="w-full min-h-screen flex flex-col bg-cover bg-center bg-no-repeat bg-fixed overflow-x-hidden font-sans"
          style={{ backgroundImage: `url(${bgImage})` }}
        >
          <Routes>
            {/* Auth routes */}
            <Route path="/signup" element={<SignUpScreen />} />
            <Route path="/signin" element={<SignInScreen />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/onboarding" element={<OnboardingScreen />} />

            {/* Protected: auth + org check, then dashboard with sidebar */}
            <Route path="/" element={<AppLayout />}>
              <Route element={<DashboardLayout />}>
                <Route
                  index
                  element={<Navigate to="/campaigns/email" replace />}
                />
                <Route path="campaigns/email" element={<EmailCampaigns />} />
                <Route path="dashboard" element={<DashboardPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/signup" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
