const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
const money=n=>{try{return new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(Number(n||0));}catch(e){return String(n||0);}};

let company={name:"JoodKids", whatsapp:"", tagline:"Kids clothes"};
async function loadCompany(){
  try{ const snap=await db.collection("company").doc("profile").get(); if(snap.exists) company={...company, ...snap.data()}; }catch(e){}
  $("pCompany").textContent=company.name||"JoodKids";
  $("pCompanyTag").textContent=company.tagline||"Kids clothes";
}

const lb=$("lightbox"), lbImg=$("lbImg"), lbClose=$("lbClose");
let lbState={z:1,x:0,y:0,down:false,sx:0,sy:0};
function lbApply(){
  if(!lbImg) return;
  lbImg.style.setProperty("--z", String(lbState.z));
  lbImg.style.setProperty("--x", lbState.x+"px");
  lbImg.style.setProperty("--y", lbState.y+"px");
  lbImg.classList.toggle("zoomed", lbState.z>1.01);
}
function lbReset(){ lbState={z:1,x:0,y:0,down:false,sx:0,sy:0}; lbApply(); }
function openLightbox(url){
  if(!url || !lb || !lbImg) return;
  lbImg.src=url;
  lb.hidden=false; lb.removeAttribute("hidden"); lb.style.display="flex";
  document.documentElement.style.overflow="hidden"; document.body.style.overflow="hidden";
  lbReset();
  try{ if(!(history.state && history.state.__lb)) history.pushState({__lb:1},""); }catch(_){}
}
function hideLightboxOnly(){
  if(!lb) return;
  lb.hidden=true; lb.setAttribute("hidden",""); lb.style.display="none";
  document.documentElement.style.overflow=""; document.body.style.overflow="";
  if(lbImg) lbImg.src="";
  try{ lbReset?.(); }catch(_){}
}
function closeLightbox(){ 
  if(history.state && history.state.__lb){ try{ history.back(); return; }catch(_){ } }
  hideLightboxOnly();
}
function _lbCloseNow(e){ try{e.preventDefault();e.stopPropagation();}catch(_){}
  closeLightbox();
}
if(lbClose){
  lbClose.addEventListener("pointerdown", _lbCloseNow);
  lbClose.addEventListener("touchstart", _lbCloseNow, {passive:false});
  lbClose.addEventListener("touchend", _lbCloseNow, {passive:false});
  lbClose.addEventListener("click", _lbCloseNow, true);
}
if(lb){
  lb.addEventListener("pointerdown",(e)=>{ if(e.target===lb) _lbCloseNow(e); });
  lb.addEventListener("touchstart",(e)=>{ if(e.target===lb) _lbCloseNow(e); }, {passive:false});
}
window.addEventListener("popstate",()=>{ if(lb && !lb.hidden) hideLightboxOnly(); });

if(lbImg){
  lbImg.addEventListener("dblclick",()=>{
    lbState.z = (lbState.z>1.01)?1:2.2;
    if(lbState.z===1){ lbState.x=0; lbState.y=0; }
    lbApply();
  });
  const down=(e)=>{
    if(lbState.z<=1.01) return;
    lbState.down=true;
    const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
    lbState.sx=p.clientX - lbState.x;
    lbState.sy=p.clientY - lbState.y;
  };
  const move=(e)=>{
    if(!lbState.down) return;
    const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
    lbState.x=p.clientX - lbState.sx;
    lbState.y=p.clientY - lbState.sy;
    lbApply();
  };
  const up=()=>{ lbState.down=false; };
  lbImg.addEventListener("pointerdown",down);
  lbImg.addEventListener("pointermove",move);
  lbImg.addEventListener("pointerup",up);
  lbImg.addEventListener("pointercancel",up);
  lbImg.addEventListener("touchstart",down,{passive:false});
  lbImg.addEventListener("touchmove",move,{passive:false});
  lbImg.addEventListener("touchend",up);
}

async function resolveImageUrl(u){
  const s=String(u||"").trim();
  if(!s) return "";
  if(/^https?:\/\//i.test(s)) return s;
  // try Firebase Storage if path/gs://
  try{
    if(window.storage && (s.startsWith("gs://") || s.includes("/"))){
      const ref=storage.refFromURL(s.startsWith("gs://")?s:`gs://${firebaseConfig.storageBucket}/${s.replace(/^\//,"")}`);
      return await ref.getDownloadURL();
    }
  }catch(e){}
  return s;
}

const id=new URLSearchParams(location.search).get("id");
let product=null;
let qty=1;
const cartKey="jood_cart_v1";
function loadCart(){ try{return JSON.parse(localStorage.getItem(cartKey)||"{}");}catch(e){return {};} }
function saveCart(o){ localStorage.setItem(cartKey, JSON.stringify(o||{})); }
function addToCart(){
  if(!product) return;
  const cart=loadCart();
  const k=product.id;
  cart[k]=cart[k]||{id:product.id,name:product.name||"",price:Number(product.price||0),currency:product.currency||"EGB",qty:0,mainImageUrl:product.mainImageUrl||"",sizesText:product.sizesText||""};
  cart[k].qty += qty;
  saveCart(cart);
  alert("تمت الإضافة للسلة ✅");
}
function openCart(){ location.href="index.html#cart"; }

async function loadProduct(){
  if(!id){ $("pName").textContent="لم يتم تحديد منتج"; return; }
  await loadCompany();
  const snap=await db.collection("products").doc(id).get();
  if(!snap.exists){ $("pName").textContent="المنتج غير موجود"; return; }
  product={id:snap.id, ...snap.data()};
  document.title = `${product.name||"تفاصيل المنتج"} | JoodKids`;
  $("pName").textContent=product.name||"—";
  $("pMeta").textContent=`كود ${product.code||"—"} • تصنيف ${product.catKey||"—"}`;
  $("pDesc").textContent=product.desc||"—";
  $("pPrice").textContent=`${money(product.price)} ${product.currency||"EGB"}`;
  $("pCodeTag").textContent=`كود ${product.code||"—"}`;

  const main=await resolveImageUrl(product.mainImageUrl||"");
  const img=$("pImg");
  img.src=main;
  img.addEventListener("click",()=>openLightbox(main));

  const gallery=$("pGallery");
  gallery.innerHTML="";
  const extra=(product.images||[]).filter(Boolean);
  const list=[main, ...extra];
  const uniq=[...new Set(list)];
  uniq.slice(0,8).forEach(async (u)=>{
    const url=await resolveImageUrl(u);
    const b=document.createElement("button");
    b.type="button";
    b.className="btn";
    b.style.padding="6px";
    b.innerHTML=`<img src="${esc(url)}" alt="" style="width:54px;height:54px;object-fit:contain;border-radius:10px;background:#f7f7f7"/>`;
    b.addEventListener("click",()=>{ img.src=url; img.onclick=()=>openLightbox(url); });
    gallery.appendChild(b);
  });

  // WhatsApp order
  const waBtn=$("waOrderBtn");
  if(company.whatsapp){
    waBtn.style.display="inline-flex";
    const msg = encodeURIComponent(`أريد طلب المنتج: ${product.name||""} (كود ${product.code||""})\nالكمية: ${qty}\nالرابط: ${location.href}`);
    waBtn.href=`https://wa.me/${company.whatsapp}?text=${msg}`;
  }
}
$("decQty").addEventListener("click",()=>{ qty=Math.max(1,qty-1); $("qtyNum").textContent=String(qty); });
$("incQty").addEventListener("click",()=>{ qty=qty+1; $("qtyNum").textContent=String(qty); });
$("addToCartBtn").addEventListener("click",addToCart);
$("openCartBtn").addEventListener("click",openCart);
$("shareBtn").addEventListener("click",async ()=>{
  try{
    await navigator.share({title: document.title, url: location.href});
  }catch(e){
    try{ await navigator.clipboard.writeText(location.href); alert("تم نسخ رابط المنتج ✅"); }catch(_){ alert(location.href); }
  }
});
loadProduct();
