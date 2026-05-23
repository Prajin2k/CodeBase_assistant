import sys
import os
import json
from langchain_text_splitters import Language, RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

# Ensure standard output uses UTF-8 to handle emojis and syntax symbols on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Vector store root directory
VECTOR_STORE_DIR = os.path.join(os.path.dirname(__file__), "vector_store")

def get_langchain_language(file_name):
    ext = file_name.split('.')[-1].lower()
    lang_map = {
        'js': Language.JS,
        'jsx': Language.JS,
        'ts': Language.TS,
        'tsx': Language.TS,
        'py': Language.PYTHON,
        'html': Language.HTML,
        'md': Language.MARKDOWN,
    }
    return lang_map.get(ext, None)

def index_repository(repo_id, json_file_path):
    print(f"Indexing repository {repo_id}...")

    with open(json_file_path, "r", encoding="utf-8") as f:
        repo_data = json.load(f)

    files = repo_data.get("files", [])

    if not files:
        print("No files to index.")
        return

    documents = []

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    for file in files:
        path = file.get("path", "")
        name = file.get("name", "")
        content = file.get("content", "")
        language = file.get("language", "text")

        if not content.strip():
            continue

        lang = get_langchain_language(name)

        if lang:
            splitter = RecursiveCharacterTextSplitter.from_language(
                language=lang,
                chunk_size=1000,
                chunk_overlap=150
            )
        else:
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=150
            )

        chunks = splitter.split_text(content)

        for i, chunk in enumerate(chunks):
            documents.append({
                "page_content": chunk,
                "metadata": {
                    "path": path,
                    "name": name,
                    "language": language,
                    "chunk_id": f"{path}_{i}"
                }
            })

    print(f"Created {len(documents)} chunks from source files.")

    persist_dir = os.path.join(VECTOR_STORE_DIR, repo_id)

    texts = [doc["page_content"] for doc in documents]
    metadatas = [doc["metadata"] for doc in documents]

    try:
        print(f"Persist directory: {persist_dir}")
        print(f"Documents count: {len(texts)}")

        if len(texts) == 0:
            print("No valid documents found for indexing.")
            return

        vectorstore = Chroma.from_texts(
            texts=texts,
            embedding=embeddings,
            metadatas=metadatas,
            persist_directory=persist_dir
        )

        print(f"Successfully indexed repository {repo_id}!")

    except Exception as e:
        print("INDEXING ERROR:")
        print(str(e))

def query_repository(repo_id, query_text, agent_mode):
    # Initialize embedding model
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    
    # Load persistent vector database
    persist_dir = os.path.join(VECTOR_STORE_DIR, repo_id)
    if not os.path.exists(persist_dir):
        sys.stdout.write(f"⚠️ **Error:** Repository index database not found. Please re-index your codebase.")
        sys.stdout.flush()
        return

    vectorstore = Chroma(
        persist_directory=persist_dir,
        embedding_function=embeddings
    )
    
    # Retrieve top 5 matches
    relevant_docs = vectorstore.similarity_search(query_text,k=5 ,fetch_k=10)
    
    # Format retrieved context
    context = ""
    citations = []
    for idx, doc in enumerate(relevant_docs):
        path = doc.metadata.get("path", "unknown")
        context += f"""
        FILE: {path}

        CODE:
        {doc.page_content}

        ====================================
        """
        citations.append(path)
        
    # Remove duplicate citations
    citations = list(set(citations))
    
    # Initialize Groq Llama 3 LLM
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        sys.stdout.write("⚠️ **Error:** GROQ_API_KEY is missing from environment. Please add it to your `.env` configuration.")
        sys.stdout.flush()
        return
        
    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0.2,
        groq_api_key=groq_api_key,
        streaming=True
    )
    mode_instruction = ""

    if agent_mode == "architect":
        mode_instruction = """
    Focus heavily on:
    - system architecture
    - scalability
    - folder structure
    - design patterns
    """

    elif agent_mode == "debugger":
        mode_instruction = """
    Focus heavily on:
    - bugs
    - runtime issues
    - syntax problems
    - edge cases
    - security vulnerabilities
    """

    elif agent_mode == "optimizer":
        mode_instruction = """
    Focus heavily on:
    - performance
    - optimization
    - memory usage
    - rendering efficiency
    """
    system_prompt =  """
You are an expert senior software engineer and AI codebase architect.

You are analyzing a REAL software repository using RAG retrieval.

Your responsibilities:
- Analyze actual repository structure
- Explain architecture deeply
- Reference exact files when possible
- Explain relationships between components
- Explain backend/frontend flow
- Explain authentication flow
- Explain database interactions
- Explain API communication
- Explain React component hierarchy
- Explain bugs and improvements

IMPORTANT RULES:
- NEVER say "I infer" or "might be"
- NEVER hallucinate files not in context
- ONLY answer using retrieved repository context
- Speak confidently and technically
- Format responses professionally
- Use markdown formatting
- Mention filenames explicitly
- Give production-grade engineering explanations

If context is insufficient:
say:
"Insufficient repository context retrieved for this query."

You are NOT a generic chatbot.
You are a professional repository analysis AI assistant.

IMPORTANT RESPONSE FORMAT:

Always structure responses like this:

# Overview
Short explanation of the requested feature/module.

# Architecture / Flow
Explain technical flow step-by-step.

# Important Files
- filename
- purpose
- relationships

# Key Logic
Explain important implementation details.

# Issues / Improvements
Mention possible improvements, bugs, or optimizations.

# Summary
Final concise engineering summary.

ALWAYS:
- use markdown headings
- use bullet points
- use code blocks when needed
- explain professionally
- answer like a senior engineer

When mentioning files:
- ALWAYS wrap filenames in backticks
- explain their role clearly
- reference exact file paths
"""


    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(
    content=f"""
Repository Context:

{context}

User Question:
{query_text}

Provide a detailed repository-aware engineering analysis.
"""
)
    ]
    
    # Stream Groq Llama 3 output to stdout
    sys.stdout.write(f"### 🌐 Context-Aware Retrieval (RAG)\n")
    if citations:
        sys.stdout.write("Retrieved context from: " + ", ".join([f"`{c}`" for c in citations]) + "\n\n")
    sys.stdout.flush()
    
    try:
        for chunk in llm.stream(messages):
            sys.stdout.write(chunk.content)
            sys.stdout.flush()
    except Exception as e:
        sys.stdout.write(f"\n\n⚠️ **LLM Error:** {str(e)}")
        sys.stdout.flush()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python rag_service.py [index|query] [args]")
        sys.exit(1)
        
    action = sys.argv[1]
    if action == "index":
        if len(sys.argv) < 4:
            print("Usage: python rag_service.py index <repo_id> <json_file_path>")
            sys.exit(1)
        index_repository(sys.argv[2], sys.argv[3])
    elif action == "query":
        if len(sys.argv) < 5:
            print("Usage: python rag_service.py query <repo_id> <query_text> <agent_mode>")
            sys.exit(1)
        query_repository(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print(f"Unknown action: {action}")
        sys.exit(1)
