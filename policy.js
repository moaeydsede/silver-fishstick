/* Policy page: reads company profile and fills footer links */
const $=id=>document.getElementById(id);

let company = {name:"JoodKids", phone:"", whatsapp:"", tagline:"Kids clothes", desc:"", delivery:"", fb:"", ig:"", tg:"", factoryMap:"", shopMap:""};

(async function(){
  try{
    const snap=await db.collection("company").doc("profile").get();
    if(snap.exists) company={...company, ...snap.data()};
  }catch(e){}

  $("year").textContent=new Date().getFullYear();
  $("companyName").textContent=company.name||"JoodKids";
  $("companyCopy").textContent=company.name||"JoodKids";
  $("companyTag").textContent=company.tagline||"Kids clothes";
  $("companyDesc").textContent=company.desc||"";
  $("companyPhone").textContent=company.phone?`☎ ${company.phone}`:"☎ —";
  $("footerCompany").textContent=`${company.name||"JoodKids"} • ${company.phone||""}`.trim();

  const setLink=(id,url)=>{const a=$(id); if(!a) return; if(url){a.href=url; a.style.opacity="1";} else {a.href="#"; a.style.opacity=".6";}};
  setLink("fbLink",company.fb);
  setLink("igLink",company.ig);
  setLink("tgLink",company.tg);
  setLink("factoryMapLink",company.factoryMap);
  setLink("shopMapLink",company.shopMap);

  const wa=$("waLink");
  if(wa){
    if(company.whatsapp){ wa.href=`https://wa.me/${company.whatsapp}`; wa.style.opacity="1"; }
    else { wa.href="#"; wa.style.opacity=".6"; }
  }
})();
