const initMobileDropdowns = () => {
  const breakpoint = window.matchMedia('(max-width: 991px)');

  const updateDropdownName = (dropdown, modelButton) => {
    const currentName = dropdown?.querySelector(
      '[current-model-name], [current-tab-name]'
    );
    if (!currentName || !modelButton) return;

    const textTarget = currentName.querySelector('p') || currentName;
    textTarget.textContent = modelButton.textContent.replace(/\s+/g, ' ').trim();
  };

  const syncInitialNames = () => {
    if (!breakpoint.matches) return;

    document.querySelectorAll('.dd_wrap').forEach((dropdown) => {
      const firstButton =
        dropdown.querySelector('.model-change-btn.is-active') ||
        dropdown.querySelector('.model-change-btn');

      updateDropdownName(dropdown, firstButton);
    });
  };

  const closeDropdowns = (except = null) => {
    document.querySelectorAll('.dd_trigger.is-open').forEach((trigger) => {
      if (trigger !== except) trigger.classList.remove('is-open');
    });
  };

  document.addEventListener('click', (event) => {
    if (!breakpoint.matches) return;

    const modelButton = event.target.closest('.model-change-btn');

    if (modelButton) {
      const dropdown = modelButton.closest('.dd_wrap');
      updateDropdownName(dropdown, modelButton);
    }

    const trigger = event.target.closest('.dd_trigger');

    if (!trigger) {
      closeDropdowns();
      return;
    }

    const shouldOpen = !trigger.classList.contains('is-open');
    closeDropdowns(trigger);
    trigger.classList.toggle('is-open', shouldOpen);
  });

  breakpoint.addEventListener('change', (event) => {
    if (event.matches) {
      syncInitialNames();
    } else {
      closeDropdowns();
    }
  });

  requestAnimationFrame(syncInitialNames);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileDropdowns, {
    once: true
  });
} else {
  initMobileDropdowns();
}
