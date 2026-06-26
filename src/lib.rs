#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, Symbol};

/// Storage keys used by the thesis_oracle contract.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Maps a thesis_id -> the Address of the candidate that proposed it.
    Candidate(u32),
    /// Maps a thesis_id -> the bytes32-style title hash (stored as Symbol).
    TitleHash(u32),
    /// Maps a (thesis_id, committee Address) -> bool vote (true = approve, false = reject).
    Vote(u32, Address),
    /// Maps a thesis_id -> total number of votes cast.
    VoteCount(u32),
    /// Maps a thesis_id -> number of approval votes.
    ApproveCount(u32),
    /// Maps a thesis_id -> number of reject votes.
    RejectCount(u32),
    /// Maps a thesis_id -> bool indicating whether the defense has been finalized.
    Finalized(u32),
    /// Maps a thesis_id -> Symbol result: "pending", "approved", or "rejected".
    Result(u32),
    /// Address of the committee chair authorized to finalize defenses.
    Chair,
}

#[contract]
pub struct ThesisOracle;

#[contractimpl]
impl ThesisOracle {
    /// Initialize the contract by registering a committee chair.
    /// The chair is the only address that can finalize a defense and record the result.
    pub fn init(env: Env, chair: Address) {
        chair.require_auth();
        if env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Chair)
            .is_some()
        {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Chair, &chair);
    }

    /// Register a new thesis defense on-chain.
    /// The candidate (student) authorizes the submission and provides a thesis_id
    /// and a title_hash that uniquely identifies the work being defended.
    /// Returns `true` if the proposal was recorded.
    pub fn propose_thesis(
        env: Env,
        candidate: Address,
        thesis_id: u32,
        title_hash: Symbol,
    ) -> bool {
        candidate.require_auth();

        if env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Candidate(thesis_id))
            .is_some()
        {
            panic!("Thesis already proposed");
        }

        env.storage()
            .instance()
            .set(&DataKey::Candidate(thesis_id), &candidate);
        env.storage()
            .instance()
            .set(&DataKey::TitleHash(thesis_id), &title_hash);
        env.storage()
            .instance()
            .set(&DataKey::VoteCount(thesis_id), &0u32);
        env.storage()
            .instance()
            .set(&DataKey::ApproveCount(thesis_id), &0u32);
        env.storage()
            .instance()
            .set(&DataKey::RejectCount(thesis_id), &0u32);
        env.storage()
            .instance()
            .set(&DataKey::Finalized(thesis_id), &false);
        env.storage()
            .instance()
            .set(&DataKey::Result(thesis_id), &Symbol::new(&env, "pending"));

        true
    }

    /// Cast an approval or rejection vote on a thesis defense.
    /// Each committee member may vote at most once per thesis_id.
    /// Voting is blocked once the defense has been finalized.
    pub fn cast_vote(env: Env, committee: Address, thesis_id: u32, approve: bool) -> bool {
        committee.require_auth();

        let finalized: bool = env
            .storage()
            .instance()
            .get(&DataKey::Finalized(thesis_id))
            .unwrap_or(false);
        if finalized {
            panic!("Defense already finalized");
        }

        let mut votes: Map<Address, bool> = env
            .storage()
            .instance()
            .get(&("votes", thesis_id))
            .unwrap_or(Map::new(&env));

        if votes.get(committee.clone()).is_some() {
            panic!("Committee member already voted");
        }

        votes.set(committee.clone(), approve);
        env.storage().instance().set(&("votes", thesis_id), &votes);

        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::VoteCount(thesis_id))
            .unwrap_or(0u32);
        env.storage()
            .instance()
            .set(&DataKey::VoteCount(thesis_id), &(count + 1));

        if approve {
            let approvals: u32 = env
                .storage()
                .instance()
                .get(&DataKey::ApproveCount(thesis_id))
                .unwrap_or(0u32);
            env.storage()
                .instance()
                .set(&DataKey::ApproveCount(thesis_id), &(approvals + 1));
        } else {
            let rejects: u32 = env
                .storage()
                .instance()
                .get(&DataKey::RejectCount(thesis_id))
                .unwrap_or(0u32);
            env.storage()
                .instance()
                .set(&DataKey::RejectCount(thesis_id), &(rejects + 1));
        }

        true
    }

    /// Finalize a thesis defense. Only the registered chair may call this.
    /// Tally approve vs. reject votes and record the outcome ("approved" or "rejected")
    /// on-chain. Returns the resulting status symbol.
    pub fn finalize(env: Env, chair: Address, thesis_id: u32) -> Symbol {
        chair.require_auth();

        let registered_chair: Address = env
            .storage()
            .instance()
            .get(&DataKey::Chair)
            .expect("Contract not initialized");
        if chair != registered_chair {
            panic!("Only the chair can finalize");
        }

        let finalized: bool = env
            .storage()
            .instance()
            .get(&DataKey::Finalized(thesis_id))
            .unwrap_or(false);
        if finalized {
            panic!("Defense already finalized");
        }

        let approvals: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ApproveCount(thesis_id))
            .unwrap_or(0u32);
        let rejects: u32 = env
            .storage()
            .instance()
            .get(&DataKey::RejectCount(thesis_id))
            .unwrap_or(0u32);

        let result = if approvals > rejects {
            Symbol::new(&env, "approved")
        } else {
            Symbol::new(&env, "rejected")
        };

        env.storage()
            .instance()
            .set(&DataKey::Finalized(thesis_id), &true);
        env.storage()
            .instance()
            .set(&DataKey::Result(thesis_id), &result);

        result
    }

    /// Return the total number of votes cast for a given thesis defense.
    pub fn vote_count(env: Env, thesis_id: u32) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::VoteCount(thesis_id))
            .unwrap_or(0u32)
    }

    /// Return the recorded outcome of a thesis defense ("pending", "approved", or "rejected").
    pub fn result(env: Env, thesis_id: u32) -> Symbol {
        env.storage()
            .instance()
            .get(&DataKey::Result(thesis_id))
            .unwrap_or(Symbol::new(&env, "pending"))
    }
}
