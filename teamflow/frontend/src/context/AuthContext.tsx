import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  currentUser: User | null;
  demoUsers: User[];
  role: UserRole;
  isViewer: boolean;
  canManageProjects: boolean;
  canManageTasks: boolean;
  canManageTeam: boolean;
  switchUser: (user: User) => void;
  refreshUsers: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsersAndAuth = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<User[]>('/auth/demo-users');
      const users = res.data || [];
      setDemoUsers(users);

      const storedActorId = localStorage.getItem('teamflow_current_actor_id');
      let targetUser = users.find((u) => u.id === storedActorId);

      // Default to Alex Rivera (Admin)
      if (!targetUser) {
        targetUser = users.find((u) => u.role === 'admin') || users[0];
      }

      if (targetUser) {
        localStorage.setItem('teamflow_current_actor_id', targetUser.id);
        setCurrentUser(targetUser);
      }
    } catch (err) {
      console.error('Failed to load demo auth personas', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndAuth();
  }, []);

  const switchUser = (user: User) => {
    localStorage.setItem('teamflow_current_actor_id', user.id);
    setCurrentUser(user);
  };

  const role: UserRole = currentUser?.role || 'viewer';
  const isViewer = role === 'viewer';
  const canManageProjects = role === 'admin' || role === 'project_manager';
  const canManageTasks = role === 'admin' || role === 'project_manager' || role === 'member';
  const canManageTeam = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        demoUsers,
        role,
        isViewer,
        canManageProjects,
        canManageTasks,
        canManageTeam,
        switchUser,
        refreshUsers: loadUsersAndAuth,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
