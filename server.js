// Big Doner — сервер. Сыртқы кітапхана керек емес: тек Node.js 18+
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000, PASS=process.env.ADMIN_PASSWORD||'admin123';
const D=path.join(__dirname,'data'), PUB=path.join(__dirname,'public');
const SITE=path.join(D,'site.json'), ORD=path.join(D,'orders.json'), USR=path.join(D,'users.json');
const MIME={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const read=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return d}};
const write=(f,v)=>{fs.writeFileSync(f+'.tmp',JSON.stringify(v,null,1));fs.renameSync(f+'.tmp',f)};
let site=read(SITE,{}), orders=read(ORD,[]), users=read(USR,[]), ver=Date.now();
const STATUS=['new','accepted','cooking','delivering','done','cancelled'];
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
// Баға клиенттен емес, сервердегі мәзірден алынады
function priceMap(){const m={};(site.combos||[]).forEach(c=>{if(c.on!==false)m['c:'+c.id]={n:c.name,p:+c.price}});
  (site.menu||[]).forEach(s=>s.groups.forEach(g=>g.items.forEach(i=>{if(i.on!==false)m['m:'+i.name]={n:i.name,p:+i.price}})));return m}
async function api(req,res,u){
  const m=req.method,p=u.pathname;
  if(p==='/api/site'&&m==='GET')return json(res,200,site);
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
  if(p==='/api/register'&&m==='POST'){
    if(limit('reg'+ip(req),6,600000))return json(res,429,{error:'Тым көп әрекет. Кейінірек қайталаңыз'});
    const b=await jbody(req)||{},name=str(b.name,60).trim(),phone=normPhone(b.phone),pw=str(b.password,100);
    if(name.length<2)return json(res,400,{error:'Атыңызды жазыңыз'});
    if(!phone)return json(res,400,{error:'Телефон нөмірін дұрыс жазыңыз (+7 7XX XXX XX XX)'});
    if(pw.length<6)return json(res,400,{error:'Құпиясөз кемінде 6 таңба болсын'});
    if(!b.consent)return json(res,400,{error:'Дербес деректерді өңдеуге келісім қажет'});
    if(users.some(x=>x.phone===phone))return json(res,409,{error:'Бұл нөмір тіркелген. "Кіру" бөліміне өтіңіз'});
    const usr={id:crypto.randomBytes(6).toString('hex'),name,phone,hash:hashPw(pw),created:Date.now(),last:Date.now()};
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
    return json(res,200,{user:pubU(usr),orders:orders.filter(o=>o.uid===usr.id).slice(-15).reverse().map(o=>({num:o.num,time:o.time,status:o.status,total:o.total}))})}
  if(p==='/api/orders'&&m==='POST'){
    if(limit('ord'+ip(req),6,60000))return json(res,429,{error:'Тым жиі. Азғана күте тұрыңыз'});
    const b=await jbody(req);if(!b||!Array.isArray(b.items))return json(res,400,{error:'Қате сұраныс'});
    const usr=curUser(req);if(site.requireLogin&&!usr)return json(res,401,{error:'Тапсырыс беру үшін кіріңіз немесе тіркеліңіз'});
    const pm=priceMap(),items=[];let total=0;
    for(const it of b.items.slice(0,60)){const x=pm[it.k],q=Math.floor(+it.q);if(!x||!(q>0&&q<=99))continue;items.push({n:x.n,p:x.p,q});total+=x.p*q}
    if(!items.length)return json(res,400,{error:'Себет бос немесе тауар жоқ'});
    const phone=str(b.phone,20).replace(/[^\d+]/g,'');if(phone.replace(/\D/g,'').length<10)return json(res,400,{error:'Телефон нөмірін дұрыс жазыңыз'});
    const mode=b.mode==='p'?'p':'d',addr=str(b.addr,200).trim();if(mode==='d'&&!addr)return json(res,400,{error:'Мекенжайды жазыңыз'});
    const br=(site.branches||[])[+b.branch]||{};
    const o={id:crypto.randomBytes(6).toString('hex'),num:(orders.reduce((a,x)=>Math.max(a,x.num),0))+1,time:Date.now(),status:'new',uid:usr?usr.id:'',name:str(b.name,60).trim(),phone,mode,addr,comment:str(b.comment,300).trim(),branch:br.name||'',items,total};
    orders.push(o);write(ORD,orders);send('order',o,true);return json(res,200,{id:o.id,num:o.num,status:o.status});
  }
  const mo=p.match(/^\/api\/orders\/([a-f0-9]+)$/);
  if(mo&&m==='GET'){const o=orders.find(x=>x.id===mo[1]);return o?json(res,200,{num:o.num,status:o.status}):json(res,404,{error:'Табылмады'})}
  // төмендегілер тек админге
  if(!isAdmin(req))return json(res,401,{error:'Кіру керек'});
  if(p==='/api/users'&&m==='GET')return json(res,200,users.map(x=>{const mine=orders.filter(o=>o.uid===x.id&&o.status!=='cancelled');
    return{id:x.id,name:x.name,phone:x.phone,created:x.created,last:x.last,orders:mine.length,total:mine.reduce((a,o)=>a+o.total,0),lastOrder:mine.length?mine[mine.length-1].time:0}}).reverse());
  const mu=p.match(/^\/api\/users\/([a-f0-9]+)(\/password)?$/);
  if(mu&&m==='DELETE'){users=users.filter(x=>x.id!==mu[1]);write(USR,users);return json(res,200,{ok:1})}
  if(mu&&mu[2]&&m==='POST'){const b=await jbody(req)||{},x=users.find(y=>y.id===mu[1]),pw=str(b.password,100);
    if(!x||pw.length<6)return json(res,400,{error:'Құпиясөз кемінде 6 таңба'});x.hash=hashPw(pw);write(USR,users);return json(res,200,{ok:1})}
  if(p==='/api/orders'&&m==='GET')return json(res,200,orders.slice(-500).reverse());
  if(mo&&m==='PATCH'){const o=orders.find(x=>x.id===mo[1]),b=await jbody(req)||{};
    if(!o||!STATUS.includes(b.status))return json(res,400,{error:'Қате'});
    o.status=b.status;write(ORD,orders);send('order-status',{id:o.id,num:o.num,status:o.status});return json(res,200,o)}
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
    let f=u.pathname==='/'?'/index.html':u.pathname==='/admin'?'/admin.html':decodeURIComponent(u.pathname);
    const fp=path.normalize(path.join(PUB,f));
    if(!fp.startsWith(PUB+path.sep)||!fs.existsSync(fp)||!fs.statSync(fp).isFile()){res.writeHead(404);return res.end('Not found')}
    const ext=path.extname(fp).toLowerCase();
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Cache-Control':ext==='.html'||ext==='.js'?'no-cache':'public,max-age=86400'});
    fs.createReadStream(fp).pipe(res);
  }catch(e){console.error(e);if(!res.headersSent)json(res,500,{error:'Сервер қатесі'});else res.end()}
}).listen(PORT,()=>{console.log('Сайт:  http://localhost:'+PORT+'\nАдмин: http://localhost:'+PORT+'/admin');
  if(!process.env.ADMIN_PASSWORD)console.log('ЕСКЕРТУ: құпиясөз "admin123". Өзгерту: ADMIN_PASSWORD=өзіңіздің_құпиясөз node server.js')});
