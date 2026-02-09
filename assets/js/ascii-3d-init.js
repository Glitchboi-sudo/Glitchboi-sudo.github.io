/**
 * Configuración y inicialización compartida para renderizador ASCII 3D
 * Centraliza las opciones del efecto halftone bitmap
 */

// Configuracion por defecto del renderizador 3D con efecto ASCII TUI
// Se ajusta dinamicamente segun el tamano de pantalla
function getResponsiveConfig() {
  const isMobile = window.innerWidth <= 480;
  const isTablet = window.innerWidth > 480 && window.innerWidth <= 768;

  return {
    // Celdas pequenas = mas resolucion/detalle
    cellSize: isMobile ? 5 : isTablet ? 4.5 : 4,
    fontSize: isMobile ? 7 : isTablet ? 6.5 : 6,
    color: "#00ff00", // Color por defecto (se sobreescribe con tema)
    backgroundColor: "transparent",
    // Caracteres ASCII clasicos: del claro al oscuro (estilo terminal retro)
    chars: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$".split(""),
    autoRotate: true,
    rotationSpeed: 0.005,
    fps: 30,
    halftone: false,
    halftoneSize: 1,
    colorReduction: 64,
    monochromeMode: true,
  };
}

const ASCII3D_DEFAULT_CONFIG = getResponsiveConfig();

// Registro global de renderizadores activos
window.ascii3DRenderers = window.ascii3DRenderers || {};

/**
 * Crea una instancia del renderizador 3D con la configuración estándar
 * @param {string} containerId - ID del contenedor HTML
 * @param {Object} customOptions - Opciones personalizadas (opcional)
 * @returns {ASCII3DThreeJS} Instancia del renderizador
 */
function createASCII3DRenderer(containerId, customOptions = {}) {
  // Obtener color basado en el tema actual
  const themeColor = getThemeColor();

  // Obtener configuracion responsiva actualizada
  const responsiveConfig = getResponsiveConfig();

  // Combinar configuracion por defecto con opciones personalizadas
  const config = {
    ...responsiveConfig,
    color: themeColor,
    ...customOptions,
  };

  return new ASCII3DThreeJS(containerId, config);
}

/**
 * Obtiene el color apropiado según el tema actual
 * @returns {string} Color hex para el renderizador
 */
function getThemeColor() {
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "light";

  if (currentTheme === "light") {
    // Negro puro para maximo contraste en fondo claro
    return "#000000";
  } else {
    // Dorado/beige para modo oscuro (coincide con el tema del sitio)
    return "#ffffff";
  }
}

/**
 * Inicializa un renderizador 3D y carga un modelo
 * @param {string} containerId - ID del contenedor HTML
 * @param {string} modelPath - Ruta al archivo .obj
 * @param {Object} options - Opciones personalizadas (opcional)
 * @returns {Promise<ASCII3DThreeJS>} Promesa que resuelve con la instancia del renderizador
 */
async function initASCII3DWithModel(containerId, modelPath, options = {}) {
  console.log(`Inicializando renderizador 3D en #${containerId}...`);

  try {
    const container = document.getElementById(containerId);
    console.log(`Container encontrado:`, container ? 'si' : 'no',
                'dimensiones:', container?.clientWidth, 'x', container?.clientHeight);

    const renderer = createASCII3DRenderer(containerId, options);
    console.log(`Cargando modelo: ${modelPath}`);

    await renderer.loadModel(modelPath);
    console.log(`Modelo cargado exitosamente`);

    // Forzar actualización de dimensiones después de cargar el modelo
    renderer.updateDimensions();

    renderer.start();
    console.log(`Animación iniciada`);

    // Guardar en registro global para acceso desde toggles
    window.ascii3DRenderers[containerId] = renderer;

    return renderer;
  } catch (error) {
    console.error(`Error inicializando renderizador 3D:`, error);
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
  renderers.slice(1).forEach((r) => r.setMonochromeMode(newState));

  return newState;
}

/**
 * Actualizar el color de todos los renderizadores activos basándose en el tema actual
 */
function updateAllRenderersColor() {
  const themeColor = getThemeColor();

  const renderers = Object.values(window.ascii3DRenderers || {});
  renderers.forEach((renderer) => {
    if (renderer && typeof renderer.updateColor === "function") {
      renderer.updateColor(themeColor);
    }
  });
}

// Observar cambios en el atributo data-theme del documento
const themeObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (
      mutation.type === "attributes" &&
      mutation.attributeName === "data-theme"
    ) {
      // Esperar un tick para que CSS se actualice
      setTimeout(updateAllRenderersColor, 10);
    }
  });
});

// Iniciar observación del tema
themeObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-theme"],
});

// Exportar para uso global
window.createASCII3DRenderer = createASCII3DRenderer;
window.initASCII3DWithModel = initASCII3DWithModel;
window.toggleAllMonochromeMode = toggleAllMonochromeMode;
window.updateAllRenderersColor = updateAllRenderersColor;
window.getThemeColor = getThemeColor;
window.getResponsiveConfig = getResponsiveConfig;
window.ASCII3D_DEFAULT_CONFIG = ASCII3D_DEFAULT_CONFIG;
