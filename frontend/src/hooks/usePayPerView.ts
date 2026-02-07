import { openContractCall } from '@stacks/connect';
import { 
  uintCV, 
  stringAsciiCV, 
  PostConditionMode,
  FungibleConditionCode,
  makeStandardSTXPostCondition
} from '@stacks/transactions';
import { useAuth } from '@/contexts/AuthContext';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '@/utils/constants';
import { StacksMainnet, StacksTestnet } from '@stacks/network';

export const usePayPerView = () => {
  const { userSession, stxAddress } = useAuth();
  const network = process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet' ? new StacksMainnet() : new StacksTestnet();

  const addContent = async (contentId: number, priceStx: number, uri: string) => {
    // Convert STX to micro-STX
    const priceMicroStx = priceStx * 1000000;

    return new Promise((resolve, reject) => {
      openContractCall({
        network,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'add-content',
        functionArgs: [
          uintCV(contentId),
          uintCV(priceMicroStx),
          stringAsciiCV(uri)
        ],
        postConditionMode: PostConditionMode.Deny,
        onFinish: (data) => {
          console.log('Transaction sent:', data.txId);
          resolve(data.txId);
        },
        onCancel: () => {
          console.log('Transaction cancelled');
          reject(new Error('Transaction cancelled by user'));
        },
      });
    });
  };

  const purchaseContent = async (contentId: number, priceStx: number, creatorAddress: string) => {
    if (!stxAddress) throw new Error("Wallet not connected");

    const priceMicroStx = priceStx * 1000000;

    // Post condition: sender transfers exactly priceMicroStx to creator
    const postCondition = makeStandardSTXPostCondition(
      stxAddress,
      FungibleConditionCode.Equal,
      priceMicroStx
    );

    return new Promise((resolve, reject) => {
      openContractCall({
        network,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'purchase-content',
        functionArgs: [uintCV(contentId)],
        postConditions: [postCondition],
        postConditionMode: PostConditionMode.Deny,
        onFinish: (data) => {
          console.log('Purchase transaction sent:', data.txId);
          resolve(data.txId);
        },
        onCancel: () => {
          console.log('Purchase cancelled');
          reject(new Error('Transaction cancelled by user'));
        },
      });
    });
  };

  return { addContent, purchaseContent };
};
