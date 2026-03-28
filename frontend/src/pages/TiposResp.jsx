import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { ReceiptText, Edit, Trash2, Plus, CheckCircle2, X, XCircle } from 'lucide-react';

export default function TiposResp() {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { api } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [formData, setFormData] = useState({ id: null, nombre: '', abreviatura: '', codigo_arca: '', activo: true });
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    try {
      const res = await api.get('/api/tipos-resp');
      setTipos(res.data);
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
    setFormData({ id: null, nombre: '', abreviatura: '', codigo_arca: '', activo: true });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (tipo) => {
    setModalMode('edit');
    setFormData({ ...tipo });
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
        await api.post('/api/tipos-resp', payload);
      } else {
        const payload = { ...formData };
        delete payload.id;
        await api.put(`/api/tipos-resp/${formData.id}`, payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Ocurrió un error al guardar');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar esta Condición Fiscal? Históricamente podría ser perjudicial a reportes viejos.")) {
      try {
        await api.delete(`/api/tipos-resp/${id}`);
        fetchData();
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al eliminar');
      }
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
      <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-indigo-600 p-2 rounded-lg text-white mr-4 shadow-md">
            <ReceiptText className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Tipos de Responsable (ARCA)</h2>
        </div>
        <div className="flex items-center space-x-4">
          <span className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold shadow-sm">
            {tipos.length} Registros
          </span>
          <button 
            onClick={openCreateModal}
            className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-1" /> Nuevo Registro
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 font-semibold text-sm tracking-wider uppercase border-b border-gray-100">
              <th className="px-8 py-4">ID / ARCA</th>
              <th className="px-8 py-4">Abreviatura</th>
              <th className="px-8 py-4">Nombre Oficial</th>
              <th className="px-8 py-4 text-center">Estado</th>
              <th className="px-8 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/60">
            {tipos.map((t) => (
              <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors duration-150">
                <td className="px-8 py-4 whitespace-nowrap">
                   <div className="flex flex-col">
                      <span className="text-xs text-gray-500 font-medium pb-1">ID: #{t.id}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 w-fit border border-blue-200 shadow-sm">
                        Cod: {t.codigo_arca}
                      </span>
                   </div>
                </td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded w-fit inline-block text-center min-w-[3rem] border border-indigo-100">{t.abreviatura}</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="text-sm font-bold text-gray-800 tracking-tight">{t.nombre}</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center">
                  {t.activo ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600 border border-red-200">
                      <XCircle className="w-4 h-4 mr-1.5" /> Inactivo
                    </span>
                  )}
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center space-x-3">
                  <button onClick={() => openEditModal(t)} className="text-indigo-600 hover:text-indigo-900 transition-colors" title="Editar">
                    <Edit className="w-5 h-5 inline" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Eliminar">
                    <Trash2 className="w-5 h-5 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 flex items-center pb-2 border-b w-full mt-2">
                <ReceiptText className="w-6 h-6 mr-2 text-indigo-600" />
                {modalMode === 'create' ? 'Nuevo Tipo de Responsable' : 'Edición de Condición IVA'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 absolute right-6 top-6">
                <X className="w-6 h-6" />
              </button>
            </div>
            {formError && (
              <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
                {formError}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Oficial completo *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Ej. IVA Responsable Inscripto"
                />
              </div>
              <div className="flex space-x-4">
                  <div className="w-1/2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Abreviatura *</label>
                    <input
                      type="text"
                      required
                      maxLength="10"
                      value={formData.abreviatura}
                      onChange={(e) => setFormData({...formData, abreviatura: e.target.value.toUpperCase()})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none uppercase font-bold text-indigo-700"
                      placeholder="Ej. RI"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Código ARCA *</label>
                    <input
                      type="text"
                      required
                      value={formData.codigo_arca}
                      onChange={(e) => setFormData({...formData, codigo_arca: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-center"
                      placeholder="Ej. 01"
                    />
                  </div>
              </div>
              
              <div className="flex items-center pt-4 border-t mt-4">
                <input
                  type="checkbox"
                  id="isActivo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="isActivo" className="ml-2 block text-sm font-bold text-gray-800 cursor-pointer">
                  Habilitado para utilizarse en nuevos clientes
                </label>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors border">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold shadow-sm transition-colors border border-transparent">
                  {modalMode === 'create' ? 'Registrar Tipo' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
