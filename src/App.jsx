import { useState, useEffect } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPABASE_URL = "https://rztujbaunmeqhgrxugth.supabase.co";
const SUPABASE_KEY = "sb_publishable_-BLot_F7KegMytm1jJ9jYg_n0SR2Q-q";

async function sb(table, method = "GET", body = null, query = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─── PALETA ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#F0F2F5", sidebar: "#FFFFFF", card: "#FFFFFF", panel: "#F8F9FB",
  border: "#E2E8F0", text: "#1E293B", textMd: "#475569", textSm: "#94A3B8",
  blue: "#3B82F6", blueBg: "#EFF6FF", blueBorder: "#BFDBFE",
  green: "#16A34A", greenBg: "#F0FDF4",
  red: "#DC2626", redBg: "#FEF2F2", redBorder: "#FECACA",
  amber: "#D97706", overlay: "rgba(15,23,42,0.4)",
};

const CAT_ICONS = { "Lácteos": "🥛", "Bebidas": "🥤", "Panadería": "🍞", "Limpieza": "🧴", "Snacks": "🍿", "Abarrotes": "🛒", "Cuidado Personal": "🧼" };
const PAYMENT_METHODS = [
  { id: "cash", label: "Efectivo", icon: "💵" },
  { id: "card", label: "Tarjeta", icon: "💳" },
  { id: "transfer", label: "Transferencia", icon: "🏦" },
  { id: "credit", label: "Crédito", icon: "📋" },
];

const fmt = (n) => `Q ${Number(n || 0).toFixed(2)}`;
const nowT = () => new Date().toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });

// ─── CONFIG IVA POR DEFECTO ───────────────────────────────────────────────────
const DEFAULT_IVA = {
  porcentaje: 12,          // % del IVA
  incluido: true,          // true = IVA incluido en precio (Guatemala), false = se agrega encima
};

// ─── CÁLCULO DE LÍNEA CON LÓGICA IVA ─────────────────────────────────────────
// ivaConfig: { porcentaje, incluido }
// Si incluido=true:  total = precio*qty (el IVA ya está dentro, solo se desglosa)
//   ivaMonto = total - (total / (1 + tasa))
//   base     = total / (1 + tasa)
// Si incluido=false: total = precio*qty + impuesto (se suma encima)
//   base     = precio*qty
//   ivaMonto = base * tasa
function calcLine(item, ivaConfig) {
  const tasa = (ivaConfig.porcentaje / 100) * (parseFloat(item.impuesto) > 0 ? 1 : 0);
  const bruto = item.precio * item.qty;
  if (ivaConfig.incluido) {
    const base = tasa > 0 ? bruto / (1 + tasa) : bruto;
    const ivaMonto = bruto - base;
    return { base, ivaMonto, total: bruto };
  } else {
    const ivaMonto = bruto * tasa;
    return { base: bruto, ivaMonto, total: bruto + ivaMonto };
  }
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const inputStyle = { background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" };
const btnPrimary = { background: C.blue, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" };
const btnSecondary = { background: C.card, color: C.textMd, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 16px", fontSize: 14, cursor: "pointer" };
const btnDanger = { background: C.redBg, color: C.red, border: `1.5px solid ${C.redBorder}`, borderRadius: 8, padding: "10px 16px", fontSize: 14, cursor: "pointer" };
const btnClose = { background: "none", border: "none", color: C.textSm, fontSize: 20, cursor: "pointer", padding: 4 };
const overlayStyle = { position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(3px)" };
const modalStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" };

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function POS() {
  const [products,          setProducts]          = useState([]);
  const [customers,         setCustomers]         = useState([]);
  const [cart,              setCart]              = useState([]);
  const [customer,          setCustomer]          = useState(null);
  const [search,            setSearch]            = useState("");
  const [category,          setCategory]          = useState("Todas");
  const [activeTab,         setActiveTab]         = useState("pos");
  const [showPayModal,      setShowPayModal]      = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showTicketModal,   setShowTicketModal]   = useState(false);
  const [showConfigModal,   setShowConfigModal]   = useState(false);
  const [lastTicket,        setLastTicket]        = useState(null);
  const [payMethod,         setPayMethod]         = useState("cash");
  const [cashReceived,      setCashReceived]      = useState("");
  const [salesHistory,      setSalesHistory]      = useState([]);
  const [cajaInfo,          setCajaInfo]          = useState(null);
  const [holdSales,         setHoldSales]         = useState([]);
  const [time,              setTime]              = useState(nowT());
  const [notification,      setNotification]      = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [saving,            setSaving]            = useState(false);

  // ── Config IVA (persistida en localStorage)
  const [ivaConfig, setIvaConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("svpos_iva");
      return saved ? JSON.parse(saved) : DEFAULT_IVA;
    } catch { return DEFAULT_IVA; }
  });
  // Config temporal en modal
  const [ivaTemp, setIvaTemp] = useState(ivaConfig);

  useEffect(() => { loadAll(); const t = setInterval(() => setTime(nowT()), 30000); return () => clearInterval(t); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [prods, clients, ventas, caja] = await Promise.all([
        sb("productos", "GET", null, "?activo=eq.true&order=categoria,nombre"),
        sb("clientes",  "GET", null, "?activo=eq.true&order=nombre"),
        sb("ventas",    "GET", null, "?order=created_at.desc&limit=50"),
        sb("caja",      "GET", null, "?order=id.desc&limit=1"),
      ]);
      setProducts(prods || []);
      setCustomers(clients || []);
      setCustomer(clients?.[0] || null);
      setSalesHistory(ventas || []);
      setCajaInfo(caja?.[0] || null);
    } catch { notify("Error conectando a la base de datos", "error"); }
    setLoading(false);
  }

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const saveIvaConfig = () => {
    setIvaConfig(ivaTemp);
    localStorage.setItem("svpos_iva", JSON.stringify(ivaTemp));
    setShowConfigModal(false);
    notify("Configuración de IVA guardada");
  };

  const categories = ["Todas", ...new Set(products.map(p => p.categoria))];

  const filtered = products.filter(p => {
    const ms = search === "" ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.codigo_barras || "").includes(search);
    const mc = category === "Todas" || p.categoria === category;
    return ms && mc;
  });

  // ── Totales del carrito usando ivaConfig
  const cartLines    = cart.map(i => calcLine(i, ivaConfig));
  const cartBase     = cartLines.reduce((s, l) => s + l.base, 0);
  const cartIva      = cartLines.reduce((s, l) => s + l.ivaMonto, 0);
  const cartTotal    = cartLines.reduce((s, l) => s + l.total, 0);
  const cashChange   = parseFloat(cashReceived || 0) - cartTotal;

  const addToCart = (p) => {
    if (p.stock <= 0) { notify("Sin stock disponible", "error"); return; }
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex) {
        if (ex.qty >= p.stock) { notify("Stock insuficiente", "error"); return prev; }
        return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...p, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i;
      const nq = i.qty + delta;
      if (nq <= 0) return null;
      if (nq > i.stock) { notify("Stock insuficiente", "error"); return i; }
      return { ...i, qty: nq };
    }).filter(Boolean));
  };

  const removeItem = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const holdSale = () => {
    if (cart.length === 0) return;
    setHoldSales(prev => [...prev, { id: Date.now(), cart, customer, time: nowT() }]);
    setCart([]); setCustomer(customers[0]);
    notify("Venta en espera");
  };

  const recoverHold = (h) => {
    setCart(h.cart); setCustomer(h.customer);
    setHoldSales(prev => prev.filter(s => s.id !== h.id));
  };

  const completeSale = async () => {
    if (payMethod === "cash" && parseFloat(cashReceived || 0) < cartTotal) { notify("Monto insuficiente", "error"); return; }
    if (payMethod === "credit" && !customer?.credito) { notify("Cliente sin crédito autorizado", "error"); return; }
    setSaving(true);
    try {
      const correlativo = `V-${String(Date.now()).slice(-6)}`;
      const [venta] = await sb("ventas", "POST", {
        correlativo,
        cliente_id: customer?.id || null,
        subtotal: cartBase,
        impuesto: cartIva,
        total: cartTotal,
        metodo_pago: payMethod,
        monto_recibido: payMethod === "cash" ? parseFloat(cashReceived) : cartTotal,
        cambio: payMethod === "cash" ? cashChange : 0,
        cajero: "Admin", sucursal: "Principal",
      });
      await sb("detalle_ventas", "POST", cart.map(item => ({
        venta_id: venta.id, producto_id: item.id, nombre: item.nombre,
        cantidad: item.qty, precio: item.precio, impuesto: item.impuesto,
        subtotal: calcLine(item, ivaConfig).total,
      })));
      for (const item of cart) {
        await sb(`productos?id=eq.${item.id}`, "PATCH", { stock: item.stock - item.qty });
      }
      setProducts(prev => prev.map(p => {
        const inCart = cart.find(i => i.id === p.id);
        return inCart ? { ...p, stock: p.stock - inCart.qty } : p;
      }));
      const ticket = {
        correlativo, date: new Date().toLocaleString("es-GT"),
        customer, items: [...cart],
        base: cartBase, iva: cartIva, total: cartTotal,
        ivaConfig: { ...ivaConfig },
        payMethod,
        cashReceived: payMethod === "cash" ? parseFloat(cashReceived) : cartTotal,
        change: payMethod === "cash" ? cashChange : 0,
      };
      setSalesHistory(prev => [venta, ...prev]);
      setLastTicket(ticket);
      setCart([]); setCustomer(customers[0]); setCashReceived(""); setPayMethod("cash");
      setShowPayModal(false); setShowTicketModal(true);
      notify(`✓ Venta guardada · ${fmt(cartTotal)}`);
    } catch (e) { notify("Error al guardar: " + e.message, "error"); }
    setSaving(false);
  };

  // ─── CONFIG MODAL ─────────────────────────────────────────────────────────────
  const ConfigModal = () => (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, width: 440 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>⚙️ Configuración de IVA</h2>
          <button onClick={() => setShowConfigModal(false)} style={btnClose}>✕</button>
        </div>

        {/* Porcentaje */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: C.textMd, fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
            Porcentaje de IVA
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="number" min="0" max="100" step="0.1"
              value={ivaTemp.porcentaje}
              onChange={e => setIvaTemp(p => ({ ...p, porcentaje: parseFloat(e.target.value) || 0 }))}
              style={{ ...inputStyle, width: 100, fontSize: 20, fontWeight: 700, textAlign: "center" }}
            />
            <span style={{ color: C.textMd, fontSize: 24, fontWeight: 700 }}>%</span>
            <div style={{ color: C.textSm, fontSize: 12, flex: 1 }}>
              Guatemala: 12%<br />Valor estándar en la mayoría de países LATAM
            </div>
          </div>
        </div>

        {/* Modo IVA */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: C.textMd, fontSize: 13, fontWeight: 600, display: "block", marginBottom: 10 }}>
            ¿Cómo se maneja el IVA?
          </label>

          {/* Opción 1: Incluido */}
          <button onClick={() => setIvaTemp(p => ({ ...p, incluido: true }))} style={{
            width: "100%", padding: 16, marginBottom: 8, borderRadius: 10, cursor: "pointer", textAlign: "left",
            border: `2px solid ${ivaTemp.incluido ? C.blue : C.border}`,
            background: ivaTemp.incluido ? C.blueBg : C.panel,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%", border: `2px solid ${ivaTemp.incluido ? C.blue : C.border}`,
                background: ivaTemp.incluido ? C.blue : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {ivaTemp.incluido && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
              </div>
              <div>
                <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>IVA incluido en el precio 🇬🇹</div>
                <div style={{ color: C.textMd, fontSize: 12, marginTop: 2 }}>
                  El precio ya incluye el IVA. Se desglosa en el ticket pero <strong>NO se suma</strong> al total.<br />
                  <span style={{ color: C.green }}>Ejemplo: Producto Q 11.20 → Base Q 10.00 + IVA Q 1.20 = Total Q 11.20</span>
                </div>
              </div>
            </div>
          </button>

          {/* Opción 2: Se agrega */}
          <button onClick={() => setIvaTemp(p => ({ ...p, incluido: false }))} style={{
            width: "100%", padding: 16, borderRadius: 10, cursor: "pointer", textAlign: "left",
            border: `2px solid ${!ivaTemp.incluido ? C.blue : C.border}`,
            background: !ivaTemp.incluido ? C.blueBg : C.panel,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%", border: `2px solid ${!ivaTemp.incluido ? C.blue : C.border}`,
                background: !ivaTemp.incluido ? C.blue : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {!ivaTemp.incluido && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
              </div>
              <div>
                <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>IVA se agrega al precio</div>
                <div style={{ color: C.textMd, fontSize: 12, marginTop: 2 }}>
                  El IVA se suma encima del precio del producto.<br />
                  <span style={{ color: C.amber }}>Ejemplo: Producto Q 10.00 + IVA Q 1.20 = Total Q 11.20</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Preview */}
        <div style={{ background: C.bg, borderRadius: 10, padding: "12px 16px", marginBottom: 20, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.textSm, fontSize: 11, marginBottom: 8, fontWeight: 600 }}>VISTA PREVIA — Producto de Q 100.00</div>
          {(() => {
            const ejemplo = { precio: 100, qty: 1, impuesto: ivaTemp.porcentaje > 0 ? 1 : 0 };
            const l = calcLine(ejemplo, ivaTemp);
            return (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: C.textMd, fontSize: 13 }}>Base</span>
                  <span style={{ color: C.text, fontSize: 13 }}>{fmt(l.base)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: C.textMd, fontSize: 13 }}>IVA ({ivaTemp.porcentaje}%)</span>
                  <span style={{ color: C.text, fontSize: 13 }}>{fmt(l.ivaMonto)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.border}`, paddingTop: 6, marginTop: 4 }}>
                  <span style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>Total a cobrar</span>
                  <span style={{ color: C.green, fontSize: 14, fontWeight: 700 }}>{fmt(l.total)}</span>
                </div>
              </>
            );
          })()}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowConfigModal(false)} style={{ ...btnSecondary, flex: 1 }}>Cancelar</button>
          <button onClick={saveIvaConfig} style={{ ...btnPrimary, flex: 2 }}>✓ Guardar Configuración</button>
        </div>
      </div>
    </div>
  );

  // ─── TICKET MODAL ─────────────────────────────────────────────────────────────
  const TicketModal = () => !lastTicket ? null : (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, width: 340, fontFamily: "'Courier New',monospace" }}>
        <div style={{ textAlign: "center", borderBottom: `1px dashed ${C.border}`, paddingBottom: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.textSm, letterSpacing: 2 }}>DOCUMENTO INTERNO</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "Inter,sans-serif" }}>Smart Valion POS</div>
          <div style={{ fontSize: 11, color: C.textMd }}>Sucursal Principal</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: C.textMd, fontSize: 12 }}>Venta #</span>
          <span style={{ color: C.blue, fontWeight: 700 }}>{lastTicket.correlativo}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ color: C.textMd, fontSize: 12 }}>Fecha</span>
          <span style={{ color: C.text, fontSize: 11 }}>{lastTicket.date}</span>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.textMd, fontSize: 11, marginBottom: 6 }}>Cliente: <span style={{ color: C.text }}>{lastTicket.customer?.nombre || "Consumidor Final"}</span></div>
          {lastTicket.items.map(item => {
            const l = calcLine(item, lastTicket.ivaConfig);
            return (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: C.textMd, fontSize: 12, flex: 1 }}>{item.nombre}</span>
                <span style={{ color: C.textSm, fontSize: 12, width: 36, textAlign: "center" }}>x{item.qty}</span>
                <span style={{ color: C.text, fontSize: 12, width: 72, textAlign: "right" }}>{fmt(l.total)}</span>
              </div>
            );
          })}
        </div>
        <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: 10, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: C.textMd, fontSize: 12 }}>
              Base {lastTicket.ivaConfig.incluido ? "(sin IVA)" : ""}
            </span>
            <span style={{ color: C.text, fontSize: 12 }}>{fmt(lastTicket.base)}</span>
          </div>
          {lastTicket.iva > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: C.textMd, fontSize: 12 }}>
                IVA ({lastTicket.ivaConfig.porcentaje}%) {lastTicket.ivaConfig.incluido ? "incluido" : ""}
              </span>
              <span style={{ color: C.text, fontSize: 12 }}>{fmt(lastTicket.iva)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>TOTAL</span>
            <span style={{ color: C.green, fontSize: 16, fontWeight: 700 }}>{fmt(lastTicket.total)}</span>
          </div>
        </div>
        {lastTicket.payMethod === "cash" && (
          <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMd, fontSize: 12 }}>Recibido</span>
              <span style={{ color: C.text, fontSize: 12 }}>{fmt(lastTicket.cashReceived)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ color: C.textMd, fontSize: 12 }}>Cambio</span>
              <span style={{ color: C.blue, fontSize: 12, fontWeight: 700 }}>{fmt(lastTicket.change)}</span>
            </div>
          </div>
        )}
        <div style={{ textAlign: "center", color: C.textSm, fontSize: 10, marginBottom: 16 }}>
          *** Este no es un documento fiscal ***<br />Powered by Smart Valion ERP
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => window.print()} style={{ ...btnSecondary, flex: 1 }}>🖨️ Imprimir</button>
          <button onClick={() => setShowTicketModal(false)} style={{ ...btnPrimary, flex: 1 }}>Nueva Venta</button>
        </div>
      </div>
    </div>
  );

  // ─── PAY MODAL ────────────────────────────────────────────────────────────────
  const PayModal = () => (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, width: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>Cobrar Venta</h2>
          <button onClick={() => setShowPayModal(false)} style={btnClose}>✕</button>
        </div>
        <div style={{ background: C.bg, borderRadius: 10, padding: "16px 20px", marginBottom: 20, textAlign: "center", border: `1px solid ${C.border}` }}>
          <div style={{ color: C.textSm, fontSize: 12, marginBottom: 4 }}>TOTAL A COBRAR</div>
          <div style={{ color: C.green, fontSize: 36, fontWeight: 800 }}>{fmt(cartTotal)}</div>
          <div style={{ color: C.textMd, fontSize: 12 }}>{cart.length} producto{cart.length !== 1 ? "s" : ""}</div>
        </div>

        {/* Desglose IVA en modal de cobro */}
        {cartIva > 0 && (
          <div style={{ background: C.panel, borderRadius: 8, padding: "10px 14px", marginBottom: 16, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: C.textMd, fontSize: 12 }}>Base imponible</span>
              <span style={{ color: C.text, fontSize: 12 }}>{fmt(cartBase)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMd, fontSize: 12 }}>
                IVA {ivaConfig.porcentaje}% {ivaConfig.incluido ? "(incluido)" : "(agregado)"}
              </span>
              <span style={{ color: C.text, fontSize: 12 }}>{fmt(cartIva)}</span>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.textMd, fontSize: 12, marginBottom: 8 }}>Forma de pago</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {PAYMENT_METHODS.map(m => (
              <button key={m.id} onClick={() => setPayMethod(m.id)} style={{
                padding: "10px 12px", borderRadius: 8,
                border: `1.5px solid ${payMethod === m.id ? C.blue : C.border}`,
                background: payMethod === m.id ? C.blueBg : C.card,
                color: payMethod === m.id ? C.blue : C.textMd,
                fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: payMethod === m.id ? 600 : 400
              }}><span>{m.icon}</span>{m.label}</button>
            ))}
          </div>
        </div>
        {payMethod === "cash" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.textMd, fontSize: 12, marginBottom: 8 }}>Monto recibido</div>
            <input autoFocus type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value)}
              placeholder="0.00" style={{ ...inputStyle, fontSize: 24, textAlign: "right", fontWeight: 700 }} />
            {parseFloat(cashReceived || 0) >= cartTotal && (
              <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", padding: "10px 12px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <span style={{ color: C.textMd }}>Cambio</span>
                <span style={{ color: C.blue, fontWeight: 700, fontSize: 18 }}>{fmt(cashChange)}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {[50, 100, 200, 500].map(amt => (
                <button key={amt} onClick={() => setCashReceived(String(amt))}
                  style={{ flex: 1, padding: "6px 4px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMd, fontSize: 12, cursor: "pointer" }}>
                  Q{amt}
                </button>
              ))}
            </div>
          </div>
        )}
        {payMethod === "credit" && !customer?.credito && (
          <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: C.red, fontSize: 13 }}>
            ⚠️ El cliente seleccionado no tiene crédito autorizado.
          </div>
        )}
        {payMethod === "credit" && customer?.credito && (
          <div style={{ background: C.bg, borderRadius: 8, padding: "10px 14px", marginBottom: 16, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: C.textMd, fontSize: 12 }}>Límite</span>
              <span style={{ color: C.text, fontSize: 12 }}>{fmt(customer.limite_credito)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMd, fontSize: 12 }}>Disponible</span>
              <span style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>{fmt(customer.limite_credito - customer.saldo_credito)}</span>
            </div>
          </div>
        )}
        <button onClick={completeSale} disabled={saving || (payMethod === "cash" && parseFloat(cashReceived || 0) < cartTotal)}
          style={{ ...btnPrimary, width: "100%", padding: 14, fontSize: 16, fontWeight: 700, opacity: saving || (payMethod === "cash" && parseFloat(cashReceived || 0) < cartTotal) ? 0.5 : 1 }}>
          {saving ? "⏳ Guardando..." : "✓ Confirmar Cobro"}
        </button>
      </div>
    </div>
  );

  // ─── CUSTOMER MODAL ───────────────────────────────────────────────────────────
  const CustomerModal = () => (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, width: 400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>Seleccionar Cliente</h2>
          <button onClick={() => setShowCustomerModal(false)} style={btnClose}>✕</button>
        </div>
        {customers.map(c => (
          <button key={c.id} onClick={() => { setCustomer(c); setShowCustomerModal(false); notify(`Cliente: ${c.nombre}`); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "12px 14px", marginBottom: 8,
              background: customer?.id === c.id ? C.blueBg : C.panel,
              border: `1.5px solid ${customer?.id === c.id ? C.blue : C.border}`,
              borderRadius: 8, cursor: "pointer"
            }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{c.nombre}</div>
              <div style={{ color: C.textMd, fontSize: 12 }}>NIT: {c.nit}</div>
            </div>
            {c.credito && <span style={{ background: C.greenBg, color: C.green, fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>CRÉDITO</span>}
          </button>
        ))}
      </div>
    </div>
  );

  // ─── HISTORY TAB ──────────────────────────────────────────────────────────────
  const HistoryTab = () => (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>Historial de Ventas</h2>
        <button onClick={loadAll} style={{ ...btnSecondary, fontSize: 12, padding: "6px 12px" }}>🔄 Actualizar</button>
      </div>
      {salesHistory.length === 0 ? (
        <div style={{ textAlign: "center", color: C.textSm, padding: 60, background: C.card, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
          <div style={{ fontSize: 15, color: C.textMd }}>No hay ventas registradas</div>
        </div>
      ) : salesHistory.map((s, i) => (
        <div key={s.id || i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ color: C.blue, fontWeight: 700, fontSize: 15 }}>{s.correlativo || `#${s.id}`}</span>
              <span style={{ color: C.textSm, fontSize: 12, marginLeft: 10 }}>{new Date(s.created_at).toLocaleString("es-GT")}</span>
            </div>
            <span style={{ color: C.green, fontWeight: 700 }}>{fmt(s.total)}</span>
          </div>
          <div style={{ color: C.textMd, fontSize: 13, marginTop: 6, display: "flex", gap: 16 }}>
            <span>{PAYMENT_METHODS.find(m => m.id === s.metodo_pago)?.label || s.metodo_pago}</span>
            {s.impuesto > 0 && <span style={{ color: C.textSm }}>IVA: {fmt(s.impuesto)}</span>}
          </div>
        </div>
      ))}
    </div>
  );

  // ─── CAJA TAB ─────────────────────────────────────────────────────────────────
  const CajaTab = () => {
    const totalEfectivo = salesHistory.filter(v => v.metodo_pago === "cash").reduce((s, v) => s + parseFloat(v.total || 0), 0);
    const fondo = parseFloat(cajaInfo?.fondo || 500);
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Estado de Caja</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Fondo inicial", value: fmt(fondo), color: C.textMd },
            { label: "Ventas efectivo", value: fmt(totalEfectivo), color: C.blue },
            { label: "Total esperado", value: fmt(fondo + totalEfectivo), color: C.green },
            { label: "Estado", value: cajaInfo?.estado === "abierta" ? "Abierta" : "Cerrada", color: cajaInfo?.estado === "abierta" ? C.green : C.red },
          ].map(item => (
            <div key={item.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ color: C.textSm, fontSize: 12, marginBottom: 4 }}>{item.label}</div>
              <div style={{ color: item.color, fontSize: 20, fontWeight: 700 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg, flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 32 }}>⚡</div>
      <div style={{ color: C.blue, fontSize: 16, fontWeight: 600 }}>Smart Valion POS</div>
      <div style={{ color: C.textSm, fontSize: 13 }}>Conectando a la base de datos...</div>
    </div>
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, fontFamily: "Inter,system-ui,sans-serif", overflow: "hidden" }}>

      {/* SIDEBAR */}
      <div style={{ width: 210, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "2px 0 8px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "20px 18px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.blue, fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>SMART VALION</div>
          <div style={{ color: C.textSm, fontSize: 10, letterSpacing: 2, marginTop: 2 }}>POS · ERP RETAIL</div>
        </div>
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {[{ id: "pos", icon: "🛒", label: "Punto de Venta" }, { id: "history", icon: "🧾", label: "Historial" }, { id: "caja", icon: "💰", label: "Caja" }].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "9px 12px", marginBottom: 4, borderRadius: 8, border: "none",
              background: activeTab === item.id ? C.blueBg : "transparent",
              color: activeTab === item.id ? C.blue : C.textMd,
              fontSize: 13, fontWeight: activeTab === item.id ? 600 : 400, cursor: "pointer", textAlign: "left"
            }}><span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}</button>
          ))}
          <div style={{ borderTop: `1px solid ${C.border}`, margin: "8px 0" }} />
          {[{ id: "productos", icon: "📦", label: "Productos" }, { id: "inventario", icon: "📊", label: "Inventario" }, { id: "clientes", icon: "👤", label: "Clientes" }, { id: "reportes", icon: "📈", label: "Reportes" }].map(item => (
            <button key={item.id} onClick={() => notify(`Módulo ${item.label} — próximamente`, "info")} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "9px 12px", marginBottom: 4, borderRadius: 8, border: "none",
              background: "transparent", color: C.textSm, fontSize: 13, cursor: "pointer", textAlign: "left"
            }}><span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}</button>
          ))}
          <div style={{ borderTop: `1px solid ${C.border}`, margin: "8px 0" }} />
          {/* Configuración activa */}
          <button onClick={() => { setIvaTemp(ivaConfig); setShowConfigModal(true); }} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "9px 12px", marginBottom: 4, borderRadius: 8, border: "none",
            background: "transparent", color: C.textMd, fontSize: 13, cursor: "pointer", textAlign: "left"
          }}><span style={{ fontSize: 16 }}>⚙️</span>Configuración</button>
        </nav>
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}`, background: C.panel }}>
          {/* Badge IVA config */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 10, background: ivaConfig.incluido ? C.greenBg : C.blueBg, color: ivaConfig.incluido ? C.green : C.blue, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
              IVA {ivaConfig.porcentaje}% {ivaConfig.incluido ? "incluido" : "agregado"}
            </span>
          </div>
          <div style={{ color: C.textMd, fontSize: 12, fontWeight: 600 }}>Admin</div>
          <div style={{ color: C.textSm, fontSize: 11 }}>Sucursal Principal</div>
          <div style={{ color: C.textSm, fontSize: 11, marginTop: 2 }}>{time} · <span style={{ color: C.green }}>●</span> En línea</div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeTab !== "pos" ? (
          <div style={{ flex: 1, overflowY: "auto" }}>
            {activeTab === "history" && <HistoryTab />}
            {activeTab === "caja" && <CajaTab />}
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Products */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, background: C.card, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="🔍 Buscar por nombre, SKU o código de barras..."
                    style={{ ...inputStyle, flex: 1 }} />
                  {holdSales.length > 0 && (
                    <button onClick={() => recoverHold(holdSales[0])} style={{ ...btnSecondary, whiteSpace: "nowrap", fontSize: 12 }}>
                      ⏸ En espera ({holdSales.length})
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)} style={{
                      padding: "4px 12px", borderRadius: 20,
                      border: `1.5px solid ${category === cat ? C.blue : C.border}`,
                      background: category === cat ? C.blueBg : C.card,
                      color: category === cat ? C.blue : C.textMd,
                      fontSize: 12, cursor: "pointer", fontWeight: category === cat ? 600 : 400
                    }}>{cat}</button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 16, background: C.bg }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: "center", color: C.textSm, padding: 60 }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
                    <div>No se encontraron productos</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(155px,1fr))", gap: 10 }}>
                    {filtered.map(p => (
                      <button key={p.id} onClick={() => addToCart(p)}
                        style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14, cursor: p.stock > 0 ? "pointer" : "not-allowed", textAlign: "left", opacity: p.stock === 0 ? 0.45 : 1, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "all 0.15s" }}
                        onMouseEnter={e => { if (p.stock > 0) { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.boxShadow = "0 4px 12px rgba(59,130,246,0.15)"; } }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"; }}>
                        <div style={{ fontSize: 26, marginBottom: 8 }}>{CAT_ICONS[p.categoria] || "📦"}</div>
                        <div style={{ color: C.text, fontSize: 13, fontWeight: 600, marginBottom: 3, lineHeight: 1.3 }}>{p.nombre}</div>
                        <div style={{ color: C.textSm, fontSize: 10, marginBottom: 6 }}>{p.sku}</div>
                        <div style={{ color: C.green, fontSize: 16, fontWeight: 700 }}>{fmt(p.precio)}</div>
                        <div style={{ color: p.stock < 10 ? C.amber : C.textSm, fontSize: 10, marginTop: 4 }}>Stock: {p.stock}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cart */}
            <div style={{ width: 330, background: C.card, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", boxShadow: "-2px 0 8px rgba(0,0,0,0.04)" }}>
              <button onClick={() => setShowCustomerModal(true)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: C.panel, border: "none", borderBottom: `1px solid ${C.border}`, cursor: "pointer", width: "100%" }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: C.textSm, fontSize: 10, marginBottom: 2 }}>CLIENTE</div>
                  <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{customer?.nombre || "Consumidor Final"}</div>
                </div>
                <span style={{ color: C.blue, fontSize: 18 }}>›</span>
              </button>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {cart.length === 0 ? (
                  <div style={{ textAlign: "center", color: C.textSm, padding: "40px 20px" }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
                    <div style={{ fontSize: 13 }}>Toca un producto para agregar</div>
                  </div>
                ) : cart.map(item => {
                  const l = calcLine(item, ivaConfig);
                  return (
                    <div key={item.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, marginRight: 8 }}>
                          <div style={{ color: C.text, fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{item.nombre}</div>
                          <div style={{ color: C.textSm, fontSize: 11, marginTop: 2 }}>{fmt(item.precio)} c/u</div>
                        </div>
                        <button onClick={() => removeItem(item.id)} style={{ color: C.textSm, background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 2 }}>✕</button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button onClick={() => updateQty(item.id, -1)} style={{ width: 28, height: 28, borderRadius: 6, background: C.panel, border: `1px solid ${C.border}`, color: C.textMd, cursor: "pointer", fontSize: 16 }}>−</button>
                          <span style={{ color: C.text, fontSize: 14, fontWeight: 600, width: 28, textAlign: "center" }}>{item.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)} style={{ width: 28, height: 28, borderRadius: 6, background: C.panel, border: `1px solid ${C.border}`, color: C.textMd, cursor: "pointer", fontSize: 16 }}>+</button>
                        </div>
                        <span style={{ color: C.green, fontWeight: 700, fontSize: 15 }}>{fmt(l.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ borderTop: `1px solid ${C.border}`, padding: 16, background: C.panel }}>
                {cartIva > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: C.textMd, fontSize: 12 }}>Base</span>
                      <span style={{ color: C.textMd, fontSize: 12 }}>{fmt(cartBase)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: C.textMd, fontSize: 12 }}>IVA {ivaConfig.porcentaje}% {ivaConfig.incluido ? "(incluido)" : ""}</span>
                      <span style={{ color: C.textMd, fontSize: 12 }}>{fmt(cartIva)}</span>
                    </div>
                  </>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, paddingTop: cartIva > 0 ? 8 : 0, borderTop: cartIva > 0 ? `1px solid ${C.border}` : "none" }}>
                  <span style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>Total</span>
                  <span style={{ color: C.green, fontSize: 24, fontWeight: 800 }}>{fmt(cartTotal)}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <button onClick={holdSale} disabled={cart.length === 0} style={{ ...btnSecondary, flex: 1, opacity: cart.length === 0 ? 0.4 : 1 }}>⏸ Espera</button>
                  <button onClick={() => { setCart([]); setCustomer(customers[0]); }} disabled={cart.length === 0} style={{ ...btnDanger, padding: "10px 14px", opacity: cart.length === 0 ? 0.4 : 1 }}>🗑</button>
                </div>
                <button onClick={() => cart.length > 0 && setShowPayModal(true)} disabled={cart.length === 0}
                  style={{ ...btnPrimary, width: "100%", padding: 14, fontSize: 16, fontWeight: 700, opacity: cart.length === 0 ? 0.4 : 1 }}>
                  💳 Cobrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPayModal      && <PayModal />}
      {showCustomerModal && <CustomerModal />}
      {showTicketModal   && <TicketModal />}
      {showConfigModal   && <ConfigModal />}

      {notification && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: notification.type === "error" ? C.redBg : notification.type === "info" ? C.blueBg : C.greenBg,
          border: `1px solid ${notification.type === "error" ? C.redBorder : notification.type === "info" ? C.blueBorder : "#BBF7D0"}`,
          color: notification.type === "error" ? C.red : notification.type === "info" ? C.blue : C.green,
          padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500,
          zIndex: 9999, boxShadow: "0 8px 32px rgba(0,0,0,0.12)"
        }}>{notification.msg}</div>
      )}
    </div>
  );
}
