(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");

  const header = document.querySelector(".site-header");
  const menu = document.querySelector("#mobile-menu");
  const menuToggle = document.querySelector(".menu-toggle");
  const menuClose = document.querySelector(".menu-close");
  const navLinks = [...document.querySelectorAll(".main-nav a")];
  const navSections = navLinks
    .map((link) => ({
      link,
      section: document.querySelector(link.getAttribute("href")),
    }))
    .filter((item) => item.section);
  const revealElements = [...document.querySelectorAll("[data-reveal]")];
  const yearNode = document.querySelector("[data-year]");
  const cursor = document.querySelector(".cursor");
  const requestForm = document.querySelector("#request-form");
  const formStatus = document.querySelector(".form-status");
  const formFallback = document.querySelector(".form-fallback");

  let menuOpen = false;
  let lastFocused = null;
  let ticking = false;

  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }

  /* ---------- Anchors ---------- */

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;

      const target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();

      if (menuOpen) closeMenu({ restoreFocus: false });

      const headerOffset = window.innerWidth <= 720 ? 78 : 92;
      const top = Math.max(
        0,
        target.getBoundingClientRect().top + window.scrollY - headerOffset
      );

      window.scrollTo({
        top,
        behavior: reduceMotion.matches ? "auto" : "smooth",
      });

      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });

      if (history.pushState) {
        history.pushState(null, "", hash);
      }
    });
  });

  /* ---------- Header + active section ---------- */

  const updateScrollState = () => {
    const scrollTop = window.scrollY || window.pageYOffset;

    header?.classList.toggle("is-scrolled", scrollTop > 12);

    const navProbe = window.innerHeight * 0.38;
    let activeLink = null;

    navSections.forEach(({ link, section }) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= navProbe && rect.bottom > navProbe) {
        activeLink = link;
      }
    });

    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link === activeLink);
    });

    if (!reduceMotion.matches) {
      revealElements.forEach((element) => {
        if (
          !element.classList.contains("is-in") &&
          element.getBoundingClientRect().bottom < 0
        ) {
          element.classList.add("is-in");
        }
      });
    }

    ticking = false;
  };

  const requestScrollUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateScrollState);
  };

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });
  updateScrollState();

  /* ---------- Menu ---------- */

  menuToggle?.addEventListener("click", () => {
    if (menuOpen) closeMenu();
    else openMenu();
  });

  menuClose?.addEventListener("click", () => closeMenu());

  document.addEventListener("keydown", (event) => {
    if (!menuOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== "Tab" || !menu) return;

    const focusable = [
      ...menu.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
    ].filter((element) => element.offsetParent !== null);

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !menu.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 960 && menuOpen) {
      closeMenu({ restoreFocus: false });
    }
  });

  function openMenu() {
    if (!menu || !menuToggle || menuOpen) return;

    lastFocused = document.activeElement;
    menuOpen = true;
    menu.classList.add("is-open");
    menu.inert = false;
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Закрыть меню");
    body.classList.add("menu-open");

    window.setTimeout(() => menuClose?.focus(), 120);
  }

  function closeMenu({ restoreFocus = true } = {}) {
    if (!menu || !menuToggle || !menuOpen) return;

    menuOpen = false;
    menu.classList.remove("is-open");
    menu.inert = true;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Открыть меню");
    body.classList.remove("menu-open");

    if (restoreFocus) {
      const target =
        lastFocused instanceof HTMLElement ? lastFocused : menuToggle;
      target.focus();
    }
  }

  /* ---------- Reveal ---------- */

  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver(
      (entries, instance) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          instance.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -7% 0px" }
    );

    revealElements.forEach((element) => observer.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add("is-in"));
  }

  /* ---------- Request form ---------- */

  if (requestForm) {
    requestForm.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!requestForm.checkValidity()) {
        requestForm.reportValidity();
        return;
      }

      const data = new FormData(requestForm);
      const model = String(data.get("model") || "").trim();
      const size = String(data.get("size") || "").trim();
      const city = String(data.get("city") || "").trim();

      const message = [
        "Здравствуйте! Хочу подобрать пару.",
        `Модель: ${model}`,
        `Размер: ${size}`,
        `Город: ${city || "не указан"}`,
        "Подскажите, пожалуйста, наличие и цену.",
      ].join("\n");

      const url = `https://t.me/Kewwrq?text=${encodeURIComponent(message)}`;

      if (formFallback) {
        formFallback.hidden = false;
        formFallback.href = url;
      }

      if (formStatus) {
        formStatus.textContent =
          "Открываем Telegram. Отправьте готовое сообщение, чтобы завершить запрос.";
      }

      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  /* ---------- Prefilled product links ---------- */

  document.querySelectorAll("[data-product]").forEach((link) => {
    const product = link.getAttribute("data-product");
    if (!product) return;

    const message = `Здравствуйте! Интересует ${product}. Подскажите, пожалуйста, наличие, размеры и цену.`;
    link.href = `https://t.me/Kewwrq?text=${encodeURIComponent(message)}`;
  });

  /* ---------- Custom sneaker cursor ---------- */

  if (cursor && finePointer.matches) {
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let currentX = pointerX;
    let currentY = pointerY;
    let initialized = false;
    let frame = 0;
    let previousTarget = null;

    root.classList.add("has-cursor");

    const renderCursor = () => {
      const ease = reduceMotion.matches ? 1 : 0.32;
      currentX += (pointerX - currentX) * ease;
      currentY += (pointerY - currentY) * ease;

      cursor.style.transform = `translate3d(${currentX - 31}px, ${currentY - 19}px, 0)`;

      if (
        !reduceMotion.matches &&
        (Math.abs(pointerX - currentX) > 0.1 ||
          Math.abs(pointerY - currentY) > 0.1)
      ) {
        frame = requestAnimationFrame(renderCursor);
      } else {
        currentX = pointerX;
        currentY = pointerY;
        cursor.style.transform = `translate3d(${currentX - 31}px, ${currentY - 19}px, 0)`;
        frame = 0;
      }
    };

    const startCursorAnimation = () => {
      if (frame) return;
      frame = requestAnimationFrame(renderCursor);
    };

    const updateCursorState = (target) => {
      if (target === previousTarget) return;
      previousTarget = target;

      const isInput = Boolean(
        target instanceof Element &&
          target.closest("input, textarea, select, [contenteditable]")
      );
      const isInteractive = Boolean(
        target instanceof Element &&
          target.closest(
            'a, button, [role="tab"], label, .footer__nav a, .header-tg'
          )
      );

      cursor.classList.toggle("is-input", isInput);
      cursor.classList.toggle("is-hover", !isInput && isInteractive);
    };

    document.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType === "touch") return;

        pointerX = event.clientX;
        pointerY = event.clientY;

        if (!initialized) {
          initialized = true;
          currentX = pointerX;
          currentY = pointerY;
          cursor.style.transform = `translate3d(${currentX - 31}px, ${currentY - 19}px, 0)`;
        }

        cursor.classList.add("is-visible");
        updateCursorState(event.target);
        startCursorAnimation();
      },
      { passive: true }
    );

    document.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") return;
      cursor.classList.add("is-pressed");
      cursor.classList.remove("is-pulsing");
      void cursor.offsetWidth;
      cursor.classList.add("is-pulsing");
      window.setTimeout(() => cursor.classList.remove("is-pulsing"), 520);
    });

    document.addEventListener("pointerup", () => {
      cursor.classList.remove("is-pressed");
    });

    document.addEventListener("pointercancel", () => {
      cursor.classList.remove("is-pressed");
    });

    document.documentElement.addEventListener("pointerleave", () => {
      cursor.classList.remove("is-visible");
      cursor.classList.remove("is-pressed");
    });

    document.documentElement.addEventListener("pointerenter", () => {
      cursor.classList.add("is-visible");
    });

    window.addEventListener("blur", () => {
      cursor.classList.remove("is-pressed");
    });
  }

  /* ---------- Motion preference ---------- */

  const syncMotionPreference = () => {
    if (reduceMotion.matches) {
      revealElements.forEach((element) => element.classList.add("is-in"));
    }
  };

  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener("change", syncMotionPreference);
  } else if (reduceMotion.addListener) {
    reduceMotion.addListener(syncMotionPreference);
  }

  syncMotionPreference();
})();
