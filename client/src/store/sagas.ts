import { takeEvery } from "redux-saga/effects";
import {
  JsonRpcProvider,
  Transaction,
  TransactionResponse,
  TransactionReceipt,
  BrowserProvider,
  Signer,
  parseEther,
  formatEther,
} from "ethers";

import apolloClient from "../apollo/client";
import { Actions } from "../types";
import { SaveTransaction } from "../queries";
import { navigate } from "../components/NaiveRouter";
declare global {
  interface Window {
    HSOverlay: any;
  }
}

function* sendTransaction(action: any) {
  const provider = new JsonRpcProvider("http://localhost:8545");

  // this could have been passed along in a more elegant fashion,
  // but for the purpouses of this scenario it's good enough
  // @ts-ignore
  const walletProvider = new BrowserProvider(window.web3.currentProvider);

  const signer: Signer = yield walletProvider.getSigner();

  const accounts: Array<{ address: string }> = yield provider.listAccounts();

  // Parse amount to ensure blocknative can read the amount properly
  const transaction = {
    to: action.payload.to,
    value: parseEther(action.payload.amount),
  };

  try {
    const txResponse: TransactionResponse = yield signer.sendTransaction(
      transaction
    );
    const response: TransactionReceipt = yield txResponse.wait();

    const receipt: Transaction = yield response.getTransaction();
    //formatted the values to make transaction values more readable instead of BigNumbers
    const formattedValue = formatEther(receipt.value);
    const variables = {
      transaction: {
        gasLimit: (receipt.gasLimit && receipt.gasLimit.toString()) || "0",
        gasPrice: (receipt.gasPrice && receipt.gasPrice.toString()) || "0",
        to: receipt.to,
        from: receipt.from,
        value: (formattedValue && formattedValue.toString()) || "",
        data: receipt.data || null,
        chainId: (receipt.chainId && receipt.chainId.toString()) || "123456",
        hash: receipt.hash,
      },
    };

    yield apolloClient.mutate({
      mutation: SaveTransaction,
      variables,
    });

    yield navigate(`/transaction/${receipt.hash}`);

    //Closing the modal using its id and class method once everything had been added to database successfully
    const $modalEl: any = document.getElementById("hs-basic-modal");
    yield window.HSOverlay.close($modalEl);
  } catch (error: any) {
    //quick alert to show errors caught in this catch that are related to transaction validation
    //- avoiding rejected since thats thrown in this error

    if (error.reason !== "rejected") {
      alert(error.shortMessage);
      console.error(error);
    }
  }
}

export function* rootSaga() {
  yield takeEvery(Actions.SendTransaction, sendTransaction);
}
