var ss='',chO=false,lgO=false,clCfg={interval:60,enabled:false};

function P(p){['pc','pw','pst'].forEach(function(id,i){document.getElementById(id).className='pg'+((p==='c'&&i===0)||(p==='w'&&i===1)||(p==='s'&&i===2)?' a':'');});document.querySelectorAll('.tab').forEach(function(t,i){t.className='tab'+((p==='c'&&i===0)||(p==='w'&&i===1)||(p==='s'&&i===2)?' a':'');});}

function F(){fetch('/data').then(r=>r.json()).then(d=>{
document.getElementById('tv').textContent=d.temperature!==null?d.temperature.toFixed(1)+'°C':'--';
document.getElementById('hv').textContent=d.humidity!==null?d.humidity.toFixed(1)+'%':'--';
document.getElementById('bv').textContent=d.battery_volt!==null?d.battery_volt.toFixed(2)+'V':'--';
document.getElementById('bp').textContent=d.battery_pct!==null?d.battery_pct+'%':'--';
document.getElementById('ws').textContent=d.sta_connected?'WiFi':'AP';
document.getElementById('wst').textContent=d.sta_connected?'Conectado':'AP Mode';
document.getElementById('wss').textContent=d.wifi_ssid||'--';
document.getElementById('wip').textContent=d.wifi_ip||'--';
document.getElementById('wap').textContent=d.ap_ip||'--';
document.getElementById('dcx').style.display=d.sta_connected?'block':'none';
updateAQ(d.temperature,d.humidity);
}).catch(()=>{});}

// Air Quality gauge (velocimeter style)
function updateAQ(t,h){if(t===null||h===null){document.getElementById('aqVal').textContent='--';document.getElementById('aqLabel').textContent='--';drawGauge(0);return;}
var tS=100,hS=100;if(t>=20&&t<=25)tS=100;else if(t<20)tS=Math.max(0,100-(20-t)*10);else tS=Math.max(0,100-(t-25)*10);
if(h>=40&&h<=60)hS=100;else if(h<40)hS=Math.max(0,100-(40-h)*3);else hS=Math.max(0,100-(h-60)*3);
var s=Math.round(tS*0.4+hS*0.6);s=Math.max(0,Math.min(100,s));var l,c;
if(s>=80){l='Otimo';c='#00C853';}else if(s>=60){l='Bom';c='#66BB6A';}else if(s>=40){l='Regular';c='#FFEE58';}else if(s>=20){l='Ruim';c='#FFA726';}else{l='Pessimo';c='#FF5252';}
document.getElementById('aqVal').textContent=s+'%';var lb=document.getElementById('aqLabel');lb.textContent=l;lb.style.background=c+'22';lb.style.color=c;drawGauge(s);}

function drawGauge(score){var canvas=document.getElementById('aqGauge');if(!canvas)return;var ctx=canvas.getContext('2d');var dpr=window.devicePixelRatio||1;var cssW=220,cssH=130;canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';canvas.width=Math.floor(cssW*dpr);canvas.height=Math.floor(cssH*dpr);ctx.setTransform(1,0,0,1,0,0);ctx.scale(dpr,dpr);var W=cssW,H=cssH,cx=W/2,cy=H-18,radius=80;var sA=Math.PI;ctx.clearRect(0,0,W,H);
// Background arc
ctx.beginPath();ctx.arc(cx,cy,radius,sA,2*Math.PI);ctx.lineWidth=14;ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineCap='round';ctx.stroke();
// Colored segments
var segs=[{s:0,e:.2,c:'#FF5252'},{s:.2,e:.4,c:'#FFA726'},{s:.4,e:.6,c:'#FFEE58'},{s:.6,e:.8,c:'#66BB6A'},{s:.8,e:1,c:'#00C853'}];
for(var i=0;i<segs.length;i++){ctx.beginPath();ctx.arc(cx,cy,radius,sA+segs[i].s*Math.PI,sA+segs[i].e*Math.PI);ctx.lineWidth=14;ctx.strokeStyle=segs[i].c+'22';ctx.lineCap='butt';ctx.stroke();}
// Active arc with gradient
if(score>0){var g=ctx.createLinearGradient(cx-radius,cy,cx+radius,cy);g.addColorStop(0,'#FF5252');g.addColorStop(.25,'#FFA726');g.addColorStop(.5,'#FFEE58');g.addColorStop(.75,'#66BB6A');g.addColorStop(1,'#00C853');ctx.beginPath();ctx.arc(cx,cy,radius,sA,sA+(score/100)*Math.PI);ctx.lineWidth=14;ctx.strokeStyle=g;ctx.lineCap='round';ctx.stroke();}
// Tick marks
for(var i=0;i<=20;i++){var a=sA+(i/20)*Math.PI;var m=(i%4===0);var tl=m?10:5;var x1=cx+Math.cos(a)*(radius-10),y1=cy+Math.sin(a)*(radius-10);var x2=cx+Math.cos(a)*(radius-10-tl),y2=cy+Math.sin(a)*(radius-10-tl);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineWidth=m?2:1;ctx.strokeStyle=m?'rgba(255,255,255,0.55)':'rgba(255,255,255,0.18)';ctx.stroke();}
// Labels
ctx.fillStyle='rgba(255,255,255,0.55)';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';var lbs=['0','25','50','75','100'];for(var i=0;i<5;i++){var a=sA+(i/4)*Math.PI;ctx.fillText(lbs[i],cx+Math.cos(a)*(radius-28),cy+Math.sin(a)*(radius-28));}
// Needle
var na=sA+(score/100)*Math.PI,nl=radius-5;var nx=cx+Math.cos(na)*nl,ny=cy+Math.sin(na)*nl;var pa=na+Math.PI/2,bw=4;var bx1=cx+Math.cos(pa)*bw,by1=cy+Math.sin(pa)*bw,bx2=cx-Math.cos(pa)*bw,by2=cy-Math.sin(pa)*bw;
// Shadow
ctx.beginPath();ctx.moveTo(bx1+1,by1+1);ctx.lineTo(nx+1,ny+1);ctx.lineTo(bx2+1,by2+1);ctx.closePath();ctx.fillStyle='rgba(0,0,0,0.35)';ctx.fill();
// Needle body
ctx.beginPath();ctx.moveTo(bx1,by1);ctx.lineTo(nx,ny);ctx.lineTo(bx2,by2);ctx.closePath();ctx.fillStyle='#F0F4F2';ctx.fill();
// Center hub
ctx.beginPath();ctx.arc(cx,cy,8,0,2*Math.PI);ctx.fillStyle='#1e2823';ctx.fill();ctx.strokeStyle='#F0F4F2';ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,3,0,2*Math.PI);ctx.fillStyle='#F0F4F2';ctx.fill();}

// WiFi
function SC(){document.getElementById('nl').innerHTML='<div class="ld">Escaneando...</div>';fetch('/wifi/scan').then(r=>r.json()).then(d=>{var h='';if(!d.networks||!d.networks.length)h='<div class="ld">Nenhuma rede</div>';else d.networks.forEach(n=>{h+='<div class="wn" onclick="SN(\''+n.ssid.replace(/'/g,"\\'")+'\')"><div class="wnl"><div class="wns">'+n.ssid+'</div><div class="wnx">'+n.rssi+'dBm</div></div><div class="wnb">Conectar</div></div>';});document.getElementById('nl').innerHTML=h;}).catch(()=>{document.getElementById('nl').innerHTML='<div class="ld">Erro</div>';});}
function SN(s){ss=s;document.getElementById('mtt').textContent=s;document.getElementById('mp').value='';document.getElementById('mdW').className='modal show';}
function closeM(){document.getElementById('mdW').className='modal';}
function WC(){var p=document.getElementById('mp').value;closeM();document.getElementById('nl').innerHTML='<div class="ld">Conectando...</div>';fetch('/wifi/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ssid:ss,password:p})}).then(r=>r.json()).then(d=>{if(d.status==='ok')document.getElementById('nl').innerHTML='<div class="ld" style="color:var(--pr)">OK! IP: '+d.ip+'</div>';else document.getElementById('nl').innerHTML='<div class="ld" style="color:var(--dg)">'+d.message+'</div>';F();}).catch(()=>{document.getElementById('nl').innerHTML='<div class="ld" style="color:var(--dg)">Erro</div>';});}
function DC(){fetch('/wifi/disconnect',{method:'POST'}).then(F);}

// Cloud
function togCl(){clCfg.enabled=!clCfg.enabled;fetch('/cloud',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(clCfg)}).then(()=>updClUI());}
function openCl(){document.getElementById('fCI').value=clCfg.interval;document.getElementById('mdCl').className='modal show';}
function saveCl(){clCfg.interval=parseInt(document.getElementById('fCI').value)||60;fetch('/cloud',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(clCfg)}).then(()=>{document.getElementById('mdCl').className='modal';updClUI();});}
function updClUI(){document.getElementById('swC').className='sw'+(clCfg.enabled?' on':'');document.getElementById('clS').textContent=clCfg.enabled?'Cada '+clCfg.interval+'s':'Off';}
function fetchCl(){fetch('/cloud').then(r=>r.json()).then(d=>{if(d.cloud){clCfg=d.cloud;updClUI();}}).catch(()=>{});}

// Charts & Log
function togCh(){chO=!chO;document.getElementById('chB').className='col-body'+(chO?' open':'');if(chO)fetchHist();}
function togLg(){lgO=!lgO;document.getElementById('lgB').className='col-body'+(lgO?' open':'');if(lgO)fetchLog();}
function fetchHist(){fetch('/history').then(r=>r.json()).then(d=>{if(d.history&&d.history.length>1)drawChart(d.history);}).catch(()=>{});}
function fetchLog(){fetch('/log').then(r=>r.json()).then(d=>{var box=document.getElementById('logBox');if(!d.logs||!d.logs.length){box.innerHTML='<div class="log-line">--</div>';return;}var h='';for(var i=d.logs.length-1;i>=0;i--)h+='<div class="log-line">'+d.logs[i]+'</div>';box.innerHTML=h;}).catch(()=>{});}

function drawChart(data){var c=document.getElementById('chart');if(!c)return;var ctx=c.getContext('2d');var dpr=window.devicePixelRatio||1;var W=c.parentElement.clientWidth,H=c.parentElement.clientHeight;
if(W===0||H===0)return;
c.style.width=W+'px';c.style.height=H+'px';c.width=W*dpr;c.height=H*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,W,H);
var n=data.length;if(n<2)return;
var pad={l:36,r:36,t:14,b:20},gW=W-pad.l-pad.r,gH=H-pad.t-pad.b;

// Collect values
var temps=[],hums=[];
for(var i=0;i<n;i++){if(data[i].t!==null)temps.push(data[i].t);if(data[i].h!==null)hums.push(data[i].h);}
if(!temps.length||!hums.length)return;

var minT=Math.min.apply(null,temps)-1,maxT=Math.max.apply(null,temps)+1;
var minH=Math.min.apply(null,hums)-2,maxH=Math.max.apply(null,hums)+2;

// Background
ctx.fillStyle='rgba(0,0,0,0.2)';
ctx.fillRect(pad.l,pad.t,gW,gH);

// Grid lines
ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;
for(var g=0;g<=4;g++){var gy=pad.t+gH*(g/4);ctx.beginPath();ctx.moveTo(pad.l,gy);ctx.lineTo(W-pad.r,gy);ctx.stroke();}

// Y-axis labels (temp left, hum right)
ctx.font='bold 9px sans-serif';ctx.textBaseline='middle';
ctx.fillStyle='#FF5252';ctx.textAlign='right';
for(var g=0;g<=4;g++){var val=maxT-(maxT-minT)*(g/4);ctx.fillText(val.toFixed(0)+'°',pad.l-4,pad.t+gH*(g/4));}
ctx.fillStyle='#42A5F5';ctx.textAlign='left';
for(var g=0;g<=4;g++){var val=maxH-(maxH-minH)*(g/4);ctx.fillText(val.toFixed(0)+'%',W-pad.r+4,pad.t+gH*(g/4));}

// Draw smooth line function
function drawLine(key,min,max,col){
var pts=[];for(var i=0;i<n;i++){var v=data[i][key];if(v===null)continue;pts.push({x:pad.l+i*(gW/(n-1)),y:pad.t+gH*(1-(v-min)/(max-min))});}
if(pts.length<2)return;
// Fill gradient
var gr=ctx.createLinearGradient(0,pad.t,0,pad.t+gH);gr.addColorStop(0,col+'30');gr.addColorStop(1,col+'02');
ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(pts[0].x,pad.t+gH);
for(var i=0;i<pts.length;i++){if(i===0)ctx.lineTo(pts[i].x,pts[i].y);else{var xc=(pts[i].x+pts[i-1].x)/2;ctx.quadraticCurveTo(pts[i-1].x,pts[i-1].y,xc,(pts[i].y+pts[i-1].y)/2);}}
ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);ctx.lineTo(pts[pts.length-1].x,pad.t+gH);ctx.closePath();ctx.fill();
// Stroke line
ctx.strokeStyle=col;ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
for(var i=1;i<pts.length;i++){var xc=(pts[i].x+pts[i-1].x)/2;ctx.quadraticCurveTo(pts[i-1].x,pts[i-1].y,xc,(pts[i].y+pts[i-1].y)/2);}
ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);ctx.stroke();
// Last point dot
var last=pts[pts.length-1];ctx.beginPath();ctx.arc(last.x,last.y,3,0,2*Math.PI);ctx.fillStyle=col;ctx.fill();}

drawLine('t',minT,maxT,'#FF5252');
drawLine('h',minH,maxH,'#42A5F5');

// Legend
ctx.font='bold 8px sans-serif';ctx.textAlign='left';
ctx.fillStyle='#FF5252';ctx.fillRect(pad.l,H-12,10,3);ctx.fillText('Temp',pad.l+14,H-10);
ctx.fillStyle='#42A5F5';ctx.fillRect(pad.l+60,H-12,10,3);ctx.fillText('Hum',pad.l+74,H-10);}

// Init
F();fetchCl();drawGauge(0);setInterval(F,3000);setInterval(()=>{if(chO)fetchHist();if(lgO)fetchLog();},5000);
