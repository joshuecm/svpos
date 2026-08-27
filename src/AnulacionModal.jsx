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
  "Producto defectuoso",
  "Producto incorrecto",
  "Cliente no quiere el producto",
  "Error en precio",
  "Factura duplicada",
  "Otro",
];

// ─── Teclado PIN reutilizable ─────────────────────────────────────────────────
function TecladoPIN({ pin, onDigito, onBorrar }) {
  return (
    <div>
      <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:16}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{width:48,height:48,borderRadius:10,border:`2px solid ${pin.length>i?"#DC2626":"#E2E8F0"}`,background:pin.length>i?"#FEF2F2":"#F8F9FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:"#DC2626"}}>
            {pin.length>i?"●":""}
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,maxWidth:240,margin:"0 auto"}}>
        {[1,2,3,4,5,6,7,8,9,"",0,"←"].map((d,i)=>(
          <button key={i} onClick={()=>d==="←"?onBorrar():d!==""&&onDigito(String(d))}
            disabled={d===""}
            style={{height:56,borderRadius:10,border:"1.5px solid #E2E8F0",background:d==="←"?"#FEF2F2":d===""?"transparent":"#fff",color:d==="←"?"#DC2626":"#1E293B",fontSize:d==="←"?18:20,fontWeight:600,cursor:d===""?"default":"pointer",opacity:d===""?0:1}}>
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Validar PIN y permisos ───────────────────────────────────────────────────
async function validarPIN(pin, permisosRequeridos) {
  const usuarios = await sb("usuarios","GET",null,`?pin=eq.${pin}&activo=eq.true`);
  if(!usuarios?.length) return {ok:false, error:"PIN incorrecto"};
  const autorizador = usuarios[0];
  const permisos = await sb("rol_permisos","GET",null,
    `?rol_id=eq.${autorizador.rol_id}&permiso=in.(${permisosRequeridos.join(",")})&valor=eq.true`
  );
  const tienePermiso = permisosRequeridos.some(p=> permisos?.some(rp=>rp.permiso===p));
  if(!tienePermiso) return {ok:false, error:`${autorizador.nombre} no tiene permiso para esta operación`};
  return {ok:true, autorizador};
}

// ─── MODAL DEVOLUCIÓN ─────────────────────────────────────────────────────────
export default function AnulacionModal({ venta, usuario, cajaActual, onClose, onAnulada, isMobile }) {
  const [paso,   setPaso]   = useState("motivo");
  const [motivo, setMotivo] = useState("");
  const [pin,    setPin]    = useState("");
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  const agregarDigito = (d) => { if(pin.length<4) setPin(p=>p+d); };
  const borrar = () => setPin(p=>p.slice(0,-1));

  const confirmar = async () => {
    setSaving(true); setError("");
    try {
      const result = await validarPIN(pin, ["anular_propio","anular_otros"]);
      if(!result.ok){ setError(result.error); setSaving(false); return; }

      const autorizador = result.autorizador;
      const puedeAnularOtros  = (await sb("rol_permisos","GET",null,`?rol_id=eq.${autorizador.rol_id}&permiso=eq.anular_otros&valor=eq.true`))?.length>0;
      const puedeAnularPropio = (await sb("rol_permisos","GET",null,`?rol_id=eq.${autorizador.rol_id}&permiso=eq.anular_propio&valor=eq.true`))?.length>0;

      if(!puedeAnularOtros && puedeAnularPropio && autorizador.nombre!==venta.cajero){
        setError(`${autorizador.nombre} solo puede autorizar devoluciones de sus propias facturas`);
        setSaving(false); return;
      }

      // 1. Registrar en anulaciones
      await sb("anulaciones","POST",{
        venta_id:venta.id, correlativo:venta.correlativo,
        motivo, cajero:venta.cajero,
        autorizado_por:autorizador.nombre,
        monto:parseFloat(venta.total||0),
      });

      // 2. Marcar venta como anulada
      await sb(`ventas?id=eq.${venta.id}`,"PATCH",{anulada:true, motivo_anulacion:motivo});

      // 3. Revertir stock
      const detalles = await sb("detalle_ventas","GET",null,`?venta_id=eq.${venta.id}`);
      for(const det of (detalles||[])) {
        const prods = await sb("productos","GET",null,`?id=eq.${det.producto_id}`);
        if(prods?.[0]) {
          await sb(`productos?id=eq.${det.producto_id}`,"PATCH",{
            stock: parseFloat(prods[0].stock||0) + parseFloat(det.cantidad||0)
          });
        }
      }

      // 4. Revertir saldo cliente si era crédito
      if((venta.metodo_pago||"").includes("credit") && venta.cliente_id) {
        const clientes = await sb("clientes","GET",null,`?id=eq.${venta.cliente_id}`);
        if(clientes?.[0]) {
          await sb(`clientes?id=eq.${venta.cliente_id}`,"PATCH",{
            saldo_credito: Math.max(0, parseFloat(clientes[0].saldo_credito||0) - parseFloat(venta.total||0))
          });
        }
      }

      // 5. Registrar salida de efectivo si hay caja abierta
      if(cajaActual) {
        await sb("salidas_caja","POST",{
          caja_id: cajaActual.id,
          serie:   cajaActual.serie,
          cajero:  cajaActual.cajero,
          monto:   parseFloat(venta.total||0),
          motivo:  `Devolución factura ${venta.correlativo} — ${motivo}`,
        });
      }

      onAnulada(autorizador.nombre);
    } catch(e){ setError("Error: "+e.message); }
    setSaving(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,backdropFilter:"blur(3px)"}}>
      <div style={{background:"#fff",borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",width:isMobile?"95vw":"400px",overflow:"hidden"}}>
        <div style={{background:"#DC2626",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{color:"#fff",fontWeight:700,fontSize:16}}>↩️ Devolución en Efectivo</div>
            <div style={{color:"#FCA5A5",fontSize:12}}>{venta.correlativo} · {fmt(venta.total)}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:24}}>
          {error&&<div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"8px 14px",color:"#DC2626",fontSize:13,marginBottom:14}}>{error}</div>}

          {paso==="motivo"&&(
            <>
              <div style={{color:"#475569",fontSize:13,fontWeight:600,marginBottom:12}}>Motivo de la devolución</div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
                {MOTIVOS.map(m=>(
                  <button key={m} onClick={()=>setMotivo(m)}
                    style={{padding:"10px 14px",borderRadius:8,border:`1.5px solid ${motivo===m?"#DC2626":"#E2E8F0"}`,background:motivo===m?"#FEF2F2":"#F8F9FB",color:motivo===m?"#DC2626":"#475569",fontSize:13,cursor:"pointer",textAlign:"left",fontWeight:motivo===m?600:400}}>
                    {motivo===m?"● ":"○ "}{m}
                  </button>
                ))}
              </div>
              {!cajaActual&&(
                <div style={{background:"#FFF7ED",border:"1px solid #FCD34D",borderRadius:8,padding:"8px 14px",fontSize:12,color:"#92400E",marginBottom:14}}>
                  ⚠️ No hay caja abierta — la devolución se procesará sin registrar salida de efectivo
                </div>
              )}
              <div style={{display:"flex",gap:10}}>
                <button onClick={onClose} style={{flex:1,padding:10,borderRadius:8,border:"1.5px solid #E2E8F0",background:"#fff",color:"#475569",fontSize:14,cursor:"pointer"}}>Cancelar</button>
                <button onClick={()=>{if(!motivo){setError("Selecciona un motivo");return;}setError("");setPaso("pin");}}
                  style={{flex:2,padding:10,borderRadius:8,border:"none",background:"#DC2626",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>
                  Continuar →
                </button>
              </div>
            </>
          )}

          {paso==="pin"&&(
            <>
              <div style={{textAlign:"center",marginBottom:16}}>
                <div style={{color:"#475569",fontSize:13,marginBottom:4}}>Motivo: <strong style={{color:"#DC2626"}}>{motivo}</strong></div>
                <div style={{background:"#FEF2F2",borderRadius:8,padding:"8px 14px",marginBottom:16}}>
                  <div style={{color:"#DC2626",fontSize:13,fontWeight:600}}>Se devolverán {fmt(venta.total)} en efectivo</div>
                  {cajaActual&&<div style={{color:"#94A3B8",fontSize:11,marginTop:2}}>Se registrará como salida de caja · Serie {cajaActual.serie}</div>}
                </div>
                <div style={{color:"#1E293B",fontSize:13,fontWeight:600,marginBottom:12}}>PIN de autorización</div>
                <TecladoPIN pin={pin} onDigito={agregarDigito} onBorrar={borrar}/>
              </div>
              <div style={{display:"flex",gap:10,marginTop:16}}>
                <button onClick={()=>{setPaso("motivo");setPin("");setError("");}} style={{flex:1,padding:10,borderRadius:8,border:"1.5px solid #E2E8F0",background:"#fff",color:"#475569",fontSize:14,cursor:"pointer"}}>← Volver</button>
                <button onClick={confirmar} disabled={saving||pin.length!==4}
                  style={{flex:2,padding:10,borderRadius:8,border:"none",background:"#DC2626",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",opacity:(saving||pin.length!==4)?0.5:1}}>
                  {saving?"⏳ Procesando...":"✓ Confirmar devolución"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
