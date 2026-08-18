import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { CalendarDays, X, Printer } from 'lucide-react';

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

export default function Agenda() {
  const { api } = useAuth();
  const [users, setUsers] = useState([]);
  const [fechaDesde, setFechaDesde] = useState(toISODate(new Date()));
  const [fechaHasta, setFechaHasta] = useState(toISODate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
  const [responsableId, setResponsableId] = useState('');
  const [entidadTipo, setEntidadTipo] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/users/basico').then(res => setUsers(res.data)).catch(() => {});
  }, [api]);

  const handlePrintReporte = async () => {
    if (!fechaDesde || !fechaHasta) {
      setError('Seleccioná el rango de fechas.');
      return;
    }
    setIsPrinting(true);
    setError('');
    try {
      const params = { fecha_desde: fechaDesde, fecha_hasta: fechaHasta };
      if (responsableId) params.responsable_id = responsableId;
      if (entidadTipo) params.entidad_tipo = entidadTipo;

      const response = await api.get('/api/vencimientos/reporte/pdf', { params, responseType: 'blob' });
      const fileURL = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));

      const pdfWindow = window.open("", "_blank");
      if (pdfWindow) {
        pdfWindow.document.write(`
          <html>
            <head>
              <title>Visor PDF - Agenda de Vencimientos</title>
              <style>body { margin: 0; padding: 0; overflow: hidden; background-color: #525659; }</style>
            </head>
            <body>
              <iframe src="${fileURL}" width="100%" height="100%" style="border:none;"></iframe>
            </body>
          </html>
        `);
      }
    } catch (err) {
      setError('Error al generar el reporte.');
    }
    setIsPrinting(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      {!isModalOpen && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-black text-gray-800 mb-2">Agenda de Vencimientos</h2>
          <p className="text-gray-500 font-medium mb-6">Generá un PDF con los vencimientos de trámites de Vehículos y Choferes.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-sm transition-all"
          >
            Abrir filtro
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border-t-8 border-amber-500">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 rounded-t-xl">
              <h3 className="text-xl font-black text-gray-800 flex items-center">
                <CalendarDays className="w-6 h-6 mr-3 text-amber-500" />
                Agenda de Vencimientos
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 font-bold border border-red-200 text-sm">
                  ⚠️ {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">Fecha desde</label>
                  <input
                    type="date"
                    className="w-full p-2.5 rounded-lg border border-gray-300 font-bold bg-white"
                    value={fechaDesde}
                    onChange={e => setFechaDesde(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">Fecha hasta</label>
                  <input
                    type="date"
                    className="w-full p-2.5 rounded-lg border border-gray-300 font-bold bg-white"
                    value={fechaHasta}
                    onChange={e => setFechaHasta(e.target.value)}
                  />
                </div>
              </div>

              <label className="block text-[11px] font-bold text-gray-500 mb-1">Responsable</label>
              <select
                className="w-full p-2.5 rounded-lg border border-gray-300 font-bold bg-white mb-4"
                value={responsableId}
                onChange={e => setResponsableId(e.target.value)}
              >
                <option value="">Todos</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.nombre || u.email}</option>)}
              </select>

              <label className="block text-[11px] font-bold text-gray-500 mb-1">Tipo</label>
              <select
                className="w-full p-2.5 rounded-lg border border-gray-300 font-bold bg-white mb-6"
                value={entidadTipo}
                onChange={e => setEntidadTipo(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="vehiculo">Vehículo</option>
                <option value="chofer">Chofer</option>
              </select>

              <button
                onClick={handlePrintReporte}
                disabled={isPrinting}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-xl font-bold shadow-sm flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPrinting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Printer className="w-4 h-4 mr-2" />
                )}
                Generar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
