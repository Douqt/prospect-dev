Commit message cleanup
======================

This repository contains a few earlier commits whose messages included internal tags
such as "lovable" or "[skip lovable]". These tags were added by an internal tooling
step and are not relevant to consumers of the repository.

To avoid rewriting published history, we chose to leave existing commits intact and
document the cleanup here. If you prefer to completely rewrite history to change
those commit messages, contact collaborators and then perform an interactive rebase
followed by a force-push (this is destructive and will change commit SHAs).

What was done
- Acknowledged the presence of commits with internal tags.
- Added this file as a non-destructive, visible note explaining the situation.

If you want me to rewrite commit messages (destructive rewrite), say so and I will
create a backup branch and perform an interactive rebase to reword or drop commits.
