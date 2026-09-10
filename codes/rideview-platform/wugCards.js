const initWugCardAccordions = () => {
  document.querySelectorAll('.wug-cards').forEach((cardList) => {
    Array.from(cardList.children).forEach((card) => {
      const dropdowns = Array.from(
        card.querySelectorAll('.inner_dd_wrap')
      );
      if (!dropdowns.length) return;

      card.addEventListener('click', (event) => {
        const clickedDropdown = event.target.closest('.inner_dd_wrap');
        if (!clickedDropdown || !card.contains(clickedDropdown)) return;

        dropdowns.forEach((dropdown) => {
          dropdown.classList.remove('is-active');
        });
        clickedDropdown.classList.add('is-active');
      });
    });
  });
};

const initWugAnchorIndicator = () => {
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const cardSelectors = ['[portals-card]', '[apps-card]', '[baa-card]'];
  const imageSelectors = [
    '.on-center-img-3d[portals-img]',
    '.on-center-img-3d[apps-img]',
    '.on-center-img-3d[baa-img]'
  ];
  const responsiveContext = gsap.matchMedia();

  document.querySelectorAll('.anchor-list-inner').forEach((anchorList) => {
    const indicator = anchorList.querySelector('.current-tab-indicator');
    const buttons = Array.from(anchorList.querySelectorAll('[model-btn]'));
    const cards = cardSelectors.map((selector) =>
      document.querySelector(selector)
    );
    const images = imageSelectors.map((selector) =>
      document.querySelector(selector)
    );

    if (
      !indicator ||
      buttons.length < cards.length ||
      cards.some((card) => !card) ||
      images.some((image) => !image)
    ) {
      return;
    }

    const activateImage = (index, animate = true) => {
      images.forEach((image, imageIndex) => {
        gsap.to(image, {
          opacity: imageIndex === index ? 1 : 0,
          duration: animate ? 0.35 : 0,
          ease: 'power2.out',
          overwrite: true
        });
      });
    };

    const createCardTriggers = (activate) =>
      cards.map((card, index) =>
        ScrollTrigger.create({
          trigger: card,
          start: 'top 45%',
          end: 'bottom 45%',
          onEnter: () => activate(index),
          onEnterBack: () => activate(index),
          onRefresh: (self) => {
            if (self.isActive) activate(index, false);
          }
        })
      );

    responsiveContext.add('(min-width: 992px)', () => {
      const originalButtonStates = buttons.map((button) =>
        button.classList.contains('is-active')
      );

      const getIndicatorY = (index) => {
        const listRect = anchorList.getBoundingClientRect();
        const buttonRect = buttons[index].getBoundingClientRect();
        const indicatorHeight = indicator.getBoundingClientRect().height;

        return (
          buttonRect.top -
          listRect.top +
          (buttonRect.height - indicatorHeight) / 2
        );
      };

      const activateItem = (index, animate = true) => {
        buttons.forEach((button, buttonIndex) => {
          button.classList.toggle('is-active', buttonIndex === index);
        });

        activateImage(index, animate);

        gsap.to(indicator, {
          y: getIndicatorY(index),
          duration: animate ? 0.45 : 0,
          ease: 'power3.out',
          overwrite: true
        });
      };

      gsap.set(indicator, { top: 0, willChange: 'transform' });
      activateItem(0, false);

      const triggers = createCardTriggers(activateItem);

      return () => {
        triggers.forEach((trigger) => trigger.kill());
        gsap.killTweensOf(indicator);
        gsap.killTweensOf(images.filter(Boolean));
        gsap.set(indicator, { clearProps: 'top,transform,willChange' });
        gsap.set(images.filter(Boolean), { clearProps: 'opacity' });
        buttons.forEach((button, index) => {
          button.classList.toggle('is-active', originalButtonStates[index]);
        });
      };
    });

    responsiveContext.add(
      '(min-width: 768px) and (max-width: 991px)',
      () => {
        activateImage(0, false);
        const triggers = createCardTriggers(activateImage);

        return () => {
          triggers.forEach((trigger) => trigger.kill());
          gsap.killTweensOf(images);
          gsap.set(images, { clearProps: 'opacity' });
        };
      }
    );

    responsiveContext.add('(max-width: 767px)', () => {
      const originalPositions = images.map((image) => ({
        parent: image.parentNode,
        nextSibling: image.nextSibling
      }));

      images.forEach((image, index) => {
        const imageParent = cards[index].querySelector('.wug-img-parent');
        if (imageParent) imageParent.appendChild(image);
      });
      gsap.set(images, { opacity: 1 });
      ScrollTrigger.refresh();

      return () => {
        originalPositions.forEach(({ parent, nextSibling }, index) => {
          if (nextSibling && nextSibling.parentNode === parent) {
            parent.insertBefore(images[index], nextSibling);
          } else {
            parent.appendChild(images[index]);
          }
        });
        gsap.set(images, { clearProps: 'opacity' });
        ScrollTrigger.refresh();
      };
    });
  });
};

const initWugCards = () => {
  initWugCardAccordions();
  initWugAnchorIndicator();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWugCards, {
    once: true
  });
} else {
  initWugCards();
}
