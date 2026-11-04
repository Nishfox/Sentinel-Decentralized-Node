(() => {
  const nav = document.querySelector('.doc-nav') || document.querySelector('nav') || document.body;
  const languages = {en:'GB English',it:'IT Italiano',ru:'RU Русский',fr:'FR Français',de:'DE Deutsch',zh:'CN 中文',es:'ES Español',ar:'SA العربية',hi:'IN हिन्दी',si:'LK සිංහල',ta:'LK தமிழ்'};
  const sourceLanguage = document.documentElement.lang || 'en';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const entries = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if(node.data.trim() && !node.parentElement.closest('script,style,pre,code,nav,[translate="no"]')) entries.push([node,node.data]);
  }
  const select = document.createElement('select');
  select.className='doc-language';
  select.setAttribute('aria-label','Language / Lingua');
  for(const [code,label] of Object.entries(languages)) select.add(new Option(label,code));
  select.value=sourceLanguage;
  const status=document.createElement('span');
  status.setAttribute('role','status');
  nav.append(select,status);
  let generation=0;
  select.addEventListener('change',async()=>{
    const id=++generation, language=select.value;
    if(language==='en'||language==='it'){
      const file=document.querySelector('link[rel="alternate"][hreflang="'+language+'"]')?.href;
      if(file){location.assign(file);return;}
    }
    if(language===sourceLanguage){
      entries.forEach(([node,text])=>node.data=text);
      document.documentElement.lang=sourceLanguage;
      document.documentElement.dir=sourceLanguage==='ar'?'rtl':'ltr';
      status.textContent='';
      return;
    }
    let translator;
    try{
      if(!globalThis.Translator)throw Error();
      const options={sourceLanguage,targetLanguage:language};
      if(await Translator.availability(options)==='unavailable')throw Error();
      status.textContent='Translating… / Traduzione…';
      translator=await Translator.create(options);
      const translated=[];
      for(const [,text] of entries){
        if(id!==generation)return;
        translated.push(await translator.translate(text));
      }
      if(id!==generation)return;
      entries.forEach(([node],i)=>node.data=translated[i]);
      document.documentElement.lang=language;
      document.documentElement.dir=language==='ar'?'rtl':'ltr';
      status.textContent='';
    }catch{
      if(id!==generation)return;
      select.value=document.documentElement.lang;
      status.textContent='Translation unavailable in this browser. English and Italian links remain available. / Traduzione non disponibile. Usa i link English o Italiano.';
    }finally{translator?.destroy();}
  });
})();
