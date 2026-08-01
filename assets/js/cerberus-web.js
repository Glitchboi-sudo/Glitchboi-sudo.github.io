/* =============================================================================
 * Cerberus Web — Programa e inspecciona el USB Watchdog desde el navegador.
 *
 *  - Flash: WebUSB + protocolo PICOBOOT del bootrom RP2040 (VID 2E8A / PID 0003).
 *  - Inspect: Web Serial API sobre el CDC de Cerberus (115200 baud).
 *  - Firmware: releases de GitHub (API) con descarga directa/proxy/manual.
 *
 * Requiere contexto seguro (HTTPS o localhost) y un navegador basado en
 * Chromium (Chrome, Edge, Opera).
 * ========================================================================== */
(function () {
  "use strict";

  // Revela el body (animations.css lo mantiene en opacity:0 hasta page-loaded).
  document.body.classList.add("page-loaded");

  // ---------------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------------
  const GH_OWNER = "Lab217MX";
  const GH_REPO = "Cerberus-A-USB-Watchdog";
  const RELEASES_API = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/releases`;

  // El binario del release de GitHub NO expone CORS y los proxies públicos son
  // poco fiables (devuelven bytes truncados) e inseguros para firmware. Por eso
  // el firmware se sirve desde el MISMO origen: un espejo de los releases en
  // firmware/manifest.json, generado por .github/workflows/mirror-firmware.yml.
  const FIRMWARE_MANIFEST = "../firmware/manifest.json";

  // RP2040 en modo BOOTSEL (bootrom PICOBOOT). Se incluye también RP2350.
  const BOOTROM_FILTERS = [
    { vendorId: 0x2e8a, productId: 0x0003 }, // RP2040
    { vendorId: 0x2e8a, productId: 0x000f }, // RP2350
  ];

  // PICOBOOT
  const PICOBOOT_MAGIC = 0x431fd10b;
  const CMD = {
    EXCLUSIVE_ACCESS: 0x01,
    REBOOT: 0x02,
    FLASH_ERASE: 0x03,
    READ: 0x84, // 0x04 | 0x80 (IN)
    WRITE: 0x05,
    EXIT_XIP: 0x06,
    ENTER_CMD_XIP: 0x07,
  };
  const FLASH_START = 0x10000000;
  const SECTOR = 4096; // borrado
  const WRITE_CHUNK = 4096; // escritura
  const ERASE_CHUNK = 65536; // borrado por bloques grandes

  // UF2
  const UF2_MAGIC0 = 0x0a324655;
  const UF2_MAGIC1 = 0x9e5d5157;
  const UF2_MAGIC_END = 0x0ab16f30;
  const UF2_FLAG_NOFLASH = 0x00000001;

  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------------------------------------------------------------------------
  // Tema (idéntico al resto del sitio) + año
  // ---------------------------------------------------------------------------
  (function theme() {
    const btn = $("themeBtn");
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
    const current = () =>
      document.documentElement.getAttribute("data-theme") || saved() || prefers();
    function apply(mode) {
      document.documentElement.setAttribute("data-theme", mode);
      try {
        localStorage.setItem("theme", mode);
      } catch (e) {}
      if (btn) {
        const dark = mode === "dark";
        btn.setAttribute("aria-pressed", String(dark));
        btn.textContent = dark ? "[ modo claro ]" : "[ modo nocturno ]";
      }
    }
    apply(current());
    btn &&
      btn.addEventListener("click", () =>
        apply(current() === "dark" ? "light" : "dark"),
      );
    const y = $("y");
    if (y) y.textContent = new Date().getFullYear();
  })();

  // ---------------------------------------------------------------------------
  // Compatibilidad
  // ---------------------------------------------------------------------------
  const hasWebUSB = "usb" in navigator;
  const hasWebSerial = "serial" in navigator;
  const isSecure = window.isSecureContext;

  (function compat() {
    const missing = [];
    if (!isSecure) missing.push("contexto no seguro (usa HTTPS o localhost)");
    if (!hasWebUSB) missing.push("WebUSB no disponible");
    if (!hasWebSerial) missing.push("Web Serial no disponible");
    if (missing.length) {
      const box = $("compat-warning");
      $("compat-detail").textContent = " " + missing.join(" · ") + ".";
      box.hidden = false;
    }
  })();

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------
  (function tabs() {
    const tabFlash = $("tab-flash");
    const tabInspect = $("tab-inspect");
    const panelFlash = $("panel-flash");
    const panelInspect = $("panel-inspect");
    function select(which) {
      const flash = which === "flash";
      tabFlash.classList.toggle("is-active", flash);
      tabInspect.classList.toggle("is-active", !flash);
      tabFlash.setAttribute("aria-selected", String(flash));
      tabInspect.setAttribute("aria-selected", String(!flash));
      panelFlash.hidden = !flash;
      panelInspect.hidden = flash;
    }
    tabFlash.addEventListener("click", () => {
      select("flash");
      history.replaceState(null, "", "#flash");
    });
    tabInspect.addEventListener("click", () => {
      select("inspect");
      history.replaceState(null, "", "#inspect");
    });
    // Deep-link: #inspect abre el inspector directamente.
    if (location.hash === "#inspect") select("inspect");
  })();

  // ===========================================================================
  //  UF2
  // ===========================================================================
  function parseUF2(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.length % 512 !== 0) {
      throw new Error("Tamaño UF2 inválido (no múltiplo de 512).");
    }
    const dv = new DataView(arrayBuffer);
    const blocks = bytes.length / 512;
    const chunks = []; // { addr, data:Uint8Array }
    for (let b = 0; b < blocks; b++) {
      const o = b * 512;
      const magic0 = dv.getUint32(o + 0, true);
      const magic1 = dv.getUint32(o + 4, true);
      const magicEnd = dv.getUint32(o + 508, true);
      if (magic0 !== UF2_MAGIC0 || magic1 !== UF2_MAGIC1 || magicEnd !== UF2_MAGIC_END) {
        throw new Error(`Bloque UF2 #${b} con magic inválido.`);
      }
      const flags = dv.getUint32(o + 8, true);
      const targetAddr = dv.getUint32(o + 12, true);
      const payloadSize = dv.getUint32(o + 16, true);
      if (flags & UF2_FLAG_NOFLASH) continue; // bloque informativo, no se escribe
      if (payloadSize > 476) throw new Error(`Bloque UF2 #${b} payload > 476.`);
      chunks.push({
        addr: targetAddr,
        data: bytes.slice(o + 32, o + 32 + payloadSize),
      });
    }
    if (!chunks.length) throw new Error("El UF2 no contiene bloques de flash.");

    let minAddr = Infinity;
    let maxEnd = 0;
    for (const c of chunks) {
      if (c.addr < minAddr) minAddr = c.addr;
      if (c.addr + c.data.length > maxEnd) maxEnd = c.addr + c.data.length;
    }
    // Imagen contigua alineada a sector, rellena con 0xFF.
    const base = minAddr - (minAddr % SECTOR);
    const end = Math.ceil(maxEnd / SECTOR) * SECTOR;
    const image = new Uint8Array(end - base).fill(0xff);
    for (const c of chunks) image.set(c.data, c.addr - base);

    return { base, image, blocks, minAddr, maxEnd };
  }

  // ===========================================================================
  //  PICOBOOT (WebUSB)
  // ===========================================================================
  class Picoboot {
    constructor(device) {
      this.device = device;
      this.ifaceNum = null;
      this.epOut = null;
      this.epIn = null;
      this.token = 1;
    }

    async open() {
      const d = this.device;
      await d.open();
      if (d.configuration === null) await d.selectConfiguration(1);
      // La interfaz PICOBOOT es vendor-specific (clase 0xFF) con 2 bulk EPs.
      let target = null;
      for (const iface of d.configuration.interfaces) {
        const alt = iface.alternate;
        if (alt.interfaceClass === 0xff && alt.endpoints.length >= 2) {
          const out = alt.endpoints.find(
            (e) => e.direction === "out" && e.type === "bulk",
          );
          const inp = alt.endpoints.find(
            (e) => e.direction === "in" && e.type === "bulk",
          );
          if (out && inp) {
            target = { iface, out, inp };
            break;
          }
        }
      }
      if (!target) throw new Error("No se encontró la interfaz PICOBOOT.");
      this.ifaceNum = target.iface.interfaceNumber;
      this.epOut = target.out.endpointNumber;
      this.epIn = target.inp.endpointNumber;
      await d.claimInterface(this.ifaceNum);
      await this.resetInterface();
    }

    async close() {
      try {
        await this.device.releaseInterface(this.ifaceNum);
      } catch (e) {}
      try {
        await this.device.close();
      } catch (e) {}
    }

    // Control: reinicia el estado de la interfaz PICOBOOT.
    async resetInterface() {
      await this.device.controlTransferOut({
        requestType: "vendor",
        recipient: "interface",
        request: 0x41, // PICOBOOT_IF_RESET
        value: 0,
        index: this.ifaceNum,
      });
    }

    _buildCmd(cmdId, argsBytes, transferLen) {
      const buf = new ArrayBuffer(32);
      const dv = new DataView(buf);
      dv.setUint32(0, PICOBOOT_MAGIC, true);
      dv.setUint32(4, this.token++, true);
      dv.setUint8(8, cmdId);
      dv.setUint8(9, argsBytes ? argsBytes.length : 0);
      dv.setUint16(10, 0, true);
      dv.setUint32(12, transferLen >>> 0, true);
      if (argsBytes) new Uint8Array(buf, 16).set(argsBytes);
      return buf;
    }

    // Ejecuta un comando PICOBOOT.
    //   dataOut : Uint8Array a enviar en la fase de datos (comandos OUT).
    //   inLen   : bytes a leer en la fase de datos (comandos IN).
    async command(cmdId, argsBytes, { dataOut = null, inLen = 0 } = {}) {
      const isIn = (cmdId & 0x80) !== 0;
      const transferLen = isIn ? inLen : dataOut ? dataOut.length : 0;
      const cmd = this._buildCmd(cmdId, argsBytes, transferLen);
      await this.device.transferOut(this.epOut, cmd);

      let result = null;
      if (isIn) {
        if (inLen > 0) {
          const r = await this.device.transferIn(this.epIn, inLen);
          result = r.data;
        }
        // ACK: ZLP OUT
        await this.device.transferOut(this.epOut, new Uint8Array(0));
      } else {
        if (dataOut && dataOut.length) {
          await this.device.transferOut(this.epOut, dataOut);
        }
        // ACK: ZLP IN
        await this.device.transferIn(this.epIn, 1);
      }
      return result;
    }

    _u32u32(a, b) {
      const args = new ArrayBuffer(8);
      const dv = new DataView(args);
      dv.setUint32(0, a >>> 0, true);
      dv.setUint32(4, b >>> 0, true);
      return new Uint8Array(args);
    }

    exclusiveAccess(mode = 1) {
      return this.command(CMD.EXCLUSIVE_ACCESS, new Uint8Array([mode]));
    }
    exitXip() {
      return this.command(CMD.EXIT_XIP, null);
    }
    flashErase(addr, size) {
      return this.command(CMD.FLASH_ERASE, this._u32u32(addr, size));
    }
    flashWrite(addr, data) {
      return this.command(CMD.WRITE, this._u32u32(addr, data.length), {
        dataOut: data,
      });
    }
    reboot(pc = 0, sp = 0, delayMs = 500) {
      const args = new ArrayBuffer(12);
      const dv = new DataView(args);
      dv.setUint32(0, pc >>> 0, true);
      dv.setUint32(4, sp >>> 0, true);
      dv.setUint32(8, delayMs >>> 0, true);
      return this.command(CMD.REBOOT, new Uint8Array(args));
    }
  }

  // ---------------------------------------------------------------------------
  // Estado del flasher
  // ---------------------------------------------------------------------------
  let currentFirmware = null; // { name, buffer, uf2 }

  function flashLog(msg, cls) {
    const el = $("flash-log");
    const line = document.createElement("span");
    line.className = "cw-line" + (cls ? " cw-sev-" + cls : "");
    line.textContent = msg + "\n";
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  function setFlashPill(state, text) {
    const p = $("flash-pill");
    p.dataset.state = state;
    p.textContent = text;
  }

  function setFlashProgress(pct, label) {
    $("flash-progress-wrap").hidden = false;
    $("flash-progress").style.setProperty("--w", pct + "%");
    $("flash-progress-pct").textContent = Math.round(pct) + "%";
    if (label) $("flash-progress-label").textContent = label;
  }

  async function doFlash() {
    if (!currentFirmware) {
      flashLog("Primero elige o sube un firmware .uf2.", "warning");
      return;
    }
    if (!hasWebUSB) {
      flashLog("WebUSB no está disponible en este navegador.", "danger");
      return;
    }
    const btn = $("btn-flash");
    btn.disabled = true;
    setFlashPill("busy", "conectando");
    let pb = null;
    try {
      const device = await navigator.usb.requestDevice({ filters: BOOTROM_FILTERS });
      flashLog(`Dispositivo: ${device.productName || "RP2040 BOOTSEL"}`, "info");
      pb = new Picoboot(device);
      await pb.open();
      flashLog("Interfaz PICOBOOT lista.", "success");

      setFlashPill("busy", "preparando");
      await pb.exclusiveAccess(1); // EXCLUSIVE
      await pb.exitXip();

      const { base, image } = currentFirmware.uf2;
      const total = image.length;

      // --- Borrado ---
      setFlashPill("busy", "borrando");
      flashLog(`Borrando ${(total / 1024).toFixed(0)} KB de flash…`, "info");
      for (let off = 0; off < total; off += ERASE_CHUNK) {
        const size = Math.min(ERASE_CHUNK, total - off);
        // El tamaño de borrado debe ser múltiplo de sector.
        const eraseSize = Math.ceil(size / SECTOR) * SECTOR;
        await pb.flashErase(base + off, eraseSize);
        setFlashProgress((off / total) * 40, "Borrando");
      }

      // --- Escritura ---
      setFlashPill("busy", "escribiendo");
      flashLog("Escribiendo firmware…", "info");
      for (let off = 0; off < total; off += WRITE_CHUNK) {
        const size = Math.min(WRITE_CHUNK, total - off);
        let chunk = image.subarray(off, off + size);
        // Cada escritura debe ser múltiplo de 256 bytes.
        if (chunk.length % 256 !== 0) {
          const padded = new Uint8Array(Math.ceil(chunk.length / 256) * 256).fill(0xff);
          padded.set(chunk);
          chunk = padded;
        }
        await pb.flashWrite(base + off, chunk);
        setFlashProgress(40 + (off / total) * 60, "Escribiendo");
      }
      setFlashProgress(100, "Completado");

      // --- Reinicio ---
      flashLog("Reiniciando dispositivo…", "info");
      try {
        await pb.reboot(0, 0, 500);
      } catch (e) {
        /* al reiniciar el dispositivo se desconecta; es normal */
      }
      setFlashPill("ok", "completado");
      flashLog("✓ Firmware flasheado. Cerberus debería reiniciar solo.", "success");
    } catch (err) {
      console.error(err);
      setFlashPill("err", "error");
      if (err && err.name === "NotFoundError") {
        flashLog(
          "No se seleccionó ningún dispositivo. ¿La Pico está en modo BOOTSEL?",
          "warning",
        );
      } else {
        flashLog("Error: " + (err && err.message ? err.message : err), "danger");
      }
    } finally {
      if (pb) {
        try {
          await pb.close();
        } catch (e) {}
      }
      btn.disabled = false;
    }
  }

  // ===========================================================================
  //  Firmware: releases de GitHub + descarga
  // ===========================================================================
  let releasesData = [];
  let firmwareSource = null; // "manifest" (same-origin) | "api" (solo listado)

  function humanSize(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / 1024 / 1024).toFixed(2) + " MB";
  }

  async function sha256Hex(buffer) {
    const hash = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  let fwEntries = []; // lista plana: una entrada por versión (.uf2)

  function buildEntries() {
    fwEntries = [];
    releasesData.forEach((r) => {
      (r.assets || []).forEach((a) => {
        fwEntries.push({
          releaseName: r.name || r.tag,
          tag: r.tag,
          prerelease: !!r.prerelease,
          name: a.name,
          size: a.size,
          sha256: a.sha256 || null,
          path: a.path || null, // same-origin (manifest del sitio)
          url: a.url || null, // asset del release (API; bloqueado por CORS)
        });
      });
    });
  }

  function renderVersionSelect() {
    const sel = $("version-select");
    sel.innerHTML = "";
    if (!fwEntries.length) {
      const o = document.createElement("option");
      o.textContent = "Sin firmware \u2014 usa \u201csubir .uf2 propio\u201d";
      sel.appendChild(o);
      sel.disabled = true;
      return;
    }
    fwEntries.forEach((e, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent =
        e.releaseName +
        " \u2014 " +
        e.name +
        " (" +
        humanSize(e.size) +
        ")" +
        (e.prerelease ? " \u00b7 pre" : "");
      sel.appendChild(opt);
    });
    sel.disabled = false;
    sel.value = "0";
    selectFirmware(0); // carga la versión más reciente por defecto
  }

  async function selectFirmware(idx) {
    const e = fwEntries[idx];
    if (!e) return;
    const status = $("fw-status");
    $("btn-flash").disabled = true;
    if (status) status.textContent = "descargando\u2026";
    try {
      let buffer;
      if (e.path) {
        // Descarga same-origin desde el espejo del sitio (fiable + \u00edntegro).
        const res = await fetch("../" + e.path, { cache: "no-cache" });
        if (!res.ok)
          throw new Error(
            "No se pudo leer el firmware del sitio (" + res.status + ").",
          );
        buffer = await res.arrayBuffer();
        if (e.sha256) {
          const sha = await sha256Hex(buffer);
          if (sha !== e.sha256)
            throw new Error(
              "El SHA-256 no coincide con el manifest (firmware corrupto). Abortado.",
            );
        }
      } else {
        // Modo API: el binario del release bloquea CORS; no usamos proxies.
        throw new Error(
          "El espejo de firmware no est\u00e1 disponible (ejecuta el Action " +
            "mirror-firmware). Usa \u201csubir .uf2 propio\u201d.",
        );
      }
      await useFirmware(e.name, buffer);
      if (status) status.textContent = "\u2713 verificado (SHA-256)";
    } catch (err) {
      console.error(err);
      if (status) status.textContent = "";
      flashLog("Firmware: " + err.message, "danger");
      alert(err.message);
    }
  }

  async function loadReleases() {
    const sel = $("version-select");
    // 1) Fuente principal: espejo same-origin (fiable e \u00edntegro).
    try {
      const res = await fetch(FIRMWARE_MANIFEST, { cache: "no-cache" });
      if (res.ok) {
        const m = await res.json();
        releasesData = (m.releases || []).filter((r) => (r.assets || []).length);
        if (releasesData.length) {
          firmwareSource = "manifest";
          buildEntries();
          renderVersionSelect();
          return;
        }
      }
    } catch (e) {
      /* sin espejo; probamos la API solo para listar */
    }
    // 2) Respaldo: API de GitHub (solo listado; la descarga la bloquea CORS,
    //    as\u00ed que en este modo hay que usar la subida manual).
    try {
      const res = await fetch(RELEASES_API, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!res.ok) throw new Error("GitHub API " + res.status);
      const data = await res.json();
      releasesData = (Array.isArray(data) ? data : [])
        .map((r) => ({
          name: r.name || r.tag_name,
          tag: r.tag_name,
          prerelease: r.prerelease,
          assets: (r.assets || [])
            .filter((a) => /\.uf2$/i.test(a.name))
            .map((a) => ({
              name: a.name,
              size: a.size,
              url: a.browser_download_url,
            })),
        }))
        .filter((r) => r.assets.length);
      firmwareSource = "api";
      buildEntries();
      renderVersionSelect();
    } catch (e) {
      console.warn("Releases:", e);
      fwEntries = [];
      renderVersionSelect();
      if (sel) sel.innerHTML = "<option>No se pudo cargar la lista</option>";
    }
  }

  async function useFirmware(name, buffer) {
    let uf2;
    try {
      uf2 = parseUF2(buffer);
    } catch (e) {
      flashLog("UF2 inválido: " + e.message, "danger");
      alert("UF2 inválido: " + e.message);
      return;
    }
    currentFirmware = { name, buffer, uf2 };
    const sha = await sha256Hex(buffer);
    $("fw-name").textContent = name;
    $("fw-size").textContent = humanSize(buffer.byteLength);
    $("fw-blocks").textContent = String(uf2.blocks);
    $("fw-range").textContent =
      "0x" +
      uf2.minAddr.toString(16).toUpperCase() +
      " – 0x" +
      uf2.maxEnd.toString(16).toUpperCase();
    $("fw-sha").textContent = sha;
    $("fw-info").hidden = false;
    $("btn-flash").disabled = false;
    flashLog(`Firmware listo: ${name} (${humanSize(buffer.byteLength)}).`, "success");
  }

  // ===========================================================================
  //  Reinicio a BOOTSEL (toque 1200 bps)
  // ===========================================================================
  async function rebootToBootsel() {
    const status = $("bootsel-status");
    if (!hasWebSerial) {
      status.textContent = "Web Serial no disponible.";
      return;
    }
    const btn = $("btn-bootsel");
    btn.disabled = true;
    status.textContent = "selecciona el puerto de Cerberus…";
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 1200 });
      try {
        await port.setSignals({ dataTerminalReady: false });
      } catch (e) {}
      await sleep(120);
      await port.close();
      status.textContent = "orden enviada; la Pico debería aparecer como RPI-RP2.";
    } catch (e) {
      status.textContent =
        e && e.name === "NotFoundError"
          ? "no se seleccionó puerto."
          : "error: " + (e.message || e);
    } finally {
      btn.disabled = false;
    }
  }

  // ===========================================================================
  //  INSPECTOR (Web Serial)
  // ===========================================================================
  const SEV = {
    danger: [
      /\[!!!\]/,
      /\[!!\].*(USB Killer|HID)/i,
      /AUTOMATED TYPING/i,
      /SUSPICIOUS/i,
      /USB Killer/i,
      /WIPE ERROR/i,
    ],
    warning: [/\[!!\]/, /\[!\]/, /WIPING|WIPE|DELETING/i, /AUTO \d/i],
    success: [/\[\+\+\]/, /WIPE DONE/i, /Ready|OK|mounted/i],
    info: [/\[\+\]/, /Device attached/i, /VID/i, /Version:/i],
    dim: [/Device removed/i, /released/i],
  };

  // Líneas que NO son keystrokes (estado/forense/log).
  const STATUS_RE =
    /^\s*(\[|=+|-{3,}|Read LBA|Write LBA|Device (attached|removed)|VID|Version:|Uptime|HID (Events|Speed)|Speed Alert|Verbose|Hexdump|Connected|Class|Manufacturer|Product|Serial|Timestamp|Reason|Max Speed|BTN_|MOUSE:|HID device|Mass Device|No device|=== )/i;

  const ATTACK_PATTERNS = [
    [/GUI\+.*r/i, "WIN+R (Ejecutar)", "danger"],
    [/GUI\+.*x/i, "WIN+X (Power)", "warning"],
    [/CTRL\+.*ALT\+/i, "CTRL+ALT", "warning"],
    [/(cmd|powershell|pwsh)/i, "Acceso a shell", "danger"],
    [/(Invoke-WebRequest|IWR|wget|curl)/i, "Descarga remota", "danger"],
    [/(IEX|Invoke-Expression)/i, "Ejecución de código", "danger"],
    [/(base64|-enc)/i, "Comando codificado", "danger"],
    [/(net user|net localgroup)/i, "Manipulación de usuarios", "danger"],
    [/(schtasks|reg add)/i, "Persistencia", "danger"],
  ];

  function severityOf(line) {
    for (const [sev, arr] of Object.entries(SEV)) {
      for (const re of arr) if (re.test(line)) return sev;
    }
    return null;
  }

  const serial = {
    port: null,
    reader: null,
    writer: null,
    keepReading: false,
    lineBuf: "",
    keystrokeBuffer: "",
    detected: new Set(),
    duckyLines: [],
  };

  function serialSetConnected(connected) {
    $("serial-pill").dataset.state = connected ? "ok" : "idle";
    $("serial-pill").textContent = connected ? "conectado" : "desconectado";
    $("btn-connect-serial").disabled = connected;
    $("btn-disconnect-serial").disabled = !connected;
    $("cmd-input").disabled = !connected;
    $("cmd-send").disabled = !connected;
    document
      .querySelectorAll("#quick-cmds .cw-chip")
      .forEach((c) => (c.disabled = !connected));
  }

  function appendSerialLine(text, kind) {
    const log = $("serial-log");
    const nearBottom =
      log.scrollHeight - log.scrollTop - log.clientHeight < 40;

    const span = document.createElement("span");
    span.className = "cw-line";
    const sev = kind === "tx" ? "tx" : kind === "sys" ? "sys" : severityOf(text);
    if (sev) span.classList.add("cw-sev-" + sev);

    const ts = document.createElement("span");
    ts.className = "cw-ts";
    const d = new Date();
    ts.textContent =
      "[" +
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0") +
      ":" +
      String(d.getSeconds()).padStart(2, "0") +
      "]";
    span.appendChild(ts);
    span.appendChild(document.createTextNode((kind === "tx" ? "» " : "") + text));

    // Metadatos para filtro/búsqueda
    span.dataset.text = text.toLowerCase();
    span.dataset.sev = sev || "";
    log.appendChild(span);

    applyFilterToLine(span);
    if (nearBottom) log.scrollTop = log.scrollHeight;
  }

  function processIncomingLine(line) {
    appendSerialLine(line, "rx");
    // Reconstrucción de keystrokes / análisis de payload
    if (line.trim() && !STATUS_RE.test(line)) {
      const looksKeystroke =
        /GUI\+|ALT\+|CTRL\+|SHIFT\+|<[A-Z0-9]+>/.test(line) ||
        (/[A-Za-z0-9 ]/.test(line) && line.length < 200);
      if (looksKeystroke) {
        serial.keystrokeBuffer += line + "\n";
        if (serial.keystrokeBuffer.length > 8000)
          serial.keystrokeBuffer = serial.keystrokeBuffer.slice(-8000);
        serial.duckyLines.push(line);
        checkAttackPatterns();
        renderKeystrokes();
      }
    }
    // Velocidad de tecleo
    const m = line.match(/([\d.]+)\s*(keys\/sec|k\/s)/i);
    if (m) $("hid-speed").textContent = parseFloat(m[1]).toFixed(1) + " k/s";
  }

  function checkAttackPatterns() {
    for (const [re, name, sev] of ATTACK_PATTERNS) {
      if (re.test(serial.keystrokeBuffer) && !serial.detected.has(name)) {
        serial.detected.add(name);
        renderBadge(name, sev);
      }
    }
  }

  function renderBadge(name, sev) {
    const box = $("attack-badges");
    if (box.querySelector(".cw-muted")) box.innerHTML = "";
    const b = document.createElement("span");
    b.className = "cw-badge cw-badge--" + (sev === "danger" ? "danger" : "warning");
    b.textContent = name;
    box.appendChild(b);
  }

  function renderKeystrokes() {
    const el = $("keystroke-buffer");
    el.textContent = serial.keystrokeBuffer.slice(-400);
    el.scrollTop = el.scrollHeight;
  }

  // Filtro + búsqueda
  function currentFilterRe() {
    const val = $("filter-select").value;
    switch (val) {
      case "alerts":
        return { sevSet: ["danger", "warning"] };
      case "hid":
        return { re: /HID|GUI\+|ALT\+|CTRL\+|<[A-Z]/i };
      case "devices":
        return { re: /Device|VID|Mass|mounted/i };
      case "suspicious":
        return { re: /\[!!!\]|SUSPICIOUS|AUTO|Killer/i };
      case "commands":
        return { re: /^\s*»|^\s*\[/ };
      default:
        return null;
    }
  }

  function applyFilterToLine(span) {
    const filter = currentFilterRe();
    const search = $("search-input").value.trim().toLowerCase();
    let show = true;
    if (filter) {
      if (filter.sevSet) show = filter.sevSet.includes(span.dataset.sev);
      else if (filter.re) show = filter.re.test(span.textContent);
    }
    if (show && search) show = span.dataset.text.includes(search);
    span.style.display = show ? "" : "none";
  }

  function applyFilterAll() {
    document
      .querySelectorAll("#serial-log .cw-line")
      .forEach((s) => applyFilterToLine(s));
  }

  async function connectSerial() {
    if (!hasWebSerial) {
      appendSerialLine("Web Serial no está disponible en este navegador.", "sys");
      return;
    }
    try {
      serial.port = await navigator.serial.requestPort();
      await serial.port.open({ baudRate: 115200 });
      serial.writer = serial.port.writable.getWriter();
      serialSetConnected(true);
      appendSerialLine("— Conectado a Cerberus (115200 baud) —", "sys");
      readLoop();
    } catch (e) {
      if (e && e.name === "NotFoundError") {
        appendSerialLine("No se seleccionó ningún puerto.", "sys");
      } else {
        appendSerialLine("Error de conexión: " + (e.message || e), "sys");
      }
    }
  }

  async function readLoop() {
    serial.keepReading = true;
    const decoder = new TextDecoder();
    while (serial.port && serial.port.readable && serial.keepReading) {
      serial.reader = serial.port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await serial.reader.read();
          if (done) break;
          if (value) {
            serial.lineBuf += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = serial.lineBuf.indexOf("\n")) >= 0) {
              const line = serial.lineBuf.slice(0, idx).replace(/\r$/, "");
              serial.lineBuf = serial.lineBuf.slice(idx + 1);
              processIncomingLine(line);
            }
          }
        }
      } catch (e) {
        // desconexión física u otro; salimos del bucle
        appendSerialLine("Lectura interrumpida: " + (e.message || e), "sys");
      } finally {
        try {
          serial.reader.releaseLock();
        } catch (e) {}
      }
      if (!serial.keepReading) break;
    }
  }

  async function disconnectSerial() {
    serial.keepReading = false;
    try {
      if (serial.reader) await serial.reader.cancel();
    } catch (e) {}
    try {
      if (serial.writer) {
        serial.writer.releaseLock();
        serial.writer = null;
      }
    } catch (e) {}
    try {
      if (serial.port) await serial.port.close();
    } catch (e) {}
    serial.port = null;
    serialSetConnected(false);
    appendSerialLine("— Desconectado —", "sys");
  }

  async function sendCommand(cmd) {
    if (!serial.writer || !cmd) return;
    const data = new TextEncoder().encode(cmd + "\r\n");
    try {
      await serial.writer.write(data);
      appendSerialLine(cmd, "tx");
    } catch (e) {
      appendSerialLine("Error al enviar: " + (e.message || e), "sys");
    }
  }

  // DuckyScript export
  const DUCKY_SPECIAL = {
    "<ENTER>": "ENTER",
    "<TAB>": "TAB",
    "<BACKSPACE>": "BACKSPACE",
    "<ESC>": "ESCAPE",
    "<DEL>": "DELETE",
    "<INSERT>": "INSERT",
    "<HOME>": "HOME",
    "<END>": "END",
    "<PAGEUP>": "PAGEUP",
    "<PAGEDOWN>": "PAGEDOWN",
    "<ARROWUP>": "UP",
    "<ARROWDOWN>": "DOWN",
    "<ARROWLEFT>": "LEFT",
    "<ARROWRIGHT>": "RIGHT",
    "<PRNT>": "PRINTSCREEN",
    "<MENU>": "MENU",
    "<CAPSLOCK>": "CAPSLOCK",
    "<SPACE>": "SPACE",
  };
  for (let i = 1; i <= 12; i++) DUCKY_SPECIAL["<F" + i + ">"] = "F" + i;

  function toDuckyScript(lines) {
    const out = ["REM Generado por Cerberus Web", "DELAY 500"];
    for (const raw of lines) {
      let line = raw;
      // Combinaciones con modificadores: GUI+r, CTRL+ALT+<DEL>, etc.
      if (/^(GUI|CTRL|ALT|SHIFT)\+/.test(line)) {
        // Extrae la cadena de modificadores + tecla final
        const mods = [];
        let rest = line;
        const modMap = { GUI: "GUI", CTRL: "CTRL", ALT: "ALT", SHIFT: "SHIFT" };
        let mm;
        while ((mm = rest.match(/^(GUI|CTRL|ALT|SHIFT)\+/))) {
          mods.push(modMap[mm[1].toUpperCase()]);
          rest = rest.slice(mm[0].length);
        }
        // La tecla final: primer token (especial o un carácter)
        let key = "";
        const sp = rest.match(/^<[A-Z0-9]+>/);
        if (sp) key = DUCKY_SPECIAL[sp[0]] || sp[0].replace(/[<>]/g, "");
        else if (rest.length) key = rest[0]; // letra en minúscula (GUI r)
        out.push((mods.join(" ") + " " + key).trim());
        // Si tras la combinación hay más texto, va como STRING
        const after = sp ? rest.slice(sp[0].length) : rest.slice(1);
        if (after && after.trim()) pushString(out, after);
        continue;
      }
      // Línea de texto normal, posiblemente con especiales intercalados
      pushMixed(out, line);
    }
    return out.join("\n") + "\n";
  }

  function pushMixed(out, line) {
    const re = /<[A-Z0-9]+>/g;
    let last = 0;
    let m;
    while ((m = re.exec(line))) {
      const text = line.slice(last, m.index);
      if (text) pushString(out, text);
      const key = DUCKY_SPECIAL[m[0]];
      if (key) out.push(key);
      last = re.lastIndex;
    }
    const tail = line.slice(last);
    if (tail) pushString(out, tail);
  }

  function pushString(out, text) {
    text = text.replace(/\s+$/, "");
    if (text) out.push("STRING " + text);
  }

  function exportDucky() {
    if (!serial.duckyLines.length) {
      alert("No hay keystrokes capturados todavía.");
      return;
    }
    const script = toDuckyScript(serial.duckyLines);
    downloadText(script, "cerberus-payload.txt");
  }

  function downloadText(text, filename) {
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function saveLog() {
    const lines = Array.from(
      document.querySelectorAll("#serial-log .cw-line"),
    ).map((s) => s.textContent);
    downloadText(lines.join("\n"), "cerberus-log.txt");
  }

  function clearLog() {
    $("serial-log").innerHTML = "";
    serial.keystrokeBuffer = "";
    serial.duckyLines = [];
    serial.detected.clear();
    $("attack-badges").innerHTML =
      '<span class="cw-muted">Sin patrones detectados aún…</span>';
    $("keystroke-buffer").textContent = "";
    $("hid-speed").textContent = "0.0 k/s";
  }

  // ---------------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------------
  function wire() {
    // Flash
    $("version-select").addEventListener("change", (e) =>
      selectFirmware(parseInt(e.target.value, 10)),
    );
    $("file-uf2").addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const buf = await f.arrayBuffer();
      await useFirmware(f.name, buf);
      const st = $("fw-status");
      if (st) st.textContent = "archivo local cargado";
    });
    $("btn-bootsel").addEventListener("click", rebootToBootsel);
    $("btn-flash").addEventListener("click", doFlash);

    // Inspect
    $("btn-connect-serial").addEventListener("click", connectSerial);
    $("btn-disconnect-serial").addEventListener("click", disconnectSerial);
    $("cmd-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const inp = $("cmd-input");
      const v = inp.value.trim();
      if (v) sendCommand(v);
      inp.value = "";
    });
    document.querySelectorAll("#quick-cmds .cw-chip").forEach((chip) => {
      chip.addEventListener("click", () => sendCommand(chip.dataset.cmd));
    });
    $("filter-select").addEventListener("change", applyFilterAll);
    $("search-input").addEventListener("input", applyFilterAll);
    $("btn-clear-log").addEventListener("click", clearLog);
    $("btn-save-log").addEventListener("click", saveLog);
    $("btn-export-ducky").addEventListener("click", exportDucky);

    // Reconexión si el dispositivo desaparece
    if (hasWebSerial && navigator.serial.addEventListener) {
      navigator.serial.addEventListener("disconnect", (e) => {
        if (serial.port && e.target === serial.port) disconnectSerial();
      });
    }
  }

  wire();
  loadReleases();

  // Exponer para pruebas
  window.__cerberus = { parseUF2, toDuckyScript };
})();
