(function(){
  // ---------- Supabase client (safe) ----------
  const SUPABASE_URL = window.__SUPABASE_URL__ || "";
  const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__ || "";
  const CLOUD_READY = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
  const supabase = CLOUD_READY ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : {
    auth:{
      getUser: async()=>({data:{user:null}}),
      getSession: async()=>({data:{session:null}}),
      onAuthStateChange: ()=>({ data:{ subscription:{ unsubscribe(){} } } }),
      signInWithPassword: async()=>{ throw new Error("Supabase 미설정"); },
      signUp: async()=>{ throw new Error("Supabase 미설정"); },
      signOut: async()=>({})
    },
    from:()=>({ select: async()=>({data:null,error:null}), upsert: async()=>({}), insert: async()=>({}), maybeSingle: async()=>({data:null}) })
  };

  // ---------- Defaults ----------
  const DEFAULTS = {
    pageTitle:"MyNameis",
    loadingText:"불러오고 있어요",
    backgroundUrl:"https://images.unsplash.com/photo-1520975922284-9e0ce8275f5b?q=80&w=1600&auto=format&fit=crop",
    bannerUrl:"https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=1600&auto=format&fit=crop",
    profileUrl:"https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop",
    name:"마이 네임",
    loadingBg:"rgba(239,244,255,0.9)",
    loadingDot:"#5865F2",
    overlayColor:"rgba(255,255,255,0.35)",
    cardShadowColor:"rgba(0,0,0,0.25)",
    tags:[
      {text:"마이네임이즈", color:"#fd8a8a", shadow:""},
      {text:"소개페이지",   color:"#fde047", shadow:""},
      {text:"웹사이트",     color:"#93c5fd", shadow:""}
    ],
    buttons:[]
  };

  const LS_KEY = "panelConfig.v3";
  const LENGTH_LIMIT = 1800;

  // ---------- Utils ----------
  const $ = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>Array.from(el.querySelectorAll(s));
  const isCssColor = v => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v||"") || /^rgba?\(/i.test(v||"");
  const isSafeUrl = u => /^https?:\/\//i.test(u||"") || /^data:image\//i.test(u||"");
  const isDataImg = u => /^data:image\//i.test(u||"");

  function fileToDataURL(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }

  function contrastOn(bg){
    let r,g,b;
    if(/^#/.test(bg)){ let h=bg.slice(1); if(h.length===3) h=h.split('').map(c=>c+c).join(''); const n=parseInt(h,16); r=(n>>16)&255; g=(n>>8)&255; b=n&255; }
    else{ const m=bg.replace(/[^\d.,]/g,"").split(",").map(Number); r=m[0];g=m[1];b=m[2]; }
    const L= (0.2126*(r/255)**2.2 + 0.7152*(g/255)**2.2 + 0.0722*(b/255)**2.2);
    return L>0.6? "#111" : "#fff";
  }

  // ---------- Loading controller ----------
  const MIN_LOADING_MS = 800;
  const MAX_LOADING_MS = 6000;
  const start = Date.now();
  let closed = false;
  function closeLoading(){
    if(closed) return;
    const elapsed = Date.now() - start;
    const wait = Math.max(0, MIN_LOADING_MS - elapsed);
    setTimeout(()=>{
      const L=$("#loading"), C=$("#content");
      if(L) L.style.display="none";
      if(C){ C.style.display="block"; C.setAttribute("aria-busy","false"); }
      closed = true;
    }, wait);
  }
  setTimeout(closeLoading, MAX_LOADING_MS);
  window.addEventListener("unhandledrejection", closeLoading);

  function encCfg(cfg){
    const s=JSON.stringify(cfg);
    const bytes=new TextEncoder().encode(s);
    let bin=""; for(let i=0;i<bytes.length;i++) bin+=String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function decCfg(s){
    try{
      const bin=atob(s); const bytes=new Uint8Array([...bin].map(c=>c.charCodeAt(0)));
      return JSON.parse(new TextDecoder().decode(bytes));
    }catch{return null;}
  }
  function cleanCParam(){
    try{ const u=new URL(location.href); if(u.searchParams.has("c")){ u.searchParams.delete("c"); history.replaceState(null,"",u); } }catch{}
  }
  function applyOverlay(color){
    const v=isCssColor(color)?color:DEFAULTS.overlayColor;
    let st=document.getElementById("ovStyle"); if(!st){ st=document.createElement("style"); st.id="ovStyle"; document.head.appendChild(st); }
    st.textContent=`body::before{background:${v}!important}`;
  }
  function applyCardShadow(color){
    const v=isCssColor(color)?color:DEFAULTS.cardShadowColor;
    let st=document.getElementById("shStyle"); if(!st){ st=document.createElement("style"); st.id="shStyle"; document.head.appendChild(st); }
    st.textContent=`#content{box-shadow:0 8px 24px ${v}!important}`;
  }

  // ---------- Render ----------
  function render(cfg){
    document.title = cfg.pageTitle || cfg.name || document.title;
    $("#loadingText").textContent = cfg.loadingText || DEFAULTS.loadingText;

    const L=$("#loading");
    if(L && cfg.loadingBg) L.style.background = cfg.loadingBg;
    $$(".dot i").forEach(i=>{ if(cfg.loadingDot) i.style.background = cfg.loadingDot; });

    document.body.style.backgroundImage = `url("${cfg.backgroundUrl}")`;
    $(".top").style.backgroundImage = `
      linear-gradient(135deg, rgba(127,90,240,.2), rgba(255,128,191,.2)),
      url("${cfg.bannerUrl}")
    `;
    $("#profileImg").src = cfg.profileUrl || "";
    $("#displayName").textContent = cfg.name || "";

    const tw=$("#tagsWrap"); tw.innerHTML="";
    (cfg.tags||[]).forEach(t=>{
      if(!t.text) return;
      const d=document.createElement("div"); d.className="tag";
      const c = isCssColor(t.color)? t.color : "#93c5fd";
      d.style.background = c;
      d.style.boxShadow = `0 8px 18px ${ t.shadow && isCssColor(t.shadow) ? t.shadow : c }`;
      d.style.color = contrastOn(c);
      d.textContent=t.text;
      tw.appendChild(d);
    });

    const bw=$("#btnsWrap"); bw.innerHTML="";
    (cfg.buttons||[]).forEach(b=>{
      if(!b.label || !isSafeUrl(b.url)) return;
      const a=document.createElement("a"); a.className="btn"; a.target="_blank"; a.rel="noopener";
      a.textContent=b.label; a.href=b.url; bw.appendChild(a);
    });

    applyOverlay(cfg.overlayColor);
    applyCardShadow(cfg.cardShadowColor);
    closeLoading();
  }

  // ---------- DOM ----------
  const panel=$("#panel"), settingsBtn=$("#settingsBtn"), authBtn=$("#authBtn");
  const titleInput=$("#titleInput"), loadingMsgInput=$("#loadingMsgInput"), nameInput=$("#nameInput");
  const bgText=$("#bgText"), bannerText=$("#bannerText"), profileText=$("#profileText");
  const bgFile=$("#bgFile"), bannerFile=$("#bannerFile"), profileFile=$("#profileFile");
  const loadingBgInput=$("#loadingBgInput"), loadingDotInput=$("#loadingDotInput");
  const loadingBgPicker=$("#loadingBgPicker"), loadingDotPicker=$("#loadingDotPicker");
  const overlayInput=$("#overlayInput"), overlayPicker=$("#overlayPicker");
  const shadowInput=$("#shadowInput"), shadowPicker=$("#shadowPicker");
  const tagsList=$("#tagsList"), linksList=$("#linksList");
  const addTag=$("#addTag"), addLink=$("#addLink");
  const btnSave=$("#btnSave"), btnReset=$("#btnReset");
  const publishSlug=$("#publishSlug"), slugInput=$("#slugInput");
  const previewBtn=$("#previewBtn"), saveCloud=$("#saveCloud"), loadCloud=$("#loadCloud"), createShort=$("#createShort");

  function openPanel(o=true){ panel.classList.toggle("open",o); }
  settingsBtn.addEventListener("click", async ()=>{
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user){ alert("패널을 사용하려면 로그인해주세요."); openAuth(true); return; }
    openPanel(!panel.classList.contains("open"));
  });

  function addTagRow(tag={text:"",color:"",shadow:""}){
    const tpl=document.createElement("template");
    tpl.innerHTML = `<div class="item tag-item">
      <div class="row-2">
        <div><label>텍스트</label><input type="text" class="tag-text" placeholder="예: 치린이집"/></div>
        <div><label>색상 코드(HEX/rgb/rgba)</label><input type="text" class="tag-color" placeholder="#ff5577 또는 rgba(255,85,119,.9)"/></div>
      </div>
      <div class="row"><label>그림자 색(비우면 태그색)</label><input type="text" class="tag-shadow" placeholder="rgba(0,0,0,0.18) / #ff5577"/></div>
      <div style="display:flex; gap:6px; justify-content:flex-end"><button class="small danger tag-del">삭제</button></div>
    </div>`;
    const row=tpl.content.firstElementChild;
    row.querySelector(".tag-text").value = tag.text||"";
    row.querySelector(".tag-color").value = tag.color||"";
    row.querySelector(".tag-shadow").value = tag.shadow||"";
    row.querySelector(".tag-del").addEventListener("click", ()=> row.remove());
    tagsList.appendChild(row);
  }
  function addLinkRow(link={label:"",url:""}){
    const tpl=document.createElement("template");
    tpl.innerHTML = `<div class="item link-item">
      <div class="row"><label>버튼 이름</label><input type="text" class="link-label" placeholder="예: 문의하기"/></div>
      <div class="row"><label>연결 링크(URL)</label><input type="url" class="link-url" placeholder="https://example.com"/></div>
      <div style="display:flex; gap:6px; justify-content:flex-end"><button class="small danger link-del">삭제</button></div>
    </div>`;
    const row=tpl.content.firstElementChild;
    row.querySelector(".link-label").value = link.label||"";
    row.querySelector(".link-url").value = link.url||"";
    row.querySelector(".link-del").addEventListener("click", ()=> row.remove());
    linksList.appendChild(row);
  }
  addTag.addEventListener("click", ()=> addTagRow());
  addLink.addEventListener("click", ()=> addLinkRow());

  function fillForm(cfg){
    titleInput.value = cfg.pageTitle||"";
    loadingMsgInput.value = cfg.loadingText||"";
    nameInput.value = cfg.name||"";

    bgText.value = isDataImg(cfg.backgroundUrl)? cfg.backgroundUrl : "";
    bannerText.value = isDataImg(cfg.bannerUrl)? cfg.bannerUrl : "";
    profileText.value = isDataImg(cfg.profileUrl)? cfg.profileUrl : "";

    loadingBgInput.value = cfg.loadingBg || DEFAULTS.loadingBg;
    loadingDotInput.value = cfg.loadingDot || DEFAULTS.loadingDot;
    overlayInput.value = cfg.overlayColor || DEFAULTS.overlayColor;
    shadowInput.value = cfg.cardShadowColor || DEFAULTS.cardShadowColor;

    if(/^#/.test(cfg.loadingBg||"")) loadingBgPicker.value = cfg.loadingBg;
    if(/^#/.test(cfg.loadingDot||"")) loadingDotPicker.value = cfg.loadingDot;
    if(/^#/.test(cfg.overlayColor||"")) overlayPicker.value = cfg.overlayColor;
    if(/^#/.test(cfg.cardShadowColor||"")) shadowPicker.value = cfg.cardShadowColor;

    tagsList.innerHTML=""; (cfg.tags||[]).forEach(addTagRow);
    linksList.innerHTML=""; (cfg.buttons||[]).forEach(addLinkRow);
  }

  function collectForm(){
    const tags = $$(".tag-item",tagsList).map(el=>({
      text: el.querySelector(".tag-text").value.trim(),
      color: el.querySelector(".tag-color").value.trim(),
      shadow: el.querySelector(".tag-shadow").value.trim()
    })).filter(t=>t.text);

    const buttons = $$(".link-item",linksList).map(el=>({
      label: el.querySelector(".link-label").value.trim(),
      url: el.querySelector(".link-url").value.trim()
    })).filter(b=>b.label && isSafeUrl(b.url));

    const bg = isDataImg(bgText.value.trim())? bgText.value.trim() : DEFAULTS.backgroundUrl;
    const banner = isDataImg(bannerText.value.trim())? bannerText.value.trim() : DEFAULTS.bannerUrl;
    const profile = isDataImg(profileText.value.trim())? profileText.value.trim() : DEFAULTS.profileUrl;

    return {
      pageTitle: titleInput.value.trim() || nameInput.value.trim() || DEFAULTS.pageTitle,
      loadingText: loadingMsgInput.value.trim() || DEFAULTS.loadingText,
      backgroundUrl: bg,
      bannerUrl: banner,
      profileUrl: profile,
      name: nameInput.value.trim() || DEFAULTS.name,
      loadingBg: loadingBgInput.value.trim() || DEFAULTS.loadingBg,
      loadingDot: loadingDotInput.value.trim() || DEFAULTS.loadingDot,
      overlayColor: overlayInput.value.trim() || DEFAULTS.overlayColor,
      cardShadowColor: shadowInput.value.trim() || DEFAULTS.cardShadowColor,
      tags, buttons
    };
  }

  async function bindFileInput(fileEl, targetText, onApply){
    fileEl?.addEventListener("change", async e=>{
      const f=e.target.files?.[0]; if(!f) return;
      const dataURL = await fileToDataURL(f);
      targetText.value = dataURL;
      onApply?.(dataURL);
      render(collectForm());
    });
  }
  bindFileInput(bgFile, bgText);
  bindFileInput(bannerFile, bannerText);
  bindFileInput(profileFile, profileText, (d)=>{ $("#profileImg").src=d; });

  loadingBgPicker?.addEventListener("input", e=>{ loadingBgInput.value=e.target.value; render(collectForm()); });
  loadingDotPicker?.addEventListener("input", e=>{ loadingDotInput.value=e.target.value; render(collectForm()); });
  overlayPicker?.addEventListener("input", e=>{ overlayInput.value=e.target.value; render(collectForm()); });
  shadowPicker?.addEventListener("input", e=>{ shadowInput.value=e.target.value; render(collectForm()); });

  $("#previewBtn").addEventListener("click", ()=> render(collectForm()));

  btnSave.addEventListener("click", async ()=>{
    const c=collectForm();
    localStorage.setItem(LS_KEY, JSON.stringify(c));
    render(c);
    const enc = encCfg(c);
    const u = new URL(location.href);
    if (enc.length <= LENGTH_LIMIT) u.searchParams.set("c", enc);
    else u.searchParams.delete("c");
    history.replaceState(null,"",u);

    const { data:{ user } } = await supabase.auth.getUser();
    if(user){ await saveToAccount(c); }
    alert("저장되었습니다.");
    openPanel(false);
  });
  btnReset.addEventListener("click", ()=>{
    if(confirm("모든 설정을 기본값으로 되돌릴까요?")){
      localStorage.setItem(LS_KEY, JSON.stringify(DEFAULTS));
      fillForm(DEFAULTS); render(DEFAULTS);
      const u=new URL(location.href); u.searchParams.delete("c"); history.replaceState(null,"",u);
      alert("초기화했습니다.");
    }
  });

  // ---------- Supabase storage ----------
  async function saveToAccount(cfg){
    if(!CLOUD_READY) return;
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user) return;
    const { error } = await supabase.from("configs").upsert({ user_id:user.id, data:cfg });
    if(error) alert(error.message);
  }
  async function loadFromAccount(){
    if(!CLOUD_READY) return;
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user) return alert("로그인 필요");
    const { data, error } = await supabase.from("configs").select("data").eq("user_id", user.id).maybeSingle();
    if(error || !data){ alert("계정에 저장된 설정이 없습니다."); return; }
    const cfg = data.data;
    fillForm(cfg); render(cfg); localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  }
  $("#saveCloud").addEventListener("click", ()=> saveToAccount(collectForm()));
  $("#loadCloud").addEventListener("click", ()=> loadFromAccount());

  // ---------- Short link / slug ----------
  function genCode(n=8){ const cs="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; let s=""; for(let i=0;i<n;i++) s+=cs[Math.floor(Math.random()*cs.length)]; return s; }
  function isValidSlug(s){ return /^[a-zA-Z0-9_-]{3,32}$/.test(s||""); }
  async function fetchShortByCode(code){
    const { data, error } = await supabase.from("short_configs").select("data, owner_id").eq("code", code).maybeSingle();
    if(error){ console.warn(error.message); return null; }
    return data?.data || null;
  }
  async function publishSlugNow(){
    if(!CLOUD_READY) return alert("클라우드 설정 후 사용 가능합니다.");
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user){ alert("먼저 로그인 해주세요."); openAuth(true); return; }
    const slug = (slugInput.value||"").trim();
    if(!isValidSlug(slug)) return alert("슬러그 형식 오류: 영문/숫자/_/-, 3~32자");

    const existed = await supabase.from("short_configs").select("owner_id").eq("code", slug).maybeSingle();
    if(existed.data && existed.data.owner_id && existed.data.owner_id !== user.id) return alert("이미 사용 중인 슬러그입니다.");

    const cfg = collectForm();
    const { error } = await supabase.from("short_configs").upsert({ code:slug, owner_id:user.id, data:cfg }).select("code").single();
    if(error) return alert("슬러그 게시 실패: "+error.message);

    const p1=`${location.origin}/@${slug}`, p2=`${location.origin}/${slug}`, q=`${location.origin}${location.pathname}?s=${encodeURIComponent(slug)}`;
    try{ await navigator.clipboard.writeText(p1); }catch{}
    alert(`슬러그 게시 완료!\n\n직접 경로(리라이트 필요):\n- ${p1}\n- ${p2}\n\n항상 동작:\n- ${q}`);
  }
  $("#publishSlug").addEventListener("click", publishSlugNow);

  function getPathSlug(){
    const p = location.pathname;
    if (p === "/" || /index\.html?$/i.test(p)) return null;
    const m = p.match(/^\/(?:@)?([A-Za-z0-9_-]{3,32})\/?$/);
    return m ? m[1] : null;
  }

  // ---------- Auth modal ----------
  const authModal=$("#authModal"), authClose=$("#authClose");
  const email=$("#email"), pw=$("#pw"), btnRegister=$("#btnRegister"), btnLogin=$("#btnLogin"), btnLogout=$("#btnLogout"), sendReset=$("#sendReset");
  function openAuth(o=true){ authModal.classList.toggle("open",o); if(o) email.focus(); }
  authBtn.addEventListener("click", async ()=>{
    const { data:{ user } } = await supabase.auth.getUser();
    if(user){
      email.value = user.email || ""; email.disabled = true; pw.value = "";
      btnLogout.style.display=""; btnRegister.style.display="none"; btnLogin.textContent="재로그인"; openAuth(true);
    } else {
      email.value=""; email.disabled=false; pw.value="";
      btnLogout.style.display="none"; btnRegister.style.display=""; btnLogin.textContent="로그인"; openAuth(true);
    }
  });
  authClose.addEventListener("click", ()=> openAuth(false));

  btnRegister.addEventListener("click", async ()=>{
    const e=(email.value||"").trim(), p=pw.value;
    if(!e || !p) return alert("이메일/비밀번호를 입력하세요.");
    const { error } = await supabase.auth.signUp({ email:e, password:p, options:{ emailRedirectTo: location.origin + location.pathname } });
    if(error) return alert(error.message);
    alert("회원가입 메일을 보냈어요. 인증 후 로그인하세요.");
    openAuth(false);
  });
  btnLogin.addEventListener("click", async ()=>{
    const e=(email.value||"").trim(), p=pw.value;
    if(!e || !p) return alert("이메일/비밀번호를 입력하세요.");
    const { error } = await supabase.auth.signInWithPassword({ email:e, password:p });
    if(error){
      const m=(error.message||"").toLowerCase();
      if(m.includes("confirm")||m.includes("verified")) alert("이메일 인증을 완료해야 로그인할 수 있어요.");
      else alert(error.message);
      return;
    }
    openAuth(false);
    try{ await ensureFirstSignupInit(); await loadFromAccount(); }catch(e){}
  });
  btnLogout.addEventListener("click", async ()=>{ await supabase.auth.signOut(); openAuth(false); });

  sendReset.addEventListener("click", async ()=>{
    const e=(email.value||"").trim(); if(!e) return alert("이메일을 입력하세요.");
    const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo: location.origin + location.pathname });
    if(error) return alert(error.message);
    alert("재설정 메일을 보냈습니다.");
  });

  async function ensureFirstSignupInit(){
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user) return;
    const r = await supabase.from("configs").select("user_id").eq("user_id", user.id).maybeSingle();
    if(!r.data){
      await supabase.from("configs").insert({ user_id:user.id, data:DEFAULTS });
    }
  }

  // ---------- Boot ----------
  (async ()=>{
    try{
      let cfg=null;
      const pathSlug = getPathSlug();
      const url = new URL(location.href);
      const s = url.searchParams.get("s");
      const c = url.searchParams.get("c");

      if(pathSlug && CLOUD_READY) try{ cfg = await fetchShortByCode(pathSlug); }catch{}
      if(!cfg && s && CLOUD_READY) try{ cfg = await fetchShortByCode(s); }catch{}
      if(!cfg && c){ cfg = decCfg(c); cleanCParam(); }
      if(!cfg){
        try{ const raw=localStorage.getItem(LS_KEY); if(raw) cfg=JSON.parse(raw); }catch{}
      }
      if(!cfg) cfg = JSON.parse(JSON.stringify(DEFAULTS));

      fillForm(cfg); render(cfg);
    }catch(e){
      console.error("boot error:", e);
      fillForm(DEFAULTS); render(DEFAULTS);
    }
  })();

})();