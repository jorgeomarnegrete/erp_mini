import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import * as LucideIcons from 'lucide-react';

export default function AsignacionCargas() {
  const { api } = useAuth();
  const [zonas, setZonas] = useState([]);
  const [transportes, setTransportes] = useState([]);
  const [remitos, setRemitos] = useState([]);
  const [selectedZonas, setSelectedZonas] = useState([]);
  const [selectedTransporte, setSelectedTransporte] = useState('');
  const [selectedRemitos, setSelectedRemitos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [showConsolidatedModal, setShowConsolidatedModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [zonasRes, transportesRes] = await Promise.all([
          api.get('/api/zonas'),
          api.get('/api/transportes')
        ]);
        setZonas(zonasRes.data);
        setTransportes(transportesRes.data);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    fetchData();
  }, []);

  const fetchRemitos = async () => {
    if (selectedZonas.length === 0) {
      setRemitos([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      selectedZonas.forEach(id => params.append('zona_ids', id));
      const res = await api.get(`/api/remitos/asignacion/pendientes?${params.toString()}`);
      setRemitos(res.data);
      setSelectedRemitos([]); // Limpiar selección al recargar
    } catch (error) {
      console.error('Error fetching remitos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRemitos();
  }, [selectedZonas]);

  const handleToggleZona = (zonaId) => {
    setSelectedZonas(prev => 
      prev.includes(zonaId) ? prev.filter(id => id !== zonaId) : [...prev, zonaId]
    );
  };

  const handleToggleRemito = (remitoId) => {
    setSelectedRemitos(prev => 
      prev.includes(remitoId) ? prev.filter(id => id !== remitoId) : [...prev, remitoId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRemitos.length === remitos.length) {
      setSelectedRemitos([]);
    } else {
      setSelectedRemitos(remitos.map(r => r.id));
    }
  };

  const handleConfirmAssignment = async () => {
    if (!selectedTransporte) {
      alert('Debes seleccionar un transporte');
      return;
    }
    if (selectedRemitos.length === 0) {
      alert('Debes seleccionar al menos un remito');
      return;
    }

    try {
      await api.post('/api/remitos/asignacion/bulk-transporte', {
        remito_ids: selectedRemitos,
        transporte_id: parseInt(selectedTransporte)
      });
      alert('Transporte asignado correctamente');
      fetchRemitos();
    } catch (error) {
      alert('Error al asignar transporte');
    }
  };

  const getConsolidatedData = () => {
    const selectedData = remitos.filter(r => selectedRemitos.includes(r.id));
    const consolidated = {};

    selectedData.forEach(remito => {
      remito.detalles.forEach(det => {
        const catName = det.producto?.categoria?.nombre || 'Sin Categoría';
        const prodName = det.producto?.nombre || 'Producto Desconocido';
        
        if (!consolidated[catName]) consolidated[catName] = {};
        if (!consolidated[catName][prodName]) consolidated[catName][prodName] = 0;
        
        consolidated[catName][prodName] += det.cantidad;
      });
    });

    return consolidated;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Asignación de Cargas</h1>
          <p className="text-gray-500">Planifica los envíos asignando transportes por zona</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de Filtros */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Zonas de Entrega</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {zonas.map(z => (
                <label key={z.id} className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    checked={selectedZonas.includes(z.id)}
                    onChange={() => handleToggleZona(z.id)}
                  />
                  <span className="ml-3 text-sm text-gray-700 font-medium">{z.nombre}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Transporte a Asignar</h3>
            <select
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={selectedTransporte}
              onChange={(e) => setSelectedTransporte(e.target.value)}
            >
              <option value="">Seleccionar transporte...</option>
              {transportes.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>

            <button
              onClick={() => setShowConsolidatedModal(true)}
              disabled={selectedRemitos.length === 0}
              className={`w-full mt-4 py-2 rounded-lg font-semibold flex items-center justify-center transition-all border
                ${selectedRemitos.length > 0 
                  ? 'border-indigo-600 text-indigo-600 hover:bg-indigo-50' 
                  : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}
            >
              <LucideIcons.BarChart3 className="w-4 h-4 mr-2" />
              Vista Previa de Carga
            </button>
            
            <button
              onClick={handleConfirmAssignment}
              disabled={selectedRemitos.length === 0 || !selectedTransporte}
              className={`w-full mt-6 py-3 rounded-lg font-bold flex items-center justify-center transition-all shadow-md
                ${selectedRemitos.length > 0 && selectedTransporte 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              <LucideIcons.CheckCircle2 className="w-5 h-5 mr-2" />
              Confirmar Asignación
            </button>
          </div>
        </div>

        {/* Tabla de Remitos */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600">
                {selectedRemitos.length} seleccionados de {remitos.length} remitos pendientes
              </span>
              {remitos.length > 0 && (
                <button 
                  onClick={handleSelectAll}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  {selectedRemitos.length === remitos.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                </button>
              )}
            </div>
            
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 w-10"></th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Remito Nº</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Cliente / Razón Social</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Zona</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Fecha</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-400 animate-pulse">Buscando remitos...</td></tr>
                ) : remitos.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                      {selectedZonas.length === 0 ? 'Selecciona una zona para empezar' : 'No hay remitos pendientes en estas zonas'}
                    </td>
                  </tr>
                ) : (
                  remitos.map((r) => (
                    <tr key={r.id} className={`hover:bg-indigo-50/30 transition-colors ${selectedRemitos.includes(r.id) ? 'bg-indigo-50/50' : ''}`}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                          checked={selectedRemitos.includes(r.id)}
                          onChange={() => handleToggleRemito(r.id)}
                        />
                      </td>
                      <td className="px-6 py-4 font-mono text-sm font-bold text-gray-800">
                        {r.punto_venta?.numero.toString().padStart(4, '0')}-{r.numero_comprobante.toString().padStart(8, '0')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-800">{r.cliente?.razon_social}</div>
                        <div className="text-xs text-gray-400">ID: {r.cliente?.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold uppercase">
                          {r.cliente?.zona?.nombre || 'S/Z'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(r.fecha).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setShowDetailModal(r)}
                          className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                          title="Ver Productos"
                        >
                          <LucideIcons.Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Detalle */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-800 px-6 py-4 flex justify-between items-center text-white">
              <div>
                <h2 className="text-xl font-bold">Detalle del Remito</h2>
                <p className="text-xs text-gray-400">Nº {showDetailModal.numero_comprobante}</p>
              </div>
              <button onClick={() => setShowDetailModal(null)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                <LucideIcons.X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4 flex justify-between text-sm">
                <span className="font-bold text-gray-700">Cliente: <span className="font-normal">{showDetailModal.cliente?.razon_social}</span></span>
                <span className="font-bold text-gray-700">Total: <span className="font-normal text-indigo-600 font-bold">$ {showDetailModal.total.toFixed(2)}</span></span>
              </div>
              
              <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-200 text-gray-700 font-bold">
                    <tr>
                      <th className="px-4 py-2">Producto</th>
                      <th className="px-4 py-2 text-right">Cant.</th>
                      <th className="px-4 py-2 text-right">P. Unit</th>
                      <th className="px-4 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {showDetailModal.detalles.map(det => (
                      <tr key={det.id}>
                        <td className="px-4 py-2 font-medium">{det.producto?.nombre}</td>
                        <td className="px-4 py-2 text-right font-bold">{det.cantidad}</td>
                        <td className="px-4 py-2 text-right">$ {det.precio_unitario.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-bold">$ {det.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 flex justify-end">
              <button
                onClick={() => setShowDetailModal(null)}
                className="px-6 py-2 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Carga Consolidada */}
      {showConsolidatedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-700 px-6 py-4 flex justify-between items-center text-white">
              <div>
                <h2 className="text-xl font-bold">Resumen de Carga Consolidada</h2>
                <p className="text-xs text-indigo-200">{selectedRemitos.length} remitos seleccionados</p>
              </div>
              <button onClick={() => setShowConsolidatedModal(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                <LucideIcons.X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {Object.keys(getConsolidatedData()).length === 0 ? (
                <p className="text-center text-gray-400 py-8">No hay productos seleccionados</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(getConsolidatedData()).map(([cat, products]) => (
                    <div key={cat} className="space-y-2">
                      <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-1">
                        {cat}
                      </h3>
                      <div className="space-y-1">
                        {Object.entries(products).map(([prod, qty]) => (
                          <div key={prod} className="flex justify-between items-center py-1 group">
                            <span className="text-sm text-gray-700 font-medium group-hover:text-indigo-600 transition-colors">{prod}</span>
                            <span className="text-sm font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
                              {qty}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 p-4 flex justify-end">
              <button
                onClick={() => setShowConsolidatedModal(false)}
                className="px-8 py-2 bg-indigo-700 text-white rounded-lg font-bold hover:bg-indigo-800 transition-colors shadow-lg"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
