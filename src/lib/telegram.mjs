// Envoi Telegram d'une annonce, selon le template figé (docs/message-template.md).
import { env } from './config.mjs';

const SOURCE_LABEL = { pap: 'PAP', paruvendu: 'ParuVendu', logicimmo: 'Logic-immo', locservice: 'Locservice', bienici: "Bien'ici", autre: 'annonce' };
const NOPHOTO = /nophoto|visuel-nophoto|no-photo|placeholder/i;

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtDateParis(iso) {
  const d = iso ? new Date(iso) : new Date();
  const p = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(d).reduce((a, x) => (a[x.type] = x.value, a), {});
  return `${p.day}/${p.month}/${p.year} à ${p.hour}h${p.minute}`;
}

export function buildCaption(l) {
  const arr = l.arrondissement ? `Paris ${l.arrondissement % 1000}e` : 'Paris';
  const bits = [];
  if (l.rooms != null) bits.push(`🚪 ${l.rooms} pièces`);
  if (l.bedrooms != null) bits.push(`🛏 ${l.bedrooms} ch.`);
  if (l.surface != null) bits.push(`📐 ${l.surface} m²`);
  if (l.furnished === true) bits.push('🔑 Meublé');
  else if (l.furnished === false) bits.push('🔑 Non meublé');
  if (l.dpe) bits.push(`DPE ${l.dpe}`);

  const price = l.price != null ? `<b>${l.price.toLocaleString('fr-FR')} €</b>/mois` : 'Prix NC';
  const header = `🆕 Nouveau${l.rooms != null && l.surface != null ? ` — ${l.rooms} pièces, ${l.surface} m²` : ''}`;

  return [
    `<b>${esc(header)}</b>`,
    `📍 ${esc(arr)}`,
    `💶 ${price}${bits.length ? ' · ' + bits.join(' · ') : ''}`,
    `🕒 Détecté le ${fmtDateParis(l.created_at)}`,
  ].join('\n');
}

function buttons(l) {
  const row = [{ text: `🔗 Voir l’annonce (${SOURCE_LABEL[l.source] || l.source})`, url: l.url }];
  const mapUrl = env.MAP_URL();
  if (mapUrl) row.push({ text: '🗺 Voir sur la carte', url: `${mapUrl}?id=${l.id}` });
  return { inline_keyboard: [row] };
}

export async function sendListing(l) {
  const token = env.TELEGRAM_BOT_TOKEN();
  const chat_id = env.TELEGRAM_CHAT_ID();
  const caption = buildCaption(l);
  const reply_markup = JSON.stringify(buttons(l));
  const hasPhoto = l.photo_url && !NOPHOTO.test(l.photo_url) && /^https?:/.test(l.photo_url);

  const endpoint = hasPhoto ? 'sendPhoto' : 'sendMessage';
  const body = hasPhoto
    ? { chat_id, photo: l.photo_url, caption, parse_mode: 'HTML', reply_markup }
    : { chat_id, text: caption, parse_mode: 'HTML', reply_markup, disable_web_page_preview: false };

  const res = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    // Fallback : si l'image est refusée par Telegram, on renvoie en texte
    if (hasPhoto) {
      return sendListing({ ...l, photo_url: null });
    }
    throw new Error(`Telegram ${endpoint}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}
