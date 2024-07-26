import browser from "webextension-polyfill";

browser.runtime.onInstalled.addListener(() => {
    console.log('Hello World Extension installed.');
});
