import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import Logo from './Logo';
import './LoginSignup.css';

const LoginSignup = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!isLogin && !formData.name) {
      setError('Please enter your full name');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting', isLogin ? 'login' : 'registration', 'with:', { 
        email: formData.email, 
        name: formData.name 
      });

      let response;
      if (isLogin) {
        response = await authAPI.login({
          email: formData.email,
          password: formData.password
        });
      } else {
        response = await authAPI.register({
          name: formData.name,
          email: formData.email,
          password: formData.password
        });
      }

      console.log('Auth response:', response);
      login(response.user);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Auth error:', error);
      
      // More specific error messages
      if (error.message.includes('User not found') || error.message.includes('Invalid credentials')) {
        setError('Invalid email or password. Try creating an account if you don\'t have one.');
      } else if (error.message.includes('User already exists')) {
        setError('An account with this email already exists. Try logging in instead.');
      } else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
        setError('Connection error. Please check if the server is running.');
      } else {
        setError(error.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: ''
    });
    setError('');
  };

  const createTestUser = async () => {
    try {
      setLoading(true);
      const response = await authAPI.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'test123'
      });
      
      console.log('Test user creation response:', response);
      
      // Auto-fill the form with test credentials
      setFormData({
        email: 'test@example.com',
        password: 'test123',
        confirmPassword: '',
        name: ''
      });
      setIsLogin(true);
      setError('Test user created! Click "Sign In" to login.');
    } catch (error) {
      console.error('Test user creation error:', error);
      if (error.message.includes('User already exists')) {
        // User already exists, just fill the form
        setFormData({
          email: 'test@example.com',
          password: 'test123',
          confirmPassword: '',
          name: ''
        });
        setIsLogin(true);
        setError('Test user ready! Click "Sign In" to login.');
      } else {
        setError('Failed to create test user: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-overlay"></div>
      </div>
      
      <div className="auth-content">
        <div className="auth-form-container">
          <div className="auth-header">
            <Logo size="medium" showText={true} className="logo-dark" />
            <h2>{isLogin ? 'Welcome Back' : 'Join IntelliTrip'}</h2>
            <p>{isLogin ? 'Sign in to continue your journey' : 'Start your adventure today'}</p>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required={!isLogin}
                  disabled={loading}
                />
              </div>
            )}
            
            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>
            
            {!isLogin && (
              <div className="form-group">
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
              </div>
            )}
            
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="auth-toggle">
            <p>
              {isLogin ? 'Need an account? ' : 'Already have an account? '}
              <button type="button" onClick={toggleMode} className="toggle-button" disabled={loading}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Test User Button for Development */}
          <div className="test-user-section">
            <button 
              type="button" 
              onClick={createTestUser} 
              className="test-user-button"
              disabled={loading}
            >
              🧪 Create Test User (Dev)
            </button>
            <p className="test-user-info">
              Creates test@example.com / test123 for quick testing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginSignup;
