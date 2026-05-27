# Mealie Recipe Importer

A small self-hosted web app that extracts recipes from Word documents (`.docx`) using any OpenAI-compatible AI API, then bulk-imports them into [Mealie](https://mealie.io).

Recipes can be in any language — the AI preserves the original language when importing.

## How it works

1. **Configure** — enter your AI server details (Ollama, OpenAI, etc.) and your Mealie URL and API token
2. **Upload** — drop one or more `.docx` files (one file can contain multiple recipes)
3. **Extract** — the AI parses each document and pulls out structured recipe data
4. **Review** — preview every recipe, rename or remove any before importing
5. **Import** — recipes are pushed to Mealie one by one with live progress

---

## Requirements

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- An OpenAI-compatible AI server — either:
  - [Ollama](https://ollama.com) running locally, or
  - An OpenAI API key (or any other compatible provider)
- A running [Mealie](https://mealie.io) instance

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/chrysillis/mealie-recipe-importer.git
cd mealie-recipe-importer
```

### 2. Start the app

```bash
docker compose up --build
```

Then open **http://localhost:3000** in your browser.

> The `--build` flag is only needed the first time, or after updating the files. After that, `docker compose up` on its own is fine.

### 3. Configure the app

Fill in the config screen:

| Field | Description |
|---|---|
| AI Server URL | Full URL to an OpenAI-compatible chat completions endpoint |
| Model | Model name (e.g. `gpt-4o-mini`, `llama3.2`) |
| API Key | Required for OpenAI; leave blank for local Ollama |
| Mealie URL | Your Mealie instance URL (e.g. `https://mealie.yourdomain.com`) |
| Mealie API Token | Generate in Mealie: profile picture → Manage Your Profile → API Tokens |

The app tests both connections before proceeding.

---

## AI server examples

### Ollama (local)

Run Ollama on your host machine, then use:

```
AI Server URL: http://host.docker.internal:11434/v1/chat/completions
Model:         llama3.2   (or any model you have pulled)
API Key:       (leave blank)
```

> **Note:** `host.docker.internal` is automatically available on Docker Desktop (Windows/Mac). On Linux it requires the `extra_hosts` entry in `docker-compose.yml`, which is already included.

### OpenAI

```
AI Server URL: https://api.openai.com/v1/chat/completions
Model:         gpt-4o-mini
API Key:       sk-...
```

`gpt-4o-mini` works well for most recipes. Use `gpt-4o` for complex or multi-recipe documents.

---

## Mealie CORS configuration

If Mealie sits behind **Nginx Proxy Manager**, you need to allow cross-origin requests. In NPM, open the proxy host for your Mealie instance, go to the **Advanced** tab, and add:

```nginx
add_header 'Access-Control-Allow-Origin' '*' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;

if ($request_method = 'OPTIONS') {
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type';
    add_header 'Access-Control-Max-Age' 1728000;
    add_header 'Content-Length' 0;
    return 204;
}
```

---

## Document tips

- One `.docx` file can contain multiple recipes — the AI will extract all of them
- Recipes can be in any language
- The cleaner the document formatting, the better the extraction quality
- If a recipe doesn't extract well, you can remove it in the review step and re-import that document on its own with a more capable model

---

## License

MIT
