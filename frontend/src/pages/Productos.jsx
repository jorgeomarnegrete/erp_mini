import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Package, Edit, Trash2, Plus, X, Search, Tags, Calculator, PercentCircle } from 'lucide-react';

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { api } = useAuth();
  
  // Catálogos para listboxes
  const [categorias, setCategorias] = useState([]);
  const [tasasIva, setTasasIva] = useState([]);
  const [listasPrecios, setListasPrecios] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  
  const [formData, setFormData] = useState({
    id: null, codigo_interno: '', codigo_barras: '', nombre: '', descripcion: '',
    categoria_id: '', tasa_iva_id: '', costo_neto: 0, stock_actual: 0, stock_minimo: 0, unidad: 'Unidades', activo: true,
    precios_costum: [] // Array vivo de precios excepcionales { lista_precio_id, precio_personalizado }
  });
  
  const [formError, setFormError] = useState('');

  const fetchAllData = async () => {
    try {
      const [prodRes, catRes, ivaRes, lpRes] = await Promise.all([
        api.get('/api/productos'),
        api.get('/api/categorias'),
        api.get('/api/tasas-iva'),
        api.get('/api/listas-precios')
      ]);
      setProductos(prodRes.data);
      setCategorias(catRes.data);
      setTasasIva(ivaRes.data);
      setListasPrecios(lpRes.data);
    } catch (err) {
      console.error('Error montando inventario:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [api]);

  const getEmptyForm = () => ({
    id: null, codigo_interno: '', codigo_barras: '', nombre: '', descripcion: '',
    categoria_id: categorias[0]?.id || '', tasa_iva_id: tasasIva.find(t=>t.valor===21)?.id || tasasIva[0]?.id || '',
    costo_neto: 0, stock_actual: 0, stock_minimo: 0, unidad: 'Unidades', activo: true, precios_costum: []
  });

  const openCreateModal = () => {
    setModalMode('create');
    setFormData(getEmptyForm());
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (prod) => {
    setModalMode('edit');
    // Adaptar las relaciones complejas del objeto a plana para el Form
    setFormData({
      id: prod.id,
      codigo_interno: prod.codigo_interno,
      codigo_barras: prod.codigo_barras || '',
      nombre: prod.nombre,
      descripcion: prod.descripcion || '',
      categoria_id: prod.categoria_id,
      tasa_iva_id: prod.tasa_iva_id,
      costo_neto: prod.costo_neto,
      stock_actual: prod.stock_actual,
      stock_minimo: prod.stock_minimo || 0,
      unidad: prod.unidad || 'Unidades',
      activo: prod.activo,
      precios_costum: prod.precios_personalizados.map(p => ({
         lista_precio_id: p.lista_precio_id,
         precio_personalizado: p.precio_personalizado
      }))
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Motor Frontend para Calculos e Híbridos
  const handleCustomPriceChange = (listaId, valorStr) => {
    const valor = parseFloat(valorStr);
    const existingPrices = [...formData.precios_costum];
    const idx = existingPrices.findIndex(p => p.lista_precio_id === listaId);
    
    // Si la casilla queda en blando/NaN, borramos la reescritura para que quede automático
    if (isNaN(valorStr) || valorStr === '') {
       if (idx > -1) existingPrices.splice(idx, 1);
    } else {
       if (idx > -1) {
          existingPrices[idx].precio_personalizado = valor;
       } else {
          existingPrices.push({ lista_precio_id: listaId, precio_personalizado: valor });
       }
    }
    setFormData({...formData, precios_costum: existingPrices});
  };

  const getCustomPrice = (listaId) => {
     const custom = formData.precios_costum.find(p => p.lista_precio_id === listaId);
     return custom ? custom.precio_personalizado : '';
  };

  // Traer IVA de la DB a tiempo real
  const currentIvaValue = tasasIva.find(t => t.id === parseInt(formData.tasa_iva_id))?.valor || 0;

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const payload = { ...formData };
      delete payload.id;
      if (payload.codigo_barras === '') payload.codigo_barras = null;
      if (payload.descripcion === '') payload.descripcion = null;

      if (modalMode === 'create') {
        await api.post('/api/productos', payload);
      } else {
        await api.put(`/api/productos/${formData.id}`, payload);
      }
      setIsModalOpen(false);
      fetchAllData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error fiscal de estructura al guardar producto.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que desea eliminar este producto?")) {
      try {
        await api.delete(`/api/productos/${id}`);
        fetchAllData();
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al eliminar el producto.');
      }
    }
  };

  if (loading) return (
     <div className="flex flex-col justify-center items-center h-64 text-indigo-600">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
       <p className="font-semibold animate-pulse">Cargando productos...</p>
     </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative flex flex-col h-full">
      <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-indigo-600 p-2 rounded-lg text-white mr-4 shadow-md">
            <Package className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Productos</h2>
        </div>
        <div className="flex items-center space-x-4">
          <span className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold shadow-sm border border-indigo-200">
            {productos.length} SKUs Enlistados
          </span>
          <button onClick={openCreateModal} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-md">
            <Plus className="w-5 h-5 mr-1" /> Nuevo Producto  
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 font-bold text-xs tracking-wider uppercase border-b border-gray-200">
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Costo</th>
              <th className="px-6 py-4">Lista</th>
              <th className="px-6 py-4 text-center">Stock</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/60">
            {productos.map((prod) => (
              <tr key={prod.id} className="hover:bg-indigo-50/40 transition-colors duration-200">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-gray-900 tracking-tight">{prod.nombre}</span>
                    <div className="flex space-x-2 items-center mt-1.5">
                       <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-700 font-mono tracking-widest">{prod.codigo_interno}</span>
                       <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">{prod.categoria.nombre}</span>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex flex-col space-y-1">
                     <span className="text-lg font-black text-emerald-700 tracking-tight">${prod.costo_neto.toFixed(2)}</span>
                     <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1 rounded w-fit">+ {prod.tasa_iva.valor}% IVA</span>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                    {/* Resumen Comercial de Listas */}
                    <div className="flex flex-col space-y-1">
                        {listasPrecios.slice(0, 2).map(lista => {
                           const override = prod.precios_personalizados.find(p => p.lista_precio_id === lista.id)?.precio_personalizado;
                           return (
                             <div key={lista.id} className="flex items-center text-xs">
                                <span className="font-bold text-gray-600 mr-2 w-16 truncate">{lista.nombre}:</span>
                                {override ? (
                                   <span className="text-purple-600 font-black px-1.5 bg-purple-50 border border-purple-200 rounded text-[10px]">Override: ${override}</span>
                                ) : (
                                   <span className="text-gray-500 font-semibold tracking-wide">${(prod.costo_neto * (1 + lista.porcentaje_ganancia / 100)).toFixed(2)}</span>
                                )}
                             </div>
                           )
                        })}
                        {listasPrecios.length > 2 && <span className="text-[10px] text-gray-400 font-bold italic">+{listasPrecios.length - 2} Listas...</span>}
                    </div>
                </td>

                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-lg font-mono font-black border 
                    ${prod.stock_actual <= 0 ? 'border-red-400 text-red-600 bg-red-50' : 
                      prod.stock_actual <= prod.stock_minimo ? 'border-orange-400 text-orange-600 bg-orange-50' : 
                      'border-gray-200'}`}>
                    {prod.stock_actual.toFixed(2)} {prod.unidad}
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                  <button onClick={() => openEditModal(prod)} className="text-indigo-600 bg-indigo-50 p-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Editar">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDelete(prod.id)} className="text-gray-400 bg-gray-50 hover:bg-red-500 hover:text-white p-2 rounded-lg transition-all shadow-sm" title="Eliminar">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {productos.length === 0 && (
                <tr>
                   <td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-semibold text-lg italic">No hay productos registrados.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center p-4 bg-gray-900/60 backdrop-blur-md overflow-y-auto w-full h-full pb-20 pt-10">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl flex flex-col m-auto h-auto min-h-min border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center rounded-t-3xl sticky top-0 z-10">
              <h3 className="text-2xl font-black text-gray-900 flex items-center">
                <Package className="w-7 h-7 mr-3 text-indigo-600" />
                {modalMode === 'create' ? 'Nuevo Producto' : 'Editar Producto'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 bg-white shadow-sm border p-2 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 pb-10 overflow-x-hidden overflow-y-auto w-full custom-scrollbar flex-1">
                {formError && (
                  <div className="mb-6 bg-red-50 text-red-600 px-5 py-4 rounded-xl text-sm font-bold border border-red-200 flex items-center shadow-inner">
                    <X className="w-5 h-5 mr-3 flex-shrink-0" /> {formError}
                  </div>
                )}
                
                <form id="producto-form" onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  
                  {/* COLUMNA 1: Datos Físicos y Costos Básicos */}
                  <div className="space-y-6">
                     <div className="pb-3 border-b-2 border-gray-100 flex items-center">
                        <Tags className="w-5 h-5 mr-2 text-gray-400" />
                        <h4 className="text-xl font-bold text-gray-800 tracking-tight">Datos Básicos</h4>
                     </div>
                     
                     <div>
                       <label className="block text-sm font-extrabold text-gray-700 mb-1">Nombre *</label>
                       <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none text-gray-900 font-bold bg-gray-50 focus:bg-white transition-all" placeholder="Ej. Alfajor Triple Negro" />
                     </div>

                     <div className="grid grid-cols-2 gap-5">
                        <div className="w-full">
                           <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">SKU Interno *</label>
                           <input type="text" required value={formData.codigo_interno} onChange={e => setFormData({...formData, codigo_interno: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-mono font-bold tracking-widest text-indigo-800 text-center outline-none focus:ring-2 focus:ring-indigo-500 uppercase placeholder-gray-300" placeholder="ALF-TR" />
                        </div>
                        <div className="w-full">
                           <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Cód. Barras (Pistola)</label>
                           <input type="text" value={formData.codigo_barras} onChange={e => setFormData({...formData, codigo_barras: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-mono tracking-wider text-center outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej. 7793420..." />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-5">
                        <div className="w-full">
                          <label className="block text-sm font-bold text-gray-700 mb-1">Familia / Rubro *</label>
                          <select required value={formData.categoria_id} onChange={e => setFormData({...formData, categoria_id: parseInt(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-indigo-50/50 cursor-pointer">
                             {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                          </select>
                        </div>
                        <div className="w-full">
                          <label className="block text-sm font-bold text-gray-700 mb-1">Regimen IVA (AFIP) *</label>
                          <select required value={formData.tasa_iva_id} onChange={e => setFormData({...formData, tasa_iva_id: parseInt(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-800 font-bold focus:ring-2 focus:ring-amber-400 outline-none bg-amber-50/30 cursor-pointer">
                             {tasasIva.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                          </select>
                        </div>
                     </div>

                     <div className="p-5 bg-emerald-50 rounded-2xl border-2 border-emerald-100 flex flex-col space-y-4">
                        <label className="block text-base font-black text-emerald-900 tracking-tight">Costo Neto *</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-emerald-600">$</span>
                            <input type="number" step="0.01" min="0" required value={formData.costo_neto} onChange={e => setFormData({...formData, costo_neto: parseFloat(e.target.value) || 0})} className="w-full pl-10 pr-4 py-4 rounded-xl border-2 border-emerald-300 focus:border-emerald-600 outline-none font-black text-3xl text-emerald-800 bg-white" />
                        </div>
                        <p className="text-xs font-semibold text-emerald-700 leading-snug">Precio de costo sin IVA. Se usará como base para el cálculo de márgenes.</p>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
                        <div className="w-full">
                           <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Stock / Cantidad</label>
                           <input type="number" step="0.01" value={formData.stock_actual} onChange={e => setFormData({...formData, stock_actual: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-black text-xl text-center outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800" />
                        </div>
                        <div className="w-full">
                           <label className="block text-xs font-black text-emerald-600 uppercase tracking-wider mb-1" title="Punto de Reorden">Stock Mínimo</label>
                           <input type="number" step="0.01" value={formData.stock_minimo} onChange={e => setFormData({...formData, stock_minimo: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 font-bold text-lg text-center outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-800 bg-emerald-50" />
                        </div>
                        <div className="w-full">
                           <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">U.M. (Medida)</label>
                           <select value={formData.unidad} onChange={e => setFormData({...formData, unidad: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-800 text-center outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 cursor-pointer">
                              <option value="Unidades">Unidades (U)</option>
                              <option value="Kg">Kilogramos (Kg)</option>
                              <option value="Gr">Gramos (Gr)</option>
                              <option value="Lts">Litros (Lts)</option>
                              <option value="Ml">Mililitros (Ml)</option>
                              <option value="Mts">Metros (Mts)</option>
                              <option value="Cajas">Cajas / Pack</option>
                           </select>
                        </div>
                     </div>
                  </div>

                  {/* COLUMNA 2: Configuración de Precios */}
                  <div className="space-y-6 flex flex-col border p-6 rounded-2xl bg-gray-50/50">
                     <div className="pb-3 border-b-2 border-purple-200 flex flex-col justify-start">
                        <div className="flex items-center w-full">
                           <Calculator className="w-5 h-5 mr-2 text-purple-600" />
                           <h4 className="text-xl font-bold text-gray-900 tracking-tight">Precios de Venta</h4>
                        </div>
                        <p className="text-xs font-medium text-gray-500 mt-2 leading-relaxed">Deje la columna "Precio Personalizado" vacía para aplicar el margen automático de la lista de precios.</p>
                     </div>

                     <div className="overflow-x-auto overflow-y-auto w-full custom-scrollbar max-h-96 pr-2 rounded-xl bg-white border shadow-sm flex flex-col items-center">
                        <table className="w-full text-left border-collapse table-auto">
                           <thead className="bg-gray-100/80 sticky top-0 hidden md:table-header-group">
                              <tr>
                                 <th className="px-3 py-3 text-xs font-black text-gray-600 uppercase tracking-wider w-1/4">Lista de Precios</th>
                                 <th className="px-3 py-3 text-xs font-black text-gray-600 uppercase tracking-wider text-center w-1/4" title="Margen configurado en la lista">Margen (%)</th>
                                 <th className="px-3 py-3 text-xs font-black text-purple-700 uppercase tracking-wider text-right bg-purple-50 w-1/3">Precio Calculado</th>
                                 <th className="px-3 py-3 text-xs font-black text-rose-700 uppercase tracking-wider text-right bg-rose-50 w-1/3 cursor-help border-l-2 border-rose-200" title="Precio Neto sin IVA.">Precio Personalizado</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100 flex-1 w-full">
                              {listasPrecios.map(lista => {
                                  const baseAutoRule = formData.costo_neto * (1 + lista.porcentaje_ganancia / 100);
                                  const valOverride = getCustomPrice(lista.id);
                                  const effectiveNeto = valOverride !== '' ? parseFloat(valOverride) : baseAutoRule;
                                  const ivaSuma = effectiveNeto * (currentIvaValue / 100);
                                  const finalSaleGross = effectiveNeto + ivaSuma;
                                  
                                  return (
                                    <tr key={lista.id} className="hover:bg-gray-50 flex flex-col md:table-row py-3 md:py-0 border-b md:border-b-0 w-full mb-2">
                                        <td className="px-3 md:py-3 w-full block md:table-cell">
                                            <span className="font-bold text-sm text-gray-800">{lista.nombre}</span>
                                        </td>
                                        <td className="px-3 md:py-3 w-full text-center block md:table-cell text-sm font-semibold text-gray-400">
                                            + {lista.porcentaje_ganancia}%
                                        </td>
                                        
                                        <td className="px-3 md:py-3 w-full text-right bg-purple-50/30 block md:table-cell">
                                            <span className={`text-base font-black font-mono ${valOverride !== '' ? 'line-through text-gray-300' : 'text-purple-700'}`}>
                                               ${baseAutoRule.toFixed(2)}
                                            </span>
                                        </td>

                                        <td className="px-3 md:py-3 w-full text-right bg-rose-50/50 block md:table-cell border-l-2 border-rose-100 align-middle">
                                            <div className="flex flex-col items-end w-full">
                                               <div className="flex items-center w-full justify-end max-w-full">
                                                  <span className="text-rose-500 font-black mr-1.5">$</span>
                                                  <input 
                                                     type="text" 
                                                     value={valOverride} 
                                                     onChange={(e) => handleCustomPriceChange(lista.id, e.target.value)} 
                                                     className="w-28 xl:w-32 px-2 py-1.5 rounded-lg border-2 border-rose-200 focus:border-rose-600 focus:ring-2 focus:ring-rose-200 outline-none text-right font-black text-rose-900 bg-white placeholder-rose-200 min-w-0" 
                                                     placeholder="Opcional" 
                                                  />
                                               </div>
                                               {/* Calculadora en gris oscuro (Mostrador Final) */}
                                               <span className="text-[10px] font-black tracking-widest text-emerald-800 mt-1 min-w-max bg-emerald-100 px-1 py-0.5 rounded ml-auto flex self-end">
                                                  Público: ${(finalSaleGross || 0).toFixed(2)} c/IVA
                                               </span>
                                            </div>
                                        </td>
                                    </tr>
                                  );
                              })}
                           </tbody>
                        </table>
                     </div>

                  </div>
                </form>
            </div>

            <div className="px-8 py-5 border-t bg-gray-50 flex justify-end space-x-4 rounded-b-3xl mt-auto z-10 sticky bottom-0 border-t border-gray-100 shadow-[0_-15px_20px_-5px_rgba(0,0,0,0.03)] w-full">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-gray-700 bg-white hover:bg-gray-100 rounded-xl font-bold transition-all border shadow-sm">
                  Cancelar
                </button>
                <button type="submit" form="producto-form" className="px-8 py-3 flex items-center text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-black shadow-lg transition-transform active:scale-95">
                  <Package className="w-5 h-5 mr-2" /> {modalMode === 'create' ? 'Guardar Producto' : 'Actualizar Producto'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
