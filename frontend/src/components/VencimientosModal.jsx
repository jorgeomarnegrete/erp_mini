import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { CalendarClock, X, Plus, Trash2, Edit } from 'lucide-react';

const emptyForm = { id: null, tipo_documento: '', fecha_vencimiento: '', responsable_id: '', avisar_dias_antes: 15, finalizado: false, observaciones: '' };

export default function VencimientosModal({ isOpen, onClose, entidadTipo, entidadId, entidadLabel }) {
  const { api } = useAuth();
  const [vencimientos, setVencimientos] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const fetchVencimientos = async () => {
    try {
      const res = await api.get('/api/vencimientos', { params: { entidad_tipo: entidadTipo, entidad_id: entidadId } });
      setVencimientos(res.data);
    } catch (err) {
      console.error('Error cargando vencimientos:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setIsFormOpen(false);
    fetchVencimientos();
    api.get('/api/users/basico').then(res => setUsers(res.data)).catch(() => {});
  }, [isOpen, entidadTipo, entidadId]);

  const openCreateForm = () => {
    setFormData(emptyForm);
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditForm = (v) => {
    setFormData({
      id: v.id,
      tipo_documento: v.tipo_documento,
      fecha_vencimiento: v.fecha_vencimiento,
      responsable_id: v.responsable_id,
      avisar_dias_antes: v.avisar_dias_antes,
      finalizado: v.finalizado,
      observaciones: v.observaciones || '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const payload = {
        tipo_documento: formData.tipo_documento,
        fecha_vencimiento: formData.fecha_vencimiento,
        responsable_id: parseInt(formData.responsable_id),
        avisar_dias_antes: parseInt(formData.avisar_dias_antes) || 0,
        observaciones: formData.observaciones || null,
      };
      if (formData.id) {
        payload.finalizado = formData.finalizado;
        await api.put(`/api/vencimientos/${formData.id}`, payload);
      } else {
        payload.entidad_tipo = entidadTipo;
        payload.entidad_id = entidadId;
        await api.post('/api/vencimientos', payload);
      }
      setIsFormOpen(false);
      fetchVencimientos();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error interno del servidor.');
    }
  };

  const handleToggleFinalizado = async (v) => {
    try {
      await api.put(`/api/vencimientos/${v.id}`, { finalizado: !v.finalizado });
      fetchVencimientos();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al actualizar');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este vencimiento?')) {
      try {
        await api.delete(`/api/vencimientos/${id}`);
        fetchVencimientos();
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al eliminar');
      }
    }
  };

  if (!isOpen) return null;

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
          <h3 className="text-xl font-black text-gray-800 flex items-center">
            <CalendarClock className="w-6 h-6 mr-3 text-indigo-600" />
            Vencimientos — {entidadLabel}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {vencimientos.length === 0 && !isFormOpen && (
                <p className="text-center text-gray-400 font-medium py-8">Todavía no hay vencimientos cargados.</p>
              )}

              {vencimientos.length > 0 && (
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 text-gray-500 font-semibold text-xs tracking-wider uppercase border-b border-gray-100">
                        <th className="px-3 py-2">Trámite</th>
                        <th className="px-3 py-2">Vencimiento</th>
                        <th className="px-3 py-2">Responsable</th>
                        <th className="px-3 py-2 text-center">Aviso</th>
                        <th className="px-3 py-2 text-center">Finalizado</th>
                        <th className="px-3 py-2 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/60">
                      {vencimientos.map((v) => {
                        const vencido = !v.finalizado && v.fecha_vencimiento < hoy;
                        return (
                          <tr key={v.id} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="px-3 py-2.5 font-bold text-gray-800">{v.tipo_documento}</td>
                            <td className={`px-3 py-2.5 font-medium ${vencido ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                              {v.fecha_vencimiento.split('-').reverse().join('/')}
                            </td>
                            <td className="px-3 py-2.5 text-gray-600">{v.responsable?.nombre || v.responsable?.email}</td>
                            <td className="px-3 py-2.5 text-center text-gray-500">{v.avisar_dias_antes}d</td>
                            <td className="px-3 py-2.5 text-center">
                              <input type="checkbox" checked={v.finalizado} onChange={() => handleToggleFinalizado(v)} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
                            </td>
                            <td className="px-3 py-2.5 text-center space-x-2">
                              <button onClick={() => openEditForm(v)} className="text-indigo-600 hover:text-indigo-900" title="Editar">
                                <Edit className="w-4 h-4 inline" />
                              </button>
                              <button onClick={() => handleDelete(v.id)} className="text-red-500 hover:text-red-700" title="Eliminar">
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!isFormOpen && (
                <button onClick={openCreateForm} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
                  <Plus className="w-5 h-5 mr-1" /> Nuevo Vencimiento
                </button>
              )}

              {isFormOpen && (
                <form onSubmit={handleSave} className="mt-2 p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-4">
                  {formError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">{formError}</div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Trámite *</label>
                      <input type="text" required value={formData.tipo_documento} onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" placeholder="Ej. SENASA, Service, Registro de Conducir..." />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Vencimiento *</label>
                      <input type="date" required value={formData.fecha_vencimiento} onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Responsable *</label>
                      <select required value={formData.responsable_id} onChange={(e) => setFormData({ ...formData, responsable_id: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none font-medium bg-white">
                        <option value="">Seleccionar...</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.nombre || u.email}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Avisar (días antes) *</label>
                      <input type="number" min="0" required value={formData.avisar_dias_antes} onChange={(e) => setFormData({ ...formData, avisar_dias_antes: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Observaciones</label>
                      <textarea value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} rows={2} className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
                    </div>
                    {formData.id && (
                      <div className="sm:col-span-2 flex items-center">
                        <input type="checkbox" id="finalizado-check" checked={formData.finalizado} onChange={(e) => setFormData({ ...formData, finalizado: e.target.checked })} className="w-4 h-4 accent-emerald-600 mr-2" />
                        <label htmlFor="finalizado-check" className="text-sm font-bold text-gray-700">Finalizado</label>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors border">Cancelar</button>
                    <button type="submit" className="px-6 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold shadow-sm transition-colors border border-transparent">
                      {formData.id ? 'Confirmar Cambios' : 'Crear'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
