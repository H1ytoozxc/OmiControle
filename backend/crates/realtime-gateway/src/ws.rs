//! Axum-mounted WebSocket endpoint.

use std::sync::Arc;
use std::time::Duration;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::Router;
use serde::Deserialize;
use tokio::sync::mpsc;
use tracing::warn;

use crate::hub::{Conn, Hub};

pub fn router(hub: Arc<Hub>) -> Router {
    Router::new()
        .route("/healthz/live", get(|| async { (StatusCode::OK, "ok") }))
        .route("/ws", get(ws_upgrade))
        .with_state(hub)
}

#[derive(Deserialize)]
struct WsQuery { ticket: String }

async fn ws_upgrade(
    State(hub): State<Arc<Hub>>,
    ws: WebSocketUpgrade,
    Query(q): Query<WsQuery>,
) -> impl IntoResponse {
    if hub.online_count() >= hub.cfg.max_connections {
        return (StatusCode::SERVICE_UNAVAILABLE, "max connections").into_response();
    }
    let key = match hub.ticket_key.as_ref() {
        Some(k) => k,
        None => return (StatusCode::SERVICE_UNAVAILABLE, "ticket auth not configured").into_response(),
    };
    let verified = match sequoia_auth::ticket::verify(key, &q.ticket) {
        Ok(v) => v,
        Err(e) => {
            warn!(error = %e, "rejected ws upgrade — bad ticket");
            return (StatusCode::UNAUTHORIZED, "invalid ticket").into_response();
        }
    };
    ws.on_upgrade(move |s| handle_socket(s, hub, verified.tenant_id, verified.user_id))
}

async fn handle_socket(socket: WebSocket, hub: Arc<Hub>, tenant_id: String, user_id: String) {
    let (mut sink, mut stream) = socket.split();
    let (tx, mut rx) = mpsc::channel::<String>(hub.cfg.per_conn_send_capacity);

    let conn = Conn { tx: tx.clone(), user_id: user_id.clone(), tenant_id: tenant_id.clone() };
    let cid = hub.register(conn);

    // Default topics: tenant lobby + user inbox.
    hub.subscribe(cid, &format!("events.devices.{tenant_id}"));
    hub.subscribe(cid, &format!("events.users.{user_id}"));

    // Writer task: drain rx → ws.
    let writer = {
        let hub = hub.clone();
        tokio::spawn(async move {
            loop {
                tokio::select! {
                    Some(msg) = rx.recv() => {
                        if sink.send(Message::Text(msg)).await.is_err() { break; }
                    }
                    _ = tokio::time::sleep(Duration::from_secs(hub.cfg.heartbeat_interval_s)) => {
                        if sink.send(Message::Ping(Vec::new())).await.is_err() { break; }
                    }
                }
            }
        })
    };

    // Reader: subscribe / unsubscribe / pong.
    while let Some(Ok(msg)) = stream.next().await {
        match msg {
            Message::Text(t) => {
                if let Ok(cmd) = serde_json::from_str::<ClientCmd>(&t) {
                    match cmd {
                        ClientCmd::Subscribe { topic } => hub.subscribe(cid, &topic),
                        ClientCmd::Unsubscribe { topic } => hub.unsubscribe(cid, &topic),
                    }
                }
            }
            Message::Pong(_) => {}
            Message::Close(_) => break,
            _ => {}
        }
    }
    writer.abort();
    hub.unregister(cid);
}

#[derive(Deserialize)]
#[serde(tag = "op", rename_all = "snake_case")]
enum ClientCmd {
    Subscribe   { topic: String },
    Unsubscribe { topic: String },
}

use futures::{SinkExt, StreamExt};
