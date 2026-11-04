(() => {
  const languages = { it:'IT Italiano', en:'GB English', ru:'RU Русский', fr:'FR Français', de:'DE Deutsch', 'zh-Hans':'CN 中文', es:'ES Español', ar:'SA العربية', hi:'IN हिन्दी', si:'LK සිංහල', ta:'LK தமிழ்' };
  const nav = document.querySelector('nav') || document.body;
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Lingua / Language');
  select.className = "manual-language";
  for (const [code, label] of Object.entries(languages)) select.add(new Option(label, code));
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const entries = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.data.trim() && !node.parentElement.closest('script,style,pre,code,[translate="no"]')) entries.push([node,node.data]);
  }
  nav.prepend(select,status);
  let version = 0;
  async function change(language) {
    const current = ++version;
    status.textContent = '';
    if (language === 'it') {
      entries.forEach(([node, original]) => node.data = original);
      document.documentElement.lang = 'it';
      document.documentElement.dir = 'ltr';
      return;
    }
    let translator;
    try {
      status.textContent = ' Traduzione in corso…';
      const options = {sourceLanguage:'it',targetLanguage:language};
      if (!globalThis.Translator || await Translator.availability(options) === 'unavailable') throw new Error();
      translator = await Translator.create(options);
      const translations = [];
      for (const [, original] of entries) {
        if (current !== version) return;
        translations.push(await translator.translate(original));
      }
      if (current !== version) return;
      entries.forEach(([node], index) => node.data = translations[index]);
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      status.textContent = '';
    } catch {
      if (current !== version) return;
      select.value = document.documentElement.lang;
      status.textContent = ' Traduzione non disponibile qui. Usa la funzione Traduci del browser. / Use your browser’s Translate feature.';
    } finally {
      translator?.destroy();
    }
  }
  select.addEventListener('change', () => change(select.value));
  })();


