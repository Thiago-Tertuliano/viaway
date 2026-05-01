export type CepLookupResult = {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function formatCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export async function lookupCep(rawCep: string): Promise<CepLookupResult> {
  const cep = onlyDigits(rawCep);
  if (cep.length !== 8) {
    throw new Error('CEP deve conter 8 dígitos.');
  }

  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!res.ok) {
    throw new Error('Não foi possível consultar o CEP agora.');
  }

  const data = (await res.json()) as
    | (CepLookupResult & {
        erro?: boolean;
      })
    | undefined;

  if (!data || data.erro) {
    throw new Error('CEP não encontrado.');
  }

  return {
    cep: formatCep(data.cep),
    logradouro: data.logradouro ?? '',
    bairro: data.bairro ?? '',
    localidade: data.localidade ?? '',
    uf: data.uf ?? '',
  };
}
