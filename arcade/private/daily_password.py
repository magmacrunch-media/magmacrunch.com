"""The private arcade's daily password.

The ALGORITHM in this file is public, because this file is in a public
repository and always will be: `magmacrunch.com` is served by GitHub Pages and
cannot go private on the free plan. The SECRET is not public. It lives in
`arcade/private/config.json`, which `.gitignore` excludes, and it never reaches
this repository.

That split is the whole point, and it is new. Until 2026-10-04 this returned
`"lava" + MMDD`, so anybody who could read the repository could compute any
day's password, for any day, without knowing anything else. The only thing
between that and the service was the firewall: 8782 is not proxied by nginx and
is blocked at the edge. Defence in depth means not relying on that.

The code is still meant to be read down a phone line, so it is six characters
from an alphabet with no `0`/`O` and no `1`/`I`/`L`, which is about 887 million
codes a day rather than one guessable string.
"""

import hashlib
import hmac
from datetime import datetime

# No 0/O, no 1/I/L: these get read aloud and typed by somebody else.
ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
LENGTH = 6


class SecretMissing(RuntimeError):
    """`password_mode` is "auto" but no `password_secret` is configured."""


def daily_password(secret, when=None):
    """Return today's password for `secret`, as `lava-XXXXXX`.

    Raises SecretMissing rather than falling back to anything, because a
    fallback here is a password somebody else can also derive, which is the
    exact bug this replaced.
    """
    if not secret:
        raise SecretMissing(
            'password_mode "auto" needs a "password_secret" in '
            "arcade/private/config.json. Generate one with:\n"
            '    python -c "import secrets; print(secrets.token_hex(32))"'
        )

    day = (when or datetime.now()).strftime("%Y%m%d")
    digest = hmac.new(
        secret.encode("utf-8"), day.encode("ascii"), hashlib.sha256
    ).digest()

    # 8 bytes is far more entropy than LENGTH characters consume; the surplus
    # is discarded rather than folded back in, which keeps the mapping simple
    # and the bias below one part in 10^10.
    n = int.from_bytes(digest[:8], "big")
    out = []
    for _ in range(LENGTH):
        n, i = divmod(n, len(ALPHABET))
        out.append(ALPHABET[i])
    return "lava-" + "".join(out)
