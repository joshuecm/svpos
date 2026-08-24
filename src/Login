import { useState } from "react";

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
  green:"#16A34A", greenBg:"#F0FDF4",
  red:"#DC2626", redBg:"#FEF2F2", redBorder:"#FECACA",
};

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
export default function Login({ onLogin }) {
  const [mode,     setMode]     = useState("email"); // "email" | "pin"
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [selUser,  setSelUser]  = useState(null);
  const [pin,      setPin]      = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Cargar usuarios para modo PIN
  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const u = await sb("usuarios","GET",null,"?activo=eq.true&order=nombre");
      setUsuarios(u||[]);
      setMode("pin");
    } catch { setError("Error cargando usuarios"); }
    setLoading(false);
  };

  // Login por email+password
  const loginEmail = async () => {
    if (!email || !password) { setError("Ingresa email y contraseña"); return; }
    setLoading(true); setError("");
    try {
      const users = await sb("usuarios","GET",null,`?email=eq.${encodeURIComponent(email)}&activo=eq.true`);
      if (!users?.length) { setError("Usuario no encontrado"); setLoading(false); return; }
      const u = users[0];
      if (u.pin !== password && u.email !== email) { setError("Credenciales incorrectas"); setLoading(false); return; }
      // Simple check — en producción usar Supabase Auth
      if (u.pin === password || password === u.pin) {
        localStorage.setItem("svpos_user", JSON.stringify(u));
        onLogin(u);
      } else {
        setError("Contraseña incorrecta");
      }
    } catch { setError("Error al iniciar sesión"); }
    setLoading(false);
  };

  // Login por PIN
  const loginPin = async (p) => {
    if (!selUser) { setError("Selecciona un usuario"); return; }
    const pinFinal = p || pin;
    if (pinFinal.length < 4) return;
    setLoading(true); setError("");
    try {
      const users = await sb("usuarios","GET",null,`?id=eq.${selUser.id}&pin=eq.${pinFinal}&activo=eq.true`);
      if (!users?.length) { setError("PIN incorrecto"); setPin(""); setLoading(false); return; }
      const u = users[0];
      localStorage.setItem("svpos_user", JSON.stringify(u));
      onLogin(u);
    } catch { setError("Error al verificar PIN"); }
    setLoading(false);
  };

  const addPin = (d) => {
    if (pin.length >= 4) return;
    const newPin = pin + d;
    setPin(newPin);
    setError("");
    if (newPin.length === 4) loginPin(newPin);
  };

  const delPin = () => setPin(p => p.slice(0,-1));

  const ROL_LABEL = {super_admin:"Super Admin",admin:"Admin",supervisor:"Supervisor",cajero:"Cajero"};
  const ROL_COLOR = {super_admin:C.red,admin:C.blue,supervisor:"#7C3AED",cajero:C.green};
  const ROL_BG    = {super_admin:C.redBg,admin:C.blueBg,supervisor:"#F5F3FF",cajero:C.greenBg};

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Inter,system-ui,sans-serif",padding:16}}>
      <div style={{width:"100%",maxWidth:420}}>

        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:40,marginBottom:8}}>⚡</div>
          <div style={{color:C.blue,fontSize:22,fontWeight:800,letterSpacing:1}}>SMART VALION</div>
          <div style={{color:C.textSm,fontSize:12,letterSpacing:2,marginTop:2}}>POS · ERP RETAIL</div>
        </div>

        <div style={{background:C.card,borderRadius:16,padding:28,boxShadow:"0 4px 24px rgba(0,0,0,0.08)",border:`1px solid ${C.border}`}}>

          {/* Tabs */}
          <div style={{display:"flex",background:C.panel,borderRadius:10,padding:4,marginBottom:24,border:`1px solid ${C.border}`}}>
            <button onClick={()=>{setMode("email");setError("");setPin("");setSelUser(null);}} style={{
              flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,
              background:mode==="email"?C.card:"transparent",
              color:mode==="email"?C.blue:C.textSm,
              boxShadow:mode==="email"?"0 1px 4px rgba(0,0,0,0.08)":"none"
            }}>📧 Email</button>
            <button onClick={loadUsuarios} style={{
              flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,
              background:mode==="pin"?C.card:"transparent",
              color:mode==="pin"?C.blue:C.textSm,
              boxShadow:mode==="pin"?"0 1px 4px rgba(0,0,0,0.08)":"none"
            }}>🔢 PIN rápido</button>
          </div>

          {/* EMAIL MODE */}
          {mode==="email"&&(
            <div>
              <div style={{marginBottom:14}}>
                <label style={{color:C.textMd,fontSize:13,fontWeight:600,display:"block",marginBottom:6}}>Email</label>
                <input value={email} onChange={e=>setEmail(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&loginEmail()}
                  placeholder="usuario@empresa.com" type="email"
                  style={{background:C.panel,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"11px 14px",color:C.text,fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"}}/>
              </div>
              <div style={{marginBottom:20}}>
                <label style={{color:C.textMd,fontSize:13,fontWeight:600,display:"block",marginBottom:6}}>Contraseña / PIN</label>
                <input value={password} onChange={e=>setPassword(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&loginEmail()}
                  placeholder="••••" type="password"
                  style={{background:C.panel,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"11px 14px",color:C.text,fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"}}/>
              </div>
              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}
              <button onClick={loginEmail} disabled={loading}
                style={{background:C.blue,color:"#fff",border:"none",borderRadius:10,padding:"13px 0",fontSize:15,fontWeight:700,cursor:"pointer",width:"100%",opacity:loading?0.6:1}}>
                {loading?"Verificando...":"Iniciar sesión"}
              </button>
            </div>
          )}

          {/* PIN MODE */}
          {mode==="pin"&&(
            <div>
              {/* Seleccionar usuario */}
              {!selUser?(
                <div>
                  <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>¿Quién eres?</div>
                  {loading?(
                    <div style={{textAlign:"center",color:C.textSm,padding:30}}>Cargando usuarios...</div>
                  ):usuarios.length===0?(
                    <div style={{textAlign:"center",color:C.textSm,padding:30}}>
                      <div style={{fontSize:32,marginBottom:8}}>👤</div>
                      <div>No hay usuarios activos</div>
                    </div>
                  ):usuarios.map(u=>(
                    <button key={u.id} onClick={()=>{setSelUser(u);setPin("");setError("");}}
                      style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"12px 14px",marginBottom:8,background:C.panel,border:`1.5px solid ${C.border}`,borderRadius:10,cursor:"pointer",textAlign:"left"}}>
                      <div style={{width:40,height:40,borderRadius:"50%",background:ROL_BG[u.rol]||C.blueBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                        {u.rol==="super_admin"?"👑":u.rol==="admin"?"🛡️":u.rol==="supervisor"?"👔":"🧑‍💼"}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{color:C.text,fontWeight:600,fontSize:14}}>{u.nombre}</div>
                        <div style={{color:C.textSm,fontSize:12}}>{u.sucursal}</div>
                      </div>
                      <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:ROL_BG[u.rol]||C.blueBg,color:ROL_COLOR[u.rol]||C.blue}}>
                        {ROL_LABEL[u.rol]||u.rol}
                      </span>
                    </button>
                  ))}
                </div>
              ):(
                <div>
                  {/* Usuario seleccionado */}
                  <button onClick={()=>{setSelUser(null);setPin("");setError("");}}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:C.blueBg,border:`1.5px solid ${C.border}`,borderRadius:10,cursor:"pointer",width:"100%",marginBottom:20,textAlign:"left"}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:ROL_BG[selUser.rol]||C.blueBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                      {selUser.rol==="super_admin"?"👑":selUser.rol==="admin"?"🛡️":selUser.rol==="supervisor"?"👔":"🧑‍💼"}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{color:C.text,fontWeight:600,fontSize:14}}>{selUser.nombre}</div>
                      <div style={{color:C.textSm,fontSize:11}}>Toca para cambiar</div>
                    </div>
                    <span style={{color:C.textSm,fontSize:18}}>‹</span>
                  </button>

                  {/* PIN display */}
                  <div style={{textAlign:"center",marginBottom:20}}>
                    <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>Ingresa tu PIN</div>
                    <div style={{display:"flex",justifyContent:"center",gap:12}}>
                      {[0,1,2,3].map(i=>(
                        <div key={i} style={{width:16,height:16,borderRadius:"50%",background:i<pin.length?C.blue:C.border,transition:"all 0.15s"}}/>
                      ))}
                    </div>
                  </div>

                  {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14,textAlign:"center"}}>{error}</div>}

                  {/* Teclado PIN */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                    {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>(
                      <button key={i} onClick={()=>d==="⌫"?delPin():d!==""&&addPin(String(d))}
                        disabled={loading||d===""}
                        style={{
                          padding:"16px 0",borderRadius:12,border:`1.5px solid ${C.border}`,
                          background:d==="⌫"?C.redBg:d===""?"transparent":C.card,
                          color:d==="⌫"?C.red:C.text,
                          fontSize:d==="⌫"?20:22,fontWeight:600,cursor:d===""?"default":"pointer",
                          boxShadow:d!==""?"0 1px 3px rgba(0,0,0,0.06)":"none",
                          opacity:loading?0.6:1,
                        }}>
                        {loading&&d===0?"...":d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{textAlign:"center",color:C.textSm,fontSize:11,marginTop:16}}>
          Smart Valion POS · v1.0 · Powered by Smart Valion
        </div>
      </div>
    </div>
  );
}
