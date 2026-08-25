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

const UNIDADES   = ["unidad","caja","bolsa","libra","kg","litro","metro","par","paquete","docena"];
const CONDICIONES = [
  {id:"unit",     label:"Precio unitario", desc:"Sin condición de cantidad"},
  {id:"gte",      label:"≥ Mayor o igual", desc:"Aplica si compra esa cantidad o más"},
  {id:"eq",       label:"= Exactamente",   desc:"Aplica solo si compra esa cantidad exacta"},
  {id:"multiple", label:"× Múltiplo de",   desc:"Aplica si la cantidad es múltiplo de este número"},
];

const ICONOS_OPCIONES = ["📦","🥛","🥤","🍞","🧴","🍿","🛒","🧼","📱","👕","🍎","🥩","🧃","🫙","🏠","🔧","💊","🐾","🎮","📚"];

const fmt = (n) => `Q ${Number(n||0).toFixed(2)}`;

const FORM_EMPTY = {
  sku:"", codigo_barras:"", nombre:"", descripcion:"",
  categoria_id:"", unidad:"unidad",
  costo:0, impuesto:0, activo:true,
  precios:[{nombre:"Precio unitario", cantidad:1, condicion:"unit", precio:0, orden:0}],
};

const CAT_FORM_EMPTY = {nombre:"", icono:"📦"};

export default function ProductosModal({ onClose, isMobile }) {
  const [productos,   setProductos]   = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [tab,         setTab]         = useState("lista"); // lista | form | categorias
  const [form,        setForm]        = useState(FORM_EMPTY);
  const [editId,      setEditId]      = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [catFilter,   setCatFilter]   = useState("Todas");

  // Form categorías
  const [catForm,     setCatForm]     = useState(CAT_FORM_EMPTY);
  const [catEditId,   setCatEditId]   = useState(null);
  const [catSaving,   setCatSaving]   = useState(false);
  const [catError,    setCatError]    = useState("");
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        sb("productos","GET",null,"?order=categoria,nombre"),
        sb("categorias","GET",null,"?activo=eq.true&order=nombre"),
      ]);
      // Cargar precios
      const todosPrecios = await sb("producto_precios","GET",null,"?activo=eq.true&order=orden");
      const conPrecios = (prods||[]).map(p=>({
        ...p,
        precios:(todosPrecios||[]).filter(pr=>pr.producto_id===p.id),
      }));
      setProductos(conPrecios);
      setCategorias(cats||[]);
    } catch { setError("Error cargando datos"); }
    setLoading(false);
  };

  // ── CATEGORÍAS CRUD ──────────────────────────────────────────────────────
  const openCatNew  = () => { setCatForm(CAT_FORM_EMPTY); setCatEditId(null); setCatError(""); };
  const openCatEdit = (c) => { setCatForm({nombre:c.nombre,icono:c.icono||"📦"}); setCatEditId(c.id); setCatError(""); };

  const saveCat = async () => {
    if(!catForm.nombre.trim()){ setCatError("El nombre es requerido"); return; }
    setCatSaving(true); setCatError("");
    try {
      if(catEditId) await sb(`categorias?id=eq.${catEditId}`,"PATCH",{nombre:catForm.nombre.trim(),icono:catForm.icono});
      else await sb("categorias","POST",{nombre:catForm.nombre.trim(),icono:catForm.icono});
      const cats = await sb("categorias","GET",null,"?activo=eq.true&order=nombre");
      setCategorias(cats||[]);
      setCatForm(CAT_FORM_EMPTY); setCatEditId(null);
    } catch(e){ setCatError("Error: "+e.message); }
    setCatSaving(false);
  };

  const deleteCat = async (id) => {
    await sb(`categorias?id=eq.${id}`,"PATCH",{activo:false});
    setCategorias(prev=>prev.filter(c=>c.id!==id));
  };

  // ── PRODUCTOS CRUD ───────────────────────────────────────────────────────
  const openNew = () => {
    setForm({...FORM_EMPTY, precios:[{nombre:"Precio unitario",cantidad:1,condicion:"unit",precio:0,orden:0}]});
    setEditId(null); setError(""); setTab("form");
  };

  const openEdit = (p) => {
    setForm({
      sku:p.sku||"", codigo_barras:p.codigo_barras||"",
      nombre:p.nombre||"", descripcion:p.descripcion||"",
      categoria_id: categorias.find(c=>c.nombre===p.categoria)?.id||"",
      unidad:p.unidad||"unidad",
      costo:p.costo||0, impuesto:p.impuesto||0, activo:p.activo,
      precios:p.precios?.length>0?p.precios.map(pr=>({
        id:pr.id, nombre:pr.nombre, cantidad:pr.cantidad,
        condicion:pr.condicion, precio:pr.precio, orden:pr.orden
      })):[{nombre:"Precio unitario",cantidad:1,condicion:"unit",precio:p.precio||0,orden:0}],
    });
    setEditId(p.id); setError(""); setTab("form");
  };

  const addPrecio = () => setForm(prev=>({...prev,precios:[...prev.precios,{
    nombre:`Precio ${prev.precios.length+1}`,cantidad:2,condicion:"gte",precio:0,orden:prev.precios.length
  }]}));

  const removePrecio = (i) => {
    if(form.precios.length<=1) return;
    setForm(prev=>({...prev,precios:prev.precios.filter((_,idx)=>idx!==i)}));
  };

  const updatePrecio = (i,field,val) =>
    setForm(prev=>({...prev,precios:prev.precios.map((p,idx)=>idx===i?{...p,[field]:val}:p)}));

  const save = async () => {
    if(!form.nombre.trim()){ setError("El nombre es requerido"); return; }
    if(!form.sku.trim()){ setError("El código SKU es requerido"); return; }
    if(!form.categoria_id){ setError("Selecciona una categoría"); return; }
    if(form.precios.length===0){ setError("Debe tener al menos un precio"); return; }
    for(const p of form.precios){
      if(!p.precio||parseFloat(p.precio)<=0){ setError(`El precio "${p.nombre}" debe ser mayor a 0`); return; }
    }
    setSaving(true); setError("");
    try {
      const catSel     = categorias.find(c=>String(c.id)===String(form.categoria_id));
      const precioBase = parseFloat(form.precios[0].precio);
      const payload = {
        sku:           form.sku.trim().toUpperCase(),
        codigo_barras: form.codigo_barras.trim()||null,
        nombre:        form.nombre.trim(),
        descripcion:   form.descripcion.trim()||null,
        categoria:     catSel?.nombre||"",
        unidad:        form.unidad,
        precio:        precioBase,
        costo:         parseFloat(form.costo)||0,
        impuesto:      parseFloat(form.impuesto)||0,
        activo:        form.activo,
      };
      let productoId = editId;
      if(editId){
        await sb(`productos?id=eq.${editId}`,"PATCH",payload);
        await sb(`producto_precios?producto_id=eq.${editId}`,"DELETE");
      } else {
        const [nuevo] = await sb("productos","POST",{...payload,stock:0,stock_min:5});
        productoId = nuevo.id;
      }
      const preciosPayload = form.precios.map((p,i)=>({
        producto_id:productoId, nombre:p.nombre||`Precio ${i+1}`,
        cantidad:parseInt(p.cantidad)||1, condicion:p.condicion||"unit",
        precio:parseFloat(p.precio)||0, orden:i, activo:true,
      }));
      await sb("producto_precios","POST",preciosPayload);
      await loadAll();
      setTab("lista"); setEditId(null); setForm(FORM_EMPTY);
    } catch(e){ setError("Error: "+e.message); }
    setSaving(false);
  };

  const toggleActivo = async (p) => {
    await sb(`productos?id=eq.${p.id}`,"PATCH",{activo:!p.activo});
    setProductos(prev=>prev.map(pr=>pr.id===p.id?{...pr,activo:!pr.activo}:pr));
  };

  const filtered = productos.filter(p=>{
    const ms = search===""||p.nombre.toLowerCase().includes(search.toLowerCase())||p.sku.toLowerCase().includes(search.toLowerCase())||(p.codigo_barras||"").includes(search);
    return ms&&(catFilter==="Todas"||p.categoria===catFilter);
  });

  const catIconMap = Object.fromEntries(categorias.map(c=>[c.nombre,c.icono||"📦"]));

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",width:isMobile?"95vw":"700px",maxHeight:"93vh",display:"flex",flexDirection:"column"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {(tab==="form"||tab==="categorias")&&(
              <button onClick={()=>{setTab("lista");setEditId(null);setForm(FORM_EMPTY);setError("");}}
                style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:13,fontWeight:600,padding:0}}>← Volver</button>
            )}
            <h2 style={{color:C.text,fontSize:17,fontWeight:700,margin:0}}>
              📦 {tab==="lista"?"Catálogo de Productos":tab==="form"?(editId?"Editar Producto":"Nuevo Producto"):"Categorías"}
            </h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer",padding:"4px 8px"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:24}}>

          {/* ── LISTA ── */}
          {tab==="lista"&&(
            <>
              <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="🔍 Buscar por nombre, SKU o código..."
                  style={{...IS,flex:1,minWidth:180}}/>
                <button onClick={()=>setTab("categorias")} style={{...BS,padding:"8px 14px",fontSize:13}}>🏷️ Categorías</button>
                <button onClick={openNew} style={{...BP,padding:"8px 16px",fontSize:13}}>➕ Nuevo</button>
              </div>

              {/* Filtro categorías */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
                <button onClick={()=>setCatFilter("Todas")} style={{
                  padding:"4px 12px",borderRadius:20,fontSize:12,cursor:"pointer",fontWeight:catFilter==="Todas"?600:400,
                  border:`1.5px solid ${catFilter==="Todas"?C.blue:C.border}`,
                  background:catFilter==="Todas"?C.blueBg:C.card,color:catFilter==="Todas"?C.blue:C.textMd,
                }}>Todas</button>
                {categorias.map(cat=>(
                  <button key={cat.id} onClick={()=>setCatFilter(cat.nombre)} style={{
                    padding:"4px 12px",borderRadius:20,fontSize:12,cursor:"pointer",fontWeight:catFilter===cat.nombre?600:400,
                    border:`1.5px solid ${catFilter===cat.nombre?C.blue:C.border}`,
                    background:catFilter===cat.nombre?C.blueBg:C.card,color:catFilter===cat.nombre?C.blue:C.textMd,
                  }}>{cat.icono} {cat.nombre}</button>
                ))}
              </div>

              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}

              {loading?<div style={{textAlign:"center",color:C.textSm,padding:40}}>Cargando...</div>
              :filtered.length===0?<div style={{textAlign:"center",color:C.textSm,padding:40,background:C.panel,borderRadius:12,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:40,marginBottom:12}}>📦</div><div>No se encontraron productos</div>
              </div>
              :filtered.map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",marginBottom:10,background:p.activo?C.card:C.panel,border:`1px solid ${C.border}`,borderRadius:10,opacity:p.activo?1:0.6}}>
                  <div style={{width:44,height:44,borderRadius:10,background:C.blueBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                    {catIconMap[p.categoria]||"📦"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:2}}>
                      <span style={{color:C.text,fontWeight:700,fontSize:14}}>{p.nombre}</span>
                      <span style={{color:C.textSm,fontSize:11,background:C.panel,padding:"1px 8px",borderRadius:20,border:`1px solid ${C.border}`}}>{p.sku}</span>
                      {!p.activo&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:C.redBg,color:C.red}}>Inactivo</span>}
                    </div>
                    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                      <span style={{color:C.green,fontWeight:700,fontSize:14}}>{fmt(p.precio)}</span>
                      {p.precios?.length>1&&<span style={{color:C.blue,fontSize:12}}>{p.precios.length} niveles</span>}
                      <span style={{color:C.textSm,fontSize:12}}>Stock: {p.stock} {p.unidad}</span>
                      <span style={{color:C.textSm,fontSize:12}}>Costo: {fmt(p.costo)}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <button onClick={()=>openEdit(p)} style={{...BS,padding:"6px 10px",fontSize:12}}>✏️</button>
                    <button onClick={()=>toggleActivo(p)} style={{padding:"6px 10px",fontSize:12,borderRadius:8,border:`1.5px solid ${C.border}`,cursor:"pointer",background:p.activo?C.amberBg:C.greenBg,color:p.activo?C.amber:C.green}}>{p.activo?"⏸":"▶️"}</button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── CATEGORÍAS ── */}
          {tab==="categorias"&&(
            <>
              {catError&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{catError}</div>}

              {/* Form nueva categoría */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:20,border:`1px solid ${C.border}`}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>
                  {catEditId?"✏️ Editar categoría":"➕ Nueva categoría"}
                </div>
                <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
                  {/* Selector de ícono */}
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Ícono</label>
                    <div style={{position:"relative"}}>
                      <button onClick={()=>setShowIconPicker(p=>!p)} style={{
                        width:48,height:44,borderRadius:8,border:`1.5px solid ${C.border}`,background:"#fff",
                        fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"
                      }}>{catForm.icono}</button>
                      {showIconPicker&&(
                        <div style={{position:"absolute",top:50,left:0,background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:10,display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,zIndex:10,boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}>
                          {ICONOS_OPCIONES.map(ic=>(
                            <button key={ic} onClick={()=>{setCatForm(p=>({...p,icono:ic}));setShowIconPicker(false);}} style={{
                              width:36,height:36,borderRadius:6,border:`1px solid ${catForm.icono===ic?C.blue:C.border}`,
                              background:catForm.icono===ic?C.blueBg:"#fff",fontSize:20,cursor:"pointer"
                            }}>{ic}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{flex:1,minWidth:150}}>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Nombre *</label>
                    <input value={catForm.nombre} onChange={e=>setCatForm(p=>({...p,nombre:e.target.value}))}
                      placeholder="Ej: Lácteos, Bebidas, Electrónica..." style={IS}/>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {catEditId&&<button onClick={()=>{setCatForm(CAT_FORM_EMPTY);setCatEditId(null);setCatError("");}} style={{...BS,padding:"10px 14px",fontSize:13}}>Cancelar</button>}
                    <button onClick={saveCat} disabled={catSaving} style={{...BP,padding:"10px 16px",fontSize:13,opacity:catSaving?0.6:1}}>
                      {catSaving?"⏳":catEditId?"✓ Actualizar":"➕ Agregar"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista categorías */}
              <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:10}}>Categorías ({categorias.length})</div>
              {categorias.length===0?(
                <div style={{textAlign:"center",color:C.textSm,padding:30,background:C.panel,borderRadius:10,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:32,marginBottom:8}}>🏷️</div>
                  <div>No hay categorías — crea la primera arriba</div>
                </div>
              ):categorias.map(cat=>(
                <div key={cat.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",marginBottom:8,background:C.card,border:`1px solid ${C.border}`,borderRadius:10}}>
                  <div style={{width:40,height:40,borderRadius:8,background:C.blueBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{cat.icono||"📦"}</div>
                  <div style={{flex:1}}>
                    <div style={{color:C.text,fontWeight:600,fontSize:14}}>{cat.nombre}</div>
                    <div style={{color:C.textSm,fontSize:12}}>{productos.filter(p=>p.categoria===cat.nombre).length} productos</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>openCatEdit(cat)} style={{...BS,padding:"6px 10px",fontSize:12}}>✏️</button>
                    <button onClick={()=>deleteCat(cat.id)} style={{...BD,padding:"6px 10px",fontSize:12}}>🗑</button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── FORM PRODUCTO ── */}
          {tab==="form"&&(
            <>
              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}

              {/* Identificación */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>🏷️ Identificación</div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Código SKU *</label>
                    <input value={form.sku} onChange={e=>setForm(p=>({...p,sku:e.target.value.toUpperCase()}))} placeholder="Ej: LAC001" style={IS}/>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Código de barras</label>
                    <input value={form.codigo_barras} onChange={e=>setForm(p=>({...p,codigo_barras:e.target.value}))} placeholder="Ej: 7501234567890" style={IS}/>
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Nombre del producto *</label>
                  <input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Leche Entera 1L" style={IS}/>
                </div>
                <div>
                  <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Descripción</label>
                  <input value={form.descripcion} onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))} placeholder="Descripción opcional" style={IS}/>
                </div>
              </div>

              {/* Clasificación */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>📂 Clasificación</div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Categoría *</label>
                    {categorias.length===0?(
                      <div style={{background:C.amberBg,borderRadius:8,padding:"10px 14px",border:`1px solid ${C.amber}`,color:C.amber,fontSize:13}}>
                        ⚠️ <button onClick={()=>setTab("categorias")} style={{color:C.amber,background:"none",border:"none",cursor:"pointer",fontWeight:600,textDecoration:"underline"}}>Crea categorías primero</button>
                      </div>
                    ):(
                      <select value={form.categoria_id} onChange={e=>setForm(p=>({...p,categoria_id:e.target.value}))} style={{...IS,cursor:"pointer"}}>
                        <option value="">Seleccionar categoría...</option>
                        {categorias.map(c=>(<option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Unidad de medida</label>
                    <select value={form.unidad} onChange={e=>setForm(p=>({...p,unidad:e.target.value}))} style={{...IS,cursor:"pointer"}}>
                      {UNIDADES.map(u=>(<option key={u}>{u}</option>))}
                    </select>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Costo de compra</label>
                    <input type="number" value={form.costo} onChange={e=>setForm(p=>({...p,costo:e.target.value}))} placeholder="0.00" min="0" step="0.01" style={IS}/>
                    <div style={{color:C.textSm,fontSize:11,marginTop:3}}>Solo visible en catálogo</div>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>IVA</label>
                    <select value={form.impuesto} onChange={e=>setForm(p=>({...p,impuesto:e.target.value}))} style={{...IS,cursor:"pointer"}}>
                      <option value={0}>Sin IVA — 0%</option>
                      <option value={0.12}>Con IVA — 12%</option>
                    </select>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <button onClick={()=>setForm(p=>({...p,activo:!p.activo}))} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",position:"relative",background:form.activo?C.blue:C.border,transition:"all 0.2s"}}>
                    <div style={{position:"absolute",top:2,left:form.activo?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"all 0.2s"}}/>
                  </button>
                  <span style={{color:C.textMd,fontSize:13}}>{form.activo?"Producto activo":"Producto inactivo"}</span>
                </div>
              </div>

              {/* Precios */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:20,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{color:C.textMd,fontSize:13,fontWeight:600}}>💰 Precios de venta</div>
                  <button onClick={addPrecio} style={{...BS,padding:"5px 12px",fontSize:12,color:C.blue,borderColor:C.blueBorder}}>+ Agregar nivel</button>
                </div>
                {form.precios.map((precio,i)=>(
                  <div key={i} style={{background:C.card,borderRadius:10,padding:14,marginBottom:10,border:`1.5px solid ${i===0?C.blueBorder:C.border}`}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:24,height:24,borderRadius:"50%",background:i===0?C.blue:C.border,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700}}>{i+1}</div>
                        <span style={{color:i===0?C.blue:C.textMd,fontSize:13,fontWeight:600}}>{i===0?"Precio base":"Precio especial"}</span>
                      </div>
                      {i>0&&<button onClick={()=>removePrecio(i)} style={{...BD,padding:"3px 10px",fontSize:11}}>✕ Quitar</button>}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginBottom:10}}>
                      <div>
                        <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Nombre del nivel</label>
                        <input value={precio.nombre} onChange={e=>updatePrecio(i,"nombre",e.target.value)} placeholder="Ej: Mayoreo, Por docena..." style={IS}/>
                      </div>
                      <div>
                        <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Precio unitario *</label>
                        <input type="number" value={precio.precio} onChange={e=>updatePrecio(i,"precio",e.target.value)} placeholder="0.00" min="0" step="0.01" style={{...IS,fontWeight:700,fontSize:16,color:C.green}}/>
                      </div>
                    </div>
                    {i>0&&(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <div>
                          <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Condición</label>
                          <select value={precio.condicion} onChange={e=>updatePrecio(i,"condicion",e.target.value)} style={{...IS,cursor:"pointer"}}>
                            {CONDICIONES.filter(c=>c.id!=="unit").map(c=>(<option key={c.id} value={c.id}>{c.label}</option>))}
                          </select>
                          <div style={{color:C.textSm,fontSize:10,marginTop:3}}>{CONDICIONES.find(c=>c.id===precio.condicion)?.desc}</div>
                        </div>
                        <div>
                          <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>{precio.condicion==="multiple"?"Múltiplo de":"Cantidad de referencia"}</label>
                          <input type="number" value={precio.cantidad} onChange={e=>updatePrecio(i,"cantidad",e.target.value)} placeholder="0" min="1" step="1" style={{...IS,textAlign:"center",fontSize:18,fontWeight:700}}/>
                        </div>
                      </div>
                    )}
                    {i>0&&precio.precio>0&&precio.cantidad>0&&(
                      <div style={{marginTop:10,background:C.blueBg,borderRadius:8,padding:"8px 12px",border:`1px solid ${C.blueBorder}`}}>
                        <span style={{color:C.blue,fontSize:12}}>
                          {precio.condicion==="gte"&&`Si compra ${precio.cantidad} o más → Q ${parseFloat(precio.precio).toFixed(2)} c/u`}
                          {precio.condicion==="eq"&&`Si compra exactamente ${precio.cantidad} → Q ${parseFloat(precio.precio).toFixed(2)} c/u`}
                          {precio.condicion==="multiple"&&`Si es múltiplo de ${precio.cantidad} → Q ${parseFloat(precio.precio).toFixed(2)} c/u`}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{setTab("lista");setEditId(null);setForm(FORM_EMPTY);setError("");}} style={{...BS,flex:1}}>Cancelar</button>
                <button onClick={save} disabled={saving} style={{...BP,flex:2,opacity:saving?0.6:1}}>
                  {saving?"⏳ Guardando...":editId?"✓ Actualizar producto":"✓ Crear producto"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
