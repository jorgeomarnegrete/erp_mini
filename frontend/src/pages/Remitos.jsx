import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { Truck, Plus, Trash2, X, Save, Search, ClipboardList, Package, Printer, FileText } from 'lucide-react';
import ProductSearchModal from '../components/ProductSearchModal';
import ClientSearchModal from '../components/ClientSearchModal';

export default function Remitos() {
  const { api } = useAuth();
  const [remitos, setRemitos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Catálogos
  const [clientes, setClientes] = useState([]);
  const [puntosVenta, setPuntosVenta] = useState([]);
  const [productos, setProductos] = useState([]);

  // Estados Modal Crear
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados para Búsqueda Avanzada
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPedidoModalOpen, setIsPedidoModalOpen] = useState(false);
  const [pedidosPendientes, setPedidosPendientes] = useState([]);
  
  const [activeRowId, setActiveRowId] = useState(null);
  const quantityRefs = useRef({});
  const productRefs = useRef({});

  // Estado del Formulario Maestro
  const [head, setHead] = useState({
    punto_venta_id: '',
    cliente_id: '',
    pedido_id: '',
    descuenta_stock: true,
    observaciones: '',
    total: 0
  });

  // Estado de los Renglones (Detalle)
  const [detalles, setDetalles] = useState([
    { temp_id: Date.now(), producto_id: '', id_pedido_detalle: null, cantidad: 1, precio_unitario: 0, subtotal: 0 }
  ]);

  const fetchData = async () => {
    try {
      const [resRem, resCli, resPv, resProd] = await Promise.all([
        api.get('/api/remitos'),
        api.get('/api/clientes'),
        api.get('/api/puntos-venta'),
        api.get('/api/productos')
      ]);
      setRemitos(resRem.data);
      setClientes(resCli.data);
      setPuntosVenta(resPv.data.filter(pv => pv.activo));
      setProductos(resProd.data.filter(p => p.activo));
    } catch (error) {
      console.error("Error al traer datos:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [api]);

  // Atajos de teclado
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (!isModalOpen) return;
      if (isClientModalOpen || isProductModalOpen || isPedidoModalOpen) return;

      if (e.key === 'Insert') {
        e.preventDefault();
        addDetalle();
      }

      if (e.key === 'F2') {
        e.preventDefault();
        if (document.activeElement.id === 'input-cliente') {
          setIsClientModalOpen(true);
        } else {
          setIsProductModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isModalOpen, isClientModalOpen, isProductModalOpen, isPedidoModalOpen, detalles]);

  const openModal = () => {
    setHead({
      punto_venta_id: puntosVenta.length > 0 ? puntosVenta[0].id : '',
      cliente_id: '',
      pedido_id: '',
      descuenta_stock: true,
      observaciones: '',
      total: 0
    });
    setDetalles([{ temp_id: Date.now(), producto_id: '', id_pedido_detalle: null, cantidad: 1, precio_unitario: 0, subtotal: 0 }]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const addDetalle = () => {
    const newId = Date.now();
    setDetalles([...detalles, { temp_id: newId, producto_id: '', id_pedido_detalle: null, cantidad: 1, precio_unitario: 0, subtotal: 0 }]);
    setTimeout(() => {
       setActiveRowId(newId);
       productRefs.current[newId]?.focus();
    }, 100);
  };

  const removeDetalle = (temp_id) => {
    setDetalles(detalles.filter(d => d.temp_id !== temp_id));
  };

  const updateDetalle = (temp_id, field, value) => {
    setDetalles(detalles.map(d => {
      if (d.temp_id === temp_id) {
        const newData = { ...d, [field]: value };
        
        if (field === 'producto_id') {
           const prod = typeof value === 'object' ? value : productos.find(p => p.id === parseInt(value));
           if (prod) {
              newData.producto_id = prod.id;
              newData.precio_unitario = prod.costo_neto || 0; // Por defecto costo o precio sugerido
              newData.subtotal = newData.cantidad * newData.precio_unitario;
              
              setTimeout(() => {
                 quantityRefs.current[temp_id]?.focus();
                 quantityRefs.current[temp_id]?.select();
              }, 100);
           }
        }

        if (field === 'cantidad' || field === 'precio_unitario') {
           newData.subtotal = newData.cantidad * newData.precio_unitario;
        }

        return newData;
      }
      return d;
    }));
  };

  const calculateTotal = () => {
    return detalles.reduce((acc, d) => acc + (d.cantidad * d.precio_unitario), 0);
  };

  const fetchPedidosPendientes = async (cliente_id) => {
    try {
      const res = await api.get(`/api/remitos/pendientes-cliente/${cliente_id}`);
      setPedidosPendientes(res.data);
    } catch (error) {
      console.error("Error al buscar pedidos pendientes:", error);
    }
  };

  const loadFromPedido = (pedido) => {
    setHead({ ...head, pedido_id: pedido.id });
    const newDetalles = pedido.detalles
      .filter(det => (det.cantidad - det.entregado) > 0)
      .map(det => ({
        temp_id: Date.now() + Math.random(),
        producto_id: det.producto_id,
        id_pedido_detalle: det.id,
        cantidad: det.cantidad - det.entregado,
        precio_unitario: det.precio_unitario,
        subtotal: (det.cantidad - det.entregado) * det.precio_unitario
      }));
    
    if (newDetalles.length > 0) {
      setDetalles(newDetalles);
    } else {
      alert("Este pedido no tiene saldos pendientes.");
    }
    setIsPedidoModalOpen(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!head.punto_venta_id || !head.cliente_id) {
      setErrorMsg("Debes seleccionar Cliente y Punto de Venta.");
      return;
    }
    const cleanDetalles = detalles.filter(d => d.producto_id);
    if (cleanDetalles.length === 0) {
      setErrorMsg("Debes añadir al menos un producto.");
      return;
    }

    setIsSaving(true);
    try {
      const totalDoc = calculateTotal();
      const payload = {
        punto_venta_id: head.punto_venta_id,
        cliente_id: head.cliente_id,
        pedido_id: head.pedido_id || null,
        descuenta_stock: head.descuenta_stock,
        observaciones: head.observaciones,
        total: totalDoc,
        detalles: cleanDetalles.map(d => ({
           producto_id: parseInt(d.producto_id),
           id_pedido_detalle: d.id_pedido_detalle,
           cantidad: d.cantidad,
           precio_unitario: d.precio_unitario,
           subtotal: d.cantidad * d.precio_unitario
        }))
      };

      await api.post('/api/remitos', payload);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Error al guardar remito");
    }
    setIsSaving(false);
  };

  const handlePrint = async (remito_id) => {
    try {
      const response = await api.get(`/api/remitos/${remito_id}/pdf`, { responseType: 'blob' });
      const fileURL = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      
      const pdfWindow = window.open("", "_blank");
      if (pdfWindow) {
         pdfWindow.document.write(`
            <html>
              <head>
                <title>Visor PDF - Remito</title>
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
      alert("No se pudo generar el PDF del remito.");
    }
  };

  if (loading) return <div className="p-8 text-center font-bold text-gray-500">Cargando...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden pb-12">
      <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-emerald-600 p-2 rounded-lg text-white mr-4 shadow-md">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Remitos</h2>
            <p className="text-xs text-emerald-600 font-bold tracking-wide uppercase mt-1">Control de Entregas</p>
          </div>
        </div>
        <button onClick={openModal} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md flex items-center transition-all">
          <Plus className="w-5 h-5 mr-2" /> Nuevo Remito
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 font-bold text-xs tracking-wider uppercase border-b border-gray-200">
              <th className="px-8 py-4">Nº Remito</th>
              <th className="px-8 py-4">Fecha</th>
              <th className="px-8 py-4">Cliente</th>
              <th className="px-8 py-4">Stock</th>
              <th className="px-8 py-4 text-right">Total</th>
              <th className="px-8 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {remitos.map((r) => (
              <tr key={r.id} className="hover:bg-emerald-50/30 transition-colors">
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="font-mono font-bold text-gray-800 text-sm">
                    RE {String(r.punto_venta?.numero || '0').padStart(4,'0')}-{String(r.numero_comprobante).padStart(8,'0')}
                  </span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                  {new Date(r.fecha).toLocaleDateString()}
                </td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="text-sm font-black text-gray-700">{r.cliente?.razon_social}</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap">
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.descuenta_stock ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                      {r.descuenta_stock ? 'DESCONTADO' : 'PENDIENTE'}
                   </span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-right text-base font-black text-emerald-700">
                  $ {r.total.toLocaleString(undefined, {minimumFractionDigits:2})}
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center">
                   <button 
                     onClick={() => handlePrint(r.id)}
                     className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                     title="Imprimir Remito"
                   >
                      <Printer className="w-5 h-5" />
                   </button>
                </td>
              </tr>
            ))}
            {remitos.length === 0 && (
              <tr><td colSpan="5" className="text-center p-8 font-bold text-gray-400">No hay remitos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ============== MODAL CREACION ============== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] mt-4 mb-4 transform transition-all border-t-8 border-emerald-600">
            
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 rounded-t-xl">
              <h3 className="text-xl font-black text-gray-800 flex items-center">
                <Truck className="w-6 h-6 mr-3 text-emerald-600" />
                Cargar Nuevo Remito
              </h3>
              <div className="flex items-center gap-4">
                 {head.cliente_id && (
                   <button 
                     type="button" 
                     onClick={() => {
                        fetchPedidosPendientes(head.cliente_id);
                        setIsPedidoModalOpen(true);
                     }}
                     className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center border border-blue-200 hover:bg-blue-100 transition-colors"
                   >
                     <ClipboardList className="w-4 h-4 mr-2" /> Cargar desde Pedido
                   </button>
                 )}
                 <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">
                   <X className="w-6 h-6" />
                 </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 font-bold border border-red-200">
                  ⚠️ {errorMsg}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">Punto de Venta *</label>
                   <select className="w-full p-2.5 rounded-lg border border-gray-300 font-bold" value={head.punto_venta_id} onChange={e=>setHead({...head, punto_venta_id: parseInt(e.target.value)})}>
                     {puntosVenta.map(pv => <option key={pv.id} value={pv.id}>[{String(pv.numero).padStart(4,'0')}] {pv.descripcion}</option>)}
                   </select>
                </div>
                <div className="md:col-span-2">
                   <label className="block text-xs font-bold text-gray-500 mb-1">Cliente * <span className="text-[10px] text-emerald-500">(F2 p/ buscar)</span></label>
                   <div className="relative">
                     <input 
                       id="input-cliente"
                       type="text" 
                       readOnly 
                       className="w-full p-2.5 rounded-lg border border-gray-300 font-bold bg-white cursor-pointer focus:ring-2 focus:ring-emerald-500 outline-none"
                       value={clientes.find(c => c.id === head.cliente_id)?.razon_social || ''}
                       placeholder="F2 para buscar cliente..."
                       onClick={() => setIsClientModalOpen(true)}
                     />
                     <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                   </div>
                </div>
                <div className="flex items-center pt-5 pl-4">
                   <label className="flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" 
                        checked={head.descuenta_stock}
                        onChange={e => setHead({...head, descuenta_stock: e.target.checked})}
                      />
                      <span className="ml-3 text-sm font-bold text-gray-700 flex items-center">
                         <Package className="w-4 h-4 mr-1 text-emerald-500" /> Descontar Stock
                      </span>
                   </label>
                </div>
              </div>

              {/* Renglones */}
              <div className="mb-2 flex justify-between items-end">
                 <h4 className="font-black text-gray-700 text-sm uppercase tracking-wide">Artículos a Entregar</h4>
                 <button type="button" onClick={addDetalle} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded flex items-center shadow-sm hover:bg-slate-700">
                   <Plus className="w-4 h-4 mr-1" /> Añadir Renglón
                 </button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-inner">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-100/50 text-slate-800 text-xs font-black uppercase">
                     <tr>
                       <th className="p-3 w-1/2 border-b">Producto</th>
                       <th className="p-3 border-b text-center w-32">Cantidad</th>
                       <th className="p-3 border-b text-right">Precio Ref.</th>
                       <th className="p-3 border-b text-right bg-slate-100">Subtotal</th>
                       <th className="p-3 border-b text-center w-12"></th>
                     </tr>
                   </thead>
                   <tbody>
                     {detalles.map((d) => (
                       <tr key={d.temp_id} className="border-b border-gray-100">
                          <td className="p-2">
                             <div className="relative">
                               <input 
                                 ref={el => productRefs.current[d.temp_id] = el}
                                 type="text"
                                 readOnly
                                 className="w-full p-1.5 rounded border border-gray-300 text-sm font-bold bg-white cursor-pointer focus:ring-2 focus:ring-emerald-500 outline-none"
                                 value={productos.find(p => p.id === d.producto_id)?.nombre || ''}
                                 placeholder="F2 p/ buscar..."
                                 onClick={() => {
                                   setActiveRowId(d.temp_id);
                                   setIsProductModalOpen(true);
                                 }}
                                 onFocus={() => setActiveRowId(d.temp_id)}
                               />
                               <Search className="absolute right-2 top-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                             </div>
                             {d.id_pedido_detalle && (
                               <span className="text-[10px] font-bold text-blue-600 mt-1 block">Vinculado a Pedido</span>
                             )}
                          </td>
                           <td className="p-2">
                             <input 
                               ref={el => quantityRefs.current[d.temp_id] = el}
                               type="number" 
                               min="0.01" 
                               step="0.01" 
                               className="w-full p-1.5 rounded border border-gray-300 text-center font-bold text-sm" 
                               value={d.cantidad} 
                               onChange={e => updateDetalle(d.temp_id, 'cantidad', parseFloat(e.target.value)||0)} 
                             />
                           </td>
                          <td className="p-2">
                             <div className="flex items-center">
                               <span className="text-gray-400 mr-1">$</span>
                               <input type="number" step="0.01" className="w-full p-1.5 rounded border border-gray-300 text-right font-bold text-sm" value={d.precio_unitario} onChange={e => updateDetalle(d.temp_id, 'precio_unitario', parseFloat(e.target.value)||0)} />
                             </div>
                          </td>
                          <td className="p-2 bg-slate-50 text-right font-black text-sm text-slate-700">
                             $ {(d.cantidad * d.precio_unitario).toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </td>
                          <td className="p-2 text-center">
                             <button type="button" onClick={()=>removeDetalle(d.temp_id)} className="text-gray-400 hover:text-red-500">
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                   <label className="block text-xs font-bold text-gray-500 mb-1">Observaciones / Notas de Entrega</label>
                   <textarea rows="4" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-emerald-500 text-sm font-medium" value={head.observaciones} onChange={e=>setHead({...head, observaciones: e.target.value})}></textarea>
                </div>
                <div className="w-full lg:w-1/3 bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm">
                   <div className="pt-3 flex justify-between items-center">
                      <span className="text-xl font-black text-gray-800">Total Doc.</span>
                      <span className="text-2xl font-black text-emerald-600">$ {calculateTotal().toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                   </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end items-center gap-3 rounded-b-xl">
               <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-700 bg-white border shadow-sm rounded-xl font-bold hover:bg-gray-100">
                 Cancelar
               </button>
               <button type="submit" disabled={isSaving} onClick={handleSave} className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-black shadow-lg hover:bg-emerald-700 flex items-center">
                 {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> : <Save className="w-5 h-5 mr-2" />}
                 Generar Remito
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales Auxiliares */}
      <ClientSearchModal 
        isOpen={isClientModalOpen} 
        onClose={() => setIsClientModalOpen(false)}
        clientes={clientes}
        onSelect={(cliente) => {
          setHead({ ...head, cliente_id: cliente.id });
          setIsClientModalOpen(false);
          fetchPedidosPendientes(cliente.id);
        }}
      />

      <ProductSearchModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productos={productos}
        onSelect={(producto) => {
          updateDetalle(activeRowId, 'producto_id', producto);
          setIsProductModalOpen(false);
        }}
      />

      {/* Modal Pedidos Pendientes */}
      {isPedidoModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="p-4 border-b bg-blue-600 text-white flex justify-between items-center">
                 <h4 className="font-bold flex items-center"><ClipboardList className="w-5 h-5 mr-2" /> Pedidos Pendientes</h4>
                 <button onClick={() => setIsPedidoModalOpen(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                 {pedidosPendientes.length === 0 ? (
                    <p className="text-center py-8 text-gray-500 font-bold">No hay pedidos con saldo pendiente para este cliente.</p>
                 ) : (
                    <div className="space-y-3">
                       {pedidosPendientes.map(p => (
                          <div 
                            key={p.id} 
                            onClick={() => loadFromPedido(p)}
                            className="p-4 border rounded-xl hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all flex justify-between items-center"
                          >
                             <div>
                                <p className="font-black text-gray-800">Pedido #{String(p.numero_comprobante).padStart(8,'0')}</p>
                                <p className="text-xs text-gray-500 font-bold">{new Date(p.fecha).toLocaleDateString()} - {p.estado}</p>
                             </div>
                             <div className="text-right">
                                <p className="font-black text-blue-700">$ {p.total.toLocaleString()}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
