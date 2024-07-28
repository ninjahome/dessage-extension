import browser from "webextension-polyfill";

(() => {
    const script: HTMLScriptElement = document.createElement('script');
    const url = browser.runtime.getURL('js/inject.js');
    script.src = url;
    script.onload = function() {
        script.remove();
    };
    (document.head || document.documentElement).appendChild(script);
})();
