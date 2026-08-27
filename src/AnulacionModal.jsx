import { useState } from "react";

const SUPABASE_URL = "https://rztujbaunmeqhgrxugth.supabase.co";
const SUPABASE_KEY = "sb_publishable_-BLot_F7KegMytm1jJ9jYg_n0SR2Q-q";

async function sb(table, method="GET", body=null, query="") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method==="POST"?"return=representation":"",
    },
    body: body?JSON.stringify(body):null,
  });
  if(!res.ok){ const e=await res.text(); throw new Error(e); }
  const t=await res.text();
  return t?JSON.parse(t):null;
}

const fmt = (n) => `Q ${Number(n||0).toFixed(2)}`;

const MOTIVOS = [
  "Error en producto",
  "Error en precio",
  "Cliente canceló",
  "Factura duplicada",
  "Error de sistema",
  "Otro",
];

export default function AnulacionModal({ venta, usuario, cajaActual, onClose, onAnulada, isMobile }) {
  const [paso,   setPaso]   = useState("motivo");
  const [motivo, setMotivo] = useState("");
  const [pin,    setPin]    = useState("");
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  const esMismoTurno = cajaActual &&
    new Date(venta.created_at) >= new Date(cajaActual.abierta_at.replace(' ','+')) &&
    venta.cajero === cajaActual.cajero;

  const agregarDigito = (d) => { if(pin.length<4) setPin(p=>p+d); };
  const borrar = () => setPin(p=>p.slice(0,-1));

  const confirmar = async () => {
    if(pin.length!==4){ setError("El PIN debe ser de 4 dígitos"); return; }
    setSaving(true); setError("");
    try {
      // 1. Validar PIN — buscar usuario único con ese PIN
      const usuarios = await sb("usuarios","GET",null,`?pin=eq.${pin}&activo=eq.true`);
      if(!usuarios?.length){ setError("PIN incorrecto"); setSaving(false); return; }
      if(usuarios.length>1){ setError("PIN duplicado — contacta al administrador"); setSaving(false); return; }

      const autorizador = usuarios[0];

      // 2. Verificar permisos
      const permisos = await sb("rol_permisos","GET",null,
        `?rol_id=eq.${autorizador.rol_id}&permiso=in.(anular_propio,anular_otros)&valor=eq.true`
      );
      const puedeOtros  = permisos?.some(p=>p.permiso==="anular_otros");
      const puedePropio = permisos?.some(p=>p.permiso==="anular_propio");

      if(!puedeOtros && !puedePropio){
        setError(`${autorizador.nombre} no tiene permiso para anular facturas`);
        setSaving(false); return;
      }
      if(!puedeOtros && puedePropio && autorizador.nombre!==venta.cajero){
        setError(`${autorizador.nombre} solo puede anular sus propias facturas`);
        setSaving(false); return;
      }

      // 3. Registrar en tabla anulaciones
      await sb("anulaciones","POST",{
        venta_id:       venta.id,
        correlativo:    venta.correlativo,
        motivo,
        cajero:         venta.cajero,
        autorizado_por: autorizador.nombre,
        monto:          parseFloat(venta.total||0),
      });

      // 4. Marcar venta como anulada
      await sb(`ventas?id=eq.${venta.id}`,"PATCH",{
        anulada:          true,
        motivo_anulacion: motivo,
      });

      // 5. Revertir stock — leer stock actual y sumar cantidad
      const detalles = await sb("detalle_ventas","GET",null,`?venta_id=eq.${venta.id}`);
      for(const det of (detalles||[])) {
        if(!det.producto_id) continue;
        const prods = await sb("productos","GET",null,`?id=eq.${det.producto_id}&select=id,stock`);
        if(prods?.[0]) {
          const stockActual = parseFloat(prods[0].stock||0);
          const cantidad    = parseFloat(det.cantidad||0);
          await sb(`productos?id=eq.${det.producto_id}`,"PATCH",{
            stock: stockActual + cantidad
          });
        }
      }

      // 6. Revertir saldo cliente si era crédito
      if((venta.metodo_pago||"").includes("credit") && venta.cliente_id) {
        const clientes = await sb("clientes","GET",null,`?id=eq.${venta.cliente_id}`);
        if(clientes?.[0]) {
          await sb(`clientes?id=eq.${venta.cliente_id}`,"PATCH",{
            saldo_credito: Math.max(0, parseFloat(clientes[0].saldo_credito||0) - parseFloat(venta.total||0))
          });
        }
      }

      // 7. Anulación NO registra salida de efectivo — la venta se borra del total del turno

      onAnulada(autorizador.nombre);
    } catch(e){ setError("Error: "+e.message); }
    setSaving(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,backdropFilter:"blur(3px)"}}>
      <div style={{background:"#fff",borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",width:isMobile?"95vw":"400px",overflow:"hidden"}}>

        {/* Header */}
        <div style={{background:"#DC2626",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{color:"#fff",fontWeight:700,fontSize:16}}>🚫 Anular Factura</div>
            <div style={{color:"#FCA5A5",fontSize:12}}>{venta.correlativo} · {fmt(venta.total)}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer"}}>✕</button>
        </div>

        <div style={{padding:24}}>
          {error&&(
            <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"8px 14px",color:"#DC2626",fontSize:13,marginBottom:14}}>
              {error}
            </div>
          )}

          {/* Paso 1 — Motivo */}
          {paso==="motivo"&&(
            <>
              <div style={{color:"#475569",fontSize:13,fontWeight:600,marginBottom:4}}>Motivo de anulación</div>
              <div style={{color:"#94A3B8",fontSize:11,marginBottom:12}}>
                La anulación revierte el stock. No registra salida de efectivo.
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
                {MOTIVOS.map(m=>(
                  <button key={m} onClick={()=>setMotivo(m)}
                    style={{padding:"10px 14px",borderRadius:8,border:`1.5px solid ${motivo===m?"#DC2626":"#E2E8F0"}`,background:motivo===m?"#FEF2F2":"#F8F9FB",color:motivo===m?"#DC2626":"#475569",fontSize:13,cursor:"pointer",textAlign:"left",fontWeight:motivo===m?600:400}}>
                    {motivo===m?"● ":"○ "}{m}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={onClose} style={{flex:1,padding:10,borderRadius:8,border:"1.5px solid #E2E8F0",background:"#fff",color:"#475569",fontSize:14,cursor:"pointer"}}>
                  Cancelar
                </button>
                <button onClick={()=>{
                  if(!motivo){setError("Selecciona un motivo");return;}
                  setError(""); setPaso("pin");
                }} style={{flex:2,padding:10,borderRadius:8,border:"none",background:"#DC2626",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>
                  Continuar →
                </button>
              </div>
            </>
          )}

          {/* Paso 2 — PIN */}
          {paso==="pin"&&(
            <>
              <div style={{textAlign:"center",marginBottom:16}}>
                <div style={{color:"#475569",fontSize:13,marginBottom:8}}>
                  Motivo: <strong style={{color:"#DC2626"}}>{motivo}</strong>
                </div>
                <div style={{background:"#FEF2F2",borderRadius:8,padding:"10px 14px",marginBottom:16}}>
                  <div style={{color:"#DC2626",fontSize:13,fontWeight:600}}>
                    Se anulará {venta.correlativo} por {fmt(venta.total)}
                  </div>
                  <div style={{color:"#94A3B8",fontSize:11,marginTop:4}}>
                    El stock de los productos será revertido
                  </div>
                </div>
                <div style={{color:"#1E293B",fontSize:13,fontWeight:600,marginBottom:12}}>
                  Ingresa PIN de autorización
                </div>
                {/* Display PIN */}
                <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:16}}>
                  {[0,1,2,3].map(i=>(
                    <div key={i} style={{width:48,height:48,borderRadius:10,border:`2px solid ${pin.length>i?"#DC2626":"#E2E8F0"}`,background:pin.length>i?"#FEF2F2":"#F8F9FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:"#DC2626"}}>
                      {pin.length>i?"●":""}
                    </div>
                  ))}
                </div>
                {/* Teclado */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,maxWidth:240,margin:"0 auto"}}>
                  {[1,2,3,4,5,6,7,8,9,"",0,"←"].map((d,i)=>(
                    <button key={i} onClick={()=>d==="←"?borrar():d!==""&&agregarDigito(String(d))}
                      disabled={d===""}
                      style={{height:56,borderRadius:10,border:"1.5px solid #E2E8F0",background:d==="←"?"#FEF2F2":d===""?"transparent":"#fff",color:d==="←"?"#DC2626":"#1E293B",fontSize:d==="←"?18:20,fontWeight:600,cursor:d===""?"default":"pointer",opacity:d===""?0:1}}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",gap:10,marginTop:8}}>
                <button onClick={()=>{setPaso("motivo");setPin("");setError("");}} style={{flex:1,padding:10,borderRadius:8,border:"1.5px solid #E2E8F0",background:"#fff",color:"#475569",fontSize:14,cursor:"pointer"}}>
                  ← Volver
                </button>
                <button onClick={confirmar} disabled={saving||pin.length!==4}
                  style={{flex:2,padding:10,borderRadius:8,border:"none",background:"#DC2626",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",opacity:(saving||pin.length!==4)?0.5:1}}>
                  {saving?"⏳ Procesando...":"✓ Confirmar anulación"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
