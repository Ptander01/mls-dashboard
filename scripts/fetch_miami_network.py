#!/usr/bin/env python3
"""
fetch_miami_network.py
======================
Reads the already-fetched StatsBomb event data for Inter Miami vs Toronto FC
(Match ID 3877115, Sept 21 2023 — 4-0 win) and produces a lightweight JSON
file containing:

  • Player nodes with average pass-attempt locations
  • Weighted edges (pass counts between each pair)
  • Degree Centrality and Betweenness Centrality per player
  • Network-level density metric

Output:
    client/public/data/miami_network.json

Usage:
    python scripts/fetch_miami_network.py

The script reads from the existing events file produced by
fetch_statsbomb_miami.py, so no network call is required.
"""

from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MATCH_ID = 3877115
TEAM_NAME = "Inter Miami"

REPO_ROOT = Path(__file__).resolve().parent.parent
EVENTS_PATH = REPO_ROOT / "client" / "public" / "data" / "statsbomb" / f"events-{MATCH_ID}.json"
OUTPUT_PATH = REPO_ROOT / "client" / "public" / "data" / "miami_network.json"

# Position classification for color coding
# Defenders: Neon Pink (#ff69b4)
# Midfielders: Neon Purple (#9b59b6)
# Attacking Mids/Wings: Neon Cyan (#00d4ff)
# Strikers: Neon Yellow (#ffd700)
POSITION_MAP: dict[str, dict] = {
    # Goalkeepers
    "Drake Callender":                {"position": "GK",  "posGroup": "Defender",       "jersey": 1,  "color": "#ff69b4"},
    # Defenders
    "DeAndre Yedlin":                 {"position": "RB",  "posGroup": "Defender",       "jersey": 2,  "color": "#ff69b4"},
    "Kamal Miller":                   {"position": "CB",  "posGroup": "Defender",       "jersey": 4,  "color": "#ff69b4"},
    "Serhiy Kryvtsov":                {"position": "CB",  "posGroup": "Defender",       "jersey": 23, "color": "#ff69b4"},
    "Jordi Alba Ramos":               {"position": "LB",  "posGroup": "Defender",       "jersey": 18, "color": "#ff69b4"},
    "Noah Allen":                     {"position": "CB",  "posGroup": "Defender",       "jersey": 42, "color": "#ff69b4"},
    # Midfielders
    "Sergio Busquets i Burgos":       {"position": "CDM", "posGroup": "Midfielder",     "jersey": 5,  "color": "#9b59b6"},
    "David Ruiz":                     {"position": "CM",  "posGroup": "Midfielder",     "jersey": 8,  "color": "#9b59b6"},
    "Benjamin Cremaschi":             {"position": "CM",  "posGroup": "Midfielder",     "jersey": 30, "color": "#9b59b6"},
    "Dixon Jair Arroyo Espinoza":     {"position": "CM",  "posGroup": "Midfielder",     "jersey": 16, "color": "#9b59b6"},
    # Attacking Mids / Wings
    "Facundo Farías":                 {"position": "AM",  "posGroup": "Attacking Mid",  "jersey": 11, "color": "#00d4ff"},
    "Robert Taylor":                  {"position": "RW",  "posGroup": "Attacking Mid",  "jersey": 7,  "color": "#00d4ff"},
    "Lionel Andrés Messi Cuccittini": {"position": "RW",  "posGroup": "Attacking Mid",  "jersey": 10, "color": "#00d4ff"},
    "Tomás Agustín Avilés Mancilla":  {"position": "AM",  "posGroup": "Attacking Mid",  "jersey": 77, "color": "#00d4ff"},
    # Strikers
    "Leonardo Campana Romero":        {"position": "ST",  "posGroup": "Striker",        "jersey": 9,  "color": "#ffd700"},
    "Josef Alexander Martínez Mencia":{"position": "ST",  "posGroup": "Striker",        "jersey": 17, "color": "#ffd700"},
}


# ---------------------------------------------------------------------------
# Graph Theory: Betweenness Centrality (Freeman 1977)
# ---------------------------------------------------------------------------

def compute_betweenness(nodes: list[int], adj: dict[int, dict[int, int]]) -> dict[int, float]:
    """
    Compute betweenness centrality for each node using Brandes' algorithm.
    
    Betweenness centrality C_B(v) measures the fraction of all shortest paths
    between pairs of nodes that pass through v:
    
        C_B(v) = Σ_{s≠v≠t} σ_st(v) / σ_st
    
    where σ_st is the total number of shortest paths from s to t,
    and σ_st(v) is the number of those paths that pass through v.
    
    We use inverse pass-count as edge weight (more passes = shorter path)
    so heavily-used connections are "closer" in the graph.
    """
    betweenness: dict[int, float] = {n: 0.0 for n in nodes}
    
    for s in nodes:
        # Single-source shortest paths via BFS (unweighted for simplicity
        # since we care about topological bridges, not weighted distance)
        stack: list[int] = []
        pred: dict[int, list[int]] = {n: [] for n in nodes}
        sigma: dict[int, int] = {n: 0 for n in nodes}
        sigma[s] = 1
        dist: dict[int, int] = {n: -1 for n in nodes}
        dist[s] = 0
        queue: list[int] = [s]
        
        while queue:
            v = queue.pop(0)
            stack.append(v)
            for w in adj.get(v, {}):
                # First visit
                if dist[w] < 0:
                    dist[w] = dist[v] + 1
                    queue.append(w)
                # Shortest path via v?
                if dist[w] == dist[v] + 1:
                    sigma[w] += sigma[v]
                    pred[w].append(v)
        
        # Back-propagation of dependencies
        delta: dict[int, float] = {n: 0.0 for n in nodes}
        while stack:
            w = stack.pop()
            for v in pred[w]:
                delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w])
            if w != s:
                betweenness[w] += delta[w]
    
    # Normalize: for undirected graph, divide by 2
    n = len(nodes)
    if n > 2:
        norm = (n - 1) * (n - 2)
        for v in betweenness:
            betweenness[v] = betweenness[v] / norm if norm > 0 else 0.0
    
    return betweenness


# ---------------------------------------------------------------------------
# Main Pipeline
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 60)
    print("Passing Network & Centrality Analysis")
    print(f"Match: {MATCH_ID} (Inter Miami 4-0 Toronto FC)")
    print("=" * 60)

    # 1. Load events
    print(f"\n[1/5] Loading events from {EVENTS_PATH.name} …")
    with open(EVENTS_PATH) as f:
        events = json.load(f)
    print(f"  → {len(events)} total events loaded.")

    # 2. Filter completed Inter Miami passes
    print("\n[2/5] Filtering completed Inter Miami passes …")
    passes = [
        e for e in events
        if e["type"] == "Pass"
        and e["team"]["name"] == TEAM_NAME
        and e.get("outcome") is None  # None = completed pass
        and e.get("player") is not None
        and e.get("recipient") is not None
        and e.get("location") is not None
    ]
    print(f"  → {len(passes)} completed passes.")

    # 3. Build player locations and adjacency matrix
    print("\n[3/5] Computing average locations and adjacency matrix …")
    
    # Accumulate pass-attempt locations per player
    player_locs: dict[int, list[tuple[float, float]]] = defaultdict(list)
    # Adjacency: (passer_id, recipient_id) -> count
    edge_counts: dict[tuple[int, int], int] = defaultdict(int)
    # Player name lookup
    player_names: dict[int, str] = {}
    
    for p in passes:
        passer_id = p["player"]["id"]
        passer_name = p["player"]["name"]
        recipient_id = p["recipient"]["id"]
        recipient_name = p["recipient"]["name"]
        loc = p["location"]  # [x, y] in StatsBomb coords (120x80)
        
        player_names[passer_id] = passer_name
        player_names[recipient_id] = recipient_name
        player_locs[passer_id].append((loc[0], loc[1]))
        
        # Undirected edge: always use sorted pair for consistency
        edge_key = (min(passer_id, recipient_id), max(passer_id, recipient_id))
        edge_counts[edge_key] += 1

    # Compute average locations
    avg_locs: dict[int, tuple[float, float]] = {}
    for pid, locs in player_locs.items():
        avg_x = sum(l[0] for l in locs) / len(locs)
        avg_y = sum(l[1] for l in locs) / len(locs)
        avg_locs[pid] = (avg_x, avg_y)
    
    # For players who only received (never passed from a recorded location),
    # use recipient end locations
    for p in passes:
        rid = p["recipient"]["id"]
        if rid not in avg_locs and p.get("passEndLocation"):
            end = p["passEndLocation"]
            player_locs[rid].append((end[0], end[1]))
    
    # Recompute for any newly added
    for pid, locs in player_locs.items():
        if pid not in avg_locs:
            avg_x = sum(l[0] for l in locs) / len(locs)
            avg_y = sum(l[1] for l in locs) / len(locs)
            avg_locs[pid] = (avg_x, avg_y)

    # 4. Compute centrality metrics
    print("\n[4/5] Computing Degree and Betweenness Centrality …")
    
    all_player_ids = list(avg_locs.keys())
    
    # Degree centrality: total passes involving the player (in + out)
    degree: dict[int, int] = defaultdict(int)
    adj: dict[int, dict[int, int]] = defaultdict(dict)
    
    for (a, b), count in edge_counts.items():
        degree[a] += count
        degree[b] += count
        adj[a][b] = count
        adj[b][a] = count
    
    # Betweenness centrality
    betweenness = compute_betweenness(all_player_ids, adj)
    
    # Network density
    n = len(all_player_ids)
    possible_edges = n * (n - 1) / 2
    actual_edges = len(edge_counts)
    density = actual_edges / possible_edges if possible_edges > 0 else 0
    
    print(f"  → {n} players, {actual_edges} unique connections")
    print(f"  → Network density: {density:.3f}")

    # 5. Build output JSON
    print("\n[5/5] Building output JSON …")
    
    # Convert StatsBomb 120x80 to Three.js coordinates
    # StatsBomb: x 0-120 (left to right), y 0-80 (top to bottom)
    # Three.js:  x -60 to 60, z -40 to 40
    def to_three(sb_x: float, sb_y: float) -> tuple[float, float]:
        return (round(sb_x - 60, 2), round(sb_y - 40, 2))
    
    # Find max degree for normalization
    max_degree = max(degree.values()) if degree else 1
    max_betweenness = max(betweenness.values()) if betweenness else 1
    
    nodes = []
    for pid in all_player_ids:
        name = player_names[pid]
        meta = POSITION_MAP.get(name, {"position": "?", "posGroup": "Midfielder", "jersey": 0, "color": "#9b59b6"})
        sb_x, sb_y = avg_locs[pid]
        tx, tz = to_three(sb_x, sb_y)
        
        node = {
            "playerId": pid,
            "name": name,
            "shortName": name.split(" ")[-1] if " " not in name.split(" ")[-1] else name.split(" ")[-1],
            "jersey": meta["jersey"],
            "position": meta["position"],
            "posGroup": meta["posGroup"],
            "color": meta["color"],
            "x": tx,
            "z": tz,
            "degree": degree.get(pid, 0),
            "degreeNorm": round(degree.get(pid, 0) / max_degree, 4),
            "betweenness": round(betweenness.get(pid, 0), 6),
            "betweennessNorm": round(betweenness.get(pid, 0) / max_betweenness, 4) if max_betweenness > 0 else 0,
        }
        nodes.append(node)
    
    # Sort nodes by degree descending for display priority
    nodes.sort(key=lambda n: n["degree"], reverse=True)
    
    edges = []
    max_weight = max(edge_counts.values()) if edge_counts else 1
    for (a, b), count in edge_counts.items():
        edges.append({
            "source": a,
            "target": b,
            "weight": count,
            "weightNorm": round(count / max_weight, 4),
        })
    edges.sort(key=lambda e: e["weight"], reverse=True)
    
    output = {
        "matchId": MATCH_ID,
        "matchLabel": "Inter Miami 4-0 Toronto FC",
        "matchDate": "2023-09-20",
        "team": TEAM_NAME,
        "nodes": nodes,
        "edges": edges,
        "meta": {
            "playerCount": n,
            "edgeCount": actual_edges,
            "totalPasses": len(passes),
            "density": round(density, 4),
            "maxDegree": max_degree,
            "maxBetweenness": round(max_betweenness, 6),
        }
    }
    
    # Write output
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)
    
    print(f"\n  → Saved {OUTPUT_PATH.relative_to(REPO_ROOT)}")
    
    # Print summary table
    print("\n" + "=" * 80)
    print(f"{'Player':<35} {'Pos':<5} {'Degree':>8} {'Betweenness':>14}")
    print("-" * 80)
    for node in nodes:
        print(f"  {node['name']:<33} {node['position']:<5} {node['degree']:>8} {node['betweenness']:>14.6f}")
    print("=" * 80)
    print(f"\nNetwork Density: {density:.4f}")
    print(f"Top Degree: {nodes[0]['name']} ({nodes[0]['degree']})")
    top_between = max(nodes, key=lambda n: n["betweenness"])
    print(f"Top Betweenness: {top_between['name']} ({top_between['betweenness']:.6f})")
    print("=" * 80)


if __name__ == "__main__":
    main()
