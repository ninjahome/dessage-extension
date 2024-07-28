import {initDatabase} from "./database";
import {showView} from "./util";
import {validateMnemonic, wordlists} from 'bip39';

const wordlist = wordlists.english;

document.addEventListener("DOMContentLoaded", initWelcomePage as EventListener);

async function initWelcomePage(): Promise<void> {
    await initDatabase();
    initWelcomeDiv();

    window.addEventListener('hashchange', function () {
        showView(window.location.hash, router);
    });

    showView(window.location.hash || '#onboarding/welcome', router);

    (window as any).navigateTo = navigateTo;
}

function initWelcomeDiv(): void {
    const agreeCheckbox = document.getElementById('welcome-agree') as HTMLInputElement | null;
    const createButton = document.getElementById('welcome-create') as HTMLButtonElement | null;
    const importButton = document.getElementById('welcome-import') as HTMLButtonElement | null;

    if (!agreeCheckbox || !createButton || !importButton) {
        console.error('One or more required elements are missing.');
        return;
    }

    createButton.addEventListener('click', () => {
        navigateTo('#onboarding/create-password');
    });

    createButton.disabled = !agreeCheckbox.checked;
    agreeCheckbox.addEventListener('change', () => {
        createButton.disabled = !agreeCheckbox.checked;
    });

    importButton.addEventListener('click', importWallet);
}

function importWallet(): void {
    navigateTo('#onboarding/import-wallet');
    generateRecoveryPhraseInputs();
}

function generateRecoveryPhraseInputs(): void {
    setRecoverPhaseTips(false, '');

    const lengthElement = document.getElementById('recovery-phrase-length') as HTMLInputElement | null;
    const recoveryPhraseInputs = document.getElementById('recovery-phrase-inputs') as HTMLElement | null;
    const template = document.getElementById("recovery-phrase-row-template") as HTMLTemplateElement | null;

    if (!lengthElement || !recoveryPhraseInputs || !template) {
        console.error('One or more required elements are missing.');
        return;
    }

    const length = parseInt(lengthElement.value, 10);
    recoveryPhraseInputs.innerHTML = '';

    for (let i = 0; i < length; i += 3) {
        const rowDiv = template.cloneNode(true)as HTMLElement;
        rowDiv.style.display = 'grid';
        rowDiv.id = '';
        recoveryPhraseInputs.appendChild(rowDiv);
        rowDiv.querySelectorAll("input").forEach(input => {
            input.addEventListener('input', validateRecoveryPhrase);
            const nextSibling = input.nextElementSibling as HTMLElement | null;
            if (nextSibling) {
                nextSibling.addEventListener('click', changeInputType);
            }
        });
    }
}

function navigateTo(hash: string): void {
    history.pushState(null, '', hash);
    showView(hash, router);
}

function router(path: string): void {
    if (path === '#onboarding/recovery-phrase') {
        // displayMnemonic();
    }
    if (path === '#onboarding/confirm-recovery') {
        // displayConfirmVal();
    }
    if (path === '#onboarding/import-wallet') {
        generateRecoveryPhraseInputs();
    }
    if (path === '#onboarding/account-home') {
        // prepareAccountData();
    }
}

function setRecoverPhaseTips(isValid: boolean, errMsg: string): void {
    const errorMessage = document.getElementById('error-message') as HTMLElement | null;
    const primaryButton = document.querySelector("#view-import-wallet .primary-button") as HTMLButtonElement | null;

    if (!errorMessage || !primaryButton) {
        console.error('One or more required elements are missing.');
        return;
    }

    if (isValid) {
        errorMessage.style.display = 'none';
        primaryButton.disabled = false;
    } else {
        errorMessage.style.display = 'block';
        primaryButton.disabled = true;
    }
    errorMessage.innerText = errMsg;
}


function validateRecoveryPhrase(this: HTMLInputElement): void {
    const wordsArray = this.value.split(' ');
    let errMsg = '';
    let everyWordIsOk = true;
    const inputs = document.querySelectorAll<HTMLInputElement>("#recovery-phrase-inputs .recovery-phrase");
    const length = Number((document.getElementById('recovery-phrase-length') as HTMLInputElement).value);

    if (wordsArray.length === 1) {
        const mnemonic = wordsArray[0];
        if (!wordlist.includes(mnemonic)) {
            setRecoverPhaseTips(false, "Invalid Secret Recovery Phrase");
            return;
        }

        const inputValues: string[] = [];
        inputs.forEach(input => {
            if (!input.value) {
                return;
            }

            const wordIsOk = wordlist.includes(input.value);
            if (!wordIsOk) {
                everyWordIsOk = false;
            }
            inputValues.push(input.value);
        });

        if (!everyWordIsOk) {
            setRecoverPhaseTips(false, "Invalid Secret Recovery Phrase");
            return;
        }

        if (inputValues.length !== length) {
            setRecoverPhaseTips(false, "Secret Recovery Phrases contain 12, 15, 18, 21, or 24 words");
            return;
        }
        setRecoverPhaseTips(true, "");
        return;
    }

    if (wordsArray.length !== length) {
        errMsg = "Secret Recovery Phrases contain 12, 15, 18, 21, or 24 words";
        setRecoverPhaseTips(false, errMsg);
        return;
    }

    for (let i = 0; i < length; i++) {
        inputs[i].value = wordsArray[i];
        const wordIsOk = wordlist.includes(wordsArray[i]);
        if (!wordIsOk) {
            everyWordIsOk = false;
        }
    }
    if (!everyWordIsOk) {
        setRecoverPhaseTips(false, "Invalid Secret Recovery Phrase");
        return;
    }
    const str = wordsArray.join(' ');
    const valid = validateMnemonic(str);
    if (!valid) {
        setRecoverPhaseTips(false, "Invalid Mnemonic String");
        return;
    }

    setRecoverPhaseTips(true, "");
}

function changeInputType(this: HTMLElement): void {
    const input = this.previousElementSibling as HTMLInputElement;
    if (input.type === "password") {
        input.type = "text";
        this.textContent = "🙈"; // Change button text to indicate hiding
    } else {
        input.type = "password";
        this.textContent = "👁"; // Change button text to indicate showing
    }
}
