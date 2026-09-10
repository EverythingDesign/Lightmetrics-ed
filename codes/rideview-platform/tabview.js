(() => {
  class ModelTabs {
    constructor(section) {
      this.section = section;
      this.modelsList = section.querySelector('.models-list');
      this.modelsListInner = section.querySelector('.models-list-inner');
      this.indicator = this.modelsListInner?.querySelector(
        '.current-tab-indicator'
      );
      this.modelItems = this.modelsList
        ? Array.from(this.modelsList.querySelectorAll('.models-list-item'))
        : [];
      this.modelButtons = this.modelItems.map((item) =>
        item.querySelector('.model-change-btn')
      );
      this.infoBoxes = [];
      this.activeModelIndex = 0;
      this.reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      this.supportsDepthHover = window.matchMedia(
        '(hover: hover) and (pointer: fine)'
      ).matches;
    }

    init() {
      if (!this.modelsList || !this.modelsListInner || !this.modelItems.length) {
        return;
      }

      this.appendInfoBoxes();
      this.setupAngleCollections();
      this.appendModelButtons();
      this.setupIndicator();
      this.setActiveModel(0);
      this.bindModelButtons();

      window.addEventListener('resize', () => {
        this.alignIndicator(this.modelButtons[this.activeModelIndex]);
      });
    }

    appendModelButtons() {
      this.modelsListInner
        .querySelectorAll('.model-change-btn')
        .forEach((placeholderButton) => placeholderButton.remove());

      const fragment = document.createDocumentFragment();
      this.modelButtons.forEach((button) => {
        if (button) fragment.append(button);
      });
      this.modelsListInner.append(fragment);
    }

    appendInfoBoxes() {
      const target = this.section.querySelector('[info-box-target]');

      this.infoBoxes = this.modelItems.map((item) =>
        item.querySelector('[info-box-source]')
      );

      if (!target) return;

      const fragment = document.createDocumentFragment();
      this.infoBoxes.forEach((infoBox) => {
        if (!infoBox) return;
        infoBox.classList.remove('is-active');
        fragment.append(infoBox);
      });
      target.append(fragment);
    }

    setupAngleCollections() {
      this.modelItems.forEach((modelItem) => {
        const source = modelItem.querySelector('[angle-collection-source]');
        const target = modelItem.querySelector('[angle-collection-target]');
        if (!source || !target) return;

        target
          .querySelectorAll('[data-angle-img-copy]')
          .forEach((image) => image.remove());

        const fragment = document.createDocumentFragment();
        source.querySelectorAll('[angle-img]').forEach((image) => {
          const imageCopy = image.cloneNode(true);
          imageCopy.classList.add('angle-img-copy');
          imageCopy.setAttribute('data-angle-img-copy', '');
          fragment.append(imageCopy);
        });
        target.append(fragment);

        const sourceItems = Array.from(
          source.querySelectorAll('.angles-collection-item.is-grey-bg')
        );
        const targetImages = Array.from(
          target.querySelectorAll('[data-angle-img-copy]')
        );

        const setActiveAngle = (index) => {
          sourceItems.forEach((item) => item.classList.remove('is-active'));
          targetImages.forEach((image) => {
            image.classList.remove('is-active');
            this.resetAngleImageDepth(image);
          });

          sourceItems[index]?.classList.add('is-active');
          targetImages[index]?.classList.add('is-active');
        };

        setActiveAngle(0);
        targetImages.forEach((image) => this.bindAngleImageDepth(image));

        source.addEventListener('click', (event) => {
          const button = event.target.closest('.angle-change-btn');
          if (!button || !source.contains(button)) return;

          const sourceItem = button.closest(
            '.angles-collection-item.is-grey-bg'
          );
          const itemIndex = sourceItems.indexOf(sourceItem);
          if (itemIndex !== -1) setActiveAngle(itemIndex);
        });
      });
    }

    bindAngleImageDepth(image) {
      if (!this.supportsDepthHover || this.reduceMotion) return;

      image.style.transformOrigin = 'center center';
      image.style.transformStyle = 'preserve-3d';

      image.addEventListener('pointermove', (event) => {
        if (!image.classList.contains('is-active')) {
          this.resetAngleImageDepth(image);
          return;
        }

        const rect = image.getBoundingClientRect();
        const pointerX = (event.clientX - rect.left) / rect.width - 0.5;
        const pointerY = (event.clientY - rect.top) / rect.height - 0.5;
        const rotateX = pointerY * -8;
        const rotateY = pointerX * 8;

        image.style.transition = 'transform 120ms ease-out';
        image.style.transform =
          `perspective(900px) rotateX(${rotateX}deg) ` +
          `rotateY(${rotateY}deg) scale(1.02)`;
      });

      image.addEventListener('pointerleave', () => {
        this.resetAngleImageDepth(image);
      });
    }

    resetAngleImageDepth(image) {
      image.style.transition = this.reduceMotion
        ? 'none'
        : 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)';
      image.style.transform =
        'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
    }

    setupIndicator() {
      if (!this.indicator) return;

      this.indicator.style.top = '0';
      this.indicator.style.willChange = 'transform';

      requestAnimationFrame(() => {
        this.indicator.style.transition = this.reduceMotion
          ? 'none'
          : 'transform 450ms cubic-bezier(0.22, 1, 0.36, 1)';
      });
    }

    alignIndicator(button) {
      if (!button || !this.indicator) return;

      const listRect = this.modelsListInner.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const indicatorRect = this.indicator.getBoundingClientRect();
      const y =
        buttonRect.top -
        listRect.top +
        (buttonRect.height - indicatorRect.height) / 2;

      this.indicator.style.transform = `translate3d(0, ${y}px, 0)`;
    }

    setActiveModel(index) {
      if (!this.modelItems[index] || !this.modelButtons[index]) return;

      this.activeModelIndex = index;

      this.modelButtons.forEach((button) => {
        button?.classList.remove('is-active');
      });
      this.modelItems.forEach((item) => item.classList.remove('is-active'));
      this.infoBoxes.forEach((infoBox) => {
        infoBox?.classList.remove('is-active');
      });

      this.modelButtons[index].classList.add('is-active');
      this.modelItems[index].classList.add('is-active');
      this.infoBoxes[index]?.classList.add('is-active');
      this.alignIndicator(this.modelButtons[index]);
    }

    bindModelButtons() {
      this.modelsListInner.addEventListener('click', (event) => {
        const button = event.target.closest('.model-change-btn');
        if (!button || !this.modelsListInner.contains(button)) return;

        const buttonIndex = this.modelButtons.indexOf(button);
        if (buttonIndex !== -1) this.setActiveModel(buttonIndex);
      });
    }
  }

  const initModelTabs = () => {
    document
      .querySelectorAll('#camera-models, #on-camera-ai')
      .forEach((section) => {
        if (section.modelTabs) return;
        section.modelTabs = new ModelTabs(section);
        section.modelTabs.init();
      });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModelTabs, {
      once: true
    });
  } else {
    initModelTabs();
  }
})();
