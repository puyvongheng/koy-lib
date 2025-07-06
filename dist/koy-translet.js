class KoyTranslet {
  constructor(globalJsonUrls = [], defaultLang = 'en', options = {}) {
    this.translations = Object.create(null);
    this.loadedFiles = new Set();
    this.currentLang = this.getSavedLang(defaultLang);
    this.defaultLang = defaultLang;
    this.isReady = false;
    this.options = {
      fallbackToDefault: true,
      interpolationPattern: /\{(.+?)\}/g,
      ...options
    };
    this.init(globalJsonUrls);
  }
  

  
  getSavedLang(fallback) {
    return localStorage.getItem('lang') || navigator.language.split('-')[0] || fallback;
  }
  
  
  async init(urls) {
    try {
      await Promise.all(urls.map(url => this.loadAndMerge(url)));
      this.isReady = true;
      this.translatePage();
    } catch (err) {
      console.error('Translation load error:', err);
    }
  }
  
  
  async loadAndMerge(url) {
    if (this.loadedFiles.has(url)) return;
    const data = await this.loadJSON(url);
    this.mergeTranslations(this.translations, data);
    this.loadedFiles.add(url);
  }
  
  
  async loadJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load: ${url}`);
    return res.json();
  }
  
  mergeTranslations(target, source) {
    for (const key in source) {
      if (!(key in target)) target[key] = {};
      Object.assign(target[key], source[key]);
    }
  }
  
  setLanguage(lang) {
    if (!this.hasLang(lang)) {
      console.warn(`Language "${lang}" not found.`);
      return;
    }
    this.currentLang = lang;
    localStorage.setItem('lang', lang);
    this.translatePage();
  }
  
  hasLang(lang) {
    return Object.values(this.translations).some(entry => lang in entry);
  }
  
  interpolate(str, data = {}) {
    return str.replace(this.options.interpolationPattern, (_, key) => data[key] ?? `{${key}}`);
  }
  
  
  getTranslation(key, vars = {}) {
    const entry = this.translations[key];
    if (!entry) return key;
  
    const value =
      entry[this.currentLang] ||
      (this.options.fallbackToDefault ? entry['default'] : null) ||
      key;
  
    return this.interpolate(value, vars);
  }
  




  async translateElement(el) {
    const key = el.getAttribute('koy-data-t');
    const src = el.getAttribute('koy-data-src');
  
    
    // Load JSON source if needed
    if (src && !this.loadedFiles.has(src)) {
      try {
        await this.loadAndMerge(src);
      } catch (err) {
        console.warn(`Could not load source for ${key}:`, err);
        return;
      }
    }
  
    // Extract variables like koy-data-var-name
    const vars = {};
    for (const attr of el.attributes) {
      if (attr.name.startsWith('koy-data-var-')) {
        vars[attr.name.slice('koy-data-var-'.length)] = attr.value;
      }
    }

    // Get inline translation if defined
    const inlineTranslation = el.getAttribute(this.currentLang);
  
    // Final translated text (inline > JSON > fallback)
    const translated = inlineTranslation
      ? this.interpolate(inlineTranslation, vars)
      : this.getTranslation(key, vars);

    // Skip animation if same or no content
    if (el.textContent === translated) return;
  
    // First time? No animation, just set and mark as initialized
    if (!el.hasAttribute('data-koy-animated')) {
      el.textContent = translated;
      el.setAttribute('data-koy-animated', 'true');
      return;
    }
    // Animate fade-out + text change + fade-in
    el.style.transition = 'opacity 0.3s ease';
    el.style.opacity = 0;
  
    setTimeout(() => {
      el.textContent = translated;
      el.style.opacity = 1;
    }, 300);
  }


  
  
  async translatePage() {
    if (!this.isReady) return;
    const elements = document.querySelectorAll('[koy-data-t]');
    const uniqueFiles = new Set();
  
    elements.forEach(el => {
      const src = el.getAttribute('koy-data-src');
      if (src && !this.loadedFiles.has(src)) {
        uniqueFiles.add(src);
      }
    });
  


    await Promise.all([...uniqueFiles].map(src => this.loadAndMerge(src)));
  
    requestIdleCallback(() => {
      elements.forEach(el => this.translateElement(el));
    });
  }







//  can delet used with google 


  
}