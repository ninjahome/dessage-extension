import {initDatabase} from "./database";
import {showView} from "./util";

document.addEventListener("DOMContentLoaded", initWelcomePage as EventListener);

async function initWelcomePage(): Promise<void> {
    await initDatabase();


    window.addEventListener('hashchange', function () {
        showView(window.location.hash, router);
    });

    showView(window.location.hash || '#onboarding/welcome', router);

    (window as any).navigateTo = navigateTo;

}

function navigateTo(hash: string): void {
    history.pushState(null, '', hash);
    showView(hash, router);
}

function router(path: string): void {
    if (path === '#onboarding/recovery-phrase') {
        displayMnemonic();
    }
    if (path === '#onboarding/confirm-recovery') {
        displayConfirmVal();
    }
    if (path === '#onboarding/import-wallet') {
        generateRecoveryPhraseInputs();
    }
    if (path === '#onboarding/account-home') {
        prepareAccountData();
    }
}


// 需要确保这些函数已经在你的代码中定义
function displayMnemonic(): void {
    // Your implementation
}

function displayConfirmVal(): void {
    // Your implementation
}

function generateRecoveryPhraseInputs(): void {
    // Your implementation
}

function prepareAccountData(): void {
    // Your implementation
}