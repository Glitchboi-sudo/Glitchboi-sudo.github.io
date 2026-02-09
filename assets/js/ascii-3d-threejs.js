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
    // Create ASCII canvas
    this.asciiCanvas = document.createElement('canvas');
    this.asciiCanvas.className = 'ascii-canvas-threejs';
    this.asciiCanvas.style.cssText = `
      font-family: 'Courier New', monospace;
      font-size: ${this.options.fontSize}px;
      line-height: ${this.options.cellSize}px;
      color: ${this.options.color};
      background: ${this.options.backgroundColor};
      white-space: pre;
      letter-spacing: 0;
      image-rendering: pixelated;
      width: 100%;
      height: 100%;
      display: block;
    `;
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

    // Camera (alejada para modelo más grande)
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
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
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);

    // Lighting (dramática para gradientes visibles en rasterizado)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);  // Muy baja
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);  // Muy alta
    directionalLight.position.set(2, 2, 3);  // Ángulo más dramático
    this.scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.15);  // Baja
    backLight.position.set(-2, -1, -2);
    this.scene.add(backLight);
  }

  updateDimensions() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.cols = Math.floor(width / this.options.cellSize);
    this.rows = Math.floor(height / this.options.cellSize);

    // Update ASCII canvas
    this.asciiCanvas.width = this.cols;
    this.asciiCanvas.height = this.rows;

    // Update reusable temp canvas
    this.tempCanvas.width = this.cols;
    this.tempCanvas.height = this.rows;

    // Update Three.js renderer
    if (this.renderer) {
      this.renderer.setSize(width, height);
    }

    // Update camera
    if (this.camera) {
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
    // Mapeo de brillo a carácter halftone (puntos)
    // Invertido: brillo alto = carácter claro (punto pequeño)
    //           brillo bajo = carácter oscuro (punto grande)
    const inverted = 1 - brightness;  // Invertir para que oscuro = punto grande
    const index = Math.floor(inverted * (this.options.chars.length - 1));
    return this.options.chars[Math.max(0, Math.min(this.options.chars.length - 1, index))];
  }

  // Reducir paleta de colores para efecto bitmap
  reduceColorPalette(r, g, b) {
    if (!this.options.halftone) {
      return { r, g, b };
    }

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

    // Throttle to target FPS
    const now = performance.now();
    const minDelta = 1000 / this.options.fps;
    if (now - this.lastFrameTime < minDelta) {
      return;
    }
    this.lastFrameTime = now;

    // Auto-rotate (solo eje Z - izquierda a derecha)
    if (this.options.autoRotate && this.model) {
      this.model.rotation.y += this.options.rotationSpeed;
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

    // Convert to ASCII
    // Clear canvas completely each frame
    this.asciiCtx.clearRect(0, 0, this.asciiCanvas.width, this.asciiCanvas.height);

    // Fill background if specified
    if (this.options.backgroundColor && this.options.backgroundColor !== 'transparent') {
      this.asciiCtx.fillStyle = this.options.backgroundColor;
      this.asciiCtx.fillRect(0, 0, this.asciiCanvas.width, this.asciiCanvas.height);
    }

    this.asciiCtx.font = `${this.options.fontSize}px 'Courier New', monospace`;
    this.asciiCtx.textBaseline = 'top';

    // Procesar con efecto halftone bitmap
    const halftoneSize = this.options.halftone ? this.options.halftoneSize : 1;

    for (let y = 0; y < this.rows; y += halftoneSize) {
      for (let x = 0; x < this.cols; x += halftoneSize) {
        // Calcular color y brillo promedio de la celda halftone
        let avgR = 0, avgG = 0, avgB = 0, avgA = 0;
        let count = 0;

        for (let dy = 0; dy < halftoneSize && (y + dy) < this.rows; dy++) {
          for (let dx = 0; dx < halftoneSize && (x + dx) < this.cols; dx++) {
            const i = ((y + dy) * this.cols + (x + dx)) * 4;
            avgR += pixels[i];
            avgG += pixels[i + 1];
            avgB += pixels[i + 2];
            avgA += pixels[i + 3];
            count++;
          }
        }

        if (count > 0 && avgA > 0) {
          avgR = Math.round(avgR / count);
          avgG = Math.round(avgG / count);
          avgB = Math.round(avgB / count);
          avgA = Math.round(avgA / count);

          // Reducir paleta de colores para efecto bitmap
          const reduced = this.reduceColorPalette(avgR, avgG, avgB);

          // Calcular brillo
          const brightness = (reduced.r + reduced.g + reduced.b) / (3 * 255);
          const char = this.brightnessToChar(brightness);

          if (char !== ' ') {
            // Modo monocromático (TUI) o color
            if (this.options.monochromeMode) {
              // Modo TUI: usar solo el color del tema con opacidad basada en brillo
              const alpha = brightness;  // Usar brillo como opacidad
              this.asciiCtx.fillStyle = this.options.color;
              this.asciiCtx.globalAlpha = alpha;
            } else {
              // Modo color: usar colores del modelo MTL
              this.asciiCtx.fillStyle = `rgb(${reduced.r}, ${reduced.g}, ${reduced.b})`;
              this.asciiCtx.globalAlpha = 1.0;
            }

            // Dibujar el carácter en el centro de la celda halftone
            const centerX = x + Math.floor(halftoneSize / 2);
            const centerY = y + Math.floor(halftoneSize / 2);
            this.asciiCtx.fillText(char, centerX, centerY);

            // Restaurar opacidad
            this.asciiCtx.globalAlpha = 1.0;
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
