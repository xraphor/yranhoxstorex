/**
 * Gera um payload Pix "Copia e Cola" (BR Code / EMV) dinâmico,
 * com o valor exato do pedido embutido.
 */

function emv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitize(text: string, max: number): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, max);
}

export interface PixPayloadOptions {
  key: string;
  merchantName: string;
  merchantCity: string;
  /** Valor em centavos */
  amountCents: number;
  /** Identificador da transação (txid) — só letras/números, até 25 chars */
  txid: string;
}

export function buildPixPayload({
  key,
  merchantName,
  merchantCity,
  amountCents,
  txid,
}: PixPayloadOptions): string {
  const amount = (amountCents / 100).toFixed(2);
  const cleanTxid = txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "YRANHOX";

  const merchantAccount = emv("00", "BR.GOV.BCB.PIX") + emv("01", key.trim());

  const body =
    emv("00", "01") + // Payload Format Indicator
    emv("26", merchantAccount) + // Merchant Account Information
    emv("52", "0000") + // Merchant Category Code
    emv("53", "986") + // Moeda: BRL
    emv("54", amount) + // Valor exato
    emv("58", "BR") +
    emv("59", sanitize(merchantName, 25) || "YRANHOX STORE") +
    emv("60", sanitize(merchantCity, 15) || "SAO PAULO") +
    emv("62", emv("05", cleanTxid)); // Additional Data (txid)

  const withCrc = body + "6304";
  return withCrc + crc16(withCrc);
}
