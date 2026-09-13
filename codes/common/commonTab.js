/**
 * Tab component.
 *
 *   new CommonTab('#differentiation');
 *
 * Expects, inside that section:
 *   .global_tab
 *     .tab_links_outer            <- mobile dropdown trigger
 *       [active-tab-name]         <- shows the current tab's text
 *       .tab_links_wrap           <- gets .is-active when open (<=767px)
 *         .tab_links
 *           .tab_link             <- one per panel
 *     .tab_panel_wrap
 *       <panel>                   <- direct children
 *
 * Links and panels have no matching ids, so they pair by position:
 * the nth link owns the nth child of `.tab_panel_wrap`.
 */
class CommonTab {
  static SELECTORS = {
    root: '.global_tab',
    linkList: '.tab_links',
    link: '.tab_link',
    panelWrap: '.tab_panel_wrap',
    linksOuter: '.tab_links_outer',
    linksWrap: '.tab_links_wrap',
    activeName: '[active-tab-name]',
    nav: '.nav_component'
  };

  static ACTIVE_CLASS = 'is-active';

  static MOBILE_QUERY = '(max-width: 767px)';

  constructor(section) {
    const scope =
      typeof section === 'string' ? document.querySelector(section) : section;

    if (!scope) {
      console.warn('[CommonTab] No element matched', section);
      return;
    }

    this.root = scope.matches(CommonTab.SELECTORS.root)
      ? scope
      : scope.querySelector(CommonTab.SELECTORS.root);

    if (!this.root) {
      console.warn(
        `[CommonTab] No ${CommonTab.SELECTORS.root} inside`,
        section
      );
      return;
    }

    this.linkList = this.root.querySelector(CommonTab.SELECTORS.linkList);
    this.panelWrap = this.root.querySelector(CommonTab.SELECTORS.panelWrap);

    if (!this.linkList || !this.panelWrap) {
      console.warn('[CommonTab] Missing links or panels in', this.root);
      return;
    }

    const links = this.getLinks();
    const panels = this.getPanels();

    if (links.length !== panels.length) {
      console.warn(
        `[CommonTab] ${links.length} links but ${panels.length} panels -- ` +
          'the extras will never activate.',
        this.root
      );
    }

    this.linksOuter = this.root.querySelector(CommonTab.SELECTORS.linksOuter);
    this.linksWrap = this.root.querySelector(CommonTab.SELECTORS.linksWrap);
    this.activeName = this.root.querySelector(CommonTab.SELECTORS.activeName);

    this.handleLinkClick = this.handleLinkClick.bind(this);
    this.linkList.addEventListener('click', this.handleLinkClick);

    if (this.linksOuter && this.linksWrap) {
      this.dropdownBound = false;
      this.mobile = window.matchMedia(CommonTab.MOBILE_QUERY);
      this.handleOuterClick = this.handleOuterClick.bind(this);
      this.handleBreakpoint = this.handleBreakpoint.bind(this);
      this.mobile.addEventListener('change', this.handleBreakpoint);

      // The nav lives outside the section, so this one is document-scoped.
      this.nav = document.querySelector(CommonTab.SELECTORS.nav);

      this.handleBreakpoint();
      this.initScrollTrigger();
    }

    // Respect whichever link the markup already marks active.
    const authored = links.findIndex((link) =>
      link.classList.contains(CommonTab.ACTIVE_CLASS)
    );
    this.setActiveIndex(authored === -1 ? 0 : authored);
  }

  getLinks() {
    return Array.from(
      this.linkList.querySelectorAll(CommonTab.SELECTORS.link)
    );
  }

  /** Direct children only -- panels are full of nested wrappers. */
  getPanels() {
    return Array.from(this.panelWrap.children);
  }

  setActiveIndex(index) {
    const links = this.getLinks();
    if (index < 0 || index >= links.length) return;

    links.forEach((link, position) => {
      link.classList.toggle(CommonTab.ACTIVE_CLASS, position === index);
    });

    this.getPanels().forEach((panel, position) => {
      panel.classList.toggle(CommonTab.ACTIVE_CLASS, position === index);
    });

    this.syncActiveName(links[index]);
    this.activeIndex = index;
  }

  /**
   * The label wraps its text in a <span> and sits beside a chevron, so write
   * to that span -- setting textContent on the element itself would wipe the
   * chevron's markup out.
   */
  syncActiveName(link) {
    if (!this.activeName || !link) return;

    const target = this.activeName.querySelector('span') || this.activeName;
    target.textContent = link.textContent.trim();
  }

  /* ---------- mobile dropdown (<=767px) ---------- */

  get isDropdownOpen() {
    return this.linksWrap.classList.contains(CommonTab.ACTIVE_CLASS);
  }

  openDropdown() {
    this.linksWrap?.classList.add(CommonTab.ACTIVE_CLASS);
  }

  closeDropdown() {
    this.linksWrap?.classList.remove(CommonTab.ACTIVE_CLASS);
  }

  toggleDropdown() {
    if (this.isDropdownOpen) this.closeDropdown();
    else this.openDropdown();
  }

  handleOuterClick(event) {
    // The wrap lives inside the trigger, so picking a link bubbles to here.
    if (event.target.closest(CommonTab.SELECTORS.link)) {
      this.closeDropdown();
      return;
    }

    this.toggleDropdown();
  }

  /**
   * `.tab_links_outer` sticks below the fixed nav, so its `top` matches the
   * nav's height. Cleared above 767px so the stylesheet stays in charge.
   */
  applyNavOffset() {
    if (!this.linksOuter) return;

    if (!this.nav || !this.mobile.matches) {
      this.linksOuter.style.top = '';
      return;
    }

    const height = Math.round(this.nav.getBoundingClientRect().height);
    this.linksOuter.style.top = `${height}px`;
  }

  handleBreakpoint() {
    if (this.mobile.matches) {
      if (!this.dropdownBound) {
        this.linksOuter.addEventListener('click', this.handleOuterClick);
        this.dropdownBound = true;
      }
    } else {
      if (this.dropdownBound) {
        this.linksOuter.removeEventListener('click', this.handleOuterClick);
        this.dropdownBound = false;
      }
      this.closeDropdown();
    }

    this.applyNavOffset();
  }

  /* ---------- hide the sticky links once the tabs scroll past ---------- */

  setLinksHidden(hidden) {
    if (!this.linksOuter) return;

    window.gsap.to(this.linksOuter, {
      opacity: hidden ? 0 : 1,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: true
    });
    this.linksOuter.style.pointerEvents = hidden ? 'none' : '';
  }

  initScrollTrigger() {
    if (!this.linksOuter) return;
    if (!window.gsap || !window.ScrollTrigger) return;

    window.gsap.registerPlugin(window.ScrollTrigger);
    this.media = window.gsap.matchMedia();

    this.media.add(CommonTab.MOBILE_QUERY, () => {
      const trigger = window.ScrollTrigger.create({
        trigger: this.root,
        start: 'bottom 70%',
        onEnter: () => this.setLinksHidden(true),
        onLeaveBack: () => this.setLinksHidden(false),
        // Covers loading the page already scrolled past the start.
        onRefresh: (self) => this.setLinksHidden(self.scroll() >= self.start)
      });

      return () => {
        trigger.kill();
        // Kill first -- an in-flight tween would otherwise keep writing
        // opacity after clearProps and leave the bar stuck invisible.
        window.gsap.killTweensOf(this.linksOuter);
        window.gsap.set(this.linksOuter, { clearProps: 'opacity' });
        this.linksOuter.style.pointerEvents = '';
      };
    });
  }

  handleLinkClick(event) {
    const link = event.target.closest(CommonTab.SELECTORS.link);
    if (!link || !this.linkList.contains(link)) return;

    const index = this.getLinks().indexOf(link);
    if (index === -1) return;

    this.setActiveIndex(index);
  }

  destroy() {
    this.linkList?.removeEventListener('click', this.handleLinkClick);
    if (this.dropdownBound) {
      this.linksOuter.removeEventListener('click', this.handleOuterClick);
      this.dropdownBound = false;
    }
    this.mobile?.removeEventListener('change', this.handleBreakpoint);
    this.media?.revert();
    if (this.linksOuter) this.linksOuter.style.top = '';
  }
}
