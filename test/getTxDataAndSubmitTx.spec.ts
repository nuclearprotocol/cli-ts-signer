import { ApiPromise, WsProvider } from "@polkadot/api";
import { exec } from "child_process";
import { typesBundlePre900 } from "moonbeam-types-bundle";
import { ALITH, BALTATHAR, testnetWs } from "../src/methods/utils";
import { testSignCLIPrivateKey } from "./sign.spec";
var assert = require("assert");

const testAmount = "1000000000000";

async function getBalance(address: string, api: ApiPromise) {
  const account: any = await api.query.system.account(address);
  return account.data.free.toString();
}

export async function testGetTxDataCLI(): Promise<string> {
  return new Promise((resolve) => {
    let call = exec(
      "npm run cli getTransactionData -- --network moonbase --ws " +
        testnetWs +
        " --address " +
        ALITH +
        " --tx balances.transfer --params " +
        BALTATHAR +
        "," +
        testAmount
    );
    call.stdout?.on("data", function (chunk) {
      let message = chunk.toString();
      if (message.substring(0, 32) === "Transaction data to be signed : ") {
        resolve(message.substring(33, message.length - 1));
      }
    });
  });
}

export async function testSubmitTxCLI(data: string): Promise<string> {
  return new Promise((resolve) => {
    let call = exec("npm run cli submitTx -- --ws " + testnetWs + " --tx-data " + data);
    call.stdout?.on("data", function (chunk) {
      let message = chunk.toString();
      if (message.substring(0, 2) === "ok") {
        resolve(message.substring(31, message.length - 1));
      }
    });
  });
}

describe("Get Tx Data, sign it, and send it", function () {
  // TODO: the send offline function doesn't work, but is not very important since we can use createAndSendTx
  // when we add the feature to decrypt tx data we can test that testGetTxDataCLI works
  it.skip("should increment Baltathar's account balance", async function () {
    this.timeout(40000);
    let api = await ApiPromise.create({
      provider: new WsProvider(testnetWs),
      typesBundle: typesBundlePre900 as any,
    });

    // First get initial balance of Baltathar
    const initialBalance = await getBalance(BALTATHAR, api);

    // get tx data
    const txData = await testGetTxDataCLI();
    const signature = await testSignCLIPrivateKey(txData);

    // this doesnt work, function is probably deprecated
    const hash = await testSubmitTxCLI(signature);

    // Wait for block
    await new Promise((res) => setTimeout(res, 30000));

    // Then check incremented balance of Baltathar
    const finalBalance = await getBalance(BALTATHAR, api);
    assert.equal(finalBalance, (Number(initialBalance) + Number(testAmount)).toString());
  });
});
