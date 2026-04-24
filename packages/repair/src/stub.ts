import type { RepairProposer } from "./types.js";

/** Default CLI proposer until an LLM or scripted adapter is wired. */
export function stubRepairProposer(): RepairProposer {
  return {
    propose: async () => null,
  };
}
