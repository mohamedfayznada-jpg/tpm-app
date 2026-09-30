/* TPM Vendor Loader — load heavyweight optional browser libraries only when a feature needs them. */
(() => {
  const pending = new Map();
  function ensure(globalName, src) {
    if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
    if (pending.has(src)) return pending.get(src);
    const promise = new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find(s => s.src === src);
      if (existing) {
        existing.addEventListener('load', () => resolve(globalName ? window[globalName] : true), { once: true });
        existing.addEventListener('error', () => reject(new Error('تعذر تحميل المكتبة المطلوبة.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        if (globalName && !window[globalName]) return reject(new Error('تم تحميل المكتبة لكن الواجهة البرمجية غير متاحة.'));
        resolve(globalName ? window[globalName] : true);
      };
      script.onerror = () => reject(new Error('تعذر تحميل المكتبة المطلوبة.'));
      document.head.appendChild(script);
    }).finally(() => pending.delete(src));
    pending.set(src, promise);
    return promise;
  }
  window.TPMVendorLoader = { ensure };
})();