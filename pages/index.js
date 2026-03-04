// pages/index.js  — Login page
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]   = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error de autenticación'); return; }
      // Redirect based on role
      if (data.tipo_persona === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/calendar');
      }
    } catch {
      setError('Error de conexión. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Sistema Escolar – Iniciar Sesión</title></Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a2744] to-[#2d4a8a]">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#1a2744] mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0-6l-9-5m9 5l9-5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#1a2744]">TECNOLÓGICO</h1>
            <p className="text-sm text-gray-500">NACIONAL DE MÉXICO</p>
            <p className="text-xs text-gray-400 mt-1">Sistema de Gestión Escolar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Usuario</label>
              <input
                className="form-input"
                type="text"
                placeholder="Nombre de usuario"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="form-label">Contraseña</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a2744] hover:bg-[#223060] text-white font-bold py-2.5 rounded-lg transition disabled:opacity-60"
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} Tecnológico Nacional de México
          </p>
        </div>
      </div>
    </>
  );
}
