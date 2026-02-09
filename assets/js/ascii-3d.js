/* ===== ASCII 3D ANIMATION ===== */
/* Basado en el estilo de thegithubshop.com */

class ASCII3D {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    // Configuración
    this.config = {
      chars: options.chars || ['█', '▓', '▒', '░', '/', '\\', '|', '-', '+', 'x', '*', '.', ':', '~'],
      speed: options.speed || 0.001,
      size: options.size || 20,
      pattern: options.pattern || 'cube',
      colors: options.colors || ['#00ff00', '#00ffff', '#ff00ff', '#ffff00'],
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0
    };

    this.animationFrame = null;
    this.isRunning = false;
    this.init();
  }

  init() {
    // Crear canvas de texto
    this.canvas = document.createElement('pre');
    this.canvas.className = 'ascii-canvas';
    this.canvas.style.cssText = `
      font-family: monospace;
      line-height: 1;
      letter-spacing: 0.1em;
      white-space: pre;
      margin: 0;
      user-select: none;
      overflow: hidden;
    `;
    this.container.appendChild(this.canvas);

    // Dimensiones
    this.updateDimensions();
    window.addEventListener('resize', () => this.updateDimensions());
  }

  updateDimensions() {
    const rect = this.container.getBoundingClientRect();
    this.width = Math.floor(rect.width / 9); // ~9px por char (ajustado)
    this.height = Math.floor(rect.height / 18); // ~18px por línea (ajustado)
  }

  // Generar vértices de un cubo
  generateCube() {
    const size = this.config.size;
    return [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], // Cara frontal
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]      // Cara trasera
    ].map(p => p.map(c => c * size));
  }

  // Generar vértices de una pirámide
  generatePyramid() {
    const size = this.config.size;
    return [
      [0, -size * 1.5, 0],           // Vértice superior
      [-size, size, -size],          // Base
      [size, size, -size],
      [size, size, size],
      [-size, size, size]
    ];
  }

  // Cargar modelo desde archivo JSON o objeto
  async loadModel(source) {
    try {
      let modelData;

      // Si es una URL, cargar desde archivo
      if (typeof source === 'string') {
        const response = await fetch(source);
        modelData = await response.json();
      } else {
        // Si es un objeto, usarlo directamente
        modelData = source;
      }

      // Validar estructura del modelo
      if (!modelData.vertices || !modelData.edges) {
        throw new Error('Modelo inválido: debe contener vertices y edges');
      }

      // Guardar modelo personalizado
      this.customModel = {
        vertices: modelData.vertices,
        edges: modelData.edges
      };

      // Cambiar al patrón custom
      this.config.pattern = 'custom';

      return true;
    } catch (error) {
      console.error('Error cargando modelo:', error);
      return false;
    }
  }

  // Obtener vértices del modelo custom
  generateCustom() {
    if (!this.customModel) return this.generateCube();

    const size = this.config.size;
    // Escalar vértices según el tamaño configurado
    return this.customModel.vertices.map(v =>
      v.map(coord => coord * size)
    );
  }

  // Proyección 3D a 2D
  project(point) {
    const [x, y, z] = point;

    // Rotaciones
    const { rotateX, rotateY, rotateZ } = this.config;

    // Rotar X
    let y1 = y * Math.cos(rotateX) - z * Math.sin(rotateX);
    let z1 = y * Math.sin(rotateX) + z * Math.cos(rotateX);

    // Rotar Y
    let x1 = x * Math.cos(rotateY) + z1 * Math.sin(rotateY);
    let z2 = -x * Math.sin(rotateY) + z1 * Math.cos(rotateY);

    // Rotar Z
    let x2 = x1 * Math.cos(rotateZ) - y1 * Math.sin(rotateZ);
    let y2 = x1 * Math.sin(rotateZ) + y1 * Math.cos(rotateZ);

    // Proyección perspectiva
    const scale = 200 / (200 + z2);
    const screenX = Math.floor(x2 * scale + this.width / 2);
    const screenY = Math.floor(y2 * scale + this.height / 2);

    return { x: screenX, y: screenY, z: z2 };
  }

  // Renderizar frame
  render() {
    // Crear buffer 2D
    const buffer = Array(this.height).fill(null).map(() =>
      Array(this.width).fill(' ')
    );
    const zBuffer = Array(this.height).fill(null).map(() =>
      Array(this.width).fill(-Infinity)
    );

    // Generar geometría según patrón
    let vertices;
    let edges;

    if (this.config.pattern === 'cube') {
      vertices = this.generateCube();
      edges = [
        [0,1],[1,2],[2,3],[3,0], // Frontal
        [4,5],[5,6],[6,7],[7,4], // Trasera
        [0,4],[1,5],[2,6],[3,7]  // Conexiones
      ];
    } else if (this.config.pattern === 'pyramid') {
      vertices = this.generatePyramid();
      edges = [
        [0,1],[0,2],[0,3],[0,4], // Desde vértice a base
        [1,2],[2,3],[3,4],[4,1]  // Base
      ];
    } else if (this.config.pattern === 'custom' && this.customModel) {
      vertices = this.generateCustom();
      edges = this.customModel.edges;
    } else {
      vertices = this.generateCube();
      edges = [
        [0,1],[1,2],[2,3],[3,0],
        [4,5],[5,6],[6,7],[7,4],
        [0,4],[1,5],[2,6],[3,7]
      ];
    }

    // Proyectar vértices
    const projected = vertices.map(v => this.project(v));

    edges.forEach(([start, end], idx) => {
      this.drawLine(
        projected[start],
        projected[end],
        buffer,
        zBuffer,
        this.config.chars[idx % this.config.chars.length]
      );
    });

    // Convertir buffer a string
    const output = buffer.map(row => row.join('')).join('\n');
    this.canvas.textContent = output;

    // Actualizar rotación
    this.config.rotateX += this.config.speed * 2;
    this.config.rotateY += this.config.speed * 3;
    this.config.rotateZ += this.config.speed * 1;
  }

  // Algoritmo de Bresenham para líneas
  drawLine(p0, p1, buffer, zBuffer, char) {
    let x0 = Math.floor(p0.x);
    let y0 = Math.floor(p0.y);
    let x1 = Math.floor(p1.x);
    let y1 = Math.floor(p1.y);

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      // Verificar límites
      if (x0 >= 0 && x0 < this.width && y0 >= 0 && y0 < this.height) {
        const z = (p0.z + p1.z) / 2;
        if (z > zBuffer[y0][x0]) {
          buffer[y0][x0] = char;
          zBuffer[y0][x0] = z;
        }
      }

      if (x0 === x1 && y0 === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  // Control de animación
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const animate = () => {
      if (!this.isRunning) return;
      this.render();
      this.animationFrame = requestAnimationFrame(animate);
    };

    animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  setPattern(pattern) {
    this.config.pattern = pattern;
  }

  setSpeed(speed) {
    this.config.speed = speed;
  }

  setSize(size) {
    this.config.size = size;
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.ASCII3D = ASCII3D;
}
