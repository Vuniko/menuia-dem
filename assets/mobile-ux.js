/* UI state only. No provider, prompt, payload or conversation-history changes. */
(()=>{
 const panel=document.getElementById('ia-panel'),messages=document.getElementById('ai-messages'),form=document.getElementById('ai-form'),input=document.getElementById('ai-input'),send=form.querySelector('button');
 input.placeholder='Escribí tu pregunta…';input.enterKeyHint='send';input.setAttribute('autocapitalize','sentences');
 const bottom=document.createElement('div');bottom.className='ai-bottom';panel.append(bottom);
 for(const selector of ['.ai-chips','.ai-config','#ai-settings-panel','#ai-form','.ai-disclaimer'])bottom.append(panel.querySelector(selector));
 const thinking=document.createElement('div');thinking.className='ai-thinking';thinking.textContent='MenuIA está preparando tu respuesta';thinking.hidden=true;thinking.setAttribute('role','status');panel.insertBefore(thinking,bottom);
 const newer=document.createElement('button');newer.type='button';newer.className='ai-new-message';newer.textContent='Nueva respuesta ↓';newer.hidden=true;panel.append(newer);
 const status=document.getElementById('ai-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');messages.setAttribute('aria-label','Conversación con MenuIA');
 let follow=true;messages.addEventListener('scroll',()=>{follow=messages.scrollHeight-messages.scrollTop-messages.clientHeight<48;if(follow)newer.hidden=true},{passive:true});
 const scrollEnd=()=>{messages.scrollTop=messages.scrollHeight;newer.hidden=true;follow=true};newer.addEventListener('click',scrollEnd);
 function controls(){send.disabled=aiBusy||!input.value.trim();send.textContent=aiBusy?'…':'Enviar ↑';send.setAttribute('aria-label',aiBusy?'Esperando respuesta':'Enviar pregunta');form.setAttribute('aria-busy',String(aiBusy));thinking.hidden=!aiBusy;document.querySelectorAll('[data-question]').forEach(b=>b.disabled=aiBusy);}
 input.addEventListener('input',controls);new MutationObserver(controls).observe(status,{childList:true,characterData:true,subtree:true});controls();
 // Keep the original rendering function and replace only its scrolling presentation.
 addAiMessage=function(message,type){
  const shouldFollow=type==='user'||follow;const previous=messages.scrollTop;
  const el=document.createElement('div');el.className='ai-bubble '+type;
  if(type==='bot'&&message.startsWith('No pude consultar el asistente')){
   el.dataset.error='true';const fallback=message.split('Te respondo con el modo demo:')[1]||'';
   el.textContent='No pudimos conectar con la IA. Esta respuesta usa la carta de demostración.\n\n'+fallback.replace(/^\\n/,'').trim();
  }else el.textContent=message;
  el.setAttribute('aria-label',type==='user'?'Tu mensaje':'Respuesta de MenuIA');messages.append(el);
  if(shouldFollow)scrollEnd();else{messages.scrollTop=previous;newer.hidden=false;}
 };
 const tabs=[...document.querySelectorAll('[data-tab]')];document.querySelector('.tabs').setAttribute('role','tablist');document.querySelector('.tabs').setAttribute('aria-label','Explorar la demo');
 function tabStates(){for(const tab of tabs){const active=tab.classList.contains('active');tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}}
 tabs.forEach((tab,i)=>{tab.id='tab-'+tab.dataset.tab;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',tab.dataset.tab+'-panel');const target=document.getElementById(tab.dataset.tab+'-panel');target.setAttribute('role','tabpanel');target.setAttribute('aria-labelledby',tab.id);tab.addEventListener('click',tabStates);tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();tabs[next].click();tabs[next].focus();}});});tabStates();
 document.querySelectorAll('.product[data-product]').forEach(card=>card.setAttribute('aria-label','Ver '+card.querySelector('b').textContent+', '+card.querySelector('strong').textContent));
 document.querySelectorAll('.pic img,.strip-photo img').forEach(img=>{img.setAttribute('decoding','async');img.setAttribute('width','650');img.setAttribute('height','410');});
 function viewport(){const v=window.visualViewport;const height=v?v.height:innerHeight;const keyboard=document.activeElement===input&&innerHeight-height>120;document.body.classList.toggle('keyboard-open',keyboard);document.documentElement.style.setProperty('--chat-height',Math.max(300,Math.min(650,height-110))+'px');if(keyboard)requestAnimationFrame(()=>form.scrollIntoView({block:'nearest',behavior:'instant'}));}
 window.visualViewport?.addEventListener('resize',viewport);window.addEventListener('resize',viewport);input.addEventListener('focus',viewport);input.addEventListener('blur',viewport);viewport();
})();
