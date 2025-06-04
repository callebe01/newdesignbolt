import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProjectProvider } from './context/ProjectContext';
import { SessionProvider } from './context/SessionContext';
import { LiveCallProvider } from './context/LiveCallContext';
import { AgentProvider } from './context/AgentContext';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { ProjectsList } from './pages/projects/ProjectsList';
import { ProjectDetails } from './pages/projects/ProjectDetails';
import { NewProject } from './pages/projects/NewProject';
import { SessionsList } from './pages/sessions/SessionsList';
import { LiveSession } from './pages/sessions/LiveSession';
import { NewSession } from './pages/sessions/NewSession';
import { AgentsList } from './pages/agents/AgentsList';
import { NewAgent } from './pages/agents/NewAgent';
import { AgentDetails } from './pages/agents/AgentDetails';
import { AgentCall } from './pages/agents/AgentCall';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { TeamMembers } from './pages/team/TeamMembers';
import { Settings } from './pages/settings/Settings';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProjectProvider>
          <SessionProvider>
            <AgentProvider>
              <LiveCallProvider>
              <Router>
                <Routes>
                  <Route element={<MainLayout />}>
                    {/* Public routes */}
                    <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/agent/:agentId" element={<AgentCall />} />
                    
                    {/* Protected routes */}
                    <Route element={<ProtectedRoute />}>
                      <Route path="/" element={<Dashboard />} />
                      
                      {/* Project routes */}
                      <Route path="/projects" element={<ProjectsList />} />
                      <Route path="/projects/new" element={<NewProject />} />
                      <Route path="/projects/:projectId" element={<ProjectDetails />} />
                      
                      {/* Session routes */}
                      <Route path="/sessions" element={<SessionsList />} />
                      <Route path="/projects/:projectId/sessions/new" element={<NewSession />} />
                      <Route path="/sessions/:sessionId" element={<LiveSession />} />

                      {/* Agent routes */}
                      <Route path="/agents" element={<AgentsList />} />
                      <Route path="/agents/new" element={<NewAgent />} />
                      <Route path="/agents/:agentId" element={<AgentDetails />} />
                      
                      {/* Team routes */}
                      <Route path="/team" element={<TeamMembers />} />
                      
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
        </SessionProvider>
        </ProjectProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;