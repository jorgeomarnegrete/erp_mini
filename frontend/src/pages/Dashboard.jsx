import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Building2, Phone, Mail, Globe, MapPin } from 'lucide-react';

export default function Dashboard() {
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const { api, user } = useAuth();

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const res = await api.get('/api/empresa');
        setEmpresa(res.data);
      } catch (err) {
        console.error("Error cargando empresa:", err);
      }
      setLoading(false);
    };
    fetchEmpresa();
  }, [api]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mr-3"></div>
        <span>Cargando panel...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Saludo Inicial */}
      <h1 className="text-3xl font-black text-gray-800 mb-8">
        ¡Hola, {user?.nombre || "Usuario"}! 👋
      </h1>

      {empresa && (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative">
          
          {/* Cover Header */}
          <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-800 w-full absolute top-0 left-0 z-0"></div>

          <div className="relative z-10 p-8 pt-16 flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-8">
            
            {/* Logo Avatar */}
            <div className="w-40 h-40 shrink-0 bg-white rounded-2xl shadow-lg border-4 border-white flex items-center justify-center overflow-hidden">
               {empresa.logo_base64 ? (
                 <img src={empresa.logo_base64} alt="Logo Empresa" className="w-full h-full object-contain p-2" />
               ) : (
                 <Building2 className="w-16 h-16 text-gray-200" />
               )}
            </div>

            {/* Información de Identidad */}
            <div className="flex-1 mt-2">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                {empresa.nombre_fantasia || empresa.razon_social}
              </h2>
              {empresa.nombre_fantasia && (
                <p className="text-sm font-bold text-gray-500 tracking-wide uppercase mt-1">
                  {empresa.razon_social} (CUIT: {empresa.cuit})
                </p>
              )}
              {!empresa.nombre_fantasia && (
                <p className="text-sm font-bold text-gray-500 tracking-wide uppercase mt-1">
                  CUIT: {empresa.cuit}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                {empresa.domicilio_comercial && (
                  <div className="flex items-center text-gray-600 font-medium">
                    <MapPin className="w-5 h-5 mr-3 text-blue-500" />
                    <span>{empresa.domicilio_comercial}{empresa.localidad ? `, ${empresa.localidad}` : ''}</span>
                  </div>
                )}
                
                {empresa.telefono && (
                  <div className="flex items-center text-gray-600 font-medium">
                    <Phone className="w-5 h-5 mr-3 text-emerald-500" />
                    <span>{empresa.telefono}</span>
                  </div>
                )}

                {empresa.email && (
                  <div className="flex items-center text-gray-600 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    <Mail className="w-5 h-5 mr-3 text-rose-500" />
                    <a href={`mailto:${empresa.email}`} className="hover:text-blue-600 transition-colors">{empresa.email}</a>
                  </div>
                )}

                {empresa.sitio_web && (
                  <div className="flex items-center text-gray-600 font-medium">
                    <Globe className="w-5 h-5 mr-3 text-indigo-500" />
                    <a href={empresa.sitio_web.startsWith('http') ? empresa.sitio_web : `https://${empresa.sitio_web}`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors border-b border-indigo-200 hover:border-indigo-600 font-bold">
                       {empresa.sitio_web.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tarjetas Rapidas del Dashboard (Opcional a futuro) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between opacity-50 cursor-not-allowed">
            <div>
               <p className="text-sm font-bold text-gray-400">Ventas del Mes</p>
               <h3 className="text-2xl font-black text-gray-300">$ 0.00</h3>
            </div>
            <div className="bg-gray-50 p-3 rounded-full"><Building2 className="w-6 h-6 text-gray-300" /></div>
         </div>
         {/* Espacio para estirarlo a futuro... */}
      </div>

    </div>
  );
}
