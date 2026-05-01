import { Linking, Platform } from 'react-native';

export type LugarComEndereco = {
  nome: string;
  endereco: string | null;
  cidade: string | null;
  pais: string | null;
};

/** Texto único para busca / rota nos mapas externos (sem mapa embutido no app). */
export function lugarParaEnderecoBusca(l: LugarComEndereco): string {
  return [l.nome, l.endereco, l.cidade, l.pais].filter(Boolean).join(', ').trim();
}

/** Um lugar no app de mapas padrão do sistema (Apple Maps no iOS, Google no Android). */
export function abrirUmLugarNoMapaNativo(address: string) {
  const q = address.trim();
  if (!q) return;
  const enc = encodeURIComponent(q);
  if (Platform.OS === 'ios') {
    void Linking.openURL(`http://maps.apple.com/?q=${enc}`);
  } else {
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${enc}`);
  }
}

/**
 * Vários lugares na ordem da lista: rota no Google Maps (origem → waypoints → destino).
 * Abre o app Google Maps se instalado; caso contrário, o navegador.
 */
export function abrirRotaLugaresNoGoogleMaps(addresses: string[]) {
  const cleaned = addresses.map((a) => a.trim()).filter(Boolean);
  if (cleaned.length === 0) return;

  if (cleaned.length === 1) {
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleaned[0])}`);
    return;
  }

  const origin = encodeURIComponent(cleaned[0]);
  const destination = encodeURIComponent(cleaned[cleaned.length - 1]);
  const middle = cleaned.slice(1, -1).map(encodeURIComponent).join('%7C');
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (middle) {
    url += `&waypoints=${middle}`;
  }
  void Linking.openURL(url);
}
