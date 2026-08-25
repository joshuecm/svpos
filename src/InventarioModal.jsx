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

const fmt     = (n) => `Q ${Number(n||0).toFixed(2)}`;
const fmtDate = (d) => new Date(d).toLocaleString("es-GT");

export default function InventarioModal({ onClose, isMobile, usuario, modoAdmin=true }) {
  const [paso,         setPaso]         = useState("lista");
  const [entradas,     setEntradas]     = useState([]);
  const [proveedores,  setProveedores]  = useState([]);
  const [productos,    setProductos]    = useState([]);
  const [entradaSel,   setEntradaSel]   = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");

  // Modal confirmación
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [previewData,  setPreviewData]  = useState(null); // datos para el modal de confirmación

  // Ticket
  const [lastTicket,   setLastTicket]   = useState(null);
  const [showTicket,   setShowTicket]   = useState(false);

  // Form nueva entrada
  const [proveedorId,   setProveedorId]   = useState("");
  const [numFactura,    setNumFactura]    = useState("");
  const [tipoPago,      setTipoPago]      = useState("contado");
  const [diasCredito,   setDiasCredito]   = useState(30);
  const [notas,         setNotas]         = useState("");
  const [lineas,        setLineas]        = useState([{producto_id:"",cantidad:1,costo_unitario:0,tomarUltimoCosto:false}]);

  useEffect(()=>{ loadAll(); },[]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ent,prov,prods] = await Promise.all([
        sb("entradas_inventario","GET",null,"?order=created_at.desc&limit=50"),
        sb("proveedores","GET",null,"?activo=eq.true&order=nombre"),
        sb("productos","GET",null,"?activo=eq.true&order=nombre"),
      ]);
      setEntradas(ent||[]);
      setProveedores(prov||[]);
      setProductos(prods||[]);
    } catch { setError("Error cargando datos"); }
    setLoading(false);
  };

  const proveedorSel = proveedores.find(p=>String(p.id)===String(proveedorId));

  const handleProveedorChange = (id) => {
    setProveedorId(id);
    const prov = proveedores.find(p=>String(p.id)===String(id));
    if(prov?.credito) setDiasCredito(prov.dias_credito||30);
  };

  const addLinea    = () => setLineas(prev=>[...prev,{producto_id:"",cantidad:1,costo_unitario:0,tomarUltimoCosto:false}]);
  const removeLinea = (i) => setLineas(prev=>prev.filter((_,idx)=>idx!==i));
  const updateLinea = (i,field,val) => setLineas(prev=>prev.map((l,idx)=>idx===i?{...l,[field]:val}:l));

  const handleProductoChange = (i, productoId) => {
    const prod = productos.find(p=>String(p.id)===String(productoId));
    updateLinea(i,"producto_id",productoId);
    if(prod) updateLinea(i,"costo_unitario",prod.costo||0);
  };

  const handleTomarUltimoCosto = (i,val) => {
    const prod = productos.find(p=>String(p.id)===String(lineas[i].producto_id));
    updateLinea(i,"tomarUltimoCosto",val);
    if(val&&prod) updateLinea(i,"costo_unitario",prod.costo||0);
  };

  const totalEntrada = lineas.reduce((s,l)=>s+parseFloat(l.cantidad||0)*parseFloat(l.costo_unitario||0),0);

  // ── PASO 1: Validar y mostrar confirmación
  const prepararConfirmacion = () => {
    setError("");
    if(!proveedorId){ setError("Selecciona el proveedor"); return; }
    if(!numFactura.trim()){ setError("Ingresa el número de factura"); return; }
    if(lineas.some(l=>!l.producto_id)){ setError("Selecciona el producto en todas las líneas"); return; }
    if(lineas.some(l=>!l.cantidad||parseFloat(l.cantidad)<=0)){ setError("La cantidad debe ser mayor a 0"); return; }
    if(modoAdmin&&lineas.some(l=>!l.costo_unitario||parseFloat(l.costo_unitario)<=0)){ setError("Ingresa el costo en todas las líneas"); return; }

    // Preparar datos de preview con existencia anterior y nueva
    const preview = lineas.map(l=>{
      const prod = productos.find(p=>String(p.id)===String(l.producto_id));
      const cantidad   = parseFloat(l.cantidad||0);
      const costo      = modoAdmin ? parseFloat(l.costo_unitario||0) : parseFloat(prod?.costo||0);
      const existAnt   = parseFloat(prod?.stock||0);
      const existNueva = existAnt + cantidad;
      return {
        prod, cantidad, costo,
        existAnt, existNueva,
        subtotal: cantidad*costo,
      };
    });

    setPreviewData({
      proveedor:   proveedorSel,
      numFactura:  numFactura.trim(),
      tipoPago,
      diasCredito: parseInt(diasCredito)||30,
      notas:       notas.trim(),
      lineas:      preview,
      total:       totalEntrada,
      fecha:       new Date().toLocaleString("es-GT"),
      usuario:     usuario?.nombre||"Admin",
      sucursal:    usuario?.sucursal||"Principal",
    });
    setShowConfirm(true);
  };

  // ── PASO 2: Confirmar y guardar en BD
  const confirmarEntrada = async () => {
    setSaving(true);
    try {
      const fechaVence = tipoPago==="credito"
        ? new Date(Date.now()+parseInt(diasCredito)*24*60*60*1000).toISOString()
        : null;

      const [entrada] = await sb("entradas_inventario","POST",{
        proveedor_id:    parseInt(proveedorId),
        numero_factura:  numFactura.trim(),
        tipo_pago:       tipoPago,
        dias_credito:    tipoPago==="credito"?parseInt(diasCredito):0,
        fecha_vence:     fechaVence,
        monto_total:     totalEntrada,
        monto_pagado:    tipoPago==="contado"?totalEntrada:0,
        saldo_pendiente: tipoPago==="credito"?totalEntrada:0,
        estado:          tipoPago==="contado"?"pagada":"pendiente",
        usuario:         usuario?.nombre||"Admin",
        sucursal:        usuario?.sucursal||"Principal",
        notas:           notas.trim()||null,
      });

      for(const linea of previewData.lineas) {
        const costo = linea.costo;
        const cantidad = linea.cantidad;
        const stockActual = linea.existAnt;
        const costoActual = parseFloat(linea.prod?.costo||0);

        await sb("detalle_entradas","POST",{
          entrada_id:          entrada.id,
          producto_id:         linea.prod.id,
          cantidad:            cantidad,
          cantidad_disponible: cantidad,
          costo_unitario:      costo,
          costo_total:         cantidad*costo,
        });

        const nuevoCosto = modoAdmin
          ? ((stockActual*costoActual)+(cantidad*costo))/(stockActual+cantidad)
          : costoActual;

        await sb(`productos?id=eq.${linea.prod.id}`,"PATCH",{
          stock: stockActual+cantidad,
          costo: modoAdmin ? parseFloat(nuevoCosto.toFixed(4)) : costoActual,
        });
      }

      if(tipoPago==="credito") {
        const prov = proveedores.find(p=>String(p.id)===String(proveedorId));
        await sb(`proveedores?id=eq.${proveedorId}`,"PATCH",{
          saldo: parseFloat(prov?.saldo||0)+totalEntrada,
        });
      }

      // Preparar ticket
      setLastTicket({
        ...previewData,
        entradaId: entrada.id,
        fechaReal: new Date().toLocaleString("es-GT"),
      });

      // Reset form
      setProveedorId(""); setNumFactura(""); setTipoPago("contado");
      setDiasCredito(30); setNotas("");
      setLineas([{producto_id:"",cantidad:1,costo_unitario:0,tomarUltimoCosto:false}]);
      setShowConfirm(false);
      setPreviewData(null);
      setShowTicket(true);
      await loadAll();
    } catch(e){ setError("Error: "+e.message); setShowConfirm(false); }
    setSaving(false);
  };

  const verDetalle = async (e) => {
    setLoading(true);
    try {
      const detalles = await sb("detalle_entradas","GET",null,`?entrada_id=eq.${e.id}&order=id`);
      const pagos    = await sb("pagos_proveedor","GET",null,`?entrada_id=eq.${e.id}&order=created_at`);
      setEntradaSel({...e,detalles:detalles||[],pagos:pagos||[]});
      setPaso("detalle");
    } catch {}
    setLoading(false);
  };

  const ESTADO_COLOR = {pagada:C.green,pendiente:C.amber,parcial:C.blue};
  const ESTADO_BG    = {pagada:C.greenBg,pendiente:C.amberBg,parcial:C.blueBg};
  const filtered     = entradas.filter(e=>search===""|||(e.numero_factura||"").toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",width:isMobile?"95vw":"700px",maxHeight:"93vh",display:"flex",flexDirection:"column"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {paso!=="lista"&&<button onClick={()=>{setPaso("lista");setEntradaSel(null);setError("");}} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:13,fontWeight:600,padding:0}}>← Volver</button>}
            <h2 style={{color:C.text,fontSize:17,fontWeight:700,margin:0}}>
              📦 {paso==="lista"?"Entradas de Inventario":paso==="nuevo"?"Nueva Entrada":"Detalle de Entrada"}
            </h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:24}}>

          {/* ── LISTA ── */}
          {paso==="lista"&&(
            <>
              <div style={{display:"flex",gap:10,marginBottom:16}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar por No. factura..." style={{...IS,flex:1}}/>
                <button onClick={()=>setPaso("nuevo")} style={{...BP,whiteSpace:"nowrap"}}>➕ Nueva entrada</button>
              </div>
              {loading?<div style={{textAlign:"center",color:C.textSm,padding:40}}>Cargando...</div>
              :filtered.length===0?<div style={{textAlign:"center",color:C.textSm,padding:40,background:C.panel,borderRadius:12,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:40,marginBottom:12}}>📦</div><div>No hay entradas registradas</div>
              </div>
              :filtered.map(e=>{
                const prov = proveedores.find(p=>p.id===e.proveedor_id);
                return(
                  <button key={e.id} onClick={()=>verDetalle(e)}
                    style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"14px 16px",marginBottom:10,background:C.card,border:`1.5px solid ${C.border}`,borderRadius:10,cursor:"pointer",textAlign:"left"}}
                    onMouseEnter={el=>{el.currentTarget.style.borderColor=C.blue;}}
                    onMouseLeave={el=>{el.currentTarget.style.borderColor=C.border;}}>
                    <div style={{width:44,height:44,borderRadius:10,background:C.blueBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📦</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:2}}>
                        <span style={{color:C.blue,fontWeight:700,fontSize:14}}>Factura: {e.numero_factura}</span>
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:ESTADO_BG[e.estado]||C.panel,color:ESTADO_COLOR[e.estado]||C.textMd}}>
                          {e.estado==="pagada"?"✓ Pagada":e.estado==="pendiente"?"⏳ Pendiente":"Parcial"}
                        </span>
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:e.tipo_pago==="credito"?C.amberBg:C.greenBg,color:e.tipo_pago==="credito"?C.amber:C.green,fontWeight:600}}>
                          {e.tipo_pago==="credito"?"💳 Crédito":"💵 Contado"}
                        </span>
                      </div>
                      <div style={{color:C.textMd,fontSize:12}}>{prov?.nombre||"Proveedor"} · {fmtDate(e.created_at)}</div>
                      <div style={{color:C.textSm,fontSize:11}}>Ingresado por: {e.usuario}</div>
                      {e.tipo_pago==="credito"&&e.saldo_pendiente>0&&<div style={{color:C.red,fontSize:12,fontWeight:600,marginTop:2}}>Pendiente: {fmt(e.saldo_pendiente)}</div>}
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{color:C.text,fontWeight:700,fontSize:15}}>{fmt(e.monto_total)}</div>
                      <span style={{color:C.textSm,fontSize:18}}>›</span>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {/* ── NUEVA ENTRADA ── */}
          {paso==="nuevo"&&(
            <>
              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}

              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>📋 Datos de la compra</div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Proveedor *</label>
                    <select value={proveedorId} onChange={e=>handleProveedorChange(e.target.value)} style={{...IS,cursor:"pointer"}}>
                      <option value="">Seleccionar proveedor...</option>
                      {proveedores.map(p=>(<option key={p.id} value={p.id}>{p.nombre}</option>))}
                    </select>
                  </div>
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>No. de factura *</label>
                    <input value={numFactura} onChange={e=>setNumFactura(e.target.value)} placeholder="Ej: FAC-001234" style={IS}/>
                  </div>
                </div>

                <div style={{marginBottom:12}}>
                  <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:8}}>Forma de pago *</label>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {[
                      {id:"contado",label:"💵 Contado",desc:"Pago inmediato"},
                      {id:"credito",label:"💳 Crédito",desc:proveedorSel?.credito?`${proveedorSel.dias_credito} días`:"Pago diferido"},
                    ].map(t=>(
                      <button key={t.id} onClick={()=>{setTipoPago(t.id);if(t.id==="credito"&&proveedorSel?.credito)setDiasCredito(proveedorSel.dias_credito);}} style={{
                        padding:"12px",borderRadius:8,cursor:"pointer",textAlign:"left",
                        border:`2px solid ${tipoPago===t.id?C.blue:C.border}`,
                        background:tipoPago===t.id?C.blueBg:C.card,
                      }}>
                        <div style={{color:tipoPago===t.id?C.blue:C.text,fontWeight:700,fontSize:14}}>{t.label}</div>
                        <div style={{color:C.textSm,fontSize:11,marginTop:2}}>{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {tipoPago==="credito"&&(
                  <div style={{marginBottom:12}}>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Días de crédito</label>
                    <input type="number" value={diasCredito} onChange={e=>setDiasCredito(e.target.value)} min="1" style={{...IS,width:120}}/>
                  </div>
                )}

                <div>
                  <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Notas</label>
                  <input value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Observaciones opcionales..." style={IS}/>
                </div>
              </div>

              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{color:C.textMd,fontSize:13,fontWeight:600}}>📦 Productos</div>
                  <button onClick={addLinea} style={{...BS,padding:"5px 12px",fontSize:12,color:C.blue}}>+ Agregar producto</button>
                </div>

                {lineas.map((linea,i)=>{
                  const prod = productos.find(p=>String(p.id)===String(linea.producto_id));
                  return(
                    <div key={i} style={{background:C.card,borderRadius:10,padding:14,marginBottom:10,border:`1.5px solid ${C.border}`}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                        <span style={{color:C.textMd,fontSize:12,fontWeight:600}}>Producto {i+1}</span>
                        {lineas.length>1&&<button onClick={()=>removeLinea(i)} style={{...BD,padding:"3px 10px",fontSize:11}}>✕ Quitar</button>}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr 1fr",gap:10,marginBottom:8}}>
                        <div>
                          <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Producto *</label>
                          <select value={linea.producto_id} onChange={e=>handleProductoChange(i,e.target.value)} style={{...IS,cursor:"pointer",fontSize:13}}>
                            <option value="">Seleccionar...</option>
                            {productos.map(p=>(<option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</option>))}
                          </select>
                        </div>
                        <div>
                          <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Cantidad *</label>
                          <input type="number" value={linea.cantidad} onChange={e=>updateLinea(i,"cantidad",e.target.value)} min="1" style={{...IS,textAlign:"center",fontSize:16,fontWeight:700}}/>
                        </div>
                        <div>
                          <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>{modoAdmin?"Costo unitario *":"Costo (ref.)"}</label>
                          <input type="number" value={linea.costo_unitario}
                            onChange={e=>updateLinea(i,"costo_unitario",e.target.value)}
                            disabled={!modoAdmin||linea.tomarUltimoCosto}
                            min="0" step="0.01"
                            style={{...IS,textAlign:"right",fontSize:15,fontWeight:700,color:C.green,opacity:(!modoAdmin||linea.tomarUltimoCosto)?0.6:1}}/>
                        </div>
                      </div>
                      {modoAdmin&&prod&&(
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                          <button onClick={()=>handleTomarUltimoCosto(i,!linea.tomarUltimoCosto)} style={{width:36,height:20,borderRadius:10,border:"none",cursor:"pointer",position:"relative",background:linea.tomarUltimoCosto?C.blue:C.border,transition:"all 0.2s",flexShrink:0}}>
                            <div style={{position:"absolute",top:1,left:linea.tomarUltimoCosto?17:1,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"all 0.2s"}}/>
                          </button>
                          <span style={{color:C.textSm,fontSize:11}}>Tomar último costo ({fmt(prod.costo||0)})</span>
                        </div>
                      )}
                      {/* Stock actual del producto */}
                      {prod&&(
                        <div style={{display:"flex",gap:16,marginTop:4}}>
                          <span style={{color:C.textSm,fontSize:11}}>Stock actual: <strong style={{color:C.textMd}}>{prod.stock}</strong></span>
                          {linea.cantidad>0&&<span style={{color:C.textSm,fontSize:11}}>Stock después: <strong style={{color:C.green}}>{parseFloat(prod.stock)+parseFloat(linea.cantidad||0)}</strong></span>}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div style={{background:C.blueBg,borderRadius:8,padding:"10px 16px",border:`1px solid ${C.blueBorder}`,display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:C.blue,fontWeight:600,fontSize:14}}>Total de la entrada</span>
                  <span style={{color:C.blue,fontWeight:800,fontSize:18}}>{fmt(totalEntrada)}</span>
                </div>
              </div>

              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{setPaso("lista");setError("");}} style={{...BS,flex:1}}>Cancelar</button>
                <button onClick={prepararConfirmacion} style={{...BP,flex:2}}>
                  → Verificar y confirmar
                </button>
              </div>
            </>
          )}

          {/* ── DETALLE ENTRADA ── */}
          {paso==="detalle"&&entradaSel&&(
            <div>
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{color:C.blue,fontWeight:700,fontSize:16}}>Factura: {entradaSel.numero_factura}</div>
                    <div style={{color:C.textMd,fontSize:13}}>{proveedores.find(p=>p.id===entradaSel.proveedor_id)?.nombre}</div>
                    <div style={{color:C.textSm,fontSize:12}}>{fmtDate(entradaSel.created_at)}</div>
                    <div style={{color:C.textSm,fontSize:12}}>Ingresado por: <strong>{entradaSel.usuario}</strong> · {entradaSel.sucursal}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{color:C.text,fontWeight:700,fontSize:18}}>{fmt(entradaSel.monto_total)}</div>
                    <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:ESTADO_BG[entradaSel.estado]||C.panel,color:ESTADO_COLOR[entradaSel.estado]||C.textMd}}>
                      {entradaSel.estado==="pagada"?"✓ Pagada":"⏳ Pendiente"}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:10}}>Productos recibidos</div>
              {entradaSel.detalles.map((d,i)=>{
                const prod = productos.find(p=>p.id===d.producto_id);
                return(
                  <div key={d.id} style={{padding:"12px 16px",marginBottom:8,background:C.card,border:`1px solid ${C.border}`,borderRadius:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{color:C.text,fontWeight:600,fontSize:13}}>{prod?.nombre||"Producto"}</div>
                        <div style={{color:C.textSm,fontSize:11,marginTop:2}}>Lote PEPS #{i+1} · Costo: {fmt(d.costo_unitario)}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{color:C.text,fontWeight:700}}>{d.cantidad} unidades</div>
                        <div style={{color:C.textSm,fontSize:12}}>{fmt(d.costo_total)}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:16,marginTop:8,background:C.panel,borderRadius:6,padding:"6px 10px"}}>
                      <span style={{color:C.textSm,fontSize:11}}>Disponible: <strong style={{color:d.cantidad_disponible>0?C.green:C.red}}>{d.cantidad_disponible}</strong> de {d.cantidad}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL DE CONFIRMACIÓN ── */}
      {showConfirm&&previewData&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(3px)"}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",width:isMobile?"95vw":"580px",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"18px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
              <h2 style={{color:C.text,fontSize:17,fontWeight:700,margin:0}}>⚠️ Verificar entrada antes de confirmar</h2>
              <div style={{color:C.textSm,fontSize:12,marginTop:4}}>Revisa los detalles cuidadosamente. Esta acción no se puede deshacer.</div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:24}}>

              {/* Info general */}
              <div style={{background:C.panel,borderRadius:10,padding:14,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[
                    {label:"Proveedor",   value:previewData.proveedor?.nombre},
                    {label:"No. Factura", value:previewData.numFactura},
                    {label:"Forma pago",  value:previewData.tipoPago==="credito"?`Crédito (${previewData.diasCredito} días)`:"Contado"},
                    {label:"Total",       value:fmt(previewData.total)},
                    {label:"Fecha",       value:previewData.fecha},
                    {label:"Usuario",     value:previewData.usuario},
                  ].map(s=>(
                    <div key={s.label}>
                      <div style={{color:C.textSm,fontSize:11}}>{s.label}</div>
                      <div style={{color:C.text,fontWeight:600,fontSize:13}}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Productos */}
              <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:10}}>Movimiento de inventario</div>

              {/* Encabezado tabla */}
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:6,padding:"6px 12px",background:C.panel,borderRadius:"8px 8px 0 0",border:`1px solid ${C.border}`,borderBottom:"none"}}>
                <span style={{color:C.textSm,fontSize:11,fontWeight:600}}>PRODUCTO</span>
                <span style={{color:C.textSm,fontSize:11,fontWeight:600,textAlign:"center"}}>EXIST. ANT.</span>
                <span style={{color:C.textSm,fontSize:11,fontWeight:600,textAlign:"center"}}>ENTRADA</span>
                <span style={{color:C.textSm,fontSize:11,fontWeight:600,textAlign:"center"}}>EXIST. ACT.</span>
              </div>

              {previewData.lineas.map((l,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:6,padding:"10px 12px",background:C.card,border:`1px solid ${C.border}`,borderTop:"none",borderRadius:i===previewData.lineas.length-1?"0 0 8px 8px":"0"}}>
                  <div>
                    <div style={{color:C.text,fontWeight:600,fontSize:13}}>{l.prod?.nombre}</div>
                    {modoAdmin&&<div style={{color:C.textSm,fontSize:11}}>Costo: {fmt(l.costo)}</div>}
                  </div>
                  <div style={{textAlign:"center"}}>
                    <span style={{color:C.textMd,fontWeight:600,fontSize:14}}>{l.existAnt}</span>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <span style={{color:C.blue,fontWeight:700,fontSize:14}}>+{l.cantidad}</span>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <span style={{color:C.green,fontWeight:700,fontSize:14}}>{l.existNueva}</span>
                  </div>
                </div>
              ))}

              {modoAdmin&&(
                <div style={{display:"flex",justifyContent:"flex-end",padding:"10px 12px",background:C.blueBg,borderRadius:"0 0 8px 8px",border:`1px solid ${C.blueBorder}`,borderTop:"none",marginTop:-1}}>
                  <span style={{color:C.blue,fontWeight:700,fontSize:14}}>Total: {fmt(previewData.total)}</span>
                </div>
              )}
            </div>

            <div style={{padding:"16px 24px",borderTop:`1px solid ${C.border}`,display:"flex",gap:10,flexShrink:0}}>
              <button onClick={()=>{setShowConfirm(false);setPreviewData(null);}} style={{...BS,flex:1}}>← Corregir</button>
              <button onClick={confirmarEntrada} disabled={saving}
                style={{...BP,flex:2,background:"#16A34A",opacity:saving?0.6:1}}>
                {saving?"⏳ Guardando...":"✓ Confirmar entrada"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TICKET DE ENTRADA ── */}
      {showTicket&&lastTicket&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(3px)"}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",width:isMobile?"95vw":"440px",maxHeight:"90vh",overflowY:"auto",padding:24}}>
            <div style={{fontFamily:"'Courier New',monospace"}}>
              {/* Header ticket */}
              <div style={{textAlign:"center",borderBottom:`1px dashed ${C.border}`,paddingBottom:12,marginBottom:12}}>
                <div style={{fontSize:11,color:C.textSm,letterSpacing:2}}>COMPROBANTE DE ENTRADA</div>
                <div style={{fontSize:18,fontWeight:700,color:C.text,fontFamily:"Inter,sans-serif"}}>Smart Valion POS</div>
                <div style={{fontSize:11,color:C.textMd}}>{lastTicket.sucursal}</div>
                <div style={{fontSize:11,color:C.textMd}}>{lastTicket.fechaReal}</div>
              </div>

              {/* Datos entrada */}
              <div style={{marginBottom:12}}>
                {[
                  {label:"Proveedor",    value:lastTicket.proveedor?.nombre},
                  {label:"No. Factura",  value:lastTicket.numFactura},
                  {label:"Forma pago",   value:lastTicket.tipoPago==="credito"?`Crédito (${lastTicket.diasCredito} días)`:"Contado"},
                  {label:"Ingresado por",value:lastTicket.usuario},
                ].map(s=>(
                  <div key={s.label} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{color:C.textMd,fontSize:12}}>{s.label}</span>
                    <span style={{color:C.text,fontSize:12,fontWeight:600}}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Tabla de movimientos */}
              <div style={{borderTop:`1px dashed ${C.border}`,paddingTop:10,marginBottom:10}}>
                <div style={{color:C.textMd,fontSize:11,fontWeight:600,marginBottom:8}}>MOVIMIENTO DE INVENTARIO:</div>

                {/* Header */}
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:4,marginBottom:6,paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>
                  <span style={{color:C.textSm,fontSize:10,fontWeight:600}}>PRODUCTO</span>
                  <span style={{color:C.textSm,fontSize:10,fontWeight:600,textAlign:"center"}}>ANT.</span>
                  <span style={{color:C.textSm,fontSize:10,fontWeight:600,textAlign:"center"}}>ENTRADA</span>
                  <span style={{color:C.textSm,fontSize:10,fontWeight:600,textAlign:"center"}}>ACT.</span>
                </div>

                {lastTicket.lineas.map((l,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:4,marginBottom:8,paddingBottom:8,borderBottom:i<lastTicket.lineas.length-1?`1px dashed ${C.border}`:"none"}}>
                    <div>
                      <div style={{color:C.text,fontSize:11,fontWeight:600,lineHeight:1.3}}>{l.prod?.nombre}</div>
                      {modoAdmin&&<div style={{color:C.textSm,fontSize:10}}>Costo: {fmt(l.costo)}</div>}
                    </div>
                    <div style={{textAlign:"center",color:C.textMd,fontSize:12,fontWeight:600}}>{l.existAnt}</div>
                    <div style={{textAlign:"center",color:C.blue,fontSize:12,fontWeight:700}}>+{l.cantidad}</div>
                    <div style={{textAlign:"center",color:C.green,fontSize:12,fontWeight:700}}>{l.existNueva}</div>
                  </div>
                ))}
              </div>

              {/* Total */}
              {modoAdmin&&(
                <div style={{borderTop:`1px dashed ${C.border}`,paddingTop:10,marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{color:C.text,fontSize:14,fontWeight:700}}>TOTAL</span>
                    <span style={{color:C.blue,fontSize:14,fontWeight:700}}>{fmt(lastTicket.total)}</span>
                  </div>
                </div>
              )}

              <div style={{textAlign:"center",color:C.textSm,fontSize:10,marginBottom:16}}>
                *** Documento interno de control ***
              </div>

              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>window.print()} style={{...BS,flex:1}}>🖨️ Imprimir</button>
                <button onClick={()=>{setShowTicket(false);setLastTicket(null);setPaso("lista");}} style={{...BP,flex:1}}>✓ Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
