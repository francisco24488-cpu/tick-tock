import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistroService, Empresa, Usuario, Registro } from './services/registro';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  // Control de Flujo: 'bienvenida' | 'login' | 'registro' | 'dashboard'
  pantallaActual: 'bienvenida' | 'login' | 'registro' | 'dashboard' = 'bienvenida';
  tabAuth: 'login' | 'registro' = 'login';

  // Sesión de Usuario
  usuarioActual: Usuario | null = null;
  sesionIniciada: boolean = false;

  // Formulario de Autenticación
  formCorreo: string = '';
  formPassword: string = '';
  formNombre: string = '';
  formRol: 'estudiante' | 'admin' = 'estudiante';
  formDepartamento: string = 'General';
  formAvatar: string = '🧑‍💻';

  empresa: Empresa = { 
    nombre: 'TickTock', 
    sucursal: 'Plataforma Global', 
    codigo: 'TT-2026', 
    horario: '08:00 AM - 06:00 PM' 
  };

  usuariosSistema: Usuario[] = [];
  registros: Registro[] = [];

  // Marcaje de Tiempo
  observacionActual: string = '';
  cargandoAccion: boolean = false;

  // Filtros Administrador
  busquedaEmpleado: string = '';
  filtroEstado: string = 'TODOS';

  // Reloj Digital
  relojHora: string = '00:00:00';
  relojAmPm: string = 'PM';
  relojFecha: string = '';
  private timerId: any;

  // Notificaciones Toast
  mostrarToast: boolean = false;
  mensajeToast: string = '';
  tipoToast: 'exito' | 'alerta' | 'info' = 'exito';

  // Modales
  mostrarModalEmpresa: boolean = false;

  avatares = ['🧑‍💻', '👨‍💼', '👩‍💼', '👑', '📁', '⚙️', '📊', '👤'];
  departamentos = ['General', 'Administración', 'Desarrollo & TI', 'Operaciones', 'Ventas & Marketing'];

  constructor(
    private registroService: RegistroService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.iniciarReloj();
    this.cargarSesionGuardada();

    // Sincronización en tiempo real con Cloud Firestore
    this.registroService.getRegistros().subscribe({
      next: (data: Registro[]) => {
        this.registros = data || [];
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error registros:', err)
    });

    this.registroService.getUsuarios().subscribe({
      next: (data: Usuario[]) => {
        this.usuariosSistema = data || [];
      },
      error: (err: any) => console.error('Error usuarios:', err)
    });
  }

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
  }

  // --- NAVEGACIÓN Y SESIÓN ---
  irAAuth(tab: 'login' | 'registro'): void {
    this.tabAuth = tab;
    this.pantallaActual = tab;
  }

  irABienvenida(): void {
    this.pantallaActual = 'bienvenida';
  }

  async ejecutarRegistro(): Promise<void> {
    if (!this.formNombre.trim() || !this.formCorreo.trim() || !this.formPassword.trim()) {
      this.notificar('Por favor completa todos los campos requeridos', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    try {
      const existe = await this.registroService.buscarUsuarioPorCorreo(this.formCorreo);
      if (existe) {
        this.notificar('Este correo ya está registrado en TickTock', 'alerta');
        this.cargandoAccion = false;
        return;
      }

      const nuevoUsuario: Usuario = {
        nombre: this.formNombre.trim(),
        correo: this.formCorreo.trim().toLowerCase(),
        password: this.formPassword.trim(),
        rol: this.formRol,
        departamento: this.formDepartamento,
        avatar: this.formAvatar,
        puesto: this.formRol === 'admin' ? 'Administrador' : 'Colaborador'
      };

      const docRef = await this.registroService.registrarUsuario(nuevoUsuario);
      nuevoUsuario.id = docRef.id;

      this.iniciarSesionUsuario(nuevoUsuario);
      this.notificar(`¡Bienvenido a TickTock, ${nuevoUsuario.nombre}!`, 'exito');
      this.limpiarFormularioAuth();
    } catch (error) {
      console.error(error);
      this.notificar('Error al crear tu cuenta en la nube', 'alerta');
    } finally {
      this.cargandoAccion = false;
    }
  }

  async ejecutarLogin(): Promise<void> {
    if (!this.formCorreo.trim() || !this.formPassword.trim()) {
      this.notificar('Ingresa tu correo y contraseña', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    try {
      const usuario = await this.registroService.buscarUsuarioPorCorreo(this.formCorreo);
      if (!usuario || usuario.password !== this.formPassword.trim()) {
        this.notificar('Credenciales incorrectas', 'alerta');
        this.cargandoAccion = false;
        return;
      }

      this.iniciarSesionUsuario(usuario);
      this.notificar(`Hola de nuevo, ${usuario.nombre}`, 'exito');
      this.limpiarFormularioAuth();
    } catch (error) {
      console.error(error);
      this.notificar('Error al verificar tu cuenta', 'alerta');
    } finally {
      this.cargandoAccion = false;
    }
  }

  iniciarSesionUsuario(usuario: Usuario): void {
    this.usuarioActual = usuario;
    this.sesionIniciada = true;
    this.pantallaActual = 'dashboard';
    localStorage.setItem('ticktock_user', JSON.stringify(usuario));
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
        if (user && user.nombre) {
          this.usuarioActual = user;
          this.sesionIniciada = true;
          this.pantallaActual = 'dashboard';
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

  // --- REGISTRO DE HORAS (FICHAJE) ---
  get registroActivo(): Registro | undefined {
    if (!this.usuarioActual) return undefined;
    const userId = String(this.usuarioActual.id || this.usuarioActual.correo);
    return this.registros.find(r => 
      (String(r.empleadoId) === userId || r.empleadoNombre === this.usuarioActual?.nombre) && 
      (r.estado === 'En Turno' || r.estado === 'En Pausa')
    );
  }

  get estaEnTurno(): boolean {
    return this.registroActivo?.estado === 'En Turno';
  }

  get estaEnPausa(): boolean {
    return this.registroActivo?.estado === 'En Pausa';
  }

  marcarEntrada(): void {
    if (!this.usuarioActual) return;

    this.cargandoAccion = true;
    const ahora = new Date();
    const nuevo: Registro = {
      empleadoId: String(this.usuarioActual.id || this.usuarioActual.correo),
      empleadoNombre: this.usuarioActual.nombre,
      puesto: this.usuarioActual.puesto || 'Colaborador',
      departamento: this.usuarioActual.departamento || 'General',
      fecha: ahora.toLocaleDateString('es-ES'),
      horaEntrada: ahora.toLocaleTimeString('es-ES'),
      estado: 'En Turno',
      observacion: this.observacionActual.trim() || 'Jornada Laboral / Actividad'
    };

    this.registroService.agregarRegistro(nuevo).then(() => {
      this.notificar(`Entrada marcada a las ${nuevo.horaEntrada}`, 'exito');
      this.observacionActual = '';
    }).catch(err => {
      console.error(err);
      this.notificar('Error al guardar marcaje', 'alerta');
    }).finally(() => {
      this.cargandoAccion = false;
    });
  }

  conmutarPausa(): void {
    const reg = this.registroActivo;
    if (!reg || !reg.id) return;

    this.cargandoAccion = true;
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
    });
  }

  marcarSalida(): void {
    const reg = this.registroActivo;
    if (!reg || !reg.id) return;

    this.cargandoAccion = true;
    const ahora = new Date();
    const datosActualizar: Partial<Registro> = {
      horaSalida: ahora.toLocaleTimeString('es-ES'),
      estado: 'Completado',
      totalHoras: 'Jornada Finalizada'
    };

    this.registroService.actualizarRegistro(reg.id, datosActualizar).then(() => {
      this.notificar(`Salida registrada a las ${datosActualizar.horaSalida}`, 'alerta');
    }).catch(err => console.error(err)).finally(() => {
      this.cargandoAccion = false;
    });
  }

  // --- METRICAS Y EXPORTACION ---
  get registrosFiltrados(): Registro[] {
    return this.registros.filter(r => {
      const coincideBusqueda = r.empleadoNombre.toLowerCase().includes(this.busquedaEmpleado.toLowerCase()) ||
                              r.departamento.toLowerCase().includes(this.busquedaEmpleado.toLowerCase()) ||
                              (r.observacion && r.observacion.toLowerCase().includes(this.busquedaEmpleado.toLowerCase()));
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
      this.notificar('Registro eliminado de la base de datos', 'info');
    });
  }

  exportarCSV(): void {
    if (this.registros.length === 0) {
      this.notificar('No hay datos para exportar', 'alerta');
      return;
    }
    let csv = "ID,Usuario,Puesto,Departamento,Fecha,Hora Entrada,Hora Salida,Estado,Actividad\n";
    this.registros.forEach(r => {
      csv += `"${r.id || ''}","${r.empleadoNombre}","${r.puesto}","${r.departamento}","${r.fecha}","${r.horaEntrada}","${r.horaSalida || ''}","${r.estado}","${r.observacion || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_TickTock_Horas_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.notificar('Reporte CSV descargado con éxito', 'exito');
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
    setTimeout(() => { this.mostrarToast = false; }, 3200);
  }

  abrirModalEmpresa(): void { this.mostrarModalEmpresa = true; }
  cerrarModalEmpresa(): void { this.mostrarModalEmpresa = false; }
}