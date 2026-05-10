import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { ScanBarcode, Truck, ClipboardList, Package, CheckCircle2, Printer, X, Info } from 'lucide-react';
import SupplierSearchModal from '../components/SupplierSearchModal';

export default function IngresoStock() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [remitosPendientes, setRemitosPendientes] = useState([]);
  
  // Selección
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedRemito, setSelectedRemito] = useState(null);
  
  // Estado de Control
  const [items, setItems] = useState([]);
  const [scanValue, setScanValue] = useState('');
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  const scanInputRef = useRef(null);

  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        const resProv = await api.get('/api/proveedores');
        setProveedores(resProv.data);
      } catch (error) {
        console.error("Error al cargar proveedores:", error);
      }
    };
    fetchBaseData();
  }, [api]);

  const fetchRemitosPendientes = async (proveedorId) => {
    try {
      const res = await api.get('/api/remitos-compra/control/pendientes');
      // Filtrar por proveedor
      setRemitosPendientes(res.data.filter(r => r.proveedor_id === proveedorId));
    } catch (error) {
      console.error("Error al cargar remitos pendientes:", error);
    }
  };

  const handleSelectSupplier = (prov) => {
    setSelectedSupplier(prov);
    setSelectedRemito(null);
    setItems([]);
    setIsSupplierModalOpen(false);
    fetchRemitosPendientes(prov.id);
  };

  const handleSelectRemito = (remito) => {
    setSelectedRemito(remito);
    // Agrupar y ordenar por familia (categoría)
    const sortedItems = [...remito.detalles].sort((a, b) => {
      const catA = a.producto?.categoria?.nombre || '';
      const catB = b.producto?.categoria?.nombre || '';
      return catA.localeCompare(catB);
    });
    setItems(sortedItems);
    setTimeout(() => scanInputRef.current?.focus(), 200);
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanValue || !selectedRemito) return;

    const productoId = parseInt(scanValue);
    setScanValue('');

    try {
      setFeedback({ message: 'Procesando...', type: 'info' });
      const res = await api.post(`/api/remitos-compra/control/escanear-item?remito_id=${selectedRemito.id}&producto_id=${productoId}`);
      
      // Actualizar estado local
      setItems(items.map(item => {
        if (item.producto_id === productoId) {
          return { ...item, cantidad_recibida: res.data.cantidad_recibida };
        }
        return item;
      }));

      setFeedback({ message: '¡Producto ingresado!', type: 'success' });
      // Play a success sound if needed
    } catch (error) {
      setFeedback({ message: error.response?.data?.detail || 'Error al escanear', type: 'error' });
    }
  };

  // Mantener el foco en el input para lectores de mano
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedRemito && document.activeElement !== scanInputRef.current) {
        scanInputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedRemito]);

  // Agrupar items por categoría para la UI
  const groupedItems = items.reduce((groups, item) => {
    const category = item.producto?.categoria?.nombre || 'Sin Categoría';
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
    return groups;
  }, {});

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 flex items-center">
            <ScanBarcode className="w-10 h-10 mr-4 text-emerald-600" />
            Control de Ingreso
          </h2>
          <p className="text-gray-500 font-bold uppercase text-xs tracking-widest mt-1">Recepción y Validación de Mercadería</p>
        </div>
        {selectedRemito && (
          <button 
            onClick={() => setIsLabelModalOpen(true)}
            className="bg-white border-2 border-slate-800 text-slate-800 px-6 py-2.5 rounded-xl font-bold flex items-center hover:bg-slate-50 transition-all shadow-sm"
          >
            <Printer className="w-5 h-5 mr-2" /> Etiquetas Zebra
          </button>
        )}
      </div>

      {/* Selectores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
           <label className="block text-xs font-black text-gray-400 uppercase mb-2">1. Seleccionar Proveedor</label>
           <button 
             onClick={() => setIsSupplierModalOpen(true)}
             className="w-full p-4 bg-emerald-50 text-emerald-800 rounded-xl font-bold border-2 border-dashed border-emerald-200 flex justify-between items-center hover:bg-emerald-100 transition-all"
           >
             <span className="flex items-center"><Truck className="w-5 h-5 mr-3" /> {selectedSupplier?.razon_social || 'Seleccionar Proveedor...'}</span>
             <ClipboardList className="w-5 h-5 opacity-50" />
           </button>
        </div>

        <div className={`bg-white p-6 rounded-2xl shadow-xl border border-gray-100 transition-opacity ${!selectedSupplier ? 'opacity-50 pointer-events-none' : ''}`}>
           <label className="block text-xs font-black text-gray-400 uppercase mb-2">2. Seleccionar Remito</label>
           <select 
             className="w-full p-4 bg-gray-50 rounded-xl border-2 border-gray-200 font-bold outline-none focus:border-emerald-500 transition-all"
             value={selectedRemito?.id || ''}
             onChange={(e) => handleSelectRemito(remitosPendientes.find(r => r.id === parseInt(e.target.value)))}
           >
             <option value="">Seleccione un remito pendiente...</option>
             {remitosPendientes.map(r => (
               <option key={r.id} value={r.id}>Remito {r.numero_remito} ({new Date(r.fecha).toLocaleDateString()})</option>
             ))}
           </select>
        </div>
      </div>

      {/* Zona de Escaneo */}
      {selectedRemito && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-emerald-600 p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center gap-6 border-b-8 border-emerald-800">
             <div className="bg-white/20 p-4 rounded-2xl text-white">
                <ScanBarcode className="w-12 h-12" />
             </div>
             <div className="flex-1 text-center md:text-left">
                <h3 className="text-white text-2xl font-black">Esperando Lectura...</h3>
                <p className="text-emerald-100 font-bold text-sm">Escanee el código de barras (ID) del producto</p>
             </div>
             <form onSubmit={handleScan} className="w-full md:w-auto">
                <input 
                  ref={scanInputRef}
                  type="text" 
                  className="w-full md:w-64 p-4 rounded-2xl bg-white border-4 border-emerald-400 shadow-inner font-mono text-2xl text-center outline-none focus:ring-4 focus:ring-white/30"
                  placeholder="ID..."
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                />
             </form>
          </div>

          {feedback.message && (
            <div className={`p-4 rounded-2xl font-bold flex items-center justify-center gap-3 animate-bounce ${
              feedback.type === 'success' ? 'bg-green-100 text-green-700 border-2 border-green-200' : 
              feedback.type === 'error' ? 'bg-red-100 text-red-700 border-2 border-red-200' : 
              'bg-blue-100 text-blue-700 border-2 border-blue-200'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              {feedback.message}
            </div>
          )}

          {/* Listado por Familias */}
          <div className="space-y-6">
            {Object.keys(groupedItems).map(category => (
              <div key={category} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center">
                  <Package className="w-4 h-4 mr-2 text-slate-400" />
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Familia: {category}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {groupedItems[category].map(item => (
                    <div key={item.id} className={`p-6 flex flex-col md:flex-row items-center gap-4 transition-colors ${item.cantidad_recibida >= item.cantidad ? 'bg-green-50/50' : ''}`}>
                      <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-slate-400 font-bold text-xs">
                        ID: {item.producto_id}
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <h4 className="text-lg font-black text-gray-800">{item.producto?.nombre}</h4>
                        <p className="text-sm text-gray-400 font-bold uppercase">{item.producto?.codigo_interno}</p>
                      </div>
                      <div className="w-full md:w-64">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-black text-gray-400 uppercase">Progreso</span>
                            <span className="text-sm font-black text-emerald-600">{item.cantidad_recibida} / {item.cantidad}</span>
                         </div>
                         <div className="h-4 bg-gray-100 rounded-full overflow-hidden border">
                            <div 
                              className={`h-full transition-all duration-500 ${item.cantidad_recibida >= item.cantidad ? 'bg-green-500' : 'bg-emerald-500'}`} 
                              style={{ width: `${(item.cantidad_recibida / item.cantidad) * 100}%` }}
                            ></div>
                         </div>
                      </div>
                      <div className="hidden md:block">
                        {item.cantidad_recibida >= item.cantidad ? (
                          <CheckCircle2 className="w-8 h-8 text-green-500" />
                        ) : (
                          <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modales */}
      <SupplierSearchModal 
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        proveedores={proveedores}
        onSelect={handleSelectSupplier}
      />

      {/* Modal Etiquetas Zebra (Placeholder) */}
      {isLabelModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-t-8 border-slate-800">
            <div className="p-8 text-center">
               <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Printer className="w-10 h-10 text-slate-800" />
               </div>
               <h3 className="text-2xl font-black text-gray-800 mb-2">Impresión Zebra</h3>
               <p className="text-gray-500 font-medium leading-relaxed">
                  Este es un marcador de posición para la integración futura con impresoras térmicas **Zebra**.
               </p>
               <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Próximos Pasos</p>
                  <ul className="text-xs text-slate-600 space-y-2 font-bold">
                    <li className="flex items-center"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div> Configuración de puerto RAW/IP</li>
                    <li className="flex items-center"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div> Diseño de etiquetas ZPL/EPL</li>
                    <li className="flex items-center"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div> Calibración de sensor de etiquetas</li>
                  </ul>
               </div>
            </div>
            <div className="bg-gray-50 p-6 flex justify-center">
               <button 
                 onClick={() => setIsLabelModalOpen(false)}
                 className="bg-slate-800 text-white px-12 py-3 rounded-2xl font-black shadow-lg hover:bg-slate-900 transition-all"
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
