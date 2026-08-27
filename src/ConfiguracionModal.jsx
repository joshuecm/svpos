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
      "Prefer": method==="POST"?"return=representation":method==="PATCH"?"return=representation":"",
    },
    body: body?JSON.stringify(body):null,
  });
  if(!res.ok){ const e=await res.text(); throw new Error(e); }
  const t=await res.text();
  return t?JSON.parse(t):null;
}

const IS = {background:"#fff",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 14px",color:"#1E293B",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"};
const C  = {blue:"#3B82F6",text:"#1E293B",textMd:"#475569",textSm:"#94A3B8",border:"#E2E8F0",card:"#fff",panel:"#F8FAFC",green:"#16A34A",red:"#DC2626"};

export default function ConfiguracionModal({ isMobile, onClose, onGuardado }) {
  const [tab,       setTab]       = useState("empresa");
  const [empresa,   setEmpresa]   = useState({nombre:"",nit:"",mensaje_ticket:"",logo_url:""});
  const [sucursales,setSucursales]= useState([]);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [editSuc,   setEditSuc]   = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [formSuc,   setFormSuc]   = useState({nombre:"",serie:"",tipo:"tienda",direccion:"",telefono:"",email:"",tamano_impresora:"80",activa:true});

  useEffect(()=>{ cargar(); },[]);

  const cargar = async () => {
    try {
      const [emp, sucs] = await Promise.all([
        sb("configuracion_empresa","GET",null,"?limit=1"),
        sb("sucursales","GET",null,"?order=nombre"),
      ]);
      if(emp?.[0]) setEmpresa(emp[0]);
      setSucursales(sucs||[]);
    } catch(e){ setError("Error cargando: "+e.message); }
  };

  const guardarEmpresa = async () => {
    if(!empresa.nombre.trim()){ setError("El nombre es obligatorio"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      if(empresa.id){
        await sb(`configuracion_empresa?id=eq.${empresa.id}`,"PATCH",{
          nombre:          empresa.nombre.trim(),
          nit:             empresa.nit?.trim()||null,
          mensaje_ticket:  empresa.mensaje_ticket?.trim()||null,
          logo_url:        empresa.logo_url?.trim()||null,
          updated_at:      new Date().toISOString(),
        });
      } else {
        const [nueva] = await sb("configuracion_empresa","POST",{
          nombre:         empresa.nombre.trim(),
          nit:            empresa.nit?.trim()||null,
          mensaje_ticket: empresa.mensaje_ticket?.trim()||null,
        });
        setEmpresa(nueva);
      }
      setSuccess("✓ Configuración guardada");
      if(onGuardado) onGuardado();
    } catch(e){ setError("Error: "+e.message); }
    setSaving(false);
  };

  const guardarSucursal = async () => {
    if(!formSuc.nombre.trim()){ setError("El nombre es obligatorio"); return; }
    if(!formSuc.serie.trim())  { setError("La serie es obligatoria"); return; }
    // Validar serie única
    const existe = sucursales.find(s=>s.serie.toUpperCase()===formSuc.serie.toUpperCase()&&s.id!==editSuc?.id);
    if(existe){ setError("Esa serie ya está en uso"); return; }
    setSaving(true); setError("");
    try {
      const data = {
        nombre:            formSuc.nombre.trim(),
        serie:             formSuc.serie.toUpperCase().trim(),
        tipo:              formSuc.tipo,
        direccion:         formSuc.direccion?.trim()||null,
        telefono:          formSuc.telefono?.trim()||null,
        email:             formSuc.email?.trim()||null,
        tamano_impresora:  formSuc.tamano_impresora,
        activa:            formSuc.activa,
      };
      if(editSuc){
        await sb(`sucursales?id=eq.${editSuc.id}`,"PATCH",data);
      } else {
        await sb("sucursales","POST",data);
      }
      await cargar();
      setShowForm(false);
      setEditSuc(null);
      setFormSuc({nombre:"",serie:"",tipo:"tienda",direccion:"",telefono:"",email:"",tamano_impresora:"80",activa:true});
      setSuccess("✓ Sucursal guardada");
    } catch(e){ setError("Error: "+e.message); }
    setSaving(false);
  };

  const editarSucursal = (s) => {
    setEditSuc(s);
    setFormSuc({...s});
    setShowForm(true);
    setError(""); setSuccess("");
  };

  const TABS = [
    {id:"empresa",   label:"🏢 Empresa"},
    {id:"sucursales",label:"🏪 Sucursales"},
  ];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(3px)"}}>
      <div style={{background:"#F8FAFC",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",width:isMobile?"95vw":"600px",maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Header */}
        <div style={{background:"#1E293B",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{color:"#fff",fontWeight:700,fontSize:16}}>⚙️ Configuración</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#94A3B8",fontSize:22,cursor:"pointer"}}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",background:"#fff",borderBottom:"1px solid #E2E8F0",flexShrink:0}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>{setTab(t.id);setError("");setSuccess("");setShowForm(false);}}
              style={{flex:1,padding:"12px 0",border:"none",background:"transparent",color:tab===t.id?C.blue:C.textMd,fontSize:13,fontWeight:tab===t.id?700:400,cursor:"pointer",borderBottom:tab===t.id?`2px solid ${C.blue}`:"2px solid transparent"}}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:20}}>
          {error&&<div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:12}}>{error}</div>}
          {success&&<div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:8,padding:"8px 14px",color:C.green,fontSize:13,marginBottom:12}}>{success}</div>}

          {/* ── EMPRESA ── */}
          {tab==="empresa"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={{color:C.textMd,fontSize:13,display:"block",marginBottom:6,fontWeight:600}}>Nombre del negocio *</label>
                <input value={empresa.nombre} onChange={e=>setEmpresa(p=>({...p,nombre:e.target.value}))}
                  placeholder="Ej: Supermercado La Economía" style={IS}/>
              </div>
              <div>
                <label style={{color:C.textMd,fontSize:13,display:"block",marginBottom:6,fontWeight:600}}>NIT</label>
                <input value={empresa.nit||""} onChange={e=>setEmpresa(p=>({...p,nit:e.target.value}))}
                  placeholder="Ej: 123456-7" style={IS}/>
              </div>
              <div>
                <label style={{color:C.textMd,fontSize:13,display:"block",marginBottom:6,fontWeight:600}}>Mensaje en ticket</label>
                <input value={empresa.mensaje_ticket||""} onChange={e=>setEmpresa(p=>({...p,mensaje_ticket:e.target.value}))}
                  placeholder="Ej: Gracias por su compra" style={IS}/>
              </div>
              <div>
                <label style={{color:C.textMd,fontSize:13,display:"block",marginBottom:6,fontWeight:600}}>URL del logo</label>
                <input value={empresa.logo_url||""} onChange={e=>setEmpresa(p=>({...p,logo_url:e.target.value}))}
                  placeholder="https://..." style={IS}/>
                <div style={{color:C.textSm,fontSize:11,marginTop:4}}>URL de imagen pública (opcional)</div>
              </div>
              <button onClick={guardarEmpresa} disabled={saving}
                style={{padding:"12px 0",borderRadius:8,border:"none",background:C.blue,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",opacity:saving?0.6:1}}>
                {saving?"⏳ Guardando...":"✓ Guardar configuración"}
              </button>
            </div>
          )}

          {/* ── SUCURSALES ── */}
          {tab==="sucursales"&&(
            <>
              {!showForm&&(
                <>
                  <button onClick={()=>{setShowForm(true);setEditSuc(null);setFormSuc({nombre:"",serie:"",tipo:"tienda",direccion:"",telefono:"",email:"",tamano_impresora:"80",activa:true});setError("");setSuccess("");}}
                    style={{width:"100%",padding:"10px 0",borderRadius:8,border:`1.5px dashed ${C.blue}`,background:"#EFF6FF",color:C.blue,fontSize:14,fontWeight:600,cursor:"pointer",marginBottom:14}}>
                    + Nueva sucursal / bodega
                  </button>
                  {sucursales.map(s=>(
                    <div key={s.id} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:14,marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                            <span style={{color:C.text,fontWeight:700,fontSize:15}}>{s.nombre}</span>
                            <span style={{background:s.tipo==="bodega"?"#FEF3C7":"#EFF6FF",color:s.tipo==="bodega"?"#D97706":C.blue,fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600}}>
                              {s.tipo==="bodega"?"📦 Bodega":"🏪 Tienda"}
                            </span>
                            {!s.activa&&<span style={{background:"#FEF2F2",color:C.red,fontSize:10,padding:"2px 8px",borderRadius:20}}>Inactiva</span>}
                          </div>
                          <div style={{color:C.textSm,fontSize:12}}>Serie: <strong>{s.serie}</strong>{s.direccion&&` · ${s.direccion}`}</div>
                          {s.telefono&&<div style={{color:C.textSm,fontSize:12}}>Tel: {s.telefono}</div>}
                          <div style={{color:C.textSm,fontSize:11,marginTop:2}}>Impresora: {s.tamano_impresora||"80"}mm</div>
                        </div>
                        <button onClick={()=>editarSucursal(s)}
                          style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"#fff",color:C.textMd,fontSize:12,cursor:"pointer"}}>
                          ✏️ Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {showForm&&(
                <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:16}}>
                  <div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:14}}>
                    {editSuc?"✏️ Editar sucursal":"+ Nueva sucursal"}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                    <div style={{gridColumn:"1/-1"}}>
                      <label style={{color:C.textMd,fontSize:12,display:"block",marginBottom:4}}>Nombre *</label>
                      <input value={formSuc.nombre} onChange={e=>setFormSuc(p=>({...p,nombre:e.target.value}))}
                        placeholder="Ej: Tienda Florida" style={IS}/>
                    </div>
                    <div>
                      <label style={{color:C.textMd,fontSize:12,display:"block",marginBottom:4}}>Serie * (única)</label>
                      <input value={formSuc.serie} onChange={e=>setFormSuc(p=>({...p,serie:e.target.value.toUpperCase()}))}
                        placeholder="Ej: TF" maxLength={5} style={IS}/>
                    </div>
                    <div>
                      <label style={{color:C.textMd,fontSize:12,display:"block",marginBottom:4}}>Tipo</label>
                      <select value={formSuc.tipo} onChange={e=>setFormSuc(p=>({...p,tipo:e.target.value}))}
                        style={{...IS,cursor:"pointer"}}>
                        <option value="tienda">🏪 Tienda</option>
                        <option value="bodega">📦 Bodega</option>
                      </select>
                    </div>
                    <div style={{gridColumn:"1/-1"}}>
                      <label style={{color:C.textMd,fontSize:12,display:"block",marginBottom:4}}>Dirección</label>
                      <input value={formSuc.direccion||""} onChange={e=>setFormSuc(p=>({...p,direccion:e.target.value}))}
                        placeholder="Ej: Av. Petapa 5-10 Zona 12" style={IS}/>
                    </div>
                    <div>
                      <label style={{color:C.textMd,fontSize:12,display:"block",marginBottom:4}}>Teléfono</label>
                      <input value={formSuc.telefono||""} onChange={e=>setFormSuc(p=>({...p,telefono:e.target.value}))}
                        placeholder="Ej: 2345-6789" style={IS}/>
                    </div>
                    <div>
                      <label style={{color:C.textMd,fontSize:12,display:"block",marginBottom:4}}>Email</label>
                      <input value={formSuc.email||""} onChange={e=>setFormSuc(p=>({...p,email:e.target.value}))}
                        placeholder="sucursal@negocio.com" style={IS}/>
                    </div>
                    <div>
                      <label style={{color:C.textMd,fontSize:12,display:"block",marginBottom:4}}>Impresora</label>
                      <select value={formSuc.tamano_impresora||"80"} onChange={e=>setFormSuc(p=>({...p,tamano_impresora:e.target.value}))}
                        style={{...IS,cursor:"pointer"}}>
                        <option value="58">58mm (pequeña)</option>
                        <option value="80">80mm (estándar)</option>
                      </select>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:20}}>
                      <input type="checkbox" checked={formSuc.activa} onChange={e=>setFormSuc(p=>({...p,activa:e.target.checked}))}
                        style={{width:16,height:16,cursor:"pointer"}}/>
                      <label style={{color:C.textMd,fontSize:13,cursor:"pointer"}}>Sucursal activa</label>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{setShowForm(false);setEditSuc(null);setError("");}}
                      style={{flex:1,padding:10,borderRadius:8,border:`1px solid ${C.border}`,background:"#fff",color:C.textMd,fontSize:14,cursor:"pointer"}}>
                      Cancelar
                    </button>
                    <button onClick={guardarSucursal} disabled={saving}
                      style={{flex:2,padding:10,borderRadius:8,border:"none",background:C.blue,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",opacity:saving?0.6:1}}>
                      {saving?"⏳ Guardando...":"✓ Guardar"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
