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

function extractImageFromReadme(md, repoName){
  if(!md) return null;
  const lines = md.split(/\r?\n/);

  // Buscar en las primeras 20 líneas (antes de cualquier sección principal)
  for(let i=0; i<Math.min(20, lines.length); i++){
    const line = lines[i].trim();

    // Detener si llegamos a una sección importante (##)
    if(/^##\s+/.test(line)) break;

    // Buscar markdown image: ![alt](url)
    const mdMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if(mdMatch){
      let url = mdMatch[2].trim();
      // Si es URL relativa, construir URL absoluta de GitHub
      if(!url.startsWith('http')){
        url = `https://raw.githubusercontent.com/${GH_USER}/${repoName}/main/${url.replace(/^\.?\/?/, '')}`;
      }
      return url;
    }

    // Buscar HTML img tag: <img src="url" ...>
    const htmlMatch = line.match(/<img[^>]+src=["']([^"']+)["']/i);
    if(htmlMatch){
      let url = htmlMatch[1].trim();
      if(!url.startsWith('http')){
        url = `https://raw.githubusercontent.com/${GH_USER}/${repoName}/main/${url.replace(/^\.?\/?/, '')}`;
      }
      return url;
    }
  }

  return null;
}

async function findGlitchboiBanner(repoName){
  if(!repoName) return null;

  // Posibles nombres de archivo para el banner de Glitchboi
  const bannerNames = [
    'glitchboi-banner.png',
    'glitchboi-banner.jpg',
    'glitchboi-banner.jpeg',
    'glitchboi.png',
    'glitchboi.jpg',
    'banner.png',
    'banner.jpg'
  ];

  const branches = ['main', 'master'];

  for(const branch of branches){
    for(const name of bannerNames){
      const url = `https://raw.githubusercontent.com/${GH_USER}/${repoName}/${branch}/${name}`;
      try{
        const res = await fetch(url, { method: 'HEAD' });
        if(res.ok){
          return url;
        }
      }catch(e){
        // Continuar con el siguiente
      }
    }
  }

  return null;
}

function mergeProjectData(metaList, liveList){
  // Si no hay datos de GitHub, usar solo el JSON
  if(!liveList || !liveList.length) return metaList;

  // Crear un mapa de los datos del JSON por nombre de repo (normalizado)
  const metaMap = new Map();
  metaList.forEach(meta => {
    const repoName = String(meta.repo || meta.title || '').toLowerCase();
    if(repoName) metaMap.set(repoName, meta);
  });

  // Combinar datos: GitHub (dinámico) + JSON (manual)
  const merged = liveList.map(ghRepo => {
    const repoName = String(ghRepo.repo || ghRepo.title || '').toLowerCase();
    const meta = metaMap.get(repoName);

    if(meta){
      // Merge: priorizar GitHub para datos dinámicos, JSON para configuración manual
      return {
        ...ghRepo,                    // Datos de GitHub (descripción, fecha, etc.)
        model: meta.model,             // Modelo 3D del JSON
        tags: meta.tags || ghRepo.tags || ghRepo.topics || [], // Tags personalizados o topics de GitHub
        links: meta.links,             // Enlaces personalizados del JSON
        summary: meta.summary || ghRepo.summary,  // Summary personalizado o de GitHub
        description: meta.description || ghRepo.description, // Descripción personalizada o de GitHub
        slug: meta.slug || ghRepo.slug // Slug personalizado o generado
      };
    }else{
      // Si no está en JSON, usar solo datos de GitHub
      return ghRepo;
    }
  });

  // Agregar proyectos que están en JSON pero no en GitHub
  metaList.forEach(meta => {
    const repoName = String(meta.repo || meta.title || '').toLowerCase();
    const existsInMerged = merged.some(m =>
      String(m.repo || m.title || '').toLowerCase() === repoName
    );
    if(!existsInMerged){
      merged.push(meta);
    }
  });

  return merged;
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

  const hasModel = meta?.model;
  const hasImage = meta?.banner || meta?.bannerUrl;
  const imageUrl = meta?.bannerUrl || meta?.banner || FALLBACK_BANNER;

  // Crear contenedor principal
  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.width = '100%';

  // Si tiene ambos (imagen y modelo), agregar botón toggle
  if(hasModel && hasImage){
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle';
    toggleBtn.style.position = 'absolute';
    toggleBtn.style.top = '10px';
    toggleBtn.style.right = '10px';
    toggleBtn.style.zIndex = '10';
    toggleBtn.textContent = '[ ver 3D ]';
    toggleBtn.setAttribute('aria-label', 'Alternar entre imagen y modelo 3D');

    let showing3D = false;

    // Contenedor de imagen
    const imageContainer = document.createElement('div');
    imageContainer.id = 'banner-image-container';
    imageContainer.style.display = 'block';
    const img = document.createElement('img');
    img.src = resolveAsset(imageUrl);
    img.alt = meta?.title || 'Proyecto';
    img.style.width = '100%';
    img.style.height = 'auto';
    img.loading = 'lazy';
    imageContainer.appendChild(img);

    // Contenedor de modelo 3D
    const modelContainer = document.createElement('div');
    modelContainer.id = 'banner-model-container';
    modelContainer.style.display = 'none';
    modelContainer.style.width = '100%';
    const modelNode = document.createElement('div');
    modelNode.id = 'project-banner-3d';
    modelNode.className = 'ascii-3d-container';
    modelNode.style.width = '100%';
    modelNode.style.height = '320px';
    modelContainer.appendChild(modelNode);

    // Función toggle
    toggleBtn.addEventListener('click', ()=>{
      showing3D = !showing3D;
      if(showing3D){
        imageContainer.style.display = 'none';
        modelContainer.style.display = 'block';
        toggleBtn.textContent = '[ ver imagen ]';
        // Inicializar modelo 3D si no se ha hecho
        // Usar requestAnimationFrame para asegurar que el layout se haya calculado
        if(!modelNode.dataset.initialized){
          modelNode.dataset.initialized = 'true';
          requestAnimationFrame(() => {
            initModel3D(modelNode, meta.model);
          });
        }
      }else{
        imageContainer.style.display = 'block';
        modelContainer.style.display = 'none';
        toggleBtn.textContent = '[ ver 3D ]';
      }
    });

    container.appendChild(toggleBtn);
    container.appendChild(imageContainer);
    container.appendChild(modelContainer);
  }
  else if(hasModel){
    // Solo modelo 3D - marcar para inicialización diferida
    const modelNode = document.createElement('div');
    modelNode.id = 'project-banner-3d';
    modelNode.className = 'ascii-3d-container';
    modelNode.style.width = '100%';
    modelNode.style.height = '320px';
    modelNode.dataset.pendingModel = meta.model;
    container.appendChild(modelNode);
  }
  else{
    // Solo imagen
    const img = document.createElement('img');
    img.src = resolveAsset(imageUrl);
    img.alt = meta?.title || 'Proyecto';
    img.style.width = '100%';
    img.style.height = 'auto';
    img.loading = 'lazy';
    container.appendChild(img);
  }

  bannerBox.appendChild(container);

  // Inicializar modelo 3D diferido (después de que el contenedor esté en el DOM)
  const pendingModelNode = container.querySelector('[data-pending-model]');
  if(pendingModelNode){
    const modelPath = pendingModelNode.dataset.pendingModel;
    delete pendingModelNode.dataset.pendingModel;
    // Usar requestAnimationFrame para asegurar que el layout se haya calculado
    requestAnimationFrame(() => {
      initModel3D(pendingModelNode, modelPath);
    });
  }

  // Función auxiliar para inicializar modelo 3D
  function initModel3D(node, modelPath){
    try{
      if(typeof initASCII3DWithModel === 'function'){
        initASCII3DWithModel(node.id, resolveAsset(modelPath), {
          rotationSpeed: 0.004,
          fps: 24
        }).catch((e)=>{
          console.warn('3D banner:', e);
          node.innerHTML = '<p style="padding:20px;text-align:center;color:var(--muted)">Error cargando modelo 3D</p>';
        });
      }else{
        console.warn('ascii-3d-init.js no cargado, usando configuración básica');
        const ascii = new ASCII3DThreeJS(node.id, {
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
        ascii.loadModel(resolveAsset(modelPath)).then(()=>ascii.start()).catch(()=>{});
      }
    }catch(e){
      console.warn('3D banner:', e);
      node.innerHTML = '<p style="padding:20px;text-align:center;color:var(--muted)">Error cargando modelo 3D</p>';
    }
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

  // Combinar datos de JSON y GitHub
  const mergedList = mergeProjectData(metaList, liveList);
  const meta = slug ? pickProject(mergedList, slug) : null;

  let gh = null;
  let readmeDescription = null;
  let bannerUrl = null;

  const repoNameForGitHub = meta?.repo || meta?.title || slug;

  if(repoNameForGitHub){
    try{
      gh = await fetchRepoInfo(repoNameForGitHub);
      const md = await fetchReadme(repoNameForGitHub);
      readmeDescription = extractDescription(md);

      // Obtener imagen del README o banner de Glitchboi
      bannerUrl = extractImageFromReadme(md, repoNameForGitHub);
      if(!bannerUrl){
        bannerUrl = await findGlitchboiBanner(repoNameForGitHub);
      }

      // Si se encontró una imagen, agregarla al objeto meta
      if(bannerUrl && meta){
        meta.bannerUrl = bannerUrl;
      }else if(bannerUrl && !meta){
        // Si no hay meta pero hay banner, crear un objeto meta básico
        const tempMeta = {
          bannerUrl: bannerUrl,
          repo: repoNameForGitHub,
          title: gh?.name || repoNameForGitHub
        };
        // Render con meta temporal
        renderProject(tempMeta, gh, readmeDescription);
        renderList(mergedList, slug);
        return;
      }
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

  // Lista inferior con datos combinados
  renderList(mergedList, slug);
})();
