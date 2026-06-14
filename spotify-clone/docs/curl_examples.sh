#!/usr/bin/env bash
#
# Curl examples for every endpoint in the Spotify Clone API.
#
# Setup:
#   export BASE=http://localhost:5000/api
#   export JWT="paste-your-clerk-jwt-here"
#
# Get a JWT in dev: open the React app, sign in, then in the browser console run
#   await window.Clerk.session.getToken()
# and paste the result into JWT above.
#
# All responses include the X-Response-Time header — use `curl -i` to see it.

BASE="${BASE:-http://localhost:5000/api}"
JWT="${JWT:-PASTE_YOUR_CLERK_JWT}"
TRACK_ID="${TRACK_ID:-3n3Ppam7vgaVa1iaRUc9Lp}"   # Mr. Brightside
PLAYLIST_ID="${PLAYLIST_ID:-PASTE_PLAYLIST_ID}"

AUTH=(-H "Authorization: Bearer $JWT")

echo "=== 1.  GET /health ==="
curl -i "$BASE/health"
echo

echo "=== 2.  GET /songs (page 1, 20 per page) ==="
curl -i "$BASE/songs?page=1&limit=20"
echo

echo "=== 3.  GET /songs/:id ==="
curl -i "$BASE/songs/$TRACK_ID"
echo

echo "=== 4.  GET /search?q=daft+punk ==="
curl -i "$BASE/search?q=daft+punk"
echo

echo "=== 5.  GET /playlists ==="
curl -i "${AUTH[@]}" "$BASE/playlists"
echo

echo "=== 6.  POST /playlists (create) ==="
curl -i "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"name":"Road Trip 2026","description":"Top driving songs"}' \
  "$BASE/playlists"
echo
echo "→ Copy the _id from the response into PLAYLIST_ID before running the rest."
echo

echo "=== 7.  GET /playlists/:id ==="
curl -i "${AUTH[@]}" "$BASE/playlists/$PLAYLIST_ID"
echo

echo "=== 8.  PUT /playlists/:id (rename) ==="
curl -i -X PUT "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"name":"Road Trip — Updated"}' \
  "$BASE/playlists/$PLAYLIST_ID"
echo

echo "=== 9.  POST /playlists/:id/tracks (add) ==="
curl -i "${AUTH[@]}" -H "Content-Type: application/json" \
  -d "{\"spotifyTrackId\":\"$TRACK_ID\"}" \
  "$BASE/playlists/$PLAYLIST_ID/tracks"
echo

echo "=== 10. DELETE /playlists/:id/tracks/:trackId (remove) ==="
curl -i -X DELETE "${AUTH[@]}" "$BASE/playlists/$PLAYLIST_ID/tracks/$TRACK_ID"
echo

echo "=== 11. DELETE /playlists/:id ==="
curl -i -X DELETE "${AUTH[@]}" "$BASE/playlists/$PLAYLIST_ID"
echo

echo "=== 12. GET /users/me ==="
curl -i "${AUTH[@]}" "$BASE/users/me"
echo

echo "=== 13. GET /users/me/liked ==="
curl -i "${AUTH[@]}" "$BASE/users/me/liked"
echo

echo "=== 14. POST /users/me/liked/:trackId (toggle) ==="
curl -i -X POST "${AUTH[@]}" "$BASE/users/me/liked/$TRACK_ID"
echo

echo "=== 15. GET /users/me/recent ==="
curl -i "${AUTH[@]}" "$BASE/users/me/recent"
echo

echo "=== 16. POST /users/me/recent/:trackId (record play) ==="
curl -i -X POST "${AUTH[@]}" "$BASE/users/me/recent/$TRACK_ID"
echo
