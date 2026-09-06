import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { normalizeRole } from '@/lib/authorization';

export interface SchoolMembership {
  schoolId: string;
  schoolRole: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authorizationLoading: boolean;
  signUp: (email: string, password: string, fullName: string, classLevel?: string, role?: string, schoolName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  userRoles: string[];
  schoolMemberships: SchoolMembership[];
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasSchoolRole: (role: string) => boolean;
  hasAnySchoolRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorizationLoading, setAuthorizationLoading] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [schoolMemberships, setSchoolMemberships] = useState<SchoolMembership[]>([]);
  const rolesRequestRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user roles when session changes. Do not defer this with a timer:
        // delayed requests can finish after sign-out and repopulate stale roles.
        if (session?.user) {
          void fetchUserRoles(session.user.id);
        } else {
          rolesRequestRef.current += 1;
          setUserRoles([]);
          setSchoolMemberships([]);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRoles = async (userId: string) => {
    const requestId = ++rolesRequestRef.current;
    setAuthorizationLoading(true);
    try {
      const [{ data, error }, { data: memberships, error: membershipError }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId),
        supabase.from('school_members').select('school_id, school_role').eq('user_id', userId).eq('is_active', true),
      ]);

      if (error) throw error;
      if (membershipError) throw membershipError;
      if (requestId === rolesRequestRef.current) {
        setUserRoles(data?.map(r => normalizeRole(r.role)) || []);
        setSchoolMemberships(memberships?.map((membership) => ({
          schoolId: membership.school_id,
          schoolRole: normalizeRole(membership.school_role),
        })) || []);
        setAuthorizationLoading(false);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
      if (requestId === rolesRequestRef.current) {
        setUserRoles([]);
        setSchoolMemberships([]);
        setAuthorizationLoading(false);
      }
    }
  };

  const signUp = async (email: string, password: string, fullName: string, classLevel?: string, role?: string, schoolName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            class_level: classLevel,
            role: role || 'student',
            school_name: schoolName
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive"
          });
        }
        return { error };
      }

      toast({
        title: "Success!",
        description: "Your account has been created. You can now sign in.",
      });
      
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Invalid credentials",
            description: "The email or password you entered is incorrect.",
            variant: "destructive"
          });
        }
        return { error };
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });

      // Fetch user role and redirect accordingly
      if (data.user) {
        const [{ data: roles }, { data: memberships }] = await Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', data.user.id),
          supabase.from('school_members').select('school_role').eq('user_id', data.user.id).eq('is_active', true),
        ]);

        const normalizedRoles = roles?.map(({ role }) => normalizeRole(role)) ?? [];
        const hasSchoolAdminRole = memberships?.some(({ school_role }) =>
          ['owner', 'admin', 'vice_admin'].includes(normalizeRole(school_role))
        ) ?? false;

        if (hasSchoolAdminRole || normalizedRoles.includes('admin')) {
          navigate('/school');
        } else if (normalizedRoles.includes('parent')) {
          navigate('/parent');
        } else if (normalizedRoles.includes('teacher')) {
          navigate('/teacher');
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
      
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
          setUserRoles([]);
          setSchoolMemberships([]);
          setAuthorizationLoading(false);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const hasRole = (role: string) => {
    return userRoles.includes(normalizeRole(role));
  };

  const hasAnyRole = (roles: string[]) => roles.some((role) => hasRole(role));

  const hasSchoolRole = (role: string) => {
    const normalized = normalizeRole(role);
    return schoolMemberships.some((membership) => membership.schoolRole === normalized);
  };

  const hasAnySchoolRole = (roles: string[]) => roles.some((role) => hasSchoolRole(role));

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      authorizationLoading,
      signUp, 
      signIn, 
      signOut,
      userRoles,
      schoolMemberships,
      hasRole,
      hasAnyRole,
      hasSchoolRole,
      hasAnySchoolRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
