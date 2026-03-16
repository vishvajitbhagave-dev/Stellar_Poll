#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, Map, String, Vec, vec,
};

#[contracttype]
pub enum DataKey {
    Question,
    Options,
    Votes,
    HasVoted,
}

#[contract]
pub struct PollContract;

#[contractimpl]
impl PollContract {
    // Initialize poll — call once after deploying
    pub fn init(env: Env, question: String, options: Vec<String>) {
        if env.storage().instance().has(&DataKey::Question) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Question, &question);
        env.storage().instance().set(&DataKey::Options, &options);

        let mut votes: Map<u32, u32> = Map::new(&env);
        for i in 0..options.len() {
            votes.set(i, 0u32);
        }
        env.storage().instance().set(&DataKey::Votes, &votes);

        let voters: Vec<Address> = vec![&env];
        env.storage().instance().set(&DataKey::HasVoted, &voters);
    }

    // Cast a vote — option_index is 0-based
    pub fn vote(env: Env, voter: Address, option_index: u32) {
        voter.require_auth();

        let options: Vec<String> = env.storage().instance()
            .get(&DataKey::Options).expect("not initialized");

        if option_index >= options.len() {
            panic!("invalid option");
        }

        let mut voters: Vec<Address> = env.storage().instance()
            .get(&DataKey::HasVoted).unwrap_or(vec![&env]);

        for v in voters.iter() {
            if v == voter {
                panic!("already voted");
            }
        }

        voters.push_back(voter.clone());
        env.storage().instance().set(&DataKey::HasVoted, &voters);

        let mut votes: Map<u32, u32> = env.storage().instance()
            .get(&DataKey::Votes).expect("no votes map");

        let current = votes.get(option_index).unwrap_or(0);
        votes.set(option_index, current + 1);
        env.storage().instance().set(&DataKey::Votes, &votes);
    }

    // Read poll question
    pub fn get_question(env: Env) -> String {
        env.storage().instance().get(&DataKey::Question).expect("not initialized")
    }

    // Read vote counts — returns map of index → count
    pub fn get_votes(env: Env) -> Map<u32, u32> {
        env.storage().instance().get(&DataKey::Votes).expect("not initialized")
    }

    // Total votes cast
    pub fn get_total(env: Env) -> u32 {
        let votes: Map<u32, u32> = env.storage().instance()
            .get(&DataKey::Votes).expect("not initialized");
        let mut total = 0u32;
        for (_, v) in votes.iter() {
            total += v;
        }
        total
    }

    // Check if address has already voted
    pub fn has_voted(env: Env, voter: Address) -> bool {
        let voters: Vec<Address> = env.storage().instance()
            .get(&DataKey::HasVoted).unwrap_or(vec![&env]);
        for v in voters.iter() {
            if v == voter {
                return true;
            }
        }
        false
    }
}