import { getPools } from "./utils/staking.js";

// getPools();

const main = async () => {
  const pools = await getPools();
  console.log("number of pools:", pools.length);
  console.log(pools);
};

main();
