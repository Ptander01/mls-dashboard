#!/usr/bin/env python3
"""
push_to_github.py — Push specific files to GitHub via REST API.
No git binary needed. Uses GITHUB_PAT from environment.
"""

import base64
import json
import os
import sys
import urllib.request
import urllib.error

OWNER = "Ptander01"
REPO  = "mls-dashboard"
BRANCH = "main"
TOKEN = os.environ.get("GITHUB_PAT", "")

if not TOKEN:
    print("❌ GITHUB_PAT environment variable not set.")
    sys.exit(1)

BASE = f"https://api.github.com/repos/{OWNER}/{REPO}"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
}

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Files to push: local path (relative to project root) → GitHub repo path
FILES = {
    "server/index.ts":                                    "server/index.ts",
    "api/ai-commentary.js":                               "api/ai-commentary.js",
    "scripts/fetch_2026_season.py":                       "scripts/fetch_2026_season.py",
    "scripts/fetch_spotrac_salaries.py":                  "scripts/fetch_spotrac_salaries.py",
    "scripts/scrape_fox_stats.py":                        "scripts/scrape_fox_stats.py",
    "scripts/push_to_github.py":                          "scripts/push_to_github.py",
    "client/public/data/mls2026.json":                    "client/public/data/mls2026.json",
    # UI: last-updated timestamp + editorial source attribution
    "client/src/components/ui/ChartSource.tsx":           "client/src/components/ui/ChartSource.tsx",
    "client/src/components/NeuCard.tsx":                  "client/src/components/NeuCard.tsx",
    "client/src/lib/seasonDataLoader.ts":                 "client/src/lib/seasonDataLoader.ts",
    "client/src/contexts/FilterContext.tsx":              "client/src/contexts/FilterContext.tsx",
    "client/src/pages/Home.tsx":                          "client/src/pages/Home.tsx",
    "client/src/components/tabs/TeamBudget.tsx":          "client/src/components/tabs/TeamBudget.tsx",
    "client/src/components/tabs/PlayerStats.tsx":         "client/src/components/tabs/PlayerStats.tsx",
    "client/src/components/tabs/Attendance.tsx":          "client/src/components/tabs/Attendance.tsx",
    "client/src/components/tabs/TravelMap.tsx":           "client/src/components/tabs/TravelMap.tsx",
    "client/src/components/tabs/PitchMatch.tsx":          "client/src/components/tabs/PitchMatch.tsx",
    "client/src/components/tabs/SeasonPulse.tsx":         "client/src/components/tabs/SeasonPulse.tsx",
    "client/src/lib/insightEngine.ts":                    "client/src/lib/insightEngine.ts",
    "client/src/components/charts/SeasonTimeline.tsx":    "client/src/components/charts/SeasonTimeline.tsx",
    ".github/workflows/refresh-data.yml":                 ".github/workflows/refresh-data.yml",
}

COMMIT_MESSAGE = (
    "feat: replace broken AI API with rich local narrative engine\n\n"
    "- insightEngine.ts: rewrite seasonSummaryNarrative into full 3-paragraph\n"
    "  analyst-quality text using trajectory, events, home/away splits, form,\n"
    "  top scorers, salary context, and underperformer detection\n"
    "- SeasonTimeline.tsx: pass players + teamBudgets into narrative; remove\n"
    "  'AI analysis unavailable' error indicator; remove unused AlertCircle import\n"
    "  Narrative now always shows quality content — Gemini API becomes an\n"
    "  optional upgrade rather than the primary experience"
)


def api(method, path, body=None):
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code} on {method} {path}: {e.read().decode()[:200]}")
        raise


def file_to_b64(local_path):
    with open(local_path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def get_current_sha(repo_path):
    """Get the blob SHA of an existing file in the repo (needed to update it)."""
    try:
        data = api("GET", f"/contents/{repo_path}?ref={BRANCH}")
        return data.get("sha")
    except Exception:
        return None  # File is new


def main():
    print(f"🚀 Pushing to github.com/{OWNER}/{REPO} (branch: {BRANCH})")
    print()

    # Get current branch SHA (for the commit parent)
    branch_data = api("GET", f"/branches/{BRANCH}")
    parent_sha = branch_data["commit"]["sha"]
    print(f"📌 Current HEAD: {parent_sha[:7]}")
    print()

    # Push each file via the Contents API (handles both create and update)
    workflow_skipped = False
    for local_rel, repo_path in FILES.items():
        local_abs = os.path.join(PROJECT_ROOT, local_rel)

        if not os.path.exists(local_abs):
            print(f"  ⚠️  Skipping {local_rel} — not found locally")
            continue

        print(f"  📄 Uploading {repo_path}...")
        current_sha = get_current_sha(repo_path)

        body = {
            "message": COMMIT_MESSAGE if repo_path == list(FILES.values())[-1] else f"chore: update {repo_path}",
            "content": file_to_b64(local_abs),
            "branch": BRANCH,
        }
        if current_sha:
            body["sha"] = current_sha  # Required for updates

        try:
            result = api("PUT", f"/contents/{repo_path}", body)
            new_sha = result["commit"]["sha"][:7]
            action = "updated" if current_sha else "created"
            print(f"     ✅ {action} → commit {new_sha}")
        except urllib.error.HTTPError as e:
            if e.code in (403, 404) and ".github/workflows" in repo_path:
                print(f"     ⚠️  Skipped — token needs 'workflow' scope for Actions files")
                print(f"     👉 See instructions below to add this file manually.")
                workflow_skipped = True
            else:
                raise

    print()
    print("✅ All code and data files pushed to GitHub!")
    print(f"   https://github.com/{OWNER}/{REPO}")
    print()
    if workflow_skipped:
        print("─" * 60)
        print("📋 One more step — add the daily refresh workflow:")
        print("   The GitHub Actions file needs a token with 'workflow' scope.")
        print("   Easiest fix:")
        print("   1. Go to https://github.com/Ptander01/mls-dashboard")
        print("   2. Click 'Add file' → 'Create new file'")
        print("   3. Name it: .github/workflows/refresh-data.yml")
        print("   4. Paste the contents shown in your Replit project at:")
        print("      mls-dashboard/.github/workflows/refresh-data.yml")
        print("   5. Click 'Commit changes'")
        print()
        print("   OR: regenerate your GitHub token with the 'workflow' scope")
        print("   at https://github.com/settings/tokens")
        print("─" * 60)
    else:
        print("GitHub Actions daily refresh is now active in the Actions tab.")
    print()
    print("Vercel will auto-redeploy the updated code within ~30 seconds.")


if __name__ == "__main__":
    main()
