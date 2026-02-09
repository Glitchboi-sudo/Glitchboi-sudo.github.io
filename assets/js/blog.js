/* Tema rápido para página de blog completo */
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

const BLOG_DATA_URL = "../assets/data/blog.json";
const supportsLineClamp =
  typeof CSS !== "undefined" &&
  (CSS.supports?.("-webkit-line-clamp", "3") ||
    CSS.supports?.("line-clamp", "3"));

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
function resolveLink(raw) {
  if (!raw) return "";
  const url = String(raw).trim();
  if (!url) return "";
  if (
    /^https?:\/\//i.test(url) ||
    url.startsWith("mailto:") ||
    url.startsWith("/")
  )
    return url;
  // Las rutas en blog.json son relativas a la raíz (ej. posts/...), agregamos ../
  return `../${url}`;
}
function clampText(str, max = 200) {
  if (!str) return "\u2014";
  const s = String(str).trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + "\u2026";
}
function fmtDate(s) {
  try {
    return new Date(s + "T12:00:00").toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return s;
  }
}

async function fetchBlogPosts() {
  const res = await fetch(BLOG_DATA_URL, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("No se pudo leer blog.json");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function renderAll(items) {
  const $list = document.getElementById("blog-list");
  if (!$list) return;
  $list.innerHTML = "";
  const sorted = (items || []).sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  if (!sorted.length) {
    $list.innerHTML = '<div class="card">Sin entradas aún.</div>';
    return;
  }
  sorted.forEach((post) => {
    const date = post.date || new Date().toISOString().slice(0, 10);
    const title = post.title || "Actualización";
    const excerpt = post.excerpt || "";
    const link = resolveLink(post.link);
    const wrapper = link
      ? document.createElement("a")
      : document.createElement("article");
    wrapper.className = "card" + (link ? " card-link" : "");
    if (link) {
      wrapper.href = link;
      wrapper.target = link.startsWith("http") ? "_blank" : "_self";
      wrapper.rel = link.startsWith("http") ? "noopener noreferrer" : "";
    }
    wrapper.innerHTML = `
      <div class="dotfill"><span>${fmtDate(date)}</span><i>...</i><span>${esc(title)}</span></div>
      <p class="desc" data-fallback style="margin:10px 0 12px;">${esc(clampText(excerpt, 200))}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--muted)">
        <span>${link ? `Abrir` : "&mdash;"}</span>
        <span>[ entrada ]</span>
      </div>
    `;
    if (!supportsLineClamp) {
      const d = wrapper.querySelector("[data-fallback]");
      d.textContent = clampText(excerpt, 200);
    }
    $list.appendChild(wrapper);
  });
}

(async function initBlogPage() {
  try {
    const posts = await fetchBlogPosts();
    renderAll(posts);
  } catch (e) {
    console.error("Blog:", e);
    renderAll([]);
  }
})();
