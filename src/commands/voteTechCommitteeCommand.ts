import { Argv } from "yargs";
import { VoteCouncilArgs } from "../methods/types";
import { voteTechCommitteePrompt } from "../methods/voteTechCommittee";
import { specificTxOptions } from "./voteCouncilCommand";
import { exit } from "../methods/utils";

export const voteTechCommitteeCommand = {
  command: "voteTechCommittee",
  describe: "creates a tech committee vote payload, prompts for signature and sends it",
  builder: (yargs: Argv) => {
    return yargs.options(specificTxOptions);
  },
  handler: async (argv: VoteCouncilArgs) => {
    if (!argv["address"]) {
      console.log(`Missing address`);
      return;
    }
    if (!argv["ws"]) {
      console.log(`Missing ws`);
      return;
    }
    if (!argv["network"]) {
      console.log(`Missing network`);
      return;
    }
    await voteTechCommitteePrompt(argv.address, { ws: argv.ws, network: argv.network });
    exit();
  },
};
