import {
  CryptoDevsDAOABI,
  CryptoDevsDAOAddress,
  CryptoDevsNFTABI,
  CryptoDevsNFTAddress,
} from "@/constants";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Head from "next/head";
import { useEffect, useState } from "react";
import { formatEther } from "viem/utils";
import { useAccount, useBalance, useContractRead } from "wagmi";
import { readContract, waitForTransaction, writeContract } from "wagmi/actions";
import styles from "../styles/Home.module.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export default function Home() {
  // Check if the user's wallet is connected, and it's address using Wagmi's hooks.
  const { address, isConnected } = useAccount();

  // State variable to know if the component has been mounted yet or not
  const [isMounted, setIsMounted] = useState(false);

  // State variable to show loading state when waiting for a transaction to go through
  const [loading, setLoading] = useState(false);

  // Fake NFT Token ID to purchase. Used when creating a proposal.
  const [fakeNftTokenId, setFakeNftTokenId] = useState("");
  // State variable to store all proposals in the DAO
  const [proposals, setProposals] = useState([]);
  // State variable to switch between the 'Create Proposal' and 'View Proposals' tabs
  const [selectedTab, setSelectedTab] = useState("");

  // Fetch the owner of the DAO
  // const daoOwner = useContractRead({
  //   abi: CryptoDevsDAOABI,
  //   address: CryptoDevsDAOAddress,
  //   functionName: "owner",
  // });

  // Fetch the balance of the DAO
  const daoBalance = useBalance({
    address: CryptoDevsDAOAddress,
  });

  // Fetch the number of proposals in the DAO
  const numOfProposalsInDAO = useContractRead({
    abi: CryptoDevsDAOABI,
    address: CryptoDevsDAOAddress,
    functionName: "numProposals",
  });

  // Fetch the CryptoDevs NFT balance of the user
  const nftBalanceOfUser = useContractRead({
    abi: CryptoDevsNFTABI,
    address: CryptoDevsNFTAddress,
    functionName: "balanceOf",
    args: [address],
  });

  // Function to make a createProposal transaction in the DAO
  async function createProposal() {
    setLoading(true);

    try {
      const tx = await writeContract({
        address: CryptoDevsDAOAddress,
        abi: CryptoDevsDAOABI,
        functionName: "createProposal",
        args: [fakeNftTokenId],
      });

      await waitForTransaction(tx);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }

  // Function to fetch a proposal by it's ID
  async function fetchProposalById(id) {
    try {
      const proposal = await readContract({
        address: CryptoDevsDAOAddress,
        abi: CryptoDevsDAOABI,
        functionName: "proposals",
        args: [id],
      });

      const [nftTokenId, deadline, yayVotes, nayVotes, executed] = proposal;

      const parsedProposal = {
        proposalId: id,
        nftTokenId: nftTokenId.toString(),
        deadline: new Date(parseInt(deadline.toString()) * 1000),
        yayVotes: yayVotes.toString(),
        nayVotes: nayVotes.toString(),
        executed: Boolean(executed),
      };

      return parsedProposal;
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
  }

  // Function to fetch all proposals in the DAO
  async function fetchAllProposals() {
    try {
      const proposals = [];

      for (let i = 0; i < numOfProposalsInDAO.data; i++) {
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }

      setProposals(proposals);
      return proposals;
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
  }

  // Function to vote YAY or NAY on a proposal
  async function voteForProposal(proposalId, vote) {
    setLoading(true);
    try {
      const tx = await writeContract({
        address: CryptoDevsDAOAddress,
        abi: CryptoDevsDAOABI,
        functionName: "voteOnProposal",
        args: [proposalId, vote === "YAY" ? 0 : 1],
      });

      await waitForTransaction(tx);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }

  // Function to execute a proposal after deadline has been exceeded
  async function executeProposal(proposalId) {
    setLoading(true);
    try {
      const tx = await writeContract({
        address: CryptoDevsDAOAddress,
        abi: CryptoDevsDAOABI,
        functionName: "executeProposal",
        args: [proposalId],
      });

      await waitForTransaction(tx);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }

  // Function to withdraw ether from the DAO contract
  // async function withdrawDAOEther() {
  //   setLoading(true);
  //   try {
  //     const tx = await writeContract({
  //       address: CryptoDevsDAOAddress,
  //       abi: CryptoDevsDAOABI,
  //       functionName: "withdrawEther",
  //       args: [],
  //     });

  //     await waitForTransaction(tx);
  //   } catch (error) {
  //     console.error(error);
  //     window.alert(error);
  //   }
  //   setLoading(false);
  // }

  // Render the contents of the appropriate tab based on `selectedTab`
  function renderTabs() {
    if (selectedTab === "Create Proposal") {
      return renderCreateProposalTab();
    } else if (selectedTab === "View Proposals") {
      return renderViewProposalsTab();
    }
    return null;
  }

  // Renders the 'Create Proposal' tab content
  function renderCreateProposalTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if (nftBalanceOfUser.data === 0) {
      return (
        <div className={styles.description}>
          You do not own any CryptoDevs NFTs. <br />
          <b>You cannot create or vote on proposals</b>
        </div>
      );
    } else {
      return (
        <div className={styles.container}>
          <label>Fake NFT Token ID to Purchase: </label>
          <input
            placeholder="0"
            type="number"
            onChange={(e) => setFakeNftTokenId(e.target.value)}
          />
          <button className={styles.button2} onClick={createProposal}>
            Create
          </button>
        </div>
      );
    }
  }

  // Renders the 'View Proposals' tab content
  function renderViewProposalsTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if (proposals.length === 0) {
      return (
        <div className={styles.description}>No proposals have been created</div>
      );
    } else {
      return (
        <div>
          {proposals.map((p, index) => (
            <div key={index} className={styles.card}>
              <p>Proposal ID: {p.proposalId}</p>
              <p>Fake NFT to Purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Yay Votes: {p.yayVotes}</p>
              <p>Nay Votes: {p.nayVotes}</p>
              <p>Executed?: {p.executed.toString()}</p>
              {p.deadline.getTime() > Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={() => voteForProposal(p.proposalId, "YAY")}
                  >
                    Vote YAY
                  </button>
                  <button
                    className={styles.button2}
                    onClick={() => voteForProposal(p.proposalId, "NAY")}
                  >
                    Vote NAY
                  </button>
                </div>
              ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={() => executeProposal(p.proposalId)}
                  >
                    Execute Proposal{" "}
                    {p.yayVotes > p.nayVotes ? "(YAY)" : "(NAY)"}
                  </button>
                </div>
              ) : (
                <div className={styles.description}>Proposal Executed</div>
              )}
            </div>
          ))}
        </div>
      );
    }
  }

  // Piece of code that runs everytime the value of `selectedTab` changes
  // Used to re-fetch all proposals in the DAO when user switches
  // to the 'View Proposals' tab
  useEffect(() => {
    if (selectedTab === "View Proposals") {
      fetchAllProposals();
    }
  }, [selectedTab]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  if (!isConnected)
    return (
      <div>
        <ConnectButton />
      </div>
    );

  return (
    <div className={inter.className}>
      <Head>
        <title>Ukriyte's DAO</title>
        <meta name="description" content="CryptoDevs DAO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to my DAO!</h1>
          <div className={styles.description}>Ukriyte's DAO!</div>
          <div className={styles.description}>
            Your CryptoDevs NFT Balance: {nftBalanceOfUser.data ? "" : nftBalanceOfUser.data.toString()}
            {console.log(nftBalanceOfUser.data.toString())}
            <br />
            {daoBalance.data && (
              <>
                Treasury Balance:{" "}
                {formatEther(daoBalance.data.value).toString()} ETH
              </>
            )}
            <br />
            Total Number of Proposals: {numOfProposalsInDAO.data.toString()}
          </div>
          <div className={styles.flex}>
            <button
              className={styles.button}
              onClick={() => setSelectedTab("Create Proposal")}
            >
              Create Proposal
            </button>
            <button
              className={styles.button}
              onClick={() => setSelectedTab("View Proposals")}
            >
              View Proposals
            </button>
          </div>
          {renderTabs()}
          {/* Display additional withdraw button if connected wallet is owner */}
          
            <div>
              
                
              
            </div>
          
        </div>
        <div>
          <img className={styles.image} src="data:image/jpeg;base64,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" />
        </div>
      </div>
    </div>
  );
}
