import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { UserCheck, Edit, Trash2, Plus, CheckCircle2, XCircle, Search, Save, X, Building2, MapPin, Phone, Hash } from 'lucide-react';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { api } = useAuth();
  
  // Catálogos Backend
  const [tiposDoc, setTiposDoc] = useState([]);
  const [tiposResp, setTiposResp] = useState([]);
  const [listasPrecios, setListasPrecios] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [zonas, setZonas] = useState([]);

  // Búsqueda Inteligente
  const [searchTerm, setSearchTerm] = useState('');

  // Catálogos API Pública Georef (Gobierno AR)
  const [provincias, setProvincias] = useState([]);
  const [localidades, setLocalidades] = useState([]);

  // Estado del Vendedor
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  
  const [formData, setFormData] = useState({
    id: null, razon_social: '', tipo_doc_id: '', documento: '',
    tipo_resp_id: '', lista_precio_id: '', vendedor_id: '', zona_id: '',
    nombre_contacto: '', telefono_contacto: '', email: '',
    telefono: '', provincia: '', localidad: '', direccion: '',
    observaciones: '', activo: true
  });
  
  const [formError, setFormError] = useState('');

  // 1. Carga Inicial de Toda la data
  const fetchAllData = async () => {
    try {
      const [cliRes, tDocRes, tRespRes, lPRes, vendRes, provRes, zonRes] = await Promise.all([
        api.get('/api/clientes'),
        api.get('/api/tipos-doc'),
        api.get('/api/tipos-resp'),
        api.get('/api/listas-precios'),
        api.get('/api/vendedores'),
        axios.get('https://apis.datos.gob.ar/georef/api/provincias?campos=nombre&max=100'),
        api.get('/api/zonas')
      ]);

      setClientes(cliRes.data);
      setTiposDoc(tDocRes.data);
      setTiposResp(tRespRes.data);
      setListasPrecios(lPRes.data);
      setVendedores(vendRes.data);
      setZonas(zonRes.data);
      
      // Ordenar alfabéticamente provincias
      const sortedProv = provRes.data.provincias.sort((a,b) => a.nombre.localeCompare(b.nombre));
      setProvincias(sortedProv);
      
    } catch (error) {
      console.error('Error cargando padrones:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [api]);

  // 2. Efecto Secundario: Si cambia "provincia", traemos sus municipios
  useEffect(() => {
    const fetchLocalidades = async (provinciaNombre) => {
      if(!provinciaNombre) {
        setLocalidades([]);
        return;
      }
      try {
        const munRes = await axios.get(`https://apis.datos.gob.ar/georef/api/municipios?provincia=${provinciaNombre}&campos=nombre&max=1000`);
        const sortedMun = munRes.data.municipios.sort((a,b) => a.nombre.localeCompare(b.nombre));
        setLocalidades(sortedMun);
      } catch (err) {
        console.error("Georef API Error:", err);
      }
    };
    fetchLocalidades(formData.provincia);
  }, [formData.provincia]);

  // Interfaz de Modal
  const getEmptyForm = () => ({
    id: null, razon_social: '', tipo_doc_id: tiposDoc[0]?.id || '', documento: '',
    tipo_resp_id: tiposResp[0]?.id || '', lista_precio_id: '', vendedor_id: '', zona_id: '',
    nombre_contacto: '', telefono_contacto: '', email: '', telefono: '',
    provincia: '', localidad: '', direccion: '', observaciones: '', activo: true
  });

  const openCreateModal = () => {
    setModalMode('create');
    setFormData(getEmptyForm());
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (cliente) => {
    setModalMode('edit');
    // Mapear nulos a string vacíos para que no rompa el combobox
    const safeData = { ...cliente };
    Object.keys(safeData).forEach(k => {
      if (safeData[k] === null) safeData[k] = '';
    });
    setFormData(safeData);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      // Limpiar data para la API
      const payload = { ...formData };
      delete payload.id;
      if (payload.lista_precio_id === '') payload.lista_precio_id = null;
      if (payload.vendedor_id === '') payload.vendedor_id = null;
      if (payload.zona_id === '') payload.zona_id = null;

      if (modalMode === 'create') {
        await api.post('/api/clientes', payload);
      } else {
        await api.put(`/api/clientes/${formData.id}`, payload);
      }
      setIsModalOpen(false);
      
      // Solo refrescamos los clientes en la UI
      const cliRes = await api.get('/api/clientes');
      setClientes(cliRes.data);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error validando con la base de datos');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar el cliente? Las facturas históricas perderían su rastro. Sugerimos usar Estado: Inactivo en su lugar.")) {
      try {
        await api.delete(`/api/clientes/${id}`);
        const cliRes = await api.get('/api/clientes');
        setClientes(cliRes.data);
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al eliminar');
      }
    }
  };

  if (loading) return (
     <div className="flex flex-col justify-center items-center h-64 text-indigo-600">
       <span className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></span>
       <p className="font-semibold animate-pulse">Armando padrón de clientes (Georef + ARCA)...</p>
     </div>
  );

  // Lógica de Filtrado Inteligente (Tokenizada)
  const filteredClientes = clientes.filter(c => {
    if (!searchTerm.trim()) return true;
    
    const tokens = searchTerm.toLowerCase().split(' ').filter(t => t.trim() !== '');
    const searchString = `
      ${c.razon_social || ''} 
      ${c.documento || ''} 
      ${c.nombre_contacto || ''} 
      ${c.email || ''} 
      ${c.localidad || ''}
      ${c.provincia || ''}
      ${c.zona?.nombre || ''}
    `.toLowerCase();
    
    return tokens.every(token => searchString.includes(token));
  });

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
      <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-indigo-600 p-2 rounded-lg text-white mr-4 shadow-md">
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Clientes</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar cliente, CUIT, loc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all w-64 shadow-sm"
            />
          </div>
          <span className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold shadow-sm whitespace-nowrap">
            {filteredClientes.length} / {clientes.length} Cuentas
          </span>
          <button onClick={openCreateModal} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap">
            <Plus className="w-5 h-5 mr-1" /> Nuevo Cliente
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 font-semibold text-sm tracking-wider uppercase border-b border-gray-100">
              <th className="px-6 py-4">Razón Social / Datos Fiscales</th>
              <th className="px-6 py-4">Lista de Precios</th>
              <th className="px-6 py-4">Contacto</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/60">
            {filteredClientes.map((c) => (
              <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors duration-200">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-gray-900 tracking-tight">{c.razon_social}</span>
                    <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 w-fit">
                      {c.tipo_doc?.abreviatura}: {c.documento}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5 font-medium">{c.tipo_resp?.nombre}</span>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex flex-col space-y-1">
                     <span className="text-xs font-semibold text-gray-700">
                       Lista: <span className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded">{c.lista_precio ? c.lista_precio.nombre : 'No asignada'}</span>
                     </span>
                     <span className="text-xs font-semibold text-gray-600">
                       Vend: {c.vendedor ? `${c.vendedor.nombre} ${c.vendedor.apellido}` : 'Sin Vendedor'}
                     </span>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                   <div className="flex flex-col space-y-0.5 max-w-xs">
                     <span className="text-sm text-gray-800 font-semibold flex items-center">
                        <Phone className="w-3 h-3 mr-1 text-gray-400" /> {c.telefono_contacto || c.telefono || 'Sin Tel.'}
                     </span>
                     {c.nombre_contacto && (
                       <span className="text-xs text-gray-500 italic flex items-center">Attn: {c.nombre_contacto}</span>
                     )}
                     {(c.provincia || c.localidad) && (
                       <span className="text-xs text-gray-500 flex items-center mt-1 truncate">
                         <MapPin className="w-3 h-3 mr-1 text-emerald-500" /> {c.localidad}, {c.provincia}
                       </span>
                     )}
                     {c.zona && (
                       <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded mt-1 w-fit">
                         Zona: {c.zona.nombre}
                       </span>
                     )}
                   </div>
                </td>

                <td className="px-6 py-4 text-center">
                  {c.activo ? (
                    <span className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 rounded font-bold shadow-sm text-xs">Activo</span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded font-bold shadow-sm text-xs">Inactivo</span>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                  <button onClick={() => openEditModal(c)} className="text-indigo-600 bg-indigo-50 p-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Editar Expediente">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Destruir Registro">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredClientes.length === 0 && (
                <tr>
                   <td colSpan="5" className="px-6 py-10 text-center text-gray-400 font-semibold italic">
                     {clientes.length === 0 ? 'No existen clientes registrados en la base operativa.' : 'No se encontraron clientes que coincidan con tu búsqueda.'}
                   </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md overflow-y-auto w-full h-full">
          {/* Tamaño Extendido para las dos columnas */}
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4 flex flex-col max-h-[95vh]">
            <div className="px-8 py-5 border-b bg-gray-50/50 flex justify-between items-center rounded-t-2xl sticky top-0 z-10">
              <h3 className="text-2xl font-black text-gray-900 flex items-center">
                <Building2 className="w-7 h-7 mr-3 text-indigo-600" />
                {modalMode === 'create' ? 'Nuevo Cliente' : 'Edición de Cliente'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-600 bg-white shadow-sm border p-1 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 relative">
                {formError && (
                  <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold border border-red-200 flex items-center">
                    <XCircle className="w-5 h-5 mr-2" /> {formError}
                  </div>
                )}
                
                <form id="cliente-form" onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Columna 1: Datos Fiscales y Comerciales */}
                  <div className="space-y-6">
                     <div className="pb-2 border-b-2 border-indigo-100 flex items-center">
                        <Hash className="w-5 h-5 mr-1.5 text-indigo-500" />
                        <h4 className="text-lg font-bold text-gray-800 tracking-tight">Datos Fiscales</h4>
                     </div>
                     
                     <div>
                       <label className="block text-sm font-extrabold text-gray-700 mb-1">Empresa / Razón Social / Nombre Completo *</label>
                       <input type="text" required value={formData.razon_social} onChange={e => setFormData({...formData, razon_social: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 font-medium bg-gray-50 focus:bg-white" placeholder="Ej. Acero S.A. o Juan Pérez" />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Documento *</label>
                          <select required value={formData.tipo_doc_id} onChange={e => setFormData({...formData, tipo_doc_id: parseInt(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                             <option value="" disabled>Seleccionar...</option>
                             {tiposDoc.map(td => <option key={td.id} value={td.id}>{td.nombre} ({td.abreviatura})</option>)}
                          </select>
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-gray-700 mb-1">Nº Documento *</label>
                           <input type="text" required value={formData.documento} onChange={e => setFormData({...formData, documento: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-bold tracking-wider text-indigo-700 text-center outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej. 20301234561" />
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Responsabilidad IVA (ARCA) *</label>
                        <select required value={formData.tipo_resp_id} onChange={e => setFormData({...formData, tipo_resp_id: parseInt(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-bold bg-indigo-50/50 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800">
                           <option value="" disabled>Requerido por AFIP...</option>
                           {tiposResp.map(tr => <option key={tr.id} value={tr.id}>{tr.nombre} [ARCA: {tr.codigo_arca}]</option>)}
                        </select>
                     </div>

                     <div className="pt-4 pb-2 border-b-2 border-emerald-100 flex items-center mt-6">
                        <UserCheck className="w-5 h-5 mr-1.5 text-emerald-500" />
                        <h4 className="text-lg font-bold text-gray-800 tracking-tight">Parámetros Operativos</h4>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Lista de Precios Preasignada</label>
                          <select value={formData.lista_precio_id} onChange={e => setFormData({...formData, lista_precio_id: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-gray-300 outline-none focus:ring-2 bg-emerald-50/30 font-medium text-sm">
                             <option value="">A Precio Público P/Defecto</option>
                             {listasPrecios.map(lp => <option key={lp.id} value={lp.id}>{lp.nombre} (+ {lp.porcentaje_ganancia}%)</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Vendedor</label>
                          <select value={formData.vendedor_id} onChange={e => setFormData({...formData, vendedor_id: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-gray-300 outline-none focus:ring-2 text-sm bg-emerald-50/30 font-medium">
                             <option value="">Ninguno</option>
                             {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre} {v.apellido} ({v.porcentaje_comision}%)</option>)}
                          </select>
                        </div>
                     </div>
                  </div>

                  {/* Columna 2: Contacto Humano y Envíos */}
                  <div className="space-y-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                     <div className="pb-2 border-b-2 border-gray-200 flex items-center">
                        <MapPin className="w-5 h-5 mr-1.5 text-gray-500" />
                        <h4 className="text-lg font-bold text-gray-800 tracking-tight">Contacto y Ubicación</h4>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Teléfono</label>
                         <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full px-3 py-2 rounded-lg border outline-none focus:border-indigo-500 shadow-sm" placeholder="Opcional" />
                       </div>
                       <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                         <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 rounded-lg border outline-none focus:border-indigo-500 shadow-sm" placeholder="Opcional" />
                       </div>
                     </div>

                     <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <label className="block text-sm font-extrabold text-indigo-900 border-b pb-1">Contacto</label>
                        <div className="grid grid-cols-2 gap-4 pt-1">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Nombre</label>
                            <input type="text" value={formData.nombre_contacto} onChange={e => setFormData({...formData, nombre_contacto: e.target.value})} className="w-full px-3 py-2 rounded-lg border outline-none focus:border-indigo-500" placeholder="Ej. Ing. Carlos, Compras" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Teléfono Celular</label>
                            <input type="text" value={formData.telefono_contacto} onChange={e => setFormData({...formData, telefono_contacto: e.target.value})} className="w-full px-3 py-2 rounded-lg border outline-none focus:border-indigo-500" placeholder="Ej. WhatsApp" />
                          </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Provincia (API Georef)</label>
                          <select value={formData.provincia} onChange={e => setFormData({...formData, provincia: e.target.value, localidad: ''})} className="w-full px-3 py-2.5 rounded-lg border focus:ring-2 outline-none font-medium shadow-sm">
                            <option value="">Seleccionar...</option>
                            {provincias.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Localidad/Municipio</label>
                          <select disabled={!formData.provincia} value={formData.localidad} onChange={e => setFormData({...formData, localidad: e.target.value})} className="w-full px-3 py-2.5 rounded-lg border focus:ring-2 outline-none font-medium shadow-sm disabled:bg-gray-100 disabled:text-gray-400">
                            <option value="">{formData.provincia ? 'Elegir Ciudad...' : 'Requiere Provincia'}</option>
                            {localidades.map(m => <option key={m.nombre} value={m.nombre}>{m.nombre}</option>)}
                          </select>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Dirección</label>
                         <input type="text" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="w-full px-3 py-2.5 rounded-lg border outline-none shadow-sm focus:border-indigo-500 font-medium" placeholder="Calle, Nº, Puerta..." />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Zona de Entrega</label>
                          <select value={formData.zona_id} onChange={e => setFormData({...formData, zona_id: parseInt(e.target.value) || ''})} className="w-full px-3 py-2.5 rounded-lg border outline-none shadow-sm focus:border-indigo-500 font-medium bg-white">
                             <option value="">No Asignada</option>
                             {zonas.filter(z => z.activa).map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                          </select>
                       </div>
                     </div>

                     <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Observaciones</label>
                       <textarea rows="2" value={formData.observaciones} onChange={e => setFormData({...formData, observaciones: e.target.value})} className="w-full px-3 py-2 rounded-lg border outline-none shadow-sm resize-none focus:ring-2" placeholder="Ej. No despachar los días lluviosos..."></textarea>
                     </div>
                     
                     <div className="flex items-center pt-2">
                        <input type="checkbox" id="isActivo" checked={formData.activo} onChange={e => setFormData({...formData, activo: e.target.checked})} className="w-5 h-5 text-emerald-600 rounded cursor-pointer" />
                        <label htmlFor="isActivo" className="ml-2 block text-sm font-black text-emerald-800 cursor-pointer bg-emerald-100 px-3 py-1 rounded">
                          Cliente Activo
                        </label>
                     </div>
                  </div>
                </form>
            </div>

            <div className="px-8 py-5 border-t bg-gray-50 flex justify-end space-x-4 rounded-b-2xl sticky bottom-0 z-10 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-700 bg-white hover:bg-gray-100 rounded-xl font-bold transition-all border shadow-sm">
                  Cancelar
                </button>
                <button type="submit" form="cliente-form" className="px-8 py-2.5 flex items-center text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-black shadow-md transition-all">
                  <Save className="w-5 h-5 mr-2" /> {modalMode === 'create' ? 'Guardar' : 'Guardar'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
