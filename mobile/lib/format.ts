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
