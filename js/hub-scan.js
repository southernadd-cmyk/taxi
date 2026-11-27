/* Same-origin Hub bridge. Standalone retains its local scanner. */
function installHubScan() {
  const manager = window.NarbeScanManager;
  if (!manager?.createChoiceScan || !window.NarbeChoiceScan || !window.NarbeVoiceManager) return false;
  let controller=null, items=[], host=null, buttons=[], groupBack=null, generation=0;
  let state={index:-1}, quiet=false, enterHeld=false, spaceHeld=false, holdT=null, reverseT=null;
  let lastFocus=null, brakeOwned=false, backConsumed=false, adopted=null, selecting=false;
  const BACK={id:"__switchcab_back",label:"Back",say:"Back"};
  const parent={id:"__switchcab_group",label:"Editor choices"};
  function stopReverse(){clearTimeout(holdT);clearInterval(reverseT);holdT=reverseT=null}
  function cancelInput(){
    stopReverse(); enterHeld=spaceHeld=brakeOwned=backConsumed=false;
    if(controller){controller.setSuspended(true);controller.setSuspended(false)}
  }
  function draw(item,next){
    state=next;const back=item===BACK,k=items.indexOf(item);
    buttons.forEach((b,j)=>b.className="opt"+(j===k?" on":"")+(j===k&&next.braked?" braked":""));
    host?.classList.toggle("backstop",back);
    const status=$("#status");status.classList.toggle("hide",!next.parked);status.textContent="Parked. Press Enter to carry on.";
    if(next.parked)status.scrollIntoView?.({block:"nearest"});
    if(k>=0)buttons[k]?.scrollIntoView?.({block:"nearest",inline:"nearest",behavior:"instant"});
    if(!quiet&&k>=0&&item!==lastFocus)scanFocus(item);
    lastFocus=item;
    window.onScanRender?.(back?{focus:"⬅ BACK",say:"Back"}:k>=0?item:null,next.braked);
  }
  function choose(it){
    if(!it)return;const epoch=generation,before=Voice.latestTicket;
    sfx("select");
    if(it===BACK){groupBack?.();return}
    selecting=true;
    try { it.act(); } finally { selecting=false; }
    if(epoch===generation&&controller){
      adopted=Voice.latestTicket!==before?Voice.latestTicket:null;
      controller.announceCurrent(adopted ? 'feedback' : undefined);
      adopted=null;
    }
  }
  function renderButtons(){
    host.innerHTML="";
    const epoch=generation;
    buttons=items.map(it=>{
      const b=document.createElement("button");b.type="button";b.tabIndex=-1;
      if(it.html)b.innerHTML=it.html;else b.textContent=it.label;
      b.setAttribute("aria-label",it.say||it.label);
      b.addEventListener("click",()=>{if(epoch===generation&&items.includes(it)){resetKeys();choose(it)}});
      host.appendChild(b);return b;
    });
    const back=$("#editorBack");back.classList.toggle("hide",!groupBack);
    back.onclick=groupBack?()=>{resetKeys();groupBack?.()}:null;
  }
  function prepare(list,el,back){
    resetKeys();controller?.dispose();controller=null;generation++;
    if(host&&host!==el){host.innerHTML="";host.classList.remove("backstop")}
    host=el;items=list.filter(x=>!x.disabled&&!x.hidden);groupBack=back||null;lastFocus=null;
    renderButtons();quiet=true;
    controller=manager.createChoiceScan({
      choice:true,holdThreshold:HOLD_MS,statusHost:$("#status"),
      badge:{update(){},destroy(){$("#status").classList.add("hide")}},
      getId:x=>x.id,getLabel:x=>x.say||x.label,
      speak:label=>quiet?null:adopted||window.NarbeVoiceManager.speak(label),
      onHighlight:draw,onSelect:choose
    });
  }
  const api={
    get index(){return state.index>=0&&state.index<items.length?state.index:-1},
    get items(){return items},get braked(){return !!state.braked},
    isActive:()=>items.length>0,
    open(list,el,title,keep){
      prepare(list,el,null);controller.open(items,{restoreId:keep??null});
      quiet=false;controller.announceCurrent(keep&&items.some(x=>x.id===keep)?undefined:title||null);
    },
    enterGroup(list,el,back,keep,speech){
      prepare(list,el,back);controller.open([parent],{restoreId:parent.id});
      controller.enterGroup([...items,BACK],{wrap:true,restoreId:items.some(x=>x.id===keep)?keep:null});
      quiet=false;controller.announceCurrent(speech||undefined);
    },
    setItems(list,keep){
      const old=controller?.getState().id;items=list.filter(x=>!x.hidden&&!x.disabled);renderButtons();
      controller?.setItems(groupBack?[...items,BACK]:items);
      if(keep!=null&&keep!==old&&!groupBack){quiet=true;controller?.open(items,{restoreId:keep});quiet=false}
      if(!selecting)controller?.announceCurrent();
    },
    close(){
      resetKeys();controller?.dispose();controller=null;generation++;items=[];state={index:-1};groupBack=null;
      if(host){host.innerHTML="";host.classList.remove("backstop")}
      $("#editorBack").classList.add("hide");$("#status").classList.add("hide");
    },
    retime(){},cancelInput,
    spaceDown(){
      if(!controller||enterHeld||spaceHeld)return;spaceHeld=true;
      if(acc().auto&&acc().brake&&state.index===items.length&&groupBack){backConsumed=true;return}
      brakeOwned=controller.brakePress();if(brakeOwned)return;
      if(!acc().auto)holdT=setTimeout(()=>{holdT=null;controller?.step(-1);reverseT=setInterval(()=>controller?.step(-1),acc().interval)},HOLD_MS);
    },
    spaceUp(){
      if(!controller||!spaceHeld)return;spaceHeld=false;
      if(backConsumed){backConsumed=false;return}
      if(brakeOwned){brakeOwned=false;controller.brakeRelease();return}
      const reversed=reverseT!==null;stopReverse();if(!enterHeld&&!reversed)controller.step(1);
    },
    enterDown(){
      if(!controller)return;stopReverse();
      if(brakeOwned)controller.brakeRelease();
      spaceHeld=brakeOwned=backConsumed=false;enterHeld=true;controller.setInputHeld(true);
    },
    enterUp(){
      if(!controller||!enterHeld)return;enterHeld=false;const current=controller;
      current.select();if(controller===current)current.setInputHeld(false);
    }
  };
  Scan=api;return true;
}
