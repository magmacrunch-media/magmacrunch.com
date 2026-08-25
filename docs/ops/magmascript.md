# magmascript — command reference for the primary site-management CLI.

## magmascript

[magmascript](https://github.com/magmacrunchmedia/magmascript) is the primary CLI tool for managing this site. Key commands:

```bash
# Scores
magmascript scores report                    # markdown report
magmascript scores report --post-discussion  # post to GitHub Discussion
magmascript scores report --post-discord     # post to Discord

# Archive
magmascript archive check-format             # validate HTML formatting
magmascript archive bake-cache               # inline cache into pages

# MusicBrainz
magmascript mb backup                        # full backup
magmascript mb backup --skip-existing        # skip cached entities

# Last.fm
magmascript lastfm fetch                     # fetch play counts

# Search
magmascript search build-index               # build search-index.json

# Pi management
magmascript pi status                        # service statuses
magmascript pi deploy <path>                 # deploy files
```

Set `MAGMACRUNCH_ROOT=/path/to/magmacrunch.com` for commands that access local files.

