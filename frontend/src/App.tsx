import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { I18nProvider } from './contexts/I18nContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import MotifBackground from './components/MotifBackground';
import DecorativeBackground from './components/DecorativeBackground';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { EmailVerification } from './pages/EmailVerification';
import { ForgotPassword } from './pages/ForgotPassword';
import { VerifyResetCode } from './pages/VerifyResetCode';
import { ResetPassword } from './pages/ResetPassword';
import { BusinessList } from './pages/BusinessList';
import { BusinessDetails } from './pages/BusinessDetails';
import { BookingForm } from './pages/BookingForm';
import { MyBookings } from './pages/MyBookings';
import { BusinessDashboard } from './pages/BusinessDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Profile } from './pages/Profile';
import BusinessOnboarding from './pages/BusinessOnboarding';
import { BusinessSettings } from './pages/BusinessSettings';
import { EmployeeInvitations } from './pages/EmployeeInvitations';
import { Chat } from './pages/Chat';
import { MyWaitlist } from './pages/MyWaitlist';
import { QRScanner } from './pages/QRScanner';
import { BookingConfirmation } from './pages/BookingConfirmation';
import { Favorites } from './pages/Favorites';
import { Offers } from './pages/Offers';
import { CreateOffer } from './pages/CreateOffer';
import InfoPage from './pages/InfoPage';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 401 (authentication errors) - these won't be fixed by retrying
        if (error?.response?.status === 401) {
          return false;
        }
        // Retry other errors up to 1 time
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
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
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verify-reset-code" element={<VerifyResetCode />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/info" element={
                <ProtectedRoute>
                  <Layout>
                    <InfoPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
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
                    <BusinessDetails />
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
              
              <Route path="/booking-confirmation/:bookingId" element={
                <ProtectedRoute>
                  <Layout>
                    <BookingConfirmation />
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
                <ProtectedRoute allowedRoles={['business_owner', 'employee']}>
                  <Layout>
                    <BusinessDashboard />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/business-onboarding" element={
                <ProtectedRoute allowedRoles={['customer', 'business_owner']}>
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
              
              <Route path="/employee-invitations" element={
                <ProtectedRoute>
                  <Layout>
                    <EmployeeInvitations />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/chat-list" element={
                <ProtectedRoute>
                  <Layout>
                    <Chat />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/chat/:businessId?" element={
                <ProtectedRoute>
                  <Layout>
                    <Chat />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/messages" element={
                <ProtectedRoute>
                  <Layout>
                    <Chat />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/chat-list" element={
                <ProtectedRoute>
                  <Layout>
                    <Chat />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/my-waitlist" element={
                <ProtectedRoute>
                  <Layout>
                    <MyWaitlist />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/favorites" element={
                <ProtectedRoute>
                  <Layout>
                    <Favorites />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/offers" element={
                <ProtectedRoute>
                  <Layout>
                    <Offers />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/create-offer" element={
                <ProtectedRoute allowedRoles={['business_owner']}>
                  <Layout>
                    <CreateOffer />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/qr-scanner" element={
                <ProtectedRoute allowedRoles={['business_owner', 'employee', 'super_admin']}>
                  <QRScanner />
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
    </ErrorBoundary>
  );
}

export default App;
