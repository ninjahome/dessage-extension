import browser from "webextension-polyfill";
import {addTwitterElements} from "./content_twitter";


function addInjectJS(fileName: string) {
    const script: HTMLScriptElement = document.createElement('script');
    script.src = browser.runtime.getURL(fileName);
    script.onload = function () {
        script.remove();
    };
    (document.head || document.documentElement).appendChild(script);
}

function addCustomStyles(cssFilePath: string): void {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = browser.runtime.getURL(cssFilePath);
    document.head.appendChild(link);
}

document.addEventListener('DOMContentLoaded', async () => {
    addInjectJS('js/inject.js');
    const hostname = window.location.hostname;
    console.log('----------------->>>>>>>hostname', hostname);
    if (hostname.includes("x.com")) {
        addCustomStyles('css/content_twitter.css');
        const template = await parseHtmlContent('inject_twitter.html');
        addTwitterElements(template).then();
    }
});

async function parseHtmlContent(htmlFilePath: string): Promise<HTMLTemplateElement> {
    const response = await fetch(browser.runtime.getURL(htmlFilePath));
    if (!response.ok) {
        throw new Error(`Failed to fetch ${htmlFilePath}: ${response.statusText}`);
    }
    const htmlContent = await response.text();
    const template = document.createElement('template');
    template.innerHTML = htmlContent;
    return template;
}
