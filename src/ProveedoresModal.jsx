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

const fmt = (n) => `Q ${Number(n||0).toFixed(2)}`;
const FORM_EMPTY = {nombre:"",nit:"",telefono:"",email:"",direccion:"",credito:false,dias_credito:30,activo:true};

export default function ProveedoresModal({ onClose, isMobile }) {
  const [proveedores, setProveedores] = useState([]);
  const [tab,         setTab]         = useState("lista");
  const [form,        setForm]        = useState(FORM_EMPTY);
  const [editId,      setEditId]      = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");

  useEffect(()=>{ loadProveedores(); },[]);

  const loadProveedores = async () => {
    setLoading(true);
    try {
      const p = await sb("proveedores","GET",null,"?order=nombre");
      setProveedores(p||[]);
    } catch { setError("Error cargando proveedores"); }
    setLoading(false);
  };

  const openNew  = () => { setForm(FORM_EMPTY); setEditId(null); setError(""); setTab("form"); };
  const openEdit = (p) => {
    setForm({nombre:p.nombre,nit:p.nit||"",telefono:p.telefono||"",email:p.email||"",
      direccion:p.direccion||"",credito:p.credito||false,dias_credito:p.dias_credito||30,activo:p.activo});
    setEditId(p.id); setError(""); setTab("form");
  };

  const save = async () => {
    if(!form.nombre.trim()){ setError("El nombre es requerido"); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        nombre:form.nombre.trim(), nit:form.nit.trim()||null,
        telefono:form.telefono.trim()||null, email:form.email.trim()||null,
        direccion:form.direccion.trim()||null,
        credito:form.credito, dias_credito:form.credito?parseInt(form.dias_credito)||30:0,
        activo:form.activo,
      };
      if(editId) await sb(`proveedores?id=eq.${editId}`,"PATCH",payload);
      else await sb("proveedores","POST",payload);
      await loadProveedores();
      setTab("lista"); setEditId(null); setForm(FORM_EMPTY);
    } catch(e){ setError("Error: "+e.message); }
    setSaving(false);
  };

  const toggleActivo = async (p) => {
    await sb(`proveedores?id=eq.${p.id}`,"PATCH",{activo:!p.activo});
    setProveedores(prev=>prev.map(pr=>pr.id===p.id?{...pr,activo:!pr.activo}:pr));
  };

  const filtered = proveedores.filter(p=>
    search===""||p.nombre.toLowerCase().includes(search.toLowerCase())||(p.nit||"").includes(search)
  );

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",width:isMobile?"95vw":"580px",maxHeight:"93vh",display:"flex",flexDirection:"column"}}>
        
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {tab==="form"&&<button onClick={()=>{setTab("lista");setEditId(null);setForm(FORM_EMPTY);setError("");}} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:13,fontWeight:600,padding:0}}>← Volver</button>}
            <h2 style={{color:C.text,fontSize:17,fontWeight:700,margin:0}}>🏭 {tab==="lista"?"Proveedores":editId?"Editar Proveedor":"Nuevo Proveedor"}</h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:24}}>
          {tab==="lista"&&(
            <>
              <div style={{display:"flex",gap:10,marginBottom:16}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar proveedor..." style={{...IS,flex:1}}/>
                <button onClick={openNew} style={{...BP,whiteSpace:"nowrap"}}>➕ Nuevo</button>
              </div>
              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}
              {loading?<div style={{textAlign:"center",color:C.textSm,padding:40}}>Cargando...</div>
              :filtered.length===0?<div style={{textAlign:"center",color:C.textSm,padding:40,background:C.panel,borderRadius:12,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:40,marginBottom:12}}>🏭</div><div>No hay proveedores registrados</div>
              </div>
              :filtered.map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",marginBottom:10,background:p.activo?C.card:C.panel,border:`1px solid ${C.border}`,borderRadius:10,opacity:p.activo?1:0.6}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:C.blueBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🏭</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:2}}>
                      <span style={{color:C.text,fontWeight:700,fontSize:14}}>{p.nombre}</span>
                      {p.nit&&<span style={{color:C.textSm,fontSize:11,background:C.panel,padding:"1px 8px",borderRadius:20,border:`1px solid ${C.border}`}}>NIT: {p.nit}</span>}
                      {p.credito&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:C.amberBg,color:C.amber}}>💳 {p.dias_credito} días</span>}
                      {!p.activo&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:C.redBg,color:C.red}}>Inactivo</span>}
                    </div>
                    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                      {p.telefono&&<span style={{color:C.textMd,fontSize:12}}>📞 {p.telefono}</span>}
                      {p.email&&<span style={{color:C.textMd,fontSize:12}}>✉️ {p.email}</span>}
                    </div>
                    {p.saldo>0&&<div style={{color:C.red,fontSize:12,marginTop:2,fontWeight:600}}>Saldo pendiente: {fmt(p.saldo)}</div>}
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>openEdit(p)} style={{...BS,padding:"6px 10px",fontSize:12}}>✏️</button>
                    <button onClick={()=>toggleActivo(p)} style={{padding:"6px 10px",fontSize:12,borderRadius:8,border:`1.5px solid ${C.border}`,cursor:"pointer",background:p.activo?C.amberBg:C.greenBg,color:p.activo?C.amber:C.green}}>{p.activo?"⏸":"▶️"}</button>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab==="form"&&(
            <>
              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>📋 Datos del proveedor</div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Nombre *</label>
                    <input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="Nombre del proveedor" style={IS}/>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>NIT</label>
                    <input value={form.nit} onChange={e=>setForm(p=>({...p,nit:e.target.value}))} placeholder="NIT del proveedor" style={IS}/>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Teléfono</label>
                    <input value={form.telefono} onChange={e=>setForm(p=>({...p,telefono:e.target.value}))} placeholder="Teléfono" style={IS}/>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Email</label>
                    <input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="correo@proveedor.com" style={IS}/>
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Dirección</label>
                  <input value={form.direccion} onChange={e=>setForm(p=>({...p,direccion:e.target.value}))} placeholder="Dirección del proveedor" style={IS}/>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <button onClick={()=>setForm(p=>({...p,activo:!p.activo}))} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",position:"relative",background:form.activo?C.blue:C.border,transition:"all 0.2s"}}>
                    <div style={{position:"absolute",top:2,left:form.activo?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"all 0.2s"}}/>
                  </button>
                  <span style={{color:C.textMd,fontSize:13}}>{form.activo?"Proveedor activo":"Proveedor inactivo"}</span>
                </div>
              </div>

              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:20,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{color:C.textMd,fontSize:13,fontWeight:600}}>💳 Crédito del proveedor</div>
                  <button onClick={()=>setForm(p=>({...p,credito:!p.credito}))} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",position:"relative",background:form.credito?C.amber:C.border,transition:"all 0.2s"}}>
                    <div style={{position:"absolute",top:2,left:form.credito?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"all 0.2s"}}/>
                  </button>
                </div>
                {form.credito?(
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Días de crédito</label>
                    <input type="number" value={form.dias_credito} onChange={e=>setForm(p=>({...p,dias_credito:e.target.value}))} placeholder="30" min="1" style={{...IS,width:120}}/>
                    <div style={{color:C.textSm,fontSize:11,marginTop:4}}>El sistema usará este plazo automáticamente al registrar compras a crédito</div>
                  </div>
                ):(
                  <div style={{color:C.textSm,fontSize:13,textAlign:"center",padding:"8px 0"}}>Este proveedor no maneja crédito</div>
                )}
              </div>

              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{setTab("lista");setEditId(null);setForm(FORM_EMPTY);setError("");}} style={{...BS,flex:1}}>Cancelar</button>
                <button onClick={save} disabled={saving} style={{...BP,flex:2,opacity:saving?0.6:1}}>{saving?"⏳ Guardando...":editId?"✓ Actualizar":"✓ Crear proveedor"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
