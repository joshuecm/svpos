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
const fmtDate = (d) => new Date(d).toLocaleString("es-GT");

const METODOS = [
  {id:"cash",     label:"Efectivo",      icon:"💵"},
  {id:"card",     label:"Tarjeta",       icon:"💳"},
  {id:"transfer", label:"Transferencia", icon:"🏦"},
];

export default function AbonosModal({ onClose, isMobile, usuario }) {
  const [paso,        setPaso]        = useState("buscar"); // buscar | detalle | abonar | ticket
  const [search,      setSearch]      = useState("");
  const [clientes,    setClientes]    = useState([]);
  const [clienteSel,  setClienteSel]  = useState(null);
  const [abonos,      setAbonos]      = useState([]);
  const [bancos,      setBancos]      = useState([]);
  const [monto,       setMonto]       = useState("");
  const [metodo,      setMetodo]      = useState("cash");
  const [bancoId,     setBancoId]     = useState("");
  const [autorizacion,setAutorizacion]= useState("");
  const [notas,       setNotas]       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [lastTicket,  setLastTicket]  = useState(null);
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    loadBancos();
  }, []);

  const loadBancos = async () => {
    try {
      const b = await sb("bancos","GET",null,"?activo=eq.true&order=nombre");
      setBancos(b||[]);
    } catch {}
  };

  const buscarClientes = async (q) => {
    setSearch(q);
    if (q.length < 2) { setClientes([]); return; }
    setLoading(true);
    try {
      const res = await sb("clientes","GET",null,
        `?credito=eq.true&activo=eq.true&or=(nombre.ilike.*${q}*,nit.ilike.*${q}*,telefono.ilike.*${q}*)&order=nombre&limit=10`
      );
      setClientes(res||[]);
    } catch {}
    setLoading(false);
  };

  const seleccionarCliente = async (c) => {
    setClienteSel(c);
    setLoading(true);
    try {
      const a = await sb("abonos_credito","GET",null,
        `?cliente_id=eq.${c.id}&order=created_at.desc&limit=20`
      );
      setAbonos(a||[]);
    } catch {}
    setLoading(false);
    setPaso("detalle");
  };

  const registrarAbono = async () => {
    setError("");
    if (!monto || parseFloat(monto) <= 0) { setError("Ingresa un monto válido"); return; }
    if (parseFloat(monto) > parseFloat(clienteSel.saldo_credito)) {
      setError(`El monto no puede ser mayor al saldo pendiente (${fmt(clienteSel.saldo_credito)})`); return;
    }
    if (metodo==="transfer" && !bancoId) { setError("Selecciona el banco receptor"); return; }
    if (metodo==="transfer" && !autorizacion.trim()) { setError("Ingresa el número de autorización"); return; }

    setSaving(true);
    try {
      const montoNum      = parseFloat(monto);
      const saldoAnterior = parseFloat(clienteSel.saldo_credito);
      const saldoNuevo    = saldoAnterior - montoNum;

      // 1. Registrar abono
      await sb("abonos_credito","POST",{
        cliente_id:     clienteSel.id,
        monto:          montoNum,
        metodo_pago:    metodo,
        saldo_anterior: saldoAnterior,
        saldo_nuevo:    saldoNuevo,
        cajero:         usuario?.nombre || "Admin",
        sucursal:       usuario?.sucursal || "Principal",
        banco_id:       bancoId ? parseInt(bancoId) : null,
        autorizacion:   autorizacion.trim()||null,
        notas:          notas.trim()||null,
      });

      // 2. Actualizar saldo del cliente
      await sb(`clientes?id=eq.${clienteSel.id}`,"PATCH",{
        saldo_credito: saldoNuevo,
      });

      // 3. Recargar abonos del cliente
      const abonosActualizados = await sb("abonos_credito","GET",null,
        `?cliente_id=eq.${clienteSel.id}&order=created_at.asc`
      );

      // 4. Preparar ticket
      const ticket = {
        date:           new Date().toLocaleString("es-GT"),
        cliente:        clienteSel,
        monto:          montoNum,
        metodo,
        saldoAnterior,
        saldoNuevo,
        abonos:         abonosActualizados||[],
        cajero:         usuario?.nombre || "Admin",
        sucursal:       usuario?.sucursal || "Principal",
        autorizacion:   autorizacion.trim()||null,
        banco:          bancos.find(b=>b.id==bancoId)||null,
      };

      // 5. Actualizar estado local del cliente
      setClienteSel(prev=>({...prev, saldo_credito:saldoNuevo}));
      setAbonos(abonosActualizados||[]);
      setLastTicket(ticket);
      setMonto(""); setMetodo("cash"); setBancoId(""); setAutorizacion(""); setNotas("");
      setPaso("ticket");
    } catch(e) { setError("Error: "+e.message); }
    setSaving(false);
  };

  const bancosReceptores = bancos.filter(b=>b.tipo==="receptor");
  const pctUsado = clienteSel ? (parseFloat(clienteSel.saldo_credito)/parseFloat(clienteSel.limite_credito))*100 : 0;

  // ─── TICKET ───────────────────────────────────────────────────────────────
  const TicketAbono = () => !lastTicket ? null : (
    <div style={{fontFamily:"'Courier New',monospace"}}>
      <div style={{textAlign:"center",borderBottom:`1px dashed ${C.border}`,paddingBottom:12,marginBottom:12}}>
        <div style={{fontSize:11,color:C.textSm,letterSpacing:2}}>COMPROBANTE DE ABONO</div>
        <div style={{fontSize:18,fontWeight:700,color:C.text,fontFamily:"Inter,sans-serif"}}>Smart Valion POS</div>
        <div style={{fontSize:11,color:C.textMd}}>{lastTicket.sucursal}</div>
        <div style={{fontSize:11,color:C.textMd}}>{lastTicket.date}</div>
      </div>

      {/* Datos cliente */}
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{color:C.textMd,fontSize:12}}>Cliente</span>
          <span style={{color:C.text,fontSize:12,fontWeight:600}}>{lastTicket.cliente.nombre}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{color:C.textMd,fontSize:12}}>NIT</span>
          <span style={{color:C.text,fontSize:12}}>{lastTicket.cliente.nit}</span>
        </div>
      </div>

      {/* Historial de abonos */}
      <div style={{borderTop:`1px dashed ${C.border}`,paddingTop:10,marginBottom:10}}>
        <div style={{color:C.textMd,fontSize:11,marginBottom:8,fontWeight:600}}>HISTORIAL DE ABONOS:</div>
        {lastTicket.abonos.map((a,i)=>{
          const esActual = i===lastTicket.abonos.length-1;
          return(
            <div key={a.id} style={{display:"flex",justifyContent:"space-between",marginBottom:4,
              background:esActual?C.greenBg:"transparent",
              padding:esActual?"4px 6px":"0",borderRadius:esActual?4:0}}>
              <span style={{color:esActual?C.green:C.textMd,fontSize:11}}>
                {esActual?"► ":"  "}Abono {i+1} {esActual?"(actual)":""} · {new Date(a.created_at).toLocaleDateString("es-GT")}
              </span>
              <span style={{color:esActual?C.green:C.text,fontSize:11,fontWeight:esActual?700:400}}>{fmt(a.monto)}</span>
            </div>
          );
        })}
      </div>

      {/* Resumen */}
      <div style={{borderTop:`1px dashed ${C.border}`,paddingTop:10,marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{color:C.textMd,fontSize:12}}>Saldo anterior</span>
          <span style={{color:C.text,fontSize:12}}>{fmt(lastTicket.saldoAnterior)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{color:C.textMd,fontSize:12}}>Abono actual</span>
          <span style={{color:C.green,fontSize:12,fontWeight:700}}>{fmt(lastTicket.monto)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",paddingTop:6,borderTop:`1px dashed ${C.border}`,marginTop:4}}>
          <span style={{color:C.text,fontSize:14,fontWeight:700}}>Saldo pendiente</span>
          <span style={{color:lastTicket.saldoNuevo>0?C.red:C.green,fontSize:14,fontWeight:700}}>{fmt(lastTicket.saldoNuevo)}</span>
        </div>
      </div>

      {/* Método de pago */}
      <div style={{borderTop:`1px dashed ${C.border}`,paddingTop:10,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{color:C.textMd,fontSize:12}}>Forma de pago</span>
          <span style={{color:C.text,fontSize:12}}>{METODOS.find(m=>m.id===lastTicket.metodo)?.label}</span>
        </div>
        {lastTicket.autorizacion&&(
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{color:C.textMd,fontSize:12}}>Autorización</span>
            <span style={{color:C.text,fontSize:12}}>{lastTicket.autorizacion}</span>
          </div>
        )}
        {lastTicket.banco&&(
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{color:C.textMd,fontSize:12}}>Banco receptor</span>
            <span style={{color:C.text,fontSize:12}}>{lastTicket.banco.nombre}</span>
          </div>
        )}
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
          <span style={{color:C.textMd,fontSize:12}}>Cajero</span>
          <span style={{color:C.text,fontSize:12}}>{lastTicket.cajero}</span>
        </div>
      </div>

      {lastTicket.saldoNuevo===0&&(
        <div style={{textAlign:"center",background:C.greenBg,borderRadius:8,padding:"8px",marginBottom:12,border:`1px solid #BBF7D0`}}>
          <span style={{color:C.green,fontWeight:700,fontSize:13}}>✓ CRÉDITO PAGADO EN SU TOTALIDAD</span>
        </div>
      )}

      <div style={{textAlign:"center",color:C.textSm,fontSize:10,marginBottom:16}}>
        *** Comprobante interno — no es documento fiscal ***
      </div>

      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>window.print()} style={{...BS,flex:1}}>🖨️ Imprimir</button>
        <button onClick={()=>{
          if(lastTicket.saldoNuevo===0) { onClose(); }
          else { setPaso("detalle"); setLastTicket(null); }
        }} style={{...BP,flex:1}}>
          {lastTicket.saldoNuevo===0?"Cerrar":"Otro abono"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",width:isMobile?"95vw":"500px",maxHeight:"93vh",display:"flex",flexDirection:"column"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {(paso==="detalle"||paso==="abonar")&&(
              <button onClick={()=>setPaso(paso==="abonar"?"detalle":"buscar")}
                style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:13,fontWeight:600,padding:0}}>
                ← Volver
              </button>
            )}
            <h2 style={{color:C.text,fontSize:17,fontWeight:700,margin:0}}>
              💳 {paso==="buscar"?"Pago de Créditos":paso==="detalle"?"Cuenta del Cliente":paso==="abonar"?"Registrar Abono":"Comprobante de Abono"}
            </h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer",padding:"4px 8px"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:24}}>

          {/* ── PASO 1: BUSCAR CLIENTE ── */}
          {paso==="buscar"&&(
            <div>
              <div style={{color:C.textMd,fontSize:13,marginBottom:16}}>
                Busca el cliente por nombre, NIT o teléfono para registrar un abono a su crédito.
              </div>
              <input
                value={search}
                onChange={e=>buscarClientes(e.target.value)}
                placeholder="🔍 Nombre, NIT o teléfono..."
                autoFocus
                style={{...IS,marginBottom:12,fontSize:15}}
              />
              {loading&&<div style={{textAlign:"center",color:C.textSm,padding:20}}>Buscando...</div>}
              {!loading&&search.length>=2&&clientes.length===0&&(
                <div style={{textAlign:"center",color:C.textSm,padding:24,background:C.panel,borderRadius:10,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:28,marginBottom:8}}>👤</div>
                  <div>No se encontraron clientes con crédito</div>
                </div>
              )}
              {clientes.map(c=>{
                const disponible = parseFloat(c.limite_credito||0)-parseFloat(c.saldo_credito||0);
                const pct = c.limite_credito>0?(c.saldo_credito/c.limite_credito)*100:0;
                return(
                  <button key={c.id} onClick={()=>seleccionarCliente(c)}
                    style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"14px",marginBottom:10,background:C.panel,border:`1.5px solid ${C.border}`,borderRadius:10,cursor:"pointer",textAlign:"left"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.background=C.blueBg;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.panel;}}>
                    <div style={{width:44,height:44,borderRadius:"50%",background:C.amberBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>💳</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:2}}>{c.nombre}</div>
                      <div style={{color:C.textMd,fontSize:12,marginBottom:6}}>NIT: {c.nit}{c.telefono?` · 📞 ${c.telefono}`:""}</div>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{color:C.red,fontSize:12,fontWeight:600}}>Saldo: {fmt(c.saldo_credito)}</span>
                        <span style={{color:C.green,fontSize:12}}>Disponible: {fmt(disponible)}</span>
                      </div>
                      <div style={{height:5,background:C.border,borderRadius:3}}>
                        <div style={{height:5,borderRadius:3,width:`${Math.min(pct,100)}%`,background:pct>80?C.red:pct>50?C.amber:C.green}}/>
                      </div>
                    </div>
                    <span style={{color:C.blue,fontSize:20,flexShrink:0}}>›</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── PASO 2: DETALLE CLIENTE ── */}
          {paso==="detalle"&&clienteSel&&(
            <div>
              {/* Info cliente */}
              <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:C.amberBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>💳</div>
                  <div>
                    <div style={{color:C.text,fontWeight:700,fontSize:16}}>{clienteSel.nombre}</div>
                    <div style={{color:C.textMd,fontSize:13}}>NIT: {clienteSel.nit}{clienteSel.telefono?` · 📞 ${clienteSel.telefono}`:""}</div>
                  </div>
                </div>
                {/* Barra crédito */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
                  {[
                    {label:"Límite",     value:fmt(clienteSel.limite_credito), color:C.textMd},
                    {label:"Saldo",      value:fmt(clienteSel.saldo_credito),  color:C.red},
                    {label:"Disponible", value:fmt(parseFloat(clienteSel.limite_credito||0)-parseFloat(clienteSel.saldo_credito||0)), color:C.green},
                  ].map(s=>(
                    <div key={s.label} style={{background:C.card,borderRadius:8,padding:"8px 10px",textAlign:"center",border:`1px solid ${C.border}`}}>
                      <div style={{color:s.color,fontSize:15,fontWeight:700}}>{s.value}</div>
                      <div style={{color:C.textSm,fontSize:10,marginTop:2}}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{height:8,background:C.border,borderRadius:4}}>
                  <div style={{height:8,borderRadius:4,width:`${Math.min(pctUsado,100)}%`,background:pctUsado>80?C.red:pctUsado>50?C.amber:C.green,transition:"width 0.3s"}}/>
                </div>
                <div style={{color:C.textSm,fontSize:11,marginTop:4,textAlign:"right"}}>Plazo: {clienteSel.dias_credito||30} días</div>
              </div>

              {/* Historial de abonos */}
              <div style={{marginBottom:16}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:10}}>
                  Historial de abonos ({abonos.length})
                </div>
                {loading?(
                  <div style={{textAlign:"center",color:C.textSm,padding:20}}>Cargando...</div>
                ):abonos.length===0?(
                  <div style={{textAlign:"center",color:C.textSm,padding:20,background:C.panel,borderRadius:8,border:`1px solid ${C.border}`}}>
                    Sin abonos registrados
                  </div>
                ):abonos.map((a,i)=>(
                  <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",marginBottom:8,background:C.card,border:`1px solid ${C.border}`,borderRadius:8}}>
                    <div>
                      <div style={{color:C.text,fontSize:13,fontWeight:600}}>Abono {i+1} — {METODOS.find(m=>m.id===a.metodo_pago)?.label||a.metodo_pago}</div>
                      <div style={{color:C.textSm,fontSize:11,marginTop:2}}>{fmtDate(a.created_at)} · {a.cajero}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{color:C.green,fontWeight:700,fontSize:15}}>{fmt(a.monto)}</div>
                      <div style={{color:C.textSm,fontSize:11}}>Saldo: {fmt(a.saldo_nuevo)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {parseFloat(clienteSel.saldo_credito)>0?(
                <button onClick={()=>setPaso("abonar")} style={{...BP,width:"100%",padding:14,fontSize:16,fontWeight:700}}>
                  💰 Registrar abono
                </button>
              ):(
                <div style={{textAlign:"center",background:C.greenBg,borderRadius:10,padding:16,border:`1px solid #BBF7D0`}}>
                  <div style={{fontSize:24,marginBottom:4}}>✅</div>
                  <div style={{color:C.green,fontWeight:700}}>Este cliente no tiene saldo pendiente</div>
                </div>
              )}
            </div>
          )}

          {/* ── PASO 3: REGISTRAR ABONO ── */}
          {paso==="abonar"&&clienteSel&&(
            <div>
              {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 14px",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}

              {/* Saldo actual */}
              <div style={{background:C.amberBg,borderRadius:10,padding:"14px 18px",marginBottom:16,textAlign:"center",border:`1px solid ${C.amber}40`}}>
                <div style={{color:C.amber,fontSize:12,marginBottom:4}}>SALDO PENDIENTE</div>
                <div style={{color:C.red,fontSize:32,fontWeight:800}}>{fmt(clienteSel.saldo_credito)}</div>
                <div style={{color:C.textMd,fontSize:12}}>{clienteSel.nombre}</div>
              </div>

              {/* Monto */}
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <label style={{color:C.textMd,fontSize:13,fontWeight:600}}>Monto del abono</label>
                  <button onClick={()=>setMonto(String(clienteSel.saldo_credito))}
                    style={{color:C.blue,background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>
                    Pago total ({fmt(clienteSel.saldo_credito)})
                  </button>
                </div>
                <input type="number" value={monto} onChange={e=>setMonto(e.target.value)}
                  placeholder="0.00" min="0.01" step="0.01"
                  style={{...IS,fontSize:28,fontWeight:800,textAlign:"right",color:C.green}}/>
                {/* Botones rápidos */}
                <div style={{display:"flex",gap:6,marginTop:8}}>
                  {[50,100,200,500].map(amt=>(
                    <button key={amt} onClick={()=>setMonto(String(Math.min(amt,parseFloat(clienteSel.saldo_credito))))}
                      style={{flex:1,padding:"7px 4px",background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,color:C.textMd,fontSize:12,cursor:"pointer",fontWeight:600}}>
                      Q{amt}
                    </button>
                  ))}
                </div>
                {monto&&parseFloat(monto)>0&&(
                  <div style={{marginTop:8,background:C.greenBg,borderRadius:8,padding:"8px 14px",border:`1px solid #BBF7D0`}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:C.textMd,fontSize:13}}>Saldo después del abono</span>
                      <span style={{color:parseFloat(clienteSel.saldo_credito)-parseFloat(monto)>0?C.amber:C.green,fontWeight:700,fontSize:15}}>
                        {fmt(Math.max(0,parseFloat(clienteSel.saldo_credito)-parseFloat(monto)))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Método de pago */}
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
                        {bancosReceptores.map(b=>(
                          <option key={b.id} value={b.id}>{b.nombre}{b.numero_cuenta?` — ${b.numero_cuenta}`:""}</option>
                        ))}
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

          {/* ── PASO 4: TICKET ── */}
          {paso==="ticket"&&<TicketAbono/>}
        </div>
      </div>
    </div>
  );
}
