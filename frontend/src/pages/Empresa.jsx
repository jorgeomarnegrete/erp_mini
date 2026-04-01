import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { Building2, Save, MapPin, Receipt, UploadCloud, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function Empresa() {
  const [formData, setFormData] = useState({
    id: 1,
    razon_social: '',
    nombre_fantasia: '',
    cuit: '',
    ingresos_brutos: '',
    fecha_inicio_actividades: '',
    tipo_resp_id: '',
    domicilio_comercial: '',
    provincia: '',
    localidad: '',
    telefono: '',
    email: '',
    sitio_web: '',
    logo_base64: ''
  });

  const [tiposResp, setTiposResp] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const fileInputRef = useRef(null);
  const { api } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, respRes] = await Promise.all([
          api.get('/api/empresa'),
          api.get('/api/tipos-resp')
        ]);
        
        setTiposResp(respRes.data);
        
        // Adapt Data (Convert nulls to empty strings to avoid React control warnings)
        const d = empRes.data;
        setFormData({
            id: d.id,
            razon_social: d.razon_social || '',
            nombre_fantasia: d.nombre_fantasia || '',
            cuit: d.cuit || '',
            ingresos_brutos: d.ingresos_brutos || '',
            fecha_inicio_actividades: d.fecha_inicio_actividades || '',
            tipo_resp_id: d.tipo_resp_id || (respRes.data[0]?.id || ''),
            domicilio_comercial: d.domicilio_comercial || '',
            provincia: d.provincia || '',
            localidad: d.localidad || '',
            telefono: d.telefono || '',
            email: d.email || '',
            sitio_web: d.sitio_web || '',
            logo_base64: d.logo_base64 || ''
        });
      } catch (err) {
        setMessage({ text: 'Error al cargar los datos del servidor.', type: 'error' });
      }
      setLoading(false);
    };
    fetchData();
  }, [api]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      const payload = { ...formData };
      
      // Clean up empty strings that should be null
      if (payload.fecha_inicio_actividades === '') payload.fecha_inicio_actividades = null;
      
      await api.put('/api/empresa', payload);
      setMessage({ text: 'Identidad fiscal actualizada correctamente.', type: 'success' });
      
      // Borrar mensaje de éxito después de 4s
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
      
    } catch (err) {
      setMessage({ text: err.response?.data?.detail || 'Error al guardar.', type: 'error' });
    }
    setSaving(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validación tamaño ~1.5MB
    if (file.size > 1500000) {
        setMessage({ text: 'El logo es muy pesado. Sube una imagen menor a 1.5 MB', type: 'error' });
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, logo_base64: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
     setFormData({ ...formData, logo_base64: '' });
     if(fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-indigo-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="font-semibold animate-pulse">Obteniendo Legajo Corporativo...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex items-center">
          <div className="bg-blue-600 p-2.5 rounded-lg text-white mr-4 shadow-md">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Mi Empresa</h2>
            <p className="text-sm text-blue-600 font-bold tracking-wide mt-1">Configuración y Perfil Fiscal</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-8">
          
          {/* Mensajes de feedback */}
          {message.text && (
            <div className={`p-4 rounded-xl flex items-center font-bold shadow-sm ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
               {message.type === 'error' ? <ShieldAlert className="w-5 h-5 mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
               {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* COLUMNA 1 & 2: Identidad Comercial y Contacto */}
             <div className="lg:col-span-2 space-y-8">
                
                {/* BLOQUE FISCAL */}
                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                   <div className="flex items-center mb-5 pb-3 border-b border-gray-200">
                      <Receipt className="w-5 h-5 text-gray-500 mr-2" />
                      <h3 className="text-lg font-black text-gray-800">Identidad Tributaria</h3>
                   </div>
                   <div className="grid grid-cols-2 gap-5">
                      <div className="col-span-2">
                        <label className="block text-sm font-extrabold text-gray-700 mb-1">Razón Social *</label>
                        <input type="text" required value={formData.razon_social} onChange={e => setFormData({...formData, razon_social: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-900 bg-white" placeholder="Ej. MI EMPRESA S.R.L." />
                      </div>
                      
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-extrabold text-gray-700 mb-1">Nombre de Fantasía</label>
                        <input type="text" value={formData.nombre_fantasia} onChange={e => setFormData({...formData, nombre_fantasia: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-medium bg-white" placeholder="Ej. El SuperMarket" />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-extrabold text-gray-700 mb-1">Condición Fiscal (IVA) *</label>
                        <select required value={formData.tipo_resp_id} onChange={e => setFormData({...formData, tipo_resp_id: parseInt(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-800 bg-blue-50/30">
                           {tiposResp.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-extrabold text-gray-700 mb-1">CUIT *</label>
                        <input type="text" required value={formData.cuit} onChange={e => setFormData({...formData, cuit: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-mono font-bold tracking-widest text-gray-800 bg-white" placeholder="XX-XXXXXXXX-X" />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-extrabold text-gray-700 mb-1">Ingresos Brutos</label>
                        <input type="text" value={formData.ingresos_brutos} onChange={e => setFormData({...formData, ingresos_brutos: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-mono font-medium text-gray-800 bg-white" placeholder="Nro Inscripción" />
                      </div>
                      
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-extrabold text-gray-700 mb-1">Inicio de Actividades</label>
                        <input type="date" value={formData.fecha_inicio_actividades} onChange={e => setFormData({...formData, fecha_inicio_actividades: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-medium text-gray-800 bg-white" />
                      </div>
                   </div>
                </div>

                {/* BLOQUE LOCACIÓN Y CONTACTO */}
                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                   <div className="flex items-center mb-5 pb-3 border-b border-gray-200">
                      <MapPin className="w-5 h-5 text-gray-500 mr-2" />
                      <h3 className="text-lg font-black text-gray-800">Ubicación y Contacto</h3>
                   </div>
                   <div className="grid grid-cols-2 gap-5">
                      <div className="col-span-2">
                        <label className="block text-sm font-extrabold text-gray-700 mb-1">Domicilio Comercial *</label>
                        <input type="text" required value={formData.domicilio_comercial} onChange={e => setFormData({...formData, domicilio_comercial: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-medium bg-white" placeholder="Ej. Av. Siempre Viva 742" />
                      </div>
                      
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-extrabold text-gray-700 mb-1">Provincia</label>
                        <input type="text" value={formData.provincia} onChange={e => setFormData({...formData, provincia: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-medium bg-white" placeholder="Buenos Aires" />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-extrabold text-gray-700 mb-1">Localidad</label>
                        <input type="text" value={formData.localidad} onChange={e => setFormData({...formData, localidad: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-medium bg-white" placeholder="Ciudad Autónoma" />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-extrabold text-gray-700 mb-1">Teléfono Público</label>
                        <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-medium bg-white" placeholder="011-4000-0000" />
                      </div>
                      
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-extrabold text-gray-700 mb-1">Email Presupuestos</label>
                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-medium bg-white" placeholder="ventas@minegocio.com" />
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-sm font-extrabold text-gray-700 mb-1">Sitio Web</label>
                        <input type="text" value={formData.sitio_web} onChange={e => setFormData({...formData, sitio_web: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-medium bg-white" placeholder="www.minegocio.com" />
                      </div>
                   </div>
                </div>

             </div>

             {/* COLUMNA 3: Logotipo */}
             <div className="lg:col-span-1">
                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col">
                   <div className="flex items-center mb-5 pb-3 border-b border-gray-200">
                      <UploadCloud className="w-5 h-5 text-gray-500 mr-2" />
                      <h3 className="text-lg font-black text-gray-800">Isologotipo</h3>
                   </div>
                   
                   <p className="text-xs text-gray-500 font-medium mb-6">Este logo se inyectará en la cabecera de las cotizaciones y facturas en formato PDF guardadas.</p>

                   <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl bg-white relative overflow-hidden group hover:border-blue-400 transition-colors p-4 min-h-[200px]">
                      {formData.logo_base64 ? (
                         <>
                           <img src={formData.logo_base64} alt="Logo" className="max-w-full max-h-48 object-contain" />
                           <button type="button" onClick={removeLogo} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-transform hover:scale-110">
                              <X className="w-4 h-4" />
                           </button>
                         </>
                      ) : (
                         <div className="text-center text-gray-400">
                            <UploadCloud className="w-12 h-12 mx-auto mb-2 opacity-50 text-blue-400 group-hover:text-blue-500 transition-colors" />
                            <span className="block text-sm font-bold">Haz clic para buscar</span>
                            <span className="block text-xs mt-1">PNG o JPG (Max 1.5MB)</span>
                         </div>
                      )}
                      {/* Input Invisible */}
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/webp" 
                        onChange={handleImageUpload} 
                        ref={fileInputRef}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title={formData.logo_base64 ? "Haz clic para reemplazar logo" : "Sube tu logo corporativo"}
                      />
                   </div>
                </div>
             </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200 mt-8">
             <button type="submit" disabled={saving} className={`px-8 py-3.5 flex items-center text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-black shadow-lg shadow-blue-200 transition-all active:scale-95 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}>
               {saving ? (
                 <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
               ) : (
                 <Save className="w-5 h-5 mr-3" />
               )}
               {saving ? 'Guardando Perfil...' : 'Guardar Identidad Fiscal'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
