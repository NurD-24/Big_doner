var lastCount=0,S=null,cart={},cur=0,price={},myOrder=null;
try{cart=JSON.parse(localStorage.getItem('bd_cart'))||{};myOrder=JSON.parse(localStorage.getItem('bd_order'))}catch(e){}
var $=function(i){return document.getElementById(i)};
function fm(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0')+'\u00a0₸'}
function esc(x){return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
var ST={new:'Қабылданды, күтіңіз',accepted:'Тапсырыс расталды',cooking:'Дайындалып жатыр',delivering:'Жолда',done:'Дайын. Рахмет!',cancelled:'Бас тартылды. Қоңырау шалыңыз'};
function load(){return fetch('/api/site').then(function(r){return r.json()}).then(function(d){S=d;render()})}
function render(){
  $('logo').innerHTML='<img class="lg" src="/img/logo.png" alt="" width="46" height="46"><span>'+esc(S.brand).replace('●','<b>●</b>')+'</span>';
  $('h1').innerHTML=S.heroTitle;$('hp').textContent=S.heroText;
  $('hcall').href='tel:+'+S.branches[0].phone;
  $('facts').innerHTML='<div><strong>Халал</strong><small>Барлық өнім</small></div><div><strong>'+esc(S.hours)+'</strong><small>Күн сайын</small></div><div><strong>'+fm(S.freeFrom).replace('\u00a0₸','')+' ₸-ден тегін</strong><small>Қала бойынша жеткізу</small></div>';
  price={};
  var h='';S.combos.forEach(function(c){if(c.on===false)return;var k='c:'+c.id;price[k]={n:c.name,p:+c.price};
    h+='<div class="cb'+(c.free?' fr':'')+'"><img src="'+esc(c.img)+'" alt="'+esc(c.name)+'" data-z="1"><div><h3>'+esc(c.name)+'</h3>'+(c.free?'<span class="tag">Жеткізу тегін</span>':'')+'<ul>'+c.items.map(function(x){return'<li>'+esc(x)+'</li>'}).join('')+'</ul><div class="price">'+fm(c.price)+'</div><button class="btn add" data-k="'+esc(k)+'">Себетке қосу</button></div></div>'});
  $('combos').innerHTML=h;
  $('shots').innerHTML=(S.shots||[]).map(function(r,i){return'<img src="'+esc(r)+'" alt="Клиент пікірі '+(i+1)+'" data-z="1">'}).join('');
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
  upd();reveal();
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
function status(){if(!myOrder)return;$('st').innerHTML='<span class="ok">Тапсырыс №'+myOrder.num+'</span> <span class="sx">'+esc(ST[myOrder.status]||myOrder.status)+'</span>'}
$('send').addEventListener('click',function(){
  if(S&&S.requireLogin&&!me){openAcc('Тапсырыс беру үшін кіріңіз немесе тіркеліңіз');return}
  var items=Object.keys(cart).map(function(k){return{k:k,q:cart[k].q}});if(!items.length)return;
  var b=$('send');b.disabled=true;$('st').textContent='Жіберілуде...';
  fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:items,name:$('nm').value,phone:$('ph').value,mode:$('mode').value,addr:$('adr').value,branch:$('br').value})})
  .then(function(r){return r.json().then(function(d){return[r.ok,d,r.status]})}).then(function(x){
    if(!x[0]){if(x[2]===401&&S&&S.requireLogin){b.disabled=false;$('st').textContent='';openAcc(x[1].error);return}$('st').textContent=x[1].error||'Қате. Қайта көріңіз';b.disabled=false;return}
    myOrder=x[1];try{localStorage.setItem('bd_order',JSON.stringify(myOrder))}catch(e){}
    cart={};upd();status();$('lines').innerHTML='';loadMe();
  }).catch(function(){$('st').textContent='Байланыс жоқ. Қайта көріңіз';b.disabled=false});
});
function live(){
  var es=new EventSource('/events');
  es.addEventListener('site',function(){load()});
  es.addEventListener('order-status',function(e){var d=JSON.parse(e.data);if(myOrder&&myOrder.id===d.id){myOrder.status=d.status;try{localStorage.setItem('bd_order',JSON.stringify(myOrder))}catch(x){}status()}});
  es.onopen=function(){if(S)load();if(myOrder)fetch('/api/orders/'+myOrder.id).then(function(r){return r.json()}).then(function(d){if(d.status){myOrder.status=d.status;status()}})};
}
load().then(function(){status();live()}).catch(function(){document.querySelector('.hero p').textContent='Сайт жүктелмеді. Бетті жаңартыңыз.'});

// SSE жұмыс істемейтін желіде (мысалы Cloudflare quick tunnel) резервтік тексеру
var lastV=null;
setInterval(function(){
  fetch('/api/ver').then(function(r){return r.json()}).then(function(d){if(lastV&&d.v!==lastV)load();lastV=d.v}).catch(function(){});
  if(myOrder&&myOrder.status!=='done'&&myOrder.status!=='cancelled')fetch('/api/orders/'+myOrder.id).then(function(r){return r.json()}).then(function(d){if(d.status&&d.status!==myOrder.status){myOrder.status=d.status;try{localStorage.setItem('bd_order',JSON.stringify(myOrder))}catch(x){}status()}}).catch(function(){});
},5000);

var io=null;
function reveal(){var els=document.querySelectorAll('section>h2,.chead,.facts,.cb,.branch,.shots img,.cta');
  if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in')});return}
  io=io||new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.1});
  els.forEach(function(e){if(!e.classList.contains('rv')){e.classList.add('rv');io.observe(e)}})}
// Қосымша ретінде орнату (PWA)
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(function(){});
var dip=null,inst=$('inst'),standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();dip=e;if(!standalone)inst.hidden=false});
if(!standalone&&/iphone|ipad|ipod/i.test(navigator.userAgent))inst.hidden=false;
inst.addEventListener('click',function(){if(dip){dip.prompt();dip.userChoice.then(function(){dip=null;inst.hidden=true})}else alert('Safari-де төменгі "Бөлісу" белгісін басып, "Басты экранға қосу" таңдаңыз.')});
window.addEventListener('appinstalled',function(){inst.hidden=true});

// ---- Тіркелу / кіру
var me=null,mo=[],amode='login',amsg='';
function loadMe(){return fetch('/api/user/me').then(function(r){return r.json()}).then(function(d){me=d.user;mo=d.orders||[];accBtn()}).catch(function(){})}
function accBtn(){$('acc').textContent=me?me.name.split(' ')[0]:'Кіру';if(me){if(!$('nm').value)$('nm').value=me.name;if(!$('ph').value)$('ph').value='+'+me.phone}}
function fdt(t){var d=new Date(t);return d.toLocaleDateString('ru-RU')+' '+d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
function drawAcc(){var h;
  if(me){h='<h3>Сәлем, '+esc(me.name)+'</h3><p class="mut">+'+esc(me.phone)+'</p><h4>Менің тапсырыстарым</h4>'+(mo.length?mo.map(function(o){return'<div class="mo"><b>№'+o.num+'</b> <span class="sx">'+esc(ST[o.status]||o.status)+'</span><br><small class="mut">'+fdt(o.time)+' · '+fm(o.total)+'</small></div>'}).join(''):'<p class="mut">Әлі тапсырыс жоқ</p>')+'<button class="btn o" id="alo">Шығу</button>'}
  else{var r=amode==='reg';h='<div class="at"><button data-m="login" class="'+(r?'':'on')+'">Кіру</button><button data-m="reg" class="'+(r?'on':'')+'">Тіркелу</button></div>'+(amsg?'<p class="am1">'+esc(amsg)+'</p>':'')+(r?'<input id="an" placeholder="Атыңыз" autocomplete="name">':'')+'<input id="ap" type="tel" placeholder="Телефон +7 7__ ___ __ __" autocomplete="tel"><input id="aw" type="password" placeholder="Құпиясөз (кемінде 6 таңба)" autocomplete="'+(r?'new-password':'current-password')+'">'+(r?'<label class="cons"><input id="acn" type="checkbox"><span>Дербес деректерімді (аты, телефоны) тапсырыс беру үшін өңдеуге келісемін</span></label>':'')+'<button class="btn" id="ago">'+(r?'Тіркелу':'Кіру')+'</button><p id="aerr"></p>'}
  $('ac').innerHTML=h}
function openAcc(msg){amsg=msg||'';drawAcc();$('am').classList.add('on')}
$('acc').addEventListener('click',function(){openAcc()});
$('am').addEventListener('click',function(e){var t=e.target;
  if(t===$('am')||t===$('ax'))return $('am').classList.remove('on');
  if(t.dataset&&t.dataset.m){amode=t.dataset.m;amsg='';return drawAcc()}
  if(t.id==='alo')return fetch('/api/user/logout',{method:'POST'}).then(function(){me=null;mo=[];accBtn();drawAcc()});
  if(t.id==='ago'){var b={phone:$('ap').value,password:$('aw').value};if(amode==='reg'){b.name=$('an').value;b.consent=$('acn').checked}
    t.disabled=true;fetch(amode==='reg'?'/api/register':'/api/user/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)})
    .then(function(r){return r.json().then(function(d){return[r.ok,d]})}).then(function(x){t.disabled=false;
      if(!x[0]){$('aerr').textContent=x[1].error||'Қате';return}
      amsg='';loadMe().then(drawAcc)}).catch(function(){t.disabled=false;$('aerr').textContent='Байланыс жоқ'})}});
$('am').addEventListener('keydown',function(e){if(e.key==='Enter'&&$('ago'))$('ago').click()});
loadMe();
