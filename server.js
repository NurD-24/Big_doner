// Big Doner — сервер. Сыртқы кітапхана керек емес: тек Node.js 18+
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000, PASS=process.env.ADMIN_PASSWORD||'admin123';
const D=path.join(__dirname,'data'), PUB=path.join(__dirname,'public');
const SITE=path.join(D,'site.json'), ORD=path.join(D,'orders.json');
const MIME={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'};
const read=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return d}};
const write=(f,v)=>{fs.writeFileSync(f+'.tmp',JSON.stringify(v,null,1));fs.renameSync(f+'.tmp',f)};
let site=read(SITE,{}), orders=read(ORD,[]);
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
// Баға клиенттен емес, сервердегі мәзірден алынады
function priceMap(){const m={};(site.combos||[]).forEach(c=>{if(c.on!==false)m['c:'+c.id]={n:c.name,p:+c.price}});
  (site.menu||[]).forEach(s=>s.groups.forEach(g=>g.items.forEach(i=>{if(i.on!==false)m['m:'+i.name]={n:i.name,p:+i.price}})));return m}
async function api(req,res,u){
  const m=req.method,p=u.pathname;
  if(p==='/api/site'&&m==='GET')return json(res,200,site);
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
  if(p==='/api/orders'&&m==='POST'){
    if(limit('ord'+ip(req),6,60000))return json(res,429,{error:'Тым жиі. Азғана күте тұрыңыз'});
    const b=await jbody(req);if(!b||!Array.isArray(b.items))return json(res,400,{error:'Қате сұраныс'});
    const pm=priceMap(),items=[];let total=0;
    for(const it of b.items.slice(0,60)){const x=pm[it.k],q=Math.floor(+it.q);if(!x||!(q>0&&q<=99))continue;items.push({n:x.n,p:x.p,q});total+=x.p*q}
    if(!items.length)return json(res,400,{error:'Себет бос немесе тауар жоқ'});
    const phone=str(b.phone,20).replace(/[^\d+]/g,'');if(phone.replace(/\D/g,'').length<10)return json(res,400,{error:'Телефон нөмірін дұрыс жазыңыз'});
    const mode=b.mode==='p'?'p':'d',addr=str(b.addr,200).trim();if(mode==='d'&&!addr)return json(res,400,{error:'Мекенжайды жазыңыз'});
    const br=(site.branches||[])[+b.branch]||{};
    const o={id:crypto.randomBytes(6).toString('hex'),num:(orders.reduce((a,x)=>Math.max(a,x.num),0))+1,time:Date.now(),status:'new',name:str(b.name,60).trim(),phone,mode,addr,comment:str(b.comment,300).trim(),branch:br.name||'',items,total};
    orders.push(o);write(ORD,orders);send('order',o,true);return json(res,200,{id:o.id,num:o.num,status:o.status});
  }
  const mo=p.match(/^\/api\/orders\/([a-f0-9]+)$/);
  if(mo&&m==='GET'){const o=orders.find(x=>x.id===mo[1]);return o?json(res,200,{num:o.num,status:o.status}):json(res,404,{error:'Табылмады'})}
  // төмендегілер тек админге
  if(!isAdmin(req))return json(res,401,{error:'Кіру керек'});
  if(p==='/api/orders'&&m==='GET')return json(res,200,orders.slice(-500).reverse());
  if(mo&&m==='PATCH'){const o=orders.find(x=>x.id===mo[1]),b=await jbody(req)||{};
    if(!o||!STATUS.includes(b.status))return json(res,400,{error:'Қате'});
    o.status=b.status;write(ORD,orders);send('order-status',{id:o.id,num:o.num,status:o.status});return json(res,200,o)}
  if(mo&&m==='DELETE'){orders=orders.filter(x=>x.id!==mo[1]);write(ORD,orders);send('order-del',{id:mo[1]},true);return json(res,200,{ok:1})}
  if(p==='/api/site'&&m==='PUT'){const b=await jbody(req);
    if(!b||!Array.isArray(b.combos)||!Array.isArray(b.menu)||!Array.isArray(b.branches))return json(res,400,{error:'Деректер қате'});
    site=b;write(SITE,site);send('site',{t:Date.now()});return json(res,200,{ok:1})}
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
