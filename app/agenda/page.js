'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

function fmtData(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function Agenda() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useEffect(() => {
    if (!session) return;
    carregarSlots();
  }, [session]);

  const carregarSlots = async () => {
    setLoading(true);
    const hoje = new Date().toISOString().slice(0, 10);
    const { data: disponiveis } = await supabase
      .from('disponibilidade')
      .select('*')
      .eq('aberto', true)
      .gte('data', hoje)
      .order('data')
      .order('hora');

    const { data: ocupadas } = await supabase
      .from('solicitacoes')
      .select('disponibilidade_id')
      .in('status', ['pendente', 'aprovado']);

    const ocupadasIds = new Set((ocupadas || []).map((o) => o.disponibilidade_id));
    setSlots((disponiveis || []).filter((s) => !ocupadasIds.has(s.id)));
    setLoading(false);
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (!selecionado) { setError('Escolhe um dia disponível.'); return; }
    setEnviando(true);
    setError('');

    let imagem_url = null;
    if (arquivo) {
      const path = `${session.user.id}/${Date.now()}-${arquivo.name}`;
      const { error: upErr } = await supabase.storage.from('artes').upload(path, arquivo);
      if (upErr) {
        setError('Não consegui enviar a imagem. Tenta novamente.');
        setEnviando(false);
        return;
      }
      const { data: pub } = supabase.storage.from('artes').getPublicUrl(path);
      imagem_url = pub.publicUrl;
    }

    const { error: insErr } = await supabase.from('solicitacoes').insert({
      cliente_id: session.user.id,
      disponibilidade_id: selecionado.id,
      data: selecionado.data,
      hora: selecionado.hora,
      descricao,
      imagem_url,
      status: 'pendente',
    });

    setEnviando(false);
    if (insErr) setError('Não consegui enviar sua solicitação. Tenta de novo.');
    else setOk(true);
  };

  if (!session) return <div className="wrap"><p className="muted">Você precisa entrar primeiro. <a className="link" href="/" style={{display:'inline'}}>Voltar</a></p></div>;

  if (ok) {
    return (
      <div className="wrap">
        <a className="back" href="/">← Início</a>
        <h1 className="brand">Pedido enviado!</h1>
        <div className="card">
          Sua solicitação para <b>{fmtData(selecionado.data)} às {selecionado.hora.slice(0,5)}</b> foi enviada e está <b>pendente de aprovação</b> do estúdio. Você recebe a resposta em "Minhas solicitações".
        </div>
        <a className="btn-link" href="/minhas-solicitacoes">Ver minhas solicitações</a>
      </div>
    );
  }

  return (
    <div className="wrap">
      <a className="back" href="/">← Início</a>
      <h1 className="brand">Agendar sessão</h1>
      <p className="muted">Escolha um horário disponível e conte um pouco sobre a tatuagem que você quer.</p>

      {loading ? (
        <p className="muted">Carregando horários...</p>
      ) : slots.length === 0 ? (
        <div className="card">Nenhum horário disponível no momento. Volta aqui em breve!</div>
      ) : (
        <form onSubmit={enviar}>
          <label className="label">Dia e horário</label>
          <div style={{ marginBottom: 12 }}>
            {slots.map((s) => (
              <label key={s.id} className="item" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: selecionado?.id === s.id ? '1px solid #B23A2E' : undefined }}>
                <input type="radio" name="slot" checked={selecionado?.id === s.id} onChange={() => setSelecionado(s)} />
                {fmtData(s.data)} às {s.hora.slice(0, 5)}
              </label>
            ))}
          </div>

          <label className="label">Descreva a ideia (estilo, tamanho, local do corpo...)</label>
          <textarea className="input" style={{ minHeight: 80 }} value={descricao} onChange={(e) => setDescricao(e.target.value)} />

          <label className="label">Referência da arte (opcional)</label>
          <input className="input" type="file" accept="image/*" onChange={(e) => setArquivo(e.target.files[0])} />

          <button className="btn" type="submit" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar solicitação'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      )}
    </div>
  );
}
