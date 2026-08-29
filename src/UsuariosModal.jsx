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
};

const IS = {background:"#fff",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 14px",color:"#1E293B",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"};
const BP = {background:"#3B82F6",color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:"pointer"};
const BS = {background:"#fff",color:"#475569",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"};
const BD = {background:"#FEF2F2",color:"#DC2626",border:"1.5px solid #FECACA",borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"};

const ROLE_COLORS = ["#DC2626","#3B82F6","#7C3AED","#16A34A","#D97706","#0891B2","#059669","#9333EA"];
const getRoleColor = (i) => ROLE_COLORS[i % ROLE_COLORS.length];
const getRoleBg    = (color) => color + "15";

const FORM_EMPTY = {nombre:"",email:"",username:"",pin:"",rol_id:"",rol:"cajero",sucursal:"Principal",serie_correlativo:"A",activo:true};

export default function UsuariosModal({ usuarioActual, isMobile, onClose }) {
  const [usuarios, setUsuarios] = useState([]);
  const [roles,    setRoles]    = useState([]);
  const [form,     setForm]     = useState(FORM_EMPTY);
  const [editId,   setEditId]   = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [tab,      setTab]      = useState("lista");
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([
        sb("usuarios","GET",null,"?order=nombre"),
        sb("roles","GET",null,"?activo=eq.true&order=id"),
      ]);
      setUsuarios(u||[]);
      setRoles(r||[]);
    } catch { setError("Error cargando datos"); }
    setLoading(false);
  };

  const openNew = () => {
    setForm({...FORM_EMPTY, rol_id: roles[0]?.id||""});
    setEditId(null); setError(""); setTab("form");
  };

  const openEdit = (u) => {
    setForm({
      nombre: u.nombre, email: u.email||"", username: u.username||"", pin: u.pin||"",
      rol_id: u.rol_id||"", rol: u.rol||"cajero",
      sucursal: u.sucursal||"Principal",
      serie_correlativo: u.serie_correlativo||"A",
      activo: u.activo,
    });
    setEditId(u.id); setError(""); setTab("form");
  };

  const save = async () => {
    if (!form.nombre.trim()) { setError("El nombre es requerido"); return; }
    if (!form.pin || form.pin.length < 4) { setError("La clave debe tener al menos 4 caracteres"); return; }
    // Validar que el PIN sea único
    const pinExiste = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?pin=eq.${encodeURIComponent(form.pin)}&activo=eq.true${editId?`&id=neq.${editId}`:""}`,{
      headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`}
    }).then(r=>r.json());
    if(pinExiste?.length>0){ setError("Esa clave ya está en uso — elige una diferente"); return; }
    
    setSaving(true); setError("");
    try {
      // Obtener nombre del rol seleccionado para mantener compatibilidad
      const rolSeleccionado = roles.find(r => String(r.id) === String(form.rol_id));
      const rolNombre = rolSeleccionado?.nombre?.toLowerCase().replace(" ","_") || "cajero";

      const payload = {
        nombre: form.nombre.trim(),
        email:  form.email.trim()||null,
        username: form.username.trim()||null,
        pin:    form.pin,
        rol:    rolNombre,
        rol_id: form.rol_id ? parseInt(form.rol_id) : null,
        sucursal: form.sucursal,
        serie_correlativo: form.serie_correlativo.toUpperCase(),
        activo: form.activo,
      };
      if (editId) {
        await sb(`usuarios?id=eq.${editId}`,"PATCH",payload);
      } else {
        await sb("usuarios","POST",payload);
      }
      await loadAll();
      setTab("lista"); setEditId(null); setForm(FORM_EMPTY);
    } catch(e) { setError("Error: "+e.message); }
    setSaving(false);
  };

  const toggleActivo = async (u) => {
    if (u.rol==="super_admin"||u.id===usuarioActual?.id) return;
    await sb(`usuarios?id=eq.${u.id}`,"PATCH",{activo:!u.activo});
    await loadAll();
  };

  const getRolUsuario = (u) => roles.find(r => r.id === u.rol_id);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",width:isMobile?"95vw":"580px",maxHeight:"92vh",display:"flex",flexDirection:"column"}}>

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
              {loading?(
                <div style={{textAlign:"center",color:C.textSm,padding:40}}>Cargando...</div>
              ):usuarios.length===0?(
                <div style={{textAlign:"center",color:C.textSm,padding:40}}>
                  <div style={{fontSize:40,marginBottom:12}}>👥</div>
                  <div>No hay usuarios registrados</div>
                </div>
              ):usuarios.map((u,i)=>{
                const rol = getRolUsuario(u);
                const rolColor = getRoleColor(roles.findIndex(r=>r.id===u.rol_id));
                return(
                  <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",marginBottom:10,background:u.activo?C.card:C.panel,border:`1px solid ${C.border}`,borderRadius:10,opacity:u.activo?1:0.6}}>
                    <div style={{width:44,height:44,borderRadius:"50%",background:getRoleBg(rolColor),display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,border:`2px solid ${rolColor}20`}}>
                      {u.rol==="super_admin"?"👑":u.rol==="admin"?"🛡️":u.rol==="supervisor"?"👔":"🧑‍💼"}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:2}}>
                        <span style={{color:C.text,fontWeight:700,fontSize:14}}>{u.nombre}</span>
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:getRoleBg(rolColor),color:rolColor}}>
                          {rol?.nombre||u.rol||"Sin rol"}
                        </span>
                        {!u.activo&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:C.redBg,color:C.red}}>Inactivo</span>}
                        {u.id===usuarioActual?.id&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:C.greenBg,color:C.green}}>Tú</span>}
                      </div>
                      <div style={{color:C.textSm,fontSize:11}}>{u.sucursal||"Principal"} · Serie: {u.serie_correlativo||"A"}{u.email?` · ${u.email}`:""}</div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      <button onClick={()=>openEdit(u)} style={{...BS,padding:"6px 10px",fontSize:12}}>✏️</button>
                      {u.id!==usuarioActual?.id&&u.rol!=="super_admin"&&(
                        <button onClick={()=>toggleActivo(u)} style={{padding:"6px 10px",fontSize:12,borderRadius:8,border:`1.5px solid ${C.border}`,cursor:"pointer",background:u.activo?C.amberBg:C.greenBg,color:u.activo?C.amber:C.green}}>
                          {u.activo?"⏸":"▶️"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Nombre de usuario</label>
                    <input value={form.username||""} onChange={e=>setForm(p=>({...p,username:e.target.value.toLowerCase().replace(/\s/g,"")}))}
                      placeholder="Ej: mlopez, cajero1" style={IS}/>
                    <div style={{color:C.textSm,fontSize:11,marginTop:3}}>Para iniciar sesión sin email</div>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Email</label>
                    <input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}
                      placeholder="usuario@empresa.com" type="email" style={IS}/>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Clave de acceso * (mín. 4 caracteres)</label>
                    <input value={form.pin} onChange={e=>setForm(p=>({...p,pin:e.target.value}))}
                      placeholder="Clave alfanumérica" type="password" style={IS}/>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Sucursal</label>
                    <input value={form.sucursal} onChange={e=>setForm(p=>({...p,sucursal:e.target.value}))}
                      placeholder="Principal" style={IS}/>
                  </div>
                </div>

                {/* Serie correlativo */}
                <div style={{marginBottom:12}}>
                  <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Serie de correlativo</label>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <input value={form.serie_correlativo} onChange={e=>setForm(p=>({...p,serie_correlativo:e.target.value.toUpperCase().slice(0,2)}))}
                      placeholder="A" maxLength={2}
                      style={{...IS,width:72,textAlign:"center",fontSize:18,fontWeight:700}}/>
                    <div style={{color:C.textSm,fontSize:12}}>
                      Ventas: <strong style={{color:C.blue}}>{form.serie_correlativo||"A"}-000001, {form.serie_correlativo||"A"}-000002...</strong>
                    </div>
                  </div>
                </div>

                {/* Toggle activo */}
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <button onClick={()=>setForm(p=>({...p,activo:!p.activo}))} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",position:"relative",background:form.activo?C.blue:C.border,transition:"all 0.2s"}}>
                    <div style={{position:"absolute",top:2,left:form.activo?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"all 0.2s"}}/>
                  </button>
                  <span style={{color:C.textMd,fontSize:13}}>{form.activo?"Usuario activo":"Usuario inactivo"}</span>
                </div>
              </div>

              {/* Rol dinámico */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:20,border:`1px solid ${C.border}`}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>Rol asignado</div>
                {roles.length===0?(
                  <div style={{color:C.textSm,fontSize:13,textAlign:"center",padding:20}}>
                    No hay roles disponibles. Crea roles primero en <strong>Configuración → Roles</strong>.
                  </div>
                ):(
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
                    {roles.map((r,i)=>{
                      const color = getRoleColor(i);
                      const sel = String(form.rol_id)===String(r.id);
                      return(
                        <button key={r.id} onClick={()=>setForm(p=>({...p,rol_id:r.id}))} style={{
                          padding:"12px",borderRadius:10,cursor:"pointer",textAlign:"left",
                          border:`2px solid ${sel?color:C.border}`,
                          background:sel?getRoleBg(color):C.card,
                          transition:"all 0.15s",
                        }}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                            <div style={{width:28,height:28,borderRadius:6,background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>
                              {r.es_sistema?"🔒":"🎭"}
                            </div>
                            <span style={{color:sel?color:C.text,fontWeight:700,fontSize:13}}>{r.nombre}</span>
                          </div>
                          {r.descripcion&&<div style={{color:C.textSm,fontSize:11}}>{r.descripcion}</div>}
                          {r.es_sistema&&<div style={{color:C.amber,fontSize:10,marginTop:4,fontWeight:600}}>Rol del sistema</div>}
                        </button>
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
