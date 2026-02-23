// Admin (Auth + Firestore + Storage)
function catKey(code){const n=Math.abs(Number(code||0)); const s=String(n); return (n>=1000)?s.slice(0,2):s.slice(0,1);}
function parseList(s){return (s||"").split(",").map(x=>x.trim()).filter(Boolean);}
function esc(str){return String(str||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}

const loginPanel=document.getElementById("loginPanel");
const companyPanel=document.getElementById("companyPanel");
const productsPanel=document.getElementById("productsPanel");
const email=document.getElementById("email");
const password=document.getElementById("password");

document.getElementById("loginBtn").onclick=()=>auth.signInWithEmailAndPassword(email.value.trim(), password.value.trim()).catch(e=>alert(e.message));
document.getElementById("logoutBtn").onclick=()=>auth.signOut();

auth.onAuthStateChanged(async (u)=>{
  const ok=!!u;
  loginPanel.style.display=ok?"none":"block";
  companyPanel.style.display=ok?"block":"none";
  productsPanel.style.display=ok?"block":"none";
  if(ok){ await loadCompany(); await loadProductsTable(); }
});

// Company
const cName=document.getElementById("cName");
const cPhone=document.getElementById("cPhone");
const cWhatsApp=document.getElementById("cWhatsApp");
const cTagline=document.getElementById("cTagline");
const cDelivery=document.getElementById("cDelivery");
const cMap=document.getElementById("cMap");
const cFb=document.getElementById("cFb");
const cIg=document.getElementById("cIg");
const cDesc=document.getElementById("cDesc");

async function loadCompany(){
  const snap=await db.collection("company").doc("profile").get();
  const d=snap.exists?snap.data():{};
  cName.value=d?.name||""; cPhone.value=d?.phone||""; cWhatsApp.value=d?.whatsapp||"";
  cTagline.value=d?.tagline||""; cDelivery.value=d?.delivery||""; cMap.value=d?.map||"";
  cFb.value=d?.fb||""; cIg.value=d?.ig||""; cDesc.value=d?.desc||"";
}

document.getElementById("saveCompanyBtn").onclick=async ()=>{
  await db.collection("company").doc("profile").set({
    name:cName.value.trim(),
    phone:cPhone.value.trim(),
    whatsapp:cWhatsApp.value.trim(),
    tagline:cTagline.value.trim(),
    delivery:cDelivery.value.trim(),
    map:cMap.value.trim(),
    fb:cFb.value.trim(),
    ig:cIg.value.trim(),
    tg:cTg.value.trim(),
    factoryMap:cFactoryMap.value.trim(),
    shopMap:cShopMap.value.trim(),
    desc:cDesc.value.trim()
  }, {merge:true});
  alert("تم حفظ بيانات الشركة ✅");
};

// Products
const pId=document.getElementById("pId");
const pCode=document.getElementById("pCode");
const pName=document.getElementById("pName");
const pPrice=document.getElementById("pPrice");
const pCurrency=document.getElementById("pCurrency");
const pTags=document.getElementById("pTags");
const pDesc=document.getElementById("pDesc");
const pSizes=document.getElementById("pSizes");
const pImages=document.getElementById("pImages");
const imageThumbs=document.getElementById("imageThumbs");
const productsTbody=document.getElementById("productsTbody");

let currentDocId=null;
let currentImages=[]; // [{url,path}]

function renderThumbs(){
  imageThumbs.innerHTML="";
  currentImages.forEach((img, idx)=>{
    const box=document.createElement("div");
    box.className="timg";
    box.title="اضغط للحذف";
    box.innerHTML=`<img src="${img.url}" alt="">`;
    box.onclick=async ()=>{
      if(!confirm("حذف الصورة؟")) return;
            currentImages.splice(idx,1);
      renderThumbs();
    };
    imageThumbs.appendChild(box);
  });
}

async function uploadSelected(docId){
  const file=(pImages.files && pImages.files[0]) ? pImages.files[0] : null;
  if(!file) return;

  if(!window.CLOUDINARY_CLOUD_NAME || !window.CLOUDINARY_UPLOAD_PRESET){
    alert("إعدادات Cloudinary غير موجودة. افتح ملف cloudinary-config.js وضع Cloud Name و Upload Preset");
    return;
  }

  // صورة واحدة فقط لكل منتج (استبدال القديمة)
  currentImages = [];
  renderThumbs();

  const url = `https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD_NAME}/image/upload`;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", window.CLOUDINARY_UPLOAD_PRESET);
  fd.append("folder", `products/${docId}`);
  fd.append("context", `alt=${encodeURIComponent(pName.value.trim()||"product")}`);

  try{
    const res = await fetch(url, { method: "POST", body: fd });
    const data = await res.json();
    if(!res.ok || !data.secure_url){
      console.error("Cloudinary upload failed", data);
      alert("فشل رفع الصورة إلى Cloudinary: " + (data?.error?.message || "Unknown error"));
      return;
    }
    currentImages.push({url: data.secure_url, path: ""});
    pImages.value="";
    renderThumbs();
  }catch(e){
    console.error(e);
    alert("خطأ أثناء رفع الصورة: " + (e?.message||e));
  }
}


function clearForm(){
  currentDocId=null;
  pId.value=""; pCode.value=""; pName.value=""; pPrice.value="";
  pCurrency.value="EGB"; pTags.value=""; pDesc.value=""; pSizes.value="";
  currentImages=[]; renderThumbs();
}
document.getElementById("newBtn").onclick=clearForm;
document.getElementById("clearFormBtn").onclick=clearForm;
document.getElementById("refreshBtn").onclick=loadProductsTable;

document.getElementById("saveProductBtn").onclick=async ()=>{
  const code=Number(pCode.value||0);
  if(!code || !pName.value.trim()) return alert("أدخل الكود والاسم");
  const id = (pId.value.trim() || currentDocId || null);
  const docRef = id ? db.collection("products").doc(id) : db.collection("products").doc();
  currentDocId = docRef.id;
  pId.value=currentDocId;

  await uploadSelected(currentDocId);

  const data={
    code,
    catKey: catKey(code),
    name: pName.value.trim(),
    desc: pDesc.value.trim(),
    price: Number(pPrice.value||0),
    currency: (pCurrency.value.trim()||"EGB"),
    tags: parseList(pTags.value).map(x=>x.toLowerCase()),
    sizes: parseList(pSizes.value),
    images: currentImages,
    mainImageUrl: currentImages[0]?.url || "",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  await docRef.set(data,{merge:true});
  alert("تم حفظ المنتج ✅");
  await loadProductsTable();
};

document.getElementById("deleteProductBtn").onclick=async ()=>{
  const id=(pId.value.trim()||currentDocId);
  if(!id) return alert("اختر منتج");
  if(!confirm("حذف المنتج بالكامل؟")) return;

  // ملاحظة: لا نحذف الصور من Cloudinary من الواجهة (يتطلب صلاحيات/سيرفر). يمكن حذفها من لوحة Cloudinary عند الحاجة.
  await db.collection("products").doc(id).delete();
  alert("تم الحذف ✅");
  clearForm();
  await loadProductsTable();
};

async function loadProductsTable(){
  let snap;
  try{ snap=await db.collection("products").orderBy("updatedAt","desc").get(); }
  catch(e){ snap=await db.collection("products").get(); }

  const rows=snap.docs.map(d=>({id:d.id, ...d.data()}));
  productsTbody.innerHTML="";
  rows.forEach(p=>{
    const img = p.mainImageUrl || (p.images?.[0]?.url) || "";
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${img?`<div class="timg"><img src="${img}" alt=""></div>`:"—"}</td>
      <td>${p.code||""}</td>
      <td>${esc(p.name||"")}</td>
      <td>${p.catKey?`تصنيف ${p.catKey}`:""}</td>
      <td>${p.price||0} ${esc(p.currency||"")}</td>
      <td>${(p.tags||[]).join(", ")}</td>
      <td><button class="btn" data-edit="${p.id}">تعديل</button></td>
    `;
    tr.querySelector("[data-edit]").onclick=()=>loadIntoForm(p.id);
    productsTbody.appendChild(tr);
  });
}

async function loadIntoForm(id){
  const snap=await db.collection("products").doc(id).get();
  if(!snap.exists) return;
  const p=snap.data();
  currentDocId=id;
  pId.value=id;
  pCode.value=p.code||"";
  pName.value=p.name||"";
  pPrice.value=p.price||"";
  pCurrency.value=p.currency||"EGB";
  pTags.value=(p.tags||[]).join(", ");
  pDesc.value=p.desc||"";
  pSizes.value=(p.sizes||[]).join(", ");
  currentImages=Array.isArray(p.images)?p.images:[];
  renderThumbs();
  window.scrollTo({top:0, behavior:"smooth"});
}

// ===== Export (Excel / CSV) =====
async function fetchAllProducts(){
  const snap = await db.collection("products").get();
  return snap.docs.map(d=>({id:d.id, ...d.data()}));
}
function toRow(p){
  const imgs = (p.images||[]).map(x=>typeof x==="string"?x:(x.url||"")).filter(Boolean).join("|");
  return {
    code: p.code||"",
    name: p.name||"",
    price: p.price||0,
    currency: p.currency||"EGB",
    sizes: (p.sizes||[]).join(","),
    tags: (p.tags||[]).join(","),
    desc: p.desc||"",
    images: imgs
  };
}
function csvCell(s){
  if(/[",\n]/.test(s)) return '"' + s.replaceAll('"','""') + '"';
  return s;
}
function downloadBlob(blob, filename){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();}, 500);
}
async function exportCSV(){
  const rows = (await fetchAllProducts()).map(toRow);
  const head = ["code","name","price","currency","sizes","tags","desc","images"];
  const lines = [head.join(",")].concat(rows.map(r=>head.map(k=>csvCell(String(r[k]??""))).join(",")));
  downloadBlob(new Blob([lines.join("\n")], {type:"text/csv;charset=utf-8"}), "products.csv");
}
async function exportXLSX(){
  const rows = (await fetchAllProducts()).map(toRow);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "products");
  const wbout = XLSX.write(wb, {bookType:"xlsx", type:"array"});
  downloadBlob(new Blob([wbout], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}), "products.xlsx");
}
const exportXlsxBtn = document.getElementById("exportXlsxBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
if(exportXlsxBtn) exportXlsxBtn.onclick = ()=>exportXLSX().catch(e=>alert(e.message||e));
if(exportCsvBtn) exportCsvBtn.onclick = ()=>exportCSV().catch(e=>alert(e.message||e));
