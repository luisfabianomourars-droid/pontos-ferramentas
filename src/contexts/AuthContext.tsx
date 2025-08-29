import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  nome: string;
  matricula: string;
  email: string;
  patrimonio_estacao?: string;
  is_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Chaves para localStorage
const STORAGE_KEYS = {
  USER: 'supabase_user',
  PROFILE: 'user_profile',
  LAST_CHECK: 'last_auth_check'
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Função para salvar dados no localStorage
  const saveToStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Erro ao salvar no localStorage:', error);
    }
  };

  // Função para recuperar dados do localStorage
  const getFromStorage = (key: string) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('Erro ao recuperar do localStorage:', error);
      return null;
    }
  };

  // Função para limpar dados do localStorage
  const clearStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      localStorage.removeItem(STORAGE_KEYS.LAST_CHECK);
    } catch (error) {
      console.warn('Erro ao limpar localStorage:', error);
    }
  };

  // Carregar dados do cache local
  const loadFromCache = () => {
    const cachedUser = getFromStorage(STORAGE_KEYS.USER);
    const cachedProfile = getFromStorage(STORAGE_KEYS.PROFILE);
    const lastCheck = getFromStorage(STORAGE_KEYS.LAST_CHECK);
    
    // Verificar se o cache não está muito antigo (5 minutos)
    const now = Date.now();
    const cacheAge = now - (lastCheck || 0);
    const maxCacheAge = 5 * 60 * 1000; // 5 minutos
    
    if (cachedUser && cachedProfile && cacheAge < maxCacheAge) {
      console.log('Carregando dados do cache local');
      setUser(cachedUser);
      setProfile(cachedProfile);
      return true;
    }
    
    return false;
  };

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('Buscando perfil para usuário:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return null;
      }

      console.log('Perfil encontrado:', data);
      
      // Salvar perfil no cache
      if (data) {
        saveToStorage(STORAGE_KEYS.PROFILE, data);
        saveToStorage(STORAGE_KEYS.LAST_CHECK, Date.now());
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  const updateUserAndProfile = async (newUser: User | null) => {
    console.log('Atualizando usuário:', newUser?.id);
    
    setUser(newUser);
    
    if (newUser) {
      // Salvar usuário no cache
      saveToStorage(STORAGE_KEYS.USER, newUser);
      
      // Buscar perfil
      const profileData = await fetchProfile(newUser.id);
      setProfile(profileData);
    } else {
      // Limpar dados quando não há usuário
      setProfile(null);
      clearStorage();
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const initializeAuth = async () => {
      console.log('Inicializando autenticação...');
      
      // Primeiro, tentar carregar do cache
      const hasCache = loadFromCache();
      
      if (hasCache) {
        // Se temos cache, definir loading como false temporariamente
        setLoading(false);
      }
      
      try {
        // Verificar sessão atual no Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao verificar sessão:', error);
          clearStorage();
          setUser(null);
          setProfile(null);
        } else if (session?.user) {
          console.log('Sessão encontrada:', session.user.id);
          await updateUserAndProfile(session.user);
        } else {
          console.log('Nenhuma sessão encontrada');
          setUser(null);
          setProfile(null);
          clearStorage();
        }
      } catch (error) {
        console.error('Erro na inicialização:', error);
        // Em caso de erro, manter dados do cache se existirem
        if (!hasCache) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    // Timeout de segurança para evitar loading infinito
    timeoutId = setTimeout(() => {
      console.warn('Timeout na inicialização - forçando fim do loading');
      setLoading(false);
      setInitialized(true);
    }, 10000); // 10 segundos

    initializeAuth();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Evento de auth:', event, session?.user?.id);
        
        // Limpar timeout se ainda estiver ativo
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        if (initialized) {
          await updateUserAndProfile(session?.user ?? null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const signOut = async () => {
    console.log('Fazendo logout...');
    setLoading(true);
    
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      clearStorage();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};