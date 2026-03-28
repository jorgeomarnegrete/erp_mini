import { useState } from 'react';
import { useAuth } from '../App';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError('Credenciales inválidas. Por favor intente de nuevo.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="bg-white/90 backdrop-blur-xl p-10 rounded-2xl shadow-2xl w-full max-w-md transform transition-all hover:scale-[1.01]">
        <div className="flex justify-center mb-8">
          <div className="bg-indigo-600 p-3 rounded-full shadow-lg">
            <LogIn className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8 tracking-tight">Iniciar Sesión</h2>
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm border border-red-200">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-colors duration-200 shadow-lg hover:shadow-indigo-500/30"
          >
            Ingresar al Sistema
          </button>
        </form>
      </div>
    </div>
  );
}
