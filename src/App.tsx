import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AgentProvider } from './context/AgentContext';
import { LiveCallProvider } from './context/LiveCallContext';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { AgentsList } from './pages/agents/AgentsList';
import { NewAgent } from './pages/agents/NewAgent';
import { AgentDetails } from './pages/agents/AgentDetails';
import { AgentCall } from './pages/agents/AgentCall';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { Settings } from './pages/settings/Settings';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AgentProvider>
          <LiveCallProvider>
            <Router>
              <Routes>
                <Route path="/agent/:agentId" element={<AgentCall />} />
                <Route element={<MainLayout />}>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  
                  {/* Protected routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<Dashboard />} />
                    
                    {/* Agent routes */}
                    <Route path="/agents" element={<AgentsList />} />
                    <Route path="/agents/new" element={<NewAgent />} />
                    <Route path="/agents/:agentId" element={<AgentDetails />} />
                    
                    {/* Settings route */}
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                  
                  {/* Fallback route */}
                  <Route path="*" element={<Navigate to="/" />} />
                </Route>
              </Routes>
            </Router>
          </LiveCallProvider>
        </AgentProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;