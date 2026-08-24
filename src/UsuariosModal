import { useState, useEffect } from "react";
import { ROLES, ROL_COLOR, ROL_BG, ROL_ICON, tienePermiso } from "./usuarios.js";

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
};

const IS = {background:"#fff",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 14px",color:"#1E293B",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"};
const BP = {background:"#3B82F6",color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:"pointer"};
const BS = {background:"#fff",color:"#475569",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"};
const BD = {background:"#FEF2F2",color:"#DC2626",border:"1.5px solid #FECACA",borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"};

const PERMISOS_LABELS = {
  pos:                 "Punto de Venta",
  historial_propio:    "Ver historial propio",
  historial_global:    "Ver historial global",
  anular_propio:       "Anular ventas propias",
  anular_otros:        "Anular ventas de otros",
  abrir_cerrar_caja:   "Abrir / Cerrar caja",
  ver_reporte_caja:    "Ver reporte de caja",
  catalogo_productos:  "Catálogo de productos",
  catalogo_clientes:   "Catálogo de clientes",
  entradas_inventario: "Entradas de inventario",
  reportes:            "Reportes de ventas",
  gestion_usuarios:    "Gestión de usuarios",
  config_iva:          "Configuración de IVA",
  catalogo_bancos:     "Catálogo de bancos",
  descuentos:          "Aplicar descuentos",
};

const FORM_EMPTY = {nombre:"",email:"",pin:"",rol:"cajero",sucursal:"Principal",serie_correlativo:"A",activo:true,permisos:{}};

export default function UsuariosModal({ usuarioActual, isMobile, onClose }) {
  const [usuarios,   setUsuarios]   = useState([]);
  const [form,       setForm]       = useState(FORM_EMPTY);
  const [editId,     setEditId]     = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [tab,        setTab]        = useState("lista"); // "lista" | "form"
  const [showPerms,  setShowPerms]  = useState(false);

  useEffect(()=>{ loadUsuarios(); },[]);

  const loadUsuarios = async () => {
    try {
      const u = await sb("usuarios","GET",null,"?order=nombre");
      setUsuarios(u||[]);
    } catch(e) { setError("Error cargando usuarios"); }
  };

  const openNew = () => {
    setForm(FORM_EMPTY); setEditId(null); setError(""); setShowPerms(false); setTab("form");
  };

  const openEdit = (u) => {
    setForm({
      nombre:u.nombre, email:u.email||"", pin:u.pin||"",
      rol:u.rol, sucursal:u.sucursal||"Principal",
      serie_correlativo:u.serie_correlativo||"A",
      activo:u.activo, permisos:u.permisos||{},
    });
    setEditId(u.id); setError(""); setShowPerms(false); setTab("form");
  };

  const save = async () => {
    if (!form.nombre.trim()) { setError("El nombre es requerido"); return; }
    if (!form.pin || form.pin.length !== 4) { setError("El PIN debe ser de 4 dígitos"); return; }
    if (!/^\d{4}$/.test(form.pin)) { setError("El PIN solo puede contener números"); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        nombre: form.nombre.trim(),
        email:  form.email.trim()||null,
        pin:    form.pin,
        rol:    form.rol,
        sucursal: form.sucursal,
        serie_correlativo: form.serie_correlativo.toUpperCase(),
        activo: form.activo,
        permisos: form.permisos,
      };
      if (editId) {
        await sb(`usuarios?id=eq.${editId}`,"PATCH",payload);
      } else {
        await sb("usuarios","POST",payload);
      }
      await loadUsuarios();
      setTab("lista"); setEditId(null); setForm(FORM_EMPTY);
    } catch(e) { setError("Error: "+e.message); }
    setSaving(false);
  };

  const toggleActivo = async (u) => {
    if (u.rol==="super_admin") { setError("No puedes desactivar al Super Admin"); return; }
    await sb(`usuarios?id=eq.${u.id}`,"PATCH",{activo:!u.activo});
    await loadUsuarios();
  };

  const togglePermiso = (key) => {
    setForm(prev=>{
      const current = prev.permisos[key];
      const newPermisos = {...prev.permisos};
      if (current === undefined) {
        // Agregar override contrario al rol
        newPermisos[key] = !tienePermiso({rol:prev.rol,permisos:{}},key);
      } else {
        // Quitar override — vuelve al default del rol
        delete newPermisos[key];
      }
      return {...prev, permisos:newPermisos};
    });
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",width:isMobile?"95vw":"600px",maxHeight:"92vh",display:"flex",flexDirection:"column"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {tab==="form"&&(
              <button onClick={()=>{setTab("lista");setEditId(null);setForm(FORM_EMPTY);setError("");}}
                style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:13,fontWeight:600,padding:0}}>
                ← Volver
              </button>
            )}
            <h2 style={{color:C.text,fontSize:17,fontWeight:700,margin:0}}>
              👥 {tab==="lista"?"Usuarios":editId?"Editar usuario":"Nuevo usuario"}
            </h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer",padding:"4px 8px"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:24}}>

          {/* LISTA */}
          {tab==="lista"&&(
            <>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
                <button onClick={openNew} style={{...BP,padding:"8px 16px",fontSize:13}}>➕ Nuevo usuario</button>
              </div>
              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}
              {usuarios.length===0?(
                <div style={{textAlign:"center",color:C.textSm,padding:40}}>
                  <div style={{fontSize:40,marginBottom:12}}>👥</div>
                  <div>No hay usuarios registrados</div>
                </div>
              ):usuarios.map(u=>(
                <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",marginBottom:10,background:u.activo?C.card:C.panel,border:`1px solid ${u.activo?C.border:C.border}`,borderRadius:10,opacity:u.activo?1:0.6}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:ROL_BG[u.rol]||C.blueBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                    {ROL_ICON[u.rol]||"👤"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{color:C.text,fontWeight:700,fontSize:14}}>{u.nombre}</span>
                      <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:ROL_BG[u.rol]||C.blueBg,color:ROL_COLOR[u.rol]||C.blue}}>
                        {ROLES[u.rol]||u.rol}
                      </span>
                      {!u.activo&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:C.redBg,color:C.red}}>Inactivo</span>}
                    </div>
                    <div style={{color:C.textSm,fontSize:12,marginTop:2}}>
                      {u.sucursal} · Serie: {u.serie_correlativo} {u.email?`· ${u.email}`:""}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <button onClick={()=>openEdit(u)} style={{...BS,padding:"6px 10px",fontSize:12}}>✏️</button>
                    {u.id!==usuarioActual?.id&&(
                      <button onClick={()=>toggleActivo(u)} style={{padding:"6px 10px",fontSize:12,borderRadius:8,border:`1.5px solid ${C.border}`,cursor:"pointer",background:u.activo?C.amberBg:C.greenBg,color:u.activo?C.amber:C.green}}>
                        {u.activo?"⏸":"▶️"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* FORM */}
          {tab==="form"&&(
            <>
              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}

              {/* Datos básicos */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>Datos del usuario</div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Nombre completo *</label>
                    <input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))}
                      placeholder="Ej: María López" style={IS}/>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Email</label>
                    <input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}
                      placeholder="usuario@empresa.com" type="email" style={IS}/>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>PIN de acceso * (4 dígitos)</label>
                    <input value={form.pin} onChange={e=>setForm(p=>({...p,pin:e.target.value.replace(/\D/g,"").slice(0,4)}))}
                      placeholder="••••" type="password" maxLength={4} style={IS}/>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Sucursal</label>
                    <input value={form.sucursal} onChange={e=>setForm(p=>({...p,sucursal:e.target.value}))}
                      placeholder="Principal" style={IS}/>
                  </div>
                </div>

                {/* Serie correlativo */}
                <div style={{marginBottom:12}}>
                  <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>
                    Serie de correlativo (letra que identifica al cajero)
                  </label>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input value={form.serie_correlativo} onChange={e=>setForm(p=>({...p,serie_correlativo:e.target.value.toUpperCase().slice(0,2)}))}
                      placeholder="A" maxLength={2}
                      style={{...IS,width:80,textAlign:"center",fontSize:18,fontWeight:700}}/>
                    <div style={{color:C.textSm,fontSize:12}}>
                      Las ventas se identificarán como:<br/>
                      <strong style={{color:C.blue}}>{form.serie_correlativo||"A"}-000001, {form.serie_correlativo||"A"}-000002...</strong>
                    </div>
                  </div>
                </div>

                {/* Activo */}
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <button onClick={()=>setForm(p=>({...p,activo:!p.activo}))} style={{
                    width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",position:"relative",
                    background:form.activo?C.blue:C.border,transition:"all 0.2s"
                  }}>
                    <div style={{position:"absolute",top:2,left:form.activo?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"all 0.2s"}}/>
                  </button>
                  <span style={{color:C.textMd,fontSize:13}}>{form.activo?"Usuario activo":"Usuario inactivo"}</span>
                </div>
              </div>

              {/* Rol */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>Rol</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {Object.entries(ROLES).map(([key,label])=>{
                    // Cajero no puede crear super_admin
                    if(key==="super_admin"&&usuarioActual?.rol!=="super_admin") return null;
                    const sel = form.rol===key;
                    return(
                      <button key={key} onClick={()=>setForm(p=>({...p,rol:key,permisos:{}}))} style={{
                        padding:"12px",borderRadius:10,cursor:"pointer",textAlign:"left",
                        border:`2px solid ${sel?ROL_COLOR[key]:C.border}`,
                        background:sel?ROL_BG[key]:C.card,
                      }}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                          <span style={{fontSize:18}}>{ROL_ICON[key]}</span>
                          <span style={{color:sel?ROL_COLOR[key]:C.text,fontWeight:700,fontSize:13}}>{label}</span>
                        </div>
                        <div style={{color:C.textSm,fontSize:11}}>
                          {key==="super_admin"?"Acceso total al sistema":
                           key==="admin"?"Gestión completa sin config crítica":
                           key==="supervisor"?"Operación + reportes + anulaciones":
                           "Solo punto de venta"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Permisos personalizados */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:20,border:`1px solid ${C.border}`}}>
                <button onClick={()=>setShowPerms(p=>!p)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"none",border:"none",cursor:"pointer",padding:0}}>
                  <div style={{color:C.textMd,fontSize:13,fontWeight:600}}>⚡ Permisos personalizados</div>
                  <span style={{color:C.textSm,fontSize:18}}>{showPerms?"▲":"▼"}</span>
                </button>
                {!showPerms&&(
                  <div style={{color:C.textSm,fontSize:12,marginTop:6}}>
                    Basado en rol <strong>{ROLES[form.rol]}</strong> · Expande para personalizar permisos individuales
                  </div>
                )}
                {showPerms&&(
                  <div style={{marginTop:12}}>
                    <div style={{color:C.textSm,fontSize:11,marginBottom:10}}>
                      Los permisos marcados en gris son del rol. Los que cambies aquí sobreescriben el rol para este usuario.
                    </div>
                    {Object.entries(PERMISOS_LABELS).map(([key,label])=>{
                      const fromRol   = tienePermiso({rol:form.rol,permisos:{}},key);
                      const hasOverride = typeof form.permisos[key]==="boolean";
                      const effective = hasOverride ? form.permisos[key] : fromRol;
                      return(
                        <div key={key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                          <div>
                            <span style={{color:C.text,fontSize:13}}>{label}</span>
                            {hasOverride&&<span style={{color:C.amber,fontSize:10,marginLeft:6,fontWeight:600}}>personalizado</span>}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            {hasOverride&&(
                              <button onClick={()=>togglePermiso(key)} style={{color:C.textSm,background:"none",border:"none",cursor:"pointer",fontSize:11}}>reset</button>
                            )}
                            <button onClick={()=>togglePermiso(key)} style={{
                              width:40,height:22,borderRadius:11,border:"none",cursor:"pointer",position:"relative",
                              background:effective?C.blue:C.border,transition:"all 0.2s"
                            }}>
                              <div style={{position:"absolute",top:2,left:effective?20:2,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"all 0.2s"}}/>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{setTab("lista");setEditId(null);setForm(FORM_EMPTY);setError("");}} style={{...BS,flex:1}}>Cancelar</button>
                <button onClick={save} disabled={saving} style={{...BP,flex:2,opacity:saving?0.6:1}}>
                  {saving?"⏳ Guardando...":editId?"✓ Actualizar":"✓ Crear usuario"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
