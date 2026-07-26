# Intersoft Chat — LibreChat MVP

This branch is a deliberately small integration baseline:

- LibreChat `v0.8.7` provides the UI, local authentication, conversations,
  model specs, agents, and administration.
- LiteLLM Proxy `v1.93.0` runs from the sibling `LLMGateway` repository and is
  the only model endpoint visible to LibreChat.
- Nginx is the only host-facing web entry point. LibreChat and the admin panel
  are reachable only through the internal Compose network.
- `default-chat` is the stable logical model name.
- There is no semantic, role-based, or cost-based routing in this iteration.
- There is no MCP or Windmill execution integration in this iteration.

The existing chat repository uses the LiteLLM Python SDK and `litellm.Router`
inside its own backend process. That is useful design input, but it is not a
network endpoint that LibreChat can consume. This MVP therefore introduces a
separate LiteLLM Proxy rather than coupling LibreChat to the old chat backend.

## Start

Start the standalone gateway first:

```powershell
Set-Location C:\Ec_Utils\DEVEL\LLMGateway
docker compose up -d
docker compose ps
```

It creates the attachable external network named `llm-gateway`.

Then initialize LibreChat:

```powershell
Set-Location C:\Ec_Utils\DEVEL\LibreChat
.\scripts\Initialize-Mvp.ps1
notepad .env
```

Set `LITELLM_MASTER_KEY` to a client credential accepted by LLMGateway. The MVP
temporarily reuses the gateway master key. Use a dedicated LibreChat virtual
key after enabling the LiteLLM database.

Then validate and start:

```powershell
docker compose -f docker-compose.yml -f docker-compose.mvp.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.mvp.yml up -d
docker compose -f docker-compose.yml -f docker-compose.mvp.yml ps
```

Open:

- LibreChat: http://localhost:3080
- Admin Panel: http://localhost:3090

Ports `3080` and `3090` are bound to `127.0.0.1` by Nginx. The application
containers do not publish host ports directly. LLMGateway owns its lifecycle,
provider credentials, model aliases, and optional host administration port.

The first LibreChat account becomes administrator. After creating the pilot
accounts, set `ALLOW_REGISTRATION=false` in `.env` and restart `api`.

## What the first smoke test proves

1. Local authentication works without AD or Authentik.
2. LibreChat reaches models only through LiteLLM.
3. Streaming chat works through the full chain.
4. The two centrally defined model specs are visible.
5. Conversations survive a stack restart.

## What it intentionally does not prove

- AD/Authentik login or group synchronization.
- Per-user identity propagation to MCP tools.
- Windmill flow execution.
- File RAG, embeddings, or code execution.
- Semantic model routing.
- Multi-deployment pool behavior.

See [docs/MVP-ARCHITECTURE.md](docs/MVP-ARCHITECTURE.md) for the planned
boundaries and the next slices.
