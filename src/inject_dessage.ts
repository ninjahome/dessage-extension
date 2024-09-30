export function injectDessage() {
    window.dessage = {
        version: '1.0.5',
        connect:  ()=> {
            console.log('Connecting to Dessage...');
        }
    };
}