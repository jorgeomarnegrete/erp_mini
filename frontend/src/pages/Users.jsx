import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Users as UsersIcon, Edit, Trash2, Plus, CheckCircle2, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const DynamicIcon = ({ name, className }) => {
  const IconComponent = LucideIcons[name];
  if (!name || !IconComponent) return <LucideIcons.Circle className={className} />;
  return <IconComponent className={className} />;
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [menusTree, setMenusTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const { api } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [formData, setFormData] = useState({ id: null, email: '', nombre: '', password: '', is_admin: false });
  const [selectedMenus, setSelectedMenus] = useState([]);
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    try {
      const [usersRes, menusRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/menus/tree')
      ]);
      setUsers(usersRes.data);
      setMenusTree(menusRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [api]);

  const toggleMenuSelection = (menuId) => {
    setSelectedMenus(prev => 
      prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId]
    );
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({ id: null, email: '', nombre: '', password: '', is_admin: false });
    setSelectedMenus([]);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setModalMode('edit');
    setFormData({ id: user.id, email: user.email, nombre: user.nombre || '', password: '', is_admin: user.is_admin });
    setSelectedMenus(user.menus ? user.menus.map(m => m.id) : []);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const payload = { ...formData, menu_ids: selectedMenus };
      if (modalMode === 'create') {
        if (!formData.password) return setFormError('La contraseña es obligatoria para nuevos usuarios');
        await api.post('/api/users', payload);
      } else {
        delete payload.id;
        if (!payload.password) delete payload.password;
        await api.put(`/api/users/${formData.id}`, payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Ocurrió un error al guardar');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este usuario permanentemente?")) {
      try {
        await api.delete(`/api/users/${id}`);
        fetchData();
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al eliminar usuario');
      }
    }
  };

  // Renderizador recursivo para los checkboxes de Menú
  const renderMenuTree = (menus, depth = 0) => {
    return menus.map((menu) => (
      <div key={menu.id} style={{ marginLeft: `${depth * 20}px` }} className="mt-2">
        <label className="flex items-center space-x-3 cursor-pointer p-1.5 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-colors">
          <input
            type="checkbox"
            checked={selectedMenus.includes(menu.id)}
            onChange={() => toggleMenuSelection(menu.id)}
            className="w-4 h-4 text-indigo-600 rounded bg-gray-100 border-gray-300 focus:ring-indigo-500"
          />
          <DynamicIcon name={menu.icono} className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 select-none">
            {menu.nombre}
          </span>
        </label>
        {menu.submenus && menu.submenus.length > 0 && (
          <div className="border-l-2 border-gray-100 ml-2 pl-2 mt-1">
            {renderMenuTree(menu.submenus, depth + 1)}
          </div>
        )}
      </div>
    ));
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
            <UsersIcon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Gestión de Usuarios</h2>
        </div>
        <div className="flex items-center space-x-4">
          <span className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold shadow-sm">
            {users.length} Registros
          </span>
          <button 
            onClick={openCreateModal}
            className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-1" /> Nuevo Usuario
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 font-semibold text-sm tracking-wider uppercase border-b border-gray-100">
              <th className="px-8 py-4">ID</th>
              <th className="px-8 py-4">Nombre</th>
              <th className="px-8 py-4">Correo Electrónico</th>
              <th className="px-8 py-4 text-center">Rol</th>
              <th className="px-8 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/60">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-indigo-50/30 transition-colors duration-150">
                <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">#{u.id}</td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="text-sm font-semibold text-gray-800">{u.nombre || "—"}</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-800">{u.email}</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center">
                  {u.is_admin ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Administrador
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Usuario
                    </span>
                  )}
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center space-x-3">
                  <button onClick={() => openEditModal(u)} className="text-indigo-600 hover:text-indigo-900 transition-colors" title="Editar">
                    <Edit className="w-5 h-5 inline" />
                  </button>
                  <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Eliminar">
                    <Trash2 className="w-5 h-5 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 my-8 grid grid-cols-1 md:grid-cols-2 gap-8 transform transition-all">
            
            {/* Izquierda: Datos del Usuario */}
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-5 md:hidden">
                <h3 className="text-xl font-bold text-gray-900">
                  {modalMode === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="hidden md:block mb-5">
                 <h3 className="text-xl font-bold text-gray-900 border-b pb-2">Datos Principales</h3>
              </div>

              {formError && (
                <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
                  {formError}
                </div>
              )}
              
              <form id="user-form" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="ejemplo@correo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Contraseña {modalMode === 'edit' && <span className="text-gray-400 font-normal text-xs">(Opcional para mantener actual)</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex items-center pt-4 border-t mt-4">
                  <input
                    type="checkbox"
                    id="isAdmin"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({...formData, is_admin: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                  <label htmlFor="isAdmin" className="ml-2 block text-sm font-bold text-gray-800 cursor-pointer">
                    Es Administrador Supremo (Acceso Total Backend)
                  </label>
                </div>
              </form>
            </div>

            {/* Derecha: Arbol de Permisos */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                 <h3 className="text-lg font-bold text-indigo-900 flex items-center">
                   <LucideIcons.ShieldAlert className="w-5 h-5 mr-2" /> Menús Autorizados
                 </h3>
                 <div className="hidden md:block">
                   <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                   </button>
                 </div>
              </div>
              <p className="text-xs text-gray-500 mb-4">Selecciona los menús a los que este usuario tendrá acceso en el frontend.</p>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {menusTree.length > 0 ? renderMenuTree(menusTree) : (
                  <div className="text-sm text-gray-400 italic text-center py-10">No hay menús registrados en el sistema</div>
                )}
              </div>
            </div>

          </div>
          
          {/* Botones Flotantes Abajo */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t md:relative md:bg-transparent md:border-t-0 md:p-0 flex justify-end space-x-3 w-full max-w-4xl mx-auto">
             <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-700 bg-white border hover:bg-gray-50 rounded-xl font-bold transition-all shadow-sm">
                Cerrar
             </button>
             <button type="submit" form="user-form" className="px-6 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold shadow-md hover:shadow-lg transition-all">
                {modalMode === 'create' ? 'Registrar Usuario' : 'Actualizar Usuario'}
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
