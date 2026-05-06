import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../App';
import { PackageOpen, Plus, Trash2, Save, Search } from 'lucide-react';
import ProductSearchModal from '../components/ProductSearchModal';

export default function AjustesStock() {
  const { api } = useAuth();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [head, setHead] = useState({ tipo: 1, motivo: '' });
  const [detalles, setDetalles] = useState([
    { temp_id: Date.now(), producto_id: '', codigo: '', nombre: '', cantidad: 1, unidad: '' }
  ]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState(null);

  // Referencias para manejar el foco dinámico
  const quantityRefs = useRef({});

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
    setDetalles((prev) => [...prev, { temp_id: Date.now(), producto_id: '', codigo: '', nombre: '', cantidad: 1, unidad: '' }]);
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
      // Si el modal está abierto, ignorar
      if (isModalOpen) return;

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
  }, [addRow, isModalOpen, detalles]);

  const handleProductSelect = (producto) => {
    if (activeRowId) {
      setDetalles((prev) =>
        prev.map((d) => {
          if (d.temp_id === activeRowId) {
            return {
              ...d,
              producto_id: producto.id,
              codigo: producto.codigo_interno,
              nombre: producto.nombre,
              unidad: producto.unidad || '',
            };
          }
          return d;
        })
      );
      // Cerrar modal
      setIsModalOpen(false);
      
      // Pasar el foco a la cantidad usando setTimeout para dar tiempo al render reactivo
      setTimeout(() => {
        if (quantityRefs.current[activeRowId]) {
          quantityRefs.current[activeRowId].focus();
          quantityRefs.current[activeRowId].select();
        }
      }, 100);
      setActiveRowId(null);
    }
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

    setIsSaving(true);
    try {
      const payload = {
        tipo: parseInt(head.tipo),
        motivo: head.motivo,
        items: cleanDetalles.map((d) => ({
          id_producto: d.producto_id,
          cantidad: parseFloat(d.cantidad),
        })),
      };

      await api.post('/api/stk-mov', payload);
      setSuccessMsg('Movimiento de stock guardado exitosamente.');
      
      // Reset form
      setHead({ tipo: 1, motivo: '' });
      setDetalles([{ temp_id: Date.now(), producto_id: '', codigo: '', nombre: '', cantidad: 1, unidad: '' }]);
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
    </div>
  );
}
