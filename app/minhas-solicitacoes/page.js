'use client';
import { useEffect, useState } from 'react';
import { supabase, STATUS_LABEL } from '../../lib/supabaseClient';

function fmtData(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function MinhasSolicitacoes() {
  const [session, setSession] = useState(null);
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useEffect(() => {
    if (!session) return;
    carregar();
  }, [session]);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('solicitacoes')
      .select('*')
      .eq('cliente_id', session.user.id)
      .order('data', { ascending: false });
    setLista(data || []);
    setLoading(false);
  };

  const cancelar = async (id) => {
    await supabase.from('solicitacoes').delete().eq('id', id);
    carregar();
  };

  if (!session) return <div className="wrap"><p className="muted">Você precisa entrar primeiro.</p></div>;

  return (
    <div className="wrap">
      <a className="back" href="/">← Início</a>
      <h1 className="brand">Minhas solicitações</h1>

      {loading ? (
        <p className="muted">Carregando...</p>
      ) : lista.length === 0 ? (
        <div className="card">Você ainda não fez nenhuma solicitação. <a href="/agenda">Agendar agora</a>.</div>
      ) : (
        lista.map((s) => (
          <div key={s.id} className="item">
            <div className="row">
              <div>
                <div style={{ fontWeight: 600 }}>{fmtData(s.data)} às {s.hora.slice(0, 5)}</div>
                {s.descricao && <div className="muted" style={{ margin: '2px 0 0' }}>{s.descricao}</div>}
              </div>
              <span className={`badge ${s.status}`}>{STATUS_LABEL[s.status]}</span>
            </div>
            {s.imagem_url && <img src={s.imagem_url} alt="referência" />}
            {s.resposta && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#A79E8C' }}>Estúdio: {s.resposta}</div>
            )}
            {s.status === 'pendente' && (
              <div className="gap">
                <button className="btn small" style={{ background: '#6B6355' }} onClick={() => cancelar(s.id)}>Cancelar pedido</button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
