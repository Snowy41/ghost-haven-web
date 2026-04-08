import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  description: string | null;
  hades_coins: number;
  created_at: string;
}

type AppRole = "owner" | "admin" | "moderator" | "user" | "beta";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  isOwnerOrAdmin: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Use refs to track current user ID and prevent redundant state updates
  const currentUserIdRef = useRef<string | null>(null);
  const sessionRef = useRef<Session | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data as Profile | null);
  }, []);

  const fetchRoles = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const userRoles = (data || []).map((r) => r.role) as AppRole[];
    setRoles(userRoles);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (currentUserIdRef.current) await fetchProfile(currentUserIdRef.current);
  }, [fetchProfile]);

  const refreshRoles = useCallback(async () => {
    if (currentUserIdRef.current) await fetchRoles(currentUserIdRef.current);
  }, [fetchRoles]);

  const isOwnerOrAdmin = roles.includes("owner") || roles.includes("admin");

  useEffect(() => {
    let isMounted = true;

    const handleSession = (newSession: Session | null) => {
      if (!isMounted) return;

      const newUserId = newSession?.user?.id ?? null;
      const prevUserId = currentUserIdRef.current;

      // Always keep session ref up to date (for getSession calls)
      sessionRef.current = newSession;

      // Only update React state if user actually changed (login/logout/switch)
      if (newUserId !== prevUserId) {
        currentUserIdRef.current = newUserId;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Fire and forget - don't block auth state change
          setTimeout(() => {
            if (!isMounted) return;
            fetchProfile(newSession.user.id);
            fetchRoles(newSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
      } else if (newSession) {
        // Same user, just token refresh - update session silently without re-render storm
        // Only update session state (not user) to keep token fresh for API calls
        setSession(newSession);
      }

      setLoading(false);
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleSession(session);
      }
    );

    // Then restore session from storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchRoles]);

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { username },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    currentUserIdRef.current = null;
    sessionRef.current = null;
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, loading, isOwnerOrAdmin, signUp, signIn, signOut, refreshProfile, refreshRoles }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
