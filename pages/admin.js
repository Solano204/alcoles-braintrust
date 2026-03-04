// pages/admin.js
import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

// ─── Validators ──────────────────────────────────────────────
const VALIDATORS = {
  telefono: {
    test: v => !v || /^[0-9+\-\s()]{7,20}$/.test(v.trim()),
    msg: 'Teléfono inválido (7-20 dígitos, puede incluir +, -, espacios)',
  },
  correo_electronico: {
    test: v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    msg: 'Correo electrónico inválido',
  },
  codigo_postal: {
    test: v => !v || /^\d{4,6}$/.test(v.trim()),
    msg: 'Código postal inválido (4-6 dígitos)',
  },
  rfc: {
    test: v => !v || /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{2,3}$/.test(v.trim().toUpperCase()),
    msg: 'RFC inválido (ej: XAXX010101H00)',
  },
  facebook: {
    test: v => !v || v.trim().length <= 200,
    msg: 'Facebook demasiado largo',
  },
  instagram: {
    test: v => !v || v.trim().length <= 200,
    msg: 'Instagram demasiado largo',
  },
  url: {
    test: v => !v || /^https?:\/\/.+/.test(v.trim()) || v.trim().length < 3,
    msg: 'URL debe comenzar con http:// o https://',
  },
  www: {
    test: v => !v || v.trim().length <= 500,
    msg: 'WWW demasiado larga',
  },
  edad: {
    test: v => !v || (Number(v) >= 3 && Number(v) <= 120),
    msg: 'Edad debe estar entre 3 y 120',
  },
  username: {
    test: v => !v || /^[a-zA-Z0-9_.\-]{3,50}$/.test(v.trim()),
    msg: 'Usuario: 3-50 caracteres, solo letras, números, _ . -',
  },
  password: {
    test: (v, mode) => mode === 'edit' ? (!v || v.length >= 6) : v && v.length >= 6,
    msg: 'Contraseña debe tener al menos 6 caracteres',
  },
};

function validateField(field, value, mode) {
  const v = VALIDATORS[field];
  if (!v) return null;
  return v.test(value, mode) ? null : v.msg;
}

// ─── CURP parser ─────────────────────────────────────────────
function parseCURP(curp) {
  if (!curp || curp.length < 10) return null;
  const yy = parseInt(curp.substring(4, 6));
  const mm = parseInt(curp.substring(6, 8));
  const dd = parseInt(curp.substring(8, 10));
  if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const curYear = new Date().getFullYear();
  const fullYear = yy <= (curYear % 100) ? 2000 + yy : 1900 + yy;
  const bd = new Date(fullYear, mm - 1, dd);
  if (isNaN(bd.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  if (today.getMonth() < mm - 1 || (today.getMonth() === mm - 1 && today.getDate() < dd)) age--;
  if (age < 3 || age > 100) return null;
  return {
    date: `${fullYear}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`,
    age,
  };
}

// ─── Autocomplete input ───────────────────────────────────────
function AutoInput({ label, value, onChange, options = [], disabled = false,
                     required = false, error = null }) {
  const [inputVal, setInputVal] = useState(value || '');
  const [open, setOpen]         = useState(false);
  const [filtered, setFiltered] = useState([]);
  const wrapRef = useRef(null);

  useEffect(() => { setInputVal(value || ''); }, [value]);

  const handleChange = (e) => {
    const v = e.target.value;
    setInputVal(v);
    onChange(v);
    if (v.trim()) {
      const lower = v.toLowerCase();
      setFiltered(options.filter(o => o.valor.toLowerCase().includes(lower)).slice(0, 8));
      setOpen(true);
    } else { setOpen(false); }
  };

  const pick = (opt) => { setInputVal(opt.valor); onChange(opt.valor); setOpen(false); };

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={wrapRef}>
      <label className={`form-label ${error ? 'text-red-600' : ''}`}>
        {label}{required && ' *'}
      </label>
      <input
        className={`form-input ${disabled ? 'bg-gray-100 opacity-60 cursor-not-allowed' : ''} ${error ? 'border-red-400 bg-red-50' : ''}`}
        value={inputVal} onChange={handleChange} disabled={disabled}
        placeholder={label} autoComplete="off"
        onFocus={() => {
          if (inputVal.trim()) {
            const lower = inputVal.toLowerCase();
            setFiltered(options.filter(o => o.valor.toLowerCase().includes(lower)).slice(0, 8));
            setOpen(true);
          }
        }}
      />
      {error && <p className="text-red-500 text-xs mt-0.5">{error}</p>}
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 bg-white border border-gray-200 rounded shadow-lg mt-0.5 w-full max-h-40 overflow-auto text-sm">
          {filtered.map(opt => (
            <li key={opt.id} className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer"
              onMouseDown={() => pick(opt)}>{opt.valor}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Validated text input ─────────────────────────────────────
function VInput({ label, field, value, onChange, disabled, required, type='text',
                  maxLength, placeholder, formErrors }) {
  const err = formErrors?.[field];
  return (
    <div>
      <label className={`form-label ${err ? 'text-red-600' : ''}`}>
        {label}{required && ' *'}
      </label>
      <input
        type={type} maxLength={maxLength}
        placeholder={placeholder || label}
        className={`form-input ${disabled ? 'bg-gray-100 opacity-60 cursor-not-allowed' : ''} ${err ? 'border-red-400 bg-red-50' : ''}`}
        value={value || ''} readOnly={disabled}
        onChange={e => !disabled && onChange(field, e.target.value)}
      />
      {err && <p className="text-red-500 text-xs mt-0.5">{err}</p>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────
function Modal({ show, title, message, type='confirm', onConfirm, onCancel,
                 confirmLabel='Confirmar', cancelLabel='Cancelar' }) {
  if (!show) return null;
  const colors = { confirm:'bg-blue-600', danger:'bg-red-600', info:'bg-gray-600' };
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-5 whitespace-pre-wrap">{message}</p>
        <div className="flex gap-3 justify-end">
          {onCancel  && <button onClick={onCancel}  className="btn-gray">{cancelLabel}</button>}
          {onConfirm && (
            <button onClick={onConfirm}
              className={`${colors[type]} hover:opacity-90 text-white font-bold py-2 px-4 rounded text-sm transition`}>
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PERSONS TAB ─────────────────────────────────────────────
const EMPTY_PERSON = {
  curp:'', rfc:'',
  primer_nombre:'', apellido_paterno:'', segundo_nombre:'', apellido_materno:'',
  genero_id:'', grado_academico_id:'', puesto:'', fecha_nacimiento:'', edad:'',
  nacionalidad_id:'', numero:'',
  calle:'', colonia:'', municipio:'', estado_id:'', pais:'México',
  codigo_postal:'', referencia:'',
  telefono:'', correo_electronico:'',
  facebook:'', instagram:'', tiktok:'', linkedin:'', twitter:'', url:'', www:'',
};

function PersonsTab({ currentUser, cats, reloadCats }) {
  const [persons, setPersons]           = useState([]);
  const [form, setForm]                 = useState(EMPTY_PERSON);
  const [mode, setMode]                 = useState('view');   // view | add | edit
  const [selected, setSelected]         = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [modal, setModal]               = useState(null);
  const [curpLocked, setCurpLocked]     = useState(false);
  const [curpStatus, setCurpStatus]     = useState(null);
  const [rfcStatus, setRfcStatus]       = useState(null);
  const [fieldsUnlocked, setFieldsUnlocked] = useState(false);
  const [formErrors, setFormErrors]     = useState({});
  const pollingRef = useRef(null);
  const rfcTimer   = useRef(null);

  const fetchPersons = useCallback(async () => {
    try { const r = await fetch('/api/persons'); if (r.ok) setPersons(await r.json()); } catch {}
  }, []);

  useEffect(() => {
    fetchPersons();
    pollingRef.current = setInterval(fetchPersons, 5000);
    return () => clearInterval(pollingRef.current);
  }, [fetchPersons]);

  const showMsg = (msg, isError=false) => {
    if (isError) { setError(msg); setSuccess(''); }
    else { setSuccess(msg); setError(''); }
    setTimeout(() => { setError(''); setSuccess(''); }, 6000);
  };

  // Validate all fields that have validators, return errors object
  const runValidations = (f, m) => {
    const errs = {};
    ['telefono','correo_electronico','codigo_postal','rfc','url','www','edad'].forEach(field => {
      const msg = validateField(field, f[field], m);
      if (msg) errs[field] = msg;
    });
    if (!f.primer_nombre?.trim())    errs.primer_nombre    = 'Requerido';
    if (!f.apellido_paterno?.trim()) errs.apellido_paterno = 'Requerido';
    return errs;
  };

  // ── CURP ─────────────────────────────────────────────────────
  const handleCURPChange = async (val) => {
    const v = val.toUpperCase().replace(/[^A-Z0-9]/g,'');
    setForm(f => ({ ...f, curp: v }));
    setCurpStatus(null); setFieldsUnlocked(false);
    if (v.length === 18) {
      const parsed = parseCURP(v);
      if (parsed) {
        setForm(f => ({ ...f, curp: v, fecha_nacimiento: parsed.date, edad: parsed.age }));
      } else {
        setCurpStatus('invalid');
        showMsg('CURP con fecha inválida o fuera de rango.', true); return;
      }
      setCurpStatus('checking');
      try {
        const r = await fetch(`/api/persons/${v}`);
        setCurpStatus(r.ok ? 'exists' : 'ok');
        if (r.ok) showMsg('⚠ Esa CURP ya está registrada.', true);
      } catch { setCurpStatus(null); }
    }
  };

  // ── RFC ──────────────────────────────────────────────────────
  const handleRFCChange = (val) => {
    const v = val.toUpperCase().replace(/[^A-Z0-9]/g,'');
    setForm(f => ({ ...f, rfc: v }));
    setRfcStatus(null); setFieldsUnlocked(false);
    clearTimeout(rfcTimer.current);
    if (!v) { setRfcStatus('ok'); return; }
    rfcTimer.current = setTimeout(() => {
      const dup = persons.find(p => p.rfc && p.rfc.toLowerCase() === v.toLowerCase());
      if (dup) { setRfcStatus('exists'); showMsg('⚠ Ese RFC ya existe.', true); }
      else setRfcStatus('ok');
    }, 300);
  };

  // Unlock when both ok
  useEffect(() => {
    if (mode !== 'add') return;
    const curpOk = curpStatus === 'ok';
    const rfcOk  = rfcStatus === 'ok' || (!form.rfc && rfcStatus === null);
    if (curpOk && rfcOk) setFieldsUnlocked(true);
    else if (curpStatus === 'exists' || rfcStatus === 'exists') setFieldsUnlocked(false);
  }, [curpStatus, rfcStatus, mode, form.rfc]);

  const setField = (field) => (val) => {
    setForm(f => ({ ...f, [field]: val }));
    // Clear error on edit
    if (formErrors[field]) setFormErrors(e => ({ ...e, [field]: null }));
  };

  const handleFieldChange = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    const err = validateField(field, val, mode);
    setFormErrors(e => ({ ...e, [field]: err || null }));
  };

  const selectPerson = (p) => {
    setSelected(p.curp); setForm({ ...EMPTY_PERSON, ...p });
    setMode('view'); setError(''); setSuccess('');
    setCurpStatus(null); setRfcStatus(null); setFieldsUnlocked(false); setFormErrors({});
  };

  const handleAltas = () => {
    setForm(EMPTY_PERSON); setSelected(null); setMode('add');
    setCurpLocked(false); setCurpStatus(null); setRfcStatus(null);
    setFieldsUnlocked(false); setError(''); setSuccess(''); setFormErrors({});
  };

  const handleCancelar = () => {
    setForm(EMPTY_PERSON); setSelected(null); setMode('view');
    setCurpLocked(false); setCurpStatus(null); setRfcStatus(null);
    setFieldsUnlocked(false); setError(''); setSuccess(''); setFormErrors({});
  };

  const handleSave = async () => {
    const errs = runValidations(form, mode);
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      showMsg('Corrija los errores antes de guardar.', true); return;
    }
    if (mode === 'add' && curpStatus === 'exists') { showMsg('Esa CURP ya existe.', true); return; }
    if (mode === 'add' && rfcStatus === 'exists')  { showMsg('Ese RFC ya existe.', true);  return; }
    setLoading(true);
    try {
      const url    = mode === 'add' ? '/api/persons' : `/api/persons/${form.curp}`;
      const method = mode === 'add' ? 'POST' : 'PUT';
      const r = await fetch(url, {
        method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) { showMsg(data.error || 'Error al guardar.', true); return; }
      showMsg(mode === 'add' ? '✅ Persona creada.' : '✅ Persona actualizada.');
      await fetchPersons(); await reloadCats(); handleCancelar();
    } catch { showMsg('Error de red.', true); }
    finally { setLoading(false); }
  };

  const handleBajas = () => {
    if (!selected) { showMsg('Seleccione una persona primero.', true); return; }
    const p = persons.find(x => x.curp === selected);
    if (!p) return;
    if (p.cuentas?.length > 0 && p.cuentas[0] !== null) {
      const accs = p.cuentas.map(u => `• ${u.username} (${u.tipo_persona})`).join('\n');
      setModal({ show:true, type:'info', title:'No se puede eliminar',
        message:`Esta persona tiene cuentas vinculadas:\n${accs}\n\nElimínelas primero en la pestaña Usuarios.`,
        onConfirm:null, onCancel:()=>setModal(null), cancelLabel:'Entendido' });
    } else {
      setModal({ show:true, type:'danger', title:'¿Eliminar persona?',
        message:`¿Eliminar a "${p.primer_nombre} ${p.apellido_paterno}" (${p.curp})?\nEsta acción no se puede deshacer.`,
        onConfirm: async () => {
          setModal(null); setLoading(true);
          try {
            const r = await fetch(`/api/persons/${selected}`, { method:'DELETE' });
            const d = await r.json();
            if (!r.ok) { showMsg(d.error || 'Error.', true); return; }
            showMsg('✅ Persona eliminada.'); await fetchPersons(); handleCancelar();
          } catch { showMsg('Error de red.', true); }
          finally { setLoading(false); }
        },
        onCancel:()=>setModal(null), confirmLabel:'Sí, eliminar' });
    }
  };

  const canEdit = mode === 'edit' || (mode === 'add' && fieldsUnlocked);

  // ── Button state rules ────────────────────────────────────────
  // ALTAS:    disabled when in add or edit mode
  // GUARDAR:  disabled in view mode, or add+not unlocked
  // BAJAS:    disabled when in add or edit mode, or nothing selected
  // CANCELAR: disabled in view mode
  const btn = {
    altas:    mode === 'add' || mode === 'edit',
    guardar:  mode === 'view' || loading || (mode === 'add' && !fieldsUnlocked),
    bajas:    mode === 'add' || mode === 'edit' || !selected,
    cancelar: mode === 'view',
  };

  const FS = (label, field, options) => (
    <div>
      <label className="form-label">{label}</label>
      <select className={`form-select ${!canEdit?'bg-gray-100 opacity-60':''}`}
        value={form[field]||''} disabled={!canEdit}
        onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}>
        <option value="">-- {label} --</option>
        {options.map(o=><option key={o.id} value={o.id}>{o.valor}</option>)}
      </select>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {modal && <Modal {...modal} />}
      {error   && <div className="bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}
      {success && <div className="bg-green-50 border border-green-300 text-green-700 text-sm px-3 py-2 rounded">{success}</div>}

      <div className="flex gap-3">
        {/* ── LEFT FORM ── */}
        <div className="flex-1 bg-white rounded-lg shadow p-4 space-y-4">

          {/* CURP + RFC */}
          <div>
            <h2 className="section-title">
              {mode === 'add' && !fieldsUnlocked ? '① Verifique CURP y RFC' : 'Datos Personales'}
            </h2>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="form-label">
                  CURP *{' '}
                  {curpStatus==='checking'&&<span className="text-blue-400 text-xs">verificando…</span>}
                  {curpStatus==='ok'      &&<span className="text-green-500 text-xs">✓ disponible</span>}
                  {curpStatus==='exists'  &&<span className="text-red-500 text-xs">⚠ ya existe</span>}
                  {curpStatus==='invalid' &&<span className="text-red-500 text-xs">⚠ inválida</span>}
                </label>
                <input
                  className={`form-input uppercase ${curpLocked?'bg-gray-100 cursor-not-allowed':''}`}
                  placeholder="18 caracteres" value={form.curp} maxLength={18}
                  readOnly={curpLocked}
                  onChange={e=>!curpLocked&&handleCURPChange(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">
                  RFC{' '}
                  {!curpLocked&&rfcStatus==='ok'&&form.rfc&&<span className="text-green-500 text-xs">✓ disponible</span>}
                  {!curpLocked&&rfcStatus==='exists'&&<span className="text-red-500 text-xs">⚠ ya existe</span>}
                  {formErrors.rfc&&<span className="text-red-500 text-xs">{formErrors.rfc}</span>}
                </label>
                <input
                  className={`form-input uppercase ${curpLocked?'bg-gray-100 cursor-not-allowed':''} ${formErrors.rfc?'border-red-400 bg-red-50':''}`}
                  placeholder="RFC (opcional)" value={form.rfc} maxLength={13}
                  readOnly={curpLocked}
                  onChange={e=>{
                    if(!curpLocked){
                      handleRFCChange(e.target.value);
                      const err=validateField('rfc',e.target.value.toUpperCase(),mode);
                      setFormErrors(f=>({...f,rfc:err||null}));
                    }
                  }}
                />
              </div>
            </div>

            {mode==='add'&&!fieldsUnlocked&&(
              <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-3 py-2 rounded">
                Ingrese una CURP válida (18 caracteres) que no esté registrada para continuar.
              </div>
            )}

            {(mode!=='add'||fieldsUnlocked)&&(
              <div className="grid grid-cols-4 gap-2 mt-2">
                <AutoInput label="Primer Nombre" required value={form.primer_nombre}
                  options={cats.primer_nombres} onChange={setField('primer_nombre')}
                  disabled={!canEdit} error={formErrors.primer_nombre} />
                <AutoInput label="Apellido Paterno" required value={form.apellido_paterno}
                  options={cats.apellidos_paterno} onChange={setField('apellido_paterno')}
                  disabled={!canEdit} error={formErrors.apellido_paterno} />
                <AutoInput label="Segundo Nombre" value={form.segundo_nombre}
                  options={cats.segundo_nombres} onChange={setField('segundo_nombre')}
                  disabled={!canEdit} />
                <AutoInput label="Apellido Materno" value={form.apellido_materno}
                  options={cats.apellidos_materno} onChange={setField('apellido_materno')}
                  disabled={!canEdit} />

                <div>
                  <label className="form-label">Fecha Nacimiento</label>
                  <input className={`form-input ${!canEdit?'bg-gray-50 opacity-60':''}`}
                    type="date"value={form.fecha_nacimiento ? form.fecha_nacimiento.substring(0, 10) : ''}
readOnly={!canEdit}
                    onChange={e=>canEdit&&setForm(f=>({...f,fecha_nacimiento:e.target.value}))} />
                </div>
                <div>
                  <label className={`form-label ${formErrors.edad?'text-red-600':''}`}>Edad</label>
                  <input className={`form-input bg-gray-50 ${formErrors.edad?'border-red-400':''}`}
                    type="number" value={form.edad||''} readOnly />
                  {formErrors.edad&&<p className="text-red-500 text-xs mt-0.5">{formErrors.edad}</p>}
                </div>
                {FS('Género','genero_id',cats.generos)}
                {FS('Grado Académico','grado_academico_id',cats.grados)}
                <div className="col-span-2">
                  <AutoInput label="Puesto" value={form.puesto} options={cats.puestos}
                    onChange={setField('puesto')} disabled={!canEdit} />
                </div>
                {FS('Nacionalidad','nacionalidad_id',cats.nacionalidades)}
              </div>
            )}
          </div>

          {/* Address */}
          {(mode!=='add'||fieldsUnlocked)&&(
            <div>
              <h2 className="section-title">Dirección</h2>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="form-label">Número</label>
                  <input className={`form-input ${!canEdit?'bg-gray-100 opacity-60 cursor-not-allowed':''}`}
                    placeholder="Núm / S/N" value={form.numero||''} maxLength={20}
                    readOnly={!canEdit}
                    onChange={e=>canEdit&&setForm(f=>({...f,numero:e.target.value}))} />
                </div>
                <AutoInput label="Calle" value={form.calle} options={cats.calles}
                  onChange={setField('calle')} disabled={!canEdit} />
                <AutoInput label="Colonia" value={form.colonia} options={cats.colonias}
                  onChange={setField('colonia')} disabled={!canEdit} />
                <AutoInput label="Municipio" value={form.municipio} options={cats.municipios}
                  onChange={setField('municipio')} disabled={!canEdit} />
                {FS('Estado','estado_id',cats.estados)}
                <AutoInput label="País" value={form.pais} options={cats.paises}
                  onChange={setField('pais')} disabled={!canEdit} />
                <VInput label="Código Postal" field="codigo_postal" value={form.codigo_postal}
                  onChange={handleFieldChange} disabled={!canEdit} maxLength={6}
                  placeholder="Ej: 29000" formErrors={formErrors} />
                <div className="col-span-2">
                  <label className="form-label">Referencia</label>
                  <input className={`form-input ${!canEdit?'bg-gray-100 opacity-60 cursor-not-allowed':''}`}
                    placeholder="Referencia" value={form.referencia||''} readOnly={!canEdit}
                    onChange={e=>canEdit&&setForm(f=>({...f,referencia:e.target.value}))} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        {(mode!=='add'||fieldsUnlocked)&&(
          <div className="w-64 bg-white rounded-lg shadow p-4 shrink-0">
            <h2 className="section-title">Complementarios</h2>
            <div className="space-y-2">
              <VInput label="Teléfono" field="telefono" value={form.telefono}
                onChange={handleFieldChange} disabled={!canEdit}
                placeholder="Ej: 9611234567" formErrors={formErrors} />
              <VInput label="Correo" field="correo_electronico" type="email"
                value={form.correo_electronico}
                onChange={handleFieldChange} disabled={!canEdit}
                placeholder="ejemplo@correo.com" formErrors={formErrors} />
              {['facebook','instagram','tiktok','linkedin','twitter','url','www'].map(field=>(
                <VInput key={field} label={field.charAt(0).toUpperCase()+field.slice(1)}
                  field={field} value={form[field]} onChange={handleFieldChange}
                  disabled={!canEdit} formErrors={formErrors} />
              ))}
            </div>
          </div>
        )}

        {/* ── ACTION BUTTONS ── */}
        <div className="flex flex-col gap-2 w-36 shrink-0">
          <button onClick={handleAltas} disabled={btn.altas}
            className="btn-green flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed">
            <span>⊕</span> ALTAS
          </button>
          <button onClick={handleSave} disabled={btn.guardar}
            className="btn-yellow flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed">
            <span>💾</span> {loading ? 'GUARDANDO…' : 'GUARDAR'}
          </button>
          <button onClick={handleBajas} disabled={btn.bajas}
            className="btn-red flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed">
            <span>🗑</span> BAJAS
          </button>
          <button onClick={handleCancelar} disabled={btn.cancelar}
            className="btn-gray flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed">
            <span>⊗</span> CANCELAR
          </button>
          {mode !== 'view' && (
            <div className={`text-xs text-center px-2 py-1 rounded font-semibold mt-1
              ${mode==='add'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>
              Modo: {mode==='add'?'ALTA':'EDICIÓN'}
            </div>
          )}
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto max-h-72">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>#</th><th>Nombre Completo</th><th>CURP</th><th>RFC</th>
                <th>Nacimiento</th><th>Edad</th><th>Género</th><th>Cuentas</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {persons.length===0&&(
                <tr><td colSpan={9} className="text-center py-6 text-gray-400">Sin personas registradas</td></tr>
              )}
              {persons.map((p,i)=>(
                <tr key={p.curp} className={selected===p.curp?'selected':''} onClick={()=>selectPerson(p)}>
                  <td>{i+1}</td>
                  <td className="text-left font-medium">
                    {p.apellido_paterno} {p.apellido_materno||''}, {p.primer_nombre} {p.segundo_nombre||''}
                  </td>
                  <td className="font-mono text-xs">{p.curp}</td>
                  <td className="font-mono text-xs">{p.rfc||'—'}</td>
                  <td>{p.fecha_nacimiento?new Date(p.fecha_nacimiento).toLocaleDateString('es-MX'):'—'}</td>
                  <td>{p.edad||'—'}</td>
                  <td>{p.genero||'—'}</td>
                  <td>
                    {p.cuentas?.length>0&&p.cuentas[0]!==null
                      ?<span className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded">{p.cuentas.length} cuenta(s)</span>
                      :<span className="text-gray-400 text-xs">Sin cuenta</span>}
                  </td>
                  <td>
                    <div className="flex gap-1 justify-center">
                      <button title="Editar"
                        onClick={e=>{
                          e.stopPropagation(); selectPerson(p);
                          setMode('edit'); setCurpLocked(true); setFieldsUnlocked(true);
                        }}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white p-1 rounded text-xs">✎</button>
                      <button title="Eliminar"
                        onClick={e=>{
                          e.stopPropagation(); setSelected(p.curp);
                          setForm({...EMPTY_PERSON,...p});
                          setTimeout(handleBajas,30);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white p-1 rounded text-xs">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-1.5 text-xs text-gray-500 border-t bg-gray-50">
          {persons.length} persona(s) registrada(s)
        </div>
      </div>
    </div>
  );
}

// ─── USERS TAB ────────────────────────────────────────────────
const EMPTY_USER = { curp_persona:'', username:'', password:'', tipo_persona:'', activo:true };

function UsersTab({ currentUser, cats }) {
  const [users, setUsers]       = useState([]);
  const [persons, setPersons]   = useState([]);
  const [form, setForm]         = useState(EMPTY_USER);
  const [selected, setSelected] = useState(null);
  const [mode, setMode]         = useState('view');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [modal, setModal]       = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const pollingRef = useRef(null);

  const fetchUsers   = useCallback(async()=>{
    try{const r=await fetch('/api/users');   if(r.ok)setUsers(await r.json());}catch{}
  },[]);
  const fetchPersons = useCallback(async()=>{
    try{const r=await fetch('/api/persons'); if(r.ok)setPersons(await r.json());}catch{}
  },[]);

  useEffect(()=>{
    fetchUsers(); fetchPersons();
    pollingRef.current=setInterval(()=>{fetchUsers();fetchPersons();},5000);
    return()=>clearInterval(pollingRef.current);
  },[fetchUsers,fetchPersons]);

  const showMsg=(msg,isError=false)=>{
    if(isError){setError(msg);setSuccess('');}else{setSuccess(msg);setError('');}
    setTimeout(()=>{setError('');setSuccess('');},6000);
  };

  const runValidations=(f,m)=>{
    const errs={};
    const uErr=validateField('username',f.username,m);
    if(uErr)errs.username=uErr;
    const pErr=validateField('password',f.password,m);
    if(pErr)errs.password=pErr;
    if(!f.curp_persona) errs.curp_persona='Seleccione una persona';
    if(!f.tipo_persona) errs.tipo_persona='Seleccione un tipo';
    if(!f.username?.trim()) errs.username='Requerido';
    return errs;
  };

  const selectedPerson = persons.find(p=>p.curp===form.curp_persona);

  const selectUser=(u)=>{
    setSelected(u.id);
    setForm({curp_persona:u.curp_persona,username:u.username,
             password:'',tipo_persona:u.tipo_persona,activo:u.activo});
    setMode('view'); setFormErrors({});
  };

  const handleAltas   =()=>{setForm(EMPTY_USER);setSelected(null);setMode('add'); setError('');setSuccess('');setFormErrors({});};
  const handleCancelar=()=>{setForm(EMPTY_USER);setSelected(null);setMode('view');setError('');setSuccess('');setFormErrors({});};

  const handleSave=async()=>{
    const errs=runValidations(form,mode);
    if(Object.keys(errs).length>0){setFormErrors(errs);showMsg('Corrija los errores antes de guardar.',true);return;}
    if(mode==='add'){
      const dup=users.find(u=>u.curp_persona===form.curp_persona&&u.tipo_persona===form.tipo_persona);
      if(dup){showMsg('Esta persona ya tiene una cuenta con ese rol.',true);return;}
    }
    setLoading(true);
    try{
      const url   =mode==='add'?'/api/users':`/api/users/${selected}`;
      const method=mode==='add'?'POST':'PUT';
      const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const data=await r.json();
      if(!r.ok){showMsg(data.error||'Error.',true);return;}
      showMsg(mode==='add'?'✅ Usuario creado.':'✅ Usuario actualizado.');
      await fetchUsers(); handleCancelar();
    }catch{showMsg('Error de red.',true);}
    finally{setLoading(false);}
  };

  const handleBajas=(u)=>{
    if(u.id===currentUser.id){showMsg('No puedes eliminar tu propia cuenta.',true);return;}
    setModal({
      show:true,type:'danger',title:'¿Eliminar usuario?',
      message:`¿Eliminar "${u.username}" (${u.tipo_persona_label||u.tipo_persona})?\nEsta acción no se puede deshacer.`,
      onConfirm:async()=>{
        setModal(null);setLoading(true);
        try{
          const r=await fetch(`/api/users/${u.id}`,{method:'DELETE'});
          const d=await r.json();
          if(!r.ok){showMsg(d.error||'Error.',true);return;}
          showMsg('✅ Usuario eliminado.');await fetchUsers();handleCancelar();
        }catch{showMsg('Error de red.',true);}
        finally{setLoading(false);}
      },
      onCancel:()=>setModal(null),confirmLabel:'Sí, eliminar',
    });
  };

  // Button state rules — mirrors Persons tab logic
  const btn = {
    altas:    mode === 'add' || mode === 'edit',
    guardar:  mode === 'view' || loading,
    cancelar: mode === 'view',
  };

  return (
    <div className="flex flex-col gap-3">
      {modal&&<Modal {...modal}/>}
      {error  &&<div className="bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}
      {success&&<div className="bg-green-50 border border-green-300 text-green-700 text-sm px-3 py-2 rounded">{success}</div>}

      <div className="flex gap-3">
        <div className="flex-1 bg-white rounded-lg shadow p-4">
          <h2 className="section-title">Datos de Usuario</h2>
          <div className="grid grid-cols-2 gap-4">

            {/* Person select */}
            <div className="col-span-2">
              <label className={`form-label ${formErrors.curp_persona?'text-red-600':''}`}>Persona *</label>
              <select
                className={`form-select ${formErrors.curp_persona?'border-red-400 bg-red-50':''}`}
                value={form.curp_persona}
                onChange={e=>{setForm(f=>({...f,curp_persona:e.target.value}));setFormErrors(e2=>({...e2,curp_persona:null}));}}
                disabled={mode==='view'||mode==='edit'}>
                <option value="">-- Seleccione una persona --</option>
                {persons.map(p=>(
                  <option key={p.curp} value={p.curp}>
                    {p.apellido_paterno} {p.apellido_materno||''}, {p.primer_nombre} — {p.curp}
                  </option>
                ))}
              </select>
              {formErrors.curp_persona&&<p className="text-red-500 text-xs mt-0.5">{formErrors.curp_persona}</p>}
              {selectedPerson&&(
                <div className="mt-1 grid grid-cols-4 gap-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
                  <span>📅 Nac: <strong>
                    {selectedPerson.fecha_nacimiento
                      ?new Date(selectedPerson.fecha_nacimiento).toLocaleDateString('es-MX'):'—'}
                  </strong></span>
                  <span>🎂 Edad: <strong>{selectedPerson.edad||'—'}</strong></span>
                  <span>🪪 RFC: <strong>{selectedPerson.rfc||'—'}</strong></span>
                  <span>👤 Género: <strong>{selectedPerson.genero||'—'}</strong></span>
                </div>
              )}
            </div>

            {/* Type */}
            <div>
              <label className={`form-label ${formErrors.tipo_persona?'text-red-600':''}`}>Tipo *</label>
              <select
                className={`form-select ${formErrors.tipo_persona?'border-red-400 bg-red-50':''}`}
                value={form.tipo_persona}
                onChange={e=>{setForm(f=>({...f,tipo_persona:e.target.value}));setFormErrors(e2=>({...e2,tipo_persona:null}));}}
                disabled={mode==='view'||mode==='edit'}>
                <option value="">-- Seleccione --</option>
                {cats.tipos.map(t=><option key={t.id} value={t.valor}>{t.label}</option>)}
              </select>
              {formErrors.tipo_persona&&<p className="text-red-500 text-xs mt-0.5">{formErrors.tipo_persona}</p>}
            </div>

            {/* Username */}
            <div>
              <label className={`form-label ${formErrors.username?'text-red-600':''}`}>Usuario *</label>
              <input
                className={`form-input ${formErrors.username?'border-red-400 bg-red-50':''} ${mode==='view'?'bg-gray-100 opacity-60':''}`}
                placeholder="username" value={form.username} disabled={mode==='view'}
                onChange={e=>{
                  setForm(f=>({...f,username:e.target.value}));
                  const err=validateField('username',e.target.value,mode);
                  setFormErrors(f=>({...f,username:err||null}));
                }} />
              {formErrors.username&&<p className="text-red-500 text-xs mt-0.5">{formErrors.username}</p>}
            </div>

            {/* Password */}
            <div>
              <label className={`form-label ${formErrors.password?'text-red-600':''}`}>
                Contraseña{mode==='edit'&&<span className="text-xs text-gray-400 ml-1">(vacío = no cambiar)</span>}
              </label>
              <input
                className={`form-input ${formErrors.password?'border-red-400 bg-red-50':''} ${mode==='view'?'bg-gray-100 opacity-60':''}`}
                type="password" placeholder="Mín. 6 caracteres" value={form.password}
                disabled={mode==='view'}
                onChange={e=>{
                  setForm(f=>({...f,password:e.target.value}));
                  const err=validateField('password',e.target.value,mode);
                  setFormErrors(f=>({...f,password:err||null}));
                }} />
              {formErrors.password&&<p className="text-red-500 text-xs mt-0.5">{formErrors.password}</p>}
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-2 mt-1">
              <input type="checkbox" id="activo" checked={form.activo}
                onChange={e=>setForm(f=>({...f,activo:e.target.checked}))}
                disabled={mode==='view'} className="w-4 h-4" />
              <label htmlFor="activo" className="text-sm font-medium">Cuenta activa</label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 w-36 shrink-0">
          <button onClick={handleAltas} disabled={btn.altas}
            className="btn-green flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed">
            <span>⊕</span> ALTAS
          </button>
          <button onClick={handleSave} disabled={btn.guardar}
            className="btn-yellow flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed">
            <span>💾</span> {loading?'GUARDANDO…':'GUARDAR'}
          </button>
          <button onClick={handleCancelar} disabled={btn.cancelar}
            className="btn-gray flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed">
            <span>⊗</span> CANCELAR
          </button>
          {mode!=='view'&&(
            <div className={`text-xs text-center px-2 py-1 rounded font-semibold mt-1
              ${mode==='add'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>
              Modo: {mode==='add'?'ALTA':'EDICIÓN'}
            </div>
          )}
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto max-h-72">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>#</th><th>Usuario</th><th>Tipo</th><th>Nombre</th>
                <th>CURP</th><th>Nacimiento</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length===0&&(
                <tr><td colSpan={8} className="text-center py-6 text-gray-400">Sin usuarios registrados</td></tr>
              )}
              {users.map((u,i)=>(
                <tr key={u.id} className={selected===u.id?'selected':''} onClick={()=>selectUser(u)}>
                  <td>{i+1}</td>
                  <td className="font-mono text-xs font-bold">{u.username}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      u.tipo_persona==='ADMIN'  ?'bg-purple-100 text-purple-800':
                      u.tipo_persona==='TEACHER'?'bg-blue-100 text-blue-800':
                      u.tipo_persona==='STUDENT'?'bg-green-100 text-green-800':
                      u.tipo_persona==='TUTOR'  ?'bg-yellow-100 text-yellow-800':
                      'bg-gray-100 text-gray-800'}`}>
                      {u.tipo_persona_label||u.tipo_persona}
                    </span>
                  </td>
                  <td className="text-left">
                    {u.primer_nombre
                      ?`${u.apellido_paterno||''} ${u.apellido_materno||''}, ${u.primer_nombre}`:'—'}
                  </td>
                  <td className="font-mono text-xs">{u.curp_persona||'—'}</td>
                  <td className="text-xs">
                    {u.fecha_nacimiento?new Date(u.fecha_nacimiento).toLocaleDateString('es-MX'):'—'}
                  </td>
                  <td>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${u.activo?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                      {u.activo?'Activo':'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1 justify-center">
                      <button onClick={e=>{e.stopPropagation();selectUser(u);setMode('edit');}}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white p-1 rounded text-xs" title="Editar">✎</button>
                      <button onClick={e=>{e.stopPropagation();handleBajas(u);}}
                        className="bg-red-600 hover:bg-red-700 text-white p-1 rounded text-xs" title="Eliminar">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-1.5 text-xs text-gray-500 border-t bg-gray-50">
          {users.length} usuario(s)
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PAGE ───────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState('persons');
  const [cats, setCats] = useState({
    primer_nombres:[], segundo_nombres:[], apellidos_paterno:[], apellidos_materno:[],
    puestos:[], calles:[], colonias:[], municipios:[], paises:[],
    generos:[], grados:[], tipos:[], nacionalidades:[], estados:[],
  });

  const loadCats = useCallback(async () => {
    try { const r=await fetch('/api/catalogs'); if(r.ok) setCats(await r.json()); } catch {}
  }, []);

  useEffect(()=>{
    fetch('/api/auth/me').then(r=>r.ok?r.json():null).then(u=>{
      if(!u||u.tipo_persona!=='ADMIN'){router.push('/');return;}
      setCurrentUser(u);
    });
  },[router]);

  useEffect(()=>{ if(currentUser) loadCats(); },[currentUser,loadCats]);

  const handleLogout=async()=>{ await fetch('/api/auth/logout',{method:'POST'}); router.push('/'); };

  if(!currentUser){
    return(
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Verificando acceso…</div>
      </div>
    );
  }

  return(
    <>
      <Head><title>Sistema Escolar – Administración</title></Head>
      <div className="min-h-screen flex flex-col bg-gray-100">
        <header style={{background:'var(--navy)'}} className="text-white px-4 py-2 flex items-center gap-4 shadow">
          <div className="flex gap-1 bg-white/10 rounded-lg p-1 flex-1">
            <button onClick={()=>setTab('persons')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${tab==='persons'?'bg-white text-[#1a2744]':'text-white hover:bg-white/20'}`}>
              👤 Personas
            </button>
            <button onClick={()=>setTab('users')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${tab==='users'?'bg-white text-[#1a2744]':'text-white hover:bg-white/20'}`}>
              🔑 Usuarios
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-white/70">Bienvenido</div>
              <div className="text-sm font-bold">{currentUser.nombre||currentUser.username}</div>
            </div>
            <button onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded transition">
              Cerrar sesión
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">🎓</div>
              <div className="text-right hidden lg:block">
                <div className="text-xs font-bold">TECNOLÓGICO</div>
                <div className="text-xs text-white/70">NACIONAL DE MÉXICO</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-auto">
          {tab==='persons'&&<PersonsTab currentUser={currentUser} cats={cats} reloadCats={loadCats}/>}
          {tab==='users'  &&<UsersTab   currentUser={currentUser} cats={cats}/>}
        </main>

        <footer className="bg-white border-t px-4 py-1 flex items-center gap-4 text-xs text-gray-500">
          <span>🟢 Conectado</span>
          <span>Sistema Escolar v3.0</span>
          <span className="ml-auto">{new Date().toLocaleString('es-MX')}</span>
        </footer>
      </div>
    </>
  );
}