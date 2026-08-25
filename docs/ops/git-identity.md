# Git identity — full per-machine credential-helper rules for committing as magmacrunchmedia.

### On the Mac only

Two GitHub accounts are authenticated on the Mac — `magmacrunchmedia` and
a separate work account — and `git` there uses `gh` as its credential helper
(`credential.helper = !gh auth git-credential`). That means pushes go out as
whichever account `gh` currently has *active*, not as whatever `user.name` says.
Switching accounts for something unrelated silently changes who your next push
comes from.

**On the Mac, check before every push** and abort if it is not `magmacrunchmedia`:

```bash
gh auth status                 # look for "Active account: true"
gh auth switch --user magmacrunchmedia
```

### On Windows (MC1) — do not run the check above

`gh` is **not** in the credential chain here and does not need to be. The helper
is Git Credential Manager (`credential.helper = manager`, global), which holds the
`magmacrunchmedia` credential in Windows Credential Manager. Pushes authenticate
through GCM and come out as the right account on their own.

`gh auth status` reports "not logged into any GitHub hosts" on this machine, and
that is **expected and harmless** — there is no `%APPDATA%\GitHub CLI` config at
all. It is not an expired token and it does not block anything. Nothing in this
repo shells out to `gh` locally; only CI does, using `GITHUB_TOKEN`.

Do not treat that message as a problem to fix, and do not run `gh auth switch`
or `gh auth login` here — the login is an interactive device-code flow that
cannot complete in a non-interactive agent shell, which is why repeated attempts
leave no config behind. Just verify the commit author instead:

```bash
git log -1 --format='%an <%ae>'   # want: magmacrunchmedia@gmail.com
```

Commit author should be `magmacrunchmedia <magmacrunchmedia@gmail.com>` (already
set repo-locally here, and globally for `~/Documents/game_dev/adenosine`).

