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
  purple:"#7C3AED", purpleBg:"#F5F3FF",
};

const IS = {background:"#fff",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 14px",color:"#1E293B",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"};
const BP = {background:"#3B82F6",color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:"pointer"};
const BS = {background:"#fff",color:"#475569",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"};
const BD = {background:"#FEF2F2",color:"#DC2626",border:"1.5px solid #FECACA",borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"};

const fmt = (n) => `Q ${Number(n||0).toFixed(2)}`;

const FORM_EMPTY = {
  nombre:"", descripcion:"", categoria:"Promociones",
  precio:0, impuesto:0.12, stock_max:"", activo:true,
  componentes:[{producto_id:"", cantidad:1}],
};

export default function CombosModal({ onClose, isMobile }) {
  const [combos,    setCombos]    = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias,setCategorias]= useState([]);
  const [tab,       setTab]       = useState("lista");
  const [form,      setForm]      = useState(FORM_EMPTY);
  const [editId,    setEditId]    = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(true);

  useEffect(()=>{ loadAll(); },[]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cb, prods, cats] = await Promise.all([
        sb("combos","GET",null,"?order=nombre"),
        sb("productos","GET",null,"?activo=eq.true&order=nombre"),
        sb("categorias","GET",null,"?activo=eq.true&order=nombre"),
      ]);
      // Cargar componentes de cada combo
      const conComp = await Promise.all((cb||[]).map(async c => {
        const comp = await sb("combo_productos","GET",null,`?combo_id=eq.${c.id}`);
        return {...c, componentes:comp||[]};
      }));
      setCombos(conComp);
      setProductos(prods||[]);
      setCategorias(cats||[]);
    } catch { setError("Error cargando datos"); }
    setLoading(false);
  };

  // Calcular stock disponible del combo basado en componentes
  const calcStockCombo = (combo) => {
    if(!combo.componentes?.length) return 0;
    const stocks = combo.componentes.map(c => {
      const prod = productos.find(p=>p.id===c.producto_id);
      if(!prod) return 0;
      return Math.floor(parseFloat(prod.stock||0) / parseFloat(c.cantidad||1));
    });
    const porComponentes = Math.min(...stocks);
    if(combo.stock_max) return Math.min(porComponentes, parseInt(combo.stock_max));
    return porComponentes;
  };

  const openNew = () => {
    setForm(FORM_EMPTY); setEditId(null); setError(""); setTab("form");
  };

  const openEdit = async (c) => {
    const comp = await sb("combo_productos","GET",null,`?combo_id=eq.${c.id}`);
    setForm({
      nombre:c.nombre, descripcion:c.descripcion||"",
      categoria:c.categoria||"Promociones",
      precio:c.precio, impuesto:c.impuesto||0.12,
      stock_max:c.stock_max||"", activo:c.activo,
      componentes:(comp||[]).map(cp=>({producto_id:cp.producto_id,cantidad:cp.cantidad})),
    });
    setEditId(c.id); setError(""); setTab("form");
  };

  const addComponente    = () => setForm(p=>({...p,componentes:[...p.componentes,{producto_id:"",cantidad:1}]}));
  const removeComponente = (i) => setForm(p=>({...p,componentes:p.componentes.filter((_,idx)=>idx!==i)}));
  const updateComponente = (i,f,v) => setForm(p=>({...p,componentes:p.componentes.map((c,idx)=>idx===i?{...c,[f]:v}:c)}));

  // Preview: valor individual vs precio combo
  const valorIndividual = form.componentes.reduce((s,c)=>{
    const prod = productos.find(p=>String(p.id)===String(c.producto_id));
    return s + (parseFloat(prod?.precio||0)*parseFloat(c.cantidad||1));
  },0);
  const ahorro = valorIndividual - parseFloat(form.precio||0);

  const save = async () => {
    setError("");
    if(!form.nombre.trim()){ setError("El nombre es requerido"); return; }
    if(!form.precio||parseFloat(form.precio)<=0){ setError("El precio debe ser mayor a 0"); return; }
    if(form.componentes.some(c=>!c.producto_id)){ setError("Selecciona el producto en todos los componentes"); return; }
    if(form.componentes.some(c=>!c.cantidad||parseFloat(c.cantidad)<=0)){ setError("La cantidad debe ser mayor a 0"); return; }
    if(form.componentes.length<2){ setError("Un combo debe tener al menos 2 productos"); return; }
    setSaving(true);
    try {
      const payload = {
        nombre:      form.nombre.trim(),
        descripcion: form.descripcion.trim()||null,
        categoria:   form.categoria||"Promociones",
        precio:      parseFloat(form.precio),
        impuesto:    parseFloat(form.impuesto)||0,
        stock_max:   form.stock_max?parseInt(form.stock_max):null,
        activo:      form.activo,
      };
      let comboId = editId;
      if(editId){
        await sb(`combos?id=eq.${editId}`,"PATCH",payload);
        await sb(`combo_productos?combo_id=eq.${editId}`,"DELETE");
      } else {
        const [nuevo] = await sb("combos","POST",payload);
        comboId = nuevo.id;
      }
      // Insertar componentes
      await sb("combo_productos","POST",form.componentes.map(c=>({
        combo_id:    comboId,
        producto_id: parseInt(c.producto_id),
        cantidad:    parseFloat(c.cantidad),
      })));
      await loadAll();
      setTab("lista"); setEditId(null); setForm(FORM_EMPTY);
    } catch(e){ setError("Error: "+e.message); }
    setSaving(false);
  };

  const toggleActivo = async (c) => {
    await sb(`combos?id=eq.${c.id}`,"PATCH",{activo:!c.activo});
    setCombos(prev=>prev.map(cb=>cb.id===c.id?{...cb,activo:!cb.activo}:cb));
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",width:isMobile?"95vw":"660px",maxHeight:"93vh",display:"flex",flexDirection:"column"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {tab==="form"&&<button onClick={()=>{setTab("lista");setEditId(null);setForm(FORM_EMPTY);setError("");}} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:13,fontWeight:600,padding:0}}>← Volver</button>}
            <h2 style={{color:C.text,fontSize:17,fontWeight:700,margin:0}}>
              🎁 {tab==="lista"?"Combos y Ofertas":editId?"Editar Combo":"Nuevo Combo"}
            </h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:24}}>

          {/* ── LISTA ── */}
          {tab==="lista"&&(
            <div>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
                <button onClick={openNew} style={{...BP,padding:"8px 16px",fontSize:13}}>➕ Nuevo combo</button>
              </div>
              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}
              {loading?<div style={{textAlign:"center",color:C.textSm,padding:40}}>Cargando...</div>
              :combos.length===0?
                <div style={{textAlign:"center",color:C.textSm,padding:40,background:C.panel,borderRadius:12,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:40,marginBottom:12}}>🎁</div>
                  <div>No hay combos registrados</div>
                  <div style={{fontSize:12,marginTop:6}}>Crea combos y ofertas especiales para tus clientes</div>
                </div>
              :combos.map(c=>{
                const stock = calcStockCombo(c);
                return(
                  <div key={c.id} style={{padding:"14px 16px",marginBottom:10,background:c.activo?C.card:C.panel,border:`1px solid ${C.border}`,borderRadius:10,opacity:c.activo?1:0.6}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                      <div style={{width:44,height:44,borderRadius:10,background:C.purpleBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🎁</div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                          <span style={{color:C.text,fontWeight:700,fontSize:15}}>{c.nombre}</span>
                          <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:C.purpleBg,color:C.purple}}>{c.categoria}</span>
                          {!c.activo&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:C.redBg,color:C.red}}>Inactivo</span>}
                        </div>
                        {c.descripcion&&<div style={{color:C.textMd,fontSize:13,marginBottom:4}}>{c.descripcion}</div>}
                        {/* Componentes */}
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                          {c.componentes.map((cp,i)=>{
                            const prod = productos.find(p=>p.id===cp.producto_id);
                            return(
                              <span key={i} style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:C.panel,border:`1px solid ${C.border}`,color:C.textMd}}>
                                {cp.cantidad}x {prod?.nombre||"Producto"}
                              </span>
                            );
                          })}
                        </div>
                        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                          <span style={{color:C.purple,fontWeight:800,fontSize:16}}>{fmt(c.precio)}</span>
                          <span style={{color:stock>0?C.green:C.red,fontSize:12,fontWeight:600}}>Stock: {stock}</span>
                          {c.stock_max&&<span style={{color:C.textSm,fontSize:12}}>Máx: {c.stock_max}</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        <button onClick={()=>openEdit(c)} style={{...BS,padding:"6px 10px",fontSize:12}}>✏️</button>
                        <button onClick={()=>toggleActivo(c)} style={{padding:"6px 10px",fontSize:12,borderRadius:8,border:`1.5px solid ${C.border}`,cursor:"pointer",background:c.activo?C.amberBg:C.greenBg,color:c.activo?C.amber:C.green}}>{c.activo?"⏸":"▶️"}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── FORM ── */}
          {tab==="form"&&(
            <div>
              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}

              {/* Datos básicos */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>🎁 Datos del combo</div>
                <div style={{marginBottom:12}}>
                  <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Nombre *</label>
                  <input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Pack Limpieza, Combo Desayuno..." style={IS}/>
                </div>
                <div style={{marginBottom:12}}>
                  <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Descripción</label>
                  <input value={form.descripcion} onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))} placeholder="Descripción del combo..." style={IS}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Categoría</label>
                    <select value={form.categoria} onChange={e=>setForm(p=>({...p,categoria:e.target.value}))} style={{...IS,cursor:"pointer"}}>
                      <option value="Promociones">🎁 Promociones</option>
                      {categorias.map(c=>(<option key={c.id} value={c.nombre}>{c.icono} {c.nombre}</option>))}
                    </select>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>IVA</label>
                    <select value={form.impuesto} onChange={e=>setForm(p=>({...p,impuesto:e.target.value}))} style={{...IS,cursor:"pointer"}}>
                      <option value={0.12}>Con IVA — 12%</option>
                      <option value={0}>Sin IVA — 0%</option>
                    </select>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Precio del combo *</label>
                    <input type="number" value={form.precio} onChange={e=>setForm(p=>({...p,precio:e.target.value}))} placeholder="0.00" min="0" step="0.01" style={{...IS,fontSize:22,fontWeight:800,color:C.purple}}/>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Stock máximo (opcional)</label>
                    <input type="number" value={form.stock_max} onChange={e=>setForm(p=>({...p,stock_max:e.target.value}))} placeholder="Sin límite" min="0" step="1" style={IS}/>
                    <div style={{color:C.textSm,fontSize:11,marginTop:3}}>Dejar vacío = limitado por existencia de componentes</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <button onClick={()=>setForm(p=>({...p,activo:!p.activo}))} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",position:"relative",background:form.activo?C.blue:C.border,transition:"all 0.2s"}}>
                    <div style={{position:"absolute",top:2,left:form.activo?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"all 0.2s"}}/>
                  </button>
                  <span style={{color:C.textMd,fontSize:13}}>{form.activo?"Combo activo":"Combo inactivo"}</span>
                </div>
              </div>

              {/* Componentes */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{color:C.textMd,fontSize:13,fontWeight:600}}>📦 Productos del combo</div>
                  <button onClick={addComponente} style={{...BS,padding:"5px 12px",fontSize:12,color:C.blue}}>+ Agregar producto</button>
                </div>
                {form.componentes.map((comp,i)=>{
                  const prod = productos.find(p=>String(p.id)===String(comp.producto_id));
                  return(
                    <div key={i} style={{background:C.card,borderRadius:10,padding:12,marginBottom:10,border:`1.5px solid ${C.border}`}}>
                      <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
                        <div style={{flex:1}}>
                          <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Producto *</label>
                          <select value={comp.producto_id} onChange={e=>updateComponente(i,"producto_id",e.target.value)} style={{...IS,cursor:"pointer",fontSize:13}}>
                            <option value="">Seleccionar producto...</option>
                            {productos.map(p=>(<option key={p.id} value={p.id}>{p.nombre} — {fmt(p.precio)} (Stock: {p.stock})</option>))}
                          </select>
                        </div>
                        <div style={{width:90}}>
                          <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Cantidad</label>
                          <input type="number" value={comp.cantidad} onChange={e=>updateComponente(i,"cantidad",e.target.value)} min="1" step="0.5" style={{...IS,textAlign:"center",fontWeight:700}}/>
                        </div>
                        {form.componentes.length>2&&(
                          <button onClick={()=>removeComponente(i)} style={{...BD,padding:"10px 10px",fontSize:12,flexShrink:0}}>✕</button>
                        )}
                      </div>
                      {prod&&(
                        <div style={{marginTop:6,display:"flex",gap:12}}>
                          <span style={{color:C.textSm,fontSize:11}}>Precio unitario: <strong style={{color:C.textMd}}>{fmt(prod.precio)}</strong></span>
                          <span style={{color:C.textSm,fontSize:11}}>Subtotal: <strong style={{color:C.textMd}}>{fmt(parseFloat(prod.precio)*parseFloat(comp.cantidad||1))}</strong></span>
                          <span style={{color:C.textSm,fontSize:11}}>Stock disponible: <strong style={{color:prod.stock>0?C.green:C.red}}>{prod.stock}</strong></span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Preview ahorro */}
                {valorIndividual>0&&parseFloat(form.precio)>0&&(
                  <div style={{background:C.purpleBg,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.purple}30`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{color:C.textMd,fontSize:13}}>Valor individual</span>
                      <span style={{color:C.textMd,fontSize:13,textDecoration:"line-through"}}>{fmt(valorIndividual)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{color:C.purple,fontSize:14,fontWeight:700}}>Precio combo</span>
                      <span style={{color:C.purple,fontSize:16,fontWeight:800}}>{fmt(form.precio)}</span>
                    </div>
                    {ahorro>0&&(
                      <div style={{display:"flex",justifyContent:"space-between",paddingTop:6,borderTop:`1px solid ${C.purple}30`,marginTop:4}}>
                        <span style={{color:C.green,fontSize:13,fontWeight:600}}>💰 Ahorro del cliente</span>
                        <span style={{color:C.green,fontSize:14,fontWeight:700}}>{fmt(ahorro)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{setTab("lista");setEditId(null);setForm(FORM_EMPTY);setError("");}} style={{...BS,flex:1}}>Cancelar</button>
                <button onClick={save} disabled={saving} style={{...BP,flex:2,opacity:saving?0.6:1}}>
                  {saving?"⏳ Guardando...":editId?"✓ Actualizar combo":"✓ Crear combo"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
