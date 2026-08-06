import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { Truck, Plus, Trash2, X, Save, Search, Package, Printer, ClipboardCheck, Filter, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import ProductSearchModal from '../components/ProductSearchModal';
import SupplierSearchModal from '../components/SupplierSearchModal';

export default function RemitosCompra() {
  const { api } = useAuth();
  const [remitos, setRemitos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRemitos, setLoadingRemitos] = useState(true);

  // Catálogos
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);

  // Filtros y paginación del listado
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState(null);
  const [isFilterSupplierModalOpen, setIsFilterSupplierModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Estados Modal Crear
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados para Búsqueda Avanzada
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  
  const [activeRowId, setActiveRowId] = useState(null);
  const quantityRefs = useRef({});
  const productRefs = useRef({});
  const savedObsRef = useRef({});

  // Estado del Formulario Maestro
  const [head, setHead] = useState({
    proveedor_id: '',
    numero_remito: '',
    afecta_stock: true,
    observaciones: '',
    total: 0
  });

  // Estado de los Renglones (Detalle)
  const [detalles, setDetalles] = useState([
    { temp_id: Date.now(), producto_id: '', cantidad: 1, precio_unitario: 0, subtotal: 0, nro_lote: '', fecha_vencimiento: '' }
  ]);

  const fetchCatalogos = async () => {
    try {
      const [resProv, resProd] = await Promise.all([
        api.get('/api/proveedores'),
        api.get('/api/productos')
      ]);
      setProveedores(resProv.data);
      setProductos(resProd.data.filter(p => p.activo));
    } catch (error) {
      console.error("Error al traer datos:", error);
    }
    setLoading(false);
  };

  const fetchRemitos = async () => {
    setLoadingRemitos(true);
    try {
      const params = { skip: (page - 1) * pageSize, limit: pageSize };
      if (filtroFechaDesde) params.fecha_desde = filtroFechaDesde;
      if (filtroFechaHasta) params.fecha_hasta = filtroFechaHasta;
      if (filtroProveedor) params.proveedor_id = filtroProveedor.id;

      const res = await api.get('/api/remitos-compra', { params });
      setRemitos(res.data.items);
      setTotal(res.data.total);
      savedObsRef.current = Object.fromEntries(res.data.items.map(r => [r.id, r.observaciones || '']));
    } catch (error) {
      console.error("Error al traer remitos:", error);
    }
    setLoadingRemitos(false);
  };

  const handleObservacionesChange = (id, value) => {
    setRemitos(remitos.map(r => r.id === id ? { ...r, observaciones: value } : r));
  };

  const handleObservacionesBlur = async (remito) => {
    const value = remito.observaciones || '';
    if (value === (savedObsRef.current[remito.id] || '')) return;
    try {
      await api.patch(`/api/remitos-compra/${remito.id}/observaciones`, { observaciones: value });
      savedObsRef.current[remito.id] = value;
    } catch (error) {
      console.error("Error al guardar observaciones:", error);
      alert("No se pudo guardar la observación.");
      setRemitos(remitos.map(r => r.id === remito.id ? { ...r, observaciones: savedObsRef.current[remito.id] || '' } : r));
    }
  };

  useEffect(() => {
    fetchCatalogos();
  }, [api]);

  useEffect(() => {
    fetchRemitos();
  }, [api, page, filtroFechaDesde, filtroFechaHasta, filtroProveedor, refreshKey]);

  const limpiarFiltros = () => {
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroProveedor(null);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const getPageNumbers = () => {
    const pages = [];
    const delta = 2;
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - delta && p <= page + delta)) {
        pages.push(p);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  // Atajo F2 para el buscador de proveedor del filtro (fuera del modal de creación)
  useEffect(() => {
    const handleFilterKeyDown = (e) => {
      if (isModalOpen) return;
      if (e.key === 'F2' && document.activeElement.id === 'input-proveedor-filtro') {
        e.preventDefault();
        setIsFilterSupplierModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleFilterKeyDown);
    return () => window.removeEventListener('keydown', handleFilterKeyDown);
  }, [isModalOpen]);

  // Atajos de teclado
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (!isModalOpen) return;
      if (isSupplierModalOpen || isProductModalOpen) return;

      if (e.key === 'Insert') {
        e.preventDefault();
        addDetalle();
      }

      if (e.key === 'F2') {
        e.preventDefault();
        if (document.activeElement.id === 'input-proveedor') {
          setIsSupplierModalOpen(true);
        } else {
          setIsProductModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isModalOpen, isSupplierModalOpen, isProductModalOpen, detalles]);

  const openModal = () => {
    setHead({
      proveedor_id: '',
      numero_remito: '',
      afecta_stock: true,
      observaciones: '',
      total: 0
    });
    setDetalles([{ temp_id: Date.now(), producto_id: '', cantidad: 1, precio_unitario: 0, subtotal: 0, nro_lote: '', fecha_vencimiento: '' }]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const addDetalle = () => {
    const newId = Date.now();
    setDetalles([...detalles, { temp_id: newId, producto_id: '', cantidad: 1, precio_unitario: 0, subtotal: 0, nro_lote: '', fecha_vencimiento: '' }]);
    setTimeout(() => {
       setActiveRowId(newId);
       productRefs.current[newId]?.focus();
    }, 100);
  };

  const removeDetalle = (temp_id) => {
    setDetalles(detalles.filter(d => d.temp_id !== temp_id));
  };

  const updateDetalle = (temp_id, field, value) => {
    setDetalles(detalles.map(d => {
      if (d.temp_id === temp_id) {
        const newData = { ...d, [field]: value };
        
        if (field === 'producto_id') {
           const prod = typeof value === 'object' ? value : productos.find(p => p.id === parseInt(value));
           if (prod) {
              newData.producto_id = prod.id;
              newData.precio_unitario = prod.costo_neto || 0;
              newData.subtotal = newData.cantidad * newData.precio_unitario;

              if (!newData.fecha_vencimiento) {
                 const dateObj = new Date();
                 dateObj.setFullYear(dateObj.getFullYear() + 1);
                 const yyyy = dateObj.getFullYear();
                 const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                 const dd = String(dateObj.getDate()).padStart(2, '0');
                 newData.fecha_vencimiento = `${yyyy}-${mm}-${dd}`;
                 newData.nro_lote = `${yyyy}${mm}${dd}-001`;
              }

              // Foco automático a la cantidad, seleccionada, al elegir producto
              setTimeout(() => {
                 quantityRefs.current[temp_id]?.focus();
                 quantityRefs.current[temp_id]?.select();
              }, 100);
           }
        }

        if (field === 'fecha_vencimiento') {
           if (value) {
              const dateObj = new Date(value);
              if (!isNaN(dateObj.getTime())) {
                const yyyy = dateObj.getFullYear();
                const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                const dd = String(dateObj.getDate()).padStart(2, '0');
                // Sugerencia de lote automático FECHA-001
                newData.nro_lote = `${yyyy}${mm}${dd}-001`;
              }
           }
        }

        if (field === 'cantidad' || field === 'precio_unitario') {
           newData.subtotal = newData.cantidad * newData.precio_unitario;
        }

        return newData;
      }
      return d;
    }));
  };

  const calculateTotal = () => {
    return detalles.reduce((acc, d) => acc + (d.cantidad * d.precio_unitario), 0);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!head.proveedor_id || !head.numero_remito) {
      setErrorMsg("Debes seleccionar Proveedor e ingresar el Número de Remito.");
      return;
    }
    const cleanDetalles = detalles.filter(d => d.producto_id);
    if (cleanDetalles.length === 0) {
      setErrorMsg("Debes añadir al menos un producto.");
      return;
    }

    setIsSaving(true);
    try {
      const totalDoc = calculateTotal();
      const payload = {
        proveedor_id: head.proveedor_id,
        numero_remito: head.numero_remito,
        afecta_stock: head.afecta_stock,
        observaciones: head.observaciones,
        total: totalDoc,
        detalles: cleanDetalles.map(d => ({
           producto_id: parseInt(d.producto_id),
           cantidad: d.cantidad,
           precio_unitario: d.precio_unitario,
           subtotal: d.cantidad * d.precio_unitario,
           nro_lote: d.nro_lote || null,
           fecha_vencimiento: d.fecha_vencimiento || null
        }))
      };

      await api.post('/api/remitos-compra', payload);
      setIsModalOpen(false);
      setPage(1);
      setRefreshKey(k => k + 1);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Error al guardar remito de compra");
    }
    setIsSaving(false);
  };

  const handlePrint = async (remito_id) => {
    try {
      const response = await api.get(`/api/remitos-compra/${remito_id}/pdf`, { responseType: 'blob' });
      const fileURL = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));

      const pdfWindow = window.open("", "_blank");
      if (pdfWindow) {
         pdfWindow.document.write(`
            <html>
              <head>
                <title>Visor PDF - Remito de Compra</title>
                <style>body { margin: 0; padding: 0; overflow: hidden; background-color: #525659; }</style>
              </head>
              <body>
                <iframe src="${fileURL}" width="100%" height="100%" style="border:none;"></iframe>
              </body>
            </html>
         `);
         pdfWindow.document.close();
      } else {
         alert("Por favor, permite las ventanas emergentes para ver el PDF.");
      }
    } catch (err) {
      alert("No se pudo generar el PDF del remito de compra.");
    }
  };

  if (loading) return <div className="p-8 text-center font-bold text-gray-500">Cargando...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden pb-12">
      <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-blue-600 p-2 rounded-lg text-white mr-4 shadow-md">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Remitos de Compra</h2>
            <p className="text-xs text-blue-600 font-bold tracking-wide uppercase mt-1">Ingreso de Mercadería</p>
          </div>
        </div>
        <button onClick={openModal} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md flex items-center transition-all">
          <Plus className="w-5 h-5 mr-2" /> Nuevo Remito Compra
        </button>
      </div>

      <div className="px-8 py-4 border-b border-gray-100 bg-gray-50/40 flex flex-wrap items-end gap-4">
        <div className="flex items-center text-gray-400 mr-1 mb-2.5">
          <Filter className="w-4 h-4" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            className="p-2 rounded-lg border border-gray-300 text-sm font-medium"
            value={filtroFechaDesde}
            onChange={e => { setFiltroFechaDesde(e.target.value); setPage(1); }}
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            className="p-2 rounded-lg border border-gray-300 text-sm font-medium"
            value={filtroFechaHasta}
            onChange={e => { setFiltroFechaHasta(e.target.value); setPage(1); }}
          />
        </div>
        <div className="min-w-[220px]">
          <label className="block text-[11px] font-bold text-gray-500 mb-1">Proveedor <span className="text-blue-500">(F2)</span></label>
          <div className="relative">
            <input
              id="input-proveedor-filtro"
              type="text"
              readOnly
              className="w-full p-2 pr-8 rounded-lg border border-gray-300 text-sm font-bold bg-white cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none"
              value={filtroProveedor?.razon_social || ''}
              placeholder="Todos los proveedores..."
              onClick={() => setIsFilterSupplierModalOpen(true)}
            />
            {filtroProveedor ? (
              <button
                type="button"
                onClick={() => { setFiltroProveedor(null); setPage(1); }}
                className="absolute right-2 top-2.5 text-gray-400 hover:text-red-500"
                title="Quitar filtro de proveedor"
              >
                <XCircle className="w-4 h-4" />
              </button>
            ) : (
              <Search className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            )}
          </div>
        </div>
        {(filtroFechaDesde || filtroFechaHasta || filtroProveedor) && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="text-xs font-bold text-gray-500 hover:text-red-600 px-3 py-2.5"
          >
            Limpiar filtros
          </button>
        )}
        <div className="ml-auto text-xs font-bold text-gray-400 pb-2.5">
          {total} remito{total === 1 ? '' : 's'} encontrado{total === 1 ? '' : 's'}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 font-bold text-xs tracking-wider uppercase border-b border-gray-200">
              <th className="px-8 py-4">Nº Remito (Prov.)</th>
              <th className="px-8 py-4">Fecha</th>
              <th className="px-8 py-4">Proveedor</th>
              <th className="px-8 py-4">Stock</th>
              <th className="px-8 py-4">Observaciones</th>
              <th className="px-8 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loadingRemitos && (
              <tr><td colSpan="6" className="text-center p-8 font-bold text-gray-400">Cargando...</td></tr>
            )}
            {!loadingRemitos && remitos.map((r) => (
              <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="font-mono font-bold text-gray-800 text-sm">
                    {r.numero_remito}
                  </span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                  {new Date(r.fecha).toLocaleDateString()}
                </td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="text-sm font-black text-gray-700">{r.proveedor?.razon_social}</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap">
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.afecta_stock ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {r.afecta_stock ? 'INGRESADO' : 'SOLO DOC.'}
                   </span>
                </td>
                <td className="px-8 py-4">
                  <input
                    type="text"
                    className="w-full min-w-[220px] p-1.5 rounded border border-transparent hover:border-gray-300 focus:border-blue-500 outline-none text-sm font-medium text-gray-700 bg-transparent focus:bg-white"
                    placeholder="Sin observaciones"
                    value={r.observaciones || ''}
                    onChange={e => handleObservacionesChange(r.id, e.target.value)}
                    onBlur={() => handleObservacionesBlur(r)}
                  />
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center">
                   <button
                     onClick={() => handlePrint(r.id)}
                     className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                     title="Imprimir Remito de Compra"
                   >
                      <Printer className="w-5 h-5" />
                   </button>
                </td>
              </tr>
            ))}
            {!loadingRemitos && remitos.length === 0 && (
              <tr><td colSpan="6" className="text-center p-8 font-bold text-gray-400">No hay remitos de compra que coincidan con los filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-8 py-4 flex items-center justify-between border-t border-gray-100">
          <span className="text-xs font-bold text-gray-400">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {getPageNumbers().map((p, idx) => p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm font-bold">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-bold transition-colors ${p === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============== MODAL CREACION ============== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] mt-4 mb-4 transform transition-all border-t-8 border-blue-600">
            
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 rounded-t-xl">
              <h3 className="text-xl font-black text-gray-800 flex items-center">
                <Truck className="w-6 h-6 mr-3 text-blue-600" />
                Cargar Remito de Compra
              </h3>
              <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 font-bold border border-red-200">
                  ⚠️ {errorMsg}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="md:col-span-2">
                   <label className="block text-xs font-bold text-gray-500 mb-1">Proveedor * <span className="text-[10px] text-blue-500">(F2 p/ buscar)</span></label>
                   <div className="relative">
                     <input 
                       id="input-proveedor"
                       type="text" 
                       readOnly 
                       className="w-full p-2.5 rounded-lg border border-gray-300 font-bold bg-white cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none"
                       value={proveedores.find(p => p.id === head.proveedor_id)?.razon_social || ''}
                       placeholder="F2 para buscar proveedor..."
                       onClick={() => setIsSupplierModalOpen(true)}
                     />
                     <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                   </div>
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">Nº Remito (Proveedor) *</label>
                   <input 
                     type="text"
                     className="w-full p-2.5 rounded-lg border border-gray-300 font-bold focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                     placeholder="X-0000-00000000"
                     value={head.numero_remito}
                     onChange={e => setHead({...head, numero_remito: e.target.value})}
                   />
                </div>
                <div className="flex items-center pt-5 pl-4">
                   <label className="flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
                        checked={head.afecta_stock}
                        onChange={e => setHead({...head, afecta_stock: e.target.checked})}
                      />
                      <span className="ml-3 text-sm font-bold text-gray-700 flex items-center">
                         <Package className="w-4 h-4 mr-1 text-blue-500" /> Procesar Stock
                      </span>
                   </label>
                </div>
              </div>

              {/* Renglones */}
              <div className="mb-2 flex justify-between items-end">
                 <h4 className="font-black text-gray-700 text-sm uppercase tracking-wide">Artículos Recibidos</h4>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-inner">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-100/50 text-slate-800 text-xs font-black uppercase">
                     <tr>
                       <th className="p-3 w-1/3 border-b">Producto</th>
                       <th className="p-3 border-b text-center w-24">Cantidad</th>
                       <th className="p-3 border-b text-center w-20">Unidad</th>
                       <th className="p-3 border-b text-center w-40">Vencimiento</th>
                       <th className="p-3 border-b text-center w-40">Lote Interno</th>
                       <th className="p-3 border-b text-right">Costo Unit.</th>
                       <th className="p-3 border-b text-right bg-slate-100">Subtotal</th>
                       <th className="p-3 border-b text-center w-12"></th>
                     </tr>
                   </thead>
                   <tbody>
                     {detalles.map((d) => (
                       <tr key={d.temp_id} className="border-b border-gray-100">
                          <td className="p-2">
                             <div className="relative">
                               <input 
                                 ref={el => productRefs.current[d.temp_id] = el}
                                 type="text"
                                 readOnly
                                 className="w-full p-1.5 rounded border border-gray-300 text-sm font-bold bg-white cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none"
                                 value={productos.find(p => p.id === d.producto_id)?.nombre || ''}
                                 placeholder="F2 p/ buscar..."
                                 onClick={() => {
                                   setActiveRowId(d.temp_id);
                                   setIsProductModalOpen(true);
                                 }}
                                 onFocus={() => setActiveRowId(d.temp_id)}
                               />
                               <Search className="absolute right-2 top-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                             </div>
                          </td>
                            <td className="p-2">
                              <input 
                                ref={el => quantityRefs.current[d.temp_id] = el}
                                type="number" 
                                min="0.01" 
                                step="0.01" 
                                className="w-full p-1.5 rounded border border-gray-300 text-center font-bold text-sm" 
                                value={d.cantidad} 
                                onChange={e => updateDetalle(d.temp_id, 'cantidad', parseFloat(e.target.value)||0)} 
                              />
                            </td>
                            <td className="p-2 text-center text-xs font-bold text-gray-500">
                              {productos.find(p => p.id === d.producto_id)?.unidad || '—'}
                            </td>
                            <td className="p-2">
                              <input
                                id={`venc-${d.temp_id}`}
                                type="date" 
                                className="w-full p-1.5 rounded border border-gray-300 text-center font-bold text-xs" 
                                value={d.fecha_vencimiento} 
                                onChange={e => updateDetalle(d.temp_id, 'fecha_vencimiento', e.target.value)} 
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="text" 
                                className="w-full p-1.5 rounded border border-gray-200 bg-gray-50 text-gray-600 text-center font-mono font-bold text-xs" 
                                placeholder="Auto..."
                                value={d.nro_lote} 
                                onChange={e => updateDetalle(d.temp_id, 'nro_lote', e.target.value)} 
                              />
                            </td>
                          <td className="p-2">
                             <div className="flex items-center">
                               <span className="text-gray-400 mr-1">$</span>
                               <input type="number" step="0.01" className="w-full p-1.5 rounded border border-gray-300 text-right font-bold text-sm" value={d.precio_unitario} onChange={e => updateDetalle(d.temp_id, 'precio_unitario', parseFloat(e.target.value)||0)} />
                             </div>
                          </td>
                          <td className="p-2 bg-slate-50 text-right font-black text-sm text-slate-700">
                             $ {(d.cantidad * d.precio_unitario).toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </td>
                          <td className="p-2 text-center">
                             <button type="button" onClick={()=>removeDetalle(d.temp_id)} className="text-gray-400 hover:text-red-500">
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                   <label className="block text-xs font-bold text-gray-500 mb-1">Observaciones / Notas Internas</label>
                   <textarea rows="4" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 text-sm font-medium" value={head.observaciones} onChange={e=>setHead({...head, observaciones: e.target.value})}></textarea>
                </div>
                <div className="w-full lg:w-1/3 bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm">
                   <div className="pt-3 flex justify-between items-center">
                      <span className="text-xl font-black text-gray-800">Total Remito</span>
                      <span className="text-2xl font-black text-blue-600">$ {calculateTotal().toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                   </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center gap-3 rounded-b-xl">
               <button type="button" onClick={addDetalle} className="text-xs bg-slate-800 text-white px-3 py-2.5 rounded-xl flex items-center shadow-sm hover:bg-slate-700 font-bold">
                 <Plus className="w-4 h-4 mr-1" /> Añadir Renglón
               </button>
               <div className="flex items-center gap-3">
                 <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-700 bg-white border shadow-sm rounded-xl font-bold hover:bg-gray-100">
                   Cancelar
                 </button>
                 <button type="submit" disabled={isSaving} onClick={handleSave} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black shadow-lg hover:bg-blue-700 flex items-center">
                   {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> : <Save className="w-5 h-5 mr-2" />}
                   Guardar Remito
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Modales Auxiliares */}
      <SupplierSearchModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        proveedores={proveedores}
        onSelect={(prov) => {
          setHead({ ...head, proveedor_id: prov.id });
          setIsSupplierModalOpen(false);
        }}
      />

      <SupplierSearchModal
        isOpen={isFilterSupplierModalOpen}
        onClose={() => setIsFilterSupplierModalOpen(false)}
        proveedores={proveedores}
        onSelect={(prov) => {
          setFiltroProveedor(prov);
          setPage(1);
          setIsFilterSupplierModalOpen(false);
        }}
      />

      <ProductSearchModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productos={productos}
        onSelect={(producto) => {
          updateDetalle(activeRowId, 'producto_id', producto);
          setIsProductModalOpen(false);
        }}
      />
    </div>
  );
}
