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

const fmt = (n) => `Q ${Number(n||0).toFixed(2)}`;

const FORM_EMPTY = {
  nombre:"", nit:"CF", telefono:"", email:"",
  direccion:"", departamento:"", municipio:"",
  credito:false, limite_credito:0, dias_credito:30,
  saldo_credito:0, activo:true, notas:"",
};

export default function ClientesModal({ onClose, isMobile }) {
  const [clientes,  setClientes]  = useState([]);
  const [tab,       setTab]       = useState("lista");
  const [form,      setForm]      = useState(FORM_EMPTY);
  const [editId,    setEditId]    = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filtro,    setFiltro]    = useState("todos"); // todos | credito | activo

  useEffect(() => { loadClientes(); }, []);

  const loadClientes = async () => {
    setLoading(true);
    try {
      const c = await sb("clientes","GET",null,"?order=nombre");
      setClientes(c||[]);
    } catch { setError("Error cargando clientes"); }
    setLoading(false);
  };

  const openNew = () => {
    setForm(FORM_EMPTY); setEditId(null); setError(""); setTab("form");
  };

  const openEdit = (c) => {
    setForm({
      nombre: c.nombre||"", nit: c.nit||"CF",
      telefono: c.telefono||"", email: c.email||"",
      direccion: c.direccion||"", departamento: c.departamento||"",
      municipio: c.municipio||"", credito: c.credito||false,
      limite_credito: c.limite_credito||0, dias_credito: c.dias_credito||30,
      saldo_credito: c.saldo_credito||0, activo: c.activo,
      notas: c.notas||"",
    });
    setEditId(c.id); setError(""); setTab("form");
  };

  const save = async () => {
    if (!form.nombre.trim()) { setError("El nombre es requerido"); return; }
    if (form.credito && (!form.limite_credito || parseFloat(form.limite_credito) <= 0)) {
      setError("El límite de crédito debe ser mayor a 0"); return;
    }
    setSaving(true); setError("");
    try {
      const payload = {
        nombre:         form.nombre.trim(),
        nit:            form.nit.trim()||"CF",
        telefono:       form.telefono.trim()||null,
        email:          form.email.trim()||null,
        direccion:      form.direccion.trim()||null,
        departamento:   form.departamento.trim()||null,
        municipio:      form.municipio.trim()||null,
        credito:        form.credito,
        limite_credito: form.credito ? parseFloat(form.limite_credito)||0 : 0,
        dias_credito:   form.credito ? parseInt(form.dias_credito)||30 : 30,
        saldo_credito:  parseFloat(form.saldo_credito)||0,
        activo:         form.activo,
        notas:          form.notas.trim()||null,
      };
      if (editId) {
        await sb(`clientes?id=eq.${editId}`,"PATCH",payload);
      } else {
        await sb("clientes","POST",payload);
      }
      await loadClientes();
      setTab("lista"); setEditId(null); setForm(FORM_EMPTY);
    } catch(e) { setError("Error: "+e.message); }
    setSaving(false);
  };

  const toggleActivo = async (c) => {
    if (c.nit==="CF") return; // No desactivar Consumidor Final
    await sb(`clientes?id=eq.${c.id}`,"PATCH",{activo:!c.activo});
    setClientes(prev=>prev.map(cl=>cl.id===c.id?{...cl,activo:!cl.activo}:cl));
  };

  // Filtros
  const filtered = clientes.filter(c => {
    const ms = search===""||
      c.nombre.toLowerCase().includes(search.toLowerCase())||
      (c.nit||"").toLowerCase().includes(search.toLowerCase())||
      (c.telefono||"").includes(search);
    const mf = filtro==="todos" ? true
      : filtro==="credito" ? c.credito
      : filtro==="activo"  ? c.activo : true;
    return ms && mf;
  });

  // Stats
  const totalCredito    = clientes.filter(c=>c.credito).length;
  const totalSaldo      = clientes.reduce((s,c)=>s+parseFloat(c.saldo_credito||0),0);
  const totalDisponible = clientes.reduce((s,c)=>s+(c.credito?parseFloat(c.limite_credito||0)-parseFloat(c.saldo_credito||0):0),0);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",width:isMobile?"95vw":"680px",maxHeight:"93vh",display:"flex",flexDirection:"column"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {tab==="form"&&(
              <button onClick={()=>{setTab("lista");setEditId(null);setForm(FORM_EMPTY);setError("");}}
                style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:13,fontWeight:600,padding:0}}>← Volver</button>
            )}
            <h2 style={{color:C.text,fontSize:17,fontWeight:700,margin:0}}>
              👤 {tab==="lista"?"Catálogo de Clientes":editId?"Editar Cliente":"Nuevo Cliente"}
            </h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer",padding:"4px 8px"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:24}}>

          {/* ── LISTA ── */}
          {tab==="lista"&&(
            <>
              {/* Stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
                {[
                  {label:"Total clientes",  value:clientes.length,        color:C.blue},
                  {label:"Con crédito",     value:totalCredito,           color:C.amber},
                  {label:"Saldo pendiente", value:fmt(totalSaldo),        color:C.red},
                ].map(s=>(
                  <div key={s.label} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,padding:12,textAlign:"center"}}>
                    <div style={{color:s.color,fontSize:18,fontWeight:700}}>{s.value}</div>
                    <div style={{color:C.textSm,fontSize:11,marginTop:2}}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Búsqueda y botón */}
              <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="🔍 Buscar por nombre, NIT o teléfono..."
                  style={{...IS,flex:1,minWidth:180}}/>
                <button onClick={openNew} style={{...BP,padding:"8px 16px",fontSize:13,whiteSpace:"nowrap"}}>➕ Nuevo cliente</button>
              </div>

              {/* Filtros */}
              <div style={{display:"flex",gap:6,marginBottom:16}}>
                {[
                  {id:"todos",   label:`Todos (${clientes.length})`},
                  {id:"credito", label:`Con crédito (${totalCredito})`},
                  {id:"activo",  label:"Activos"},
                ].map(f=>(
                  <button key={f.id} onClick={()=>setFiltro(f.id)} style={{
                    padding:"4px 12px",borderRadius:20,fontSize:12,cursor:"pointer",fontWeight:filtro===f.id?600:400,
                    border:`1.5px solid ${filtro===f.id?C.blue:C.border}`,
                    background:filtro===f.id?C.blueBg:C.card,
                    color:filtro===f.id?C.blue:C.textMd,
                  }}>{f.label}</button>
                ))}
              </div>

              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}

              {loading?(
                <div style={{textAlign:"center",color:C.textSm,padding:40}}>Cargando clientes...</div>
              ):filtered.length===0?(
                <div style={{textAlign:"center",color:C.textSm,padding:40,background:C.panel,borderRadius:12,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:40,marginBottom:12}}>👤</div>
                  <div style={{fontSize:15,color:C.textMd}}>No se encontraron clientes</div>
                </div>
              ):filtered.map(c=>{
                const disponible = c.credito ? parseFloat(c.limite_credito||0)-parseFloat(c.saldo_credito||0) : 0;
                const pctUsado   = c.credito && c.limite_credito>0 ? (c.saldo_credito/c.limite_credito)*100 : 0;
                return(
                  <div key={c.id} style={{padding:"14px 16px",marginBottom:10,background:c.activo?C.card:C.panel,border:`1px solid ${C.border}`,borderRadius:10,opacity:c.activo?1:0.6}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                      {/* Avatar */}
                      <div style={{width:44,height:44,borderRadius:"50%",background:c.credito?C.amberBg:C.blueBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                        {c.nit==="CF"?"🏪":c.credito?"💳":"👤"}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                          <span style={{color:C.text,fontWeight:700,fontSize:14}}>{c.nombre}</span>
                          <span style={{color:C.textSm,fontSize:11,background:C.panel,padding:"1px 8px",borderRadius:20,border:`1px solid ${C.border}`}}>NIT: {c.nit}</span>
                          {c.credito&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:C.amberBg,color:C.amber}}>💳 Crédito</span>}
                          {!c.activo&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:C.redBg,color:C.red}}>Inactivo</span>}
                        </div>
                        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:c.credito?8:0}}>
                          {c.telefono&&<span style={{color:C.textMd,fontSize:12}}>📞 {c.telefono}</span>}
                          {c.email&&<span style={{color:C.textMd,fontSize:12}}>✉️ {c.email}</span>}
                          {c.direccion&&<span style={{color:C.textMd,fontSize:12}}>📍 {c.direccion}</span>}
                        </div>
                        {/* Barra de crédito */}
                        {c.credito&&(
                          <div>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                              <span style={{color:C.textSm,fontSize:11}}>Crédito usado: {fmt(c.saldo_credito)} / {fmt(c.limite_credito)}</span>
                              <span style={{color:disponible>0?C.green:C.red,fontSize:11,fontWeight:600}}>Disponible: {fmt(disponible)}</span>
                            </div>
                            <div style={{height:6,background:C.border,borderRadius:3}}>
                              <div style={{height:6,borderRadius:3,width:`${Math.min(pctUsado,100)}%`,background:pctUsado>80?C.red:pctUsado>50?C.amber:C.green,transition:"width 0.3s"}}/>
                            </div>
                            <div style={{color:C.textSm,fontSize:10,marginTop:3}}>Plazo: {c.dias_credito} días</div>
                          </div>
                        )}
                      </div>
                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        <button onClick={()=>openEdit(c)} style={{...BS,padding:"6px 10px",fontSize:12}}>✏️</button>
                        {c.nit!=="CF"&&(
                          <button onClick={()=>toggleActivo(c)} style={{padding:"6px 10px",fontSize:12,borderRadius:8,border:`1.5px solid ${C.border}`,cursor:"pointer",background:c.activo?C.amberBg:C.greenBg,color:c.activo?C.amber:C.green}}>
                            {c.activo?"⏸":"▶️"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ── FORM ── */}
          {tab==="form"&&(
            <>
              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}

              {/* Datos principales */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>👤 Datos principales</div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Nombre completo *</label>
                    <input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))}
                      placeholder="Nombre del cliente o empresa" style={IS}/>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>NIT</label>
                    <input value={form.nit} onChange={e=>setForm(p=>({...p,nit:e.target.value.toUpperCase()}))}
                      placeholder="CF o número de NIT" style={IS}/>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Teléfono</label>
                    <input value={form.telefono} onChange={e=>setForm(p=>({...p,telefono:e.target.value}))}
                      placeholder="Ej: 5555-1234" style={IS}/>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Email</label>
                    <input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}
                      placeholder="correo@empresa.com" type="email" style={IS}/>
                  </div>
                </div>
                {/* Activo */}
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <button onClick={()=>setForm(p=>({...p,activo:!p.activo}))} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",position:"relative",background:form.activo?C.blue:C.border,transition:"all 0.2s"}}>
                    <div style={{position:"absolute",top:2,left:form.activo?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"all 0.2s"}}/>
                  </button>
                  <span style={{color:C.textMd,fontSize:13}}>{form.activo?"Cliente activo":"Cliente inactivo"}</span>
                </div>
              </div>

              {/* Dirección */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>📍 Dirección</div>
                <div style={{marginBottom:12}}>
                  <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Dirección</label>
                  <input value={form.direccion} onChange={e=>setForm(p=>({...p,direccion:e.target.value}))}
                    placeholder="Calle, colonia, zona..." style={IS}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Departamento</label>
                    <input value={form.departamento} onChange={e=>setForm(p=>({...p,departamento:e.target.value}))}
                      placeholder="Ej: Guatemala" style={IS}/>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Municipio</label>
                    <input value={form.municipio} onChange={e=>setForm(p=>({...p,municipio:e.target.value}))}
                      placeholder="Ej: Mixco" style={IS}/>
                  </div>
                </div>
              </div>

              {/* Crédito */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{color:C.textMd,fontSize:13,fontWeight:600}}>💳 Crédito</div>
                  <button onClick={()=>setForm(p=>({...p,credito:!p.credito}))} style={{
                    width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",position:"relative",
                    background:form.credito?C.amber:C.border,transition:"all 0.2s"
                  }}>
                    <div style={{position:"absolute",top:2,left:form.credito?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"all 0.2s"}}/>
                  </button>
                </div>

                {!form.credito?(
                  <div style={{color:C.textSm,fontSize:13,textAlign:"center",padding:"10px 0"}}>
                    El cliente no tiene crédito habilitado
                  </div>
                ):(
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12}}>
                    <div>
                      <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Límite de crédito *</label>
                      <input type="number" value={form.limite_credito} onChange={e=>setForm(p=>({...p,limite_credito:e.target.value}))}
                        placeholder="0.00" min="0" step="0.01" style={{...IS,fontWeight:700,color:C.amber}}/>
                    </div>
                    <div>
                      <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Días de plazo</label>
                      <input type="number" value={form.dias_credito} onChange={e=>setForm(p=>({...p,dias_credito:e.target.value}))}
                        placeholder="30" min="1" step="1" style={IS}/>
                      <div style={{color:C.textSm,fontSize:10,marginTop:3}}>Días para pagar</div>
                    </div>
                    <div>
                      <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Saldo actual</label>
                      <input type="number" value={form.saldo_credito} onChange={e=>setForm(p=>({...p,saldo_credito:e.target.value}))}
                        placeholder="0.00" min="0" step="0.01" style={{...IS,color:parseFloat(form.saldo_credito)>0?C.red:C.text}}/>
                      <div style={{color:C.textSm,fontSize:10,marginTop:3}}>Deuda actual del cliente</div>
                    </div>

                    {/* Preview crédito */}
                    {parseFloat(form.limite_credito)>0&&(
                      <div style={{gridColumn:isMobile?"1":"1 / -1",background:C.amberBg,borderRadius:8,padding:"10px 14px",border:`1px solid ${C.amber}40`}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{color:C.textMd,fontSize:12}}>Límite</span>
                          <span style={{color:C.text,fontSize:12,fontWeight:600}}>{fmt(form.limite_credito)}</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{color:C.textMd,fontSize:12}}>Usado</span>
                          <span style={{color:C.red,fontSize:12,fontWeight:600}}>{fmt(form.saldo_credito)}</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",paddingTop:6,borderTop:`1px solid ${C.amber}40`}}>
                          <span style={{color:C.textMd,fontSize:13,fontWeight:600}}>Disponible</span>
                          <span style={{color:C.green,fontSize:13,fontWeight:700}}>
                            {fmt(Math.max(0,parseFloat(form.limite_credito||0)-parseFloat(form.saldo_credito||0)))}
                          </span>
                        </div>
                        <div style={{height:6,background:"#fff",borderRadius:3,marginTop:8}}>
                          <div style={{
                            height:6,borderRadius:3,
                            width:`${Math.min((parseFloat(form.saldo_credito||0)/parseFloat(form.limite_credito||1))*100,100)}%`,
                            background:C.amber,transition:"width 0.3s"
                          }}/>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notas */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:20,border:`1px solid ${C.border}`}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>📝 Notas</div>
                <textarea value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))}
                  placeholder="Notas adicionales sobre el cliente..."
                  rows={3}
                  style={{...IS,resize:"vertical",fontFamily:"inherit"}}/>
              </div>

              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{setTab("lista");setEditId(null);setForm(FORM_EMPTY);setError("");}} style={{...BS,flex:1}}>Cancelar</button>
                <button onClick={save} disabled={saving} style={{...BP,flex:2,opacity:saving?0.6:1}}>
                  {saving?"⏳ Guardando...":editId?"✓ Actualizar cliente":"✓ Crear cliente"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
