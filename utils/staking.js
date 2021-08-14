import Web3 from "web3";
import { createRequire } from "module";
import dotenv from "dotenv";

dotenv.config();
const require = createRequire(import.meta.url);
const STAKING_AURA_ABI = require("../contracts/test.json");
const { HOME_RPC, STAKING_AURA_ADDRESS } = process.env;
console.log({ HOME_RPC, STAKING_AURA_ADDRESS });
const web3 = new Web3(HOME_RPC);

const StakingAura = new web3.eth.Contract(
  STAKING_AURA_ABI,
  STAKING_AURA_ADDRESS
);

export const getStakingMetaData = async () => {
  const block = await web3.eth.getBlockNumber();
  const epoch = await StakingAura.methods.stakingEpoch().call();
  const stakingEpochEndBlock = await StakingAura.methods
    .stakingEpochEndBlock()
    .call();
  const nextEpocBlock = stakingEpochEndBlock - block;

  const candi_temp = await StakingAura.methods.candidateMinStake().call();
  const can_min = await web3.utils.fromWei(candi_temp);

  const del_temp = await StakingAura.methods.delegatorMinStake().call();
  const del_min = await web3.utils.fromWei(del_temp);
  return {
    blockNum: block,
    epoch,
    nextEpoch: nextEpocBlock,
    candidateMin: can_min,
    delegatorMin: del_min,
  };
};

export const getPools = async () => {
  const pools = await StakingAura.methods.getPools.call().call();
  const poolIDPromises = pools.map((pool) => web3.utils.toBN(pool).toString());
  const poolIDs = await Promise.all(poolIDPromises);

  const poolDelegatorsPromises = pools.map(async (id) => {
    const delegators = await StakingAura.methods.poolDelegators(id).call();
    const res = delegators.map(async (delegator) => {
      const amount = await StakingAura.methods
        .stakeAmount(id, delegator)
        .call();
      return {
        delegator,
        amount,
      };
    });
    return await Promise.all(res);
  });

  const poolDelegator = await Promise.all(poolDelegatorsPromises);
  const stakeAmount = [],
    stakeAmountTotal = [];
  for (let i = 0; i < pools.length; i++) {
    const res_stake = await StakingAura.methods
      .stakeAmount(pools[i], pools[i])
      .call();
    const amount = await web3.utils.fromWei(res_stake);
    const res_total = await StakingAura.methods
      .stakeAmountTotal(pools[i])
      .call();
    const total = await web3.utils.fromWei(res_total);
    stakeAmount.push(amount);
    stakeAmountTotal.push(total);
  }

  const isPoolActivePromises = pools.map((i) =>
    StakingAura.methods.isPoolActive(i).call()
  );
  const isActive = await Promise.all(isPoolActivePromises);

  // const candidates = await Candidate.find({});
  // const canPoolAddrs = candidates.map((i) => i.addedPoolAddr);

  const res = pools.map((i, ind) => ({
    pool: i,
    stakeAmount: stakeAmount[ind],
    stakeAmountTotal: stakeAmountTotal[ind],
    poolID: poolIDs[ind],
    poolDelegator: poolDelegator[ind],
    // poolName: canPoolAddrs.includes(i)
    //   ?
    //   candidates[canPoolAddrs.indexOf(i)].poolName

    //   : `pool_${ind}`,
    // poolDesc: canPoolAddrs.includes(i)
    //   ?
    //   candidates[canPoolAddrs.indexOf(i)].poolDesc

    //   : `pool_${ind} description`,
    isActive: isActive[ind],
  }));
  return res;
};

export const getStakeAmount = async (poolID, delegator) => {
  const res = await StakingAura.methods.stakeAmount(poolID, delegator).call();
  const stake = await web3.utils.fromWei(res);
  return stake;
};
