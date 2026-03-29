import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Landmark, Edit, Trash2, Plus, CheckCircle2, ShieldAlert, X } from 'lucide-react';

export default function TasasIva() {
  const [tasas, setTasas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { api } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [formData, setFormData] = useState({ id: null, nombre: '', valor: 21.0, codigo_arca: '', activo: true });
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    try {
      const res = await api.get('/api/tasas-iva');
      setTasas(res.data);
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
    setFormData({ id: null, nombre: '', valor: 21.0, codigo_arca: '', activo: true });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (tasa) => {
    setModalMode('edit');
    setFormData({ ...tasa });
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
        await api.post('/api/tasas-iva', payload);
      } else {
        const payload = { ...formData };
        delete payload.id;
        await api.put(`/api/tasas-iva/${formData.id}`, payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error fiscal reportado por el servidor');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¡ADVERTENCIA LEGAL! Destruir una tasa de IVA romperá las facturas generadas. Por favor, marque su estado como BAJA si el impuesto no se usa más. ¿Continuar eliminación destructiva?")) {
      try {
        await api.delete(`/api/tasas-iva/${id}`);
        fetchData();
      } catch (err) {
        alert(err.response?.data?.detail || 'Error en supresión.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center flex-col items-center h-64 text-amber-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mb-4"></div>
        <p className="font-semibold text-center">Auditando Tasas Estatales...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
      <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-amber-500 p-2 rounded-lg text-white mr-4 shadow-md">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Estructura Impositiva (Tributo IVA)</h2>
            <p className="text-xs text-amber-600 font-bold tracking-wide uppercase mt-1">Nivel AFIP - Sensibilidad Admin</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={openCreateModal} className="flex items-center bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-md transition-all">
            <Plus className="w-5 h-5 mr-1" /> Imponer Tasa (Ley)
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 font-bold text-xs tracking-wider uppercase border-b border-gray-200">
              <th className="px-8 py-4">ID Admin</th>
              <th className="px-8 py-4">Cód AFIP (ARCA)</th>
              <th className="px-8 py-4">Descriptor Nominal</th>
              <th className="px-8 py-4 text-center">Porcentaje de Alicuota</th>
              <th className="px-8 py-4 text-center">Validación Tributaria</th>
              <th className="px-8 py-4 text-center">Alterar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/60">
            {tasas.map((t) => (
              <tr key={t.id} className="hover:bg-amber-50/20 transition-colors duration-150">
                <td className="px-8 py-4 font-mono text-gray-400 text-xs">#{t.id}</td>
                <td className="px-8 py-4 whitespace-nowrap">
                   <span className="text-lg font-black text-amber-700 bg-amber-50 px-3 py-1 rounded border border-amber-100">{t.codigo_arca}</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="text-sm font-bold text-gray-800 tracking-tight">{t.nombre}</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center">
                  <span className="text-xl font-extrabold text-gray-900 border-b-2 border-emerald-400">{t.valor} %</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center">
                  {t.activo ? (
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 shadow-sm border border-emerald-200">
                       <CheckCircle2 className="w-4 h-4 mr-1.5" /> TASA VIGENTE
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                       <ShieldAlert className="w-4 h-4 mr-1.5" /> TASA CADUCADA
                    </span>
                  )}
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center space-x-2">
                  <button onClick={() => openEditModal(t)} className="text-amber-500 hover:text-white hover:bg-amber-500 p-2 rounded-lg transition-all" title="Enmendar">
                    <Edit className="w-5 h-5 inline" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="text-gray-300 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-all" title="Eliminación Completa">
                    <Trash2 className="w-5 h-5 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 border-t-8 border-amber-500">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 flex items-center mt-2">
                <Landmark className="w-7 h-7 mr-3 text-amber-500" />
                {modalMode === 'create' ? 'Inscribir Impuesto' : 'Modificación de Ley'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black absolute right-6 top-6">
                <X className="w-7 h-7" />
              </button>
            </div>
            {formError && (
              <div className="mb-6 bg-rose-50 text-rose-700 p-4 rounded-xl text-sm font-bold flex items-center">
                <ShieldAlert className="w-5 h-5 mr-2 flex-shrink-0" /> {formError}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-6">
              
              <div>
                 <label className="block text-sm font-extrabold text-gray-800 mb-1">Descriptor Legal / Referencia *</label>
                 <input type="text" required value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 outline-none font-medium" placeholder="Ej. IVA Super-reducido 5%" />
              </div>
              
              <div className="flex space-x-6">
                  <div className="w-1/2">
                    <label className="block text-sm font-extrabold text-gray-800 mb-1">Aliquot / Valor Matemático (%)</label>
                    <input type="number" step="0.01" required value={formData.valor} onChange={(e) => setFormData({...formData, valor: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-amber-500 outline-none font-bold text-xl text-emerald-700 bg-emerald-50 text-center" />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-extrabold text-gray-800 mb-1">Cód. Sistema ARCA (Obligatorio)</label>
                    <input type="text" required value={formData.codigo_arca} onChange={(e) => setFormData({...formData, codigo_arca: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-amber-500 outline-none font-bold text-xl text-amber-700 bg-amber-50 text-center" placeholder="Ej: 5" />
                  </div>
              </div>

              <div className="flex items-center pt-2 mt-4 ml-1">
                <input type="checkbox" id="isActivo" checked={formData.activo} onChange={(e) => setFormData({...formData, activo: e.target.checked})} className="w-5 h-5 text-emerald-500 rounded cursor-pointer" />
                <label htmlFor="isActivo" className="ml-3 block text-sm font-bold text-gray-800 cursor-pointer">
                  Habilitar tasa en el Facturador
                </label>
              </div>
              
              <div className="mt-8 flex justify-end space-x-4 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-700 bg-white hover:bg-gray-100 border shadow-sm rounded-xl font-bold transition-all">Ignorar</button>
                <button type="submit" className="px-8 py-2.5 text-white bg-amber-500 hover:bg-amber-600 rounded-xl font-black shadow-md transition-all">Promulgar Tasa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
