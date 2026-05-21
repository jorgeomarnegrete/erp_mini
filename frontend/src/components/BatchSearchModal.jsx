import React, { useState, useEffect, useRef } from 'react';
import { Database, X, Calendar, Package } from 'lucide-react';

export default function BatchSearchModal({ isOpen, onClose, onSelect, producto }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef(null);

  const lotes = producto?.lotes || [];

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, lotes.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (lotes[selectedIndex]) {
        onSelect(lotes[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen || !producto) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4" onKeyDown={handleKeyDown} tabIndex="-1">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden transform transition-all border-t-4 border-orange-600 outline-none">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-gray-800 flex items-center">
              <Database className="w-5 h-5 mr-2 text-orange-600" />
              Seleccionar Lote
            </h3>
            <p className="text-xs text-gray-500 font-bold uppercase mt-1">Producto: {producto.nombre}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto max-h-[50vh] bg-gray-50">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white shadow-sm text-xs font-black text-gray-400 uppercase">
              <tr>
                <th className="p-4 border-b">Número de Lote</th>
                <th className="p-4 border-b">Vencimiento</th>
                <th className="p-4 border-b text-right">Stock Disponible</th>
              </tr>
            </thead>
            <tbody ref={listRef}>
              {lotes.map((l, index) => (
                <tr
                  key={l.id}
                  onClick={() => onSelect(l)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`cursor-pointer transition-colors border-b border-gray-100 ${
                    index === selectedIndex ? 'bg-orange-50 border-l-4 border-orange-600' : 'hover:bg-gray-100 border-l-4 border-transparent'
                  }`}
                >
                  <td className="p-4 font-bold text-gray-800 flex items-center">
                    <Database className="w-4 h-4 mr-2 text-gray-300" />
                    {l.nro_lote || 'SIN LOTE'}
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-2 text-gray-400" />
                      {l.fecha_vencimiento ? new Date(l.fecha_vencimiento).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`font-black text-sm ${l.cantidad_actual > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {l.cantidad_actual} {producto.unidad}
                    </span>
                  </td>
                </tr>
              ))}
              {lotes.length === 0 && (
                <tr>
                  <td colSpan="3" className="p-12 text-center text-gray-400 font-bold">
                    <div className="flex flex-col items-center">
                      <Package className="w-12 h-12 mb-3 opacity-20" />
                      No hay lotes con stock disponibles para este producto.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer info */}
        <div className="px-6 py-3 bg-gray-100 text-[10px] text-gray-500 font-bold flex justify-between uppercase tracking-widest">
          <span>Flechas para navegar • Enter para seleccionar</span>
          <span>{lotes.length} lotes encontrados</span>
        </div>
      </div>
    </div>
  );
}
