const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const environment = {
  // Endereço base do backend, sem /ocorrencias. Pode incluir um prefixo como /api.
  apiUrl: `http://${apiHost}:18080`,
  authUrl: `http://${apiHost}:8081`,
};
