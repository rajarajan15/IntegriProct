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

from typing import (
    TYPE_CHECKING,
    Final,
    Iterator,
    Mapping,
    NoReturn,
    Union,
)

from streamlit import config, runtime
from streamlit.auth_util import encode_provider_token, validate_auth_credentials
from streamlit.errors import StreamlitAPIException
from streamlit.proto.ForwardMsg_pb2 import ForwardMsg
from streamlit.runtime.metrics_util import gather_metrics
from streamlit.runtime.scriptrunner_utils.script_run_context import (
    get_script_run_ctx as _get_script_run_ctx,
)
from streamlit.url_util import make_url_path

if TYPE_CHECKING:
    from streamlit.runtime.scriptrunner_utils.script_run_context import UserInfo


AUTH_LOGIN_ENDPOINT: Final = "/auth/login"
AUTH_LOGOUT_ENDPOINT: Final = "/auth/logout"


def generate_login_redirect_url(provider: str) -> str:
    """Generate the login redirect URL for the given provider."""
    provider_token = encode_provider_token(provider)
    base_path = config.get_option("server.baseUrlPath")
    login_path = make_url_path(base_path, AUTH_LOGIN_ENDPOINT)
    return f"{login_path}?provider={provider_token}"


def _get_user_info() -> UserInfo:
    ctx = _get_script_run_ctx()
    if ctx is None:
        # TODO: Add appropriate warnings when ctx is missing
        return {}
    context_user_info = ctx.user_info.copy()
    if "_streamlit_logged_in" in context_user_info:
        del context_user_info["_streamlit_logged_in"]
    return context_user_info


class UserInfoProxy(Mapping[str, Union[str, bool, None]]):
    """
    A read-only, dict-like object for accessing information about current user.

    ``st.experimental_user`` is dependent on the host platform running the
    Streamlit app. If the host platform has not configured the function, it
    will behave as it does in a locally running app.

    Properties can be accessed via key or attribute notation. For example,
    ``st.experimental_user["email"]`` or ``st.experimental_user.email``.

    Attributes
    ----------
    email : str
        If running locally, this property returns the string literal
        ``"test@example.com"``.

        If running on Streamlit Community Cloud, this
        property returns one of two values:

        - ``None`` if the user is not logged in or not a member of the app's\
        workspace. Such users appear under anonymous pseudonyms in the app's\
        analytics.
        - The user's email if the user is logged in and a member of the\
        app's workspace. Such users are identified by their email in the app's\
        analytics.

    """

    @gather_metrics("login")
    def login(self, provider: str) -> None:
        """Initiate the login for the given provider.

        Parameters
        ----------
        provider : str
            The provider to use for login. This value must match the name of a
            provider configured in the app's auth section of ``secrets.toml`` file.
        """
        context = _get_script_run_ctx()
        if context is not None:
            validate_auth_credentials(provider)
            fwd_msg = ForwardMsg()
            fwd_msg.auth_redirect.url = generate_login_redirect_url(provider)
            context.enqueue(fwd_msg)

    @gather_metrics("logout")
    def logout(self) -> None:
        """Logout the current user."""
        context = _get_script_run_ctx()
        if context is not None:
            context.user_info.clear()
            session_id = context.session_id

            if runtime.exists():
                instance = runtime.get_instance()
                instance.clear_user_info_for_session(session_id)

            base_path = config.get_option("server.baseUrlPath")

            fwd_msg = ForwardMsg()
            fwd_msg.auth_redirect.url = make_url_path(base_path, AUTH_LOGOUT_ENDPOINT)
            context.enqueue(fwd_msg)

    @property
    def is_authenticated(self) -> bool:
        """Check if the user is authenticated.
        For checking that we rely on the `_streamlit_logged_in` key in the user_info,
        that should be passed to the script context by the auth mechanism either from
        cookie, or from the fact of special header presence.
        """
        ctx = _get_script_run_ctx()
        if ctx is None:
            return False
        return bool(ctx.user_info.get("_streamlit_logged_in", False))

    def __getitem__(self, key: str) -> str | bool | None:
        return _get_user_info()[key]

    def __getattr__(self, key: str) -> str | bool | None:
        try:
            return _get_user_info()[key]
        except KeyError:
            raise AttributeError

    def __setattr__(self, name: str, value: str | None) -> NoReturn:
        raise StreamlitAPIException("st.experimental_user cannot be modified")

    def __setitem__(self, name: str, value: str | None) -> NoReturn:
        raise StreamlitAPIException("st.experimental_user cannot be modified")

    def __iter__(self) -> Iterator[str]:
        return iter(_get_user_info())

    def __len__(self) -> int:
        return len(_get_user_info())

    def to_dict(self) -> UserInfo:
        """
        Get user info as a dictionary.

        This method primarily exists for internal use and is not needed for
        most cases. ``st.experimental_user`` returns an object that inherits from
        ``dict`` by default.

        Returns
        -------
        Dict[str,str]
            A dictionary of the current user's information.
        """
        return _get_user_info()
