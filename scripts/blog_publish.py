#!/usr/bin/env python3
"""
Publica un nuevo post del blog.

- Detecta archivos HTML nuevos en `posts/` (según git y/o no listados en blog.json).
- Pide confirmar/editar título y fecha detectados, y solicita un resumen.
- Agrega/actualiza la entrada en `assets/data/blog.json`.
- Ejecuta `git add`, `git commit` y `git push` a la rama actual.

Primera ejecución: solicita y guarda `gh_user` en `.blogconfig.json` (local, ignorado por git).

Uso:
  python scripts/blog_publish.py                          # flujo interactivo
  python scripts/blog_publish.py --file posts/AAAA-MM-DD-nombre.html
  python scripts/blog_publish.py --pr                     # crea PR y auto-merge (si gh configurado)
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import List, Dict, Any

ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = ROOT / 'posts'
BLOG_JSON = ROOT / 'assets' / 'data' / 'blog.json'
CONFIG_FILE = ROOT / '.blogconfig.json'


def sh(cmd: List[str], cwd: Path = ROOT, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, check=check)


def ensure_config() -> Dict[str, Any]:
    cfg: Dict[str, Any] = {}
    if CONFIG_FILE.exists():
        try:
            cfg = json.loads(CONFIG_FILE.read_text(encoding='utf-8'))
        except Exception:
            cfg = {}
    if not cfg.get('gh_user'):
        print('Config inicial: Ingresa tu usuario de GitHub (ej. Glitchboi-sudo):')
        gh_user = input('GitHub user: ').strip()
        cfg['gh_user'] = gh_user or 'unknown'
        CONFIG_FILE.write_text(json.dumps(cfg, indent=2, ensure_ascii=False) + "\n", encoding='utf-8')
        print(f'Guardado en {CONFIG_FILE.name}\n')
    return cfg


def git_branch() -> str:
    try:
        out = sh(['git', 'rev-parse', '--abbrev-ref', 'HEAD']).stdout.strip()
        return out or 'main'
    except Exception:
        return 'main'


def load_blog_entries() -> List[Dict[str, Any]]:
    if BLOG_JSON.exists():
        try:
            data = json.loads(BLOG_JSON.read_text(encoding='utf-8'))
            return data if isinstance(data, list) else []
        except Exception:
            return []
    return []


def save_blog_entries(entries: List[Dict[str, Any]]):
    BLOG_JSON.parent.mkdir(parents=True, exist_ok=True)
    BLOG_JSON.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding='utf-8')


def normalize_link(link: str) -> str:
    link = (link or '').strip().replace('\\', '/')
    if link.startswith('./'):
        link = link[2:]
    return link


def list_new_post_files() -> List[Path]:
    """Busca posts nuevos preferentemente no trackeados por git o no registrados en blog.json."""
    # Untracked (nuevos):
    untracked: List[Path] = []
    try:
        out = sh(['git', 'ls-files', '-o', '--exclude-standard', 'posts']).stdout
        for line in out.splitlines():
            p = (ROOT / line.strip()).resolve()
            if p.suffix.lower() == '.html' and not p.name.startswith('_'):
                untracked.append(p)
    except Exception:
        pass

    # Tracked, pero no listados en blog.json
    listed = set(
        normalize_link(e.get('link', ''))
        for e in load_blog_entries()
        if isinstance(e, dict)
    )
    all_posts = [p for p in POSTS_DIR.glob('*.html') if not p.name.startswith('_')]
    missing_in_json = []
    for p in all_posts:
        rel_link = normalize_link(str(p.relative_to(ROOT)).replace('\\', '/'))
        if rel_link not in listed:
            missing_in_json.append(p)

    cand = untracked or missing_in_json
    cand.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return cand


def pick_file(candidates: List[Path]) -> Path:
    if not candidates:
        print('No se encontraron posts nuevos en posts/*.html (excluyendo _plantilla).')
        print('Puedes pasar uno con --file posts/AAAA-MM-DD-nombre.html')
        sys.exit(1)
    if len(candidates) == 1:
        return candidates[0]
    print('Selecciona el post a publicar:')
    for i, p in enumerate(candidates, 1):
        print(f'  {i}) {p.relative_to(ROOT)}')
    while True:
        s = input('Numero: ').strip()
        if s.isdigit() and 1 <= int(s) <= len(candidates):
            return candidates[int(s) - 1]


def extract_from_html(html: str, fname: str) -> Dict[str, str]:
    title = ''
    m = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    if m:
        t0 = m.group(1).strip()
        # Elimina sufijo del sitio en el <title>
        title = re.sub(r'\s*[\u2014\-]\s*GLITCHBOI\s*$', '', t0, flags=re.IGNORECASE)
    if not title:
        m2 = re.search(r'<div[^>]*class=["\']title["\'][^>]*>(.*?)</div>', html, re.IGNORECASE | re.DOTALL)
        if m2:
            title = re.sub(r'<[^>]+>', '', m2.group(1)).strip()

    date = ''
    m = re.search(r'datetime=["\'](\d{4}-\d{2}-\d{2})["\']', html, re.IGNORECASE)
    if m:
        date = m.group(1)
    if not date:
        m3 = re.search(r'(\d{4}-\d{2}-\d{2})', Path(fname).name)
        if m3:
            date = m3.group(1)

    # Primer texto significativo como sugerencia de resumen (trunca a 160)
    excerpt = ''
    para = re.search(r'<article[\s\S]*?>([\s\S]*?)</article>', html, re.IGNORECASE)
    if para:
        txt = re.sub(r'<[^>]+>', ' ', para.group(1))
        txt = re.sub(r'\s+', ' ', txt).strip()
        excerpt = txt[:160]

    return {'title': title, 'date': date, 'excerpt': excerpt}


def upsert_entry(entries: List[Dict[str, Any]], new_entry: Dict[str, Any]) -> List[Dict[str, Any]]:
    link = normalize_link(new_entry.get('link', ''))
    for i, e in enumerate(entries):
        if normalize_link(e.get('link', '')) == link:
            entries[i] = new_entry
            break
    else:
        entries.append(new_entry)
    return entries


def has_gh() -> bool:
    try:
        sh(['gh', '--version'])
        return True
    except Exception:
        return False


def main():
    # Config inicial
    cfg = ensure_config()

    # Archivo a procesar
    target: Path | None = None
    args = sys.argv[1:]
    want_pr = '--pr' in args
    if len(args) >= 2 and args[0] in ('--file', '-f'):
        target = (ROOT / args[1]).resolve()
        if not target.exists():
            print(f'No existe: {target}')
            sys.exit(1)
    else:
        cand = list_new_post_files()
        target = pick_file(cand)

    html = target.read_text(encoding='utf-8', errors='ignore')
    extracted = extract_from_html(html, str(target))

    print('\nDetectado:')
    print(f'  Archivo: {target.relative_to(ROOT)}')
    title = input(f"Titulo [{extracted.get('title','')}]: ").strip() or extracted.get('title', '')
    date = input(f"Fecha YYYY-MM-DD [{extracted.get('date','')}]: ").strip() or extracted.get('date', '')
    print('Resumen (max 160 chars). Deja vacio para usar sugerencia:')
    summary = input('> ').strip() or extracted.get('excerpt', '')[:160]

    # Construir link relativo tipo 'posts/archivo.html'
    link_rel = normalize_link(str(target.relative_to(ROOT)).replace('\\', '/'))

    entry = {
        'date': date or '1970-01-01',
        'title': title or 'Actualizacion',
        'excerpt': summary or '',
        'link': link_rel,
    }

    entries = load_blog_entries()
    entries = upsert_entry(entries, entry)
    save_blog_entries(entries)

    # Git add/commit/push
    try:
        sh(['git', 'add', link_rel, str(BLOG_JSON.relative_to(ROOT))])
        branch = git_branch()
        msg = f"blog: nuevo post {title or target.stem} ({date})"
        sh(['git', 'commit', '-m', msg])
        sh(['git', 'push', 'origin', branch])
        print(f'Listo: committed y pusheado a {branch}.')

        if want_pr and has_gh():
            try:
                sh(['gh', 'pr', 'create', '--fill'])
                sh(['gh', 'pr', 'merge', '--auto', '--squash'])
                print('PR creado y merge automatico solicitado (gh).')
            except subprocess.CalledProcessError as e:
                print('No se pudo crear/mergear PR con gh:')
                print(e.stdout)
                print(e.stderr, file=sys.stderr)
    except subprocess.CalledProcessError as e:
        print('Git error:')
        print(e.stdout)
        print(e.stderr, file=sys.stderr)
        print('Revisa tu configuracion de remoto y autenticacion (git/gh).')
        sys.exit(2)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\nCancelado por el usuario.')

