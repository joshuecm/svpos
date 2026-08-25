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

function ConfirmModal({ data, modoAdmin, saving, onConfirm, onCancel, isMobile }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(3px)"}}>
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",width:isMobile?"95vw":"580px",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"18px 24px",borderBottom:"1px solid #E2E8F0",flexShrink:0}}>
          <h2 style={{color:"#1E293B",fontSize:17,fontWeight:700,margin:0}}>⚠️ Verificar entrada</h2>
          <div style={{color:"#94A3B8",fontSize:12,marginTop:4}}>Revisa antes de confirmar. Esta acción actualizará el inventario.</div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:24}}>
          <div style={{background:"#F8F9FB",borderRadius:10,padding:14,marginBottom:16,border:"1px solid #E2E8F0"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[
                {label:"Proveedor",   value:data.proveedor?.nombre},
                {label:"No. Factura", value:data.numFactura},
                {label:"Forma pago",  value:data.tipoPago==="credito"?`Crédito (${data.diasCredito} días)`:"Contado"},
                {label:"Total",       value:fmt(data.total)},
                {label:"Fecha",       value:data.fecha},
                {label:"Usuario",     value:data.usuario},
              ].map(s=>(
                <div key={s.label}>
                  <div style={{color:"#94A3B8",fontSize:11}}>{s.label}</div>
                  <div style={{color:"#1E293B",fontWeight:600,fontSize:13}}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{color:"#475569",fontSize:13,fontWeight:600,marginBottom:10}}>Movimiento de inventario</div>
          <div style={{border:"1px solid #E2E8F0",borderRadius:8,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:6,padding:"8px 12px",background:"#F8F9FB"}}>
              {["PRODUCTO","EXIST. ANT.","ENTRADA","EXIST. ACT."].map(h=>(
                <span key={h} style={{color:"#94A3B8",fontSize:11,fontWeight:600,textAlign:h==="PRODUCTO"?"left":"center"}}>{h}</span>
              ))}
            </div>
            {data.lineas.map((l,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:6,padding:"10px 12px",borderTop:"1px solid #E2E8F0",background:"#fff"}}>
                <div>
                  <div style={{color:"#1E293B",fontWeight:600,fontSize:13}}>{l.prod?.nombre}</div>
                  {modoAdmin&&<div style={{color:"#94A3B8",fontSize:11}}>Costo: {fmt(l.costo)}</div>}
                </div>
                <div style={{textAlign:"center",color:"#475569",fontWeight:600,fontSize:14}}>{l.existAnt}</div>
                <div style={{textAlign:"center",color:"#3B82F6",fontWeight:700,fontSize:14}}>+{l.cantidad}</div>
                <div style={{textAlign:"center",color:"#16A34A",fontWeight:700,fontSize:14}}>{l.existNueva}</div>
              </div>
            ))}
            {modoAdmin&&(
              <div style={{display:"flex",justifyContent:"flex-end",padding:"10px 12px",background:"#EFF6FF",borderTop:"1px solid #BFDBFE"}}>
                <span style={{color:"#3B82F6",fontWeight:700,fontSize:14}}>Total: {fmt(data.total)}</span>
              </div>
            )}
          </div>
        </div>
        <div style={{padding:"16px 24px",borderTop:"1px solid #E2E8F0",display:"flex",gap:10,flexShrink:0}}>
          <button onClick={onCancel} style={{...BS,flex:1}}>← Corregir</button>
          <button onClick={onConfirm} disabled={saving} style={{...BP,flex:2,background:"#16A34A",opacity:saving?0.6:1}}>
            {saving?"⏳ Guardando...":"✓ Confirmar entrada"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TicketModal({ ticket, modoAdmin, onClose }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(3px)"}}>
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",width:"440px",maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto",padding:24}}>
        <div style={{fontFamily:"'Courier New',monospace"}}>
          <div style={{textAlign:"center",borderBottom:"1px dashed #E2E8F0",paddingBottom:12,marginBottom:12}}>
            <div style={{fontSize:11,color:"#94A3B8",letterSpacing:2}}>COMPROBANTE DE ENTRADA</div>
            <div style={{fontSize:18,fontWeight:700,color:"#1E293B",fontFamily:"Inter,sans-serif"}}>Smart Valion POS</div>
            <div style={{fontSize:11,color:"#475569"}}>{ticket.sucursal}</div>
            <div style={{fontSize:11,color:"#475569"}}>{ticket.fechaReal}</div>
          </div>
          <div style={{marginBottom:12}}>
            {[
              {label:"Proveedor",     value:ticket.proveedor?.nombre},
              {label:"No. Factura",   value:ticket.numFactura},
              {label:"Forma pago",    value:ticket.tipoPago==="credito"?`Crédito (${ticket.diasCredito} días)`:"Contado"},
              {label:"Ingresado por", value:ticket.usuario},
            ].map(s=>(
              <div key={s.label} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:"#475569",fontSize:12}}>{s.label}</span>
                <span style={{color:"#1E293B",fontSize:12,fontWeight:600}}>{s.value}</span>
              </div>
            ))}
          </div>
          <div style={{borderTop:"1px dashed #E2E8F0",paddingTop:10,marginBottom:10}}>
            <div style={{color:"#475569",fontSize:11,fontWeight:600,marginBottom:8}}>MOVIMIENTO DE INVENTARIO:</div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:4,marginBottom:6,paddingBottom:6,borderBottom:"1px solid #E2E8F0"}}>
              {["PRODUCTO","ANT.","ENTRADA","ACT."].map(h=>(
                <span key={h} style={{color:"#94A3B8",fontSize:10,fontWeight:600,textAlign:h==="PRODUCTO"?"left":"center"}}>{h}</span>
              ))}
            </div>
            {ticket.lineas.map((l,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:4,marginBottom:8,paddingBottom:8,borderBottom:i<ticket.lineas.length-1?"1px dashed #E2E8F0":"none"}}>
                <div>
                  <div style={{color:"#1E293B",fontSize:11,fontWeight:600}}>{l.prod?.nombre}</div>
                  {modoAdmin&&<div style={{color:"#94A3B8",fontSize:10}}>Costo: {fmt(l.costo)}</div>}
                </div>
                <div style={{textAlign:"center",color:"#475569",fontSize:12,fontWeight:600}}>{l.existAnt}</div>
                <div style={{textAlign:"center",color:"#3B82F6",fontSize:12,fontWeight:700}}>+{l.cantidad}</div>
                <div style={{textAlign:"center",color:"#16A34A",fontSize:12,fontWeight:700}}>{l.existNueva}</div>
              </div>
            ))}
          </div>
          {modoAdmin&&(
            <div style={{borderTop:"1px dashed #E2E8F0",paddingTop:10,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#1E293B",fontSize:14,fontWeight:700}}>TOTAL</span>
                <span style={{color:"#3B82F6",fontSize:14,fontWeight:700}}>{fmt(ticket.total)}</span>
              </div>
            </div>
          )}
          <div style={{textAlign:"center",color:"#94A3B8",fontSize:10,marginBottom:16}}>*** Documento interno de control ***</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>window.print()} style={{...BS,flex:1}}>🖨️ Imprimir</button>
            <button onClick={onClose} style={{...BP,flex:1}}>✓ Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InventarioModal({ onClose, isMobile, usuario, modoAdmin=true }) {
  const [paso,        setPaso]        = useState("lista");
  const [entradas,    setEntradas]    = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos,   setProductos]   = useState([]);
  const [entradaSel,  setEntradaSel]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [search,      setSearch]      = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [lastTicket,  setLastTicket]  = useState(null);
  const [showTicket,  setShowTicket]  = useState(false);
  const [proveedorId, setProveedorId] = useState("");
  const [numFactura,  setNumFactura]  = useState("");
  const [tipoPago,    setTipoPago]    = useState("contado");
  const [diasCredito, setDiasCredito] = useState(30);
  const [notas,       setNotas]       = useState("");
  const [lineas,      setLineas]      = useState([{producto_id:"",cantidad:1,costo_unitario:0,tomarUltimoCosto:false}]);

  useEffect(()=>{ loadAll(); },[]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ent,prov,prods] = await Promise.all([
        sb("entradas_inventario","GET",null,"?order=created_at.desc&limit=50"),
        sb("proveedores","GET",null,"?activo=eq.true&order=nombre"),
        sb("productos","GET",null,"?activo=eq.true&order=nombre"),
      ]);
      setEntradas(ent||[]); setProveedores(prov||[]); setProductos(prods||[]);
    } catch { setError("Error cargando datos"); }
    setLoading(false);
  };

  const proveedorSel = proveedores.find(p=>String(p.id)===String(proveedorId));
  const totalEntrada = lineas.reduce((s,l)=>s+parseFloat(l.cantidad||0)*parseFloat(l.costo_unitario||0),0);

  const handleProveedorChange = (id) => {
    setProveedorId(id);
    const prov = proveedores.find(p=>String(p.id)===String(id));
    if(prov?.credito) setDiasCredito(prov.dias_credito||30);
  };

  const addLinea    = () => setLineas(prev=>[...prev,{producto_id:"",cantidad:1,costo_unitario:0,tomarUltimoCosto:false}]);
  const removeLinea = (i) => setLineas(prev=>prev.filter((_,idx)=>idx!==i));
  const updateLinea = (i,f,v) => setLineas(prev=>prev.map((l,idx)=>idx===i?{...l,[f]:v}:l));

  const handleProductoChange = (i,productoId) => {
    const prod = productos.find(p=>String(p.id)===String(productoId));
    updateLinea(i,"producto_id",productoId);
    if(prod) updateLinea(i,"costo_unitario",prod.costo||0);
  };

  const handleTomarUltimoCosto = (i,val) => {
    const prod = productos.find(p=>String(p.id)===String(lineas[i].producto_id));
    updateLinea(i,"tomarUltimoCosto",val);
    if(val&&prod) updateLinea(i,"costo_unitario",prod.costo||0);
  };

  const prepararConfirmacion = () => {
    setError("");
    if(!proveedorId){ setError("Selecciona el proveedor"); return; }
    if(!numFactura.trim()){ setError("Ingresa el número de factura"); return; }
    if(lineas.some(l=>!l.producto_id)){ setError("Selecciona el producto en todas las líneas"); return; }
    if(lineas.some(l=>!l.cantidad||parseFloat(l.cantidad)<=0)){ setError("La cantidad debe ser mayor a 0"); return; }
    if(modoAdmin&&lineas.some(l=>!l.costo_unitario||parseFloat(l.costo_unitario)<=0)){ setError("Ingresa el costo en todas las líneas"); return; }
    const preview = lineas.map(l=>{
      const prod = productos.find(p=>String(p.id)===String(l.producto_id));
      const cantidad = parseFloat(l.cantidad||0);
      const costo = modoAdmin?parseFloat(l.costo_unitario||0):parseFloat(prod?.costo||0);
      return {prod,cantidad,costo,existAnt:parseFloat(prod?.stock||0),existNueva:parseFloat(prod?.stock||0)+cantidad,subtotal:cantidad*costo};
    });
    setPreviewData({
      proveedor:proveedorSel, numFactura:numFactura.trim(), tipoPago,
      diasCredito:parseInt(diasCredito)||30, notas:notas.trim(),
      lineas:preview, total:totalEntrada,
      fecha:new Date().toLocaleString("es-GT"),
      usuario:usuario?.nombre||"Admin", sucursal:usuario?.sucursal||"Principal",
    });
    setShowConfirm(true);
  };

  const confirmarEntrada = async () => {
    setSaving(true);
    try {
      const fechaVence = tipoPago==="credito"?new Date(Date.now()+parseInt(diasCredito)*24*60*60*1000).toISOString():null;
      const [entrada] = await sb("entradas_inventario","POST",{
        proveedor_id:parseInt(proveedorId), numero_factura:numFactura.trim(),
        tipo_pago:tipoPago, dias_credito:tipoPago==="credito"?parseInt(diasCredito):0,
        fecha_vence:fechaVence, monto_total:totalEntrada,
        monto_pagado:tipoPago==="contado"?totalEntrada:0,
        saldo_pendiente:tipoPago==="credito"?totalEntrada:0,
        estado:tipoPago==="contado"?"pagada":"pendiente",
        usuario:usuario?.nombre||"Admin", sucursal:usuario?.sucursal||"Principal",
        notas:notas.trim()||null,
      });
      for(const l of previewData.lineas) {
        const costoActual = parseFloat(l.prod?.costo||0);
        const nuevoCosto = modoAdmin&&(l.existAnt+l.cantidad)>0?((l.existAnt*costoActual)+(l.cantidad*l.costo))/(l.existAnt+l.cantidad):costoActual;
        await sb("detalle_entradas","POST",{
          entrada_id:entrada.id, producto_id:l.prod.id,
          cantidad:l.cantidad, cantidad_disponible:l.cantidad,
          costo_unitario:l.costo, costo_total:l.cantidad*l.costo,
        });
        await sb(`productos?id=eq.${l.prod.id}`,"PATCH",{
          stock:l.existNueva,
          costo:modoAdmin?parseFloat(nuevoCosto.toFixed(4)):costoActual,
        });
      }
      if(tipoPago==="credito"){
        const prov = proveedores.find(p=>String(p.id)===String(proveedorId));
        await sb(`proveedores?id=eq.${proveedorId}`,"PATCH",{saldo:parseFloat(prov?.saldo||0)+totalEntrada});
      }
      setLastTicket({...previewData,entradaId:entrada.id,fechaReal:new Date().toLocaleString("es-GT")});
      setProveedorId(""); setNumFactura(""); setTipoPago("contado");
      setDiasCredito(30); setNotas("");
      setLineas([{producto_id:"",cantidad:1,costo_unitario:0,tomarUltimoCosto:false}]);
      setShowConfirm(false); setPreviewData(null);
      setShowTicket(true);
      await loadAll();
    } catch(e){ setError("Error: "+e.message); setShowConfirm(false); }
    setSaving(false);
  };

  const verDetalle = async (e) => {
    setLoading(true);
    try {
      const [detalles,pagos] = await Promise.all([
        sb("detalle_entradas","GET",null,`?entrada_id=eq.${e.id}&order=id`),
        sb("pagos_proveedor","GET",null,`?entrada_id=eq.${e.id}&order=created_at`),
      ]);
      setEntradaSel({...e,detalles:detalles||[],pagos:pagos||[]});
      setPaso("detalle");
    } catch {}
    setLoading(false);
  };

  const ESTADO_COLOR = {pagada:C.green,pendiente:C.amber,parcial:C.blue};
  const ESTADO_BG    = {pagada:C.greenBg,pendiente:C.amberBg,parcial:C.blueBg};
  const filtered     = entradas.filter(e=>search===""||( e.numero_factura||"").toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",width:isMobile?"95vw":"700px",maxHeight:"93vh",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {paso!=="lista"&&<button onClick={()=>{setPaso("lista");setEntradaSel(null);setError("");}} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:13,fontWeight:600,padding:0}}>← Volver</button>}
            <h2 style={{color:C.text,fontSize:17,fontWeight:700,margin:0}}>
              {paso==="lista"?"📦 Entradas de Inventario":paso==="nuevo"?"📦 Nueva Entrada":"📦 Detalle de Entrada"}
            </h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:24}}>

          {paso==="lista"&&(
            <div>
              <div style={{display:"flex",gap:10,marginBottom:16}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar por No. factura..." style={{...IS,flex:1}}/>
                <button onClick={()=>setPaso("nuevo")} style={{...BP,whiteSpace:"nowrap"}}>➕ Nueva entrada</button>
              </div>
              {loading?<div style={{textAlign:"center",color:C.textSm,padding:40}}>Cargando...</div>
              :filtered.length===0?
                <div style={{textAlign:"center",color:C.textSm,padding:40,background:C.panel,borderRadius:12,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:40,marginBottom:12}}>📦</div>
                  <div>No hay entradas registradas</div>
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
                          {e.estado==="pagada"?"✓ Pagada":"⏳ Pendiente"}
                        </span>
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:e.tipo_pago==="credito"?C.amberBg:C.greenBg,color:e.tipo_pago==="credito"?C.amber:C.green,fontWeight:600}}>
                          {e.tipo_pago==="credito"?"💳 Crédito":"💵 Contado"}
                        </span>
                      </div>
                      <div style={{color:C.textMd,fontSize:12}}>{prov?.nombre||"Proveedor"} · {fmtDate(e.created_at)}</div>
                      <div style={{color:C.textSm,fontSize:11}}>Por: {e.usuario}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{color:C.text,fontWeight:700,fontSize:15}}>{fmt(e.monto_total)}</div>
                      <span style={{color:C.textSm,fontSize:18}}>›</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {paso==="nuevo"&&(
            <div>
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
                      <button key={t.id} onClick={()=>{setTipoPago(t.id);if(t.id==="credito"&&proveedorSel?.credito)setDiasCredito(proveedorSel.dias_credito);}} style={{padding:"12px",borderRadius:8,cursor:"pointer",textAlign:"left",border:`2px solid ${tipoPago===t.id?C.blue:C.border}`,background:tipoPago===t.id?C.blueBg:C.card}}>
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
                  <input value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Observaciones..." style={IS}/>
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
                          <input type="number" value={linea.costo_unitario} onChange={e=>updateLinea(i,"costo_unitario",e.target.value)} disabled={!modoAdmin||linea.tomarUltimoCosto} min="0" step="0.01" style={{...IS,textAlign:"right",fontSize:15,fontWeight:700,color:C.green,opacity:(!modoAdmin||linea.tomarUltimoCosto)?0.6:1}}/>
                        </div>
                      </div>
                      {modoAdmin&&prod&&(
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <button onClick={()=>handleTomarUltimoCosto(i,!linea.tomarUltimoCosto)} style={{width:36,height:20,borderRadius:10,border:"none",cursor:"pointer",position:"relative",background:linea.tomarUltimoCosto?C.blue:C.border,transition:"all 0.2s",flexShrink:0}}>
                            <div style={{position:"absolute",top:1,left:linea.tomarUltimoCosto?17:1,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"all 0.2s"}}/>
                          </button>
                          <span style={{color:C.textSm,fontSize:11}}>Tomar último costo ({fmt(prod.costo||0)})</span>
                        </div>
                      )}
                      {prod&&(
                        <div style={{display:"flex",gap:16,background:C.panel,borderRadius:6,padding:"6px 10px"}}>
                          <span style={{color:C.textSm,fontSize:11}}>Stock actual: <strong style={{color:C.textMd}}>{prod.stock}</strong></span>
                          {linea.cantidad>0&&<span style={{color:C.textSm,fontSize:11}}>Después: <strong style={{color:C.green}}>{parseFloat(prod.stock)+parseFloat(linea.cantidad||0)}</strong></span>}
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
                <button onClick={prepararConfirmacion} style={{...BP,flex:2}}>→ Verificar y confirmar</button>
              </div>
            </div>
          )}

          {paso==="detalle"&&entradaSel&&(
            <div>
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{color:C.blue,fontWeight:700,fontSize:16}}>Factura: {entradaSel.numero_factura}</div>
                    <div style={{color:C.textMd,fontSize:13}}>{proveedores.find(p=>p.id===entradaSel.proveedor_id)?.nombre}</div>
                    <div style={{color:C.textSm,fontSize:12}}>{fmtDate(entradaSel.created_at)}</div>
                    <div style={{color:C.textSm,fontSize:12}}>Por: <strong>{entradaSel.usuario}</strong></div>
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
              {(entradaSel.detalles||[]).map((d,i)=>{
                const prod = productos.find(p=>p.id===d.producto_id);
                return(
                  <div key={d.id} style={{padding:"12px 16px",marginBottom:8,background:C.card,border:`1px solid ${C.border}`,borderRadius:8}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <div>
                        <div style={{color:C.text,fontWeight:600,fontSize:13}}>{prod?.nombre}</div>
                        <div style={{color:C.textSm,fontSize:11}}>Lote PEPS #{i+1} · Costo: {fmt(d.costo_unitario)}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{color:C.text,fontWeight:700}}>{d.cantidad} unidades</div>
                        <div style={{color:C.textSm,fontSize:12}}>{fmt(d.costo_total)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {showConfirm&&previewData&&(
        <ConfirmModal
          data={previewData} modoAdmin={modoAdmin} saving={saving}
          onConfirm={confirmarEntrada}
          onCancel={()=>{setShowConfirm(false);setPreviewData(null);}}
          isMobile={isMobile}
        />
      )}

      {showTicket&&lastTicket&&(
        <TicketModal
          ticket={lastTicket} modoAdmin={modoAdmin}
          onClose={()=>{setShowTicket(false);setLastTicket(null);setPaso("lista");}}
        />
      )}
    </div>
  );
}
