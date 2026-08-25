import { useState, useEffect } from "react";
import { tienePermiso, ROLES, ROL_COLOR, ROL_BG, ROL_ICON } from "./usuarios.js";
import UsuariosModal from "./UsuariosModal.jsx";
import RolesModal from "./RolesModal.jsx";
import ProductosModal from "./ProductosModal.jsx";
import ClientesModal from "./ClientesModal.jsx";
import AbonosModal from "./AbonosModal.jsx";
import CreditosModal from "./CreditosModal.jsx";
import ProveedoresModal from "./ProveedoresModal.jsx";
import InventarioModal from "./InventarioModal.jsx";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
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

// ─── BREAKPOINTS ──────────────────────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState(() => {
    const w = window.innerWidth;
    return w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  });
  useEffect(() => {
    const fn = () => {
      const w = window.innerWidth;
      setBp(w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return bp;
}

// ─── PALETA ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#F0F2F5", sidebar:"#FFFFFF", card:"#FFFFFF", panel:"#F8F9FB",
  border:"#E2E8F0", text:"#1E293B", textMd:"#475569", textSm:"#94A3B8",
  blue:"#3B82F6", blueBg:"#EFF6FF", blueBorder:"#BFDBFE",
  green:"#16A34A", greenBg:"#F0FDF4",
  red:"#DC2626", redBg:"#FEF2F2", redBorder:"#FECACA",
  amber:"#D97706", amberBg:"#FFF7ED",
  overlay:"rgba(15,23,42,0.5)",
};

const CARD_TYPES = [
  {id:"visa",       label:"Visa",       icon:"💳"},
  {id:"mastercard", label:"Mastercard", icon:"🔴"},
  {id:"amex",       label:"Amex",       icon:"🟦"},
  {id:"otra",       label:"Otra",       icon:"💳"},
];
const CAT_ICONS = {"Lácteos":"🥛","Bebidas":"🥤","Panadería":"🍞","Limpieza":"🧴","Snacks":"🍿","Abarrotes":"🛒","Cuidado Personal":"🧼"};
const IVA_MODOS = [
  {id:"incluido_simple",    label:"IVA incluido",  sublabel:"Sin desglose en ticket", badge:"🇬🇹 Más común en GT"},
  {id:"incluido_desglosado",label:"IVA incluido",  sublabel:"Con desglose en ticket", badge:"📊 Reportes fiscales"},
  {id:"agregado",           label:"IVA agregado",  sublabel:"Se suma al precio",      badge:"🏢 Ventas B2B"},
];
const DEFAULT_IVA = {porcentaje:12, modo:"incluido_simple"};
const METODOS = [{id:"cash",label:"Efectivo",icon:"💵"},{id:"card",label:"Tarjeta",icon:"💳"},{id:"transfer",label:"Transferencia",icon:"🏦"},{id:"credit",label:"Crédito",icon:"📋"}];

const fmt  = (n) => `Q ${Number(n||0).toFixed(2)}`;
const nowT = () => new Date().toLocaleTimeString("es-GT",{hour:"2-digit",minute:"2-digit"});

function calcLine(item, ivaConfig) {
  const tieneIva = parseFloat(item.impuesto) > 0;
  const tasa = tieneIva ? ivaConfig.porcentaje/100 : 0;
  const bruto = item.precio * item.qty;
  if (ivaConfig.modo==="agregado") {
    const ivaMonto = bruto*tasa;
    return {base:bruto, ivaMonto, total:bruto+ivaMonto, mostrarDesglose:tieneIva};
  }
  const base = tasa>0 ? bruto/(1+tasa) : bruto;
  const ivaMonto = bruto-base;
  return {base, ivaMonto, total:bruto, mostrarDesglose:tieneIva&&ivaConfig.modo==="incluido_desglosado"};
}

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const IS = {background:"#fff",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 14px",color:"#1E293B",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"};
const BP = {background:"#3B82F6",color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:"pointer"};
const BS = {background:"#fff",color:"#475569",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"};
const BD = {background:"#FEF2F2",color:"#DC2626",border:"1.5px solid #FECACA",borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"};
const OV = {position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"};
const MW = {background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",maxHeight:"92vh",overflowY:"auto"};

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTES EXTERNOS (sin inputs dentro del componente principal)
// ══════════════════════════════════════════════════════════════════════════════

// ─── BANCOS MODAL ─────────────────────────────────────────────────────────────
function BancosModal({ bancos, setBancos, onClose, isMobile }) {
  const [form,   setForm]   = useState({nombre:"", numero_cuenta:"", tipo:"receptor"});
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(), tipo: form.tipo,
        numero_cuenta: form.tipo==="receptor" ? (form.numero_cuenta.trim()||null) : null,
      };
      if (editId) await sb(`bancos?id=eq.${editId}`,"PATCH",payload);
      else await sb("bancos","POST",payload);
      const bcos = await sb("bancos","GET",null,"?activo=eq.true&order=nombre");
      setBancos(bcos||[]);
      setForm({nombre:"",numero_cuenta:"",tipo:"receptor"});
      setEditId(null);
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const edit   = (b) => { setForm({nombre:b.nombre,numero_cuenta:b.numero_cuenta||"",tipo:b.tipo}); setEditId(b.id); };
  const cancel = ()  => { setForm({nombre:"",numero_cuenta:"",tipo:"receptor"}); setEditId(null); };
  const remove = async (id) => {
    await sb(`bancos?id=eq.${id}`,"PATCH",{activo:false});
    setBancos(prev=>prev.filter(b=>b.id!==id));
  };
  const close = () => { cancel(); onClose(); };

  return (
    <div style={OV}>
      <div style={{...MW,width:isMobile?"95vw":"560px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{color:C.text,fontSize:18,fontWeight:700,margin:0}}>🏦 Catálogo de Bancos</h2>
          <button onClick={close} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer",padding:"4px 8px"}}>✕</button>
        </div>

        <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:20,border:`1px solid ${C.border}`}}>
          <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>{editId?"✏️ Editar banco":"➕ Agregar banco"}</div>

          {/* Tipo */}
          <div style={{marginBottom:12}}>
            <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:6}}>Tipo de banco</label>
            <div style={{display:"flex",gap:8}}>
              {[{id:"receptor",label:"📥 Receptor",desc:"Recibe pagos"},{id:"emisor",label:"📤 Emisor",desc:"Banco del cliente"}].map(t=>(
                <button key={t.id} onClick={()=>setForm(p=>({...p,tipo:t.id,numero_cuenta:""}))} style={{
                  flex:1,padding:"10px 8px",borderRadius:8,cursor:"pointer",textAlign:"center",
                  border:`2px solid ${form.tipo===t.id?C.blue:C.border}`,
                  background:form.tipo===t.id?C.blueBg:C.card,
                  color:form.tipo===t.id?C.blue:C.textMd,fontSize:13,fontWeight:form.tipo===t.id?600:400
                }}>
                  <div>{t.label}</div>
                  <div style={{fontSize:10,color:form.tipo===t.id?C.blue:C.textSm,marginTop:2}}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div style={{marginBottom:10}}>
            <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Nombre del banco *</label>
            <input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))}
              placeholder="Ej: Banrural, BAC..." style={IS}/>
          </div>

          {/* Cuenta solo receptor */}
          {form.tipo==="receptor"&&(
            <div style={{marginBottom:12}}>
              <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Número de cuenta</label>
              <input value={form.numero_cuenta} onChange={e=>setForm(p=>({...p,numero_cuenta:e.target.value}))}
                placeholder="Ej: 3-000-123456-7" style={IS}/>
            </div>
          )}
          {form.tipo==="emisor"&&(
            <div style={{background:C.blueBg,borderRadius:8,padding:"8px 12px",marginBottom:12,border:`1px solid ${C.blueBorder}`}}>
              <span style={{color:C.blue,fontSize:12}}>ℹ️ El banco emisor no requiere número de cuenta.</span>
            </div>
          )}

          <div style={{display:"flex",gap:8}}>
            {editId&&<button onClick={cancel} style={{...BS,flex:1}}>Cancelar</button>}
            <button onClick={save} disabled={saving||!form.nombre.trim()}
              style={{...BP,flex:2,opacity:saving||!form.nombre.trim()?0.5:1}}>
              {saving?"⏳ Guardando...":editId?"✓ Actualizar":"➕ Agregar banco"}
            </button>
          </div>
        </div>

        <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:10}}>Bancos registrados ({bancos.length})</div>
        {bancos.length===0?(
          <div style={{textAlign:"center",color:C.textSm,padding:30,background:C.panel,borderRadius:10,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:32,marginBottom:8}}>🏦</div>
            <div>No hay bancos registrados aún</div>
          </div>
        ):bancos.map(b=>(
          <div key={b.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",marginBottom:8,background:C.card,border:`1px solid ${C.border}`,borderRadius:8}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{color:C.text,fontWeight:600,fontSize:14}}>{b.nombre}</span>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:b.tipo==="receptor"?C.greenBg:C.blueBg,color:b.tipo==="receptor"?C.green:C.blue}}>
                  {b.tipo==="receptor"?"📥 Receptor":"📤 Emisor"}
                </span>
              </div>
              {b.numero_cuenta&&<div style={{color:C.textSm,fontSize:12,marginTop:2}}>Cuenta: {b.numero_cuenta}</div>}
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>edit(b)} style={{...BS,padding:"6px 10px",fontSize:12}}>✏️</button>
              <button onClick={()=>remove(b.id)} style={{...BD,padding:"6px 10px",fontSize:12}}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PAY MODAL ────────────────────────────────────────────────────────────────
function PayModal({ cartTotal, cartBase, cartIva, hayDesglose, cart, ivaConfig, bancos, customer, onClose, onComplete, isMobile }) {
  const [modo,   setModo]   = useState("efectivo"); // "efectivo" | "credito"
  const [pagos,  setPagos]  = useState([{metodo:"cash", monto:"", extras:{}}]);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  const bancosReceptores = bancos.filter(b=>b.tipo==="receptor");
  const bancosEmisores   = bancos.filter(b=>b.tipo==="emisor");

  const clienteTieneCredito = customer?.credito;
  const creditoDisponible   = parseFloat(customer?.limite_credito||0) - parseFloat(customer?.saldo_credito||0);

  // ── Cálculo normal (modo efectivo)
  const totalPagado = pagos.reduce((s,p)=>s+parseFloat(p.monto||0),0);
  const pagoValido  = totalPagado >= cartTotal - 0.01;

  const addPago    = () => setPagos(prev=>[...prev,{metodo:"transfer",monto:"",extras:{}}]);
  const removePago = (i) => setPagos(prev=>prev.filter((_,idx)=>idx!==i));
  const updatePago  = (i,f,v) => setPagos(prev=>prev.map((p,idx)=>idx===i?{...p,[f]:v}:p));
  const updateExtra = (i,f,v) => setPagos(prev=>prev.map((p,idx)=>idx===i?{...p,extras:{...p.extras,[f]:v}}:p));

  const fillResto = (i) => {
    const otros = pagos.reduce((s,p,idx)=>idx===i?s:s+parseFloat(p.monto||0),0);
    const resto = cartTotal - otros;
    if(resto>0) updatePago(i,"monto",resto.toFixed(2));
  };

  const cambioEfectivo = (i) => {
    const otros = pagos.reduce((s,p,idx)=>idx===i?s:s+parseFloat(p.monto||0),0);
    const necesita = cartTotal - otros;
    const recibido = parseFloat(pagos[i].monto||0);
    return recibido > necesita ? recibido - necesita : 0;
  };

  const confirm = async () => {
    setErr("");
    if(modo==="credito") {
      if(!clienteTieneCredito) { setErr("El cliente no tiene crédito autorizado"); return; }
      if(cartTotal > creditoDisponible) { setErr(`Crédito insuficiente. Disponible: Q ${creditoDisponible.toFixed(2)}`); return; }
      const pagosCredito = [{metodo:"credit", monto:cartTotal.toFixed(2), extras:{}}];
      setSaving(true);
      await onComplete(pagosCredito);
      setSaving(false);
      return;
    }
    // Modo efectivo — validaciones normales
    for(const p of pagos) {
      if(!parseFloat(p.monto||0)) { setErr("Ingresa el monto de todos los pagos"); return; }
      if(p.metodo==="transfer"&&!p.extras.banco_receptor_id) { setErr("Selecciona el banco receptor"); return; }
      if(p.metodo==="transfer"&&!p.extras.autorizacion?.trim()) { setErr("Ingresa el número de autorización"); return; }
      if(p.metodo==="card"&&!p.extras.tipo_tarjeta) { setErr("Selecciona el tipo de tarjeta"); return; }
    }
    if(!pagoValido) { setErr("El monto ingresado es menor al total"); return; }
    setSaving(true);
    await onComplete(pagos);
    setSaving(false);
  };

  const CARD_TYPES = [
    {id:"visa",label:"Visa",icon:"💳"},
    {id:"mastercard",label:"Mastercard",icon:"🔴"},
    {id:"amex",label:"Amex",icon:"🟦"},
    {id:"otra",label:"Otra",icon:"💳"},
  ];

  const fmt2 = (n) => `Q ${Number(n||0).toFixed(2)}`;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",maxHeight:"92vh",overflowY:"auto",width:isMobile?"95vw":"480px"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{color:"#1E293B",fontSize:18,fontWeight:700,margin:0}}>
            {modo==="credito"?"📋 Facturar a Crédito":"💳 Cobrar Venta"}
          </h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#94A3B8",fontSize:22,cursor:"pointer",padding:"4px 8px"}}>✕</button>
        </div>

        {/* Selector de modo — solo si el cliente tiene crédito */}
        {clienteTieneCredito&&(
          <div style={{display:"flex",background:"#F8F9FB",borderRadius:10,padding:4,marginBottom:16,border:"1px solid #E2E8F0"}}>
            <button onClick={()=>setModo("efectivo")} style={{
              flex:1,padding:"9px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,
              background:modo==="efectivo"?"#fff":"transparent",
              color:modo==="efectivo"?"#3B82F6":"#94A3B8",
              boxShadow:modo==="efectivo"?"0 1px 4px rgba(0,0,0,0.08)":"none"
            }}>💵 Cobrar ahora</button>
            <button onClick={()=>setModo("credito")} style={{
              flex:1,padding:"9px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,
              background:modo==="credito"?"#fff":"transparent",
              color:modo==="credito"?"#D97706":"#94A3B8",
              boxShadow:modo==="credito"?"0 1px 4px rgba(0,0,0,0.08)":"none"
            }}>📋 Facturar a crédito</button>
          </div>
        )}

        {/* ── MODO CRÉDITO ── */}
        {modo==="credito"&&(
          <div>
            {/* Total de la factura */}
            <div style={{background:"#FFF7ED",borderRadius:10,padding:"20px",marginBottom:16,textAlign:"center",border:"1px solid #FED7AA"}}>
              <div style={{color:"#D97706",fontSize:12,fontWeight:600,marginBottom:6,letterSpacing:1}}>MONTO DE LA FACTURA</div>
              <div style={{color:"#D97706",fontSize:40,fontWeight:800}}>{fmt2(cartTotal)}</div>
              {hayDesglose&&<div style={{color:"#92400E",fontSize:12,marginTop:4}}>Base {fmt2(cartBase)} + IVA {fmt2(cartIva)}</div>}
            </div>

            {/* Info crédito cliente */}
            <div style={{background:"#F0FDF4",borderRadius:10,padding:16,marginBottom:16,border:"1px solid #BBF7D0"}}>
              <div style={{color:"#16A34A",fontSize:13,fontWeight:600,marginBottom:10}}>👤 {customer?.nombre}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                {[
                  {label:"Límite",     value:fmt2(customer?.limite_credito), color:"#475569"},
                  {label:"Usado",      value:fmt2(customer?.saldo_credito),  color:"#DC2626"},
                  {label:"Disponible", value:fmt2(creditoDisponible),        color:"#16A34A"},
                ].map(s=>(
                  <div key={s.label} style={{background:"#fff",borderRadius:8,padding:"8px",textAlign:"center",border:"1px solid #BBF7D0"}}>
                    <div style={{color:s.color,fontSize:14,fontWeight:700}}>{s.value}</div>
                    <div style={{color:"#94A3B8",fontSize:10,marginTop:2}}>{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Barra crédito */}
              <div style={{height:6,background:"#DCF8E8",borderRadius:3,marginBottom:6}}>
                <div style={{
                  height:6,borderRadius:3,transition:"width 0.3s",
                  width:`${Math.min((parseFloat(customer?.saldo_credito||0)/parseFloat(customer?.limite_credito||1))*100,100)}%`,
                  background:creditoDisponible<cartTotal?"#DC2626":"#16A34A"
                }}/>
              </div>
              {/* Nuevo saldo después de esta compra */}
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid #BBF7D0"}}>
                <span style={{color:"#475569",fontSize:13}}>Saldo después de esta compra</span>
                <span style={{
                  color:parseFloat(customer?.saldo_credito||0)+cartTotal>parseFloat(customer?.limite_credito||0)?"#DC2626":"#D97706",
                  fontSize:14,fontWeight:700
                }}>{fmt2(parseFloat(customer?.saldo_credito||0)+cartTotal)}</span>
              </div>
            </div>

            {/* Aviso si no tiene crédito suficiente */}
            {cartTotal > creditoDisponible&&(
              <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"10px 14px",color:"#DC2626",fontSize:13,marginBottom:16}}>
                ⚠️ Crédito insuficiente. La compra (Q {cartTotal.toFixed(2)}) supera el disponible (Q {creditoDisponible.toFixed(2)}).
              </div>
            )}

            {err&&<div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"8px 14px",color:"#DC2626",fontSize:13,marginBottom:12}}>{err}</div>}

            <button onClick={confirm} disabled={saving||cartTotal>creditoDisponible}
              style={{background:"#D97706",color:"#fff",border:"none",borderRadius:10,padding:16,fontSize:17,fontWeight:700,cursor:"pointer",width:"100%",
                opacity:saving||cartTotal>creditoDisponible?0.5:1}}>
              {saving?"⏳ Procesando...":"📋 Confirmar factura a crédito"}
            </button>
          </div>
        )}

        {/* ── MODO EFECTIVO / NORMAL ── */}
        {modo==="efectivo"&&(
          <div>
            {/* Total */}
            <div style={{background:"#F8F9FB",borderRadius:10,padding:"14px 20px",marginBottom:16,textAlign:"center",border:"1px solid #E2E8F0"}}>
              <div style={{color:"#94A3B8",fontSize:12,marginBottom:4}}>TOTAL A COBRAR</div>
              <div style={{color:"#16A34A",fontSize:32,fontWeight:800}}>{fmt2(cartTotal)}</div>
              {hayDesglose&&<div style={{color:"#94A3B8",fontSize:12,marginTop:4}}>Base {fmt2(cartBase)} + IVA {fmt2(cartIva)}</div>}
            </div>

            {/* Pagos */}
            <div style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{color:"#475569",fontSize:13,fontWeight:600}}>Forma{pagos.length>1?"s":""} de pago</span>
                {pagos.length<3&&(
                  <button onClick={addPago} style={{background:"#fff",color:"#475569",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"4px 12px",fontSize:12,cursor:"pointer"}}>+ Agregar método</button>
                )}
              </div>

              {pagos.map((pago,i)=>(
                <div key={i} style={{background:"#F8F9FB",borderRadius:10,padding:14,marginBottom:10,border:"1px solid #E2E8F0"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{color:"#475569",fontSize:12,fontWeight:600}}>Pago {pagos.length>1?i+1:""}</span>
                    {pagos.length>1&&<button onClick={()=>removePago(i)} style={{background:"#FEF2F2",color:"#DC2626",border:"1.5px solid #FECACA",borderRadius:8,padding:"3px 10px",fontSize:11,cursor:"pointer"}}>✕ Quitar</button>}
                  </div>

                  {/* Método — sin crédito en modo efectivo */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:12}}>
                    {[
                      {id:"cash",     label:"Efectivo",      icon:"💵"},
                      {id:"card",     label:"Tarjeta",       icon:"💳"},
                      {id:"transfer", label:"Transferencia", icon:"🏦"},
                    ].map(m=>(
                      <button key={m.id} onClick={()=>updatePago(i,"metodo",m.id)} style={{
                        padding:"8px 4px",borderRadius:8,cursor:"pointer",textAlign:"center",
                        border:`1.5px solid ${pago.metodo===m.id?"#3B82F6":"#E2E8F0"}`,
                        background:pago.metodo===m.id?"#EFF6FF":"#fff",
                        color:pago.metodo===m.id?"#3B82F6":"#475569",
                        fontSize:12,fontWeight:pago.metodo===m.id?600:400
                      }}>
                        <div style={{fontSize:20}}>{m.icon}</div>
                        <div>{m.label}</div>
                      </button>
                    ))}
                  </div>

                  {/* Monto */}
                  <div style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <label style={{color:"#94A3B8",fontSize:11}}>Monto</label>
                      <button onClick={()=>fillResto(i)} style={{color:"#3B82F6",background:"none",border:"none",cursor:"pointer",fontSize:11,fontWeight:600}}>
                        Completar ({fmt2(Math.max(0,cartTotal-pagos.reduce((s,p,idx)=>idx===i?s:s+parseFloat(p.monto||0),0)))})
                      </button>
                    </div>
                    <input type="number" value={pago.monto} onChange={e=>updatePago(i,"monto",e.target.value)}
                      placeholder="0.00"
                      style={{background:"#fff",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 14px",color:"#1E293B",fontSize:22,fontWeight:700,textAlign:"right",outline:"none",width:"100%",boxSizing:"border-box"}}/>
                    {/* Botones rápidos */}
                    {pago.metodo==="cash"&&(
                      <div style={{display:"flex",gap:6,marginTop:8}}>
                        {[50,100,200,500].map(amt=>(
                          <button key={amt} onClick={()=>updatePago(i,"monto",String(amt))}
                            style={{flex:1,padding:"7px 4px",background:"#F8F9FB",border:"1px solid #E2E8F0",borderRadius:6,color:"#475569",fontSize:12,cursor:"pointer",fontWeight:600}}>
                            Q{amt}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Cambio */}
                    {pago.metodo==="cash"&&cambioEfectivo(i)>0&&(
                      <div style={{marginTop:8,background:"#EFF6FF",borderRadius:8,padding:"8px 14px",border:"1px solid #BFDBFE"}}>
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <span style={{color:"#475569",fontSize:13}}>Cambio</span>
                          <span style={{color:"#3B82F6",fontWeight:700,fontSize:18}}>{fmt2(cambioEfectivo(i))}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TARJETA */}
                  {pago.metodo==="card"&&(
                    <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
                      <div>
                        <label style={{color:"#94A3B8",fontSize:11,display:"block",marginBottom:6}}>Tipo de tarjeta *</label>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                          {CARD_TYPES.map(ct=>(
                            <button key={ct.id} onClick={()=>updateExtra(i,"tipo_tarjeta",ct.id)} style={{
                              padding:"8px 4px",borderRadius:8,cursor:"pointer",textAlign:"center",
                              border:`1.5px solid ${pago.extras.tipo_tarjeta===ct.id?"#3B82F6":"#E2E8F0"}`,
                              background:pago.extras.tipo_tarjeta===ct.id?"#EFF6FF":"#fff",
                              color:pago.extras.tipo_tarjeta===ct.id?"#3B82F6":"#475569",
                              fontSize:11,fontWeight:pago.extras.tipo_tarjeta===ct.id?600:400
                            }}>
                              <div style={{fontSize:14}}>{ct.icon}</div>
                              <div style={{fontSize:10}}>{ct.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={{color:"#94A3B8",fontSize:11,display:"block",marginBottom:4}}>No. de autorización</label>
                        <input value={pago.extras.autorizacion||""} onChange={e=>updateExtra(i,"autorizacion",e.target.value)}
                          placeholder="Ej: 123456" style={{background:"#fff",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 14px",color:"#1E293B",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"}}/>
                      </div>
                    </div>
                  )}

                  {/* TRANSFERENCIA */}
                  {pago.metodo==="transfer"&&(
                    <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
                      {bancosReceptores.length===0?(
                        <div style={{background:"#FFF7ED",border:"1px solid #D97706",borderRadius:8,padding:"10px 14px",color:"#D97706",fontSize:13}}>
                          ⚠️ No hay bancos receptores configurados.
                        </div>
                      ):(
                        <>
                          <div>
                            <label style={{color:"#94A3B8",fontSize:11,display:"block",marginBottom:4}}>Banco receptor *</label>
                            <select value={pago.extras.banco_receptor_id||""} onChange={e=>updateExtra(i,"banco_receptor_id",e.target.value)}
                              style={{background:"#fff",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 14px",color:"#1E293B",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box",cursor:"pointer"}}>
                              <option value="">Seleccionar banco...</option>
                              {bancosReceptores.map(b=>(<option key={b.id} value={b.id}>{b.nombre}{b.numero_cuenta?` — ${b.numero_cuenta}`:""}</option>))}
                            </select>
                          </div>
                          {bancosEmisores.length>0&&(
                            <div>
                              <label style={{color:"#94A3B8",fontSize:11,display:"block",marginBottom:4}}>Banco origen (opcional)</label>
                              <select value={pago.extras.banco_emisor_id||""} onChange={e=>updateExtra(i,"banco_emisor_id",e.target.value)}
                                style={{background:"#fff",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 14px",color:"#1E293B",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box",cursor:"pointer"}}>
                                <option value="">Seleccionar banco...</option>
                                {bancosEmisores.map(b=>(<option key={b.id} value={b.id}>{b.nombre}</option>))}
                              </select>
                            </div>
                          )}
                          <div>
                            <label style={{color:"#94A3B8",fontSize:11,display:"block",marginBottom:4}}>No. de autorización *</label>
                            <input value={pago.extras.autorizacion||""} onChange={e=>updateExtra(i,"autorizacion",e.target.value)}
                              placeholder="Ej: TRX-123456" style={{background:"#fff",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 14px",color:"#1E293B",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"}}/>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Resumen */}
            <div style={{background:"#F8F9FB",borderRadius:10,padding:"12px 16px",marginBottom:12,border:"1px solid #E2E8F0"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:"#475569",fontSize:13}}>Total venta</span>
                <span style={{color:"#1E293B",fontSize:13,fontWeight:600}}>{fmt2(cartTotal)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#475569",fontSize:13}}>Total pagado</span>
                <span style={{color:totalPagado>=cartTotal?"#16A34A":"#D97706",fontSize:13,fontWeight:600}}>{fmt2(totalPagado)}</span>
              </div>
              {cartTotal-totalPagado>0.01&&(
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:6,borderTop:"1px solid #E2E8F0",marginTop:6}}>
                  <span style={{color:"#DC2626",fontSize:13,fontWeight:600}}>Pendiente</span>
                  <span style={{color:"#DC2626",fontSize:13,fontWeight:700}}>{fmt2(cartTotal-totalPagado)}</span>
                </div>
              )}
              {pagoValido&&<div style={{textAlign:"center",color:"#16A34A",fontSize:13,fontWeight:600,marginTop:6}}>✓ Pago completo</div>}
            </div>

            {err&&<div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"8px 14px",color:"#DC2626",fontSize:13,marginBottom:12}}>{err}</div>}

            <button onClick={confirm} disabled={saving||!pagoValido}
              style={{background:"#3B82F6",color:"#fff",border:"none",borderRadius:10,padding:16,fontSize:17,fontWeight:700,cursor:"pointer",width:"100%",
                opacity:saving||!pagoValido?0.5:1}}>
              {saving?"⏳ Guardando...":"✓ Confirmar Cobro"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TICKET MODAL ─────────────────────────────────────────────────────────────
function TicketModal({ ticket, bancos, onClose, isMobile }) {
  if (!ticket) return null;
  const labels = {cash:"Efectivo",card:"Tarjeta",transfer:"Transferencia",credit:"Crédito"};
  return (
    <div style={OV}>
      <div style={{...MW,width:isMobile?"95vw":"340px",fontFamily:"'Courier New',monospace"}}>
        <div style={{textAlign:"center",borderBottom:"1px dashed #E2E8F0",paddingBottom:12,marginBottom:12}}>
          <div style={{fontSize:11,color:C.textSm,letterSpacing:2}}>DOCUMENTO INTERNO</div>
          <div style={{fontSize:18,fontWeight:700,color:C.text,fontFamily:"Inter,sans-serif"}}>Smart Valion POS</div>
          <div style={{fontSize:11,color:C.textMd}}>Sucursal Principal</div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{color:C.textMd,fontSize:12}}>Venta #</span>
          <span style={{color:C.blue,fontWeight:700}}>{ticket.correlativo}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
          <span style={{color:C.textMd,fontSize:12}}>Fecha</span>
          <span style={{color:C.text,fontSize:11}}>{ticket.date}</span>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{color:C.textMd,fontSize:11,marginBottom:6}}>Cliente: <span style={{color:C.text}}>{ticket.customer?.nombre||"Consumidor Final"}</span></div>
          {ticket.items.map(item=>{
            const l=calcLine(item,ticket.ivaConfig);
            return(
              <div key={item.id} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:C.textMd,fontSize:12,flex:1}}>{item.nombre}</span>
                <span style={{color:C.textSm,fontSize:12,width:36,textAlign:"center"}}>x{item.qty}</span>
                <span style={{color:C.text,fontSize:12,width:72,textAlign:"right"}}>{fmt(l.total)}</span>
              </div>
            );
          })}
        </div>
        <div style={{borderTop:"1px dashed #E2E8F0",paddingTop:10,marginBottom:10}}>
          {ticket.hayDesglose&&(
            <>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:C.textMd,fontSize:12}}>Base imponible</span>
                <span style={{color:C.text,fontSize:12}}>{fmt(ticket.base)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{color:C.textMd,fontSize:12}}>IVA ({ticket.ivaConfig.porcentaje}%)</span>
                <span style={{color:C.text,fontSize:12}}>{fmt(ticket.iva)}</span>
              </div>
            </>
          )}
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{color:C.text,fontSize:16,fontWeight:700}}>TOTAL</span>
            <span style={{color:C.green,fontSize:16,fontWeight:700}}>{fmt(ticket.total)}</span>
          </div>
          {ticket.ivaConfig.modo==="incluido_simple"&&ticket.iva>0&&(
            <div style={{color:C.textSm,fontSize:10,textAlign:"right",marginTop:4}}>IVA {ticket.ivaConfig.porcentaje}% incluido</div>
          )}
        </div>
        <div style={{borderTop:"1px dashed #E2E8F0",paddingTop:10,marginBottom:12}}>
          {ticket.pagos.map((p,i)=>{
            const bR=p.extras.banco_receptor_id?bancos.find(b=>b.id==p.extras.banco_receptor_id):null;
            const bE=p.extras.banco_emisor_id?bancos.find(b=>b.id==p.extras.banco_emisor_id):null;
            return(
              <div key={i} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:C.textMd,fontSize:12}}>{labels[p.metodo]||p.metodo}{p.extras.tipo_tarjeta?` (${p.extras.tipo_tarjeta})`:""}</span>
                  <span style={{color:C.text,fontSize:12,fontWeight:600}}>{fmt(parseFloat(p.monto||0))}</span>
                </div>
                {p.extras.autorizacion&&<div style={{color:C.textSm,fontSize:10}}>Auth: {p.extras.autorizacion}</div>}
                {bR&&<div style={{color:C.textSm,fontSize:10}}>Banco receptor: {bR.nombre}{bR.numero_cuenta?` (${bR.numero_cuenta})`:""}</div>}
                {bE&&<div style={{color:C.textSm,fontSize:10}}>Banco origen: {bE.nombre}</div>}
              </div>
            );
          })}
        </div>
        <div style={{textAlign:"center",color:C.textSm,fontSize:10,marginBottom:16}}>*** Este no es un documento fiscal ***<br/>Powered by Smart Valion ERP</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>window.print()} style={{...BS,flex:1}}>🖨️ Imprimir</button>
          <button onClick={onClose} style={{...BP,flex:1}}>Nueva Venta</button>
        </div>
      </div>
    </div>
  );
}

// ─── CONFIG IVA MODAL ─────────────────────────────────────────────────────────
function ConfigModal({ ivaConfig, onSave, onClose, isMobile }) {
  const [temp, setTemp] = useState({...ivaConfig});
  const mc = (id) => id==="incluido_simple"?{c:C.green,bg:C.greenBg}:id==="incluido_desglosado"?{c:C.blue,bg:C.blueBg}:{c:C.amber,bg:C.amberBg};
  return (
    <div style={OV}>
      <div style={{...MW,width:isMobile?"95vw":"480px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{color:C.text,fontSize:18,fontWeight:700,margin:0}}>⚙️ Configuración de IVA</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer",padding:"4px 8px"}}>✕</button>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{color:C.textMd,fontSize:13,fontWeight:600,display:"block",marginBottom:8}}>Porcentaje de IVA</label>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <input type="number" min="0" max="100" step="0.1" value={temp.porcentaje}
              onChange={e=>setTemp(p=>({...p,porcentaje:parseFloat(e.target.value)||0}))}
              style={{...IS,width:90,fontSize:22,fontWeight:700,textAlign:"center"}}/>
            <span style={{color:C.textMd,fontSize:28,fontWeight:700}}>%</span>
            <div style={{color:C.textSm,fontSize:12}}>Guatemala: <strong>12%</strong></div>
          </div>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{color:C.textMd,fontSize:13,fontWeight:600,display:"block",marginBottom:10}}>¿Cómo se maneja el IVA?</label>
          {IVA_MODOS.map(modo=>{
            const sel=temp.modo===modo.id;
            const m=mc(modo.id);
            return(
              <button key={modo.id} onClick={()=>setTemp(p=>({...p,modo:modo.id}))}
                style={{width:"100%",padding:"14px 16px",marginBottom:8,borderRadius:10,cursor:"pointer",textAlign:"left",border:`2px solid ${sel?C.blue:C.border}`,background:sel?C.blueBg:C.panel}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                  <div style={{width:18,height:18,borderRadius:"50%",flexShrink:0,marginTop:2,border:`2px solid ${sel?C.blue:C.border}`,background:sel?C.blue:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {sel&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
                  </div>
                  <div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:4,alignItems:"center"}}>
                      <span style={{color:C.text,fontWeight:700,fontSize:14}}>{modo.label}</span>
                      <span style={{color:C.textSm,fontSize:12}}>— {modo.sublabel}</span>
                      <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:m.bg,color:m.c}}>{modo.badge}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} style={{...BS,flex:1}}>Cancelar</button>
          <button onClick={()=>onSave(temp)} style={{...BP,flex:2}}>✓ Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ─── CUSTOMER MODAL ───────────────────────────────────────────────────────────
function CustomerModal({ customers, customer, onSelect, onClose, isMobile }) {
  const [search, setSearch] = useState("");

  const filtered = customers.filter(c => {
    if (search==="") return true;
    const q = search.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.nit||"").toLowerCase().includes(q) ||
      (c.telefono||"").includes(q)
    );
  });

  return (
    <div style={OV}>
      <div style={{...MW,width:isMobile?"95vw":"420px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h2 style={{color:C.text,fontSize:16,fontWeight:700,margin:0}}>Seleccionar Cliente</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer",padding:"4px 8px"}}>✕</button>
        </div>

        {/* Búsqueda */}
        <input
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Buscar por nombre, NIT o teléfono..."
          autoFocus
          style={{background:C.panel,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",width:"100%",boxSizing:"border-box",marginBottom:12}}
        />

        <div style={{maxHeight:360,overflowY:"auto"}}>
          {filtered.length===0?(
            <div style={{textAlign:"center",color:C.textSm,padding:24}}>
              <div style={{fontSize:28,marginBottom:8}}>👤</div>
              <div>No se encontraron clientes</div>
            </div>
          ):filtered.map(c=>(
            <button key={c.id} onClick={()=>onSelect(c)}
              style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                width:"100%",padding:"12px 14px",marginBottom:8,
                background:customer?.id===c.id?C.blueBg:C.panel,
                border:`1.5px solid ${customer?.id===c.id?C.blue:C.border}`,
                borderRadius:8,cursor:"pointer"
              }}>
              <div style={{textAlign:"left"}}>
                <div style={{color:C.text,fontSize:14,fontWeight:600}}>{c.nombre}</div>
                <div style={{color:C.textMd,fontSize:12}}>
                  NIT: {c.nit}
                  {c.telefono&&` · 📞 ${c.telefono}`}
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                {c.credito&&(
                  <div style={{textAlign:"right"}}>
                    <span style={{background:C.greenBg,color:C.green,fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,display:"block",marginBottom:2}}>CRÉDITO</span>
                    <span style={{color:C.green,fontSize:11}}>
                      Disp: Q {(parseFloat(c.limite_credito||0)-parseFloat(c.saldo_credito||0)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PRECIO MODAL ─────────────────────────────────────────────────────────────
function PrecioModal({ producto, onSelect, onClose, isMobile }) {
  if(!producto) return null;
  const CONDICION_LABEL = {unit:"Precio base",gte:"≥ Mayor o igual a",eq:"= Exactamente",multiple:"× Múltiplo de"};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",width:isMobile?"95vw":"400px",maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <h2 style={{color:"#1E293B",fontSize:17,fontWeight:700,margin:0}}>{producto.nombre}</h2>
            <div style={{color:"#94A3B8",fontSize:12,marginTop:2}}>Selecciona el precio a aplicar</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#94A3B8",fontSize:22,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {producto._precios.map((p,i)=>(
            <button key={p.id} onClick={()=>onSelect(parseFloat(p.precio))}
              style={{padding:"14px 16px",borderRadius:10,cursor:"pointer",textAlign:"left",border:`2px solid ${i===0?"#3B82F6":"#E2E8F0"}`,background:i===0?"#EFF6FF":"#F8F9FB",transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#3B82F6";e.currentTarget.style.background="#EFF6FF";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=i===0?"#3B82F6":"#E2E8F0";e.currentTarget.style.background=i===0?"#EFF6FF":"#F8F9FB";}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{color:"#1E293B",fontWeight:600,fontSize:15}}>{p.nombre}</span>
                <span style={{color:"#16A34A",fontWeight:800,fontSize:22}}>Q {parseFloat(p.precio).toFixed(2)}</span>
              </div>
              {p.condicion!=="unit"&&(
                <div style={{color:"#3B82F6",fontSize:12}}>{CONDICION_LABEL[p.condicion]} {p.cantidad} unidades</div>
              )}
              {i===0&&<div style={{color:"#94A3B8",fontSize:11,marginTop:2}}>Precio unitario estándar</div>}
            </button>
          ))}
        </div>
        <div style={{marginTop:16,textAlign:"center"}}>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#94A3B8",fontSize:13,cursor:"pointer"}}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function POS({ usuario, onLogout }) {
  const bp        = useBreakpoint();
  const isMobile  = bp==="mobile";
  const isTablet  = bp==="tablet";
  const isDesktop = bp==="desktop";

  // Shortcut de permisos para este usuario
  const puedo = (permiso) => tienePermiso(usuario, permiso);

  const [products,          setProducts]          = useState([]);
  const [customers,         setCustomers]         = useState([]);
  const [bancos,            setBancos]            = useState([]);
  const [cart,              setCart]              = useState([]);
  const [customer,          setCustomer]          = useState(null);
  const [search,            setSearch]            = useState("");
  const [category,          setCategory]          = useState("Todas");
  const [activeTab,         setActiveTab]         = useState("pos");
  const [showPayModal,      setShowPayModal]      = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showTicketModal,   setShowTicketModal]   = useState(false);
  const [showConfigModal,   setShowConfigModal]   = useState(false);
  const [showBancosModal,   setShowBancosModal]   = useState(false);
  const [showUsuariosModal, setShowUsuariosModal] = useState(false);
  const [showRolesModal,    setShowRolesModal]    = useState(false);
  const [showProductosModal,setShowProductosModal]= useState(false);
  const [showClientesModal, setShowClientesModal] = useState(false);
  const [showAbonosModal,   setShowAbonosModal]   = useState(false);
  const [showCreditosModal,    setShowCreditosModal]    = useState(false);
  const [showProveedoresModal, setShowProveedoresModal] = useState(false);
  const [showInventarioModal,  setShowInventarioModal]  = useState(false);
  const [modoInventarioAdmin,  setModoInventarioAdmin]  = useState(true);
  const [showPrecioModal,   setShowPrecioModal]   = useState(false);
  const [productoParaPrecio,setProductoParaPrecio]= useState(null);
  const [showSidebar,       setShowSidebar]       = useState(false);
  const [showCart,          setShowCart]          = useState(false);
  const [lastTicket,        setLastTicket]        = useState(null);
  const [salesHistory,      setSalesHistory]      = useState([]);
  const [cajaInfo,          setCajaInfo]          = useState(null);
  const [holdSales,         setHoldSales]         = useState([]);
  const [time,              setTime]              = useState(nowT());
  const [notification,      setNotification]      = useState(null);
  const [loading,           setLoading]           = useState(true);

  const [ivaConfig, setIvaConfig] = useState(()=>{
    try { const s=localStorage.getItem("svpos_iva"); return s?JSON.parse(s):DEFAULT_IVA; }
    catch { return DEFAULT_IVA; }
  });

  useEffect(()=>{
    loadAll();
    const t=setInterval(()=>setTime(nowT()),30000);
    return ()=>clearInterval(t);
  },[]);

  async function loadAll() {
    setLoading(true);
    try {
      const [prods,clients,ventas,caja,bcos]=await Promise.all([
        sb("productos","GET",null,"?activo=eq.true&order=categoria,nombre"),
        sb("clientes","GET",null,"?activo=eq.true&order=nombre"),
        sb("ventas","GET",null,"?order=created_at.desc&limit=50"),
        sb("caja","GET",null,"?order=id.desc&limit=1"),
        sb("bancos","GET",null,"?activo=eq.true&order=nombre"),
      ]);

      // Cargar precios de todos los productos
      const todosPrecios = await sb("producto_precios","GET",null,"?activo=eq.true&order=orden");
      const prodsConPrecios = (prods||[]).map(p=>({
        ...p,
        _precios: (todosPrecios||[]).filter(pr=>pr.producto_id===p.id),
      }));

      setProducts(prodsConPrecios);
      setCustomers(clients||[]);
      setCustomer(clients?.[0]||null);
      setSalesHistory(ventas||[]);
      setCajaInfo(caja?.[0]||null);
      setBancos(bcos||[]);
    } catch { notify("Error conectando a la base de datos","error"); }
    setLoading(false);
  }

  const notify = (msg,type="success") => {
    setNotification({msg,type});
    setTimeout(()=>setNotification(null),3000);
  };

  const saveIvaConfig = (temp) => {
    setIvaConfig(temp);
    localStorage.setItem("svpos_iva",JSON.stringify(temp));
    setShowConfigModal(false);
    notify("Configuración de IVA guardada ✓");
  };

  const categories = ["Todas",...new Set(products.map(p=>p.categoria))];
  const filtered = products.filter(p=>{
    const ms=search===""||p.nombre.toLowerCase().includes(search.toLowerCase())||p.sku.toLowerCase().includes(search.toLowerCase())||(p.codigo_barras||"").includes(search);
    return ms&&(category==="Todas"||p.categoria===category);
  });

  const cartLines  = cart.map(i=>calcLine(i,ivaConfig));
  const cartBase   = cartLines.reduce((s,l)=>s+l.base,0);
  const cartIva    = cartLines.reduce((s,l)=>s+l.ivaMonto,0);
  const cartTotal  = cartLines.reduce((s,l)=>s+l.total,0);
  const hayDesglose= cartLines.some(l=>l.mostrarDesglose);
  const cartCount  = cart.reduce((s,i)=>s+i.qty,0);

  const addToCart = (p) => {
    if(p.stock<=0){notify("Sin stock disponible","error");return;}
    // Si tiene múltiples precios cargados, mostrar selector
    if(p._precios && p._precios.length>1) {
      setProductoParaPrecio(p);
      setShowPrecioModal(true);
      return;
    }
    agregarAlCarrito(p, p.precio);
  };

  const agregarAlCarrito = (p, precioSeleccionado) => {
    setCart(prev=>{
      const ex=prev.find(i=>i.id===p.id&&i.precio===precioSeleccionado);
      if(ex){
        if(ex.qty>=p.stock){notify("Stock insuficiente","error");return prev;}
        return prev.map(i=>i.id===p.id&&i.precio===precioSeleccionado?{...i,qty:i.qty+1}:i);
      }
      return [...prev,{...p,precio:precioSeleccionado,qty:1}];
    });
    if(isMobile) notify(`${p.nombre} agregado`);
    setShowPrecioModal(false);
    setProductoParaPrecio(null);
  };

  const updateQty = (id,delta) => {
    setCart(prev=>prev.map(i=>{
      if(i.id!==id)return i;
      const nq=i.qty+delta;
      if(nq<=0)return null;
      if(nq>i.stock){notify("Stock insuficiente","error");return i;}
      return {...i,qty:nq};
    }).filter(Boolean));
  };

  const removeItem = (id) => setCart(prev=>prev.filter(i=>i.id!==id));

  const holdSale = () => {
    if(cart.length===0)return;
    setHoldSales(prev=>[...prev,{id:Date.now(),cart,customer,time:nowT()}]);
    setCart([]); setCustomer(customers[0]); setShowCart(false);
    notify("Venta en espera");
  };

  const recoverHold = (h) => {
    setCart(h.cart); setCustomer(h.customer);
    setHoldSales(prev=>prev.filter(s=>s.id!==h.id));
  };

  // ── Completar venta desde PayModal
  const completeSale = async (pagos) => {
    try {
      const serie = usuario?.serie_correlativo || "A";

      // ── Correlativo consecutivo
      let correlativo;
      try {
        // Obtener y actualizar el correlativo de esta serie
        const corrData = await sb("correlativos","GET",null,`?serie=eq.${serie}`);
        if (corrData?.length) {
          const siguiente = (corrData[0].ultimo||0) + 1;
          await sb(`correlativos?serie=eq.${serie}`,"PATCH",{ultimo:siguiente});
          correlativo = `${serie}-${String(siguiente).padStart(6,"0")}`;
        } else {
          // Si no existe la serie, crearla
          await sb("correlativos","POST",{serie, ultimo:1});
          correlativo = `${serie}-000001`;
        }
      } catch {
        // Fallback si falla la tabla
        correlativo = `${serie}-${String(Date.now()).slice(-6)}`;
      }

      const metodoResumen = pagos.map(p=>p.metodo).join("+");
      const totalPagado   = pagos.reduce((s,p)=>s+parseFloat(p.monto||0),0);
      const hayCredito    = pagos.some(p=>p.metodo==="credit");
      const montoCredito  = hayCredito ? parseFloat(pagos.find(p=>p.metodo==="credit")?.monto||0) : 0;

      const [venta] = await sb("ventas","POST",{
        correlativo, cliente_id:customer?.id||null,
        subtotal:cartBase, impuesto:cartIva, total:cartTotal,
        metodo_pago:metodoResumen, monto_recibido:totalPagado, cambio:0,
        cajero: usuario?.nombre || "Admin",
        sucursal: usuario?.sucursal || "Principal",
        monto_pagado: hayCredito ? 0 : totalPagado,
        saldo_pendiente: hayCredito ? cartTotal : 0,
      });

      await sb("detalle_ventas","POST",cart.map(item=>({
        venta_id:venta.id, producto_id:item.id, nombre:item.nombre,
        cantidad:item.qty, precio:item.precio, impuesto:item.impuesto,
        subtotal:calcLine(item,ivaConfig).total,
      })));

      for(const item of cart) await sb(`productos?id=eq.${item.id}`,"PATCH",{stock:item.stock-item.qty});

      // ── Si hay crédito, actualizar saldo del cliente
      if(hayCredito && customer?.id) {
        const nuevoSaldo = parseFloat(customer.saldo_credito||0) + montoCredito;
        await sb(`clientes?id=eq.${customer.id}`,"PATCH",{saldo_credito:nuevoSaldo});
        // Actualizar cliente en memoria
        setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,saldo_credito:nuevoSaldo}:c));
        setCustomer(prev=>prev?.id===customer.id?{...prev,saldo_credito:nuevoSaldo}:prev);
      }

      setProducts(prev=>prev.map(p=>{const ic=cart.find(i=>i.id===p.id);return ic?{...p,stock:p.stock-ic.qty}:p;}));
      const ticket={
        correlativo, date:new Date().toLocaleString("es-GT"),
        customer, items:[...cart],
        base:cartBase, iva:cartIva, total:cartTotal,
        ivaConfig:{...ivaConfig}, hayDesglose, pagos,
      };
      setSalesHistory(prev=>[venta,...prev]);
      setLastTicket(ticket);
      setCart([]); setCustomer(customers[0]);
      setShowPayModal(false); setShowCart(false); setShowTicketModal(true);
      notify(`✓ Venta guardada · ${fmt(cartTotal)}`);
    } catch(e){ notify("Error: "+e.message,"error"); throw e; }
  };

  // ── Inline components (sin inputs — no tienen el bug)
  const inputStyle = {background:C.card,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"};
  const btnPrimary = {background:C.blue,color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:"pointer"};
  const btnSecondary= {background:C.card,color:C.textMd,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"};
  const btnDanger   = {background:C.redBg,color:C.red,border:`1.5px solid ${C.redBorder}`,borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"};

  const ivaBadgeLabel = ivaConfig.modo==="incluido_simple"?`IVA ${ivaConfig.porcentaje}% incluido`:ivaConfig.modo==="incluido_desglosado"?`IVA ${ivaConfig.porcentaje}% desglosado`:`IVA ${ivaConfig.porcentaje}% agregado`;
  const ivaBadgeColor = ivaConfig.modo==="incluido_simple"?C.green:ivaConfig.modo==="incluido_desglosado"?C.blue:C.amber;
  const ivaBadgeBg    = ivaConfig.modo==="incluido_simple"?C.greenBg:ivaConfig.modo==="incluido_desglosado"?C.blueBg:C.amberBg;

  const SidebarContent = () => (
    <>
      <div style={{padding:"20px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{color:C.blue,fontSize:13,fontWeight:800,letterSpacing:1}}>SMART VALION</div>
          <div style={{color:C.textSm,fontSize:10,letterSpacing:2,marginTop:2}}>POS · ERP RETAIL</div>
        </div>
        {!isDesktop&&<button onClick={()=>setShowSidebar(false)} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer",padding:"4px 8px"}}>✕</button>}
      </div>
      <nav style={{flex:1,padding:"12px 8px",overflowY:"auto"}}>
        {[{id:"pos",icon:"🛒",label:"Punto de Venta"},{id:"history",icon:"🧾",label:"Historial"},{id:"caja",icon:"💰",label:"Caja"}].map(item=>(
          <button key={item.id} onClick={()=>{setActiveTab(item.id);if(!isDesktop)setShowSidebar(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",marginBottom:4,borderRadius:8,border:"none",background:activeTab===item.id?C.blueBg:"transparent",color:activeTab===item.id?C.blue:C.textMd,fontSize:14,fontWeight:activeTab===item.id?600:400,cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:18}}>{item.icon}</span>{item.label}
          </button>
        ))}
        {puedo("recibir_abonos")&&(
          <button onClick={()=>{setShowCreditosModal(true);if(!isDesktop)setShowSidebar(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",marginBottom:4,borderRadius:8,border:"none",background:"transparent",color:C.textMd,fontSize:14,cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:18}}>💳</span>Pago Créditos
          </button>
        )}
        <div style={{borderTop:`1px solid ${C.border}`,margin:"8px 0"}}/>
        {puedo("catalogo_productos")&&(
          <button onClick={()=>{setShowProductosModal(true);if(!isDesktop)setShowSidebar(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",marginBottom:4,borderRadius:8,border:"none",background:"transparent",color:C.textSm,fontSize:14,cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:18}}>📦</span>Productos
          </button>
        )}
        {puedo("entradas_inventario")&&(
          <button onClick={()=>{setModoInventarioAdmin(puedo("catalogo_productos"));setShowInventarioModal(true);if(!isDesktop)setShowSidebar(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",marginBottom:4,borderRadius:8,border:"none",background:"transparent",color:C.textSm,fontSize:14,cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:18}}>📊</span>Inventario
          </button>
        )}
        {puedo("catalogo_clientes")&&(
          <button onClick={()=>{setShowClientesModal(true);if(!isDesktop)setShowSidebar(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",marginBottom:4,borderRadius:8,border:"none",background:"transparent",color:C.textSm,fontSize:14,cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:18}}>👤</span>Clientes
          </button>
        )}
        {puedo("catalogo_proveedores")&&(
          <button onClick={()=>{setShowProveedoresModal(true);if(!isDesktop)setShowSidebar(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",marginBottom:4,borderRadius:8,border:"none",background:"transparent",color:C.textSm,fontSize:14,cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:18}}>🏭</span>Proveedores
          </button>
        )}
        {puedo("reportes")&&(
          <button onClick={()=>notify("Módulo Reportes — próximamente","info")} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",marginBottom:4,borderRadius:8,border:"none",background:"transparent",color:C.textSm,fontSize:14,cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:18}}>📈</span>Reportes
          </button>
        )}
        <div style={{borderTop:`1px solid ${C.border}`,margin:"8px 0"}}/>
        {puedo("catalogo_bancos")&&(
          <button onClick={()=>{setShowBancosModal(true);if(!isDesktop)setShowSidebar(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",marginBottom:4,borderRadius:8,border:"none",background:"transparent",color:C.textMd,fontSize:14,cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:18}}>🏦</span>Bancos
          </button>
        )}
        {puedo("gestion_usuarios")&&(
          <button onClick={()=>{setShowUsuariosModal(true);if(!isDesktop)setShowSidebar(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",marginBottom:4,borderRadius:8,border:"none",background:"transparent",color:C.textMd,fontSize:14,cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:18}}>👥</span>Usuarios
          </button>
        )}
        {puedo("gestion_usuarios")&&(
          <button onClick={()=>{setShowRolesModal(true);if(!isDesktop)setShowSidebar(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",marginBottom:4,borderRadius:8,border:"none",background:"transparent",color:C.textMd,fontSize:14,cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:18}}>🎭</span>Roles
          </button>
        )}
        {puedo("config_iva")&&(
          <button onClick={()=>{setShowConfigModal(true);if(!isDesktop)setShowSidebar(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",borderRadius:8,border:"none",background:"transparent",color:C.textMd,fontSize:14,cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:18}}>⚙️</span>Configuración
          </button>
        )}
      </nav>
      <div style={{padding:"12px 18px",borderTop:`1px solid ${C.border}`,background:C.panel}}>
        <span style={{fontSize:10,background:ivaBadgeBg,color:ivaBadgeColor,padding:"2px 8px",borderRadius:20,fontWeight:600,display:"inline-block",marginBottom:6}}>{ivaBadgeLabel}</span>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
          <span style={{fontSize:16}}>{ROL_ICON[usuario?.rol]||"👤"}</span>
          <div>
            <div style={{color:C.text,fontSize:12,fontWeight:700}}>{usuario?.nombre||"Admin"}</div>
            <div style={{color:C.textSm,fontSize:10}}>{ROLES[usuario?.rol]||"Admin"} · {usuario?.sucursal||"Principal"}</div>
          </div>
        </div>
        <div style={{color:C.textSm,fontSize:10,marginBottom:8}}>{time} · <span style={{color:C.green}}>●</span> En línea</div>
        <button onClick={onLogout} style={{width:"100%",padding:"6px 0",background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:6,color:C.red,fontSize:12,fontWeight:600,cursor:"pointer"}}>
          🚪 Cerrar sesión
        </button>
      </div>
    </>
  );

  const TopBar = () => (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:C.card,borderBottom:`1px solid ${C.border}`,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",position:"sticky",top:0,zIndex:10}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>setShowSidebar(true)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.textMd,padding:4}}>☰</button>
        <div>
          <div style={{color:C.blue,fontSize:12,fontWeight:800,letterSpacing:1}}>SMART VALION</div>
          <div style={{color:C.textSm,fontSize:9,letterSpacing:1}}>POS · ERP RETAIL</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {holdSales.length>0&&<button onClick={()=>recoverHold(holdSales[0])} style={{...btnSecondary,padding:"6px 10px",fontSize:12}}>⏸ {holdSales.length}</button>}
        {activeTab==="pos"&&(
          <button onClick={()=>setShowCart(true)} style={{background:C.blue,color:"#fff",border:"none",borderRadius:10,padding:"8px 14px",cursor:"pointer",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
            🛒
            {cartCount>0&&<span style={{background:"#fff",color:C.blue,borderRadius:"50%",width:20,height:20,fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{cartCount}</span>}
            {cartCount>0&&<span>{fmt(cartTotal)}</span>}
          </button>
        )}
      </div>
    </div>
  );

  const BottomNav = () => (
    <div style={{display:"flex",background:C.card,borderTop:`1px solid ${C.border}`,position:"fixed",bottom:0,left:0,right:0,zIndex:10,boxShadow:"0 -2px 8px rgba(0,0,0,0.06)"}}>
      {[{id:"pos",icon:"🛒",label:"Venta"},{id:"history",icon:"🧾",label:"Historial"},{id:"caja",icon:"💰",label:"Caja"}].map(item=>(
        <button key={item.id} onClick={()=>setActiveTab(item.id)} style={{flex:1,padding:"10px 4px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <span style={{fontSize:20}}>{item.icon}</span>
          <span style={{fontSize:10,color:activeTab===item.id?C.blue:C.textSm,fontWeight:activeTab===item.id?700:400}}>{item.label}</span>
        </button>
      ))}
    </div>
  );

  const CartItems = ({mobile=false}) => (
    <>
      {cart.length===0?(
        <div style={{textAlign:"center",color:C.textSm,padding:"40px 20px"}}>
          <div style={{fontSize:36,marginBottom:8}}>🛒</div>
          <div style={{fontSize:13}}>{mobile?"El carrito está vacío":"Toca un producto para agregar"}</div>
        </div>
      ):cart.map(item=>{
        const l=calcLine(item,ivaConfig);
        return(
          <div key={item.id} style={{padding:mobile?"12px 16px":"10px 16px",borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1,marginRight:8}}>
                <div style={{color:C.text,fontSize:mobile?14:13,fontWeight:500,lineHeight:1.3}}>{item.nombre}</div>
                <div style={{color:C.textSm,fontSize:11,marginTop:2}}>{fmt(item.precio)} c/u</div>
              </div>
              <button onClick={()=>removeItem(item.id)} style={{color:C.textSm,background:"none",border:"none",cursor:"pointer",fontSize:mobile?20:16,padding:2}}>✕</button>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:8}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <button onClick={()=>updateQty(item.id,-1)} style={{width:mobile?36:30,height:mobile?36:30,borderRadius:6,background:C.panel,border:`1px solid ${C.border}`,color:C.textMd,cursor:"pointer",fontSize:mobile?20:18}}>−</button>
                <span style={{color:C.text,fontSize:mobile?16:14,fontWeight:700,width:mobile?36:28,textAlign:"center"}}>{item.qty}</span>
                <button onClick={()=>updateQty(item.id,1)} style={{width:mobile?36:30,height:mobile?36:30,borderRadius:6,background:C.panel,border:`1px solid ${C.border}`,color:C.textMd,cursor:"pointer",fontSize:mobile?20:18}}>+</button>
              </div>
              <span style={{color:C.green,fontWeight:700,fontSize:mobile?17:15}}>{fmt(l.total)}</span>
            </div>
          </div>
        );
      })}
    </>
  );

  const CartFooter = ({mobile=false}) => (
    <div style={{padding:16,borderTop:`1px solid ${C.border}`,background:C.panel,paddingBottom:mobile?24:16}}>
      {hayDesglose&&(
        <>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{color:C.textMd,fontSize:12}}>Base</span>
            <span style={{color:C.textMd,fontSize:12}}>{fmt(cartBase)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{color:C.textMd,fontSize:12}}>IVA {ivaConfig.porcentaje}%</span>
            <span style={{color:C.textMd,fontSize:12}}>{fmt(cartIva)}</span>
          </div>
        </>
      )}
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14,paddingTop:hayDesglose?8:0,borderTop:hayDesglose?`1px solid ${C.border}`:"none"}}>
        <span style={{color:C.text,fontSize:mobile?20:18,fontWeight:700}}>Total</span>
        <span style={{color:C.green,fontSize:mobile?26:24,fontWeight:800}}>{fmt(cartTotal)}</span>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <button onClick={holdSale} disabled={cart.length===0} style={{...btnSecondary,flex:1,padding:mobile?12:10,opacity:cart.length===0?0.4:1}}>⏸ Espera</button>
        <button onClick={()=>{setCart([]);setCustomer(customers[0]);}} disabled={cart.length===0} style={{...btnDanger,padding:mobile?"12px 16px":"10px 14px",opacity:cart.length===0?0.4:1}}>🗑</button>
      </div>
      <button onClick={()=>cart.length>0&&setShowPayModal(true)} disabled={cart.length===0}
        style={{...btnPrimary,width:"100%",padding:mobile?16:14,fontSize:mobile?17:16,fontWeight:700,borderRadius:10,opacity:cart.length===0?0.4:1}}>
        💳 {mobile?`Cobrar ${fmt(cartTotal)}`:"Cobrar"}
      </button>
    </div>
  );

  const CartPanel = () => (
    <div style={{position:"fixed",inset:0,zIndex:150}}>
      <div onClick={()=>setShowCart(false)} style={{position:"absolute",inset:0,background:C.overlay}}/>
      <div style={{position:"absolute",bottom:0,left:0,right:0,background:C.card,borderRadius:"20px 20px 0 0",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 -8px 32px rgba(0,0,0,0.15)"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}>
          <div style={{width:40,height:4,borderRadius:2,background:C.border}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px 12px"}}>
          <h2 style={{color:C.text,fontSize:16,fontWeight:700,margin:0}}>Carrito</h2>
          <button onClick={()=>setShowCart(false)} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer",padding:"4px 8px"}}>✕</button>
        </div>
        <button onClick={()=>setShowCustomerModal(true)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:C.panel,border:"none",borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>
          <div style={{textAlign:"left"}}>
            <div style={{color:C.textSm,fontSize:10,marginBottom:2}}>CLIENTE</div>
            <div style={{color:C.text,fontSize:14,fontWeight:600}}>{customer?.nombre||"Consumidor Final"}</div>
          </div>
          <span style={{color:C.blue,fontSize:18}}>›</span>
        </button>
        <div style={{flex:1,overflowY:"auto"}}><CartItems mobile/></div>
        <CartFooter mobile/>
      </div>
    </div>
  );

  const CartSidebar = () => (
    <div style={{width:isTablet?300:330,background:C.card,borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",boxShadow:"-2px 0 8px rgba(0,0,0,0.04)"}}>
      <button onClick={()=>setShowCustomerModal(true)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:C.panel,border:"none",borderBottom:`1px solid ${C.border}`,cursor:"pointer",width:"100%"}}>
        <div style={{textAlign:"left"}}>
          <div style={{color:C.textSm,fontSize:10,marginBottom:2}}>CLIENTE</div>
          <div style={{color:C.text,fontSize:14,fontWeight:600}}>{customer?.nombre||"Consumidor Final"}</div>
        </div>
        <span style={{color:C.blue,fontSize:18}}>›</span>
      </button>
      <div style={{flex:1,overflowY:"auto"}}><CartItems/></div>
      <CartFooter/>
    </div>
  );

  const ProductGrid = () => (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:isMobile?"10px 12px":"14px 18px",borderBottom:`1px solid ${C.border}`,background:C.card}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Buscar nombre, SKU o código..."
          style={{...inputStyle,marginBottom:10,fontSize:isMobile?16:14}}/>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {categories.map(cat=>(
            <button key={cat} onClick={()=>setCategory(cat)} style={{padding:isMobile?"6px 12px":"4px 12px",borderRadius:20,border:`1.5px solid ${category===cat?C.blue:C.border}`,background:category===cat?C.blueBg:C.card,color:category===cat?C.blue:C.textMd,fontSize:isMobile?13:12,cursor:"pointer",fontWeight:category===cat?600:400}}>
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:isMobile?10:16,background:C.bg,paddingBottom:isMobile?80:16}}>
        {filtered.length===0?(
          <div style={{textAlign:"center",color:C.textSm,padding:60}}>
            <div style={{fontSize:36,marginBottom:12}}>📦</div>
            <div>No se encontraron productos</div>
          </div>
        ):(
          <div style={{display:"grid",gap:isMobile?8:10,gridTemplateColumns:isMobile?"repeat(2,1fr)":isTablet?"repeat(3,1fr)":"repeat(auto-fill,minmax(155px,1fr))"}}>
            {filtered.map(p=>(
              <button key={p.id} onClick={()=>addToCart(p)}
                style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:10,padding:isMobile?12:14,cursor:p.stock>0?"pointer":"not-allowed",textAlign:"left",opacity:p.stock===0?0.45:1,boxShadow:"0 1px 3px rgba(0,0,0,0.05)",transition:"all 0.15s"}}
                onMouseEnter={e=>{if(p.stock>0){e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.boxShadow="0 4px 12px rgba(59,130,246,0.15)";}}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.05)";}}>
                <div style={{fontSize:isMobile?28:26,marginBottom:6}}>{CAT_ICONS[p.categoria]||"📦"}</div>
                <div style={{color:C.text,fontSize:13,fontWeight:600,marginBottom:3,lineHeight:1.3}}>{p.nombre}</div>
                <div style={{color:C.textSm,fontSize:10,marginBottom:4}}>{p.sku}</div>
                <div style={{color:C.green,fontSize:isMobile?17:16,fontWeight:700}}>{fmt(p.precio)}</div>
                <div style={{color:p.stock<10?C.amber:C.textSm,fontSize:10,marginTop:3}}>Stock: {p.stock}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const HistoryTab = () => (
    <div style={{padding:isMobile?12:24,paddingBottom:isMobile?80:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{color:C.text,fontSize:18,fontWeight:700}}>Historial</h2>
        <button onClick={loadAll} style={{...btnSecondary,fontSize:12,padding:"6px 12px"}}>🔄</button>
      </div>
      {salesHistory.length===0?(
        <div style={{textAlign:"center",color:C.textSm,padding:60,background:C.card,borderRadius:12,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:40,marginBottom:12}}>🧾</div>
          <div style={{fontSize:15,color:C.textMd}}>No hay ventas registradas</div>
        </div>
      ):salesHistory.map((s,i)=>(
        <div key={s.id||i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:16,marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{color:C.blue,fontWeight:700,fontSize:15}}>{s.correlativo||`#${s.id}`}</span>
            <span style={{color:C.green,fontWeight:700,fontSize:16}}>{fmt(s.total)}</span>
          </div>
          <div style={{color:C.textSm,fontSize:12,marginTop:4}}>{new Date(s.created_at).toLocaleString("es-GT")}</div>
          <div style={{color:C.textMd,fontSize:13,marginTop:4}}>{s.metodo_pago}</div>
        </div>
      ))}
    </div>
  );

  const CajaTab = () => {
    const totalEfectivo = salesHistory.filter(v=>v.metodo_pago==="cash"||v.metodo_pago?.includes("cash")).reduce((s,v)=>s+parseFloat(v.total||0),0);
    const totalTransfer = salesHistory.filter(v=>v.metodo_pago==="transfer"||v.metodo_pago?.includes("transfer")).reduce((s,v)=>s+parseFloat(v.total||0),0);
    const totalTarjeta  = salesHistory.filter(v=>v.metodo_pago==="card"||v.metodo_pago?.includes("card")).reduce((s,v)=>s+parseFloat(v.total||0),0);
    const totalCredito  = salesHistory.filter(v=>v.metodo_pago==="credit"||v.metodo_pago?.includes("credit")).reduce((s,v)=>s+parseFloat(v.total||0),0);
    const fondo = parseFloat(cajaInfo?.fondo||500);
    const totalVentas = totalEfectivo+totalTransfer+totalTarjeta+totalCredito;
    return(
      <div style={{padding:isMobile?12:24,paddingBottom:isMobile?80:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{color:C.text,fontSize:18,fontWeight:700}}>Corte de Caja</h2>
          <button onClick={loadAll} style={{...btnSecondary,fontSize:12,padding:"6px 12px"}}>🔄</button>
        </div>
        {/* Resumen general */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          {[
            {label:"Fondo inicial",   value:fmt(fondo),       color:C.textMd},
            {label:"Total ventas",    value:fmt(totalVentas), color:C.blue},
            {label:"Total esperado",  value:fmt(fondo+totalEfectivo), color:C.green},
            {label:"Estado",          value:cajaInfo?.estado==="abierta"?"Abierta":"Cerrada", color:cajaInfo?.estado==="abierta"?C.green:C.red},
          ].map(item=>(
            <div key={item.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:16}}>
              <div style={{color:C.textSm,fontSize:12,marginBottom:4}}>{item.label}</div>
              <div style={{color:item.color,fontSize:20,fontWeight:700}}>{item.value}</div>
            </div>
          ))}
        </div>
        {/* Desglose por método */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:16,marginBottom:16}}>
          <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>Desglose por método de pago</div>
          {[
            {label:"💵 Efectivo",      value:totalEfectivo, note:"En caja física"},
            {label:"🏦 Transferencia", value:totalTransfer, note:"En cuenta bancaria"},
            {label:"💳 Tarjeta",       value:totalTarjeta,  note:"En terminal"},
            {label:"📋 Crédito",       value:totalCredito,  note:"Por cobrar"},
          ].map(item=>(
            <div key={item.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
              <div>
                <span style={{color:C.text,fontSize:13}}>{item.label}</span>
                <span style={{color:C.textSm,fontSize:11,marginLeft:8}}>{item.note}</span>
              </div>
              <span style={{color:item.value>0?C.text:C.textSm,fontWeight:item.value>0?700:400,fontSize:14}}>{fmt(item.value)}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:10,marginTop:4}}>
            <span style={{color:C.text,fontSize:14,fontWeight:700}}>Total ventas</span>
            <span style={{color:C.blue,fontSize:16,fontWeight:800}}>{fmt(totalVentas)}</span>
          </div>
        </div>
        {/* Efectivo esperado en caja */}
        <div style={{background:C.greenBg,border:"1px solid #BBF7D0",borderRadius:10,padding:16}}>
          <div style={{color:C.green,fontSize:13,fontWeight:600,marginBottom:8}}>💵 Efectivo esperado en caja</div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{color:C.textMd,fontSize:13}}>Fondo inicial</span>
            <span style={{color:C.text,fontSize:13}}>{fmt(fondo)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{color:C.textMd,fontSize:13}}>Ventas en efectivo</span>
            <span style={{color:C.text,fontSize:13}}>{fmt(totalEfectivo)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid #BBF7D0",marginTop:4}}>
            <span style={{color:C.green,fontSize:15,fontWeight:700}}>Total en caja</span>
            <span style={{color:C.green,fontSize:18,fontWeight:800}}>{fmt(fondo+totalEfectivo)}</span>
          </div>
        </div>
      </div>
    );
  };

  if(loading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,flexDirection:"column",gap:16}}>
      <div style={{fontSize:40}}>⚡</div>
      <div style={{color:C.blue,fontSize:16,fontWeight:600}}>Smart Valion POS</div>
      <div style={{color:C.textSm,fontSize:13}}>Conectando...</div>
    </div>
  );

  return(
    <div style={{display:"flex",height:"100vh",background:C.bg,fontFamily:"Inter,system-ui,sans-serif",overflow:"hidden"}}>

      {isDesktop&&(
        <div style={{width:210,background:C.sidebar,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,boxShadow:"2px 0 8px rgba(0,0,0,0.04)"}}>
          <SidebarContent/>
        </div>
      )}

      {!isDesktop&&showSidebar&&(
        <div style={{position:"fixed",inset:0,zIndex:300}}>
          <div onClick={()=>setShowSidebar(false)} style={{position:"absolute",inset:0,background:C.overlay}}/>
          <div style={{position:"absolute",left:0,top:0,bottom:0,width:260,background:C.sidebar,display:"flex",flexDirection:"column",boxShadow:"4px 0 20px rgba(0,0,0,0.15)"}}>
            <SidebarContent/>
          </div>
        </div>
      )}

      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {!isDesktop&&<TopBar/>}
        {activeTab!=="pos"?(
          <div style={{flex:1,overflowY:"auto"}}>
            {activeTab==="history"&&<HistoryTab/>}
            {activeTab==="caja"&&<CajaTab/>}
          </div>
        ):(
          <div style={{flex:1,display:"flex",overflow:"hidden"}}>
            <ProductGrid/>
            {!isMobile&&<CartSidebar/>}
          </div>
        )}
        {isMobile&&<BottomNav/>}
      </div>

      {isMobile&&showCart&&<CartPanel/>}

      {/* Modales externos — sin bug de foco */}
      {showPrecioModal&&productoParaPrecio&&(
        <PrecioModal
          producto={productoParaPrecio}
          onSelect={(precio)=>agregarAlCarrito(productoParaPrecio,precio)}
          onClose={()=>{setShowPrecioModal(false);setProductoParaPrecio(null);}}
          isMobile={isMobile}
        />
      )}
      {showPayModal&&(
        <PayModal
          cartTotal={cartTotal} cartBase={cartBase} cartIva={cartIva}
          hayDesglose={hayDesglose} cart={cart} ivaConfig={ivaConfig}
          bancos={bancos} customer={customer}
          onClose={()=>setShowPayModal(false)}
          onComplete={completeSale}
          isMobile={isMobile}
        />
      )}
      {showCustomerModal&&(
        <CustomerModal
          customers={customers} customer={customer}
          onSelect={(c)=>{setCustomer(c);setShowCustomerModal(false);notify(`Cliente: ${c.nombre}`);}}
          onClose={()=>setShowCustomerModal(false)}
          isMobile={isMobile}
        />
      )}
      {showTicketModal&&(
        <TicketModal
          ticket={lastTicket} bancos={bancos}
          onClose={()=>setShowTicketModal(false)}
          isMobile={isMobile}
        />
      )}
      {showConfigModal&&(
        <ConfigModal
          ivaConfig={ivaConfig}
          onSave={saveIvaConfig}
          onClose={()=>setShowConfigModal(false)}
          isMobile={isMobile}
        />
      )}
      {showBancosModal&&(
        <BancosModal
          bancos={bancos} setBancos={setBancos}
          onClose={()=>setShowBancosModal(false)}
          isMobile={isMobile}
        />
      )}
      {showUsuariosModal&&puedo("gestion_usuarios")&&(
        <UsuariosModal
          usuarioActual={usuario}
          isMobile={isMobile}
          onClose={()=>setShowUsuariosModal(false)}
        />
      )}
      {showProductosModal&&puedo("catalogo_productos")&&(
        <ProductosModal isMobile={isMobile} onClose={()=>{setShowProductosModal(false);loadAll();}}/>
      )}
      {showClientesModal&&puedo("catalogo_clientes")&&(
        <ClientesModal isMobile={isMobile} onClose={()=>{setShowClientesModal(false);loadAll();}}/>
      )}
      {showInventarioModal&&puedo("entradas_inventario")&&(
        <InventarioModal isMobile={isMobile} usuario={usuario} modoAdmin={modoInventarioAdmin} onClose={()=>{setShowInventarioModal(false);loadAll();}}/>
      )}
      {showProveedoresModal&&puedo("catalogo_proveedores")&&(
        <ProveedoresModal isMobile={isMobile} onClose={()=>setShowProveedoresModal(false)}/>
      )}
      {showCreditosModal&&puedo("recibir_abonos")&&(
        <CreditosModal isMobile={isMobile} usuario={usuario} onClose={()=>{setShowCreditosModal(false);loadAll();}}/>
      )}
      {showRolesModal&&puedo("gestion_usuarios")&&(
        <RolesModal
          usuarioActual={usuario}
          isMobile={isMobile}
          onClose={()=>setShowRolesModal(false)}
        />
      )}

      {isMobile&&activeTab==="pos"&&!showCart&&(
        <button onClick={()=>setShowCart(true)} style={{position:"fixed",bottom:70,right:16,zIndex:50,background:C.blue,color:"#fff",border:"none",borderRadius:20,padding:"12px 20px",boxShadow:"0 4px 16px rgba(59,130,246,0.4)",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
          🛒 {cartCount>0&&<span style={{background:"#fff",color:C.blue,borderRadius:"50%",width:22,height:22,fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{cartCount}</span>}
          {cartCount>0?fmt(cartTotal):"Carrito"}
        </button>
      )}

      {notification&&(
        <div style={{position:"fixed",bottom:isMobile?80:24,left:"50%",transform:"translateX(-50%)",background:notification.type==="error"?C.redBg:notification.type==="info"?C.blueBg:C.greenBg,border:`1px solid ${notification.type==="error"?C.redBorder:notification.type==="info"?C.blueBorder:"#BBF7D0"}`,color:notification.type==="error"?C.red:notification.type==="info"?C.blue:C.green,padding:"10px 20px",borderRadius:10,fontSize:14,fontWeight:500,zIndex:9999,boxShadow:"0 8px 32px rgba(0,0,0,0.12)",whiteSpace:"nowrap"}}>
          {notification.msg}
        </div>
      )}
    </div>
  );
}
