import { useState, useEffect } from "react";

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

const C = {
  bg:"#F0F2F5", card:"#FFFFFF", panel:"#F8F9FB",
  border:"#E2E8F0", text:"#1E293B", textMd:"#475569", textSm:"#94A3B8",
  blue:"#3B82F6", blueBg:"#EFF6FF", blueBorder:"#BFDBFE",
  green:"#16A34A", greenBg:"#F0FDF4",
  red:"#DC2626", redBg:"#FEF2F2", redBorder:"#FECACA",
  amber:"#D97706", amberBg:"#FFF7ED",
  purple:"#7C3AED", purpleBg:"#F5F3FF",
};

const IS = {background:"#fff",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 14px",color:"#1E293B",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"};
const BP = {background:"#3B82F6",color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:"pointer"};
const BS = {background:"#fff",color:"#475569",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"};
const BD = {background:"#FEF2F2",color:"#DC2626",border:"1.5px solid #FECACA",borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"};

// ─── GRUPOS DE PERMISOS ───────────────────────────────────────────────────────
const GRUPOS = [
  {
    label: "🛒 Ventas",
    permisos: [
      {key:"pos",              label:"Punto de venta",          desc:"Acceder y operar el POS"},
      {key:"historial_propio", label:"Ver historial propio",    desc:"Ver sus propias ventas"},
      {key:"historial_global", label:"Ver historial global",    desc:"Ver ventas de todos los cajeros"},
      {key:"anular_propio",    label:"Anular ventas propias",   desc:"Anular sus propias ventas (mismo turno)"},
      {key:"anular_otros",     label:"Anular ventas de otros",  desc:"Anular ventas de cualquier cajero"},
      {key:"descuentos",       label:"Aplicar descuentos",      desc:"Aplicar descuentos en ventas"},
    ]
  },
  {
    label: "💰 Caja",
    permisos: [
      {key:"abrir_cerrar_caja",  label:"Abrir / Cerrar caja",   desc:"Apertura y cierre de caja"},
      {key:"ver_reporte_caja",   label:"Ver reporte de caja",   desc:"Ver totales y movimientos de caja"},
    ]
  },
  {
    label: "📦 Inventario y Productos",
    permisos: [
      {key:"catalogo_productos",  label:"Catálogo de productos",  desc:"Crear, editar y desactivar productos"},
      {key:"entradas_inventario", label:"Entradas de inventario", desc:"Agregar stock y registrar compras"},
      {key:"catalogo_clientes",   label:"Catálogo de clientes",   desc:"Crear y editar clientes"},
    ]
  },
  {
    label: "📊 Administración",
    permisos: [
      {key:"reportes",          label:"Reportes de ventas",    desc:"Ver reportes y estadísticas"},
      {key:"gestion_usuarios",  label:"Gestión de usuarios",   desc:"Crear, editar y desactivar usuarios"},
      {key:"catalogo_bancos",   label:"Catálogo de bancos",    desc:"Gestionar bancos para transferencias"},
      {key:"config_iva",        label:"Configuración de IVA",  desc:"Cambiar porcentaje y modo de IVA"},
    ]
  },
  {
    label: "⚙️ Configuración avanzada",
    permisos: [
      {key:"sucursales",  label:"Gestión de sucursales", desc:"Crear y configurar sucursales"},
      {key:"config_fel",  label:"Configuración FEL/SAT", desc:"Configurar facturación electrónica"},
    ]
  },
];

const ALL_PERMISOS = GRUPOS.flatMap(g => g.permisos.map(p => p.key));

// Permisos por defecto de roles del sistema
const DEFAULTS_SISTEMA = {
  "Super Admin": Object.fromEntries(ALL_PERMISOS.map(k => [k, true])),
  "Admin":       Object.fromEntries(ALL_PERMISOS.map(k => [k, !["sucursales","config_fel"].includes(k)])),
  "Supervisor":  Object.fromEntries(ALL_PERMISOS.map(k => [k, ["pos","historial_propio","historial_global","anular_propio","anular_otros","abrir_cerrar_caja","ver_reporte_caja","catalogo_clientes","reportes","descuentos"].includes(k)])),
  "Cajero":      Object.fromEntries(ALL_PERMISOS.map(k => [k, ["pos","historial_propio","anular_propio","abrir_cerrar_caja"].includes(k)])),
};

const FORM_EMPTY = {nombre:"", descripcion:"", permisos: Object.fromEntries(ALL_PERMISOS.map(k=>[k,false]))};

export default function RolesModal({ onClose, isMobile, usuarioActual }) {
  const [roles,    setRoles]    = useState([]);
  const [tab,      setTab]      = useState("lista"); // lista | form
  const [form,     setForm]     = useState(FORM_EMPTY);
  const [editId,   setEditId]   = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { loadRoles(); }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const r = await sb("roles","GET",null,"?order=id");
      // Para cada rol, cargar sus permisos
      const rolesConPermisos = await Promise.all((r||[]).map(async rol => {
        const perms = await sb("rol_permisos","GET",null,`?rol_id=eq.${rol.id}`);
        const permMap = Object.fromEntries(ALL_PERMISOS.map(k=>[k,false]));
        (perms||[]).forEach(p => { permMap[p.permiso] = p.valor; });
        return { ...rol, permisos: permMap };
      }));
      setRoles(rolesConPermisos);
    } catch(e) { setError("Error cargando roles"); }
    setLoading(false);
  };

  const openNew = () => {
    setForm(FORM_EMPTY);
    setEditId(null); setError("");
    setTab("form");
  };

  const openEdit = (r) => {
    setForm({ nombre:r.nombre, descripcion:r.descripcion||"", permisos:{...r.permisos} });
    setEditId(r.id); setError("");
    setTab("form");
  };

  const duplicar = (r) => {
    setForm({ nombre:`${r.nombre} (copia)`, descripcion:r.descripcion||"", permisos:{...r.permisos} });
    setEditId(null); setError("");
    setTab("form");
  };

  const togglePermiso = (key) => {
    setForm(p => ({...p, permisos:{...p.permisos, [key]:!p.permisos[key]}}));
  };

  const toggleGrupo = (grupo) => {
    const keys = grupo.permisos.map(p=>p.key);
    const allOn = keys.every(k => form.permisos[k]);
    setForm(p => ({...p, permisos:{...p.permisos, ...Object.fromEntries(keys.map(k=>[k,!allOn]))}}));
  };

  const activarTodos = () => setForm(p=>({...p,permisos:Object.fromEntries(ALL_PERMISOS.map(k=>[k,true]))}));
  const desactivarTodos = () => setForm(p=>({...p,permisos:Object.fromEntries(ALL_PERMISOS.map(k=>[k,false]))}));

  const save = async () => {
    if (!form.nombre.trim()) { setError("El nombre del rol es requerido"); return; }
    setSaving(true); setError("");
    try {
      let rolId = editId;
      if (editId) {
        await sb(`roles?id=eq.${editId}`,"PATCH",{nombre:form.nombre.trim(),descripcion:form.descripcion.trim()||null});
        // Borrar permisos existentes y reinserta
        await sb(`rol_permisos?rol_id=eq.${editId}`,"DELETE");
      } else {
        const [newRol] = await sb("roles","POST",{nombre:form.nombre.trim(),descripcion:form.descripcion.trim()||null,es_sistema:false});
        rolId = newRol.id;
      }
      // Insertar permisos
      const permsToInsert = ALL_PERMISOS.map(k => ({rol_id:rolId, permiso:k, valor:form.permisos[k]||false}));
      await sb("rol_permisos","POST",permsToInsert);
      await loadRoles();
      setTab("lista"); setEditId(null); setForm(FORM_EMPTY);
    } catch(e) { setError("Error: "+e.message); }
    setSaving(false);
  };

  const toggleActivo = async (r) => {
    if (r.es_sistema) { setError("No puedes desactivar roles del sistema"); return; }
    await sb(`roles?id=eq.${r.id}`,"PATCH",{activo:!r.activo});
    await loadRoles();
  };

  const permisosActivos = (r) => ALL_PERMISOS.filter(k => r.permisos?.[k]).length;

  const ROLE_COLORS = ["#3B82F6","#16A34A","#7C3AED","#D97706","#DC2626","#0891B2","#059669","#9333EA"];
  const getRoleColor = (i) => ROLE_COLORS[i % ROLE_COLORS.length];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",width:isMobile?"95vw":640,maxHeight:"92vh",display:"flex",flexDirection:"column"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {tab==="form"&&(
              <button onClick={()=>{setTab("lista");setEditId(null);setForm(FORM_EMPTY);setError("");}}
                style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:13,fontWeight:600,padding:0}}>
                ← Volver
              </button>
            )}
            <h2 style={{color:C.text,fontSize:17,fontWeight:700,margin:0}}>
              🎭 {tab==="lista"?"Roles y Permisos":editId?"Editar rol":"Nuevo rol"}
            </h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer",padding:"4px 8px"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:24}}>

          {/* LISTA DE ROLES */}
          {tab==="lista"&&(
            <>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
                <button onClick={openNew} style={{...BP,padding:"8px 16px",fontSize:13}}>➕ Nuevo rol</button>
              </div>
              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}
              {loading?(
                <div style={{textAlign:"center",color:C.textSm,padding:40}}>Cargando roles...</div>
              ):roles.map((r,i)=>(
                <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",marginBottom:10,background:r.activo?C.card:C.panel,border:`1px solid ${C.border}`,borderRadius:10,opacity:r.activo?1:0.6}}>
                  {/* Color badge */}
                  <div style={{width:44,height:44,borderRadius:10,background:getRoleColor(i),display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                    {r.es_sistema?"🔒":"🎭"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                      <span style={{color:C.text,fontWeight:700,fontSize:15}}>{r.nombre}</span>
                      {r.es_sistema&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:C.amberBg,color:C.amber}}>Sistema</span>}
                      {!r.activo&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:C.redBg,color:C.red}}>Inactivo</span>}
                    </div>
                    {r.descripcion&&<div style={{color:C.textMd,fontSize:12,marginBottom:4}}>{r.descripcion}</div>}
                    <div style={{color:C.textSm,fontSize:11}}>
                      {permisosActivos(r)} de {ALL_PERMISOS.length} permisos activos
                    </div>
                    {/* Mini barra de permisos */}
                    <div style={{height:4,background:C.border,borderRadius:2,marginTop:6,width:"100%"}}>
                      <div style={{height:4,background:getRoleColor(i),borderRadius:2,width:`${(permisosActivos(r)/ALL_PERMISOS.length)*100}%`,transition:"width 0.3s"}}/>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    <button onClick={()=>duplicar(r)} style={{...BS,padding:"6px 10px",fontSize:11}} title="Duplicar">📋</button>
                    <button onClick={()=>openEdit(r)} style={{...BS,padding:"6px 10px",fontSize:12}}>✏️</button>
                    {!r.es_sistema&&(
                      <button onClick={()=>toggleActivo(r)} style={{padding:"6px 10px",fontSize:12,borderRadius:8,border:`1.5px solid ${C.border}`,cursor:"pointer",background:r.activo?C.amberBg:C.greenBg,color:r.activo?C.amber:C.green}}>
                        {r.activo?"⏸":"▶️"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* FORM ROL */}
          {tab==="form"&&(
            <>
              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}

              {/* Datos básicos */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>Información del rol</div>
                <div style={{marginBottom:12}}>
                  <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Nombre del rol *</label>
                  <input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))}
                    placeholder="Ej: Bodeguero, Contador, Repartidor..." style={IS}/>
                </div>
                <div>
                  <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Descripción</label>
                  <input value={form.descripcion} onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))}
                    placeholder="¿Qué hace este usuario?" style={IS}/>
                </div>
              </div>

              {/* Permisos */}
              <div style={{background:C.panel,borderRadius:10,padding:16,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                  <div style={{color:C.textMd,fontSize:13,fontWeight:600}}>Permisos</div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={activarTodos} style={{...BS,padding:"4px 10px",fontSize:11,color:C.green}}>✓ Todos</button>
                    <button onClick={desactivarTodos} style={{...BS,padding:"4px 10px",fontSize:11,color:C.red}}>✕ Ninguno</button>
                  </div>
                </div>

                {/* Resumen activos */}
                <div style={{background:C.blueBg,borderRadius:8,padding:"8px 14px",marginBottom:16,border:`1px solid ${C.blueBorder}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{color:C.blue,fontSize:13,fontWeight:600}}>
                      {ALL_PERMISOS.filter(k=>form.permisos[k]).length} permisos activos de {ALL_PERMISOS.length}
                    </span>
                    <div style={{height:6,background:"#BFDBFE",borderRadius:3,width:120}}>
                      <div style={{height:6,background:C.blue,borderRadius:3,width:`${(ALL_PERMISOS.filter(k=>form.permisos[k]).length/ALL_PERMISOS.length)*100}%`,transition:"width 0.2s"}}/>
                    </div>
                  </div>
                </div>

                {GRUPOS.map(grupo=>{
                  const keys = grupo.permisos.map(p=>p.key);
                  const allOn = keys.every(k=>form.permisos[k]);
                  const someOn = keys.some(k=>form.permisos[k]);
                  return(
                    <div key={grupo.label} style={{marginBottom:16}}>
                      {/* Header grupo */}
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <span style={{color:C.text,fontSize:13,fontWeight:600}}>{grupo.label}</span>
                        <button onClick={()=>toggleGrupo(grupo)} style={{
                          padding:"3px 10px",borderRadius:6,border:`1px solid ${C.border}`,cursor:"pointer",fontSize:11,fontWeight:600,
                          background:allOn?C.greenBg:someOn?C.amberBg:C.card,
                          color:allOn?C.green:someOn?C.amber:C.textSm
                        }}>
                          {allOn?"Desactivar grupo":"Activar grupo"}
                        </button>
                      </div>
                      {/* Permisos del grupo */}
                      <div style={{background:C.card,borderRadius:8,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                        {grupo.permisos.map((p,i)=>(
                          <div key={p.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderBottom:i<grupo.permisos.length-1?`1px solid ${C.border}`:"none"}}>
                            <div style={{flex:1}}>
                              <div style={{color:C.text,fontSize:13,fontWeight:500}}>{p.label}</div>
                              <div style={{color:C.textSm,fontSize:11,marginTop:1}}>{p.desc}</div>
                            </div>
                            <button onClick={()=>togglePermiso(p.key)} style={{
                              width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",position:"relative",flexShrink:0,
                              background:form.permisos[p.key]?C.blue:C.border,transition:"all 0.2s"
                            }}>
                              <div style={{position:"absolute",top:2,left:form.permisos[p.key]?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"all 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botones */}
              <div style={{display:"flex",gap:10,marginTop:20}}>
                <button onClick={()=>{setTab("lista");setEditId(null);setForm(FORM_EMPTY);setError("");}} style={{...BS,flex:1}}>Cancelar</button>
                <button onClick={save} disabled={saving} style={{...BP,flex:2,opacity:saving?0.6:1}}>
                  {saving?"⏳ Guardando...":editId?"✓ Actualizar rol":"✓ Crear rol"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
