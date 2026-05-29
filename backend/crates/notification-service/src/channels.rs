//! Channel adapters. Each implements `Channel::deliver`.

use async_trait::async_trait;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ChannelError {
    #[error("transport: {0}")] Transport(String),
    #[error("bounced: {0}")]   Bounced(String),
}

#[async_trait]
pub trait Channel: Send + Sync {
    fn kind(&self) -> &'static str;
    async fn deliver(&self, recipient: &str, subject: Option<&str>, body: &str)
        -> Result<(), ChannelError>;
}

pub struct WebhookChannel { pub http: reqwest::Client, pub url: String, pub bearer: Option<String> }
#[async_trait]
impl Channel for WebhookChannel {
    fn kind(&self) -> &'static str { "webhook" }
    async fn deliver(&self, recipient: &str, subject: Option<&str>, body: &str) -> Result<(), ChannelError> {
        let mut req = self.http.post(&self.url).json(&serde_json::json!({
            "recipient": recipient, "subject": subject, "body": body
        }));
        if let Some(b) = &self.bearer { req = req.bearer_auth(b); }
        let resp = req.send().await.map_err(|e| ChannelError::Transport(e.to_string()))?;
        if !resp.status().is_success() {
            return Err(ChannelError::Bounced(format!("{}", resp.status())));
        }
        Ok(())
    }
}
