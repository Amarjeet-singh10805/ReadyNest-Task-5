import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
  isEmailVerified: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  organizations: Organization[];
  activeOrganizationId: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (user: User, accessToken: string, organizations: Organization[], activeOrgId?: string) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: Partial<User>) => void;
  setActiveOrganization: (orgId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      organizations: [],
      activeOrganizationId: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, organizations, activeOrgId) =>
        set({
          user,
          accessToken,
          organizations,
          activeOrganizationId: activeOrgId || organizations[0]?.id || null,
          isAuthenticated: true,
        }),

      setAccessToken: (accessToken) => set({ accessToken }),

      setUser: (partialUser) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partialUser } : null,
        })),

      setActiveOrganization: (orgId) => set({ activeOrganizationId: orgId }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          organizations: [],
          activeOrganizationId: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'saas-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        organizations: state.organizations,
        activeOrganizationId: state.activeOrganizationId,
        isAuthenticated: state.isAuthenticated,
        // Don't persist accessToken (it's short-lived; refresh via cookie)
      }),
    }
  )
);

// Derived selectors
export const useUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useActiveOrgId = () => useAuthStore((s) => s.activeOrganizationId);
export const useOrganizations = () => useAuthStore((s) => s.organizations);
export const useActiveOrg = () => {
  const orgs = useAuthStore((s) => s.organizations);
  const activeId = useAuthStore((s) => s.activeOrganizationId);
  return orgs.find((o) => o.id === activeId) || null;
};
