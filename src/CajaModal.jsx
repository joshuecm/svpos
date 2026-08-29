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
  card:"#FFFFFF", panel:"#F8F9FB", border:"#E2E8F0",
  text:"#1E293B", textMd:"#475569", textSm:"#94A3B8",
  blue:"#3B82F6", blueBg:"#EFF6FF", blueBorder:"#BFDBFE",
  green:"#16A34A", greenBg:"#F0FDF4",
  red:"#DC2626", redBg:"#FEF2F2", redBorder:"#FECACA",
  amber:"#D97706", amberBg:"#FFF7ED",
};

const IS  = {background:"#fff",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 14px",color:"#1E293B",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"};
const BP  = {background:"#3B82F6",color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:"pointer"};
const BG  = {background:"#16A34A",color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:"pointer"};
const BS  = {background:"#fff",color:"#475569",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"};
const BD  = {background:"#FEF2F2",color:"#DC2626",border:"1.5px solid #FECACA",borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"};

const fmt     = (n) => `Q ${Number(n||0).toFixed(2)}`;
const fmtDate = (d) => new Date(d).toLocaleString("es-GT");

// ─── APERTURA ────────────────────────────────────────────────────────────────
export function AperturaCaja({ usuario, onAbierta }) {
  const [fondo,   setFondo]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const abrir = async () => {
    if(!fondo||parseFloat(fondo)<0){ setError("Ingresa el fondo inicial"); return; }
    setSaving(true);
    try {
      const [caja] = await sb("cajas","POST",{
        serie:          usuario.serie_correlativo||"A",
        cajero:         usuario.nombre||"Admin",
        sucursal:       usuario.sucursal||"Principal",
        fondo_inicial:  parseFloat(fondo),
        estado:         "abierta",
      });
      onAbierta(caja);
    } catch(e){ setError("Error: "+e.message); }
    setSaving(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,backdropFilter:"blur(4px)"}}>
      <div style={{background:C.card,borderRadius:16,boxShadow:"0 24px 64px rgba(0,0,0,0.2)",width:"360px",maxWidth:"95vw",padding:32,textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:12}}>🏪</div>
        <h2 style={{color:C.text,fontSize:20,fontWeight:700,margin:"0 0 4px"}}>Apertura de Caja</h2>
        <div style={{color:C.textMd,fontSize:14,marginBottom:24}}>Serie <strong>{usuario.serie_correlativo||"A"}</strong> · {usuario.nombre}</div>

        {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14,textAlign:"left"}}>{error}</div>}

        <div style={{marginBottom:20}}>
          <label style={{color:C.textMd,fontSize:13,display:"block",marginBottom:8,textAlign:"left"}}>Fondo inicial de caja</label>
          <input type="number" value={fondo} onChange={e=>setFondo(e.target.value)}
            placeholder="0.00" min="0" step="0.01" autoFocus
            style={{...IS,fontSize:28,fontWeight:800,textAlign:"right",color:C.green}}/>
        </div>

        <div style={{background:C.panel,borderRadius:10,padding:12,marginBottom:20,textAlign:"left"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{color:C.textSm,fontSize:12}}>Cajero</span>
            <span style={{color:C.text,fontSize:12,fontWeight:600}}>{usuario.nombre}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{color:C.textSm,fontSize:12}}>Serie</span>
            <span style={{color:C.blue,fontSize:12,fontWeight:600}}>{usuario.serie_correlativo||"A"}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{color:C.textSm,fontSize:12}}>Fecha y hora</span>
            <span style={{color:C.text,fontSize:12}}>{new Date().toLocaleString("es-GT")}</span>
          </div>
        </div>

        <button onClick={abrir} disabled={saving} style={{...BG,width:"100%",padding:14,fontSize:16,fontWeight:700,borderRadius:10,opacity:saving?0.6:1}}>
          {saving?"⏳ Abriendo...":"✓ Abrir caja"}
        </button>
      </div>
    </div>
  );
}

// ─── CIERRE ──────────────────────────────────────────────────────────────────
function CierreCaja({ caja, usuario, puedeDetalle, onCerrada, onClose }) {
  const [datos,          setDatos]          = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [efectivoDecl,   setEfectivoDecl]   = useState("");
  const [observaciones,  setObservaciones]  = useState("");
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");
  const [modoDetalle,    setModoDetalle]    = useState(false);

  useEffect(()=>{ cargarDatos(); },[]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const serie = caja.serie;
      const desde = caja.abierta_at;

      const [ventas, abonos, salidas] = await Promise.all([
        sb("ventas","GET",null,`?cajero=eq.${encodeURIComponent(caja.cajero)}&created_at=gte.${desde}&order=created_at.asc`),
        sb("abonos_credito","GET",null,`?cajero=eq.${encodeURIComponent(caja.cajero)}&created_at=gte.${desde}&order=created_at.asc`),
        sb("salidas_caja","GET",null,`?caja_id=eq.${caja.id}&order=created_at.asc`),
      ]);

      // Totales por método de pago
      const totales = {efectivo:0, tarjeta:0, transferencia:0, credito:0};
      (ventas||[]).forEach(v=>{
        const metodos = (v.metodo_pago||"").split("+");
        if(metodos.includes("cash"))     totales.efectivo     += parseFloat(v.total||0);
        if(metodos.includes("card"))     totales.tarjeta      += parseFloat(v.total||0);
        if(metodos.includes("transfer")) totales.transferencia+= parseFloat(v.total||0);
        if(metodos.includes("credit"))   totales.credito      += parseFloat(v.total||0);
      });

      // Pagos de crédito recibidos en efectivo
      const pagosCredito = (abonos||[]).filter(a=>a.metodo_pago==="cash")
        .reduce((s,a)=>s+parseFloat(a.monto||0),0);

      // Total salidas
      const totalSalidas = (salidas||[]).reduce((s,e)=>s+parseFloat(e.monto||0),0);

      // Efectivo esperado
      const efectivoEsperado = parseFloat(caja.fondo_inicial||0)
        + totales.efectivo + pagosCredito - totalSalidas;

      setDatos({
        ventas:        ventas||[],
        abonos:        abonos||[],
        salidas:       salidas||[],
        totales,
        pagosCredito,
        totalSalidas,
        efectivoEsperado,
        totalVentas:   (ventas||[]).reduce((s,v)=>s+parseFloat(v.total||0),0),
      });
    } catch(e){ setError("Error cargando datos: "+e.message); }
    setLoading(false);
  };

  const cerrar = async () => {
    if(!efectivoDecl&&efectivoDecl!==""){ setError("Ingresa el efectivo declarado"); return; }
    setSaving(true);
    try {
      const decl = parseFloat(efectivoDecl||0);
      await sb(`cajas?id=eq.${caja.id}`,"PATCH",{
        estado:             "cerrada",
        efectivo_declarado: decl,
        observaciones:      observaciones.trim()||null,
        cerrada_at:         new Date().toISOString(),
      });
      onCerrada();
    } catch(e){ setError("Error: "+e.message); }
    setSaving(false);
  };

  const diferencia = datos ? parseFloat(efectivoDecl||0) - datos.efectivoEsperado : 0;

  if(loading) return(
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400}}>
      <div style={{background:C.card,borderRadius:14,padding:40,textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:12}}>⏳</div>
        <div style={{color:C.textMd}}>Calculando cierre...</div>
      </div>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,backdropFilter:"blur(3px)"}}>
      <div style={{background:C.card,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",width:"95vw",maxWidth:"580px",maxHeight:"93vh",display:"flex",flexDirection:"column"}}>

        {/* Header */}
        <div style={{padding:"18px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <h2 style={{color:C.text,fontSize:17,fontWeight:700,margin:0}}>🏪 Cierre de Caja — Serie {caja.serie}</h2>
            <div style={{color:C.textSm,fontSize:12,marginTop:2}}>{caja.cajero} · Apertura: {fmtDate(caja.abierta_at)}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:24}}>
          {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}

          {/* Toggle detalle/resumido */}
          {puedeDetalle&&(
            <div style={{display:"flex",background:C.panel,borderRadius:10,padding:4,marginBottom:16,border:`1px solid ${C.border}`}}>
              {[{id:false,label:"📊 Resumido"},{id:true,label:"📋 Detallado"}].map(t=>(
                <button key={String(t.id)} onClick={()=>setModoDetalle(t.id)} style={{
                  flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,
                  background:modoDetalle===t.id?C.card:"transparent",
                  color:modoDetalle===t.id?C.blue:C.textSm,
                  boxShadow:modoDetalle===t.id?"0 1px 4px rgba(0,0,0,0.08)":"none"
                }}>{t.label}</button>
              ))}
            </div>
          )}

          {/* ── VENTAS ── */}
          <div style={{background:C.panel,borderRadius:10,padding:14,marginBottom:12,border:`1px solid ${C.border}`}}>
            <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:10}}>💰 Ventas del turno</div>
            {[
              {label:"Efectivo",       value:datos.totales.efectivo,      color:C.green},
              {label:"Tarjeta",        value:datos.totales.tarjeta,       color:C.blue},
              {label:"Transferencia",  value:datos.totales.transferencia, color:C.blue},
              {label:"Crédito",        value:datos.totales.credito,       color:C.amber},
            ].map(r=>(
              <div key={r.label} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{color:C.textMd,fontSize:13}}>{r.label}</span>
                <span style={{color:r.value>0?r.color:C.textSm,fontWeight:r.value>0?600:400,fontSize:13}}>{fmt(r.value)}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:`1px solid ${C.border}`,marginTop:4}}>
              <span style={{color:C.text,fontWeight:700,fontSize:14}}>Total ventas</span>
              <span style={{color:C.text,fontWeight:700,fontSize:14}}>{fmt(datos.totalVentas)}</span>
            </div>
          </div>

          {/* ── PAGOS CRÉDITO ── */}
          <div style={{background:C.panel,borderRadius:10,padding:14,marginBottom:12,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{color:C.textMd,fontSize:13,fontWeight:600}}>💳 Pagos de crédito recibidos</span>
              <span style={{color:C.green,fontWeight:600,fontSize:13}}>{fmt(datos.pagosCredito)}</span>
            </div>
          </div>

          {/* ── MOVIMIENTOS ── */}
          <div style={{background:C.panel,borderRadius:10,padding:14,marginBottom:12,border:`1px solid ${C.border}`}}>
            <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:10}}>🔄 Movimientos de caja</div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{color:C.textMd,fontSize:13}}>Fondo inicial</span>
              <span style={{color:C.green,fontWeight:600,fontSize:13}}>{fmt(caja.fondo_inicial)}</span>
            </div>
            {datos.salidas.map((s,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{color:C.textMd,fontSize:13}}>Salida: {s.motivo}</span>
                <span style={{color:C.red,fontWeight:600,fontSize:13}}>-{fmt(s.monto)}</span>
              </div>
            ))}
            {datos.salidas.length===0&&(
              <div style={{color:C.textSm,fontSize:12}}>Sin salidas de efectivo</div>
            )}
          </div>

          {/* ── DETALLE FACTURAS ── */}
          {modoDetalle&&(
            <div style={{background:C.panel,borderRadius:10,padding:14,marginBottom:12,border:`1px solid ${C.border}`}}>
              <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:10}}>🧾 Facturas del turno ({datos.ventas.length})</div>
              <div style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:8,padding:"6px 12px",background:"#E2E8F0"}}>
                  {["Correlativo","Cliente","Total"].map(h=>(
                    <span key={h} style={{color:C.textSm,fontSize:11,fontWeight:600}}>{h}</span>
                  ))}
                </div>
                {datos.ventas.map((v,i)=>(
                  <div key={v.id} style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:8,padding:"7px 12px",borderTop:`1px solid ${C.border}`,background:i%2===0?C.card:C.panel}}>
                    <span style={{color:C.blue,fontSize:12,fontWeight:600}}>{v.correlativo}</span>
                    <span style={{color:C.textMd,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.cliente_id?"Cliente":"Mostrador"}</span>
                    <span style={{color:C.text,fontSize:12,fontWeight:600,textAlign:"right"}}>{fmt(v.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── EFECTIVO ESPERADO ── */}
          <div style={{background:C.blueBg,borderRadius:10,padding:14,marginBottom:12,border:`1px solid ${C.blueBorder}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{color:C.textMd,fontSize:13}}>Fondo inicial</span>
              <span style={{color:C.textMd,fontSize:13}}>{fmt(caja.fondo_inicial)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{color:C.textMd,fontSize:13}}>+ Ventas efectivo</span>
              <span style={{color:C.textMd,fontSize:13}}>{fmt(datos.totales.efectivo)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{color:C.textMd,fontSize:13}}>+ Pagos crédito</span>
              <span style={{color:C.textMd,fontSize:13}}>{fmt(datos.pagosCredito)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{color:C.textMd,fontSize:13}}>− Salidas</span>
              <span style={{color:C.red,fontSize:13}}>{fmt(datos.totalSalidas)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:`1px solid ${C.blueBorder}`}}>
              <span style={{color:C.blue,fontWeight:700,fontSize:15}}>Efectivo esperado</span>
              <span style={{color:C.blue,fontWeight:800,fontSize:18}}>{fmt(datos.efectivoEsperado)}</span>
            </div>
          </div>

          {/* ── EFECTIVO DECLARADO ── */}
          <div style={{background:C.panel,borderRadius:10,padding:14,marginBottom:12,border:`1px solid ${C.border}`}}>
            <label style={{color:C.textMd,fontSize:13,fontWeight:600,display:"block",marginBottom:8}}>Efectivo declarado (conteo físico)</label>
            <input type="number" value={efectivoDecl} onChange={e=>setEfectivoDecl(e.target.value)}
              placeholder="0.00" min="0" step="0.01"
              style={{...IS,fontSize:24,fontWeight:800,textAlign:"right",color:C.green}}/>
            {efectivoDecl!==""&&(
              <div style={{
                marginTop:10,padding:"8px 14px",borderRadius:8,
                background:diferencia===0?C.greenBg:diferencia>0?C.blueBg:C.redBg,
                border:`1px solid ${diferencia===0?"#BBF7D0":diferencia>0?C.blueBorder:C.redBorder}`,
                display:"flex",justifyContent:"space-between"
              }}>
                <span style={{color:diferencia===0?C.green:diferencia>0?C.blue:C.red,fontWeight:600,fontSize:14}}>
                  {diferencia===0?"✓ Cuadra exacto":diferencia>0?"⬆ Sobrante":"⬇ Faltante"}
                </span>
                <span style={{color:diferencia===0?C.green:diferencia>0?C.blue:C.red,fontWeight:700,fontSize:16}}>
                  {diferencia===0?"":diferencia>0?"+":""}{fmt(Math.abs(diferencia))}
                </span>
              </div>
            )}
          </div>

          {/* ── OBSERVACIONES ── */}
          <div style={{marginBottom:20}}>
            <label style={{color:C.textMd,fontSize:13,display:"block",marginBottom:6}}>Observaciones (opcional)</label>
            <input value={observaciones} onChange={e=>setObservaciones(e.target.value)}
              placeholder="Notas del cierre, motivo de diferencia..." style={IS}/>
          </div>

          <button onClick={cerrar} disabled={saving||efectivoDecl===""}
            style={{...BD,width:"100%",padding:14,fontSize:16,fontWeight:700,borderRadius:10,background:"#DC2626",color:"#fff",border:"none",opacity:(saving||efectivoDecl==="")?0.5:1}}>
            {saving?"⏳ Cerrando caja...":"🔒 Confirmar cierre de caja"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SALIDA DE EFECTIVO ───────────────────────────────────────────────────────
function SalidaEfectivoModal({ caja, usuario, onClose, onGuardada }) {
  const [monto,   setMonto]   = useState("");
  const [motivo,  setMotivo]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const guardar = async () => {
    if(!monto||parseFloat(monto)<=0){ setError("Ingresa el monto"); return; }
    if(!motivo.trim()){ setError("El motivo es obligatorio"); return; }
    setSaving(true);
    try {
      await sb("salidas_caja","POST",{
        caja_id: caja.id,
        serie:   caja.serie,
        cajero:  usuario.nombre||"Admin",
        monto:   parseFloat(monto),
        motivo:  motivo.trim(),
      });
      onGuardada();
    } catch(e){ setError("Error: "+e.message); }
    setSaving(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,backdropFilter:"blur(3px)"}}>
      <div style={{background:C.card,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",width:"380px",maxWidth:"95vw",padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{color:C.text,fontSize:17,fontWeight:700,margin:0}}>💸 Salida de Efectivo</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer"}}>✕</button>
        </div>

        {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}

        <div style={{marginBottom:14}}>
          <label style={{color:C.textMd,fontSize:13,display:"block",marginBottom:6}}>Monto *</label>
          <input type="number" value={monto} onChange={e=>setMonto(e.target.value)}
            placeholder="0.00" min="0.01" step="0.01" autoFocus
            style={{...IS,fontSize:24,fontWeight:800,textAlign:"right",color:C.red}}/>
        </div>

        <div style={{marginBottom:20}}>
          <label style={{color:C.textMd,fontSize:13,display:"block",marginBottom:6}}>Motivo *</label>
          <input value={motivo} onChange={e=>setMotivo(e.target.value)}
            placeholder="Ej: Pago a proveedor, depósito bancario..." style={IS}/>
        </div>

        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{...BS,flex:1}}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{...BD,flex:2,background:C.red,color:"#fff",border:"none",opacity:saving?0.6:1}}>
            {saving?"⏳ Guardando...":"✓ Registrar salida"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL PRINCIPAL DE CAJA ──────────────────────────────────────────────────
export default function CajaModal({ onClose, isMobile, usuario, cajaActual, puedeDetalle, onCajaChange }) {
  const [vista,          setVista]          = useState("info"); // info | cierre | salida
  const [salidas,        setSalidas]        = useState([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(()=>{ if(cajaActual) loadSalidas(); else setLoading(false); },[cajaActual]);

  const loadSalidas = async () => {
    setLoading(true);
    try {
      const s = await sb("salidas_caja","GET",null,`?caja_id=eq.${cajaActual.id}&order=created_at.desc`);
      setSalidas(s||[]);
    } catch {}
    setLoading(false);
  };

  if(vista==="cierre"&&cajaActual) return(
    <CierreCaja
      caja={cajaActual} usuario={usuario} puedeDetalle={puedeDetalle}
      onCerrada={()=>{ onCajaChange(null); onClose(); }}
      onClose={()=>setVista("info")}
    />
  );

  if(vista==="salida"&&cajaActual) return(
    <SalidaEfectivoModal
      caja={cajaActual} usuario={usuario}
      onClose={()=>setVista("info")}
      onGuardada={()=>{ loadSalidas(); setVista("info"); }}
    />
  );

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",width:isMobile?"95vw":"480px",maxHeight:"93vh",display:"flex",flexDirection:"column"}}>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <h2 style={{color:C.text,fontSize:17,fontWeight:700,margin:0}}>🏪 Caja — Serie {cajaActual?.serie||usuario?.serie_correlativo||"A"}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:24}}>
          {!cajaActual?(
            <div style={{textAlign:"center",padding:20}}>
              <div style={{fontSize:48,marginBottom:12}}>🏪</div>
              <div style={{color:C.textMd,fontSize:15,marginBottom:4}}>La caja no está abierta</div>
              <div style={{color:C.textSm,fontSize:13}}>Abre la caja para empezar a vender</div>
            </div>
          ):(
            <>
              {/* Info caja */}
              <div style={{background:C.greenBg,borderRadius:10,padding:14,marginBottom:16,border:"1px solid #BBF7D0"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{color:C.green,fontWeight:700,fontSize:15}}>✓ Caja abierta</span>
                  <span style={{color:C.green,fontSize:12}}>{fmtDate(cajaActual.abierta_at)}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[
                    {label:"Cajero",        value:cajaActual.cajero},
                    {label:"Serie",         value:cajaActual.serie},
                    {label:"Fondo inicial", value:fmt(cajaActual.fondo_inicial)},
                    {label:"Sucursal",      value:cajaActual.sucursal},
                  ].map(s=>(
                    <div key={s.label}>
                      <div style={{color:C.textSm,fontSize:11}}>{s.label}</div>
                      <div style={{color:C.text,fontWeight:600,fontSize:13}}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Salidas registradas */}
              {salidas.length>0&&(
                <div style={{marginBottom:16}}>
                  <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:8}}>Salidas de efectivo</div>
                  {salidas.map(s=>(
                    <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",marginBottom:6,background:C.panel,borderRadius:8,border:`1px solid ${C.border}`}}>
                      <div>
                        <div style={{color:C.text,fontSize:13,fontWeight:500}}>{s.motivo}</div>
                        <div style={{color:C.textSm,fontSize:11}}>{fmtDate(s.created_at)}</div>
                      </div>
                      <span style={{color:C.red,fontWeight:700,fontSize:14}}>-{fmt(s.monto)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Acciones */}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <button onClick={()=>setVista("salida")} style={{...BS,padding:12,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  💸 Registrar salida de efectivo
                </button>
                <button onClick={()=>setVista("cierre")} style={{...BD,padding:12,fontSize:14,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  🔒 Cerrar caja
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
