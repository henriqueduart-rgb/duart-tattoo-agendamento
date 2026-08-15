'use client';
import { useEffect, useState } from 'react';
import { supabase, ADMIN_EMAIL } from '../lib/supabaseClient';

export default function Home() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [checkingProfile, setCheckingProfile] = useState(false);

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    setCheckingProfile(true);
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data || null);
        setCheckingProfile(false);
      });
  }, [session]);

  const enviarLink = async (e) => {
    e.preventDefault();
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
    });
    if (error) setError('Não consegui enviar o link. Confere o e-mail e tenta de novo.');
    else setSent(true);
  };

  const salvarPerfil = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSalvandoPerfil(true);
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: session.user.id, nome, telefone, email: session.user.email })
      .select()
      .single();
    setSalvandoPerfil(false);
    if (!error) setProfile(data);
  };

  const sair = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = session?.user?.email && session.user.email === ADMIN_EMAIL;

  if (loading) {
    return <div className="wrap"><p className="muted">Carregando...</p></div>;
  }

  if (!session) {
    return (
      <div className="wrap">
        <h1 className="brand">DU.ART' TATTOO</h1>
        <p className="muted">Agende sua sessão e envie sua arte de referência.</p>
        {sent ? (
          <div className="card">
            Te enviamos um link de acesso para <b>{email}</b>. Abre seu e-mail e clica no link pra entrar — não precisa de senha.
          </div>
        ) : (
          <form onSubmit={enviarLink} className="card">
            <label className="label">Seu e-mail</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            <button className="btn" type="submit">Entrar / cadastrar</button>
            {error && <p className="error">{error}</p>}
          </form>
        )}
      </div>
    );
  }

  if (checkingProfile) {
    return <div className="wrap"><p className="muted">Carregando...</p></div>;
  }

  if (!profile) {
    return (
      <div className="wrap">
        <h1 className="brand">DU.ART' TATTOO</h1>
        <p className="muted">Só mais um passo antes de agendar.</p>
        <form onSubmit={salvarPerfil} className="card">
          <label className="label">Seu nome</label>
          <input className="input" required value={nome} onChange={(e) => setNome(e.target.value)} />
          <label className="label">Telefone (WhatsApp)</label>
          <input className="input" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 90000-0000" />
          <button className="btn" type="submit" disabled={salvandoPerfil}>
            {salvandoPerfil ? 'Salvando...' : 'Concluir cadastro'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="wrap">
      <h1 className="brand">DU.ART' TATTOO</h1>
      <p className="muted">Olá, {profile.nome}</p>
      <div>
        <a className="btn-link" href="/agenda">Agendar sessão</a>
        <a className="btn-link" href="/minhas-solicitacoes">Minhas solicitações</a>
        {isAdmin && <a className="btn-link admin" href="/admin">Painel do estúdio</a>}
      </div>
      <button className="link" onClick={sair}>Sair</button>
    </div>
  );
}
