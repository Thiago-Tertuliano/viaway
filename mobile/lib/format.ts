export function formatDateBr(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatViagemDatas(dataIda: string | null, dataVolta: string | null) {
  const a = formatDateBr(dataIda);
  const b = formatDateBr(dataVolta);
  if (!a && !b) return 'Datas a definir';
  if (a && b) return `${a} – ${b}`;
  return a || b || 'Datas a definir';
}

export function formatBrl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Data de competência do gasto (YYYY-MM-DD) em português. */
export function formatDataPgtoBr(isoDate: string) {
  const d = new Date(isoDate + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/** Hora do registro (ISO completo do backend). */
export function formatHoraRegistroBr(isoDateTime: string) {
  const d = new Date(isoDateTime);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Rótulo amigável da moeda (evita só "BRL" solto na UI). */
export function formatMoedaLegivel(code: string | null | undefined) {
  const u = (code || 'BRL').toUpperCase();
  if (u === 'BRL') return 'Real brasileiro (R$)';
  return u;
}
