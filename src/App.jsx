import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import LoginSignup from './components/LoginSignup';
import Dashboard from './components/Dashboard';
import SharedItinerary from './components/SharedItinerary';
import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to='/login' />;
}

function UnauthOnlyRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to='/dashboard' replace /> : children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className='App'>
          <Routes>
            <Route path='/' element={<LandingPage />} />
            <Route path='/login' element={
              <UnauthOnlyRoute>
                <LoginSignup />
              </UnauthOnlyRoute>
            } />
            <Route path='/shared/:shareId' element={<SharedItinerary />} />
            <Route 
              path='/dashboard' 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
