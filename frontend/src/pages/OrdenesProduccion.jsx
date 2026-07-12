import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { Factory, Plus, Trash2, X, Save, Search, CheckCircle, Ban, ArrowDownCircle, ArrowUpCircle, Printer } from 'lucide-react';
import ProductSearchModal from '../components/ProductSearchModal';

const nuevoInsumo = () => ({ temp_id: Date.now() + Math.random(), producto_id: '', cantidad: 1, nro_lote: '', disponible: null, error_stock: false });
const nuevoProducto = () => ({ temp_id: Date.now() + Math.random(), producto_id: '', cantidad: 1, nro_lote_generado: '', fecha_vencimiento: '' });

export default function OrdenesProduccion() {
  const { api } = useAuth();
  const [ordenes, setOrdenes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [head, setHead] = useState({ observaciones: '' });
  const [insumos, setInsumos] = useState([nuevoInsumo()]);
  const [subproductos, setSubproductos] = useState([nuevoProducto()]);

  // Búsqueda de producto (F2)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [activeGrid, setActiveGrid] = useState('insumo'); // 'insumo' | 'producto'
  const [activeRowId, setActiveRowId] = useState(null);

  // Modal cierre
  const [isCerrarOpen, setIsCerrarOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [cerrarError, setCerrarError] = useState('');
  const [ordenCierre, setOrdenCierre] = useState(null);
  const [cInsumos, setCInsumos] = useState([]);
  const [cProductos, setCProductos] = useState([]);

  const prodById = (id) => productos.find((p) => p.id === id);

  const fetchData = async () => {
    try {
      const [resOp, resProd] = await Promise.all([
        api.get('/api/ordenes-produccion'),
        api.get('/api/productos'),
      ]);
      setOrdenes(resOp.data);
      setProductos(resProd.data.filter((p) => p.activo));
    } catch (e) {
      console.error('Fallo al traer datos:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [api]);

  // Atajos: INS agrega renglón a la grilla activa, F2 abre búsqueda
  useEffect(() => {
    const onKey = (e) => {
      if (!isModalOpen || isProductModalOpen) return;
      if (e.key === 'Insert') {
        e.preventDefault();
        activeGrid === 'producto' ? addSubproducto() : addInsumo();
      }
      if (e.key === 'F2') {
        e.preventDefault();
        if (activeRowId) setIsProductModalOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isModalOpen, isProductModalOpen, activeGrid, activeRowId]);

  // ---------- Creación ----------
  const openModal = () => {
    setHead({ observaciones: '' });
    setInsumos([nuevoInsumo()]);
    setSubproductos([nuevoProducto()]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const addInsumo = () => setInsumos((prev) => [...prev, nuevoInsumo()]);
  const addSubproducto = () => setSubproductos((prev) => [...prev, nuevoProducto()]);
  const removeInsumo = (id) => setInsumos((prev) => prev.filter((d) => d.temp_id !== id));
  const removeSubproducto = (id) => setSubproductos((prev) => prev.filter((d) => d.temp_id !== id));

  const checkStock = async (producto_id, temp_id) => {
    try {
      const res = await api.get(`/api/productos/${producto_id}/stock-disponible`);
      const { disponible } = res.data;
      setInsumos((prev) => prev.map((d) => d.temp_id === temp_id
        ? { ...d, disponible, error_stock: d.cantidad > disponible } : d));
    } catch (e) { console.error('Error validando stock:', e); }
  };

  const updateInsumo = (temp_id, field, value) => {
    setInsumos((prev) => prev.map((d) => {
      if (d.temp_id !== temp_id) return d;
      const nd = { ...d, [field]: value };
      if (field === 'producto_id') {
        const prod = typeof value === 'object' ? value : prodById(parseInt(value));
        if (prod) { nd.producto_id = prod.id; nd.nro_lote = ''; checkStock(prod.id, temp_id); }
        else { nd.producto_id = ''; nd.disponible = null; nd.error_stock = false; }
      }
      if (field === 'cantidad' && nd.disponible !== null) nd.error_stock = nd.cantidad > nd.disponible;
      return nd;
    }));
  };

  const updateSubproducto = (temp_id, field, value) => {
    setSubproductos((prev) => prev.map((d) => {
      if (d.temp_id !== temp_id) return d;
      const nd = { ...d, [field]: value };
      if (field === 'producto_id') {
        const prod = typeof value === 'object' ? value : prodById(parseInt(value));
        nd.producto_id = prod ? prod.id : '';
      }
      return nd;
    }));
  };

  const hasStockErrors = insumos.some((d) => d.error_stock);

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanIns = insumos.filter((d) => d.producto_id && d.cantidad > 0);
    const cleanSub = subproductos.filter((d) => d.producto_id && d.cantidad > 0);
    if (cleanIns.length === 0) { setErrorMsg('Agregá al menos un insumo (materia prima).'); return; }
    if (cleanSub.length === 0) { setErrorMsg('Agregá al menos un subproducto a generar.'); return; }
    if (hasStockErrors) { setErrorMsg('Hay insumos que superan el stock disponible.'); return; }

    setIsSaving(true);
    try {
      const payload = {
        observaciones: head.observaciones || null,
        insumos: cleanIns.map((d) => ({
          producto_id: parseInt(d.producto_id),
          cantidad_planificada: d.cantidad,
          nro_lote: d.nro_lote || null,
        })),
        productos: cleanSub.map((d) => ({
          producto_id: parseInt(d.producto_id),
          cantidad_planificada: d.cantidad,
          nro_lote_generado: d.nro_lote_generado || null,
          fecha_vencimiento: d.fecha_vencimiento ? new Date(d.fecha_vencimiento).toISOString() : null,
        })),
      };
      await api.post('/api/ordenes-produccion', payload);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al crear la orden.');
    }
    setIsSaving(false);
  };

  // ---------- Cierre ----------
  const openCerrar = (orden) => {
    setOrdenCierre(orden);
    setCerrarError('');
    setCInsumos(orden.insumos.map((i) => ({
      id: i.id, producto_id: i.producto_id, nombre: i.producto?.nombre,
      cantidad_real: i.cantidad_planificada, nro_lote: i.nro_lote || '',
      lotes: i.producto?.lotes || [],
    })));
    setCProductos(orden.productos.map((p) => ({
      id: p.id, producto_id: p.producto_id, nombre: p.producto?.nombre,
      cantidad_real: p.cantidad_planificada, nro_lote_generado: p.nro_lote_generado || '',
      fecha_vencimiento: p.fecha_vencimiento ? p.fecha_vencimiento.substring(0, 10) : '',
    })));
    setIsCerrarOpen(true);
  };

  const handleCerrar = async () => {
    setCerrarError('');
    if (cInsumos.some((i) => !(i.cantidad_real > 0)) || cProductos.some((p) => !(p.cantidad_real > 0))) {
      setCerrarError('Todas las cantidades reales deben ser mayores a 0.');
      return;
    }
    setIsClosing(true);
    try {
      const payload = {
        insumos: cInsumos.map((i) => ({ id: i.id, cantidad_real: i.cantidad_real, nro_lote: i.nro_lote || null })),
        productos: cProductos.map((p) => ({
          id: p.id, cantidad_real: p.cantidad_real,
          nro_lote_generado: p.nro_lote_generado || null,
          fecha_vencimiento: p.fecha_vencimiento ? new Date(p.fecha_vencimiento).toISOString() : null,
        })),
      };
      await api.post(`/api/ordenes-produccion/${ordenCierre.id}/cerrar`, payload);
      setIsCerrarOpen(false);
      fetchData();
    } catch (err) {
      setCerrarError(err.response?.data?.detail || 'Error al cerrar la orden.');
    }
    setIsClosing(false);
  };

  const handleCancelar = async (orden) => {
    if (!window.confirm(`¿Cancelar la OP Nº ${orden.numero}? Se liberará el stock comprometido.`)) return;
    try {
      await api.post(`/api/ordenes-produccion/${orden.id}/cancelar`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al cancelar.');
    }
  };

  const handlePrint = async (orden_id) => {
    try {
      const response = await api.get(`/api/ordenes-produccion/${orden_id}/pdf`, { responseType: 'blob' });
      const fileURL = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(fileURL, '_blank');
    } catch (err) {
      alert('No se pudo generar el parte de producción.');
    }
  };

  const badgeEstado = (estado) => ({
    Abierta: 'bg-amber-100 text-amber-700',
    Cerrada: 'bg-green-100 text-green-700',
    Cancelada: 'bg-red-100 text-red-700',
  }[estado] || 'bg-gray-100 text-gray-700');

  if (loading) return <div className="p-8 text-center font-bold text-gray-500">Cargando...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative pb-12">
      <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-orange-600 p-2 rounded-lg text-white mr-4 shadow-md">
            <Factory className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Órdenes de Producción</h2>
            <p className="text-xs text-orange-600 font-bold tracking-wide uppercase mt-1">Procesamiento de materia prima en subproductos</p>
          </div>
        </div>
        <button onClick={openModal} className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md flex items-center transition-all">
          <Plus className="w-5 h-5 mr-2" /> Nueva OP
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 font-bold text-xs tracking-wider uppercase border-b border-gray-200">
              <th className="px-8 py-4">Nº</th>
              <th className="px-8 py-4">Fecha</th>
              <th className="px-8 py-4">Insumos</th>
              <th className="px-8 py-4">Subproductos</th>
              <th className="px-8 py-4">Estado</th>
              <th className="px-8 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ordenes.map((o) => (
              <tr key={o.id} className="hover:bg-orange-50/30 transition-colors duration-150">
                <td className="px-8 py-4 whitespace-nowrap font-mono font-bold text-gray-800 text-sm">OP-{String(o.numero).padStart(5, '0')}</td>
                <td className="px-8 py-4 whitespace-nowrap text-sm font-medium text-gray-600">{new Date(o.fecha).toLocaleDateString()}</td>
                <td className="px-8 py-4 text-xs text-gray-600 max-w-xs truncate">
                  {o.insumos.map((i) => `${i.producto?.nombre} (${o.estado === 'Cerrada' ? i.cantidad_real : i.cantidad_planificada})`).join(', ')}
                </td>
                <td className="px-8 py-4 text-xs text-gray-600 max-w-xs truncate">
                  {o.productos.map((p) => `${p.producto?.nombre} (${o.estado === 'Cerrada' ? p.cantidad_real : p.cantidad_planificada})`).join(', ')}
                </td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeEstado(o.estado)}`}>{o.estado}</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-right">
                  <div className="flex justify-end items-center gap-2">
                    {o.estado === 'Abierta' && (
                      <>
                        <button onClick={() => openCerrar(o)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center shadow-sm">
                          <CheckCircle className="w-4 h-4 mr-1" /> Cerrar
                        </button>
                        <button onClick={() => handleCancelar(o)} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center">
                          <Ban className="w-4 h-4 mr-1" /> Cancelar
                        </button>
                      </>
                    )}
                    {o.estado === 'Cerrada' && <span className="text-xs text-gray-400 font-medium mr-1">{o.fecha_cierre ? new Date(o.fecha_cierre).toLocaleDateString() : ''}</span>}
                    <button onClick={() => handlePrint(o.id)} title="Imprimir parte de producción" className="text-gray-500 hover:text-orange-600 p-1.5 rounded-lg hover:bg-orange-50">
                      <Printer className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {ordenes.length === 0 && (
              <tr><td colSpan="6" className="text-center p-8 font-bold text-gray-400">No hay órdenes de producción.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ============== MODAL CREACIÓN ============== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh] mt-4 mb-4 border-t-8 border-orange-600">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 rounded-t-xl">
              <h3 className="text-xl font-black text-gray-800 flex items-center">
                <Factory className="w-6 h-6 mr-3 text-orange-600" /> Nueva Orden de Producción
              </h3>
              <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {errorMsg && <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-700 font-bold border border-red-200">⚠️ {errorMsg}</div>}
              <p className="text-xs text-gray-400 mb-4 font-medium">Atajos: <kbd className="bg-gray-100 border px-1 rounded">INS</kbd> agrega renglón · <kbd className="bg-gray-100 border px-1 rounded">F2</kbd> busca producto en el renglón activo.</p>

              {/* INSUMOS */}
              <div className="mb-2 flex justify-between items-end">
                <h4 className="font-black text-gray-700 text-sm uppercase tracking-wide flex items-center"><ArrowDownCircle className="w-4 h-4 mr-2 text-red-500" /> Insumos (se consumen)</h4>
                <button type="button" onClick={addInsumo} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded flex items-center shadow-sm hover:bg-slate-700"><Plus className="w-4 h-4 mr-1" /> Añadir insumo</button>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100/50 text-slate-800 text-xs font-black uppercase">
                    <tr>
                      <th className="p-3 border-b">Producto</th>
                      <th className="p-3 border-b text-center">Disponible</th>
                      <th className="p-3 border-b text-center w-24">Cant.</th>
                      <th className="p-3 border-b w-48">Lote origen (opc.)</th>
                      <th className="p-3 border-b text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {insumos.map((d) => (
                      <tr key={d.temp_id} className={`border-b border-gray-100 ${d.error_stock ? 'bg-red-50' : ''}`}>
                        <td className="p-2">
                          <div className="relative">
                            <input type="text" readOnly value={prodById(d.producto_id)?.nombre || ''} placeholder="F2 p/ buscar..."
                              className="w-full p-1.5 rounded border border-gray-300 text-sm font-bold bg-white cursor-pointer focus:ring-2 focus:ring-orange-500 outline-none"
                              onClick={() => { setActiveGrid('insumo'); setActiveRowId(d.temp_id); setIsProductModalOpen(true); }}
                              onFocus={() => { setActiveGrid('insumo'); setActiveRowId(d.temp_id); }} />
                            <Search className="absolute right-2 top-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          {d.disponible !== null ? <span className={`text-xs font-bold ${d.disponible <= 0 ? 'text-red-600' : 'text-green-600'}`}>{d.disponible}</span> : <span className="text-gray-300 text-xs">-</span>}
                        </td>
                        <td className="p-2">
                          <input type="number" min="0.01" step="0.01" value={d.cantidad}
                            className={`w-full p-1.5 rounded border text-center font-bold text-sm ${d.error_stock ? 'border-red-500 text-red-600 bg-red-100' : 'border-gray-300'}`}
                            onChange={(e) => updateInsumo(d.temp_id, 'cantidad', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="p-2">
                          <select value={d.nro_lote} onChange={(e) => updateInsumo(d.temp_id, 'nro_lote', e.target.value)} className="w-full p-1.5 rounded border border-gray-300 text-sm">
                            <option value="">-- Sin especificar --</option>
                            {(prodById(d.producto_id)?.lotes || []).map((l) => (
                              <option key={l.id} value={l.nro_lote}>{l.nro_lote} (stock {l.cantidad_actual})</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button type="button" onClick={() => removeInsumo(d.temp_id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SUBPRODUCTOS */}
              <div className="mb-2 flex justify-between items-end">
                <h4 className="font-black text-gray-700 text-sm uppercase tracking-wide flex items-center"><ArrowUpCircle className="w-4 h-4 mr-2 text-green-600" /> Subproductos (se generan)</h4>
                <button type="button" onClick={addSubproducto} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded flex items-center shadow-sm hover:bg-slate-700"><Plus className="w-4 h-4 mr-1" /> Añadir subproducto</button>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100/50 text-slate-800 text-xs font-black uppercase">
                    <tr>
                      <th className="p-3 border-b">Producto</th>
                      <th className="p-3 border-b text-center w-24">Cant.</th>
                      <th className="p-3 border-b w-40">Lote generado (opc.)</th>
                      <th className="p-3 border-b w-40">Vencimiento (opc.)</th>
                      <th className="p-3 border-b text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {subproductos.map((d) => (
                      <tr key={d.temp_id} className="border-b border-gray-100">
                        <td className="p-2">
                          <div className="relative">
                            <input type="text" readOnly value={prodById(d.producto_id)?.nombre || ''} placeholder="F2 p/ buscar..."
                              className="w-full p-1.5 rounded border border-gray-300 text-sm font-bold bg-white cursor-pointer focus:ring-2 focus:ring-orange-500 outline-none"
                              onClick={() => { setActiveGrid('producto'); setActiveRowId(d.temp_id); setIsProductModalOpen(true); }}
                              onFocus={() => { setActiveGrid('producto'); setActiveRowId(d.temp_id); }} />
                            <Search className="absolute right-2 top-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          </div>
                        </td>
                        <td className="p-2">
                          <input type="number" min="0.01" step="0.01" value={d.cantidad} className="w-full p-1.5 rounded border border-gray-300 text-center font-bold text-sm"
                            onChange={(e) => updateSubproducto(d.temp_id, 'cantidad', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="p-2">
                          <input type="text" value={d.nro_lote_generado} placeholder="Ej: OP-0001" className="w-full p-1.5 rounded border border-gray-300 text-sm"
                            onChange={(e) => updateSubproducto(d.temp_id, 'nro_lote_generado', e.target.value)} />
                        </td>
                        <td className="p-2">
                          <input type="date" value={d.fecha_vencimiento} className="w-full p-1.5 rounded border border-gray-300 text-sm"
                            onChange={(e) => updateSubproducto(d.temp_id, 'fecha_vencimiento', e.target.value)} />
                        </td>
                        <td className="p-2 text-center">
                          <button type="button" onClick={() => removeSubproducto(d.temp_id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Observaciones</label>
                <textarea rows="2" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-orange-500 text-sm font-medium text-gray-700"
                  value={head.observaciones} onChange={(e) => setHead({ ...head, observaciones: e.target.value })}></textarea>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end items-center gap-3 rounded-b-xl">
              <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-700 bg-white border shadow-sm rounded-xl font-bold hover:bg-gray-100">Cancelar</button>
              <button type="button" disabled={isSaving || hasStockErrors} onClick={handleSave}
                className={`px-8 py-2.5 text-white rounded-xl font-black shadow-lg flex items-center ${hasStockErrors ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'}`}>
                {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> : <Save className="w-5 h-5 mr-2" />} Crear OP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== MODAL CIERRE ============== */}
      {isCerrarOpen && ordenCierre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh] mt-4 mb-4 border-t-8 border-green-600">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 rounded-t-xl">
              <h3 className="text-xl font-black text-gray-800 flex items-center"><CheckCircle className="w-6 h-6 mr-3 text-green-600" /> Cerrar OP-{String(ordenCierre.numero).padStart(5, '0')}</h3>
              <button type="button" disabled={isClosing} onClick={() => setIsCerrarOpen(false)} className="text-gray-400 hover:text-red-500"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {cerrarError && <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-700 font-bold border border-red-200">⚠️ {cerrarError}</div>}
              <p className="text-sm text-gray-500 mb-4 font-medium">Confirmá las <b>cantidades reales</b>. Al cerrar se descuenta el stock de los insumos y se da de alta el de los subproductos. Esta acción es irreversible.</p>

              <h4 className="font-black text-gray-700 text-sm uppercase tracking-wide flex items-center mb-2"><ArrowDownCircle className="w-4 h-4 mr-2 text-red-500" /> Insumos a consumir</h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-left">
                  <thead className="bg-slate-100/50 text-slate-800 text-xs font-black uppercase">
                    <tr><th className="p-3">Producto</th><th className="p-3 text-center w-28">Cant. real</th><th className="p-3 w-48">Lote origen</th></tr>
                  </thead>
                  <tbody>
                    {cInsumos.map((i, idx) => (
                      <tr key={i.id} className="border-b border-gray-100">
                        <td className="p-2 text-sm font-bold text-gray-700">{i.nombre}</td>
                        <td className="p-2">
                          <input type="number" min="0.01" step="0.01" value={i.cantidad_real} className="w-full p-1.5 rounded border border-gray-300 text-center font-bold text-sm"
                            onChange={(e) => setCInsumos((prev) => prev.map((x, j) => j === idx ? { ...x, cantidad_real: parseFloat(e.target.value) || 0 } : x))} />
                        </td>
                        <td className="p-2">
                          <select value={i.nro_lote} className="w-full p-1.5 rounded border border-gray-300 text-sm"
                            onChange={(e) => setCInsumos((prev) => prev.map((x, j) => j === idx ? { ...x, nro_lote: e.target.value } : x))}>
                            <option value="">-- Sin especificar --</option>
                            {i.lotes.map((l) => <option key={l.id} value={l.nro_lote}>{l.nro_lote} (stock {l.cantidad_actual})</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 className="font-black text-gray-700 text-sm uppercase tracking-wide flex items-center mb-2"><ArrowUpCircle className="w-4 h-4 mr-2 text-green-600" /> Subproductos a generar</h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100/50 text-slate-800 text-xs font-black uppercase">
                    <tr><th className="p-3">Producto</th><th className="p-3 text-center w-28">Cant. real</th><th className="p-3 w-40">Lote generado</th><th className="p-3 w-40">Vencimiento</th></tr>
                  </thead>
                  <tbody>
                    {cProductos.map((p, idx) => (
                      <tr key={p.id} className="border-b border-gray-100">
                        <td className="p-2 text-sm font-bold text-gray-700">{p.nombre}</td>
                        <td className="p-2">
                          <input type="number" min="0.01" step="0.01" value={p.cantidad_real} className="w-full p-1.5 rounded border border-gray-300 text-center font-bold text-sm"
                            onChange={(e) => setCProductos((prev) => prev.map((x, j) => j === idx ? { ...x, cantidad_real: parseFloat(e.target.value) || 0 } : x))} />
                        </td>
                        <td className="p-2">
                          <input type="text" value={p.nro_lote_generado} placeholder="Ej: OP-0001" className="w-full p-1.5 rounded border border-gray-300 text-sm"
                            onChange={(e) => setCProductos((prev) => prev.map((x, j) => j === idx ? { ...x, nro_lote_generado: e.target.value } : x))} />
                        </td>
                        <td className="p-2">
                          <input type="date" value={p.fecha_vencimiento} className="w-full p-1.5 rounded border border-gray-300 text-sm"
                            onChange={(e) => setCProductos((prev) => prev.map((x, j) => j === idx ? { ...x, fecha_vencimiento: e.target.value } : x))} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end items-center gap-3 rounded-b-xl">
              <button type="button" disabled={isClosing} onClick={() => setIsCerrarOpen(false)} className="px-6 py-2.5 text-gray-700 bg-white border shadow-sm rounded-xl font-bold hover:bg-gray-100">Cancelar</button>
              <button type="button" disabled={isClosing} onClick={handleCerrar} className="px-8 py-2.5 text-white rounded-xl font-black shadow-lg flex items-center bg-green-600 hover:bg-green-700">
                {isClosing ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> : <CheckCircle className="w-5 h-5 mr-2" />} Confirmar cierre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Búsqueda de producto compartida */}
      <ProductSearchModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productos={productos}
        onSelect={(producto) => {
          if (activeGrid === 'producto') updateSubproducto(activeRowId, 'producto_id', producto);
          else updateInsumo(activeRowId, 'producto_id', producto);
          setIsProductModalOpen(false);
        }}
      />
    </div>
  );
}
