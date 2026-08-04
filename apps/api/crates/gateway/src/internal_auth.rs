use axum::http::HeaderMap;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use subtle::ConstantTimeEq;

pub const IDENTITY_HEADER: &str = "x-1router-identity";
pub const SIGNATURE_HEADER: &str = "x-1router-identity-signature";
pub const TIMESTAMP_HEADER: &str = "x-1router-identity-timestamp";
const MAX_CLOCK_SKEW_SECONDS: i64 = 300;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Clone)]
pub struct VerifiedIdentity {
    pub identity: String,
}

/// Verify the identity assertion emitted by the private Next.js control-plane
/// hop. The gateway does not connect to Better Auth or PostgreSQL; it only
/// verifies this short-lived assertion with the shared deployment secret.
pub fn verify_identity(
    headers: &HeaderMap,
    shared_secret: &str,
    now: i64,
) -> Option<VerifiedIdentity> {
    let identity = headers.get(IDENTITY_HEADER)?.to_str().ok()?;
    let timestamp = headers.get(TIMESTAMP_HEADER)?.to_str().ok()?;
    let signature = headers.get(SIGNATURE_HEADER)?.to_str().ok()?;
    let timestamp_seconds = timestamp.parse::<i64>().ok()?;

    if identity.is_empty() || now.abs_diff(timestamp_seconds) > MAX_CLOCK_SKEW_SECONDS as u64 {
        return None;
    }

    let payload = format!("{timestamp}.{identity}");
    let mut mac = HmacSha256::new_from_slice(shared_secret.as_bytes()).ok()?;
    mac.update(payload.as_bytes());
    let expected = mac.finalize().into_bytes();
    let expected_hex = hex_encode(&expected);

    if expected_hex.as_bytes().ct_eq(signature.as_bytes()).into() {
        Some(VerifiedIdentity {
            identity: identity.to_owned(),
        })
    } else {
        None
    }
}

fn hex_encode(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        output.push(HEX[(byte >> 4) as usize] as char);
        output.push(HEX[(byte & 0x0f) as usize] as char);
    }
    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verifies_fresh_signed_identity() {
        let now = 1_700_000_000;
        let identity = "user:user_123";
        let timestamp = now.to_string();
        let mut mac = HmacSha256::new_from_slice(b"secret").unwrap();
        mac.update(format!("{timestamp}.{identity}").as_bytes());
        let signature = hex_encode(&mac.finalize().into_bytes());

        let mut headers = HeaderMap::new();
        headers.insert(IDENTITY_HEADER, identity.parse().unwrap());
        headers.insert(TIMESTAMP_HEADER, timestamp.parse().unwrap());
        headers.insert(SIGNATURE_HEADER, signature.parse().unwrap());

        assert_eq!(
            verify_identity(&headers, "secret", now).unwrap().identity,
            identity
        );
    }

    #[test]
    fn rejects_stale_signed_identity() {
        let mut headers = HeaderMap::new();
        headers.insert(IDENTITY_HEADER, "user:user_123".parse().unwrap());
        headers.insert(TIMESTAMP_HEADER, "1".parse().unwrap());
        headers.insert(SIGNATURE_HEADER, "00".parse().unwrap());

        assert!(verify_identity(&headers, "secret", 1_700_000_000).is_none());
    }
}
