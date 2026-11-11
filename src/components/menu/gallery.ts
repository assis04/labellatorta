/**
 * Galeria da página do sabor (melhoria progressiva sobre o Gallery.astro).
 * Sem JS, as miniaturas são âncoras e o CSS mostra a foto alvo (:target).
 * Com JS, a troca acontece sem rolar a página, a miniatura atual recebe aria-current,
 * a nova foto é anunciada para leitores de tela e, depois do carregamento da página,
 * as fotos escondidas são buscadas para a troca ser instantânea.
 */

function setupGallery(root: HTMLElement): void {
  const slides = Array.from(root.querySelectorAll<HTMLElement>('[data-gallery-slide]'));
  const thumbs = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-gallery-thumb]'));
  const status = root.querySelector<HTMLElement>('[data-gallery-status]');
  if (slides.length < 2 || thumbs.length !== slides.length) return;

  const show = (index: number, announce: boolean): void => {
    slides.forEach((slide, i) => slide.toggleAttribute('data-active', i === index));
    thumbs.forEach((thumb, i) => {
      if (i === index) thumb.setAttribute('aria-current', 'true');
      else thumb.removeAttribute('aria-current');
    });
    if (announce && status) {
      const alt = slides[index]?.querySelector('img')?.alt ?? '';
      status.textContent = `Foto ${index + 1} de ${slides.length}${alt ? `: ${alt}` : ''}`;
    }
  };

  // Respeita um link direto para uma foto (#<slug>-foto-2), como o modo sem JS.
  const fromHash = slides.findIndex((slide) => slide.id !== '' && `#${slide.id}` === window.location.hash);
  show(fromHash >= 0 ? fromHash : 0, false);
  root.dataset['galleryReady'] = '';

  thumbs.forEach((thumb, i) => {
    thumb.addEventListener('click', (event) => {
      event.preventDefault();
      root.dataset['galleryInteracted'] = '';
      show(i, true);
    });
  });

  const preload = (): void => {
    for (const img of root.querySelectorAll<HTMLImageElement>('[data-gallery-slide] img[loading="lazy"]')) {
      img.loading = 'eager';
    }
  };
  if (document.readyState === 'complete') preload();
  else window.addEventListener('load', preload, { once: true });
}

document.querySelectorAll<HTMLElement>('[data-gallery]').forEach(setupGallery);
