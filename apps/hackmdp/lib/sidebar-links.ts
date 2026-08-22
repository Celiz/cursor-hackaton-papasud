import {
  Truck,
  NotebookTabs,
  Mail,
  FileText,
  FileMinus,
  ClipboardList,
  User,
  FileBox,
  Warehouse,
  Banknote,
  List,
  Tag,
  Tags,
  Settings2,
  Workflow,
  Pencil,
  Package,
  Box,
  Archive,
  TrendingUp,
  Landmark,
  Filter,
  Wrench,
  ShoppingBag,
  Briefcase,
  DollarSign,
  Server,
  Users,
  LayoutDashboard,
  PackageSearch,
  MapPin,
  BarChart3,
  HardHat,
  Layers,
  UserCircle,
  Building2,
  Clipboard,
  Hammer,
  Calendar,
  Bell,
  ArrowRightLeft,
  Shield,
  Target,
  Send,
  MailOpen,
  Calculator,
  Receipt,
  CircleDollarSign,
  FileSpreadsheet,
  GitBranch,
  Zap,
  PackageX,
  Scan,
  AlertTriangle,
  ShieldCheck,
  FileCheck,
  Route,
  CalendarClock,
  ClipboardCheck,
  ListChecks,
  Database,
  Globe,
  Star,
  Activity,
  ShoppingCart,
  CreditCard,
  Award,
  Eye,
  History,
  Clock,
  PenTool,
  Dog,
  Heart,
  CalendarCheck,
  CalendarDays,
  ChefHat,
  TestTube,
  Droplet,
  FlaskConical,
  Network,
  Microscope,
  BookOpen,
  FolderOpen,
  ImageIcon,
  Link,
  GraduationCap,
  Home,
  BookOpenCheck,
  Trophy,
  MessageCircle,
  Flame,
  Notebook,
  HandHeart,
  Crown,
  Library,
  Megaphone,
  Radio,
  Headphones,
  Lightbulb,
  Palette,
  Sprout,
  Dna,
  Thermometer,
  Wallet,
  Leaf,
  TreeDeciduous,
  Flower2,
  Beaker,
  Stethoscope,
  Syringe,
  Pill,
  BedDouble,
  Scissors,
  Bug,
  FolderHeart,
  FileSignature,
  CheckCircle2,
  Dumbbell,
  Brain,
  Apple,
  Moon,
  PawPrint,
  Sparkles,
} from "lucide-react";
import type { Modulo } from "./types/roles";
import type { OrgFeatures } from "@studio/erp-core/organizations";

export type SubItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className: string }>;
  permission?: Modulo; // Módulo requerido para ver este subitem
};

export type Item = {
  title: string;
  url?: string;
  icon: React.ComponentType<{ className: string }>;
  badge?: string;
  disabled?: boolean;
  subItems?: SubItem[];
  permission?: Modulo; // Módulo requerido para ver este item
};

export type Section = {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className: string }>;
  items: Item[];
  url?: string; // Direct link — bypasses SecondaryNav, navigates directly
};

export type Project = {
  name: string;
  url: string;
  icon: React.ComponentType<{ className: string }>;
};

export type Event = {
    title: string;
    url: string;
    icon: React.ComponentType<{ className: string }>;
};

export type OrgTipo = 'electromedicina' | 'veterinaria' | 'growshop' | 'estudio' | 'inanna' | 'petshop' | 'other' | 'locus' | 'agro';

// ========================================
// SECCIONES COMPARTIDAS
// ========================================

const SECTION_DASHBOARD: Section = {
  title: "Panel de Control",
  icon: LayoutDashboard,
  items: [
    {
      title: "Dashboard",
      url: `/dashboard`,
      icon: LayoutDashboard,
      permission: 'dashboard'
    },
    {
      title: "Tareas",
      url: `/dashboard/tareas`,
      icon: ClipboardList,
      permission: 'tareas'
    },
    {
      title: "Calendario",
      url: `/dashboard/calendario`,
      icon: CalendarDays,
    },
  ],
};

const SECTION_FACTURACION: Section = {
  title: "Facturación",
  icon: FileText,
  url: `/dashboard/facturacion`,
  items: [
    {
      title: "Facturas",
      url: `/dashboard/facturacion?tab=facturas`,
      icon: FileText,
      permission: 'facturas'
    },
    {
      title: "Notas de Crédito",
      url: `/dashboard/facturacion?tab=notas-credito`,
      icon: FileMinus,
      permission: 'notas_credito'
    },
    {
      title: "Remitos",
      url: `/dashboard/facturacion?tab=remitos`,
      icon: ClipboardList,
      permission: 'facturas'
    },
    {
      title: "IVR",
      url: `/dashboard/facturacion?tab=ivr`,
      icon: List,
      permission: 'facturas'
    },
    {
      title: "Cobros",
      url: `/dashboard/facturacion?tab=cobros`,
      icon: Receipt,
      permission: 'pagos'
    },
    {
      title: "Pagos",
      url: `/dashboard/facturacion?tab=pagos`,
      icon: CreditCard,
      permission: 'pagos'
    },
    {
      title: "Cheques",
      url: `/dashboard/facturacion?tab=cheques`,
      icon: Wallet,
      permission: 'pagos'
    },
    {
      title: "Cuentas Corrientes",
      url: `/dashboard/facturacion?tab=cuentas-corrientes`,
      icon: Banknote,
      permission: 'cuentas_corrientes'
    },
    {
      title: "Retenciones",
      url: `/dashboard/facturacion?tab=retenciones`,
      icon: DollarSign,
      permission: 'pagos'
    },
  ],
};

// SECTION_FINANZAS fusionada en SECTION_FACTURACION (tabs: Cobros, Pagos, Cheques,
// Cuentas Corrientes) — ver /dashboard/facturacion.

const SECTION_CONTABILIDAD: Section = {
  title: "Contabilidad",
  icon: Calculator,
  url: `/dashboard/contabilidad`,
  items: [
    { title: "Plan de Cuentas", url: `/dashboard/contabilidad?tab=plan-cuentas`, icon: List, permission: 'integraciones_bancarias' },
    { title: "Asientos", url: `/dashboard/contabilidad?tab=asientos`, icon: Receipt, permission: 'integraciones_bancarias' },
    { title: "Presupuestos", url: `/dashboard/contabilidad?tab=presupuestos`, icon: CircleDollarSign, permission: 'integraciones_bancarias' },
    { title: "Conciliación", url: `/dashboard/contabilidad?tab=conciliacion`, icon: Banknote, permission: 'integraciones_bancarias' },
    { title: "Integración Bancaria", url: `/dashboard/contabilidad?tab=bancaria`, icon: Building2, permission: 'integraciones_bancarias' },
    { title: "Intercompany", url: `/dashboard/contabilidad?tab=intercompany`, icon: ArrowRightLeft, permission: 'integraciones_bancarias' },
    { title: "Reportes", url: `/dashboard/contabilidad?tab=reportes`, icon: FileSpreadsheet, permission: 'reportes' },
  ],
};

const SECTION_REPORTES: Section = {
  title: "Reportes",
  icon: BarChart3,
  url: `/dashboard/reportes`,
  items: [
    { title: "Analytics", url: `/dashboard/reportes?tab=analytics`, icon: BarChart3, permission: 'reportes' },
    { title: "Ventas", url: `/dashboard/reportes?tab=ventas`, icon: TrendingUp, permission: 'reportes' },
    { title: "Servicios", url: `/dashboard/reportes?tab=servicios`, icon: Wrench, permission: 'reportes' },
    { title: "Impuestos", url: `/dashboard/reportes?tab=impuestos`, icon: Landmark, permission: 'reportes' },
    { title: "Libro IVA", url: `/dashboard/reportes?tab=libro-iva`, icon: Receipt, permission: 'reportes' },
    { title: "Costo Absorbido", url: `/dashboard/reportes?tab=costo-absorbido`, icon: DollarSign, permission: 'reportes' },
  ],
};

const SECTION_CONFIGURACION: Section = {
  title: "Configuración",
  icon: Settings2,
  url: `/dashboard/configuracion`,
  items: [
    { title: "Centro de Config", url: `/dashboard/configuracion?tab=centro`, icon: Settings2, permission: 'configuracion' },
    { title: "Registro de Actividad", url: `/dashboard/configuracion?tab=actividad`, icon: Activity, permission: 'configuracion' },
    { title: "Automatizaciones", url: `/dashboard/configuracion?tab=automatizaciones`, icon: Zap, permission: 'configuracion' },
    { title: "ARCA (Facturación)", url: `/dashboard/configuracion?tab=arca`, icon: Landmark, permission: 'configuracion' },
    { title: "Flujos Aprobación", url: `/dashboard/configuracion?tab=aprobaciones`, icon: GitBranch, permission: 'configuracion' },
    { title: "Audit Trail", url: `/dashboard/configuracion?tab=audit`, icon: History, permission: 'configuracion' },
    { title: "Alertas Config", url: `/dashboard/configuracion?tab=alertas`, icon: Bell, permission: 'configuracion' },
    { title: "Mi Firma", url: `/dashboard/configuracion?tab=mi-firma`, icon: PenTool },
    { title: "Telegram", url: `/dashboard/configuracion?tab=telegram`, icon: MessageCircle, permission: 'configuracion' },
  ],
};

// ========================================
// SECCIONES ELECTROMEDICINA
// ========================================

// Simplified CRM-only section (direct link, no SecondaryNav)
const SECTION_CRM_DIRECTO: Section = {
  title: "CRM",
  icon: Users,
  url: `/dashboard/crm`,
  items: [],
};

const SECTION_VENTAS: Section = {
  title: "Ventas",
  icon: TrendingUp,
  items: [
    {
      title: "CRM",
      url: `/dashboard/crm`,
      icon: Users,
      permission: 'clientes'
    },
    {
      title: "Clientes",
      url: `/dashboard/empresas`,
      icon: Building2,
      permission: 'clientes'
    },
    {
      title: "Contactos",
      url: `/dashboard/contactos`,
      icon: UserCircle,
      permission: 'personas'
    },
    {
      title: "Pipeline",
      url: `/dashboard/crm?tab=pipeline`,
      icon: Workflow,
      permission: 'oportunidades'
    },
    {
      title: "Laboratorios",
      url: `/dashboard/laboratorios`,
      icon: FlaskConical,
      permission: 'clientes'
    },
    {
      title: "KPIs Ventas",
      url: `/dashboard/ventas/kpis`,
      icon: BarChart3,
      badge: "new",
      permission: 'clientes'
    },
    {
      title: "Descuentos",
      url: `/dashboard/descuentos`,
      icon: Tag,
      permission: 'clientes'
    },
    {
      title: "Customer Insights",
      url: `/dashboard/customer-insights`,
      icon: Eye,
      badge: "new",
      permission: 'clientes'
    },
    {
      title: "Alertas Reposición",
      url: `/dashboard/alertas-reposicion`,
      icon: Bell,
      badge: "new",
      permission: 'clientes'
    },
  ],
};

const SECTION_COMERCIAL: Section = {
  title: "Comercial",
  icon: Briefcase,
  items: [
    {
      title: "Hub Comercial",
      url: `/dashboard/comercial`,
      icon: LayoutDashboard,
      permission: 'presupuestos'
    },
    {
      title: "Presupuestos",
      url: `/dashboard/presupuestos`,
      icon: FileText,
      permission: 'presupuestos'
    },
    {
      title: "Listas de Precios",
      url: `/dashboard/productos/listas-precios`,
      icon: Tags,
      permission: 'presupuestos'
    },
  ],
};

const SECTION_COMPRAS: Section = {
  title: "Compras",
  icon: ShoppingCart,
  url: `/dashboard/compras`,
  items: [
    {
      title: "Proveedores",
      url: `/dashboard/compras?tab=proveedores`,
      icon: Building2,
      permission: 'proveedores'
    },
    {
      title: "Listas de Proveedores",
      url: `/dashboard/compras?tab=listas`,
      icon: FileSpreadsheet,
      permission: 'proveedores'
    },
    {
      title: "Órdenes de Compra",
      url: `/dashboard/compras?tab=ordenes`,
      icon: ClipboardList,
      permission: 'proveedores'
    },
    {
      title: "Remitos de Compra",
      url: `/dashboard/compras?tab=remitos`,
      icon: Receipt,
      permission: 'proveedores'
    },
  ],
};

const SECTION_SERVICIO_TECNICO: Section = {
  title: "Servicio Técnico",
  icon: Wrench,
  url: `/dashboard/servicio-tecnico`,
  items: [
    { title: "Órdenes de Servicio", url: `/dashboard/servicio-tecnico?tab=ordenes`, icon: Hammer, permission: 'servicios_tecnicos' },
    { title: "Historial por equipo", url: `/dashboard/servicio-tecnico?tab=historial`, icon: History, permission: 'servicios_tecnicos' },
    { title: "Agenda Técnicos", url: `/dashboard/servicio-tecnico?tab=agenda`, icon: Calendar, permission: 'servicios_tecnicos' },
    { title: "Garantías", url: `/dashboard/servicio-tecnico?tab=garantias`, icon: ShieldCheck, permission: 'servicios_tecnicos' },
    { title: "Instalaciones", url: `/dashboard/servicio-tecnico?tab=instalaciones`, icon: HardHat, permission: 'servicios_tecnicos' },
    { title: "Mantenimiento", url: `/dashboard/servicio-tecnico?tab=mantenimiento`, icon: ClipboardCheck, permission: 'mantenimiento' },
    { title: "Comodatos", url: `/dashboard/servicio-tecnico?tab=comodatos`, icon: Clipboard, permission: 'comodatos' },
  ],
};

const SECTION_EQUIPOS: Section = {
  title: "Equipos",
  icon: Box,
  url: `/dashboard/equipos`,
  items: [
    { title: "Catálogo", url: `/dashboard/equipos?tab=catalogo`, icon: Box, permission: 'equipos' },
    { title: "Unidades", url: `/dashboard/equipos?tab=unidades`, icon: Server, permission: 'equipos_unidades' },
    { title: "Alertas", url: `/dashboard/equipos?tab=alertas`, icon: Bell, permission: 'equipos_unidades' },
    { title: "Fuera del depósito", url: `/dashboard/equipos?tab=fuera`, icon: Truck, permission: 'equipos_unidades' },
    { title: "Movimientos", url: `/dashboard/equipos?tab=movimientos`, icon: ArrowRightLeft, permission: 'equipos_unidades' },
    { title: "Tipos", url: `/dashboard/equipos?tab=tipos`, icon: Tags, permission: 'equipos' },
  ],
};

const SECTION_PRODUCTOS_PRECIOS: Section = {
  title: "Insumos",
  icon: PackageSearch,
  url: `/dashboard/productos`,
  items: [
    { title: "Productos", url: `/dashboard/productos?tab=productos`, icon: PackageSearch, permission: 'productos' },
    { title: "Precios", url: `/dashboard/productos?tab=precios`, icon: DollarSign, permission: 'precios' },
  ],
};

const SECTION_INVENTARIO: Section = {
  title: "Inventario",
  icon: Warehouse,
  url: `/dashboard/inventario`,
  items: [
    { title: "Resumen", url: `/dashboard/inventario?tab=resumen`, icon: LayoutDashboard, permission: 'productos' },
    { title: "Stock", url: `/dashboard/inventario?tab=stock`, icon: Package, permission: 'productos' },
    { title: "Lotes", url: `/dashboard/inventario?tab=lotes`, icon: Scan, permission: 'productos' },
    { title: "Series", url: `/dashboard/inventario?tab=series`, icon: Scan, permission: 'productos' },
    { title: "Depósitos", url: `/dashboard/inventario?tab=depositos`, icon: Warehouse, permission: 'productos' },
    { title: "Bins", url: `/dashboard/inventario?tab=bins`, icon: Box, permission: 'productos' },
    { title: "Movimientos", url: `/dashboard/inventario?tab=movimientos`, icon: ArrowRightLeft, permission: 'productos' },
    { title: "Conteos", url: `/dashboard/inventario?tab=conteos`, icon: ListChecks, permission: 'productos' },
    { title: "Reposición", url: `/dashboard/inventario?tab=reposicion`, icon: AlertTriangle, badge: "new", permission: 'productos' },
  ],
};

const SECTION_BIBLIOTECA: Section = {
  title: "Biblioteca",
  icon: Library,
  url: "/dashboard/biblioteca",
  items: [],
};

const SECTION_REACTIVOS_LAB: Section = {
  title: "Reactivos Lab",
  icon: FlaskConical,
  url: `/dashboard/reactivos-lab`,
  items: [
    { title: "Catálogo Recetas", url: `/dashboard/reactivos-lab?tab=recetas`, icon: BookOpen, permission: 'reactivos_lab' },
    { title: "Consumo Clientes", url: `/dashboard/reactivos-lab?tab=consumo`, icon: Activity, permission: 'reactivos_lab' },
  ],
};

const SECTION_LOGISTICA: Section = {
  title: "Logística",
  icon: Truck,
  url: `/dashboard/logistica-seccion`,
  items: [
    { title: "Hub Logística", url: `/dashboard/logistica-seccion?tab=hub`, icon: Warehouse, permission: 'pedidos' },
    { title: "Pedidos", url: `/dashboard/logistica-seccion?tab=pedidos`, icon: NotebookTabs, permission: 'pedidos' },
    { title: "Entregas", url: `/dashboard/logistica-seccion?tab=entregas`, icon: Truck, permission: 'pedidos' },
  ],
};

const SECTION_REGULATORIO: Section = {
  title: "Regulatorio",
  icon: ShieldCheck,
  url: "/dashboard/regulatorio",
  items: [
    { title: "Panel General", url: "/dashboard/regulatorio?tab=general", icon: ShieldCheck, permission: 'regulatorio' },
    { title: "Registros", url: "/dashboard/regulatorio?tab=registros", icon: FileCheck, permission: 'regulatorio' },
    { title: "Tecnovigilancia", url: "/dashboard/regulatorio?tab=tecnovigilancia", icon: AlertTriangle, permission: 'regulatorio' },
    { title: "Trazabilidad", url: "/dashboard/regulatorio?tab=trazabilidad", icon: Route, permission: 'regulatorio' },
    { title: "Vencimientos", url: "/dashboard/regulatorio?tab=vencimientos", icon: CalendarClock, permission: 'regulatorio' },
    { title: "Documentación", url: "/dashboard/regulatorio?tab=documentacion", icon: FolderOpen, permission: 'regulatorio' },
  ],
};

const SECTION_MARKETING: Section = {
  title: "Marketing",
  icon: Send,
  url: `/dashboard/marketing`,
  items: [
    { title: "Campañas", url: `/dashboard/marketing?tab=campanas`, icon: Send, permission: 'marketing' },
    { title: "Templates", url: `/dashboard/marketing?tab=templates`, icon: FileText, permission: 'marketing' },
    { title: "Suscriptores", url: `/dashboard/marketing?tab=suscriptores`, icon: Users, permission: 'marketing' },
    { title: "Listas", url: `/dashboard/marketing?tab=listas`, icon: List, permission: 'marketing' },
    { title: "Encuestas", url: `/dashboard/marketing?tab=encuestas`, icon: ClipboardCheck, permission: 'marketing' },
  ],
};

const SECTION_COMUNICACIONES: Section = {
  title: "Comunicaciones",
  icon: Mail,
  url: `/dashboard/comunicaciones`,
  items: [
    { title: "Mensajes", url: `/dashboard/comunicaciones?tab=mensajes`, icon: MessageCircle },
    { title: "Bandeja de Entrada", url: `/dashboard/comunicaciones?tab=bandeja`, icon: Mail },
  ],
};

const SECTION_WEB_LANDINGS: Section = {
  title: "Web & Landings",
  icon: Globe,
  url: `/dashboard/web`,
  items: [
    { title: "Catálogo Web", url: `/dashboard/web?tab=catalogo`, icon: Package, permission: 'catalogo_web' },
    { title: "Landings", url: `/dashboard/web?tab=landings`, icon: Layers, permission: 'catalogo_web' },
    { title: "Contenido", url: `/dashboard/web?tab=contenido`, icon: PenTool, permission: 'catalogo_web' },
    { title: "Analytics Web", url: `/dashboard/web?tab=analytics`, icon: BarChart3, permission: 'catalogo_web' },
  ],
};

// ========================================
// SECCIONES VETERINARIA
// ========================================

const VET_SECTION_FICHAS: Section = {
  title: "Fichas",
  icon: Dog,
  items: [
    {
      title: "Clientes",
      url: `/dashboard/vet/clientes`,
      icon: Users,
      permission: 'clientes'
    },
    {
      title: "Pacientes",
      url: `/dashboard/vet/pacientes`,
      icon: Dog,
      permission: 'vet_pacientes'
    },
  ],
};

const VET_SECTION_CLINICA: Section = {
  title: "Clínica",
  icon: Stethoscope,
  items: [
    {
      title: "Agenda",
      url: `/dashboard/vet/agenda`,
      icon: Calendar,
      permission: 'vet_citas'
    },
    {
      title: "Consultas",
      url: `/dashboard/vet/consultas`,
      icon: Stethoscope,
      permission: 'vet_consultas'
    },
    {
      title: "Casos Clínicos",
      url: `/dashboard/vet/casos`,
      icon: FolderHeart,
      permission: 'vet_casos'
    },
    {
      title: "Cirugías",
      url: `/dashboard/vet/cirugias`,
      icon: Scissors,
      permission: 'vet_cirugias'
    },
  ],
};

const VET_SECTION_INTERNACION: Section = {
  title: "Internación",
  icon: BedDouble,
  items: [
    {
      title: "Internación",
      url: `/dashboard/vet/internacion`,
      icon: BedDouble,
      permission: 'vet_internacion'
    },
  ],
};

const VET_SECTION_TRATAMIENTOS: Section = {
  title: "Tratamientos",
  icon: Syringe,
  items: [
    {
      title: "Vacunas",
      url: `/dashboard/vet/vacunas`,
      icon: Syringe,
      permission: 'vet_vacunas'
    },
    {
      title: "Recetas",
      url: `/dashboard/vet/recetas`,
      icon: Pill,
      permission: 'vet_consultas'
    },
    {
      title: "Desparasitaciones",
      url: `/dashboard/vet/desparasitaciones`,
      icon: Bug,
      permission: 'vet_desparasitaciones'
    },
    {
      title: "Protocolos",
      url: `/dashboard/vet/protocolos`,
      icon: ListChecks,
      permission: 'vet_consultas'
    },
  ],
};

const VET_SECTION_SERVICIOS: Section = {
  title: "Servicios",
  icon: Scissors,
  items: [
    {
      title: "Peluquería",
      url: `/dashboard/vet/peluqueria`,
      icon: Scissors,
      permission: 'vet_grooming'
    },
    {
      title: "Bienestar",
      url: `/dashboard/vet/bienestar`,
      icon: Heart,
      permission: 'vet_bienestar'
    },
    {
      title: "Seguimientos",
      url: `/dashboard/vet/seguimientos`,
      icon: CalendarCheck,
      permission: 'vet_seguimientos'
    },
  ],
};

const VET_SECTION_DOCUMENTOS: Section = {
  title: "Documentos",
  icon: FileText,
  items: [
    {
      title: "Presupuestos",
      url: `/dashboard/vet/presupuestos`,
      icon: FileText,
      permission: 'vet_consultas'
    },
    {
      title: "Consentimientos",
      url: `/dashboard/vet/consentimientos`,
      icon: FileSignature,
      permission: 'vet_consultas'
    },
    {
      title: "Órdenes",
      url: `/dashboard/vet/ordenes`,
      icon: ClipboardList,
      permission: 'vet_ordenes'
    },
  ],
};

const VET_SECTION_LABORATORIO: Section = {
  title: "Laboratorio",
  icon: TestTube,
  items: [
    {
      title: "Lista de Trabajo",
      url: `/dashboard/vet/lista-trabajo`,
      icon: ClipboardCheck,
      permission: 'vet_ordenes'
    },
    {
      title: "Estudios",
      url: `/dashboard/vet/estudios`,
      icon: TestTube,
      permission: 'vet_estudios'
    },
    {
      title: "Muestras",
      url: `/dashboard/vet/muestras`,
      icon: Droplet,
      permission: 'vet_muestras'
    },
    {
      title: "Resultados",
      url: `/dashboard/vet/resultados`,
      icon: FlaskConical,
      permission: 'vet_resultados'
    },
    {
      title: "Analizadores LIS",
      url: `/dashboard/vet/analizadores`,
      icon: Microscope,
      permission: 'vet_analizadores'
    },
    {
      title: "Control Calidad",
      url: `/dashboard/vet/qc`,
      icon: Activity,
      permission: 'vet_resultados'
    },
    {
      title: "Panel LIS (demo)",
      url: `/lis`,
      icon: Zap,
      permission: 'vet_resultados'
    },
  ],
};

const VET_SECTION_INVENTARIO: Section = {
  title: "Inventario",
  icon: Warehouse,
  items: [
    {
      title: "Farmacia",
      url: `/dashboard/vet/farmacia`,
      icon: Pill,
      permission: 'vet_farmacia'
    },
    {
      title: "Reactivos",
      url: `/dashboard/vet/reactivos`,
      icon: FlaskConical,
      permission: 'vet_reactivos'
    },
    {
      title: "Proveedores",
      url: `/dashboard/proveedores`,
      icon: Building2,
      permission: 'proveedores'
    },
    {
      title: "Compras",
      url: `/dashboard/vet/compras`,
      icon: ShoppingCart,
      permission: 'proveedores'
    },
    {
      title: "Lista de Compras",
      url: `/dashboard/vet/lista-compras`,
      icon: ListChecks,
      permission: 'proveedores'
    },
  ],
};

const VET_SECTION_VENTAS: Section = {
  title: "Ventas",
  icon: ShoppingBag,
  items: [
    {
      title: "Punto de Venta",
      url: `/dashboard/vet/pos`,
      icon: CreditCard,
      permission: 'vet_pos'
    },
    {
      title: "Productos",
      url: `/dashboard/vet/productos`,
      icon: Package,
      permission: 'vet_productos'
    },
    {
      title: "Cuentas",
      url: `/dashboard/vet/cuentas`,
      icon: Wallet,
      permission: 'vet_ventas'
    },
    {
      title: "Historial de Ventas",
      url: `/dashboard/vet/ventas`,
      icon: Receipt,
      permission: 'vet_ventas'
    },
  ],
};

const VET_SECTION_DERIVACIONES: Section = {
  title: "Derivaciones",
  icon: Network,
  items: [
    {
      title: "Derivaciones",
      url: `/dashboard/vet/derivaciones`,
      icon: Network,
      permission: 'vet_derivaciones'
    },
  ],
};

const VET_SECTION_INFORMES: Section = {
  title: "Informes",
  icon: BarChart3,
  items: [
    {
      title: "Reportes",
      url: `/dashboard/reportes`,
      icon: BarChart3,
      permission: 'reportes'
    },
    {
      title: "Auditoría",
      url: `/dashboard/vet/auditoria`,
      icon: Shield,
      permission: 'vet_auditoria'
    },
  ],
};

const VET_SECTION_REGULATORIO: Section = {
  title: "Regulatorio",
  icon: ShieldCheck,
  items: [
    { title: "Panel General", url: "/dashboard/regulatorio", icon: ShieldCheck },
    { title: "Registros", url: "/dashboard/regulatorio/registros", icon: FileCheck },
    { title: "Trazabilidad", url: "/dashboard/regulatorio/trazabilidad", icon: Route },
    { title: "Vencimientos", url: "/dashboard/regulatorio/vencimientos", icon: CalendarClock },
    { title: "Documentación", url: "/dashboard/regulatorio/documentacion", icon: FolderOpen },
  ],
};

const VET_SECTION_SISTEMA: Section = {
  title: "Sistema",
  icon: Settings2,
  items: [
    {
      title: "Diagnósticos",
      url: `/dashboard/vet/diagnosticos`,
      icon: BookOpen,
      permission: 'vet_diagnosticos'
    },
    {
      title: "Estadísticas",
      url: `/dashboard/vet/estadisticas`,
      icon: BarChart3,
      permission: 'vet_casos'
    },
    {
      title: "Productividad",
      url: `/dashboard/vet/estadisticas/productividad`,
      icon: TrendingUp,
      permission: 'vet_casos'
    },
    {
      title: "Rangos Especie",
      url: `/dashboard/vet/configuracion/rangos`,
      icon: Beaker,
      permission: 'configuracion'
    },
    {
      title: "WhatsApp",
      url: `/dashboard/vet/configuracion/whatsapp`,
      icon: MessageCircle,
      permission: 'configuracion'
    },
    {
      title: "Configuración",
      url: `/dashboard/vet/configuracion`,
      icon: Settings2,
      permission: 'configuracion'
    },
  ],
};

// ========================================
// SECCIONES ESTUDIO DE DISEÑO
// ========================================

const SECTION_PORTFOLIO: Section = {
  title: "Portafolio",
  icon: FolderOpen,
  items: [
    {
      title: "Proyectos",
      url: `/dashboard/proyectos`,
      icon: FolderOpen,
    },
    {
      title: "Imágenes",
      url: `/dashboard/proyectos/imagenes`,
      icon: ImageIcon,
    },
  ],
};

// ========================================
// SECCIONES GROWSHOP
// ========================================

const GROWSHOP_SECTION_VENTAS: Section = {
  title: "Ventas",
  icon: TrendingUp,
  items: [
    {
      title: "Clientes",
      url: `/dashboard/empresas`,
      icon: Building2,
      permission: 'clientes'
    },
    {
      title: "Contactos",
      url: `/dashboard/contactos`,
      icon: UserCircle,
      permission: 'personas'
    },
    {
      title: "Pipeline",
      url: `/dashboard/pipeline-ventas`,
      icon: Workflow,
      permission: 'oportunidades'
    },
    {
      title: "Oportunidades",
      url: `/dashboard/oportunidades`,
      icon: Target,
      permission: 'oportunidades'
    },
    {
      title: "Descuentos",
      url: `/dashboard/descuentos`,
      icon: Tag,
      permission: 'clientes'
    },
    {
      title: "Customer Insights",
      url: `/dashboard/customer-insights`,
      icon: Eye,
      badge: "new",
      permission: 'clientes'
    },
  ],
};

// ========================================
// SECCIONES CANNABIS (Cultivo, Genética, Monitoreo)
// ========================================

const GROWSHOP_SECTION_CULTIVO: Section = {
  title: "Cultivo",
  icon: Sprout,
  items: [
    {
      title: "Salas",
      url: `/dashboard/cannabis/cultivo/salas`,
      icon: Home,
      permission: 'productos'
    },
    {
      title: "Lotes",
      url: `/dashboard/cannabis/cultivo/lotes`,
      icon: Layers,
      permission: 'productos'
    },
  ],
};

const GROWSHOP_SECTION_GENETICA: Section = {
  title: "Genética",
  icon: Dna,
  items: [
    {
      title: "Cepas",
      url: `/dashboard/cannabis/genetica/cepas`,
      icon: Leaf,
      permission: 'productos'
    },
    {
      title: "Cruces",
      url: `/dashboard/cannabis/genetica/cruces`,
      icon: GitBranch,
      permission: 'productos'
    },
    {
      title: "Fenotipos",
      url: `/dashboard/cannabis/genetica/fenotipos`,
      icon: FlaskConical,
      permission: 'productos'
    },
    {
      title: "Líneas Genéticas",
      url: `/dashboard/cannabis/genetica/lineas`,
      icon: TreeDeciduous,
      permission: 'productos'
    },
  ],
};

const GROWSHOP_SECTION_MONITOREO: Section = {
  title: "Monitoreo",
  icon: Thermometer,
  items: [
    {
      title: "Overview",
      url: `/dashboard/cannabis/monitoreo`,
      icon: Activity,
      permission: 'productos'
    },
    {
      title: "Alertas",
      url: `/dashboard/cannabis/monitoreo/alertas`,
      icon: Bell,
      permission: 'productos'
    },
  ],
};

const GROWSHOP_SECTION_INVENTARIO: Section = {
  title: "Inventario",
  icon: Warehouse,
  items: [
    {
      title: "Stock de productos",
      url: `/dashboard/deposito/stock`,
      icon: Package,
      permission: 'productos'
    },
    {
      title: "Productos",
      url: `/dashboard/productos`,
      icon: PackageSearch,
      permission: 'productos'
    },
    {
      title: "Lotes y Series",
      icon: Scan,
      permission: 'productos',
      subItems: [
        {
          title: "Lotes",
          url: `/dashboard/inventario/lotes`,
          icon: Package,
          permission: 'productos'
        },
        {
          title: "Números de Serie",
          url: `/dashboard/inventario/seriales`,
          icon: Scan,
          permission: 'productos'
        },
      ],
    },
    {
      title: "Ubicaciones",
      icon: MapPin,
      permission: 'productos',
      subItems: [
        {
          title: "Depósitos",
          url: `/dashboard/inventario/depositos`,
          icon: Warehouse,
          permission: 'productos'
        },
        {
          title: "Bins",
          url: `/dashboard/inventario/bins`,
          icon: Box,
          permission: 'productos'
        },
      ],
    },
    {
      title: "Movimientos",
      url: `/dashboard/inventario/transferencias`,
      icon: ArrowRightLeft,
      permission: 'productos'
    },
    {
      title: "Conteos",
      url: `/dashboard/inventario/conteos`,
      icon: ListChecks,
      permission: 'productos'
    },
    {
      title: "Reposición Stock",
      url: `/dashboard/reposicion-stock`,
      icon: AlertTriangle,
      badge: "new",
      permission: 'productos'
    },
    {
      title: "Cosechas",
      url: `/dashboard/cannabis/inventario/cosechas`,
      icon: Flower2,
      permission: 'productos'
    },
    {
      title: "Banco de Semillas",
      url: `/dashboard/cannabis/inventario/semillas`,
      icon: Sprout,
      permission: 'productos'
    },
  ],
};

// ========================================
// SECCIONES LOCUS (Hub Personal)
// ========================================

const LOCUS_SECTION_INICIO: Section = {
  title: "Inicio",
  icon: Home,
  items: [
    {
      title: "Mi Vida",
      url: `/dashboard`,
      icon: Home,
    },
  ],
};

const LOCUS_SECTION_VINCULOS: Section = {
  title: "Vínculos",
  subtitle: "Tus conexiones, organizaciones y comunidades",
  icon: Link,
  items: [
    {
      title: "Mis Organizaciones",
      url: `/dashboard/locus/vinculos`,
      icon: Building2,
    },
    {
      title: "Soy Cliente de",
      url: `/dashboard/locus/cliente-de`,
      icon: Users,
    },
    {
      title: "Mis Comunidades",
      url: `/dashboard/locus/vinculos/comunidades`,
      icon: HandHeart,
    },
    {
      title: "Mi Red",
      url: `/dashboard/locus/vinculos/red`,
      icon: Network,
    },
  ],
};

const LOCUS_SECTION_FLUJO: Section = {
  title: "Flujo",
  subtitle: "Tu economía y movimiento de recursos",
  icon: DollarSign,
  items: [
    {
      title: "Resumen Económico",
      url: `/dashboard/locus/flujo`,
      icon: DollarSign,
    },
    {
      title: "Cuentas Corrientes",
      url: `/dashboard/locus/cuentas`,
      icon: Banknote,
    },
    {
      title: "Mis Facturas",
      url: `/dashboard/locus/flujo/facturas`,
      icon: Receipt,
    },
    {
      title: "Compromisos",
      url: `/dashboard/locus/flujo/compromisos`,
      icon: FileSignature,
    },
  ],
};

const LOCUS_SECTION_VITALIDAD: Section = {
  title: "Vitalidad",
  subtitle: "Tu salud integral en 5 dimensiones",
  icon: Heart,
  items: [
    {
      title: "Mi Vitalidad",
      url: `/dashboard/locus/vitalidad`,
      icon: Heart,
    },
    {
      title: "Movimiento",
      url: `/dashboard/locus/vitalidad/movimiento`,
      icon: Dumbbell,
    },
    {
      title: "Mente",
      url: `/dashboard/locus/vitalidad/mente`,
      icon: Brain,
    },
    {
      title: "Nutrición",
      url: `/dashboard/locus/vitalidad/nutricion`,
      icon: Apple,
      subItems: [
        { title: "Dashboard", url: `/dashboard/locus/vitalidad/nutricion`, icon: LayoutDashboard },
        { title: "Progreso", url: `/dashboard/locus/vitalidad/nutricion/progreso`, icon: TrendingUp },
        { title: "Plan Semanal", url: `/dashboard/locus/vitalidad/nutricion/plan-semanal`, icon: CalendarDays },
        { title: "Recetas", url: `/dashboard/locus/vitalidad/nutricion/recetas`, icon: ChefHat },
        { title: "Mi Perfil", url: `/dashboard/locus/vitalidad/nutricion/perfil`, icon: UserCircle },
      ],
    },
    {
      title: "Descanso",
      url: `/dashboard/locus/vitalidad/descanso`,
      icon: Moon,
    },
    {
      title: "Biomarkers",
      url: `/dashboard/locus/vitalidad/biomarkers`,
      icon: FlaskConical,
    },
  ],
};

const LOCUS_SECTION_MASCOTAS: Section = {
  title: "Mis Mascotas",
  subtitle: "Salud y bienestar de tus mascotas",
  icon: PawPrint,
  url: `/dashboard/locus/mascotas`,
  items: [],
};

const LOCUS_SECTION_ALERTAS: Section = {
  title: "Alertas",
  subtitle: "Recordatorios y avisos",
  icon: Bell,
  url: `/dashboard/locus/alertas`,
  items: [],
};

const LOCUS_SECTION_EPIDEMIOLOGIA: Section = {
  title: "Epidemiología",
  icon: Activity,
  items: [
    {
      title: "Resumen",
      url: `/dashboard/locus/epidemiologia`,
      icon: BarChart3,
    },
    {
      title: "Por Zona",
      url: `/dashboard/locus/epidemiologia/zonas`,
      icon: MapPin,
    },
    {
      title: "Diagnósticos",
      url: `/dashboard/locus/epidemiologia/diagnosticos`,
      icon: Microscope,
    },
    {
      title: "Laboratorio",
      url: `/dashboard/locus/epidemiologia/laboratorio`,
      icon: TestTube,
    },
    {
      title: "Alertas",
      url: `/dashboard/locus/epidemiologia/alertas`,
      icon: AlertTriangle,
    },
  ],
};

const LOCUS_SECTION_CONOCIMIENTO: Section = {
  title: "Conocimiento",
  subtitle: "Tu formación, aprendizaje y crecimiento",
  icon: GraduationCap,
  items: [
    {
      title: "Mi Formación",
      url: `/dashboard/locus/conocimiento`,
      icon: GraduationCap,
    },
    {
      title: "Mi Desarrollo",
      url: `/dashboard/locus/conocimiento/desarrollo`,
      icon: TrendingUp,
    },
    {
      title: "Mi Biblioteca",
      url: `/dashboard/locus/conocimiento/biblioteca`,
      icon: Library,
    },
    {
      title: "Mentorías",
      url: `/dashboard/locus/conocimiento/mentorias`,
      icon: Lightbulb,
    },
  ],
};

const LOCUS_SECTION_CREACION: Section = {
  title: "Creación",
  subtitle: "Lo que estás construyendo en el mundo",
  icon: Sparkles,
  items: [
    {
      title: "Hub",
      url: `/dashboard/locus`,
      icon: Sparkles,
    },
    {
      title: "Explorar",
      url: `/dashboard/locus/creaciones/explorar`,
      icon: Globe,
    },
  ],
};

const LOCUS_SECTION_ACTIVIDAD: Section = {
  title: "Actividad",
  subtitle: "Tu agenda, proyectos y tareas",
  icon: Zap,
  items: [
    {
      title: "Mi Agenda",
      url: `/dashboard/locus/actividad`,
      icon: Calendar,
    },
    {
      title: "Mis Tareas",
      url: `/dashboard/locus/actividad/tareas`,
      icon: ClipboardCheck,
    },
    {
      title: "Mis Proyectos",
      url: `/dashboard/locus/actividad/proyectos`,
      icon: Briefcase,
    },
    {
      title: "Mis Cosas",
      url: `/dashboard/locus/actividad/cosas`,
      icon: Box,
    },
  ],
};

// Sistema Educativo — Knowledge Layer (conceptos, niveles, progresión)
const SECTION_SISTEMA_EDUCATIVO: Section = {
  title: "Sistema Educativo",
  icon: BookOpen,
  items: [
    {
      title: "Mapa",
      url: `/dashboard/educacion`,
      icon: BookOpen,
    },
    {
      title: "Conceptos",
      url: `/dashboard/educacion/conceptos`,
      icon: Network,
    },
    {
      title: "Mi Progreso",
      url: `/dashboard/educacion/progreso`,
      icon: GraduationCap,
    },
  ],
};

const LOCUS_SECTION_CONFIG: Section = {
  title: "Configuración",
  icon: Settings2,
  items: [
    {
      title: "Mi Perfil",
      url: `/dashboard/locus/perfil`,
      icon: UserCircle,
    },
    {
      title: "Preferencias",
      url: `/dashboard/locus/preferencias`,
      icon: Settings2,
    },
  ],
};

// ========================================
// SECCIONES ESCUELA (condicionales via features)
// ========================================

const ESCUELA_SECTION_CONTENIDO: Section = {
  title: "Contenido",
  icon: BookOpenCheck,
  items: [
    { title: "Contenido", url: "/dashboard/escuela/contenido", icon: BookOpen },
    { title: "Eventos", url: "/dashboard/escuela/eventos", icon: Calendar },
    { title: "Recursos", url: "/dashboard/escuela/recursos", icon: Library },
  ],
};

const ESCUELA_SECTION_COMUNIDAD: Section = {
  title: "Comunidad",
  icon: MessageCircle,
  items: [
    { title: "Foro", url: "/dashboard/escuela/comunidad", icon: MessageCircle },
    { title: "Retos", url: "/dashboard/escuela/retos", icon: Flame },
    { title: "Badges", url: "/dashboard/escuela/badges", icon: Trophy },
  ],
};

const ESCUELA_SECTION_GESTION: Section = {
  title: "Gestión Escuela",
  icon: GraduationCap,
  items: [
    { title: "Miembros", url: "/dashboard/escuela/miembros", icon: Users },
    { title: "Membresías", url: "/dashboard/escuela/membresias", icon: Crown },
    { title: "Leads", url: "/dashboard/escuela/leads", icon: Target },
    { title: "Reservas", url: "/dashboard/escuela/reservas", icon: CalendarCheck },
    { title: "Solicitudes VIP", url: "/dashboard/escuela/vip", icon: Star },
    { title: "Mentorías", url: "/dashboard/escuela/mentorias", icon: HandHeart },
    { title: "Journal", url: "/dashboard/escuela/journal", icon: Notebook },
  ],
};

function getEscuelaSections(features?: OrgFeatures | null): Section[] {
  if (!features?.escuela?.enabled) return [];

  const esc = features.escuela;
  const sections: Section[] = [];

  // Contenido section: contenido + recursos
  if (esc.contenido || esc.recursos) {
    const items: Section['items'] = [];
    if (esc.contenido) {
      items.push({ title: "Contenido", url: "/dashboard/escuela/contenido", icon: BookOpen });
      items.push({ title: "Eventos", url: "/dashboard/escuela/eventos", icon: Calendar });
    }
    if (esc.recursos) {
      items.push({ title: "Recursos", url: "/dashboard/escuela/recursos", icon: Library });
    }
    sections.push({ ...ESCUELA_SECTION_CONTENIDO, items });
  }

  // Comunidad section: comunidad + engagement
  if (esc.comunidad || esc.engagement) {
    const items: Section['items'] = [];
    if (esc.comunidad) items.push({ title: "Foro", url: "/dashboard/escuela/comunidad", icon: MessageCircle });
    if (esc.engagement) {
      items.push({ title: "Retos", url: "/dashboard/escuela/retos", icon: Flame });
      items.push({ title: "Badges", url: "/dashboard/escuela/badges", icon: Trophy });
    }
    sections.push({ ...ESCUELA_SECTION_COMUNIDAD, items });
  }

  // Gestión section
  {
    const items: Section['items'] = [];
    items.push({ title: "Miembros", url: "/dashboard/escuela/miembros", icon: Users });
    if (esc.membresias) items.push({ title: "Membresías", url: "/dashboard/escuela/membresias", icon: Crown });
    if (esc.leads) items.push({ title: "Leads", url: "/dashboard/escuela/leads", icon: Target });
    if (esc.leads) items.push({ title: "Reservas", url: "/dashboard/escuela/reservas", icon: CalendarCheck });
    items.push({ title: "Solicitudes VIP", url: "/dashboard/escuela/vip", icon: Star });
    if (esc.mentoria) items.push({ title: "Mentorías", url: "/dashboard/escuela/mentorias", icon: HandHeart });
    if (esc.journal) items.push({ title: "Journal", url: "/dashboard/escuela/journal", icon: Notebook });
    sections.push({ ...ESCUELA_SECTION_GESTION, items });
  }

  return sections;
}

// ========================================
// SECCIONES HEMOCENTRO (Banco de Sangre dedicado)
// ========================================

const HEMO_SECTION_DONANTES: Section = {
  title: "Donantes",
  icon: Heart,
  items: [
    {
      title: "Lista Donantes",
      url: `/dashboard/banco-sangre/donantes`,
      icon: Heart,
      permission: 'vet_banco_sangre' as Modulo
    },
    {
      title: "Donantes Aptos",
      url: `/dashboard/banco-sangre/donantes?filtro=aptos`,
      icon: CheckCircle2,
      permission: 'vet_banco_sangre' as Modulo
    },
  ],
};

const HEMO_SECTION_OPERACIONES: Section = {
  title: "Operaciones",
  icon: Droplet,
  items: [
    {
      title: "Colectas",
      url: `/dashboard/banco-sangre/colectas`,
      icon: Droplet,
      permission: 'vet_banco_sangre' as Modulo
    },
    {
      title: "Stock Unidades",
      url: `/dashboard/banco-sangre/unidades`,
      icon: Package,
      permission: 'vet_banco_sangre' as Modulo
    },
    {
      title: "Análisis",
      url: `/dashboard/banco-sangre/analisis`,
      icon: FlaskConical,
      permission: 'vet_banco_sangre' as Modulo
    },
  ],
};

const HEMO_SECTION_DISTRIBUCION: Section = {
  title: "Distribución",
  icon: ClipboardList,
  items: [
    {
      title: "Pedidos",
      url: `/dashboard/banco-sangre/pedidos`,
      icon: ClipboardList,
      permission: 'vet_banco_sangre' as Modulo
    },
    {
      title: "Crossmatch",
      url: `/dashboard/banco-sangre/crossmatch`,
      icon: TestTube,
      permission: 'vet_banco_sangre' as Modulo
    },
    {
      title: "Trazabilidad",
      url: `/dashboard/banco-sangre/trazabilidad`,
      icon: Route,
      permission: 'vet_banco_sangre' as Modulo
    },
  ],
};

const HEMO_SECTION_CLIENTES: Section = {
  title: "Clínicas",
  icon: Building2,
  items: [
    {
      title: "Clínicas",
      url: `/dashboard/empresas`,
      icon: Building2,
      permission: 'clientes'
    },
    {
      title: "Contactos",
      url: `/dashboard/contactos`,
      icon: UserCircle,
      permission: 'personas'
    },
  ],
};

const HEMO_SECTION_SISTEMA: Section = {
  title: "Sistema",
  icon: Settings2,
  items: [
    {
      title: "Configuración",
      url: `/dashboard/configuracion`,
      icon: Settings2,
      permission: 'configuracion'
    },
  ],
};

// ========================================
// SECCIONES BANCO DE SANGRE (condicionales via features)
// ========================================

const VET_SECTION_BANCO_SANGRE: Section = {
  title: "Banco de Sangre",
  icon: Droplet,
  items: [
    {
      title: "Donantes",
      url: `/dashboard/banco-sangre/donantes`,
      icon: Heart,
      permission: 'vet_banco_sangre' as Modulo
    },
    {
      title: "Colectas",
      url: `/dashboard/banco-sangre/colectas`,
      icon: Droplet,
      permission: 'vet_banco_sangre' as Modulo
    },
    {
      title: "Stock Unidades",
      url: `/dashboard/banco-sangre/unidades`,
      icon: Package,
      permission: 'vet_banco_sangre' as Modulo
    },
    {
      title: "Pedidos",
      url: `/dashboard/banco-sangre/pedidos`,
      icon: ClipboardList,
      permission: 'vet_banco_sangre' as Modulo
    },
    {
      title: "Crossmatch",
      url: `/dashboard/banco-sangre/crossmatch`,
      icon: TestTube,
      permission: 'vet_banco_sangre' as Modulo
    },
    {
      title: "Trazabilidad",
      url: `/dashboard/banco-sangre/trazabilidad`,
      icon: Route,
      permission: 'vet_banco_sangre' as Modulo
    },
  ],
};

function getBancoDeSangreSections(features?: OrgFeatures | null): Section[] {
  if (!features?.bancoDeSangre?.enabled) return [];
  return [VET_SECTION_BANCO_SANGRE];
}

// ========================================
// SECCIONES INANNA (Membresía / Comunidad)
// ========================================

const INANNA_SECTION_MEMBRESIAS: Section = {
  title: "Membresías",
  icon: Crown,
  items: [
    { title: "Miembros", url: "/dashboard/escuela/miembros", icon: Users },
    { title: "Membresías", url: "/dashboard/escuela/membresias", icon: Crown },
    { title: "Fundadoras / VIP", url: "/dashboard/escuela/vip", icon: Star },
    { title: "Leads", url: "/dashboard/escuela/leads", icon: Target },
    { title: "Reservas", url: "/dashboard/escuela/reservas", icon: CalendarCheck },
  ],
};

const INANNA_SECTION_CONTENIDO: Section = {
  title: "Contenido",
  icon: BookOpenCheck,
  items: [
    { title: "Módulos", url: "/dashboard/escuela/contenido", icon: BookOpen },
    { title: "Recursos", url: "/dashboard/escuela/recursos", icon: Library },
    { title: "Eventos", url: "/dashboard/escuela/eventos", icon: Calendar },
  ],
};

const INANNA_SECTION_COMUNIDAD: Section = {
  title: "Comunidad",
  icon: MessageCircle,
  items: [
    { title: "Foro", url: "/dashboard/escuela/comunidad", icon: MessageCircle },
    { title: "Mentorías", url: "/dashboard/escuela/mentorias", icon: HandHeart },
  ],
};

const INANNA_SECTION_ENGAGEMENT: Section = {
  title: "Engagement",
  icon: Flame,
  items: [
    { title: "Retos", url: "/dashboard/escuela/retos", icon: Flame },
    { title: "Badges", url: "/dashboard/escuela/badges", icon: Trophy },
    { title: "Journal", url: "/dashboard/escuela/journal", icon: Notebook },
  ],
};

// ========================================
// SECCIONES AGENCIAS
// ========================================

const SECTION_AGENCIAS: Section = {
  title: "Agencias",
  icon: Radio,
  items: [
    {
      title: "Hub Agencias",
      url: `/dashboard/agencias`,
      icon: Radio,
    },
    {
      title: "Presencia",
      icon: Megaphone,
      subItems: [
        {
          title: "Dashboard",
          url: `/dashboard/agencias/presencia`,
          icon: Megaphone,
        },
        {
          title: "Estrategia",
          url: `/dashboard/agencias/presencia/estrategia`,
          icon: BookOpen,
        },
        {
          title: "Guión Contenidos",
          url: `/dashboard/agencias/presencia/guion-contenidos`,
          icon: FileText,
        },
        {
          title: "Plan Operativo",
          url: `/dashboard/agencias/presencia/plan-operativo`,
          icon: ClipboardList,
        },
        {
          title: "Planes",
          url: `/dashboard/agencias/presencia/planes`,
          icon: Calendar,
        },
        {
          title: "Tareas",
          url: `/dashboard/agencias/presencia/tareas`,
          icon: ClipboardList,
        },
        {
          title: "Calendario",
          url: `/dashboard/agencias/presencia/calendario`,
          icon: CalendarCheck,
        },
        {
          title: "Métricas",
          url: `/dashboard/agencias/presencia/metricas`,
          icon: BarChart3,
        },
      ],
    },
  ],
};

// ========================================
// SECCIONES PETSHOP (Peluqueria & Pet Shop)
// ========================================

const PETSHOP_SECTION_FICHAS: Section = {
  title: "Fichas",
  icon: Dog,
  items: [
    {
      title: "Clientes",
      url: `/dashboard/petshop/clientes`,
      icon: Users,
      permission: 'clientes'
    },
    {
      title: "Mascotas",
      url: `/dashboard/petshop/mascotas`,
      icon: Dog,
      permission: 'clientes'
    },
  ],
};

const PETSHOP_SECTION_GROOMING: Section = {
  title: "Peluqueria & Bano",
  icon: Scissors,
  items: [
    {
      title: "Agenda",
      url: `/dashboard/petshop/agenda`,
      icon: Calendar,
    },
    {
      title: "Servicios",
      url: `/dashboard/petshop/servicios`,
      icon: Scissors,
    },
  ],
};

const PETSHOP_SECTION_INVENTARIO: Section = {
  title: "Inventario",
  icon: Warehouse,
  items: [
    {
      title: "Stock de productos",
      url: `/dashboard/deposito/stock`,
      icon: Package,
      permission: 'productos'
    },
    {
      title: "Productos",
      url: `/dashboard/productos`,
      icon: PackageSearch,
      permission: 'productos'
    },
    {
      title: "Precios",
      url: `/dashboard/precios`,
      icon: DollarSign,
      permission: 'precios'
    },
  ],
};

const PETSHOP_SECTION_VENTAS: Section = {
  title: "Ventas",
  icon: ShoppingBag,
  items: [
    {
      title: "Punto de Venta",
      url: `/dashboard/petshop/pos`,
      icon: CreditCard,
    },
    {
      title: "Historial de Ventas",
      url: `/dashboard/petshop/ventas`,
      icon: Receipt,
    },
  ],
};

// ========================================
// FACTORY
// ========================================

export const EPIDEMIOLOGIA_ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''

// Users who get simplified CRM-only sidebar instead of full Ventas section
const SECTION_COMERCIAL_NEW: Section = {
  title: "Comercial",
  icon: TrendingUp,
  url: `/dashboard/comercial`,
  items: [
    { title: "Resumen", url: `/dashboard/comercial?sec=resumen`, icon: LayoutDashboard, permission: 'clientes' },
    { title: "CRM", url: `/dashboard/comercial?sec=crm`, icon: Users, permission: 'clientes' },
    { title: "Pipeline", url: `/dashboard/comercial?sec=crm&tab=pipeline`, icon: Workflow, permission: 'oportunidades' },
    { title: "KPIs Ventas", url: `/dashboard/comercial?sec=kpis`, icon: BarChart3, permission: 'clientes' },
    { title: "Descuentos", url: `/dashboard/comercial?sec=descuentos`, icon: Tag, permission: 'clientes' },
    { title: "Customer Insights", url: `/dashboard/comercial?sec=insights`, icon: Eye, permission: 'clientes' },
  ],
};

const SECTION_CONTACTOS: Section = {
  title: "Contactos",
  icon: UserCircle,
  url: `/dashboard/contactos`,
  items: [
    { title: "Clientes", url: `/dashboard/contactos?tab=clientes`, icon: Building2, permission: 'clientes' },
    { title: "Contactos", url: `/dashboard/contactos?tab=contactos`, icon: UserCircle, permission: 'personas' },
    { title: "Laboratorios", url: `/dashboard/contactos?tab=laboratorios`, icon: FlaskConical, permission: 'clientes' },
  ],
};

const CRM_DIRECTO_EMAILS: string[] = [];


// ========================================
// AGRO — Papasud (producción de semilla de papa)
// ========================================
//
// Secciones propias en vez de reusar las del ERP base: las de allá traen
// subitems que apuntan a módulos que esta app no incluye, y quedarían links
// muertos en el sidebar.

const AGRO_SECTION_COPILOTO: Section = {
  title: "Copiloto",
  subtitle: "Preguntale al histórico",
  icon: Sparkles,
  url: `/dashboard/copiloto`,
  items: [],
};

const AGRO_SECTION_CAMPO: Section = {
  title: "Campo",
  icon: Sprout,
  url: `/dashboard/campo/mapa`,
  items: [
    { title: "Mapa de lotes", url: `/dashboard/campo/mapa`, icon: MapPin },
    { title: "Lotes", url: `/dashboard/campo/lotes`, icon: Leaf },
    { title: "Órdenes de trabajo", url: `/dashboard/campo/ordenes`, icon: ClipboardList },
    { title: "Establecimientos", url: `/dashboard/campo/establecimientos`, icon: Home },
    { title: "Insumos y dosis", url: `/dashboard/campo/insumos`, icon: Beaker },
  ],
};

const AGRO_SECTION_PRODUCCION: Section = {
  title: "Producción",
  icon: BarChart3,
  url: `/dashboard/produccion/historico`,
  items: [
    { title: "Histórico", url: `/dashboard/produccion/historico`, icon: History },
    { title: "Campañas", url: `/dashboard/produccion/campanas`, icon: CalendarDays },
    { title: "Variedades", url: `/dashboard/produccion/variedades`, icon: Dna },
  ],
};

const AGRO_SECTION_CONTACTOS: Section = {
  title: "Contactos",
  icon: Users,
  url: `/dashboard/contactos`,
  items: [
    { title: "Clientes", url: `/dashboard/contactos?tab=clientes`, icon: Building2, permission: 'clientes' },
    { title: "Contactos", url: `/dashboard/contactos?tab=contactos`, icon: UserCircle, permission: 'personas' },
  ],
};

const AGRO_SECTION_STOCK: Section = {
  title: "Stock",
  subtitle: "Cuatro ubicaciones",
  icon: Warehouse,
  url: `/dashboard/inventario`,
  items: [
    { title: "Resumen", url: `/dashboard/inventario?tab=resumen`, icon: LayoutDashboard, permission: 'productos' },
    { title: "Stock por ubicación", url: `/dashboard/inventario?tab=stock`, icon: Package, permission: 'productos' },
    { title: "Lotes de semilla", url: `/dashboard/inventario?tab=lotes`, icon: Scan, permission: 'productos' },
    { title: "Ubicaciones", url: `/dashboard/inventario?tab=depositos`, icon: Warehouse, permission: 'productos' },
    { title: "Movimientos", url: `/dashboard/inventario?tab=movimientos`, icon: ArrowRightLeft, permission: 'productos' },
    { title: "Conteos", url: `/dashboard/inventario?tab=conteos`, icon: ListChecks, permission: 'productos' },
    { title: "Reposición", url: `/dashboard/inventario?tab=reposicion`, icon: AlertTriangle, permission: 'productos' },
  ],
};

const AGRO_SECTION_INSUMOS: Section = {
  title: "Insumos y precios",
  icon: PackageSearch,
  url: `/dashboard/productos`,
  items: [
    { title: "Productos", url: `/dashboard/productos?tab=productos`, icon: PackageSearch, permission: 'productos' },
    { title: "Precios", url: `/dashboard/productos?tab=precios`, icon: DollarSign, permission: 'precios' },
  ],
};

const AGRO_SECTION_REPORTES: Section = {
  title: "Reportes",
  icon: TrendingUp,
  url: `/dashboard/reportes`,
  items: [],
};

const AGRO_SECTION_CONFIG: Section = {
  title: "Configuración",
  icon: Settings2,
  url: `/dashboard/configuracion`,
  items: [
    { title: "Centro", url: `/dashboard/configuracion?tab=centro`, icon: Settings2, permission: 'configuracion' },
    { title: "Actividad", url: `/dashboard/configuracion?tab=actividad`, icon: Activity, permission: 'configuracion' },
    { title: "Aprobaciones", url: `/dashboard/configuracion?tab=aprobaciones`, icon: GitBranch, permission: 'configuracion' },
    { title: "Auditoría", url: `/dashboard/configuracion?tab=audit`, icon: History, permission: 'configuracion' },
    { title: "Alertas", url: `/dashboard/configuracion?tab=alertas`, icon: Bell, permission: 'configuracion' },
    { title: "Mi firma", url: `/dashboard/configuracion?tab=mi-firma`, icon: PenTool },
  ],
};

export const getSidebarLinks = (orgTipo?: OrgTipo, features?: OrgFeatures | null, userEmail?: string) => {
  const escuelaSections = getEscuelaSections(features);
  const ventasSection = userEmail && CRM_DIRECTO_EMAILS.includes(userEmail) ? SECTION_CRM_DIRECTO : SECTION_VENTAS;

  switch (orgTipo) {
    case 'locus':
      return {
        sections: [
          LOCUS_SECTION_CREACION,
          LOCUS_SECTION_INICIO,
          LOCUS_SECTION_VINCULOS,
          LOCUS_SECTION_FLUJO,
          LOCUS_SECTION_VITALIDAD,
          LOCUS_SECTION_MASCOTAS,
          LOCUS_SECTION_ALERTAS,
          ...(userEmail === EPIDEMIOLOGIA_ADMIN_EMAIL ? [LOCUS_SECTION_EPIDEMIOLOGIA] : []),
          LOCUS_SECTION_CONOCIMIENTO,
          LOCUS_SECTION_ACTIVIDAD,
          SECTION_SISTEMA_EDUCATIVO,
          LOCUS_SECTION_CONFIG,
        ] as Section[],
      };
    // Papasud: el ERP clásico completo MÁS lo propio de la producción de semilla.
    // Campo, Producción y Copiloto conviven con Compras, Facturación y Servicio
    // Técnico — una productora agrícola necesita las dos mitades.
    // Papasud: el ERP clásico de una productora — contactos, stock, insumos —
    // más lo propio del campo. Sin las verticales que no aplican.
    case 'agro':
      return {
        sections: [
          SECTION_DASHBOARD,
          AGRO_SECTION_COPILOTO,
          AGRO_SECTION_CAMPO,
          AGRO_SECTION_PRODUCCION,
          AGRO_SECTION_CONTACTOS,
          AGRO_SECTION_STOCK,
          AGRO_SECTION_INSUMOS,
          AGRO_SECTION_REPORTES,
          AGRO_SECTION_CONFIG,
        ] as Section[],
      };

    case 'veterinaria': {
      const bancoDeSangreSections = getBancoDeSangreSections(features);
      const clinicaEnabled = features?.clinica?.enabled !== false;
      const groomingEnabled = features?.grooming?.enabled !== false;

      // Build servicios section filtering by features
      const serviciosItems = VET_SECTION_SERVICIOS.items.filter(item => {
        if (item.url?.includes('peluqueria')) return groomingEnabled;
        return true;
      });
      const serviciosSection = serviciosItems.length > 0
        ? [{ ...VET_SECTION_SERVICIOS, items: serviciosItems }]
        : [];

      return {
        sections: [
          SECTION_DASHBOARD,
          ...(clinicaEnabled ? [VET_SECTION_FICHAS] : []),
          ...bancoDeSangreSections,
          ...(clinicaEnabled ? [VET_SECTION_CLINICA, VET_SECTION_INTERNACION] : []),
          ...(clinicaEnabled ? [VET_SECTION_TRATAMIENTOS] : []),
          ...(clinicaEnabled ? serviciosSection : []),
          VET_SECTION_DOCUMENTOS,
          VET_SECTION_LABORATORIO,
          ...(clinicaEnabled ? [VET_SECTION_INVENTARIO] : []),
          ...(clinicaEnabled ? [VET_SECTION_VENTAS] : []),
          SECTION_FACTURACION,          VET_SECTION_DERIVACIONES,
          VET_SECTION_INFORMES,
          VET_SECTION_REGULATORIO,
          SECTION_COMUNICACIONES,
          VET_SECTION_SISTEMA,
        ] as Section[],
      };
    }

    case 'growshop': {
      const cannabisEnabled = features?.cannabis?.enabled !== false;
      const agenciasEnabled = features?.agencias?.enabled !== false;

      return {
        sections: [
          SECTION_DASHBOARD,
          ...(cannabisEnabled ? [GROWSHOP_SECTION_CULTIVO] : []),
          ...(cannabisEnabled ? [GROWSHOP_SECTION_GENETICA] : []),
          ...(cannabisEnabled ? [GROWSHOP_SECTION_MONITOREO] : []),
          GROWSHOP_SECTION_VENTAS,
          SECTION_COMPRAS,
          GROWSHOP_SECTION_INVENTARIO,
          SECTION_LOGISTICA,
          SECTION_FACTURACION,          SECTION_REPORTES,
          SECTION_MARKETING,
          SECTION_AGENCIAS,
          SECTION_COMUNICACIONES,
          ...escuelaSections,
          SECTION_CONFIGURACION,
        ] as Section[],
      };
    }

    case 'estudio':
      return {
        sections: [
          SECTION_DASHBOARD,
          SECTION_PORTFOLIO,
          SECTION_VENTAS,
          SECTION_COMERCIAL,
          SECTION_COMPRAS,
          SECTION_LOGISTICA,
          SECTION_FACTURACION,          SECTION_CONTABILIDAD,
          SECTION_REPORTES,
          SECTION_MARKETING,
          SECTION_COMUNICACIONES,
          ...escuelaSections,
          SECTION_CONFIGURACION,
        ] as Section[],
      };

    case 'inanna':
      return {
        sections: [
          SECTION_DASHBOARD,
          INANNA_SECTION_MEMBRESIAS,
          INANNA_SECTION_CONTENIDO,
          INANNA_SECTION_COMUNIDAD,
          INANNA_SECTION_ENGAGEMENT,
          SECTION_FACTURACION,          SECTION_MARKETING,
          SECTION_COMUNICACIONES,
          SECTION_REPORTES,
          SECTION_CONFIGURACION,
        ] as Section[],
      };

    case 'petshop': {
      const groomingEnabled = features?.grooming?.enabled !== false;

      return {
        sections: [
          SECTION_DASHBOARD,
          PETSHOP_SECTION_FICHAS,
          ...(groomingEnabled ? [PETSHOP_SECTION_GROOMING] : []),
          PETSHOP_SECTION_INVENTARIO,
          PETSHOP_SECTION_VENTAS,
          SECTION_FACTURACION,          SECTION_CONFIGURACION,
        ] as Section[],
      };
    }

    case 'hemocentro':
      return {
        sections: [
          SECTION_DASHBOARD,
          HEMO_SECTION_DONANTES,
          HEMO_SECTION_OPERACIONES,
          HEMO_SECTION_DISTRIBUCION,
          HEMO_SECTION_CLIENTES,
          SECTION_FACTURACION,          VET_SECTION_INFORMES,
          VET_SECTION_REGULATORIO,
          SECTION_COMUNICACIONES,
          HEMO_SECTION_SISTEMA,
        ] as Section[],
      };

    case 'electromedicina':
    case 'other':
    default: {
      const crmEnabled = features?.crm?.enabled !== false;
      const stEnabled = features?.servicios_tecnicos?.enabled !== false;
      const agenciasEnabled = features?.agencias?.enabled !== false;

      return {
        sections: [
          SECTION_DASHBOARD,
          ...(crmEnabled ? [ventasSection === SECTION_CRM_DIRECTO ? SECTION_CRM_DIRECTO : SECTION_COMERCIAL_NEW, SECTION_CONTACTOS].filter(Boolean) as Section[] : []),
          SECTION_COMPRAS,
          ...(stEnabled ? [SECTION_SERVICIO_TECNICO] : []),
          SECTION_EQUIPOS,
          SECTION_PRODUCTOS_PRECIOS,
          SECTION_INVENTARIO,
          SECTION_BIBLIOTECA,
          SECTION_REACTIVOS_LAB,
          ...(stEnabled ? [SECTION_REGULATORIO] : []),
          SECTION_LOGISTICA,
          SECTION_FACTURACION,          SECTION_CONTABILIDAD,
          SECTION_REPORTES,
          SECTION_MARKETING,
          SECTION_COMUNICACIONES,
          SECTION_WEB_LANDINGS,
          ...escuelaSections,
          ...(agenciasEnabled ? [SECTION_AGENCIAS] : []),
          SECTION_CONFIGURACION,
        ] as Section[],
      };
    }
  }
};
