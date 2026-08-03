use axum::extract::State;
use axum::Json;
use serde::Serialize;

use crate::state::AppState;

/// OpenAI-compatible /v1/models response.
#[derive(Serialize)]
pub struct ModelsResponse {
    pub object: &'static str,
    pub data: Vec<ModelEntry>,
}

#[derive(Serialize)]
pub struct ModelEntry {
    pub id: String,
    pub object: &'static str,
    pub created: u64,
    pub owned_by: String,
}

pub async fn list_models(State(state): State<AppState>) -> Json<ModelsResponse> {
    let data = state
        .model_index
        .values()
        .map(|m| ModelEntry {
            id: m.id.clone(),
            object: "model",
            created: 0,
            owned_by: m.provider.clone(),
        })
        .collect();

    Json(ModelsResponse {
        object: "list",
        data,
    })
}
