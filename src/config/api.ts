// API Configuration for Skyworth Frontend
// Backend: skyworthyassir-back (Spring Boot)

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:7000";

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: "/api/auth/login",
  },

  // Public Registration
  REGISTRO: {
    SKYWORTH: "/api/registro/skyworth",
    VALIDAR_SERIAL: "/api/registro/validar-serial",
  },

  // Admin endpoints (require auth)
  ADMIN: {
    VENDEDORES: "/api/admin/vendedores",
    VENDEDOR_CREAR: "/api/admin/vendedor/crear",
    VENDEDOR_UPDATE: (id: number) => `/api/admin/vendedor/${id}`,
    VENDEDOR_DESACTIVAR: (id: number) => `/api/admin/vendedor/${id}/desactivar`,
    SERIALES: "/api/admin/seriales",
    SERIALES_ESTADISTICAS: "/api/admin/seriales/estadisticas",
    SERIALES_CARGAR_CSV: "/api/admin/seriales/cargar-csv",
    SERIALES_EXPORTAR_EXCEL: "/api/admin/seriales/exportar-excel",
    CUPONES: "/api/cupones",
    CONFIGURACION: "/api/admin/configuracion",
    KB: {
      LIST: "/api/admin/kb",
      CREATE: "/api/admin/kb",
      UPDATE: (id: number) => `/api/admin/kb/${id}`,
      DELETE: (id: number) => `/api/admin/kb/${id}`,
      SEARCH: "/api/admin/kb/search",
    },
    PRODUCTOS: "/api/admin/productos",
    DASHBOARD: "/api/dashboard/estadisticas",
    REGISTROS: "/api/admin/registros",
    REGISTROS_EXPORTAR_EXCEL: "/api/admin/registros/exportar-excel",
    CLIENTES_CUPONES: "/api/admin/clientes-cupones",
    VENTAS: "/api/admin/ventas",
  },

  // Dashboard endpoints
  DASHBOARD: {
    RESUMEN: "/api/dashboard/resumen",
    MODELOS_ESTRELLA: "/api/dashboard/modelos-estrella",
    MAPA_CALOR: "/api/dashboard/mapa-calor",
    RITMO_JUEGO: "/api/dashboard/ritmo-juego",
    ESTADISTICAS: "/api/dashboard/estadisticas",
  },

  // Sorteos - Ganadores
  SORTEOS: {
    GANADORES_CLIENTES: "/api/sorteo/clientes/ganadores",
    GANADORES_VENDEDORES: "/api/sorteo/vendedores/ganadores",
    SORTEAR_CLIENTE: "/api/sorteo/clientes/realizar",
    SORTEAR_VENDEDOR: "/api/sorteo/vendedores/realizar",
  },

  // Cupones
  CUPONES: {
    LISTAR: "/api/cupones",
    POR_ESTADO: (estado: string) => `/api/cupones/estado/${estado}`,
  },

  // Tombola (sorteo de cupones)
  TOMBOLA: {
    ESTADISTICAS: "/api/cupones/tombola/estadisticas",
    CUPONES: "/api/cupones/tombola/cupones",
    SORTEAR: "/api/cupones/tombola/sortear",
    PRESELECCIONADOS: "/api/cupones/tombola/preseleccionados",
  },

  // Rankings de vendedores
  RANKING: {
    TODOS: "/api/dashboard/ranking-vendedores",
    TOP_CIUDADES: "/api/dashboard/ranking-top-departamentos",
  },

  // Vendedor endpoints
  VENDEDOR: {
    REGISTRAR: "/api/vendedor/registrar",
    REGISTRAR_SERIAL: "/api/vendedor/registrar-serial",
    MIS_VENTAS: "/api/vendedor/mis-ventas",
    PERFIL: "/api/vendedor/perfil",
  },

  // WhatsApp Webhook Chat
  WHATSAPP_CHAT: {
    CONVERSATIONS: "/api/admin/whatsapp-chat/conversations",
    MESSAGES: (phone: string) => `/api/admin/whatsapp-chat/messages/${phone}`,
    SEND: "/api/admin/whatsapp-chat/send",
    QUICK_REPLIES: "/api/admin/whatsapp/quick-replies",
    CAMPAIGNS: "/api/admin/whatsapp/campaigns",
    EXECUTE_CAMPAIGN: (id: number) =>
      `/api/admin/whatsapp/campaigns/${id}/execute`,
  },

  // Utilities
  UTIL: {
    GENERATE_HASH: "/api/util/generate-hash",
  },
};

// Response types
export interface ApiResponse<T> {
  error: boolean;
  mensaje: string;
  data: T;
}

export interface LoginResponse {
  token: string;
  email: string;
  nombre: string;
  rol: "ADMIN" | "VENDEDOR";
}

export interface Vendedor {
  id: number;
  nombre: string;
  ci: string;
  tienda: string;
  ciudad: string;
  departamento?: string;
  telefono?: string;
  email: string;
  activo: boolean;
  role?: string;
  password?: string | null;
  rolNombre?: string;
  fechaRegistro?: string;
  fechaNacimiento?: string;
  totalVentas?: number;
}

export interface Serial {
  id: number;
  serial: string;
  producto: string;
  modelo: string;
  disponible: boolean;
  fechaRegistro?: string;
  vendedorId?: number;
}

export interface RegistroCliente {
  nombreCompleto: string;
  ci: string;
  email: string;
  telefono: string;
  ciudad: string;
  departamento: string;
  fechaNacimiento: string;
  numeroFactura: string;
  fechaCompra: string;
  serialNumber: string;
  ciudad_registro?: string;
}

export interface Cupon {
  id: number;
  codigo: string;
  registroId: number;
  usado: boolean;
  fechaCreacion: string;
}

export interface Sorteo {
  id: number;
  nombre: string;
  descripcion: string;
  fechaSorteo: string;
  estado: string;
  ganador?: string;
}

export interface DashboardStats {
  totalRegistros: number;
  totalVendedores: number;
  serialesDisponibles: number;
  serialesUsados: number;
  cuponesGenerados: number;
}

export interface KnowledgeBaseItem {
  id: number;
  categoria: string;
  pregunta: string;
  respuesta: string;
  keywords?: string;
  activo: boolean;
  fechaCreacion: string;
}

export interface ConfiguracionDTO {
  id: number;
  clave: string;
  valor: string;
  descripcion: string;
  categoria: string;
  esSecreto: boolean;
}

export interface SorteoClienteGanador {
  id: number;
  codigoCupon: string;
  nombreCliente: string;
  ciCliente: string;
  emailCliente?: string;
  telefonoCliente?: string;
  fechaSorteo: string;
  posicionSorteo: number;
}

export interface SorteoVendedorGanador {
  id: number;
  nombreVendedor: string;
  tienda: string;
  ciudad: string;
  fechaSorteo: string;
  posicionSorteo: number;
  premio: string;
}

export interface DashboardResumen {
  jugadoresInscritos: number;
  seriesCanjeadas: number;
  serialesDisponibles: number;
}

export interface VendedorStats {
  nombreVendedor: string;
  tienda: string;
  ciudad: string;
  cantidadVentas: number;
}

export interface TiendaStats {
  tienda: string;
  ciudad: string;
  cantidadVentas: number;
}

export interface DepartamentoStats {
  departamento: string;
  cantidadVentas: number;
}

export interface TopProduct {
  id?: string | number;
  model_name: string;
  screen_size: string | number;
  tier: string;
  total_registrations: number;
}

export interface DashboardCompleteStats {
  purchases: number;
  approvedPurchases: number;
  pendingPurchases: number;
  couponsTotal: number;
  couponsBuyer: number;
  couponsSeller: number;
  sellers: number;
  sales: number;
  serialsTotal: number;
  serialsRegistered: number;
  topVendedores: VendedorStats[];
  ventasPorTienda: TiendaStats[];
  ventasPorDepartamento: DepartamentoStats[];
  topProducts: TopProduct[];
}

export interface RitmoJuegoItem {
  fecha: string;
  cantidad: number;
}

export interface WhatsAppMessage {
  id: number;
  phoneNumber: string;
  content: string;
  messageType: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  timestamp: string;
}

export interface QuickReply {
  id: number;
  keyword: string;
  messageContent: string;
}

export interface Campaign {
  id: number;
  name: string;
  templateName: string;
  audienceFilters: string;
  status: string;
  totalTargets: number;
  successfulSends: number;
  failedSends: number;
  created_at?: string;
}
