import { useState, useEffect } from "react";

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

const CAT_ICONS = {"Lácteos":"🥛","Bebidas":"🥤","Panadería":"🍞","Limpieza":"🧴","Snacks":"🍿","Abarrotes":"🛒","Cuidado Personal":"🧼"};
const CARD_TYPES = [
  {id:"visa",       label:"Visa",             icon:"💳", color:"#1A1F71"},
  {id:"mastercard", label:"Mastercard",        icon:"🔴", color:"#EB001B"},
  {id:"amex",       label:"American Express",  icon:"🟦", color:"#007BC1"},
  {id:"otra",       label:"Otra",              icon:"💳", color:C?.textMd},
];
const IVA_MODOS = [
  {id:"incluido_simple",    label:"IVA incluido",  sublabel:"Sin desglose en ticket", badge:"🇬🇹 Más común en GT"},
  {id:"incluido_desglosado",label:"IVA incluido",  sublabel:"Con desglose en ticket", badge:"📊 Reportes fiscales"},
  {id:"agregado",           label:"IVA agregado",  sublabel:"Se suma al precio",      badge:"🏢 Ventas B2B"},
];
const DEFAULT_IVA = {porcentaje:12, modo:"incluido_simple"};

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

// ─── STYLES ───────────────────────────────────────────────────────────────────
const inputStyle  = {background:C.card,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"};
const btnPrimary  = {background:C.blue,color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:"pointer"};
const btnSecondary= {background:C.card,color:C.textMd,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"};
const btnDanger   = {background:C.redBg,color:C.red,border:`1.5px solid ${C.redBorder}`,borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"};
const btnClose    = {background:"none",border:"none",color:C.textSm,fontSize:22,cursor:"pointer",padding:"4px 8px"};
const overlayStyle= {position:"fixed",inset:0,background:C.overlay,display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"};
const modalStyle  = {background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",maxHeight:"92vh",overflowY:"auto"};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function POS() {
  const bp = useBreakpoint();
  const isMobile  = bp==="mobile";
  const isTablet  = bp==="tablet";
  const isDesktop = bp==="desktop";

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
  const [showSidebar,       setShowSidebar]       = useState(false);
  const [showCart,          setShowCart]          = useState(false);
  const [lastTicket,        setLastTicket]        = useState(null);
  const [salesHistory,      setSalesHistory]      = useState([]);
  const [cajaInfo,          setCajaInfo]          = useState(null);
  const [holdSales,         setHoldSales]         = useState([]);
  const [time,              setTime]              = useState(nowT());
  const [notification,      setNotification]      = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [saving,            setSaving]            = useState(false);

  // ── IVA config
  const [ivaConfig, setIvaConfig] = useState(()=>{
    try { const s=localStorage.getItem("svpos_iva"); return s?JSON.parse(s):DEFAULT_IVA; }
    catch { return DEFAULT_IVA; }
  });
  const [ivaTemp, setIvaTemp] = useState(ivaConfig);

  // ── Pago mixto — array de pagos [{metodo, monto, ...extras}]
  const [pagos, setPagos] = useState([{metodo:"cash", monto:"", extras:{}}]);

  // ── Banco form
  const [bancoForm, setBancoForm] = useState({nombre:"", numero_cuenta:"", tipo:"receptor"});
  const [bancoEditId, setBancoEditId] = useState(null);

  useEffect(()=>{
    loadAll();
    const t=setInterval(()=>setTime(nowT()),30000);
    return ()=>clearInterval(t);
  },[]);

  async function loadAll() {
    setLoading(true);
    try {
      const [prods,clients,ventas,caja,bcos] = await Promise.all([
        sb("productos","GET",null,"?activo=eq.true&order=categoria,nombre"),
        sb("clientes","GET",null,"?activo=eq.true&order=nombre"),
        sb("ventas","GET",null,"?order=created_at.desc&limit=50"),
        sb("caja","GET",null,"?order=id.desc&limit=1"),
        sb("bancos","GET",null,"?activo=eq.true&order=nombre"),
      ]);
      setProducts(prods||[]); setCustomers(clients||[]);
      setCustomer(clients?.[0]||null);
      setSalesHistory(ventas||[]); setCajaInfo(caja?.[0]||null);
      setBancos(bcos||[]);
    } catch { notify("Error conectando a la base de datos","error"); }
    setLoading(false);
  }

  const notify = (msg,type="success") => {
    setNotification({msg,type});
    setTimeout(()=>setNotification(null),3000);
  };

  const saveIvaConfig = () => {
    setIvaConfig(ivaTemp);
    localStorage.setItem("svpos_iva",JSON.stringify(ivaTemp));
    setShowConfigModal(false);
    notify("Configuración de IVA guardada ✓");
  };

  // ── Bancos CRUD
  const saveBanco = async () => {
    if (!bancoForm.nombre.trim()) { notify("El nombre es requerido","error"); return; }
    try {
      if (bancoEditId) {
        await sb(`bancos?id=eq.${bancoEditId}`,"PATCH",{nombre:bancoForm.nombre,numero_cuenta:bancoForm.numero_cuenta,tipo:bancoForm.tipo});
        notify("Banco actualizado ✓");
      } else {
        await sb("bancos","POST",{nombre:bancoForm.nombre,numero_cuenta:bancoForm.numero_cuenta||null,tipo:bancoForm.tipo});
        notify("Banco agregado ✓");
      }
      setBancoForm({nombre:"",numero_cuenta:"",tipo:"receptor"});
      setBancoEditId(null);
      const bcos = await sb("bancos","GET",null,"?activo=eq.true&order=nombre");
      setBancos(bcos||[]);
    } catch(e) { notify("Error: "+e.message,"error"); }
  };

  const deleteBanco = async (id) => {
    try {
      await sb(`bancos?id=eq.${id}`,"PATCH",{activo:false});
      setBancos(prev=>prev.filter(b=>b.id!==id));
      notify("Banco eliminado");
    } catch(e) { notify("Error: "+e.message,"error"); }
  };

  const editBanco = (b) => {
    setBancoForm({nombre:b.nombre,numero_cuenta:b.numero_cuenta||"",tipo:b.tipo});
    setBancoEditId(b.id);
  };

  // ── Cart
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

  // ── Totales pago mixto
  const totalPagado = pagos.reduce((s,p)=>s+parseFloat(p.monto||0),0);
  const pendiente   = cartTotal - totalPagado;
  const pagoValido  = Math.abs(pendiente) < 0.01;

  const addToCart = (p) => {
    if(p.stock<=0){notify("Sin stock disponible","error");return;}
    setCart(prev=>{
      const ex=prev.find(i=>i.id===p.id);
      if(ex){
        if(ex.qty>=p.stock){notify("Stock insuficiente","error");return prev;}
        return prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i);
      }
      return [...prev,{...p,qty:1}];
    });
    if(isMobile) notify(`${p.nombre} agregado`);
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

  const openPayModal = () => {
    setPagos([{metodo:"cash", monto:cartTotal.toFixed(2), extras:{}}]);
    setShowPayModal(true);
  };

  // ── Pago mixto helpers
  const addPago = () => setPagos(prev=>[...prev,{metodo:"transfer",monto:"",extras:{}}]);
  const removePago = (i) => setPagos(prev=>prev.filter((_,idx)=>idx!==i));
  const updatePago = (i,field,val) => setPagos(prev=>prev.map((p,idx)=>idx===i?{...p,[field]:val}:p));
  const updatePagoExtra = (i,field,val) => setPagos(prev=>prev.map((p,idx)=>idx===i?{...p,extras:{...p.extras,[field]:val}}:p));

  // ── Auto completar monto restante
  const autoMonto = (i) => {
    const otrosPagos = pagos.reduce((s,p,idx)=>idx===i?s:s+parseFloat(p.monto||0),0);
    const resto = cartTotal - otrosPagos;
    if(resto>0) updatePago(i,"monto",resto.toFixed(2));
  };

  const completeSale = async () => {
    if(!pagoValido){ notify("El total pagado no coincide con el total de la venta","error"); return; }
    for(const p of pagos) {
      if(p.metodo==="credit"&&!customer?.credito){ notify("Cliente sin crédito autorizado","error"); return; }
      if(p.metodo==="transfer"&&!p.extras.banco_receptor_id){ notify("Selecciona el banco receptor para la transferencia","error"); return; }
      if(p.metodo==="transfer"&&!p.extras.autorizacion?.trim()){ notify("Ingresa el número de autorización de la transferencia","error"); return; }
      if(p.metodo==="card"&&!p.extras.tipo_tarjeta){ notify("Selecciona el tipo de tarjeta","error"); return; }
    }
    setSaving(true);
    try {
      const correlativo=`V-${String(Date.now()).slice(-6)}`;
      const metodoResumen = pagos.map(p=>p.metodo).join("+");
      const [venta]=await sb("ventas","POST",{
        correlativo, cliente_id:customer?.id||null,
        subtotal:cartBase, impuesto:cartIva, total:cartTotal,
        metodo_pago:metodoResumen,
        monto_recibido:totalPagado,
        cambio:0,
        cajero:"Admin", sucursal:"Principal",
      });
      await sb("detalle_ventas","POST",cart.map(item=>({
        venta_id:venta.id, producto_id:item.id, nombre:item.nombre,
        cantidad:item.qty, precio:item.precio, impuesto:item.impuesto,
        subtotal:calcLine(item,ivaConfig).total,
      })));
      for(const item of cart) await sb(`productos?id=eq.${item.id}`,"PATCH",{stock:item.stock-item.qty});
      setProducts(prev=>prev.map(p=>{const ic=cart.find(i=>i.id===p.id);return ic?{...p,stock:p.stock-ic.qty}:p;}));

      const ticket={
        correlativo, date:new Date().toLocaleString("es-GT"),
        customer, items:[...cart],
        base:cartBase, iva:cartIva, total:cartTotal,
        ivaConfig:{...ivaConfig}, hayDesglose,
        pagos:[...pagos], bancos,
      };
      setSalesHistory(prev=>[venta,...prev]);
      setLastTicket(ticket);
      setCart([]); setCustomer(customers[0]); setPagos([{metodo:"cash",monto:"",extras:{}}]);
      setShowPayModal(false); setShowCart(false); setShowTicketModal(true);
      notify(`✓ Venta guardada · ${fmt(cartTotal)}`);
    } catch(e){notify("Error: "+e.message,"error");}
    setSaving(false);
  };

  // BancosModal se renderiza abajo como componente externo

  // ─── PAY MODAL — pago mixto ───────────────────────────────────────────────────
  const PayModal = () => {
    const bancosReceptores = bancos.filter(b=>b.tipo==="receptor");
    const bancosEmisores   = bancos.filter(b=>b.tipo==="emisor");

    return (
      <div style={overlayStyle}>
        <div style={{...modalStyle,width:isMobile?"95vw":500}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h2 style={{color:C.text,fontSize:18,fontWeight:700}}>💳 Cobrar Venta</h2>
            <button onClick={()=>setShowPayModal(false)} style={btnClose}>✕</button>
          </div>

          {/* Total */}
          <div style={{background:C.bg,borderRadius:10,padding:"14px 20px",marginBottom:16,textAlign:"center",border:`1px solid ${C.border}`}}>
            <div style={{color:C.textSm,fontSize:12,marginBottom:4}}>TOTAL A COBRAR</div>
            <div style={{color:C.green,fontSize:32,fontWeight:800}}>{fmt(cartTotal)}</div>
            {hayDesglose&&<div style={{color:C.textSm,fontSize:12,marginTop:4}}>Base {fmt(cartBase)} + IVA {fmt(cartIva)}</div>}
          </div>

          {/* Pagos */}
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{color:C.textMd,fontSize:13,fontWeight:600}}>Forma{pagos.length>1?"s":""} de pago</span>
              {pagos.length<3&&(
                <button onClick={addPago} style={{...btnSecondary,padding:"4px 10px",fontSize:12}}>+ Agregar método</button>
              )}
            </div>

            {pagos.map((pago,i)=>(
              <div key={i} style={{background:C.panel,borderRadius:10,padding:14,marginBottom:10,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <span style={{color:C.textMd,fontSize:12,fontWeight:600}}>Pago {pagos.length>1?i+1:""}</span>
                  {pagos.length>1&&<button onClick={()=>removePago(i)} style={{...btnDanger,padding:"3px 8px",fontSize:11}}>✕ Quitar</button>}
                </div>

                {/* Método */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:10}}>
                  {[
                    {id:"cash",     label:"Efectivo",      icon:"💵"},
                    {id:"card",     label:"Tarjeta",       icon:"💳"},
                    {id:"transfer", label:"Transferencia", icon:"🏦"},
                    {id:"credit",   label:"Crédito",       icon:"📋"},
                  ].map(m=>(
                    <button key={m.id} onClick={()=>updatePago(i,"metodo",m.id)} style={{
                      padding:"8px 4px",borderRadius:8,cursor:"pointer",textAlign:"center",
                      border:`1.5px solid ${pago.metodo===m.id?C.blue:C.border}`,
                      background:pago.metodo===m.id?C.blueBg:C.card,
                      color:pago.metodo===m.id?C.blue:C.textMd,
                      fontSize:11,fontWeight:pago.metodo===m.id?600:400
                    }}>
                      <div style={{fontSize:16}}>{m.icon}</div>
                      <div>{m.label}</div>
                    </button>
                  ))}
                </div>

                {/* Monto */}
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                  <div style={{flex:1}}>
                    <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Monto</label>
                    <input type="number" value={pago.monto}
                      onChange={e=>updatePago(i,"monto",e.target.value)}
                      onFocus={()=>autoMonto(i)}
                      placeholder="0.00"
                      style={{...inputStyle,fontSize:18,fontWeight:700,textAlign:"right"}}/>
                  </div>
                  {pago.metodo==="cash"&&(
                    <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:16}}>
                      {[50,100,200].map(amt=>(
                        <button key={amt} onClick={()=>updatePago(i,"monto",String(amt))}
                          style={{padding:"4px 8px",background:C.card,border:`1px solid ${C.border}`,borderRadius:6,color:C.textMd,fontSize:11,cursor:"pointer"}}>
                          Q{amt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Campos extra por método */}

                {/* EFECTIVO: cambio */}
                {pago.metodo==="cash"&&parseFloat(pago.monto||0)>0&&parseFloat(pago.monto||0)>=(cartTotal-pagos.reduce((s,p2,j)=>j===i?s:s+parseFloat(p2.monto||0),0))&&(
                  <div style={{background:C.blueBg,borderRadius:8,padding:"8px 12px",border:`1px solid ${C.blueBorder}`}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:C.textMd,fontSize:13}}>Cambio</span>
                      <span style={{color:C.blue,fontWeight:700,fontSize:16}}>
                        {fmt(parseFloat(pago.monto||0)-(cartTotal-pagos.reduce((s,p2,j)=>j===i?s:s+parseFloat(p2.monto||0),0)))}
                      </span>
                    </div>
                  </div>
                )}

                {/* TARJETA */}
                {pago.metodo==="card"&&(
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div>
                      <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:6}}>Tipo de tarjeta</label>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                        {CARD_TYPES.map(ct=>(
                          <button key={ct.id} onClick={()=>updatePagoExtra(i,"tipo_tarjeta",ct.id)} style={{
                            padding:"8px 4px",borderRadius:8,cursor:"pointer",textAlign:"center",
                            border:`1.5px solid ${pago.extras.tipo_tarjeta===ct.id?C.blue:C.border}`,
                            background:pago.extras.tipo_tarjeta===ct.id?C.blueBg:C.card,
                            fontSize:11,fontWeight:pago.extras.tipo_tarjeta===ct.id?600:400,
                            color:pago.extras.tipo_tarjeta===ct.id?C.blue:C.textMd
                          }}>
                            <div style={{fontSize:14}}>{ct.icon}</div>
                            <div style={{fontSize:10}}>{ct.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Número de autorización</label>
                      <input value={pago.extras.autorizacion||""} onChange={e=>updatePagoExtra(i,"autorizacion",e.target.value)}
                        placeholder="Ej: 123456" style={{...inputStyle,fontSize:14}}/>
                    </div>
                  </div>
                )}

                {/* TRANSFERENCIA */}
                {pago.metodo==="transfer"&&(
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {bancosReceptores.length===0?(
                      <div style={{background:C.amberBg,border:`1px solid ${C.amber}`,borderRadius:8,padding:"10px 14px",color:C.amber,fontSize:13}}>
                        ⚠️ No hay bancos receptores. <button onClick={()=>{setShowPayModal(false);setShowBancosModal(true);}} style={{color:C.blue,background:"none",border:"none",cursor:"pointer",fontWeight:600,fontSize:13}}>Agregar bancos →</button>
                      </div>
                    ):(
                      <>
                        <div>
                          <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Banco que recibe el pago *</label>
                          <select value={pago.extras.banco_receptor_id||""} onChange={e=>updatePagoExtra(i,"banco_receptor_id",e.target.value)}
                            style={{...inputStyle,cursor:"pointer"}}>
                            <option value="">Seleccionar banco receptor...</option>
                            {bancosReceptores.map(b=>(
                              <option key={b.id} value={b.id}>{b.nombre}{b.numero_cuenta?` — ${b.numero_cuenta}`:""}</option>
                            ))}
                          </select>
                        </div>
                        {bancosEmisores.length>0&&(
                          <div>
                            <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>Banco de origen (opcional)</label>
                            <select value={pago.extras.banco_emisor_id||""} onChange={e=>updatePagoExtra(i,"banco_emisor_id",e.target.value)}
                              style={{...inputStyle,cursor:"pointer"}}>
                              <option value="">Seleccionar banco de origen...</option>
                              {bancosEmisores.map(b=>(
                                <option key={b.id} value={b.id}>{b.nombre}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div>
                          <label style={{color:C.textSm,fontSize:11,display:"block",marginBottom:4}}>No. de autorización del banco emisor *</label>
                          <input value={pago.extras.autorizacion||""} onChange={e=>updatePagoExtra(i,"autorizacion",e.target.value)}
                            placeholder="Ej: TRX-123456" style={{...inputStyle,fontSize:14}}/>
                          <div style={{color:C.textSm,fontSize:10,marginTop:4}}>Número de referencia o comprobante de la transferencia</div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* CRÉDITO */}
                {pago.metodo==="credit"&&(
                  customer?.credito?(
                    <div style={{background:C.greenBg,borderRadius:8,padding:"10px 14px",border:`1px solid #BBF7D0`}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{color:C.textMd,fontSize:12}}>Límite</span>
                        <span style={{color:C.text,fontSize:12}}>{fmt(customer.limite_credito)}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:C.textMd,fontSize:12}}>Disponible</span>
                        <span style={{color:C.green,fontSize:12,fontWeight:600}}>{fmt(customer.limite_credito-customer.saldo_credito)}</span>
                      </div>
                    </div>
                  ):(
                    <div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>
                      ⚠️ El cliente no tiene crédito autorizado.
                    </div>
                  )
                )}
              </div>
            ))}
          </div>

          {/* Resumen total pagado */}
          <div style={{background:C.bg,borderRadius:10,padding:"12px 16px",marginBottom:16,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{color:C.textMd,fontSize:13}}>Total venta</span>
              <span style={{color:C.text,fontSize:13,fontWeight:600}}>{fmt(cartTotal)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{color:C.textMd,fontSize:13}}>Total pagado</span>
              <span style={{color:totalPagado>=cartTotal?C.green:C.amber,fontSize:13,fontWeight:600}}>{fmt(totalPagado)}</span>
            </div>
            {Math.abs(pendiente)>0.01&&(
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:6,borderTop:`1px solid ${C.border}`,marginTop:4}}>
                <span style={{color:C.red,fontSize:13,fontWeight:600}}>Pendiente</span>
                <span style={{color:C.red,fontSize:13,fontWeight:700}}>{fmt(pendiente)}</span>
              </div>
            )}
            {pagoValido&&(
              <div style={{display:"flex",justifyContent:"center",marginTop:6}}>
                <span style={{color:C.green,fontSize:13,fontWeight:600}}>✓ Pago completo</span>
              </div>
            )}
          </div>

          <button onClick={completeSale} disabled={saving||!pagoValido}
            style={{...btnPrimary,width:"100%",padding:16,fontSize:17,fontWeight:700,borderRadius:10,opacity:saving||!pagoValido?0.5:1}}>
            {saving?"⏳ Guardando...":"✓ Confirmar Cobro"}
          </button>
        </div>
      </div>
    );
  };

  // ─── TICKET MODAL ─────────────────────────────────────────────────────────────
  const TicketModal = () => !lastTicket?null:(
    <div style={overlayStyle}>
      <div style={{...modalStyle,width:isMobile?"95vw":340,fontFamily:"'Courier New',monospace"}}>
        <div style={{textAlign:"center",borderBottom:`1px dashed ${C.border}`,paddingBottom:12,marginBottom:12}}>
          <div style={{fontSize:11,color:C.textSm,letterSpacing:2}}>DOCUMENTO INTERNO</div>
          <div style={{fontSize:18,fontWeight:700,color:C.text,fontFamily:"Inter,sans-serif"}}>Smart Valion POS</div>
          <div style={{fontSize:11,color:C.textMd}}>Sucursal Principal</div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{color:C.textMd,fontSize:12}}>Venta #</span>
          <span style={{color:C.blue,fontWeight:700}}>{lastTicket.correlativo}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
          <span style={{color:C.textMd,fontSize:12}}>Fecha</span>
          <span style={{color:C.text,fontSize:11}}>{lastTicket.date}</span>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{color:C.textMd,fontSize:11,marginBottom:6}}>Cliente: <span style={{color:C.text}}>{lastTicket.customer?.nombre||"Consumidor Final"}</span></div>
          {lastTicket.items.map(item=>{
            const l=calcLine(item,lastTicket.ivaConfig);
            return(
              <div key={item.id} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:C.textMd,fontSize:12,flex:1}}>{item.nombre}</span>
                <span style={{color:C.textSm,fontSize:12,width:36,textAlign:"center"}}>x{item.qty}</span>
                <span style={{color:C.text,fontSize:12,width:72,textAlign:"right"}}>{fmt(l.total)}</span>
              </div>
            );
          })}
        </div>
        <div style={{borderTop:`1px dashed ${C.border}`,paddingTop:10,marginBottom:10}}>
          {lastTicket.hayDesglose&&(
            <>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:C.textMd,fontSize:12}}>Base imponible</span>
                <span style={{color:C.text,fontSize:12}}>{fmt(lastTicket.base)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{color:C.textMd,fontSize:12}}>IVA ({lastTicket.ivaConfig.porcentaje}%)</span>
                <span style={{color:C.text,fontSize:12}}>{fmt(lastTicket.iva)}</span>
              </div>
            </>
          )}
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{color:C.text,fontSize:16,fontWeight:700}}>TOTAL</span>
            <span style={{color:C.green,fontSize:16,fontWeight:700}}>{fmt(lastTicket.total)}</span>
          </div>
          {lastTicket.ivaConfig.modo==="incluido_simple"&&lastTicket.iva>0&&(
            <div style={{color:C.textSm,fontSize:10,textAlign:"right",marginTop:4}}>IVA {lastTicket.ivaConfig.porcentaje}% incluido</div>
          )}
        </div>
        {/* Detalle de pagos en ticket */}
        <div style={{borderTop:`1px dashed ${C.border}`,paddingTop:10,marginBottom:12}}>
          {lastTicket.pagos.map((p,i)=>{
            const bReceptor = p.extras.banco_receptor_id ? lastTicket.bancos.find(b=>b.id==p.extras.banco_receptor_id) : null;
            const bEmisor   = p.extras.banco_emisor_id   ? lastTicket.bancos.find(b=>b.id==p.extras.banco_emisor_id)   : null;
            const labels = {cash:"Efectivo",card:"Tarjeta",transfer:"Transferencia",credit:"Crédito"};
            return(
              <div key={i} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:C.textMd,fontSize:12}}>{labels[p.metodo]||p.metodo}{p.extras.tipo_tarjeta?` (${p.extras.tipo_tarjeta})`:""}</span>
                  <span style={{color:C.text,fontSize:12,fontWeight:600}}>{fmt(parseFloat(p.monto||0))}</span>
                </div>
                {p.extras.autorizacion&&<div style={{color:C.textSm,fontSize:10}}>Auth: {p.extras.autorizacion}</div>}
                {bReceptor&&<div style={{color:C.textSm,fontSize:10}}>Banco receptor: {bReceptor.nombre}{bReceptor.numero_cuenta?` (${bReceptor.numero_cuenta})`:""}</div>}
                {bEmisor&&<div style={{color:C.textSm,fontSize:10}}>Banco origen: {bEmisor.nombre}</div>}
              </div>
            );
          })}
        </div>
        <div style={{textAlign:"center",color:C.textSm,fontSize:10,marginBottom:16}}>*** Este no es un documento fiscal ***<br/>Powered by Smart Valion ERP</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>window.print()} style={{...btnSecondary,flex:1}}>🖨️ Imprimir</button>
          <button onClick={()=>setShowTicketModal(false)} style={{...btnPrimary,flex:1}}>Nueva Venta</button>
        </div>
      </div>
    </div>
  );

  // ─── CUSTOMER MODAL ───────────────────────────────────────────────────────────
  const CustomerModal = () => (
    <div style={overlayStyle}>
      <div style={{...modalStyle,width:isMobile?"95vw":400}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{color:C.text,fontSize:16,fontWeight:700}}>Seleccionar Cliente</h2>
          <button onClick={()=>setShowCustomerModal(false)} style={btnClose}>✕</button>
        </div>
        {customers.map(c=>(
          <button key={c.id} onClick={()=>{setCustomer(c);setShowCustomerModal(false);notify(`Cliente: ${c.nombre}`);}}
            style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"14px",marginBottom:8,background:customer?.id===c.id?C.blueBg:C.panel,border:`1.5px solid ${customer?.id===c.id?C.blue:C.border}`,borderRadius:8,cursor:"pointer"}}>
            <div style={{textAlign:"left"}}>
              <div style={{color:C.text,fontSize:14,fontWeight:600}}>{c.nombre}</div>
              <div style={{color:C.textMd,fontSize:12}}>NIT: {c.nit}</div>
            </div>
            {c.credito&&<span style={{background:C.greenBg,color:C.green,fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600}}>CRÉDITO</span>}
          </button>
        ))}
      </div>
    </div>
  );

  // ─── CONFIG IVA MODAL ─────────────────────────────────────────────────────────
  const ConfigModal = () => (
    <div style={overlayStyle}>
      <div style={{...modalStyle,width:isMobile?"95vw":480}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{color:C.text,fontSize:18,fontWeight:700}}>⚙️ Configuración de IVA</h2>
          <button onClick={()=>setShowConfigModal(false)} style={btnClose}>✕</button>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{color:C.textMd,fontSize:13,fontWeight:600,display:"block",marginBottom:8}}>Porcentaje de IVA</label>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <input type="number" min="0" max="100" step="0.1" value={ivaTemp.porcentaje}
              onChange={e=>setIvaTemp(p=>({...p,porcentaje:parseFloat(e.target.value)||0}))}
              style={{...inputStyle,width:90,fontSize:22,fontWeight:700,textAlign:"center"}}/>
            <span style={{color:C.textMd,fontSize:28,fontWeight:700}}>%</span>
            <div style={{color:C.textSm,fontSize:12}}>Guatemala: <strong>12%</strong></div>
          </div>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{color:C.textMd,fontSize:13,fontWeight:600,display:"block",marginBottom:10}}>¿Cómo se maneja el IVA?</label>
          {IVA_MODOS.map(modo=>{
            const sel=ivaTemp.modo===modo.id;
            const mc=modo.id==="incluido_simple"?{c:C.green,bg:C.greenBg}:modo.id==="incluido_desglosado"?{c:C.blue,bg:C.blueBg}:{c:C.amber,bg:C.amberBg};
            return(
              <button key={modo.id} onClick={()=>setIvaTemp(p=>({...p,modo:modo.id}))}
                style={{width:"100%",padding:"14px 16px",marginBottom:8,borderRadius:10,cursor:"pointer",textAlign:"left",border:`2px solid ${sel?C.blue:C.border}`,background:sel?C.blueBg:C.panel}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                  <div style={{width:18,height:18,borderRadius:"50%",flexShrink:0,marginTop:2,border:`2px solid ${sel?C.blue:C.border}`,background:sel?C.blue:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {sel&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
                  </div>
                  <div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:4,alignItems:"center"}}>
                      <span style={{color:C.text,fontWeight:700,fontSize:14}}>{modo.label}</span>
                      <span style={{color:C.textSm,fontSize:12}}>— {modo.sublabel}</span>
                      <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,background:mc.bg,color:mc.c}}>{modo.badge}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowConfigModal(false)} style={{...btnSecondary,flex:1}}>Cancelar</button>
          <button onClick={saveIvaConfig} style={{...btnPrimary,flex:2}}>✓ Guardar</button>
        </div>
      </div>
    </div>
  );

  // ─── TABS ─────────────────────────────────────────────────────────────────────
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
    const totalEfectivo=salesHistory.filter(v=>v.metodo_pago==="cash").reduce((s,v)=>s+parseFloat(v.total||0),0);
    const fondo=parseFloat(cajaInfo?.fondo||500);
    return(
      <div style={{padding:isMobile?12:24,paddingBottom:isMobile?80:24}}>
        <h2 style={{color:C.text,fontSize:18,fontWeight:700,marginBottom:16}}>Caja</h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[
            {label:"Fondo inicial",   value:fmt(fondo),              color:C.textMd},
            {label:"Ventas efectivo", value:fmt(totalEfectivo),      color:C.blue},
            {label:"Total esperado",  value:fmt(fondo+totalEfectivo),color:C.green},
            {label:"Estado",          value:cajaInfo?.estado==="abierta"?"Abierta":"Cerrada",color:cajaInfo?.estado==="abierta"?C.green:C.red},
          ].map(item=>(
            <div key={item.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:16}}>
              <div style={{color:C.textSm,fontSize:12,marginBottom:4}}>{item.label}</div>
              <div style={{color:item.color,fontSize:20,fontWeight:700}}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── SIDEBAR & NAV ────────────────────────────────────────────────────────────
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
        {!isDesktop&&<button onClick={()=>setShowSidebar(false)} style={btnClose}>✕</button>}
      </div>
      <nav style={{flex:1,padding:"12px 8px",overflowY:"auto"}}>
        {[{id:"pos",icon:"🛒",label:"Punto de Venta"},{id:"history",icon:"🧾",label:"Historial"},{id:"caja",icon:"💰",label:"Caja"}].map(item=>(
          <button key={item.id} onClick={()=>{setActiveTab(item.id);if(!isDesktop)setShowSidebar(false);}} style={{
            display:"flex",alignItems:"center",gap:10,width:"100%",
            padding:"11px 12px",marginBottom:4,borderRadius:8,border:"none",
            background:activeTab===item.id?C.blueBg:"transparent",
            color:activeTab===item.id?C.blue:C.textMd,
            fontSize:14,fontWeight:activeTab===item.id?600:400,cursor:"pointer",textAlign:"left"
          }}><span style={{fontSize:18}}>{item.icon}</span>{item.label}</button>
        ))}
        <div style={{borderTop:`1px solid ${C.border}`,margin:"8px 0"}}/>
        {[{id:"productos",icon:"📦",label:"Productos"},{id:"inventario",icon:"📊",label:"Inventario"},{id:"clientes",icon:"👤",label:"Clientes"},{id:"reportes",icon:"📈",label:"Reportes"}].map(item=>(
          <button key={item.id} onClick={()=>notify(`Módulo ${item.label} — próximamente`,"info")} style={{
            display:"flex",alignItems:"center",gap:10,width:"100%",
            padding:"11px 12px",marginBottom:4,borderRadius:8,border:"none",
            background:"transparent",color:C.textSm,fontSize:14,cursor:"pointer",textAlign:"left"
          }}><span style={{fontSize:18}}>{item.icon}</span>{item.label}</button>
        ))}
        <div style={{borderTop:`1px solid ${C.border}`,margin:"8px 0"}}/>
        <button onClick={()=>{setShowBancosModal(true);if(!isDesktop)setShowSidebar(false);}} style={{
          display:"flex",alignItems:"center",gap:10,width:"100%",
          padding:"11px 12px",marginBottom:4,borderRadius:8,border:"none",
          background:"transparent",color:C.textMd,fontSize:14,cursor:"pointer",textAlign:"left"
        }}><span style={{fontSize:18}}>🏦</span>Bancos</button>
        <button onClick={()=>{setIvaTemp(ivaConfig);setShowConfigModal(true);if(!isDesktop)setShowSidebar(false);}} style={{
          display:"flex",alignItems:"center",gap:10,width:"100%",
          padding:"11px 12px",borderRadius:8,border:"none",
          background:"transparent",color:C.textMd,fontSize:14,cursor:"pointer",textAlign:"left"
        }}><span style={{fontSize:18}}>⚙️</span>Configuración</button>
      </nav>
      <div style={{padding:"12px 18px",borderTop:`1px solid ${C.border}`,background:C.panel}}>
        <span style={{fontSize:10,background:ivaBadgeBg,color:ivaBadgeColor,padding:"2px 8px",borderRadius:20,fontWeight:600,display:"inline-block",marginBottom:6}}>{ivaBadgeLabel}</span>
        <div style={{color:C.textMd,fontSize:12,fontWeight:600}}>Admin</div>
        <div style={{color:C.textSm,fontSize:11}}>Sucursal Principal · {time}</div>
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
          <button onClick={()=>setShowCart(true)} style={{position:"relative",background:C.blue,color:"#fff",border:"none",borderRadius:10,padding:"8px 14px",cursor:"pointer",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
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

  // ─── CART COMPONENTS ──────────────────────────────────────────────────────────
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
    <div style={{padding:mobile?16:16,borderTop:`1px solid ${C.border}`,background:C.panel,paddingBottom:mobile?24:16}}>
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
      <button onClick={()=>cart.length>0&&openPayModal()} disabled={cart.length===0}
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
          <h2 style={{color:C.text,fontSize:16,fontWeight:700}}>Carrito</h2>
          <button onClick={()=>setShowCart(false)} style={btnClose}>✕</button>
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
            <button key={cat} onClick={()=>setCategory(cat)} style={{
              padding:isMobile?"6px 12px":"4px 12px",borderRadius:20,
              border:`1.5px solid ${category===cat?C.blue:C.border}`,
              background:category===cat?C.blueBg:C.card,
              color:category===cat?C.blue:C.textMd,
              fontSize:isMobile?13:12,cursor:"pointer",fontWeight:category===cat?600:400
            }}>{cat}</button>
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

  if(loading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,flexDirection:"column",gap:16}}>
      <div style={{fontSize:40}}>⚡</div>
      <div style={{color:C.blue,fontSize:16,fontWeight:600}}>Smart Valion POS</div>
      <div style={{color:C.textSm,fontSize:13}}>Conectando...</div>
    </div>
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────────
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

      {showPayModal      &&<PayModal/>}
      {showCustomerModal &&<CustomerModal/>}
      {showTicketModal   &&<TicketModal/>}
      {showConfigModal   &&<ConfigModal/>}
      {showBancosModal&&(
        <BancosModal
          bancos={bancos} setBancos={setBancos}
          onClose={()=>setShowBancosModal(false)}
          isMobile={isMobile}
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

// ─── BANCOS MODAL — componente externo para evitar pérdida de foco ────────────
function BancosModal({ bancos, setBancos, onClose, isMobile }) {
  const [form,     setForm]     = useState({nombre:"", numero_cuenta:"", tipo:"receptor"});
  const [editId,   setEditId]   = useState(null);
  const [saving,   setSaving]   = useState(false);

  const notify = (msg) => console.log(msg); // feedback visual mínimo aquí

  const save = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      // Solo receptor lleva número de cuenta
      const payload = {
        nombre: form.nombre.trim(),
        tipo:   form.tipo,
        numero_cuenta: form.tipo==="receptor" ? (form.numero_cuenta.trim()||null) : null,
      };
      if (editId) {
        await sb(`bancos?id=eq.${editId}`, "PATCH", payload);
      } else {
        await sb("bancos", "POST", payload);
      }
      const bcos = await sb("bancos","GET",null,"?activo=eq.true&order=nombre");
      setBancos(bcos||[]);
      setForm({nombre:"",numero_cuenta:"",tipo:"receptor"});
      setEditId(null);
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const edit = (b) => {
    setForm({nombre:b.nombre, numero_cuenta:b.numero_cuenta||"", tipo:b.tipo});
    setEditId(b.id);
  };

  const remove = async (id) => {
    await sb(`bancos?id=eq.${id}`,"PATCH",{activo:false});
    setBancos(prev=>prev.filter(b=>b.id!==id));
  };

  const cancel = () => { setForm({nombre:"",numero_cuenta:"",tipo:"receptor"}); setEditId(null); };
  const close  = () => { cancel(); onClose(); };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",maxHeight:"92vh",overflowY:"auto",width:isMobile?"95vw":"560px"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{color:"#1E293B",fontSize:18,fontWeight:700,margin:0}}>🏦 Catálogo de Bancos</h2>
          <button onClick={close} style={{background:"none",border:"none",color:"#94A3B8",fontSize:22,cursor:"pointer",padding:"4px 8px"}}>✕</button>
        </div>

        {/* Formulario */}
        <div style={{background:"#F8F9FB",borderRadius:10,padding:16,marginBottom:20,border:"1px solid #E2E8F0"}}>
          <div style={{color:"#475569",fontSize:13,fontWeight:600,marginBottom:12}}>
            {editId ? "✏️ Editar banco" : "➕ Agregar banco"}
          </div>

          {/* Tipo primero — determina si mostrar cuenta */}
          <div style={{marginBottom:12}}>
            <label style={{color:"#94A3B8",fontSize:12,display:"block",marginBottom:6}}>Tipo de banco</label>
            <div style={{display:"flex",gap:8}}>
              {[
                {id:"receptor", label:"📥 Receptor", desc:"Cuenta que recibe pagos"},
                {id:"emisor",   label:"📤 Emisor",   desc:"Banco del cliente que paga"},
              ].map(t=>(
                <button key={t.id} onClick={()=>setForm(p=>({...p,tipo:t.id,numero_cuenta:""}))} style={{
                  flex:1,padding:"10px 8px",borderRadius:8,cursor:"pointer",textAlign:"center",
                  border:`2px solid ${form.tipo===t.id?"#3B82F6":"#E2E8F0"}`,
                  background:form.tipo===t.id?"#EFF6FF":"#fff",
                  color:form.tipo===t.id?"#3B82F6":"#475569",
                  fontSize:13,fontWeight:form.tipo===t.id?600:400
                }}>
                  <div>{t.label}</div>
                  <div style={{fontSize:10,color:form.tipo===t.id?"#3B82F6":"#94A3B8",marginTop:2}}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div style={{marginBottom:10}}>
            <label style={{color:"#94A3B8",fontSize:12,display:"block",marginBottom:4}}>Nombre del banco *</label>
            <input
              value={form.nombre}
              onChange={e => setForm(p=>({...p, nombre:e.target.value}))}
              placeholder="Ej: Banrural, BAC, Banco Industrial..."
              style={{background:"#fff",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 14px",color:"#1E293B",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"}}
            />
          </div>

          {/* Número de cuenta — solo receptor */}
          {form.tipo==="receptor" && (
            <div style={{marginBottom:12}}>
              <label style={{color:"#94A3B8",fontSize:12,display:"block",marginBottom:4}}>Número de cuenta</label>
              <input
                value={form.numero_cuenta}
                onChange={e => setForm(p=>({...p, numero_cuenta:e.target.value}))}
                placeholder="Ej: 3-000-123456-7"
                style={{background:"#fff",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 14px",color:"#1E293B",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"}}
              />
            </div>
          )}

          {form.tipo==="emisor" && (
            <div style={{background:"#EFF6FF",borderRadius:8,padding:"8px 12px",marginBottom:12,border:"1px solid #BFDBFE"}}>
              <span style={{color:"#3B82F6",fontSize:12}}>ℹ️ El banco emisor es el banco del cliente — no requiere número de cuenta.</span>
            </div>
          )}

          <div style={{display:"flex",gap:8}}>
            {editId && <button onClick={cancel} style={{background:"#fff",color:"#475569",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer",flex:1}}>Cancelar</button>}
            <button onClick={save} disabled={saving||!form.nombre.trim()} style={{background:"#3B82F6",color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:"pointer",flex:2,opacity:saving||!form.nombre.trim()?0.5:1}}>
              {saving ? "⏳ Guardando..." : editId ? "✓ Actualizar" : "➕ Agregar banco"}
            </button>
          </div>
        </div>

        {/* Lista */}
        <div style={{color:"#475569",fontSize:13,fontWeight:600,marginBottom:10}}>
          Bancos registrados ({bancos.length})
        </div>
        {bancos.length===0 ? (
          <div style={{textAlign:"center",color:"#94A3B8",padding:30,background:"#F8F9FB",borderRadius:10,border:"1px solid #E2E8F0"}}>
            <div style={{fontSize:32,marginBottom:8}}>🏦</div>
            <div>No hay bancos registrados aún</div>
            <div style={{fontSize:12,marginTop:4}}>Agrega los bancos con los que trabajas</div>
          </div>
        ) : bancos.map(b=>(
          <div key={b.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",marginBottom:8,background:"#fff",border:"1px solid #E2E8F0",borderRadius:8}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{color:"#1E293B",fontWeight:600,fontSize:14}}>{b.nombre}</span>
                <span style={{
                  fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,
                  background:b.tipo==="receptor"?"#F0FDF4":"#EFF6FF",
                  color:b.tipo==="receptor"?"#16A34A":"#3B82F6"
                }}>{b.tipo==="receptor"?"📥 Receptor":"📤 Emisor"}</span>
              </div>
              {b.numero_cuenta && (
                <div style={{color:"#94A3B8",fontSize:12,marginTop:2}}>Cuenta: {b.numero_cuenta}</div>
              )}
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>edit(b)} style={{background:"#fff",color:"#475569",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"6px 10px",fontSize:12,cursor:"pointer"}}>✏️</button>
              <button onClick={()=>remove(b.id)} style={{background:"#FEF2F2",color:"#DC2626",border:"1.5px solid #FECACA",borderRadius:8,padding:"6px 10px",fontSize:12,cursor:"pointer"}}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
