import {injectDessage} from "./inject_dessage";
import {injectNostr} from "./inject_nostr";
import {initTwitterInfo} from "./inject_twitter";
export const __injectRequests: { [key: string]: InjectRequest } = {};

interface InjectRequest {
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
}

interface EventData {
    id?: string;
    result?: any;
    error?: any;
    source?: string;
}

window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window || !event.data || (event.data as EventData).source !== "dessage-response") {
        return;
    }

    const { id, result, error } = event.data as EventData;
    if (id && __injectRequests[id]) {
        const { resolve, reject } = __injectRequests[id];
        if (error) {
            reject(error);
        } else {
            resolve(result);
        }
        delete __injectRequests[id];
    }

    console.log("Response from background:", result);
});

function commonInit(){

    if (!window.dessage){
        injectDessage();
    }

    if (!window.nostr){
        injectNostr();
    }

    const hostname = window.location.hostname;
    if (hostname.includes("x.com")) {
        initTwitterInfo();
    }

    console.log(`injection:----->>>hostname=${hostname} 
    dessage version=${window.dessage?.version}
    nostr version =${window.nostr?.version}
    `);
}
commonInit();