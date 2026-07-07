#!/bin/bash
# Quick test to check if Spotify API is accepting your Premium account yet
# Run with: bash test-spotify.sh

ACCESS_TOKEN=$(cat data/db.json | python3 -c "import sys,json; print(json.load(sys.stdin)['settings']['accessToken'])")

echo "Testing Spotify API with current access token..."
echo "================================================="
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ACCESS_TOKEN" https://api.spotify.com/v1/me)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ SUCCESS! Spotify API is working!"
  echo ""
  echo "Your profile:"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  echo ""
  echo "👉 Now restart the app (npm run dev) and your playlists will load!"
elif [ "$HTTP_CODE" = "401" ]; then
  echo "⚠️  Token expired. Restart the app and click 'Connect Spotify Account' in Settings."
elif [ "$HTTP_CODE" = "403" ]; then
  echo "❌ Still blocked (403 Forbidden)."
  echo ""
  echo "Spotify says: $BODY"
  echo ""
  echo "Your Premium subscription change hasn't propagated yet."
  echo "Spotify says this can take a few hours. Try again later."
else
  echo "❓ Unexpected status: $HTTP_CODE"
  echo "$BODY"
fi
