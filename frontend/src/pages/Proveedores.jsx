import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Truck, Edit, Trash2, Plus, CheckCircle2, XCircle, Search, Save, X, Building2, MapPin, Phone, Hash, Banknote, Mail } from 'lucide-react';

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const { api } = useAuth();
  
  // Catálogos Backend (AFIP)
  const [tiposDoc, setTiposDoc] = useState([]);
  const [tiposResp, setTiposResp] = useState([]);

  // Catálogos API Pública Georef (Gobierno AR)
  const [provincias, setProvincias] = useState([]);
  const [localidades, setLocalidades] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  
  // Base State for Proveedor Form
  const getEmptyForm = () => ({
    id: null, razon_social: '', nombre_fantasia: '', tipo_doc_id: tiposDoc[0]?.id || '', documento: '',
    tipo_resp_id: tiposResp[0]?.id || '',
    provincia: '', localidad: '', direccion: '', codigo_postal: '',
    telefono: '', email: '',
    contacto_nombre: '', contacto_telefono: '', contacto_email: '',
    cbu_alias: '', condicion_pago_defecto: '', observaciones: '', activo: true
  });

  const [formData, setFormData] = useState(getEmptyForm());
  const [formError, setFormError] = useState('');

  // 1. Carga Inicial
  const fetchAllData = async () => {
    try {
      const [provRes, tDocRes, tRespRes, georefRes] = await Promise.all([
        api.get('/api/proveedores'),
        api.get('/api/tipos-doc'),
        api.get('/api/tipos-resp'),
        axios.get('https://apis.datos.gob.ar/georef/api/provincias?campos=nombre&max=100')
      ]);

      setProveedores(provRes.data);
      setTiposDoc(tDocRes.data);
      setTiposResp(tRespRes.data);
      
      const sortedProv = georefRes.data.provincias.sort((a,b) => a.nombre.localeCompare(b.nombre));
      setProvincias(sortedProv);
      
    } catch (error) {
      console.error('Error cargando Proveedores/ARCA:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [api]);

  // 2. Georef Efecto - Localidades
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

  const openCreateModal = () => {
    setModalMode('create');
    setFormData(getEmptyForm());
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (proveedor) => {
    setModalMode('edit');
    const safeData = { ...proveedor };
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
      const payload = { ...formData };
      delete payload.id;
      
      if (modalMode === 'create') {
        await api.post('/api/proveedores', payload);
      } else {
        await api.put(`/api/proveedores/${formData.id}`, payload);
      }
      setIsModalOpen(false);
      
      const provRes = await api.get('/api/proveedores');
      setProveedores(provRes.data);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error validando con la base de datos');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar definitivamente este Proveedor? Alternativamente puedes marcarlo como inactivo.")) {
      try {
        await api.delete(`/api/proveedores/${id}`);
        const res = await api.get('/api/proveedores');
        setProveedores(res.data);
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al eliminar. Probablemente existan compras asociadas a él.');
      }
    }
  };

  if (loading) return (
     <div className="flex flex-col justify-center items-center h-64 text-slate-800">
       <span className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mb-4"></span>
       <p className="font-semibold animate-pulse">Sincronizando Módulo y API Georef AR...</p>
     </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden relative">
      <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-slate-700 p-2 rounded-lg text-white mr-4 shadow-md border border-slate-600">
            <Truck className="w-6 h-6" />
          </div>
          <div>
             <h2 className="text-2xl font-black text-white tracking-tight">Proveedores</h2>
             <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-0.5">Gestión de Compras</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="px-4 py-1.5 bg-slate-700 text-slate-200 border border-slate-600 rounded-full text-sm font-semibold shadow-sm">
            {proveedores.length} Empresas
          </span>
          <button onClick={openCreateModal} className="flex items-center bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
            <Plus className="w-5 h-5 mr-1" /> Registrar Proveedor
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 text-slate-500 font-semibold text-sm tracking-wider uppercase border-b border-slate-100">
              <th className="px-6 py-4">Razón Social y Fisca</th>
              <th className="px-6 py-4">Soporte/Contacto</th>
              <th className="px-6 py-4">Finanzas</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60">
            {proveedores.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors duration-200">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-800 tracking-tight flex items-center">
                       {p.razon_social} {p.nombre_fantasia && <span className="text-xs font-normal text-slate-400 italic ml-2">({p.nombre_fantasia})</span>}
                    </span>
                    <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700 w-fit">
                      {p.tipo_doc?.abreviatura}: {p.documento}
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5 font-medium">{p.tipo_resp?.nombre}</span>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                   <div className="flex flex-col space-y-0.5 max-w-xs">
                     <span className="text-sm text-slate-700 font-semibold flex items-center">
                        <Phone className="w-3 h-3 mr-1 text-slate-400" /> {p.telefono || p.contacto_telefono || 'Sin Tel.'}
                     </span>
                     {p.contacto_nombre && (
                       <span className="text-xs text-slate-500 italic flex items-center mt-0.5">Rep: {p.contacto_nombre}</span>
                     )}
                     {(p.provincia || p.localidad) && (
                       <span className="text-xs text-slate-500 flex items-center mt-1 truncate">
                         <MapPin className="w-3 h-3 mr-1 text-red-400" /> {p.localidad}, {p.provincia}
                       </span>
                     )}
                   </div>
                </td>

                <td className="px-6 py-4">
                  <div className="flex flex-col space-y-1">
                     <span className="text-xs font-medium text-slate-600 flex items-center">
                       <Banknote className="w-3 h-3 mr-1.5 text-emerald-600" /> Cond.: <span className="font-bold text-slate-800 ml-1">{p.condicion_pago_defecto || 'N/A'}</span>
                     </span>
                     {p.cbu_alias && (
                     <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.5 rounded border border-slate-200 w-fit">
                       {p.cbu_alias}
                     </span>
                     )}
                  </div>
                </td>

                <td className="px-6 py-4 text-center">
                  {p.activo ? (
                    <span className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 rounded font-bold shadow-sm text-xs border border-emerald-200">Activo</span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded font-bold shadow-sm text-xs border border-red-200">Inactivo</span>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                  <button onClick={() => openEditModal(p)} className="text-slate-600 bg-slate-100 p-2 rounded-lg hover:bg-slate-800 hover:text-white transition-all shadow-sm border border-slate-200" title="Editar Proveedor">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100" title="Eliminar Proveedor">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {proveedores.length === 0 && (
                <tr>
                   <td colSpan="5" className="px-6 py-10 text-center text-slate-400 font-semibold italic">No existen proveedores cargados en sistema.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto w-full h-full">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4 flex flex-col max-h-[95vh]">
            <div className="px-8 py-5 border-b bg-slate-50 flex justify-between items-center rounded-t-2xl sticky top-0 z-10">
              <h3 className="text-2xl font-black text-slate-800 flex items-center">
                <Building2 className="w-7 h-7 mr-3 text-slate-700" />
                {modalMode === 'create' ? 'Nuevo Proveedor' : 'Ficha de Proveedor'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-600 bg-white shadow-sm border p-1 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 relative">
                {formError && (
                  <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold border border-red-200 flex items-center">
                    <XCircle className="w-5 h-5 mr-2" /> {formError}
                  </div>
                )}
                
                <form id="proveedor-form" onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Columna 1: Legal y Financiera */}
                  <div className="space-y-6">
                     <div className="pb-2 border-b-2 border-slate-200 flex items-center">
                        <Hash className="w-5 h-5 mr-1.5 text-slate-500" />
                        <h4 className="text-lg font-bold text-slate-800 tracking-tight">Datos Legales AFIP</h4>
                     </div>
                     
                     <div>
                       <label className="block text-sm font-extrabold text-slate-700 mb-1">Razón Social *</label>
                       <input type="text" required value={formData.razon_social} onChange={e => setFormData({...formData, razon_social: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-500 outline-none text-slate-800 font-medium bg-slate-50 focus:bg-white" placeholder="Ej. Mayorista SA" />
                     </div>
                     
                     <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nombre de Fantasía</label>
                       <input type="text" value={formData.nombre_fantasia} onChange={e => setFormData({...formData, nombre_fantasia: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-700 shadow-sm" placeholder="Ej. Supermercado El Faro" />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Doc. *</label>
                          <select required value={formData.tipo_doc_id} onChange={e => setFormData({...formData, tipo_doc_id: parseInt(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-medium focus:ring-2 focus:ring-slate-500 outline-none">
                             <option value="" disabled>Elegir...</option>
                             {tiposDoc.map(td => <option key={td.id} value={td.id}>{td.nombre}</option>)}
                          </select>
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1">Número *</label>
                           <input type="text" required value={formData.documento} onChange={e => setFormData({...formData, documento: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold tracking-wider text-slate-700 text-center outline-none focus:ring-2 focus:ring-slate-500" placeholder="Ej. 30-12345678-9" />
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Responsabilidad IVA *</label>
                        <select required value={formData.tipo_resp_id} onChange={e => setFormData({...formData, tipo_resp_id: parseInt(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-slate-500 text-slate-800">
                           <option value="" disabled>Requerido...</option>
                           {tiposResp.map(tr => <option key={tr.id} value={tr.id}>{tr.nombre} [ARCA: {tr.codigo_arca}]</option>)}
                        </select>
                     </div>

                     <div className="pt-4 pb-2 border-b-2 border-emerald-100 flex items-center mt-6">
                        <Banknote className="w-5 h-5 mr-1.5 text-emerald-600" />
                        <h4 className="text-lg font-bold text-slate-800 tracking-tight">Formatos de Pago</h4>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wilder mb-1">CBU / CVU / Alias</label>
                           <input type="text" value={formData.cbu_alias} onChange={e => setFormData({...formData, cbu_alias: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none font-mono text-sm shadow-sm focus:border-emerald-500" placeholder="Ej. ARROYOS.CAMAS.SOL" />
                        </div>
                        <div className="col-span-2">
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wilder mb-1">Condición Acordada de Pago</label>
                           <input type="text" value={formData.condicion_pago_defecto} onChange={e => setFormData({...formData, condicion_pago_defecto: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none shadow-sm focus:border-emerald-500 font-medium" placeholder="Ej. Cheque a 30 Días" />
                        </div>
                     </div>
                  </div>

                  {/* Columna 2: Logística y Personal */}
                  <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                     <div className="pb-2 border-b-2 border-slate-200 flex items-center">
                        <MapPin className="w-5 h-5 mr-1.5 text-slate-600" />
                        <h4 className="text-lg font-bold text-slate-800 tracking-tight">Geografía y Sede</h4>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tel. Central</label>
                          <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full px-3 py-2.5 rounded-lg border outline-none focus:border-slate-500 shadow-sm" placeholder="Mesa Central" />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Provincia</label>
                          <select value={formData.provincia} onChange={e => setFormData({...formData, provincia: e.target.value, localidad: ''})} className="w-full px-3 py-2.5 rounded-lg border focus:ring-2 outline-none font-medium shadow-sm">
                            <option value="">Seleccionar...</option>
                            {provincias.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Localidad</label>
                          <select disabled={!formData.provincia} value={formData.localidad} onChange={e => setFormData({...formData, localidad: e.target.value})} className="w-full px-3 py-2.5 rounded-lg border focus:ring-2 outline-none font-medium shadow-sm disabled:bg-slate-200 disabled:text-slate-400">
                            <option value="">{formData.provincia ? 'Ciudad...' : 'Sin Provincia'}</option>
                            {localidades.map(m => <option key={m.nombre} value={m.nombre}>{m.nombre}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dirección Exacta</label>
                          <input type="text" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="w-full px-3 py-2.5 rounded-lg border outline-none shadow-sm focus:border-slate-500 font-medium" />
                        </div>
                     </div>

                     <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <label className="block text-sm font-extrabold text-slate-700 border-b pb-1">Ejecutivo / Rep. de Venta</label>
                        <div className="grid grid-cols-2 gap-4 pt-1">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Nombre</label>
                            <input type="text" value={formData.contacto_nombre} onChange={e => setFormData({...formData, contacto_nombre: e.target.value})} className="w-full px-3 py-2 rounded-lg border outline-none focus:border-slate-500" placeholder="Juan, Ventas" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Celular / Wsp</label>
                            <input type="text" value={formData.contacto_telefono} onChange={e => setFormData({...formData, contacto_telefono: e.target.value})} className="w-full px-3 py-2 rounded-lg border outline-none focus:border-slate-500" placeholder="Nº Directo" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Email Corto</label>
                            <input type="email" value={formData.contacto_email} onChange={e => setFormData({...formData, contacto_email: e.target.value})} className="w-full px-3 py-2 rounded-lg border outline-none focus:border-slate-500" placeholder="@empresa..." />
                          </div>
                        </div>
                     </div>

                     <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notas u Objeciones</label>
                       <textarea rows="2" value={formData.observaciones} onChange={e => setFormData({...formData, observaciones: e.target.value})} className="w-full px-3 py-2 rounded-lg border outline-none shadow-sm resize-none focus:ring-2 focus:ring-slate-300"></textarea>
                     </div>
                     
                     <div className="flex items-center pt-2">
                        <input type="checkbox" id="provActivo" checked={formData.activo} onChange={e => setFormData({...formData, activo: e.target.checked})} className="w-5 h-5 text-emerald-600 rounded cursor-pointer" />
                        <label htmlFor="provActivo" className="ml-2 block text-sm font-black text-emerald-800 cursor-pointer bg-emerald-100 px-3 py-1 rounded">
                          Proveedor En Servicio
                        </label>
                     </div>
                  </div>
                </form>
            </div>

            <div className="px-8 py-5 border-t bg-slate-100 flex justify-end space-x-4 rounded-b-2xl sticky bottom-0 z-10 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-slate-700 bg-white hover:bg-slate-200 rounded-xl font-bold transition-all border shadow-sm">
                  Cerrar
                </button>
                <button type="submit" form="proveedor-form" className="px-8 py-2.5 flex items-center text-white bg-slate-800 hover:bg-slate-900 rounded-xl font-black shadow-md transition-all">
                  <Save className="w-5 h-5 mr-2" /> Guardar Ficha
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
