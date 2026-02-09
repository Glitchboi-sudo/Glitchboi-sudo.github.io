/**
 * Configuración y inicialización compartida para renderizador ASCII 3D
 * Centraliza las opciones del efecto halftone bitmap
 */

// Configuración por defecto del renderizador 3D con efecto halftone
const ASCII3D_DEFAULT_CONFIG = {
  cellSize: 2,           // Celdas pequeñas = alta resolución
  fontSize: 3,           // Fuente pequeña = más detalle
  color: '#00ff00',      // Color por defecto (se sobreescribe con --ink del tema)
  backgroundColor: 'transparent',
  // Caracteres halftone: del claro al oscuro (patrón de puntos)
  chars: [' ', '.', '·', ':', '∙', '•', 'o', 'O', '0', '●', '█'],
  autoRotate: true,
  rotationSpeed: 0.005,
  fps: 30,
  halftone: true,        // Activar efecto halftone bitmap
  halftoneSize: 2,       // Tamaño de celda halftone (2 = puntos pequeños visibles)
  colorReduction: 12,    // Reducción de paleta de colores (12 = retro moderado)
  monochromeMode: true   // Modo monocromático TUI por defecto (escala de grises)
};

// Registro global de renderizadores activos
window.ascii3DRenderers = window.ascii3DRenderers || {};

/**
 * Crea una instancia del renderizador 3D con la configuración estándar
 * @param {string} containerId - ID del contenedor HTML
 * @param {Object} customOptions - Opciones personalizadas (opcional)
 * @returns {ASCII3DThreeJS} Instancia del renderizador
 */
function createASCII3DRenderer(containerId, customOptions = {}) {
  // Obtener color del tema actual
  let themeColor = getComputedStyle(document.body)
    .getPropertyValue('--ink')
    .trim() || ASCII3D_DEFAULT_CONFIG.color;

  // En modo claro, usar un color más oscuro para mejor fidelidad
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  if (currentTheme === 'light') {
    themeColor = '#333333';
  }
  else {
    themeColor = "#aa9f6e";
  }

  // Combinar configuración por defecto con opciones personalizadas
  const config = {
    ...ASCII3D_DEFAULT_CONFIG,
    color: themeColor,
    ...customOptions
  };

  return new ASCII3DThreeJS(containerId, config);
}

/**
 * Inicializa un renderizador 3D y carga un modelo
 * @param {string} containerId - ID del contenedor HTML
 * @param {string} modelPath - Ruta al archivo .obj
 * @param {Object} options - Opciones personalizadas (opcional)
 * @returns {Promise<ASCII3DThreeJS>} Promesa que resuelve con la instancia del renderizador
 */
async function initASCII3DWithModel(containerId, modelPath, options = {}) {
  console.log(`🎨 Inicializando renderizador 3D en #${containerId}...`);

  try {
    const renderer = createASCII3DRenderer(containerId, options);
    console.log(`📦 Cargando modelo: ${modelPath}`);

    await renderer.loadModel(modelPath);
    console.log(`✅ Modelo cargado exitosamente`);

    renderer.start();
    console.log(`▶️  Animación iniciada`);

    // Guardar en registro global para acceso desde toggles
    window.ascii3DRenderers[containerId] = renderer;

    return renderer;
  } catch (error) {
    console.error(`❌ Error inicializando renderizador 3D:`, error);
    throw error;
  }
}

/**
 * Alternar modo monocromático en todos los renderizadores activos
 * @returns {boolean} Estado del modo monocromático después del toggle
 */
function toggleAllMonochromeMode() {
  const renderers = Object.values(window.ascii3DRenderers || {});
  if (renderers.length === 0) return true;

  // Toggle del primer renderizador y aplicar a todos
  const newState = renderers[0].toggleMonochromeMode();
  renderers.slice(1).forEach(r => r.setMonochromeMode(newState));

  return newState;
}

/**
 * Actualizar el color de todos los renderizadores activos basándose en el tema actual
 */
function updateAllRenderersColor() {
  let themeColor = getComputedStyle(document.body)
    .getPropertyValue('--ink')
    .trim() || ASCII3D_DEFAULT_CONFIG.color;

  // En modo claro, usar un color más oscuro para mejor fidelidad
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  if (currentTheme === 'light') {
    // Usar un gris más oscuro en modo claro para mejor contraste
    themeColor = '#333333';
  }

  const renderers = Object.values(window.ascii3DRenderers || {});
  renderers.forEach(renderer => {
    if (renderer && typeof renderer.updateColor === 'function') {
      renderer.updateColor(themeColor);
    }
  });
}

// Observar cambios en el atributo data-theme del documento
const themeObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
      // Esperar un tick para que CSS se actualice
      setTimeout(updateAllRenderersColor, 10);
    }
  });
});

// Iniciar observación del tema
themeObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme']
});

// Exportar para uso global
window.createASCII3DRenderer = createASCII3DRenderer;
window.initASCII3DWithModel = initASCII3DWithModel;
window.toggleAllMonochromeMode = toggleAllMonochromeMode;
window.updateAllRenderersColor = updateAllRenderersColor;
window.ASCII3D_DEFAULT_CONFIG = ASCII3D_DEFAULT_CONFIG;
