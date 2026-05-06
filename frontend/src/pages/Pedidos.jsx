import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { ClipboardList, Plus, Trash2, X, Save, AlertCircle, Search } from 'lucide-react';
import ProductSearchModal from '../components/ProductSearchModal';
import ClientSearchModal from '../components/ClientSearchModal';

export default function Pedidos() {
  const { api } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Catálogos para los dropdowns
  const [clientes, setClientes] = useState([]);
  const [puntosVenta, setPuntosVenta] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [productos, setProductos] = useState([]);

  // Estados Modal Crear
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados para Búsqueda Avanzada
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState(null);
  const quantityRefs = useRef({});
  const productRefs = useRef({});
  const deliveryDateRef = useRef(null);

  // Estado del Formulario Maestro
  const [head, setHead] = useState({
    punto_venta_id: '',
    cliente_id: '',
    vendedor_id: '',
    observaciones: '',
    fecha_entrega: '',
    descuento_porcentaje: 0
  });

  // Estado de los Renglones (Detalle)
  const [detalles, setDetalles] = useState([
    { temp_id: Date.now(), producto_id: '', leyenda: '', cantidad: 1, precio_unitario: 0, iva_porcentaje: 0, disponible: null, error_stock: false }
  ]);

  const fetchData = async () => {
    try {
      const [resPed, resCli, resPv, resVen, resProd] = await Promise.all([
        api.get('/api/pedidos'),
        api.get('/api/clientes'),
        api.get('/api/puntos-venta'),
        api.get('/api/vendedores'),
        api.get('/api/productos')
      ]);
      setPedidos(resPed.data);
      setClientes(resCli.data);
      setPuntosVenta(resPv.data.filter(pv => pv.activo));
      setVendedores(resVen.data);
      setProductos(resProd.data.filter(p => p.activo));
    } catch (error) {
      console.error("Fallo al traer datos de sistema:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [api]);

  // Atajos de teclado globales
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (!isModalOpen) return;
      
      // Si hay un modal de búsqueda abierto, no procesamos Insert ni F2 aquí
      if (isClientModalOpen || isProductModalOpen) return;

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
  }, [isModalOpen, isClientModalOpen, isProductModalOpen, detalles]);

  const openModal = () => {
    setHead({
      punto_venta_id: puntosVenta.length > 0 ? puntosVenta[0].id : '',
      cliente_id: '',
      vendedor_id: '',
      observaciones: '',
      fecha_entrega: '',
      descuento_porcentaje: 0
    });
    setDetalles([{ temp_id: Date.now(), producto_id: '', leyenda: '', cantidad: 1, precio_unitario: 0, iva_porcentaje: 0, disponible: null, error_stock: false }]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const addDetalle = () => {
    const newId = Date.now();
    setDetalles([...detalles, { temp_id: newId, producto_id: '', leyenda: '', cantidad: 1, precio_unitario: 0, iva_porcentaje: 0, disponible: null, error_stock: false }]);
    
    // Hacer foco en el nuevo renglón (campo producto)
    setTimeout(() => {
       setActiveRowId(newId);
       productRefs.current[newId]?.focus();
    }, 100);
  };

  const removeDetalle = (temp_id) => {
    setDetalles(detalles.filter(d => d.temp_id !== temp_id));
  };

  const checkStockDisponible = async (producto_id, temp_id) => {
    try {
      const res = await api.get(`/api/productos/${producto_id}/stock-disponible`);
      const { disponible } = res.data;
      
      setDetalles(prev => prev.map(d => {
        if (d.temp_id === temp_id) {
          const isError = d.cantidad > disponible;
          return { ...d, disponible, error_stock: isError };
        }
        return d;
      }));
    } catch (error) {
      console.error("Error validando stock:", error);
    }
  };

  const updateDetalle = (temp_id, field, value) => {
    setDetalles(detalles.map(d => {
      if (d.temp_id === temp_id) {
        const newData = { ...d, [field]: value };
        
        // Cambio de Producto
        if (field === 'producto_id') {
           const prod = typeof value === 'object' ? value : productos.find(p => p.id === parseInt(value));
           if (prod) {
             const prodId = prod.id;
             let precioUnitarioCalculado = 0;
             const clienteSeleccionado = clientes.find(c => c.id === head.cliente_id);
             
             if (!clienteSeleccionado) {
                 alert("⚠️ Por favor selecciona primero un Cliente para calcular su precio.");
                 newData.producto_id = '';
                 return newData;
             }
             
             const lista = clienteSeleccionado.lista_precio;
             let precioNeto = prod.costo_neto;
             
             if (lista) {
                 const override = prod.precios_personalizados?.find(p => p.lista_precio_id === lista.id)?.precio_personalizado;
                 if (override) {
                     precioNeto = override;
                 } else {
                     precioNeto = prod.costo_neto * (1 + (lista.porcentaje_ganancia / 100));
                 }
             }
             
             // En pedidos guardamos el unitario NETO y el IVA en cabecera
             newData.producto_id = prodId;
             newData.precio_unitario = parseFloat(precioNeto.toFixed(2));
             newData.leyenda = prod.nombre;
             newData.iva_porcentaje = prod.tasa_iva?.valor || 0;
             
             // Disparar chequeo asíncrono
             checkStockDisponible(prodId, temp_id);

             // Auto-foco en cantidad
             setTimeout(() => {
                quantityRefs.current[temp_id]?.focus();
                quantityRefs.current[temp_id]?.select();
             }, 100);
           } else {
             newData.producto_id = '';
             newData.disponible = null;
             newData.error_stock = false;
             newData.iva_porcentaje = 0;
           }
        }

        // Cambio de Cantidad
        if (field === 'cantidad') {
            if (newData.disponible !== null) {
                newData.error_stock = newData.cantidad > newData.disponible;
            }
        }

        return newData;
      }
      return d;
    }));
  };

  // Resumen Dinámico
  const calculateTotals = () => {
    let subtotal = 0;
    let iva = 0;
    
    detalles.forEach(d => {
       const subItem = d.cantidad * d.precio_unitario;
       subtotal += subItem;
       
       // Calculo de IVA considerando descuentos prorrateados (simplificado por ahora al bruto item)
       // Para ser exactos, el descuento afecta la base imponible del IVA.
    });

    const descMonto = subtotal * (head.descuento_porcentaje / 100);
    const subtotalConDesc = subtotal - descMonto;

    // Recalcular IVA sobre la base con descuento
    detalles.forEach(d => {
       const proporcion = (d.cantidad * d.precio_unitario) / (subtotal || 1);
       const baseItem = subtotalConDesc * proporcion;
       iva += baseItem * (d.iva_porcentaje / 100);
    });

    const total = subtotalConDesc + iva;
    return { subtotal, descMonto, iva, total };
  };

  const { subtotal, descMonto, iva, total } = calculateTotals();
  const hasStockErrors = detalles.some(d => d.error_stock);

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!head.punto_venta_id || !head.cliente_id) {
      setErrorMsg("Debes seleccionar Cliente y Sucursal.");
      return;
    }
    const cleanDetalles = detalles.filter(d => d.producto_id); // Drop empty lines
    if (cleanDetalles.length === 0) {
      setErrorMsg("Debes añadir al menos un producto al pedido.");
      return;
    }
    if (hasStockErrors) {
      setErrorMsg("Hay productos que superan el stock disponible. Por favor, corrige las cantidades.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        punto_venta_id: head.punto_venta_id,
        cliente_id: head.cliente_id,
        vendedor_id: head.vendedor_id || null,
        observaciones: head.observaciones,
        fecha_entrega: head.fecha_entrega ? new Date(head.fecha_entrega).toISOString() : null,
        estado: 'Pendiente',
        subtotal: subtotal,
        descuento_porcentaje: head.descuento_porcentaje,
        descuento_monto: descMonto,
        iva: iva,
        total: total,
        detalles: cleanDetalles.map(d => ({
           producto_id: parseInt(d.producto_id),
           leyenda: d.leyenda,
           cantidad: d.cantidad,
           precio_unitario: d.precio_unitario,
           entregado: 0.0,
           subtotal: d.cantidad * d.precio_unitario
        }))
      };

      await api.post('/api/pedidos', payload);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Error fatal generando pedido");
    }
    setIsSaving(false);
  };

  if (loading) return <div className="p-8 text-center font-bold text-gray-500">Cargando...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative pb-12">
      <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-blue-600 p-2 rounded-lg text-white mr-4 shadow-md">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Pedidos</h2>
            <p className="text-xs text-blue-600 font-bold tracking-wide uppercase mt-1">Gestión de Envíos y Compromisos</p>
          </div>
        </div>
        <button onClick={openModal} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md flex items-center transition-all">
          <Plus className="w-5 h-5 mr-2" /> Nuevo Pedido
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 font-bold text-xs tracking-wider uppercase border-b border-gray-200">
              <th className="px-8 py-4">Nº Pedido</th>
              <th className="px-8 py-4">Fecha</th>
              <th className="px-8 py-4">Cliente</th>
              <th className="px-8 py-4">Estado</th>
              <th className="px-8 py-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pedidos.map((p) => (
              <tr key={p.id} className="hover:bg-blue-50/30 transition-colors duration-150">
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="font-mono font-bold text-gray-800 text-sm">
                    PD {String(p.punto_venta?.numero || '0').padStart(4,'0')}-{String(p.numero_comprobante).padStart(8,'0')}
                  </span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                  {new Date(p.fecha).toLocaleDateString()}
                </td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="text-sm font-black text-gray-700">{p.cliente?.razon_social}</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                     p.estado === 'Completado' ? 'bg-green-100 text-green-700' :
                     p.estado === 'Parcial' ? 'bg-amber-100 text-amber-700' :
                     p.estado === 'Cancelado' ? 'bg-red-100 text-red-700' :
                     'bg-blue-100 text-blue-700'
                  }`}>
                    {p.estado}
                  </span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-right text-base font-black text-blue-700">
                  $ {p.total.toLocaleString(undefined, {minimumFractionDigits:2})}
                </td>
              </tr>
            ))}
            {pedidos.length === 0 && (
              <tr><td colSpan="5" className="text-center p-8 font-bold text-gray-400">No hay pedidos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ============== MODAL CREACION ============== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] mt-4 mb-4 transform transition-all border-t-8 border-blue-600">
            
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 rounded-t-xl">
              <h3 className="text-xl font-black text-gray-800 flex items-center">
                <ClipboardList className="w-6 h-6 mr-3 text-blue-600" />
                Cargar Nuevo Pedido
              </h3>
              <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
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
                   <label className="block text-xs font-bold text-gray-500 mb-1">Cliente * <span className="text-[10px] text-blue-500">(F2 p/ buscar)</span></label>
                   <div className="relative">
                     <input 
                       id="input-cliente"
                       type="text" 
                       readOnly 
                       className="w-full p-2.5 rounded-lg border border-gray-300 font-bold bg-white cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none"
                       value={clientes.find(c => c.id === head.cliente_id)?.razon_social || ''}
                       placeholder="Haga clic o presione F2 para seleccionar cliente..."
                       onClick={() => setIsClientModalOpen(true)}
                     />
                     <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                   </div>
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">F. Entrega Estimada</label>
                   <input 
                     ref={deliveryDateRef}
                     type="date" 
                     className="w-full p-2.5 rounded-lg border border-gray-300 font-medium" 
                     value={head.fecha_entrega} 
                     onChange={e=>setHead({...head, fecha_entrega: e.target.value})} 
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">Vendedor</label>
                   <select className="w-full p-2.5 rounded-lg border border-gray-300 font-medium" value={head.vendedor_id} onChange={e=>setHead({...head, vendedor_id: e.target.value ? parseInt(e.target.value) : ''})}>
                     <option value="">-- Ninguno --</option>
                     {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre} {v.apellido}</option>)}
                   </select>
                </div>
              </div>

              {/* Renglones / Detalle */}
              <div className="mb-2 flex justify-between items-end">
                 <h4 className="font-black text-gray-700 text-sm uppercase tracking-wide">Renglones (Netos sin IVA)</h4>
                 <button type="button" onClick={addDetalle} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded flex items-center shadow-sm hover:bg-slate-700">
                   <Plus className="w-4 h-4 mr-1" /> Añadir Ítem
                 </button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-inner">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-100/50 text-slate-800 text-xs font-black uppercase">
                     <tr>
                       <th className="p-3 w-1/3 border-b">Producto</th>
                       <th className="p-3 border-b text-center">Disponible</th>
                       <th className="p-3 border-b text-center w-24">Cant.</th>
                       <th className="p-3 border-b text-right">Neto Unit.</th>
                       <th className="p-3 border-b text-right bg-slate-100">Subtotal</th>
                       <th className="p-3 border-b text-center w-12"></th>
                     </tr>
                   </thead>
                   <tbody>
                     {detalles.map((d) => (
                       <tr key={d.temp_id} className={`border-b border-gray-100 ${d.error_stock ? 'bg-red-50' : ''}`}>
                          <td className="p-2">
                             <div className="relative">
                               <input 
                                 ref={el => productRefs.current[d.temp_id] = el}
                                 type="text"
                                 readOnly
                                 className="w-full p-1.5 rounded border border-gray-300 text-sm font-bold bg-white cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none"
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
                          </td>
                          <td className="p-2 text-center">
                             {d.disponible !== null ? (
                                <span className={`text-xs font-bold ${d.disponible <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                   {d.disponible} un.
                                </span>
                             ) : <span className="text-gray-300 text-xs">-</span>}
                          </td>
                           <td className="p-2">
                             <input 
                               ref={el => quantityRefs.current[d.temp_id] = el}
                               type="number" 
                               min="0.01" 
                               step="0.01" 
                               className={`w-full p-1.5 rounded border text-center font-bold text-sm ${d.error_stock ? 'border-red-500 text-red-600 bg-red-100' : 'border-gray-300'}`} 
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
                             <button type="button" onClick={()=>removeDetalle(d.temp_id)} className="text-gray-400 hover:text-red-500 rounded p-1 transition-colors">
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
              </div>

              {/* Area Baja Modulo: Observaciones y Totales */}
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                   <label className="block text-xs font-bold text-gray-500 mb-1">Observaciones</label>
                   <textarea rows="4" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 text-sm font-medium text-gray-700" value={head.observaciones} onChange={e=>setHead({...head, observaciones: e.target.value})}></textarea>
                </div>
                <div className="w-full lg:w-1/3 bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                   <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-gray-600">Subtotal Neto</span>
                      <span className="text-sm font-black text-gray-800">$ {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                   </div>
                   <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center">
                         <span className="text-sm font-bold text-gray-600 mr-2">Desc. Libre %</span>
                         <input type="number" max="100" min="0" className="w-16 p-1 text-right text-xs rounded border outline-none font-bold text-red-600" value={head.descuento_porcentaje} onChange={e=>setHead({...head, descuento_porcentaje: parseFloat(e.target.value)||0})} />
                      </div>
                      <span className="text-sm font-bold text-red-600">- $ {descMonto.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                   </div>
                   <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-gray-600">IVA Calculado</span>
                      <span className="text-sm font-black text-gray-500">+ $ {iva.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                   </div>
                   <div className="pt-3 border-t border-gray-300 flex justify-between items-center">
                      <span className="text-xl font-black text-gray-800">Total</span>
                      <span className="text-2xl font-black text-blue-600">$ {total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                   </div>
                </div>
              </div>

            </div>

            {/* Footer Botones */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end items-center gap-3 rounded-b-xl">
               <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-700 bg-white border shadow-sm rounded-xl font-bold hover:bg-gray-100 transition-all">
                 Cancelar
               </button>
               <button type="submit" disabled={isSaving || hasStockErrors} onClick={handleSave} className={`px-8 py-2.5 text-white rounded-xl font-black shadow-lg transition-all flex items-center ${hasStockErrors ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                 {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> : <Save className="w-5 h-5 mr-2" />}
                 Generar Pedido
               </button>
            </div>

          </div>
        </div>
      )}

      {/* Modales de Búsqueda Avanzada */}
      <ClientSearchModal 
        isOpen={isClientModalOpen} 
        onClose={() => setIsClientModalOpen(false)}
        clientes={clientes}
        onSelect={(cliente) => {
          setHead({ ...head, cliente_id: cliente.id });
          setIsClientModalOpen(false);
          // Hacer foco en la fecha de entrega después de seleccionar cliente
          setTimeout(() => deliveryDateRef.current?.focus(), 100);
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
    </div>
  );
}
