/* ===== SCRIPT DE INICIALIZACIÓN DE EJEMPLO ===== */
/* Copia este código en tu main.js o úsalo como referencia */

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Inicializando características estilo thegithubshop.com...');

  // 1. INICIALIZAR ASCII 3D
  // ================================================
  const asciiContainer = document.getElementById('ascii-3d');
  let ascii3d = null;

  if (asciiContainer) {
    ascii3d = new ASCII3D('ascii-3d', {
      pattern: 'cube',        // 'cube' o 'pyramid'
      speed: 0.002,           // Velocidad de rotación
      size: 15,               // Tamaño del objeto
      chars: ['█', '▓', '▒', '░', '/', '\\', '|', '-', '+', 'x', '*']
    });
    ascii3d.start();
    console.log('✓ ASCII 3D inicializado');

    // Controles opcionales
    const controls = document.getElementById('ascii-controls');
    if (controls) {
      controls.addEventListener('change', (e) => {
        if (e.target.name === 'pattern') {
          ascii3d.setPattern(e.target.value);
          console.log('Pattern cambiado a:', e.target.value);
        }
        if (e.target.name === 'speed') {
          const speed = parseFloat(e.target.value);
          ascii3d.setSpeed(speed);
          console.log('Speed cambiado a:', speed);
        }
        if (e.target.name === 'size') {
          const size = parseInt(e.target.value);
          ascii3d.setSize(size);
          console.log('Size cambiado a:', size);
        }
      });
    }
  }

  // 2. SMOOTH TRANSITIONS
  // ================================================
  // Se auto-inicializa en transitions.js, pero puedes personalizarlo:
  if (window.smoothTransitions) {
    console.log('✓ Smooth Transitions activo');

    // Observar nuevos elementos dinámicamente si es necesario
    // Ejemplo: después de cargar contenido AJAX
    // window.smoothTransitions.observe(nuevoElemento);
  }

  // 3. HOVER EFFECTS
  // ================================================
  if (window.hoverEffects) {
    console.log('✓ Hover Effects activo');
  }

  // 4. AGREGAR ANIMACIONES A ELEMENTOS DINÁMICOS
  // ================================================
  // Ejemplo: cuando cargues proyectos, blog posts, etc.
  const addAnimationsToCards = () => {
    const cards = document.querySelectorAll('.card:not([data-animate])');
    cards.forEach((card, index) => {
      card.setAttribute('data-animate', 'slide-up');
      card.setAttribute('data-delay', (index * 100).toString());
      card.setAttribute('data-hover-glow', '');

      // Notificar al observer de transiciones
      if (window.smoothTransitions) {
        window.smoothTransitions.observe(card);
      }
    });
  };

  // Llamar después de cargar contenido dinámico
  // Por ejemplo, después de fetchRepos() o fetchBlog()
  setTimeout(addAnimationsToCards, 500);

  // 5. EJEMPLO DE LOADER
  // ================================================
  const showExampleLoader = () => {
    const loader = Loader.show();

    // Simular carga
    setTimeout(() => {
      Loader.hide(loader);
      console.log('✓ Contenido cargado');
    }, 2000);
  };

  // Descomenta para probar el loader al cargar la página
  // showExampleLoader();

  // 6. SMOOTH SCROLL PARA LINKS INTERNOS
  // ================================================
  // Ya está implementado en SmoothTransitions, pero puedes usarlo manualmente:
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#' || !href) return;

      const target = document.querySelector(href);
      if (target && window.smoothTransitions) {
        e.preventDefault();
        window.smoothTransitions.smoothScrollTo(target, 800);
      }
    });
  });

  // 7. EFECTOS ESPECIALES OPCIONALES
  // ================================================

  // A) Agregar efecto glitch a títulos importantes
  const addGlitchToTitle = (selector) => {
    const element = document.querySelector(selector);
    if (element && !element.classList.contains('text-glitch-subtle')) {
      element.classList.add('text-glitch-subtle');
      element.setAttribute('data-text', element.textContent);
    }
  };

  // Ejemplo: addGlitchToTitle('.title');

  // B) Efecto scanlines en secciones específicas
  const addScanlinesTo = (selector) => {
    const element = document.querySelector(selector);
    if (element) {
      element.classList.add('scanlines');
    }
  };

  // Ejemplo: addScanlinesTo('.hero');

  // C) Terminal prompt dinámico a secciones
  const addTerminalPrompts = () => {
    document.querySelectorAll('.label:not([class*="terminal"])').forEach(label => {
      // Añadir variedad: algunas con >, otras con $
      const prompts = ['terminal-prompt', 'terminal-prompt-alt', 'terminal-prompt-hash'];
      const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
      label.classList.add(randomPrompt);
    });
  };

  // Ejemplo: addTerminalPrompts();

  // 8. ANIMACIÓN DE NÚMEROS (OPCIONAL)
  // ================================================
  const animateNumber = (element, start, end, duration = 2000) => {
    const startTime = performance.now();
    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing
      const easeOutQuad = progress * (2 - progress);
      const current = Math.floor(start + (end - start) * easeOutQuad);

      element.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  };

  // Ejemplo de uso:
  // const statsElement = document.querySelector('.stats-number');
  // if (statsElement) animateNumber(statsElement, 0, 1000);

  // 9. EASTER EGG: KONAMI CODE
  // ================================================
  let konamiCode = [];
  const konamiSequence = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a'
  ];

  document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10); // Keep last 10

    if (konamiCode.join(',') === konamiSequence.join(',')) {
      console.log('🎮 KONAMI CODE ACTIVATED!');

      // Cambiar el ASCII a modo rainbow
      if (ascii3d && asciiContainer) {
        asciiContainer.querySelector('.ascii-canvas')?.classList.add('rainbow');
        ascii3d.setSpeed(0.005); // Más rápido
      }

      // Mostrar mensaje
      alert('🎮 Easter egg activado! ASCII en modo rainbow!');
    }
  });

  // 10. PERFORMANCE MONITORING (DEV)
  // ================================================
  if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
    // Medir FPS
    let lastTime = performance.now();
    let frames = 0;

    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round(frames * 1000 / (currentTime - lastTime));
        console.log(`FPS: ${fps}`);
        frames = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    // Descomenta para monitorear FPS:
    // requestAnimationFrame(measureFPS);
  }

  console.log('✅ Todo inicializado correctamente!');
});

// 11. HELPERS ÚTILES
// ================================================

// Función para agregar múltiples animaciones de una vez
window.addBatchAnimations = (selector, animationType = 'fade-in', startDelay = 0, delayIncrement = 100) => {
  const elements = document.querySelectorAll(selector);
  elements.forEach((el, index) => {
    el.setAttribute('data-animate', animationType);
    el.setAttribute('data-delay', (startDelay + (index * delayIncrement)).toString());

    if (window.smoothTransitions) {
      window.smoothTransitions.observe(el);
    }
  });
};

// Función para cambiar el patrón ASCII desde la consola
window.setASCIIPattern = (pattern) => {
  const container = document.getElementById('ascii-3d');
  if (container && window.ascii3d) {
    window.ascii3d.setPattern(pattern);
    console.log('Pattern cambiado a:', pattern);
  }
};

// Función para toggle del loader
window.testLoader = (duration = 2000) => {
  const loader = Loader.show();
  setTimeout(() => Loader.hide(loader), duration);
};

console.log('💡 Helpers disponibles:');
console.log('  - window.addBatchAnimations(selector, type, delay, increment)');
console.log('  - window.setASCIIPattern("cube"|"pyramid")');
console.log('  - window.testLoader(duration)');
