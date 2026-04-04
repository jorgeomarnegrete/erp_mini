import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Code2, Save, FileText, CheckCircle2 } from 'lucide-react';

export default function PlantillasDocumentos() {
  const { api } = useAuth();
  const [plantillas, setPlantillas] = useState([]);
  const [selectedID, setSelectedID] = useState(null);
  
  const [form, setForm] = useState({ nombre: '', tipo_documento: '', codigo_html: '', activa: true });
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    fetchPlantillas();
  }, []);

  const fetchPlantillas = async () => {
    try {
      const res = await api.get('/api/plantillas');
      setPlantillas(res.data);
      if (res.data.length > 0 && !selectedID) {
        selectPlantilla(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectPlantilla = (p) => {
    setSelectedID(p.id);
    setForm({ nombre: p.nombre, tipo_documento: p.tipo_documento, codigo_html: p.codigo_html, activa: p.activa });
    setIsDone(false);
  };

  const savePlantilla = async () => {
    setIsSaving(true);
    try {
      await api.put(`/api/plantillas/${selectedID}`, form);
      setIsDone(true);
      setTimeout(() => setIsDone(false), 3000);
      fetchPlantillas();
    } catch (err) {
      alert("Error guardando plantilla");
    }
    setIsSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative flex flex-col h-[calc(100vh-8rem)]">
      
      {/* HEADER */}
      <div className="px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-slate-800 to-slate-900 flex justify-between items-center text-white shrink-0">
        <div className="flex items-center">
          <div className="bg-slate-700 p-2 rounded-lg text-white mr-4 shadow-md border border-slate-600">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Plantillas de Documentos</h2>
            <p className="text-xs text-slate-300 font-bold uppercase tracking-widest mt-0.5">Edición de Código HTML (Jinja2)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
             className="bg-slate-700 border border-slate-600 text-white rounded-lg p-2 font-bold outline-none cursor-pointer"
             value={selectedID || ''}
             onChange={e => {
                const found = plantillas.find(p => p.id === parseInt(e.target.value));
                if (found) selectPlantilla(found);
             }}
          >
             {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.tipo_documento})</option>)}
          </select>
          
          <button 
             onClick={savePlantilla} 
             disabled={isSaving}
             className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-2 rounded-xl font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center"
          >
             {isSaving ? <span className="animate-pulse">Guardando...</span> : isDone ? <><CheckCircle2 className="w-5 h-5 mr-2" /> Guardado</> : <><Save className="w-5 h-5 mr-2" /> Guardar</>}
          </button>
        </div>
      </div>

      {/* WORKSPACE SPLIT DUAL SCREEN */}
      <div className="flex flex-1 overflow-hidden">
         
         {/* HTML RAW EDITOR AREA (LEFT 70%) */}
         <div className="w-2/3 h-full border-r border-slate-200 flex flex-col bg-slate-50">
            <div className="bg-slate-100 px-4 py-2 text-xs font-black text-slate-500 uppercase tracking-widest border-b flex justify-between">
               <span>Plantilla: {form.nombre}</span>
               <span>HTML5 / CSS3 / Jinja2</span>
            </div>
            <textarea 
               spellCheck="false"
               className="flex-1 w-full p-6 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm leading-relaxed outline-none resize-none"
               value={form.codigo_html}
               onChange={e => setForm({...form, codigo_html: e.target.value})}
               style={{ tabSize: 4 }}
            />
         </div>

         {/* CHEAT SHEET AREA (RIGHT 30%) */}
         <div className="w-1/3 h-full overflow-y-auto bg-white p-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center mb-6">
              <FileText className="w-4 h-4 mr-2 text-indigo-500" />
              Glosario de Variables
            </h3>
            
            <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
              Utilice las siguientes variables enceradas en dobles llaves <code>{`{{ variable }}`}</code> para imprimir los datos del sistema. Funciona bajo estándar Jinja2. Usa bucles <code>{`{% for %}`}</code> para dibujar las tablas de detalle.
            </p>

            <div className="space-y-6">
               
               <div>
                 <h4 className="font-bold text-xs bg-slate-100 text-slate-600 p-2 rounded-t-lg border border-b-0 border-slate-200">1. Empresa Emisora</h4>
                 <div className="border border-slate-200 p-3 rounded-b-lg font-mono text-xs text-indigo-600 space-y-2 bg-slate-50">
                    <p>{`{{ empresa.razon_social }}`}</p>
                    <p>{`{{ empresa.cuit }}`}</p>
                    <p>{`{{ empresa.domicilio_comercial }}`}</p>
                    <p>{`{{ empresa.telefono }}`}</p>
                    <p className="text-slate-400 text-[10px] mt-2 italic">// Etiqueta Img para inyectar Base64 puro</p>
                    <p>{`<img src="{{ empresa.logo_base64 }}" />`}</p>
                 </div>
               </div>

               <div>
                 <h4 className="font-bold text-xs bg-slate-100 text-slate-600 p-2 rounded-t-lg border border-b-0 border-slate-200">2. Cliente Receptor</h4>
                 <div className="border border-slate-200 p-3 rounded-b-lg font-mono text-xs text-indigo-600 space-y-2 bg-slate-50">
                    <p>{`{{ cliente.razon_social }}`}</p>
                    <p>{`{{ cliente.documento }}`}</p>
                    <p>{`{{ cliente.direccion }}, {{ cliente.localidad }}`}</p>
                 </div>
               </div>

               <div>
                 <h4 className="font-bold text-xs bg-slate-100 text-slate-600 p-2 rounded-t-lg border border-b-0 border-slate-200">3. Detalles de Comprobante</h4>
                 <div className="border border-slate-200 p-3 rounded-b-lg font-mono text-xs text-indigo-600 space-y-2 bg-slate-50">
                    <p>{`{{ cotizacion.numero_comprobante }}`}</p>
                    <p>{`{{ cotizacion.fecha_emision.strftime('%d/%m/%Y') }}`}</p>
                    <p>{`{{ "%.2f"|format(cotizacion.subtotal) }}`}</p>
                    <p>{`{{ "%.2f"|format(cotizacion.total) }}`}</p>
                 </div>
               </div>

               <div>
                 <h4 className="font-bold text-xs bg-amber-50 text-amber-600 p-2 rounded-t-lg border border-b-0 border-amber-200">4. Bucle Maestro (Renglones)</h4>
                 <div className="border border-amber-200 p-3 rounded-b-lg font-mono text-[11px] text-slate-800 bg-amber-50/50">
                    <pre className="whitespace-pre-wrap">
{`{% for det in detalles %}
  <tr>
    <td>{{ "%.2f"|format(det.cantidad) }}</td>
    <td>{{ det.descripcion }}</td>
    <td>$ {{ "%.2f"|format(det.subtotal) }}</td>
  </tr>
{% endfor %}`}
                    </pre>
                 </div>
               </div>

            </div>
         </div>
      </div>
    </div>
  );
}
