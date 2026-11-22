import * as THREE from 'three';

let texture;
// Three original prints share one strip of paper. Their small lettering and
// line work hold up when a player walks right up to the frame.
export function estatePrints(){
  if(texture)return texture;
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;
  const c=canvas.getContext('2d');
  function paper(i,background,ink){
    c.setTransform(1,0,0,1,i*512,0);c.fillStyle=background;c.fillRect(0,0,512,512);
    c.strokeStyle=ink;c.lineWidth=1.5;c.strokeRect(25,25,462,462);c.strokeRect(30,30,452,452);
    c.textAlign='center';c.fillStyle=ink;
  }
  function caption(title,index){
    c.font='26px Georgia';c.fillText(title,256,446);c.font='11px Georgia';c.fillText(index,256,466);
  }
  // An herbarium specimen, with alternating leaflets along each curved frond.
  paper(0,'#e8dfc7','#6f7557');
  for(let j=0;j<7;j++){
    c.save();c.translate(252,388);c.rotate((j-3)*.24);const tall=235+(3-Math.abs(j-3))*29;
    c.beginPath();c.moveTo(0,0);c.bezierCurveTo(7,-82,-20,-170,-4,-tall);c.stroke();
    for(let i=1;i<=18;i++){
      const t=i/20,axis=-13*Math.sin(t*3.14),y=-t*tall,span=Math.sin(t*3.14)*24+4;
      for(const side of [-1,1]){
        c.fillStyle=['#74907a','#567660','#889979'][(j+i+(side+1)/2)%3];
        c.beginPath();c.moveTo(axis,y);c.quadraticCurveTo(axis+side*span*.35,y-17,axis+side*span,y-span*.97);
        c.quadraticCurveTo(axis+side*span*.56,y+1,axis,y);c.fill();
      }
    }c.restore();
  }
  c.fillStyle='#64725b';caption('BOTANICA  DEL  LITORALE','ARCHIVIO LUMA     ·     TAVOLA IV');
  paper(1,'#243946','#dcb983');c.strokeStyle='#9eb0ab';
  for(const r of [49,78,107,137,153]){c.beginPath();c.arc(256,221,r,0,Math.PI*2);c.stroke();}
  c.save();c.translate(256,221);
  for(let i=0;i<120;i++){
    const a=i*Math.PI/60,r=i%5?148:140;c.lineWidth=i%5?1:2;c.beginPath();
    c.moveTo(Math.sin(a)*r,Math.cos(a)*r);c.lineTo(Math.sin(a)*154,Math.cos(a)*154);c.stroke();
  }
  for(let i=0;i<16;i++){
    c.save();c.rotate(i*Math.PI/8);
    const len=i%4===0?126:i%2===0?83:53;
    c.fillStyle='#dfc392';c.beginPath();c.moveTo(0,0);c.lineTo(-9,-21);c.lineTo(0,-len);c.fill();
    c.fillStyle='#789196';c.beginPath();c.moveTo(0,0);c.lineTo(9,-21);c.lineTo(0,-len);c.fill();c.restore();
  }
  c.fillStyle='#ebd7a4';c.font='italic 14px Georgia';
  for(const [letter,x,y] of [['N',0,-161],['S',0,176],['E',172,5],['W',-172,5]])c.fillText(letter,x,y);
  c.restore();c.fillStyle='#dfc392';caption('ROSA  DEI  VENTI','COLLEZIONE MARE     ·     N° VIII');
  paper(2,'#e8d1bf','#754c48');
  c.strokeStyle='#8b6258';
  for(let j=0;j<27;j++){
    const t=j/26,a=-1.12+2.24*t,r=193-32*Math.abs(t*2-1);
    const endX=256+Math.sin(a)*r,endY=327-Math.cos(a)*r;
    c.fillStyle=j%3===0?'#c17e6e':j%3===1?'#cf9980':'#dfb79b';
    c.beginPath();c.moveTo(256,328);c.quadraticCurveTo(256+Math.sin(a-.06)*r*.55,327-Math.cos(a)*r*.56,endX-5,endY);
    c.quadraticCurveTo(endX,endY-7,endX+6,endY+1);c.quadraticCurveTo(256+Math.sin(a+.06)*r*.55,327-Math.cos(a)*r*.57,256,328);c.fill();c.stroke();
  }
  c.fillStyle='#87594b';caption('CONCHA  DEL  MAR','ESTUDIO DE LA COSTA     ·     LÁMINA II');
  texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  return texture;
}
