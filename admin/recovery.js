'use strict';
const form=document.getElementById('recovery-form'),status=document.getElementById('recovery-status'),save=document.getElementById('save-password');
// Credentials in the fragment never reach HTTP logs; clear them before other work.
const recoveryFragment=new URLSearchParams(location.hash.slice(1));
history.replaceState(null,'',location.pathname);
async function recoveryRequest(action,body){const response=await fetch('/api/kb-admin?action='+action,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});const result=await response.json();if(!response.ok)throw Error(result.error||'No pudimos comprobar el enlace.');return result;}
(async()=>{try{
 const accessToken=recoveryFragment.get('access_token'),type=recoveryFragment.get('type');
 recoveryFragment.delete('access_token');recoveryFragment.delete('refresh_token');
 if(accessToken){if(type!=='recovery')throw Error('Ese enlace no corresponde a recuperación de contraseña.');await recoveryRequest('recoveryExchange',{accessToken,type});}
 else await recoveryRequest('recoverySession');
 form.hidden=false;status.textContent='Enlace comprobado. Elegí y confirmá tu nueva contraseña.';
 }catch(error){status.textContent=error.message+' Volvé al panel y solicitá un enlace nuevo.';status.classList.add('error');}})();
form.addEventListener('submit',async event=>{event.preventDefault();if(save.disabled)return;const password=document.getElementById('new-password').value,confirmation=document.getElementById('confirm-password').value;
 if(password!==confirmation){status.textContent='Las contraseñas no coinciden.';return;}
 save.disabled=true;save.textContent='Guardando…';status.textContent='Guardando la contraseña…';
 try{const result=await recoveryRequest('recoverySave',{password});form.reset();form.hidden=true;status.textContent=result.message;}
 catch(error){status.textContent=error.message;}
 finally{save.disabled=false;save.textContent='Guardar nueva contraseña';}
});
