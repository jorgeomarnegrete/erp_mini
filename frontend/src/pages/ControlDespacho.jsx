import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import * as LucideIcons from 'lucide-react';

export default function ControlDespacho() {
  const { api } = useAuth();
  const [transportes, setTransportes] = useState([]);
  const [selectedTransporte, setSelectedTransporte] = useState(null);
  const [carga, setCarga] = useState([]);
  const [scannedItems, setScannedItems] = useState({}); // {producto_id: cantidad}
  const [lastScanned, setLastScanned] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [scanBuffer, setScanBuffer] = useState('');
  
  const scanInputRef = useRef(null);

  useEffect(() => {
    const fetchTransportes = async () => {
      try {
        const res = await api.get('/api/logistica/control/transportes-listos');
        setTransportes(res.data);
      } catch (error) {
        console.error('Error fetching transportes:', error);
      }
    };
    fetchTransportes();
  }, []);

  // Mantener el foco en el input invisible para el escáner
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedTransporte && scanInputRef.current) {
        scanInputRef.current.focus();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedTransporte]);

  const handleSelectTransporte = async (transporte) => {
    setSelectedTransporte(transporte);
    setLoading(true);
    try {
      const res = await api.get(`/api/logistica/control/${transporte.id}/carga`);
      setCarga(res.data);
      setScannedItems({});
      setLastScanned(null);
      setErrorMsg(null);
    } catch (error) {
      console.error('Error fetching carga:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (e) => {
    if (e.key === 'Enter') {
      const productId = parseInt(scanBuffer);
      processScan(productId);
      setScanBuffer('');
    } else if (/^\d$/.test(e.key)) {
      setScanBuffer(prev => prev + e.key);
    }
  };

  const processScan = (productId) => {
    const expectedItem = carga.find(c => c.producto_id === productId);
    
    if (!expectedItem) {
      setErrorMsg(`Producto ID ${productId} no pertenece a este transporte`);
      playAudio('error');
      return;
    }

    const currentScanned = scannedItems[productId] || 0;
    if (currentScanned >= expectedItem.cantidad_esperada) {
      setErrorMsg(`Límite alcanzado para: ${expectedItem.nombre}`);
      playAudio('error');
      return;
    }

    setScannedItems(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
    setLastScanned(expectedItem);
    setErrorMsg(null);
    playAudio('success');
  };

  const playAudio = (type) => {
    // Implementación simple de feedback auditivo
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  };

  const handleConfirmar = async () => {
    if (!window.confirm('¿Confirmas que el despacho es correcto? Se actualizará el stock físico.')) return;
    
    const payload = {
      transporte_id: selectedTransporte.id,
      items_escaneados: Object.entries(scannedItems).map(([id, cant]) => ({
        producto_id: parseInt(id),
        cantidad: cant
      }))
    };

    try {
      await api.post('/api/logistica/control/confirmar', payload);
      alert('Despacho finalizado con éxito. Stock actualizado.');
      setSelectedTransporte(null);
      const res = await api.get('/api/logistica/control/transportes-listos');
      setTransportes(res.data);
    } catch (error) {
      alert('Error al confirmar despacho');
    }
  };

  const isComplete = carga.every(c => (scannedItems[c.producto_id] || 0) === c.cantidad_esperada);

  if (!selectedTransporte) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pt-10 px-4">
        <div className="text-center">
          <LucideIcons.ScanBarcode className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-black text-gray-800 tracking-tighter">Control de Despacho</h1>
          <p className="text-gray-500 font-medium">Escaneo final de mercadería en planta</p>
        </div>

        <div className="grid gap-4">
          {transportes.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-200 text-center text-gray-400">
              No hay transportes listos para despacho.
            </div>
          ) : (
            transportes.map(t => (
              <button
                key={t.id}
                onClick={() => handleSelectTransporte(t)}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-indigo-400 hover:shadow-xl transition-all group"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <LucideIcons.Truck className="w-6 h-6" />
                  </div>
                  <div className="ml-4 text-left">
                    <div className="font-black text-gray-800 text-lg uppercase">{t.nombre}</div>
                    <div className="text-xs font-bold text-indigo-600 tracking-widest">{t.codigo_tango || 'S/C'}</div>
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
    <div className="max-w-4xl mx-auto space-y-6 pb-24 px-4 h-full overflow-hidden flex flex-col">
      {/* Input invisible para captura de escáner */}
      <input
        ref={scanInputRef}
        type="text"
        className="opacity-0 absolute -z-10"
        onKeyDown={handleScan}
        autoFocus
      />

      <div className="flex justify-between items-center py-4">
        <button onClick={() => setSelectedTransporte(null)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-600">
          <LucideIcons.ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{selectedTransporte.nombre}</h2>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">CONTROL DE SALIDA</span>
        </div>
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
          <LucideIcons.Scan className="w-5 h-5 animate-pulse" />
        </div>
      </div>

      {/* Visor de Último Escaneado */}
      <div className={`p-8 rounded-3xl shadow-lg border-4 transition-all text-center
        ${errorMsg ? 'bg-red-50 border-red-200' : lastScanned ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-gray-100 border-gray-200'}`}>
        {errorMsg ? (
          <div className="space-y-2">
            <LucideIcons.AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <div className="text-xl font-black text-red-600">{errorMsg}</div>
          </div>
        ) : lastScanned ? (
          <div className="animate-in fade-in zoom-in duration-300">
            <div className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">ÚLTIMO ESCANEADO</div>
            <div className="text-3xl font-black leading-none">{lastScanned.nombre}</div>
            <div className="text-5xl font-black mt-2">
              {scannedItems[lastScanned.producto_id]} <span className="text-lg opacity-60">/ {lastScanned.cantidad_esperada}</span>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 font-bold text-xl py-6">ESPERANDO ESCANEO...</div>
        )}
      </div>

      {/* Lista de Control */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white rounded-3xl shadow-sm border border-gray-100">
        <div className="divide-y divide-gray-100">
          {carga.map(item => {
            const count = scannedItems[item.producto_id] || 0;
            const isDone = count === item.cantidad_esperada;
            return (
              <div key={item.producto_id} className={`p-6 flex items-center justify-between transition-colors ${isDone ? 'bg-green-50' : ''}`}>
                <div>
                  <div className={`font-bold ${isDone ? 'text-green-700' : 'text-gray-800'}`}>{item.nombre}</div>
                  <div className="text-xs text-gray-400 font-mono">ID: {item.producto_id}</div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className={`text-2xl font-black ${isDone ? 'text-green-600' : 'text-gray-900'}`}>
                      {count} <span className="text-sm text-gray-400">/ {item.cantidad_esperada}</span>
                    </div>
                  </div>
                  {isDone && <LucideIcons.CheckCircle2 className="w-8 h-8 text-green-500" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer con Botón de Confirmación */}
      <div className="fixed bottom-6 left-0 right-0 px-6 max-w-4xl mx-auto z-40">
        <button
          onClick={handleConfirmar}
          disabled={!isComplete || loading}
          className={`w-full py-5 rounded-2xl font-black text-xl shadow-2xl transition-all flex items-center justify-center
            ${isComplete && !loading
              ? 'bg-indigo-600 text-white scale-105 active:scale-95'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
        >
          <LucideIcons.CheckCircle className="w-6 h-6 mr-3" />
          CONFIRMAR Y DESCONTAR STOCK
        </button>
      </div>
    </div>
  );
}
