import { ApiPromise } from "@polkadot/api";
import prompts from "prompts";
import { retrieveApi } from "./utils";
import { NetworkArgs, Vote } from "./types";
import { createAndSendTx } from "./createAndSendTx";

export async function retrieveMotions(api: ApiPromise): Promise<
  {
    index: number;
    hash: string;
    text: string;
  }[]
> {
  // Keeps compatibility with previous name
  const techCommitteeQuery =
    api.query["techCommitteeCollective" as "council"] ||
    api.query["techComitteeCollective" as "council"];

  const hashes = (await techCommitteeQuery.proposals()) as any;
  const motionList = (await techCommitteeQuery.proposalOf.multi(hashes)) as any;
  const votes = (await techCommitteeQuery.voting.multi(hashes)) as any;

  return await Promise.all(
    motionList.map(async (motionData: any, index: any) => {
      const motion = motionData.unwrap();
      const vote = votes[index].unwrap();
      const hash = hashes.toArray()[index].toHex();

      console.log(`[${vote.index}] ${motion.section}.${motion.method}`);
      const data = {
        index: Number(vote.index),
        hash,
        text: "",
      };
      if (
        motion.method == "externalProposeMajority" ||
        motion.method == "externalProposeDefault" ||
        motion.method == "externalPropose"
      ) {
        const preimageData = (await api.query.democracy.preimages(motion.args[0])) as any;
        const proposal =
          preimageData.toHuman() && preimageData.unwrap().isAvailable
            ? api.registry.createType(
                "Proposal",
                preimageData.unwrap().asAvailable.data.toU8a(true)
              )
            : null;

        if (proposal) {
          data.text = `[${vote.index}] ${motion.method} - ${proposal.section}.${
            proposal.method
          }: ${Object.keys((proposal.toHuman() as any).args)
            .map((argKey) => {
              const text = `${argKey}:${(proposal.toHuman() as any).args[argKey]}`;
              return `${
                text.length > 100
                  ? `${text.substring(0, 7)}..${text.substring(text.length - 4)}`
                  : text
              }`;
            })
            .join(`, `)}`;
        }
      } else {
        data.text = `[${vote.index}] ${motion.section}.${motion.method}`;
      }
      return data;
    })
  );
}

export async function voteTechCommitteePrompt(address: string, networkArgs: NetworkArgs) {
  const api = await retrieveApi(networkArgs.network, networkArgs.ws);

  // Retrieve list of motions
  const motions = await retrieveMotions(api);

  // Multiselect allows the user to chose multiple motions to vote for
  const motionSelection = await prompts({
    type: "multiselect",
    name: "index",
    message: "Pick motion",
    choices: motions.map((motion, i) => {
      return {
        title: `[Motion #${motion.index}] ${motion.text || `Not available - hash ${motion.hash}`}`,
        value: i,
      };
    }),
  });
  if (!motionSelection.index || motionSelection.index.length === 0) {
    throw new Error("There are no motions to vote for");
  }

  // For each selected motion, let the user chose a vote
  let votes: Vote[] = [];
  for (let j = 0; j < motionSelection.index.length; j++) {
    let i = motionSelection.index[j];
    const selectedMotion = motions[i];

    if (!selectedMotion) {
      console.log(`Selected motion doesn't exist`);
      return;
    }

    let vote: Vote = await prompts({
      type: "select",
      name: "yes",
      message: `Pick a vote for [Motion #${selectedMotion.index}] ${
        selectedMotion.text || `Not available - hash ${selectedMotion.hash}`
      }`,
      choices: [
        { title: "Yes", value: true },
        { title: "No", value: false },
      ],
    });
    console.log(
      `You are voting ${vote.yes} for [${selectedMotion.index} - ${selectedMotion.hash}]`
    );
    console.log(`  ${selectedMotion.text}`);
    votes.push(vote);
  }

  // If more than one motion, use batch utility
  const txArgs =
    votes.length === 1
      ? {
          address,
          tx: `techCommitteeCollective.vote`,
          params: [
            motions[motionSelection.index[0]].hash,
            motions[motionSelection.index[0]].index,
            votes[0].yes,
          ],
        }
      : {
          address,
          tx: `utility.batch`,
          params: [
            votes.map((vote: Vote, i: number) => {
              let selectedMotion = motions[motionSelection.index[i]];
              return api.tx.techCommitteeCollective.vote(
                selectedMotion.hash,
                selectedMotion.index,
                vote.yes
              );
            }),
          ],
        };
  return createAndSendTx(txArgs, networkArgs, async (payload: string) => {
    const response = await prompts({
      type: "text",
      name: "signature",
      message: "Please enter signature for + " + payload + " +",
      validate: (value) => true, // TODO: add validation
    });
    return response["signature"].trim();
  });
}
