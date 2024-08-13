import {initDatabase} from "./database";
import {MsgType, showView,loadLocalWallet,saveWallet} from "./common";
import {generateMnemonic, validateMnemonic, wordlists} from 'bip39';
import {newWallet} from "./dessage/wallet";
import browser from "webextension-polyfill";

let __key_for_mnemonic_temp = '__key_for_mnemonic_temp__';
let ___mnemonic_in_mem: string | null = null;
const wordlist = wordlists.english;

document.addEventListener("DOMContentLoaded", initWelcomePage as EventListener);

async function initWelcomePage(): Promise<void> {
    await initDatabase();
    initWelcomeDiv();
    initPasswordDiv();
    initMnemonicDiv();
    initMnemonicConfirmDiv();
    initImportPasswordDiv();

    window.addEventListener('hashchange', function () {
        showView(window.location.hash, router);
    });

    showView(window.location.hash || '#onboarding/welcome', router);

    (window as any).navigateTo = navigateTo;
}

function initWelcomeDiv(): void {
    const agreeCheckbox = document.getElementById('welcome-agree') as HTMLInputElement;
    const createButton = document.getElementById('welcome-create') as HTMLButtonElement;
    const importButton = document.getElementById('welcome-import') as HTMLButtonElement;

    createButton.addEventListener('click', () => {
        navigateTo('#onboarding/create-password');
    });

    createButton.disabled = !agreeCheckbox.checked;
    agreeCheckbox.addEventListener('change', () => {
        createButton.disabled = !agreeCheckbox.checked;
    });

    importButton.addEventListener('click', importWallet);
}

function initPasswordDiv(): void {
    const passwordAgreeCheckbox = document.getElementById('password-agree') as HTMLInputElement;
    const createPasswordButton = document.querySelector('#view-create-password .primary-button') as HTMLButtonElement;
    createPasswordButton.disabled = !passwordAgreeCheckbox.checked;
    createPasswordButton.addEventListener('click', createWallet);

    passwordAgreeCheckbox.addEventListener('change', checkImportPassword);

    const newPasswordInput = document.getElementById("new-password") as HTMLInputElement ;
    const confirmPasswordInput = document.getElementById("confirm-password") as HTMLInputElement;
    newPasswordInput.addEventListener('input', checkImportPassword);
    confirmPasswordInput.addEventListener('input', checkImportPassword);

    const showPasswordButtons = document.querySelectorAll('.show-password') as NodeListOf<HTMLButtonElement>;
    showPasswordButtons.forEach(button => {
        button.addEventListener('click', showPassword);
    });
}

async function createWallet(): Promise<void> {
    const password1 = (document.getElementById("new-password") as HTMLInputElement).value;
    const password2 = (document.getElementById("confirm-password") as HTMLInputElement).value;

    if (password1 !== password2) {
        alert("Passwords are not the same");
        return;
    }

    if (password1.length === 0) {
        alert("Password is invalid");
        return;
    }

    const mnemonic = generateMnemonic();
    ___mnemonic_in_mem = mnemonic;
    sessionStorage.setItem(__key_for_mnemonic_temp, mnemonic);
    navigateTo('#onboarding/recovery-phrase');
    displayMnemonic();

    const wallet = newWallet(mnemonic, password1);
    await saveWallet(wallet);

    browser.runtime.sendMessage({action: MsgType.WalletCreated})
        .then(response => {
            console.log("Message sent successfully", response);
        })
        .catch(error => {
            console.error("Error sending message:", error);
        });
}

function importWallet(): void {
    navigateTo('#onboarding/import-wallet');
    generateRecoveryPhraseInputs();
}

function generateRecoveryPhraseInputs(): void {
    setRecoverPhaseTips(false, '');

    const lengthElement = document.getElementById('recovery-phrase-length') as HTMLInputElement ;
    const recoveryPhraseInputs = document.getElementById('recovery-phrase-inputs') as HTMLElement ;
    const template = document.getElementById("recovery-phrase-row-template") as HTMLTemplateElement ;

    const length = parseInt(lengthElement.value, 10);
    recoveryPhraseInputs.innerHTML = '';

    for (let i = 0; i < length; i += 3) {
        const rowDiv = template.cloneNode(true) as HTMLElement;
        rowDiv.style.display = 'grid';
        rowDiv.id = '';
        recoveryPhraseInputs.appendChild(rowDiv);
        rowDiv.querySelectorAll("input").forEach(input => {
            input.addEventListener('input', validateRecoveryPhrase);
            const nextSibling = input.nextElementSibling as HTMLElement;
                nextSibling.addEventListener('click', changeInputType);
        });
    }
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

function setRecoverPhaseTips(isValid: boolean, errMsg: string): void {
    const errorMessage = document.getElementById('error-message') as HTMLElement;
    const primaryButton = document.querySelector("#view-import-wallet .primary-button") as HTMLButtonElement;

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


function displayConfirmVal(): void {
    if (!___mnemonic_in_mem) {
        ___mnemonic_in_mem = sessionStorage.getItem(__key_for_mnemonic_temp);
    }

    if (!___mnemonic_in_mem) {
        console.error('No mnemonic found in session storage.');
        return;
    }

    const wordsArray: string[] = ___mnemonic_in_mem.split(' ');
    const indices = new Map<number, boolean>();
    while (indices.size < 3) {
        const randomIndex = Math.floor(Math.random() * wordsArray.length);
        if (!indices.get(randomIndex)) {
            indices.set(randomIndex, true);
        }
    }

    const mnemonicContainer = document.querySelector(".recovery-phrase-grid") as HTMLElement;
    mnemonicContainer.innerHTML = '';

    wordsArray.forEach((word, index) => {
        let div: HTMLElement;
        if (indices.get(index)) {
            const template = document.getElementById("phrase-item-writeOnly") as HTMLElement;
            div = template.cloneNode(true) as HTMLElement;
            div.classList.add('hidden-word');
            div.dataset.correctWord = wordsArray[index];
            const input = div.querySelector(".recovery-input") as HTMLInputElement;
                input.addEventListener('input', checkConfirmUserPhrase);
        } else {
            const template = document.getElementById("phrase-item-readOnly") as HTMLElement;
            div = template.cloneNode(true) as HTMLElement;
            const input = div.querySelector(".recovery-input") as HTMLInputElement;
                input.value = word;
        }
        div.id = '';
        div.style.display = 'block';
        const indexElement = div.querySelector(".phrase-item-index") as HTMLElement;
        indexElement.innerText = (index + 1).toString();
        mnemonicContainer.appendChild(div);
    });
}

function checkConfirmUserPhrase(this: HTMLInputElement): void {
    const form = this.closest('form') as HTMLFormElement;
    let confirmIsOk = true;
    form.querySelectorAll(".hidden-word").forEach(div => {
        const element = div as HTMLElement;
        const input = element.querySelector(".recovery-input") as HTMLInputElement;
        if (element.dataset.correctWord !== input.value) {
            confirmIsOk = false;
            if (input.value.length > 0) {
                element.classList.add('error-message');
            }
        } else {
            element.classList.remove('error-message');
        }
    });

    const primaryButton = form.querySelector(".primary-button") as HTMLButtonElement;
    primaryButton.disabled = !confirmIsOk;
}

function displayMnemonic(): void {
    if (!___mnemonic_in_mem) {
        ___mnemonic_in_mem = sessionStorage.getItem(__key_for_mnemonic_temp);
    }

    if (!___mnemonic_in_mem) {
        console.error('No mnemonic found in session storage.');
        return;
    }

    const wordsArray = ___mnemonic_in_mem.split(' ');
    const mnemonicContainer = document.querySelector(".recovery-phrase-container") as HTMLElement;
    mnemonicContainer.innerHTML = ''; // 清空以前的内容

    wordsArray.forEach((word, index) => {
        const template = document.getElementById("recovery-phrase-item-template") as HTMLElement;
        const div = template.cloneNode(true) as HTMLElement;
        div.style.display = 'block';
        const indexElement = div.querySelector(".phrase-item-index") as HTMLElement;
        const valueElement = div.querySelector(".phrase-item-value") as HTMLElement;
        indexElement.innerText = (index + 1).toString();
        valueElement.innerText = word;
        mnemonicContainer.appendChild(div);
    });
}

function checkImportPassword(this: HTMLInputElement): void {
    const form = this.closest('form') as HTMLFormElement;
    const okBtn = form.querySelector(".primary-button") as HTMLButtonElement;

    const pwd: string[] = [];
    form.querySelectorAll("input").forEach(input => {
        if (input.type === 'password' || input.type === 'text') {
            pwd.push(input.value);
        }
    });

    const errMsg = form.querySelector(".error-message") as HTMLElement;
    if (pwd[0].length < 8 && pwd[0].length > 0) {
        errMsg.innerText = "Password must be longer than 8 characters";
        errMsg.style.display = 'block';
        okBtn.disabled = true;
        return;
    }

    if (pwd[0] !== pwd[1]) {
        errMsg.innerText = "Passwords are not the same";
        errMsg.style.display = 'block';
        okBtn.disabled = true;
        return;
    }

    errMsg.innerText = '';
    errMsg.style.display = 'none';
    const checkbox = form.querySelector('input[type="checkbox"]') as HTMLInputElement;
    okBtn.disabled = !(checkbox.checked && pwd[0].length >= 8);
}

function showPassword(this: HTMLElement): void {
    const form = this.closest('form') as HTMLFormElement;
    form.querySelectorAll("input").forEach(input => {
        if (input.type === 'password' || input.type === 'text') {
            input.type = input.type === 'password' ? 'text' : 'password';
        }
    });

    if (this.textContent === 'Show') {
        this.textContent = 'Hide';
    } else {
        this.textContent = 'Show';
    }
}

function prepareAccountData() {
    loadLocalWallet().then((data) => {
        console.log(data)
    })
}

function initMnemonicDiv(): void {
    const nextBtnForConfirm = document.querySelector('#view-recovery-phrase .primary-button') as HTMLButtonElement;
    nextBtnForConfirm.addEventListener('click', nextToConfirmPage);

    const hideSeedButton = document.getElementById("view-recovery-phrase-hide-seed") as HTMLButtonElement;
    hideSeedButton.addEventListener('click', hideSeedDiv);

    const copySeedButton = document.getElementById("view-recovery-phrase-copy-seed") as HTMLButtonElement;
    copySeedButton.addEventListener('click', () => {
        if (!___mnemonic_in_mem) {
            return;
        }
        navigator.clipboard.writeText(___mnemonic_in_mem).then(() => {
            alert("Copy success");
        }).catch(err => {
            console.error('Error copying text: ', err);
        });
    });
}

function nextToConfirmPage() {
    navigateTo('#onboarding/confirm-recovery');
    displayConfirmVal();
}

function hideSeedDiv(this: HTMLElement): void {
    const recoveryPhraseContainer = document.querySelector('.recovery-phrase-container') as HTMLElement;
    const seedPhraseVisible = recoveryPhraseContainer.dataset.visible === 'true';
    recoveryPhraseContainer.classList.toggle('hidden-seed-phrase');
    if (seedPhraseVisible) {
        this.textContent = 'Reveal seed phrase';
    } else {
        this.textContent = 'Hide seed phrase';
    }
    recoveryPhraseContainer.dataset.visible = String(!seedPhraseVisible);
}

function initMnemonicConfirmDiv(): void {
    const confirmPhraseBtn = document.querySelector("#view-confirm-recovery .primary-button") as HTMLButtonElement;
    confirmPhraseBtn.addEventListener('click', confirmUserInputPhrase);

    const recoveryPhraseLength = document.getElementById('recovery-phrase-length') as HTMLInputElement;
    recoveryPhraseLength.addEventListener('change', generateRecoveryPhraseInputs);
    const confirmRecoverBtn = document.querySelector('#view-import-wallet .primary-button') as HTMLButtonElement;
    confirmRecoverBtn.addEventListener('click', confirmImportedWallet);
}

function confirmUserInputPhrase(): void {
    ___mnemonic_in_mem = null;
    sessionStorage.removeItem(__key_for_mnemonic_temp);
    navigateTo('#onboarding/account-home');
}

function initImportPasswordDiv(): void {
    const importBtn = document.querySelector("#view-password-for-imported .primary-button") as HTMLButtonElement;
    importBtn.addEventListener('click', actionOfWalletImport);

    const importedPasswordAgree = document.getElementById('imported-password-agree') as HTMLInputElement;
    importedPasswordAgree.addEventListener('change', checkImportPassword);

    const importedNewPassword = document.getElementById("imported-new-password") as HTMLInputElement;
    importedNewPassword.addEventListener('input', checkImportPassword);

    const importedConfirmPassword = document.getElementById("imported-confirm-password") as HTMLInputElement;
    importedConfirmPassword.addEventListener('input', checkImportPassword);
}

function confirmImportedWallet(): void {
    const inputs = document.querySelectorAll("#recovery-phrase-inputs .recovery-phrase") as NodeListOf<HTMLInputElement>;
    const inputValues: string[] = [];

    inputs.forEach(input => {
        inputValues.push(input.value);
    });

    const mnemonic = inputValues.join(' ');
    const valid = validateMnemonic(mnemonic);

    if (!valid) {
        alert("Invalid mnemonic data");
        return;
    }

    ___mnemonic_in_mem = mnemonic;
    sessionStorage.setItem(__key_for_mnemonic_temp, mnemonic);
    navigateTo('#onboarding/password-for-imported');
}

async function actionOfWalletImport(): Promise<void> {
    const passwordInput = document.getElementById("imported-new-password") as HTMLInputElement;
    const password = passwordInput.value;

    if (!___mnemonic_in_mem) {
        navigateTo('#onboarding/welcome');
        return;
    }

    const wallet = newWallet(___mnemonic_in_mem, password);
    await saveWallet(wallet)
        .then(key => console.log(`Added item with key: ${key}`))
        .catch(error => console.error(`Failed to add item: ${error}`));

    browser.runtime.sendMessage({action: MsgType.WalletCreated})
        .then(response => {
            console.log("Message sent successfully", response);
        })
        .catch(error => {
            console.error("Error sending message:", error);
        });

    ___mnemonic_in_mem = null;
    sessionStorage.removeItem(__key_for_mnemonic_temp);
    navigateTo('#onboarding/account-home');
}