import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../App';
import { RotateCcw, Plus, Trash2, X, Save, Search, Database, Printer, Filter, ChevronLeft, ChevronRight, XCircle, Eye } from 'lucide-react';
import ClientSearchModal from '../components/ClientSearchModal';
import ProductSearchModal from '../components/ProductSearchModal';
import BatchSearchModal from '../components/BatchSearchModal';

export default function Devoluciones() {
  const { api } = useAuth();
  const [devoluciones, setDevoluciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDevoluciones, setLoadingDevoluciones] = useState(true);

  // Catálogos
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [transportes, setTransportes] = useState([]);
  const [puntosVenta, setPuntosVenta] = useState([]);

  // Filtros y paginación del listado
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroCliente, setFiltroCliente] = useState(null);
  const [isFilterClientModalOpen, setIsFilterClientModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Estados Modal Crear
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [printingId, setPrintingId] = useState(null);
  const [viewDevolucion, setViewDevolucion] = useState(null);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState(null);
  const quantityRefs = useRef({});

  // Modal de lotes: elegir un lote existente (nunca se crea uno nuevo desde acá)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedProductForBatch, setSelectedProductForBatch] = useState(null);

  const [head, setHead] = useState({
    punto_venta_id: '',
    cliente_id: '',
    cliente: null,
    transporte_id: '',
    motivo: '',
    observaciones: '',
  });

  const [detalles, setDetalles] = useState([
    { temp_id: Date.now(), producto_id: '', cantidad: 1, nro_lote: '' }
  ]);

  const fetchCatalogos = async () => {
    try {
      const [resCli, resProd, resTra, resPv] = await Promise.all([
        api.get('/api/clientes'),
        api.get('/api/productos'),
        api.get('/api/transportes'),
        api.get('/api/puntos-venta'),
      ]);
      setClientes(resCli.data);
      setProductos(resProd.data.filter(p => p.activo));
      setTransportes(resTra.data);
      setPuntosVenta(resPv.data);
    } catch (error) {
      console.error("Error al traer datos:", error);
    }
    setLoading(false);
  };

  const fetchDevoluciones = async () => {
    setLoadingDevoluciones(true);
    try {
      const params = { skip: (page - 1) * pageSize, limit: pageSize };
      if (filtroFechaDesde) params.fecha_desde = filtroFechaDesde;
      if (filtroFechaHasta) params.fecha_hasta = filtroFechaHasta;
      if (filtroCliente) params.cliente_id = filtroCliente.id;

      const res = await api.get('/api/devoluciones', { params });
      setDevoluciones(res.data.items);
      setTotal(res.data.total);
    } catch (error) {
      console.error("Error al traer devoluciones:", error);
    }
    setLoadingDevoluciones(false);
  };

  useEffect(() => {
    fetchCatalogos();
  }, [api]);

  useEffect(() => {
    fetchDevoluciones();
  }, [api, page, filtroFechaDesde, filtroFechaHasta, filtroCliente, refreshKey]);

  const limpiarFiltros = () => {
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroCliente(null);
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

  // Atajo F2 para el buscador de cliente del filtro (fuera del modal de creación)
  useEffect(() => {
    const handleFilterKeyDown = (e) => {
      if (isModalOpen) return;
      if (e.key === 'F2' && document.activeElement.id === 'input-cliente-filtro') {
        e.preventDefault();
        setIsFilterClientModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleFilterKeyDown);
    return () => window.removeEventListener('keydown', handleFilterKeyDown);
  }, [isModalOpen]);

  const addDetalle = useCallback(() => {
    const newId = Date.now();
    setDetalles(prev => [...prev, { temp_id: newId, producto_id: '', cantidad: 1, nro_lote: '' }]);
  }, []);

  const removeDetalle = (temp_id) => {
    setDetalles(detalles.filter(d => d.temp_id !== temp_id));
  };

  const updateDetalle = (temp_id, field, value) => {
    setDetalles(prev => prev.map(d => (d.temp_id === temp_id ? { ...d, [field]: value } : d)));
  };

  // Atajos de teclado del modal de creación
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (!isModalOpen) return;
      if (isClientModalOpen || isProductModalOpen || isBatchModalOpen) return;

      if (e.key === 'Insert') {
        e.preventDefault();
        addDetalle();
      }

      if (e.key === 'F2') {
        e.preventDefault();
        if (document.activeElement.id === 'input-cliente') {
          setIsClientModalOpen(true);
        } else {
          const rowIdAttr = document.activeElement?.getAttribute('data-rowid');
          if (rowIdAttr) setActiveRowId(parseInt(rowIdAttr));
          setIsProductModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isModalOpen, isClientModalOpen, isProductModalOpen, isBatchModalOpen, addDetalle]);

  const openModal = () => {
    setHead({
      punto_venta_id: puntosVenta.length > 0 ? puntosVenta[0].id : '',
      cliente_id: '',
      cliente: null,
      transporte_id: '',
      motivo: '',
      observaciones: '',
    });
    setDetalles([{ temp_id: Date.now(), producto_id: '', cantidad: 1, nro_lote: '' }]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleProductSelect = (producto) => {
    if (!activeRowId) return;
    const rowId = activeRowId;
    setDetalles(prev => prev.map(d => {
      if (d.temp_id !== rowId) return d;
      return { ...d, producto_id: producto.id, nro_lote: '' };
    }));
    setIsProductModalOpen(false);

    // Si el producto maneja lotes, el lote es obligatorio: hay que elegir a cuál sumar, nunca se crea uno nuevo desde acá.
    if (producto.lotes && producto.lotes.length > 0) {
      setSelectedProductForBatch(producto);
      setIsBatchModalOpen(true);
      return;
    }

    setTimeout(() => {
      quantityRefs.current[rowId]?.focus();
      quantityRefs.current[rowId]?.select();
    }, 100);
    setActiveRowId(null);
  };

  const handleBatchSelect = (lote) => {
    setDetalles(prev => prev.map(d => (d.temp_id === activeRowId ? { ...d, nro_lote: lote.nro_lote } : d)));
    setIsBatchModalOpen(false);
    setTimeout(() => {
      quantityRefs.current[activeRowId]?.focus();
      quantityRefs.current[activeRowId]?.select();
    }, 100);
    setActiveRowId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!head.punto_venta_id || !head.cliente_id) {
      setErrorMsg("Debes seleccionar Cliente.");
      return;
    }
    if (!head.motivo.trim()) {
      setErrorMsg("Debes ingresar el motivo de la devolución.");
      return;
    }
    const cleanDetalles = detalles.filter(d => d.producto_id && d.cantidad > 0);
    if (cleanDetalles.length === 0) {
      setErrorMsg("Debes añadir al menos un producto con cantidad mayor a 0.");
      return;
    }
    const sinLote = cleanDetalles.find(d => {
      const prod = productos.find(p => p.id === parseInt(d.producto_id));
      return prod?.lotes?.length > 0 && !d.nro_lote;
    });
    if (sinLote) {
      const prod = productos.find(p => p.id === parseInt(sinLote.producto_id));
      setErrorMsg(`Debes seleccionar un lote para "${prod?.nombre || 'un producto'}".`);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        punto_venta_id: head.punto_venta_id,
        cliente_id: head.cliente_id,
        transporte_id: head.transporte_id || null,
        motivo: head.motivo,
        observaciones: head.observaciones,
        detalles: cleanDetalles.map(d => ({
          producto_id: parseInt(d.producto_id),
          cantidad: parseFloat(d.cantidad),
          nro_lote: d.nro_lote || null,
        })),
      };

      await api.post('/api/devoluciones', payload);
      setIsModalOpen(false);
      setPage(1);
      setRefreshKey(k => k + 1);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Error al guardar la devolución");
    }
    setIsSaving(false);
  };

  const handlePrint = async (devolucion_id) => {
    setPrintingId(devolucion_id);
    try {
      const response = await api.get(`/api/devoluciones/${devolucion_id}/pdf`, { responseType: 'blob' });
      const fileURL = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));

      const pdfWindow = window.open("", "_blank");
      if (pdfWindow) {
        pdfWindow.document.write(`
          <html>
            <head>
              <title>Visor PDF - Devolución</title>
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
      alert("No se pudo generar el PDF de la devolución.");
    }
    setPrintingId(null);
  };

  if (loading) return <div className="p-8 text-center font-bold text-gray-500">Cargando...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden pb-12">
      <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-orange-600 p-2 rounded-lg text-white mr-4 shadow-md">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Devoluciones</h2>
            <p className="text-xs text-orange-600 font-bold tracking-wide uppercase mt-1">Retiro de Mercadería a Clientes</p>
          </div>
        </div>
        <button onClick={openModal} className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md flex items-center transition-all">
          <Plus className="w-5 h-5 mr-2" /> Nueva Devolución
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
          <label className="block text-[11px] font-bold text-gray-500 mb-1">Cliente <span className="text-orange-500">(F2)</span></label>
          <div className="relative">
            <input
              id="input-cliente-filtro"
              type="text"
              readOnly
              className="w-full p-2 pr-8 rounded-lg border border-gray-300 text-sm font-bold bg-white cursor-pointer focus:ring-2 focus:ring-orange-500 outline-none"
              value={filtroCliente?.razon_social || ''}
              placeholder="Todos los clientes..."
              onClick={() => setIsFilterClientModalOpen(true)}
            />
            {filtroCliente ? (
              <button
                type="button"
                onClick={() => { setFiltroCliente(null); setPage(1); }}
                className="absolute right-2 top-2.5 text-gray-400 hover:text-red-500"
                title="Quitar filtro de cliente"
              >
                <XCircle className="w-4 h-4" />
              </button>
            ) : (
              <Search className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            )}
          </div>
        </div>
        {(filtroFechaDesde || filtroFechaHasta || filtroCliente) && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="text-xs font-bold text-gray-500 hover:text-red-600 px-3 py-2.5"
          >
            Limpiar filtros
          </button>
        )}
        <div className="ml-auto text-xs font-bold text-gray-400 pb-2.5">
          {total} devolución{total === 1 ? '' : 'es'} encontrada{total === 1 ? '' : 's'}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 font-bold text-xs tracking-wider uppercase border-b border-gray-200">
              <th className="px-8 py-4">Nº</th>
              <th className="px-8 py-4">Fecha</th>
              <th className="px-8 py-4">Cliente</th>
              <th className="px-8 py-4">Transporte</th>
              <th className="px-8 py-4">Motivo</th>
              <th className="px-8 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loadingDevoluciones && (
              <tr><td colSpan="6" className="text-center p-8 font-bold text-gray-400">Cargando...</td></tr>
            )}
            {!loadingDevoluciones && devoluciones.map((d) => (
              <tr key={d.id} className="hover:bg-orange-50/30 transition-colors">
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="font-mono font-bold text-gray-800 text-sm">
                    {String(d.punto_venta?.numero || '0').padStart(4, '0')}-{String(d.numero_comprobante).padStart(8, '0')}
                  </span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                  {new Date(d.fecha).toLocaleDateString()}
                </td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="text-sm font-black text-gray-700">{d.cliente?.razon_social}</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                  {d.transporte?.nombre || '-'}
                </td>
                <td className="px-8 py-4 text-sm text-gray-600 max-w-xs truncate">{d.motivo}</td>
                <td className="px-8 py-4 whitespace-nowrap text-center">
                  <button
                    onClick={() => setViewDevolucion(d)}
                    className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                    title="Ver Productos Devueltos"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handlePrint(d.id)}
                    disabled={printingId === d.id}
                    className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all disabled:opacity-40"
                    title="Imprimir Devolución"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {!loadingDevoluciones && devoluciones.length === 0 && (
              <tr><td colSpan="6" className="text-center p-8 font-bold text-gray-400">No hay devoluciones que coincidan con los filtros.</td></tr>
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
                className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-bold transition-colors ${p === page ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
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

      {/* ============== MODAL VER PRODUCTOS DEVUELTOS ============== */}
      {viewDevolucion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] mt-4 mb-4 border-t-8 border-orange-600">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 rounded-t-xl">
              <h3 className="text-xl font-black text-gray-800 flex items-center">
                <Eye className="w-6 h-6 mr-3 text-orange-600" />
                Productos Devueltos — {String(viewDevolucion.punto_venta?.numero || '0').padStart(4, '0')}-{String(viewDevolucion.numero_comprobante).padStart(8, '0')}
              </h3>
              <button type="button" onClick={() => setViewDevolucion(null)} className="text-gray-400 hover:text-red-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4 text-sm text-gray-600 space-y-1">
                <div><span className="font-bold text-gray-800">Cliente:</span> {viewDevolucion.cliente?.razon_social}</div>
                <div><span className="font-bold text-gray-800">Motivo:</span> {viewDevolucion.motivo}</div>
                {viewDevolucion.transporte && (
                  <div><span className="font-bold text-gray-800">Transporte:</span> {viewDevolucion.transporte.nombre}</div>
                )}
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-800 text-xs font-black uppercase">
                    <tr>
                      <th className="p-3 border-b">Producto</th>
                      <th className="p-3 border-b text-center">Cantidad</th>
                      <th className="p-3 border-b text-center">Lote</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viewDevolucion.detalles.map(det => (
                      <tr key={det.id}>
                        <td className="p-3 text-sm font-bold text-gray-700">{det.producto?.nombre}</td>
                        <td className="p-3 text-center font-black text-sm text-gray-800">{det.cantidad.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-center font-mono text-xs text-gray-600">{det.nro_lote || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============== MODAL CREACION ============== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] mt-4 mb-4 transform transition-all border-t-8 border-orange-600">

            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 rounded-t-xl">
              <h3 className="text-xl font-black text-gray-800 flex items-center">
                <RotateCcw className="w-6 h-6 mr-3 text-orange-600" />
                Nueva Devolución
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
                  <label className="block text-xs font-bold text-gray-500 mb-1">Cliente * <span className="text-[10px] text-orange-500">(F2 p/ buscar)</span></label>
                  <div className="relative">
                    <input
                      id="input-cliente"
                      type="text"
                      readOnly
                      className="w-full p-2.5 rounded-lg border border-gray-300 font-bold bg-white cursor-pointer focus:ring-2 focus:ring-orange-500 outline-none"
                      value={head.cliente?.razon_social || ''}
                      placeholder="F2 para buscar cliente..."
                      onClick={() => setIsClientModalOpen(true)}
                    />
                    <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Transporte (retira)</label>
                  <select
                    className="w-full p-2.5 rounded-lg border border-gray-300 font-bold bg-white"
                    value={head.transporte_id}
                    onChange={e => setHead({ ...head, transporte_id: e.target.value ? parseInt(e.target.value) : '' })}
                  >
                    <option value="">Sin asignar</option>
                    {transportes.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
                {puntosVenta.length > 1 && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Punto de Venta</label>
                    <select
                      className="w-full p-2.5 rounded-lg border border-gray-300 font-bold bg-white"
                      value={head.punto_venta_id}
                      onChange={e => setHead({ ...head, punto_venta_id: parseInt(e.target.value) })}
                    >
                      {puntosVenta.map(pv => <option key={pv.id} value={pv.id}>[{String(pv.numero).padStart(4, '0')}] {pv.descripcion}</option>)}
                    </select>
                  </div>
                )}
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Motivo de la devolución *</label>
                  <input
                    type="text"
                    className="w-full p-2.5 rounded-lg border border-gray-300 font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Ej: producto vencido, error de pedido, mercadería dañada..."
                    value={head.motivo}
                    onChange={e => setHead({ ...head, motivo: e.target.value })}
                  />
                </div>
              </div>

              <div className="mb-2 flex justify-between items-end">
                <h4 className="font-black text-gray-700 text-sm uppercase tracking-wide">Artículos Devueltos</h4>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100/50 text-slate-800 text-xs font-black uppercase">
                    <tr>
                      <th className="p-3 w-1/2 border-b">Producto</th>
                      <th className="p-3 border-b text-center w-32">Cantidad</th>
                      <th className="p-3 border-b text-center w-20">Unidad</th>
                      <th className="p-3 border-b text-center w-40">Lote</th>
                      <th className="p-3 border-b text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map((d) => {
                      const prod = productos.find(p => p.id === d.producto_id);
                      return (
                        <tr key={d.temp_id} className="border-b border-gray-100">
                          <td className="p-2">
                            <div className="relative">
                              <input
                                data-rowid={d.temp_id}
                                type="text"
                                readOnly
                                className="w-full p-1.5 rounded border border-gray-300 text-sm font-bold bg-white cursor-pointer focus:ring-2 focus:ring-orange-500 outline-none"
                                value={prod?.nombre || ''}
                                placeholder="F2 p/ buscar..."
                                onClick={() => { setActiveRowId(d.temp_id); setIsProductModalOpen(true); }}
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
                              onChange={e => updateDetalle(d.temp_id, 'cantidad', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="p-2 text-center text-xs font-bold text-gray-500">
                            {prod?.unidad || '—'}
                          </td>
                          <td className="p-2">
                            {!prod ? (
                              <span className="text-xs text-gray-300">—</span>
                            ) : !(prod.lotes?.length > 0) ? (
                              <span className="text-xs text-gray-400 font-medium">Sin lotes</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setSelectedProductForBatch(prod); setActiveRowId(d.temp_id); setIsBatchModalOpen(true); }}
                                className={`w-full flex items-center justify-center gap-1.5 p-1.5 rounded-lg border font-mono font-bold text-xs transition-colors ${
                                  d.nro_lote ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-red-300 bg-red-50 text-red-600'
                                }`}
                              >
                                <Database className="w-3.5 h-3.5" />
                                {d.nro_lote || 'Elegir lote'}
                              </button>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <button type="button" onClick={() => removeDetalle(d.temp_id)} className="text-gray-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Observaciones / Notas Internas</label>
                <textarea rows="3" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-orange-500 text-sm font-medium" value={head.observaciones} onChange={e => setHead({ ...head, observaciones: e.target.value })}></textarea>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center gap-3 rounded-b-xl">
              <button type="button" onClick={addDetalle} className="text-xs bg-slate-800 text-white px-3 py-2.5 rounded-xl flex items-center shadow-sm hover:bg-slate-700 font-bold">
                <Plus className="w-4 h-4 mr-1" /> Añadir Renglón (Ins)
              </button>
              <div className="flex items-center gap-3">
                <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-700 bg-white border shadow-sm rounded-xl font-bold hover:bg-gray-100">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} onClick={handleSave} className="px-8 py-2.5 bg-orange-600 text-white rounded-xl font-black shadow-lg hover:bg-orange-700 flex items-center">
                  {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> : <Save className="w-5 h-5 mr-2" />}
                  Guardar Devolución
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ClientSearchModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        clientes={clientes}
        onSelect={(cliente) => {
          setHead({ ...head, cliente_id: cliente.id, cliente });
          setIsClientModalOpen(false);
        }}
      />

      <ClientSearchModal
        isOpen={isFilterClientModalOpen}
        onClose={() => setIsFilterClientModalOpen(false)}
        clientes={clientes}
        onSelect={(cliente) => {
          setFiltroCliente(cliente);
          setPage(1);
          setIsFilterClientModalOpen(false);
        }}
      />

      <ProductSearchModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productos={productos}
        onSelect={handleProductSelect}
      />

      <BatchSearchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        producto={selectedProductForBatch}
        onSelect={handleBatchSelect}
      />
    </div>
  );
}
