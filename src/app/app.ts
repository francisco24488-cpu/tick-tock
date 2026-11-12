import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistroService, Empresa, Usuario, Registro, QrKioscoActivo } from './services/registro';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  encapsulation: ViewEncapsulation.None
})
export class App implements OnInit, OnDestroy {
  pantallaActual: 'bienvenida' | 'login' | 'registro' | 'dashboard' = 'bienvenida';
  tabAuth: 'login' | 'registro' = 'login';

  usuarioActual: Usuario | null = null;
  sesionIniciada: boolean = false;

  empresa: Empresa = {
    nombre: 'Corporación TickTock',
    sucursal: 'Campus Principal',
    ubicacion: 'Av. Tecnológico #100, Col. Centro',
    codigo: 'TT-2026',
    horario: '08:00 AM - 05:00 PM',
    duracionComidaMinutos: 45,
    habilitarFormEstudiantes: true,
    habilitarReporteHoras: true,
    habilitarReporteInformes: true,
    habilitarReporteCompleto: true
  };

  // Formularios Auth
  formCorreo: string = '';
  formPassword: string = '';
  formNombre: string = '';
  formRol: 'estudiante' | 'admin' = 'estudiante';
  formDepartamento: string = 'General';
  formAvatar: string = '🧑‍💻';
  formEmpresaNombre: string = 'Corporación TickTock';
  formSucursal: string = 'Campus Principal';
  formUbicacion: string = 'Av. Tecnológico #100';
  formHorario: string = '08:00 AM - 05:00 PM';
  formTelefono: string = '';
  formMatricula: string = '';

  // Modal Nuevo Estudiante
  mostrarModalNuevoEstudiante: boolean = false;
  adminNuevoNombre: string = '';
  adminNuevoCorreo: string = '';
  adminNuevoPassword: string = '';
  adminNuevoDept: string = 'General';
  adminNuevoAvatar: string = '🧑‍💻';
  adminNuevoTel: string = '';
  adminNuevoMatricula: string = '';

  // QR & Cámara Real
  mostrarModalQR: boolean = false;
  mostrarModalCamaraMovil: boolean = false;
  codigoGeneradoQR: string = '';
  qrImagenUrl: string = '';
  timestampQRGenerado: number = 0;

  qrKioscoActivo: QrKioscoActivo | null = null;
  codigoEscaneadoManual: string = '';
  escaneandoCamara: boolean = false;
  validandoQR: boolean = false;
  estadoCamaraTexto: string = 'Iniciando cámara...';
  errorModalEscaner: string = '';
  private mediaStream: MediaStream | null = null;
  private scanLoopId: any = null;

  // --- LOS 3 CRONÓMETROS EN VIVO (SEGUNDOS RESTANTES) ---
  tiempoRestanteQR: number = 0;         // 15 min (900s) para escanear QR
  tiempoRestanteActividad: number = 0;  // 10 min (600s) para registrar actividad
  tiempoRestantePausa: number = 0;      // Minutos configurados para comida
  private avisoComida2MinDado: boolean = false;
  private avisoComida1MinDado: boolean = false;

  usuariosSistema: Usuario[] = [];
  registros: Registro[] = [];

  observacionActual: string = '';
  cargandoAccion: boolean = false;

  mostrarModalSalida: boolean = false;
  mostrarModalEmpresa: boolean = false;
  reporteFinalTexto: string = '';

  busquedaEmpleado: string = '';
  filtroEstado: string = 'TODOS';
  mesFiltroReporte: string = new Date().toISOString().substring(0, 7);

  relojHora: string = '00:00:00';
  relojAmPm: string = 'AM';
  relojFecha: string = '';
  private masterTimerId: any;

  mostrarToast: boolean = false;
  mensajeToast: string = '';
  tipoToast: 'exito' | 'alerta' | 'info' = 'exito';

  departamentos = ['General', 'Administración', 'Desarrollo & TI', 'Operaciones', 'Ventas & Marketing', 'Servicio Social'];

  constructor(
    private registroService: RegistroService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarLibreriaQR();
    this.cargarSesionGuardada();
    this.iniciarRelojYCronometros();

    this.registroService.getEmpresaConfig().subscribe({
      next: (cfg) => {
        if (cfg) {
          this.empresa = { ...this.empresa, ...cfg };
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error config empresa:', err)
    });

    this.registroService.getQrKiosco().subscribe({
      next: (qr) => {
        this.qrKioscoActivo = qr || null;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error QR kiosco:', err)
    });

    this.registroService.getRegistros().subscribe({
      next: (data: Registro[]) => {
        this.registros = (data || []).sort((a, b) => (b.timestampEntrada || 0) - (a.timestampEntrada || 0));
        this.recalcularCronometros();
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error registros:', err)
    });

    this.registroService.getUsuarios().subscribe({
      next: (data: Usuario[]) => {
        this.usuariosSistema = data || [];
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error usuarios:', err)
    });
  }

  ngOnDestroy(): void {
    if (this.masterTimerId) clearInterval(this.masterTimerId);
    this.detenerCamara();
  }

  private cargarLibreriaQR(): void {
    if (!(window as any).jsQR && !document.getElementById('jsqr-script')) {
      const script = document.createElement('script');
      script.id = 'jsqr-script';
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }

  // --- RELOJ MAESTRO + ACTUALIZACIÓN DE LOS 3 CRONÓMETROS CADA SEGUNDO ---
  private iniciarRelojYCronometros(): void {
    const tick = () => {
      const ahora = new Date();
      this.relojFecha = ahora.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      let horas = ahora.getHours();
      const mins = ahora.getMinutes().toString().padStart(2, '0');
      const segs = ahora.getSeconds().toString().padStart(2, '0');
      this.relojAmPm = horas >= 12 ? 'PM' : 'AM';
      horas = horas % 12 || 12;
      this.relojHora = `${horas.toString().padStart(2, '0')}:${mins}:${segs}`;

      this.recalcularCronometros();
      this.cdr.detectChanges();
    };

    tick();
    this.masterTimerId = setInterval(tick, 1000);
  }

  private recalcularCronometros(): void {
    const ahoraMs = Date.now();
    const reg = this.registroActivo;

    // 1. Cronómetro de QR (15 minutos = 900 segundos)
    const refQrTs = this.mostrarModalQR && this.timestampQRGenerado
      ? this.timestampQRGenerado
      : (reg?.timestampQR || reg?.timestampEntrada || this.qrKioscoActivo?.timestamp || 0);

    if (refQrTs > 0 && (!reg || !reg.verificadoCamaraMovil)) {
      const restQR = 900 - Math.floor((ahoraMs - refQrTs) / 1000);
      this.tiempoRestanteQR = restQR > 0 ? restQR : 0;
    } else {
      this.tiempoRestanteQR = 0;
    }

    // 2. Cronómetro de Registro de Actividad (10 minutos = 600 segundos)
    if (reg && !this.esActividadRegistrada(reg) && reg.timestampEntrada) {
      const restAct = 600 - Math.floor((ahoraMs - reg.timestampEntrada) / 1000);
      this.tiempoRestanteActividad = restAct > 0 ? restAct : 0;
    } else {
      this.tiempoRestanteActividad = 0;
    }

    // 3. Cronómetro de Comida / Pausa
    if (reg && reg.estado === 'En Pausa' && reg.timestampPausaInicio) {
      const totalSegsComida = (Number(this.empresa.duracionComidaMinutos) || 45) * 60;
      const restPausa = totalSegsComida - Math.floor((ahoraMs - reg.timestampPausaInicio) / 1000);
      this.tiempoRestantePausa = restPausa > 0 ? restPausa : 0;

      if (this.tiempoRestantePausa === 120 && !this.avisoComida2MinDado) {
        this.avisoComida2MinDado = true;
        this.notificar('⏰ ¡Faltan 2 MINUTOS para terminar tu tiempo de comida!', 'alerta');
      } else if (this.tiempoRestantePausa === 60 && !this.avisoComida1MinDado) {
        this.avisoComida1MinDado = true;
        this.notificar('⚠️ ¡Falta 1 MINUTO! Prepárate para presionar Reanudar Turno.', 'alerta');
      }
    } else {
      this.tiempoRestantePausa = 0;
      this.avisoComida2MinDado = false;
      this.avisoComida1MinDado = false;
    }
  }

  formatearSegundos(segundos: number): string {
    const mins = Math.floor(segundos / 60).toString().padStart(2, '0');
    const segs = (segundos % 60).toString().padStart(2, '0');
    return `${mins}:${segs}`;
  }

  esActividadRegistrada(reg?: Registro): boolean {
    if (!reg) return false;
    if (reg.actividadRegistrada) return true;
    return !!reg.observacion && !reg.observacion.toLowerCase().includes('pendiente');
  }

  irAAuth(tab: 'login' | 'registro'): void {
    this.tabAuth = tab;
    this.pantallaActual = tab;
    this.cdr.detectChanges();
  }

  irABienvenida(): void {
    this.pantallaActual = 'bienvenida';
    this.cdr.detectChanges();
  }

  // --- GESTIÓN DE ESTUDIANTES (ADMIN) ---
  abrirModalNuevoEstudiante(): void {
    this.adminNuevoNombre = '';
    this.adminNuevoCorreo = '';
    this.adminNuevoPassword = '';
    this.adminNuevoDept = 'General';
    this.adminNuevoAvatar = '🧑‍💻';
    this.adminNuevoTel = '';
    this.adminNuevoMatricula = '';
    this.mostrarModalNuevoEstudiante = true;
    this.cdr.detectChanges();
  }

  cerrarModalNuevoEstudiante(): void {
    this.mostrarModalNuevoEstudiante = false;
    this.cdr.detectChanges();
  }

  async registrarEstudiantePorAdmin(): Promise<void> {
    if (!this.adminNuevoNombre.trim() || !this.adminNuevoCorreo.trim() || !this.adminNuevoPassword.trim()) {
      this.notificar('Ingresa nombre, correo y contraseña', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const correoNorm = this.adminNuevoCorreo.trim().toLowerCase();

    try {
      const existe = await this.registroService.buscarUsuarioPorCorreo(correoNorm);
      if (existe) {
        this.notificar('Este correo ya está registrado', 'alerta');
        return;
      }

      const nuevoEstudiante: Usuario = {
        nombre: this.adminNuevoNombre.trim(),
        correo: correoNorm,
        password: this.adminNuevoPassword.trim(),
        rol: 'estudiante',
        departamento: this.adminNuevoDept,
        avatar: this.adminNuevoAvatar,
        puesto: 'Estudiante / Colaborador',
        empresaNombre: this.empresa.nombre,
        sucursal: this.empresa.sucursal,
        horario: this.empresa.horario,
        telefono: this.adminNuevoTel.trim(),
        matricula: this.adminNuevoMatricula.trim()
      };

      await this.registroService.registrarUsuario(nuevoEstudiante);
      this.notificar(`✅ Estudiante ${nuevoEstudiante.nombre} registrado correctamente`, 'exito');
      this.mostrarModalNuevoEstudiante = false;
    } catch (error) {
      console.error(error);
      this.notificar('Error al guardar estudiante en Firebase', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  // --- REGISTRO Y LOGIN ---
  async ejecutarRegistro(): Promise<void> {
    if (!this.formNombre.trim() || !this.formCorreo.trim() || !this.formPassword.trim()) {
      this.notificar('Completa los campos obligatorios', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const correoNorm = this.formCorreo.trim().toLowerCase();

    try {
      const existe = await this.registroService.buscarUsuarioPorCorreo(correoNorm);
      if (existe) {
        this.notificar('Este correo ya existe en la plataforma', 'alerta');
        return;
      }

      const nuevoUsuario: Usuario = {
        nombre: this.formNombre.trim(),
        correo: correoNorm,
        password: this.formPassword.trim(),
        rol: this.formRol,
        departamento: this.formDepartamento,
        avatar: this.formAvatar,
        puesto: this.formRol === 'admin' ? 'Administrador General' : 'Estudiante / Colaborador',
        empresaNombre: this.formEmpresaNombre.trim() || this.empresa.nombre,
        sucursal: this.formSucursal.trim() || this.empresa.sucursal,
        horario: this.formHorario.trim() || this.empresa.horario,
        telefono: this.formTelefono.trim(),
        matricula: this.formMatricula.trim()
      };

      if (this.formRol === 'admin') {
        this.empresa.nombre = nuevoUsuario.empresaNombre || this.empresa.nombre;
        this.empresa.sucursal = nuevoUsuario.sucursal || this.empresa.sucursal;
        this.empresa.ubicacion = this.formUbicacion.trim() || this.empresa.ubicacion;
        this.empresa.horario = nuevoUsuario.horario || this.empresa.horario;
        await this.registroService.guardarEmpresaConfig(this.empresa);
      }

      const docRef = await this.registroService.registrarUsuario(nuevoUsuario);
      nuevoUsuario.id = docRef.id;

      this.iniciarSesionUsuario(nuevoUsuario);
      this.notificar('¡Cuenta creada correctamente!', 'exito');
      this.limpiarFormularioAuth();
    } catch (error) {
      console.error(error);
      this.notificar('Error al crear la cuenta', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  async ejecutarLogin(): Promise<void> {
    if (!this.formCorreo.trim() || !this.formPassword.trim()) {
      this.notificar('Ingresa tu correo y contraseña', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const correoBuscado = this.formCorreo.trim().toLowerCase();
    const passBuscada = this.formPassword.trim();

    try {
      let usuario = await this.registroService.buscarUsuarioPorCorreo(correoBuscado);
      if (!usuario) {
        usuario = this.usuariosSistema.find(u => u.correo.toLowerCase() === correoBuscado) || null;
      }

      if (usuario && usuario.password === passBuscada) {
        this.iniciarSesionUsuario(usuario);
        this.notificar(`Bienvenido, ${usuario.nombre}`, 'exito');
        this.limpiarFormularioAuth();
      } else {
        this.notificar('Correo o contraseña incorrectos', 'alerta');
      }
    } catch (error) {
      console.error(error);
      this.notificar('Error al conectar con el servidor', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  iniciarSesionUsuario(usuario: Usuario): void {
    this.usuarioActual = { ...usuario };
    this.sesionIniciada = true;
    this.pantallaActual = 'dashboard';
    localStorage.setItem('ticktock_user', JSON.stringify(this.usuarioActual));
    this.recalcularCronometros();
    this.cdr.detectChanges();
  }

  cerrarSesion(): void {
    this.usuarioActual = null;
    this.sesionIniciada = false;
    this.pantallaActual = 'bienvenida';
    localStorage.removeItem('ticktock_user');
    this.notificar('Sesión cerrada', 'info');
    this.cdr.detectChanges();
  }

  cargarSesionGuardada(): void {
    const raw = localStorage.getItem('ticktock_user');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        if (user && user.nombre && user.rol) {
          this.usuarioActual = user;
          this.sesionIniciada = true;
          this.pantallaActual = 'dashboard';
        }
      } catch {
        localStorage.removeItem('ticktock_user');
      }
    }
  }

  limpiarFormularioAuth(): void {
    this.formNombre = '';
    this.formCorreo = '';
    this.formPassword = '';
  }

  // --- CONFIGURACIÓN DE EMPRESA PERSISTENTE ---
  abrirModalEmpresa(): void {
    this.mostrarModalEmpresa = true;
    this.cdr.detectChanges();
  }

  cerrarModalEmpresa(): void {
    this.mostrarModalEmpresa = false;
    this.cdr.detectChanges();
  }

  async guardarConfiguracionEmpresa(): Promise<void> {
    this.cargandoAccion = true;
    this.cdr.detectChanges();
    try {
      await this.registroService.guardarEmpresaConfig(this.empresa);
      this.notificar('✅ Configuración y habilitaciones guardadas', 'exito');
      this.mostrarModalEmpresa = false;
    } catch (e) {
      console.error(e);
      this.notificar('Error al guardar configuración', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  // --- DETECCIÓN DE TURNO ACTIVO ---
  get registroActivo(): Registro | undefined {
    if (!this.usuarioActual) return undefined;
    const userEmail = (this.usuarioActual.correo || '').toLowerCase();
    const userName = (this.usuarioActual.nombre || '').toLowerCase();
    const userId = this.usuarioActual.id ? String(this.usuarioActual.id) : '';

    return this.registros.find(r =>
      (r.estado === 'En Turno' || r.estado === 'En Pausa') &&
      (
        (userId && String(r.empleadoId) === userId) ||
        (r.empleadoId && String(r.empleadoId).toLowerCase() === userEmail) ||
        (r.empleadoNombre && r.empleadoNombre.toLowerCase() === userName)
      )
    );
  }

  get estaEnTurno(): boolean { return this.registroActivo?.estado === 'En Turno'; }
  get estaEnPausa(): boolean { return this.registroActivo?.estado === 'En Pausa'; }

  private async obtenerIdRealRegistro(reg: Registro): Promise<string | null> {
    if (reg.id && !reg.id.startsWith('temp_')) return reg.id;
    const encontrado = this.registros.find(
      r => r.id && !r.id.startsWith('temp_') && r.timestampEntrada === reg.timestampEntrada
    );
    return encontrado?.id || null;
  }

  // --- GENERAR QR DESDE LA COMPUTADORA DEL ENCARGADO (KIOSCO) ---
  async generarQRKioscoAdmin(): Promise<void> {
    const ahora = Date.now();
    const pin = 'TK-' + Math.floor(100000 + Math.random() * 900000);
    const qrData: QrKioscoActivo = {
      codigo: pin,
      timestamp: ahora,
      generadoPor: this.usuarioActual?.nombre || 'Administrador'
    };

    this.qrKioscoActivo = qrData;
    this.mostrarQRConTemporizador(pin, ahora);
    try {
      await this.registroService.guardarQrKiosco(qrData);
      this.notificar('🖥️ Código QR generado en pantalla (válido por 15 min)', 'exito');
    } catch (e) {
      console.error(e);
    }
    this.cdr.detectChanges();
  }

  // --- MARCAR ENTRADA Y GENERAR QR ---
  async marcarEntrada(): Promise<void> {
    if (!this.usuarioActual || this.estaEnTurno || this.estaEnPausa || this.cargandoAccion) return;

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    const ahora = new Date();
    const ahoraMs = ahora.getTime();
    const mesAno = ahora.toISOString().substring(0, 7);
    const pin = 'TK-' + Math.floor(100000 + Math.random() * 900000);
    const tieneActividadInicial = this.observacionActual.trim().length > 0;
    const textoActividad = tieneActividadInicial
      ? this.observacionActual.trim()
      : 'Pendiente de registrar actividad';

    const nuevo: Registro = {
      id: 'temp_' + ahoraMs,
      empleadoId: String(this.usuarioActual.correo).toLowerCase(),
      empleadoNombre: this.usuarioActual.nombre,
      puesto: this.usuarioActual.puesto || 'Estudiante / Colaborador',
      departamento: this.usuarioActual.departamento || 'General',
      fecha: ahora.toLocaleDateString('es-ES'),
      mesAno,
      horaEntrada: ahora.toLocaleTimeString('es-ES'),
      estado: 'En Turno',
      observacion: textoActividad,
      actividadRegistrada: tieneActividadInicial,
      timestampEntrada: ahoraMs,
      timestampQR: ahoraMs,
      codigoQR: pin,
      verificadoCamaraMovil: false,
      horaEscaneoQR: ''
    };

    this.registros = [nuevo, ...this.registros];
    this.observacionActual = '';
    this.mostrarQRConTemporizador(pin, ahoraMs);
    this.recalcularCronometros();
    this.notificar('🟢 Entrada iniciada. Escanea el QR antes de 15 min.', 'exito');

    try {
      const docRef = await this.registroService.agregarRegistro(nuevo);
      nuevo.id = docRef.id;
    } catch (err) {
      console.error('Error al guardar entrada:', err);
      this.notificar('Error al guardar en la nube', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  verMiQRDeNuevo(): void {
    const reg = this.registroActivo;
    if (!reg || !reg.codigoQR) return;
    this.mostrarQRConTemporizador(reg.codigoQR, reg.timestampQR || reg.timestampEntrada || Date.now());
  }

  private mostrarQRConTemporizador(pin: string, timestampCreacion: number): void {
    this.codigoGeneradoQR = pin;
    this.timestampQRGenerado = timestampCreacion;
    this.qrImagenUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(pin)}`;
    this.mostrarModalQR = true;
    this.recalcularCronometros();
    this.cdr.detectChanges();
  }

  cerrarModalQR(): void {
    this.mostrarModalQR = false;
    this.cdr.detectChanges();
  }

  // --- ESCÁNER CON CÁMARA REAL + VALIDACIÓN ---
  async abrirEscanerCamara(): Promise<void> {
    this.codigoEscaneadoManual = '';
    this.errorModalEscaner = '';
    this.validandoQR = false;
    this.mostrarModalCamaraMovil = true;
    this.escaneandoCamara = true;
    this.estadoCamaraTexto = 'Solicitando permiso de cámara...';
    this.cdr.detectChanges();

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        setTimeout(() => {
          const videoElem = document.getElementById('camera-stream') as HTMLVideoElement;
          if (videoElem && this.mediaStream) {
            videoElem.srcObject = this.mediaStream;
            videoElem.setAttribute('playsinline', 'true');
            videoElem.play().then(() => {
              this.estadoCamaraTexto = 'Apunta directo al código QR de la pantalla...';
              this.cdr.detectChanges();
              this.iniciarDeteccionQR(videoElem);
            }).catch(() => {
              this.estadoCamaraTexto = 'Cámara lista. Si no detecta automático, escribe el PIN abajo.';
              this.cdr.detectChanges();
            });
          }
        }, 250);
      } else {
        this.estadoCamaraTexto = 'Tu navegador no permite cámara directa. Escribe el PIN de la pantalla abajo.';
        this.cdr.detectChanges();
      }
    } catch (e) {
      console.warn('No se pudo abrir la cámara:', e);
      this.estadoCamaraTexto = 'Cámara bloqueada o sin permiso. Escribe el PIN de la computadora abajo.';
      this.cdr.detectChanges();
    }
  }

  private iniciarDeteccionQR(videoElem: HTMLVideoElement): void {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Motor nativo BarcodeDetector (Chrome Android / Desktop)
    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    const detectorNativo = BarcodeDetectorClass
      ? new BarcodeDetectorClass({ formats: ['qr_code'] })
      : null;

    if (this.scanLoopId) clearInterval(this.scanLoopId);

    this.scanLoopId = setInterval(async () => {
      if (!this.escaneandoCamara || this.validandoQR || !videoElem || videoElem.readyState < 2) {
        return;
      }

      // 1. Intentar primero con BarcodeDetector nativo
      if (detectorNativo) {
        try {
          const barcodes = await detectorNativo.detect(videoElem);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            const valor = String(barcodes[0].rawValue).trim().toUpperCase();
            if (valor) {
              this.codigoEscaneadoManual = valor;
              this.cdr.detectChanges();
              await this.validarCodigoEscaner();
              return;
            }
          }
        } catch {
          // Continuar con jsQR
        }
      }

      // 2. Fallback con jsQR
      const jsQRFunc = (window as any).jsQR;
      if (jsQRFunc && ctx && videoElem.videoWidth > 0) {
        canvas.width = videoElem.videoWidth;
        canvas.height = videoElem.videoHeight;
        ctx.drawImage(videoElem, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrDetectado = jsQRFunc(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });

        if (qrDetectado && qrDetectado.data) {
          const valor = String(qrDetectado.data).trim().toUpperCase();
          if (valor) {
            this.codigoEscaneadoManual = valor;
            this.cdr.detectChanges();
            await this.validarCodigoEscaner();
          }
        }
      }
    }, 220);
  }

  detenerCamara(): void {
    if (this.scanLoopId) {
      clearInterval(this.scanLoopId);
      this.scanLoopId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.escaneandoCamara = false;
    this.mostrarModalCamaraMovil = false;
    this.errorModalEscaner = '';
    this.cdr.detectChanges();
  }

  private normalizarPin(valor?: string): string {
    if (!valor) return '';
    return valor.trim().toUpperCase().replace(/^TK-/, '').replace(/\s+/g, '');
  }

  async validarCodigoEscaner(): Promise<void> {
    if (this.validandoQR) return;
    this.errorModalEscaner = '';

    const rawInput = this.codigoEscaneadoManual.trim().toUpperCase();
    const pinIngresado = this.normalizarPin(rawInput);

    if (!pinIngresado) {
      this.errorModalEscaner = '⚠️ Escribe los 6 dígitos del PIN o apunta la cámara al QR.';
      this.notificar('Ingresa el PIN de la pantalla', 'alerta');
      this.cdr.detectChanges();
      return;
    }

    this.validandoQR = true;
    this.cdr.detectChanges();

    try {
      const ahora = new Date();
      const ahoraMs = ahora.getTime();
      const horaExacta = ahora.toLocaleTimeString('es-ES');
      const LIMITE_15_MIN_MS = 15 * 60 * 1000;

      const reg = this.registroActivo;
      const pinRegistro = this.normalizarPin(reg?.codigoQR);
      const pinKiosco = this.normalizarPin(this.qrKioscoActivo?.codigo);

      // Caso 1: Coincide con el código QR del registro activo del estudiante
      if (reg && pinRegistro && (pinIngresado === pinRegistro || pinIngresado.includes(pinRegistro))) {
        if (reg.timestampQR && (ahoraMs - reg.timestampQR > LIMITE_15_MIN_MS)) {
          this.errorModalEscaner = '❌ El código QR caducó (pasaron más de 15 minutos).';
          this.notificar('El código QR ya caducó (límite 15 min)', 'alerta');
          return;
        }

        reg.verificadoCamaraMovil = true;
        reg.horaEscaneoQR = horaExacta;
        const idReal = await this.obtenerIdRealRegistro(reg);
        if (idReal) {
          await this.registroService.actualizarRegistro(idReal, {
            verificadoCamaraMovil: true,
            horaEscaneoQR: horaExacta
          });
        }

        this.detenerCamara();
        this.recalcularCronometros();
        this.notificar(`✅ ¡Código verificado a las ${horaExacta}!`, 'exito');
        return;
      }

      // Caso 2: Coincide con el QR activo proyectado en la computadora del Administrador
      if (this.qrKioscoActivo && pinKiosco && (pinIngresado === pinKiosco || pinIngresado.includes(pinKiosco))) {
        if (ahoraMs - this.qrKioscoActivo.timestamp > LIMITE_15_MIN_MS) {
          this.errorModalEscaner = '❌ El QR de la computadora caducó (más de 15 min). Pide generar uno nuevo.';
          this.notificar('El QR de pantalla ya caducó', 'alerta');
          return;
        }

        if (reg) {
          reg.verificadoCamaraMovil = true;
          reg.horaEscaneoQR = horaExacta;
          reg.codigoQR = this.qrKioscoActivo.codigo;
          const idReal = await this.obtenerIdRealRegistro(reg);
          if (idReal) {
            await this.registroService.actualizarRegistro(idReal, {
              verificadoCamaraMovil: true,
              horaEscaneoQR: horaExacta,
              codigoQR: this.qrKioscoActivo.codigo
            });
          }
          this.detenerCamara();
          this.recalcularCronometros();
          this.notificar(`✅ ¡Asistencia verificada con QR a las ${horaExacta}!`, 'exito');
          return;
        } else if (this.usuarioActual) {
          const tieneAct = this.observacionActual.trim().length > 0;
          const nuevo: Registro = {
            empleadoId: String(this.usuarioActual.correo).toLowerCase(),
            empleadoNombre: this.usuarioActual.nombre,
            puesto: this.usuarioActual.puesto || 'Estudiante / Colaborador',
            departamento: this.usuarioActual.departamento || 'General',
            fecha: ahora.toLocaleDateString('es-ES'),
            mesAno: ahora.toISOString().substring(0, 7),
            horaEntrada: horaExacta,
            estado: 'En Turno',
            observacion: tieneAct ? this.observacionActual.trim() : 'Pendiente de registrar actividad',
            actividadRegistrada: tieneAct,
            timestampEntrada: ahoraMs,
            timestampQR: this.qrKioscoActivo.timestamp,
            codigoQR: this.qrKioscoActivo.codigo,
            verificadoCamaraMovil: true,
            horaEscaneoQR: horaExacta
          };

          await this.registroService.agregarRegistro(nuevo);
          this.observacionActual = '';
          this.detenerCamara();
          this.recalcularCronometros();
          this.notificar(`🟢 ¡Entrada registrada y verificada a las ${horaExacta}!`, 'exito');
          return;
        }
      }

      // Caso 3: Ningún código coincidió
      this.errorModalEscaner = `❌ El código "${rawInput}" no coincide con ningún QR activo.`;
      this.notificar('Código incorrecto. Verifica los dígitos en la computadora.', 'alerta');
    } catch (error) {
      console.error('Error al validar código:', error);
      this.errorModalEscaner = '⚠️ Error de conexión al validar. Intenta de nuevo.';
    } finally {
      this.validandoQR = false;
      this.cdr.detectChanges();
    }
  }

  // --- BOTÓN DE PAUSA COMIDA Y REANUDAR ---
  async conmutarPausa(): Promise<void> {
    const reg = this.registroActivo;
    if (!reg) {
      this.notificar('No tienes un turno activo para pausar', 'alerta');
      return;
    }
    if (this.cargandoAccion) return;

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    const ahora = new Date();
    const horaActual = ahora.toLocaleTimeString('es-ES');
    const pasandoAPausa = reg.estado === 'En Turno';

    const nuevoEstado: 'En Pausa' | 'En Turno' = pasandoAPausa ? 'En Pausa' : 'En Turno';
    const datosActualizar: Partial<Registro> = { estado: nuevoEstado };

    if (pasandoAPausa) {
      reg.estado = 'En Pausa';
      reg.horaPausaInicio = horaActual;
      reg.timestampPausaInicio = ahora.getTime();
      datosActualizar.horaPausaInicio = horaActual;
      datosActualizar.timestampPausaInicio = ahora.getTime();

      const minsComida = Number(this.empresa.duracionComidaMinutos) || 45;
      this.recalcularCronometros();
      this.notificar(`☕ Pausa de comida iniciada (${horaActual}). Tienes ${minsComida} min.`, 'info');
    } else {
      reg.estado = 'En Turno';
      reg.horaPausaFin = horaActual;
      datosActualizar.horaPausaFin = horaActual;

      this.recalcularCronometros();
      this.notificar(`▶️ Turno reanudado a las ${horaActual}.`, 'exito');
    }

    try {
      const idReal = await this.obtenerIdRealRegistro(reg);
      if (idReal) {
        await this.registroService.actualizarRegistro(idReal, datosActualizar);
      }
    } catch (err) {
      console.error('Error al cambiar estado de pausa:', err);
      this.notificar('Error al actualizar el estado de pausa', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  // --- ACTUALIZAR ACTIVIDAD ---
  async actualizarActividad(): Promise<void> {
    const reg = this.registroActivo;
    if (!reg) return;

    if (!this.observacionActual.trim()) {
      this.notificar('Escribe la actividad realizada para guardarla', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    const nuevaActividad = this.observacionActual.trim();
    reg.observacion = nuevaActividad;
    reg.actividadRegistrada = true;
    this.observacionActual = '';
    this.recalcularCronometros();

    try {
      const idReal = await this.obtenerIdRealRegistro(reg);
      if (idReal) {
        await this.registroService.actualizarRegistro(idReal, {
          observacion: nuevaActividad,
          actividadRegistrada: true
        });
      }
      this.notificar('✅ Actividad guardada correctamente', 'exito');
    } catch (e) {
      console.error(e);
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  // --- SALIDA ---
  abrirModalSalida(): void {
    if (!this.registroActivo) return;
    this.reporteFinalTexto = '';
    this.mostrarModalSalida = true;
    this.cdr.detectChanges();
  }

  cerrarModalSalida(): void {
    this.mostrarModalSalida = false;
    this.cdr.detectChanges();
  }

  async confirmarSalida(): Promise<void> {
    const reg = this.registroActivo;
    if (!reg) return;

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    const ahora = new Date();
    const horaSalidaStr = ahora.toLocaleTimeString('es-ES');
    const repFinalStr = this.reporteFinalTexto.trim() || 'Turno concluido sin observaciones adicionales.';

    reg.horaSalida = horaSalidaStr;
    reg.estado = 'Completado';
    reg.totalHoras = 'Jornada Concluida';
    reg.reporteFinal = repFinalStr;

    this.mostrarModalSalida = false;
    this.observacionActual = '';
    this.reporteFinalTexto = '';
    this.recalcularCronometros();

    try {
      const idReal = await this.obtenerIdRealRegistro(reg);
      if (idReal) {
        await this.registroService.actualizarRegistro(idReal, {
          horaSalida: horaSalidaStr,
          estado: 'Completado',
          totalHoras: 'Jornada Concluida',
          reporteFinal: repFinalStr
        });
      }
      this.notificar(`🔴 Salida registrada a las ${horaSalidaStr}`, 'exito');
    } catch (e) {
      console.error(e);
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  // --- EXPORTACIÓN DE REPORTES CSV ---
  exportarSoloHoras(): void {
    if (!this.empresa.habilitarReporteHoras) return;
    let csv = '\uFEFFID,Estudiante,Departamento,Fecha,Hora Entrada,Hora Escaneo QR,Inicio Comida,Fin Comida,Hora Salida,Estado\n';
    this.registrosFiltrados.forEach(r => {
      csv += `"${r.id || ''}","${r.empleadoNombre}","${r.departamento}","${r.fecha}","${r.horaEntrada}","${r.horaEscaneoQR || 'Sin escanear'}","${r.horaPausaInicio || '--'}","${r.horaPausaFin || '--'}","${r.horaSalida || 'En turno'}","${r.estado}"\n`;
    });
    this.descargarArchivoCSV(csv, `Reporte_Horas_${this.mesFiltroReporte}.csv`);
  }

  exportarSoloActividades(): void {
    if (!this.empresa.habilitarReporteInformes) return;
    let csv = '\uFEFFID,Estudiante,Departamento,Fecha,Actividad Inicial,Reporte Final\n';
    this.registrosFiltrados.forEach(r => {
      csv += `"${r.id || ''}","${r.empleadoNombre}","${r.departamento}","${r.fecha}","${(r.observacion || '').replace(/"/g, '""')}","${(r.reporteFinal || '').replace(/"/g, '""')}"\n`;
    });
    this.descargarArchivoCSV(csv, `Reporte_Informes_${this.mesFiltroReporte}.csv`);
  }

  exportarReporteCompleto(): void {
    if (!this.empresa.habilitarReporteCompleto) return;
    let csv = '\uFEFFID,Empresa,Ubicacion,Estudiante,Departamento,Fecha,Entrada,Escaneo QR,Inicio Comida,Fin Comida,Salida,Estado,PIN QR,Actividad,Reporte Final\n';
    this.registrosFiltrados.forEach(r => {
      csv += `"${r.id || ''}","${this.empresa.nombre}","${this.empresa.ubicacion}","${r.empleadoNombre}","${r.departamento}","${r.fecha}","${r.horaEntrada}","${r.horaEscaneoQR || 'Sin escanear'}","${r.horaPausaInicio || '--'}","${r.horaPausaFin || '--'}","${r.horaSalida || 'En turno'}","${r.estado}","${r.codigoQR || ''}","${(r.observacion || '').replace(/"/g, '""')}","${(r.reporteFinal || '').replace(/"/g, '""')}"\n`;
    });
    this.descargarArchivoCSV(csv, `Reporte_Completo_${this.mesFiltroReporte}.csv`);
  }

  private descargarArchivoCSV(contenido: string, nombreArchivo: string): void {
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.notificar('📄 Reporte descargado correctamente', 'exito');
  }

  // --- FILTROS Y LISTAS ---
  get registrosFiltrados(): Registro[] {
    return this.registros.filter(r => {
      const q = this.busquedaEmpleado.toLowerCase();
      const coincideBusqueda =
        (r.empleadoNombre || '').toLowerCase().includes(q) ||
        (r.departamento || '').toLowerCase().includes(q) ||
        (r.observacion || '').toLowerCase().includes(q);
      const coincideEstado = this.filtroEstado === 'TODOS' || r.estado === this.filtroEstado;
      return coincideBusqueda && coincideEstado;
    });
  }

  get misRegistrosEstudiante(): Registro[] {
    if (!this.usuarioActual) return [];
    const userEmail = (this.usuarioActual.correo || '').toLowerCase();
    const userName = (this.usuarioActual.nombre || '').toLowerCase();
    const userId = this.usuarioActual.id ? String(this.usuarioActual.id) : '';

    return this.registros.filter(r =>
      (userId && String(r.empleadoId) === userId) ||
      (r.empleadoId && String(r.empleadoId).toLowerCase() === userEmail) ||
      (r.empleadoNombre && r.empleadoNombre.toLowerCase() === userName)
    );
  }

  get totalEstudiantes(): number { return this.usuariosSistema.filter(u => u.rol === 'estudiante').length; }
  get personalEnTurno(): number { return this.registros.filter(r => r.estado === 'En Turno').length; }
  get personalEnPausa(): number { return this.registros.filter(r => r.estado === 'En Pausa').length; }
  get totalCompletados(): number { return this.registros.filter(r => r.estado === 'Completado').length; }

  eliminarRegistro(id?: string): void {
    if (!id) return;
    this.registros = this.registros.filter(r => r.id !== id);
    if (!id.startsWith('temp_')) {
      this.registroService.eliminarRegistro(id).then(() => this.notificar('Registro eliminado', 'info'));
    }
    this.cdr.detectChanges();
  }

  eliminarUsuario(id?: string): void {
    if (!id) return;
    this.usuariosSistema = this.usuariosSistema.filter(u => u.id !== id);
    this.registroService.eliminarUsuario(id).then(() => this.notificar('Usuario eliminado', 'info'));
    this.cdr.detectChanges();
  }

  notificar(mensaje: string, tipo: 'exito' | 'alerta' | 'info' = 'exito'): void {
    this.mensajeToast = mensaje;
    this.tipoToast = tipo;
    this.mostrarToast = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.mostrarToast = false;
      this.cdr.detectChanges();
    }, 3800);
  }
}