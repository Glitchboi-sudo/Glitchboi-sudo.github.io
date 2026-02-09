/**
 * TERMINAL FX - Efectos de terminal y easter eggs hacker
 * Para GLITCHBOI Terminal UI
 */

(function() {
  'use strict';

  // ===== CONFIGURACIÓN =====
  const config = {
    soundEnabled: false, // Cambiar a true para activar sonidos
    konami: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'],
    commands: {
      '/help': 'Comandos disponibles:\n/matrix - Activar modo Matrix\n/about - Info del sistema\n/clear - Limpiar terminal',
      '/matrix': 'Modo Matrix activado...',
      '/about': 'GLITCHBOI TERMINAL v3.1\nEstado: OPERACIONAL\nModo: ' + (document.documentElement.getAttribute('data-theme') === 'dark' ? 'DARK' : 'LIGHT'),
      '/clear': '[TERMINAL CLEARED]'
    }
  };

  let konamiIndex = 0;
  let matrixMode = false;

  // ===== AUDIO CONTEXT (OPCIONAL) =====
  let audioContext;
  if (config.soundEnabled && (window.AudioContext || window.webkitAudioContext)) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Terminal beep sound
  function beep(frequency = 800, duration = 100, volume = 0.1) {
    if (!config.soundEnabled || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.value = volume;
    oscillator.frequency.value = frequency;
    oscillator.type = 'square';

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  }

  // ===== KONAMI CODE =====
  document.addEventListener('keydown', (e) => {
    if (e.key === config.konami[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === config.konami.length) {
        konamiIndex = 0;
        activateMatrixMode();
        beep(1200, 200, 0.15);
      }
    } else {
      konamiIndex = 0;
    }
  });

  // ===== MODO MATRIX =====
  function activateMatrixMode() {
    if (matrixMode) return;
    matrixMode = true;

    // Crear overlay de Matrix rain
    const matrixCanvas = document.createElement('canvas');
    matrixCanvas.id = 'matrix-rain';
    matrixCanvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 9997;
      pointer-events: none;
      opacity: 0.3;
    `;
    document.body.appendChild(matrixCanvas);

    const ctx = matrixCanvas.getContext('2d');
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight;

    const chars = '01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ01';
    const fontSize = 14;
    const columns = matrixCanvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    function drawMatrix() {
      // Usar colores del tema actual
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0a0a0a';
      const inkColor = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#f5f5f5';

      ctx.fillStyle = bgColor === '#0a0a0a' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

      ctx.fillStyle = inkColor;
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    const matrixInterval = setInterval(drawMatrix, 50);

    // Mostrar mensaje
    showNotification('MATRIX MODE ACTIVATED', 3000);

    // Desactivar después de 30 segundos
    setTimeout(() => {
      clearInterval(matrixInterval);
      matrixCanvas.remove();
      matrixMode = false;
      showNotification('MATRIX MODE DEACTIVATED', 2000);
    }, 30000);
  }

  // ===== COMMAND LINE EASTER EGG =====
  let commandBuffer = '';
  let commandTimeout;

  document.addEventListener('keydown', (e) => {
    // Detectar comandos que empiezan con /
    if (e.key === '/') {
      commandBuffer = '/';
      clearTimeout(commandTimeout);
      commandTimeout = setTimeout(() => {
        commandBuffer = '';
      }, 3000);
      beep(600, 50, 0.08);
    } else if (commandBuffer.startsWith('/')) {
      if (e.key === 'Enter') {
        executeCommand(commandBuffer);
        commandBuffer = '';
        clearTimeout(commandTimeout);
      } else if (e.key === 'Backspace') {
        commandBuffer = commandBuffer.slice(0, -1);
      } else if (e.key.length === 1) {
        commandBuffer += e.key;
        beep(500, 30, 0.05);
      }
    }
  });

  function executeCommand(cmd) {
    cmd = cmd.toLowerCase();

    if (config.commands[cmd]) {
      beep(1000, 100, 0.1);

      if (cmd === '/matrix') {
        activateMatrixMode();
      } else if (cmd === '/clear') {
        // No hacer nada visible, solo beep
        beep(800, 80, 0.08);
      } else {
        showNotification(config.commands[cmd], 3000);
      }
    } else {
      beep(300, 150, 0.12); // Error beep
      showNotification('COMANDO NO RECONOCIDO\nEscribe /help para ver comandos disponibles', 3000);
    }
  }

  // ===== SISTEMA DE NOTIFICACIONES =====
  function showNotification(message, duration = 3000) {
    // Eliminar notificación anterior si existe
    const oldNotif = document.getElementById('terminal-notification');
    if (oldNotif) oldNotif.remove();

    const notif = document.createElement('div');
    notif.id = 'terminal-notification';
    notif.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--paper, #ffffff);
      border: 2px solid var(--ink, #0a0a0a);
      padding: 16px 24px;
      color: var(--ink, #0a0a0a);
      font-family: var(--mono, monospace);
      font-size: 13px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      white-space: pre-line;
      max-width: 400px;
      animation: slideInRight 0.3s ease-out;
    `;

    // Añadir animación
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    if (!document.getElementById('terminal-fx-styles')) {
      style.id = 'terminal-fx-styles';
      document.head.appendChild(style);
    }

    // Añadir header ASCII
    const header = document.createElement('div');
    header.style.cssText = 'font-size: 10px; margin-bottom: 8px; color: var(--muted, #666666); opacity: 0.7;';
    header.textContent = '╔══[ SYSTEM MESSAGE ]══╗';
    notif.appendChild(header);

    const content = document.createElement('div');
    content.textContent = message;
    notif.appendChild(content);

    const footer = document.createElement('div');
    footer.style.cssText = 'font-size: 10px; margin-top: 8px; color: var(--muted, #666666); opacity: 0.7;';
    footer.textContent = '╚══════════════════════╝';
    notif.appendChild(footer);

    document.body.appendChild(notif);

    // Auto-eliminar
    setTimeout(() => {
      notif.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => notif.remove(), 300);
    }, duration);
  }

  // ===== EFECTOS AL HACER CLIC (desactivado) =====
  // Efecto de click removido para mantener diseño limpio

  // ===== EFECTO DE TYPING EN HOVER =====
  document.querySelectorAll('.card-link, .badge, .toggle').forEach(el => {
    el.addEventListener('mouseenter', () => {
      beep(900, 20, 0.02);
    });
  });

  // ===== MENSAJE DE BIENVENIDA =====
  window.addEventListener('load', () => {
    setTimeout(() => {
      showNotification('Sistema inicializado\nEscribe /help para comandos', 2500);
      beep(1000, 100, 0.08);
    }, 1000);
  });

  // ===== MODO DEBUG (Ctrl+Shift+D) =====
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      const theme = document.documentElement.getAttribute('data-theme') || 'auto';
      const debugInfo = `
═══════════════════════════════════
GLITCHBOI DEBUG MODE
═══════════════════════════════════
User Agent: ${navigator.userAgent.substring(0, 50)}...
Screen: ${window.screen.width}x${window.screen.height}
Viewport: ${window.innerWidth}x${window.innerHeight}
Theme: ${theme}
Sound: ${config.soundEnabled ? 'ENABLED' : 'DISABLED'}
Matrix: ${matrixMode ? 'ACTIVE' : 'INACTIVE'}
═══════════════════════════════════
      `;
      console.log(debugInfo);
      showNotification('Debug info registrado en consola', 2000);
    }
  });

  // ===== EASTER EGG: Triple click en logo =====
  const logo = document.querySelector('.logoX');
  if (logo) {
    let clickCount = 0;
    let clickTimer;

    logo.addEventListener('click', () => {
      clickCount++;
      clearTimeout(clickTimer);

      if (clickCount === 3) {
        showNotification('Acceso especial concedido\nBienvenido, administrador', 2500);
        beep(1500, 200, 0.15);
        clickCount = 0;

        // Efecto especial en el logo
        logo.style.animation = 'none';
        setTimeout(() => {
          logo.style.animation = 'spin 1s linear';
        }, 10);
      }

      clickTimer = setTimeout(() => {
        clickCount = 0;
      }, 500);
    });
  }

  // Animación de spin para el logo
  const spinStyle = document.createElement('style');
  spinStyle.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(spinStyle);

  console.log('%c◄ GLITCHBOI TERMINAL FX ►', 'color: #0a0a0a; font-size: 14px; font-weight: bold; background: #f5f5f5; padding: 4px 8px;');
  console.log('%cTip: Prueba el Konami Code o escribe /help', 'color: #666666; font-size: 12px;');

})();
