// زر تثبيت PWA (Android/Chrome)
let deferredPrompt = null;
const bar = document.getElementById("installBar");
const btn = document.getElementById("installBtn");
const closeBtn = document.getElementById("installClose");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if(bar) bar.style.display = "flex";
});

async function doInstall(){
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  try{ await deferredPrompt.userChoice; }catch(e){}
  deferredPrompt = null;
  if(bar) bar.style.display = "none";
}

if(btn) btn.addEventListener("click", doInstall);
if(closeBtn) closeBtn.addEventListener("click", ()=>{ if(bar) bar.style.display="none"; });
