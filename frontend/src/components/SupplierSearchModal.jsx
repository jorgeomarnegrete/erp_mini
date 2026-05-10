import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Truck } from 'lucide-react';

export default function SupplierSearchModal({ isOpen, onClose, onSelect, proveedores }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter suppliers by tokens (documento, razon_social, nombre_fantasia)
  const filteredSuppliers = proveedores.filter((p) => {
    if (!searchTerm.trim()) return true;
    const tokens = searchTerm.toLowerCase().split(/\s+/);
    const textToSearch = `${p.documento} ${p.razon_social} ${p.nombre_fantasia || ''}`.toLowerCase();
    return tokens.every((token) => textToSearch.includes(token));
  });

  // Limit max results for performance
  const displaySuppliers = filteredSuppliers.slice(0, 50);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, displaySuppliers.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displaySuppliers[selectedIndex]) {
        onSelect(displaySuppliers[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex];
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden transform transition-all border-t-4 border-emerald-600">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-black text-gray-800 flex items-center">
            <Truck className="w-5 h-5 mr-2 text-emerald-600" />
            Búsqueda Avanzada de Proveedor
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-100">
          <input
            ref={inputRef}
            type="text"
            className="w-full p-3 rounded-xl border-2 border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 text-lg font-medium text-gray-700 shadow-inner"
            placeholder="Buscar por CUIT, Razón Social o tokens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto max-h-[50vh] bg-gray-50">
          <ul ref={listRef} className="divide-y divide-gray-100">
            {displaySuppliers.map((p, index) => (
              <li
                key={p.id}
                onClick={() => onSelect(p)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`p-3 cursor-pointer flex justify-between items-center transition-colors ${
                  index === selectedIndex ? 'bg-emerald-100/60 border-l-4 border-emerald-600' : 'hover:bg-gray-100 border-l-4 border-transparent'
                }`}
              >
                <div>
                  <span className="font-mono text-sm font-bold text-gray-500 mr-3">[{p.documento}]</span>
                  <span className="font-bold text-gray-800">{p.razon_social}</span>
                  {p.nombre_fantasia && (
                    <span className="ml-2 text-xs text-gray-400 italic">({p.nombre_fantasia})</span>
                  )}
                </div>
                <div className="text-right text-xs text-gray-400 font-bold">
                  {p.localidad || 'Sin Localidad'}
                </div>
              </li>
            ))}
            {displaySuppliers.length === 0 && (
              <div className="p-8 text-center text-gray-400 font-bold">
                No se encontraron coincidencias...
              </div>
            )}
          </ul>
        </div>
        
        {/* Footer info */}
        <div className="px-6 py-2 bg-gray-100 text-xs text-gray-500 font-medium flex justify-between">
          <span>Utiliza <kbd className="bg-white border px-1 rounded shadow-sm">↑</kbd> <kbd className="bg-white border px-1 rounded shadow-sm">↓</kbd> para navegar y <kbd className="bg-white border px-1 rounded shadow-sm">Enter</kbd> para seleccionar.</span>
          <span>{filteredSuppliers.length} resultados</span>
        </div>
      </div>
    </div>
  );
}
