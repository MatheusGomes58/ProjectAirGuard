var D={mode:'manual',relays:{},manual:{},relay_names:{}},ss='',chartOpen=false,logOpen=false,spOpen=false,actOpen=false,chartData=[];

function P(p){var pages=['pc','pw','pst'],tabs=document.querySelectorAll('.tab');pages.forEach(function(id,i){document.getElementById(id).className='pg'+((p==='c'&&i===0)||(p==='w'&&i===1)||(p==='s'&&i===2)?' a':'');tabs[i].className='tab'+((p==='c'&&i===0)||(p==='w'&&i===1)||(p==='s'&&i===2)?' a':'');});}

// ==== MODAIS ====
function openModal(type){
if(type==='sp')document.getElementById('mdSP').className='modal show';
else if(type==='act'){populateActSPSelect();document.getElementById('mdAct').className='modal show';}
else if(type==='wifi')document.getElementById('mdWifi').className='modal show';
else if(type==='rn1'){document.getElementById('fRNrelay').value='1';document.getElementById('fRNname').value=(D.relay_names||{})['1']||'Rele 1';document.getElementById('mdRN').className='modal show';}
else if(type==='rn2'){document.getElementById('fRNrelay').value='2';document.getElementById('fRNname').value=(D.relay_names||{})['2']||'Rele 2';document.getElementById('mdRN').className='modal show';}
else if(type==='cloud'){document.getElementById('fCloudInterval').value=cloudCfg.interval||30;document.getElementById('mdCloud').className='modal show';}
}
function closeModal(id){document.getElementById(id).className='modal';}
function showConfirm(title,body,okText,cb){
document.getElementById('cfTitle').textContent=title;
document.getElementById('cfBody').innerHTML=body;
var okBtn=document.getElementById('cfOk');
var cancelBtn=document.getElementById('cfCancel');
okBtn.textContent=okText||'Confirmar';
cancelBtn.style.display='';
cancelBtn.onclick=function(){closeModal('mdConfirm');};
okBtn.onclick=function(){closeModal('mdConfirm');cb();};
document.getElementById('mdConfirm').className='modal show';
}
function showAlert(title,msg){
document.getElementById('cfTitle').textContent=title;
document.getElementById('cfBody').innerHTML=msg;
var okBtn=document.getElementById('cfOk');
var cancelBtn=document.getElementById('cfCancel');
okBtn.textContent='OK';
cancelBtn.style.display='none';
okBtn.onclick=function(){closeModal('mdConfirm');cancelBtn.style.display='';};
document.getElementById('mdConfirm').className='modal show';
}

// ==== FETCH ====
function F(){fetch('/data').then(function(r){return r.json()}).then(function(d){
D=d;
document.getElementById('tv').textContent=d.temperature!==null?d.temperature.toFixed(1)+'°C':'--';
document.getElementById('hv').textContent=d.humidity!==null?d.humidity.toFixed(1)+'%':'--';
var r1=d.relays['1']||false,r2=d.relays['2']||false;
var rNames=d.relay_names||{'1':'Rele 1','2':'Rele 2'};
document.getElementById('rn1').textContent=rNames['1'];
document.getElementById('rn2').textContent=rNames['2'];
document.getElementById('rf').className='rc relay-btn'+(r1?' on':'')+(d.mode==='manual'?' clickable':'');
document.getElementById('rh').className='rc relay-btn'+(r2?' on':'')+(d.mode==='manual'?' clickable':'');
document.getElementById('rfs').textContent=r1?'ON':'OFF';document.getElementById('rfs').className='re'+(r1?' on':' off');
document.getElementById('rhs').textContent=r2?'ON':'OFF';document.getElementById('rhs').className='re'+(r2?' on':' off');
// Modo (na config)
document.getElementById('bp').className='mb'+(d.mode==='auto'?' a':'');
document.getElementById('bm').className='mb'+(d.mode==='manual'?' a':'');
document.getElementById('modeHint').textContent=d.mode==='manual'?'Toque nos reles para ligar/desligar':'Controle automatico ativo';
// Setpoints e Atuadores só em modo auto
document.getElementById('spCard').style.display=d.mode==='auto'?'block':'none';
document.getElementById('actCard').style.display=d.mode==='auto'?'block':'none';
// Config tab
var cfgR1v=document.getElementById('cfgR1v');if(cfgR1v)cfgR1v.textContent=rNames['1'];
var cfgR2v=document.getElementById('cfgR2v');if(cfgR2v)cfgR2v.textContent=rNames['2'];
// WiFi
document.getElementById('ws').textContent=d.sta_connected?'WiFi':'AP';
document.getElementById('wst').textContent=d.sta_connected?'Conectado':'AP Mode';
document.getElementById('wss').textContent=d.wifi_ssid||'--';
document.getElementById('wip').textContent=d.wifi_ip||'--';
document.getElementById('wap').textContent=d.ap_ip||'--';
document.getElementById('dcx').style.display=d.sta_connected?'block':'none';
updateAirQuality(d.temperature,d.humidity);
renderSetpoints(d.setpoints);
renderActions(d.actions,d.setpoints);
updateNetUI();
}).catch(function(){});}

// ==== RELES (toggle em modo manual) ====
function togRelayBtn(r){
if(D.mode!=='manual')return;
var cur=D.manual[String(r)]||false;
fetch('/manual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({relay:r,state:!cur})}).then(F);
}

// ==== MODO ====
function setMode(m){fetch('/mode',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:m})}).then(F);}

// ==== SETPOINTS ====
function renderSetpoints(sps){
var el=document.getElementById('spList');
if(!sps||!sps.length){el.innerHTML='<div class="ld">Nenhum setpoint</div>';return;}
var h='';for(var i=0;i<sps.length;i++){var sp=sps[i];
h+='<div class="sp-item"><div class="sp-info"><span class="sp-name">'+sp.name+'</span><span class="sp-sensor">'+(sp.sensor==='temp'?'Temperatura':'Umidade')+'</span></div>';
h+='<div class="sp-ctrl"><input class="sp-input" type="number" step="0.5" inputmode="decimal" value="'+sp.value+'" onchange="updSP(\''+sp.id+'\',this.value)">';
h+='<div class="sp-rm" onclick="rmSP(\''+sp.id+'\')">&times;</div></div></div>';}
el.innerHTML=h;}

function saveSP(){
var name=document.getElementById('fSpName').value.trim();
var sensor=document.getElementById('fSpSensor').value;
var value=parseFloat(document.getElementById('fSpValue').value);
if(!name){showAlert('Erro','Digite um nome para o setpoint.');return;}
if(isNaN(value)){showAlert('Erro','Digite um valor numerico.');return;}
fetch('/setpoints/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,sensor:sensor,value:value})}).then(function(){document.getElementById('fSpName').value='';document.getElementById('fSpValue').value='';closeModal('mdSP');F();});}

function updSP(id,val){fetch('/setpoints/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id,value:parseFloat(val)})});}

function rmSP(id){showConfirm('Remover Setpoint','Tem certeza? Acoes vinculadas tambem serao removidas.','Remover',function(){fetch('/setpoints/remove',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id})}).then(F);});}

// ==== AÇÕES ====
function populateActSPSelect(){
var sel=document.getElementById('fActSP');var sps=D.setpoints||[];
var h='';for(var i=0;i<sps.length;i++)h+='<option value="'+sps[i].id+'">'+sps[i].name+'</option>';
sel.innerHTML=h||'<option value="">Crie um setpoint primeiro</option>';
var rNames=D.relay_names||{'1':'Rele 1','2':'Rele 2'};
document.getElementById('fActRelay').innerHTML='<option value="1">'+rNames['1']+'</option><option value="2">'+rNames['2']+'</option>';}

function renderActions(acts,sps){
var el=document.getElementById('actList');
if(!acts||!acts.length){el.innerHTML=D.mode==='auto'?'<div class="ld">Nenhuma acao</div>':'';return;}
var spMap={};if(sps)for(var i=0;i<sps.length;i++)spMap[sps[i].id]=sps[i].name;
var rNames=D.relay_names||{'1':'Rele 1','2':'Rele 2'};
var h='';for(var i=0;i<acts.length;i++){var a=acts[i];var spName=spMap[a.setpoint_id]||'?';
h+='<div class="act-item"><div class="act-info"><span class="act-name">'+a.name+'</span>';
h+='<span class="act-detail">'+rNames[String(a.relay)]+' | '+(a.condition==='above'?'Acima':'Abaixo')+' de "'+spName+'" | '+a.period+'s</span></div>';
h+='<div class="sp-rm" onclick="rmAct(\''+a.id+'\')">&times;</div></div>';}
el.innerHTML=h;}

function saveAct(){
var name=document.getElementById('fActName').value.trim();
var relay=document.getElementById('fActRelay').value;
var sp_id=document.getElementById('fActSP').value;
var cond=document.getElementById('fActCond').value;
var period=parseInt(document.getElementById('fActPeriod').value)||10;
if(!name){showAlert('Erro','Digite um nome.');return;}
if(!sp_id){showAlert('Erro','Crie um setpoint primeiro.');return;}
fetch('/actions/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,relay:relay,setpoint_id:sp_id,condition:cond,period:period})}).then(function(){document.getElementById('fActName').value='';closeModal('mdAct');F();});}

function rmAct(id){showConfirm('Remover Acao','Tem certeza que deseja remover esta acao?','Remover',function(){fetch('/actions/remove',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id})}).then(F);});}

// ==== CONFIG ====
function saveRN(){
var relay=document.getElementById('fRNrelay').value;
var name=document.getElementById('fRNname').value.trim();
if(!name){showAlert('Erro','Digite um nome.');return;}
fetch('/relay/name',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({relay:relay,name:name})}).then(function(){closeModal('mdRN');F();});}

function updateNetUI(){
var mode=D.net_mode||'ap';
document.getElementById('nbAP').className='mb'+(mode==='ap'?' a':'');
document.getElementById('nbHY').className='mb'+(mode==='hybrid'?' a':'');
document.getElementById('nbWF').className='mb'+(mode==='wifi'?' a':'')+(D.sta_connected?'':' disabled');
document.getElementById('nbRD').className='mb'+(mode==='reader'?' a':'');
var info='';
if(mode==='ap')info='AP: dispositivo cria sua rede.';
else if(mode==='hybrid')info='Hibrido: AP + WiFi externo.';
else if(mode==='wifi')info='WiFi: somente rede externa.';
else if(mode==='reader')info='Leitor: rede desligada, so sensores + PID.';
if(D.sta_connected&&mode!=='reader')info+=' IP: '+D.wifi_ip;
document.getElementById('netInfo').textContent=info;}

function setNet(mode){fetch('/net_mode',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:mode})}).then(F);}

function confirmWifiOnly(){
if(!D.sta_connected){showAlert('Sem WiFi','Conecte a uma rede WiFi primeiro.');return;}
showConfirm('Atenção','Ao mudar para <b>Somente WiFi</b>, o AP sera desligado.<br><br>Voce so podera acessar pelo IP:<span class="warn">'+D.wifi_ip+'</span><br>Anote antes de confirmar.','Desligar AP',function(){setNet('wifi');});}

function confirmReader(){
showConfirm('Modo Leitor','Ao ativar o modo <b>Leitor</b>, toda a rede sera desligada (AP e WiFi).<br><br>O sistema vai funcionar apenas com sensores e PID, sem interface web.<br><br><span class="warn">Para voltar, sera necessario resetar o dispositivo.</span>','Ativar Leitor',function(){setNet('reader');});}

// ==== COLAPSAVEIS ====
function togSP(){spOpen=!spOpen;document.getElementById('spBody').className='col-body'+(spOpen?' open':'');}
function togAct(){actOpen=!actOpen;document.getElementById('actBody').className='col-body'+(actOpen?' open':'');}
function togChart(){chartOpen=!chartOpen;document.getElementById('chHd').className='col-hd'+(chartOpen?' open':'');document.getElementById('chBody').className='col-body'+(chartOpen?' open':'');if(chartOpen)fetchHistory();}
function togLog(){logOpen=!logOpen;document.getElementById('lgHd').className='col-hd'+(logOpen?' open':'');document.getElementById('lgBody').className='col-body'+(logOpen?' open':'');if(logOpen)fetchLog();}

// ==== GAUGE ====
function updateAirQuality(temp,hum){if(temp===null||hum===null){document.getElementById('aqVal').textContent='--';document.getElementById('aqLabel').textContent='--';drawGauge(0);return;}
var tS=100,hS=100;if(temp>=20&&temp<=25)tS=100;else if(temp<20)tS=Math.max(0,100-(20-temp)*10);else tS=Math.max(0,100-(temp-25)*10);
if(hum>=40&&hum<=60)hS=100;else if(hum<40)hS=Math.max(0,100-(40-hum)*3);else hS=Math.max(0,100-(hum-60)*3);
var score=Math.round(tS*0.4+hS*0.6);score=Math.max(0,Math.min(100,score));var label,color;
if(score>=80){label='Otimo';color='#00C853';}else if(score>=60){label='Bom';color='#66BB6A';}else if(score>=40){label='Regular';color='#FFEE58';}else if(score>=20){label='Ruim';color='#FFA726';}else{label='Pessimo';color='#FF5252';}
document.getElementById('aqVal').textContent=score+'%';document.getElementById('aqLabel').textContent=label;document.getElementById('aqLabel').style.background=color+'22';document.getElementById('aqLabel').style.color=color;drawGauge(score);}

function drawGauge(score){var canvas=document.getElementById('aqGauge');if(!canvas)return;var ctx=canvas.getContext('2d');var dpr=window.devicePixelRatio||1;var cssW=220,cssH=130;canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';canvas.width=Math.floor(cssW*dpr);canvas.height=Math.floor(cssH*dpr);ctx.setTransform(1,0,0,1,0,0);ctx.scale(dpr,dpr);var W=cssW,H=cssH,cx=W/2,cy=H-18,radius=80;var sA=Math.PI;ctx.clearRect(0,0,W,H);ctx.beginPath();ctx.arc(cx,cy,radius,sA,2*Math.PI);ctx.lineWidth=14;ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineCap='round';ctx.stroke();var segs=[{s:0,e:.2,c:'#FF5252'},{s:.2,e:.4,c:'#FFA726'},{s:.4,e:.6,c:'#FFEE58'},{s:.6,e:.8,c:'#66BB6A'},{s:.8,e:1,c:'#00C853'}];for(var i=0;i<segs.length;i++){ctx.beginPath();ctx.arc(cx,cy,radius,sA+segs[i].s*Math.PI,sA+segs[i].e*Math.PI);ctx.lineWidth=14;ctx.strokeStyle=segs[i].c+'22';ctx.lineCap='butt';ctx.stroke();}if(score>0){var g=ctx.createLinearGradient(cx-radius,cy,cx+radius,cy);g.addColorStop(0,'#FF5252');g.addColorStop(.25,'#FFA726');g.addColorStop(.5,'#FFEE58');g.addColorStop(.75,'#66BB6A');g.addColorStop(1,'#00C853');ctx.beginPath();ctx.arc(cx,cy,radius,sA,sA+(score/100)*Math.PI);ctx.lineWidth=14;ctx.strokeStyle=g;ctx.lineCap='round';ctx.stroke();}for(var i=0;i<=20;i++){var a=sA+(i/20)*Math.PI;var m=(i%4===0);var tl=m?10:5;var x1=cx+Math.cos(a)*(radius-10),y1=cy+Math.sin(a)*(radius-10);var x2=cx+Math.cos(a)*(radius-10-tl),y2=cy+Math.sin(a)*(radius-10-tl);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineWidth=m?2:1;ctx.strokeStyle=m?'rgba(255,255,255,0.55)':'rgba(255,255,255,0.18)';ctx.stroke();}ctx.fillStyle='rgba(255,255,255,0.55)';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';var lbs=['0','25','50','75','100'];for(var i=0;i<5;i++){var a=sA+(i/4)*Math.PI;ctx.fillText(lbs[i],cx+Math.cos(a)*(radius-28),cy+Math.sin(a)*(radius-28));}var na=sA+(score/100)*Math.PI,nl=radius-5;var nx=cx+Math.cos(na)*nl,ny=cy+Math.sin(na)*nl;var pa=na+Math.PI/2,bw=4;var bx1=cx+Math.cos(pa)*bw,by1=cy+Math.sin(pa)*bw,bx2=cx-Math.cos(pa)*bw,by2=cy-Math.sin(pa)*bw;ctx.beginPath();ctx.moveTo(bx1+1,by1+1);ctx.lineTo(nx+1,ny+1);ctx.lineTo(bx2+1,by2+1);ctx.closePath();ctx.fillStyle='rgba(0,0,0,0.35)';ctx.fill();ctx.beginPath();ctx.moveTo(bx1,by1);ctx.lineTo(nx,ny);ctx.lineTo(bx2,by2);ctx.closePath();ctx.fillStyle='#F0F4F2';ctx.fill();ctx.beginPath();ctx.arc(cx,cy,8,0,2*Math.PI);ctx.fillStyle='#1e2823';ctx.fill();ctx.strokeStyle='#F0F4F2';ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,3,0,2*Math.PI);ctx.fillStyle='#F0F4F2';ctx.fill();}

// ==== GRAFICOS ====
function fetchHistory(){fetch('/history').then(function(r){return r.json()}).then(function(d){if(d.history&&d.history.length>1){chartData=d.history;drawChart();drawRelayChart();}}).catch(function(){});}
function fetchLog(){fetch('/log').then(function(r){return r.json()}).then(function(d){var box=document.getElementById('logBox');if(!d.logs||!d.logs.length){box.innerHTML='<div class="log-line">Nenhum log</div>';return;}var h='';for(var i=d.logs.length-1;i>=0;i--)h+='<div class="log-line">'+d.logs[i]+'</div>';box.innerHTML=h;}).catch(function(){});}

function drawChart(){var canvas=document.getElementById('chart');if(!canvas||!chartOpen)return;var ctx=canvas.getContext('2d');var dpr=window.devicePixelRatio||1;var cssW=canvas.parentElement.clientWidth,cssH=canvas.parentElement.clientHeight;if(cssW===0||cssH===0)return;canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';canvas.width=Math.floor(cssW*dpr);canvas.height=Math.floor(cssH*dpr);ctx.setTransform(1,0,0,1,0,0);ctx.scale(dpr,dpr);var W=cssW,H=cssH;ctx.clearRect(0,0,W,H);if(chartData.length<2)return;var allT=[],allH=[];for(var i=0;i<chartData.length;i++){if(chartData[i].t!==null)allT.push(chartData[i].t);if(chartData[i].h!==null)allH.push(chartData[i].h);}if(!allT.length||!allH.length)return;var minT=Math.min.apply(null,allT)-2,maxT=Math.max.apply(null,allT)+2;var minH=Math.min.apply(null,allH)-5,maxH=Math.max.apply(null,allH)+5;var pad={l:32,r:32,t:12,b:18},gW=W-pad.l-pad.r,gH=H-pad.t-pad.b,n=chartData.length,dx=gW/(n-1);ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(pad.l,pad.t,gW,gH);ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;for(var g=0;g<=4;g++){var gy=pad.t+gH*(g/4);ctx.beginPath();ctx.moveTo(pad.l,gy);ctx.lineTo(W-pad.r,gy);ctx.stroke();}ctx.fillStyle='#FF5252';ctx.font='bold 9px sans-serif';ctx.textAlign='right';ctx.textBaseline='middle';for(var g=0;g<=4;g++)ctx.fillText((maxT-(maxT-minT)*(g/4)).toFixed(0)+'°',pad.l-4,pad.t+gH*(g/4));ctx.fillStyle='#42A5F5';ctx.textAlign='left';for(var g=0;g<=4;g++)ctx.fillText((maxH-(maxH-minH)*(g/4)).toFixed(0)+'%',W-pad.r+4,pad.t+gH*(g/4));function mapT(v){return pad.t+gH*(1-(v-minT)/(maxT-minT));}function mapH(v){return pad.t+gH*(1-(v-minH)/(maxH-minH));}function drawL(arr,fn,col){var pts=[];for(var i=0;i<n;i++){var v=arr[i];if(v===null)continue;pts.push({x:pad.l+i*dx,y:fn(v)});}if(pts.length<2)return;var gr=ctx.createLinearGradient(0,pad.t,0,pad.t+gH);gr.addColorStop(0,col+'40');gr.addColorStop(1,col+'02');ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(pts[0].x,pad.t+gH);for(var i=0;i<pts.length;i++){if(i===0)ctx.lineTo(pts[i].x,pts[i].y);else{var xc=(pts[i].x+pts[i-1].x)/2;ctx.quadraticCurveTo(pts[i-1].x,pts[i-1].y,xc,(pts[i].y+pts[i-1].y)/2);}}ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);ctx.lineTo(pts[pts.length-1].x,pad.t+gH);ctx.closePath();ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(var i=1;i<pts.length;i++){var xc=(pts[i].x+pts[i-1].x)/2;ctx.quadraticCurveTo(pts[i-1].x,pts[i-1].y,xc,(pts[i].y+pts[i-1].y)/2);}ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);ctx.stroke();var last=pts[pts.length-1];ctx.beginPath();ctx.arc(last.x,last.y,3,0,2*Math.PI);ctx.fillStyle=col;ctx.fill();}var temps=[],hums=[];for(var i=0;i<n;i++){temps.push(chartData[i].t);hums.push(chartData[i].h);}drawL(temps,mapT,'#FF5252');drawL(hums,mapH,'#42A5F5');}

function drawRelayChart(){var canvas=document.getElementById('relayChart');if(!canvas||!chartOpen)return;var ctx=canvas.getContext('2d');var dpr=window.devicePixelRatio||1;var cssW=canvas.parentElement.clientWidth,cssH=canvas.parentElement.clientHeight;if(cssW===0||cssH===0)return;canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';canvas.width=Math.floor(cssW*dpr);canvas.height=Math.floor(cssH*dpr);ctx.setTransform(1,0,0,1,0,0);ctx.scale(dpr,dpr);var W=cssW,H=cssH;ctx.clearRect(0,0,W,H);if(chartData.length<2)return;var pad={l:40,r:12,t:12,b:12},gW=W-pad.l-pad.r,gH=H-pad.t-pad.b,n=chartData.length,dx=gW/(n-1);ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(pad.l,pad.t,gW,gH);var rowH=gH/2-2;function drawBars(field,top,color,label){ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='bold 9px sans-serif';ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText(label,pad.l-4,top+rowH/2);for(var i=0;i<n;i++){var v=chartData[i][field];if(!v)continue;var x=pad.l+i*dx;var w=Math.max(dx-1,2);ctx.fillStyle=color;ctx.fillRect(x-w/2,top,w,rowH);}ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,top+rowH);ctx.lineTo(W-pad.r,top+rowH);ctx.stroke();}drawBars('r1',pad.t,'#00C853','R1');drawBars('r2',pad.t+rowH+4,'#FFA726','R2');}

// ==== WIFI ====
function SC(){document.getElementById('nl').innerHTML='<div class="ld">Escaneando...</div>';fetch('/wifi/scan').then(function(r){return r.json()}).then(function(d){var h='';if(!d.networks||!d.networks.length)h='<div class="ld">Nenhuma rede</div>';else d.networks.forEach(function(n){h+='<div class="wn" onclick="SN(\''+n.ssid.replace(/'/g,"\\'")+'\')"><div class="wnl"><div><div class="wns">'+n.ssid+'</div><div class="wnx">'+(n.secure?'Protegida':'Aberta')+' '+n.rssi+'dBm</div></div></div><div class="wnb">Conectar</div></div>';});document.getElementById('nl').innerHTML=h;}).catch(function(){document.getElementById('nl').innerHTML='<div class="ld">Erro</div>';});}
function SN(s){ss=s;document.getElementById('mtt').textContent=s;document.getElementById('mp').value='';openModal('wifi');}
function WC(){var p=document.getElementById('mp').value;closeModal('mdWifi');document.getElementById('nl').innerHTML='<div class="ld">Conectando...</div>';fetch('/wifi/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ssid:ss,password:p})}).then(function(r){return r.json()}).then(function(d){if(d.status==='ok')document.getElementById('nl').innerHTML='<div class="ld" style="color:var(--pr)">OK! IP:'+d.ip+'</div>';else document.getElementById('nl').innerHTML='<div class="ld" style="color:var(--dg)">'+d.message+'</div>';F();}).catch(function(){document.getElementById('nl').innerHTML='<div class="ld" style="color:var(--dg)">Erro</div>';});}
function DC(){fetch('/wifi/disconnect',{method:'POST'}).then(F);}

// ==== CLOUD SYNC ====
var cloudCfg={url:'',device_id:'',interval:30,enabled:false};

function updateCloudUI(){
document.getElementById('swCloud').className='sw'+(cloudCfg.enabled?' on':'');
var status=cloudCfg.enabled?'Ativo (cada '+cloudCfg.interval+'s)':'Desativado';
document.getElementById('cloudStatus').textContent=status;
}

function togCloud(){
cloudCfg.enabled=!cloudCfg.enabled;
fetch('/cloud',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({interval:cloudCfg.interval,enabled:cloudCfg.enabled})}).then(function(){updateCloudUI();});
}

function saveCloud(){
var interval=parseInt(document.getElementById('fCloudInterval').value)||30;
if(interval<10)interval=10;
if(interval>600)interval=600;
cloudCfg.interval=interval;
fetch('/cloud',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({interval:interval,enabled:cloudCfg.enabled})}).then(function(){closeModal('mdCloud');updateCloudUI();});
}

function fetchCloudConfig(){
fetch('/cloud').then(function(r){return r.json()}).then(function(d){
if(d.cloud){cloudCfg=d.cloud;updateCloudUI();}
}).catch(function(){});
}

// ==== INIT ====
F();drawGauge(0);fetchCloudConfig();
setInterval(F,2500);
setInterval(function(){if(chartOpen)fetchHistory();},5000);
setInterval(function(){if(logOpen)fetchLog();},5000);
