import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import * as LucideIcons from 'lucide-react';

export default function Transportes() {
  const { api } = useAuth();
  const [transportes, setTransportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTransporte, setEditingTransporte] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    codigo_tango: '',
    cuit: '',
    domicilio: '',
    localidad: '',
    telefono: ''
  });

  const fetchTransportes = async () => {
    try {
      const res = await api.get('/api/transportes');
      setTransportes(res.data);
    } catch (error) {
      console.error('Error fetching transportes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransportes();
  }, []);

  const handleOpenModal = (transporte = null) => {
    if (transporte) {
      setEditingTransporte(transporte);
      setFormData({
        nombre: transporte.nombre,
        codigo_tango: transporte.codigo_tango || '',
        cuit: transporte.cuit || '',
        domicilio: transporte.domicilio || '',
        localidad: transporte.localidad || '',
        telefono: transporte.telefono || ''
      });
    } else {
      setEditingTransporte(null);
      setFormData({
        nombre: '',
        codigo_tango: '',
        cuit: '',
        domicilio: '',
        localidad: '',
        telefono: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTransporte) {
        await api.put(`/api/transportes/${editingTransporte.id}`, formData);
      } else {
        await api.post('/api/transportes', formData);
      }
      setShowModal(false);
      fetchTransportes();
    } catch (error) {
      alert('Error al guardar el transporte');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este transporte?')) {
      try {
        await api.delete(`/api/transportes/${id}`);
        fetchTransportes();
      } catch (error) {
        alert('Error al eliminar');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Transportes</h1>
          <p className="text-gray-500">Gestiona los transportistas para logística</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <LucideIcons.Plus className="w-5 h-5 mr-2" />
          Nuevo Transporte
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Nombre / Razón Social</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Código Tango</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">CUIT</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Localidad</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400">Cargando transportes...</td></tr>
            ) : transportes.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400">No hay transportes registrados</td></tr>
            ) : (
              transportes.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-800">{t.nombre}</div>
                    <div className="text-xs text-gray-400">{t.domicilio}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">{t.codigo_tango || '—'}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{t.cuit || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{t.localidad || '—'}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenModal(t)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <LucideIcons.Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <LucideIcons.Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
              <h2 className="text-xl font-bold">{editingTransporte ? 'Editar Transporte' : 'Nuevo Transporte'}</h2>
              <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                <LucideIcons.X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre / Razón Social *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Código Tango</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    value={formData.codigo_tango}
                    onChange={(e) => setFormData({...formData, codigo_tango: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">CUIT</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    value={formData.cuit}
                    onChange={(e) => setFormData({...formData, cuit: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Domicilio</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    value={formData.domicilio}
                    onChange={(e) => setFormData({...formData, domicilio: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Localidad</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    value={formData.localidad}
                    onChange={(e) => setFormData({...formData, localidad: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md font-bold"
                >
                  {editingTransporte ? 'Guardar Cambios' : 'Crear Transporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
