'use client';
import { useEffect, useState } from 'react';
import { supabase, ADMIN_EMAIL } from '../lib/supabaseClient';

export default function Home() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [checkingProfile, setCheckingProfile] = useState(false);

  const [mode, setMode] = useState('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');

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

  const entrar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setEnviando(false);
    if (error) setError('E-mail ou senha incorretos.');
  };

  const cadastrar = async (e) => {
    e.preventDefault();
    setError('');
    if (senha.length < 6) { setError('A senha precisa ter pelo menos 6 caracteres.'); return; }
    setEnviando(true);
    const { data, error } = await supabase.auth.signUp({ email, password: senha });
    setEnviando(false);
    if (error) { setError('Não consegui criar a conta. Talvez esse e-mail já tenha cadastro.'); return; }
    if (!data.session) {
      setAviso(`Enviamos um e-mail de confirmação para ${email}. Clica no link pra ativar sua conta.`);
    }
  };

  const esqueciSenha = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/redefinir-senha` : undefined,
    });
    setEnviando(false);
    if (error) setError('Não consegui enviar o e-mail. Confere o endereço e tenta de novo.');
    else setAviso(`Enviamos um link pra redefinir a senha para ${email}.`);
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

        {aviso ? (
          <div className="card">{aviso}</div>
        ) : mode === 'esqueci' ? (
          <form onSubmit={esqueciSenha} className="card">
            <label className="label">Seu e-mail</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            <button className="btn" type="submit" disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar link de redefinição'}</button>
            {error && <p className="error">{error}</p>}
            <button type="button" className="link" onClick={() => { setMode('entrar'); setError(''); }}>Voltar</button>
          </form>
        ) : (
          <form onSubmit={mode === 'entrar' ? entrar : cadastrar} className="card">
            <label className="label">Seu e-mail</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            <label className="label">Senha</label>
            <input className="input" type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mínimo 6 caracteres" />
            <button className="btn" type="submit" disabled={enviando}>
              {enviando ? 'Aguarda...' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
            </button>
            {error && <p className="error">{error}</p>}
            <div className="gap" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="link" onClick={() => { setMode(mode === 'entrar' ? 'cadastrar' : 'entrar'); setError(''); }}>
                {mode === 'entrar' ? 'Criar uma conta' : 'Já tenho conta'}
              </button>
              {mode === 'entrar' && (
                <button type="button" className="link" onClick={() => { setMode('esqueci'); setError(''); }}>Esqueci a senha</button>
              )}
            </div>
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
