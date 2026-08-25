import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Login from './Login.jsx'
import { cargarUsuarioCompleto } from './usuarios.js'

function Root() {
  const [usuario,  setUsuario]  = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const saved = localStorage.getItem("svpos_user");
        if (saved) {
          const u = JSON.parse(saved);
          const uCompleto = await cargarUsuarioCompleto(u);
          localStorage.setItem("svpos_user", JSON.stringify(uCompleto));
          setUsuario(uCompleto);
        }
      } catch(e) { console.error(e); }
      setChecking(false);
    };
    init();
  }, []);

  const handleLogin  = (u) => setUsuario(u);
  const handleLogout = () => { localStorage.removeItem("svpos_user"); setUsuario(null); };

  if (checking) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#F0F2F5",flexDirection:"column",gap:16,fontFamily:"Inter,system-ui,sans-serif"}}>
      <div style={{fontSize:40}}>⚡</div>
      <div style={{color:"#3B82F6",fontSize:16,fontWeight:600}}>Smart Valion POS</div>
      <div style={{color:"#94A3B8",fontSize:13}}>Cargando...</div>
    </div>
  );

  if (!usuario) return <Login onLogin={handleLogin}/>;
  return <App usuario={usuario} onLogout={handleLogout}/>;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root/></React.StrictMode>
)
