// ─── SISTEMA DE PERMISOS DINÁMICO ────────────────────────────────────────────

const SUPABASE_URL = "https://rztujbaunmeqhgrxugth.supabase.co";
const SUPABASE_KEY = "sb_publishable_-BLot_F7KegMytm1jJ9jYg_n0SR2Q-q";

async function sb(table, method="GET", body=null, query="") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method==="POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

// ─── PERMISOS POR DEFECTO (fallback si no hay BD) ───────────────────────────
const PERMISOS_DEFAULT = {
  super_admin: {
    pos:true, historial_propio:true, historial_global:true,
    anular_propio:true, anular_otros:true, abrir_cerrar_caja:true,
    ver_reporte_caja:true, ver_reporte_caja_detallado:true,
    catalogo_productos:true, catalogo_clientes:true,
    entradas_inventario:true, ver_historial_entradas:true,
    catalogo_proveedores:true, recibir_abonos:true,
    gestion_combos:true, reportes:true, gestion_usuarios:true,
    config_iva:true, catalogo_bancos:true, sucursales:true, config_fel:true,
    descuentos:true, gestion_roles:true, salida_efectivo:true,
  },
  admin: {
    pos:true, historial_propio:true, historial_global:true,
    anular_propio:true, anular_otros:true, abrir_cerrar_caja:true,
    ver_reporte_caja:true, ver_reporte_caja_detallado:true,
    catalogo_productos:true, catalogo_clientes:true,
    entradas_inventario:true, ver_historial_entradas:true,
    catalogo_proveedores:true, recibir_abonos:true,
    gestion_combos:true, reportes:true, gestion_usuarios:true,
    config_iva:true, catalogo_bancos:true, sucursales:false, config_fel:false,
    descuentos:true, gestion_roles:true, salida_efectivo:true,
  },
  supervisor: {
    pos:true, historial_propio:true, historial_global:true,
    anular_propio:true, anular_otros:true, abrir_cerrar_caja:true,
    ver_reporte_caja:true, ver_reporte_caja_detallado:true,
    catalogo_productos:false, catalogo_clientes:true,
    entradas_inventario:false, ver_historial_entradas:true,
    catalogo_proveedores:false, recibir_abonos:true,
    gestion_combos:false, reportes:true, gestion_usuarios:false,
    config_iva:false, catalogo_bancos:false, sucursales:false, config_fel:false,
    descuentos:true, gestion_roles:false, salida_efectivo:true,
  },
  cajero: {
    pos:true, historial_propio:true, historial_global:false,
    anular_propio:true, anular_otros:false, abrir_cerrar_caja:true,
    ver_reporte_caja:true, ver_reporte_caja_detallado:true,
    catalogo_productos:false, catalogo_clientes:false,
    entradas_inventario:false, ver_historial_entradas:false,
    catalogo_proveedores:false, recibir_abonos:false,
    gestion_combos:false, reportes:false, gestion_usuarios:false,
    config_iva:false, catalogo_bancos:false, sucursales:false, config_fel:false,
    descuentos:false, gestion_roles:false, salida_efectivo:true,
  },
};

// ─── CACHE DE PERMISOS (evita consultas repetidas) ───────────────────────────
let permisosCache = {};

export async function cargarPermisosRol(rolId, rolNombre) {
  if (permisosCache[rolId]) return permisosCache[rolId];
  try {
    const perms = await sb("rol_permisos","GET",null,`?rol_id=eq.${rolId}`);
    if (perms && perms.length > 0) {
      const mapa = Object.fromEntries(perms.map(p=>[p.permiso, p.valor]));
      permisosCache[rolId] = mapa;
      return mapa;
    }
  } catch {}
  // Fallback a permisos por defecto basados en nombre del rol
  const key = rolNombre?.toLowerCase().replace(" ","_") || "cajero";
  return PERMISOS_DEFAULT[key] || PERMISOS_DEFAULT.cajero;
}

export function limpiarCachePermisos() { permisosCache = {}; }

// ─── VERIFICAR PERMISO ────────────────────────────────────────────────────────
// Para uso síncrono — el usuario debe tener _permisos cargados
export function tienePermiso(usuario, permiso) {
  if (!usuario) return false;
  // Si tiene permisos cargados dinámicamente
  if (usuario._permisos) return usuario._permisos[permiso] === true;
  // Permisos personalizados del usuario (override)
  if (usuario.permisos && typeof usuario.permisos[permiso] === "boolean")
    return usuario.permisos[permiso];
  // Fallback a permisos por rol estático
  const key = usuario.rol?.toLowerCase().replace(" ","_") || "cajero";
  const base = PERMISOS_DEFAULT[key] || PERMISOS_DEFAULT.cajero;
  return base[permiso] === true;
}

// ─── CARGAR USUARIO COMPLETO CON PERMISOS ────────────────────────────────────
export async function cargarUsuarioCompleto(usuario) {
  if (!usuario) return null;
  try {
    // Obtener datos frescos del usuario desde la BD
    const users = await sb("usuarios","GET",null,`?id=eq.${usuario.id}`);
    const u = users?.[0] || usuario;
    
    let rolId = u.rol_id;
    
    // Si no tiene rol_id, buscar por nombre del rol
    if (!rolId) {
      const rolNombreBuscar = u.rol === "super_admin" ? "Super Admin"
        : u.rol === "admin" ? "Admin"
        : u.rol === "supervisor" ? "Supervisor"
        : u.rol === "cajero" ? "Cajero" : null;
      
      if (rolNombreBuscar) {
        const roles = await sb("roles","GET",null,`?nombre=eq.${encodeURIComponent(rolNombreBuscar)}`);
        if (roles?.[0]) {
          rolId = roles[0].id;
          // Actualizar rol_id en la BD para la próxima vez
          await sb(`usuarios?id=eq.${u.id}`,"PATCH",{rol_id:rolId});
        }
      }
    }

    // Resolver la serie de la sucursal asignada (para el correlativo de facturas)
    let _sucursalSerie = null;
    if (u.sucursal_id) {
      try {
        const sucs = await sb("sucursales","GET",null,`?id=eq.${u.sucursal_id}&select=serie,nombre`);
        _sucursalSerie = sucs?.[0]?.serie || null;
      } catch {}
    }

    if (rolId) {
      const roles = await sb("roles","GET",null,`?id=eq.${rolId}`);
      const rolNombre = roles?.[0]?.nombre;
      const permisos = await cargarPermisosRol(rolId, rolNombre);
      return { ...u, rol_id:rolId, _permisos:permisos, _rolNombre:rolNombre, _sucursalSerie };
    }
  } catch(e) { console.error("Error cargando usuario:", e); }
  
  // Fallback con permisos estáticos
  const key = usuario.rol?.toLowerCase().replace(" ","_") || "cajero";
  return { ...usuario, _permisos:PERMISOS_DEFAULT[key] || PERMISOS_DEFAULT.cajero };
}

// ─── CONSTANTES UI ────────────────────────────────────────────────────────────
export const ROLES = {
  super_admin: "Super Admin",
  admin:       "Admin",
  supervisor:  "Supervisor",
  cajero:      "Cajero",
};

export const ROL_COLOR = {
  super_admin: "#DC2626",
  admin:       "#3B82F6",
  supervisor:  "#7C3AED",
  cajero:      "#16A34A",
};

export const ROL_BG = {
  super_admin: "#FEF2F2",
  admin:       "#EFF6FF",
  supervisor:  "#F5F3FF",
  cajero:      "#F0FDF4",
};

export const ROL_ICON = {
  super_admin: "👑",
  admin:       "🛡️",
  supervisor:  "👔",
  cajero:      "🧑‍💼",
};
