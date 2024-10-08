import browser from "webextension-polyfill";

function addInjectJS(fileName: string) {
    const script: HTMLScriptElement = document.createElement('script');
    script.src = browser.runtime.getURL(fileName);
    script.onload = function () {
        script.remove();
    };
    (document.head || document.documentElement).appendChild(script);
}


document.addEventListener('DOMContentLoaded', async () => {
    addInjectJS('js/inject.js');
    console.log("-------->>> shared content success")
});
