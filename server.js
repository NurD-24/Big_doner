// Big Doner — сервер. Сыртқы кітапхана керек емес: тек Node.js 18+
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000, PASS=process.env.ADMIN_PASSWORD||'admin123';
const D=path.join(__dirname,'data'), PUB=path.join(__dirname,'public');
const SITE=path.join(D,'site.json'), ORD=path.join(D,'orders.json'), USR=path.join(D,'users.json');
const MIME={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const read=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return d}};
const write=(f,v)=>{fs.writeFileSync(f+'.tmp',JSON.stringify(v,null,1));fs.renameSync(f+'.tmp',f)};
let site=read(SITE,{}), orders=read(ORD,[]), users=read(USR,[]), ver=Date.now();
const STATUS=['new','accepted','cooking','delivering','done','cancelled'], PAYST=['cod','pending','claimed','paid'];
const DEFPAY=[{id:'cash',name:'Қолма-қол ақша',note:'Курьерге немесе кассада төлейсіз',on:true},{id:'pos',name:'Банк картасы (терминал)',note:'Курьерде терминал бар',on:true},{id:'kaspi',name:'Kaspi аударым / QR',note:'Алдын ала Kaspi арқылы төлейсіз',on:true}];
const tokens=new Map(), clients=new Set(), hits=new Map();
const limit=(k,max,ms)=>{const n=Date.now(),a=(hits.get(k)||[]).filter(t=>n-t<ms);a.push(n);hits.set(k,a);return a.length>max};
setInterval(()=>{const n=Date.now();for(const[k,t]of tokens)if(t<n)tokens.delete(k);hits.clear()},600000).unref();
const ip=r=>(r.headers['x-forwarded-for']||r.socket.remoteAddress||'').split(',')[0].trim();
const cookie=r=>Object.fromEntries((r.headers.cookie||'').split(';').map(s=>s.trim().split('=')).filter(a=>a[0]));
const isAdmin=r=>{const t=cookie(r).bd_admin;return !!t&&(tokens.get(t)||0)>Date.now()};
const json=(res,code,v)=>{res.writeHead(code,{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(v))};
const body=(r,max=1e6)=>new Promise((ok,no)=>{const c=[];let n=0;r.on('data',d=>{n+=d.length;if(n>max){no(new Error('big'));r.destroy()}else c.push(d)});r.on('end',()=>ok(Buffer.concat(c)));r.on('error',no)});
const jbody=async r=>{try{return JSON.parse((await body(r)).toString()||'{}')}catch(e){return null}};
function send(ev,data,adminOnly){const m='event: '+ev+'\ndata: '+JSON.stringify(data)+'\n\n';for(const c of clients)if(!adminOnly||c.admin)c.res.write(m)}
const str=(v,n)=>String(v==null?'':v).slice(0,n);
// ---- Клиенттер (тіркелу). Құпиясөз scrypt-пен хэштеледі, сессия қол қойылған cookie-де
const SECRET=process.env.SECRET||(()=>{const f=path.join(D,'secret.key');try{return fs.readFileSync(f,'utf8')}catch(e){const k=crypto.randomBytes(32).toString('hex');try{fs.writeFileSync(f,k)}catch(x){}return k}})();
const hmac=b=>crypto.createHmac('sha256',SECRET).update(b).digest('hex');
const signU=id=>{const b=id+'.'+(Date.now()+30*864e5);return b+'.'+hmac(b)};
const curUser=r=>{const t=(cookie(r).bd_user||'').split('.');if(t.length!==3)return null;const h=hmac(t[0]+'.'+t[1]);
  if(h.length!==t[2].length||!crypto.timingSafeEqual(Buffer.from(h),Buffer.from(t[2]))||+t[1]<Date.now())return null;return users.find(x=>x.id===t[0])||null};
const hashPw=(pw,salt)=>{salt=salt||crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(pw,salt,32).toString('hex')};
const checkPw=(pw,st)=>{const[sl,h]=String(st).split(':'),x=hashPw(pw,sl).split(':')[1];return x.length===h.length&&crypto.timingSafeEqual(Buffer.from(x),Buffer.from(h))};
const normPhone=v=>{let d=String(v||'').replace(/\D/g,'');if(d.length===11&&d[0]==='8')d='7'+d.slice(1);if(d.length===10)d='7'+d;return d.length===11&&d[0]==='7'?d:''};
const pubU=u=>({name:u.name,phone:u.phone});
const userCookie=(req,res,v,age)=>res.setHeader('Set-Cookie','bd_user='+v+'; HttpOnly; SameSite=Lax; Path=/; Max-Age='+age+(req.headers['x-forwarded-proto']==='https'?'; Secure':''));
// ---- SMS растау (бір реттік код). Провайдер тек орта айнымалылары арқылы: SMS_PROVIDER=mobizon|smsc|console
const SMSP=(process.env.SMS_PROVIDER||'').toLowerCase(), SMS_LIMIT=+process.env.SMS_DAILY_LIMIT||300;
const otp=new Map(), smsCnt=new Map(), smsDay={d:'',n:0};
const today=()=>new Date().toISOString().slice(0,10);
async function sendSms(phone,text){
  try{
    if(SMSP==='console'){console.log('[SMS] +'+phone+': '+text);return true}
    if(SMSP==='mobizon'){const host=process.env.MOBIZON_HOST||'https://api.mobizon.kz',q=new URLSearchParams({output:'json',api:'v1',apiKey:process.env.MOBIZON_KEY||'',recipient:phone,text});
      if(process.env.SMS_SENDER)q.set('from',process.env.SMS_SENDER);
      const r=await fetch(host+'/service/message/sendsmsmessage',{method:'POST',body:q,signal:AbortSignal.timeout(10000)}),j=await r.json();return j.code===0}
    if(SMSP==='smsc'){const q=new URLSearchParams({login:process.env.SMSC_LOGIN||'',psw:process.env.SMSC_PASSWORD||'',phones:phone,mes:text,fmt:'3',charset:'utf-8'});
      if(process.env.SMS_SENDER)q.set('sender',process.env.SMS_SENDER);
      const r=await fetch('https://smsc.kz/sys/send.php',{method:'POST',body:q,signal:AbortSignal.timeout(10000)}),j=await r.json();return !j.error}
  }catch(e){console.error('SMS қатесі:',e.message)}
  return false}
function checkOtp(purpose,phone,code){const key=purpose+':'+phone,o=otp.get(key);if(!o||o.exp<Date.now())return'expired';
  if(o.tries>=5){otp.delete(key);return'many'}o.tries++;const h=hmac(key+String(code||'').trim());
  if(h.length!==o.h.length||!crypto.timingSafeEqual(Buffer.from(h),Buffer.from(o.h)))return'bad';otp.delete(key);return'ok'}
const otpErr=r=>r==='expired'?'Код мерзімі өтті. Жаңасын алыңыз':r==='many'?'Көп қате. Жаңа код алыңыз':'Код қате';
setInterval(()=>{const n=Date.now();for(const[k,o]of otp)if(o.exp<n)otp.delete(k)},300000).unref();
// Баға клиенттен емес, сервердегі мәзірден алынады
function priceMap(){const m={};(site.combos||[]).forEach(c=>{if(c.on!==false)m['c:'+c.id]={n:c.name,p:+c.price}});
  (site.menu||[]).forEach(s=>s.groups.forEach(g=>g.items.forEach(i=>{if(i.on!==false)m['m:'+i.name]={n:i.name,p:+i.price}})));return m}
async function api(req,res,u){
  const m=req.method,p=u.pathname;
  if(p==='/api/site'&&m==='GET'){if(isAdmin(req))return json(res,200,site);const{camera,...pub}=site;pub.smsOn=!!SMSP;return json(res,200,pub)}
  if(p==='/api/ver')return json(res,200,{v:ver});
  if(p==='/api/login'&&m==='POST'){
    if(limit('login'+ip(req),8,60000))return json(res,429,{error:'Көп әрекет. Бір минуттан кейін қайталаңыз'});
    const b=await jbody(req)||{},a=Buffer.from(str(b.password,200)),k=Buffer.from(PASS);
    if(a.length!==k.length||!crypto.timingSafeEqual(a,k))return json(res,401,{error:'Құпиясөз қате'});
    const t=crypto.randomBytes(24).toString('hex');tokens.set(t,Date.now()+7*864e5);
    res.setHeader('Set-Cookie','bd_admin='+t+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800'+(req.headers['x-forwarded-proto']==='https'?'; Secure':''));
    return json(res,200,{ok:1});
  }
  if(p==='/api/logout'&&m==='POST'){tokens.delete(cookie(req).bd_admin);return json(res,200,{ok:1})}
  if(p==='/api/me')return json(res,200,{admin:isAdmin(req)});
  if(p==='/api/sms/send'&&m==='POST'){
    if(!SMSP)return json(res,400,{error:'SMS растау қосылмаған'});
    const b=await jbody(req)||{},phone=normPhone(b.phone),purpose=b.purpose==='reset'?'reset':'reg';
    if(!phone)return json(res,400,{error:'Телефон нөмірін дұрыс жазыңыз (+7 7XX XXX XX XX)'});
    if(limit('smsip'+ip(req),8,3600000))return json(res,429,{error:'Тым көп сұраныс. Кейінірек қайталаңыз'});
    const exists=users.some(x=>x.phone===phone);
    if(purpose==='reg'&&exists)return json(res,409,{error:'Бұл нөмір тіркелген. "Кіру" бөліміне өтіңіз'});
    if(purpose==='reset'&&!exists)return json(res,200,{ok:1,wait:60});
    const key=purpose+':'+phone,cur=otp.get(key),td=today();
    if(cur&&Date.now()-cur.last<60000)return json(res,429,{error:'Қайта жіберу үшін біраз күтіңіз',wait:Math.ceil((60000-(Date.now()-cur.last))/1000)});
    if(smsDay.d!==td){smsDay.d=td;smsDay.n=0;smsCnt.clear()}
    if(smsDay.n>=SMS_LIMIT)return json(res,503,{error:'Бүгінгі SMS лимиті бітті. Қоңырау шалыңыз'});
    const pc=(smsCnt.get(phone)||0)+1;if(pc>5)return json(res,429,{error:'Бұл нөмірге бүгін көп SMS жіберілді. Ертең қайталаңыз'});
    smsCnt.set(phone,pc);smsDay.n++;
    const code=String(crypto.randomInt(100000,1000000));
    otp.set(key,{h:hmac(key+code),exp:Date.now()+300000,tries:0,last:Date.now()});
    const ok=await sendSms(phone,'Big Doner: растау коды '+code+'. Ешкімге айтпаңыз.');
    if(!ok){otp.delete(key);return json(res,502,{error:'SMS жіберілмеді. Кейінірек қайталаңыз'})}
    return json(res,200,{ok:1,wait:60});
  }
  if(p==='/api/user/reset'&&m==='POST'){
    if(!SMSP)return json(res,400,{error:'SMS растау қосылмаған'});
    const b=await jbody(req)||{},phone=normPhone(b.phone),pw=str(b.password,100);
    if(limit('rst'+ip(req),10,600000)||limit('rsp'+phone,8,600000))return json(res,429,{error:'Тым көп әрекет. Кейінірек қайталаңыз'});
    if(pw.length<6)return json(res,400,{error:'Құпиясөз кемінде 6 таңба болсын'});
    const usr=users.find(x=>x.phone===phone),r=checkOtp('reset',phone,b.code);
    if(!usr||r!=='ok')return json(res,400,{error:r==='ok'?'Код қате':otpErr(r)});
    usr.hash=hashPw(pw);usr.verified=true;usr.last=Date.now();write(USR,users);userCookie(req,res,signU(usr.id),2592000);return json(res,200,{user:pubU(usr)});
  }
  if(p==='/api/register'&&m==='POST'){
    if(limit('reg'+ip(req),6,600000))return json(res,429,{error:'Тым көп әрекет. Кейінірек қайталаңыз'});
    const b=await jbody(req)||{},name=str(b.name,60).trim(),phone=normPhone(b.phone),pw=str(b.password,100);
    if(name.length<2)return json(res,400,{error:'Атыңызды жазыңыз'});
    if(!phone)return json(res,400,{error:'Телефон нөмірін дұрыс жазыңыз (+7 7XX XXX XX XX)'});
    if(pw.length<6)return json(res,400,{error:'Құпиясөз кемінде 6 таңба болсын'});
    if(!b.consent)return json(res,400,{error:'Дербес деректерді өңдеуге келісім қажет'});
    if(users.some(x=>x.phone===phone))return json(res,409,{error:'Бұл нөмір тіркелген. "Кіру" бөліміне өтіңіз'});
    if(SMSP){const r=checkOtp('reg',phone,b.code);if(r!=='ok')return json(res,400,{error:otpErr(r)})}
    const usr={id:crypto.randomBytes(6).toString('hex'),name,phone,hash:hashPw(pw),created:Date.now(),last:Date.now(),verified:!!SMSP};
    users.push(usr);write(USR,users);userCookie(req,res,signU(usr.id),2592000);send('user',{id:usr.id},true);
    return json(res,200,{user:pubU(usr)});
  }
  if(p==='/api/user/login'&&m==='POST'){
    const b=await jbody(req)||{},phone=normPhone(b.phone);
    if(limit('ul'+ip(req),10,600000)||limit('up'+phone,8,600000))return json(res,429,{error:'Тым көп әрекет. Кейінірек қайталаңыз'});
    const usr=users.find(x=>x.phone===phone);
    if(!usr||!checkPw(str(b.password,100),usr.hash))return json(res,401,{error:'Телефон немесе құпиясөз қате'});
    usr.last=Date.now();write(USR,users);userCookie(req,res,signU(usr.id),2592000);return json(res,200,{user:pubU(usr)});
  }
  if(p==='/api/user/logout'&&m==='POST'){userCookie(req,res,'',0);return json(res,200,{ok:1})}
  if(p==='/api/user/me'){const usr=curUser(req);if(!usr)return json(res,200,{user:null});
    return json(res,200,{user:pubU(usr),orders:orders.filter(o=>o.uid===usr.id).slice(-50).reverse().map(o=>({id:o.id,num:o.num,time:o.time,status:o.status,total:o.total,items:o.items,pay:o.pay,payName:o.payName,payStatus:o.payStatus,mode:o.mode,addr:o.addr,branch:o.branch}))})}
  if(p==='/api/camera'){const usr=curUser(req);if(!usr)return json(res,401,{error:'Кіру керек'});
    const c=site.camera;if(!c||!c.on||!/^https?:\/\//.test(c.url||''))return json(res,404,{error:'Камера қосылмаған'});
    return json(res,200,{title:str(c.title,80),url:c.url,kind:c.kind||'auto'})}
  if(p==='/api/orders'&&m==='POST'){
    if(limit('ord'+ip(req),6,60000))return json(res,429,{error:'Тым жиі. Азғана күте тұрыңыз'});
    const b=await jbody(req);if(!b||!Array.isArray(b.items))return json(res,400,{error:'Қате сұраныс'});
    const usr=curUser(req);if(site.requireLogin&&!usr)return json(res,401,{error:'Тапсырыс беру үшін кіріңіз немесе тіркеліңіз'});
    const pm=priceMap(),items=[];let total=0;
    for(const it of b.items.slice(0,60)){const x=pm[it.k],q=Math.floor(+it.q);if(!x||!(q>0&&q<=99))continue;items.push({n:x.n,p:x.p,q});total+=x.p*q}
    if(!items.length)return json(res,400,{error:'Себет бос немесе тауар жоқ'});
    const phone=str(b.phone,20).replace(/[^\d+]/g,'');if(phone.replace(/\D/g,'').length<10)return json(res,400,{error:'Телефон нөмірін дұрыс жазыңыз'});
    const mode=b.mode==='p'?'p':'d',addr=str(b.addr,200).trim();if(mode==='d'&&!addr)return json(res,400,{error:'Мекенжайды жазыңыз'});
    const pays=(site.payments&&site.payments.length?site.payments:DEFPAY).filter(x=>x.on!==false),pmt=pays.find(x=>x.id===b.pay)||pays[0];
    if(!pmt)return json(res,400,{error:'Төлем әдісі өшірулі. Қоңырау шалыңыз'});
    if(pmt.id==='kaspi'&&!site.kaspiPhone&&!site.kaspiLink)return json(res,400,{error:'Kaspi төлемі әзірге бапталмаған. Басқа әдісті таңдаңыз'});
    const br=(site.branches||[])[+b.branch]||{};
    const o={id:crypto.randomBytes(6).toString('hex'),num:(orders.reduce((a,x)=>Math.max(a,x.num),0))+1,time:Date.now(),status:'new',uid:usr?usr.id:'',name:str(b.name,60).trim(),phone,mode,addr,comment:str(b.comment,300).trim(),branch:br.name||'',items,total,pay:pmt.id,payName:pmt.name,payStatus:pmt.id==='kaspi'?'pending':'cod'};
    orders.push(o);write(ORD,orders);send('order',o,true);return json(res,200,{id:o.id,num:o.num,status:o.status,total:o.total,pay:o.pay,payStatus:o.payStatus});
  }
  const mo=p.match(/^\/api\/orders\/([a-f0-9]+)$/);
  if(mo&&m==='GET'){const o=orders.find(x=>x.id===mo[1]);return o?json(res,200,{num:o.num,status:o.status,payStatus:o.payStatus}):json(res,404,{error:'Табылмады'})}
  const mc=p.match(/^\/api\/orders\/([a-f0-9]+)\/claim$/);
  if(mc&&m==='POST'){if(limit('clm'+ip(req),20,600000))return json(res,429,{error:'Тым жиі'});
    const o=orders.find(x=>x.id===mc[1]);if(!o||o.pay!=='kaspi')return json(res,404,{error:'Табылмады'});
    if(o.payStatus==='pending'){o.payStatus='claimed';write(ORD,orders);send('order-pay',{id:o.id,num:o.num,payStatus:o.payStatus})}
    return json(res,200,{payStatus:o.payStatus})}
  // төмендегілер тек админге
  if(!isAdmin(req))return json(res,401,{error:'Кіру керек'});
  if(p==='/api/sms/status'&&m==='GET')return json(res,200,{provider:SMSP,today:smsDay.d===today()?smsDay.n:0,limit:SMS_LIMIT});
  if(p==='/api/users'&&m==='GET')return json(res,200,users.map(x=>{const mine=orders.filter(o=>o.uid===x.id&&o.status!=='cancelled');
    return{id:x.id,name:x.name,phone:x.phone,ver:!!x.verified,created:x.created,last:x.last,orders:mine.length,total:mine.reduce((a,o)=>a+o.total,0),lastOrder:mine.length?mine[mine.length-1].time:0}}).reverse());
  const mu=p.match(/^\/api\/users\/([a-f0-9]+)(\/password)?$/);
  if(mu&&m==='DELETE'){users=users.filter(x=>x.id!==mu[1]);write(USR,users);return json(res,200,{ok:1})}
  if(mu&&mu[2]&&m==='POST'){const b=await jbody(req)||{},x=users.find(y=>y.id===mu[1]),pw=str(b.password,100);
    if(!x||pw.length<6)return json(res,400,{error:'Құпиясөз кемінде 6 таңба'});x.hash=hashPw(pw);write(USR,users);return json(res,200,{ok:1})}
  if(p==='/api/orders'&&m==='GET')return json(res,200,orders.slice(-500).reverse());
  if(mo&&m==='PATCH'){const o=orders.find(x=>x.id===mo[1]),b=await jbody(req)||{};
    if(!o||(b.status&&!STATUS.includes(b.status))||(b.payStatus&&!PAYST.includes(b.payStatus))||(!b.status&&!b.payStatus))return json(res,400,{error:'Қате'});
    if(b.status)o.status=b.status;if(b.payStatus)o.payStatus=b.payStatus;
    write(ORD,orders);send('order-status',{id:o.id,num:o.num,status:o.status,payStatus:o.payStatus});return json(res,200,o)}
  if(mo&&m==='DELETE'){orders=orders.filter(x=>x.id!==mo[1]);write(ORD,orders);send('order-del',{id:mo[1]},true);return json(res,200,{ok:1})}
  if(p==='/api/site'&&m==='PUT'){const b=await jbody(req);
    if(!b||!Array.isArray(b.combos)||!Array.isArray(b.menu)||!Array.isArray(b.branches))return json(res,400,{error:'Деректер қате'});
    site=b;ver=Date.now();write(SITE,site);send('site',{t:Date.now()});return json(res,200,{ok:1})}
  if(p==='/api/upload'&&m==='POST'){
    const ext=(u.searchParams.get('ext')||'').toLowerCase();if(!['jpg','jpeg','png','webp'].includes(ext))return json(res,400,{error:'Тек jpg, png, webp'});
    let buf;try{buf=await body(req,5e6)}catch(e){return json(res,413,{error:'Сурет 5 МБ-тан үлкен'})}
    const name='u'+Date.now().toString(36)+crypto.randomBytes(3).toString('hex')+'.'+ext;
    fs.writeFileSync(path.join(PUB,'img',name),buf);return json(res,200,{url:'/img/'+name});
  }
  json(res,404,{error:'Жоқ'});
}
function events(req,res){
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store',Connection:'keep-alive','X-Accel-Buffering':'no'});
  res.write('retry: 3000\n\n');const c={res,admin:isAdmin(req)};clients.add(c);
  const hb=setInterval(()=>res.write(': ping\n\n'),25000);
  req.on('close',()=>{clearInterval(hb);clients.delete(c)});
}
http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://x');
    res.setHeader('X-Content-Type-Options','nosniff');
    if(u.pathname==='/events')return events(req,res);
    if(u.pathname.startsWith('/api/'))return await api(req,res,u);
    const PG={'/':'index.html','/menu':'menu.html','/cabinet':'cabinet.html','/admin':'admin.html','/index.html':'index.html','/menu.html':'menu.html','/cabinet.html':'cabinet.html','/admin.html':'admin.html'};
    const pn=u.pathname.length>1?u.pathname.replace(/\/+$/,''):u.pathname;
    if(PG[pn]){let h=fs.readFileSync(path.join(PUB,PG[pn]),'utf8');
      if(PG[pn]!=='admin.html')h=h.replace(/\{\{(\w+)\}\}/g,(m,n)=>{try{return fs.readFileSync(path.join(PUB,'_partials',n+'.html'),'utf8')}catch(e){return ''}});
      res.writeHead(200,{'Content-Type':MIME['.html'],'Cache-Control':'no-cache'});return res.end(h)}
    if(pn.startsWith('/_partials'))return json(res,404,{error:'Жоқ'});
    let f=decodeURIComponent(u.pathname);
    const fp=path.normalize(path.join(PUB,f));
    if(!fp.startsWith(PUB+path.sep)||!fs.existsSync(fp)||!fs.statSync(fp).isFile()){res.writeHead(404);return res.end('Not found')}
    const ext=path.extname(fp).toLowerCase();
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Cache-Control':ext==='.html'||ext==='.js'?'no-cache':'public,max-age=86400'});
    fs.createReadStream(fp).pipe(res);
  }catch(e){console.error(e);if(!res.headersSent)json(res,500,{error:'Сервер қатесі'});else res.end()}
}).listen(PORT,()=>{console.log('Сайт:  http://localhost:'+PORT+'\nАдмин: http://localhost:'+PORT+'/admin');console.log('SMS растау: '+(SMSP?SMSP:'өшірулі (SMS_PROVIDER көрсетілмеген)'));
  if(!process.env.ADMIN_PASSWORD)console.log('ЕСКЕРТУ: құпиясөз "admin123". Өзгерту: ADMIN_PASSWORD=өзіңіздің_құпиясөз node server.js')});
