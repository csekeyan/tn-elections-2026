#!/bin/bash
# Run this when all 234 declared
set -e

echo "=== SWITCHING TO STATIC MODE ==="

# 1. Final scrape
echo "1. Final scrape..."
python3 -c "import scraper; scraper.scrape_once()"

# 2. Fetch latest from API and save as static JSON
echo "2. Saving final results..."
curl -s "https://tn-elections-2026.pages.dev/api/results" > functions/api/final_results.json
python3 -c "
import json
d = json.load(open('functions/api/final_results.json'))
d['countingStatus'] = 'completed'
d['_source'] = 'final'
json.dump(d, open('functions/api/final_results.json', 'w'))
print(f'Declared: {d[\"summary\"][\"declared\"]}, Counting: {d[\"summary\"][\"counting\"]}')
"

# 3. Switch Worker to static mode
echo "3. Switching Worker to static..."
cp functions/api/results.js functions/api/results.js.live
cp functions/api/results.js.static functions/api/results.js

# 4. Build and deploy
echo "4. Deploying..."
npm run build
PATH="/opt/homebrew/bin:$PATH" npx wrangler pages deploy dist/ --project-name tn-elections-2026 --commit-dirty=true

# 5. Git
echo "5. Pushing to git..."
git add -A
git commit -m "FINAL: Switch to static results - all 234 declared"
TOKEN=$(cat .github-token)
git remote set-url origin "https://csekeyan:${TOKEN}@github.com/csekeyan/tn-elections-2026.git"
git push
git remote set-url origin "https://github.com/csekeyan/tn-elections-2026.git"

echo "=== DONE. Site is now fully static. Zero KV reads. ==="
