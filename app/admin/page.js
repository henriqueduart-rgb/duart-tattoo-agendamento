'use client';
import { useEffect, useState } from 'react';
import { supabase, ADMIN_EMAIL, STATUS_LABEL } from '../../lib/supabaseClient';

function fmtData(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function Admin() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendentes, setPendentes] = useState([]);
  const [slots, setSlots] = useState([]);
  const [novaData, setNovaData] = useState('');
  const [novaHora, setNovaHora] = useState('10:00');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  const isAdmin = session?.user?.email && session.user.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) return;
    carregar();
  }, [isAdmin]);

  const carregar = async () => {
    setLoading(true);
    const [{ data: sol }, { data: disp }] = await Promise.all([
      supabase.from('solicitacoes').select('*').eq('status', 'pendente').order('data'),
      supabase.from('disponibilidade').select('*').order('data').order('hora'),
    ]);
    setPendentes(sol || []);
    setSlots(disp || []);
    setLoading(false);
  };

  const responder = async (id, status) => {
    await supabase.from('solicitacoes').update({ status }).eq('id', id);
    carregar();
  };

  const addSlot = async (e) => {
    e.preventDefault();
    if (!novaData || !novaHora) return;
    await supabase.from('disponibilidade').insert({ data: novaData, hora: novaHora, aberto: true });
    setNovaData('');
    carregar();
  };

  const removerSlot = async (id) => {
    await supabase.from('disponibilidade').delete().eq('id', id);
    carregar();
  };

  if (!session) return <div className="wrap"><p className="muted">Você precisa entrar primeiro.</p></div>;
  if (!isAdmin) return <div className="wrap"><p className="muted">Acesso restrito ao estúdio.</p></div>;

  return (
    <div className="wrap">
      <a className="back" href="/">← Início</a>
      <h1 className="brand">Painel do estúdio</h1>

      <h2 className="section">Pedidos pendentes</h2>
      {loading ? (
        <p className="muted">Carregando...</p>
      ) : pendentes.length === 0 ? (
        <div className="card">Nenhum pedido pendente no momento.</div>
      ) : (
        pendentes.map((s) => (
          <div key={s.id} className="item">
            <div style={{ fontWeight: 600 }}>{fmtData(s.data)} às {s.hora.slice(0, 5)}</div>
            {s.descricao && <div className="muted" style={{ margin: '2px 0 0' }}>{s.descricao}</div>}
            {s.imagem_url && <img src={s.imagem_url} alt="referência" />}
            <div className="gap">
              <button className="btn small" onClick={() => responder(s.id, 'aprovado')}>Aprovar</button>
              <button className="btn small" style={{ background: '#6B6355' }} onClick={() => responder(s.id, 'recusado')}>Recusar</button>
            </div>
          </div>
        ))
      )}

      <h2 className="section">Dias disponíveis</h2>
      <form onSubmit={addSlot} className="card">
        <label className="label">Data</label>
        <input className="input" type="date" required value={novaData} onChange={(e) => setNovaData(e.target.value)} />
        <label className="label">Hora</label>
        <input className="input" type="time" required value={novaHora} onChange={(e) => setNovaHora(e.target.value)} />
        <button className="btn" type="submit">Adicionar horário</button>
      </form>

      {slots.map((s) => (
        <div key={s.id} className="item row">
          <span>{fmtData(s.data)} às {s.hora.slice(0, 5)}</span>
          <button className="link" onClick={() => removerSlot(s.id)}>Remover</button>
        </div>
      ))}
    </div>
  );
}
