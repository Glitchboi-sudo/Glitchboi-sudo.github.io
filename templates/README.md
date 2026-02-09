# Plantillas de Blog - Glitchboi

Este directorio contiene plantillas reutilizables para crear contenido en el sitio.

## 📝 Post Template (`post-template.html`)

Plantilla HTML para crear nuevos posts del blog.

### Variables disponibles

La plantilla usa placeholders que deben ser reemplazados:

| Placeholder | Descripción | Ejemplo |
|------------|-------------|---------|
| `{{TITLE_ES}}` | Título en español | "Nueva función en Cerberus" |
| `{{TITLE_EN}}` | Título en inglés | "New Cerberus feature" |
| `{{SUMMARY_ES}}` | Resumen en español | "Agregamos descriptores USB" |
| `{{SUMMARY_EN}}` | Resumen en inglés | "Added USB descriptors" |
| `{{BODY_ES}}` | Contenido completo en español (HTML) | `<p>Contenido...</p>` |
| `{{BODY_EN}}` | Contenido completo en inglés (HTML) | `<p>Content...</p>` |
| `{{CATEGORY_ES}}` | Categoría en español | "Actualización" |
| `{{CATEGORY_EN}}` | Categoría en inglés | "Update" |
| `{{DATE}}` | Fecha formato YYYY-MM-DD | "2026-02-09" |
| `{{PAGE_NUM}}` | Número de página (3 dígitos) | "001" |
| `{{TAGS}}` | Tags del post | "#hardware #iot #usb" |
| `{{IMAGE_SECTION}}` | Sección de imagen (opcional) | `<img src="...">` |

### Uso Manual

1. **Copia la plantilla**:
   ```bash
   cp templates/post-template.html posts/2026-02-09-mi-nuevo-post.html
   ```

2. **Reemplaza los placeholders**:
   - Abre el archivo en tu editor
   - Busca y reemplaza cada `{{VARIABLE}}` con tu contenido
   - Guarda el archivo

3. **Agrega la entrada a blog.json**:
   ```json
   {
     "date": "2026-02-09",
     "title": "Mi Nuevo Post — GLITCHBOI",
     "excerpt": "Resumen del post...",
     "link": "posts/2026-02-09-mi-nuevo-post.html"
   }
   ```

### Uso con Script Python

El script `scripts/blog_publish.py` automatiza el proceso:

#### Opción 1: Flujo interactivo (Recomendado)

```bash
python scripts/blog_publish.py
```

El script:
1. Detecta archivos HTML nuevos en `posts/`
2. Te pide confirmar título, fecha y resumen
3. Actualiza `blog.json` automáticamente
4. Hace commit y push a GitHub

#### Opción 2: Especificar archivo

```bash
python scripts/blog_publish.py --file posts/2026-02-09-mi-post.html
```

#### Opción 3: Con Pull Request

```bash
python scripts/blog_publish.py --pr
```

Crea un PR y hace auto-merge (requiere `gh` CLI configurado)

## 🎨 Estructura del Post

### Secciones principales

1. **Header**: Logo, navegación, título
2. **Metadata**: Fecha, categoría, resumen
3. **Imagen** (opcional): Imagen destacada del post
4. **Contenido**: Cuerpo del artículo en español e inglés
5. **Tags**: Etiquetas del post
6. **Footer**: Enlaces, copyright

### Ejemplo de contenido con HTML

```html
<!-- BODY_ES -->
<p>Hola a todos, después de mucho tiempo trabajando en un nuevo prototipo...</p>

<h3>Nueva Funcionalidad</h3>
<p>Agregamos soporte para <strong>descriptores de USB</strong>.</p>

<ul>
  <li>Fabricante</li>
  <li>Número serial</li>
  <li>ID del dispositivo</li>
</ul>

<p>Más información en el <a href="https://github.com/...">repositorio</a>.</p>
```

## 🚀 Workflow Completo

### Crear un nuevo post

1. **Crear el archivo HTML**:
   ```bash
   cp templates/post-template.html posts/$(date +%Y-%m-%d)-mi-post.html
   ```

2. **Editar el contenido**:
   - Usa tu editor favorito
   - Reemplaza los placeholders
   - Agrega contenido en español e inglés

3. **Publicar**:
   ```bash
   python scripts/blog_publish.py
   ```

4. **Verificar**:
   - Abre tu sitio en el navegador
   - Ve a la sección Blog
   - Confirma que aparece tu nuevo post

## 💡 Tips

- **Fechas**: Usa formato ISO (YYYY-MM-DD)
- **Tags**: Usa minúsculas sin espacios
- **Imágenes**: Coloca las imágenes en `assets/images/`
- **Enlaces**: Usa rutas relativas (`../assets/...`)
- **HTML**: Puedes usar cualquier HTML válido en `BODY_ES/EN`

## 📋 Checklist de Publicación

- [ ] Título claro y descriptivo
- [ ] Resumen conciso (max 160 caracteres)
- [ ] Contenido en español e inglés
- [ ] Fecha correcta
- [ ] Tags relevantes
- [ ] Imagen destacada (opcional)
- [ ] Enlaces funcionan correctamente
- [ ] Post aparece en blog.json
- [ ] Commit y push a GitHub

## 🔧 Troubleshooting

### El post no aparece en el blog

1. Verifica que el archivo esté en `posts/`
2. Confirma que la entrada esté en `blog.json`
3. Revisa que el `link` sea correcto (relativo a root)
4. Recarga la página con Ctrl+F5

### Script de Python falla

1. Verifica que estés en el directorio raíz
2. Confirma que Python 3 esté instalado
3. Revisa que git esté configurado
4. Usa `--file` para especificar el archivo manualmente
