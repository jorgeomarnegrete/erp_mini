import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function ProductSearchModal({ isOpen, onClose, onSelect, productos }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter products by tokens
  const filteredProducts = productos.filter((p) => {
    if (!searchTerm.trim()) return true;
    const tokens = searchTerm.toLowerCase().split(/\s+/);
    const textToSearch = `${p.codigo_interno} ${p.nombre}`.toLowerCase();
    return tokens.every((token) => textToSearch.includes(token));
  });

  // Limit max results for performance
  const displayProducts = filteredProducts.slice(0, 50);

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
      setSelectedIndex((prev) => Math.min(prev + 1, displayProducts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayProducts[selectedIndex]) {
        onSelect(displayProducts[selectedIndex]);
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden transform transition-all border-t-4 border-teal-600">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-black text-gray-800 flex items-center">
            <Search className="w-5 h-5 mr-2 text-teal-600" />
            Búsqueda Avanzada de Producto
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
            className="w-full p-3 rounded-xl border-2 border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/20 text-lg font-medium text-gray-700 shadow-inner"
            placeholder="Buscar por código, descripción, tokens (ej: clavo 2p)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto max-h-[50vh] bg-gray-50">
          <ul ref={listRef} className="divide-y divide-gray-100">
            {displayProducts.map((p, index) => (
              <li
                key={p.id}
                onClick={() => onSelect(p)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`p-3 cursor-pointer flex justify-between items-center transition-colors ${
                  index === selectedIndex ? 'bg-teal-100/60 border-l-4 border-teal-600' : 'hover:bg-gray-100 border-l-4 border-transparent'
                }`}
              >
                <div>
                  <span className="font-mono text-sm font-bold text-gray-500 mr-3">[{p.codigo_interno}]</span>
                  <span className="font-bold text-gray-800">{p.nombre}</span>
                </div>
                {p.stock_actual !== undefined && (
                  <span className="text-xs font-bold bg-white px-2 py-1 rounded shadow-sm text-gray-500 border">
                    Stock actual: {p.stock_actual}
                  </span>
                )}
              </li>
            ))}
            {displayProducts.length === 0 && (
              <div className="p-8 text-center text-gray-400 font-bold">
                No se encontraron coincidencias...
              </div>
            )}
          </ul>
        </div>
        
        {/* Footer info */}
        <div className="px-6 py-2 bg-gray-100 text-xs text-gray-500 font-medium flex justify-between">
          <span>Utiliza <kbd className="bg-white border px-1 rounded shadow-sm">↑</kbd> <kbd className="bg-white border px-1 rounded shadow-sm">↓</kbd> para navegar y <kbd className="bg-white border px-1 rounded shadow-sm">Enter</kbd> para seleccionar.</span>
          <span>{filteredProducts.length} resultados</span>
        </div>
      </div>
    </div>
  );
}
