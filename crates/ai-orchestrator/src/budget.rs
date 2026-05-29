//! Token + cost budgets.

#[derive(Debug, Clone, Copy, Default)]
pub struct TokenBudget {
    pub max_input_tokens:  u64,
    pub max_output_tokens: u64,
    pub max_total_cost_usd_micro: u64,
    pub used_input:  u64,
    pub used_output: u64,
    pub used_cost_usd_micro: u64,
}

impl TokenBudget {
    pub fn consume(&mut self, inp: u64, out: u64) -> bool {
        self.used_input  = self.used_input.saturating_add(inp);
        self.used_output = self.used_output.saturating_add(out);
        if self.used_input  > self.max_input_tokens  { return false; }
        if self.used_output > self.max_output_tokens { return false; }
        true
    }
}
