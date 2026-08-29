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

const TIPOS = [{v:"tienda",l:"🏬 Tienda"},{v:"bodega",l:"📦 Bodega"}];
const IMPRESORAS = [{v:"58",l:"58mm"},{v:"80",l:"80mm"}];

const FORM_EMPTY = {nombre:"",serie:"",direccion:"",telefono:"",email:"",tipo:"tienda",tamano_impresora:"80",activa:true};

export default function SucursalesModal({ onClose, isMobile }) {
    const [sucursales, setSucursales] = useState([]);
    const [tab,         setTab]        = useState("lista");
    const [form,        setForm]       = useState(FORM_EMPTY);
    const [editId,      setEditId]     = useState(null);
    const [saving,      setSaving]     = useState(false);
    const [error,       setError]      = useState("");
    const [loading,     setLoading]    = useState(true);
    const [search,      setSearch]     = useState("");

  useEffect(()=>{ loadSucursales(); },[]);

  const loadSucursales = async () => {
        setLoading(true);
        try {
                const s = await sb("sucursales","GET",null,"?order=nombre");
                setSucursales(s||[]);
        } catch { setError("Error cargando sucursales"); }
        setLoading(false);
  };

const openNew  = () => { setForm(FORM_EMPTY); setEditId(null); setError(""); setTab("form"); };
  const openEdit = (s) => {
    setForm({
      nombre:s.nombre, serie:s.serie||"", direccion:s.direccion||"", telefono:s.telefono||"",
      email:s.email||"", tipo:s.tipo||"tienda", tamano_impresora:s.tamano_impresora||"80",
      activa:s.activa,
    });
    setEditId(s.id); setError(""); setTab("form");
  };
  
  const save = async () => {
  if(!form.nombre.trim()){ setError("El nombre es requerido"); return; }
  if(!form.serie.trim()){ setError("La serie es requerida (ej: TF, TB)"); return; }
  setSaving(true); setError("");
try {
  const payload = {
    nombre: form.nombre.trim(),
    serie: form.serie.trim().toUpperCase(),
    direccion: form.direccion.trim()||null,
    telefono: form.telefono.trim()||null,
    email: form.email.trim()||null,
    tipo: form.tipo,
    tamano_impresora: form.tamano_impresora,
    activa: form.activa,
  };
  if(editId) await sb(`sucursales?id=eq.${editId}`,"PATCH",payload);
        else await sb("sucursales","POST",payload);
        await loadSucursales();
        setTab("lista"); setEditId(null); setForm(FORM_EMPTY);
} catch(e){
        const msg = /duplicate key|unique/i.test(e.message)
          ? "Ya existe una sucursal con esa serie — usa otra"
                  : "Error: "+e.message;
        setError(msg);
}
    setSaving(false);
};

  const toggleActiva = async (s) => {
        await sb(`sucursales?id=eq.${s.id}`,"PATCH",{activa:!s.activa});
                      setSucursales(prev=>prev.map(x=>x.id===s.id?{...x,activa:!x.activa}:x));
  };

  const filtered = sucursales.filter(s=>
        search===""||s.nombre.toLowerCase().includes(search.toLowerCase())||(s.serie||"").toLowerCase().includes(search.toLowerCase())
                                       );
return (
  <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",width:isMobile?"95vw":"580px",maxHeight:"93vh",display:"flex",flexDirection:"column"}}>


      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {tab==="form"&&<button onClick={()=>{setTab("lista");setEditId(null);setForm(FORM_EMPTY);setError("");}} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:13,fontWeight:600,padding:0}}>← Volver</button>}
          <h2 style={{color:C.text,fontSize:17,fontWeight:700,margin:0}}>🏬 {tab==="lista"?"Sucursales":editId?"Editar Sucursal":"Nueva Sucursal"}</h2>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer"}}>✕</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:24}}>
        {tab==="lista"&&(
    <>
    <div style={{display:"flex",gap:10,marginBottom:16}}>
    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar sucursal..." style={{...IS,flex:1}}/>
    <button onClick={openNew} style={{...BP,whiteSpace:"nowrap"}}>➕ Nueva</button>
    </div>
    </>
    {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}
        {loading?<div style={{textAlign:"center",color:C.textSm,padding:40}}>Cargando...</div>
          :filtered.length===0?<div style={{textAlign:"center",color:C.textSm,padding:40,background:C.panel,borderRadius:12,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:40,marginBottom:12}}>🏬</div><div>No hay sucursales registradas</div>
          </div>
      :filtered.map(s=>(
      
<div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",marginBottom:10,background:s.activa?C.card:C.panel,border:`1px solid ${C.border}`,borderRadius:10,opacity:s.activa?1:0.6}}>
          <div style={{width:44,height:44,borderRadius:"50%",background:C.blueBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{s.tipo==="bodega"?"📦":"🏬"}</div>
          
<div style={{flex:1}}>
<div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:2}}>
<span style={{color:C.text,fontWeight:700,fontSize:14}}>{s.nombre}</span>
<span style={{color:C.blue,fontSize:11,background:C.blueBg,padding:"1px 8px",borderRadius:20,border:`1px solid ${C.blueBorder}`,fontWeight:700}}>{s.serie}</span>
{!s.activa&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:C.redBg,color:C.red}}>Inactiva</span>}
</div>
<div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
{s.direccion&&<span style={{color:C.textMd,fontSize:12}}>📍 {s.direccion}</span>}
{s.telefono&&<span style={{color:C.textMd,fontSize:12}}>📞 {s.telefono}</span>}
{s.email&&<span style={{color:C.textMd,fontSize:12}}>✉️ {s.email}</span>}
</div>
</div>
<div style={{display:"flex",gap:6}}>
<button onClick={()=>openEdit(s)} style={{...BS,padding:"6px 10px",fontSize:12}}>✏️</button>
<button onClick={()=>toggleActiva(s)} style={{padding:"6px 10px",fontSize:12,borderRadius:8,border:`1.5px solid ${C.border}`,cursor:"pointer",background:s.activa?C.amberBg:C.greenBg,color:s.activa?C.amber:C.green}}>{s.activa?"⏸":"▶️"}</button>
</div>
</div>
))}
</>
)}

{tab==="form"&&(
<>
{error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}
<div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:20,border:`1px solid ${C.border}`}}>
<div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>📋 Datos de la sucursal</div>
<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
<div>
<label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Nombre *</label>
<input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Tienda Zona 1" style={IS}/>
</div>
<div>
<label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Serie (correlativo) *</label>
<input value={form.serie} onChange={e=>setForm(p=>({...p,serie:e.target.value.toUpperCase().slice(0,4)}))} placeholder="Ej: TF" maxLength={4}
style={{...IS,fontWeight:700}}/>
</div>
<div>
<label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Tipo</label>
<select value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))} style={IS}>
{TIPOS.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
</select>
</div>
<div>
<label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Tamaño de impresora</label>
<select value={form.tamano_impresora} onChange={e=>setForm(p=>({...p,tamano_impresora:e.target.value}))} style={IS}>
{IMPRESORAS.map(i=><option key={i.v} value={i.v}>{i.l}</option>)}
</select>
</div>
<div>
<label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Teléfono</label>
<input value={form.telefono} onChange={e=>setForm(p=>({...p,telefono:e.target.value}))} placeholder="Teléfono" style={IS}/>
</div>
<div>
<label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Email</label>
<input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="sucursal@empresa.com" type="email" style={IS}/>
</div>
</div>
<div style={{marginBottom:12}}>
<label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Dirección</label>
<input value={form.direccion} onChange={e=>setForm(p=>({...p,direccion:e.target.value}))} placeholder="Dirección de la sucursal" style={IS}/>
</div>
<div style={{color:C.textSm,fontSize:11,marginBottom:12}}>
La serie se usa en el correlativo de facturas de esta sucursal, ej: <strong style={{color:C.blue}}>{form.serie||"TF"}-MP-000001</strong>
</div>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<button onClick={()=>setForm(p=>({...p,activa:!p.activa}))} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",position:"relative",background:form.activa?C.blue:C.border,transition:"all 0.2s"}}>
<div style={{position:"absolute",top:2,left:form.activa?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"all 0.2s"}}/>
</button>
<span style={{color:C.textMd,fontSize:13}}>{form.activa?"Sucursal activa":"Sucursal inactiva"}</span>
</div>
</div>

<div style={{display:"flex",gap:10}}>
<button onClick={()=>{setTab("lista");setEditId(null);setForm(FORM_EMPTY);setError("");}} style={{...BS,flex:1}}>Cancelar</button>
<button onClick={save} disabled={saving} style={{...BP,flex:2,opacity:saving?0.6:1}}>{saving?"⏳ Guardando...":editId?"✓ Actualizar":"✓ Crear sucursal"}</button>
</div>
</>
)}
</div>
</div>
</div>
);
}
