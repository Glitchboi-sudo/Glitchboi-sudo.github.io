/* ===== THEME TOGGLE ===== */
(function () {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark")
      document.documentElement.setAttribute("data-theme", saved);
  } catch (e) {}
})();
const btn = document.getElementById("themeBtn");
function getTheme() {
  const t = document.documentElement.getAttribute("data-theme");
  if (t) return t;
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
function setTheme(m) {
  document.documentElement.setAttribute("data-theme", m);
  try {
    localStorage.setItem("theme", m);
  } catch (e) {}
  const d = m === "dark";
  btn.setAttribute("aria-pressed", String(d));
  btn.textContent = d ? "[ Light ]" : "[ Dark ]";
}
btn.addEventListener("click", () =>
  setTheme(getTheme() === "dark" ? "light" : "dark"),
);
setTheme(getTheme());
document.getElementById("y").textContent = new Date().getFullYear();

/* ===== LANGUAGE (auto + toggle for dates/UI + content) ===== */
function detectLang() {
  try {
    const s = localStorage.getItem("lang");
    if (s) return s;
  } catch (e) {}
  const n = (navigator.language || "").toLowerCase();
  return n.startsWith("es") ? "es" : "en";
}
let CUR_LANG = detectLang();
document.documentElement.setAttribute("lang", CUR_LANG);
try {
  localStorage.setItem("lang", CUR_LANG);
} catch (e) {}
function ensureLangToggle() {
  if (document.getElementById("langBtn")) return;
  const themeBtn = document.getElementById("themeBtn");
  if (!themeBtn) return;
  const b = document.createElement("button");
  b.id = "langBtn";
  b.className = "toggle";
  b.type = "button";
  b.style.marginLeft = "8px";
  b.textContent = CUR_LANG === "es" ? "[ EN ]" : "[ ES ]";
  b.addEventListener("click", () => {
    CUR_LANG = CUR_LANG === "es" ? "en" : "es";
    document.documentElement.setAttribute("lang", CUR_LANG);
    try {
      localStorage.setItem("lang", CUR_LANG);
    } catch (e) {}
    b.textContent = CUR_LANG === "es" ? "[ EN ]" : "[ ES ]";
    try {
      applyTranslations();
    } catch (e) {}
    try {
      applyLangVisibility();
    } catch (e) {}
    try {
      updateTitleAndMeta();
    } catch (e) {}
    refreshLocale();
  });
  themeBtn.parentNode.insertBefore(b, themeBtn.nextSibling);
  const back = document.getElementById("backBtn");
  if (back) {
    b.parentNode.insertBefore(back, b.nextSibling);
  }
}
ensureLangToggle();
function currentLocale() {
  return CUR_LANG === "es" ? "es-MX" : "en-US";
}
function refreshLocale() {
  // Re-render dates in blog with the selected locale
  const $b = document.getElementById("blog");
  if (!$b) return;
  $b.querySelectorAll(".dotfill span:first-child").forEach((span) => {
    // try to parse back from displayed text by using datetime from sibling hr? Fallback: skip
  });
}

// ===== I18N dictionary and helpers =====
const I18N = {
  es: {
    // Hero
    hero_title: "Hardware de México para el mundo",
    kicker: "Glitch Hardware — Ingeniería embebida & IoT",

    // Expertise section
    expertise: "Especialidades",
    exp_hardware: "Ingeniería de Hardware Abierto",
    exp_hardware_desc: "Diseño y distribución para análisis",
    exp_pentest: "Pentesting & Vulnerability Research",
    exp_pentest_desc: "Identificación de debilidades",
    exp_firmware: "Desarrollo de Firmware",
    exp_firmware_desc: "C / Python / RP2040",
    exp_education: "Educación en Ciberseguridad",
    exp_education_desc: "Formación práctica",

    // Spec sheet labels
    domain_label: "DOMINIO",
    domain_value: "Hardware Abierto",
    focus_label: "ENFOQUE",
    focus_value: "Pentesting",
    stack_label: "STACK",
    stack_value: "IoT / Embebidos",
    license_label: "LICENCIA",
    license_value: "Open Source",
    modules_count: "MÓDULOS: 4",
    status_active: "ESTADO: ACTIVO",

    // Communications
    email_label: "CORREO",
    protocol_label: "PROTOCOLO",
    response_label: "RESPUESTA",
    signal_label: "SEÑAL",
    encryption_info: "CIFRADO: AES-256",
    port_info: "PUERTO: 443",

    // Philosophy
    philosophy_1: "Romper es la mejor forma de fortalecer",
    philosophy_2: "100% Open Source",
    philosophy_3: "Hecho en México para el mundo",
    philosophy_4: "Hardware + Software = Freedom",
    principles_count: "PRINCIPIOS: 4",
    version_stable: "VERSIÓN: ESTABLE",

    // Projects
    projects_title: "Proyectos",
    repos_loading: "REPOS: CARGANDO...",
    api_github: "API: GITHUB",

    // Blog
    blog_updates: "Blog / Actualizaciones",
    entries_loading: "ENTRADAS: CARGANDO...",
    feed_rss: "FEED: RSS",
    view: "ver",
    view_more: "Ver más",
    update: "Actualización",
    no_repos: "Sin repos visibles. Revisa GH_USER o haz público algún repo.",
    activity: "actividad",

    // Footer
    copyright_label: "DERECHOS",
    status_label: "ESTADO",
    status_online: "■ EN LÍNEA",
    location_label: "UBICACIÓN",
    end_transmission: "FIN DE TRANSMISIÓN",

    // System status bar
    sys_operational: "SIS: OPERATIVO",
    node_mx: "NODO: MX-GLITCH-01",
    protocol_https: "PROTOCOLO: HTTPS/2",
    build_version: "BUILD: v3.1.4",

    // Theme/Lang
    theme_dark: "[ modo nocturno ]",
    theme_light: "[ modo claro ]",
    lang_btn: "[ EN ]",
    contact: "Contacto",
  },
  en: {
    // Hero
    hero_title: "Hardware from Mexico to the world",
    kicker: "Glitch Hardware — Embedded engineering & IoT",

    // Expertise section
    expertise: "Expertise",
    exp_hardware: "Open Hardware Engineering",
    exp_hardware_desc: "Design and distribution for analysis",
    exp_pentest: "Pentesting & Vulnerability Research",
    exp_pentest_desc: "Identifying weaknesses",
    exp_firmware: "Firmware Development",
    exp_firmware_desc: "C / Python / RP2040",
    exp_education: "Cybersecurity Education",
    exp_education_desc: "Practical training",

    // Spec sheet labels
    domain_label: "DOMAIN",
    domain_value: "Open Hardware",
    focus_label: "FOCUS",
    focus_value: "Pentesting",
    stack_label: "STACK",
    stack_value: "IoT / Embedded",
    license_label: "LICENSE",
    license_value: "Open Source",
    modules_count: "MODULES: 4",
    status_active: "STATUS: ACTIVE",

    // Communications
    email_label: "EMAIL",
    protocol_label: "PROTOCOL",
    response_label: "RESPONSE",
    signal_label: "SIGNAL",
    encryption_info: "ENCRYPTION: AES-256",
    port_info: "PORT: 443",

    // Philosophy
    philosophy_1: "Breaking is the best way to strengthen",
    philosophy_2: "100% Open Source",
    philosophy_3: "Made in Mexico for the world",
    philosophy_4: "Hardware + Software = Freedom",
    principles_count: "PRINCIPLES: 4",
    version_stable: "VERSION: STABLE",

    // Projects
    projects_title: "Projects",
    repos_loading: "REPOS: LOADING...",
    api_github: "API: GITHUB",

    // Blog
    blog_updates: "Blog / Updates",
    entries_loading: "ENTRIES: LOADING...",
    feed_rss: "FEED: RSS",
    view: "view",
    view_more: "View more",
    update: "Update",
    no_repos: "No visible repos. Check GH_USER or make one public.",
    activity: "activity",

    // Footer
    copyright_label: "COPYRIGHT",
    status_label: "STATUS",
    status_online: "■ ONLINE",
    location_label: "LOCATION",
    end_transmission: "END OF TRANSMISSION",

    // System status bar
    sys_operational: "SYS: OPERATIONAL",
    node_mx: "NODE: MX-GLITCH-01",
    protocol_https: "PROTOCOL: HTTPS/2",
    build_version: "BUILD: v3.1.4",

    // Theme/Lang
    theme_dark: "[ dark mode ]",
    theme_light: "[ light mode ]",
    lang_btn: "[ ES ]",
    contact: "Contact",
  },
};
function t(k) {
  try {
    return (I18N[CUR_LANG] && I18N[CUR_LANG][k]) || I18N.es[k] || k;
  } catch (e) {
    return k;
  }
}
function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const val = t(key);
    if (!val) return;
    if (el.classList.contains("title")) {
      el.dataset.glitch = val;
      el.textContent = val;
    } else {
      el.textContent = val;
    }
  });
  const theme = document.getElementById("themeBtn");
  if (theme) {
    const isDark = getTheme() === "dark";
    theme.textContent = isDark ? t("theme_light") : t("theme_dark");
  }
  const lang = document.getElementById("langBtn");
  if (lang) {
    lang.textContent = t("lang_btn");
  }
}

// Toggle [data-lang] content visibility and sync <title>/meta description
function applyLangVisibility() {
  const els = document.querySelectorAll("[data-lang]");
  els.forEach((el) => {
    const show =
      (el.getAttribute("data-lang") || "").toLowerCase() === CUR_LANG;
    el.style.display = show ? "" : "none";
    el.setAttribute("aria-hidden", show ? "false" : "true");
  });
}

function updateTitleAndMeta() {
  // Prefer <title data-title-es/en> if present
  const titleEl = document.querySelector("head > title");
  if (titleEl) {
    const data = titleEl.dataset || {};
    let es = data.titleEs,
      en = data.titleEn;
    if (!es || !en) {
      // Fallback: read from .title[data-lang]
      const tEs = document.querySelector('.title[data-lang="es"]');
      const tEn = document.querySelector('.title[data-lang="en"]');
      es = es || (tEs ? tEs.textContent.trim() : titleEl.textContent.trim());
      en = en || (tEn ? tEn.textContent.trim() : es);
    }
    const base = CUR_LANG === "es" ? es : en || es;
    if (base) titleEl.textContent = base;
  }
  // Single meta[name=description] with data-desc-es/en
  const desc = document.querySelector('meta[name="description"]');
  if (desc) {
    const es = desc.dataset.descEs || desc.getAttribute("content") || "";
    const en = desc.dataset.descEn || es;
    desc.setAttribute("content", CUR_LANG === "es" ? es : en);
  }
}

/* ===== BLOG (CMS PLANO) ===== */
const BLOG_DATA_URL = "assets/data/blog.json";

async function fetchBlogPosts() {
  const res = await fetch(BLOG_DATA_URL, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("No se pudo leer blog.json");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function renderBlog(items) {
  const $b = document.getElementById("blog");
  if (!$b) return;
  $b.innerHTML = "";
  const sorted = (items || []).sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  const latest = sorted.slice(0, 4);
  latest.forEach((x) => {
    const date = x.date || new Date().toISOString().slice(0, 10);
    const title = x.title || t("update");
    const excerpt = clampText(x.excerpt || "", 160);
    const link = x.link && String(x.link).trim();
    const right = link ? `<a href="${escAttr(link)}">${t("view")}</a>` : "";
    const row = document.createElement("div");
    row.style.marginBottom = "10px";
    row.innerHTML = `<div class="dotfill"><span>${fmtDate(date)}</span><i>...</i><span>${esc(title)}</span></div><div style="color:var(--muted);font-size:12px;margin-top:2px;display:flex;justify-content:space-between;gap:8px"><span>${esc(excerpt)}</span><span>${right}</span></div><hr class="rule">`;
    $b.appendChild(row);
  });
  if (sorted.length > latest.length) {
    const more = document.createElement("div");
    const url = BLOG_BASE.endsWith("/") ? BLOG_BASE : BLOG_BASE + "/";
    more.style.marginTop = "6px";
    more.innerHTML = `<a href="${escAttr(url)}" style="display:inline-flex;align-items:center;gap:6px;font-weight:700">${t("view_more")} →</a>`;
    $b.appendChild(more);
  }
}

/* ===== PROYECTOS DESDE GITHUB (SIN TOKENS) ===== */
const GH_USER = "Glitchboi-sudo";
const MAX_REPOS = 6;
const EXCLUDED_REPOS = new Set(["Glitchboi-sudo", "Glitchboi-sudo.github.io"]);
function slugifyRepo(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchRepos(user) {
  const url = `https://api.github.com/users/${encodeURIComponent(user)}/repos?sort=updated&per_page=50`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error("GitHub API error");
  const data = await res.json();
  const list = data
    .filter((r) => !r.fork && !r.archived)
    .filter((r) => !EXCLUDED_REPOS.has(r.name))
    .sort(
      (a, b) =>
        (b.stargazers_count || 0) - (a.stargazers_count || 0) ||
        new Date(b.pushed_at) - new Date(a.pushed_at),
    )
    .slice(0, MAX_REPOS)
    .map((r) => ({
      slug: slugifyRepo(r.name),
      title: r.name,
      meta: r.language || "Repo",
      note: r.description || "\u2014",
      detailUrl: projectDetailLink(r.name),
      githubUrl: r.html_url,
      homepage: r.homepage && r.homepage.trim() ? r.homepage : "",
      url: r.html_url,
      progress: activityPercent(r.pushed_at),
    }));
  return list;
}
function activityPercent(pushed) {
  const days = (Date.now() - new Date(pushed)) / 86400000;
  const pct = Math.round(100 - (Math.min(days, 180) / 180) * 100); // 0% si >180 días
  return Math.max(0, Math.min(100, pct));
}
// === Config: a dónde quieres mandar a la gente ===
const BLOG_BASE = "blog/"; // e.g. 'blog/' o '/blog/' según tu estructura

function blogLinkFor(repoName) {
  // pásalo como query para que luego puedas filtrar o resaltar en tu blog
  return `${BLOG_BASE}?from=projects&repo=${encodeURIComponent(repoName)}`;
}
function projectDetailLink(repoName) {
  return `projects/?repo=${encodeURIComponent(slugifyRepo(repoName))}`;
}

// Fallback si el navegador no soporta line-clamp
const supportsLineClamp =
  CSS &&
  (CSS.supports?.("-webkit-line-clamp", "3") ||
    CSS.supports?.("line-clamp", "3"));

// Trunca por caracteres evitando cortar palabras (fallback JS)
function clampText(str, max = 120) {
  if (!str) return "\u2014";
  const s = String(str).trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + "\u2026";
}

function renderProjects(items) {
  const $p = document.getElementById("projects");
  $p.innerHTML = "";

  if (!items.length) {
    $p.innerHTML = `<div class="card">${t("no_repos")}</div>`;
    return;
  }

  items.forEach((p, index) => {
    const el = document.createElement("article");
    el.className = "card";
    el.setAttribute("data-animate", "slide-up");
    el.setAttribute("data-delay", (index * 100).toString());
    el.setAttribute("data-hover-glow", "");

    const safeTitle = esc(p.title);
    const safeMeta = esc(p.meta);
    const safeNote = esc(p.note || "\u2014");

    const detailHref = p.detailUrl || projectDetailLink(p.title);
    const githubHref = p.githubUrl || p.url;

    el.innerHTML = `
      <div class="dotfill">
        <span><a href="${escAttr(detailHref)}">${safeTitle}</a></span>
        <i></i>
        <span>${safeMeta}</span>
      </div>

      <div class="progress" aria-label="${t("activity")} ${safeTitle}">
        <i style="--w:${p.progress}%"></i>
      </div>

      <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:6px;gap:8px">
        <span>[ ${p.progress}% ${t("activity")} ]</span>
        <span style="display:flex;gap:8px;align-items:center">
          <a href="${escAttr(detailHref)}">${t("view")}</a>
          ${githubHref ? `<a href="${escAttr(githubHref)}" target="_blank" rel="noopener noreferrer">GitHub</a>` : ""}
        </span>
      </div>

      <div class="desc" data-fallback>${safeNote}</div>
    `;

    if (!supportsLineClamp) {
      const d = el.querySelector("[data-fallback]");
      d.textContent = clampText(p.note, 140);
    }

    $p.appendChild(el);

    // Observar elemento para animación
    if (window.smoothTransitions) {
      window.smoothTransitions.observe(el);
    }

    // Agregar separador después de cada proyecto (excepto el último)
    if (index < items.length - 1) {
      const separator = document.createElement("div");
      separator.style.cssText = `
        text-align: center;
        margin: 20px 0;
        opacity: 0.4;
      `;
      separator.innerHTML = `
        <div style="font-size: 8px; color: var(--muted); letter-spacing: 0.2em;">
          - - - - -
        </div>
      `;
      $p.appendChild(separator);
    }
  });
}

/* ===== UTILS ===== */
function esc(s) {
  return String(s).replace(
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
  return String(s).replace(/\"/g, "&quot;");
}
function fmtDate(s) {
  try {
    return new Date(s + "T12:00:00").toLocaleDateString(currentLocale(), {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return s;
  }
}

(async function initProjects() {
  try {
    const repos = await fetchRepos(GH_USER);
    renderProjects(repos);
  } catch (e) {
    console.error("GitHub API:", e);
    renderProjects([
      {
        title: "Demo 1",
        meta: "Repo",
        note: "Ejemplo local",
        url: "#",
        progress: 70,
      },
      {
        title: "Demo 2",
        meta: "Repo",
        note: "Ejemplo local",
        url: "#",
        progress: 45,
      },
    ]);
  }
})();

(async function initBlog() {
  try {
    const posts = await fetchBlogPosts();
    renderBlog(posts);
  } catch (e) {
    console.warn("Blog CMS:", e);
    renderBlog([]);
  }
})();

// Apply translations and language visibility on load and after theme toggle
try {
  applyTranslations();
} catch (e) {}
try {
  applyLangVisibility();
} catch (e) {}
try {
  updateTitleAndMeta();
} catch (e) {}
document.getElementById("themeBtn")?.addEventListener("click", () => {
  try {
    applyTranslations();
  } catch (e) {}
});
