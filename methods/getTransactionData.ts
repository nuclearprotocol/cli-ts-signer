import { ApiPromise, WsProvider } from "@polkadot/api";
import { u8aToHex } from "@polkadot/util";
import { typesBundle } from "moonbeam-types-bundle";
import { SignerPayloadJSON } from "@polkadot/types/types";
import { moonbeamChains, needParam } from "./utils";
import { SignerResult } from "@polkadot/api/types";

export async function getTransactionData(argv: { [key: string]: string }) {
  needParam("tx", "getTransactionData", argv);
  needParam("params", "getTransactionData", argv);
  needParam("ws", "getTransactionData", argv);
  needParam("address", "getTransactionData", argv);
  let { tx, params, ws, address, network } = argv;
  const [section, method] = tx.split(".");
  const splitParams = params.split(",");
  let  api :ApiPromise
  if (moonbeamChains.includes(network)){
    api=await ApiPromise.create({
      provider: new WsProvider(ws),
      typesBundle: typesBundle as any,
    });
  } else {
    api=await ApiPromise.create({
      provider: new WsProvider(ws)
    });
  }
  let txExtrinsic = await api.tx[section][method](...splitParams);
  const signer = {
    signPayload: (payload: SignerPayloadJSON) => {
      console.log("(sign)", payload);

      // create the actual payload we will be using
      const xp = txExtrinsic.registry.createType("ExtrinsicPayload", payload);
      console.log("Transaction data to be signed", u8aToHex(xp.toU8a(true)));

      return new Promise<SignerResult>((resolve) => {
        resolve({ id: 1, signature: "" });
      });
    },
  };
  await txExtrinsic.signAsync(address, { signer });
}
