export function elevatorControls(dialog,depart,enter,leave){
  let station;
  const options=dialog.querySelector('[data-floors]'),heading=dialog.querySelector('h2');
  dialog.addEventListener('close',()=>{station=null;leave();});
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  return {
    show(s){
      station=s;enter();
      heading.textContent=s.p.name+' · Elevator';
      const stops=s.p.hotelTower?[...s.p.panels.slice(0,1),...s.p.panels.slice(21),...s.p.panels.slice(1,21)]:s.p.panels;
      options.replaceChildren(...stops.map(p=>{
        const button=document.createElement('button');
        button.type='button';button.textContent=p.label??(p.index?'Floor '+(p.index+1):'Ground lobby');
        button.disabled=p.index===s.index;
        button.onclick=()=>{if(station===s){depart(s,p.index);dialog.close();}};
        return button;
      }));
      dialog.showModal();
    },
    get open(){return dialog.open;},
    close(){if(dialog.open)dialog.close();},
    validate(action){if(dialog.open && action?.s!==station)dialog.close();}
  };
}
