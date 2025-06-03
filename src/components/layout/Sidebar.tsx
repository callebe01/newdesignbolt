import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  FolderKanban, 
  Phone, 
  ChevronLeft, 
  ChevronRight, 
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <aside 
      className={`bg-card border-r border-border transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!collapsed && (
          <h2 className="text-xl font-semibold truncate">Design Testing</h2>
        )}
        <button 
          onClick={toggleSidebar}
          className="p-1 rounded-md hover:bg-muted transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>
      
      <nav className="flex flex-col p-2 h-[calc(100vh-4rem)] overflow-y-auto">
        <NavItem to="/" icon={<LayoutDashboard size={20} />} text="Dashboard" collapsed={collapsed} />
        <NavItem to="/projects" icon={<FolderKanban size={20} />} text="Projects" collapsed={collapsed} />
        <NavItem to="/sessions" icon={<Phone size={20} />} text="Sessions" collapsed={collapsed} />
        <NavItem to="/team" icon={<Users size={20} />} text="Team" collapsed={collapsed} />
        
        <div className="mt-auto">
          <NavItem to="/settings" icon={<Settings size={20} />} text="Settings" collapsed={collapsed} />
        </div>
      </nav>
    </aside>
  );
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  text: string;
  collapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, text, collapsed }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => 
        `flex items-center px-3 py-2 my-1 rounded-md transition-colors ${
          isActive 
            ? 'bg-primary/10 text-primary' 
            : 'hover:bg-muted text-foreground'
        }`
      }
    >
      <span className="mr-3">{icon}</span>
      {!collapsed && <span className="font-medium">{text}</span>}
    </NavLink>
  );
};