import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { I18nProvider } from './contexts/I18nContext';
import MotifBackground from './components/MotifBackground';
import DecorativeBackground from './components/DecorativeBackground';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { EmailVerification } from './pages/EmailVerification';
import { BusinessList } from './pages/BusinessList';
import { BusinessDetail } from './pages/BusinessDetail';
import { BookingForm } from './pages/BookingForm';
import { MyBookings } from './pages/MyBookings';
import { BusinessDashboard } from './pages/BusinessDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Profile } from './pages/Profile';
import BusinessOnboarding from './pages/BusinessOnboarding';
import { BusinessSettings } from './pages/BusinessSettings';
import InfoPage from './pages/InfoPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <MotifBackground density="low" />
            <DecorativeBackground 
              density="medium" 
              symbolSet="decorative" 
              opacity={0.08}
              size={60}
              strokeWidth={6}
              color="#f97316"
            />
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<EmailVerification />} />
              <Route path="/info" element={<InfoPage />} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout>
                    <Home />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/businesses" element={
                <ProtectedRoute>
                  <Layout>
                    <BusinessList />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/businesses/:id" element={
                <ProtectedRoute>
                  <Layout>
                    <BusinessDetail />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/book/:serviceId" element={
                <ProtectedRoute>
                  <Layout>
                    <BookingForm />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/my-bookings" element={
                <ProtectedRoute>
                  <Layout>
                    <MyBookings />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/business-dashboard" element={
                <ProtectedRoute allowedRoles={['business_owner']}>
                  <Layout>
                    <BusinessDashboard />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/business-onboarding" element={
                <ProtectedRoute allowedRoles={['business_owner']}>
                  <Layout>
                    <BusinessOnboarding />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/business-settings" element={
                <ProtectedRoute allowedRoles={['business_owner']}>
                  <Layout>
                    <BusinessSettings />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/admin-dashboard" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <Layout>
                    <AdminDashboard />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              } />
            </Routes>
            
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1f2937',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
