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

const CATEGORIAS = ["Lácteos","Panadería","Bebidas","Limpieza","Abarrotes","Snacks","Cuidado Personal","Electrónica","Ropa","Otros"];
const UNIDADES   = ["unidad","caja","bolsa","libra","kg","litro","metro","par","paquete","docena"];
const CONDICIONES = [
  {id:"unit",     label:"Precio unitario", desc:"Sin condición de cantidad"},
  {id:"gte",      label:"≥ Mayor o igual", desc:"Aplica si compra esa cantidad o más"},
  {id:"eq",       label:"= Exactamente",   desc:"Aplica solo si compra esa cantidad exacta"},
  {id:"multiple", label:"× Múltiplo de",   desc:"Aplica si la cantidad es múltiplo de este número"},
];

const FORM_EMPTY = {
  sku:"", codigo_barras:"", nombre:"", descripcion:"",
  categoria:"Abarrotes", unidad:"unidad",
  costo:0, impuesto:0, activo:true,
  precios:[{nombre:"Precio unitario", cantidad:1, condicion:"unit", precio:0, orden:0}],
};

const fmt = (n) => `Q ${Number(n||0).toFixed(2)}`;

export default function ProductosModal({ onClose, isMobile }) {
  const [productos, setProductos]   = useState([]);
  const [tab,       setTab]         = useState("lista");
  const [form,      setForm]        = useState(FORM_EMPTY);
  const [editId,    setEditId]      = useState(null);
  const [saving,    setSaving]      = useState(false);
  const [error,     setError]       = useState("");
  const [loading,   setLoading]     = useState(true);
  const [search,    setSearch]      = useState("");
  const [catFilter, setCatFilter]   = useState("Todas");

  useEffect(() => { loadProductos(); }, []);

  const loadProductos = async () => {
    setLoading(true);
    try {
      const prods = await sb("productos","GET",null,"?order=categoria,nombre");
      // Cargar precios de cada producto
      const conPrecios = await Promise.all((prods||[]).map(async p => {
        const precios = await sb("producto_precios","GET",null,`?producto_id=eq.${p.id}&activo=eq.true&order=orden`);
        return { ...p, precios: precios||[] };
      }));
      setProductos(conPrecios);
    } catch { setError("Error cargando productos"); }
    setLoading(false);
  };

  const openNew = () => {
    setForm({...FORM_EMPTY, precios:[{nombre:"Precio unitario",cantidad:1,condicion:"unit",precio:0,orden:0}]});
    setEditId(null); setError(""); setTab("form");
  };

  const openEdit = (p) => {
    setForm({
      sku: p.sku||"", codigo_barras: p.codigo_barras||"",
      nombre: p.nombre||"", descripcion: p.descripcion||"",
      categoria: p.categoria||"Abarrotes", unidad: p.unidad||"unidad",
      costo: p.costo||0, impuesto: p.impuesto||0, activo: p.activo,
      precios: p.precios?.length>0 ? p.precios.map(pr=>({
        id: pr.id, nombre:pr.nombre, cantidad:pr.cantidad,
        condicion:pr.condicion, precio:pr.precio, orden:pr.orden
      })) : [{nombre:"Precio unitario",cantidad:1,condicion:"unit",precio:p.precio||0,orden:0}],
    });
    setEditId(p.id); setError(""); setTab("form");
  };

  // ── Manejo de precios
  const addPrecio = () => {
    setForm(prev => ({...prev, precios:[...prev.precios, {
      nombre:`Precio ${prev.precios.length+1}`, cantidad:2, condicion:"gte", precio:0, orden:prev.precios.length
    }]}));
  };

  const removePrecio = (i) => {
    if (form.precios.length <= 1) return;
    setForm(prev => ({...prev, precios:prev.precios.filter((_,idx)=>idx!==i)}));
  };

  const updatePrecio = (i, field, val) => {
    setForm(prev => ({...prev, precios:prev.precios.map((p,idx)=>idx===i?{...p,[field]:val}:p)}));
  };

  const save = async () => {
    if (!form.nombre.trim()) { setError("El nombre es requerido"); return; }
    if (!form.sku.trim()) { setError("El código SKU es requerido"); return; }
    if (form.precios.length === 0) { setError("Debe tener al menos un precio"); return; }
    for (const p of form.precios) {
      if (!p.precio || parseFloat(p.precio) <= 0) { setError(`El precio "${p.nombre}" debe ser mayor a 0`); return; }
    }
    setSaving(true); setError("");
    try {
      // Precio principal = primer precio (unitario)
      const precioBase = parseFloat(form.precios[0].precio);

      const payload = {
        sku:          form.sku.trim().toUpperCase(),
        codigo_barras:form.codigo_barras.trim()||null,
        nombre:       form.nombre.trim(),
        descripcion:  form.descripcion.trim()||null,
        categoria:    form.categoria,
        unidad:       form.unidad,
        precio:       precioBase,
        costo:        parseFloat(form.costo)||0,
        impuesto:     parseFloat(form.impuesto)||0,
        activo:       form.activo,
      };

      let productoId = editId;

      if (editId) {
        await sb(`productos?id=eq.${editId}`,"PATCH",payload);
        // Eliminar precios anteriores
        await sb(`producto_precios?producto_id=eq.${editId}`,"DELETE");
      } else {
        const [nuevo] = await sb("productos","POST",{...payload, stock:0, stock_min:5});
        productoId = nuevo.id;
      }

      // Insertar precios
      const preciosPayload = form.precios.map((p,i) => ({
        producto_id: productoId,
        nombre:      p.nombre||`Precio ${i+1}`,
        cantidad:    parseInt(p.cantidad)||1,
        condicion:   p.condicion||"unit",
        precio:      parseFloat(p.precio)||0,
        orden:       i,
        activo:      true,
      }));
      await sb("producto_precios","POST",preciosPayload);

      await loadProductos();
      setTab("lista"); setEditId(null); setForm(FORM_EMPTY);
    } catch(e) { setError("Error: "+e.message); }
    setSaving(false);
  };

  const toggleActivo = async (p) => {
    await sb(`productos?id=eq.${p.id}`,"PATCH",{activo:!p.activo});
    setProductos(prev=>prev.map(pr=>pr.id===p.id?{...pr,activo:!pr.activo}:pr));
  };

  // Filtros
  const categorias = ["Todas",...new Set(productos.map(p=>p.categoria))];
  const filtered = productos.filter(p => {
    const ms = search===""||p.nombre.toLowerCase().includes(search.toLowerCase())||p.sku.toLowerCase().includes(search.toLowerCase())||(p.codigo_barras||"").includes(search);
    return ms && (catFilter==="Todas"||p.categoria===catFilter);
  });

  const CAT_ICONS = {"Lácteos":"🥛","Bebidas":"🥤","Panadería":"🍞","Limpieza":"🧴","Snacks":"🍿","Abarrotes":"🛒","Cuidado Personal":"🧼","Electrónica":"📱","Ropa":"👕","Otros":"📦"};

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
              📦 {tab==="lista"?"Catálogo de Productos":editId?"Editar Producto":"Nuevo Producto"}
            </h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer",padding:"4px 8px"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:24}}>

          {/* ── LISTA ── */}
          {tab==="lista"&&(
            <>
              {/* Barra de búsqueda y botón */}
              <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="🔍 Buscar por nombre, SKU o código..."
                  style={{...IS,flex:1,minWidth:180}}/>
                <button onClick={openNew} style={{...BP,padding:"8px 16px",fontSize:13,whiteSpace:"nowrap"}}>➕ Nuevo producto</button>
              </div>

              {/* Filtro categorías */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
                {categorias.map(cat=>(
                  <button key={cat} onClick={()=>setCatFilter(cat)} style={{
                    padding:"4px 12px",borderRadius:20,fontSize:12,cursor:"pointer",fontWeight:catFilter===cat?600:400,
                    border:`1.5px solid ${catFilter===cat?C.blue:C.border}`,
                    background:catFilter===cat?C.blueBg:C.card,
                    color:catFilter===cat?C.blue:C.textMd,
                  }}>{cat}</button>
                ))}
              </div>

              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}

              {loading?(
                <div style={{textAlign:"center",color:C.textSm,padding:40}}>Cargando productos...</div>
              ):filtered.length===0?(
                <div style={{textAlign:"center",color:C.textSm,padding:40,background:C.panel,borderRadius:12,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:40,marginBottom:12}}>📦</div>
                  <div style={{fontSize:15,color:C.textMd}}>No se encontraron productos</div>
                </div>
              ):filtered.map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",marginBottom:10,background:p.activo?C.card:C.panel,border:`1px solid ${C.border}`,borderRadius:10,opacity:p.activo?1:0.6}}>
                  <div style={{width:44,height:44,borderRadius:10,background:C.blueBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                    {CAT_ICONS[p.categoria]||"📦"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:2}}>
                      <span style={{color:C.text,fontWeight:700,fontSize:14}}>{p.nombre}</span>
                      <span style={{color:C.textSm,fontSize:11,background:C.panel,padding:"1px 8px",borderRadius:20,border:`1px solid ${C.border}`}}>{p.sku}</span>
                      {!p.activo&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:C.redBg,color:C.red}}>Inactivo</span>}
                    </div>
                    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                      <span style={{color:C.green,fontWeight:700,fontSize:14}}>{fmt(p.precio)}</span>
                      {p.precios?.length>1&&(
                        <span style={{color:C.blue,fontSize:12}}>{p.precios.length} niveles de precio</span>
                      )}
                      <span style={{color:C.textSm,fontSize:12}}>Stock: {p.stock} {p.unidad}{p.stock!==1?"s":""}</span>
                      <span style={{color:C.textSm,fontSize:12}}>Costo: {fmt(p.costo)}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <button onClick={()=>openEdit(p)} style={{...BS,padding:"6px 10px",fontSize:12}}>✏️</button>
                    <button onClick={()=>toggleActivo(p)} style={{
                      padding:"6px 10px",fontSize:12,borderRadius:8,border:`1.5px solid ${C.border}`,cursor:"pointer",
                      background:p.activo?C.amberBg:C.greenBg,color:p.activo?C.amber:C.green
                    }}>{p.activo?"⏸":"▶️"}</button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── FORM ── */}
          {tab==="form"&&(
            <>
              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}

              {/* Identificación */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>🏷️ Identificación</div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Código SKU *</label>
                    <input value={form.sku} onChange={e=>setForm(p=>({...p,sku:e.target.value.toUpperCase()}))}
                      placeholder="Ej: LAC001" style={IS}/>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Código de barras</label>
                    <input value={form.codigo_barras} onChange={e=>setForm(p=>({...p,codigo_barras:e.target.value}))}
                      placeholder="Ej: 7501234567890" style={IS}/>
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Nombre del producto *</label>
                  <input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))}
                    placeholder="Ej: Leche Entera 1L" style={IS}/>
                </div>
                <div>
                  <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Descripción</label>
                  <input value={form.descripcion} onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))}
                    placeholder="Descripción opcional del producto" style={IS}/>
                </div>
              </div>

              {/* Clasificación */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>📂 Clasificación</div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Categoría</label>
                    <select value={form.categoria} onChange={e=>setForm(p=>({...p,categoria:e.target.value}))}
                      style={{...IS,cursor:"pointer"}}>
                      {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Unidad de medida</label>
                    <select value={form.unidad} onChange={e=>setForm(p=>({...p,unidad:e.target.value}))}
                      style={{...IS,cursor:"pointer"}}>
                      {UNIDADES.map(u=><option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Costo (precio de compra)</label>
                    <input type="number" value={form.costo} onChange={e=>setForm(p=>({...p,costo:e.target.value}))}
                      placeholder="0.00" min="0" step="0.01" style={IS}/>
                    <div style={{color:C.textSm,fontSize:11,marginTop:3}}>Solo visible en catálogo — no aparece en el POS</div>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>IVA (%)</label>
                    <select value={form.impuesto} onChange={e=>setForm(p=>({...p,impuesto:e.target.value}))}
                      style={{...IS,cursor:"pointer"}}>
                      <option value={0}>Sin IVA — 0%</option>
                      <option value={0.12}>Con IVA — 12%</option>
                    </select>
                  </div>
                </div>
                {/* Toggle activo */}
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
                        <div style={{width:24,height:24,borderRadius:"50%",background:i===0?C.blue:C.border,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700,flexShrink:0}}>
                          {i+1}
                        </div>
                        <span style={{color:i===0?C.blue:C.textMd,fontSize:13,fontWeight:600}}>
                          {i===0?"Precio base":"Precio especial"}
                        </span>
                      </div>
                      {i>0&&(
                        <button onClick={()=>removePrecio(i)} style={{...BD,padding:"3px 10px",fontSize:11}}>✕ Quitar</button>
                      )}
                    </div>

                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginBottom:10}}>
                      <div>
                        <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Nombre del nivel</label>
                        <input value={precio.nombre} onChange={e=>updatePrecio(i,"nombre",e.target.value)}
                          placeholder="Ej: Por docena, Mayoreo..." style={IS}/>
                      </div>
                      <div>
                        <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Precio unitario *</label>
                        <input type="number" value={precio.precio} onChange={e=>updatePrecio(i,"precio",e.target.value)}
                          placeholder="0.00" min="0" step="0.01" style={{...IS,fontWeight:700,fontSize:16,color:C.green}}/>
                      </div>
                    </div>

                    {/* Condición de cantidad — solo para niveles > 0 */}
                    {i>0&&(
                      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
                        <div>
                          <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Condición</label>
                          <select value={precio.condicion} onChange={e=>updatePrecio(i,"condicion",e.target.value)}
                            style={{...IS,cursor:"pointer"}}>
                            {CONDICIONES.filter(c=>c.id!=="unit").map(c=>(
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                          <div style={{color:C.textSm,fontSize:10,marginTop:3}}>
                            {CONDICIONES.find(c=>c.id===precio.condicion)?.desc}
                          </div>
                        </div>
                        <div>
                          <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>
                            {precio.condicion==="multiple"?"Múltiplo de":"Cantidad de referencia"}
                          </label>
                          <input type="number" value={precio.cantidad} onChange={e=>updatePrecio(i,"cantidad",e.target.value)}
                            placeholder="0" min="1" step="1" style={{...IS,textAlign:"center",fontSize:18,fontWeight:700}}/>
                        </div>
                      </div>
                    )}

                    {/* Preview condición */}
                    {i>0&&precio.precio>0&&precio.cantidad>0&&(
                      <div style={{marginTop:10,background:C.blueBg,borderRadius:8,padding:"8px 12px",border:`1px solid ${C.blueBorder}`}}>
                        <span style={{color:C.blue,fontSize:12}}>
                          {precio.condicion==="gte"&&`Si compra ${precio.cantidad} o más → ${fmt(precio.precio)} c/u`}
                          {precio.condicion==="eq"&&`Si compra exactamente ${precio.cantidad} → ${fmt(precio.precio)} c/u`}
                          {precio.condicion==="multiple"&&`Si la cantidad es múltiplo de ${precio.cantidad} → ${fmt(precio.precio)} c/u`}
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
