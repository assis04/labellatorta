/** Troca a ilustração do mapa pelo Google Maps real somente após o clique (ver MapFacade.astro). */
for (const facade of document.querySelectorAll<HTMLElement>('[data-map-facade]')) {
  const button = facade.querySelector<HTMLButtonElement>('[data-map-load]');
  const src = facade.dataset['src'];
  if (!button || !src) continue;
  button.hidden = false;
  button.addEventListener(
    'click',
    () => {
      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.title = facade.dataset['title'] ?? 'Mapa';
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.allowFullscreen = true;
      facade.replaceChildren(iframe);
      iframe.focus();
    },
    { once: true },
  );
}
