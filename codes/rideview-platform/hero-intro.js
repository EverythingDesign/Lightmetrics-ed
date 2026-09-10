// A perspective room of image tiles. Only the room moves; tile reveals are opacity-only.
const initHeroIntro = () => {
  const gsap = window.gsap;
  const canvas = document.querySelector('.animation-canvas');
  const sourceImage = canvas?.querySelector('img');
  const hero = canvas?.closest('section');
  const copy = [hero?.querySelector('h1'), hero?.querySelector('p')];
  if (!gsap || !canvas || !sourceImage || copy.some((item) => !item)) return;
  if (canvas.heroIntro) return;

  const config = {
    revealDuration: 0.55,
    revealSpread: 1.35,
    pullbackDuration: 1.8,
    finalOpacity: 0.5,
    gridColor: 'rgba(255,255,255,0.18)',
    gridLineWidth: 1,
    hoverTilt: 2.2,
    hoverShift: 6,
    hoverDuration: 0.85
  };
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const originals = [canvas, sourceImage, ...copy].map((element) => ({
    element,
    style: element.getAttribute('style')
  }));
  const viewport = document.createElement('div');
  const room = document.createElement('div');
  viewport.dataset.heroRoom = '';
  viewport.setAttribute('aria-hidden', 'true');
  viewport.appendChild(room);
  canvas.appendChild(viewport);
  const planes = {};
  let grids = [];
  let tiles = [];
  let timeline;
  let ready = false;
  let destroyed = false;
  let sizeKey = '';
  let resizeTimer;
  let loadTimer;
  let cameraEnd = 0;
  let imageRatio = 0;
  let introComplete = false;

  // Clipping/opacity live on the outer canvas; the inner room keeps its 3D planes.
  gsap.set(canvas, {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    maxWidth: 'none', margin: 0, padding: 0,
    overflow: 'hidden', opacity: 1, pointerEvents: 'none'
  });
  gsap.set(sourceImage, { display: 'none' });
  gsap.set(viewport, {
    position: 'absolute', inset: 0, perspectiveOrigin: '50% 50%'
  });
  gsap.set(room, {
    position: 'absolute', left: '50%', top: '50%',
    width: 0, height: 0, transformStyle: 'preserve-3d',
    // Opacity (including will-change: opacity) flattens a preserve-3d subtree.
    // Keep the camera's compositing state stable, including after the intro.
    willChange: 'transform', force3D: true
  });

  // Hover touches only rotation and X/Y; the intro owns the camera's Z position.
  const hoverSetters = Object.fromEntries(
    ['rotationX', 'rotationY', 'x', 'y'].map((property) => [
      property,
      gsap.quickTo(room, property, {
        duration: config.hoverDuration,
        ease: 'power3.out'
      })
    ])
  );
  const resetHover = (immediate = false) => {
    if (immediate) {
      Object.values(hoverSetters).forEach((setter) => setter.tween.pause());
      gsap.set(room, { rotationX: 0, rotationY: 0, x: 0, y: 0 });
    } else {
      Object.values(hoverSetters).forEach((setter) => setter(0));
    }
  };
  const moveHover = (event) => {
    if (
      destroyed || !introComplete || motionQuery.matches ||
      !hoverQuery.matches || event.pointerType !== 'mouse'
    ) return;

    const bounds = hero.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = gsap.utils.clamp(-1, 1, (event.clientX - bounds.left) / bounds.width * 2 - 1);
    const y = gsap.utils.clamp(-1, 1, (event.clientY - bounds.top) / bounds.height * 2 - 1);
    hoverSetters.rotationX(-y * config.hoverTilt);
    hoverSetters.rotationY(x * config.hoverTilt);
    hoverSetters.x(x * config.hoverShift);
    hoverSetters.y(y * config.hoverShift);
  };
  const leaveHover = () => {
    if (introComplete) resetHover(motionQuery.matches);
  };
  const changeHoverDevice = () => {
    if (!hoverQuery.matches) resetHover(true);
  };
  hero.addEventListener('pointermove', moveHover, { passive: true });
  hero.addEventListener('pointerleave', leaveHover);
  hero.addEventListener('pointercancel', leaveHover);
  window.addEventListener('blur', leaveHover);
  hoverQuery.addEventListener('change', changeHoverDevice);

  ['back', 'left', 'right', 'ceiling', 'floor'].forEach((name) => {
    const plane = document.createElement('div');
    plane.dataset.heroPlane = name;
    room.appendChild(plane);
    planes[name] = plane;
    gsap.set(plane, {
      position: 'absolute', left: 0, top: 0,
      xPercent: -50, yPercent: -50,
      transformStyle: 'preserve-3d',
      backgroundColor: '#000',
      boxSizing: 'border-box'
    });
  });

  const fillPlane = (name, width, height, columns, rows, tileWidth, tileHeight) => {
    const plane = planes[name];
    plane.replaceChildren();
    const stepX = width / columns;
    const stepY = height / rows;
    // A separate grid layer fades in without flattening the plane's image tiles.
    const grid = document.createElement('div');
    grid.dataset.heroGrid = name;
    const line = config.gridColor + ' ' + config.gridLineWidth + 'px, transparent 0';
    Object.assign(grid.style, {
      position: 'absolute', inset: '0', pointerEvents: 'none',
      backgroundImage:
        'linear-gradient(to right, ' + line + '),' +
        'linear-gradient(to bottom, ' + line + ')',
      backgroundSize: stepX + 'px ' + stepY + 'px',
      // Inset outline completes the outer edges without shifting the cell spacing.
      boxShadow: 'inset 0 0 0 ' + config.gridLineWidth + 'px ' + config.gridColor,
      opacity: '0'
    });
    plane.appendChild(grid);
    grids.push(grid);

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        // Keep neighboring cells in small groups; leave the copy's center open.
        const center = name === 'back' &&
          Math.abs((column + 0.5) / columns - 0.5) < (columns === 4 ? 0.51 : 0.33) &&
          Math.abs((row + 0.5) / rows - 0.5) < 0.22;
        const seed = (column * 7 + row * 11 + name.length * 3) % 13;
        if (center || seed > (name === 'back' ? 5 : 2)) continue;

        const tile = document.createElement('div');
        const image = sourceImage.cloneNode(false);
        image.removeAttribute('id');
        image.removeAttribute('style');
        image.removeAttribute('class');
        image.removeAttribute('width');
        image.removeAttribute('height');
        image.removeAttribute('fetchpriority');
        image.alt = '';
        image.loading = 'eager';
        image.draggable = false;
        // Explicit natural ratio prevents Webflow's .image styles from cropping the asset.
        Object.assign(image.style, {
          display: 'block', width: '100%', height: 'auto',
          maxWidth: 'none', borderRadius: 'inherit'
        });
        tile.appendChild(image);
        plane.appendChild(tile);
        gsap.set(tile, {
          position: 'absolute',
          left: column * stepX + (stepX - tileWidth) / 2,
          top: row * stepY + (stepY - tileHeight) / 2,
          width: tileWidth,
          borderRadius: Math.min(12, tileWidth * 0.065),
          opacity: 0,
          boxShadow: '0 0 0px rgba(91,210,255,0)',
          backfaceVisibility: 'hidden'
        });
        tiles.push(tile);
      }
    }
  };

  const layout = () => {
    const bounds = canvas.getBoundingClientRect();
    const width = bounds.width;
    const height = bounds.height;
    if (!width || !height) return false;
    const key = Math.round(width) + ':' + Math.round(height);
    if (key === sizeKey) return false;
    sizeKey = key;
    tiles = [];
    grids = [];
    const mobile = width <= 767;
    const ratio = sourceImage.naturalWidth / sourceImage.naturalHeight || 1.6;
    imageRatio = ratio;
    const columns = mobile ? 4 : 9;
    const roomWidth = width * (mobile ? 1.12 : 0.98);
    const roomHeight = height * 1.04;
    const depth = Math.min(width * 0.32, height * 0.56);
    const perspective = Math.max(width * 1.1, height * 1.25);
    const gap = mobile ? 5 : 8;
    const tileWidth = roomWidth / columns - gap;
    const tileHeight = tileWidth / ratio;
    const rows = Math.min(12, Math.max(4, Math.floor(roomHeight / (tileHeight + gap))));
    const sideColumns = Math.max(2, Math.round(depth / (tileWidth + gap)));
    // Shared depth divisions make grid lines meet at the floor/wall/ceiling seams.
    const capRows = sideColumns;
    cameraEnd = -depth * 0.22;

    gsap.set(viewport, { perspective });
    gsap.set(planes.back, { width: roomWidth, height: roomHeight, z: -depth });
    gsap.set(planes.left, {
      width: depth, height: roomHeight, x: -roomWidth / 2,
      z: -depth / 2, rotationY: 90
    });
    gsap.set(planes.right, {
      width: depth, height: roomHeight, x: roomWidth / 2,
      z: -depth / 2, rotationY: -90
    });
    gsap.set(planes.ceiling, {
      width: roomWidth, height: depth, y: -roomHeight / 2,
      z: -depth / 2, rotationX: -90
    });
    gsap.set(planes.floor, {
      width: roomWidth, height: depth, y: roomHeight / 2,
      z: -depth / 2, rotationX: 90
    });
    fillPlane('back', roomWidth, roomHeight, columns, rows, tileWidth, tileHeight);
    ['left', 'right'].forEach((name) => {
      const sideWidth = Math.min(tileWidth, depth / sideColumns - gap);
      fillPlane(name, depth, roomHeight, sideColumns, rows, sideWidth, sideWidth / ratio);
    });
    ['ceiling', 'floor'].forEach((name) => {
      const capWidth = Math.min(tileWidth, (depth / capRows - gap) * ratio);
      fillPlane(name, roomWidth, depth, columns, capRows, capWidth, capWidth / ratio);
    });
    gsap.set(room, { z: depth * 0.42 });
    return true;
  };

  const showFinal = () => {
    resetHover(true);
    gsap.set(room, { z: cameraEnd });
    gsap.set(tiles, { opacity: 1, clearProps: 'boxShadow,willChange' });
    gsap.set(grids, { opacity: 1 });
    gsap.set(canvas, { opacity: config.finalOpacity });
    gsap.set(copy, { autoAlpha: 1 });
    introComplete = true;
  };

  const start = () => {
    if (destroyed) return;
    if (ready) {
      // A slow image may finish after the loading timeout; restore its true ratio.
      const ratio = sourceImage.naturalWidth / sourceImage.naturalHeight;
      if (ratio && ratio !== imageRatio) {
        timeline?.kill();
        sizeKey = '';
        if (layout()) showFinal();
      }
      return;
    }
    window.clearTimeout(loadTimer);
    if (!layout()) return;
    ready = true;
    if (motionQuery.matches || !sourceImage.naturalWidth) {
      showFinal();
      return;
    }

    gsap.set(copy, { autoAlpha: 0 });
    timeline = gsap.timeline({
      onComplete: () => {
        gsap.set(canvas, { clearProps: 'willChange' });
        introComplete = true;
      }
    });
    gsap.set(canvas, { willChange: 'opacity' });
    timeline.to(grids, {
      opacity: 1, duration: 0.65, stagger: 0.06, ease: 'power2.out'
    }, 0);
    timeline.to(tiles, {
      opacity: 1, duration: config.revealDuration,
      stagger: { amount: config.revealSpread, from: 'random' },
      ease: 'power2.out'
    }, 0.2);
    timeline.addLabel('pullback', '+=0.2');
    timeline.to(room, {
      z: cameraEnd, duration: config.pullbackDuration, ease: 'power3.inOut'
    }, 'pullback');
    timeline.to(tiles, {
      boxShadow: '0 0 18px rgba(91,210,255,0.32), 0 0 32px rgba(136,112,255,0.15)',
      duration: 0.65, repeat: 1, yoyo: true,
      stagger: { amount: 0.25, from: 'center' }, ease: 'sine.inOut'
    }, 'pullback');
    timeline.to(canvas, {
      opacity: config.finalOpacity, duration: 0.85, ease: 'power2.inOut'
    }, 'pullback+=0.95');
    timeline.addLabel('copy', 'pullback+=' + config.pullbackDuration);
    timeline.to(copy, {
      autoAlpha: 1, duration: 0.8, stagger: 0.15, ease: 'power2.out'
    }, 'copy');
  };

  const resize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (destroyed) return;
      if (!ready) return start();
      const bounds = canvas.getBoundingClientRect();
      if (sizeKey === Math.round(bounds.width) + ':' + Math.round(bounds.height)) return;
      timeline?.kill();
      if (layout()) showFinal();
    }, 150);
  };
  const reduceMotion = () => {
    if (!motionQuery.matches || !ready) return;
    timeline?.kill();
    showFinal();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  motionQuery.addEventListener('change', reduceMotion);

  canvas.heroIntro = {
    destroy() {
      destroyed = true;
      timeline?.kill();
      Object.values(hoverSetters).forEach((setter) => setter.tween.kill());
      hero.removeEventListener('pointermove', moveHover);
      hero.removeEventListener('pointerleave', leaveHover);
      hero.removeEventListener('pointercancel', leaveHover);
      window.removeEventListener('blur', leaveHover);
      hoverQuery.removeEventListener('change', changeHoverDevice);
      observer.disconnect();
      window.clearTimeout(resizeTimer);
      window.clearTimeout(loadTimer);
      sourceImage.removeEventListener('load', start);
      sourceImage.removeEventListener('error', start);
      motionQuery.removeEventListener('change', reduceMotion);
      viewport.remove();
      originals.forEach(({ element, style }) => {
        if (style === null) element.removeAttribute('style');
        else element.setAttribute('style', style);
      });
      delete canvas.heroIntro;
    }
  };

  sourceImage.loading = 'eager';
  if (sourceImage.complete) start();
  else {
    sourceImage.addEventListener('load', start, { once: true });
    sourceImage.addEventListener('error', start, { once: true });
    loadTimer = window.setTimeout(start, 2500);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeroIntro, { once: true });
} else {
  initHeroIntro();
}
