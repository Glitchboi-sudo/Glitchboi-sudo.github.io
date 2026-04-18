/**
 * TERMINAL FX - Efectos de terminal y comandos hacker
 * Para GLITCHBOI Terminal UI
 *
 * Comandos disponibles:
 * - /help, /commands - Lista de comandos
 * - /theme, /dark, /light - Cambiar tema
 * - /lang, /es, /en - Cambiar idioma
 * - /color - Toggle colores en modelos 3D
 * - /sound - Activar/desactivar sonidos
 * - /matrix - Efecto Matrix rain
 * - /hack - Animación de hacking
 * - /sudo, /rm -rf, /whoami, /ping, /ssh, /exit - Easter eggs
 */

(function() {
  'use strict';

  // ===== CONFIGURACIÓN =====
  const config = {
    soundEnabled: false,
    konami: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'],
  };

  // ===== ESTADO =====
  let konamiIndex = 0;
  let matrixMode = false;
  let commandBuffer = '';
  let commandTimeout;
  let commandHistory = [];
  let historyIndex = -1;
  let commandIndicator = null;

  // ===== AUDIO CONTEXT =====
  let audioContext;
  if (config.soundEnabled && (window.AudioContext || window.webkitAudioContext)) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

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

  // ===== FUNCIONES DE COMANDOS =====

  function toggleTheme() {
    const btn = document.getElementById('themeBtn');
    if (btn) btn.click();
    const theme = document.documentElement.getAttribute('data-theme');
    return `Tema cambiado a: ${theme === 'dark' ? 'DARK' : 'LIGHT'}`;
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch(e) {}
    const btn = document.getElementById('themeBtn');
    if (btn) {
      const isDark = theme === 'dark';
      btn.textContent = isDark ? '[ modo claro ]' : '[ modo nocturno ]';
      btn.setAttribute('aria-pressed', String(isDark));
    }
    return `Tema establecido: ${theme.toUpperCase()}`;
  }

  function toggleLang() {
    const btn = document.getElementById('langBtn');
    if (btn) btn.click();
    const lang = localStorage.getItem('lang') || 'es';
    return `Idioma cambiado a: ${lang.toUpperCase()}`;
  }

  function setLang(lang) {
    try {
      localStorage.setItem('lang', lang);
      if (typeof applyTranslations === 'function') applyTranslations();
      if (typeof updateTitleAndMeta === 'function') updateTitleAndMeta();
    } catch(e) {}
    return `Idioma establecido: ${lang.toUpperCase()}\nRecarga para aplicar todos los cambios`;
  }

  function toggleColor() {
    if (typeof toggleAllMonochromeMode === 'function') {
      const isMonochrome = toggleAllMonochromeMode();
      return isMonochrome ? 'Modo monocromático activado' : 'Modo color activado';
    }
    return 'No hay modelos 3D activos';
  }

  function toggleSound() {
    config.soundEnabled = !config.soundEnabled;
    if (config.soundEnabled && !audioContext && (window.AudioContext || window.webkitAudioContext)) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    beep(1000, 100, 0.1);
    return `Sonidos: ${config.soundEnabled ? 'ACTIVADOS' : 'DESACTIVADOS'}`;
  }

  function showWhoami() {
    const info = [];
    info.push(`USER: anonymous_hacker`);
    info.push(`IP: ${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`);
    info.push(`BROWSER: ${navigator.userAgent.split(' ').slice(-1)[0].split('/')[0]}`);
    info.push(`SCREEN: ${window.screen.width}x${window.screen.height}`);
    info.push(`LANG: ${navigator.language}`);
    info.push(`STATUS: Observado...`);
    return info.join('\n');
  }

  function hackEffect() {
    const messages = [
      'INICIANDO SECUENCIA...',
      'CONECTANDO A MAINFRAME...',
      'BYPASSEANDO FIREWALL...',
      'INYECTANDO PAYLOAD...',
      'DECRIPTANDO DATOS...',
      'ACCESO CONCEDIDO',
      '> root@glitchboi:~#'
    ];

    let i = 0;
    const overlay = document.createElement('div');
    overlay.id = 'hack-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--mono, monospace);
      color: #00ff00;
      font-size: 16px;
    `;

    const terminal = document.createElement('div');
    terminal.style.cssText = `
      max-width: 600px;
      padding: 20px;
      text-align: left;
      line-height: 1.8;
    `;
    overlay.appendChild(terminal);
    document.body.appendChild(overlay);

    function typeMessage() {
      if (i < messages.length) {
        const line = document.createElement('div');
        line.textContent = messages[i];
        line.style.opacity = '0';
        line.style.animation = 'fadeIn 0.3s ease forwards';
        terminal.appendChild(line);
        beep(800 + (i * 100), 50, 0.05);
        i++;
        setTimeout(typeMessage, 400 + Math.random() * 300);
      } else {
        setTimeout(() => {
          overlay.style.animation = 'fadeOut 0.5s ease forwards';
          setTimeout(() => overlay.remove(), 500);
        }, 1500);
      }
    }

    // Añadir estilos de animación
    if (!document.getElementById('hack-styles')) {
      const style = document.createElement('style');
      style.id = 'hack-styles';
      style.textContent = `
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
      `;
      document.head.appendChild(style);
    }

    typeMessage();
    return null; // No mostrar notificación adicional
  }

  function rmEffect() {
    // Usar overlay en lugar de modificar el DOM real
    // Así los scripts y renders siguen funcionando
    const overlay = document.createElement('div');
    overlay.id = 'rm-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--bg, #0a0a0a);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--mono, monospace);
      color: var(--ink, #f5f5f5);
      text-align: center;
      opacity: 0;
      transition: opacity 0.8s ease;
    `;

    overlay.innerHTML = `
      <div>
        <div style="font-size: 48px; margin-bottom: 20px;">💀</div>
        <div style="font-size: 14px; opacity: 0.7;">SYSTEM DESTROYED</div>
        <div style="font-size: 12px; margin-top: 10px; opacity: 0.5;">Just kidding...</div>
      </div>
    `;

    document.body.appendChild(overlay);
    beep(200, 500, 0.15);

    // Fade in del overlay
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    // Mostrar mensaje de destrucción
    setTimeout(() => {
      showNotification('rm -rf / ejecutado...\nBorrando sistema...', 2000);
    }, 300);

    // Fade out y remover
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        showNotification('Sistema restaurado\nNice try, hacker', 2500);
        beep(1200, 100, 0.1);
      }, 800);
    }, 3000);

    return null;
  }

  // ===== COMANDOS =====
  const commands = {
    '/help': {
      action: 'notify',
      message: `═══ COMANDOS DISPONIBLES ═══

SISTEMA:
  /theme    - Alternar tema
  /dark     - Modo oscuro
  /light    - Modo claro
  /lang     - Alternar idioma
  /es       - Español
  /en       - English
  /color    - Toggle color 3D
  /sound    - Toggle sonidos

HACKER:
  /matrix   - Matrix rain
  /hack     - Hacking simulation
  /whoami   - Tu información
  /ping     - Ping servidor
  /ssh      - Conexión SSH
  /sudo     - Ejecutar como root
  /rm -rf   - Borrar sistema
  /exit     - Salir

Tip: Konami Code activa Matrix`
    },
    '/commands': { action: 'alias', target: '/help' },
    '/?': { action: 'alias', target: '/help' },

    // Comandos de sistema
    '/theme': { action: 'function', handler: toggleTheme },
    '/dark': { action: 'function', handler: () => setTheme('dark') },
    '/light': { action: 'function', handler: () => setTheme('light') },
    '/lang': { action: 'function', handler: toggleLang },
    '/es': { action: 'function', handler: () => setLang('es') },
    '/en': { action: 'function', handler: () => setLang('en') },
    '/color': { action: 'function', handler: toggleColor },
    '/sound': { action: 'function', handler: toggleSound },

    // Comandos hacker
    '/matrix': { action: 'function', handler: activateMatrixMode },
    '/hack': { action: 'function', handler: hackEffect },
    '/whoami': { action: 'function', handler: showWhoami },
    '/ping': { action: 'notify', message: 'PONG!\n\n64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.042ms\n64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.039ms\n\n--- glitchboi.mx ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss' },
    '/ssh': { action: 'notify', message: 'ssh: connect to host glitchboi.mx port 22:\nConnection refused\n\n[!] Nice try. Access denied.' },
    '/sudo': { action: 'notify', message: '[sudo] password for hacker: ********\n\nSorry, user hacker is not in the sudoers file.\nThis incident will be reported.' },
    '/rm -rf': { action: 'function', handler: rmEffect },
    '/exit': { action: 'notify', message: 'logout\n\nConnection to glitchboi.mx closed.\n\nGoodbye, hacker. 👋' },
    '/clear': { action: 'function', handler: () => { beep(600, 50, 0.05); return 'Terminal cleared'; } },

    // About (mantener compatibilidad)
    '/about': {
      action: 'notify',
      message: `╔══════════════════════════════╗
║   GLITCHBOI TERMINAL v4.0    ║
╠══════════════════════════════╣
║ Estado: OPERACIONAL          ║
║ Modo: ${(document.documentElement.getAttribute('data-theme') === 'dark' ? 'DARK   ' : 'LIGHT  ')}              ║
║ Sonido: ${config.soundEnabled ? 'ON ' : 'OFF'}                  ║
╚══════════════════════════════╝`
    }
  };

  // ===== INDICADOR DE COMANDO =====
  function showCommandIndicator() {
    if (commandIndicator) return;

    commandIndicator = document.createElement('div');
    commandIndicator.id = 'command-indicator';
    commandIndicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: var(--paper, #ffffff);
      border: 2px solid var(--ink, #0a0a0a);
      padding: 8px 16px;
      font-family: var(--mono, monospace);
      font-size: 14px;
      color: var(--ink, #0a0a0a);
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideUp 0.2s ease-out;
    `;

    if (!document.getElementById('cmd-indicator-styles')) {
      const style = document.createElement('style');
      style.id = 'cmd-indicator-styles';
      style.textContent = `
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(0); opacity: 1; } to { transform: translateY(20px); opacity: 0; } }
        #command-indicator::before { content: '> '; color: var(--tech-green, #00ff00); }
        #command-indicator .cursor { animation: blink 0.8s step-end infinite; }
        @keyframes blink { 50% { opacity: 0; } }
      `;
      document.head.appendChild(style);
    }

    updateCommandIndicator();
    document.body.appendChild(commandIndicator);
  }

  function updateCommandIndicator() {
    if (!commandIndicator) return;
    commandIndicator.innerHTML = `${commandBuffer}<span class="cursor">█</span>`;
  }

  function hideCommandIndicator() {
    if (!commandIndicator) return;
    commandIndicator.style.animation = 'slideDown 0.2s ease-in forwards';
    setTimeout(() => {
      if (commandIndicator) {
        commandIndicator.remove();
        commandIndicator = null;
      }
    }, 200);
  }

  // ===== EJECUTAR COMANDO =====
  function executeCommand(cmd) {
    cmd = cmd.toLowerCase().trim();

    // Guardar en historial
    if (cmd && commandHistory[commandHistory.length - 1] !== cmd) {
      commandHistory.push(cmd);
      if (commandHistory.length > 20) commandHistory.shift();
    }
    historyIndex = -1;

    const cmdDef = commands[cmd];

    if (!cmdDef) {
      beep(300, 150, 0.12);
      showNotification(`Comando no reconocido: ${cmd}\n\nEscribe /help para ver comandos disponibles`, 3000);
      return;
    }

    beep(1000, 100, 0.1);

    // Resolver alias
    let finalCmd = cmdDef;
    if (cmdDef.action === 'alias') {
      finalCmd = commands[cmdDef.target];
    }

    if (finalCmd.action === 'notify') {
      showNotification(finalCmd.message, 4000);
    } else if (finalCmd.action === 'function') {
      const result = finalCmd.handler();
      if (result) showNotification(result, 3000);
    }
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

  // ===== DETECCIÓN DE COMANDOS =====
  document.addEventListener('keydown', (e) => {
    // Ignorar si hay un input/textarea activo
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      return;
    }

    // Iniciar comando con /
    if (e.key === '/' && !commandBuffer) {
      e.preventDefault();
      commandBuffer = '/';
      showCommandIndicator();
      clearTimeout(commandTimeout);
      commandTimeout = setTimeout(() => {
        commandBuffer = '';
        hideCommandIndicator();
      }, 5000);
      beep(600, 50, 0.08);
      return;
    }

    // Si hay un comando en curso
    if (commandBuffer.startsWith('/')) {
      clearTimeout(commandTimeout);
      commandTimeout = setTimeout(() => {
        commandBuffer = '';
        hideCommandIndicator();
      }, 5000);

      if (e.key === 'Enter') {
        e.preventDefault();
        hideCommandIndicator();
        executeCommand(commandBuffer);
        commandBuffer = '';
      } else if (e.key === 'Escape') {
        e.preventDefault();
        commandBuffer = '';
        hideCommandIndicator();
        beep(400, 50, 0.05);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        commandBuffer = commandBuffer.slice(0, -1);
        if (commandBuffer === '') {
          hideCommandIndicator();
        } else {
          updateCommandIndicator();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0) {
          if (historyIndex === -1) historyIndex = commandHistory.length;
          historyIndex = Math.max(0, historyIndex - 1);
          commandBuffer = commandHistory[historyIndex];
          updateCommandIndicator();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex !== -1) {
          historyIndex = Math.min(commandHistory.length - 1, historyIndex + 1);
          commandBuffer = commandHistory[historyIndex] || '/';
          updateCommandIndicator();
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        // Autocompletado básico
        const partial = commandBuffer.toLowerCase();
        const matches = Object.keys(commands).filter(c => c.startsWith(partial) && c !== partial);
        if (matches.length === 1) {
          commandBuffer = matches[0];
          updateCommandIndicator();
          beep(800, 30, 0.05);
        } else if (matches.length > 1) {
          showNotification(`Sugerencias:\n${matches.join('  ')}`, 2000);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        commandBuffer += e.key;
        updateCommandIndicator();
        beep(500, 30, 0.05);
      }
    }
  });

  // ===== MODO MATRIX =====
  function activateMatrixMode() {
    if (matrixMode) return 'Matrix ya está activo';
    matrixMode = true;

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
    showNotification('MATRIX MODE ACTIVATED\n\nSe desactivará en 30 segundos', 3000);

    setTimeout(() => {
      clearInterval(matrixInterval);
      matrixCanvas.remove();
      matrixMode = false;
      showNotification('MATRIX MODE DEACTIVATED', 2000);
    }, 30000);

    return null;
  }

  // ===== SISTEMA DE NOTIFICACIONES =====
  function showNotification(message, duration = 3000) {
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
      max-height: 80vh;
      overflow-y: auto;
      animation: slideInRight 0.3s ease-out;
    `;

    if (!document.getElementById('terminal-fx-styles')) {
      const style = document.createElement('style');
      style.id = 'terminal-fx-styles';
      style.textContent = `
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
      `;
      document.head.appendChild(style);
    }

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

    setTimeout(() => {
      notif.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => notif.remove(), 300);
    }, duration);
  }

  // ===== EFECTOS AL HOVER =====
  document.querySelectorAll('.card-link, .badge, .toggle').forEach(el => {
    el.addEventListener('mouseenter', () => beep(900, 20, 0.02));
  });

  // ===== MENSAJE DE BIENVENIDA =====
  window.addEventListener('load', () => {
    setTimeout(() => {
      showNotification('Sistema inicializado\n\nEscribe /help para comandos', 2500);
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
Commands in history: ${commandHistory.length}
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

        logo.style.animation = 'none';
        setTimeout(() => logo.style.animation = 'spin 1s linear', 10);
      }

      clickTimer = setTimeout(() => clickCount = 0, 500);
    });
  }

  // Animación de spin
  const spinStyle = document.createElement('style');
  spinStyle.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(spinStyle);

  console.log('%c◄ GLITCHBOI TERMINAL FX v4.0 ►', 'color: #0a0a0a; font-size: 14px; font-weight: bold; background: #f5f5f5; padding: 4px 8px;');
  console.log('%cTip: Escribe /help para ver todos los comandos', 'color: #666666; font-size: 12px;');

})();
