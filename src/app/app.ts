import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistroService, Empresa, Empleado, Registro } from './services/registro';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  vistaActual: 'estudiante' | 'admin' = 'estudiante';

  empresa: Empresa = { 
    nombre: 'Mastache Servicio', 
    sucursal: 'UTNG', 
    codigo: 'UTNG-2026', 
    horario: '02:00 PM - 07:00 PM' 
  };

  empleados: Empleado[] = [
    { id: '1', nombre: 'Francisco Javier González García', puesto: 'Estudiante', departamento: 'Edificio D', avatar: '👨‍🎓', tarifaHora: 0 },
    { id: '2', nombre: 'Ángel Uriel Sánchez Lara', puesto: 'Estudiante', departamento: 'Edificio D', avatar: '👨‍🎓', tarifaHora: 0 },
    { id: '3', nombre: 'Nataly Ramírez Godoy', puesto: 'Estudiante', departamento: 'Edificio D', avatar: '👩‍🎓', tarifaHora: 0 },
    { id: '4', nombre: 'Sofía Valentina Mendoza Castro', puesto: 'Estudiante', departamento: 'Edificio D', avatar: '👩‍🎓', tarifaHora: 0 },
    { id: '5', nombre: 'Carlos Eduardo López Hernández', puesto: 'Estudiante', departamento: 'Edificio D', avatar: '👨‍🎓', tarifaHora: 0 }
  ];

  registros: Registro[] = [];

  empleadoSeleccionadoId: string | number = '1';
  empleadoSeleccionado: Empleado | null = null;
  observacionActual: string = '';

  // Filtros
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
  mostrarModalEmpleado: boolean = false;
  mostrarModalEmpresa: boolean = false;

  nuevoEmpleado = {
    nombre: '',
    puesto: 'Estudiante',
    departamento: 'Edificio D',
    avatar: '👨‍🎓',
    tarifaHora: 0
  };

  avatares = ['👨‍🎓', '👩‍🎓', '🧑‍💻', '📁', '🧹', '📚', '👤'];
  departamentos = ['Edificio D', 'Edificio A', 'Edificio B', 'Biblioteca', 'Laboratorios'];

  constructor(
    private registroService: RegistroService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.iniciarReloj();
    this.alCambiarEmpleado();

    // Sincronización en tiempo real desde Cloud Firestore
    this.registroService.getRegistros().subscribe({
      next: (data: Registro[]) => {
        if (data) {
          this.registros = data;
        }
      },
      error: (err: any) => {
        console.error('Error al conectar con Firestore:', err);
        this.notificar('Error de conexión con Firestore', 'alerta');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  cambiarVista(nuevaVista: 'estudiante' | 'admin'): void {
    this.vistaActual = nuevaVista;
    const rolTexto = nuevaVista === 'admin' ? 'Panel Administrador' : 'Terminal Estudiante';
    this.notificar(`Vista cambiada a: ${rolTexto}`, 'info');
  }

  iniciarReloj(): void {
    const actualizar = () => {
      const ahora = new Date();
      const opcionesFecha: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      };
      this.relojFecha = ahora.toLocaleDateString('es-ES', opcionesFecha);

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
    setTimeout(() => {
      this.mostrarToast = false;
    }, 3000);
  }

  alCambiarEmpleado(): void {
    this.empleadoSeleccionado = this.empleados.find(e => String(e.id) === String(this.empleadoSeleccionadoId)) || null;
  }

  get registroActivo(): Registro | undefined {
    if (!this.empleadoSeleccionado) return undefined;
    return this.registros.find(r => String(r.empleadoId) === String(this.empleadoSeleccionado?.id) && (r.estado === 'En Turno' || r.estado === 'En Pausa'));
  }

  get estaEnTurno(): boolean {
    return this.registroActivo?.estado === 'En Turno';
  }

  get estaEnPausa(): boolean {
    return this.registroActivo?.estado === 'En Pausa';
  }

  marcarEntrada(): void {
    if (!this.empleadoSeleccionado) return;

    const ahora = new Date();
    const nuevo: Registro = {
      empleadoId: this.empleadoSeleccionado.id,
      empleadoNombre: this.empleadoSeleccionado.nombre,
      puesto: this.empleadoSeleccionado.puesto,
      departamento: this.empleadoSeleccionado.departamento,
      fecha: ahora.toLocaleDateString('es-ES'),
      horaEntrada: ahora.toLocaleTimeString('es-ES'),
      estado: 'En Turno',
      observacion: this.observacionActual.trim() || 'Acomodo y clasificación de documentos'
    };

    this.registroService.agregarRegistro(nuevo).then(() => {
      this.notificar(`Entrada registrada para ${this.empleadoSeleccionado?.nombre}`, 'exito');
      this.observacionActual = '';
    }).catch((err: any) => {
      console.error(err);
      this.notificar('Error al guardar en Firebase', 'alerta');
    });
  }

  conmutarPausa(): void {
    const reg = this.registroActivo;
    if (!reg || !reg.id) return;

    const horaActual = new Date().toLocaleTimeString('es-ES');
    const esTurno = reg.estado === 'En Turno';
    const datosActualizar: Partial<Registro> = {
      estado: esTurno ? 'En Pausa' : 'En Turno',
      ...(esTurno ? { horaPausaInicio: horaActual } : { horaPausaFin: horaActual })
    };

    this.registroService.actualizarRegistro(reg.id, datosActualizar).then(() => {
      this.notificar(`Estado actualizado para ${reg.empleadoNombre}`, 'info');
    }).catch((err: any) => console.error(err));
  }

  marcarSalida(): void {
    const reg = this.registroActivo;
    if (!reg || !reg.id) return;

    const ahora = new Date();
    const datosActualizar: Partial<Registro> = {
      horaSalida: ahora.toLocaleTimeString('es-ES'),
      estado: 'Completado',
      totalHoras: 'Turno Finalizado'
    };

    this.registroService.actualizarRegistro(reg.id, datosActualizar).then(() => {
      this.notificar(`Salida registrada para ${reg.empleadoNombre}`, 'alerta');
    }).catch((err: any) => console.error(err));
  }

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
    if (!this.empleadoSeleccionado) return [];
    return this.registros.filter(r => String(r.empleadoId) === String(this.empleadoSeleccionado?.id));
  }

  get totalEmpleados(): number { return this.empleados.length; }
  get personalEnTurno(): number { return this.registros.filter(r => r.estado === 'En Turno').length; }
  get personalEnPausa(): number { return this.registros.filter(r => r.estado === 'En Pausa').length; }
  get totalCompletados(): number { return this.registros.filter(r => r.estado === 'Completado').length; }

  eliminarRegistro(id?: string): void {
    if (!id) return;
    this.registroService.eliminarRegistro(id).then(() => {
      this.notificar('Registro eliminado de Firebase', 'info');
    }).catch((err: any) => console.error(err));
  }

  abrirModalEmpleado(): void { this.mostrarModalEmpleado = true; }
  cerrarModalEmpleado(): void { this.mostrarModalEmpleado = false; }
  abrirModalEmpresa(): void { this.mostrarModalEmpresa = true; }
  cerrarModalEmpresa(): void { this.mostrarModalEmpresa = false; }

  guardarNuevoEmpleado(): void {
    if (!this.nuevoEmpleado.nombre) return;

    const emp: Empleado = {
      id: Date.now().toString(),
      nombre: this.nuevoEmpleado.nombre,
      puesto: this.nuevoEmpleado.puesto,
      departamento: this.nuevoEmpleado.departamento,
      avatar: this.nuevoEmpleado.avatar,
      tarifaHora: 0
    };

    this.empleados.push(emp);
    this.empleadoSeleccionadoId = emp.id;
    this.alCambiarEmpleado();
    this.cerrarModalEmpleado();
    this.notificar(`Estudiante ${emp.nombre} agregado con éxito`, 'exito');
    this.nuevoEmpleado = { nombre: '', puesto: 'Estudiante', departamento: 'Edificio D', avatar: '👨‍🎓', tarifaHora: 0 };
  }

  exportarCSV(): void {
    if (this.registros.length === 0) {
      this.notificar('No hay datos para exportar', 'alerta');
      return;
    }

    let csv = "ID,Estudiante,Puesto,Departamento,Fecha,Hora Entrada,Hora Salida,Estado,Actividad Realizada\n";
    this.registros.forEach(r => {
      csv += `"${r.id || ''}","${r.empleadoNombre}","${r.puesto}","${r.departamento}","${r.fecha}","${r.horaEntrada}","${r.horaSalida || ''}","${r.estado}","${r.observacion || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_Asistencia_UTNG_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.notificar('Reporte CSV generado correctamente', 'exito');
  }
}