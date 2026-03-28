import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Contact2, Edit, Trash2, Plus, CheckCircle2, X, XCircle, Percent, Link } from 'lucide-react';

export default function Vendedores() {
  const [vendedores, setVendedores] = useState([]);
  const [usuarios, setUsuarios] = useState([]); // Posibles usuarios de sistema a enlazarse con el vendedor
  const [loading, setLoading] = useState(true);
  const { api } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [formData, setFormData] = useState({ id: null, nombre: '', apellido: '', porcentaje_comision: 0, user_id: '', activo: true });
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    try {
      const [vendRes, usrRes] = await Promise.all([
        api.get('/api/vendedores'),
        api.get('/api/users')
      ]);
      setVendedores(vendRes.data);
      setUsuarios(usrRes.data);
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
    setFormData({ id: null, nombre: '', apellido: '', porcentaje_comision: 0, user_id: '', activo: true });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (vend) => {
    setModalMode('edit');
    setFormData({ ...vend, user_id: vend.user_id || '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const payload = { ...formData };
      delete payload.id;
      if (payload.user_id === '') payload.user_id = null;
      else payload.user_id = parseInt(payload.user_id);
      
      if (modalMode === 'create') {
        await api.post('/api/vendedores', payload);
      } else {
        await api.put(`/api/vendedores/${formData.id}`, payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Ocurrió un error al guardar');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este Vendedor? No se asignará a nuevos clientes.")) {
      try {
        await api.delete(`/api/vendedores/${id}`);
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
            <Contact2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Vendedores / Representantes</h2>
        </div>
        <div className="flex items-center space-x-4">
          <span className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold shadow-sm">
            {vendedores.length} Empleados
          </span>
          <button 
            onClick={openCreateModal}
            className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-1" /> Nuevo Vendedor
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 font-semibold text-sm tracking-wider uppercase border-b border-gray-100">
              <th className="px-8 py-4">ID</th>
              <th className="px-8 py-4">Nombre Completo</th>
              <th className="px-8 py-4 text-center">Comisión por Venta</th>
              <th className="px-8 py-4 text-center">Usuario de Sistema</th>
              <th className="px-8 py-4 text-center">Estado</th>
              <th className="px-8 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/60">
            {vendedores.map((v) => {
              const bUser = v.user_id ? usuarios.find(u => u.id === v.user_id) : null;
              return (
              <tr key={v.id} className="hover:bg-indigo-50/30 transition-colors duration-150">
                <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">#{v.id}</td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="text-sm font-extrabold text-gray-800 tracking-tight">{v.nombre} {v.apellido}</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center">
                   <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded font-bold border border-yellow-200 shadow-sm text-sm">
                     {v.porcentaje_comision} %
                   </span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center">
                   {v.user_id ? (
                     <span className="inline-flex items-center text-xs font-semibold text-indigo-700 bg-indigo-100 px-3 py-1 rounded truncate max-w-[150px]" title={bUser?.email}>
                        <Link className="h-3 w-3 mr-1.5" />
                        ID: {v.user_id} - {bUser ? bUser.nombre || bUser.email : 'Enlazado'}
                     </span>
                   ) : (
                     <span className="text-xs text-gray-400 italic">Sin Cuenta</span>
                   )}
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center">
                  {v.activo ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Vigente
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600 border border-red-200">
                      <XCircle className="w-4 h-4 mr-1.5" /> Baja
                    </span>
                  )}
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center space-x-3">
                  <button onClick={() => openEditModal(v)} className="text-indigo-600 hover:text-indigo-900 transition-colors" title="Editar">
                    <Edit className="w-5 h-5 inline" />
                  </button>
                  <button onClick={() => handleDelete(v.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Eliminar">
                    <Trash2 className="w-5 h-5 inline" />
                  </button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 flex items-center pb-2 border-b w-full mt-2">
                <Contact2 className="w-6 h-6 mr-2 text-indigo-600" />
                {modalMode === 'create' ? 'Alta de Vendedor' : 'Editar Vendedor'}
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
              <div className="flex space-x-4">
                  <div className="w-1/2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Apellido *</label>
                    <input
                      type="text"
                      required
                      value={formData.apellido}
                      onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
              </div>
             
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Porcentaje de Comisión (%)</label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Percent className="h-5 w-5 text-gray-400" />
                   </div>
                   <input
                     type="number"
                     step="0.01"
                     required
                     value={formData.porcentaje_comision}
                     onChange={(e) => setFormData({...formData, porcentaje_comision: parseFloat(e.target.value) || 0})}
                     className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-indigo-700"
                   />
                </div>
              </div>
              
              <div className="bg-gray-50 border p-4 rounded-xl mt-4">
                 <label className="block text-sm font-bold text-gray-700 mb-1">Cuenta de Sistema (Opcional)</label>
                 <select
                    value={formData.user_id}
                    onChange={(e) => setFormData({...formData, user_id: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                 >
                    <option value="">-- No enlazar con ninguna cuenta --</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{u.nombre || u.email} (ID: {u.id})</option>
                    ))}
                 </select>
                 <p className="text-xs text-gray-400 mt-2 leading-relaxed">Si este vendedor usa el sistema con su email, elígelo para vincular las boletas que él facture automáticamente a su nombre.</p>
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
                  Vendedor activo en la nómina (Vigente)
                </label>
              </div>
              
              <div className="mt-8 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-white hover:bg-gray-50 rounded-lg font-medium transition-colors border shadow-sm">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold shadow-sm transition-colors border border-transparent">
                  {modalMode === 'create' ? 'Registrar Vendedor' : 'Guardar Ficha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
