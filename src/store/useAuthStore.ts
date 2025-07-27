import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { account, ID } from '@/lib/appwrite';
import apiService from '@/lib/api';
import { toast } from 'sonner';
import { useStore } from './useStore';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface ImportedDataset {
  id: string;
  name: string;
  type: 'fish' | 'plant';
  uploadDate: string;
  recordCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  fileSize: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  importedDatasets: ImportedDataset[];
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loginDemo: () => Promise<void>;
  checkAuth: () => Promise<void>;
  addImportedDataset: (dataset: Omit<ImportedDataset, 'id'>) => void;
  removeImportedDataset: (id: string) => void;
}

// Demo user data
const DEMO_USER: User = {
  id: 'demo-user',
  name: 'Demo User',
  email: 'demo@aquanexus.com',
  createdAt: '2024-01-01T00:00:00Z',
  isDemo: true
};

// Demo imported datasets
const DEMO_DATASETS: ImportedDataset[] = [
  {
    id: 'fish-initial',
    name: 'Fish Environment - Initial Data',
    type: 'fish',
    uploadDate: '2024-03-01T00:00:00Z',
    recordCount: 441,
    dateRange: {
      start: '2024-03-01T00:10:00Z',
      end: '2024-05-31T05:13:00Z'
    },
    fileSize: 28672
  },
  {
    id: 'plant-initial',
    name: 'Plant Environment - Initial Data',
    type: 'plant',
    uploadDate: '2024-03-01T00:00:00Z',
    recordCount: 441,
    dateRange: {
      start: '2024-03-01T00:10:00Z',
      end: '2024-05-31T05:13:00Z'
    },
    fileSize: 31744
  },
  {
    id: 'fish-validate',
    name: 'Fish Environment - Validation Data',
    type: 'fish',
    uploadDate: '2024-06-01T00:00:00Z',
    recordCount: 444,
    dateRange: {
      start: '2024-06-01T00:15:00Z',
      end: '2024-08-31T22:08:00Z'
    },
    fileSize: 29184
  },
  {
    id: 'plant-validate',
    name: 'Plant Environment - Validation Data',
    type: 'plant',
    uploadDate: '2024-06-01T00:00:00Z',
    recordCount: 444,
    dateRange: {
      start: '2024-06-01T00:15:00Z',
      end: '2024-08-31T22:08:00Z'
    },
    fileSize: 32256
  }
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      importedDatasets: [],

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const session = await apiService.login(email, password);
          const user = await apiService.getCurrentUser();
          
          if (user) {
            const isDemo = user.email === 'demo@aquanexus.com';
            const userData: User = {
              id: user.$id,
              name: user.name,
              email: user.email,
              createdAt: user.$createdAt,
              isDemo
            };
            
            set({ 
              user: userData, 
              isAuthenticated: true,
              importedDatasets: isDemo ? DEMO_DATASETS : []
            });
            
            // Reset main store data based on user type
            if (typeof window !== 'undefined') {
              useStore.getState().resetStoreData(isDemo);
            }
          }
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true });
        try {
          await apiService.register(email, password, name);
          // Auto-login after registration
          await get().login(email, password);
        } catch (error) {
          console.error('Registration error:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await apiService.logout();
          
          // Reset main store on logout
          if (typeof window !== 'undefined') {
            useStore.getState().resetStoreData(false);
          }
          
          set({ 
            user: null, 
            isAuthenticated: false,
            importedDatasets: []
          });
        } catch (error) {
          console.error('Logout error:', error);
          // Force logout even if API call fails
          if (typeof window !== 'undefined') {
            useStore.getState().resetStoreData(false);
          }
          set({ 
            user: null, 
            isAuthenticated: false,
            importedDatasets: []
          });
        } finally {
          set({ isLoading: false });
        }
      },

      loginDemo: async () => {
        set({ isLoading: true });
        try {
          // Demo account credentials
          const demoEmail = 'demo@aquanexus.com';
          const demoPassword = 'demo123456';
          const demoName = 'Demo User';
          
          let appwriteUser;
          
          try {
            // First try to login with existing demo account
            await apiService.login(demoEmail, demoPassword);
            appwriteUser = await apiService.getCurrentUser();
          } catch (loginError: any) {
            // If login fails, try to create the demo account
            if (loginError.code === 401 || loginError.message?.includes('Invalid credentials')) {
              try {
                await apiService.createDemoAccount(demoEmail, demoPassword, demoName);
                appwriteUser = await apiService.getCurrentUser();
              } catch (createError: any) {
                // If creation fails because user exists, try login again
                if (createError.message?.includes('already exists')) {
                  await apiService.login(demoEmail, demoPassword);
                  appwriteUser = await apiService.getCurrentUser();
                } else {
                  throw createError;
                }
              }
            } else {
              throw loginError;
            }
          }
          
          if (!appwriteUser) {
            throw new Error('Failed to get demo user data');
          }
          
          const demoUser: User = {
            id: appwriteUser.$id,
            name: appwriteUser.name,
            email: appwriteUser.email,
            createdAt: appwriteUser.$createdAt,
            isDemo: true
          };
          
          // Reset main store and load demo data
          if (typeof window !== 'undefined') {
            useStore.getState().resetStoreData(true);
          }
          
          set({ 
            user: demoUser, 
            isAuthenticated: true,
            importedDatasets: DEMO_DATASETS
          });
          
          toast.success('Demo account loaded with sample data!');
          
        } catch (error) {
          console.error('Demo login error:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const user = await apiService.getCurrentUser();
          
          if (user) {
            const isDemo = user.email === 'demo@aquanexus.com';
            const userData: User = {
              id: user.$id,
              name: user.name,
              email: user.email,
              createdAt: user.$createdAt,
              isDemo
            };
            
            // Only set imported datasets if not already set (to preserve user's data)
            const currentState = get();
            const shouldSetDatasets = !currentState.user || currentState.user.id !== userData.id;
            
            set({ 
              user: userData, 
              isAuthenticated: true,
              ...(shouldSetDatasets && {
                importedDatasets: isDemo ? DEMO_DATASETS : []
              })
            });
            
            // Reset main store data based on user type
            if (typeof window !== 'undefined') {
              useStore.getState().resetStoreData(isDemo);
            }
          } else {
            set({ 
              user: null, 
              isAuthenticated: false,
              importedDatasets: []
            });
          }
        } catch (error) {
          console.error('Auth check error:', error);
          set({ 
            user: null, 
            isAuthenticated: false,
            importedDatasets: []
          });
        } finally {
          set({ isLoading: false });
        }
      },

      addImportedDataset: (dataset) => {
        const newDataset: ImportedDataset = {
          ...dataset,
          id: Date.now().toString()
        };
        
        set((state) => ({
          importedDatasets: [...state.importedDatasets, newDataset]
        }));
      },

      removeImportedDataset: (id) => {
        set((state) => ({
          importedDatasets: state.importedDatasets.filter(d => d.id !== id)
        }));
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        importedDatasets: state.importedDatasets
      })
    }
  )
);