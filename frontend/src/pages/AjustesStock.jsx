import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../App';
import { PackageOpen, Plus, Trash2, Save, Search, Database, FileBarChart, X, XCircle, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import ProductSearchModal from '../components/ProductSearchModal';
import BatchSearchModal from '../components/BatchSearchModal';

export default function AjustesStock() {
  const { api } = useAuth();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [head, setHead] = useState({ tipo: 1, motivo: '' });
  const [detalles, setDetalles] = useState([
    { temp_id: Date.now(), producto_id: '', codigo: '', nombre: '', cantidad: 1, unidad: '', nro_lote: '' }
  ]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState(null);

  // Modal de lotes: elegir un lote existente (nunca se crea uno nuevo desde acá)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedProductForBatch, setSelectedProductForBatch] = useState(null);

  // Referencias para manejar el foco dinámico
  const quantityRefs = useRef({});

  // ===== Reporte de Movimientos =====
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReportProductModalOpen, setIsReportProductModalOpen] = useState(false);
  const [repTipo, setRepTipo] = useState('');
  const [repFechaDesde, setRepFechaDesde] = useState('');
  const [repFechaHasta, setRepFechaHasta] = useState('');
  const [repProducto, setRepProducto] = useState(null);
  const [repPage, setRepPage] = useState(1);
  const [repPageSize] = useState(50);
  const [repTotal, setRepTotal] = useState(0);
  const [repItems, setRepItems] = useState([]);
  const [repLoading, setRepLoading] = useState(false);
  const [repError, setRepError] = useState('');
  const [isPrintingReport, setIsPrintingReport] = useState(false);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const res = await api.get('/api/productos');
        setProductos(res.data.filter((p) => p.activo));
      } catch (err) {
        setErrorMsg('Error al cargar catálogo de productos.');
      }
      setLoading(false);
    };
    fetchProductos();
  }, [api]);

  const addRow = useCallback(() => {
    setDetalles((prev) => [...prev, { temp_id: Date.now(), producto_id: '', codigo: '', nombre: '', cantidad: 1, unidad: '', nro_lote: '' }]);
  }, []);

  const removeRow = (temp_id) => {
    setDetalles(detalles.filter((d) => d.temp_id !== temp_id));
  };

  const updateRow = (temp_id, field, value) => {
    setDetalles((prev) =>
      prev.map((d) => (d.temp_id === temp_id ? { ...d, [field]: value } : d))
    );
  };

  // Keyboard events logic
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Si algún modal está abierto, ignorar
      if (isModalOpen || isBatchModalOpen || isReportModalOpen || isReportProductModalOpen) return;

      if (e.key === 'Insert') {
        e.preventDefault();
        addRow();
      }

      if (e.key === 'F2') {
        e.preventDefault();
        // Identificar la fila activa
        const activeEl = document.activeElement;
        const rowIdAttr = activeEl?.getAttribute('data-rowid');
        if (rowIdAttr) {
          setActiveRowId(parseInt(rowIdAttr));
          setIsModalOpen(true);
        } else if (detalles.length > 0) {
          // Si no hay foco específico, usar el último renglón
          setActiveRowId(detalles[detalles.length - 1].temp_id);
          setIsModalOpen(true);
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [addRow, isModalOpen, isBatchModalOpen, isReportModalOpen, isReportProductModalOpen, detalles]);

  // F2 para el buscador de producto del filtro del reporte
  useEffect(() => {
    const handleReportKeyDown = (e) => {
      if (!isReportModalOpen || isReportProductModalOpen) return;
      if (e.key === 'F2' && document.activeElement.id === 'input-producto-filtro-reporte') {
        e.preventDefault();
        setIsReportProductModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleReportKeyDown);
    return () => window.removeEventListener('keydown', handleReportKeyDown);
  }, [isReportModalOpen, isReportProductModalOpen]);

  const fetchReporte = async () => {
    setRepLoading(true);
    setRepError('');
    try {
      const params = { skip: (repPage - 1) * repPageSize, limit: repPageSize };
      if (repTipo) params.tipo = repTipo;
      if (repFechaDesde) params.fecha_desde = repFechaDesde;
      if (repFechaHasta) params.fecha_hasta = repFechaHasta;
      if (repProducto) params.producto_id = repProducto.id;

      const res = await api.get('/api/stk-mov', { params });
      setRepItems(res.data.items);
      setRepTotal(res.data.total);
    } catch (err) {
      setRepError('Error al traer el reporte.');
    }
    setRepLoading(false);
  };

  useEffect(() => {
    if (!isReportModalOpen) return;
    fetchReporte();
  }, [isReportModalOpen, repPage, repTipo, repFechaDesde, repFechaHasta, repProducto]);

  const limpiarFiltrosReporte = () => {
    setRepTipo('');
    setRepFechaDesde('');
    setRepFechaHasta('');
    setRepProducto(null);
    setRepPage(1);
  };

  const repTotalPages = Math.max(1, Math.ceil(repTotal / repPageSize));

  const getRepPageNumbers = () => {
    const pages = [];
    const delta = 2;
    for (let p = 1; p <= repTotalPages; p++) {
      if (p === 1 || p === repTotalPages || (p >= repPage - delta && p <= repPage + delta)) {
        pages.push(p);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  const handlePrintReporte = async () => {
    setIsPrintingReport(true);
    try {
      const params = {};
      if (repTipo) params.tipo = repTipo;
      if (repFechaDesde) params.fecha_desde = repFechaDesde;
      if (repFechaHasta) params.fecha_hasta = repFechaHasta;
      if (repProducto) params.producto_id = repProducto.id;

      const response = await api.get('/api/stk-mov/reporte/pdf', { params, responseType: 'blob' });
      const fileURL = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));

      const pdfWindow = window.open("", "_blank");
      if (pdfWindow) {
         pdfWindow.document.write(`
            <html>
              <head>
                <title>Visor PDF - Reporte de Ajustes de Stock</title>
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
      alert("No se pudo generar el PDF del reporte.");
    }
    setIsPrintingReport(false);
  };

  const handleProductSelect = (producto) => {
    if (activeRowId) {
      const rowId = activeRowId;
      setDetalles((prev) =>
        prev.map((d) => {
          if (d.temp_id === rowId) {
            return {
              ...d,
              producto_id: producto.id,
              codigo: producto.codigo_interno,
              nombre: producto.nombre,
              unidad: producto.unidad || '',
              nro_lote: '',
            };
          }
          return d;
        })
      );
      // Cerrar modal de producto
      setIsModalOpen(false);

      // Si el producto maneja lotes, el lote es obligatorio (tanto en Entrada como en Salida):
      // hay que elegir a cuál sumar/restar, nunca se crea uno nuevo desde acá.
      if (producto.lotes && producto.lotes.length > 0) {
        setSelectedProductForBatch(producto);
        setActiveRowId(rowId);
        setIsBatchModalOpen(true);
        return;
      }

      // Pasar el foco a la cantidad usando setTimeout para dar tiempo al render reactivo
      setTimeout(() => {
        if (quantityRefs.current[rowId]) {
          quantityRefs.current[rowId].focus();
          quantityRefs.current[rowId].select();
        }
      }, 100);
      setActiveRowId(null);
    }
  };

  const handleBatchSelect = (lote) => {
    setDetalles((prev) =>
      prev.map((d) => (d.temp_id === activeRowId ? { ...d, nro_lote: lote.nro_lote } : d))
    );
    setIsBatchModalOpen(false);
    setTimeout(() => {
      if (quantityRefs.current[activeRowId]) {
        quantityRefs.current[activeRowId].focus();
        quantityRefs.current[activeRowId].select();
      }
    }, 100);
    setActiveRowId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!head.motivo.trim()) {
      setErrorMsg('Debes ingresar un motivo para el ajuste.');
      return;
    }

    const cleanDetalles = detalles.filter((d) => d.producto_id && d.cantidad > 0);
    if (cleanDetalles.length === 0) {
      setErrorMsg('Debes añadir al menos un producto con cantidad mayor a 0.');
      return;
    }

    // El lote es obligatorio para productos que manejan lotes, en ambos sentidos.
    const sinLote = cleanDetalles.find((d) => {
      const prod = productos.find((p) => p.id === parseInt(d.producto_id));
      return prod?.lotes?.length > 0 && !d.nro_lote;
    });
    if (sinLote) {
      const prod = productos.find((p) => p.id === parseInt(sinLote.producto_id));
      setErrorMsg(`Debes seleccionar un lote para "${prod?.nombre || 'un producto'}".`);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        tipo: parseInt(head.tipo),
        motivo: head.motivo,
        items: cleanDetalles.map((d) => ({
          id_producto: d.producto_id,
          cantidad: parseFloat(d.cantidad),
          nro_lote: d.nro_lote || null,
        })),
      };

      await api.post('/api/stk-mov', payload);
      setSuccessMsg('Movimiento de stock guardado exitosamente.');

      // Reset form
      setHead({ tipo: 1, motivo: '' });
      setDetalles([{ temp_id: Date.now(), producto_id: '', codigo: '', nombre: '', cantidad: 1, unidad: '', nro_lote: '' }]);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al guardar el movimiento.');
    }
    setIsSaving(false);
  };

  if (loading) return <div className="p-8 text-center font-bold text-gray-500">Cargando catálogos...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative pb-12">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-white flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-teal-600 p-2 rounded-lg text-white mr-4 shadow-md">
            <PackageOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Ajustes de Stock</h2>
            <p className="text-xs text-teal-600 font-bold tracking-wide uppercase mt-1">Movimientos Manuales (+ / -)</p>
          </div>
        </div>
        <button
          onClick={() => { setRepPage(1); setIsReportModalOpen(true); }}
          className="bg-white text-teal-700 border border-teal-300 hover:bg-teal-50 px-5 py-2.5 rounded-xl font-bold shadow-sm flex items-center transition-all"
        >
          <FileBarChart className="w-5 h-5 mr-2" /> Reporte
        </button>
      </div>

      <div className="p-8">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 font-bold border border-red-200 shadow-sm">
            ⚠️ {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 text-green-700 font-bold border border-green-200 shadow-sm">
            ✅ {successMsg}
          </div>
        )}

        {/* Form Encabezado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-inner">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Movimiento</label>
            <select
              className="w-full p-3 rounded-xl border border-gray-300 font-bold bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors shadow-sm"
              value={head.tipo}
              onChange={(e) => setHead({ ...head, tipo: e.target.value })}
            >
              <option value={1}>Entrada de Stock (+)</option>
              <option value={2}>Salida de Stock (-)</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">Motivo / Observación</label>
            <input
              type="text"
              className="w-full p-3 rounded-xl border border-gray-300 font-medium bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors shadow-sm"
              placeholder="Ej: Ajuste de inventario 2026, rotura, etc."
              value={head.motivo}
              onChange={(e) => setHead({ ...head, motivo: e.target.value })}
            />
          </div>
        </div>

        {/* Hotkeys helper info */}
        <div className="mb-4 flex items-center text-sm font-bold text-gray-500 bg-teal-50 p-3 rounded-lg border border-teal-100">
          <kbd className="bg-white border border-gray-300 px-2 py-1 rounded-md shadow-sm mr-2 text-gray-800">Ins</kbd> Agrega renglón
          <span className="mx-4 text-teal-300">|</span>
          <kbd className="bg-white border border-gray-300 px-2 py-1 rounded-md shadow-sm mr-2 text-gray-800">F2</kbd> (Sobre un renglón) Buscar Producto
        </div>

        {/* Grilla Detalle */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden mb-8 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-slate-800 text-xs font-black uppercase">
              <tr>
                <th className="p-4 border-b">Código</th>
                <th className="p-4 border-b w-1/2">Producto / Descripción</th>
                <th className="p-4 border-b text-center w-48">Cantidad</th>
                <th className="p-4 border-b text-center w-48">Lote</th>
                <th className="p-4 border-b text-center w-16"></th>
              </tr>
            </thead>
            <tbody>
              {detalles.map((d) => (
                <tr key={d.temp_id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    <input
                      data-rowid={d.temp_id}
                      type="text"
                      readOnly
                      placeholder="F2 buscar"
                      className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50 font-mono text-sm cursor-pointer outline-none focus:ring-2 focus:ring-teal-400"
                      value={d.codigo}
                      onClick={() => { setActiveRowId(d.temp_id); setIsModalOpen(true); }}
                    />
                  </td>
                  <td className="p-3">
                    <div className="relative">
                      <input
                        data-rowid={d.temp_id}
                        type="text"
                        readOnly
                        placeholder="Clic o F2 para buscar producto..."
                        className="w-full p-2 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 cursor-pointer shadow-sm outline-none focus:ring-2 focus:ring-teal-400"
                        value={d.nombre}
                        onClick={() => { setActiveRowId(d.temp_id); setIsModalOpen(true); }}
                      />
                      <Search className="w-4 h-4 absolute right-3 top-3 text-gray-400 pointer-events-none" />
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <input
                        ref={(el) => (quantityRefs.current[d.temp_id] = el)}
                        data-rowid={d.temp_id}
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="w-full p-2 rounded-lg border-2 border-gray-300 text-center font-black text-teal-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all shadow-sm"
                        value={d.cantidad}
                        onChange={(e) => updateRow(d.temp_id, 'cantidad', e.target.value)}
                      />
                      {d.unidad && <span className="text-xs font-bold text-gray-500 whitespace-nowrap min-w-[3.5rem] text-left">{d.unidad}</span>}
                    </div>
                  </td>
                  <td className="p-3">
                    {(() => {
                      const prod = productos.find((p) => p.id === parseInt(d.producto_id));
                      if (!prod) return <span className="text-xs text-gray-300">—</span>;
                      if (!(prod.lotes?.length > 0)) return <span className="text-xs text-gray-400 font-medium">Sin lotes</span>;
                      return (
                        <button
                          type="button"
                          onClick={() => { setSelectedProductForBatch(prod); setActiveRowId(d.temp_id); setIsBatchModalOpen(true); }}
                          className={`w-full flex items-center justify-center gap-1.5 p-2 rounded-lg border font-mono font-bold text-xs transition-colors ${
                            d.nro_lote ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-red-300 bg-red-50 text-red-600'
                          }`}
                        >
                          <Database className="w-3.5 h-3.5" />
                          {d.nro_lote || 'Elegir lote'}
                        </button>
                      );
                    })()}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(d.temp_id)}
                      className="text-gray-400 hover:text-red-500 bg-white hover:bg-red-50 p-2 rounded-lg border border-transparent hover:border-red-200 transition-all shadow-sm"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 bg-gray-50 border-t border-gray-200">
             <button
                type="button"
                onClick={addRow}
                className="text-xs font-bold bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg flex items-center shadow-sm hover:bg-gray-100 transition-colors"
             >
                <Plus className="w-4 h-4 mr-2" /> Agregar Línea (Ins)
             </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={isSaving}
            onClick={handleSave}
            className="px-8 py-3 text-white bg-teal-600 hover:bg-teal-700 rounded-xl font-black shadow-lg shadow-teal-600/30 transition-all flex items-center text-lg"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
            ) : (
              <Save className="w-6 h-6 mr-3" />
            )}
            Guardar Movimiento
          </button>
        </div>
      </div>

      <ProductSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productos={productos}
        onSelect={handleProductSelect}
      />

      <BatchSearchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        producto={selectedProductForBatch}
        onSelect={handleBatchSelect}
      />

      {/* ============== MODAL REPORTE ============== */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] mt-4 mb-4 border-t-8 border-teal-600">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 rounded-t-xl">
              <h3 className="text-xl font-black text-gray-800 flex items-center">
                <FileBarChart className="w-6 h-6 mr-3 text-teal-600" />
                Reporte de Movimientos de Stock
              </h3>
              <button type="button" onClick={() => setIsReportModalOpen(false)} className="text-gray-400 hover:text-red-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {repError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 font-bold border border-red-200 text-sm">
                  ⚠️ {repError}
                </div>
              )}

              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">Tipo</label>
                  <select
                    className="w-full p-2.5 rounded-lg border border-gray-300 font-bold bg-white"
                    value={repTipo}
                    onChange={e => { setRepTipo(e.target.value); setRepPage(1); }}
                  >
                    <option value="">Todos</option>
                    <option value="1">Entrada</option>
                    <option value="2">Salida</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">Desde</label>
                  <input
                    type="date"
                    className="w-full p-2.5 rounded-lg border border-gray-300 text-sm font-medium"
                    value={repFechaDesde}
                    onChange={e => { setRepFechaDesde(e.target.value); setRepPage(1); }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">Hasta</label>
                  <input
                    type="date"
                    className="w-full p-2.5 rounded-lg border border-gray-300 text-sm font-medium"
                    value={repFechaHasta}
                    onChange={e => { setRepFechaHasta(e.target.value); setRepPage(1); }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">Producto <span className="text-teal-500">(F2)</span></label>
                  <div className="relative">
                    <input
                      id="input-producto-filtro-reporte"
                      type="text"
                      readOnly
                      className="w-full p-2.5 pr-8 rounded-lg border border-gray-300 text-sm font-bold bg-white cursor-pointer focus:ring-2 focus:ring-teal-500 outline-none"
                      value={repProducto?.nombre || ''}
                      placeholder="Todos los productos..."
                      onClick={() => setIsReportProductModalOpen(true)}
                    />
                    {repProducto ? (
                      <button
                        type="button"
                        onClick={() => { setRepProducto(null); setRepPage(1); }}
                        className="absolute right-2 top-3 text-gray-400 hover:text-red-500"
                        title="Quitar filtro de producto"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <Search className="absolute right-2.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  {(repTipo || repFechaDesde || repFechaHasta || repProducto) && (
                    <button type="button" onClick={limpiarFiltrosReporte} className="text-xs font-bold text-gray-500 hover:text-red-600">
                      Limpiar filtros
                    </button>
                  )}
                  <span className="text-xs font-bold text-gray-400">
                    {repTotal} movimiento{repTotal === 1 ? '' : 's'} encontrado{repTotal === 1 ? '' : 's'}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isPrintingReport || repTotal === 0}
                  onClick={handlePrintReporte}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-bold shadow-sm flex items-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPrintingReport ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Printer className="w-4 h-4 mr-2" />
                  )}
                  Imprimir PDF
                </button>
              </div>

              {/* Tabla resultados */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-800 text-xs font-black uppercase">
                    <tr>
                      <th className="p-3 border-b">Fecha</th>
                      <th className="p-3 border-b">Tipo</th>
                      <th className="p-3 border-b">Código</th>
                      <th className="p-3 border-b">Descripción</th>
                      <th className="p-3 border-b">Motivo</th>
                      <th className="p-3 border-b text-right">Cantidad</th>
                      <th className="p-3 border-b">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {repLoading && (
                      <tr><td colSpan="7" className="text-center p-8 font-bold text-gray-400">Cargando...</td></tr>
                    )}
                    {!repLoading && repItems.map(m => (
                      <tr key={m.id_mov} className="hover:bg-teal-50/30 transition-colors">
                        <td className="p-3 whitespace-nowrap text-sm text-gray-600 font-medium">
                          {new Date(m.fecha_hora).toLocaleString()}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.tipo === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {m.tipo === 1 ? 'ENTRADA' : 'SALIDA'}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap font-mono text-sm font-bold text-gray-700">{m.producto_codigo}</td>
                        <td className="p-3 text-sm font-bold text-gray-700">{m.producto_nombre}</td>
                        <td className="p-3 text-sm text-gray-600">{m.motivo}</td>
                        <td className="p-3 whitespace-nowrap text-right font-black text-sm text-gray-800">{m.cantidad.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 whitespace-nowrap text-sm text-gray-600">{m.usuario_nombre}</td>
                      </tr>
                    ))}
                    {!repLoading && repItems.length === 0 && (
                      <tr><td colSpan="7" className="text-center p-8 font-bold text-gray-400">No hay movimientos que coincidan con los filtros.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {repTotalPages > 1 && (
                <div className="pt-4 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">Página {repPage} de {repTotalPages}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={repPage <= 1}
                      onClick={() => setRepPage(p => Math.max(1, p - 1))}
                      className="p-2 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {getRepPageNumbers().map((p, idx) => p === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm font-bold">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setRepPage(p)}
                        className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-bold transition-colors ${p === repPage ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={repPage >= repTotalPages}
                      onClick={() => setRepPage(p => Math.min(repTotalPages, p + 1))}
                      className="p-2 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ProductSearchModal
        isOpen={isReportProductModalOpen}
        onClose={() => setIsReportProductModalOpen(false)}
        productos={productos}
        onSelect={(producto) => {
          setRepProducto(producto);
          setRepPage(1);
          setIsReportProductModalOpen(false);
        }}
      />
    </div>
  );
}
