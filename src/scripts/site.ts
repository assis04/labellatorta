/**
 * Comportamentos globais (carregado em todas as páginas, ~2 KB):
 * status "aberto agora", header sólido ao rolar, menu móvel acessível,
 * revelação sutil de seções e eventos de analytics (se o Plausible estiver ligado).
 */
import { openingHours, TIMEZONE } from '../data/business';
import { getOpenStatus, zonedNow } from '../lib/hours';

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}

const root = document.documentElement;
root.classList.add('js');

/* ---------- aberto agora ---------- */
function updateOpenStatus(): void {
  const now = new Date();
  const status = getOpenStatus(now, openingHours, TIMEZONE);
  for (const el of document.querySelectorAll<HTMLElement>('[data-open-status]')) {
    el.dataset['open'] = String(status.isOpen);
    const label = el.querySelector('[data-open-status-label]');
    if (label) label.textContent = status.label;
  }
  const { day } = zonedNow(now, TIMEZONE);
  for (const row of document.querySelectorAll<HTMLElement>('[data-hours-days]')) {
    const days = (row.dataset['hoursDays'] ?? '').split(',').map(Number);
    row.toggleAttribute('data-today', days.includes(day));
  }
}
updateOpenStatus();
window.setInterval(updateOpenStatus, 60_000);

/* ---------- header transparente → sólido ---------- */
const header = document.querySelector<HTMLElement>('[data-header][data-overlay]');
const hero = document.querySelector<HTMLElement>('[data-hero]');
if (header && hero) {
  new IntersectionObserver(
    ([entry]) => {
      if (entry) header.classList.toggle('is-solid', !entry.isIntersecting);
    },
    { rootMargin: `-${header.offsetHeight}px 0px 0px 0px` },
  ).observe(hero);
}

/* ---------- menu móvel ---------- */
const menu = document.querySelector<HTMLElement>('[data-menu]');
const openBtn = document.querySelector<HTMLButtonElement>('[data-menu-open]');
const closeBtn = document.querySelector<HTMLButtonElement>('[data-menu-close]');

function setMenu(open: boolean): void {
  if (!menu || !openBtn) return;
  menu.hidden = !open;
  openBtn.setAttribute('aria-expanded', String(open));
  root.classList.toggle('menu-open', open);
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) closeBtn?.focus();
  else openBtn.focus();
}
openBtn?.addEventListener('click', () => setMenu(true));
closeBtn?.addEventListener('click', () => setMenu(false));
menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menu && !menu.hidden) setMenu(false);
});

/* ---------- revelação sutil ---------- */
const revealables = document.querySelectorAll<HTMLElement>('[data-reveal]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduceMotion || !('IntersectionObserver' in window)) {
  revealables.forEach((el) => el.classList.add('is-visible'));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -6% 0px' },
  );
  revealables.forEach((el) => io.observe(el));
}

/* ---------- analytics (Plausible, sem cookies) ---------- */
document.addEventListener('click', (e) => {
  const target = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-track]') : null;
  if (!target || typeof window.plausible !== 'function') return;
  const name =
    target.dataset['track'] === 'whatsapp' ? 'Clique WhatsApp' : (target.dataset['track'] ?? 'Clique');
  window.plausible(name, {
    props: { origem: target.dataset['trackIntent'] ?? 'desconhecida', pagina: location.pathname },
  });
});
