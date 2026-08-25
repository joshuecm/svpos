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

const fmt     = (n) => `Q ${Number(n||0).toFixed(2)}`;
const fmtDate = (d) => new Date(d).toLocaleString("es-GT");
const diasAtraso = (fecha, dias) => {
  const hoy    = new Date();
  const vence  = new Date(new Date(fecha).getTime() + dias*24*60*60*1000);
  const diff   = Math.floor((hoy-vence)/(24*60*60*1000));
  return diff > 0 ? diff : 0;
};

const METODOS = [
  {id:"cash",     label:"Efectivo",      icon:"💵"},
  {id:"card",     label:"Tarjeta",       icon:"💳"},
  {id:"transfer", label:"Transferencia", icon:"🏦"},
];

export default function CreditosModal({ onClose, isMobile, usuario }) {
  const [paso,         setPaso]         = useState("buscar");
  const [search,       setSearch]       = useState("");
  const [clientes,     setClientes]     = useState([]);
  const [clienteSel,   setClienteSel]   = useState(null);
  const [facturas,     setFacturas]     = useState([]);
  const [facturasSel,  setFacturasSel]  = useState(null);
  const [abonos,       setAbonos]       = useState([]);
  const [bancos,       setBancos]       = useState([]);
  const [tab,          setTab]          = useState("pendientes"); // pendientes | pagadas
  const [monto,        setMonto]        = useState("");
  const [metodo,       setMetodo]       = useState("cash");
  const [bancoId,      setBancoId]      = useState("");
  const [autorizacion, setAutorizacion] = useState("");
  const [notas,        setNotas]        = useState("");
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [lastTicket,   setLastTicket]   = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [reciboNum,    setReciboNum]    = useState(1);

  useEffect(()=>{ loadBancos(); },[]);

  const loadBancos = async () => {
    try {
      const b = await sb("bancos","GET",null,"?activo=eq.true&order=nombre");
      setBancos(b||[]);
    } catch {}
  };

  const buscarClientes = async (q) => {
    setSearch(q);
    if(q.length<2){ setClientes([]); return; }
    setLoading(true);
    try {
      const res = await sb("clientes","GET",null,
        `?credito=eq.true&activo=eq.true&or=(nombre.ilike.*${encodeURIComponent(q)}*,nit.ilike.*${encodeURIComponent(q)}*,telefono.ilike.*${encodeURIComponent(q)}*)&order=nombre&limit=10`
      );
      setClientes(res||[]);
    } catch {}
    setLoading(false);
  };

  const seleccionarCliente = async (c) => {
    setClienteSel(c);
    setLoading(true);
    try {
      // Cargar facturas a crédito del cliente
      const ventas = await sb("ventas","GET",null,
        `?cliente_id=eq.${c.id}&or=(metodo_pago.eq.credit,metodo_pago.like.*credit*)&order=created_at.desc`
      );
      // Calcular saldo pendiente de cada factura
      const ventasConSaldo = await Promise.all((ventas||[]).map(async v => {
        const abonosV = await sb("abonos_credito","GET",null,`?venta_id=eq.${v.id}&order=created_at.asc`);
        const totalAbonado = (abonosV||[]).reduce((s,a)=>s+parseFloat(a.monto||0),0);
        const saldoPendiente = parseFloat(v.total||0) - totalAbonado;
        return { ...v, totalAbonado, saldoPendiente, abonos:abonosV||[] };
      }));
      setFacturas(ventasConSaldo);
    } catch(e){ console.error(e); }
    setLoading(false);
    setPaso("facturas");
  };

  const seleccionarFactura = async (f) => {
    setFacturasSel(f);
    setAbonos(f.abonos||[]);
    setMonto("");
    setMetodo("cash");
    setBancoId("");
    setAutorizacion("");
    setNotas("");
    setPaso("detalle");
  };

  const registrarAbono = async () => {
    setError("");
    const montoNum = parseFloat(monto||0);
    if(!montoNum||montoNum<=0){ setError("Ingresa un monto válido"); return; }
    if(montoNum > facturasSel.saldoPendiente){ setError(`El monto no puede superar el saldo pendiente (${fmt(facturasSel.saldoPendiente)})`); return; }
    if(metodo==="transfer"&&!bancoId){ setError("Selecciona el banco receptor"); return; }
    if(metodo==="transfer"&&!autorizacion.trim()){ setError("Ingresa el número de autorización"); return; }

    setSaving(true);
    try {
      const saldoAnterior = facturasSel.saldoPendiente;
      const saldoNuevo    = saldoAnterior - montoNum;
      const numRecibo     = `R-${String(Date.now()).slice(-6)}`;

      // 1. Registrar abono ligado a la factura
      await sb("abonos_credito","POST",{
        cliente_id:     clienteSel.id,
        venta_id:       facturasSel.id,
        monto:          montoNum,
        metodo_pago:    metodo,
        saldo_anterior: saldoAnterior,
        saldo_nuevo:    saldoNuevo,
        cajero:         usuario?.nombre||"Admin",
        sucursal:       usuario?.sucursal||"Principal",
        banco_id:       bancoId?parseInt(bancoId):null,
        autorizacion:   autorizacion.trim()||null,
        notas:          notas.trim()||null,
        numero_recibo:  numRecibo,
      });

      // 2. Actualizar saldo pendiente de la venta
      await sb(`ventas?id=eq.${facturasSel.id}`,"PATCH",{
        monto_pagado:    facturasSel.totalAbonado + montoNum,
        saldo_pendiente: saldoNuevo,
      });

      // 3. Actualizar saldo del cliente
      const nuevoSaldoCliente = parseFloat(clienteSel.saldo_credito||0) - montoNum;
      await sb(`clientes?id=eq.${clienteSel.id}`,"PATCH",{
        saldo_credito: Math.max(0, nuevoSaldoCliente),
      });

      // 4. Recargar abonos de esta factura
      const abonosActualizados = await sb("abonos_credito","GET",null,
        `?venta_id=eq.${facturasSel.id}&order=created_at.asc`
      );

      // 5. Preparar ticket
      const ticket = {
        numRecibo,
        date:           new Date().toLocaleString("es-GT"),
        cliente:        clienteSel,
        factura:        facturasSel,
        monto:          montoNum,
        metodo,
        saldoAnterior,
        saldoNuevo,
        abonos:         abonosActualizados||[],
        cajero:         usuario?.nombre||"Admin",
        sucursal:       usuario?.sucursal||"Principal",
        autorizacion:   autorizacion.trim()||null,
        banco:          bancos.find(b=>b.id==bancoId)||null,
      };

      // 6. Actualizar estado local
      const facturaActualizada = {
        ...facturasSel,
        totalAbonado:   facturasSel.totalAbonado+montoNum,
        saldoPendiente: saldoNuevo,
        abonos:         abonosActualizados||[],
      };
      setFacturasSel(facturaActualizada);
      setFacturas(prev=>prev.map(f=>f.id===facturasSel.id?facturaActualizada:f));
      setClienteSel(prev=>({...prev,saldo_credito:Math.max(0,nuevoSaldoCliente)}));
      setAbonos(abonosActualizados||[]);
      setLastTicket(ticket);
      setMonto(""); setMetodo("cash"); setBancoId(""); setAutorizacion(""); setNotas("");
      setPaso("ticket");
    } catch(e){ setError("Error: "+e.message); }
    setSaving(false);
  };

  const bancosReceptores = bancos.filter(b=>b.tipo==="receptor");

  // ─── TICKET ───────────────────────────────────────────────────────────────
  const TicketAbono = () => !lastTicket?null:(
    <div style={{fontFamily:"'Courier New',monospace"}}>
      <div style={{textAlign:"center",borderBottom:`1px dashed ${C.border}`,paddingBottom:12,marginBottom:12}}>
        <div style={{fontSize:11,color:C.textSm,letterSpacing:2}}>RECIBO DE ABONO</div>
        <div style={{fontSize:18,fontWeight:700,color:C.text,fontFamily:"Inter,sans-serif"}}>Smart Valion POS</div>
        <div style={{fontSize:11,color:C.textMd}}>{lastTicket.sucursal}</div>
        <div style={{fontSize:11,color:C.textMd}}>{lastTicket.date}</div>
      </div>

      {/* Datos */}
      <div style={{marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
          <span style={{color:C.textMd,fontSize:12}}>Recibo No.</span>
          <span style={{color:C.blue,fontWeight:700,fontSize:12}}>{lastTicket.numRecibo}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
          <span style={{color:C.textMd,fontSize:12}}>Cliente</span>
          <span style={{color:C.text,fontSize:12,fontWeight:600}}>{lastTicket.cliente.nombre}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
          <span style={{color:C.textMd,fontSize:12}}>NIT</span>
          <span style={{color:C.text,fontSize:12}}>{lastTicket.cliente.nit}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{color:C.textMd,fontSize:12}}>Factura No.</span>
          <span style={{color:C.blue,fontSize:12,fontWeight:600}}>{lastTicket.factura.correlativo}</span>
        </div>
      </div>

      {/* Historial abonos de esta factura */}
      <div style={{borderTop:`1px dashed ${C.border}`,paddingTop:10,marginBottom:10}}>
        <div style={{color:C.textMd,fontSize:11,fontWeight:600,marginBottom:8}}>ABONOS DE ESTA FACTURA:</div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,paddingBottom:4,borderBottom:`1px solid ${C.border}`}}>
          <span style={{color:C.textSm,fontSize:10}}>Monto factura</span>
          <span style={{color:C.text,fontSize:10,fontWeight:600}}>{fmt(lastTicket.factura.total)}</span>
        </div>
        {lastTicket.abonos.map((a,i)=>{
          const esActual = i===lastTicket.abonos.length-1;
          return(
            <div key={a.id} style={{
              display:"flex",justifyContent:"space-between",marginBottom:3,
              background:esActual?C.greenBg:"transparent",
              padding:esActual?"3px 6px":"0",borderRadius:esActual?4:0
            }}>
              <span style={{color:esActual?C.green:C.textMd,fontSize:11}}>
                {esActual?"► ":"  "}Abono {i+1}{esActual?" (actual)":""} · {new Date(a.created_at).toLocaleDateString("es-GT")}
              </span>
              <span style={{color:esActual?C.green:C.text,fontSize:11,fontWeight:esActual?700:400}}>{fmt(a.monto)}</span>
            </div>
          );
        })}
      </div>

      {/* Resumen */}
      <div style={{borderTop:`1px dashed ${C.border}`,paddingTop:10,marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
          <span style={{color:C.textMd,fontSize:12}}>Saldo anterior</span>
          <span style={{color:C.text,fontSize:12}}>{fmt(lastTicket.saldoAnterior)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
          <span style={{color:C.textMd,fontSize:12}}>Abono</span>
          <span style={{color:C.green,fontSize:12,fontWeight:700}}>{fmt(lastTicket.monto)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",paddingTop:6,borderTop:`1px dashed ${C.border}`,marginTop:4}}>
          <span style={{color:C.text,fontSize:14,fontWeight:700}}>Saldo pendiente</span>
          <span style={{color:lastTicket.saldoNuevo>0?C.red:C.green,fontSize:14,fontWeight:700}}>{fmt(lastTicket.saldoNuevo)}</span>
        </div>
      </div>

      {/* Método */}
      <div style={{borderTop:`1px dashed ${C.border}`,paddingTop:10,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
          <span style={{color:C.textMd,fontSize:12}}>Forma de pago</span>
          <span style={{color:C.text,fontSize:12}}>{METODOS.find(m=>m.id===lastTicket.metodo)?.label}</span>
        </div>
        {lastTicket.autorizacion&&(
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
            <span style={{color:C.textMd,fontSize:12}}>Autorización</span>
            <span style={{color:C.text,fontSize:12}}>{lastTicket.autorizacion}</span>
          </div>
        )}
        {lastTicket.banco&&(
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
            <span style={{color:C.textMd,fontSize:12}}>Banco receptor</span>
            <span style={{color:C.text,fontSize:12}}>{lastTicket.banco.nombre}</span>
          </div>
        )}
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{color:C.textMd,fontSize:12}}>Cajero</span>
          <span style={{color:C.text,fontSize:12}}>{lastTicket.cajero}</span>
        </div>
      </div>

      {lastTicket.saldoNuevo===0&&(
        <div style={{textAlign:"center",background:C.greenBg,borderRadius:8,padding:"8px",marginBottom:12,border:"1px solid #BBF7D0"}}>
          <span style={{color:C.green,fontWeight:700,fontSize:13}}>✓ FACTURA PAGADA EN SU TOTALIDAD</span>
        </div>
      )}

      <div style={{textAlign:"center",color:C.textSm,fontSize:10,marginBottom:16}}>
        *** Comprobante interno — no es documento fiscal ***
      </div>

      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>window.print()} style={{...BS,flex:1}}>🖨️ Imprimir</button>
        <button onClick={()=>{
          if(lastTicket.saldoNuevo===0){ setPaso("facturas"); setLastTicket(null); setFacturasSel(null); }
          else { setPaso("detalle"); setLastTicket(null); }
        }} style={{...BP,flex:1}}>
          {lastTicket.saldoNuevo===0?"Ver facturas":"Otro abono"}
        </button>
      </div>
    </div>
  );

  // ─── FACTURAS PENDIENTES / PAGADAS ────────────────────────────────────────
  const facturasPendientes = facturas.filter(f=>f.saldoPendiente>0.01);
  const facturasPagadas    = facturas.filter(f=>f.saldoPendiente<=0.01);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",width:isMobile?"95vw":"620px",maxHeight:"93vh",display:"flex",flexDirection:"column"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {paso!=="buscar"&&paso!=="ticket"&&(
              <button onClick={()=>{
                if(paso==="detalle"||paso==="abonar") setPaso("facturas");
                else if(paso==="facturas") { setPaso("buscar"); setClienteSel(null); setFacturas([]); }
              }} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:13,fontWeight:600,padding:0}}>← Volver</button>
            )}
            <h2 style={{color:C.text,fontSize:17,fontWeight:700,margin:0}}>
              💳 {paso==="buscar"?"Pago de Créditos":
                  paso==="facturas"?"Facturas del Cliente":
                  paso==="detalle"?"Detalle de Factura":
                  paso==="abonar"?"Registrar Abono":
                  "Comprobante de Abono"}
            </h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer",padding:"4px 8px"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:24}}>

          {/* ── PASO 1: BUSCAR CLIENTE ── */}
          {paso==="buscar"&&(
            <div>
              <div style={{color:C.textMd,fontSize:13,marginBottom:16}}>
                Busca el cliente por nombre, NIT o teléfono.
              </div>
              <input value={search} onChange={e=>buscarClientes(e.target.value)}
                placeholder="🔍 Nombre, NIT o teléfono..." autoFocus
                style={{...IS,marginBottom:12,fontSize:15}}/>
              {loading&&<div style={{textAlign:"center",color:C.textSm,padding:20}}>Buscando...</div>}
              {!loading&&search.length>=2&&clientes.length===0&&(
                <div style={{textAlign:"center",color:C.textSm,padding:24,background:C.panel,borderRadius:10,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:28,marginBottom:8}}>👤</div>
                  <div>No se encontraron clientes con crédito</div>
                </div>
              )}
              {clientes.map(c=>(
                <button key={c.id} onClick={()=>seleccionarCliente(c)}
                  style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"14px",marginBottom:10,background:C.panel,border:`1.5px solid ${C.border}`,borderRadius:10,cursor:"pointer",textAlign:"left"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.background=C.blueBg;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.panel;}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:C.amberBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>💳</div>
                  <div style={{flex:1}}>
                    <div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:2}}>{c.nombre}</div>
                    <div style={{color:C.textMd,fontSize:12}}>NIT: {c.nit}{c.telefono?` · 📞 ${c.telefono}`:""}</div>
                    <div style={{display:"flex",gap:12,marginTop:4}}>
                      <span style={{color:C.red,fontSize:12,fontWeight:600}}>Saldo: {fmt(c.saldo_credito)}</span>
                      <span style={{color:C.green,fontSize:12}}>Disponible: {fmt(parseFloat(c.limite_credito||0)-parseFloat(c.saldo_credito||0))}</span>
                    </div>
                  </div>
                  <span style={{color:C.blue,fontSize:20}}>›</span>
                </button>
              ))}
            </div>
          )}

          {/* ── PASO 2: FACTURAS DEL CLIENTE ── */}
          {paso==="facturas"&&clienteSel&&(
            <div>
              {/* Info cliente */}
              <div style={{background:C.panel,borderRadius:10,padding:14,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div>
                    <div style={{color:C.text,fontWeight:700,fontSize:15}}>{clienteSel.nombre}</div>
                    <div style={{color:C.textMd,fontSize:12}}>NIT: {clienteSel.nit}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{color:C.red,fontWeight:700,fontSize:16}}>{fmt(clienteSel.saldo_credito)}</div>
                    <div style={{color:C.textSm,fontSize:11}}>Saldo total</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[
                    {label:"Límite",      value:fmt(clienteSel.limite_credito), color:C.textMd},
                    {label:"Pendiente",   value:facturasPendientes.length+" facturas", color:C.red},
                    {label:"Pagadas",     value:facturasPagadas.length+" facturas",    color:C.green},
                  ].map(s=>(
                    <div key={s.label} style={{background:C.card,borderRadius:8,padding:"8px",textAlign:"center",border:`1px solid ${C.border}`}}>
                      <div style={{color:s.color,fontSize:13,fontWeight:700}}>{s.value}</div>
                      <div style={{color:C.textSm,fontSize:10,marginTop:2}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div style={{display:"flex",background:C.panel,borderRadius:10,padding:4,marginBottom:16,border:`1px solid ${C.border}`}}>
                {[
                  {id:"pendientes",label:`Pendientes (${facturasPendientes.length})`},
                  {id:"pagadas",   label:`Pagadas (${facturasPagadas.length})`},
                ].map(t=>(
                  <button key={t.id} onClick={()=>setTab(t.id)} style={{
                    flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,
                    background:tab===t.id?C.card:"transparent",
                    color:tab===t.id?C.blue:C.textSm,
                    boxShadow:tab===t.id?"0 1px 4px rgba(0,0,0,0.08)":"none"
                  }}>{t.label}</button>
                ))}
              </div>

              {loading?(
                <div style={{textAlign:"center",color:C.textSm,padding:30}}>Cargando facturas...</div>
              ):(tab==="pendientes"?facturasPendientes:facturasPagadas).length===0?(
                <div style={{textAlign:"center",color:C.textSm,padding:30,background:C.panel,borderRadius:10,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:32,marginBottom:8}}>{tab==="pendientes"?"✅":"🧾"}</div>
                  <div>{tab==="pendientes"?"No hay facturas pendientes":"No hay facturas pagadas"}</div>
                </div>
              ):(tab==="pendientes"?facturasPendientes:facturasPagadas).map(f=>{
                const atraso = diasAtraso(f.created_at, clienteSel.dias_credito||30);
                const pct    = f.total>0?(f.totalAbonado/f.total)*100:0;
                return(
                  <button key={f.id} onClick={()=>seleccionarFactura(f)}
                    style={{display:"block",width:"100%",padding:"14px 16px",marginBottom:10,background:C.card,border:`1.5px solid ${atraso>0&&tab==="pendientes"?C.redBorder:C.border}`,borderRadius:10,cursor:"pointer",textAlign:"left"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=atraso>0&&tab==="pendientes"?C.redBorder:C.border;}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                          <span style={{color:C.blue,fontWeight:700,fontSize:14}}>{f.correlativo}</span>
                          {atraso>0&&tab==="pendientes"&&(
                            <span style={{background:C.redBg,color:C.red,fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600}}>
                              {atraso} días de atraso
                            </span>
                          )}
                        </div>
                        <div style={{color:C.textSm,fontSize:11}}>{fmtDate(f.created_at)}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{color:C.text,fontWeight:700,fontSize:15}}>{fmt(f.total)}</div>
                        <div style={{color:f.saldoPendiente>0?C.red:C.green,fontSize:12,fontWeight:600}}>
                          {f.saldoPendiente>0?`Pendiente: ${fmt(f.saldoPendiente)}`:"✓ Pagada"}
                        </div>
                      </div>
                    </div>
                    {/* Barra de progreso de pago */}
                    <div>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{color:C.textSm,fontSize:11}}>Pagado: {fmt(f.totalAbonado)}</span>
                        <span style={{color:C.textSm,fontSize:11}}>{Math.round(pct)}%</span>
                      </div>
                      <div style={{height:6,background:C.border,borderRadius:3}}>
                        <div style={{height:6,borderRadius:3,width:`${Math.min(pct,100)}%`,background:pct>=100?C.green:pct>50?C.amber:C.blue,transition:"width 0.3s"}}/>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── PASO 3: DETALLE FACTURA ── */}
          {paso==="detalle"&&facturasSel&&(
            <div>
              {/* Info factura */}
              <div style={{background:C.panel,borderRadius:10,padding:14,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div>
                    <div style={{color:C.blue,fontWeight:700,fontSize:16}}>{facturasSel.correlativo}</div>
                    <div style={{color:C.textSm,fontSize:12}}>{fmtDate(facturasSel.created_at)}</div>
                    <div style={{color:C.textMd,fontSize:12,marginTop:2}}>{clienteSel.nombre}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{color:C.textMd,fontSize:12}}>Total factura</div>
                    <div style={{color:C.text,fontWeight:700,fontSize:18}}>{fmt(facturasSel.total)}</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                  {[
                    {label:"Total",     value:fmt(facturasSel.total),        color:C.textMd},
                    {label:"Abonado",   value:fmt(facturasSel.totalAbonado), color:C.blue},
                    {label:"Pendiente", value:fmt(facturasSel.saldoPendiente),color:facturasSel.saldoPendiente>0?C.red:C.green},
                  ].map(s=>(
                    <div key={s.label} style={{background:C.card,borderRadius:8,padding:"8px",textAlign:"center",border:`1px solid ${C.border}`}}>
                      <div style={{color:s.color,fontSize:14,fontWeight:700}}>{s.value}</div>
                      <div style={{color:C.textSm,fontSize:10,marginTop:2}}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* Barra progreso */}
                <div style={{height:8,background:C.border,borderRadius:4}}>
                  <div style={{
                    height:8,borderRadius:4,
                    width:`${Math.min((facturasSel.totalAbonado/facturasSel.total)*100,100)}%`,
                    background:facturasSel.saldoPendiente<=0?C.green:C.blue,transition:"width 0.3s"
                  }}/>
                </div>
              </div>

              {/* Historial abonos */}
              <div style={{marginBottom:16}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:10}}>
                  Historial de abonos ({abonos.length})
                </div>
                {abonos.length===0?(
                  <div style={{textAlign:"center",color:C.textSm,padding:20,background:C.panel,borderRadius:8,border:`1px solid ${C.border}`}}>
                    Sin abonos registrados
                  </div>
                ):abonos.map((a,i)=>(
                  <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",marginBottom:8,background:C.card,border:`1px solid ${C.border}`,borderRadius:8}}>
                    <div>
                      <div style={{color:C.text,fontSize:13,fontWeight:600}}>
                        Abono {i+1} — {METODOS.find(m=>m.id===a.metodo_pago)?.label||a.metodo_pago}
                      </div>
                      <div style={{color:C.textSm,fontSize:11,marginTop:2}}>{fmtDate(a.created_at)} · {a.cajero}</div>
                      {a.numero_recibo&&<div style={{color:C.blue,fontSize:10,marginTop:1}}>Recibo: {a.numero_recibo}</div>}
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{color:C.green,fontWeight:700,fontSize:15}}>{fmt(a.monto)}</div>
                      <div style={{color:C.textSm,fontSize:11}}>Saldo: {fmt(a.saldo_nuevo)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {facturasSel.saldoPendiente>0.01?(
                <button onClick={()=>setPaso("abonar")} style={{...BP,width:"100%",padding:14,fontSize:16,fontWeight:700}}>
                  💰 Registrar abono
                </button>
              ):(
                <div style={{textAlign:"center",background:C.greenBg,borderRadius:10,padding:16,border:"1px solid #BBF7D0"}}>
                  <div style={{fontSize:24,marginBottom:4}}>✅</div>
                  <div style={{color:C.green,fontWeight:700}}>Factura pagada en su totalidad</div>
                </div>
              )}
            </div>
          )}

          {/* ── PASO 4: REGISTRAR ABONO ── */}
          {paso==="abonar"&&facturasSel&&(
            <div>
              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}

              {/* Resumen factura */}
              <div style={{background:C.amberBg,borderRadius:10,padding:"14px 18px",marginBottom:16,border:`1px solid ${C.amber}40`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:C.amber,fontSize:13,fontWeight:600}}>Factura {facturasSel.correlativo}</span>
                  <span style={{color:C.text,fontSize:13}}>{fmt(facturasSel.total)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:C.textMd,fontSize:13}}>Ya abonado</span>
                  <span style={{color:C.blue,fontSize:13}}>{fmt(facturasSel.totalAbonado)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:`1px solid ${C.amber}40`,marginTop:4}}>
                  <span style={{color:C.red,fontSize:15,fontWeight:700}}>Saldo pendiente</span>
                  <span style={{color:C.red,fontSize:22,fontWeight:800}}>{fmt(facturasSel.saldoPendiente)}</span>
                </div>
              </div>

              {/* Monto */}
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <label style={{color:C.textMd,fontSize:13,fontWeight:600}}>Monto del abono</label>
                  <button onClick={()=>setMonto(String(facturasSel.saldoPendiente))}
                    style={{color:C.blue,background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>
                    Pago total ({fmt(facturasSel.saldoPendiente)})
                  </button>
                </div>
                <input type="number" value={monto} onChange={e=>setMonto(e.target.value)}
                  placeholder="0.00" min="0.01" step="0.01"
                  style={{...IS,fontSize:28,fontWeight:800,textAlign:"right",color:C.green}}/>
                <div style={{display:"flex",gap:6,marginTop:8}}>
                  {[50,100,200,500].map(amt=>(
                    <button key={amt} onClick={()=>setMonto(String(Math.min(amt,facturasSel.saldoPendiente)))}
                      style={{flex:1,padding:"7px 4px",background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,color:C.textMd,fontSize:12,cursor:"pointer",fontWeight:600}}>
                      Q{amt}
                    </button>
                  ))}
                </div>
                {monto&&parseFloat(monto)>0&&(
                  <div style={{marginTop:8,background:C.greenBg,borderRadius:8,padding:"8px 14px",border:"1px solid #BBF7D0"}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:C.textMd,fontSize:13}}>Saldo después del abono</span>
                      <span style={{color:Math.max(0,facturasSel.saldoPendiente-parseFloat(monto))>0?C.amber:C.green,fontWeight:700,fontSize:15}}>
                        {fmt(Math.max(0,facturasSel.saldoPendiente-parseFloat(monto)))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Método */}
              <div style={{marginBottom:16}}>
                <label style={{color:C.textMd,fontSize:13,fontWeight:600,display:"block",marginBottom:8}}>Forma de pago</label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                  {METODOS.map(m=>(
                    <button key={m.id} onClick={()=>setMetodo(m.id)} style={{
                      padding:"10px 8px",borderRadius:8,cursor:"pointer",textAlign:"center",
                      border:`1.5px solid ${metodo===m.id?C.blue:C.border}`,
                      background:metodo===m.id?C.blueBg:C.card,
                      color:metodo===m.id?C.blue:C.textMd,
                      fontSize:13,fontWeight:metodo===m.id?600:400
                    }}>
                      <div style={{fontSize:20}}>{m.icon}</div>
                      <div>{m.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Transferencia */}
              {metodo==="transfer"&&(
                <div style={{marginBottom:16,display:"flex",flexDirection:"column",gap:10}}>
                  {bancosReceptores.length>0&&(
                    <div>
                      <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Banco receptor *</label>
                      <select value={bancoId} onChange={e=>setBancoId(e.target.value)} style={{...IS,cursor:"pointer"}}>
                        <option value="">Seleccionar banco...</option>
                        {bancosReceptores.map(b=>(<option key={b.id} value={b.id}>{b.nombre}{b.numero_cuenta?` — ${b.numero_cuenta}`:""}</option>))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>No. de autorización *</label>
                    <input value={autorizacion} onChange={e=>setAutorizacion(e.target.value)}
                      placeholder="Ej: TRX-123456" style={IS}/>
                  </div>
                </div>
              )}

              {/* Notas */}
              <div style={{marginBottom:20}}>
                <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Notas (opcional)</label>
                <input value={notas} onChange={e=>setNotas(e.target.value)}
                  placeholder="Referencia, observaciones..." style={IS}/>
              </div>

              <button onClick={registrarAbono} disabled={saving||!monto||parseFloat(monto)<=0}
                style={{...BP,width:"100%",padding:16,fontSize:17,fontWeight:700,borderRadius:10,
                  opacity:saving||!monto||parseFloat(monto)<=0?0.5:1}}>
                {saving?"⏳ Registrando...":"✓ Confirmar Abono"}
              </button>
            </div>
          )}

          {/* ── PASO 5: TICKET ── */}
          {paso==="ticket"&&<TicketAbono/>}
        </div>
      </div>
    </div>
  );
}
