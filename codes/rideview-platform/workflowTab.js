const initWorkflowTabs = () => {
  document.querySelectorAll('.dd_exp_body').forEach((workflow) => {
    const triggerList = workflow.querySelector('.dd_exp_triggers');
    const visuals = workflow.querySelector('.dd_exp_visuals');
    if (!triggerList || !visuals) return;

    const triggers = Array.from(
      triggerList.querySelectorAll('.dd_exp_wrap')
    );
    const visualItems = Array.from(visuals.children);
    const visualImages = visualItems.map((visual) =>
      visual.querySelector('img')
    );
    const mobileBreakpoint = window.matchMedia('(max-width: 767px)');

    const setActiveWorkflow = (index) => {
      triggers.forEach((item) => item.classList.remove('is-active'));
      visualItems.forEach((visual) => visual.classList.remove('is-active'));
      visualImages.forEach((image) => image?.classList.remove('is-active'));

      triggers[index]?.classList.add('is-active');
      visualItems[index]?.classList.add('is-active');
      visualImages[index]?.classList.add('is-active');
    };

    const syncImageLocations = () => {
      visualImages.forEach((image, index) => {
        if (!image) return;

        const destination = mobileBreakpoint.matches
          ? triggers[index]?.querySelector('.workflow-img_wrap')
          : visualItems[index];

        if (destination && image.parentElement !== destination) {
          destination.append(image);
        }
      });
    };

    syncImageLocations();
    setActiveWorkflow(0);
    mobileBreakpoint.addEventListener('change', syncImageLocations);

    triggerList.addEventListener('click', (event) => {
      const trigger = event.target.closest('.dd_exp_wrap');
      if (!trigger || !triggerList.contains(trigger)) return;

      const triggerIndex = triggers.indexOf(trigger);
      if (triggerIndex === -1) return;

      setActiveWorkflow(triggerIndex);
    });
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWorkflowTabs, {
    once: true
  });
} else {
  initWorkflowTabs();
}
