// JoodKids Store (Firestore + Storage URLs)
// Currency: EGB
// NOTE: don't set __JK_APP_STARTED until init() successfully binds UI.
try{ window.__JK_APP_STARTED = false; }catch(e){}
let all=[], view=[];
let activeCat="الكل", quick="all", searchText="", sortMode="reco";
let cart = load("jk_cart", {});
// migrate old cart keys with size
try{
  const migrated={};
  Object.entries(cart||{}).forEach(([k,v])=>{
    const id = String(k).split("|")[0];
    if(!migrated[id]) migrated[id]=v;
    else migrated[id].qty = (migrated[id].qty||0) + (v.qty||0);
    migrated[id].id = id;
  });
  cart=migrated;
  save("jk_cart",cart);
}catch(e){}

let company = {name:"JoodKids", phone:"", whatsapp:"", tagline:"Kids clothes", desc:"", delivery:"", map:"", fb:"", ig:""};

// Loading state (skeletons)
let isLoading = true;

// ===== Image URL resolver (يدعم روابط Cloudinary و Firebase Storage paths/gs://) =====
const _imgCache = new Map();
function _isHttp(u){ return /^https?:\/\//i.test(String(u||"")); }
function _needsResolve(u){
  const s=String(u||"").trim();
  if(!s) return false;
  if(_isHttp(s)) return false;
  // gs://... أو path داخل الـ bucket مثل products/...
  return true;
}
async function resolveImageUrl(u){
  const key=String(u||"").trim();
  if(!key) return "";
  if(_isHttp(key)) return key;
  if(_imgCache.has(key)) return _imgCache.get(key);
  try{
    if(!storage) { _imgCache.set(key, key); return key; }
    const ref = key.startsWith("gs://") ? storage.refFromURL(key) : storage.ref(key);
    const url = await ref.getDownloadURL();
    _imgCache.set(key, url);
    return url;
  }catch(e){
    _imgCache.set(key, "");
    return "";
  }
}
function attachImgFallback(imgEl){
  if(!imgEl) return;
  imgEl.addEventListener("error",()=>{
    imgEl.style.opacity="0";
    imgEl.closest?.(".thumb")?.classList.add("noimg");
  }, {once:true});
}

const $=(id)=>document.getElementById(id);
const categoryList=$("categoryList"), categoryListMobile=$("categoryListMobile");
const grid=$("grid"), emptyState=$("emptyState"), resultCount=$("resultCount");
const crumbCat=$("crumbCat");
const sortSelect=$("sortSelect"), sortSelectMobile=$("sortSelectMobile");
const searchInput=$("searchInput"), clearSearch=$("clearSearch");
const openFilters=$("openFilters"), filtersDrawer=$("filtersDrawer"), filtersBg=$("filtersBg"), closeFilters=$("closeFilters");
const openCart=$("openCart"), cartDrawer=$("cartDrawer"), cartBg=$("cartBg"), closeCart=$("closeCart");
const cartItems=$("cartItems"), cartTotal=$("cartTotal"), cartCount=$("cartCount"), note=$("note");
const waOrderBtn=$("waOrder"), clearCartBtn=$("clearCart");
const checkoutModal=$("checkoutModal"), checkoutBg=$("checkoutBg"), closeCheckout=$("closeCheckout");
const cName=$("cName"), cPhone=$("cPhone"), cCity=$("cCity"), cAddress=$("cAddress");
const shipCompany=$("shipCompany"), payMethod=$("payMethod");
const sendWABtn=$("sendWA"), backToCartBtn=$("backToCart");
const mobileCartBtn=document.getElementById("mobileCartBtn");
const mobileCartBar=document.getElementById("mobileCartBar");
const mobileCartCount=document.getElementById("mobileCartCount");
const mobileCartTotal=document.getElementById("mobileCartTotal");

// Product page navigation (بدل نافذة)
function goProduct(id){
  if(!id) return;
  location.href = `product.html?id=${encodeURIComponent(id)}`;
}

// (قديمة) عناصر نافذة المنتج – تُركت موجودة للتوافق إن لزم
const productModal=$("productModal"), productBg=$("productBg"), closeProduct=$("closeProduct");
const mName=$("mName"), mMeta=$("mMeta"), mImg=$("mImg"), mGallery=$("mGallery"), mTags=$("mTags"), mDesc=$("mDesc");
const sizeGrid=$("sizeGrid"), mPrice=$("mPrice"), decQty=$("decQty"), incQty=$("incQty"), qtyNum=$("qtyNum"), addToCartBtn=$("addToCartBtn");
let activeProduct=null, qty=1;

// Boot with a guard so a runtime error doesn't freeze everything silently.
try{
  init();
}catch(err){
  console.error('JK: init crashed', err);
  try{
    const b=document.createElement('div');
    b.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;background:#111;color:#fff;border-radius:14px;padding:12px 14px;font-family:system-ui,"Cairo",sans-serif;direction:rtl;box-shadow:0 18px 50px rgba(0,0,0,.35)';
    b.textContent='حدث خطأ في تشغيل الصفحة. افتح Console لمعرفة السبب، أو أعد تحديث الصفحة.';
    document.body.appendChild(b);
  }catch(e){}
}

async function init(){
  $("year").textContent=new Date().getFullYear();
  bindUI();
  await loadCompany();
  showSkeleton();
  await loadProducts();
  if(mobileCartBar){
    const mq=window.matchMedia("(max-width: 980px)");
    const set=()=>mobileCartBar.style.display = mq.matches ? "block" : "none";
    set();
    try{ mq.addEventListener("change", set); }catch(e){}
  }
  buildCategories();
  applyFilters(); render(); updateCartUI();
  // افتح السلة عند الرجوع من صفحة المنتج
  try{ const qs=new URLSearchParams(location.search); if(qs.get('cart')==='1') setCart(true); }catch(e){}

  // mark app started only when we reached here
  try{ window.__JK_APP_STARTED = true; }catch(e){}
}

function showSkeleton(){
  if(!grid) return;
  grid.innerHTML = Array.from({length:9}).map(()=>'<div class="skeleton"></div>').join('');
}

function bindUI(){
  if(searchInput) searchInput.addEventListener("input",(e)=>{searchText=(e.target.value||"").trim(); applyFilters(); render();});
  if(clearSearch && searchInput) clearSearch.addEventListener("click",()=>{searchText=""; searchInput.value=""; applyFilters(); render(); searchInput.focus();});
  if(sortSelect) sortSelect.addEventListener("change",(e)=>{sortMode=e.target.value; if(sortSelectMobile) sortSelectMobile.value=sortMode; applyFilters(); render();});
  if(sortSelectMobile) sortSelectMobile.addEventListener("change",(e)=>{sortMode=e.target.value; if(sortSelect) sortSelect.value=sortMode; applyFilters(); render();});

  document.querySelectorAll("[data-tag]").forEach(btn=>btn.addEventListener("click",()=>setQuick(btn.dataset.tag||"all")));

  if(openFilters) openFilters.addEventListener("click",()=>setFilters(true));
  if(closeFilters) closeFilters.addEventListener("click",()=>setFilters(false));
  if(filtersBg) filtersBg.addEventListener("click",()=>setFilters(false));

  if(openCart) openCart.addEventListener("click",()=>setCart(true));
  if(mobileCartBtn){ mobileCartBtn.addEventListener("click", ()=>setCart(true)); }
  if(closeCart) closeCart.addEventListener("click",()=>setCart(false));
  if(cartBg) cartBg.addEventListener("click",()=>setCart(false));

  if(clearCartBtn) clearCartBtn.addEventListener("click",()=>{cart={}; save("jk_cart",cart); updateCartUI();});
  if(waOrderBtn) waOrderBtn.addEventListener("click",()=>{
    if(Object.keys(cart).length===0){alert("السلة فاضية."); return;}
    setCart(false);
    setCheckout(true);
  });

  
  if(checkoutBg) checkoutBg.addEventListener("click",()=>setCheckout(false));
  if(closeCheckout) closeCheckout.addEventListener("click",()=>setCheckout(false));
  if(backToCartBtn) backToCartBtn.addEventListener("click",()=>{setCheckout(false); setCart(true);});

  // shipCompany أصبح حقل كتابة يدوي

  if(sendWABtn) sendWABtn.addEventListener("click",()=>{
    if(Object.keys(cart).length===0){alert("السلة فاضية."); setCheckout(false); return;}
    const name=(cName.value||"").trim();
    const phone=(cPhone.value||"").trim();
    const city=(cCity.value||"").trim();
    const addr=(cAddress.value||"").trim();
    const pay=(payMethod.value||"").trim();
    const ship=(shipCompany.value||"").trim();
    if(!name || !phone){ alert("اكتب الاسم ورقم الموبايل."); return; }
    if(!addr){ alert("اكتب العنوان."); return; }
    // Save last checkout
    save("jk_checkout",{name, phone, city, address:addr, pay, shipCompany:ship});
    const msg=buildWA({name, phone, city, addr, pay, ship});
    if(!company.whatsapp){alert("ضع رقم واتساب من لوحة الإدارة."); return;}
    window.open(`https://wa.me/${company.whatsapp}?text=${encodeURIComponent(msg)}`,"_blank");
  });

  // نافذة المنتج (لو بقيت مستخدمة)
  if(productBg) productBg.addEventListener("click",()=>setProduct(false));
  if(closeProduct) closeProduct.addEventListener("click",()=>setProduct(false));
  if(decQty) decQty.addEventListener("click",()=>setQty(qty-1));
  if(incQty) incQty.addEventListener("click",()=>setQty(qty+1));
  if(addToCartBtn) addToCartBtn.addEventListener("click",()=>{ if(!activeProduct){return;} addToCart(activeProduct, qty); setProduct(false); });

  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape"){setFilters(false);setCart(false); setProduct(false); setCheckout(false);} });
}

async function loadCompany(){
  try{
    const snap=await db.collection("company").doc("profile").get();
    if(snap.exists) company={...company, ...snap.data()};
  }catch(e){}

  $("companyName").textContent=company.name||"JoodKids";
  $("companyCopy").textContent=company.name||"JoodKids";
  $("companyTag").textContent=company.tagline||"Kids clothes";
  $("companyDesc").textContent=company.desc||"—";
  $("companyDelivery").textContent=company.delivery?`🚚 ${company.delivery}`:"🚚 —";
  $("companyPhone").textContent=company.phone?`☎ ${company.phone}`:"☎ —";
  $("footerCompany").textContent=`${company.name||"JoodKids"} • ${company.phone||""}`.trim();

  const setLink=(id,url)=>{const a=$(id); if(url){a.href=url; a.style.opacity="1";} else {a.href="#"; a.style.opacity=".6";}};
  setLink("fbLink",company.fb); setLink("igLink",company.ig); setLink("tgLink",company.tg);
  setLink("factoryMapLink",company.factoryMap); setLink("shopMapLink",company.shopMap);

  // Floating WhatsApp button
  const wa=document.getElementById("waFloat");
  if(wa){
    if(company.whatsapp){ wa.href=`https://wa.me/${company.whatsapp}`; wa.style.display="block"; }
    else { wa.style.display="none"; }
  }
}

function computeCatKey(code){
  const n=Math.abs(Number(code||0));
  const s=String(n);
  return (n>=1000)?s.slice(0,2):s.slice(0,1);
}

async function loadProducts(){
  // Realtime listener حتى تظهر الأصناف فورًا للمشاهد
  return new Promise((resolve) => {
    let first = true;
    db.collection("products").onSnapshot((snap)=>{
      isLoading = false;
      all=snap.docs.map(d=>({id:d.id, ...d.data()}));
      all.forEach(p=>{
        p.code=Number(p.code||0);
        p.catKey=p.catKey||computeCatKey(p.code);
        p.currency=p.currency||"EGB";
        p.price=Number(p.price||0);
        p.tags=Array.isArray(p.tags)?p.tags:[];
        p.sizes=Array.isArray(p.sizes)?p.sizes:[];
        p.images=Array.isArray(p.images)?p.images:[];
        // images can be [{url,path}] or urls
        const rawUrls=p.images.map(x=>typeof x==="string"?x:(x?.url||""))
          .map(x=>String(x||"").trim())
          .filter(Boolean);
        // اعرض الموجود فورًا (لو http) ثم حلّ روابط التخزين/gs:// في الخلفية
        const firstHttp = rawUrls.find(u=>_isHttp(u)) || "";
        p.mainImageUrl = _isHttp(p.mainImageUrl) ? p.mainImageUrl : (p.mainImageUrl||firstHttp||rawUrls[0]||"");
        p._urls = rawUrls;

        // resolve non-http urls (Firebase Storage paths)
        if(p._urls.some(_needsResolve) || _needsResolve(p.mainImageUrl)){
          (async()=>{
            const resolved = await Promise.all(p._urls.map(u=>_needsResolve(u)?resolveImageUrl(u):u));
            const main = _needsResolve(p.mainImageUrl) ? await resolveImageUrl(p.mainImageUrl) : p.mainImageUrl;
            p._urls = resolved.filter(Boolean);
            p.mainImageUrl = main || p._urls[0] || "";
            render();
          })();
        }
      });
      buildCategories();
      applyFilters();
      render();
      if(first){ first=false; resolve(); }
    }, (err)=>{
      console.error("Products snapshot error", err);
      // fallback: try once
      db.collection("products").get().then((snap)=>{
        isLoading = false;
        all=snap.docs.map(d=>({id:d.id, ...d.data()}));
        buildCategories(); applyFilters(); render();
        if(first){ first=false; resolve(); }
      }).catch(()=>{ if(first){ first=false; resolve(); }});
    });
  });
}


function buildCategories(){
  const keys=Array.from(new Set(all.map(p=>p.catKey))).sort((a,b)=>Number(a)-Number(b));
  const list=["الكل", ...keys.map(k=>`تصنيف ${k}`)];
  const build=(wrap)=>{
    wrap.innerHTML="";
    list.forEach(label=>{
      const key=(label==="الكل")?"الكل":label.split(" ").pop();
      const btn=document.createElement("button");
      btn.type="button";
      btn.className="sideItem"+((activeCat===key)?" active":"");
      btn.innerHTML=`<span>${label}</span><span class="muted small">›</span>`;
      btn.addEventListener("click",()=>{
        activeCat=key;
        crumbCat.textContent=(key==="الكل")?"كل المنتجات":`تصنيف ${key}`;
        applyFilters(); render(); setFilters(false);
        categoryList.querySelectorAll(".sideItem").forEach(x=>x.classList.remove("active"));
        categoryListMobile.querySelectorAll(".sideItem").forEach(x=>x.classList.remove("active"));
        btn.classList.add("active");
      });
      wrap.appendChild(btn);
    });
  };
  build(categoryList); build(categoryListMobile);
}

function setQuick(tag){
  quick=tag;
  document.querySelectorAll("[data-tag]").forEach(b=>b.classList.toggle("active", b.dataset.tag===quick));
  applyFilters(); render();
}

function applyFilters(){
  const s=searchText.toLowerCase();
  view=all.filter(p=>{
    const catOk=(activeCat==="الكل")?true:p.catKey===activeCat;
    const searchOk=!s?true:(String(p.code).includes(s)||(p.name||"").toLowerCase().includes(s)||(p.desc||"").toLowerCase().includes(s));
    const tagOk=(quick==="all")?true:(p.tags||[]).includes(quick);
    return catOk && searchOk && tagOk;
  });

  if(sortMode==="price_asc") view.sort((a,b)=>a.price-b.price);
  if(sortMode==="price_desc") view.sort((a,b)=>b.price-a.price);
  if(sortMode==="name") view.sort((a,b)=>(a.name||"").localeCompare(b.name||"","ar"));
  if(sortMode==="code") view.sort((a,b)=>a.code-b.code);
}

function render(){
  if(isLoading && (!all || all.length===0)){
    resultCount.textContent=`—`;
    emptyState.hidden=true;
    showSkeleton();
    return;
  }

  resultCount.textContent=`${view.length} منتج`;
  grid.innerHTML="";
  if(view.length===0){ emptyState.hidden=false; return; }
  emptyState.hidden=true;

  view.forEach(p=>{
    const card=document.createElement("article");
    card.className="card";
    card.innerHTML = `
      <div class="thumb">
        <img loading="lazy" class="zoomable" src="${esc(p.mainImageUrl||"")}" alt="${esc(p.name||"")}">
        <div class="tag">كود ${esc(p.code)}</div>
      </div>
      <div class="cardBody">
        <div class="titleRow">
          <h3 class="pName">${esc(p.name||"")}</h3>
          <div class="price">${money(p.price)} ${esc(p.currency)}</div>
        </div>
        <div class="pDesc">${esc(p.desc||"")}</div>
        <div class="cardActions">
          <button class="addBtn" type="button">تفاصيل المنتج</button>
          <span class="bSmall">${badgeText(p.tags||[])}</span>
        </div>
      </div>
    `;
    const img=card.querySelector("img.zoomable");
    if(img){ img.addEventListener("click",(e)=>{e.stopPropagation(); openLightbox(img.src);}); }

    card.querySelector(".addBtn").addEventListener("click",(e)=>{e.stopPropagation(); goProduct(p.id);});
    card.addEventListener("click",()=>goProduct(p.id));
    attachImgFallback(card.querySelector("img"));
    grid.appendChild(card);
  });
}

function badgeText(tags){
  if(tags.includes("offer")) return "عرض";
  if(tags.includes("new")) return "جديد";
  if(tags.includes("popular")) return "الأكثر";
  return "—";
}

function openProduct(id){
  const p=all.find(x=>x.id===id); if(!p) return;
  activeProduct=p; qty=1; qtyNum.textContent="1";

  mName.textContent=p.name||"";
  mMeta.textContent=`كود ${p.code} • تصنيف ${p.catKey}`;
  mDesc.textContent=p.desc||"";
  mPrice.textContent=`${money(p.price)} ${p.currency}`;

  mTags.innerHTML="";
  (p.tags||[]).forEach(t=>{
    const s=document.createElement("span");
    s.className="tagP";
    s.textContent=(t==="offer")?"عرض":(t==="new")?"جديد":(t==="popular")?"الأكثر":t;
    mTags.appendChild(s);
  });

  const urls = p._urls?.length ? p._urls : (p.mainImageUrl?[p.mainImageUrl]:[]);
  mImg.src = urls[0]||"";
  attachImgFallback(mImg);
  mImg.style.cursor="zoom-in";
  mImg.addEventListener("click",()=>openLightbox(mImg.src));
  mGallery.innerHTML="";
  urls.slice(0,10).forEach(url=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="gThumb";
    b.innerHTML=`<img loading="lazy" src="${esc(url)}" alt="">`;
    b.addEventListener("click",()=>{mImg.src=url;});
    attachImgFallback(b.querySelector("img"));
    mGallery.appendChild(b);
  });

  sizeGrid.innerHTML="";
  const sizes = (p.sizes||[]).length ? p.sizes : ["6","12","18"];
  sizes.forEach((sz)=>{
    const chip=document.createElement("div");
    chip.className="optBtn";
    chip.style.opacity="0.9";
    chip.style.cursor="default";
    chip.textContent=sz;
    sizeGrid.appendChild(chip);
  });
setProduct(true);
}

function setQty(n){
  qty=Math.max(1,Math.min(99,Number(n)||1));
  qtyNum.textContent=String(qty);
}
function setFilters(open){
  filtersDrawer.classList.toggle("open",!!open);
  filtersDrawer.setAttribute("aria-hidden", open?"false":"true");
}
function setCart(open){
  cartDrawer.classList.toggle("open",!!open);
  cartDrawer.setAttribute("aria-hidden", open?"false":"true");
  if(open) renderCart();
}
function setProduct(open){
  productModal.classList.toggle("open",!!open);
  productModal.setAttribute("aria-hidden", open?"false":"true");
}


function setCheckout(open){
  checkoutModal.classList.toggle("open",!!open);
  checkoutModal.setAttribute("aria-hidden", open?"false":"true");
  if(open){
    // load last values
    const last = load("jk_checkout", {});
    cName.value = last.name || "";
    cPhone.value = last.phone || "";
    cCity.value = last.city || "";
    cAddress.value = last.address || "";
    payMethod.value = last.pay || payMethod.value;
    shipCompany.value = last.shipCompany || shipCompany.value;
  }
}
function addToCart(p,q){
  const key=`${p.id}`;
  const sizesText = (p.sizes||[]).join(", ");
  if(!cart[key]) cart[key]={id:p.id, code:p.code, name:p.name, qty:0, price:p.price, currency:p.currency, image:p.mainImageUrl, sizesText};
  cart[key].qty += q;
  if(cart[key].qty<=0) delete cart[key];
  save("jk_cart",cart);
  updateCartUI();
}

function renderCart(){
  const items=Object.values(cart);
  if(items.length===0){
    cartItems.innerHTML=`<div class="sideCard"><div style="font-weight:1000">السلة فاضية</div><div class="muted">أضف منتجات.</div></div>`;
    return;
  }
  cartItems.innerHTML="";
  items.forEach(it=>{
    const row=document.createElement("div");
    row.className="cItem";
    row.innerHTML=`
      <div class="cImg"><img loading="lazy" class="zoomable" src="${esc(it.image||"")}" alt=""></div>
      <div class="cMain">
        <div class="cName">${esc(it.name)} <span class="muted small">(المقاسات المتاحة: ${esc(it.sizesText||"-")})</span></div>
        <div class="cMeta">
          <div class="qty">
            <button class="qBtn" data-dec>−</button>
            <span class="qNum">${it.qty}</span>
            <button class="qBtn" data-inc>+</button>
          </div>
          <button class="trash" data-del>حذف</button>
        </div>
      </div>
    `;
    const cimg=row.querySelector("img.zoomable");
    if(cimg){cimg.style.cursor="zoom-in"; cimg.addEventListener("click",()=>openLightbox(cimg.src));}
    attachImgFallback(row.querySelector("img"));
    row.querySelector("[data-dec]").addEventListener("click",()=>{it.qty-=1; if(it.qty<=0) delete cart[`${it.id}`]; else cart[`${it.id}`].qty=it.qty; save("jk_cart",cart); updateCartUI();});
    row.querySelector("[data-inc]").addEventListener("click",()=>{it.qty+=1; cart[`${it.id}`].qty=it.qty; save("jk_cart",cart); updateCartUI();});
    row.querySelector("[data-del]").addEventListener("click",()=>{delete cart[`${it.id}`]; save("jk_cart",cart); updateCartUI();});
    cartItems.appendChild(row);
  });
}

function updateCartUI(){
  const items=Object.values(cart);
  const _cnt=items.reduce((a,x)=>a+x.qty,0);
  cartCount.textContent=String(_cnt);
  if(mobileCartCount) mobileCartCount.textContent=String(_cnt);
  const total=items.reduce((a,x)=>a+x.qty*x.price,0);
  cartTotal.textContent=`${money(total)} EGB`;
  if(mobileCartTotal) mobileCartTotal.textContent=`${money(total)} EGB`;
  if(cartDrawer.classList.contains("open")) renderCart();
}

function buildWA(cust={}){
  const items=Object.values(cart);
  if(items.length===0) return "";
  const lines=[`طلب جديد من ${company.name||"JoodKids"} ✅`,"—"];
  if(cust && (cust.name||cust.phone||cust.addr||cust.ship||cust.pay)){
    if(cust.name) lines.push(`العميل: ${cust.name}`);
    if(cust.phone) lines.push(`الموبايل: ${cust.phone}`);
    if(cust.city) lines.push(`المدينة: ${cust.city}`);
    if(cust.addr) lines.push(`العنوان: ${cust.addr}`);
    if(cust.ship) lines.push(`شركة الشحن: ${cust.ship}`);
    if(cust.pay) lines.push(`طريقة الدفع: ${cust.pay}`);
    lines.push("—");
  }
  items.forEach(it=>lines.push(`• ${it.name} (كود ${it.code}) × ${it.qty} = ${money(it.qty*it.price)} ${it.currency}\n  المقاسات المتاحة: ${it.sizesText||"-"}`));
  lines.push("—");
  const total=items.reduce((a,x)=>a+x.qty*x.price,0);
  lines.push(`الإجمالي: ${money(total)} EGB`);
  const n=(note.value||"").trim();
  if(n){ lines.push("—"); lines.push(`ملاحظة: ${n}`); }
  lines.push("شكراً 🌟");
  return lines.join("\n");
}


// Lightbox (تكبير الصور)
const lb=$("lightbox"), lbImg=$("lbImg"), lbClose=$("lbClose");
let lbState={z:1,x:0,y:0,down:false,sx:0,sy:0};
// Track whether we pushed a history state for the *current* open.
// This avoids navigating away when closing the lightbox if an __lb state
// already existed (e.g. opening the lightbox multiple times).
let lbPushed=false;
let lbScrollY=0;
function lbApply(){
  if(!lbImg) return;
  lbImg.style.setProperty("--z", String(lbState.z));
  lbImg.style.setProperty("--x", lbState.x+"px");
  lbImg.style.setProperty("--y", lbState.y+"px");
  lbImg.classList.toggle("zoomed", lbState.z>1.01);
}
function lbReset(){ lbState={z:1,x:0,y:0,down:false,sx:0,sy:0}; lbApply(); }

function openLightbox(url){
  if(!url || !lbImg || !lb) return;
  lbImg.src=url;

  // show + animate
  lb.hidden=false;
  lb.removeAttribute("hidden");
  lb.style.display="flex";
  // force reflow then fade in
  lb.classList.remove("open");
  requestAnimationFrame(()=>lb.classList.add("open"));

  // lock scroll (prevents background scrolling + layout jump on mobile)
  try{
    lbScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = "fixed";
    document.body.style.top = (-lbScrollY) + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }catch(_){}
  document.documentElement.style.overflow="hidden";
  document.body.style.overflow="hidden";

  lbReset();

  // allow Android back button to close
  try{
    if(!(history.state && history.state.__lb)){
      history.pushState({__lb:1},"");
      lbPushed=true;
    }else{
      lbPushed=false;
    }
  }catch(_){ lbPushed=false; }
}

function closeLightbox(){
  if(!lb) return;

  // fade out first (then hide)
  lb.classList.remove("open");
  const hide = ()=>{
    // hide in the most compatible way
    lb.setAttribute("hidden","");
    lb.hidden=true;
    lb.style.display="none";
    if(lbImg) lbImg.src="";
    try{ lbReset?.(); }catch(_){}
  };
  setTimeout(hide, 190);

  // remove scroll lock and restore scroll position
  document.documentElement.style.overflow="";
  document.body.style.overflow="";
  try{
    const y = lbScrollY || 0;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, y);
  }catch(_){}

  // If we pushed history state for THIS open, go back safely.
  // Otherwise, don't touch history to avoid navigating away.
  try{
    if(lbPushed && history.state && history.state.__lb){
      lbPushed=false;
      history.back();
    }
  }catch(_){ lbPushed=false; }
}

// expose for inline handlers
window.__closeLightbox = closeLightbox;

if(lb){
  lb.addEventListener("click",(e)=>{ if(e.target===lb) closeLightbox(); });
}

// Swipe down to close (mobile-friendly) when not zoomed
if(lb){
  let _sw=null;
  const SWIPE_CLOSE_PX=90;
  lb.addEventListener("pointerdown",(e)=>{
    try{
      if(lb.hidden) return;
      if(e.pointerType==="mouse" && e.button!==0) return;
      if(lbState && lbState.z>1.01) return; // don't interfere while zoomed
      _sw={x:e.clientX,y:e.clientY};
    }catch(_){}
  });
  lb.addEventListener("pointermove",(e)=>{
    if(!_sw) return;
    const dx=e.clientX-_sw.x, dy=e.clientY-_sw.y;
    if(dy>SWIPE_CLOSE_PX && Math.abs(dx)<80){
      _sw=null;
      closeLightbox();
    }
  });
  const _swEnd=()=>{ _sw=null; };
  lb.addEventListener("pointerup", _swEnd);
  lb.addEventListener("pointercancel", _swEnd);
}
if(lbClose){ lbClose.addEventListener("click", closeLightbox);

// Robust close (mobile-friendly)
function _lbCloseNow(e){
  try{ e?.preventDefault?.(); e?.stopPropagation?.(); }catch(_){}
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
window.addEventListener("keydown",(e)=>{ if(e.key==="Escape" && lb && !lb.hidden) closeLightbox(); });
 }

// Zoom + pan (double tap/click to zoom)
if(lbImg){
  lbImg.addEventListener("dblclick",()=>{
    lbState.z = (lbState.z>1.01)?1:2.2;
    if(lbState.z===1){ lbState.x=0; lbState.y=0; }
    lbApply();
  });
  lbImg.addEventListener("mousedown",(e)=>{
    if(lbState.z<=1.01) return;
    lbState.down=true; lbState.sx=e.clientX-lbState.x; lbState.sy=e.clientY-lbState.y;
    lbApply();
  });
  window.addEventListener("mousemove",(e)=>{
    if(!lbState.down) return;
    lbState.x = e.clientX - lbState.sx;
    lbState.y = e.clientY - lbState.sy;
    lbApply();
  });
  window.addEventListener("mouseup",()=>{ lbState.down=false; });

  // Touch: single finger pan when zoomed
  let t0=null;
  lbImg.addEventListener("touchstart",(e)=>{
    if(e.touches.length===1 && lbState.z>1.01){
      const t=e.touches[0];
      t0={x:t.clientX,y:t.clientY,ox:lbState.x,oy:lbState.y};
    }
  }, {passive:true});
  lbImg.addEventListener("touchmove",(e)=>{
    if(!t0 || e.touches.length!==1) return;
    const t=e.touches[0];
    lbState.x = t0.ox + (t.clientX - t0.x);
    lbState.y = t0.oy + (t.clientY - t0.y);
    lbApply();
  }, {passive:true});
  lbImg.addEventListener("touchend",()=>{ t0=null; }, {passive:true});
}

function money(n){ try{return new Intl.NumberFormat("ar-EG",{maximumFractionDigits:0}).format(Number(n||0));}catch{return String(n||0);} }
function esc(s){ return String(s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function save(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function load(k,d){ try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d));}catch{return d;} }

// Close lightbox on back navigation
window.addEventListener("popstate",(e)=>{
  try{
    if(lb && !lb.hidden){
      // avoid infinite loop: just hide
      lb.setAttribute("hidden","");
      lb.hidden=true;
      lb.style.display="none";
      document.documentElement.style.overflow="";
      document.body.style.overflow="";
      if(lbImg) lbImg.src="";
      try{ lbReset?.(); }catch(_){}
      lbPushed=false;
    }
  }catch(_){}
});
