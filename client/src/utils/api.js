// src/lib/api.js (or wherever)
const API_URL = import.meta.env.VITE_API_BASE_URL;

export const apiFetch = (endpoint, options = {}) => {
  return fetch(`${API_URL}${endpoint}`, options);
};
