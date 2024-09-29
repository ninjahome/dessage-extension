import {MsgType, observeForElement} from "./common";
import browser from "webextension-polyfill";
import {ProfilePage} from "./twitter_profile";

export async function addTwitterElements(template: HTMLTemplateElement) {
    observeForElement(document.body, 1000,
        () => {
            return document.querySelector('nav[aria-label="Primary"][role="navigation"]') as HTMLElement;
        }, async () => {
            console.log("------>>>start to populate twitter menu");
            addLeftMenuItem(template);
            parsePersonalInfo();
        });
}

function addLeftMenuItem(template: HTMLTemplateElement) {
    const dsgLink = template.content.getElementById("AppTabBar_Dessage_Link");
    if (!dsgLink) {
        console.log("------>>>failed to find dessage left menu for twitter");
        return;
    }
    const clone = dsgLink.cloneNode(true) as HTMLElement;
    clone.addEventListener('click', function (event) {
        event.preventDefault(); // 阻止链接的默认跳转
        showDessageMainPopPage(); // 调用你自定义的函数
    });

    const navElement = document.querySelector('nav[aria-label="Primary"][role="navigation"]');
    if (!navElement) {
        console.log("------>>>failed to find twitter menu on left");
        return;
    }

    navElement.insertBefore(clone, navElement.lastChild);
}

function showDessageMainPopPage() {
    browser.runtime.sendMessage({action: MsgType.OpenPopMainPage}).catch((error: any) => {
        console.warn('------>>>pop up main home err:', error);
    });
}

function parsePersonalInfo() {
    const scriptTag = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"][data-testid="UserProfileSchema-test"]');

    if (scriptTag && scriptTag.textContent) {
        try {
            const profilePageData: ProfilePage = JSON.parse(scriptTag.textContent) as ProfilePage;

            // 现在 profilePageData 是一个 ProfilePage 类型的对象
            console.log(profilePageData);

            // 你可以访问 profilePageData 的字段
            console.log(profilePageData.author.givenName);  // "Ninja"
            console.log(profilePageData.author.homeLocation.name);  // "beijing"
        } catch (error) {
            console.error('Failed to parse JSON-LD data:', error);
        }
    } else {
        console.log('Target script tag not found.');
    }

}