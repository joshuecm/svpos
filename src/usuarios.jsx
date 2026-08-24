// ─── SISTEMA DE PERMISOS ──────────────────────────────────────────────────────

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

// ─── PERMISOS POR ROL ─────────────────────────────────────────────────────────
const PERMISOS_ROL = {
  super_admin: {
    pos:                    true,
    historial_propio:       true,
    historial_global:       true,
    anular_propio:          true,
    anular_otros:           true,
    abrir_cerrar_caja:      true,
    ver_reporte_caja:       true,
    catalogo_productos:     true,
    catalogo_clientes:      true,
    entradas_inventario:    true,
    reportes:               true,
    gestion_usuarios:       true,
    config_iva:             true,
    catalogo_bancos:        true,
    sucursales:             true,
    config_fel:             true,
    descuentos:             true,
  },
  admin: {
    pos:                    true,
    historial_propio:       true,
    historial_global:       true,
    anular_propio:          true,
    anular_otros:           true,
    abrir_cerrar_caja:      true,
    ver_reporte_caja:       true,
    catalogo_productos:     true,
    catalogo_clientes:      true,
    entradas_inventario:    true,
    reportes:               true,
    gestion_usuarios:       true,
    config_iva:             true,
    catalogo_bancos:        true,
    sucursales:             false,
    config_fel:             false,
    descuentos:             true,
  },
  supervisor: {
    pos:                    true,
    historial_propio:       true,
    historial_global:       true,
    anular_propio:          true,
    anular_otros:           true,
    abrir_cerrar_caja:      true,
    ver_reporte_caja:       true,
    catalogo_productos:     false,
    catalogo_clientes:      true,
    entradas_inventario:    false,
    reportes:               true,
    gestion_usuarios:       false,
    config_iva:             false,
    catalogo_bancos:        false,
    sucursales:             false,
    config_fel:             false,
    descuentos:             true,
  },
  cajero: {
    pos:                    true,
    historial_propio:       true,
    historial_global:       false,
    anular_propio:          true,  // solo en turno activo
    anular_otros:           false,
    abrir_cerrar_caja:      true,
    ver_reporte_caja:       false,
    catalogo_productos:     false,
    catalogo_clientes:      false,
    entradas_inventario:    false,
    reportes:               false,
    gestion_usuarios:       false,
    config_iva:             false,
    catalogo_bancos:        false,
    sucursales:             false,
    config_fel:             false,
    descuentos:             false,
  },
};

// ─── FUNCIÓN PRINCIPAL DE PERMISOS ───────────────────────────────────────────
// Combina permisos del rol + overrides del usuario específico
export function tienePermiso(usuario, permiso) {
  if (!usuario) return false;
  const base = PERMISOS_ROL[usuario.rol] || {};
  const override = usuario.permisos || {};
  // Override específico del usuario tiene prioridad
  if (typeof override[permiso] === "boolean") return override[permiso];
  return base[permiso] === true;
}

// Retorna todos los permisos combinados de un usuario
export function getPermisos(usuario) {
  if (!usuario) return {};
  const base = PERMISOS_ROL[usuario.rol] || {};
  const override = usuario.permisos || {};
  return { ...base, ...override };
}
