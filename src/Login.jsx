import { useState } from "react";
import { cargarUsuarioCompleto, ROL_ICON, ROL_BG, ROL_COLOR, ROLES } from "./usuarios.js";

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
  blue:"#3B82F6", blueBg:"#EFF6FF",
  red:"#DC2626", redBg:"#FEF2F2", redBorder:"#FECACA",
};

export default function Login({ onLogin }) {
  const [mode,     setMode]     = useState("email");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [selUser,  setSelUser]  = useState(null);
  const [pin,      setPin]      = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const loadUsuarios = async () => {
    setLoading(true); setError("");
    try {
      const u = await sb("usuarios","GET",null,"?activo=eq.true&order=nombre");
      setUsuarios(u||[]);
      setMode("pin");
    } catch { setError("Error cargando usuarios"); }
    setLoading(false);
  };

  const finalizarLogin = async (u) => {
    const usuarioCompleto = await cargarUsuarioCompleto(u);
    localStorage.setItem("svpos_user", JSON.stringify(usuarioCompleto));
    onLogin(usuarioCompleto);
  };

  const loginEmail = async () => {
    if (!email || !password) { setError("Ingresa usuario/email y contraseña"); return; }
    setLoading(true); setError("");
    try {
      // Buscar por email o por username
      const isEmail = email.includes("@");
      const query = isEmail
        ? `?email=eq.${encodeURIComponent(email.trim())}&activo=eq.true`
        : `?username=eq.${encodeURIComponent(email.trim().toLowerCase())}&activo=eq.true`;
      const users = await sb("usuarios","GET",null,query);
      if (!users?.length) { setError("Usuario no encontrado"); setLoading(false); return; }
      const u = users[0];
      if (u.pin !== password) { setError("Contraseña incorrecta"); setLoading(false); return; }
      await finalizarLogin(u);
    } catch { setError("Error al iniciar sesión"); }
    setLoading(false);
  };

  const loginPin = async (p) => {
    if (!selUser) { setError("Selecciona un usuario"); return; }
    const pinFinal = p || pin;
    if (pinFinal.length < 4) return;
    setLoading(true); setError("");
    try {
      const users = await sb("usuarios","GET",null,`?id=eq.${selUser.id}&pin=eq.${pinFinal}&activo=eq.true`);
      if (!users?.length) { setError("PIN incorrecto"); setPin(""); setLoading(false); return; }
      await finalizarLogin(users[0]);
    } catch { setError("Error al verificar PIN"); }
    setLoading(false);
  };





  // Obtener color/bg del rol — soporta roles dinámicos y estáticos
  const getRolColor = (u) => ROL_COLOR[u.rol] || "#3B82F6";
  const getRolBg    = (u) => ROL_BG[u.rol]    || "#EFF6FF";
  const getRolIcon  = (u) => ROL_ICON[u.rol]  || "👤";
  const getRolLabel = (u) => ROLES[u.rol]     || u.rol || "Usuario";

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Inter,system-ui,sans-serif",padding:16}}>
      <div style={{width:"100%",maxWidth:420}}>

        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:8}}>⚡</div>
          <div style={{color:C.blue,fontSize:24,fontWeight:800,letterSpacing:1}}>SMART VALION</div>
          <div style={{color:C.textSm,fontSize:12,letterSpacing:2,marginTop:4}}>POS · ERP RETAIL</div>
        </div>

        <div style={{background:C.card,borderRadius:16,padding:28,boxShadow:"0 4px 24px rgba(0,0,0,0.08)",border:`1px solid ${C.border}`}}>

          {/* Tabs */}
          <div style={{display:"flex",background:C.panel,borderRadius:10,padding:4,marginBottom:24,border:`1px solid ${C.border}`}}>
            {[
              {id:"email", label:"📧 Email"},
              {id:"pin",   label:"🔢 PIN rápido"},
            ].map(t=>(
              <button key={t.id} onClick={()=>{setMode(t.id);setError("");setPin("");setSelUser(null);if(t.id==="pin")loadUsuarios();}} style={{
                flex:1,padding:"9px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,
                background:mode===t.id?C.card:"transparent",
                color:mode===t.id?C.blue:C.textSm,
                boxShadow:mode===t.id?"0 1px 4px rgba(0,0,0,0.08)":"none"
              }}>{t.label}</button>
            ))}
          </div>

          {/* EMAIL */}
          {mode==="email"&&(
            <div>
              <div style={{marginBottom:14}}>
                <label style={{color:C.textMd,fontSize:13,fontWeight:600,display:"block",marginBottom:6}}>Usuario o Email</label>
                <input value={email} onChange={e=>setEmail(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&loginEmail()}
                  placeholder="usuario o correo@empresa.com"
                  style={{background:C.panel,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"12px 14px",color:C.text,fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"}}/>
              </div>
              <div style={{marginBottom:20}}>
                <label style={{color:C.textMd,fontSize:13,fontWeight:600,display:"block",marginBottom:6}}>Contraseña / PIN</label>
                <input value={password} onChange={e=>setPassword(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&loginEmail()}
                  placeholder="••••" type="password"
                  style={{background:C.panel,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"12px 14px",color:C.text,fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"}}/>
              </div>
              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}
              <button onClick={loginEmail} disabled={loading}
                style={{background:C.blue,color:"#fff",border:"none",borderRadius:10,padding:"14px 0",fontSize:15,fontWeight:700,cursor:"pointer",width:"100%",opacity:loading?0.6:1}}>
                {loading?"Verificando...":"→ Iniciar sesión"}
              </button>
            </div>
          )}

          {/* PIN */}
          {mode==="pin"&&(
            <div>
              {!selUser?(
                <div>
                  <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>¿Quién eres?</div>
                  {loading?(
                    <div style={{textAlign:"center",color:C.textSm,padding:30}}>
                      <div style={{fontSize:24,marginBottom:8}}>⏳</div>
                      Cargando usuarios...
                    </div>
                  ):usuarios.length===0?(
                    <div style={{textAlign:"center",color:C.textSm,padding:30}}>
                      <div style={{fontSize:32,marginBottom:8}}>👤</div>
                      <div>No hay usuarios activos</div>
                    </div>
                  ):usuarios.map(u=>(
                    <button key={u.id} onClick={()=>{setSelUser(u);setPin("");setError("");}}
                      style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"13px 14px",marginBottom:8,background:C.panel,border:`1.5px solid ${C.border}`,borderRadius:10,cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.background=C.blueBg;}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.panel;}}>
                      <div style={{width:42,height:42,borderRadius:"50%",background:getRolBg(u),display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                        {getRolIcon(u)}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{color:C.text,fontWeight:600,fontSize:14}}>{u.nombre}</div>
                        <div style={{color:C.textSm,fontSize:12}}>{u.sucursal||"Principal"}</div>
                      </div>
                      <span style={{fontSize:10,padding:"2px 10px",borderRadius:20,fontWeight:600,background:getRolBg(u),color:getRolColor(u)}}>
                        {getRolLabel(u)}
                      </span>
                    </button>
                  ))}
                </div>
              ):(
                <div>
                  {/* Usuario seleccionado */}
                  <button onClick={()=>{setSelUser(null);setPin("");setError("");}}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:C.blueBg,border:`1.5px solid ${C.border}`,borderRadius:10,cursor:"pointer",width:"100%",marginBottom:24,textAlign:"left"}}>
                    <div style={{width:38,height:38,borderRadius:"50%",background:getRolBg(selUser),display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                      {getRolIcon(selUser)}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{color:C.text,fontWeight:700,fontSize:14}}>{selUser.nombre}</div>
                      <div style={{color:C.textSm,fontSize:11}}>← Toca para cambiar</div>
                    </div>
                  </button>

                  {/* Campo clave alfanumérica */}
                  <div style={{textAlign:"center",marginBottom:20}}>
                    <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:14}}>Ingresa tu clave</div>
                  </div>

                  {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14,textAlign:"center"}}>{error}</div>}

                  <input
                    type="password"
                    value={pin}
                    onChange={e=>{ setPin(e.target.value); setError(""); }}
                    onKeyDown={e=>e.key==="Enter"&&pin.length>=4&&loginPin(pin)}
                    placeholder="Clave de acceso..."
                    autoFocus
                    disabled={loading}
                    style={{width:"100%",padding:"14px 16px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:16,textAlign:"center",letterSpacing:4,outline:"none",boxSizing:"border-box",marginBottom:12,opacity:loading?0.6:1}}
                  />
                  <button onClick={()=>loginPin(pin)} disabled={loading||pin.length<4}
                    style={{width:"100%",padding:"14px 0",borderRadius:10,border:"none",background:C.blue,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",opacity:(loading||pin.length<4)?0.5:1}}>
                    {loading?"⏳ Verificando...":"→ Ingresar"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{textAlign:"center",color:C.textSm,fontSize:11,marginTop:20}}>
          Smart Valion POS · v1.0
        </div>
      </div>
    </div>
  );
}
