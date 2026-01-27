import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Função auxiliar para formatar o usuário do jeito que o sistema gosta
  const formatUser = (sessionUser) => {
    if (!sessionUser) return null;
    return {
      ...sessionUser,
      // Pega o nome dos metadados ou usa o começo do e-mail
      name: sessionUser.user_metadata?.name || sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0],
      avatar: sessionUser.user_metadata?.avatar_url || '',
      status: 'online'
    };
  };

  useEffect(() => {
    // 1. Carrega sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(formatUser(session?.user));
      setLoading(false);
    });

    // 2. Escuta mudanças
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(formatUser(session?.user));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Salva o nome padrão ao criar conta
        data: { name: email.split('@')[0], avatar_url: '' }
      }
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);