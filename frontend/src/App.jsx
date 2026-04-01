import { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import Users from './pages/Users';
import TiposResp from './pages/TiposResp';
import TiposDoc from './pages/TiposDoc';
import ListasPrecios from './pages/ListasPrecios';
import Vendedores from './pages/Vendedores';
import Clientes from './pages/Clientes';
import PuntosVenta from './pages/PuntosVenta';
import Categorias from './pages/Categorias';
import TasasIva from './pages/TasasIva';
import Productos from './pages/Productos';
import Empresa from './pages/Empresa';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/api/auth/me');
          setUser(res.data);
        } catch (error) {
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const res = await api.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const { access_token } = res.data;
    localStorage.setItem('token', access_token);
    
    // Fetch user details
    const userRes = await api.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    setUser(userRes.data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Cargando...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout, api }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="usuarios" element={user?.is_admin ? <Users /> : <Navigate to="/" />} />
            <Route path="puntos-venta" element={user?.is_admin ? <PuntosVenta /> : <Navigate to="/" />} />
            <Route path="tasas-iva" element={user?.is_admin ? <TasasIva /> : <Navigate to="/" />} />
            <Route path="archivos/tipos-resp" element={<TiposResp />} />
            <Route path="archivos/tipos-doc" element={<TiposDoc />} />
            <Route path="archivos/listas-precios" element={<ListasPrecios />} />
            <Route path="archivos/vendedores" element={<Vendedores />} />
            <Route path="archivos/categorias" element={<Categorias />} />
            <Route path="archivos/productos" element={<Productos />} />
            <Route path="clientes" element={<Clientes />} />
            
            {/* Nueva Ruta Configuración Empresa */}
            <Route path="config/empresa" element={user?.is_admin ? <Empresa /> : <Navigate to="/" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
