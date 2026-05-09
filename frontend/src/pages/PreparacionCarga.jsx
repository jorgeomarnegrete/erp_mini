import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import * as LucideIcons from 'lucide-react';

export default function PreparacionCarga() {
  const { api } = useAuth();
  const [transportes, setTransportes] = useState([]);
  const [selectedTransporte, setSelectedTransporte] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterFamilia, setFilterFamilia] = useState('Todas');

  useEffect(() => {
    const fetchTransportes = async () => {
      try {
        const res = await api.get('/api/logistica/preparacion/transportes-pendientes');
        setTransportes(res.data);
      } catch (error) {
        console.error('Error fetching transportes:', error);
      }
    };
    fetchTransportes();
  }, []);

  const handleSelectTransporte = async (transporte) => {
    setSelectedTransporte(transporte);
    setLoading(true);
    try {
      const res = await api.get(`/api/logistica/preparacion/${transporte.id}`);
      setItems(res.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (itemId) => {
    try {
      const res = await api.patch(`/api/logistica/preparacion/${itemId}`);
      setItems(prev => prev.map(item => item.id === itemId ? res.data : item));
    } catch (error) {
      alert('Error al actualizar ítem');
    }
  };

  const handleFinalizar = async () => {
    if (!window.confirm('¿Confirmas que la carga está completa? Se limpiará la lista de preparación.')) return;
    try {
      await api.post(`/api/logistica/preparacion/${selectedTransporte.id}/finalizar`);
      setSelectedTransporte(null);
      setItems([]);
      // Recargar transportes
      const res = await api.get('/api/logistica/preparacion/transportes-pendientes');
      setTransportes(res.data);
    } catch (error) {
      alert('Error al finalizar');
    }
  };

  const familias = ['Todas', ...new Set(items.map(i => i.producto?.categoria?.nombre || 'Sin Categoría'))];
  const filteredItems = filterFamilia === 'Todas' 
    ? items 
    : items.filter(i => (i.producto?.categoria?.nombre || 'Sin Categoría') === filterFamilia);

  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = item.producto?.categoria?.nombre || 'Sin Categoría';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const totalPreparado = items.filter(i => i.preparado).length;

  if (!selectedTransporte) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pt-10">
        <div className="text-center">
          <LucideIcons.Truck className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-black text-gray-800">Preparación de Carga</h1>
          <p className="text-gray-500">Selecciona el transporte para iniciar el picking</p>
        </div>

        <div className="grid gap-4">
          {transportes.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border-2 border-dashed border-gray-200 text-center text-gray-400">
              No hay camiones pendientes de carga en este momento.
            </div>
          ) : (
            transportes.map(t => (
              <button
                key={t.id}
                onClick={() => handleSelectTransporte(t)}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <LucideIcons.Package className="w-6 h-6" />
                  </div>
                  <div className="ml-4 text-left">
                    <div className="font-bold text-gray-800 text-lg">{t.nombre}</div>
                    <div className="text-xs text-gray-400 uppercase font-black tracking-widest">{t.codigo_tango || 'S/C'}</div>
                  </div>
                </div>
                <LucideIcons.ChevronRight className="w-6 h-6 text-gray-300" />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header Sticky */}
      <div className="sticky top-0 bg-gray-50/80 backdrop-blur-md z-30 py-4 -mx-4 px-4 flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <button onClick={() => setSelectedTransporte(null)} className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 text-gray-600">
            <LucideIcons.ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-black text-gray-800 uppercase">{selectedTransporte.nombre}</h2>
            <div className="text-xs font-bold text-indigo-600">
              {totalPreparado} / {items.length} ÍTEMS PREPARADOS
            </div>
          </div>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Filtro de Familias Scrollable */}
        <div className="flex space-x-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
          {familias.map(f => (
            <button
              key={f}
              onClick={() => setFilterFamilia(f)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border
                ${filterFamilia === f 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' 
                  : 'bg-white text-gray-500 border-gray-200'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 animate-pulse text-gray-400">Generando lista de picking...</div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedItems).map(([cat, catItems]) => (
            <div key={cat} className="space-y-4">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest pl-2 border-l-4 border-indigo-600">
                {cat}
              </h3>
              <div className="grid gap-3">
                {catItems.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => handleToggleItem(item.id)}
                    className={`bg-white p-5 rounded-2xl shadow-sm border-2 transition-all cursor-pointer flex items-center justify-between
                      ${item.preparado 
                        ? 'border-green-500 bg-green-50/30' 
                        : 'border-white hover:border-indigo-100'}`}
                  >
                    <div className="flex-1">
                      <div className={`font-bold text-lg ${item.preparado ? 'text-green-700 line-through' : 'text-gray-800'}`}>
                        {item.producto?.nombre}
                      </div>
                      <div className="flex items-center mt-1">
                        <span className="text-2xl font-black text-gray-900 mr-2">{item.cantidad}</span>
                        <span className="text-xs font-bold text-gray-400 uppercase">Unidades</span>
                      </div>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all
                      ${item.preparado 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-gray-200 text-transparent'}`}>
                      <LucideIcons.Check className="w-8 h-8" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button para Finalizar */}
      <div className="fixed bottom-6 left-0 right-0 px-6 max-w-4xl mx-auto z-40">
        <button
          onClick={handleFinalizar}
          disabled={totalPreparado < items.length || items.length === 0}
          className={`w-full py-4 rounded-2xl font-black text-lg shadow-2xl transition-all flex items-center justify-center
            ${totalPreparado === items.length && items.length > 0
              ? 'bg-green-600 text-white scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
        >
          <LucideIcons.Flag className="w-6 h-6 mr-3" />
          FINALIZAR PREPARACIÓN
        </button>
      </div>
    </div>
  );
}
