import axios from 'axios';
import { supabase } from './supabaseClient';

export const api = axios.create({
  baseURL: 'http://localhost:3001/api', // Confira se a porta é 3001 mesmo
});

// Interceptor: Antes de cada requisição, coloca o Token
api.interceptors.request.use(async (config) => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("Aviso: Tentando requisição sem token.");
    }
  } catch (error) {
    console.error("Erro ao pegar token:", error);
  }
  return config;
});

// Interceptor: Se a API der erro, não quebra o app inteiro
api.interceptors.response.use(
  response => response,
  error => {
    // Se o backend recusar (401), só avisamos no console
    if (error.response?.status === 401) {
      console.error("Sessão expirada ou inválida na API.");
    }
    return Promise.reject(error);
  }
);