// Tema ligero para la página de proyectos (mismo comportamiento que el blog)
document.body.classList.add('page-loaded'); // evita que la opacidad inicial deje la página invisible

(function setupTheme(){
  const btn = document.getElementById('themeBtn');
  const prefers = ()=> (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  const saved = ()=>{ try{ const v=localStorage.getItem('theme'); return (v==='light'||v==='dark') ? v : null; }catch(e){ return null; } };
  function current(){ return document.documentElement.getAttribute('data-theme') || saved() || prefers(); }
  function apply(mode){
    document.documentElement.setAttribute('data-theme', mode);
    try{ localStorage.setItem('theme', mode); }catch(e){}
    if(btn){
      const isDark = mode==='dark';
      btn.setAttribute('aria-pressed', String(isDark));
      btn.textContent = isDark ? '[ Light ]' : '[ Dark ]';
    }
  }
  apply(current());
  btn?.addEventListener('click', ()=>apply(current()==='dark'?'light':'dark'));
})();
const y = document.getElementById('y'); if(y) y.textContent = new Date().getFullYear();

const GH_USER = 'Glitchboi-sudo';
const PROJECTS_DATA_URL = '../assets/data/projects.json';
const FALLBACK_BANNER = '../assets/images/1.jpeg';
const MAX_OTHERS = 2;
const EXCLUDED_REPOS = new Set(['glitchboi-sudo.github.io','glitchboi-sudo']);
const isExcludedRepo = (name)=> EXCLUDED_REPOS.has(String(name||'').toLowerCase());

const supportsLineClamp = typeof CSS !== 'undefined' && (
  CSS.supports?.('-webkit-line-clamp','3') || CSS.supports?.('line-clamp','3')
);

function esc(s){ return String(s ?? '').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\'':'&#39;'}[m])) }
function escAttr(s){ return String(s ?? '').replace(/\"/g,'&quot;') }
function slugify(str){ return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
function resolveAsset(path){
  if(!path) return '';
  const url = String(path);
  if(/^https?:\/\//i.test(url) || url.startsWith('/')) return url;
  if(url.startsWith('../')) return url;
  return `../${url}`;
}

function clampText(str, max=240){
  if(!str) return '\u2014';
  const s = String(str).trim();
  if(s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + '\u2026';
}

function parseRepoParam(){
  const params = new URLSearchParams(location.search);
  const repo = params.get('repo') || params.get('id') || params.get('project');
  return repo ? slugify(repo) : null;
}

async function loadProjectsMeta(){
  try{
    const res = await fetch(PROJECTS_DATA_URL, { headers:{ 'Accept':'application/json' }});
    if(!res.ok) throw new Error('No se pudo leer projects.json');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }catch(e){
    console.warn('Projects meta:', e);
    return [];
  }
}

async function fetchReposList(){
  try{
    const res = await fetch(`https://api.github.com/users/${GH_USER}/repos?sort=updated&per_page=50`, { headers:{ 'Accept':'application/vnd.github+json' }});
    if(!res.ok) throw new Error('GitHub API');
    const data = await res.json();
    return data
      .filter(r=>!r.fork && !r.archived && !isExcludedRepo(r.name))
      .map(r=>({
        repo: r.name,
        title: r.name,
        summary: r.description || '',
        description: r.description || '',
        updated: r.pushed_at ? r.pushed_at.slice(0,10) : '',
        language: r.language,
        homepage: r.homepage,
        github: r.html_url,
        topics: r.topics || [],
        slug: slugify(r.name)
      }));
  }catch(e){
    console.warn('GitHub list:', e);
    return [];
  }
}

async function fetchRepoInfo(repoName){
  if(!repoName) throw new Error('repoName requerido');
  const res = await fetch(`https://api.github.com/repos/${GH_USER}/${repoName}`);
  if(!res.ok) throw new Error('GitHub API');
  return await res.json();
}

async function fetchReadme(repoName){
  if(!repoName) return null;
  const branches = ['main','master'];
  for(const branch of branches){
    const url = `https://raw.githubusercontent.com/${GH_USER}/${repoName}/${branch}/README.md`;
    try{
      const res = await fetch(url, { headers:{ 'Accept':'text/plain' }});
      if(res.ok){
        return await res.text();
      }
    }catch(e){ /* continua con la siguiente rama */ }
  }
  return null;
}

function extractDescription(md){
  if(!md) return null;
  const lines = md.split(/\r?\n/);
  const startIdx = lines.findIndex(l => /^##\s+(descripci[oó]n|description)\s*$/i.test(l.trim()));
  if(startIdx === -1) return null;
  const body = [];
  for(let i=startIdx+1;i<lines.length;i++){
    const line = lines[i];
    if(/^#{1,2}\s+/.test(line.trim())) break; // siguiente heading
    body.push(line);
  }
  const text = body.join('\n').trim();
  if(!text) return null;
  return text;
}

function pickProject(metaList, slug){
  if(!slug) return null;
  const lower = slug.toLowerCase();
  return metaList.find(p=>{
    const candidate = slugify(p.slug || p.id || p.title || p.repo || '');
    const repoMatch = String(p.repo || '').toLowerCase();
    return candidate === lower || repoMatch === lower;
  }) || null;
}

function renderBanner(meta){
  const bannerBox = document.getElementById('project-banner');
  if(!bannerBox) return;
  bannerBox.innerHTML = '';

  if(meta?.model){
    const id = 'project-banner-3d';
    const node = document.createElement('div');
    node.id = id;
    node.className = 'ascii-3d-container';
    node.style.height = '320px';
    bannerBox.appendChild(node);

    try{
      // Usar configuración compartida con efecto halftone bitmap
      if(typeof initASCII3DWithModel === 'function'){
        // Versión con configuración nueva (halftone bitmap)
        initASCII3DWithModel(id, resolveAsset(meta.model), {
          rotationSpeed: 0.004,
          fps: 24
        }).catch((e)=>{
          console.warn('3D banner:', e);
          renderImageBanner(meta.banner || FALLBACK_BANNER);
        });
      }else{
        // Fallback si no está cargado ascii-3d-init.js
        console.warn('ascii-3d-init.js no cargado, usando configuración básica');
        const ascii = new ASCII3DThreeJS(id, {
          cellSize: 2,
          fontSize: 3,
          color: getComputedStyle(document.body).getPropertyValue('--ink').trim() || '#0b0b0b',
          backgroundColor: 'transparent',
          chars: [' ', '.', '·', ':', '∙', '•', 'o', 'O', '0', '●', '█'],
          autoRotate: true,
          rotationSpeed: 0.004,
          fps: 24,
          halftone: true,
          halftoneSize: 2,
          colorReduction: 12
        });
        ascii.loadModel(resolveAsset(meta.model)).then(()=>ascii.start()).catch(()=>{});
      }
    }catch(e){
      console.warn('3D banner:', e);
      renderImageBanner(meta.banner || FALLBACK_BANNER);
    }
  }else{
    renderImageBanner(meta?.banner || FALLBACK_BANNER);
  }

  function renderImageBanner(src){
    const img = document.createElement('img');
    img.src = resolveAsset(src);
    img.alt = meta?.title || 'Proyecto';
    img.style.width = '100%';
    img.style.height = 'auto';
    img.loading = 'lazy';
    bannerBox.appendChild(img);
  }
}

function renderTags(tags){
  const $tags = document.getElementById('project-tags');
  if(!$tags) return;
  $tags.innerHTML = '';
  (tags || []).forEach(tag=>{
    const span = document.createElement('span');
    span.className = 'badge';
    span.textContent = `#${tag}`;
    $tags.appendChild(span);
  });
}

function renderLinks({ githubUrl, homepage, docs, extraLinks }){
  const $links = document.getElementById('project-links');
  if(!$links) return;
  $links.innerHTML = '';

  const links = [];
  if(githubUrl) links.push({ label:'GitHub', href: githubUrl, external:true });
  if(homepage) links.push({ label:'Demo / Homepage', href: homepage, external:true });
  if(docs) links.push({ label:'Docs', href: docs, external:true });
  if(Array.isArray(extraLinks)) links.push(...extraLinks);

  links.forEach(link=>{
    const a = document.createElement('a');
    a.className = 'block';
    a.href = link.href;
    a.target = link.external ? '_blank' : '_self';
    a.rel = link.external ? 'noopener noreferrer' : '';
    a.textContent = link.label;
    $links.appendChild(a);
  });
}

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function renderList(list, currentSlug){
  const $list = document.getElementById('project-list');
  if(!$list) return;
  $list.innerHTML = '';
  if(!list.length){
    $list.innerHTML = '<div class="card">Sin proyectos configurados aún.</div>';
    return;
  }
  const filtered = shuffle(list.filter(p=>{
    const slug = slugify(p.slug || p.repo || p.title || '');
    return !currentSlug || slug !== currentSlug;
  }));

  filtered.slice(0,MAX_OTHERS).forEach((p, idx)=>{
    const card = document.createElement('a');
    card.className = 'card card-link';
    card.href = `?repo=${encodeURIComponent(slugify(p.slug || p.repo || p.title || `p-${idx}`))}`;
    card.innerHTML = `
      <div class="dotfill"><span>${esc(p.title || 'Proyecto')}</span></div>
      <p class="desc" data-fallback style="margin:10px 0 8px;">${esc(clampText(p.summary || p.description || '', 180))}</p>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted)">
        <span>${p.updated || '—'}</span>
        <span>[ abrir ]</span>
      </div>
    `;
    if(!supportsLineClamp){
      const d = card.querySelector('[data-fallback]');
      d.textContent = clampText(p.summary || p.description || '', 180);
    }
    $list.appendChild(card);
  });
}

function renderProject(meta, gh, descriptionText){
  const name = meta?.title || gh?.name || 'Proyecto';
  const summary = meta?.summary || gh?.description || 'Descripción próxima.';
  const description = descriptionText || meta?.description || gh?.description || 'Descripción pendiente.';
  const lang = gh?.language || meta?.language || 'Repo';
  const updated = gh?.pushed_at ? new Date(gh.pushed_at).toISOString().slice(0,10) : (meta?.updated || '—');

  const titleEl = document.getElementById('project-title');
  if(titleEl){ titleEl.textContent = name; titleEl.dataset.glitch = name; }
  const kicker = document.getElementById('project-kicker');
  if(kicker){ kicker.textContent = meta?.kicker || 'Ficha de proyecto'; }
  document.title = `${name} — GLITCHBOI`;

  const dateEl = document.getElementById('project-date'); if(dateEl) dateEl.textContent = updated;
  const langEl = document.getElementById('project-language'); if(langEl) langEl.textContent = lang;
  const sumEl = document.getElementById('project-summary'); if(sumEl) sumEl.textContent = summary;

  const bodyEl = document.getElementById('project-description');
  if(bodyEl){
    bodyEl.innerHTML = '';
    description.split('\n').forEach(p=>{
      if(!p.trim()) return;
      const para = document.createElement('p');
      para.style.marginTop = '0';
      para.style.marginBottom = '12px';
      para.textContent = p.trim();
      bodyEl.appendChild(para);
    });
  }

  renderBanner(meta || {});
  renderTags(meta?.tags || gh?.topics || []);
  renderLinks({
    githubUrl: gh?.html_url || meta?.github,
    homepage: gh?.homepage || meta?.homepage,
    docs: meta?.docs,
    extraLinks: meta?.links
  });
}

(async function initProjectPage(){
  const slug = parseRepoParam();
  const [metaList, liveList] = await Promise.all([
    loadProjectsMeta(),
    fetchReposList()
  ]);

  // Fuente prioritaria: datos en vivo de GitHub; fallback: projects.json
  const sourceList = liveList.length ? liveList : metaList;
  const meta = slug ? pickProject(sourceList, slug) : null;
  let gh = null;
  let readmeDescription = null;

  const repoNameForGitHub = meta?.repo || meta?.title || slug;

  if(repoNameForGitHub){
    try{
      gh = await fetchRepoInfo(repoNameForGitHub);
      const md = await fetchReadme(repoNameForGitHub);
      readmeDescription = extractDescription(md);
    }catch(e){
      console.warn('GitHub:', e);
    }
  }

  // Render primary project or fallback
  if(meta || gh){
    renderProject(meta, gh, readmeDescription);
  }else{
    const bodyEl = document.getElementById('project-description');
    if(bodyEl) bodyEl.textContent = 'Selecciona un proyecto de la lista inferior.';
  }

  // Lista inferior
  renderList(sourceList, slug);
})();
