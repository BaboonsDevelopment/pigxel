# Feedback (`/feedback`, `/feedback/new`)

Where people report bugs and vote on feature requests.

**Who can open it:** signed-in people.

## Board (`/feedback`)

- ✅ Two boards: Feature requests (default) and Bugs.
- ✅ Open (open, approved, in development) and Closed (implemented, declined, closed), each with a count.
- ✅ Sort by most votes or newest; search titles.
- ✅ Each item: title, description, status, votes, author and age.
- ✅ Vote once per item on open items.
- ✅ "Show more" loads 50 more at a time.
- ✅ "Couldn't load feedback. Try again" when loading fails; counts are hidden rather than shown as zero.
- ✅ "Report a bug" and "Request a feature" buttons.

## New feedback (`/feedback/new`)

- ✅ Title (up to 100 characters) and description (up to 300).
- ✅ At most three open items of each kind per person.
- ✅ Saves the page it came from, browser and app version for the team (not shown to others).
- ✅ Keeps what you typed if something goes wrong; opens the board sorted by newest after sending.

## Planned and open

- ✅ Admin-only status controls on the board and detail page, backed by a permission-checked database function.
- ✅ `/feedback/[id]` shows an item and its status history. Comments are not included.
- ✅ An in-app notification links the author to their item after a status change; repeating the current status creates no duplicate.
