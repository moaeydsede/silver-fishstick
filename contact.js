const $=id=>document.getElementById(id);
let company={name:"JoodKids", phone:"", whatsapp:"", tagline:"Kids clothes", desc:"", map:"", fb:"", ig:"", tg:"", factoryMap:"", shopMap:""};
function setLink(a,url){ if(!a) return; if(url){a.href=url; a.style.opacity="1"; a.style.pointerEvents="auto";} else {a.href="#"; a.style.opacity=".5"; a.style.pointerEvents="none";}}
function toEmbed(url){
  if(!url) return "";
  try{
    // If already embed
    if(/google\.com\/maps\/embed/i.test(url)) return url;
    // Convert share link to embed
    if(/google\.com\/maps/i.test(url)) return url.replace("/maps/","/maps/embed?");
  }catch(e){}
  return url;
}
async function loadCompany(){
  try{
    const snap=await db.collection("company").doc("profile").get();
    if(snap.exists) company={...company, ...snap.data()};
  }catch(e){}
  $("cTitle").textContent=company.name||"JoodKids";
  $("cNameFoot").textContent=company.name||"JoodKids";
  $("cTag").textContent=company.tagline||"Kids clothes";
  $("cDesc").textContent=company.desc||"—";

  // call / whatsapp
  const phone=(company.phone||"").trim();
  setLink($("callBtn"), phone?`tel:${phone}`:"");
  const wa=(company.whatsapp||"").trim();
  setLink($("waBtn"), wa?`https://wa.me/${wa}`:"");

  setLink($("fbBtn"), company.fb);
  setLink($("igBtn"), company.ig);
  setLink($("tgBtn"), company.tg);
  setLink($("mapMainBtn"), company.map);

  // maps frames
  const fUrl=company.factoryMap||"";
  const sUrl=company.shopMap||"";
  const fEmb=toEmbed(fUrl), sEmb=toEmbed(sUrl);
  const fFrame=$("factoryMapFrame"), sFrame=$("shopMapFrame");
  if(fFrame){ fFrame.src=fEmb || "about:blank"; }
  if(sFrame){ sFrame.src=sEmb || "about:blank"; }
  setLink($("factoryOpen"), fUrl);
  setLink($("shopOpen"), sUrl);
}
loadCompany();
