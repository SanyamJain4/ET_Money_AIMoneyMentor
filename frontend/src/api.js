import axios from 'axios';

// Empty in local dev (CRA proxy forwards to :8000). Set REACT_APP_API_URL when hosting.
const api = axios.create({
  baseURL: (process.env.REACT_APP_API_URL || '').replace(/\/$/, ''),
  timeout: 60000, // free hosts can take ~30s to wake up
});

export default api;
