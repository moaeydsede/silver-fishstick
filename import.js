// CSV Import (Auth required)
const statusEl=document.getElementById("status");
const loginBtn=document.getElementById("loginBtn");
const importBtn=document.getElementById("importBtn");
const csvFile=document.getElementById("csvFile");
const csvText=document.getElementById("csvText");

function catKey(code){const n=Math.abs(Number(code||0)); const s=String(n); return (n>=1000)?s.slice(0,2):s.slice(0,1);}
function splitComma(s){return (s||"").split(",").map(x=>x.trim()).filter(Boolean);}
function parseCSV(text){
  // Minimal CSV parser that supports quoted fields and escaped quotes ("")
  const rows=[];
  let row=[], cur="", inQ=false;

  for(let i=0;i<text.length;i++){
    const ch=text[i];

    // Quote handling (supports escaped double-quotes: "")
    if(ch === '"'){
      if(inQ && text[i+1] === '"'){ cur += '"'; i++; }
      else { inQ = !inQ; }
      continue;
    }

    // Delimiters when not inside quotes
    if(!inQ && (ch === ',' || ch === '\n' || ch === '\r')){
      // Handle Windows line endings
      if(ch === '\r' && text[i+1] === '\n') continue;

      row.push(cur);
      cur="";

      if(ch === '\n'){
        if(row.join("").trim()) rows.push(row);
        row=[];
      }
      continue;
    }

    cur += ch;
  }

  if(cur.length || row.length){
    row.push(cur);
    if(row.join("").trim()) rows.push(row);
  }
  return rows;
}

csvFile.addEventListener("change", async ()=>{
  const f=csvFile.files?.[0]; if(!f) return;
  if(f.name.toLowerCase().endsWith(".xlsx")){
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, {type:"array"});
    const ws = wb.Sheets[wb.SheetNames[0]];
    csvText.value = XLSX.utils.sheet_to_csv(ws);
  }else{
    csvText.value = await f.text();
  }
});

loginBtn.onclick=async ()=>{
  const e=prompt("Email"); if(!e) return;
  const p=prompt("Password"); if(!p) return;
  await auth.signInWithEmailAndPassword(e.trim(), p.trim()).catch(err=>alert(err.message));
};

auth.onAuthStateChanged(u=>{
  if(u){
    statusEl.textContent="الحالة: تم تسجيل الدخول ✅";
    importBtn.disabled=false;
  }else{
    statusEl.textContent="الحالة: بانتظار تسجيل الدخول…";
    importBtn.disabled=true;
  }
});

importBtn.onclick=async ()=>{
  const text=(csvText.value||"").trim();
  if(!text) return alert("ضع CSV");
  const rows=parseCSV(text);
  if(rows.length<2) return alert("CSV فارغ");

  let start=0;
  const head=rows[0].map(x=>x.trim().toLowerCase());
  if(head.includes("code") || head.includes("name")) start=1;

  const docs=[];
  for(let i=start;i<rows.length;i++){
    const r=rows[i];
    const code=Number((r[0]||"").trim());
    const name=(r[1]||"").trim();
    const price=Number((r[2]||"0").trim());
    const sizes=splitComma(r[3]||"");
    const tags=splitComma(r[4]||"").map(x=>x.toLowerCase());
    const desc=(r[5]||"").trim();
    const imagesRaw=(r[6]||"").trim();
    const urls = imagesRaw ? imagesRaw.split("|").map(x=>x.trim()).filter(Boolean) : [];
    if(!code || !name) continue;
    docs.push({
      code, name, price, currency:"EGB",
      sizes, tags, desc,
      catKey: catKey(code),
      mainImageUrl: urls[0]||"",
      images: urls.map(u=>({url:u, path:""})),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  if(!docs.length) return alert("لا توجد بيانات صالحة");

  statusEl.textContent=`جارٍ الاستيراد... (${docs.length})`;
  let done=0;
  while(done < docs.length){
    const chunk=docs.slice(done, done+450);
    const batch=db.batch();
    chunk.forEach(d=>{
      const ref=db.collection("products").doc();
      batch.set(ref, d, {merge:true});
    });
    await batch.commit();
    done += chunk.length;
    statusEl.textContent=`تم استيراد ${done}/${docs.length} ✅`;
  }
  alert("تم الاستيراد ✅");
};
