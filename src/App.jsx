import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

// Public pages
import Landing from './pages/Landing.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ParentLogin from './pages/parent/ParentLogin.jsx';

// Parent pages
import ParentFeeView from './pages/parent/ParentFeeView.jsx';

// Admin pages
import Dashboard from './pages/admin/Dashboard.jsx';
import StudentList from './pages/admin/StudentList.jsx';
import StudentDetail from './pages/admin/StudentDetail.jsx';
import StudentNew from './pages/admin/StudentNew.jsx';
import FeeManagement from './pages/admin/FeeManagement.jsx';
import WhatsAppPanel from './pages/admin/WhatsAppPanel.jsx';
import Settings from './pages/admin/Settings.jsx';

export function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/parent/login" element={<ParentLogin />} />

          {/* Protected Parent Route */}
          <Route 
            path="/parent/fees" 
            element={
              <ProtectedRoute allowedRole="parent">
                <ParentFeeView />
              </ProtectedRoute>
            } 
          />

          {/* Protected Admin Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRole="admin">
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/students" 
            element={
              <ProtectedRoute allowedRole="admin">
                <StudentList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/students/new" 
            element={
              <ProtectedRoute allowedRole="admin">
                <StudentNew />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/students/:id" 
            element={
              <ProtectedRoute allowedRole="admin">
                <StudentDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/fees" 
            element={
              <ProtectedRoute allowedRole="admin">
                <FeeManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/whatsapp" 
            element={
              <ProtectedRoute allowedRole="admin">
                <WhatsAppPanel />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/settings" 
            element={
              <ProtectedRoute allowedRole="admin">
                <Settings />
              </ProtectedRoute>
            } 
          />

          {/* Fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
