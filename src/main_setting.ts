import {sessionGet, sessionSet} from "./common";
import {__currentDatabaseVersion, __tableSystemSetting, databaseUpdate, getMaxIdRecord} from "./database";
const __key_system_setting: string = '__key_system_setting__';

export class SysSetting {
    id: number;
    address: string;
    network: string;

    constructor(id: number, addr: string, network: string) {
        this.id = id;
        this.address = addr;
        this.network = network;
    }

    async syncToDB(): Promise<void> {
        await databaseUpdate(__tableSystemSetting, this.id, this);
    }
}


async function loadSystemSettingFromDB(): Promise<SysSetting> {
    const ss = await getMaxIdRecord(__tableSystemSetting);
    if (ss) {
        return new SysSetting(ss.id, ss.address, ss.network);
    }
    return new SysSetting(__currentDatabaseVersion, '', '');
}

export async function loadSystemSetting(): Promise<SysSetting> {

    const settingString = await sessionGet(__key_system_setting);
    if (settingString) {
        const obj =  JSON.parse(settingString);
        return new SysSetting(obj.id, obj.address, obj.network);
    }

    const obj = await loadSystemSettingFromDB();
    await sessionSet(__key_system_setting, JSON.stringify(obj));

    return obj;
}

export async function updateSetting(setting: SysSetting): Promise<void> {
    await sessionSet(__key_system_setting, JSON.stringify(setting));
    await setting.syncToDB();
}


export function initSettingArea() {

}

export function setupSettingArea(): void {

}

