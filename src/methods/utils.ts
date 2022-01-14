import { ApiPromise, WsProvider } from "@polkadot/api";
import { typesBundlePre900 } from "moonbeam-types-bundle";
import { NetworkType } from "./types";

export const moonbeamChains = ["moonbase", "moonbeam", "moonriver", "moonshadow"];
export const relayChains = ["kusama", "polkadot", "westend", "rococo"];
export const authorizedChains = moonbeamChains.concat(relayChains);
export const ALITH = "0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac";
export const BALTATHAR = "0x3Cd0A705a2DC65e5b1E1205896BaA2be8A07c6e0";

export const testnetWs = "wss://wss.testnet.moonbeam.network";

export function isNetworkType(type: string): NetworkType {
  if (["sr25519", "ethereum"].includes(type)) {
    return type as NetworkType;
  } else {
    return "ethereum";
  }
}

export function exit() {
  process.exit();
}

export async function retrieveApi(network: string, ws: string): Promise<ApiPromise> {
  let api: ApiPromise;
  if (moonbeamChains.includes(network)) {
    api = await ApiPromise.create({
      provider: new WsProvider(ws),
      typesBundle: typesBundlePre900 as any,
    });
  } else {
    api = await ApiPromise.create({
      provider: new WsProvider(ws),
    });
  }
  return api;
}
