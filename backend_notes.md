# backend working notes

- setting up backend with [uv](https://docs.astral.sh/uv/guides/projects/)

```bash
abhis@Tinku MINGW64 ~/Desktop/personal-os/backend (main)
$ uv init
Initialized project `backend`
abhis@Tinku MINGW64 ~/Desktop/personal-os/backend (main)
$ uv venv
Using CPython 3.12.7
Creating virtual environment at: .venv
Activate with: source .venv/Scripts/activate

abhis@Tinku MINGW64 ~/Desktop/personal-os/backend (main)
$ source .venv/Scripts/activate
(backend)
abhis@Tinku MINGW64 ~/Desktop/personal-os/backend
# venv activated
abhis@Tinku MINGW64 ~/Desktop/personal-os/backend (main)
$ uv add langchain-google-genai langgraph langchain python-dotenv langgraph-cli
Resolved 50 packages in 1.13s
Prepared 7 packages in 654ms
Installed 49 packages in 864ms

abhis@Tinku MINGW64 ~/Desktop/personal-os/backend (main)
$ uv add "langgraph-cli[inmem]"
Resolved 81 packages in 2.04s
Prepared 5 packages in 832ms
Installed 31 packages in 587ms
# To run LangGraph application locally and to use `langgraph dev` to spin up the LangGraph API Server locally
```

- What each package does:
- [langgraph](https://docs.langchain.com/oss/python/langgraph/overview) - the StateGraph engine, interrupt, checkpointing
- [langchain](https://docs.langchain.com/oss/python/langchain/overview) - tool binding, LCEL, structured output
- [langchain-google-genai](https://docs.langchain.com/oss/python/integrations/chat/google_generative_ai#setup) - To access Google AI models
- [langgraph-cli](https://docs.langchain.com/langsmith/cli) - the `langgraph dev` command - Starts a lightweight local dev server, ideal for rapid testing.
  - `LangGraph CLI` is a command-line tool for building and running the Agent Server locally. The resulting server exposes all API endpoints for runs, threads, assistants, etc., and includes supporting services such as a managed database for checkpointing and storage.
  - [Follow this doc](https://docs.langchain.com/oss/python/langgraph/local-server) to run langgraph app locally

- create a minimal graph - [agent.py](./backend/agent/graph.py)
- create the langGraph server config - [langgraph.json](./backend/langgraph.json)
  - This tells the LangGraph dev server:
    - The assistant ID is `personal_os` (you'll use this in `useStream()` on the frontend)
    - The graph is exported as `graph` from `agent/graph.py`
- add the `GOOGLE_API_KEY` in the .env(root of the project) - [get API KEY](https://aistudio.google.com/app/api-keys)
- setup the langgraph.json right way - [refer this doc](https://docs.langchain.com/oss/python/langgraph/application-structure)

- Sample backend setup is done - we can see the Server running when we do `langgraph dev`.

```bash
abhis@Tinku MINGW64 ~/Desktop/personal-os/backend (main)
$ langgraph dev
INFO:langgraph_api.cli:

        Welcome to

╦  ┌─┐┌┐┌┌─┐╔═╗┬─┐┌─┐┌─┐┬ ┬
║  ├─┤││││ ┬║ ╦├┬┘├─┤├─┘├─┤
╩═╝┴ ┴┘└┘└─┘╚═╝┴└─┴ ┴┴  ┴ ┴

- 🚀 API: http://127.0.0.1:2024
- 🎨 Studio UI: https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024
- 📚 API Docs: http://127.0.0.1:2024/docs
```
