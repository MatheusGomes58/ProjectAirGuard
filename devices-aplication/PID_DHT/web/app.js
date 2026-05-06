var D={ts:25,hs:60,mf:false,mh:false},ss='',chartOpen=false,logOpen=false,chartData=[];

function P(p){
var pages=['pc','pw','pst'],tabs=document.querySelectorAll('.tab');
pages.forEach(function(id,i){document.getElementById(id).className='pg'+((p==='c'&&i===0)||(p==='w'&&i===1)||(p==='s'&&i===2)?' a':'');tabs[i].className='tab'+((p==='c'&&i===0)||(p==='w'&&i===1)||(p==='s'&&i===2)?' a':'');});
}

function F(){fetch('/data').then(function(r){return r.json()}).then(function(d){
document.getElementById('tv').textContent=d.temperature!==null?d.temperature.toFixed(1)+'C':'--';
document.getElementById('hv').textContent=d.humidity!==null?d.humidity.toFixed(1)+'%':'--';
document.getElementById('ts').textContent='SP:'+d.temp_setpoint.toFixed(1)+'C';
document.getElementById('hs').textContent='SP:'+d.hum_setpoint.toFixed(1)+'%';
D.ts=d.temp_setpoint;D.hs=d.hum_setpoint;D.mf=d.manual_fan;D.mh=d.manual_humid;
if(document.activeElement.id!=='st')document.getElementById('st').value=d.temp_setpoint.toFixed(1);
if(document.activeElement.id!=='sh')document.getElementById('sh').value=d.hum_setpoint.toFixed(0);
document.getElementById('bp').className='mb'+(d.mode==='pid'?' a':'');
document.getElementById('bm').className='mb'+(d.mode==='manual'?' a':'');
document.getElementById('ps').style.display=d.mode==='pid'?'block':'none';
document.getElementById('mn').style.display=d.mode==='manual'?'block':'none';
var pt=Math.round(d.pid_temp_out*100),ph=Math.round(d.pid_hum_out*100);
document.getElementById('pb').style.width=pt+'%';document.getElementById('pv').textContent=pt+'%';
document.getElementById('hb').style.width=ph+'%';document.getElementById('hx').textContent=ph+'%';
document.getElementById('sf').className='sw'+(d.manual_fan?' on':'');
document.getElementById('su').className='sw'+(d.manual_humid?' on':'');
document.getElementById('rf').className='rc'+(d.fan_on?' on':'');
document.getElementById('rh').className='rc'+(d.humid_on?' on':'');
var fs=document.getElementById('rfs'),hs2=document.getElementById('rhs');
fs.textContent=d.fan_on?'ON':'OFF';fs.className='re'+(d.fan_on?' on':' off');
hs2.textContent=d.humid_on?'ON':'OFF';hs2.className='re'+(d.humid_on?' on':' off');
document.getElementById('ws').textContent=d.sta_connected?'WiFi':'AP';
document.getElementById('wst').textContent=d.sta_connected?'Conectado':'AP Mode';
document.getElementById('wss').textContent=d.wifi_ssid||'--';
document.getElementById('wip').textContent=d.wifi_ip||'--';
document.getElementById('wap').textContent=d.ap_ip||'--';
document.getElementById('dcx').style.display=d.sta_connected?'block':'none';
if(d.relay1_name){document.getElementById('r1nm').textContent=d.relay1_name;document.getElementById('r1bl').textContent=d.relay1_name;document.getElementById('r1mn').textContent=d.relay1_name;if(!document.getElementById('cfgR1').value)document.getElementById('cfgR1').value=d.relay1_name;}
if(d.relay2_name){document.getElementById('r2nm').textContent=d.relay2_name;document.getElementById('r2bl').textContent=d.relay2_name;document.getElementById('r2mn').textContent=d.relay2_name;if(!document.getElementById('cfgR2').value)document.getElementById('cfgR2').value=d.relay2_name;}
loadControlConfig(d);
}).catch(function(){});}

function setMode(m){fetch('/setpoints',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:m})}).then(F);}
function adjSP(t,v){if(t==='t')D.ts+=v;else D.hs+=v;document.getElementById('st').value=D.ts.toFixed(1);document.getElementById('sh').value=D.hs.toFixed(0);sendSP();}
function sendSP(){var t=parseFloat(document.getElementById('st').value)||D.ts;var h=parseFloat(document.getElementById('sh').value)||D.hs;D.ts=t;D.hs=h;fetch('/setpoints',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({temp_sp:t,hum_sp:h})});}
function togMan(r){if(r==='f')D.mf=!D.mf;else D.mh=!D.mh;document.getElementById('sf').className='sw'+(D.mf?' on':'');document.getElementById('su').className='sw'+(D.mh?' on':'');fetch('/manual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fan:D.mf,humid:D.mh})});}

// Colapsaveis
function togChart(){chartOpen=!chartOpen;document.getElementById('chHd').className='col-hd'+(chartOpen?' open':'');document.getElementById('chBody').className='col-body'+(chartOpen?' open':'');if(chartOpen)fetchHistory();}
function togLog(){logOpen=!logOpen;document.getElementById('lgHd').className='col-hd'+(logOpen?' open':'');document.getElementById('lgBody').className='col-body'+(logOpen?' open':'');if(logOpen)fetchLog();}

function fetchHistory(){fetch('/history').then(function(r){return r.json()}).then(function(d){if(d.history&&d.history.length>1){chartData=d.history;drawChart();}}).catch(function(){});}
function fetchLog(){fetch('/log').then(function(r){return r.json()}).then(function(d){var box=document.getElementById('logBox');if(!d.logs||!d.logs.length){box.innerHTML='<div class="log-line">Nenhum log</div>';return;}var h='';for(var i=d.logs.length-1;i>=0;i--)h+='<div class="log-line">'+d.logs[i]+'</div>';box.innerHTML=h;}).catch(function(){});}

// Grafico
function drawChart(){
var canvas=document.getElementById('chart');if(!canvas||!chartOpen)return;
var ctx=canvas.getContext('2d');var W=canvas.parentElement.clientWidth;var H=canvas.parentElement.clientHeight;
canvas.width=W;canvas.height=H;ctx.clearRect(0,0,W,H);if(chartData.length<2)return;
var allT=[],allH=[];
for(var i=0;i<chartData.length;i++){if(chartData[i].t!==null)allT.push(chartData[i].t);if(chartData[i].h!==null)allH.push(chartData[i].h);allT.push(chartData[i].ts);allH.push(chartData[i].hs);}
var minT=Math.min.apply(null,allT)-2,maxT=Math.max.apply(null,allT)+2;
var minH=Math.min.apply(null,allH)-5,maxH=Math.max.apply(null,allH)+5;
var pad={l:28,r:8,t:8,b:16},gW=W-pad.l-pad.r,gH=H-pad.t-pad.b,n=chartData.length,dx=gW/(n-1);
ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineWidth=1;
for(var g=0;g<=4;g++){var gy=pad.t+gH*(g/4);ctx.beginPath();ctx.moveTo(pad.l,gy);ctx.lineTo(W-pad.r,gy);ctx.stroke();}
ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='9px sans-serif';ctx.textAlign='right';
for(var g=0;g<=4;g++){var val=maxT-(maxT-minT)*(g/4);ctx.fillText(val.toFixed(0),pad.l-3,pad.t+gH*(g/4)+3);}
function mapT(v){return pad.t+gH*(1-(v-minT)/(maxT-minT));}
function mapH(v){return pad.t+gH*(1-(v-minH)/(maxH-minH));}
function drawLine(arr,fn,col,dash){ctx.strokeStyle=col;ctx.lineWidth=dash?1:1.5;ctx.setLineDash(dash?[4,3]:[]);ctx.beginPath();var s=false;for(var i=0;i<n;i++){var v=arr[i];if(v===null)continue;var x=pad.l+i*dx,y=fn(v);if(!s){ctx.moveTo(x,y);s=true;}else ctx.lineTo(x,y);}ctx.stroke();ctx.setLineDash([]);}
var temps=[],hums=[],tsp=[],hsp=[];
for(var i=0;i<n;i++){temps.push(chartData[i].t);hums.push(chartData[i].h);tsp.push(chartData[i].ts);hsp.push(chartData[i].hs);}
drawLine(tsp,mapT,'rgba(255,82,82,0.35)',true);drawLine(hsp,mapH,'rgba(66,165,245,0.35)',true);
drawLine(temps,mapT,'#FF5252',false);drawLine(hums,mapH,'#42A5F5',false);
}

// Config
function saveRelayNames(){var r1=document.getElementById('cfgR1').value.trim();var r2=document.getElementById('cfgR2').value.trim();if(!r1&&!r2){document.getElementById('cfgMsg').textContent='Preencha ao menos um nome';return;}
fetch('/relays',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({relay1:r1,relay2:r2})}).then(function(r){return r.json()}).then(function(){document.getElementById('cfgMsg').textContent='Salvo!';document.getElementById('cfgMsg').style.color='var(--pr)';F();}).catch(function(){document.getElementById('cfgMsg').textContent='Erro';document.getElementById('cfgMsg').style.color='var(--dg)';});}

function loadControlConfig(d){
if(d.r1_sensor)document.getElementById('cfgR1S').value=d.r1_sensor;
if(d.r1_action)document.getElementById('cfgR1A').value=d.r1_action;
if(d.r2_sensor)document.getElementById('cfgR2S').value=d.r2_sensor;
if(d.r2_action)document.getElementById('cfgR2A').value=d.r2_action;
if(d.control_period!==undefined)document.getElementById('cfgPeriod').value=d.control_period;
}
function saveControl(){
var r1s=document.getElementById('cfgR1S').value,r1a=document.getElementById('cfgR1A').value;
var r2s=document.getElementById('cfgR2S').value,r2a=document.getElementById('cfgR2A').value;
var per=parseInt(document.getElementById('cfgPeriod').value)||0;
fetch('/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({r1_sensor:r1s,r1_action:r1a,r2_sensor:r2s,r2_action:r2a,period:per})}).then(function(r){return r.json()}).then(function(){document.getElementById('ctrlMsg').textContent='Salvo!';document.getElementById('ctrlMsg').style.color='var(--pr)';}).catch(function(){document.getElementById('ctrlMsg').textContent='Erro';document.getElementById('ctrlMsg').style.color='var(--dg)';});
}

// WiFi
function SC(){document.getElementById('nl').innerHTML='<div class="ld">Escaneando...</div>';fetch('/wifi/scan').then(function(r){return r.json()}).then(function(d){var h='';if(!d.networks||!d.networks.length)h='<div class="ld">Nenhuma rede</div>';else d.networks.forEach(function(n){h+='<div class="wn" onclick="SN(\''+n.ssid.replace(/'/g,"\\'")+'\')"><div class="wnl"><div><div class="wns">'+n.ssid+'</div><div class="wnx">'+(n.secure?'Protegida':'Aberta')+' '+n.rssi+'dBm</div></div></div><div class="wnb">Conectar</div></div>';});document.getElementById('nl').innerHTML=h;}).catch(function(){document.getElementById('nl').innerHTML='<div class="ld">Erro</div>';});}
function SN(s){ss=s;document.getElementById('mtt').textContent=s;document.getElementById('mp').value='';document.getElementById('md').className='modal show';}
function CM(){document.getElementById('md').className='modal';}
function WC(){var p=document.getElementById('mp').value;CM();document.getElementById('nl').innerHTML='<div class="ld">Conectando...</div>';fetch('/wifi/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ssid:ss,password:p})}).then(function(r){return r.json()}).then(function(d){if(d.status==='ok')document.getElementById('nl').innerHTML='<div class="ld" style="color:var(--pr)">OK! IP:'+d.ip+'</div>';else document.getElementById('nl').innerHTML='<div class="ld" style="color:var(--dg)">'+d.message+'</div>';F();}).catch(function(){document.getElementById('nl').innerHTML='<div class="ld" style="color:var(--dg)">Erro</div>';});}
function DC(){fetch('/wifi/disconnect',{method:'POST'}).then(F);}

// Init
F();
setInterval(F,2500);
setInterval(function(){if(chartOpen)fetchHistory();},5000);
setInterval(function(){if(logOpen)fetchLog();},5000);
