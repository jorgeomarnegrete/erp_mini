import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { MonitorSmartphone, Edit, Trash2, Plus, CheckCircle2, XCircle, X, ShieldAlert } from 'lucide-react';

export default function PuntosVenta() {
  const [puntos, setPuntos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { api } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [formData, setFormData] = useState({ id: null, numero: 1, descripcion: '', facturacion_electronica: false, activo: true });
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    try {
      const res = await api.get('/api/puntos-venta');
      setPuntos(res.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [api]);

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({ id: null, numero: (puntos.length > 0 ? Math.max(...puntos.map(p => p.numero)) + 1 : 1), descripcion: '', facturacion_electronica: false, activo: true });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (pv) => {
    setModalMode('edit');
    setFormData({ ...pv });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (modalMode === 'create') {
        const payload = { ...formData };
        delete payload.id;
        await api.post('/api/puntos-venta', payload);
      } else {
        const payload = { ...formData };
        delete payload.id;
        await api.put(`/api/puntos-venta/${formData.id}`, payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Ocurrió un error en el servidor de facturación');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¡CUIDADO! Borrar un Punto de Venta es letal si hay facturas amarradas a él. ¿Seguro de continuar? Se aconseja ponerlo Inactivo.")) {
      try {
        await api.delete(`/api/puntos-venta/${id}`);
        fetchData();
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al eliminar terminal');
      }
    }
  };

  // Formato AFIP: Lpad con ceros (0001)
  const formatAfip = (num) => String(num).padStart(4, '0');

  if (loading) {
    return (
      <div className="flex justify-center flex-col items-center h-64 text-red-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
        <p className="font-semibold px-4 text-center">Leyendo Parámetros Comerciales...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
      <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-red-50 to-white flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-red-600 p-2 rounded-lg text-white mr-4 shadow-md">
            <MonitorSmartphone className="w-6 h-6" />
          </div>
          <div>
             <h2 className="text-2xl font-black text-gray-800 tracking-tight">Puntos de Venta (Terminales)</h2>
             <p className="text-xs text-red-600 font-bold tracking-wide uppercase mt-1">Configuración Sensible</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={openCreateModal}
            className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-bold shadow-md transition-all"
          >
            <Plus className="w-5 h-5 mr-1" /> Habilitar Nuevo Punto
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 font-bold text-xs tracking-wider uppercase border-b border-gray-200">
              <th className="px-8 py-4">Terminal (ID)</th>
              <th className="px-8 py-4">Denominación</th>
              <th className="px-8 py-4 text-center">Modo de Operación</th>
              <th className="px-8 py-4 text-center">Estado</th>
              <th className="px-8 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/60">
            {puntos.map((pv) => (
              <tr key={pv.id} className="hover:bg-red-50/20 transition-colors duration-150">
                <td className="px-8 py-4 whitespace-nowrap">
                   <div className="flex items-center space-x-2">
                       <span className="text-lg font-black text-red-700 bg-red-50 px-3 py-1 rounded-lg border border-red-100 shadow-sm font-mono tracking-widest">
                           {formatAfip(pv.numero)}
                       </span>
                   </div>
                </td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="text-base font-extrabold text-gray-800 tracking-tight">{pv.descripcion}</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center">
                  {pv.facturacion_electronica ? (
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border-2 border-blue-200 tracking-wide shadow-sm">
                       🌐 WEB SERVICE (F.E) ACTIVA
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200 tracking-wide">
                       💻 CONTROLADOR / INTERNO
                    </span>
                  )}
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center">
                  {pv.activo ? (
                    <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> En Servicio
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      <ShieldAlert className="w-4 h-4 mr-1.5" /> Suspendido (Baja)
                    </span>
                  )}
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center space-x-3">
                  <button onClick={() => openEditModal(pv)} className="text-red-600 hover:text-white hover:bg-red-600 p-2 rounded-lg transition-all" title="Configurar Parámetros">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDelete(pv.id)} className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-lg transition-all" title="Destruir">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {puntos.length === 0 && (
                 <tr><td colSpan="5" className="text-center p-8 font-bold text-gray-400">Sin Puntos de Venta Parametrizados. El Motor de Facturación no iniciará.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 transform transition-all border-t-8 border-red-600">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 flex items-center w-full mt-2">
                <MonitorSmartphone className="w-7 h-7 mr-3 text-red-600" />
                {modalMode === 'create' ? 'Dar Alta a PV (Sucursal)' : 'Configurar Servidor PV'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black absolute right-6 top-6 transition-colors">
                <X className="w-7 h-7" />
              </button>
            </div>
            {formError && (
              <div className="mb-6 bg-rose-50 text-rose-700 p-4 rounded-xl text-sm font-bold border border-rose-200 flex items-center">
                <ShieldAlert className="w-5 h-5 mr-2" /> {formError}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex space-x-6">
                  <div className="w-1/3">
                    <label className="block text-sm font-extrabold text-gray-800 mb-1">Nº P.V. (ARCA)</label>
                    <input
                      type="number"
                      min="1"
                      max="99999"
                      required
                      value={formData.numero}
                      onChange={(e) => setFormData({...formData, numero: parseInt(e.target.value) || 1})}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-red-600 outline-none text-center font-mono font-black text-xl text-red-700 bg-red-50"
                    />
                  </div>
                  <div className="w-2/3">
                    <label className="block text-sm font-extrabold text-gray-800 mb-1">Nombre del Punto de Venta *</label>
                    <input
                      type="text"
                      required
                      value={formData.descripcion}
                      onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none font-medium"
                      placeholder="Ej. Casa Central - Caja 1"
                    />
                  </div>
              </div>
             
              <div className="bg-blue-50 border-2 border-blue-200 p-5 rounded-2xl">
                 <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isWsfe"
                      checked={formData.facturacion_electronica}
                      onChange={(e) => setFormData({...formData, facturacion_electronica: e.target.checked})}
                      className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                    />
                    <label htmlFor="isWsfe" className="ml-3 block text-base font-black text-blue-900 cursor-pointer tracking-tight">
                      Delegar emisión al Web Service AFIP (F.E)
                    </label>
                 </div>
                 <p className="text-xs text-blue-700 mt-2 font-medium leading-relaxed ml-8">Si habilitas esta opción, el sistema contactará la base militar del gobierno para solicitar el <strong>CAE (Código de Autorización)</strong> devolviendo una boleta 100% legal hacia el cliente. Requiere configurar certificados en el Backend.</p>
              </div>

              <div className="flex items-center pt-2 mt-2 ml-1">
                <input
                  type="checkbox"
                  id="isActivo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                  className="w-5 h-5 text-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="isActivo" className="ml-3 block text-sm font-bold text-gray-800 cursor-pointer">
                  Módulo de Caja Activo y Visible para Vendedores
                </label>
              </div>
              
              <div className="mt-8 flex justify-end space-x-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-700 bg-white hover:bg-gray-100 border shadow-sm rounded-xl font-bold transition-all">
                  Cancelar
                </button>
                <button type="submit" className="px-8 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-xl font-black shadow-md transition-all">
                  <MonitorSmartphone className="w-5 h-5 inline mr-1.5" />
                  {modalMode === 'create' ? 'Guardar' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
  