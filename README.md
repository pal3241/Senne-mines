# Senne-mines — Sena

Sena is a **single persistent Minecraft companion**, not a hive and not a command macro. The first milestone is a runnable cognitive agent that can survive without a player, maintain needs, react quickly to danger, reason with an NVIDIA NIM LLM, visually inspect its first-person view with a separate NVIDIA NIM VLM key, remember experience, and pursue a dynamic server objective.

## Core rules

- **Survival is permanent.** Immediate survival can interrupt slower reasoning.
- **Self-sufficiency is permanent.** Sena should reduce recurring dependence on players for food, materials, equipment, shelter and infrastructure.
- **World objective is dynamic.** Vanilla-like survival defaults to defeating the Ender Dragon. Economy signals switch the long-term objective to becoming the wealthiest player by legitimate server mechanics.
- **Social cognition and communication are separate.** Sena can notice, remember and reason about players without talking. Silence is the default; chat is an action.
- **Building is generative.** The core has no house blueprint. The planner can invent relative block placements and the build skill executes them using available materials.
- **VLM is real visual perception.** `prismarine-viewer` renders Sena's first-person view and Puppeteer captures it for NVIDIA NIM.
- **LLM/VLM are routed separately** and use separate API keys.

## Architecture

```text
Minecraft
   │
   ├─ Mineflayer structured perception ─┐
   ├─ first-person renderer → VLM ──────┤
   └─ chat/player events ────────────────┤
                                        ▼
                                  World / social model
                                        │
            ┌───────────────┬───────────┴──────────────┐
            ▼               ▼                          ▼
         Reflex          Needs                     Memory
        ~250 ms       self-sufficiency          persistent JSON
            │               │                          │
            └───────────────┴───────────┬──────────────┘
                                        ▼
                                NVIDIA NIM LLM
                            reason → goal → one action
                                        │
                                        ▼
                                      Skills
                                        │
                                        ▼
                                    Mineflayer
```

## Implemented in v0.1

- Mineflayer body + pathfinder
- structured world snapshots (inventory, nearby entities, useful nearby blocks, health/hunger/time)
- fast reflex loop for close creepers/critical threats and hunger
- needs model and resource pressure
- persistent episodic/factual/social memory
- dynamic vanilla/economy objective detector
- emotional state with decay
- relationship/social observation
- communication gate with direct/urgent/relevance rules and cooldowns
- NVIDIA NIM text reasoning client
- NVIDIA NIM vision client using a different key
- first-person VLM screenshots via prismarine-viewer + Puppeteer
- planner with strict skill allowlist
- navigation, gathering, crafting, eating, fleeing, combat, VLM inspection, farming, waiting
- **creative building executor** driven by LLM-generated relative placements, not a fixed blueprint
- heuristic fallback if the LLM key is absent so the bot can still perform basic survival reactions

This is deliberately a **working-first** build. Combat quality, crafting progression, farming establishment, creative architecture quality, economy adapters, anti-stuck behavior, path recovery, reflection/retrieval, and server-specific robustness are expected hardening targets.

## Requirements

- Node.js 20–24 (20 or 22 recommended)
- Minecraft Java server/world reachable by Mineflayer
- Two NVIDIA NIM API keys if you want both cognition and vision

Mineflayer 4.39.0 is used. Vision is rendered through prismarine-viewer 1.33.0.

## Install

```bash
git clone https://github.com/pal3241/Senne-mines.git
cd Senne-mines
npm install
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

```env
MC_HOST=localhost
MC_PORT=25565
MC_USERNAME=Sena
MC_AUTH=offline

NVIDIA_LLM_API_KEY=nvapi-your-first-key
NVIDIA_VLM_API_KEY=nvapi-your-second-key

NVIDIA_LLM_MODEL=openai/gpt-oss-20b
NVIDIA_VLM_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning
```

The default hosted NVIDIA endpoint is:

```text
https://integrate.api.nvidia.com/v1
```

For an online-mode/public server, set `MC_AUTH=microsoft` and use the Microsoft account identity required by Mineflayer. Test on a private/local server first; server rules and anti-bot policies vary.

## Run

```bash
npm start
```

Useful checks:

```bash
npm run check
npm test
```

Memory is stored in `data/memory.json` and is ignored by Git.

## Vision cost control

The VLM is **not** called every frame. The runtime keeps a first-person renderer alive but only requests a visual interpretation on demand / periodic relevance. Reflexes never wait for the VLM.

## Manual command interface

By default, Sena does **not** treat ordinary player chat as instructions. Use the explicit command prefix:

```text
!sena help
!sena status
!sena build a self-sufficient base here
!sena mine iron
!sena farm wheat near the base
!sena follow Fahri
!sena stop
!sena resume
!sena cancel
```

A manual task stays active across reasoning cycles until it is cancelled, replaced, or naturally finished. Survival reflexes always have higher priority and may interrupt a manual task. Ordinary chat can still be observed by the social system without becoming an instruction.

Spontaneous Sena speech is disabled by default with `SENA_ALLOW_SPONTANEOUS_CHAT=false`. This keeps the first usable build under your direct control; later we can enable the communication gate for natural companion behavior.

## Current skill interface

```text
goto
goto_nearest_block
collect
craft
eat
attack_nearest
flee
inspect_vision
creative_build
farm
wait
```

`creative_build` accepts an LLM-generated list like:

```json
{
  "origin": { "x": 100, "y": 64, "z": -20 },
  "placements": [
    { "x": 0, "y": 0, "z": 0, "block": "oak_planks" },
    { "x": 1, "y": 0, "z": 0, "block": "cobblestone" }
  ]
}
```

The example above is an interface example, **not a blueprint**. Sena's planner invents placements from current needs, terrain, memory and available materials.

## Hardening roadmap

Next work should focus on reliability rather than adding random features:

1. robust crafting/progression dependency solving
2. anti-stuck and action recovery
3. safe combat controller and equipment management
4. establish-new-farm logic, animal breeding and renewable resource accounting
5. better generative building: terrain scan → room/zoning plan → structural validation → VLM critique → repair
6. economy command/GUI discovery and profit accounting
7. memory retrieval + reflection instead of only recent episodic context
8. tool durability, reserves and expedition planning
9. public-server rate limits, trust boundaries and prompt-injection resistance
10. simulation/evaluation runs for 1, 7 and 30 Minecraft days without player assistance

## Security note

Sena does **not** execute model-generated JavaScript or shell commands. The model can only choose from an allowlisted skill interface. Keep API keys only in `.env` and never commit them.
