/**
 * Differentiation section carousels.
 *
 * Requires Swiper (JS + CSS) to be loaded before this script.
 *
 * Each tab panel in #differentiation holds its own `._w-b-swiper`, so every
 * one gets an isolated instance with its own controls. Panels are hidden with
 * `display: none`, which means Swiper measures a width of 0 for every carousel
 * that is not on the open tab -- a ResizeObserver re-measures each one the
 * first time its panel is actually shown.
 */

const SWIPER_SELECTOR = '._w-b-swiper';

const DEFAULT_OPTIONS = {
  // Mobile-first: this is the value below 768px -- change it to taste.
  slidesPerView: 1.1,
  breakpoints: {
    // Webflow tablet breakpoint and up.
    768: { slidesPerView: 1.1 }
  },
  spaceBetween: 16,
  speed: 500,
  grabCursor: true,
  watchOverflow: true,
  observer: true,
  observeParents: true,
  a11y: { enabled: true },
  keyboard: { enabled: true, onlyInViewport: true }
};

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Per-carousel overrides, so a single tab can differ without a code change:
 *   data-swiper-config='{"loop":true,"breakpoints":{"992":{"spaceBetween":32}}}'
 *   data-swiper-slides-per-view="1.2"
 *   data-swiper-space-between="24"
 *   data-swiper-speed="700"
 *   data-swiper-loop="true"
 *   data-swiper-autoplay="5000"
 */
const readOptions = (element) => {
  const data = element.dataset;
  const options = {};

  if (data.swiperSlidesPerView) {
    options.slidesPerView =
      data.swiperSlidesPerView === 'auto'
        ? 'auto'
        : toNumber(data.swiperSlidesPerView) ?? DEFAULT_OPTIONS.slidesPerView;
  }

  const spaceBetween = toNumber(data.swiperSpaceBetween);
  if (spaceBetween !== null) options.spaceBetween = spaceBetween;

  const speed = toNumber(data.swiperSpeed);
  if (speed !== null) options.speed = speed;

  if (data.swiperLoop) options.loop = data.swiperLoop !== 'false';

  const autoplayDelay = toNumber(data.swiperAutoplay);
  if (autoplayDelay !== null && !prefersReducedMotion()) {
    options.autoplay = {
      delay: autoplayDelay,
      disableOnInteraction: false,
      pauseOnMouseEnter: true
    };
  }

  if (data.swiperConfig) {
    try {
      Object.assign(options, JSON.parse(data.swiperConfig));
    } catch (error) {
      console.warn(
        '[swiperCards] Ignoring malformed data-swiper-config',
        element,
        error
      );
    }
  }

  return options;
};

const NAVIGATOR = {
  wrap: '.swiper-navigator',
  prev: '.s-n-prev',
  next: '.s-n-next'
};

/**
 * The navigator is a *sibling* of the carousel, not a child, so look in the
 * shared parent and then the tab panel. Never search document-wide, or all
 * three carousels would share whichever arrows they found first.
 */
const findNavigator = (element) => {
  const scopes = [
    element,
    element.parentElement,
    element.closest('.tab_panel_wrap > *')
  ];

  for (const scope of scopes) {
    const navigator = scope?.querySelector(NAVIGATOR.wrap);
    if (navigator) return navigator;
  }

  return null;
};

const readControls = (element) => {
  const navigator = findNavigator(element);
  if (!navigator) return {};

  const prevEl = navigator.querySelector(NAVIGATOR.prev);
  const nextEl = navigator.querySelector(NAVIGATOR.next);

  if (!prevEl || !nextEl) {
    console.warn(
      `[swiperCards] ${NAVIGATOR.wrap} is missing ${NAVIGATOR.prev} or ` +
        `${NAVIGATOR.next}`,
      navigator
    );
    return {};
  }

  return { navigation: { prevEl, nextEl } };
};

/**
 * A carousel inside a closed tab initialises at zero width. Watch for the
 * moment it gains a width and re-measure, otherwise the slides stay stacked.
 */
const watchForReveal = (element, swiper) => {
  if (typeof ResizeObserver === 'undefined') return;

  let lastWidth = element.getBoundingClientRect().width;

  const observer = new ResizeObserver(([entry]) => {
    const width = entry.contentRect.width;
    if (width === lastWidth) return;

    const wasHidden = lastWidth === 0;
    lastWidth = width;

    if (width && wasHidden) swiper.update();
  });

  observer.observe(element);
};

const createSwiper = (element) => {
  if (element.swiper) return element.swiper;

  if (!element.querySelector('.swiper-wrapper')) {
    console.warn('[swiperCards] Skipping carousel with no wrapper', element);
    return null;
  }

  const swiper = new window.Swiper(element, {
    ...DEFAULT_OPTIONS,
    ...readControls(element),
    ...readOptions(element)
  });

  watchForReveal(element, swiper);
  return swiper;
};

const initSwiperCards = () => {
  const elements = Array.from(document.querySelectorAll(SWIPER_SELECTOR));
  if (!elements.length) return;

  if (!window.Swiper) {
    console.warn('[swiperCards] Swiper is not loaded yet - carousels skipped.');
    return;
  }

  const instances = elements.map(createSwiper).filter(Boolean);
  if (!instances.length) return;

  // Late-loading images can change slide heights after init.
  window.addEventListener(
    'load',
    () => instances.forEach((swiper) => swiper.update()),
    { once: true }
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSwiperCards, {
    once: true
  });
} else {
  initSwiperCards();
}
