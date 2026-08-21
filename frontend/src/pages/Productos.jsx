import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { Package, Edit, Trash2, Plus, X, Search, Tags, Calculator, PercentCircle, Printer, Save, Link2, Upload, AlertCircle, CheckCircle2, MinusCircle } from 'lucide-react';
import nunjucks from 'nunjucks';

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [soloConStock, setSoloConStock] = useState(true);
  const [filtroFamilia, setFiltroFamilia] = useState('');
  const [filtroSubfamilia, setFiltroSubfamilia] = useState('');
  const { api } = useAuth();

  // Catálogos para listboxes
  const [categorias, setCategorias] = useState([]);
  const [subfamilias, setSubfamilias] = useState([]);
  const [tasasIva, setTasasIva] = useState([]);
  const [listasPrecios, setListasPrecios] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  
  const [formData, setFormData] = useState({
    id: null, codigo_interno: '', codigo_barras: '', nombre: '', descripcion: '',
    categoria_id: '', subfamilia_id: '', tasa_iva_id: '', costo_neto: 0, stock_actual: 0, stock_minimo: 0, unidad: 'Unidades', presentacion: '', activo: true,
    precios_costum: [] // Array vivo de precios excepcionales { lista_precio_id, precio_personalizado }
  });
  
  const [formError, setFormError] = useState('');

  // Lotes del producto en edición (solo lectura — se generan por remito/ingreso/OP)
  const [editLotes, setEditLotes] = useState([]);

  // Estados Actualizar Productos (importación desde Tango)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResumen, setImportResumen] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const [isImportBusy, setIsImportBusy] = useState(false);

  // Etiqueta Modal State
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [labelTab, setLabelTab] = useState('datos');
  const [currentProd, setCurrentProd] = useState(null);
  const [labelForm, setLabelForm] = useState({
    descripcion_larga: '', senasa_nro: '', rnpa_nro: '', industria_argentina: true, peso_neto: '',
    porcion_descripcion: '', valor_energetico_kcal: '', valor_energetico_kj: '', valor_energetico_vd: '',
    carbohidratos_g: '', carbohidratos_vd: '', proteinas_g: '', proteinas_vd: '',
    grasas_totales_g: '', grasas_totales_vd: '', grasas_saturadas_g: '', grasas_saturadas_vd: '',
    grasas_trans_g: '', fibra_alimentaria_g: '', fibra_alimentaria_vd: '',
    sodio_mg: '', sodio_vd: '', ingredientes: '', conservacion: '',
    elaborado_por: '', para_establecimiento: '', codigo_ep: '', codigo_hm: ''
  });
  const [printForm, setPrintForm] = useState({
    fecha_elaboracion: new Date().toISOString().split('T')[0],
    nro_lote: '', cantidad_copias: 1, printer_name: 'ZDesigner ZT230-203dpi ZPL'
  });
  const [qzConnected, setQzConnected] = useState(false);

  // Edición inline (Observación) — bloquea el auto-refresco mientras se está escribiendo
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const savedObsRef = useRef({}); // id -> última observación confirmada en el servidor

  const fetchAllData = async () => {
    try {
      const [prodRes, catRes, subfRes, ivaRes, lpRes] = await Promise.all([
        api.get('/api/productos'),
        api.get('/api/categorias'),
        api.get('/api/subfamilias'),
        api.get('/api/tasas-iva'),
        api.get('/api/listas-precios')
      ]);
      setProductos(prodRes.data);
      savedObsRef.current = Object.fromEntries(prodRes.data.map(p => [p.id, p.observacion || '']));
      setCategorias(catRes.data);
      setSubfamilias(subfRes.data);
      setTasasIva(ivaRes.data);
      setListasPrecios(lpRes.data);
    } catch (err) {
      console.error('Error montando inventario:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [api]);

  // Auto-refresco: cada 60s y al volver a la pestaña, salvo que haya un modal abierto o una celda en edición
  const isInlineEditingRef = useRef(isInlineEditing);
  useEffect(() => { isInlineEditingRef.current = isInlineEditing; }, [isInlineEditing]);
  const modalsOpenRef = useRef(false);
  useEffect(() => {
    modalsOpenRef.current = isModalOpen || isImportModalOpen || isLabelModalOpen;
  }, [isModalOpen, isImportModalOpen, isLabelModalOpen]);

  useEffect(() => {
    const tick = () => {
      if (isInlineEditingRef.current || modalsOpenRef.current) return;
      fetchAllData();
    };
    const interval = setInterval(tick, 60000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [api]);

  const handleObservacionChange = (id, value) => {
    setProductos(prev => prev.map(p => p.id === id ? { ...p, observacion: value } : p));
  };

  const handleObservacionBlur = async (prod) => {
    setIsInlineEditing(false);
    const value = prod.observacion || '';
    if (value === (savedObsRef.current[prod.id] || '')) return;
    try {
      await api.put(`/api/productos/${prod.id}`, { observacion: value });
      savedObsRef.current[prod.id] = value;
    } catch (err) {
      alert('No se pudo guardar la observación.');
      setProductos(prev => prev.map(p => p.id === prod.id ? { ...p, observacion: savedObsRef.current[prod.id] || '' } : p));
    }
  };

  const getEmptyForm = () => ({
    id: null, codigo_interno: '', codigo_barras: '', nombre: '', descripcion: '',
    categoria_id: categorias[0]?.id || '', subfamilia_id: '', tasa_iva_id: tasasIva.find(t=>t.valor===21)?.id || tasasIva[0]?.id || '',
    costo_neto: 0, stock_actual: 0, stock_minimo: 0, unidad: 'Unidades', presentacion: '', activo: true, precios_costum: []
  });

  const openCreateModal = () => {
    setModalMode('create');
    setFormData(getEmptyForm());
    setEditLotes([]);
    setFormError('');
    setIsModalOpen(true);
  };

  const openImportModal = () => {
    setImportFile(null);
    setImportResumen(null);
    setImportResult(null);
    setImportError('');
    setIsImportModalOpen(true);
  };

  const handleImportFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    setImportResumen(null);
    setImportResult(null);
    setImportError('');
    setIsImportBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/productos/actualizar/preview', formData);
      setImportResumen(res.data);
    } catch (error) {
      setImportError(error.response?.data?.detail || 'Error al analizar el archivo.');
    }
    setIsImportBusy(false);
  };

  const handleConfirmarImport = async () => {
    if (!importFile) return;
    setIsImportBusy(true);
    setImportError('');
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await api.post('/api/productos/actualizar/confirmar', formData);
      setImportResult(res.data);
      setImportResumen(null);
      fetchAllData();
    } catch (error) {
      setImportError(error.response?.data?.detail || 'Error al confirmar la actualización.');
    }
    setIsImportBusy(false);
  };

  const openLabelModal = async (prod) => {
    setCurrentProd(prod);
    setLabelTab('datos');
    setFormError('');
    try {
      const res = await api.get(`/api/productos/${prod.id}/etiqueta`);
      setLabelForm(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setLabelForm({
          descripcion_larga: '', senasa_nro: '', rnpa_nro: '', industria_argentina: true, peso_neto: '',
          porcion_descripcion: '', valor_energetico_kcal: '', valor_energetico_kj: '', valor_energetico_vd: '',
          carbohidratos_g: '', carbohidratos_vd: '', proteinas_g: '', proteinas_vd: '',
          grasas_totales_g: '', grasas_totales_vd: '', grasas_saturadas_g: '', grasas_saturadas_vd: '',
          grasas_trans_g: '', fibra_alimentaria_g: '', fibra_alimentaria_vd: '',
          sodio_mg: '', sodio_vd: '', ingredientes: '', conservacion: '',
          elaborado_por: '', para_establecimiento: '', codigo_ep: '', codigo_hm: ''
        });
      }
    }
    setIsLabelModalOpen(true);
  };

  const handleSaveLabel = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/productos/${currentProd.id}/etiqueta`, labelForm);
      alert('Etiqueta guardada con éxito');
    } catch (err) {
      setFormError('Error guardando etiqueta');
    }
  };

  const connectQZ = async () => {
    try {
      if (!window.qz) throw new Error("QZ Tray no está cargado. Verifique index.html");
      
      qz.security.setCertificatePromise((resolve, reject) => {
        api.get('/api/qz/certificate').then(res => resolve(res.data)).catch(reject);
      });
      qz.security.setSignatureAlgorithm("SHA512");
      qz.security.setSignaturePromise((toSign) => {
        return (resolve, reject) => {
          api.post('/api/qz/sign', { message: toSign })
             .then(res => resolve(res.data))
             .catch(reject);
        };
      });

      if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
      }
      setQzConnected(true);
    } catch (err) {
      alert("Error conectando a QZ Tray: " + err);
    }
  };

  const handlePrintLabel = async () => {
    try {
      if (!qzConnected) await connectQZ();
      
      const res = await api.get('/api/plantillas');
      const zplTemplate = res.data.find(p => p.tipo_documento === 'ETIQUETA_ZPL');
      if (!zplTemplate || !zplTemplate.codigo_zpl) throw new Error("Plantilla ETIQUETA_ZPL no configurada");

      nunjucks.configure({ autoescape: false });
      const context = {
        producto: currentProd,
        etiqueta: labelForm,
        fecha_elaboracion: printForm.fecha_elaboracion,
        nro_lote: printForm.nro_lote,
        cantidad_copias: printForm.cantidad_copias
      };
      const renderedZpl = nunjucks.renderString(zplTemplate.codigo_zpl, context);

      let cfgName = printForm.printer_name;
      let qzConfig;
      if (cfgName.includes(".")) {
         qzConfig = qz.configs.create(cfgName, { port: 9100, encoding: null, copies: 1 });
      } else {
         qzConfig = qz.configs.create(cfgName, { encoding: null, copies: 1 });
      }
      
      await qz.print(qzConfig, [{ type: 'raw', format: 'plain', data: renderedZpl }]);
      alert("Enviado a impresora con éxito.");
    } catch (err) {
      alert("Error al imprimir: " + err);
    }
  };

  const openEditModal = (prod) => {
    setModalMode('edit');
    // Adaptar las relaciones complejas del objeto a plana para el Form
    setFormData({
      id: prod.id,
      codigo_interno: prod.codigo_interno,
      codigo_barras: prod.codigo_barras || '',
      nombre: prod.nombre,
      descripcion: prod.descripcion || '',
      categoria_id: prod.categoria_id,
      subfamilia_id: prod.subfamilia_id || '',
      tasa_iva_id: prod.tasa_iva_id,
      costo_neto: prod.costo_neto,
      stock_actual: prod.stock_actual,
      stock_minimo: prod.stock_minimo || 0,
      unidad: prod.unidad || 'Unidades',
      presentacion: prod.presentacion || '',
      activo: prod.activo,
      precios_costum: prod.precios_personalizados.map(p => ({
         lista_precio_id: p.lista_precio_id,
         precio_personalizado: p.precio_personalizado
      }))
    });
    setEditLotes(prod.lotes || []);
    setFormError('');
    setIsModalOpen(true);
  };

  // Motor Frontend para Calculos e Híbridos
  const handleCustomPriceChange = (listaId, valorStr) => {
    const valor = parseFloat(valorStr);
    const existingPrices = [...formData.precios_costum];
    const idx = existingPrices.findIndex(p => p.lista_precio_id === listaId);
    
    // Si la casilla queda en blando/NaN, borramos la reescritura para que quede automático
    if (isNaN(valorStr) || valorStr === '') {
       if (idx > -1) existingPrices.splice(idx, 1);
    } else {
       if (idx > -1) {
          existingPrices[idx].precio_personalizado = valor;
       } else {
          existingPrices.push({ lista_precio_id: listaId, precio_personalizado: valor });
       }
    }
    setFormData({...formData, precios_costum: existingPrices});
  };

  const getCustomPrice = (listaId) => {
     const custom = formData.precios_costum.find(p => p.lista_precio_id === listaId);
     return custom ? custom.precio_personalizado : '';
  };

  // Traer IVA de la DB a tiempo real
  const currentIvaValue = tasasIva.find(t => t.id === parseInt(formData.tasa_iva_id))?.valor || 0;

  // Unidades de medida: las que ya existen en la base + comunes (para el datalist)
  const unidadesComunes = ['Unidades', 'Kg', 'KGR', 'Gr', 'Lts', 'Ml', 'Mts', 'Cajas', 'FCO', 'BALDE'];
  const unidadesDisponibles = [...new Set([
    ...productos.map(p => p.unidad).filter(Boolean),
    ...unidadesComunes,
  ])].sort((a, b) => a.localeCompare(b));

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const payload = { ...formData };
      delete payload.id;
      if (payload.codigo_barras === '') payload.codigo_barras = null;
      if (payload.descripcion === '') payload.descripcion = null;
      if (payload.subfamilia_id === '') payload.subfamilia_id = null;
      if (payload.presentacion === '') payload.presentacion = null;

      if (modalMode === 'create') {
        await api.post('/api/productos', payload);
      } else {
        await api.put(`/api/productos/${formData.id}`, payload);
      }
      setIsModalOpen(false);
      fetchAllData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error fiscal de estructura al guardar producto.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que desea eliminar este producto?")) {
      try {
        await api.delete(`/api/productos/${id}`);
        fetchAllData();
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al eliminar el producto.');
      }
    }
  };

  const filteredProductos = productos.filter((p) => {
    if (soloConStock && p.stock_actual <= 0) return false;
    if (filtroFamilia && p.categoria_id !== parseInt(filtroFamilia)) return false;
    if (filtroSubfamilia && p.subfamilia_id !== parseInt(filtroSubfamilia)) return false;
    if (!searchTerm.trim()) return true;
    const tokens = searchTerm.toLowerCase().split(/\s+/).filter(t => t);
    const textToSearch = `${p.codigo_interno} ${p.nombre} ${p.categoria.nombre} ${p.codigo_barras || ''}`.toLowerCase();
    return tokens.every((token) => textToSearch.includes(token));
  });

  if (loading) return (
     <div className="flex flex-col justify-center items-center h-64 text-indigo-600">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
       <p className="font-semibold animate-pulse">Cargando productos...</p>
     </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative flex flex-col h-full">
      <div className="px-4 sm:px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-0 lg:justify-between">
        <div className="flex items-center">
          <div className="bg-indigo-600 p-2 rounded-lg text-white mr-4 shadow-md">
            <Package className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Productos</h2>
        </div>

        <div className="w-full lg:flex-1 lg:max-w-md lg:mx-8 relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Buscar por código, nombre o rubro..."
            className="block w-full pl-11 pr-4 py-2.5 bg-white border-2 border-indigo-100 rounded-xl text-sm font-bold placeholder-indigo-300 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:gap-4">
          <span className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold shadow-sm border border-indigo-200">
            {filteredProductos.length} de {productos.length} SKUs
          </span>
          <button onClick={openImportModal} className="flex items-center bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-50 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm">
            <Upload className="w-5 h-5 mr-1" /> Actualizar Productos
          </button>
          <button onClick={openCreateModal} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-md">
            <Plus className="w-5 h-5 mr-1" /> Nuevo Producto
          </button>
        </div>
      </div>

      <div className="px-8 py-3 border-b border-gray-100 bg-gray-50/40 flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={soloConStock}
            onChange={e => setSoloConStock(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
          />
          <span className="text-sm font-bold text-gray-700">Solo productos con Stock</span>
        </label>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wide">Familia</span>
          <select
            value={filtroFamilia}
            onChange={e => setFiltroFamilia(e.target.value)}
            className="p-2 rounded-lg border border-gray-300 text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wide">Subfamilia</span>
          <select
            value={filtroSubfamilia}
            onChange={e => setFiltroSubfamilia(e.target.value)}
            className="p-2 rounded-lg border border-gray-300 text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas</option>
            {subfamilias.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 font-bold text-xs tracking-wider uppercase border-b border-gray-200">
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Observación</th>
              <th className="px-6 py-4 text-center">Stock</th>
              <th className="px-6 py-4">Presentación</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/60">
            {filteredProductos.map((prod) => (
              <tr key={prod.id} className={`transition-colors duration-200 ${prod.observacion ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-indigo-50/40'}`}>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-gray-900 tracking-tight">{prod.nombre}</span>
                    <div className="flex space-x-2 items-center mt-1.5">
                       <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-700 font-mono tracking-widest">{prod.codigo_interno}</span>
                       <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">{prod.categoria.nombre}</span>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <input
                    type="text"
                    className="w-full min-w-[220px] p-1.5 rounded border border-transparent hover:border-gray-300 focus:border-orange-500 outline-none text-sm font-medium text-gray-700 bg-transparent focus:bg-white"
                    placeholder="Sin observación"
                    value={prod.observacion || ''}
                    onFocus={() => setIsInlineEditing(true)}
                    onChange={e => handleObservacionChange(prod.id, e.target.value)}
                    onBlur={() => handleObservacionBlur(prod)}
                  />
                </td>

                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-lg font-mono font-black border
                    ${prod.stock_actual <= 0 ? 'border-red-400 text-red-600 bg-red-50' :
                      prod.stock_actual <= prod.stock_minimo ? 'border-orange-400 text-orange-600 bg-orange-50' :
                      'border-gray-200'}`}>
                    {prod.stock_actual.toFixed(2)} {prod.unidad}
                  </span>
                </td>

                <td className="px-6 py-4 text-sm font-medium text-gray-600">
                  {prod.presentacion || '—'}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                  <button onClick={() => openLabelModal(prod)} className="text-teal-600 bg-teal-50 p-2 rounded-lg hover:bg-teal-600 hover:text-white transition-all shadow-sm" title="Imprimir Etiqueta">
                    <Printer className="w-5 h-5" />
                  </button>
                  <button onClick={() => openEditModal(prod)} className="text-indigo-600 bg-indigo-50 p-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Editar">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDelete(prod.id)} className="text-gray-400 bg-gray-50 hover:bg-red-500 hover:text-white p-2 rounded-lg transition-all shadow-sm" title="Eliminar">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredProductos.length === 0 && (
                <tr>
                   <td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-semibold text-lg italic">
                     {searchTerm ? 'No se encontraron productos para esta búsqueda.' : 'No hay productos registrados.'}
                   </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center p-4 bg-gray-900/60 backdrop-blur-md overflow-y-auto w-full h-full pb-20 pt-10">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl flex flex-col m-auto h-auto min-h-min border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center rounded-t-3xl sticky top-0 z-10">
              <h3 className="text-2xl font-black text-gray-900 flex items-center">
                <Package className="w-7 h-7 mr-3 text-indigo-600" />
                {modalMode === 'create' ? 'Nuevo Producto' : 'Editar Producto'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 bg-white shadow-sm border p-2 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 pb-10 overflow-x-hidden overflow-y-auto w-full custom-scrollbar flex-1">
                {formError && (
                  <div className="mb-6 bg-red-50 text-red-600 px-5 py-4 rounded-xl text-sm font-bold border border-red-200 flex items-center shadow-inner">
                    <X className="w-5 h-5 mr-3 flex-shrink-0" /> {formError}
                  </div>
                )}
                
                <form id="producto-form" onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  
                  {/* COLUMNA 1: Datos Físicos y Costos Básicos */}
                  <div className="space-y-6">
                     <div className="pb-3 border-b-2 border-gray-100 flex items-center">
                        <Tags className="w-5 h-5 mr-2 text-gray-400" />
                        <h4 className="text-xl font-bold text-gray-800 tracking-tight">Datos Básicos</h4>
                     </div>
                     
                     <div>
                       <label className="block text-sm font-extrabold text-gray-700 mb-1">Nombre *</label>
                       <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none text-gray-900 font-bold bg-gray-50 focus:bg-white transition-all" placeholder="Ej. Alfajor Triple Negro" />
                     </div>

                     <div className="grid grid-cols-2 gap-5">
                        <div className="w-full">
                           <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">SKU Interno *</label>
                           <input type="text" required value={formData.codigo_interno} onChange={e => setFormData({...formData, codigo_interno: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-mono font-bold tracking-widest text-indigo-800 text-center outline-none focus:ring-2 focus:ring-indigo-500 uppercase placeholder-gray-300" placeholder="ALF-TR" />
                        </div>
                        <div className="w-full">
                           <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Cód. Barras (Pistola)</label>
                           <input type="text" value={formData.codigo_barras} onChange={e => setFormData({...formData, codigo_barras: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-mono tracking-wider text-center outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej. 7793420..." />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-5">
                        <div className="w-full">
                          <label className="block text-sm font-bold text-gray-700 mb-1">Familia / Rubro *</label>
                          <select required value={formData.categoria_id} onChange={e => setFormData({...formData, categoria_id: parseInt(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-indigo-50/50 cursor-pointer">
                             {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                          </select>
                        </div>
                        <div className="w-full">
                          <label className="block text-sm font-bold text-gray-700 mb-1">Regimen IVA (AFIP) *</label>
                          <select required value={formData.tasa_iva_id} onChange={e => setFormData({...formData, tasa_iva_id: parseInt(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-800 font-bold focus:ring-2 focus:ring-amber-400 outline-none bg-amber-50/30 cursor-pointer">
                             {tasasIva.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                          </select>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-5">
                        <div className="w-full">
                          <label className="block text-sm font-bold text-gray-700 mb-1">Subfamilia (opcional)</label>
                          <select value={formData.subfamilia_id} onChange={e => setFormData({...formData, subfamilia_id: e.target.value ? parseInt(e.target.value) : ''})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-indigo-50/50 cursor-pointer">
                             <option value="">Sin subfamilia</option>
                             {subfamilias.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                          </select>
                        </div>
                     </div>

                     <div className="p-5 bg-emerald-50 rounded-2xl border-2 border-emerald-100 flex flex-col space-y-4">
                        <label className="block text-base font-black text-emerald-900 tracking-tight">Costo Neto *</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-emerald-600">$</span>
                            <input type="number" step="0.01" min="0" required value={formData.costo_neto} onChange={e => setFormData({...formData, costo_neto: parseFloat(e.target.value) || 0})} className="w-full pl-10 pr-4 py-4 rounded-xl border-2 border-emerald-300 focus:border-emerald-600 outline-none font-black text-3xl text-emerald-800 bg-white" />
                        </div>
                        <p className="text-xs font-semibold text-emerald-700 leading-snug">Precio de costo sin IVA. Se usará como base para el cálculo de márgenes.</p>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-5 w-full">
                        <div className="w-full">
                           <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1" title="El stock se rige por movimientos">Stock / Cantidad (Read-Only)</label>
                           <input type="number" step="0.01" readOnly disabled value={formData.stock_actual} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-100 font-black text-xl text-center outline-none text-gray-500 cursor-not-allowed" />
                        </div>
                        <div className="w-full">
                           <label className="block text-xs font-black text-emerald-600 uppercase tracking-wider mb-1" title="Punto de Reorden">Stock Mínimo</label>
                           <input type="number" step="0.01" value={formData.stock_minimo} onChange={e => setFormData({...formData, stock_minimo: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 font-bold text-lg text-center outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-800 bg-emerald-50" />
                        </div>
                        <div className="w-full">
                           <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">U.M. (Medida)</label>
                           <input
                              type="text"
                              list="unidades-list"
                              value={formData.unidad}
                              onChange={e => setFormData({...formData, unidad: e.target.value})}
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-800 text-center outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                              placeholder="Ej. KG, FCO, BALDE"
                           />
                           <datalist id="unidades-list">
                              {unidadesDisponibles.map(u => <option key={u} value={u} />)}
                           </datalist>
                        </div>
                        <div className="w-full">
                           <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Presentación</label>
                           <input
                              type="text"
                              value={formData.presentacion}
                              onChange={e => setFormData({...formData, presentacion: e.target.value})}
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-800 text-center outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                              placeholder="Ej. 10 x 1 kg"
                           />
                        </div>
                     </div>

                     {/* Stock por lote (solo lectura) */}
                     {modalMode === 'edit' && (
                        <div className="pt-2">
                           <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-black text-gray-700 uppercase tracking-wider flex items-center">
                                 <Tags className="w-4 h-4 mr-2 text-gray-400" /> Stock por lote
                              </h4>
                              <span className="text-[10px] font-bold text-gray-400 italic">Se gestiona por remito / ingreso / producción</span>
                           </div>
                           <div className="border border-gray-200 rounded-xl overflow-hidden">
                              <table className="w-full text-left text-sm">
                                 <thead className="bg-gray-100/70 text-gray-500 text-xs uppercase font-black">
                                    <tr>
                                       <th className="px-3 py-2">Lote</th>
                                       <th className="px-3 py-2">Vencimiento</th>
                                       <th className="px-3 py-2 text-right">Cantidad</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100">
                                    {editLotes.map(l => (
                                       <tr key={l.id}>
                                          <td className="px-3 py-2 font-mono font-bold text-gray-700">{l.nro_lote || '—'}</td>
                                          <td className="px-3 py-2 text-gray-600">{l.fecha_vencimiento ? new Date(l.fecha_vencimiento).toLocaleDateString() : '—'}</td>
                                          <td className="px-3 py-2 text-right font-black text-gray-800">{Number(l.cantidad_actual).toFixed(2)} {formData.unidad}</td>
                                       </tr>
                                    ))}
                                    {editLotes.length === 0 && (
                                       <tr><td colSpan="3" className="px-3 py-4 text-center text-gray-400 font-semibold italic text-xs">Sin lotes registrados para este producto.</td></tr>
                                    )}
                                 </tbody>
                                 {editLotes.length > 0 && (
                                    <tfoot className="bg-gray-50 border-t border-gray-200">
                                       <tr>
                                          <td colSpan="2" className="px-3 py-2 text-right text-xs font-black text-gray-500 uppercase">Total en lotes</td>
                                          <td className="px-3 py-2 text-right font-black text-indigo-700">
                                             {editLotes.reduce((s, l) => s + Number(l.cantidad_actual || 0), 0).toFixed(2)} {formData.unidad}
                                          </td>
                                       </tr>
                                    </tfoot>
                                 )}
                              </table>
                           </div>
                        </div>
                     )}
                  </div>

                  {/* COLUMNA 2: Configuración de Precios */}
                  <div className="space-y-6 flex flex-col border p-6 rounded-2xl bg-gray-50/50">
                     <div className="pb-3 border-b-2 border-purple-200 flex flex-col justify-start">
                        <div className="flex items-center w-full">
                           <Calculator className="w-5 h-5 mr-2 text-purple-600" />
                           <h4 className="text-xl font-bold text-gray-900 tracking-tight">Precios de Venta</h4>
                        </div>
                        <p className="text-xs font-medium text-gray-500 mt-2 leading-relaxed">Deje la columna "Precio Personalizado" vacía para aplicar el margen automático de la lista de precios.</p>
                     </div>

                     <div className="overflow-x-auto overflow-y-auto w-full custom-scrollbar max-h-96 pr-2 rounded-xl bg-white border shadow-sm flex flex-col items-center">
                        <table className="w-full text-left border-collapse table-auto">
                           <thead className="bg-gray-100/80 sticky top-0 hidden md:table-header-group">
                              <tr>
                                 <th className="px-3 py-3 text-xs font-black text-gray-600 uppercase tracking-wider w-1/4">Lista de Precios</th>
                                 <th className="px-3 py-3 text-xs font-black text-gray-600 uppercase tracking-wider text-center w-1/4" title="Margen configurado en la lista">Margen (%)</th>
                                 <th className="px-3 py-3 text-xs font-black text-purple-700 uppercase tracking-wider text-right bg-purple-50 w-1/3">Precio Calculado</th>
                                 <th className="px-3 py-3 text-xs font-black text-rose-700 uppercase tracking-wider text-right bg-rose-50 w-1/3 cursor-help border-l-2 border-rose-200" title="Precio Neto sin IVA.">Precio Personalizado</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100 flex-1 w-full">
                              {listasPrecios.map(lista => {
                                  const baseAutoRule = formData.costo_neto * (1 + lista.porcentaje_ganancia / 100);
                                  const valOverride = getCustomPrice(lista.id);
                                  const effectiveNeto = valOverride !== '' ? parseFloat(valOverride) : baseAutoRule;
                                  const ivaSuma = effectiveNeto * (currentIvaValue / 100);
                                  const finalSaleGross = effectiveNeto + ivaSuma;
                                  
                                  return (
                                    <tr key={lista.id} className="hover:bg-gray-50 flex flex-col md:table-row py-3 md:py-0 border-b md:border-b-0 w-full mb-2">
                                        <td className="px-3 md:py-3 w-full block md:table-cell">
                                            <span className="font-bold text-sm text-gray-800">{lista.nombre}</span>
                                        </td>
                                        <td className="px-3 md:py-3 w-full text-center block md:table-cell text-sm font-semibold text-gray-400">
                                            + {lista.porcentaje_ganancia}%
                                        </td>
                                        
                                        <td className="px-3 md:py-3 w-full text-right bg-purple-50/30 block md:table-cell">
                                            <span className={`text-base font-black font-mono ${valOverride !== '' ? 'line-through text-gray-300' : 'text-purple-700'}`}>
                                               ${baseAutoRule.toFixed(2)}
                                            </span>
                                        </td>

                                        <td className="px-3 md:py-3 w-full text-right bg-rose-50/50 block md:table-cell border-l-2 border-rose-100 align-middle">
                                            <div className="flex flex-col items-end w-full">
                                               <div className="flex items-center w-full justify-end max-w-full">
                                                  <span className="text-rose-500 font-black mr-1.5">$</span>
                                                  <input 
                                                     type="text" 
                                                     value={valOverride} 
                                                     onChange={(e) => handleCustomPriceChange(lista.id, e.target.value)} 
                                                     className="w-28 xl:w-32 px-2 py-1.5 rounded-lg border-2 border-rose-200 focus:border-rose-600 focus:ring-2 focus:ring-rose-200 outline-none text-right font-black text-rose-900 bg-white placeholder-rose-200 min-w-0" 
                                                     placeholder="Opcional" 
                                                  />
                                               </div>
                                               {/* Calculadora en gris oscuro (Mostrador Final) */}
                                               <span className="text-[10px] font-black tracking-widest text-emerald-800 mt-1 min-w-max bg-emerald-100 px-1 py-0.5 rounded ml-auto flex self-end">
                                                  Público: ${(finalSaleGross || 0).toFixed(2)} c/IVA
                                               </span>
                                            </div>
                                        </td>
                                    </tr>
                                  );
                              })}
                           </tbody>
                        </table>
                     </div>

                  </div>
                </form>
            </div>

            <div className="px-8 py-5 border-t bg-gray-50 flex justify-end space-x-4 rounded-b-3xl mt-auto z-10 sticky bottom-0 border-t border-gray-100 shadow-[0_-15px_20px_-5px_rgba(0,0,0,0.03)] w-full">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-gray-700 bg-white hover:bg-gray-100 rounded-xl font-bold transition-all border shadow-sm">
                  Cancelar
                </button>
                <button type="submit" form="producto-form" className="px-8 py-3 flex items-center text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-black shadow-lg transition-transform active:scale-95">
                  <Package className="w-5 h-5 mr-2" /> {modalMode === 'create' ? 'Guardar Producto' : 'Actualizar Producto'}
                </button>
            </div>
          </div>
        </div>
      )}
      {isLabelModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center p-4 bg-gray-900/60 backdrop-blur-md overflow-y-auto w-full h-full pb-20 pt-10">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col m-auto h-auto min-h-min border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-white flex justify-between items-center rounded-t-3xl sticky top-0 z-10">
              <h3 className="text-2xl font-black text-gray-900 flex items-center">
                <Printer className="w-7 h-7 mr-3 text-teal-600" />
                Etiqueta — {currentProd?.nombre}
              </h3>
              <button type="button" onClick={() => setIsLabelModalOpen(false)} className="text-gray-400 hover:text-red-500 bg-white shadow-sm border p-2 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex border-b border-gray-200">
               <button onClick={() => setLabelTab('datos')} className={`flex-1 py-3 font-bold text-sm text-center ${labelTab === 'datos' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>Datos de Etiqueta</button>
               <button onClick={() => setLabelTab('imprimir')} className={`flex-1 py-3 font-bold text-sm text-center ${labelTab === 'imprimir' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>Imprimir en Zebra</button>
            </div>
            
            <div className="p-8 pb-10 overflow-x-hidden overflow-y-auto w-full custom-scrollbar flex-1">
                {labelTab === 'datos' && (
                  <form id="label-form" onSubmit={handleSaveLabel} className="space-y-6">
                    <h4 className="text-lg font-bold text-gray-800 border-b pb-2">Identificación Fiscal</h4>
                    <div className="grid grid-cols-2 gap-4">
                       <input type="text" placeholder="Descripción Larga" value={labelForm.descripcion_larga || ''} onChange={e => setLabelForm({...labelForm, descripcion_larga: e.target.value})} className="col-span-2 px-4 py-2 rounded-lg border focus:ring-2 focus:ring-teal-500" />
                       <input type="text" placeholder="SENASA N°" value={labelForm.senasa_nro || ''} onChange={e => setLabelForm({...labelForm, senasa_nro: e.target.value})} className="px-4 py-2 rounded-lg border" />
                       <input type="text" placeholder="RNPA N°" value={labelForm.rnpa_nro || ''} onChange={e => setLabelForm({...labelForm, rnpa_nro: e.target.value})} className="px-4 py-2 rounded-lg border" />
                       <input type="text" placeholder="Peso Neto (ej. 6 KG)" value={labelForm.peso_neto || ''} onChange={e => setLabelForm({...labelForm, peso_neto: e.target.value})} className="px-4 py-2 rounded-lg border" />
                       <label className="flex items-center space-x-2 font-bold text-sm text-gray-700">
                          <input type="checkbox" checked={labelForm.industria_argentina} onChange={e => setLabelForm({...labelForm, industria_argentina: e.target.checked})} className="w-5 h-5 text-teal-600 rounded" />
                          <span>Industria Argentina</span>
                       </label>
                    </div>

                    <h4 className="text-lg font-bold text-gray-800 border-b pb-2 mt-6">Tabla Nutricional</h4>
                    <input type="text" placeholder="Porción (ej. 130 gr / 1 unidad)" value={labelForm.porcion_descripcion || ''} onChange={e => setLabelForm({...labelForm, porcion_descripcion: e.target.value})} className="w-full px-4 py-2 rounded-lg border mb-4" />
                    <div className="grid grid-cols-3 gap-2">
                       <input type="number" placeholder="Kcal" value={labelForm.valor_energetico_kcal || ''} onChange={e => setLabelForm({...labelForm, valor_energetico_kcal: parseFloat(e.target.value)})} className="px-3 py-1 rounded border text-sm" />
                       <input type="number" placeholder="KJ" value={labelForm.valor_energetico_kj || ''} onChange={e => setLabelForm({...labelForm, valor_energetico_kj: parseFloat(e.target.value)})} className="px-3 py-1 rounded border text-sm" />
                       <input type="number" placeholder="% VD Energía" value={labelForm.valor_energetico_vd || ''} onChange={e => setLabelForm({...labelForm, valor_energetico_vd: parseInt(e.target.value)})} className="px-3 py-1 rounded border text-sm" />
                       
                       <input type="number" placeholder="Carbo (g)" value={labelForm.carbohidratos_g || ''} onChange={e => setLabelForm({...labelForm, carbohidratos_g: parseFloat(e.target.value)})} className="px-3 py-1 rounded border text-sm" />
                       <div className="hidden"></div>
                       <input type="number" placeholder="% VD Carbo" value={labelForm.carbohidratos_vd || ''} onChange={e => setLabelForm({...labelForm, carbohidratos_vd: parseInt(e.target.value)})} className="px-3 py-1 rounded border text-sm" />
                       
                       <input type="number" placeholder="Prot (g)" value={labelForm.proteinas_g || ''} onChange={e => setLabelForm({...labelForm, proteinas_g: parseFloat(e.target.value)})} className="px-3 py-1 rounded border text-sm" />
                       <div className="hidden"></div>
                       <input type="number" placeholder="% VD Prot" value={labelForm.proteinas_vd || ''} onChange={e => setLabelForm({...labelForm, proteinas_vd: parseInt(e.target.value)})} className="px-3 py-1 rounded border text-sm" />

                       <input type="number" placeholder="G. Tot (g)" value={labelForm.grasas_totales_g || ''} onChange={e => setLabelForm({...labelForm, grasas_totales_g: parseFloat(e.target.value)})} className="px-3 py-1 rounded border text-sm" />
                       <div className="hidden"></div>
                       <input type="number" placeholder="% VD G. Tot" value={labelForm.grasas_totales_vd || ''} onChange={e => setLabelForm({...labelForm, grasas_totales_vd: parseInt(e.target.value)})} className="px-3 py-1 rounded border text-sm" />

                       <input type="number" placeholder="G. Sat (g)" value={labelForm.grasas_saturadas_g || ''} onChange={e => setLabelForm({...labelForm, grasas_saturadas_g: parseFloat(e.target.value)})} className="px-3 py-1 rounded border text-sm" />
                       <div className="hidden"></div>
                       <input type="number" placeholder="% VD G. Sat" value={labelForm.grasas_saturadas_vd || ''} onChange={e => setLabelForm({...labelForm, grasas_saturadas_vd: parseInt(e.target.value)})} className="px-3 py-1 rounded border text-sm" />

                       <input type="number" placeholder="G. Trans (g)" value={labelForm.grasas_trans_g || ''} onChange={e => setLabelForm({...labelForm, grasas_trans_g: parseFloat(e.target.value)})} className="px-3 py-1 rounded border text-sm" />
                       <div className="hidden"></div>
                       <div className="hidden"></div>

                       <input type="number" placeholder="Fibra (g)" value={labelForm.fibra_alimentaria_g || ''} onChange={e => setLabelForm({...labelForm, fibra_alimentaria_g: parseFloat(e.target.value)})} className="px-3 py-1 rounded border text-sm" />
                       <div className="hidden"></div>
                       <input type="number" placeholder="% VD Fibra" value={labelForm.fibra_alimentaria_vd || ''} onChange={e => setLabelForm({...labelForm, fibra_alimentaria_vd: parseInt(e.target.value)})} className="px-3 py-1 rounded border text-sm" />

                       <input type="number" placeholder="Sodio (mg)" value={labelForm.sodio_mg || ''} onChange={e => setLabelForm({...labelForm, sodio_mg: parseFloat(e.target.value)})} className="px-3 py-1 rounded border text-sm" />
                       <div className="hidden"></div>
                       <input type="number" placeholder="% VD Sodio" value={labelForm.sodio_vd || ''} onChange={e => setLabelForm({...labelForm, sodio_vd: parseInt(e.target.value)})} className="px-3 py-1 rounded border text-sm" />
                    </div>

                    <h4 className="text-lg font-bold text-gray-800 border-b pb-2 mt-6">Textos Legales y Establecimiento</h4>
                    <textarea placeholder="Ingredientes" value={labelForm.ingredientes || ''} onChange={e => setLabelForm({...labelForm, ingredientes: e.target.value})} className="w-full px-4 py-2 rounded-lg border h-20" />
                    <textarea placeholder="Conservación" value={labelForm.conservacion || ''} onChange={e => setLabelForm({...labelForm, conservacion: e.target.value})} className="w-full px-4 py-2 rounded-lg border h-20" />
                    <div className="grid grid-cols-2 gap-4">
                       <input type="text" placeholder="Elaborado por" value={labelForm.elaborado_por || ''} onChange={e => setLabelForm({...labelForm, elaborado_por: e.target.value})} className="px-4 py-2 rounded-lg border" />
                       <input type="text" placeholder="Para establecimiento" value={labelForm.para_establecimiento || ''} onChange={e => setLabelForm({...labelForm, para_establecimiento: e.target.value})} className="px-4 py-2 rounded-lg border" />
                       <input type="text" placeholder="Cód. EP" value={labelForm.codigo_ep || ''} onChange={e => setLabelForm({...labelForm, codigo_ep: e.target.value})} className="px-4 py-2 rounded-lg border" />
                       <input type="text" placeholder="Cód. HM" value={labelForm.codigo_hm || ''} onChange={e => setLabelForm({...labelForm, codigo_hm: e.target.value})} className="px-4 py-2 rounded-lg border" />
                    </div>
                    <div className="flex justify-end pt-4">
                       <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-xl flex items-center shadow-md"><Save className="w-5 h-5 mr-2" /> Guardar Etiqueta</button>
                    </div>
                  </form>
                )}

                {labelTab === 'imprimir' && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                       <h4 className="font-bold text-gray-800 mb-4 flex items-center"><Link2 className="w-5 h-5 mr-2 text-gray-500" /> Configuración de Impresora Zebra (QZ Tray)</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Impresora (o IP)</label>
                             <input type="text" value={printForm.printer_name} onChange={e => setPrintForm({...printForm, printer_name: e.target.value})} className="w-full px-4 py-2 rounded-lg border font-mono text-sm" />
                          </div>
                          <div className="flex items-end">
                             <button onClick={connectQZ} className={`px-4 py-2 rounded-lg font-bold text-sm w-full ${qzConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                                {qzConnected ? '✓ Conectado a QZ Tray' : 'Conectar a QZ Tray'}
                             </button>
                          </div>
                       </div>
                    </div>

                    <div className="bg-teal-50/50 p-6 rounded-xl border border-teal-100">
                       <h4 className="font-bold text-teal-800 mb-4">Datos Dinámicos de Impresión</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha Elaboración</label>
                             <input type="date" value={printForm.fecha_elaboracion} onChange={e => setPrintForm({...printForm, fecha_elaboracion: e.target.value})} className="w-full px-4 py-2 rounded-lg border" />
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nro. Lote</label>
                             <input type="text" value={printForm.nro_lote} onChange={e => setPrintForm({...printForm, nro_lote: e.target.value})} className="w-full px-4 py-2 rounded-lg border font-mono font-bold" />
                          </div>
                          <div className="col-span-2">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cantidad de copias a imprimir</label>
                             <input type="number" min="1" value={printForm.cantidad_copias} onChange={e => setPrintForm({...printForm, cantidad_copias: parseInt(e.target.value)})} className="w-1/3 px-4 py-2 rounded-lg border text-xl font-black" />
                          </div>
                       </div>
                    </div>

                    <div className="flex justify-end pt-4">
                       <button onClick={handlePrintLabel} className="bg-teal-600 hover:bg-teal-700 text-white font-black py-3 px-8 rounded-xl flex items-center shadow-lg transform transition active:scale-95 text-lg">
                          <Printer className="w-6 h-6 mr-3" /> ENVIAR A ZEBRA
                       </button>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Actualizar Productos */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[95vh] mt-4 mb-4 transform transition-all border-t-8 border-indigo-600">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 rounded-t-xl">
              <h3 className="text-xl font-black text-gray-800 flex items-center">
                <Upload className="w-6 h-6 mr-3 text-indigo-600" />
                Actualizar Productos
              </h3>
              <button type="button" disabled={isImportBusy} onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-red-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {!importResult && (
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-500 mb-2">Planilla de artículos de Tango (.xlsx)</label>
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={handleImportFileChange}
                    disabled={isImportBusy}
                    className="w-full p-2.5 rounded-xl border border-gray-300 text-sm font-medium"
                  />
                  <p className="text-xs text-gray-400 mt-2">Da de alta los productos que falten (por código interno). Los que ya existen no se modifican.</p>
                </div>
              )}

              {isImportBusy && (
                <p className="text-center py-8 text-gray-500 font-bold">Procesando...</p>
              )}

              {importError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" /> {importError}
                </div>
              )}

              {importResult && (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
                  <p className="font-black text-gray-800 text-lg">Actualización completada</p>
                  <p className="text-sm text-gray-500 font-bold mt-1">
                    {importResult.creados} producto(s) nuevo(s) · {importResult.categorias_creadas} categoría(s) nueva(s)
                  </p>
                </div>
              )}

              {importResumen && !isImportBusy && (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                      <p className="text-2xl font-black text-emerald-700">{importResumen.nuevos}</p>
                      <p className="text-[10px] font-bold uppercase text-emerald-600">Nuevos</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
                      <p className="text-2xl font-black text-gray-600">{importResumen.sin_cambios}</p>
                      <p className="text-[10px] font-bold uppercase text-gray-500">Sin Cambios</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                      <p className="text-2xl font-black text-amber-700">{importResumen.categorias_nuevas.length}</p>
                      <p className="text-[10px] font-bold uppercase text-amber-600">Categorías Nuevas</p>
                    </div>
                  </div>

                  {importResumen.categorias_nuevas.length > 0 && (
                    <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-xs font-black uppercase text-amber-700 mb-1">Se van a crear estas categorías:</p>
                      <p className="text-sm font-bold text-amber-800">{importResumen.categorias_nuevas.join(' · ')}</p>
                    </div>
                  )}

                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Productos nuevos a crear</p>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {importResumen.productos.filter(p => p.clasificacion === 'nuevo').map((p, idx) => (
                      <div key={`${p.codigo_interno}-${idx}`} className="p-3 rounded-xl border flex items-center justify-between text-emerald-600 bg-emerald-50 border-emerald-200">
                        <div className="flex items-center min-w-0">
                          <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-gray-800 truncate">
                              {p.codigo_interno} — {p.nombre}
                            </p>
                            <p className="text-xs font-medium">{p.familia || 'Sin familia'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {importResumen.nuevos === 0 && (
                      <p className="text-center py-4 text-gray-400 text-sm font-bold flex items-center justify-center">
                        <MinusCircle className="w-4 h-4 mr-2" /> No hay productos nuevos para crear.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {importResumen && !importResult && (
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end items-center gap-3 rounded-b-xl">
                <button type="button" disabled={isImportBusy} onClick={() => setIsImportModalOpen(false)} className="px-6 py-2.5 text-gray-700 bg-white border shadow-sm rounded-xl font-bold hover:bg-gray-100">
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isImportBusy || importResumen.nuevos === 0}
                  onClick={handleConfirmarImport}
                  className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 flex items-center disabled:opacity-50"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Confirmar ({importResumen.nuevos})
                </button>
              </div>
            )}

            {importResult && (
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end items-center gap-3 rounded-b-xl">
                <button type="button" onClick={() => setIsImportModalOpen(false)} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700">
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
