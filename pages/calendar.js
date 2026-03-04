// pages/calendar.js  — Task Calendar for non-admin users
import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const COLORS = [
  { v: '#3B82F6', l: 'Azul' }, { v: '#10B981', l: 'Verde' },
  { v: '#F59E0B', l: 'Amarillo' }, { v: '#EF4444', l: 'Rojo' },
  { v: '#8B5CF6', l: 'Morado' }, { v: '#EC4899', l: 'Rosa' },
  { v: '#06B6D4', l: 'Cyan' }, { v: '#F97316', l: 'Naranja' },
];

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function Modal({ show, title, children, onClose }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const EMPTY_TASK = { titulo: '', descripcion: '', fecha: '', hora_inicio: '', hora_fin: '', color: '#3B82F6' };

export default function CalendarPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [tasks, setTasks]     = useState([]);
  const [view, setView]       = useState('month'); // month | week | list
  const [today]               = useState(new Date());
  const [current, setCurrent] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask]   = useState(null);
  const [form, setForm]           = useState(EMPTY_TASK);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const pollingRef = useRef(null);

  const fetchTasks = useCallback(async () => {
    try { const r = await fetch('/api/tasks'); if (r.ok) setTasks(await r.json()); } catch {}
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(u => { if (!u) { router.push('/'); return; } setCurrentUser(u); });
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;
    fetchTasks();
    pollingRef.current = setInterval(fetchTasks, 5000);
    return () => clearInterval(pollingRef.current);
  }, [currentUser, fetchTasks]);

  const openNew = (dateStr = '') => {
    setEditTask(null);
    setForm({ ...EMPTY_TASK, fecha: dateStr || today.toISOString().split('T')[0] });
    setShowModal(true);
    setError('');
  };

  const openEdit = (task) => {
    setEditTask(task);
    setForm({
      titulo: task.titulo, descripcion: task.descripcion || '',
      fecha: task.fecha?.split('T')[0] || task.fecha,
      hora_inicio: task.hora_inicio || '', hora_fin: task.hora_fin || '',
      color: task.color || '#3B82F6',
    });
    setShowModal(true);
    setError('');
  };

  const handleSave = async () => {
    if (!form.titulo || !form.fecha) { setError('Título y fecha son requeridos.'); return; }
    setLoading(true);
    try {
      const url    = editTask ? `/api/tasks/${editTask.id}` : '/api/tasks';
      const method = editTask ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Error al guardar.'); return; }
      setShowModal(false);
      await fetchTasks();
    } catch { setError('Error de red.'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!r.ok) { const d = await r.json(); setError(d.error || 'Error al eliminar.'); return; }
      setDeleteConfirm(null); setShowModal(false);
      await fetchTasks();
    } catch { setError('Error de red.'); }
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const year = current.getFullYear();
  const month = current.getMonth();

  const getDaysInMonth = (y, m) => {
    const first = new Date(y, m, 1).getDay();
    const last  = new Date(y, m + 1, 0).getDate();
    return { first, last };
  };

  const tasksByDate = tasks.reduce((acc, t) => {
    const d = (t.fecha || '').split('T')[0];
    if (!acc[d]) acc[d] = [];
    acc[d].push(t);
    return acc;
  }, {});

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1));

  const roleLabels = {
    ADMIN:'Administrador', TEACHER:'Docente', STUDENT:'Alumno',
    TUTOR:'Tutor', SECRETARY:'Secretaria',
  };

  if (!currentUser) {
    return <div className="min-h-screen flex items-center justify-center">Cargando…</div>;
  }

  const { first, last } = getDaysInMonth(year, month);

  return (
    <>
      <Head><title>Sistema Escolar – Calendario de Tareas</title></Head>
      <div className="min-h-screen flex flex-col bg-gray-50">

        {/* Header */}
        <header style={{ background: 'var(--navy)' }} className="text-white px-6 py-3 flex items-center justify-between shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">🎓</div>
            <div>
              <div className="font-bold text-sm">TECNOLÓGICO NACIONAL DE MÉXICO</div>
              <div className="text-xs text-white/70">Calendario de Tareas</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-white/70">
                {roleLabels[currentUser.tipo_persona] || currentUser.tipo_persona}
              </div>
              <div className="text-sm font-bold">{currentUser.nombre || currentUser.username}</div>
            </div>
            <button onClick={() => openNew()}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition flex items-center gap-2">
              ⊕ Nueva Tarea
            </button>
            <button onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded transition">
              Cerrar sesión
            </button>
          </div>
        </header>

        {/* View toggle + navigation */}
        <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="text-gray-500 hover:text-gray-800 text-xl font-bold px-2">‹</button>
            <h2 className="text-xl font-bold text-gray-800">{MONTHS_ES[month]} {year}</h2>
            <button onClick={nextMonth} className="text-gray-500 hover:text-gray-800 text-xl font-bold px-2">›</button>
            <button onClick={() => setCurrent(new Date())}
              className="text-sm text-blue-600 hover:text-blue-800 border border-blue-300 px-3 py-1 rounded">
              Hoy
            </button>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            {[['month','Mes'],['week','Semana'],['list','Lista']].map(([v,l]) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${view === v ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-500">
            {tasks.length} tarea(s) • Actualización cada 5s
          </div>
        </div>

        {/* Calendar Grid */}
        <main className="flex-1 p-4 overflow-auto">
          {view === 'month' && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b">
                {DAYS_ES.map(d => (
                  <div key={d} className="py-3 text-center text-sm font-semibold text-gray-500 bg-gray-50">{d}</div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7">
                {/* Empty cells before first day */}
                {Array.from({ length: first }).map((_, i) => (
                  <div key={`e${i}`} className="min-h-24 border-b border-r bg-gray-50/50" />
                ))}
                {/* Day cells */}
                {Array.from({ length: last }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const dayTasks = tasksByDate[dateStr] || [];
                  const isToday = dateStr === today.toISOString().split('T')[0];
                  return (
                    <div key={day}
                      className={`min-h-24 border-b border-r p-1 cursor-pointer hover:bg-blue-50/30 transition relative group ${isToday ? 'bg-blue-50' : ''}`}
                      onClick={() => openNew(dateStr)}>
                      <div className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-1
                        ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                        {day}
                      </div>
                      <div className="space-y-0.5 max-h-20 overflow-hidden">
                        {dayTasks.slice(0, 3).map(t => (
                          <div key={t.id}
                            className="text-xs px-1.5 py-0.5 rounded truncate text-white font-medium cursor-pointer"
                            style={{ backgroundColor: t.color || '#3B82F6' }}
                            onClick={e => { e.stopPropagation(); openEdit(t); }}>
                            {t.hora_inicio ? `${t.hora_inicio.slice(0,5)} ` : ''}{t.titulo}
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <div className="text-xs text-gray-500 pl-1">+{dayTasks.length - 3} más…</div>
                        )}
                      </div>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition">
                        <span className="text-xs text-blue-400">+</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'list' && (
            <div className="space-y-3 max-w-2xl mx-auto">
              {tasks.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">📋</div>
                  <p>No hay tareas registradas.</p>
                  <button onClick={() => openNew()} className="mt-3 text-blue-600 hover:underline text-sm">
                    + Agregar primera tarea
                  </button>
                </div>
              )}
              {[...tasks].sort((a,b) => a.fecha > b.fecha ? 1 : -1).map(t => (
                <div key={t.id} className="bg-white rounded-xl shadow p-4 flex items-start gap-4 hover:shadow-md transition">
                  <div className="w-3 h-full min-h-12 rounded-full" style={{ backgroundColor: t.color || '#3B82F6', minWidth: 4 }} />
                  <div className="flex-1">
                    <div className="font-bold text-gray-800">{t.titulo}</div>
                    {t.descripcion && <p className="text-sm text-gray-600 mt-0.5">{t.descripcion}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <span>📅 {new Date(t.fecha).toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</span>
                      {t.hora_inicio && <span>🕐 {t.hora_inicio.slice(0,5)}{t.hora_fin ? ` – ${t.hora_fin.slice(0,5)}` : ''}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(t)}
                      className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 p-2 rounded-lg text-xs transition">✎</button>
                    <button onClick={() => setDeleteConfirm(t)}
                      className="bg-red-100 hover:bg-red-200 text-red-800 p-2 rounded-lg text-xs transition">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'week' && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              {/* Weekly view */}
              {(() => {
                const startOfWeek = new Date(current);
                const dow = startOfWeek.getDay();
                startOfWeek.setDate(startOfWeek.getDate() - dow);
                const days = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(startOfWeek);
                  d.setDate(d.getDate() + i);
                  return d;
                });
                return (
                  <div className="grid grid-cols-7 divide-x">
                    {days.map((d, i) => {
                      const ds = d.toISOString().split('T')[0];
                      const dt = tasksByDate[ds] || [];
                      const isT = ds === today.toISOString().split('T')[0];
                      return (
                        <div key={i} className={`min-h-96 ${isT ? 'bg-blue-50' : ''}`}>
                          <div className={`p-3 text-center border-b ${isT ? 'bg-blue-100' : 'bg-gray-50'}`}>
                            <div className="text-xs text-gray-500">{DAYS_ES[d.getDay()]}</div>
                            <div className={`text-2xl font-bold ${isT ? 'text-blue-700' : 'text-gray-700'}`}>{d.getDate()}</div>
                          </div>
                          <div className="p-2 space-y-1" onClick={() => openNew(ds)}>
                            {dt.map(t => (
                              <div key={t.id}
                                className="text-xs p-1.5 rounded text-white truncate cursor-pointer"
                                style={{ backgroundColor: t.color || '#3B82F6' }}
                                onClick={e => { e.stopPropagation(); openEdit(t); }}>
                                {t.hora_inicio && <span className="font-bold">{t.hora_inicio.slice(0,5)} </span>}
                                {t.titulo}
                              </div>
                            ))}
                            {dt.length === 0 && (
                              <div className="text-xs text-center text-gray-300 mt-4 cursor-pointer hover:text-gray-400">+ agregar</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </main>

        {/* Task Form Modal */}
        <Modal show={showModal} title={editTask ? 'Editar Tarea' : 'Nueva Tarea'} onClose={() => setShowModal(false)}>
          {error && <div className="bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}
          <div className="space-y-3">
            <div>
              <label className="form-label">Título *</label>
              <input className="form-input" placeholder="Título de la tarea" value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Descripción</label>
              <textarea className="form-input resize-none h-20" placeholder="Descripción (opcional)" value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="form-label">Fecha *</label>
                <input className="form-input" type="date" value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Hora inicio</label>
                <input className="form-input" type="time" value={form.hora_inicio}
                  onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Hora fin</label>
                <input className="form-input" type="time" value={form.hora_fin}
                  onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="form-label">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c.v} title={c.l}
                    className={`w-8 h-8 rounded-full transition-transform ${form.color === c.v ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c.v }}
                    onClick={() => setForm(f => ({ ...f, color: c.v }))} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-between mt-5">
            {editTask && (
              <button onClick={() => setDeleteConfirm(editTask)}
                className="btn-red">Eliminar</button>
            )}
            <div className="flex gap-3 ml-auto">
              <button onClick={() => setShowModal(false)} className="btn-gray">Cancelar</button>
              <button onClick={handleSave} disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded text-sm transition disabled:opacity-60">
                {loading ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Delete confirm modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
              <h3 className="font-bold text-lg mb-2">¿Eliminar tarea?</h3>
              <p className="text-sm text-gray-600 mb-5">¿Está seguro de eliminar "<strong>{deleteConfirm.titulo}</strong>"?</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="btn-gray">Cancelar</button>
                <button onClick={() => handleDelete(deleteConfirm.id)} disabled={loading} className="btn-red">
                  {loading ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
