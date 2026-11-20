
import axios from "axios";

const API = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api",

  withCredentials: true,
});

// Automatically attach request verification
// to every state-changing API request.
API.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();

  if (
    ["post", "put", "patch", "delete"].includes(method)
  ) {
    config.headers.set("X-GapWise-Request", "1");
  }

  return config;
});

export default API;
