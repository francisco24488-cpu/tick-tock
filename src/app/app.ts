import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistroService, Empresa, Usuario, Registro } from './services/registro';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  encapsulation: ViewEncapsulation.None
})
export class App implements OnInit, OnDestroy {
  pantallaActual: 'bienvenida' | 'login' | 'registro' | 'dashboard' | 'reporteMensual' = 'bienvenida';
  tabAuth: 'login' | 'registro' = 'login';

  usuarioActual: Usuario | null = null;
  sesionIniciada: boolean = false;

  empresa: Empresa = { 
    nombre: 'Corporación TickTock', 
    sucursal: 'Campus Principal', 
    codigo: 'TT-2026', 
    horario: '08:00 AM - 05:00 PM' 
  };

  // Campos de Registro Público
  formCorreo: string = '';
  formPassword: string = '';
  formNombre: string = '';
  formRol: 'estudiante' | 'admin' = 'estudiante';
  formDepartamento: string = 'General';
  formAvatar: string = '🧑‍💻';
  formEmpresaNombre: string = 'Corporación TickTock';
  formSucursal: string = 'Campus Principal';
  formHorario: string = '08:00 AM - 05:00 PM';

  // Registro de Estudiantes por Admin
  mostrarModalNuevoEstudiante: boolean = false;
  adminNuevoNombre: string = '';
  adminNuevoCorreo: string = '';
  adminNuevoPassword: string = '';
  adminNuevoDept: string = 'General';
  adminNuevoAvatar: string = '🧑‍💻';

  usuariosSistema: Usuario[] = [];
  registros: Registro[] = [];

  observacionActual: string = '';
  cargandoAccion: boolean = false;

  // Cronómetro de 10 minutos para actividad pendiente
  tiempoRestanteActividad: number = 0; // segundos
  cronometroTimerId: any = null;

  // Modales
  mostrarModalSalida: boolean = false;
  mostrarModalEmpresa: boolean = false;
  reporteFinalTexto: string = '';

  // Filtros
  busquedaEmpleado: string = '';
  filtroEstado: string = 'TODOS';
  mesFiltroReporte: string = new Date().toISOString().substring(0, 7);

  // Reloj
  relojHora: string = '00:00:00';
  relojAmPm: string = 'PM';
  relojFecha: string = '';
  private timerId: any;

  // Toast
  mostrarToast: boolean = false;
  mensajeToast: string = '';
  tipoToast: 'exito' | 'alerta' | 'info' = 'exito';

  avatares = ['🧑‍💻', '👨‍💼', '👩‍💼', '👑', '📁', '⚙️', '📊', '👤', '🚀', '🧪'];
  departamentos = ['General', 'Administración', 'Desarrollo & TI', 'Operaciones', 'Ventas & Marketing', 'Servicio Social'];

  constructor(
    private registroService: RegistroService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.iniciarReloj();
    this.cargarSesionGuardada();

    this.registroService.getRegistros().subscribe({
      next: (data: Registro[]) => {
        this.registros = data || [];
        this.evaluarCronometroPendiente();
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
    if (this.timerId) clearInterval(this.timerId);
    if (this.cronometroTimerId) clearInterval(this.cronometroTimerId);
  }

  irAAuth(tab: 'login' | 'registro'): void {
    this.tabAuth = tab;
    this.pantallaActual = tab;
  }

  irABienvenida(): void {
    this.pantallaActual = 'bienvenida';
  }

  seleccionarUsuarioDirecto(usuario: Usuario): void {
    this.iniciarSesionUsuario(usuario);
    this.notificar(`Acceso rápido: ${usuario.nombre}`, 'exito');
  }

  // --- ALTA DE ESTUDIANTES POR ADMINISTRADOR ---
  abrirModalNuevoEstudiante(): void {
    this.adminNuevoNombre = '';
    this.adminNuevoCorreo = '';
    this.adminNuevoPassword = '';
    this.adminNuevoDept = 'General';
    this.adminNuevoAvatar = '🧑‍💻';
    this.mostrarModalNuevoEstudiante = true;
  }

  cerrarModalNuevoEstudiante(): void {
    this.mostrarModalNuevoEstudiante = false;
  }

  async registrarEstudiantePorAdmin(): Promise<void> {
    if (!this.adminNuevoNombre.trim() || !this.adminNuevoCorreo.trim() || !this.adminNuevoPassword.trim()) {
      this.notificar('Por favor ingresa nombre, correo y contraseña del estudiante', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const correoNorm = this.adminNuevoCorreo.trim().toLowerCase();

    try {
      const existe = await this.registroService.buscarUsuarioPorCorreo(correoNorm);
      if (existe) {
        this.notificar('Este correo ya está registrado en el sistema', 'alerta');
        this.cargandoAccion = false;
        this.cdr.detectChanges();
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
        horario: this.empresa.horario
      };

      await this.registroService.registrarUsuario(nuevoEstudiante);
      this.notificar(`¡Estudiante ${nuevoEstudiante.nombre} guardado correctamente!`, 'exito');
      this.mostrarModalNuevoEstudiante = false;
    } catch (error) {
      console.error(error);
      this.notificar('Error al guardar el estudiante', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  async ejecutarRegistro(): Promise<void> {
    if (!this.formNombre.trim() || !this.formCorreo.trim() || !this.formPassword.trim()) {
      this.notificar('Completa los campos requeridos', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const correoNorm = this.formCorreo.trim().toLowerCase();

    try {
      const existe = await this.registroService.buscarUsuarioPorCorreo(correoNorm);
      if (existe) {
        this.notificar('Este correo ya existe en la plataforma', 'alerta');
        this.cargandoAccion = false;
        this.cdr.detectChanges();
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
        horario: this.formHorario.trim() || this.empresa.horario
      };

      const docRef = await this.registroService.registrarUsuario(nuevoUsuario);
      nuevoUsuario.id = docRef.id;

      this.iniciarSesionUsuario(nuevoUsuario);
      this.notificar(`¡Cuenta creada! Bienvenido, ${nuevoUsuario.nombre}`, 'exito');
      this.limpiarFormularioAuth();
    } catch (error) {
      console.error(error);
      this.notificar('Error al registrar usuario', 'alerta');
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
        this.notificar('Credenciales incorrectas', 'alerta');
      }
    } catch (error) {
      console.error(error);
      this.notificar('Error al iniciar sesión', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  iniciarSesionUsuario(usuario: Usuario): void {
    this.usuarioActual = { ...usuario };
    this.sesionIniciada = true;
    this.pantallaActual = 'dashboard';
    if (usuario.empresaNombre) this.empresa.nombre = usuario.empresaNombre;
    if (usuario.sucursal) this.empresa.sucursal = usuario.sucursal;
    if (usuario.horario) this.empresa.horario = usuario.horario;
    localStorage.setItem('ticktock_user', JSON.stringify(this.usuarioActual));
  }

  cerrarSesion(): void {
    this.usuarioActual = null;
    this.sesionIniciada = false;
    this.pantallaActual = 'bienvenida';
    localStorage.removeItem('ticktock_user');
    this.notificar('Sesión cerrada correctamente', 'info');
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
          if (user.empresaNombre) this.empresa.nombre = user.empresaNombre;
          if (user.sucursal) this.empresa.sucursal = user.sucursal;
          if (user.horario) this.empresa.horario = user.horario;
        }
      } catch (e) {
        localStorage.removeItem('ticktock_user');
      }
    }
  }

  limpiarFormularioAuth(): void {
    this.formNombre = '';
    this.formCorreo = '';
    this.formPassword = '';
  }

  // --- MARCAJE DE ENTRADA Y CRONÓMETRO DE 10 MINUTOS ---
  get registroActivo(): Registro | undefined {
    if (!this.usuarioActual) return undefined;
    const userId = String(this.usuarioActual.id || this.usuarioActual.correo);
    return this.registros.find(r => 
      (String(r.empleadoId) === userId || r.empleadoNombre === this.usuarioActual?.nombre) && 
      (r.estado === 'En Turno' || r.estado === 'En Pausa')
    );
  }

  get estaEnTurno(): boolean { return this.registroActivo?.estado === 'En Turno'; }
  get estaEnPausa(): boolean { return this.registroActivo?.estado === 'En Pausa'; }

  marcarEntrada(): void {
    if (!this.usuarioActual) return;

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const ahora = new Date();
    const mesAno = ahora.toISOString().substring(0, 7);

    const textoActividad = this.observacionActual.trim() || 'Pendiente de registrar (Tiempo límite: 10 min)';

    const nuevo: Registro = {
      empleadoId: String(this.usuarioActual.id || this.usuarioActual.correo),
      empleadoNombre: this.usuarioActual.nombre,
      puesto: this.usuarioActual.puesto || 'Estudiante / Colaborador',
      departamento: this.usuarioActual.departamento || 'General',
      fecha: ahora.toLocaleDateString('es-ES'),
      mesAno: mesAno,
      horaEntrada: ahora.toLocaleTimeString('es-ES'),
      estado: 'En Turno',
      observacion: textoActividad,
      timestampEntrada: ahora.getTime()
    };

    this.registroService.agregarRegistro(nuevo).then(() => {
      this.notificar(`🟢 Entrada registrada a las ${nuevo.horaEntrada}`, 'exito');
      this.observacionActual = '';
      this.iniciarCronometro10Min(600); // 10 minutos = 600 segs
    }).catch(err => {
      console.error(err);
      this.notificar('Error al guardar marcaje', 'alerta');
    }).finally(() => {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    });
  }

  actualizarActividad(): void {
    const reg = this.registroActivo;
    if (!reg || !reg.id) {
      this.notificar('No hay un turno activo para actualizar', 'alerta');
      return;
    }

    if (!this.observacionActual.trim()) {
      this.notificar('Escribe la actividad realizada para actualizar', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    this.registroService.actualizarRegistro(reg.id, { observacion: this.observacionActual.trim() }).then(() => {
      this.notificar('✅ ¡Actividad registrada con éxito!', 'exito');
      this.observacionActual = '';
      this.detenerCronometro();
    }).catch(err => {
      console.error(err);
      this.notificar('Error al actualizar actividad', 'alerta');
    }).finally(() => {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    });
  }

  iniciarCronometro10Min(segundosIniciales: number): void {
    if (this.cronometroTimerId) clearInterval(this.cronometroTimerId);
    this.tiempoRestanteActividad = segundosIniciales;

    this.cronometroTimerId = setInterval(() => {
      if (this.tiempoRestanteActividad > 0) {
        this.tiempoRestanteActividad--;
        this.cdr.detectChanges();
      } else {
        this.detenerCronometro();
        this.notificar('⚠️ El tiempo de 10 minutos para registrar tu actividad ha expirado.', 'alerta');
      }
    }, 1000);
  }

  detenerCronometro(): void {
    if (this.cronometroTimerId) {
      clearInterval(this.cronometroTimerId);
      this.cronometroTimerId = null;
    }
    this.tiempoRestanteActividad = 0;
  }

  evaluarCronometroPendiente(): void {
    const reg = this.registroActivo;
    if (reg && reg.timestampEntrada && reg.observacion.includes('Pendiente')) {
      const transcurridoSegs = Math.floor((new Date().getTime() - reg.timestampEntrada) / 1000);
      const restante = 600 - transcurridoSegs;
      if (restante > 0) {
        this.iniciarCronometro10Min(restante);
      }
    }
  }

  get cronometroFormateado(): string {
    const mins = Math.floor(this.tiempoRestanteActividad / 60).toString().padStart(2, '0');
    const segs = (this.tiempoRestanteActividad % 60).toString().padStart(2, '0');
    return `${mins}:${segs}`;
  }

  conmutarPausa(): void {
    const reg = this.registroActivo;
    if (!reg || !reg.id) return;

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const horaActual = new Date().toLocaleTimeString('es-ES');
    const esTurno = reg.estado === 'En Turno';

    const datosActualizar: Partial<Registro> = {
      estado: esTurno ? 'En Pausa' : 'En Turno',
      ...(esTurno ? { horaPausaInicio: horaActual } : { horaPausaFin: horaActual })
    };

    this.registroService.actualizarRegistro(reg.id, datosActualizar).then(() => {
      this.notificar(esTurno ? 'Pausa iniciada' : 'Jornada reanudada', 'info');
    }).catch(err => console.error(err)).finally(() => {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    });
  }

  abrirModalSalida(): void {
    const reg = this.registroActivo;
    if (!reg) return;
    this.reporteFinalTexto = '';
    this.mostrarModalSalida = true;
  }

  cerrarModalSalida(): void {
    this.mostrarModalSalida = false;
  }

  confirmarSalida(): void {
    const reg = this.registroActivo;
    if (!reg || !reg.id) return;

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const ahora = new Date();

    const datosActualizar: Partial<Registro> = {
      horaSalida: ahora.toLocaleTimeString('es-ES'),
      estado: 'Completado',
      totalHoras: 'Jornada Concluida',
      reporteFinal: this.reporteFinalTexto.trim() || 'Turno finalizado sin observaciones.'
    };

    this.registroService.actualizarRegistro(reg.id, datosActualizar).then(() => {
      this.notificar(`🔴 Salida registrada a las ${datosActualizar.horaSalida}`, 'exito');
      this.detenerCronometro();
      this.mostrarModalSalida = false;
      this.observacionActual = '';
      this.reporteFinalTexto = '';
    }).catch(err => {
      console.error(err);
      this.notificar('Error al guardar salida', 'alerta');
    }).finally(() => {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    });
  }

  // --- TRES MODALIDADES DE EXPORTACIÓN EN CSV / EXCEL ---
  exportarSoloHoras(): void {
    if (this.registros.length === 0) {
      this.notificar('No hay registros de tiempo para exportar', 'alerta');
      return;
    }
    let csv = "\uFEFFID,Estudiante / Empleado,Departamento,Fecha,Hora Entrada,Hora Pausa,Hora Salida,Estado\n";
    this.registrosFiltrados.forEach(r => {
      csv += `"${r.id || ''}","${r.empleadoNombre}","${r.departamento}","${r.fecha}","${r.horaEntrada}","${r.horaPausaInicio || '--'}","${r.horaSalida || 'En turno'}","${r.estado}"\n`;
    });
    this.descargarArchivoCSV(csv, `Reporte_Horas_TickTock_${this.mesFiltroReporte}.csv`);
    this.notificar('📊 Reporte de Horas descargado con éxito', 'exito');
  }

  exportarSoloActividades(): void {
    if (this.registros.length === 0) {
      this.notificar('No hay informes o actividades para exportar', 'alerta');
      return;
    }
    let csv = "\uFEFFID,Estudiante / Empleado,Departamento,Fecha,Actividad Inicial / Ubicación,Reporte Diario Final\n";
    this.registrosFiltrados.forEach(r => {
      csv += `"${r.id || ''}","${r.empleadoNombre}","${r.departamento}","${r.fecha}","${(r.observacion || '').replace(/"/g, '""')}","${(r.reporteFinal || '').replace(/"/g, '""')}"\n`;
    });
    this.descargarArchivoCSV(csv, `Reporte_Actividades_TickTock_${this.mesFiltroReporte}.csv`);
    this.notificar('📝 Reporte de Actividades descargado con éxito', 'exito');
  }

  exportarReporteCompleto(): void {
    if (this.registros.length === 0) {
      this.notificar('No hay datos para exportar', 'alerta');
      return;
    }
    let csv = "\uFEFFID,Empresa,Estudiante / Empleado,Puesto,Departamento,Fecha,Hora Entrada,Hora Pausa,Hora Salida,Estado,Actividad Inicial / Ubicación,Reporte Diario Final\n";
    this.registrosFiltrados.forEach(r => {
      csv += `"${r.id || ''}","${this.empresa.nombre}","${r.empleadoNombre}","${r.puesto}","${r.departamento}","${r.fecha}","${r.horaEntrada}","${r.horaPausaInicio || '--'}","${r.horaSalida || 'En turno'}","${r.estado}","${(r.observacion || '').replace(/"/g, '""')}","${(r.reporteFinal || '').replace(/"/g, '""')}"\n`;
    });
    this.descargarArchivoCSV(csv, `Reporte_Completo_TickTock_${this.mesFiltroReporte}.csv`);
    this.notificar('📂 Reporte Completo descargado con éxito', 'exito');
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
  }

  get registrosFiltrados(): Registro[] {
    return this.registros.filter(r => {
      const coincideBusqueda = r.empleadoNombre.toLowerCase().includes(this.busquedaEmpleado.toLowerCase()) ||
                              r.departamento.toLowerCase().includes(this.busquedaEmpleado.toLowerCase()) ||
                              (r.observacion && r.observacion.toLowerCase().includes(this.busquedaEmpleado.toLowerCase())) ||
                              (r.reporteFinal && r.reporteFinal.toLowerCase().includes(this.busquedaEmpleado.toLowerCase()));
      const coincideEstado = this.filtroEstado === 'TODOS' || r.estado === this.filtroEstado;
      return coincideBusqueda && coincideEstado;
    });
  }

  get misRegistrosEstudiante(): Registro[] {
    if (!this.usuarioActual) return [];
    const userId = String(this.usuarioActual.id || this.usuarioActual.correo);
    return this.registros.filter(r => String(r.empleadoId) === userId || r.empleadoNombre === this.usuarioActual?.nombre);
  }

  get totalEstudiantes(): number { return this.usuariosSistema.filter(u => u.rol === 'estudiante').length; }
  get personalEnTurno(): number { return this.registros.filter(r => r.estado === 'En Turno').length; }
  get personalEnPausa(): number { return this.registros.filter(r => r.estado === 'En Pausa').length; }
  get totalCompletados(): number { return this.registros.filter(r => r.estado === 'Completado').length; }

  eliminarRegistro(id?: string): void {
    if (!id) return;
    this.registroService.eliminarRegistro(id).then(() => {
      this.notificar('Registro eliminado', 'info');
    });
  }

  eliminarUsuario(id?: string): void {
    if (!id) return;
    this.registroService.eliminarUsuario(id).then(() => {
      this.notificar('Usuario eliminado', 'info');
    });
  }

  iniciarReloj(): void {
    const actualizar = () => {
      const ahora = new Date();
      this.relojFecha = ahora.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      let horas = ahora.getHours();
      const mins = ahora.getMinutes().toString().padStart(2, '0');
      const segs = ahora.getSeconds().toString().padStart(2, '0');
      this.relojAmPm = horas >= 12 ? 'PM' : 'AM';
      horas = horas % 12 || 12;
      this.relojHora = `${horas.toString().padStart(2, '0')}:${mins}:${segs}`;
      this.cdr.detectChanges();
    };
    actualizar();
    this.timerId = setInterval(actualizar, 1000);
  }

  notificar(mensaje: string, tipo: 'exito' | 'alerta' | 'info' = 'exito'): void {
    this.mensajeToast = mensaje;
    this.tipoToast = tipo;
    this.mostrarToast = true;
    setTimeout(() => { this.mostrarToast = false; }, 3500);
  }

  abrirModalEmpresa(): void { this.mostrarModalEmpresa = true; }
  cerrarModalEmpresa(): void { this.mostrarModalEmpresa = false; }
}