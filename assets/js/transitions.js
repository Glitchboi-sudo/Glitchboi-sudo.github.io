/* ===== SMOOTH TRANSITIONS & SCROLL EFFECTS ===== */
/* Inspirado en thegithubshop.com */

class SmoothTransitions {
  constructor(options = {}) {
    this.options = {
      threshold: options.threshold || 0.1,
      rootMargin: options.rootMargin || '0px 0px -100px 0px',
      animateOnce: options.animateOnce !== false
    };

    this.observer = null;
    this.init();
  }

  init() {
    // Intersection Observer para animaciones en scroll
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersect(entries),
      {
        threshold: this.options.threshold,
        rootMargin: this.options.rootMargin
      }
    );

    // Observar elementos con atributos de animación
    this.observeElements();

    // Parallax suave en scroll
    this.initParallax();

    // Transiciones de página
    this.initPageTransitions();
  }

  observeElements() {
    // Elementos con data-animate
    const elements = document.querySelectorAll('[data-animate]');
    elements.forEach(el => {
      // Agregar clase inicial
      el.classList.add('will-animate');
      this.observer.observe(el);
    });
  }

  handleIntersect(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const animationType = el.getAttribute('data-animate') || 'fade-in';
        const delay = parseInt(el.getAttribute('data-delay') || '0');

        setTimeout(() => {
          el.classList.add('is-visible', `animate-${animationType}`);
        }, delay);

        if (this.options.animateOnce) {
          this.observer.unobserve(el);
        }
      }
    });
  }

  initParallax() {
    const parallaxElements = document.querySelectorAll('[data-parallax]');
    if (!parallaxElements.length) return;

    let ticking = false;

    const updateParallax = () => {
      parallaxElements.forEach(el => {
        const speed = parseFloat(el.getAttribute('data-parallax') || '0.5');
        const rect = el.getBoundingClientRect();
        const scrolled = window.pageYOffset;
        const offset = (rect.top + scrolled) * speed;

        el.style.transform = `translate3d(0, ${offset}px, 0)`;
      });
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });
  }

  initPageTransitions() {
    // Fade-in inicial de la página
    document.body.classList.add('page-loaded');

    // Transiciones suaves en navegación interna
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#') return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          this.smoothScrollTo(target);
        }
      });
    });
  }

  smoothScrollTo(element, duration = 800) {
    const start = window.pageYOffset;
    const targetPosition = element.getBoundingClientRect().top + start;
    const distance = targetPosition - start;
    let startTime = null;

    const animation = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);

      // Easing function (ease-in-out)
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      window.scrollTo(0, start + distance * ease);

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  }

  // Método para agregar nuevos elementos dinámicamente
  observe(element) {
    if (this.observer) {
      element.classList.add('will-animate');
      this.observer.observe(element);
    }
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Efectos de hover mejorados
class HoverEffects {
  constructor() {
    this.init();
  }

  init() {
    // Efecto de seguimiento de cursor en tarjetas
    const cards = document.querySelectorAll('.card, [data-hover-glow]');

    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });

    // Efecto de inclinación en hover
    const tiltElements = document.querySelectorAll('[data-tilt]');
    tiltElements.forEach(el => {
      el.addEventListener('mouseenter', () => {
        el.style.transition = 'transform 0.1s ease-out';
      });

      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;

        el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transition = 'transform 0.3s ease';
        el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      });
    });
  }
}

// Loader/Spinner animado
class Loader {
  static show(container = document.body) {
    const loader = document.createElement('div');
    loader.className = 'loader-overlay';
    loader.innerHTML = `
      <div class="loader-spinner">
        <div class="spinner-ascii">
          <pre>[ █░░░░░░ ]</pre>
        </div>
      </div>
    `;
    container.appendChild(loader);

    // Animar el loader
    const ascii = loader.querySelector('pre');
    const frames = [
      '[ █░░░░░░ ]',
      '[ ░█░░░░░ ]',
      '[ ░░█░░░░ ]',
      '[ ░░░█░░░ ]',
      '[ ░░░░█░░ ]',
      '[ ░░░░░█░ ]',
      '[ ░░░░░░█ ]',
      '[ ░░░░░█░ ]',
      '[ ░░░░█░░ ]',
      '[ ░░░█░░░ ]',
      '[ ░░█░░░░ ]',
      '[ ░█░░░░░ ]'
    ];

    let frameIndex = 0;
    const interval = setInterval(() => {
      ascii.textContent = frames[frameIndex];
      frameIndex = (frameIndex + 1) % frames.length;
    }, 100);

    loader.dataset.intervalId = interval;
    return loader;
  }

  static hide(loader) {
    if (!loader) return;

    const intervalId = loader.dataset.intervalId;
    if (intervalId) {
      clearInterval(parseInt(intervalId));
    }

    loader.style.opacity = '0';
    setTimeout(() => {
      loader.remove();
    }, 300);
  }
}

// Inicialización automática
if (typeof window !== 'undefined') {
  window.SmoothTransitions = SmoothTransitions;
  window.HoverEffects = HoverEffects;
  window.Loader = Loader;

  // Auto-inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.smoothTransitions = new SmoothTransitions();
      window.hoverEffects = new HoverEffects();
    });
  } else {
    window.smoothTransitions = new SmoothTransitions();
    window.hoverEffects = new HoverEffects();
  }
}
