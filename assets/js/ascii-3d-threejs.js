/**
 * ASCII 3D Renderer using Three.js + ASCII Shader
 * Renders real 3D models (GLTF/GLB) with ASCII art effect
 */

class ASCII3DThreeJS {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container #${containerId} not found`);
    }

    // Options
    this.options = {
      cellSize: options.cellSize || 8,  // Tamaño de celda para halftone (más grande = puntos más grandes)
      fontSize: options.fontSize || 10,
      color: options.color || '#00ff00',
      backgroundColor: options.backgroundColor || 'transparent',
      // Caracteres para halftone: del más claro al más oscuro (patrón de puntos)
      chars: options.chars || [' ', '·', ':', '∙', '•', 'o', 'O', '0', '●', '█'],
      autoRotate: options.autoRotate !== false,
      rotationSpeed: options.rotationSpeed || 0.005,
      fps: options.fps || 30,
      halftone: options.halftone !== false,  // Efecto halftone bitmap
      halftoneSize: options.halftoneSize || 4,  // Tamaño de la celda halftone en píxeles
      colorReduction: options.colorReduction || 16,  // Reducción de paleta de colores
      monochromeMode: options.monochromeMode !== false,  // Modo monocromático TUI (escala de grises)
      ...options
    };

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.model = null;
    this.asciiCanvas = null;
    this.asciiCtx = null;
    this.tempCanvas = null;
    this.tempCtx = null;
    this.animationId = null;
    this.cols = 0;
    this.rows = 0;
    this.lastFrameTime = 0;
    this.isVisible = true;
    this.visibilityObserver = null;

    this.init();
  }

  init() {
    // Create ASCII canvas for TUI rendering
    this.asciiCanvas = document.createElement('canvas');
    this.asciiCanvas.className = 'ascii-canvas-threejs';
    this.asciiCanvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: block;
      background: ${this.options.backgroundColor};
    `;
    this.container.style.position = 'relative';
    this.container.appendChild(this.asciiCanvas);
    this.asciiCtx = this.asciiCanvas.getContext('2d', { willReadFrequently: true });

    // Reusable temp canvas for downscaling the WebGL buffer
    this.tempCanvas = document.createElement('canvas');
    this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });

    // Setup Three.js
    this.setupThreeJS();
    this.updateDimensions();

    // Handle resize
    window.addEventListener('resize', () => this.updateDimensions());

    // Pause rendering when not visible to avoid wasted work
    this.visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        this.isVisible = entry.isIntersecting;
        if (this.isVisible) {
          this.start();
        } else {
          this.stop();
        }
      });
    }, { root: null, threshold: 0.05 });
    this.visibilityObserver.observe(this.container);
  }

  setupThreeJS() {
    // Scene
    this.scene = new THREE.Scene();

    // Obtener dimensiones con fallback
    const width = this.container.clientWidth || 400;
    const height = this.container.clientHeight || 320;
    const aspect = width / height || 1.25;

    console.log('ASCII3D setupThreeJS - container dimensions:', width, 'x', height);

    // Camera (alejada para modelo más grande)
    this.camera = new THREE.PerspectiveCamera(
      45,
      aspect,
      0.1,
      1000
    );
    this.camera.position.z = 15;  // Alejada para ver modelo 5x más grande

    // Renderer (off-screen) - sin antialiasing para efecto bitmap
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,  // Sin antialiasing para efecto más pixelado
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(0.625);  // ~60 PPI effect (60/96)
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000, 0);

    // Iluminacion frontal para mejor visibilidad del modelo
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);  // Luz ambiente mas alta
    this.scene.add(ambientLight);

    // Luz principal frontal (desde la camara)
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.0);
    frontLight.position.set(0, 0, 15);  // Directamente desde el frente
    this.scene.add(frontLight);

    // Luz de relleno superior
    const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
    topLight.position.set(0, 10, 5);
    this.scene.add(topLight);

    // Luces laterales para rellenar sombras
    const leftLight = new THREE.DirectionalLight(0xffffff, 0.3);
    leftLight.position.set(-10, 0, 5);
    this.scene.add(leftLight);

    const rightLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rightLight.position.set(10, 0, 5);
    this.scene.add(rightLight);
  }

  updateDimensions() {
    let width = this.container.clientWidth;
    let height = this.container.clientHeight;

    console.log('ASCII3D updateDimensions:', width, 'x', height, 'container:', this.container.id);

    // Si las dimensiones son 0, intentar obtenerlas del estilo computado
    if (width === 0 || height === 0) {
      const computed = getComputedStyle(this.container);
      width = parseInt(computed.width) || 400;
      height = parseInt(computed.height) || 320;
      console.log('ASCII3D using computed style:', width, 'x', height);
    }

    // Calcular columnas y filas basado en el tamano de celda
    this.cols = Math.floor(width / this.options.cellSize);
    this.rows = Math.floor(height / this.options.cellSize);

    console.log('ASCII3D grid:', this.cols, 'cols x', this.rows, 'rows');

    // Canvas ASCII a resolucion completa para texto nítido
    this.asciiCanvas.width = width;
    this.asciiCanvas.height = height;

    // Canvas temporal para muestrear la escena 3D (baja resolucion)
    this.tempCanvas.width = this.cols;
    this.tempCanvas.height = this.rows;

    // Update Three.js renderer
    if (this.renderer) {
      this.renderer.setSize(width, height);
    }

    // Update camera
    if (this.camera && width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  async loadModel(url) {
    try {
      // Remove existing model
      if (this.model) {
        this.scene.remove(this.model);
        this.model = null;
      }

      // Get MTL file path (same name as OBJ but with .mtl extension)
      const mtlUrl = url.replace('.obj', '.mtl');
      const basePath = url.substring(0, url.lastIndexOf('/') + 1);

      return new Promise((resolve, reject) => {
        // Load MTL first
        const mtlLoader = new THREE.MTLLoader();
        mtlLoader.setPath(basePath);

        mtlLoader.load(
          mtlUrl.substring(mtlUrl.lastIndexOf('/') + 1),
          (materials) => {
            materials.preload();
            console.log('MTL materials loaded:', materials);

            // Now load OBJ with materials
            const objLoader = new THREE.OBJLoader();
            objLoader.setMaterials(materials);

            objLoader.load(
              url,
              (object) => {
                this.model = object;

                // Center and scale model (5x larger)
                const box = new THREE.Box3().setFromObject(this.model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 10.0 / maxDim;  // 5 veces más grande (2.0 * 5)

                this.model.scale.multiplyScalar(scale);
                this.model.position.sub(center.multiplyScalar(scale));

                // NO sobreescribir materiales - usar los del MTL
                // Solo ajustar propiedades para mejor renderizado ASCII
                this.model.traverse((child) => {
                  if (child.isMesh && child.material) {
                    // Preservar el material original pero ajustar propiedades
                    if (Array.isArray(child.material)) {
                      child.material.forEach(mat => {
                        mat.flatShading = false;
                        mat.needsUpdate = true;
                      });
                    } else {
                      child.material.flatShading = false;
                      child.material.needsUpdate = true;
                    }
                  }
                });

                this.scene.add(this.model);
                console.log(`Model loaded with MTL materials: ${url}`);
                resolve(true);
              },
              (progress) => {
                const percent = (progress.loaded / progress.total * 100).toFixed(2);
                console.log(`Loading OBJ: ${percent}%`);
              },
              (error) => {
                console.error('Error loading OBJ:', error);
                reject(error);
              }
            );
          },
          (progress) => {
            console.log('Loading MTL...');
          },
          (error) => {
            console.error('Error loading MTL:', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('Error loading model:', error);
      return false;
    }
  }

  brightnessToChar(brightness) {
    // Mapeo de brillo a caracter ASCII
    // Para fondo oscuro: brillo alto = caracter denso (visible)
    //                    brillo bajo = caracter ligero (menos visible)
    const index = Math.floor(brightness * (this.options.chars.length - 1));
    return this.options.chars[Math.max(0, Math.min(this.options.chars.length - 1, index))];
  }

  // Reducir paleta de colores para mejor gradiente ASCII
  reduceColorPalette(r, g, b) {
    const levels = this.options.colorReduction;

    // Cuantizar cada canal de color
    const qR = Math.round((r / 255) * levels) / levels * 255;
    const qG = Math.round((g / 255) * levels) / levels * 255;
    const qB = Math.round((b / 255) * levels) / levels * 255;

    return {
      r: Math.max(0, Math.min(255, Math.round(qR))),
      g: Math.max(0, Math.min(255, Math.round(qG))),
      b: Math.max(0, Math.min(255, Math.round(qB)))
    };
  }

  render() {
    if (!this.renderer || !this.scene || !this.camera) return;
    if (!this.isVisible) return;

    // Verificar dimensiones y recalcular si son 0
    if (this.cols === 0 || this.rows === 0) {
      this.updateDimensions();
      // Si aun son 0, no hay nada que renderizar
      if (this.cols === 0 || this.rows === 0) return;
    }

    // Throttle to target FPS
    const now = performance.now();
    const minDelta = 1000 / this.options.fps;
    if (now - this.lastFrameTime < minDelta) {
      return;
    }
    this.lastFrameTime = now;

    // Auto-rotate en ejes X e Y simultaneamente
    if (this.options.autoRotate && this.model) {
      this.model.rotation.z -= this.options.rotationSpeed;
      this.model.rotation.y += this.options.rotationSpeed * 0.9;
      this.model.rotation.x += this.options.rotationSpeed * 0.7;  // Velocidad ligeramente diferente para movimiento organico
    }

    // Render 3D scene to off-screen buffer
    this.renderer.render(this.scene, this.camera);

    // Get pixel data
    const renderCanvas = this.renderer.domElement;
    // Draw scaled version into the reusable temp canvas
    this.tempCtx.clearRect(0, 0, this.cols, this.rows);
    this.tempCtx.drawImage(renderCanvas, 0, 0, this.cols, this.rows);
    const imageData = this.tempCtx.getImageData(0, 0, this.cols, this.rows);
    const pixels = imageData.data;

    // Convert to ASCII TUI style
    // Clear canvas completely each frame
    this.asciiCtx.clearRect(0, 0, this.asciiCanvas.width, this.asciiCanvas.height);

    // Fill background if specified
    if (this.options.backgroundColor && this.options.backgroundColor !== 'transparent') {
      this.asciiCtx.fillStyle = this.options.backgroundColor;
      this.asciiCtx.fillRect(0, 0, this.asciiCanvas.width, this.asciiCanvas.height);
    }

    // Configurar fuente para ASCII TUI
    this.asciiCtx.font = `${this.options.fontSize}px 'Courier New', monospace`;
    this.asciiCtx.textBaseline = 'middle';
    this.asciiCtx.textAlign = 'center';

    const cellSize = this.options.cellSize;

    // Iterar sobre cada celda de la grilla ASCII
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        // Obtener pixel del canvas temporal (muestreado)
        const i = (row * this.cols + col) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        // Solo procesar pixels visibles
        if (a > 10) {
          // Reducir paleta de colores
          const reduced = this.reduceColorPalette(r, g, b);

          // Calcular brillo y obtener caracter ASCII
          const brightness = (reduced.r + reduced.g + reduced.b) / (3 * 255);
          const char = this.brightnessToChar(brightness);

          if (char !== ' ') {
            // Modo monocromatico (TUI) o color
            if (this.options.monochromeMode) {
              this.asciiCtx.fillStyle = this.options.color;
            } else {
              this.asciiCtx.fillStyle = `rgb(${reduced.r}, ${reduced.g}, ${reduced.b})`;
            }

            // Calcular posicion en pixeles (centro de la celda)
            const pixelX = col * cellSize + cellSize / 2;
            const pixelY = row * cellSize + cellSize / 2;

            // Dibujar el caracter ASCII
            this.asciiCtx.fillText(char, pixelX, pixelY);
          }
        }
      }
    }
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.render();
  }

  start() {
    if (!this.animationId) {
      // Forzar actualización de dimensiones antes de empezar
      this.updateDimensions();
      console.log('ASCII3D start() - cols:', this.cols, 'rows:', this.rows);
      this.animate();
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // Alternar modo monocromático (TUI) vs colores
  toggleMonochromeMode() {
    this.options.monochromeMode = !this.options.monochromeMode;
    return this.options.monochromeMode;
  }

  // Establecer modo monocromático
  setMonochromeMode(enabled) {
    this.options.monochromeMode = enabled;
  }

  // Actualizar el color del texto ASCII
  updateColor(newColor) {
    this.options.color = newColor;
    if (this.asciiCanvas) {
      this.asciiCanvas.style.color = newColor;
    }
  }

  destroy() {
    this.stop();

    if (this.renderer) {
      this.renderer.dispose();
    }

    if (this.asciiCanvas && this.asciiCanvas.parentNode) {
      this.asciiCanvas.parentNode.removeChild(this.asciiCanvas);
    }

    if (this.visibilityObserver) {
      this.visibilityObserver.disconnect();
    }
  }
}

// Make it globally available
window.ASCII3DThreeJS = ASCII3DThreeJS;
