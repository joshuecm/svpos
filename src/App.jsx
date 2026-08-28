import React, { useState, useEffect, useRef } from "react";
import { tienePermiso, ROLES, ROL_COLOR, ROL_BG, ROL_ICON } from "./usuarios.js";
import UsuariosModal from "./UsuariosModal.jsx";
import RolesModal from "./RolesModal.jsx";
import ProductosModal from "./ProductosModal.jsx";
import ClientesModal from "./ClientesModal.jsx";
import AbonosModal from "./AbonosModal.jsx";
import CreditosModal from "./CreditosModal.jsx";
import ProveedoresModal from "./ProveedoresModal.jsx";
import InventarioModal from "./InventarioModal.jsx";
import CombosModal from "./CombosModal.jsx";
import CajaModal, { AperturaCaja } from "./CajaModal.jsx";
import AnulacionModal from "./AnulacionModal.jsx";

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
const BG = {background:"#16A34A",color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:"pointer"};
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
              <div key={`${item.id}-${item.precio}`} style={{marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:C.textMd,fontSize:12,flex:1}}>{item._esCombo?"🎁 ":""}{item.nombre}</span>
                  <span style={{color:C.textSm,fontSize:12,width:36,textAlign:"center"}}>x{item.qty}</span>
                  <span style={{color:C.text,fontSize:12,width:72,textAlign:"right"}}>{fmt(l.total)}</span>
                </div>
                {item._esCombo&&item._comp?.length>0&&(
                  <div style={{paddingLeft:8,marginTop:2}}>
                    {item._comp.map((cp,ci)=>(
                      <div key={ci} style={{color:C.textSm,fontSize:10}}>
                        └ {cp.cantidad}x {cp._nombre||`Producto ${cp.producto_id}`}
                      </div>
                    ))}
                  </div>
                )}
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

// ─── REIMPRESION MODAL ────────────────────────────────────────────────────────
function ReimpresionModal({ venta, customers, ivaConfig, onClose }) {
  const fmt2 = (n) => `Q ${Number(n||0).toFixed(2)}`;
  const [detalles, setDetalles] = useState([]);

  useEffect(()=>{
    const cargar = async () => {
      try {
        const d = await fetch(`https://rztujbaunmeqhgrxugth.supabase.co/rest/v1/detalle_ventas?venta_id=eq.${venta.id}`,{
          headers:{"apikey":"sb_publishable_-BLot_F7KegMytm1jJ9jYg_n0SR2Q-q","Authorization":"Bearer sb_publishable_-BLot_F7KegMytm1jJ9jYg_n0SR2Q-q"}
        }).then(r=>r.json());
        setDetalles(d||[]);
      } catch {}
    };
    cargar();
  },[venta.id]);

  const cliente = customers.find(c=>c.id===venta.cliente_id);
  const metodos = {cash:"Efectivo",card:"Tarjeta",transfer:"Transferencia",credit:"Crédito"};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,backdropFilter:"blur(3px)"}}>
      <div style={{background:"#fff",borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",width:"400px",maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto",padding:24}}>
        <div style={{fontFamily:"'Courier New',monospace"}}>
          <div style={{textAlign:"center",borderBottom:"1px dashed #E2E8F0",paddingBottom:12,marginBottom:12}}>
            {venta.anulada&&<div style={{background:"#DC2626",color:"#fff",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:700,marginBottom:6}}>*** FACTURA ANULADA ***</div>}
            <div style={{fontSize:11,color:"#94A3B8",letterSpacing:2}}>COMPROBANTE DE VENTA</div>
            <div style={{fontSize:18,fontWeight:700,color:"#1E293B",fontFamily:"Inter,sans-serif"}}>Smart Valion POS</div>
            <div style={{fontSize:11,color:"#475569"}}>{venta.sucursal||"Principal"}</div>
            <div style={{fontSize:11,color:"#475569"}}>{venta?.created_at ? new Date(venta.created_at).toLocaleString("es-GT") : ""}</div>
          </div>
          {[
            {label:"Factura", value:venta.correlativo},
            {label:"Cliente", value:cliente?.nombre||"Mostrador"},
            {label:"Cajero",  value:venta.cajero},
            {label:"Pago",    value:(venta.metodo_pago||"").split("+").map(m=>metodos[m]||m).join(" + ")},
          ].map(s=>(
            <div key={s.label} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{color:"#475569",fontSize:12}}>{s.label}</span>
              <span style={{color:"#1E293B",fontSize:12,fontWeight:600}}>{s.value}</span>
            </div>
          ))}
          <div style={{borderTop:"1px dashed #E2E8F0",paddingTop:10,marginTop:8,marginBottom:10}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:4,marginBottom:6,paddingBottom:4,borderBottom:"1px solid #E2E8F0"}}>
              {["Producto","Cant.","Total"].map(h=><span key={h} style={{color:"#94A3B8",fontSize:10,fontWeight:600}}>{h}</span>)}
            </div>
            {detalles.map((d,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:4,marginBottom:4}}>
                <span style={{color:"#1E293B",fontSize:11}}>{d.nombre}</span>
                <span style={{color:"#475569",fontSize:11,textAlign:"center"}}>{d.cantidad}</span>
                <span style={{color:"#1E293B",fontSize:11,textAlign:"right"}}>{fmt2(d.subtotal)}</span>
              </div>
            ))}
          </div>
          <div style={{borderTop:"1px dashed #E2E8F0",paddingTop:8,marginBottom:16}}>
            {[
              {label:"Subtotal", value:fmt2(venta.subtotal)},
              {label:"IVA 12%",  value:fmt2(venta.impuesto)},
            ].map(s=>(
              <div key={s.label} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{color:"#475569",fontSize:12}}>{s.label}</span>
                <span style={{color:"#1E293B",fontSize:12}}>{s.value}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:6,borderTop:"1px dashed #E2E8F0",marginTop:4}}>
              <span style={{color:"#1E293B",fontSize:14,fontWeight:700}}>TOTAL</span>
              <span style={{color:"#3B82F6",fontSize:16,fontWeight:700}}>{fmt2(venta.total)}</span>
            </div>
          </div>
          <div style={{textAlign:"center",color:"#94A3B8",fontSize:10,marginBottom:16}}>*** Copia de comprobante ***</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>window.print()} style={{flex:1,padding:10,borderRadius:8,border:"1.5px solid #E2E8F0",background:"#fff",color:"#475569",fontSize:13,cursor:"pointer"}}>🖨️ Imprimir</button>
            <button onClick={onClose} style={{flex:1,padding:10,borderRadius:8,border:"none",background:"#3B82F6",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>✓ Cerrar</button>
          </div>
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
  const [empresaConfig,        setEmpresaConfig]        = useState({nombre:"Smart Valion POS",nit:"",mensaje_ticket:"Gracias por su compra"});
  const [cajaActual,           setCajaActual]           = useState(null);
  const [showAperturaCaja,     setShowAperturaCaja]     = useState(false);
  const [showCombosModal,      setShowCombosModal]      = useState(false);
  const [ticketCierre,         setTicketCierre]         = useState(null);
  const [ventaAnular,          setVentaAnular]          = useState(null);
  const [ventaReimprimir,      setVentaReimprimir]      = useState(null);
  const [opOpen,               setOpOpen]               = useState(false);

  const [combos,               setCombos]               = useState([]);
  const [modoInventarioAdmin,  setModoInventarioAdmin]  = useState(true);
  const [showPrecioModal,   setShowPrecioModal]   = useState(false);
  const [productoParaPrecio,setProductoParaPrecio]= useState(null);
  const [showSidebar,       setShowSidebar]       = useState(false);
  const [showCart,          setShowCart]          = useState(false);
  const [lastTicket,        setLastTicket]        = useState(null);
  const [salesHistory,      setSalesHistory]      = useState([]);
  const [cajaInfo,          setCajaInfo]          = useState(null);
  const [holdSales,         setHoldSales]         = useState([]);
  const [showHoldPanel,     setShowHoldPanel]     = useState(false);
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
      const [prods,clients,ventas,caja,bcos,cats,cbs]=await Promise.all([
        sb("productos","GET",null,"?activo=eq.true&order=categoria,nombre"),
        sb("clientes","GET",null,"?activo=eq.true&order=nombre"),
        sb("ventas","GET",null,"?order=created_at.desc&limit=50"),
        sb("cajas","GET",null,"?order=id.desc&limit=1"),
        sb("bancos","GET",null,"?activo=eq.true&order=nombre"),
        sb("categorias","GET",null,"?activo=eq.true&order=nombre"),
        sb("combos","GET",null,"?activo=eq.true&order=nombre"),
      ]);
      // Cargar empresa por separado para no afectar el resto si falla
      try {
        const empConf = await sb("configuracion_empresa","GET",null,"?limit=1");
        if(empConf?.[0]) setEmpresaConfig(empConf[0]);
      } catch(e){ console.warn("Config empresa no disponible:", e.message); }

      const todosPrecios   = await sb("producto_precios","GET",null,"?activo=eq.true&order=orden");
      const todosComp      = await sb("combo_productos","GET",null,"?order=combo_id");
      const catIconMap     = Object.fromEntries((cats||[]).map(c=>[c.nombre,c.icono||"📦"]));

      const prodsConPrecios = (prods||[]).map(p=>({
        ...p,
        _precios: (todosPrecios||[]).filter(pr=>pr.producto_id===p.id),
        _icono:   catIconMap[p.categoria]||"📦",
      }));

      // Calcular stock de combos basado en componentes
      const combosConStock = (cbs||[]).map(c=>{
        const comp = (todosComp||[]).filter(cp=>cp.combo_id===c.id);
        const stocks = comp.map(cp=>{
          const prod = (prods||[]).find(p=>p.id===cp.producto_id);
          return prod ? Math.floor(parseFloat(prod.stock||0)/parseFloat(cp.cantidad||1)) : 0;
        });
        const stockPorComp = stocks.length ? Math.min(...stocks) : 0;
        const stock = c.stock_max ? Math.min(stockPorComp, parseInt(c.stock_max)) : stockPorComp;
        return {...c, stock, _comp:comp, _esCombo:true, _icono:"🎁",
          categoria: c.categoria||"Promociones",
          impuesto: parseFloat(c.impuesto||0),
        };
      });

      setProducts(prodsConPrecios);
      setCombos(combosConStock);
      setCategoriasBD(cats||[]);
      setCustomers(clients||[]);
      setCustomer(clients?.[0]||null);
      setSalesHistory((ventas||[]).filter(v=>v&&v.id));
      setCajaInfo(caja?.[0]||null);
      setBancos(bcos||[]);

      // Cargar caja activa del cajero
      if(usuario?.nombre) {
        const cajaAbierta = await sb("cajas","GET",null,
          `?cajero=eq.${encodeURIComponent(usuario.nombre)}&estado=eq.abierta&order=created_at.desc&limit=1`
        );
        setCajaActual(cajaAbierta?.length ? cajaAbierta[0] : null);
      }
    } catch { notify("Error conectando a la base de datos","error"); }
    setLoading(false);
  }



  // Recargar detalle de caja cuando cambia la caja o la pestaña activa


  const cerrarCajaFinal = async () => {
    if(!ticketCierre||!cajaActual) return;
    try {
      await sb(`cajas?id=eq.${cajaActual.id}`,"PATCH",{
        estado:             "cerrada",
        efectivo_declarado: ticketCierre.efectivoDecl,
        observaciones:      ticketCierre.observaciones||null,
        cerrada_at:         new Date().toISOString(),
      });
      setTicketCierre(prev=>({...prev, _preview:false}));
      setCajaActual(null);
      notify("Caja cerrada correctamente");
      await loadAll();
    } catch(e){ notify("Error al cerrar caja: "+e.message,"error"); }
  };

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

  // Categorías dinámicas desde BD + las que tienen productos/combos
  const [categoriasBD, setCategoriasBD] = useState([]);

  const categories = [
    {nombre:"Todas", icono:"🏷️"},
    ...categoriasBD,
    // Agregar "Promociones" si hay combos y no está en la BD
    ...(combos.length>0&&!categoriasBD.find(c=>c.nombre==="Promociones")
      ? [{nombre:"Promociones",icono:"🎁"}] : []),
  ];
  const filtered = [
    ...products,
    ...combos,
  ].filter(p=>{
    const ms=search===""||p.nombre.toLowerCase().includes(search.toLowerCase())||(p.sku||"").toLowerCase().includes(search.toLowerCase())||(p.codigo_barras||"").includes(search);
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
    // Verificar que hay caja abierta
    if(!cajaActual) {
      notify("Debes abrir la caja antes de registrar ventas","error");
      setShowPayModal(false);
      return;
    }
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

      // Actualizar stock — productos normales y componentes de combos
      for(const item of cart) {
        if(item._esCombo) {
          // Descontar cada componente del combo
          for(const comp of (item._comp||[])) {
            const prod = products.find(p=>p.id===comp.producto_id);
            if(prod) {
              await sb(`productos?id=eq.${comp.producto_id}`,"PATCH",{
                stock: Math.max(0, parseFloat(prod.stock||0) - parseFloat(comp.cantidad||1)*item.qty)
              });
            }
          }
        } else {
          await sb(`productos?id=eq.${item.id}`,"PATCH",{stock:item.stock-item.qty});
        }
      }

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
        customer, items:cart.map(item=>({
          ...item,
          _comp: item._esCombo ? item._comp?.map(cp=>({
            ...cp,
            _nombre: products.find(p=>p.id===cp.producto_id)?.nombre||`Producto ${cp.producto_id}`,
          })) : undefined,
        })),
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

  const SidebarContent = () => {
    return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"20px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{color:C.blue,fontSize:13,fontWeight:800,letterSpacing:1}}>SMART VALION</div>
          <div style={{color:C.textSm,fontSize:10,letterSpacing:2,marginTop:2}}>POS · ERP RETAIL</div>
        </div>
        {!isDesktop&&<button onClick={()=>setShowSidebar(false)} style={{background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer",padding:"4px 8px"}}>✕</button>}
      </div>
      <nav style={{flex:1,padding:"12px 8px",overflowY:"auto"}}>
        <button onClick={()=>{setActiveTab("pos");if(!isDesktop)setShowSidebar(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",marginBottom:4,borderRadius:8,border:"none",background:activeTab==="pos"?C.blueBg:"transparent",color:activeTab==="pos"?C.blue:C.textMd,fontSize:14,fontWeight:activeTab==="pos"?600:400,cursor:"pointer",textAlign:"left"}}>
          <span style={{fontSize:18}}>🛒</span>Punto de Venta
        </button>

        {/* ── OPERACIONES (desplegable) ── */}
        <button onClick={()=>setOpOpen(p=>!p)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"11px 12px",marginBottom:4,borderRadius:8,border:"none",background:opOpen?C.blueBg:"transparent",color:opOpen?C.blue:C.textMd,fontSize:14,fontWeight:opOpen?600:400,cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>⚙️</span>Operaciones
          </div>
          <span style={{fontSize:12,color:C.textSm}}>{opOpen?"▲":"▼"}</span>
        </button>
        {opOpen&&(
          <div style={{marginLeft:12,marginBottom:4,borderLeft:`2px solid ${C.border}`,paddingLeft:8}}>
            <button onClick={()=>{setActiveTab("caja");if(!isDesktop)setShowSidebar(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 10px",marginBottom:2,borderRadius:8,border:"none",background:activeTab==="caja"?C.blueBg:"transparent",color:activeTab==="caja"?C.blue:C.textMd,fontSize:13,fontWeight:activeTab==="caja"?600:400,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:16}}>💰</span>Caja
            </button>
            {puedo("recibir_abonos")&&(
              <button onClick={()=>{setShowCreditosModal(true);if(!isDesktop)setShowSidebar(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 10px",marginBottom:2,borderRadius:8,border:"none",background:"transparent",color:C.textMd,fontSize:13,cursor:"pointer",textAlign:"left"}}>
                <span style={{fontSize:16}}>💳</span>Pago Créditos
              </button>
            )}
            <button onClick={()=>{setActiveTab("history");if(!isDesktop)setShowSidebar(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 10px",marginBottom:2,borderRadius:8,border:"none",background:activeTab==="history"?C.blueBg:"transparent",color:activeTab==="history"?C.blue:C.textMd,fontSize:13,fontWeight:activeTab==="history"?600:400,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:16}}>🧾</span>Historial de Facturas
            </button>
          </div>
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
        {puedo("gestion_combos")&&(
          <button onClick={()=>{setShowCombosModal(true);if(!isDesktop)setShowSidebar(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",marginBottom:4,borderRadius:8,border:"none",background:"transparent",color:C.textSm,fontSize:14,cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:18}}>🎁</span>Combos
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
    </div>
    );
  };

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
        {holdSales.length>0&&(
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowHoldPanel(p=>!p)}
              style={{...btnSecondary,padding:"6px 10px",fontSize:12,background:showHoldPanel?C.blueBg:"#fff",color:showHoldPanel?C.blue:"#475569",border:`1.5px solid ${showHoldPanel?C.blue:"#E2E8F0"}`}}>
              ⏸ {holdSales.length} en espera
            </button>
            {showHoldPanel&&(
              <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:200,minWidth:260}}>
                <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,color:C.textMd,fontSize:12,fontWeight:600}}>
                  Facturas en espera
                </div>
                {holdSales.map(h=>(
                  <div key={h.id} style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                    <div>
                      <div style={{color:C.text,fontSize:13,fontWeight:600}}>
                        {h.customer?.nombre||"Mostrador"}
                      </div>
                      <div style={{color:C.textSm,fontSize:11}}>
                        {h.cart.length} producto{h.cart.length!==1?"s":""} · {fmt(h.cart.reduce((s,i)=>s+(i.precio*i.qty),0))}
                      </div>
                      <div style={{color:C.textSm,fontSize:10}}>{h.time}</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{recoverHold(h);setShowHoldPanel(false);}}
                        style={{padding:"4px 10px",borderRadius:6,border:"none",background:C.blue,color:"#fff",fontSize:12,cursor:"pointer",fontWeight:600}}>
                        ▶ Recuperar
                      </button>
                      <button onClick={()=>setHoldSales(prev=>prev.filter(s=>s.id!==h.id))}
                        style={{padding:"4px 8px",borderRadius:6,border:"1px solid #FECACA",background:"#FEF2F2",color:"#DC2626",fontSize:12,cursor:"pointer"}}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
          <div key={`${item.id}-${item.precio}`} style={{padding:mobile?"12px 16px":"10px 16px",borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1,marginRight:8}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  {item._esCombo&&<span style={{fontSize:14}}>🎁</span>}
                  <div style={{color:C.text,fontSize:mobile?14:13,fontWeight:500,lineHeight:1.3}}>{item.nombre}</div>
                </div>
                {item._esCombo&&item._comp?.length>0&&(
                  <div style={{marginTop:4,paddingLeft:20}}>
                    {item._comp.map((cp,ci)=>{
                      const prod = products.find(p=>p.id===cp.producto_id);
                      return(
                        <div key={ci} style={{color:C.textSm,fontSize:11,marginBottom:1}}>
                          └ {cp.cantidad}x {prod?.nombre||"Producto"}
                        </div>
                      );
                    })}
                  </div>
                )}
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
      <button onClick={()=>{
        if(!cajaActual){ notify("Abre la caja antes de cobrar","error"); return; }
        cart.length>0&&setShowPayModal(true);
      }} disabled={cart.length===0}
        style={{...btnPrimary,width:"100%",padding:mobile?16:14,fontSize:mobile?17:16,fontWeight:700,borderRadius:10,opacity:cart.length===0?0.4:1,background:!cajaActual?"#94A3B8":undefined}}>
        {!cajaActual?"🔒 Caja cerrada":`💳 ${mobile?`Cobrar ${fmt(cartTotal)}`:"Cobrar"}`}
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
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="🔍 Buscar nombre, SKU o código..."
            style={{...inputStyle,marginBottom:0,fontSize:isMobile?16:14,flex:1}}/>
          {!isMobile&&holdSales.length>0&&(
            <div style={{position:"relative",flexShrink:0}}>
              <button onClick={()=>setShowHoldPanel(p=>!p)}
                style={{...btnSecondary,padding:"8px 12px",fontSize:13,background:showHoldPanel?C.blueBg:"#fff",color:showHoldPanel?C.blue:"#475569",border:`1.5px solid ${showHoldPanel?C.blue:"#E2E8F0"}`,whiteSpace:"nowrap"}}>
                ⏸ {holdSales.length} en espera
              </button>
              {showHoldPanel&&(
                <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:200,minWidth:280}}>
                  <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,color:C.textMd,fontSize:12,fontWeight:600}}>
                    Facturas en espera
                  </div>
                  {holdSales.map(h=>(
                    <div key={h.id} style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                      <div>
                        <div style={{color:C.text,fontSize:13,fontWeight:600}}>{h.customer?.nombre||"Mostrador"}</div>
                        <div style={{color:C.textSm,fontSize:11}}>{h.cart.length} producto{h.cart.length!==1?"s":""} · {fmt(h.cart.reduce((s,i)=>s+(i.precio*i.qty),0))}</div>
                        <div style={{color:C.textSm,fontSize:10}}>{h.time}</div>
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>{recoverHold(h);setShowHoldPanel(false);}}
                          style={{padding:"4px 10px",borderRadius:6,border:"none",background:C.blue,color:"#fff",fontSize:12,cursor:"pointer",fontWeight:600}}>
                          ▶ Recuperar
                        </button>
                        <button onClick={()=>setHoldSales(prev=>prev.filter(s=>s.id!==h.id))}
                          style={{padding:"4px 8px",borderRadius:6,border:"1px solid #FECACA",background:"#FEF2F2",color:"#DC2626",fontSize:12,cursor:"pointer"}}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {categories.map(cat=>(
            <button key={cat.nombre} onClick={()=>setCategory(cat.nombre)} style={{padding:isMobile?"6px 12px":"4px 12px",borderRadius:20,border:`1.5px solid ${category===cat.nombre?C.blue:C.border}`,background:category===cat.nombre?C.blueBg:C.card,color:category===cat.nombre?C.blue:C.textMd,fontSize:isMobile?13:12,cursor:"pointer",fontWeight:category===cat.nombre?600:400}}>
              {cat.icono} {cat.nombre}
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
                <div style={{fontSize:isMobile?28:26,marginBottom:6}}>{p._icono||CAT_ICONS[p.categoria]||"📦"}</div>
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

  const HistoryTab = () => {
    const [busqueda,    setBusqueda]    = useState("");
    const [fechaDesde,  setFechaDesde]  = useState("");
    const [fechaHasta,  setFechaHasta]  = useState("");
    const [cajeroFiltro,setCajeroFiltro]= useState("");
    const [clienteFiltro,setClienteFiltro]= useState("");
    const [resultados,  setResultados]  = useState(null);
    const [buscando,    setBuscando]    = useState(false);
    const esAdmin = puedo("historial_global");
    const cajeros = [...new Set(salesHistory.map(s=>s.cajero).filter(Boolean))];
    const IS2 = {background:"#fff",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"8px 12px",color:"#1E293B",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"};
    const METODOS = {cash:"Efectivo",card:"Tarjeta",transfer:"Transferencia",credit:"Crédito"};

    const buscarEnBD = async () => {
      setBuscando(true);
      try {
        let query = "?order=created_at.desc";
        if(fechaDesde)  query += `&created_at=gte.${fechaDesde}T00:00:00`;
        if(fechaHasta)  query += `&created_at=lte.${fechaHasta}T23:59:59`;
        if(cajeroFiltro&&esAdmin) query += `&cajero=eq.${encodeURIComponent(cajeroFiltro)}`;
        if(!esAdmin)    query += `&cajero=eq.${encodeURIComponent(usuario?.nombre||"")}`;
        if(busqueda)    query += `&correlativo=ilike.*${encodeURIComponent(busqueda)}*`;
        if(clienteFiltro) query += `&cliente_id=eq.${clienteFiltro}`;
        const ventas = await sb("ventas","GET",null,query);
        setResultados(ventas||[]);
      } catch(e){ console.error(e); }
      setBuscando(false);
    };

    const limpiar = () => { setBusqueda(""); setFechaDesde(""); setFechaHasta(""); setCajeroFiltro(""); setClienteFiltro(""); setResultados(null); };

    const listaBase = resultados !== null ? resultados : salesHistory.filter(s=> esAdmin || s.cajero===usuario?.nombre);
    const filtradas = listaBase.filter(s=> !busqueda || (s.correlativo||"").toLowerCase().includes(busqueda.toLowerCase()));
    const hayFiltros = busqueda||fechaDesde||fechaHasta||cajeroFiltro||clienteFiltro;

    return(
      <div style={{padding:isMobile?12:24,paddingBottom:isMobile?80:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{color:C.text,fontSize:18,fontWeight:700}}>🧾 Historial de Facturas</h2>
          <button onClick={()=>{loadAll();setResultados(null);}} style={{...btnSecondary,fontSize:12,padding:"6px 12px"}}>🔄</button>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:14,marginBottom:16}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":esAdmin?"1fr 1fr 1fr 1fr 1fr auto":"1fr 1fr 1fr auto",gap:10,marginBottom:8,alignItems:"end"}}>
            <div>
              <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>No. Factura</label>
              <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar..." style={IS2} onKeyDown={e=>e.key==="Enter"&&buscarEnBD()}/>
            </div>
            <div>
              <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Fecha desde</label>
              <input type="date" value={fechaDesde} onChange={e=>setFechaDesde(e.target.value)} style={IS2}/>
            </div>
            <div>
              <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Fecha hasta</label>
              <input type="date" value={fechaHasta} onChange={e=>setFechaHasta(e.target.value)} style={IS2}/>
            </div>
            {esAdmin&&(
              <div>
                <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Cajero</label>
                <select value={cajeroFiltro} onChange={e=>setCajeroFiltro(e.target.value)} style={{...IS2,cursor:"pointer"}}>
                  <option value="">Todos</option>
                  {cajeros.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Cliente</label>
              <select value={clienteFiltro} onChange={e=>setClienteFiltro(e.target.value)} style={{...IS2,cursor:"pointer"}}>
                <option value="">Todos</option>
                {customers.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:6,paddingBottom:1}}>
              <button onClick={buscarEnBD} disabled={buscando} style={{padding:"8px 14px",borderRadius:8,border:"none",background:C.blue,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",opacity:buscando?0.6:1,whiteSpace:"nowrap"}}>
                {buscando?"⏳":"🔍 Buscar"}
              </button>
              {hayFiltros&&<button onClick={limpiar} style={{padding:"8px 10px",borderRadius:8,border:"1.5px solid #E2E8F0",background:"#fff",color:"#475569",fontSize:13,cursor:"pointer"}}>✕</button>}
            </div>
          </div>
          {resultados!==null&&(
            <div style={{color:C.textSm,fontSize:12}}>{resultados.length} factura{resultados.length!==1?"s":""} encontrada{resultados.length!==1?"s":""}{fechaDesde&&` desde ${fechaDesde}`}{fechaHasta&&` hasta ${fechaHasta}`}</div>
          )}
        </div>
        {filtradas.length===0?(
          <div style={{textAlign:"center",color:C.textSm,padding:60,background:C.card,borderRadius:12,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:40,marginBottom:12}}>🧾</div>
            <div style={{fontSize:15,color:C.textMd}}>{resultados!==null?"Sin resultados para ese filtro":"No hay ventas registradas"}</div>
            {resultados===null&&<div style={{fontSize:12,color:C.textSm,marginTop:6}}>Usa los filtros y "Buscar" para consultar fechas anteriores</div>}
          </div>
        ):filtradas.map((s,i)=>(
          <div key={s.id||i} style={{background:s.anulada?"#FEF2F2":C.card,border:`1px solid ${s.anulada?"#FECACA":C.border}`,borderRadius:10,padding:16,marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,0.05)",opacity:s.anulada?0.7:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{color:s.anulada?"#DC2626":C.blue,fontWeight:700,fontSize:15}}>{s.correlativo||`#${s.id}`}</span>
                  {s.anulada&&<span style={{background:"#DC2626",color:"#fff",fontSize:10,padding:"1px 8px",borderRadius:20,fontWeight:600}}>ANULADA</span>}
                </div>
                <div style={{color:C.textSm,fontSize:12,marginTop:2}}>{s.created_at ? new Date(s.created_at).toLocaleString("es-GT") : ""}</div>
                <div style={{color:C.textMd,fontSize:12,marginTop:2}}>{customers.find(c=>c.id===s.cliente_id)?.nombre||"Mostrador"} · {s.cajero}</div>
                <div style={{color:C.textSm,fontSize:11,marginTop:1}}>{(s.metodo_pago||"").split("+").map(m=>METODOS[m]||m).join(" + ")}</div>
                {s.anulada&&s.motivo_anulacion&&<div style={{color:"#DC2626",fontSize:11,marginTop:2}}>Motivo: {s.motivo_anulacion}</div>}
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{color:s.anulada?"#DC2626":C.green,fontWeight:700,fontSize:16,textDecoration:s.anulada?"line-through":"none"}}>{fmt(s.total)}</div>
                {!s.anulada&&(
                  <div style={{display:"flex",gap:6,marginTop:6,justifyContent:"flex-end",flexWrap:"wrap"}}>
                    <button onClick={()=>setVentaReimprimir(s)} style={{padding:"4px 10px",borderRadius:6,border:"1.5px solid #E2E8F0",background:"#fff",color:"#475569",fontSize:11,cursor:"pointer"}}>🖨️ Reimprimir</button>
                    {(puedo("anular_propio")||puedo("anular_otros"))&&cajaActual&&
                     s?.created_at && new Date(s.created_at)>=new Date(cajaActual.abierta_at)&&(
                      <button onClick={()=>setVentaAnular(s)} style={{padding:"4px 10px",borderRadius:6,border:"1.5px solid #FECACA",background:"#FEF2F2",color:"#DC2626",fontSize:11,cursor:"pointer"}}>🚫 Anular</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const CajaTab = () => {
    const IS = {background:"#fff",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 14px",color:"#1E293B",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"};
    const [fondoInput,    setFondoInput]    = useState("");
    const [abriendo,      setAbriendo]      = useState(false);
    const [salidaMonto,   setSalidaMonto]   = useState("");
    const [salidaMotivo,  setSalidaMotivo]  = useState("");
    const [salidaPin,     setSalidaPin]     = useState("");
    const [salidaPaso,    setSalidaPaso]    = useState("form"); // form | pin
    const [guardandoSal,  setGuardandoSal]  = useState(false);
    const [showSalida,    setShowSalida]    = useState(false);
    const [showCierre,    setShowCierre]    = useState(false);
    const [modoCierre,    setModoCierre]    = useState("resumido");
    const [efectivoDecl,  setEfectivoDecl]  = useState("");
    const [obsDecl,       setObsDecl]       = useState("");
    const [cerrando,      setCerrando]      = useState(false);
    const [salidas,       setSalidas]       = useState([]);
    const [abonos,        setAbonos]        = useState([]);
    const [loadingCaja,   setLoadingCaja]   = useState(false);
    const [errCaja,       setErrCaja]       = useState("");
    const cargado = useRef(false);

    useEffect(()=>{
      if(!cajaActual||cargado.current) return;
      cargado.current = true;
      const cargar = async () => {
        try {
          const fechaAbierta = new Date(cajaActual.abierta_at).toISOString();
          const [sal, abon] = await Promise.all([
            sb("salidas_caja","GET",null,`?caja_id=eq.${cajaActual.id}&order=created_at.asc`),
            sb("abonos_credito","GET",null,`?cajero=eq.${encodeURIComponent(cajaActual.cajero)}&created_at=gte.${encodeURIComponent(fechaAbierta)}&order=created_at.asc`),
          ]);
          const abonosEnriquecidos = await Promise.all((abon||[]).map(async a => {
            const [venta, cliente] = await Promise.all([
              a.venta_id ? sb("ventas","GET",null,`?id=eq.${a.venta_id}&select=correlativo`).then(r=>r?.[0]) : null,
              a.cliente_id ? sb("clientes","GET",null,`?id=eq.${a.cliente_id}&select=nombre`).then(r=>r?.[0]) : null,
            ]);
            return {...a, _correlativo:venta?.correlativo||"", _clienteNombre:cliente?.nombre||"Sin nombre"};
          }));
          setSalidas(sal||[]);
          setAbonos(abonosEnriquecidos);
        } catch(e){ console.error(e); }
      };
      cargar();
    },[cajaActual?.id]);

    const recargarDetalle = async () => {
      if(!cajaActual) return;
      try {
        const fechaAbierta = new Date(cajaActual.abierta_at).toISOString();
        const [sal, abon] = await Promise.all([
          sb("salidas_caja","GET",null,`?caja_id=eq.${cajaActual.id}&order=created_at.asc`),
          sb("abonos_credito","GET",null,`?cajero=eq.${encodeURIComponent(cajaActual.cajero)}&created_at=gte.${encodeURIComponent(fechaAbierta)}&order=created_at.asc`),
        ]);
        // Enriquecer abonos con nombre de cliente y correlativo de factura
        const abonosEnriquecidos = await Promise.all((abon||[]).map(async a => {
          const [venta, cliente] = await Promise.all([
            a.venta_id ? sb("ventas","GET",null,`?id=eq.${a.venta_id}&select=correlativo`).then(r=>r?.[0]) : null,
            a.cliente_id ? sb("clientes","GET",null,`?id=eq.${a.cliente_id}&select=nombre`).then(r=>r?.[0]) : null,
          ]);
          return {...a, _correlativo:venta?.correlativo||"", _clienteNombre:cliente?.nombre||"Sin nombre"};
        }));
        setSalidas(sal||[]);
        setAbonos(abonosEnriquecidos);
      } catch(e){ console.error(e); }
    };

    const abrirCaja = async () => {
      if(!fondoInput||parseFloat(fondoInput)<0){ setErrCaja("Ingresa el fondo inicial"); return; }
      setAbriendo(true); setErrCaja("");
      try {
        const [caja] = await sb("cajas","POST",{
          serie:         usuario.serie_correlativo||"A",
          cajero:        usuario.nombre||"Admin",
          sucursal:      usuario.sucursal||"Principal",
          fondo_inicial: parseFloat(fondoInput),
          estado:        "abierta",
        });
        setCajaActual(caja);
        setFondoInput("");
      } catch(e){ setErrCaja("Error: "+e.message); }
      setAbriendo(false);
    };

    const registrarSalida = async () => {
      if(!salidaMonto||parseFloat(salidaMonto)<=0){ setErrCaja("Ingresa el monto"); return; }
      if(!salidaMotivo.trim()){ setErrCaja("El motivo es obligatorio"); return; }
      if(salidaPin.length<4){ setErrCaja("La clave debe tener al menos 4 caracteres"); return; }
      setGuardandoSal(true); setErrCaja("");
      try {
        // Validar PIN
        const usuarios = await sb("usuarios","GET",null,`?pin=eq.${salidaPin}&activo=eq.true`);
        if(!usuarios?.length){ setErrCaja("PIN incorrecto"); setGuardandoSal(false); return; }
        const autorizador = usuarios[0];
        const permisos = await sb("rol_permisos","GET",null,
          `?rol_id=eq.${autorizador.rol_id}&permiso=eq.salida_efectivo&valor=eq.true`
        );
        if(!permisos?.length){ setErrCaja(`${autorizador.nombre} no tiene permiso para autorizar salidas`); setGuardandoSal(false); return; }

        await sb("salidas_caja","POST",{
          caja_id:        cajaActual.id,
          serie:          cajaActual.serie,
          cajero:         usuario.nombre||"Admin",
          monto:          parseFloat(salidaMonto),
          motivo:         salidaMotivo.trim(),
          autorizado_por: autorizador.nombre,
        });
        setSalidaMonto(""); setSalidaMotivo(""); setSalidaPin(""); setSalidaPaso("form");
        setShowSalida(false);
        await recargarDetalle();
      } catch(e){ setErrCaja("Error: "+e.message); }
      setGuardandoSal(false);
    };

    const [ticketCierreLocal, setTicketCierreLocal] = useState(null); // temporal, se sube al padre

    const cerrarCaja = async () => {
      if(efectivoDecl===""){ setErrCaja("Ingresa el efectivo declarado"); return; }
      setCerrando(true); setErrCaja("");
      try {
        await sb(`cajas?id=eq.${cajaActual.id}`,"PATCH",{
          estado:             "cerrada",
          efectivo_declarado: parseFloat(efectivoDecl),
          observaciones:      obsDecl.trim()||null,
          cerrada_at:         new Date().toISOString(),
        });
        // Generar ticket de cierre
        setTicketCierre({
          cajero:        cajaActual.cajero,
          serie:         cajaActual.serie,
          sucursal:      cajaActual.sucursal,
          abierta_at:    cajaActual.abierta_at,
          cerrada_at:    new Date().toISOString(),
          fondo:         fondo,
          totalEfectivo, totalTarjeta, totalTransfer, totalCredito,
          totalAbonos,   totalSalidas,  totalVentas,
          efectivoEsperado,
          efectivoDecl:  parseFloat(efectivoDecl),
          diferencia,
          observaciones: obsDecl.trim()||null,
          salidas,
          abonos: abonos.map(a=>({...a})),
          ventas: modoCierre==="detallado" ? ventasTurnoConAnuladas.map(v=>({
            ...v,
            _clienteNombre: customers.find(c=>c.id===v.cliente_id)?.nombre||"Mostrador",
          })) : [],
          modo: modoCierre,
        });
        setCajaActual(null);
        setShowCierre(false);
        notify("Caja cerrada correctamente");
        await loadAll();
      } catch(e){ setErrCaja("Error: "+e.message); }
      setCerrando(false);
    };

    // Calcular totales solo del turno actual
    const ventasTurno = (cajaActual
      ? salesHistory.filter(v=> v?.created_at && !v.anulada && new Date(v.created_at) >= new Date(cajaActual.abierta_at) && v.cajero===cajaActual.cajero)
      : salesHistory.filter(v=> !v.anulada)
    ).map(v=>({
      ...v,
      _clienteNombre: customers.find(c=>c.id===v.cliente_id)?.nombre||(v.cliente_id?"Cliente":"Mostrador"),
    }));
    const ventasTurnoConAnuladas = (cajaActual
      ? salesHistory.filter(v=> v?.created_at && new Date(v.created_at) >= new Date(cajaActual.abierta_at) && v.cajero===cajaActual.cajero)
      : salesHistory
    ).map(v=>({
      ...v,
      _clienteNombre: customers.find(c=>c.id===v.cliente_id)?.nombre||(v.cliente_id?"Cliente":"Mostrador"),
    }));

    const totalEfectivo = ventasTurno.filter(v=>(v.metodo_pago||"").includes("cash")).reduce((s,v)=>s+parseFloat(v.total||0),0);
    const totalTransfer = ventasTurno.filter(v=>(v.metodo_pago||"").includes("transfer")).reduce((s,v)=>s+parseFloat(v.total||0),0);
    const totalTarjeta  = ventasTurno.filter(v=>(v.metodo_pago||"").includes("card")).reduce((s,v)=>s+parseFloat(v.total||0),0);
    const totalCredito  = ventasTurno.filter(v=>(v.metodo_pago||"").includes("credit")).reduce((s,v)=>s+parseFloat(v.total||0),0);
    const totalAbonos   = abonos.filter(a=>a.metodo_pago==="cash").reduce((s,a)=>s+parseFloat(a.monto||0),0);
    const totalSalidas  = salidas.reduce((s,e)=>s+parseFloat(e.monto||0),0);
    const fondo         = parseFloat(cajaActual?.fondo_inicial||0);
    const totalVentas   = totalEfectivo+totalTransfer+totalTarjeta+totalCredito;
    const efectivoEsperado = fondo+totalEfectivo+totalAbonos-totalSalidas;
    const diferencia    = parseFloat(efectivoDecl||0)-efectivoEsperado;

    return(
      <div style={{padding:isMobile?12:24,paddingBottom:isMobile?80:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{color:C.text,fontSize:18,fontWeight:700}}>🏪 Caja</h2>
          <button onClick={()=>{loadAll();recargarDetalle();setErrCaja("");}} style={{...btnSecondary,fontSize:12,padding:"6px 12px"}}>🔄</button>
        </div>

        {errCaja&&<div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"8px 14px",color:"#DC2626",fontSize:13,marginBottom:14}}>{errCaja}</div>}

        {/* ── SIN CAJA ABIERTA ── */}
        {!cajaActual&&(
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:24,textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:12}}>🏪</div>
            <div style={{color:C.text,fontSize:16,fontWeight:600,marginBottom:4}}>Caja cerrada</div>
            <div style={{color:C.textMd,fontSize:13,marginBottom:20}}>Ingresa el fondo inicial para abrir la caja</div>
            <div style={{marginBottom:16,textAlign:"left"}}>
              <label style={{color:C.textMd,fontSize:13,display:"block",marginBottom:6}}>Fondo inicial</label>
              <input type="number" value={fondoInput} onChange={e=>setFondoInput(e.target.value)}
                placeholder="0.00" min="0" step="0.01"
                style={{...IS,fontSize:24,fontWeight:800,textAlign:"right",color:C.green}}/>
            </div>
            <button onClick={abrirCaja} disabled={abriendo} style={{...BG,width:"100%",padding:14,fontSize:16,fontWeight:700,borderRadius:10,background:"#16A34A",opacity:abriendo?0.6:1}}>
              {abriendo?"⏳ Abriendo...":"✓ Abrir caja"}
            </button>
          </div>
        )}

        {/* ── CAJA ABIERTA ── */}
        {cajaActual&&(
          <>
            {/* Info apertura */}
            <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10,padding:14,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{color:C.green,fontWeight:700,fontSize:15}}>✓ Caja abierta</span>
                <span style={{color:C.green,fontSize:12}}>{new Date(cajaActual.abierta_at).toLocaleString("es-GT")}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[
                  {label:"Cajero",  value:cajaActual.cajero},
                  {label:"Serie",   value:cajaActual.serie},
                  {label:"Fondo",   value:fmt(cajaActual.fondo_inicial)},
                  {label:"Sucursal",value:cajaActual.sucursal},
                ].map(s=>(
                  <div key={s.label}>
                    <div style={{color:C.textSm,fontSize:11}}>{s.label}</div>
                    <div style={{color:C.text,fontWeight:600,fontSize:13}}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ventas del turno */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:16,marginBottom:12}}>
              <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>💰 Ventas del turno</div>
              {[
                {label:"💵 Efectivo",       value:totalEfectivo, note:"En caja física"},
                {label:"🏦 Transferencia",  value:totalTransfer, note:"En cuenta bancaria"},
                {label:"💳 Tarjeta",        value:totalTarjeta,  note:"En terminal"},
                {label:"📋 Crédito",        value:totalCredito,  note:"Por cobrar"},
                {label:"🔄 Créditos cobrados",value:totalAbonos, note:"Efectivo recibido"},
              ].map(item=>(
                <div key={item.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div>
                    <span style={{color:C.text,fontSize:13}}>{item.label}</span>
                    <span style={{color:C.textSm,fontSize:11,marginLeft:8}}>{item.note}</span>
                  </div>
                  <span style={{color:item.value>0?C.text:C.textSm,fontWeight:item.value>0?700:400,fontSize:14}}>{fmt(item.value)}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4}}>
                <span style={{color:C.text,fontSize:14,fontWeight:700}}>Total ventas</span>
                <span style={{color:C.blue,fontSize:16,fontWeight:800}}>{fmt(totalVentas)}</span>
              </div>
            </div>

            {/* Salidas */}
            {salidas.length>0&&(
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:16,marginBottom:12}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:8}}>💸 Salidas de efectivo</div>
                {salidas.map(s=>(
                  <div key={s.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                    <div>
                      <div style={{color:C.text,fontSize:13}}>{s.motivo}</div>
                      <div style={{color:C.textSm,fontSize:11}}>{s.created_at ? new Date(s.created_at).toLocaleString("es-GT") : ""}</div>
                    </div>
                    <span style={{color:C.red,fontWeight:700}}>-{fmt(s.monto)}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:8}}>
                  <span style={{color:C.textMd,fontSize:13}}>Total salidas</span>
                  <span style={{color:C.red,fontWeight:700}}>-{fmt(totalSalidas)}</span>
                </div>
              </div>
            )}

            {/* Efectivo esperado */}
            <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10,padding:16,marginBottom:16}}>
              <div style={{color:C.green,fontSize:13,fontWeight:600,marginBottom:8}}>💵 Efectivo esperado en caja</div>
              {[
                {label:"Fondo inicial",       value:fmt(fondo)},
                {label:"+ Ventas efectivo",   value:fmt(totalEfectivo)},
                {label:"+ Créditos cobrados", value:fmt(totalAbonos)},
                {label:"− Salidas",           value:`-${fmt(totalSalidas)}`},
              ].map(s=>(
                <div key={s.label} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:C.textMd,fontSize:13}}>{s.label}</span>
                  <span style={{color:C.text,fontSize:13}}>{s.value}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid #BBF7D0",marginTop:4}}>
                <span style={{color:C.green,fontSize:15,fontWeight:700}}>Total en caja</span>
                <span style={{color:C.green,fontSize:18,fontWeight:800}}>{fmt(efectivoEsperado)}</span>
              </div>
            </div>

            {/* Acciones */}
            {!showSalida&&!showCierre&&(
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{setShowSalida(true);setShowCierre(false);setErrCaja("");}} style={{...BS,flex:1,padding:12}}>
                  💸 Salida de efectivo
                </button>
                <button onClick={()=>{recargarDetalle();setShowCierre(true);setShowSalida(false);setErrCaja("");}} style={{flex:2,padding:12,borderRadius:8,border:"none",background:"#DC2626",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>
                  🔒 Cerrar caja
                </button>
              </div>
            )}

            {/* Form salida */}
            {showSalida&&(
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:16,marginBottom:12}}>
                <div style={{color:C.textMd,fontSize:13,fontWeight:600,marginBottom:12}}>💸 Registrar salida de efectivo</div>

                {salidaPaso==="form"&&(
                  <>
                    <div style={{marginBottom:10}}>
                      <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Monto *</label>
                      <input type="number" value={salidaMonto} onChange={e=>setSalidaMonto(e.target.value)}
                        placeholder="0.00" min="0.01" step="0.01"
                        style={{...IS,fontSize:20,fontWeight:700,textAlign:"right",color:"#DC2626"}}/>
                    </div>
                    <div style={{marginBottom:14}}>
                      <label style={{color:C.textSm,fontSize:12,display:"block",marginBottom:4}}>Motivo *</label>
                      <input value={salidaMotivo} onChange={e=>setSalidaMotivo(e.target.value)}
                        placeholder="Ej: Pago proveedor, depósito bancario..." style={IS}/>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{setShowSalida(false);setErrCaja("");setSalidaMonto("");setSalidaMotivo("");}} style={{...BS,flex:1}}>Cancelar</button>
                      <button onClick={()=>{
                        if(!salidaMonto||parseFloat(salidaMonto)<=0){setErrCaja("Ingresa el monto");return;}
                        if(!salidaMotivo.trim()){setErrCaja("El motivo es obligatorio");return;}
                        setErrCaja("");setSalidaPaso("pin");
                      }} style={{flex:2,padding:10,borderRadius:8,border:"none",background:"#DC2626",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>
                        Continuar →
                      </button>
                    </div>
                  </>
                )}

                {salidaPaso==="pin"&&(
                  <>
                    <div style={{background:"#FEF2F2",borderRadius:8,padding:"8px 14px",marginBottom:16,textAlign:"center"}}>
                      <div style={{color:"#DC2626",fontSize:14,fontWeight:700}}>-{fmt(salidaMonto)}</div>
                      <div style={{color:"#475569",fontSize:12}}>{salidaMotivo}</div>
                    </div>
                    <div style={{color:"#1E293B",fontSize:13,fontWeight:600,marginBottom:12,textAlign:"center"}}>PIN de autorización</div>
                    <input
                      type="password"
                      value={salidaPin}
                      onChange={e=>setSalidaPin(e.target.value)}
                      placeholder="Ingresa tu clave..."
                      autoFocus
                      style={{width:"100%",padding:"12px 16px",borderRadius:10,border:"2px solid #E2E8F0",fontSize:18,textAlign:"center",letterSpacing:4,outline:"none",boxSizing:"border-box",marginBottom:8}}
                    />
                    <div style={{color:"#94A3B8",fontSize:11,textAlign:"center",marginBottom:16}}>Mínimo 4 caracteres — letras y números</div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{setSalidaPaso("form");setSalidaPin("");setErrCaja("");}} style={{...BS,flex:1}}>← Volver</button>
                      <button onClick={registrarSalida} disabled={guardandoSal||salidaPin.length<4}
                        style={{flex:2,padding:10,borderRadius:8,border:"none",background:"#DC2626",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",opacity:(guardandoSal||salidaPin.length<4)?0.5:1}}>
                        {guardandoSal?"⏳ Guardando...":"✓ Confirmar salida"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Ticket de cierre — renderizado desde estado del padre */}

            {/* Form cierre */}
            {showCierre&&(
              <div style={{background:C.card,border:"1.5px solid #FECACA",borderRadius:10,padding:16}}>
                <div style={{color:"#DC2626",fontSize:13,fontWeight:600,marginBottom:12}}>🔒 Cierre de caja</div>

                {/* Selector modo — solo si tiene permiso de detallado */}
                {puedo("ver_reporte_caja_detallado")&&(
                  <div style={{display:"flex",background:C.panel,borderRadius:8,padding:4,marginBottom:14,border:`1px solid ${C.border}`}}>
                    {[{id:"resumido",label:"📊 Resumido"},{id:"detallado",label:"📋 Detallado"}].map(t=>(
                      <button key={t.id} onClick={()=>setModoCierre(t.id)} style={{
                        flex:1,padding:"7px 0",borderRadius:6,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,
                        background:modoCierre===t.id?C.card:"transparent",
                        color:modoCierre===t.id?C.blue:C.textSm,
                      }}>{t.label}</button>
                    ))}
                  </div>
                )}

                {/* Modo detallado — lista facturas */}
                {modoCierre==="detallado"&&(
                  <div style={{marginBottom:14,maxHeight:200,overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:8}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:6,padding:"6px 12px",background:C.panel,position:"sticky",top:0}}>
                      {["Correlativo","Cliente","Total"].map(h=>(
                        <span key={h} style={{color:C.textSm,fontSize:11,fontWeight:600}}>{h}</span>
                      ))}
                    </div>
                    {ventasTurno.map((v,i)=>(
                      <div key={v.id} style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:6,padding:"6px 12px",borderTop:`1px solid ${C.border}`,background:i%2===0?"#fff":C.panel}}>
                        <span style={{color:C.blue,fontSize:12,fontWeight:600}}>{v.correlativo}</span>
                        <span style={{color:C.textMd,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.cliente_id?"Cliente":"Mostrador"}</span>
                        <span style={{color:C.text,fontSize:12,fontWeight:600,textAlign:"right"}}>{fmt(v.total)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Efectivo declarado */}
                <div style={{marginBottom:12}}>
                  <label style={{color:C.textMd,fontSize:13,display:"block",marginBottom:6}}>Efectivo declarado (conteo físico) *</label>
                  <input type="number" value={efectivoDecl} onChange={e=>setEfectivoDecl(e.target.value)}
                    placeholder="0.00" min="0" step="0.01"
                    style={{...IS,fontSize:22,fontWeight:800,textAlign:"right",color:C.green}}/>
                  {efectivoDecl!==""&&(
                    <div style={{
                      marginTop:8,padding:"8px 14px",borderRadius:8,
                      background:diferencia===0?"#F0FDF4":diferencia>0?"#EFF6FF":"#FEF2F2",
                      display:"flex",justifyContent:"space-between"
                    }}>
                      <span style={{color:diferencia===0?C.green:diferencia>0?C.blue:"#DC2626",fontWeight:600,fontSize:14}}>
                        {diferencia===0?"✓ Cuadra exacto":diferencia>0?"⬆ Sobrante":"⬇ Faltante"}
                      </span>
                      <span style={{color:diferencia===0?C.green:diferencia>0?C.blue:"#DC2626",fontWeight:700,fontSize:15}}>
                        {diferencia===0?"":fmt(Math.abs(diferencia))}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{marginBottom:14}}>
                  <label style={{color:C.textMd,fontSize:13,display:"block",marginBottom:6}}>Observaciones</label>
                  <input value={obsDecl} onChange={e=>setObsDecl(e.target.value)}
                    placeholder="Notas del cierre..." style={IS}/>
                </div>

                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setShowCierre(false);setErrCaja("");}} style={{...BS,flex:1}}>Cancelar</button>
                  <button onClick={async ()=>{
                    if(efectivoDecl===""){setErrCaja("Ingresa el efectivo declarado");return;}
                    try {
                      // Consultar ventas frescas del turno desde BD (incluye anuladas)
                      const fechaAb = new Date(cajaActual.abierta_at).toISOString();
                      const ventasFrescas = await sb("ventas","GET",null,
                        `?cajero=eq.${cajaActual.cajero.replace(/ /g,"%20")}&created_at=gte.${fechaAb}&order=created_at.asc`
                      );
                      const ventasConNombre = (ventasFrescas||[]).map(v=>({
                        ...v,
                        _clienteNombre: customers.find(c=>c.id===v.cliente_id)?.nombre||(v.cliente_id?"Cliente":"Mostrador"),
                      }));
                      const ventasValidas = ventasConNombre.filter(v=>!v.anulada);
                      const efect  = ventasValidas.filter(v=>(v.metodo_pago||"").includes("cash")).reduce((s,v)=>s+parseFloat(v.total||0),0);
                      const trans  = ventasValidas.filter(v=>(v.metodo_pago||"").includes("transfer")).reduce((s,v)=>s+parseFloat(v.total||0),0);
                      const tarj   = ventasValidas.filter(v=>(v.metodo_pago||"").includes("card")).reduce((s,v)=>s+parseFloat(v.total||0),0);
                      const cred   = ventasValidas.filter(v=>(v.metodo_pago||"").includes("credit")).reduce((s,v)=>s+parseFloat(v.total||0),0);
                      const totalV = efect+trans+tarj+cred;
                      const totalAb = abonos.reduce((s,a)=>s+parseFloat(a.monto||0),0);
                      const totalSal = salidas.reduce((s,e)=>s+parseFloat(e.monto||0),0);
                      const fondoI  = parseFloat(cajaActual.fondo_inicial||0);
                      const efEsp   = fondoI+efect+totalAb-totalSal;
                      const decl    = parseFloat(efectivoDecl);
                      setTicketCierre({
                        cajero:cajaActual.cajero, serie:cajaActual.serie,
                        sucursal:cajaActual.sucursal, abierta_at:cajaActual.abierta_at,
                        cerrada_at:new Date().toISOString(), fondo:fondoI,
                        totalEfectivo:efect, totalTarjeta:tarj, totalTransfer:trans, totalCredito:cred,
                        totalAbonos:totalAb, totalSalidas:totalSal, totalVentas:totalV,
                        efectivoEsperado:efEsp,
                        efectivoDecl:decl, diferencia:decl-efEsp,
                        observaciones:obsDecl.trim()||null, salidas,
                        abonos:abonos.map(a=>({...a})),
                        ventas:modoCierre==="detallado"?ventasConNombre:[],
                        modo:modoCierre, _preview:true,
                      });
                    } catch(e){ setErrCaja("Error al generar ticket: "+e.message); }
                  }} disabled={efectivoDecl===""} style={{flex:2,padding:10,borderRadius:8,border:"none",background:"#3B82F6",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",opacity:efectivoDecl===""?0.5:1}}>
                    👁️ Previsualizar ticket
                  </button>
                </div>
              </div>
            )}
          </>
        )}
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
        <div style={{width:210,background:C.sidebar,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,boxShadow:"2px 0 8px rgba(0,0,0,0.04)",overflow:"hidden"}}>
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
      {ticketCierre&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,backdropFilter:"blur(3px)"}}>
          <div style={{background:"#fff",borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",width:"520px",maxWidth:"95vw",maxHeight:"92vh",overflowY:"auto",padding:24}}>
            <div style={{fontFamily:"'Courier New',monospace",fontSize:12}}>

              {/* ── ENCABEZADO ── */}
              <div style={{textAlign:"center",borderBottom:"1px dashed #E2E8F0",paddingBottom:12,marginBottom:12}}>
                <div style={{fontSize:10,color:"#94A3B8",letterSpacing:2,marginBottom:2}}>REPORTE DE CIERRE DE CAJA</div>
                <div style={{fontSize:16,fontWeight:700,color:"#1E293B",fontFamily:"Inter,sans-serif"}}>Smart Valion POS</div>
                <div style={{fontSize:11,color:"#475569"}}>{ticketCierre.sucursal} — Serie {ticketCierre.serie}</div>
                <div style={{fontSize:10,color:"#94A3B8",marginTop:4}}>
                  Apertura: {new Date(ticketCierre.abierta_at).toLocaleString("es-GT")}
                </div>
                <div style={{fontSize:10,color:"#94A3B8"}}>
                  Cierre: {new Date(ticketCierre.cerrada_at).toLocaleString("es-GT")}
                </div>
                <div style={{fontSize:11,color:"#1E293B",fontWeight:600,marginTop:4}}>Cajero: {ticketCierre.cajero}</div>
              </div>

              {/* ── DETALLADO: FACTURAS ── */}
              {ticketCierre.modo==="detallado"&&(
                <div>
                  {/* Efectivo */}
                  {ticketCierre.ventas.filter(v=>(v.metodo_pago||"").includes("cash")).length>0&&(
                    <div style={{marginBottom:10}}>
                      <div style={{background:"#E2E8F0",padding:"3px 8px",fontWeight:700,fontSize:11,marginBottom:4}}>VENTAS AL CONTADO — EFECTIVO</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:4,padding:"2px 4px",borderBottom:"1px solid #E2E8F0",marginBottom:2}}>
                        {["Corr.","Cliente","Total"].map(h=><span key={h} style={{color:"#94A3B8",fontSize:10,fontWeight:600}}>{h}</span>)}
                      </div>
                      {ticketCierre.ventas.filter(v=>(v.metodo_pago||"").includes("cash")).map(v=>(
                        <div key={v.id} style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:4,padding:"2px 4px",borderBottom:"1px dotted #E2E8F0",opacity:v.anulada?0.6:1}}>
                          <span style={{color:v.anulada?"#DC2626":"#3B82F6",fontSize:10,textDecoration:v.anulada?"line-through":"none"}}>{v.correlativo}</span>
                          <span style={{color:"#475569",fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:v.anulada?"line-through":"none"}}>{v._clienteNombre||"Mostrador"}</span>
                          <span style={{color:v.anulada?"#DC2626":"#1E293B",fontSize:10,textAlign:"right"}}>{v.anulada?`-${fmt(v.total)}`:fmt(v.total)}</span>
                        </div>
                      ))}
                      <div style={{display:"flex",justifyContent:"space-between",padding:"3px 4px",borderTop:"1px solid #475569",marginTop:2}}>
                        <span style={{fontWeight:700,fontSize:10}}>Subtotal efectivo</span>
                        <span style={{fontWeight:700,fontSize:10}}>{fmt(ticketCierre.ventas.filter(v=>(v.metodo_pago||"").includes("cash")&&!v.anulada).reduce((s,v)=>s+parseFloat(v.total||0),0))}</span>
                      </div>
                    </div>
                  )}
                  {/* Tarjeta */}
                  {ticketCierre.ventas.filter(v=>(v.metodo_pago||"").includes("card")).length>0&&(
                    <div style={{marginBottom:10}}>
                      <div style={{background:"#E2E8F0",padding:"3px 8px",fontWeight:700,fontSize:11,marginBottom:4}}>VENTAS AL CONTADO — TARJETA</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:4,padding:"2px 4px",borderBottom:"1px solid #E2E8F0",marginBottom:2}}>
                        {["Corr.","Cliente","Total"].map(h=><span key={h} style={{color:"#94A3B8",fontSize:10,fontWeight:600}}>{h}</span>)}
                      </div>
                      {ticketCierre.ventas.filter(v=>(v.metodo_pago||"").includes("card")).map(v=>(
                        <div key={v.id} style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:4,padding:"2px 4px",borderBottom:"1px dotted #E2E8F0",opacity:v.anulada?0.6:1}}>
                          <span style={{color:v.anulada?"#DC2626":"#3B82F6",fontSize:10,textDecoration:v.anulada?"line-through":"none"}}>{v.correlativo}</span>
                          <span style={{color:"#475569",fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:v.anulada?"line-through":"none"}}>{v._clienteNombre||"Mostrador"}</span>
                          <span style={{color:v.anulada?"#DC2626":"#1E293B",fontSize:10,textAlign:"right"}}>{v.anulada?`-${fmt(v.total)}`:fmt(v.total)}</span>
                        </div>
                      ))}
                      <div style={{display:"flex",justifyContent:"space-between",padding:"3px 4px",borderTop:"1px solid #475569",marginTop:2}}>
                        <span style={{fontWeight:700,fontSize:10}}>Subtotal tarjeta</span>
                        <span style={{fontWeight:700,fontSize:10}}>{fmt(ticketCierre.ventas.filter(v=>(v.metodo_pago||"").includes("card")&&!v.anulada).reduce((s,v)=>s+parseFloat(v.total||0),0))}</span>
                      </div>
                    </div>
                  )}
                  {/* Transferencia */}
                  {ticketCierre.ventas.filter(v=>(v.metodo_pago||"").includes("transfer")).length>0&&(
                    <div style={{marginBottom:10}}>
                      <div style={{background:"#E2E8F0",padding:"3px 8px",fontWeight:700,fontSize:11,marginBottom:4}}>VENTAS AL CONTADO — TRANSFERENCIA</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:4,padding:"2px 4px",borderBottom:"1px solid #E2E8F0",marginBottom:2}}>
                        {["Corr.","Cliente","Total"].map(h=><span key={h} style={{color:"#94A3B8",fontSize:10,fontWeight:600}}>{h}</span>)}
                      </div>
                      {ticketCierre.ventas.filter(v=>(v.metodo_pago||"").includes("transfer")).map(v=>(
                        <div key={v.id} style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:4,padding:"2px 4px",borderBottom:"1px dotted #E2E8F0",opacity:v.anulada?0.6:1}}>
                          <span style={{color:v.anulada?"#DC2626":"#3B82F6",fontSize:10,textDecoration:v.anulada?"line-through":"none"}}>{v.correlativo}</span>
                          <span style={{color:"#475569",fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:v.anulada?"line-through":"none"}}>{v._clienteNombre||"Mostrador"}</span>
                          <span style={{color:v.anulada?"#DC2626":"#1E293B",fontSize:10,textAlign:"right"}}>{v.anulada?`-${fmt(v.total)}`:fmt(v.total)}</span>
                        </div>
                      ))}
                      <div style={{display:"flex",justifyContent:"space-between",padding:"3px 4px",borderTop:"1px solid #475569",marginTop:2}}>
                        <span style={{fontWeight:700,fontSize:10}}>Subtotal transferencia</span>
                        <span style={{fontWeight:700,fontSize:10}}>{fmt(ticketCierre.ventas.filter(v=>(v.metodo_pago||"").includes("transfer")&&!v.anulada).reduce((s,v)=>s+parseFloat(v.total||0),0))}</span>
                      </div>
                    </div>
                  )}
                  {/* Crédito */}
                  {ticketCierre.ventas.filter(v=>(v.metodo_pago||"").includes("credit")).length>0&&(
                    <div style={{marginBottom:10}}>
                      <div style={{background:"#E2E8F0",padding:"3px 8px",fontWeight:700,fontSize:11,marginBottom:4}}>VENTAS AL CRÉDITO</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:4,padding:"2px 4px",borderBottom:"1px solid #E2E8F0",marginBottom:2}}>
                        {["Corr.","Cliente","Total"].map(h=><span key={h} style={{color:"#94A3B8",fontSize:10,fontWeight:600}}>{h}</span>)}
                      </div>
                      {ticketCierre.ventas.filter(v=>(v.metodo_pago||"").includes("credit")).map(v=>(
                        <div key={v.id} style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:4,padding:"2px 4px",borderBottom:"1px dotted #E2E8F0",opacity:v.anulada?0.6:1}}>
                          <span style={{color:v.anulada?"#DC2626":"#3B82F6",fontSize:10,textDecoration:v.anulada?"line-through":"none"}}>{v.correlativo}</span>
                          <span style={{color:"#475569",fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:v.anulada?"line-through":"none"}}>{v._clienteNombre||"Mostrador"}</span>
                          <span style={{color:v.anulada?"#DC2626":"#1E293B",fontSize:10,textAlign:"right"}}>{v.anulada?`-${fmt(v.total)}`:fmt(v.total)}</span>
                        </div>
                      ))}
                      <div style={{display:"flex",justifyContent:"space-between",padding:"3px 4px",borderTop:"1px solid #475569",marginTop:2}}>
                        <span style={{fontWeight:700,fontSize:10}}>Subtotal crédito</span>
                        <span style={{fontWeight:700,fontSize:10}}>{fmt(ticketCierre.totalCredito)}</span>
                      </div>
                    </div>
                  )}
                  {/* Créditos cobrados */}
                  {ticketCierre.abonos?.length>0&&(
                    <div style={{marginBottom:10}}>
                      <div style={{background:"#E2E8F0",padding:"3px 8px",fontWeight:700,fontSize:11,marginBottom:4}}>CRÉDITOS COBRADOS</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:4,padding:"2px 4px",borderBottom:"1px solid #E2E8F0",marginBottom:2}}>
                        {["Factura","Cliente","Abono"].map(h=><span key={h} style={{color:"#94A3B8",fontSize:10,fontWeight:600}}>{h}</span>)}
                      </div>
                      {ticketCierre.abonos.map((a,i)=>(
                        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:4,padding:"2px 4px",borderBottom:"1px dotted #E2E8F0"}}>
                          <span style={{color:"#3B82F6",fontSize:10}}>{a._correlativo||a.numero_recibo||"-"}</span>
                          <span style={{color:"#475569",fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a._clienteNombre||"Cliente"}</span>
                          <span style={{color:"#16A34A",fontSize:10,textAlign:"right"}}>{fmt(a.monto)}</span>
                        </div>
                      ))}
                      <div style={{display:"flex",justifyContent:"space-between",padding:"3px 4px",borderTop:"1px solid #475569",marginTop:2}}>
                        <span style={{fontWeight:700,fontSize:10}}>Subtotal cobrado</span>
                        <span style={{fontWeight:700,fontSize:10}}>{fmt(ticketCierre.totalAbonos)}</span>
                      </div>
                    </div>
                  )}
                  {/* Salidas */}
                  {ticketCierre.salidas?.length>0&&(
                    <div style={{marginBottom:10}}>
                      <div style={{background:"#E2E8F0",padding:"3px 8px",fontWeight:700,fontSize:11,marginBottom:4}}>SALIDAS DE EFECTIVO</div>
                      {ticketCierre.salidas.map((s,i)=>(
                        <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:4,padding:"2px 4px",borderBottom:"1px dotted #E2E8F0"}}>
                          <span style={{color:"#475569",fontSize:10}}>{s.motivo}</span>
                          <span style={{color:"#DC2626",fontSize:10,textAlign:"right"}}>-{fmt(s.monto)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── RESUMEN DE CIERRE (ambos modos) ── */}
              <div style={{borderTop:"2px solid #1E293B",paddingTop:8,marginTop:8}}>
                <div style={{background:"#1E293B",color:"#fff",padding:"4px 8px",fontWeight:700,fontSize:12,textAlign:"center",marginBottom:8,borderRadius:4}}>
                  RESUMEN DE CIERRE
                </div>

                {/* Ventas por método */}
                <div style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",padding:"3px 4px",borderBottom:"1px dotted #E2E8F0"}}>
                    <span style={{fontSize:11,fontWeight:700,color:"#1E293B"}}>Total de Ventas</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#1E293B"}}>{fmt(ticketCierre.totalVentas)}</span>
                  </div>
                  {[
                    {label:"  Efectivo",      value:ticketCierre.totalEfectivo},
                    {label:"  Tarjeta",       value:ticketCierre.totalTarjeta},
                    {label:"  Transferencia", value:ticketCierre.totalTransfer},
                    {label:"  Crédito",       value:ticketCierre.totalCredito},
                  ].map(r=>(
                    <div key={r.label} style={{display:"flex",justifyContent:"space-between",padding:"2px 4px",borderBottom:"1px dotted #E2E8F0"}}>
                      <span style={{fontSize:10,color:"#475569"}}>{r.label}</span>
                      <span style={{fontSize:10,color:"#1E293B"}}>{fmt(r.value)}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",padding:"3px 4px",borderBottom:"1px dotted #E2E8F0",marginTop:2}}>
                    <span style={{fontSize:11,fontWeight:700,color:"#1E293B"}}>Créditos cobrados</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#16A34A"}}>{fmt(ticketCierre.totalAbonos)}</span>
                  </div>
                </div>

                {/* Efectivo en caja */}
                <div style={{marginBottom:8,paddingTop:4,borderTop:"1px solid #1E293B"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#1E293B",marginBottom:4,padding:"0 4px"}}>EFECTIVO EN CAJA</div>
                  {[
                    {label:"  Fondo inicial",       value:fmt(ticketCierre.fondo)},
                    {label:"  + Ventas efectivo",   value:fmt(ticketCierre.totalEfectivo)},
                    {label:"  + Créditos cobrados", value:fmt(ticketCierre.totalAbonos)},
                    {label:"  − Salidas",           value:`-${fmt(ticketCierre.totalSalidas)}`},
                  ].map(r=>(
                    <div key={r.label} style={{display:"flex",justifyContent:"space-between",padding:"2px 4px",borderBottom:"1px dotted #E2E8F0"}}>
                      <span style={{fontSize:10,color:"#475569"}}>{r.label}</span>
                      <span style={{fontSize:10,color:"#1E293B"}}>{r.value}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",padding:"3px 4px",borderTop:"1px solid #475569",marginTop:2}}>
                    <span style={{fontSize:11,fontWeight:700,color:"#1E293B"}}>= Total efectivo</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#1E293B"}}>{fmt(ticketCierre.efectivoEsperado)}</span>
                  </div>
                </div>

                {/* Cuadre */}
                <div style={{marginTop:6,paddingTop:6,borderTop:"1px solid #E2E8F0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",padding:"2px 4px",marginBottom:2}}>
                    <span style={{fontSize:11,color:"#475569"}}>Efectivo esperado</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#3B82F6"}}>{fmt(ticketCierre.efectivoEsperado)}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",padding:"2px 4px",marginBottom:4}}>
                    <span style={{fontSize:11,color:"#475569"}}>Efectivo declarado</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#16A34A"}}>{fmt(ticketCierre.efectivoDecl)}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",padding:"5px 8px",borderRadius:4,background:ticketCierre.diferencia===0?"#F0FDF4":ticketCierre.diferencia>0?"#EFF6FF":"#FEF2F2"}}>
                    <span style={{fontSize:12,fontWeight:700,color:ticketCierre.diferencia===0?"#16A34A":ticketCierre.diferencia>0?"#3B82F6":"#DC2626"}}>
                      {ticketCierre.diferencia===0?"✓ Cuadra exacto":ticketCierre.diferencia>0?"⬆ Sobrante":"⬇ Faltante"}
                    </span>
                    <span style={{fontSize:12,fontWeight:700,color:ticketCierre.diferencia===0?"#16A34A":ticketCierre.diferencia>0?"#3B82F6":"#DC2626"}}>
                      {ticketCierre.diferencia===0?"":fmt(Math.abs(ticketCierre.diferencia))}
                    </span>
                  </div>
                </div>

                {ticketCierre.observaciones&&(
                  <div style={{marginTop:8,padding:"4px 8px",background:"#F8F9FB",borderRadius:4,fontSize:10,color:"#475569"}}>
                    Obs: {ticketCierre.observaciones}
                  </div>
                )}
              </div>

              <div style={{textAlign:"center",color:"#94A3B8",fontSize:10,margin:"12px 0"}}>*** Documento interno — no es comprobante fiscal ***</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button onClick={()=>window.print()} style={{flex:1,padding:10,borderRadius:8,border:"1.5px solid #E2E8F0",background:"#fff",color:"#475569",fontSize:13,cursor:"pointer",minWidth:100}}>🖨️ Imprimir</button>
                {ticketCierre?._preview?(
                  <>
                    <button onClick={()=>setTicketCierre(null)} style={{flex:1,padding:10,borderRadius:8,border:"1.5px solid #E2E8F0",background:"#fff",color:"#475569",fontSize:13,cursor:"pointer",minWidth:100}}>← Corregir</button>
                    <button onClick={cerrarCajaFinal} style={{flex:2,padding:10,borderRadius:8,border:"none",background:"#DC2626",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",minWidth:140}}>🔒 Confirmar cierre</button>
                  </>
                ):(
                  <button onClick={()=>setTicketCierre(null)} style={{flex:1,padding:10,borderRadius:8,border:"none",background:"#3B82F6",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",minWidth:100}}>✓ Cerrar</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
        <AnulacionModal
          venta={ventaAnular} usuario={usuario} cajaActual={cajaActual} isMobile={isMobile}
          onClose={()=>setVentaAnular(null)}
          onAnulada={(autorizador)=>{
            notify(`Devolución de ${ventaAnular.correlativo} procesada — autorizada por ${autorizador}`);
            setVentaAnular(null);
            loadAll();
          }}
        />
      )}
      {ventaReimprimir&&(
        <ReimpresionModal
          venta={ventaReimprimir} customers={customers} ivaConfig={ivaConfig}
          onClose={()=>setVentaReimprimir(null)}
        />
      )}
      {showCombosModal&&puedo("gestion_combos")&&(
        <CombosModal isMobile={isMobile} onClose={()=>{setShowCombosModal(false);loadAll();}}/>
      )}
      {showInventarioModal&&puedo("entradas_inventario")&&(
        <InventarioModal isMobile={isMobile} usuario={usuario} modoAdmin={puedo("catalogo_productos")} verHistorial={puedo("ver_historial_entradas")} onClose={()=>{setShowInventarioModal(false);loadAll();}}/>
      )}
      {showProveedoresModal&&puedo("catalogo_proveedores")&&(
        <ProveedoresModal isMobile={isMobile} onClose={()=>setShowProveedoresModal(false)}/>
      )}
      {showCreditosModal&&puedo("recibir_abonos")&&(
        <CreditosModal isMobile={isMobile} usuario={usuario} onClose={()=>{setShowCreditosModal(false);loadAll();setCajaReloadKey(k=>k+1);}}/>
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

