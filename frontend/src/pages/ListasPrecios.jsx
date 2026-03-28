import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Tags, Edit, Trash2, Plus, CheckCircle2, X, XCircle, Percent } from 'lucide-react';

export default function ListasPrecios() {
  const [listas, setListas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { api } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [formData, setFormData] = useState({ id: null, nombre: '', porcentaje_ganancia: 0, activo: true });
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    try {
      const res = await api.get('/api/listas-precios');
      setListas(res.data);
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
    setFormData({ id: null, nombre: '', porcentaje_ganancia: 0, activo: true });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (lista) => {
    setModalMode('edit');
    setFormData({ ...lista });
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
        await api.post('/api/listas-precios', payload);
      } else {
        const payload = { ...formData };
        delete payload.id;
        await api.put(`/api/listas-precios/${formData.id}`, payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Ocurrió un error al guardar');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar la lista de precios permanentemente?")) {
      try {
        await api.delete(`/api/listas-precios/${id}`);
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
            <Tags className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Listas de Precios</h2>
        </div>
        <div className="flex items-center space-x-4">
          <span className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold shadow-sm">
            {listas.length} Listas
          </span>
          <button 
            onClick={openCreateModal}
            className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-1" /> Nueva Lista
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 font-semibold text-sm tracking-wider uppercase border-b border-gray-100">
              <th className="px-8 py-4">ID</th>
              <th className="px-8 py-4">Nombre de Lista</th>
              <th className="px-8 py-4">Margen / Porcentaje Sugerido</th>
              <th className="px-8 py-4 text-center">Estado</th>
              <th className="px-8 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/60">
            {listas.map((l) => (
              <tr key={l.id} className="hover:bg-indigo-50/30 transition-colors duration-150">
                <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">#{l.id}</td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="text-sm font-bold text-gray-800 tracking-tight">{l.nombre}</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap">
                   <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded font-bold border border-yellow-200 shadow-sm text-sm">
                     {l.porcentaje_ganancia} %
                   </span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center">
                  {l.activo ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Activa
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600 border border-red-200">
                      <XCircle className="w-4 h-4 mr-1.5" /> Inactiva
                    </span>
                  )}
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center space-x-3">
                  <button onClick={() => openEditModal(l)} className="text-indigo-600 hover:text-indigo-900 transition-colors" title="Editar">
                    <Edit className="w-5 h-5 inline" />
                  </button>
                  <button onClick={() => handleDelete(l.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Eliminar">
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
                <Tags className="w-6 h-6 mr-2 text-indigo-600" />
                {modalMode === 'create' ? 'Crear Nueva Lista' : 'Edición de Lista'}
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Comercial de la Lista *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Ej. Lista Revendedores, Precio Público..."
                />
              </div>
             
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Porcentaje de Ganancia Sugerido (Sobre Costo)</label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Percent className="h-5 w-5 text-gray-400" />
                   </div>
                   <input
                     type="number"
                     step="0.01"
                     required
                     value={formData.porcentaje_ganancia}
                     onChange={(e) => setFormData({...formData, porcentaje_ganancia: parseFloat(e.target.value) || 0})}
                     className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-indigo-700"
                     placeholder="45.0"
                   />
                </div>
                <p className="text-xs text-gray-400 mt-2">Si un producto cuesta $1000 y el margen aquí establecido es de 45%, la calculadora de ventas marcará el precio en $1450 automáticamente.</p>
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
                  Manejar lista como "Activa" para su uso general
                </label>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors border">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold shadow-sm transition-colors border border-transparent">
                  {modalMode === 'create' ? 'Registrar Lista' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
