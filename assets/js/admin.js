// Admin panel logic for Blog / Actualizaciones (with GitHub Pages integration)
const ADMIN_HASH = 'e34c4eb9152e874fedc5e1f5edca5d3257e522b94caa3b8280034d00a9b2441f';

async function sha256Hex(str){
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

const state = { authed:false, posts:[] };
const LS_KEYS = { owner:'gh_owner', repo:'gh_repo', branch:'gh_branch', path:'gh_path', token:'gh_token' };
const $ = sel => document.querySelector(sel);

document.addEventListener('DOMContentLoaded', ()=>{
  $('#loginBtn')?.addEventListener('click', async ()=>{
    const pw = $('#pw').value || '';
    const h = await sha256Hex(pw);
    state.authed = (ADMIN_HASH !== 'CHANGE_ME_SHA256_HEX' && h === ADMIN_HASH);
    $('#authState').textContent = state.authed ? 'OK' : 'Contraseña incorrecta';
    $('#app').hidden = !state.authed;
    if (state.authed) { loadData(); }
  });

  // GH config
  loadConfigToForm();
  $('#saveCfg')?.addEventListener('click', ()=>{ saveConfigFromForm(); msg('Config guardada'); });
  $('#clearTok')?.addEventListener('click', ()=>{ localStorage.removeItem(LS_KEYS.token); const tok=$('#ghToken'); if(tok) tok.value=''; msg('Token borrado'); });
  $('#publish')?.addEventListener('click', async ()=>{
    try{ await publishToGitHub(); msg('Publicado en GitHub'); }
    catch(e){ console.warn(e); msg('Error al publicar'); alert('No se pudo publicar. Revisa consola.'); }
  });

  $('#add')?.addEventListener('click', ()=>{
    state.posts.unshift({ date:new Date().toISOString().slice(0,10), title:'', excerpt:'', link:'' });
    render();
  });

  $('#tbl')?.addEventListener('input', (e)=>{
    const tr = e.target.closest('tr');
    if(!tr) return;
    const idx = Array.from(tr.parentNode.children).indexOf(tr);
    const inputs = tr.querySelectorAll('input,textarea');
    const [dateEl, titleEl, excerptEl, linkEl] = inputs;
    state.posts[idx] = { date:dateEl.value, title:titleEl.value, excerpt:excerptEl.value, link:linkEl.value };
  });

  $('#tbl')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-act]');
    if(!btn) return;
    const i = Number(btn.dataset.i);
    const act = btn.dataset.act;
    if (act==='del') { state.posts.splice(i,1); render(); return; }
    if (act==='up' && i>0){ const a=state.posts[i-1]; state.posts[i-1]=state.posts[i]; state.posts[i]=a; render(); return; }
    if (act==='down' && i<state.posts.length-1){ const a=state.posts[i+1]; state.posts[i+1]=state.posts[i]; state.posts[i]=a; render(); return; }
  });

  $('#importFile')?.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    const text = await f.text();
    try{ state.posts = JSON.parse(text); render(); msg('Importado'); }
    catch{ alert('JSON inválido'); }
  });

  $('#export')?.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state.posts, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'blog.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
});

async function loadData(){
  try{
    const res = await fetch('../assets/data/blog.json', {cache:'no-cache'});
    state.posts = await res.json();
    render();
    msg('Cargado');
  }catch(e){
    console.warn(e);
    state.posts = [];
    render();
    msg('No se pudo leer blog.json');
  }
}

function render(){
  const $tbody = document.querySelector('#tbl tbody');
  if(!$tbody) return;
  $tbody.innerHTML = '';
  state.posts.forEach((p, i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="date" value="${escAttr(p.date||'')}"/></td>
      <td><input type="text" value="${escAttr(p.title||'')}"/></td>
      <td><textarea rows="2">${escAttr(p.excerpt||'')}</textarea></td>
      <td><input type="text" value="${escAttr(p.link||'')}"/></td>
      <td class="row-actions"><button class="btn" data-act="up" data-i="${i}">&#8593;</button> <button class="btn" data-act="down" data-i="${i}">&#8595;</button> <button class="btn danger" data-act="del" data-i="${i}">Eliminar</button></td>
    `;
    $tbody.appendChild(tr);
  });
}

function escAttr(s){ return String(s).replace(/\"/g,'&quot;') }

function msg(s){ const el=$('#status'); if(el) el.textContent=s; }

function loadConfigToForm(){
  const owner = localStorage.getItem(LS_KEYS.owner) || '';
  const repo = localStorage.getItem(LS_KEYS.repo) || '';
  const branch = localStorage.getItem(LS_KEYS.branch) || 'main';
  const path = localStorage.getItem(LS_KEYS.path) || 'assets/data/blog.json';
  const token = localStorage.getItem(LS_KEYS.token) || '';
  const set = (id,val)=>{ const el=document.getElementById(id); if(el) el.value=val; };
  set('ghOwner', owner); set('ghRepo', repo); set('ghBranch', branch); set('ghPath', path); set('ghToken', token);
}

function saveConfigFromForm(){
  const get = id=>document.getElementById(id)?.value?.trim()||'';
  localStorage.setItem(LS_KEYS.owner, get('ghOwner'));
  localStorage.setItem(LS_KEYS.repo, get('ghRepo'));
  localStorage.setItem(LS_KEYS.branch, get('ghBranch')||'main');
  localStorage.setItem(LS_KEYS.path, get('ghPath')||'assets/data/blog.json');
  const tok = get('ghToken'); if(tok) localStorage.setItem(LS_KEYS.token, tok);
}

async function publishToGitHub(){
  const owner = localStorage.getItem(LS_KEYS.owner) || $('#ghOwner')?.value?.trim();
  const repo = localStorage.getItem(LS_KEYS.repo) || $('#ghRepo')?.value?.trim();
  const branch = localStorage.getItem(LS_KEYS.branch) || $('#ghBranch')?.value?.trim() || 'main';
  const path = localStorage.getItem(LS_KEYS.path) || $('#ghPath')?.value?.trim() || 'assets/data/blog.json';
  const token = localStorage.getItem(LS_KEYS.token) || $('#ghToken')?.value?.trim();
  if(!owner||!repo||!token) throw new Error('Falta owner/repo/token');

  const json = JSON.stringify(state.posts, null, 2);
  const contentB64 = await utf8ToBase64(json);

  const metaUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  const getRes = await fetch(metaUrl, { headers:{ 'Accept':'application/vnd.github+json', 'Authorization':`Bearer ${token}` } });
  let sha=null;
  if(getRes.status===200){ const meta = await getRes.json(); sha = meta.sha; }
  else if(getRes.status!==404){ throw new Error('GET contents error'); }

  const putUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}`;
  const body = {
    message: `chore(blog): update blog.json (${new Date().toISOString()})`,
    content: contentB64,
    branch,
    sha: sha||undefined,
    committer: { name:'Glitchboi CMS', email:'noreply@users.noreply.github.com' }
  };
  const res = await fetch(putUrl, { method:'PUT', headers:{ 'Accept':'application/vnd.github+json', 'Authorization':`Bearer ${token}` }, body: JSON.stringify(body) });
  if(!res.ok) throw new Error('PUT contents error');
}

async function utf8ToBase64(str){
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const chunk = 0x8000;
  for(let i=0;i<bytes.length;i+=chunk){ binary += String.fromCharCode.apply(null, bytes.subarray(i, i+chunk)); }
  return btoa(binary);
}

