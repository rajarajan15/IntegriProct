# Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2024)
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Mapping, TypedDict, cast

from streamlit import config
from streamlit.errors import AuthError
from streamlit.runtime.secrets import AttrDict, secrets_singleton

if TYPE_CHECKING:

    class ProviderTokenPayload(TypedDict):
        provider: str
        exp: int


class AuthCache:
    """Simple cache implementation for storing info required for Authlib."""

    def __init__(self):
        self.cache = {}

    def get(self, key):
        return self.cache.get(key)

    # for set method, we are follow the same signature used in Authlib
    # the expires_in is not used in our case
    def set(self, key, value, expires_in):
        self.cache[key] = value

    def get_dict(self):
        return self.cache

    def delete(self, key):
        self.cache.pop(key, None)


def get_signing_secret() -> str:
    """Get the cookie signing secret from the configuration or secrets.toml."""
    signing_secret: str = config.get_option("server.cookieSecret")
    if secrets_singleton.load_if_toml_exists():
        auth_section = secrets_singleton.get("auth")
        if auth_section:
            signing_secret = auth_section.get("cookie_secret", signing_secret)
    return signing_secret


def get_secrets_auth_section() -> AttrDict:
    auth_section = AttrDict({})
    """Get the 'auth' section of the secrets.toml."""
    if secrets_singleton.load_if_toml_exists():
        auth_section = cast(AttrDict, secrets_singleton.get("auth"))

    return auth_section


def encode_provider_token(provider: str) -> str:
    """Returns a signed JWT token with the provider and expiration time."""
    try:
        from authlib.jose import jwt  # type: ignore[import-untyped]
    except ImportError:
        raise AuthError(
            "To use Auth you need to install the 'Authlib' package."
        ) from None

    header = {"alg": "HS256"}
    payload = {
        "provider": provider,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=2),
    }
    provider_token: bytes = jwt.encode(header, payload, get_signing_secret())
    # JWT token is a byte string, so we need to decode it to a URL compatible string
    return provider_token.decode("latin-1")


def decode_provider_token(provider_token: str) -> ProviderTokenPayload:
    """Decode the JWT token and validate the claims."""
    try:
        from authlib.jose import JoseError, JWTClaims, jwt
    except ImportError:
        raise AuthError(
            "To use Auth you need to install the 'Authlib' package."
        ) from None

    # Our JWT token is short-lived (2 minutes), so we check here that it contains
    # the 'exp' (and it is not expired), and 'provider' field exists.
    claim_options = {"exp": {"essential": True}, "provider": {"essential": True}}
    try:
        payload: JWTClaims = jwt.decode(
            provider_token, get_signing_secret(), claims_options=claim_options
        )
        payload.validate()
    except JoseError as e:
        raise AuthError(f"Error decoding provider token: {e}") from None

    return cast("ProviderTokenPayload", payload)


def validate_auth_credentials(provider: str) -> None:
    """Validate the general auth credentials and auth credentials for the given provider."""
    if not secrets_singleton.load_if_toml_exists():
        raise AuthError(
            "To use Auth you need to configure auth credentials in secrets.toml."
        )

    auth_section = secrets_singleton.get("auth")
    if auth_section is None:
        raise AuthError(
            "Auth credentials are missing. Please check your configuration."
        )
    if "redirect_uri" not in auth_section:
        raise AuthError(
            "Auth credentials are missing 'redirect_uri'. Please check your configuration."
        )

    provider_section = auth_section.get(provider)
    if provider_section is None:
        raise AuthError(
            f"Auth credentials are missing *'{provider}'*. Please check your configuration."
        )

    if not isinstance(provider_section, Mapping):
        raise AuthError(
            f"Auth credentials for '{provider}' must be a toml section."
            f" Please check your configuration."
        )

    required_keys = ["client_id", "client_secret", "server_metadata_url"]
    missing_keys = [key for key in required_keys if key not in provider_section]
    if missing_keys:
        raise AuthError(
            f"Auth credentials for '{provider}' are missing the following keys: "
            f"{missing_keys}. Please check your configuration."
        )
