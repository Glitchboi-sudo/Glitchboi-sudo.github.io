// Tema ligero para la página de proyectos (mismo comportamiento que el blog)
document.body.classList.add("page-loaded"); // evita que la opacidad inicial deje la página invisible

(function setupTheme() {
  const btn = document.getElementById("themeBtn");
  const prefers = () =>
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  const saved = () => {
    try {
      const v = localStorage.getItem("theme");
      return v === "light" || v === "dark" ? v : null;
    } catch (e) {
      return null;
    }
  };
  function current() {
    return (
      document.documentElement.getAttribute("data-theme") ||
      saved() ||
      prefers()
    );
  }
  function apply(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    try {
      localStorage.setItem("theme", mode);
    } catch (e) {}
    if (btn) {
      const isDark = mode === "dark";
      btn.setAttribute("aria-pressed", String(isDark));
      btn.textContent = isDark ? "[ Light ]" : "[ Dark ]";
    }
  }
  apply(current());
  btn?.addEventListener("click", () =>
    apply(current() === "dark" ? "light" : "dark"),
  );
})();
const y = document.getElementById("y");
if (y) y.textContent = new Date().getFullYear();

const GH_USER = "Glitchboi-sudo";
const PROJECTS_DATA_URL = "../assets/data/projects.json";
const FALLBACK_BANNER = "../assets/images/1.jpeg";
const MAX_OTHERS = 2;
const EXCLUDED_REPOS = new Set(["glitchboi-sudo.github.io", "glitchboi-sudo"]);
const isExcludedRepo = (name) =>
  EXCLUDED_REPOS.has(String(name || "").toLowerCase());

const supportsLineClamp =
  typeof CSS !== "undefined" &&
  (CSS.supports?.("-webkit-line-clamp", "3") ||
    CSS.supports?.("line-clamp", "3"));

function esc(s) {
  return String(s ?? "").replace(
    /[&<>\"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '\"': "&quot;",
        "'": "&#39;",
      })[m],
  );
}
function escAttr(s) {
  return String(s ?? "").replace(/\"/g, "&quot;");
}
function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function resolveAsset(path) {
  if (!path) return "";
  const url = String(path);
  if (/^https?:\/\//i.test(url) || url.startsWith("/")) return url;
  if (url.startsWith("../")) return url;
  return `../${url}`;
}

function clampText(str, max = 240) {
  if (!str) return "\u2014";
  const s = String(str).trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + "\u2026";
}

/**
 * Simple markdown parser for README rendering
 * Supports: links, bold, italic, code, headers, lists, horizontal rules
 */
function parseMarkdown(text) {
  if (!text) return "";

  let html = text
    // Escape HTML first (but preserve markdown)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

    // Headers (must be at start of line)
    .replace(/^### (.+)$/gm, '<h4 style="margin: 16px 0 8px; font-size: 14px; font-weight: bold;">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin: 16px 0 8px; font-size: 15px; font-weight: bold;">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin: 16px 0 8px; font-size: 16px; font-weight: bold;">$1</h2>')

    // Horizontal rule
    .replace(/^[-*_]{3,}$/gm, '<hr style="border: none; border-top: 1px solid var(--rule); margin: 16px 0;">')

    // Code blocks (```code```)
    .replace(/```([^`]+)```/gs, '<pre style="background: var(--rule); padding: 12px; overflow-x: auto; font-family: monospace; font-size: 12px; margin: 12px 0; border: 1px solid var(--muted);">$1</pre>')

    // Inline code (`code`)
    .replace(/`([^`]+)`/g, '<code style="background: var(--rule); padding: 2px 6px; font-family: monospace; font-size: 12px;">$1</code>')

    // Images ![alt](url) - render as linked text since we're in ASCII theme
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<span style="color: var(--muted);">[img: $1]</span>')

    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--tech-green); text-decoration: underline;">$1</a>')

    // Bold **text** or __text__
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')

    // Italic *text* or _text_
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')

    // Unordered lists (- or *)
    .replace(/^[\-\*] (.+)$/gm, '<li style="margin-left: 20px; list-style: disc;">$1</li>')

    // Ordered lists (1. 2. etc)
    .replace(/^\d+\. (.+)$/gm, '<li style="margin-left: 20px; list-style: decimal;">$1</li>')

    // Wrap consecutive <li> elements in <ul>
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul style="margin: 8px 0; padding: 0;">${match}</ul>`)

    // Paragraphs (double newline)
    .replace(/\n\n+/g, '</p><p style="margin: 0 0 12px;">')

    // Single newlines within paragraphs
    .replace(/\n/g, '<br>');

  // Wrap in paragraph if not starting with block element
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<pre') && !html.startsWith('<hr')) {
    html = `<p style="margin: 0 0 12px;">${html}</p>`;
  }

  // Clean up empty paragraphs
  html = html.replace(/<p[^>]*>\s*<\/p>/g, '');

  return html;
}

function parseRepoParam() {
  const params = new URLSearchParams(location.search);
  const repo = params.get("repo") || params.get("id") || params.get("project");
  return repo ? slugify(repo) : null;
}

async function loadProjectsMeta() {
  try {
    const res = await fetch(PROJECTS_DATA_URL, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("No se pudo leer projects.json");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("Projects meta:", e);
    return [];
  }
}

async function fetchReposList() {
  try {
    const res = await fetch(
      `https://api.github.com/users/${GH_USER}/repos?sort=updated&per_page=50`,
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!res.ok) throw new Error("GitHub API");
    const data = await res.json();
    return data
      .filter((r) => !r.fork && !r.archived && !isExcludedRepo(r.name))
      .map((r) => ({
        repo: r.name,
        title: r.name,
        summary: r.description || "",
        description: r.description || "",
        updated: r.pushed_at ? r.pushed_at.slice(0, 10) : "",
        language: r.language,
        homepage: r.homepage,
        github: r.html_url,
        topics: r.topics || [],
        slug: slugify(r.name),
      }));
  } catch (e) {
    console.warn("GitHub list:", e);
    return [];
  }
}

async function fetchRepoInfo(repoName) {
  if (!repoName) throw new Error("repoName requerido");
  const res = await fetch(
    `https://api.github.com/repos/${GH_USER}/${repoName}`,
  );
  if (!res.ok) throw new Error("GitHub API");
  return await res.json();
}

async function fetchReadme(repoName) {
  if (!repoName) return null;
  const branches = ["main", "master"];
  for (const branch of branches) {
    const url = `https://raw.githubusercontent.com/${GH_USER}/${repoName}/${branch}/README.md`;
    try {
      const res = await fetch(url, { headers: { Accept: "text/plain" } });
      if (res.ok) {
        return await res.text();
      }
    } catch (e) {
      /* continua con la siguiente rama */
    }
  }
  return null;
}

function extractDescription(md) {
  if (!md) return null;
  const lines = md.split(/\r?\n/);
  const startIdx = lines.findIndex((l) =>
    /^##\s+(descripci[oó]n|description)\s*$/i.test(l.trim()),
  );
  if (startIdx === -1) return null;
  const body = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{1,2}\s+/.test(line.trim())) break; // siguiente heading
    body.push(line);
  }
  const text = body.join("\n").trim();
  if (!text) return null;
  return text;
}

function extractImageFromReadme(md, repoName) {
  if (!md) return null;
  const lines = md.split(/\r?\n/);

  // Buscar en las primeras 20 líneas (antes de cualquier sección principal)
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i].trim();

    // Detener si llegamos a una sección importante (##)
    if (/^##\s+/.test(line)) break;

    // Buscar markdown image: ![alt](url)
    const mdMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (mdMatch) {
      let url = mdMatch[2].trim();
      // Si es URL relativa, construir URL absoluta de GitHub
      if (!url.startsWith("http")) {
        url = `https://raw.githubusercontent.com/${GH_USER}/${repoName}/main/${url.replace(/^\.?\/?/, "")}`;
      }
      return url;
    }

    // Buscar HTML img tag: <img src="url" ...>
    const htmlMatch = line.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (htmlMatch) {
      let url = htmlMatch[1].trim();
      if (!url.startsWith("http")) {
        url = `https://raw.githubusercontent.com/${GH_USER}/${repoName}/main/${url.replace(/^\.?\/?/, "")}`;
      }
      return url;
    }
  }

  return null;
}

async function findGlitchboiBanner(repoName) {
  if (!repoName) return null;

  // Posibles nombres de archivo para el banner de Glitchboi
  const bannerNames = [
    "glitchboi-banner.png",
    "glitchboi-banner.jpg",
    "glitchboi-banner.jpeg",
    "glitchboi.png",
    "glitchboi.jpg",
    "banner.png",
    "banner.jpg",
  ];

  const branches = ["main", "master"];

  for (const branch of branches) {
    for (const name of bannerNames) {
      const url = `https://raw.githubusercontent.com/${GH_USER}/${repoName}/${branch}/${name}`;
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (res.ok) {
          return url;
        }
      } catch (e) {
        // Continuar con el siguiente
      }
    }
  }

  return null;
}

function mergeProjectData(metaList, liveList) {
  // Si no hay datos de GitHub, usar solo el JSON
  if (!liveList || !liveList.length) return metaList;

  // Crear un mapa de los datos del JSON por nombre de repo (normalizado con slugify)
  const metaMap = new Map();
  metaList.forEach((meta) => {
    const repoKey = slugify(meta.repo || meta.title || "");
    if (repoKey) metaMap.set(repoKey, meta);
  });

  // Combinar datos: GitHub (dinámico) + JSON (manual)
  const merged = liveList.map((ghRepo) => {
    const repoKey = slugify(ghRepo.repo || ghRepo.title || "");
    const meta = metaMap.get(repoKey);

    if (meta) {
      // Merge: priorizar GitHub para datos dinámicos, JSON para configuración manual
      return {
        ...ghRepo, // Datos de GitHub (descripción, fecha, etc.)
        model: meta.model, // Modelo 3D del JSON (legacy)
        models: meta.models, // Múltiples modelos 3D
        images: meta.images, // Múltiples imágenes
        gallery: meta.gallery, // Galería unificada
        banner: meta.banner, // Banner legacy
        tags: meta.tags || ghRepo.tags || ghRepo.topics || [], // Tags personalizados o topics de GitHub
        links: meta.links, // Enlaces personalizados del JSON
        summary: meta.summary || ghRepo.summary, // Summary personalizado o de GitHub
        description: meta.description || ghRepo.description, // Descripción personalizada o de GitHub
        slug: meta.slug || ghRepo.slug, // Slug personalizado o generado
        pricing: meta.pricing, // Información de precios del JSON
      };
    } else {
      // Si no está en JSON, usar solo datos de GitHub
      return ghRepo;
    }
  });

  // Agregar proyectos que están en JSON pero no en GitHub
  metaList.forEach((meta) => {
    const repoKey = slugify(meta.repo || meta.title || "");
    const existsInMerged = merged.some(
      (m) => slugify(m.repo || m.title || "") === repoKey,
    );
    if (!existsInMerged) {
      merged.push(meta);
    }
  });

  return merged;
}

function pickProject(metaList, slug) {
  if (!slug) return null;
  const lower = slug.toLowerCase();
  return (
    metaList.find((p) => {
      const candidate = slugify(p.slug || p.id || p.title || p.repo || "");
      const repoMatch = String(p.repo || "").toLowerCase();
      return candidate === lower || repoMatch === lower;
    }) || null
  );
}

function renderBanner(meta) {
  const bannerBox = document.getElementById("project-banner");
  if (!bannerBox) return;
  bannerBox.innerHTML = "";

  // Construir array de items de galería
  const allGalleryItems = buildGalleryItems(meta);

  if (allGalleryItems.length === 0) {
    // Sin contenido, mostrar imagen por defecto
    const img = document.createElement("img");
    img.src = resolveAsset(FALLBACK_BANNER);
    img.alt = meta?.title || "Proyecto";
    img.style.maxWidth = "700px";
    img.style.maxHeight = "700px";
    img.style.objectFit = "contain";
    bannerBox.appendChild(img);
    return;
  }

  // Verificar si hay ambos tipos (imágenes y modelos)
  const hasImages = allGalleryItems.some((i) => i.type === "image");
  const hasModels = allGalleryItems.some((i) => i.type === "model");
  const hasBothTypes = hasImages && hasModels;

  // Estado del filtro y color
  let currentFilter = "all"; // "all", "image", "model"
  let modelColor =
    getComputedStyle(document.body).getPropertyValue("--ink").trim() ||
    "#00ff00";
  let filteredItems = allGalleryItems;
  let currentIndex = 0;
  const initializedModels = new Map(); // Map para guardar instancias de modelos
  let isColorMode = false; // Estado persistente del modo color
  const isMobile = window.innerWidth <= 600; // Detectar móvil para estilos responsivos

  // Crear contenedor principal de galería
  const container = document.createElement("div");
  container.style.position = "relative";
  container.style.width = "100%";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.alignItems = "center";

  // Barra de controles (filtros + color)
  const controlsBar = document.createElement("div");
  controlsBar.id = "gallery-controls";
  controlsBar.style.display = "flex";
  controlsBar.style.gap = isMobile ? "6px" : "12px";
  controlsBar.style.marginBottom = "12px";
  controlsBar.style.alignItems = "center";
  controlsBar.style.flexWrap = "wrap";
  controlsBar.style.justifyContent = "center";
  controlsBar.style.position = "relative";
  controlsBar.style.zIndex = "5";

  // Solo mostrar filtros si hay ambos tipos
  if (hasBothTypes) {
    const filterGroup = document.createElement("div");
    filterGroup.style.display = "flex";
    filterGroup.style.gap = "4px";
    filterGroup.style.border = "1px solid var(--rule)";
    filterGroup.style.padding = "2px";

    const filters = [
      { key: "all", label: "TODO" },
      { key: "image", label: "PNG" },
      { key: "model", label: "3D" },
    ];

    filters.forEach((f) => {
      const btn = document.createElement("button");
      btn.className = "toggle";
      btn.style.padding = "4px 10px";
      btn.style.fontSize = "11px";
      btn.style.fontWeight = "bold";
      btn.textContent = f.label;
      btn.dataset.filter = f.key;
      if (f.key === currentFilter) {
        btn.style.background = "var(--ink)";
        btn.style.color = "var(--paper)";
      }
      btn.addEventListener("click", () => {
        currentFilter = f.key;
        applyFilter();
        // Actualizar estilos de botones
        filterGroup.querySelectorAll("button").forEach((b) => {
          if (b.dataset.filter === currentFilter) {
            b.style.background = "var(--ink)";
            b.style.color = "var(--paper)";
          } else {
            b.style.background = "";
            b.style.color = "";
          }
        });
      });
      filterGroup.appendChild(btn);
    });

    controlsBar.appendChild(filterGroup);
  }

  // Botón de color para modelos 3D (solo si hay modelos)
  let colorBtn = null;
  if (hasModels) {
    colorBtn = document.createElement("button");
    colorBtn.className = "toggle";
    colorBtn.style.padding = "4px 10px";
    colorBtn.style.fontSize = "11px";
    colorBtn.style.fontWeight = "bold";
    colorBtn.textContent = "[ color ]";
    colorBtn.setAttribute("aria-pressed", "false");
    colorBtn.setAttribute("aria-label", "Alternar colores");

    colorBtn.addEventListener("click", () => {
      if (typeof toggleAllMonochromeMode === "function") {
        const isMonochrome = toggleAllMonochromeMode();
        isColorMode = !isMonochrome;
        colorBtn.textContent = isMonochrome ? "[ color ]" : "[ monocromo ]";
        colorBtn.setAttribute("aria-pressed", String(!isMonochrome));
      }
    });

    controlsBar.appendChild(colorBtn);
  }

  container.appendChild(controlsBar);

  // Wrapper para el item + flechas de navegación (position: relative para las flechas absolutas)
  const itemWrapper = document.createElement("div");
  itemWrapper.id = "gallery-item-wrapper";
  itemWrapper.style.position = "relative";
  itemWrapper.style.width = "100%";

  // Contenedor del item actual
  const itemContainer = document.createElement("div");
  itemContainer.id = "gallery-item-container";
  itemContainer.style.width = "100%";
  itemContainer.style.minHeight = isMobile ? "300px" : "480px";
  itemContainer.style.display = "flex";
  itemContainer.style.alignItems = "center";
  itemContainer.style.justifyContent = "center";

  // Variables para título e indicadores
  let titleEl = null;
  let indicatorContainer = null;
  let prevBtn = null;
  let nextBtn = null;

  // Función para aplicar filtro
  function applyFilter() {
    if (currentFilter === "all") {
      filteredItems = allGalleryItems;
    } else {
      filteredItems = allGalleryItems.filter((i) => i.type === currentFilter);
    }
    currentIndex = 0;
    rebuildIndicators();
    renderItem(currentIndex);
    updateNavVisibility();
  }

  // Función para actualizar visibilidad de navegación
  function updateNavVisibility() {
    const showNav = filteredItems.length > 1;
    if (prevBtn) prevBtn.style.display = showNav ? "" : "none";
    if (nextBtn) nextBtn.style.display = showNav ? "" : "none";
    if (indicatorContainer)
      indicatorContainer.style.display = showNav ? "flex" : "none";
  }

  // Función para reconstruir indicadores
  function rebuildIndicators() {
    if (!indicatorContainer) return;
    indicatorContainer.innerHTML = "";
    filteredItems.forEach((item, idx) => {
      const dot = document.createElement("button");
      dot.className = "toggle gallery-dot";
      dot.style.width = "12px";
      dot.style.height = "12px";
      dot.style.minWidth = "12px";
      dot.style.minHeight = "12px";
      dot.style.maxWidth = "12px";
      dot.style.maxHeight = "12px";
      dot.style.padding = "0";
      dot.style.borderRadius = "50%";
      dot.style.fontSize = "0";
      dot.style.boxSizing = "border-box";
      dot.style.flexShrink = "0";
      dot.dataset.index = idx;
      dot.setAttribute("aria-label", `Ir a ${item.title || `item ${idx + 1}`}`);
      dot.addEventListener("click", () => {
        currentIndex = idx;
        renderItem(currentIndex);
      });
      indicatorContainer.appendChild(dot);
    });
    updateIndicator(currentIndex);
  }

  // Función para actualizar indicadores
  function updateIndicator(activeIndex) {
    if (!indicatorContainer) return;
    const dots = indicatorContainer.querySelectorAll("button");
    dots.forEach((dot, idx) => {
      if (idx === activeIndex) {
        dot.style.background = "var(--ink)";
      } else {
        dot.style.background = "var(--rule)";
      }
    });
  }

  // Función para renderizar un item
  function renderItem(index) {
    itemContainer.innerHTML = "";
    if (filteredItems.length === 0) {
      itemContainer.innerHTML =
        '<p style="color:var(--muted)">Sin elementos</p>';
      return;
    }
    const item = filteredItems[index];

    if (item.type === "image") {
      const img = document.createElement("img");
      img.src = resolveAsset(item.src);
      img.alt = item.title || meta?.title || "Proyecto";
      img.style.maxWidth = "100%";
      img.style.maxHeight = "480px";
      img.style.width = "auto";
      img.style.height = "auto";
      img.style.objectFit = "contain";
      img.loading = "lazy";
      itemContainer.appendChild(img);
    } else if (item.type === "model") {
      const modelKey = item.src;
      const modelNode = document.createElement("div");
      modelNode.id = `gallery-model-${index}-${Date.now()}`;
      modelNode.className = "ascii-3d-container";
      modelNode.style.width = "100%";
      modelNode.style.maxWidth = "100%";
      modelNode.style.height = "480px";
      itemContainer.appendChild(modelNode);

      // Inicializar modelo 3D
      requestAnimationFrame(() => {
        initModel3D(modelNode, item.src, modelKey);
      });
    }

    // Actualizar título si existe
    if (titleEl) {
      titleEl.textContent =
        item.title || `${index + 1} / ${filteredItems.length}`;
    }

    // Actualizar indicador
    updateIndicator(index);
  }

  // Navegación - responsive para móvil
  prevBtn = document.createElement("button");
  prevBtn.className = "toggle gallery-nav-btn";
  prevBtn.style.position = "absolute";
  prevBtn.style.left = isMobile ? "2px" : "10px";
  prevBtn.style.top = "50%";
  prevBtn.style.transform = "translateY(-50%)";
  prevBtn.style.zIndex = "10";
  prevBtn.style.fontSize = isMobile ? "14px" : "18px";
  prevBtn.style.padding = isMobile ? "6px 8px" : "8px 12px";
  prevBtn.style.opacity = isMobile ? "0.8" : "1";
  prevBtn.textContent = "◀";
  prevBtn.setAttribute("aria-label", "Anterior");
  prevBtn.addEventListener("click", () => {
    currentIndex =
      (currentIndex - 1 + filteredItems.length) % filteredItems.length;
    renderItem(currentIndex);
  });

  nextBtn = document.createElement("button");
  nextBtn.className = "toggle gallery-nav-btn";
  nextBtn.style.position = "absolute";
  nextBtn.style.right = isMobile ? "2px" : "10px";
  nextBtn.style.top = "50%";
  nextBtn.style.transform = "translateY(-50%)";
  nextBtn.style.zIndex = "10";
  nextBtn.style.fontSize = isMobile ? "14px" : "18px";
  nextBtn.style.padding = isMobile ? "6px 8px" : "8px 12px";
  nextBtn.style.opacity = isMobile ? "0.8" : "1";
  nextBtn.textContent = "▶";
  nextBtn.setAttribute("aria-label", "Siguiente");
  nextBtn.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % filteredItems.length;
    renderItem(currentIndex);
  });

  // Agregar flechas al wrapper del item (no al container principal)
  itemWrapper.appendChild(itemContainer);
  itemWrapper.appendChild(prevBtn);
  itemWrapper.appendChild(nextBtn);

  // Agregar wrapper al container principal
  container.appendChild(itemWrapper);

  // Indicador de posición (dots)
  indicatorContainer = document.createElement("div");
  indicatorContainer.id = "gallery-indicators";
  indicatorContainer.style.display = "flex";
  indicatorContainer.style.gap = "8px";
  indicatorContainer.style.marginTop = "12px";
  indicatorContainer.style.justifyContent = "center";
  indicatorContainer.style.flexWrap = "wrap";
  indicatorContainer.style.alignItems = "center";

  // Título del item actual
  titleEl = document.createElement("div");
  titleEl.id = "gallery-title";
  titleEl.style.marginTop = "8px";
  titleEl.style.fontSize = "12px";
  titleEl.style.color = "var(--muted)";
  titleEl.style.textAlign = "center";

  container.appendChild(indicatorContainer);
  container.appendChild(titleEl);

  // Inicializar
  rebuildIndicators();
  renderItem(0);
  updateNavVisibility();

  bannerBox.appendChild(container);

  // Función auxiliar para inicializar modelo 3D con animación tipo videojuego
  function initModel3D(node, modelPath, modelKey) {
    try {
      if (typeof initASCII3DWithModel === "function") {
        initASCII3DWithModel(node.id, resolveAsset(modelPath), {
          rotationSpeed: 0.008,
          fps: 30,
          color: modelColor,
          floatingMode: true, // Animación tipo videojuego: rotación Y + flotación
          monochromeMode: !isColorMode, // Aplicar estado actual de color
        })
          .then((instance) => {
            if (instance) {
              initializedModels.set(modelKey, instance);
              // Aplicar el estado de color actual al nuevo modelo
              if (isColorMode && typeof instance.setMonochromeMode === "function") {
                instance.setMonochromeMode(false);
              }
            }
          })
          .catch((e) => {
            console.warn("3D banner:", e);
            node.innerHTML =
              '<p style="padding:20px;text-align:center;color:var(--muted)">Error cargando modelo 3D</p>';
          });
      } else if (typeof ASCII3DThreeJS !== "undefined") {
        const ascii = new ASCII3DThreeJS(node.id, {
          cellSize: 2,
          fontSize: 3,
          color: modelColor,
          backgroundColor: "transparent",
          chars: [" ", ".", "·", ":", "∙", "•", "o", "O", "0", "●", "█"],
          autoRotate: true,
          rotationSpeed: 0.008,
          fps: 30,
          halftone: true,
          halftoneSize: 2,
          colorReduction: 12,
          floatingMode: true, // Animación tipo videojuego
          monochromeMode: !isColorMode, // Aplicar estado actual de color
        });
        ascii
          .loadModel(resolveAsset(modelPath))
          .then(() => {
            ascii.start();
            initializedModels.set(modelKey, ascii);
            // Aplicar el estado de color actual al nuevo modelo
            if (isColorMode && typeof ascii.setMonochromeMode === "function") {
              ascii.setMonochromeMode(false);
            }
          })
          .catch(() => {});
      } else {
        node.innerHTML =
          '<p style="padding:20px;text-align:center;color:var(--muted)">Cargando modelo 3D...</p>';
      }
    } catch (e) {
      console.warn("3D banner:", e);
      node.innerHTML =
        '<p style="padding:20px;text-align:center;color:var(--muted)">Error cargando modelo 3D</p>';
    }
  }
}

// Construye array de items de galería desde meta
function buildGalleryItems(meta) {
  const items = [];

  // Si tiene galería explícita, usarla
  if (meta?.gallery && Array.isArray(meta.gallery)) {
    meta.gallery.forEach((item) => {
      if (item.type && item.src) {
        items.push({
          type: item.type,
          src: item.src,
          title: item.title || "",
        });
      }
    });
    return items;
  }

  // Compatibilidad: construir desde campos legacy
  // Imágenes
  if (meta?.images && Array.isArray(meta.images)) {
    meta.images.forEach((img, idx) => {
      if (typeof img === "string") {
        items.push({ type: "image", src: img, title: `Imagen ${idx + 1}` });
      } else if (img.src) {
        items.push({
          type: "image",
          src: img.src,
          title: img.title || `Imagen ${idx + 1}`,
        });
      }
    });
  } else if (meta?.bannerUrl || meta?.banner) {
    items.push({
      type: "image",
      src: meta.bannerUrl || meta.banner,
      title: "Vista principal",
    });
  }

  // Modelos 3D
  if (meta?.models && Array.isArray(meta.models)) {
    meta.models.forEach((model, idx) => {
      if (typeof model === "string") {
        items.push({
          type: "model",
          src: model,
          title: `Modelo 3D ${idx + 1}`,
        });
      } else if (model.src) {
        items.push({
          type: "model",
          src: model.src,
          title: model.title || `Modelo 3D ${idx + 1}`,
        });
      }
    });
  } else if (meta?.model) {
    items.push({
      type: "model",
      src: meta.model,
      title: "Modelo 3D",
    });
  }

  return items;
}

function renderTags(tags) {
  const tagContainers = [
    document.getElementById("project-tags"),
    document.getElementById("project-tags-visual"),
  ];

  tagContainers.forEach(($tags) => {
    if (!$tags) return;
    $tags.innerHTML = "";
    (tags || []).forEach((tag) => {
      const span = document.createElement("span");
      span.className = "badge";
      span.textContent = `#${tag}`;
      $tags.appendChild(span);
    });
  });
}

function renderStats(gh, meta) {
  const starsEl = document.getElementById("stat-stars");
  const forksEl = document.getElementById("stat-forks");
  const issuesEl = document.getElementById("stat-issues");
  const updatedEl = document.getElementById("stat-updated");

  if (gh) {
    if (starsEl) starsEl.textContent = gh.stargazers_count ?? "—";
    if (forksEl) forksEl.textContent = gh.forks_count ?? "—";
    if (issuesEl) issuesEl.textContent = gh.open_issues_count ?? "—";
    if (updatedEl) {
      const date = gh.updated_at || meta?.updated;
      if (date) {
        const d = new Date(date);
        updatedEl.textContent = `UPDATED: ${d.toLocaleDateString()}`;
      }
    }
  } else if (meta?.updated) {
    if (starsEl) starsEl.textContent = "—";
    if (forksEl) forksEl.textContent = "—";
    if (issuesEl) issuesEl.textContent = "—";
    if (updatedEl) updatedEl.textContent = `UPDATED: ${meta.updated}`;
  }
}

function renderLinks({ githubUrl, homepage, docs, extraLinks }) {
  const $links = document.getElementById("project-links");
  if (!$links) return;
  $links.innerHTML = "";

  const links = [];
  if (githubUrl)
    links.push({ label: "GitHub", href: githubUrl, external: true });
  if (homepage)
    links.push({ label: "Demo / Homepage", href: homepage, external: true });
  if (docs) links.push({ label: "Docs", href: docs, external: true });
  if (Array.isArray(extraLinks)) links.push(...extraLinks);

  links.forEach((link) => {
    const a = document.createElement("a");
    a.className = "block";
    a.href = link.href;
    a.target = link.external ? "_blank" : "_self";
    a.rel = link.external ? "noopener noreferrer" : "";
    a.textContent = link.label;
    $links.appendChild(a);
  });
}

function renderPricing(pricing) {
  const $window = document.getElementById("pricing-window");
  const $divider = document.getElementById("pricing-divider");
  const $container = document.getElementById("project-pricing");
  const $currency = document.getElementById("pricing-currency");

  if (!$container || !$window || !$divider) return;

  // Si no hay pricing, ocultar la sección
  if (!pricing || !pricing.options || !pricing.options.length) {
    $window.style.display = "none";
    $divider.style.display = "none";
    return;
  }

  // Mostrar la sección
  $window.style.display = "block";
  $divider.style.display = "flex";
  $container.innerHTML = "";

  // Actualizar moneda
  if ($currency && pricing.currency) {
    $currency.textContent = `CURRENCY: ${pricing.currency}`;
  }

  // Crear grid de opciones
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(200px, 1fr))";
  grid.style.gap = "12px";

  pricing.options.forEach((opt) => {
    const card = document.createElement("div");
    card.style.border = "1px solid var(--rule)";
    card.style.padding = "12px";
    card.style.position = "relative";

    // Badge de disponibilidad
    if (!opt.available) {
      card.style.opacity = "0.6";
    }

    // Tipo (DIY, Kit, Assembled)
    const typeLabel = document.createElement("div");
    typeLabel.style.fontSize = "10px";
    typeLabel.style.color = "var(--muted)";
    typeLabel.style.marginBottom = "4px";
    typeLabel.textContent = opt.type ? opt.type.toUpperCase() : "";
    card.appendChild(typeLabel);

    // Nombre de la opción
    const label = document.createElement("div");
    label.style.fontWeight = "bold";
    label.style.marginBottom = "8px";
    label.textContent = opt.label || opt.type;
    card.appendChild(label);

    // Precio
    const priceEl = document.createElement("div");
    priceEl.style.fontSize = "18px";
    priceEl.style.fontWeight = "bold";
    priceEl.style.marginBottom = "8px";
    if (opt.price === 0) {
      priceEl.textContent = "GRATIS";
      priceEl.style.color = "var(--tech-green, #00ff00)";
    } else if (opt.price === null || opt.price === undefined) {
      priceEl.textContent = "TBD";
      priceEl.style.color = "var(--muted)";
    } else {
      priceEl.textContent = `$${opt.price} ${pricing.currency || "MXN"}`;
    }
    card.appendChild(priceEl);

    // Nota
    if (opt.note) {
      const note = document.createElement("div");
      note.style.fontSize = "11px";
      note.style.color = "var(--muted)";
      note.style.lineHeight = "1.4";
      note.textContent = opt.note;
      card.appendChild(note);
    }

    // Badge de estado
    if (!opt.available) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.style.position = "absolute";
      badge.style.top = "8px";
      badge.style.right = "8px";
      badge.style.fontSize = "9px";
      badge.textContent = "SOON";
      card.appendChild(badge);
    }

    grid.appendChild(card);
  });

  $container.appendChild(grid);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderList(list, currentSlug) {
  const $list = document.getElementById("project-list");
  if (!$list) return;
  $list.innerHTML = "";
  if (!list.length) {
    $list.innerHTML = '<div class="card">Sin proyectos configurados aún.</div>';
    return;
  }
  const filtered = shuffle(
    list.filter((p) => {
      const slug = slugify(p.slug || p.repo || p.title || "");
      return !currentSlug || slug !== currentSlug;
    }),
  );

  filtered.slice(0, MAX_OTHERS).forEach((p, idx) => {
    const card = document.createElement("a");
    card.className = "card card-link";
    card.href = `?repo=${encodeURIComponent(slugify(p.slug || p.repo || p.title || `p-${idx}`))}`;
    card.innerHTML = `
      <div class="dotfill"><span>${esc(p.title || "Proyecto")}</span></div>
      <p class="desc" data-fallback style="margin:10px 0 8px;">${esc(clampText(p.summary || p.description || "", 180))}</p>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted)">
        <span>${p.updated || "—"}</span>
        <span>[ abrir ]</span>
      </div>
    `;
    if (!supportsLineClamp) {
      const d = card.querySelector("[data-fallback]");
      d.textContent = clampText(p.summary || p.description || "", 180);
    }
    $list.appendChild(card);
  });
}

function renderProject(meta, gh, descriptionText) {
  const name = meta?.title || gh?.name || "Proyecto";
  const summary = meta?.summary || gh?.description || "Descripción próxima.";
  const description =
    descriptionText ||
    meta?.description ||
    gh?.description ||
    "Descripción pendiente.";
  const lang = gh?.language || meta?.language || "Repo";
  const updated = gh?.pushed_at
    ? new Date(gh.pushed_at).toISOString().slice(0, 10)
    : meta?.updated || "—";

  const titleEl = document.getElementById("project-title");
  if (titleEl) {
    titleEl.textContent = name;
    titleEl.dataset.glitch = name;
  }
  const kicker = document.getElementById("project-kicker");
  if (kicker) {
    kicker.textContent = meta?.kicker || "Ficha de proyecto";
  }
  document.title = `${name} — GLITCHBOI`;

  const dateEl = document.getElementById("project-date");
  if (dateEl) dateEl.textContent = updated;
  const langEl = document.getElementById("project-language");
  if (langEl) langEl.textContent = lang;
  const sumEl = document.getElementById("project-summary");
  if (sumEl) sumEl.textContent = summary;

  const bodyEl = document.getElementById("project-description");
  if (bodyEl) {
    // Render markdown description
    bodyEl.innerHTML = parseMarkdown(description);
  }

  renderBanner(meta || {});
  renderTags(meta?.tags || gh?.topics || []);
  renderStats(gh, meta);
  renderLinks({
    githubUrl: gh?.html_url || meta?.github,
    homepage: gh?.homepage || meta?.homepage,
    docs: meta?.docs,
    extraLinks: meta?.links,
  });
  renderPricing(meta?.pricing);
}

(async function initProjectPage() {
  const slug = parseRepoParam();
  const [metaList, liveList] = await Promise.all([
    loadProjectsMeta(),
    fetchReposList(),
  ]);

  // Combinar datos de JSON y GitHub
  const mergedList = mergeProjectData(metaList, liveList);
  const meta = slug ? pickProject(mergedList, slug) : null;

  let gh = null;
  let readmeDescription = null;
  let bannerUrl = null;

  const repoNameForGitHub = meta?.repo || meta?.title || slug;

  if (repoNameForGitHub) {
    try {
      gh = await fetchRepoInfo(repoNameForGitHub);
      const md = await fetchReadme(repoNameForGitHub);
      readmeDescription = extractDescription(md);

      // Obtener imagen del README o banner de Glitchboi
      bannerUrl = extractImageFromReadme(md, repoNameForGitHub);
      if (!bannerUrl) {
        bannerUrl = await findGlitchboiBanner(repoNameForGitHub);
      }

      // Si se encontró una imagen, agregarla al objeto meta
      if (bannerUrl && meta) {
        meta.bannerUrl = bannerUrl;
      } else if (bannerUrl && !meta) {
        // Si no hay meta pero hay banner, crear un objeto meta básico
        const tempMeta = {
          bannerUrl: bannerUrl,
          repo: repoNameForGitHub,
          title: gh?.name || repoNameForGitHub,
        };
        // Render con meta temporal
        renderProject(tempMeta, gh, readmeDescription);
        renderList(mergedList, slug);
        return;
      }
    } catch (e) {
      console.warn("GitHub:", e);
    }
  }

  // Render primary project or fallback
  if (meta || gh) {
    renderProject(meta, gh, readmeDescription);
  } else {
    const bodyEl = document.getElementById("project-description");
    if (bodyEl)
      bodyEl.textContent = "Selecciona un proyecto de la lista inferior.";
  }

  // Lista inferior con datos combinados
  renderList(mergedList, slug);
})();
