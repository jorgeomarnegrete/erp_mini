import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { MapPin, Edit, Trash2, Plus, CheckCircle2, XCircle, X } from 'lucide-react';

export default function Zonas() {
  const [zonas, setZonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { api } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [formData, setFormData] = useState({ id: null, nombre: '', activa: true });
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    try {
      const res = await api.get('/api/zonas');
      setZonas(res.data);
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
    setFormData({ id: null, nombre: '', activa: true });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (zona) => {
    setModalMode('edit');
    setFormData({ ...zona });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const payload = { ...formData };
      delete payload.id;
      if (modalMode === 'create') await api.post('/api/zonas', payload);
      else await api.put(`/api/zonas/${formData.id}`, payload);
      
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error interno del servidor.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar esta Zona? No podrás deshacer esta acción.")) {
      try {
        await api.delete(`/api/zonas/${id}`);
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
            <MapPin className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Zonas de Entrega</h2>
        </div>
        <div className="flex items-center space-x-4">
          <span className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold shadow-sm">
            {zonas.length} Zonas
          </span>
          <button onClick={openCreateModal} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
            <Plus className="w-5 h-5 mr-1" /> Nueva Zona
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 font-semibold text-sm tracking-wider uppercase border-b border-gray-100">
              <th className="px-8 py-4">ID</th>
              <th className="px-8 py-4 cursor-pointer hover:text-indigo-600">Nombre</th>
              <th className="px-8 py-4 text-center">Estado</th>
              <th className="px-8 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/60">
            {zonas.map((z) => (
              <tr key={z.id} className="hover:bg-indigo-50/30 transition-colors duration-150">
                <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">#{z.id}</td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="text-base font-extrabold text-indigo-900 tracking-tight bg-indigo-50 px-2 py-0.5 rounded">{z.nombre}</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center">
                  {z.activa ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Activa
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                      <XCircle className="w-4 h-4 mr-1.5" /> Inactiva
                    </span>
                  )}
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center space-x-3">
                  <button onClick={() => openEditModal(z)} className="text-indigo-600 hover:text-indigo-900 transition-colors" title="Editar">
                    <Edit className="w-5 h-5 inline" />
                  </button>
                  <button onClick={() => handleDelete(z.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Eliminar Permanente">
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
                <MapPin className="w-6 h-6 mr-2 text-indigo-600" />
                {modalMode === 'create' ? 'Registro de Zona' : 'Modificación de Zona'}
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
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre *</label>
                <input type="text" required value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium" placeholder="Ej. Zona Norte, Sur, etc." />
              </div>
              <div className="flex items-center pt-4 border-t border-gray-100 mt-4 ml-1">
                <input type="checkbox" id="isActiva" checked={formData.activa} onChange={(e) => setFormData({...formData, activa: e.target.checked})} className="w-4 h-4 text-emerald-600 rounded cursor-pointer" />
                <label htmlFor="isActiva" className="ml-2 block text-sm font-bold text-gray-800 cursor-pointer">Zona activa para envíos</label>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors border">Cancelar</button>
                <button type="submit" className="px-6 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold shadow-sm transition-colors border border-transparent">
                  {modalMode === 'create' ? 'Crear' : 'Confirmar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
