import React from 'react';
import { Save, Bell, Shield, User, Key, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BillingSection } from './BillingSection';
import { UsageDisplay } from '../../components/usage/UsageDisplay';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-3">
          <div className="sticky top-6 space-y-2">
            <a href="#profile" className="flex items-center p-2 rounded-md hover:bg-muted">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </a>
            <a href="#usage" className="flex items-center p-2 rounded-md hover:bg-muted">
              <RefreshCw className="mr-2 h-4 w-4" />
              <span>Usage</span>
            </a>
            <a href="#billing" className="flex items-center p-2 rounded-md hover:bg-muted">
              <RefreshCw className="mr-2 h-4 w-4" />
              <span>Billing</span>
            </a>
            <a href="#appearance" className="flex items-center p-2 rounded-md hover:bg-muted">
              <RefreshCw className="mr-2 h-4 w-4" />
              <span>Appearance</span>
            </a>
            <a href="#notifications" className="flex items-center p-2 rounded-md hover:bg-muted">
              <Bell className="mr-2 h-4 w-4" />
              <span>Notifications</span>
            </a>
            <a href="#security" className="flex items-center p-2 rounded-md hover:bg-muted">
              <Shield className="mr-2 h-4 w-4" />
              <span>Security</span>
            </a>
          </div>
        </div>
        
        <div className="col-span-12 lg:col-span-9 space-y-6">
          <Card id="profile">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="flex items-center">
                <div className="mr-6">
                  {user?.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-20 w-20 rounded-full bg-primary text-primary-foreground text-xl font-semibold">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold">{user?.name}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Change Avatar
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                  label="Full Name" 
                  placeholder="Your name" 
                  value={user?.name || ''} 
                  fullWidth
                />
                <Input 
                  label="Email Address" 
                  placeholder="Your email" 
                  value={user?.email || ''} 
                  fullWidth
                />
                <Input 
                  label="Company" 
                  placeholder="Your company" 
                  fullWidth
                />
                <Input 
                  label="Job Title" 
                  placeholder="Your job title" 
                  fullWidth
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end">
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>

          <div id="usage">
            <UsageDisplay />
          </div>

          <div id="billing">
            <BillingSection />
          </div>
          
          <Card id="appearance">
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="mr-2 h-5 w-5" />
                Appearance
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Theme</h3>
                <div className="flex gap-4">
                  <div 
                    className={`border rounded-md p-4 cursor-pointer transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-muted'}`}
                    onClick={() => theme !== 'light' && toggleTheme()}
                  >
                    <div className="w-full h-24 bg-white border border-gray-200 rounded-md mb-2 flex items-center justify-center text-black">
                      Light Mode
                    </div>
                    <p className="text-sm font-medium text-center">Light</p>
                  </div>
                  
                  <div 
                    className={`border rounded-md p-4 cursor-pointer transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-muted'}`}
                    onClick={() => theme !== 'dark' && toggleTheme()}
                  >
                    <div className="w-full h-24 bg-gray-900 border border-gray-700 rounded-md mb-2 flex items-center justify-center text-white">
                      Dark Mode
                    </div>
                    <p className="text-sm font-medium text-center">Dark</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card id="notifications">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Session Reminders</h3>
                    <p className="text-sm text-muted-foreground">
                      Get notified before scheduled sessions
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Usage Alerts</h3>
                    <p className="text-sm text-muted-foreground">
                      Get notified when approaching plan limits
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Receive emails for important updates
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end">
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </Button>
            </CardFooter>
          </Card>
          
          <Card id="security">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                <div className="space-y-4">
                  <Input 
                    label="Current Password" 
                    type="password" 
                    placeholder="Enter your current password"
                    fullWidth
                  />
                  <Input 
                    label="New Password" 
                    type="password" 
                    placeholder="Enter your new password"
                    fullWidth
                  />
                  <Input 
                    label="Confirm New Password" 
                    type="password" 
                    placeholder="Confirm your new password"
                    fullWidth
                  />
                </div>
              </div>
              
              <div className="pt-4">
                <h3 className="text-lg font-semibold mb-4">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="outline">
                    <Key className="mr-2 h-4 w-4" />
                    Setup 2FA
                  </Button>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end">
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Update Security
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};