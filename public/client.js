var pay='cash',lastCount=0,S=null,cart={},cur=0,price={},myOrder=null;
try{cart=JSON.parse(localStorage.getItem('bd_cart'))||{};myOrder=JSON.parse(localStorage.getItem('bd_order'))}catch(e){}
var $=function(i){return document.getElementById(i)};
function fm(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0')+'\u00a0₸'}
function esc(x){return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
var ST={new:'Қабылданды, күтіңіз',accepted:'Тапсырыс расталды',cooking:'Дайындалып жатыр',delivering:'Жолда',done:'Дайын. Рахмет!',cancelled:'Бас тартылды. Қоңырау шалыңыз'};
function load(){return fetch('/api/site').then(function(r){return r.json()}).then(function(d){S=d;render()})}
function render(){
  $('logo').innerHTML='<img class="lg" src="/img/logo.png" alt="" width="44" height="44"><span>'+esc(S.brand).replace('●','<b>●</b>')+'</span>';
  $('h1').innerHTML=S.heroTitle;$('hp').textContent=S.heroText;$('eb').textContent='Ақтау · Халал · '+S.hours;
  $('hcall').href='tel:+'+S.branches[0].phone;
  var n=0;S.menu.forEach(function(s){s.groups.forEach(function(g){g.items.forEach(function(i){if(i.on!==false)n++})})});
  $('facts').innerHTML='<div class="st"><b data-n="'+n+'" data-s="+">'+n+'+</b><small>Тағам түрі мәзірде</small></div><div class="st"><b>'+esc(S.hours)+'</b><small>Күн сайын ашықпыз</small></div><div class="st"><b data-n="'+S.freeFrom+'" data-s=" ₸">'+fm(S.freeFrom)+'</b><small>-ден асса жеткізу тегін</small></div><div class="st"><b data-n="100" data-s="%">100%</b><small>Халал өнім</small></div>';
  price={};var on=S.combos.filter(function(c){return c.on!==false});
  $('hf').innerHTML=on.slice(0,3).map(function(c,i){return'<img class="fp fp'+(i+1)+'" src="'+esc(c.img)+'" alt="">'}).join('');
  var h='';on.forEach(function(c){var k='c:'+c.id;price[k]={n:c.name,p:+c.price};
    h+='<article class="cb"><div class="ph"><img src="'+esc(c.img)+'" alt="'+esc(c.name+': '+c.items.join(', '))+'" data-z="1" loading="lazy">'+(c.free?'<span class="tag">Жеткізу тегін</span>':'')+'</div><div class="cbi"><div><h3>'+esc(c.name)+'</h3><div class="price">'+fm(c.price)+'</div></div><button class="btn sm add" data-k="'+esc(k)+'">+ Себетке</button></div></article>'});
  $('combos').innerHTML=h;
  $('pt').textContent=S.promoTitle||'Жеткізу тегін';
  $('pp').textContent=S.promoText||('Қала бойынша '+fm(S.freeFrom)+'-ден асатын тапсырысқа жеткізу тегін. Тапсырысты сайттан жіберіңіз, қалғанын өзіміз істейміз.');
  $('pbig').textContent=fm(S.freeFrom);
  $('shots').innerHTML=(S.shots||[]).map(function(r,i){return'<img src="'+esc(r)+'" alt="Клиент пікірі '+(i+1)+'" data-z="1" loading="lazy">'}).join('');
  var ig=$('ig');if(/^https?:\/\//.test(S.instagram||'')){ig.href=S.instagram;ig.hidden=false}else ig.hidden=true;
  var tabs=$('tabs'),panels=$('panels');tabs.innerHTML='';panels.innerHTML='';if(cur>=S.menu.length)cur=0;
  S.menu.forEach(function(sec,si){
    var b=document.createElement('button');b.className='tab';b.setAttribute('role','tab');b.setAttribute('aria-selected',si===cur);b.textContent=sec.title;b.dataset.t='p'+si;tabs.appendChild(b);
    var p=document.createElement('div');p.className='panel'+(si===cur?' on':'');p.id='p'+si;var h='';
    sec.groups.forEach(function(g){h+='<h3>'+esc(g.title)+'</h3>';if(g.note)h+='<p class="note">'+esc(g.note)+'</p>';
      g.items.forEach(function(it){if(it.on===false)return;var k='m:'+it.name;price[k]={n:it.name,p:+it.price};
        h+='<div class="it"><span class="nm">'+esc(it.name)+'</span><i></i><b>'+fm(it.price)+'</b><button class="plus add" data-k="'+esc(k)+'" aria-label="Себетке қосу: '+esc(it.name)+'">+<em data-b="'+esc(k)+'"></em></button></div>'})});
    p.innerHTML=h;panels.appendChild(p);
    b.addEventListener('click',function(){cur=si;document.querySelectorAll('.tab').forEach(function(x){x.setAttribute('aria-selected',x===b)});document.querySelectorAll('.panel').forEach(function(q){q.classList.toggle('on',q.id===b.dataset.t)})});
  });
  $('clist').innerHTML=S.branches.map(function(b){return'<div class="branch"><h3>'+esc(b.name)+'</h3><p>'+esc(b.addr)+'</p><a class="tel" href="tel:+'+esc(b.phone)+'">+'+esc(b.phone).replace(/^(\d)(\d{3})(\d{3})(\d{2})(\d{2})$/,'$1 ($2) $3 $4 $5')+'</a><a class="btn o" href="https://wa.me/'+esc(b.phone)+'" target="_blank" rel="noopener">WhatsApp</a></div>'}).join('');
  $('cnote').textContent='Жұмыс уақыты: күн сайын '+S.hours+'. Қала бойынша жеткізу '+fm(S.freeFrom)+'-ден тегін.';
  var sel=$('br'),v=sel.value||'0';sel.innerHTML=S.branches.map(function(b,i){return'<option value="'+i+'">'+esc(b.name)+'</option>'}).join('');sel.value=v<S.branches.length?v:'0';
  for(var k in cart){if(!price[k])delete cart[k];else cart[k].p=price[k].p;cart[k].n=price[k].n}
  drawPays();upd();reveal();countUp();tick();
}
function totals(){var c=0,t=0;for(var k in cart){c+=cart[k].q;t+=cart[k].q*cart[k].p}return[c,t]}
function upd(){
  try{localStorage.setItem('bd_cart',JSON.stringify(cart))}catch(e){}
  var T=totals();if(T[0]>lastCount){var ob=$('open');ob.classList.remove('bump');void ob.offsetWidth;ob.classList.add('bump')}lastCount=T[0];
  document.querySelectorAll('em[data-b]').forEach(function(em){var q=cart[em.dataset.b];em.textContent=q?q.q:'';em.classList.toggle('on',!!q)});
  $('bar').classList.toggle('on',T[0]>0);$('bc').textContent='Себет: '+T[0]+' тауар';$('bt').textContent=fm(T[1]);
  var h='';for(var k in cart){var x=cart[k];h+='<div class="ci"><span>'+esc(x.n)+'</span><b>'+fm(x.q*x.p)+'</b><span class="q"><button data-d="-1" data-k="'+esc(k)+'" aria-label="Азайту">−</button><span>'+x.q+'</span><button data-d="1" data-k="'+esc(k)+'" aria-label="Көбейту">+</button></span><span style="text-align:right;color:var(--mut)">'+fm(x.p)+' / дана</span></div>'}
  $('lines').innerHTML=h||'<p class="note">Себет бос</p>';$('tt').textContent=fm(T[1]);
  var mode=$('mode').value,F=S?S.freeFrom:5000;
  $('dn').textContent=mode==='d'?(T[1]>=F?'Жеткізу тегін':fm(F)+'-ден асатын тапсырысқа жеткізу тегін. Қазір '+fm(F-T[1])+' жетпейді, жеткізу бағасын нақтылаңыз.'):'';
  $('adw').style.display=mode==='d'?'block':'none';
  $('send').disabled=T[0]===0;$('send').style.opacity=T[0]===0?.45:1;
}
document.addEventListener('click',function(e){
  var t=e.target,zm=$('zm'),a=t.closest&&t.closest('.add');
  if(a){var k=a.dataset.k;if(!price[k])return;if(!cart[k])cart[k]={n:price[k].n,p:price[k].p,q:0};cart[k].q++;a.classList.remove('pop');void a.offsetWidth;a.classList.add('pop');upd();return}
  if(t.dataset&&t.dataset.z){zm.querySelector('img').src=t.src;zm.classList.add('on')}else if(zm.contains(t))zm.classList.remove('on');
});
$('lines').addEventListener('click',function(e){var b=e.target.closest('button[data-d]');if(!b)return;var k=b.dataset.k;cart[k].q+=+b.dataset.d;if(cart[k].q<=0)delete cart[k];upd()});
['mode','br','adr','nm','ph'].forEach(function(id){$(id).addEventListener('input',upd)});
$('open').addEventListener('click',function(){$('ov').classList.add('on');upd()});
$('x').addEventListener('click',function(){$('ov').classList.remove('on')});
$('ov').addEventListener('click',function(e){if(e.target===$('ov'))$('ov').classList.remove('on')});
$('clr').addEventListener('click',function(){cart={};upd()});
$('cl').addEventListener('click',function(){$('combos').scrollBy({left:-344,behavior:'smooth'})});
$('cr').addEventListener('click',function(){$('combos').scrollBy({left:344,behavior:'smooth'})});
var PS={cod:'Төлем: алған кезде (қолма-қол немесе терминал)',pending:'Төлем күтілуде',claimed:'Төлемді тексеріп жатырмыз',paid:'Төлем расталды ✓'};
function payList(){var d=[{id:'cash',name:'Қолма-қол ақша',note:'Курьерге немесе кассада төлейсіз',on:true},{id:'pos',name:'Банк картасы (терминал)',note:'Курьерде терминал бар',on:true},{id:'kaspi',name:'Kaspi аударым / QR',note:'Алдын ала Kaspi арқылы төлейсіз',on:true}];
  return(S&&S.payments&&S.payments.length?S.payments:d).filter(function(p){return p.on!==false&&(p.id!=='kaspi'||S.kaspiPhone||S.kaspiLink)})}
function drawPays(){var l=payList();if(!l.some(function(p){return p.id===pay}))pay=l.length?l[0].id:'cash';
  $('pays').innerHTML=l.map(function(p){return'<label class="pm'+(p.id===pay?' on':'')+'"><input type="radio" name="pay" value="'+esc(p.id)+'"'+(p.id===pay?' checked':'')+'><span><b>'+esc(p.name)+'</b><small>'+esc(p.note||'')+'</small></span></label>'}).join('');
  $('pnote').innerHTML=pay==='kaspi'?'<p class="note">Тапсырысты жібергеннен кейін төлем нұсқаулығы шығады.</p>':''}
$('pays').addEventListener('change',function(e){if(e.target.name==='pay'){pay=e.target.value;drawPays()}});
function status(){if(!myOrder)return;
  var h='<span class="ok">Тапсырыс №'+myOrder.num+'</span> <span class="sx">'+esc(ST[myOrder.status]||myOrder.status)+'</span>';
  if(myOrder.payStatus)h+='<div class="pl '+myOrder.payStatus+'">'+esc(PS[myOrder.payStatus]||'')+'</div>';
  if(myOrder.pay==='kaspi'&&myOrder.payStatus==='pending'&&S){var ph=S.kaspiPhone?'+'+String(S.kaspiPhone).replace(/\D/g,''):'';
    h+='<div class="kp"><b>Kaspi арқылы төлеңіз: '+fm(myOrder.total||0)+'</b><p>Kaspi.kz қосымшасында "Аударым" бөліміне кіріп, төмендегі нөмірге дәл осы соманы аударыңыз'+(S.kaspiLink?' немесе сілтемені басыңыз':'')+'. Төлегеннен кейін "Төлем жасадым" батырмасын басыңыз.</p>'+
    (ph?'<div class="kph"><span>'+esc(ph)+'</span><button class="btn o sm" id="pcopy" data-v="'+esc(ph)+'">Көшіру</button></div>':'')+
    (/^https?:\/\//.test(S.kaspiLink||'')?'<a class="btn" target="_blank" rel="noopener" href="'+esc(S.kaspiLink)+'">Kaspi сілтеме арқылы төлеу</a>':'')+
    (S.kaspiQr?'<img src="'+esc(S.kaspiQr)+'" alt="Kaspi QR">':'')+'<button class="btn o" id="pclaim">Төлем жасадым</button></div>'}
  $('st').innerHTML=h}
$('st').addEventListener('click',function(e){var t=e.target;
  if(t.id==='pcopy'){try{navigator.clipboard.writeText(t.dataset.v);t.textContent='Көшірілді ✓'}catch(x){}}
  if(t.id==='pclaim'&&myOrder){t.disabled=true;fetch('/api/orders/'+myOrder.id+'/claim',{method:'POST'}).then(function(r){return r.json()}).then(function(d){if(d.payStatus){myOrder.payStatus=d.payStatus;saveOrder();status()}}).catch(function(){t.disabled=false})}});
function saveOrder(){try{localStorage.setItem('bd_order',JSON.stringify(myOrder))}catch(e){}}
$('send').addEventListener('click',function(){
  if(S&&S.requireLogin&&!me){openAcc('Тапсырыс беру үшін кіріңіз немесе тіркеліңіз');return}
  var items=Object.keys(cart).map(function(k){return{k:k,q:cart[k].q}});if(!items.length)return;
  var b=$('send');b.disabled=true;$('st').textContent='Жіберілуде...';
  fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:items,name:$('nm').value,phone:$('ph').value,mode:$('mode').value,addr:$('adr').value,branch:$('br').value,pay:pay})})
  .then(function(r){return r.json().then(function(d){return[r.ok,d,r.status]})}).then(function(x){
    if(!x[0]){if(x[2]===401&&S&&S.requireLogin){b.disabled=false;$('st').textContent='';openAcc(x[1].error);return}$('st').textContent=x[1].error||'Қате. Қайта көріңіз';b.disabled=false;return}
    myOrder=x[1];try{localStorage.setItem('bd_order',JSON.stringify(myOrder))}catch(e){}
    cart={};upd();status();$('lines').innerHTML='';loadMe();
  }).catch(function(){$('st').textContent='Байланыс жоқ. Қайта көріңіз';b.disabled=false});
});
function live(){
  var es=new EventSource('/events');
  es.addEventListener('site',function(){load()});
  function upO(e){var d=JSON.parse(e.data);mo.forEach(function(o){if(o.id===d.id){if(d.status)o.status=d.status;if(d.payStatus)o.payStatus=d.payStatus}});if(me)drawCab();if(myOrder&&myOrder.id===d.id){if(d.status)myOrder.status=d.status;if(d.payStatus)myOrder.payStatus=d.payStatus;saveOrder();status()}}
  es.addEventListener('order-status',upO);es.addEventListener('order-pay',upO);
  es.onopen=function(){if(S)load();if(myOrder)fetch('/api/orders/'+myOrder.id).then(function(r){return r.json()}).then(function(d){if(d.status){myOrder.status=d.status;if(d.payStatus)myOrder.payStatus=d.payStatus;status()}})};
}
load().then(function(){status();live()}).catch(function(){document.querySelector('.hero p').textContent='Сайт жүктелмеді. Бетті жаңартыңыз.'});

// SSE жұмыс істемейтін желіде (мысалы Cloudflare quick tunnel) резервтік тексеру
var lastV=null;
setInterval(function(){
  fetch('/api/ver').then(function(r){return r.json()}).then(function(d){if(lastV&&d.v!==lastV)load();lastV=d.v}).catch(function(){});
  if(myOrder&&(!(myOrder.status==='done'||myOrder.status==='cancelled')||myOrder.payStatus==='pending'||myOrder.payStatus==='claimed'))fetch('/api/orders/'+myOrder.id).then(function(r){return r.json()}).then(function(d){if(d.status&&(d.status!==myOrder.status||d.payStatus!==myOrder.payStatus)){myOrder.status=d.status;if(d.payStatus)myOrder.payStatus=d.payStatus;saveOrder();status()}}).catch(function(){});
},5000);

var io=null;
function reveal(){var els=document.querySelectorAll('.sh,.stats,.combos,.shots,.branch,.promo,.cta');
  if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in')});return}
  io=io||new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.1});
  els.forEach(function(e){if(!e.dataset.o){e.dataset.o=1;e.classList.add('rv');io.observe(e)}})}
// Қосымша ретінде орнату (PWA)
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(function(){});
var dip=null,inst=$('inst'),standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();dip=e;if(!standalone)inst.hidden=false});
if(!standalone&&/iphone|ipad|ipod/i.test(navigator.userAgent))inst.hidden=false;
inst.addEventListener('click',function(){if(dip){dip.prompt();dip.userChoice.then(function(){dip=null;inst.hidden=true})}else alert('Safari-де төменгі "Бөлісу" белгісін басып, "Басты экранға қосу" таңдаңыз.')});
window.addEventListener('appinstalled',function(){inst.hidden=true});

// ---- Тіркелу / кіру
var me=null,mo=[],amode='login',amsg='';
function loadMe(){return fetch('/api/user/me').then(function(r){return r.json()}).then(function(d){me=d.user;mo=d.orders||[];accBtn();drawCab()}).catch(function(){})}
function accBtn(){$('acc').textContent=me?me.name.split(' ')[0]:'Кіру';if(me){if(!$('nm').value)$('nm').value=me.name;if(!$('ph').value)$('ph').value='+'+me.phone}}
function fdt(t){var d=new Date(t);return d.toLocaleDateString('ru-RU')+' '+d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
var astep=1,av={name:'',phone:'',pw:''},cool=0,coolT=null,JH={'Content-Type':'application/json'};
function smsOn(){return !!(S&&S.smsOn)}
function parseR(r){return r.json().then(function(d){return[r.ok,d,r.status]})}
function drawAcc(){var h;
  if(me){h='<h3>Сәлем, '+esc(me.name)+'</h3><p class="mut">+'+esc(me.phone)+'</p><h4>Менің тапсырыстарым</h4>'+(mo.length?mo.slice(0,5).map(function(o){return'<div class="mo"><b>№'+o.num+'</b> <span class="sx">'+esc(ST[o.status]||o.status)+'</span><br><small class="mut">'+fdt(o.time)+' · '+fm(o.total)+'</small></div>'}).join(''):'<p class="mut">Әлі тапсырыс жоқ</p>')+'<button class="btn o" id="alo">Шығу</button>'}
  else{var r=amode==='reg',rs=amode==='reset',s2=astep===2&&smsOn()&&(r||rs);
    h=(rs?'<h3>Құпиясөзді қалпына келтіру</h3>':'<div class="at"><button data-m="login" class="'+(amode==='login'?'on':'')+'">Кіру</button><button data-m="reg" class="'+(r?'on':'')+'">Тіркелу</button></div>')+(amsg?'<p class="am1">'+esc(amsg)+'</p>':'');
    if(s2){h+='<p class="mut">SMS-код +'+esc(av.phone.replace(/\D/g,''))+' нөміріне жіберілді</p><input id="acd" inputmode="numeric" maxlength="6" placeholder="6 таңбалы код" autocomplete="one-time-code">'+(rs?'<input id="aw" type="password" placeholder="Жаңа құпиясөз (кемінде 6 таңба)" autocomplete="new-password">':'')+'<button class="btn" id="ago">'+(rs?'Құпиясөзді жаңарту':'Растау және тіркелу')+'</button><div class="row" style="margin-top:8px;justify-content:space-between"><button class="btn o sm" id="arsd" disabled>Қайта жіберу</button><button class="btn o sm" id="aback">Нөмірді өзгерту</button></div><p id="aerr"></p>'}
    else{h+=(r?'<input id="an" placeholder="Атыңыз" autocomplete="name" value="'+esc(av.name)+'">':'')+'<input id="ap" type="tel" placeholder="Телефон +7 7__ ___ __ __" autocomplete="tel" value="'+esc(av.phone)+'">'+(rs?'':'<input id="aw" type="password" placeholder="Құпиясөз (кемінде 6 таңба)" autocomplete="'+(r?'new-password':'current-password')+'" value="'+esc(r?av.pw:'')+'">')+
      (r?'<label class="cons"><input id="acn" type="checkbox"><span>Дербес деректерімді (аты, телефоны) тапсырыс беру үшін өңдеуге келісемін</span></label>':'')+
      '<button class="btn" id="ago">'+(rs||(r&&smsOn())?'SMS код алу':r?'Тіркелу':'Кіру')+'</button>'+(amode==='login'&&smsOn()?'<button class="btn o sm" data-m="reset" style="margin-top:8px">Құпиясөзді ұмыттым</button>':'')+'<p id="aerr"></p>'}}
  $('ac').innerHTML=h;if($('arsd'))cooldown()}
function cooldown(){clearInterval(coolT);function t(){var b=$('arsd');if(!b){clearInterval(coolT);return}if(cool>0){b.disabled=true;b.textContent='Қайта жіберу ('+cool+')';cool--}else{b.disabled=false;b.textContent='Қайта жіберу';clearInterval(coolT)}}t();coolT=setInterval(t,1000)}
function sendCode(purpose,btn){if(btn)btn.disabled=true;
  return fetch('/api/sms/send',{method:'POST',headers:JH,body:JSON.stringify({phone:av.phone,purpose:purpose})}).then(parseR).then(function(x){if(btn)btn.disabled=false;
    if(!x[0]){if(x[2]===429&&x[1].wait&&astep===2){cool=x[1].wait;cooldown()}$('aerr').textContent=x[1].error||'Қате';return}
    astep=2;cool=60;drawAcc()}).catch(function(){if(btn)btn.disabled=false;$('aerr').textContent='Байланыс жоқ'})}
function submitAcc(t){var sms=smsOn(),r=amode==='reg',rs=amode==='reset',err=function(m){$('aerr').textContent=m};
  function post(u,b){t.disabled=true;return fetch(u,{method:'POST',headers:JH,body:JSON.stringify(b)}).then(parseR).then(function(x){t.disabled=false;if(!x[0]){err(x[1].error||'Қате');return null}return x[1]}).catch(function(){t.disabled=false;err('Байланыс жоқ');return null})}
  function done(d){if(d){amsg='';av={name:'',phone:'',pw:''};astep=1;loadMe().then(drawAcc)}}
  if(amode==='login')return post('/api/user/login',{phone:$('ap').value,password:$('aw').value}).then(done);
  if(rs&&astep===1){av.phone=$('ap').value;return sendCode('reset',t)}
  if(rs)return post('/api/user/reset',{phone:av.phone,code:$('acd').value,password:$('aw').value}).then(done);
  if(r&&(!sms||astep===1)){av.name=$('an').value;av.phone=$('ap').value;av.pw=$('aw').value;
    if(av.name.trim().length<2)return err('Атыңызды жазыңыз');if(av.pw.length<6)return err('Құпиясөз кемінде 6 таңба болсын');if(!$('acn').checked)return err('Дербес деректерді өңдеуге келісім қажет');
    if(sms)return sendCode('reg',t);return post('/api/register',{name:av.name,phone:av.phone,password:av.pw,consent:true}).then(done)}
  if(r)return post('/api/register',{name:av.name,phone:av.phone,password:av.pw,consent:true,code:$('acd').value}).then(done)}
function openAcc(msg){amsg=msg||'';drawAcc();$('am').classList.add('on')}
$('acc').addEventListener('click',function(){openAcc()});
$('am').addEventListener('click',function(e){var t=e.target;
  if(t===$('am')||t===$('ax'))return $('am').classList.remove('on');
  if(t.dataset&&t.dataset.m){amode=t.dataset.m;astep=1;amsg='';return drawAcc()}
  if(t.id==='alo')return fetch('/api/user/logout',{method:'POST'}).then(function(){me=null;mo=[];amode='login';astep=1;accBtn();drawCab();drawAcc()});
  if(t.id==='aback'){astep=1;return drawAcc()}
  if(t.id==='arsd')return sendCode(amode==='reset'?'reset':'reg',t);
  if(t.id==='ago')return submitAcc(t)});
$('am').addEventListener('keydown',function(e){if(e.key==='Enter'&&$('ago'))$('ago').click()});
loadMe();

// ---- Күй, сағат, санауыш, 3D эффект, жарық, прогресс
function tick(){var d=new Date();$('clk').textContent=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
  var el=$('stt');if(!S){return}var m=/(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/.exec(S.hours||'');if(!m){el.textContent='';return}
  var cur=d.getHours()*60+d.getMinutes(),a=+m[1]*60+ +m[2],b=+m[3]*60+ +m[4],open=a<=b?(cur>=a&&cur<b):(cur>=a||cur<b);
  el.className='stt '+(open?'on':'off');el.textContent=open?'Ашық':'Жабық'}
setInterval(tick,20000);
function countUp(){var els=document.querySelectorAll('.st b[data-n]');if(!('IntersectionObserver' in window))return;
  var o=new IntersectionObserver(function(en){en.forEach(function(x){if(!x.isIntersecting)return;o.unobserve(x.target);var e=x.target,to=+e.dataset.n,s=e.dataset.s||'',t0=performance.now();
    (function f(t){var p=Math.min(1,(t-t0)/1200),v=Math.round(to*(1-Math.pow(1-p,3)));e.textContent=String(v).replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0')+s;if(p<1)requestAnimationFrame(f)})(t0)})},{threshold:.5});
  els.forEach(function(e){e.textContent='0'+(e.dataset.s||'');o.observe(e)})}
(function(){var tk=$('tk'),w=['ДОНЕР','ЧИКЕН','ПИЦЦА','БУРГЕР','ХАЛАЛ','ЖЕТКІЗУ'],h='';for(var i=0;i<4;i++)w.forEach(function(x){h+='<span>'+x+'</span>'});tk.innerHTML=h})();
var cmb=$('combos');
cmb.addEventListener('pointermove',function(e){var c=e.target.closest('.cb');if(!c||e.pointerType==='touch')return;var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
  c.style.transform='perspective(900px) rotateY('+(x*9)+'deg) rotateX('+(-y*9)+'deg) translateY(-6px)';c.style.setProperty('--gx',(x+.5)*100+'%');c.style.setProperty('--gy',(y+.5)*100+'%')});
cmb.addEventListener('pointerout',function(e){var c=e.target.closest('.cb');if(c&&!c.contains(e.relatedTarget))c.style.transform=''});
var raf=0;document.addEventListener('pointermove',function(e){if(raf||e.pointerType==='touch')return;raf=requestAnimationFrame(function(){raf=0;document.documentElement.style.setProperty('--mx',e.clientX+'px');document.documentElement.style.setProperty('--my',e.clientY+'px')})});
window.addEventListener('scroll',function(){var h=document.documentElement;$('pg').style.width=(h.scrollTop/(h.scrollHeight-h.clientHeight||1)*100)+'%'},{passive:true});

// ---- Жеке кабинет (тек тіркелгендерге): камера, қазіргі тапсырыс, тарих
var camLoaded=false,cabT=0,STEPS=['new','accepted','cooking','delivering','done'],STL={new:'Қабылданды',accepted:'Расталды',cooking:'Дайындалуда',delivering:'Жолда',done:'Дайын'};
function drawCab(){var sec=$('cabinet'),nav=$('navcab');
  if(!me){sec.hidden=true;nav.hidden=true;$('vid').innerHTML='';$('camc').hidden=true;camLoaded=false;return}
  sec.hidden=false;nav.hidden=false;
  var act=mo.filter(function(o){return o.status!=='done'&&o.status!=='cancelled'})[0];
  $('track').innerHTML=act?'<h3>Қазіргі тапсырыс №'+act.num+'</h3><div class="steps">'+STEPS.map(function(s,k){var i=STEPS.indexOf(act.status);return'<span class="'+(k<i?'done':k===i?'cur':'')+'">'+STL[s]+'</span>'}).join('')+'</div><div class="mut" style="font-size:14px">'+esc(PS[act.payStatus]||'')+' · '+fm(act.total)+'</div>':'<h3>Қазіргі тапсырыс</h3><p class="mut">Белсенді тапсырыс жоқ. <a class="ac" href="#menu">Мәзірден таңдаңыз</a></p>';
  $('hist').innerHTML=mo.length?mo.map(function(o){return'<div class="ho"><div class="hr2"><b>№'+o.num+'</b><span class="sx">'+esc(ST[o.status]||o.status)+'</span><span class="mut">'+fdt(o.time)+'</span><b class="ac" style="margin-left:auto">'+fm(o.total)+'</b></div><div class="mut" style="font-size:14px;margin:4px 0">'+(o.items||[]).map(function(i){return esc(i.n)+' × '+i.q}).join(', ')+'</div><div class="mut" style="font-size:13px">'+esc(o.payName||'')+(o.payStatus?' · '+esc(PS[o.payStatus]||''):'')+'</div><button class="btn o sm" data-re="'+o.id+'">Қайталау</button></div>'}).join(''):'<p class="mut">Тарих бос. Алғашқы тапсырысты беріңіз!</p>';
  if(!camLoaded){camLoaded=true;loadCam()}}
$('hist').addEventListener('click',function(e){var b=e.target.closest('[data-re]');if(!b)return;var o=mo.filter(function(x){return x.id===b.dataset.re})[0];if(!o)return;
  var lk={};Object.keys(price).forEach(function(k){lk[price[k].n]=k});var n=0;
  (o.items||[]).forEach(function(i){var k=lk[i.n];if(!k)return;if(!cart[k])cart[k]={n:price[k].n,p:price[k].p,q:0};cart[k].q+=i.q;n++});
  if(!n){alert('Бұл тағамдар қазір мәзірде жоқ');return}upd();$('ov').classList.add('on')});
function loadCam(){fetch('/api/camera').then(function(r){return r.ok?r.json():null}).then(function(c){var box=$('camc');
  if(!c){box.hidden=true;$('cabg').classList.add('nocam');return}box.hidden=false;$('cabg').classList.remove('nocam');$('camt').textContent=c.title||'Тікелей эфир';playCam(c,$('vid'))}).catch(function(){})}
function playCam(c,v){var u=c.url,k=c.kind||'auto';
  if(k==='auto')k=/\.m3u8(\?|$)/i.test(u)?'hls':/\.(mp4|webm)(\?|$)/i.test(u)?'video':/mjpe?g|snapshot/i.test(u)?'mjpeg':'iframe';
  v.innerHTML='<span class="live">LIVE</span>';
  if(k==='iframe'){var f=document.createElement('iframe');f.src=u;f.allow='autoplay; fullscreen';f.setAttribute('allowfullscreen','');f.referrerPolicy='no-referrer';f.sandbox='allow-scripts allow-same-origin allow-presentation';v.appendChild(f);return}
  if(k==='mjpeg'){var im=document.createElement('img');im.alt='Камера';im.src=u;v.appendChild(im);return}
  var vd=document.createElement('video');vd.muted=true;vd.autoplay=true;vd.playsInline=true;vd.controls=true;v.appendChild(vd);
  var err=function(){v.insertAdjacentHTML('beforeend','<p class="camerr">Камера қазір қолжетімсіз</p>')};
  if(k==='hls'&&!vd.canPlayType('application/vnd.apple.mpegurl')){var go=function(){if(window.Hls&&Hls.isSupported()){var h=new Hls();h.loadSource(u);h.attachMedia(vd)}else err()};
    if(window.Hls)go();else{var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';s.onload=go;s.onerror=err;document.head.appendChild(s)}}
  else{vd.src=u;vd.onerror=err}}
setInterval(function(){if(me&&document.visibilityState==='visible'&&++cabT%3===0)fetch('/api/user/me').then(function(r){return r.json()}).then(function(d){if(d.user){mo=d.orders||[];drawCab()}}).catch(function(){})},5000);
