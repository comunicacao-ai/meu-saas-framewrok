import { createContext, useContext } from 'react';

// Cria o contexto vazio
const SocketContext = createContext();

export function SocketProvider({ children }) {
  // Retorna um provedor "dummy" (falso) que não tenta conectar em lugar nenhum.
  // Isso para os erros de "Token não fornecido" e "Connection refused".
  return (
    <SocketContext.Provider value={{ socket: null, connected: false }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);