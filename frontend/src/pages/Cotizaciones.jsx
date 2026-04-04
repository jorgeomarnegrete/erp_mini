import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { FileSpreadsheet, Plus, Trash2, FileText, X, Check, Save } from 'lucide-react';

export default function Cotizaciones() {
  const { api } = useAuth();
  const [cotizaciones, setCotizaciones] = useState([]);
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

  // Estado del Formulario Maestro
  const [head, setHead] = useState({
    punto_venta_id: '',
    cliente_id: '',
    vendedor_id: '',
    observaciones: '',
    descuento_porcentaje: 0
  });

  // Estado de los Renglones (Detalle)
  const [detalles, setDetalles] = useState([
    { temp_id: Date.now(), producto_id: '', cantidad: 1, precio_unitario: 0, descripcion: '' }
  ]);

  const fetchData = async () => {
    try {
      const [resCot, resCli, resPv, resVen, resProd] = await Promise.all([
        api.get('/api/cotizaciones'),
        api.get('/api/clientes'),
        api.get('/api/puntos-venta'),
        api.get('/api/vendedores'),
        api.get('/api/productos')
      ]);
      setCotizaciones(resCot.data);
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

  const openModal = () => {
    setHead({
      punto_venta_id: puntosVenta.length > 0 ? puntosVenta[0].id : '',
      cliente_id: '',
      vendedor_id: '',
      observaciones: '',
      descuento_porcentaje: 0
    });
    setDetalles([{ temp_id: Date.now(), producto_id: '', cantidad: 1, precio_unitario: 0, descripcion: '' }]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const addDetalle = () => {
    setDetalles([...detalles, { temp_id: Date.now(), producto_id: '', cantidad: 1, precio_unitario: 0, descripcion: '' }]);
  };

  const removeDetalle = (temp_id) => {
    setDetalles(detalles.filter(d => d.temp_id !== temp_id));
  };

  const updateDetalle = (temp_id, field, value) => {
    setDetalles(detalles.map(d => {
      if (d.temp_id === temp_id) {
        const newData = { ...d, [field]: value };
        // Autocompleta precio unitario y descripción si seleccionan un producto
        if (field === 'producto_id') {
           const prod = productos.find(p => p.id === parseInt(value));
           if (prod) {
             let precioUnitarioCalculado = 0;
             const clienteSeleccionado = clientes.find(c => c.id === head.cliente_id);
             
             if (!clienteSeleccionado) {
                 alert("⚠️ Por favor selecciona primero un Cliente. Los precios se calculan según su lista asignada.");
                 newData.producto_id = ''; // Cancel selection
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
             
             // Sumar el IVA del producto para armar el precio final
             const ivaPorcentaje = prod.tasa_iva?.valor || 0;
             precioUnitarioCalculado = precioNeto * (1 + (ivaPorcentaje / 100));

             newData.precio_unitario = parseFloat(precioUnitarioCalculado.toFixed(2));
             newData.descripcion = prod.nombre;
           }
        }
        return newData;
      }
      return d;
    }));
  };

  // Resumen Dinámico
  const calculateTotals = () => {
    const subtotal = detalles.reduce((acc, d) => acc + (d.cantidad * d.precio_unitario), 0);
    const descMonto = subtotal * (head.descuento_porcentaje / 100);
    const total = subtotal - descMonto;
    return { subtotal, descMonto, total };
  };

  const { subtotal, descMonto, total } = calculateTotals();

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
      setErrorMsg("Debes añadir al menos un producto a la cotización.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        punto_venta_id: head.punto_venta_id,
        cliente_id: head.cliente_id,
        vendedor_id: head.vendedor_id || null,
        observaciones: head.observaciones,
        estado: 'Borrador',
        subtotal: subtotal,
        descuento_porcentaje: head.descuento_porcentaje,
        descuento_monto: descMonto,
        total: total,
        detalles: cleanDetalles.map(d => ({
           producto_id: d.producto_id,
           descripcion: d.descripcion,
           cantidad: d.cantidad,
           precio_unitario: d.precio_unitario,
           subtotal: d.cantidad * d.precio_unitario
        }))
      };

      await api.post('/api/cotizaciones', payload);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Error fatal generando documento");
    }
    setIsSaving(false);
  };

  const downloadPDF = async (id, numero) => {
    try {
      const response = await api.get(`/api/cotizaciones/${id}/pdf`, { responseType: 'blob' });
      // Crear object URL para abrir Tabs PDF en modo Visor nativo
      const fileURL = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      
      const pdfWindow = window.open("", "_blank");
      if (pdfWindow) {
         pdfWindow.document.write(`
            <html>
              <head>
                <title>Visor PDF - Cotización ${numero}</title>
                <style>body { margin: 0; padding: 0; overflow: hidden; background-color: #525659; }</style>
              </head>
              <body>
                <iframe src="${fileURL}" width="100%" height="100%" style="border:none;"></iframe>
              </body>
            </html>
         `);
         pdfWindow.document.close(); // Forzar al navegador a renderizar
      } else {
         alert("Por favor, permite las ventanas emergentes (Pop-ups) para ver el PDF.");
      }
    } catch (err) {
      alert("No se pudo generar el reporte digital PDF. Faltan Datos de Empresa o es un error de Servidor.");
    }
  };

  if (loading) return <div className="p-8 text-center font-bold text-gray-500">Cargando...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative pb-12">
      <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-white flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-teal-600 p-2 rounded-lg text-white mr-4 shadow-md">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Cotizaciones</h2>
            <p className="text-xs text-teal-600 font-bold tracking-wide uppercase mt-1">Gestión de Presupuestos</p>
          </div>
        </div>
        <button onClick={openModal} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md flex items-center transition-all">
          <Plus className="w-5 h-5 mr-2" /> Nueva Cotización
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 font-bold text-xs tracking-wider uppercase border-b border-gray-200">
              <th className="px-8 py-4">Comprobante</th>
              <th className="px-8 py-4">Fecha Emisión</th>
              <th className="px-8 py-4">Cliente</th>
              <th className="px-8 py-4 text-right">Total</th>
              <th className="px-8 py-4 text-center">Exportar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cotizaciones.map((c) => (
              <tr key={c.id} className="hover:bg-teal-50/30 transition-colors duration-150">
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="font-mono font-bold text-gray-800 text-sm">
                    Nº {String(c.punto_venta?.numero || '0').padStart(4,'0')}-{String(c.numero_comprobante).padStart(8,'0')}
                  </span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                  {new Date(c.fecha_emision).toLocaleDateString()}
                </td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <span className="text-sm font-black text-gray-700">{c.cliente?.razon_social}</span>
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-right text-base font-black text-teal-700">
                  $ {c.total.toLocaleString()}
                </td>
                <td className="px-8 py-4 whitespace-nowrap text-center">
                  <button onClick={() => downloadPDF(c.id, c.numero_comprobante)} className="text-rose-600 hover:text-white hover:bg-rose-600 p-2 rounded-lg transition-all" title="Ver / Descargar PDF">
                    <FileText className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {cotizaciones.length === 0 && (
              <tr><td colSpan="5" className="text-center p-8 font-bold text-gray-400">No hay cotizaciones registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ============== MODAL CREACION (FullScreen o Modal Gigante) ============== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] mt-4 mb-4 transform transition-all border-t-8 border-teal-600">
            
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 rounded-t-xl">
              <h3 className="text-xl font-black text-gray-800 flex items-center">
                <FileSpreadsheet className="w-6 h-6 mr-3 text-teal-600" />
                Nueva Cotización
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
                   <label className="block text-xs font-bold text-gray-500 mb-1">Cliente *</label>
                   <select className="w-full p-2.5 rounded-lg border border-gray-300 font-bold" value={head.cliente_id} onChange={e=>setHead({...head, cliente_id: parseInt(e.target.value)})}>
                     <option value="">-- Seleccionar --</option>
                     {clientes.map(c => <option key={c.id} value={c.id}>{c.documento} | {c.razon_social}</option>)}
                   </select>
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
                 <h4 className="font-black text-gray-700 text-sm uppercase tracking-wide">Renglones</h4>
                 <button type="button" onClick={addDetalle} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded flex items-center shadow-sm hover:bg-slate-700">
                   <Plus className="w-4 h-4 mr-1" /> Añadir Ítem
                 </button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-inner">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-100/50 text-slate-800 text-xs font-black uppercase">
                     <tr>
                       <th className="p-3 w-1/2 border-b">Producto</th>
                       <th className="p-3 border-b text-center">Cant.</th>
                       <th className="p-3 border-b text-right">P. Unitario</th>
                       <th className="p-3 border-b text-right bg-slate-100">Subtotal</th>
                       <th className="p-3 border-b text-center w-12"></th>
                     </tr>
                   </thead>
                   <tbody>
                     {detalles.map((d, index) => (
                       <tr key={d.temp_id} className="border-b border-gray-100">
                          <td className="p-2">
                             <select className="w-full p-1.5 rounded border border-gray-300 text-sm font-medium" value={d.producto_id} onChange={e => updateDetalle(d.temp_id, 'producto_id', e.target.value)}>
                                <option value="">- Seleccione -</option>
                                {productos.map(p => <option key={p.id} value={p.id}>{p.code_sku} - {p.nombre}</option>)}
                             </select>
                          </td>
                          <td className="p-2">
                             <input type="number" min="0.01" step="0.01" className="w-full p-1.5 rounded border border-gray-300 text-center font-bold text-sm" value={d.cantidad} onChange={e => updateDetalle(d.temp_id, 'cantidad', parseFloat(e.target.value)||0)} />
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
                   <textarea rows="4" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-teal-500 text-sm font-medium text-gray-700" value={head.observaciones} onChange={e=>setHead({...head, observaciones: e.target.value})}></textarea>
                </div>
                <div className="w-full lg:w-1/3 bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                   <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-gray-600">Subtotal</span>
                      <span className="text-sm font-black text-gray-800">$ {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                   </div>
                   <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center">
                         <span className="text-sm font-bold text-gray-600 mr-2">Desc. Libre %</span>
                         <input type="number" max="100" min="0" className="w-16 p-1 text-right text-xs rounded border outline-none font-bold text-red-600" value={head.descuento_porcentaje} onChange={e=>setHead({...head, descuento_porcentaje: parseFloat(e.target.value)||0})} />
                      </div>
                      <span className="text-sm font-bold text-red-600">- $ {descMonto.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                   </div>
                   <div className="pt-3 border-t border-gray-300 flex justify-between items-center">
                      <span className="text-xl font-black text-gray-800">Total</span>
                      <span className="text-2xl font-black text-teal-600">$ {total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                   </div>
                </div>
              </div>

            </div>

            {/* Footer Botones */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end items-center gap-3 rounded-b-xl">
               <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-700 bg-white border shadow-sm rounded-xl font-bold hover:bg-gray-100 transition-all">
                 Cancelar
               </button>
               <button type="submit" disabled={isSaving} onClick={handleSave} className="px-8 py-2.5 text-white bg-teal-600 hover:bg-teal-700 rounded-xl font-black shadow-lg transition-all flex items-center">
                 {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> : <Save className="w-5 h-5 mr-2" />}
                 Guardar
               </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
